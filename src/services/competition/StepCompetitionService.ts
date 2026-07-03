/**
 * StepCompetitionService - Auto-submit daily steps for universal leaderboard
 *
 * All users' daily step counts are automatically submitted to Supabase for
 * the universal daily step leaderboard. This service:
 *
 * 1. Gets current step count from DailyStepCounterService
 * 2. Submits steps to Supabase via submit-workout edge function
 * 3. Deduplicates using date-based event_id (once per day)
 *
 * Triggered on app foreground via AppStateManager callback.
 * No opt-in required - everyone participates automatically.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupabaseCompetitionService } from '../backend/SupabaseCompetitionService';
import { dailyStepCounterService } from '../activity/DailyStepCounterService';
import { activityMetricsService } from '../activity/ActivityMetricsService';
import LocalWorkoutStorageService from '../fitness/LocalWorkoutStorageService';
import { safeGetItem, safeSetItem } from '../../utils/asyncStorageTimeout';
import { dailyStepsEventId } from '../../utils/stepEventId';
import { WoTService } from '../wot/WoTService';
import { buildRewardTags } from '../../utils/rewardTags';
import { nip19 } from 'nostr-tools';

// Storage key for tracking last submission timestamp
const STORAGE_KEY_LAST_SUBMISSION = '@runstr:step_competition_last_submission';

// Minimum steps required to submit (avoid noise from low step counts)
const MINIMUM_STEPS_THRESHOLD = 1000;

// Minimum interval between step re-submissions (30 minutes in ms)
const MIN_RESUBMISSION_INTERVAL_MS = 30 * 60 * 1000;

// Step-based competition IDs
const STEP_COMPETITION_IDS = ['january-walking'];

export class StepCompetitionService {
  private static isProcessing = false;

  /**
   * Check if user is in a step-based competition (January Walking)
   *
   * @param npub - User's Nostr public key
   * @returns Whether the user is participating in a step-based competition
   */
  static async isInStepCompetition(npub: string): Promise<boolean> {
    if (!npub) {
      console.log('[StepCompetition] No npub provided, skipping check');
      return false;
    }

    try {
      // Check each step-based competition
      for (const competitionId of STEP_COMPETITION_IDS) {
        const isParticipant = await SupabaseCompetitionService.isParticipant(
          competitionId,
          npub
        );
        if (isParticipant) {
          console.log(
            `[StepCompetition] User is in step competition: ${competitionId}`
          );
          return true;
        }
      }

      console.log('[StepCompetition] User not in any step-based competition');
      return false;
    } catch (error) {
      console.error('[StepCompetition] Error checking competition status:', error);
      return false;
    }
  }

  /**
   * Check if steps have already been submitted today
   *
   * @param npub - User's Nostr public key
   * @returns Whether steps were already submitted today
   */
  static async hasSubmittedToday(npub: string): Promise<boolean> {
    try {
      const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
      const storageKey = `${STORAGE_KEY_LAST_SUBMISSION}_${npub.slice(0, 12)}`;
      const lastSubmission = await safeGetItem(storageKey, 2000, null);

      const alreadySubmitted = lastSubmission === today;
      if (alreadySubmitted) {
        console.log(`[StepCompetition] Already submitted steps today (${today})`);
      }
      return alreadySubmitted;
    } catch (error) {
      console.warn('[StepCompetition] Error checking last submission:', error);
      return false; // On error, allow submission attempt
    }
  }

  /**
   * Check if steps were submitted recently (within 30-min interval)
   */
  private static async hasSubmittedRecently(npub: string): Promise<boolean> {
    try {
      const storageKey = `${STORAGE_KEY_LAST_SUBMISSION}_${npub.slice(0, 12)}`;
      const lastSubmission = await safeGetItem(storageKey, 2000, null);
      if (!lastSubmission) return false;

      const lastTimestamp = parseInt(lastSubmission, 10);
      if (isNaN(lastTimestamp)) return false; // legacy date string — allow submission

      return (Date.now() - lastTimestamp) < MIN_RESUBMISSION_INTERVAL_MS;
    } catch (error) {
      console.warn('[StepCompetition] Error checking last submission:', error);
      return false;
    }
  }

  /**
   * Mark that steps were submitted (store timestamp for interval check)
   */
  private static async markSubmittedToday(npub: string): Promise<void> {
    try {
      const storageKey = `${STORAGE_KEY_LAST_SUBMISSION}_${npub.slice(0, 12)}`;
      await safeSetItem(storageKey, Date.now().toString(), 2000);
      console.log(`[StepCompetition] Marked submission at ${new Date().toISOString()}`);
    } catch (error) {
      console.warn('[StepCompetition] Error saving submission timestamp:', error);
    }
  }

  /**
   * Generate deterministic event ID for daily step submission
   * Format: steps_YYYY-MM-DD_npub12chars
   *
   * This ensures:
   * 1. One submission per day per user
   * 2. submit-workout edge function deduplicates by event_id
   *
   * @param npub - User's Nostr public key
   * @returns Deterministic event ID
   */
  private static generateEventId(npub: string): string {
    return dailyStepsEventId(npub);
  }

  /**
   * Get cached profile data for leaderboard display (name/picture).
   * Same pattern used by healthKitService, healthConnectService, etc.
   */
  private static async getCachedProfile(): Promise<{ name?: string; picture?: string }> {
    try {
      const profilesJson = await AsyncStorage.getItem('@runstr:nostr_profiles');
      if (profilesJson) {
        const profiles = JSON.parse(profilesJson);
        const hexPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
        if (hexPubkey && profiles[hexPubkey]) {
          return {
            name: profiles[hexPubkey].name || profiles[hexPubkey].displayName,
            picture: profiles[hexPubkey].picture,
          };
        }
      }
    } catch { /* non-critical */ }
    return {};
  }

  /**
   * Convert npub to hex pubkey for WoT lookup
   */
  private static npubToHex(npub: string): string | null {
    try {
      if (!npub.startsWith('npub1')) {
        return null;
      }
      const decoded = nip19.decode(npub);
      if (decoded.type === 'npub' && typeof decoded.data === 'string') {
        return decoded.data;
      }
      return null;
    } catch (error) {
      console.error('[StepCompetition] Failed to decode npub:', error);
      return null;
    }
  }

  /**
   * Submit daily steps to Supabase for step competitions
   *
   * Creates a synthetic walking "workout" with step data.
   * The event_id is deterministic based on date + npub, so duplicate
   * submissions on the same day will be rejected by submit-workout.
   *
   * Includes WoT score from cache for fraud prevention gating.
   *
   * @param npub - User's Nostr public key
   * @param steps - Number of steps to submit
   * @returns Success status
   */
  static async submitDailySteps(
    npub: string,
    steps: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const eventId = this.generateEventId(npub);

      // Calculate non-GPS step distance to avoid double-counting with GPS workouts
      const gpsData = await LocalWorkoutStorageService.getTodayGPSDistance();
      const combinedDistance = activityMetricsService.calculateCombinedDailyDistance(
        steps,
        gpsData.distanceMeters
      );
      // Step distance = combined distance minus GPS distance (only the non-GPS portion)
      const stepDistanceMeters = Math.max(0, combinedDistance - gpsData.distanceMeters);
      const stepDistanceKm = stepDistanceMeters / 1000;

      // Get cached WoT score for fraud prevention gating
      let wotScore = 0;
      const hexPubkey = this.npubToHex(npub);
      if (hexPubkey) {
        const cachedScore = await WoTService.getInstance().getCachedScore(hexPubkey);
        wotScore = cachedScore ?? 0;
        console.log(`[StepCompetition] WoT score for submission: ${wotScore}`);
      } else {
        console.warn('[StepCompetition] Could not get hex pubkey for WoT lookup');
      }

      console.log(
        `[StepCompetition] Submitting ${steps} steps (~${stepDistanceKm.toFixed(2)} km, GPS: ${(gpsData.distanceMeters / 1000).toFixed(2)} km) with event_id: ${eventId}`
      );

      // Build reward routing tags (lightning, team, charity, reward_destination)
      // The external zapper reads the ['lightning', address] tag to send step rewards
      const rewardTags = await buildRewardTags();

      // Fetch cached profile for leaderboard display (name/picture)
      const profile = await this.getCachedProfile();

      const result = await SupabaseCompetitionService.submitWorkoutSimple({
        eventId,
        npub,
        type: 'walking',
        distance: stepDistanceMeters, // Non-GPS step distance only
        duration: 0, // No duration for passive steps
        startTime: new Date().toISOString(),
        tags: [
          ['d', eventId],
          ['exercise', 'walking'],
          ['steps', steps.toString()],
          ['distance', stepDistanceKm.toFixed(2), 'km'],
          ['source', 'auto_steps'], // Mark as auto-submitted passive steps
          ['wot_score', wotScore.toString()], // WoT score for fraud prevention
          ...rewardTags, // Lightning address, team, charity, reward_destination
        ],
        profileName: profile.name,
        profilePicture: profile.picture,
      });

      if (result.success) {
        console.log(`[StepCompetition] Successfully submitted ${steps} steps`);
        await this.markSubmittedToday(npub);
      } else {
        console.warn(
          `[StepCompetition] Submission failed: ${result.error}`
        );
      }

      // Upsert to local workout history FIRST so the entry exists before status update
      // (Previously updateSupabaseStatus was called first, silently failing because
      // the workout didn't exist in local storage yet on the first run)
      try {
        const now = new Date();
        const midnight = new Date();
        midnight.setHours(0, 0, 0, 0);
        const duration = Math.floor((now.getTime() - midnight.getTime()) / 1000);
        const calories = Math.round(steps * 0.04);

        await LocalWorkoutStorageService.upsertDailyStepsWorkout({
          steps,
          distance: stepDistanceMeters,
          startTime: midnight.toISOString(),
          endTime: now.toISOString(),
          duration,
          calories,
        }, eventId);
      } catch (upsertError) {
        // Non-critical: don't fail the submission if history save fails
        console.warn('[StepCompetition] Failed to upsert workout history:', upsertError);
      }

      // Track Supabase submission status on the local workout entry
      // Must run AFTER upsertDailyStepsWorkout so the entry exists
      try {
        await LocalWorkoutStorageService.updateSupabaseStatus(
          eventId,
          result.success,
          result.success ? undefined : result.error
        );
      } catch (statusErr) {
        console.warn('[StepCompetition] Failed to update supabase status:', statusErr);
      }

      return result;
    } catch (error) {
      console.error('[StepCompetition] Error submitting steps:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Main entry point - check and submit steps on app foreground
   *
   * This is called by AppStateManager when the app returns to foreground.
   * All users automatically participate in the universal daily step leaderboard.
   * It performs all necessary checks before submitting:
   * 1. Has user already submitted today?
   * 2. Does user have enough steps (minimum threshold)?
   *
   * @param npub - User's Nostr public key
   */
  static async checkAndSubmitSteps(npub: string): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessing) {
      console.log('[StepCompetition] Already processing, skipping');
      return;
    }

    if (!npub) {
      console.log('[StepCompetition] No npub provided, skipping');
      return;
    }

    this.isProcessing = true;

    try {
      console.log('[StepCompetition] Checking daily steps for universal leaderboard...');

      // 1. Check minimum re-submission interval (30 min) to avoid excessive API calls
      // The deterministic event_id handles true dedup server-side, so we allow re-submissions
      // to update step counts throughout the day.
      const recentlySubmitted = await this.hasSubmittedRecently(npub);
      if (recentlySubmitted) {
        console.log('[StepCompetition] Submitted recently (within 30 min), skipping');
        return;
      }

      // 2. Get today's steps
      const stepData = await dailyStepCounterService.getTodaySteps();
      if (!stepData) {
        console.log('[StepCompetition] No step data available, skipping');
        return;
      }

      const steps = stepData.steps;

      // 3. Check minimum threshold
      if (steps < MINIMUM_STEPS_THRESHOLD) {
        console.log(
          `[StepCompetition] Steps (${steps}) below minimum threshold (${MINIMUM_STEPS_THRESHOLD}), skipping`
        );
        return;
      }

      // 4. Submit steps
      console.log(
        `[StepCompetition] Submitting ${steps} steps to universal leaderboard...`
      );
      await this.submitDailySteps(npub, steps);
    } catch (error) {
      console.error('[StepCompetition] Error in checkAndSubmitSteps:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Force submit steps (bypasses local dedup check)
   * Useful for manual refresh or testing
   *
   * @param npub - User's Nostr public key
   */
  static async forceSubmitSteps(
    npub: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!npub) {
      return { success: false, error: 'No npub provided' };
    }

    try {
      const stepData = await dailyStepCounterService.getTodaySteps();
      if (!stepData || stepData.steps === 0) {
        return { success: false, error: 'No step data available' };
      }

      return await this.submitDailySteps(npub, stepData.steps);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get current step competition status for debugging
   */
  static async getStatus(npub: string): Promise<{
    isInCompetition: boolean;
    submittedToday: boolean;
    currentSteps: number;
    meetsThreshold: boolean;
  }> {
    const stepData = await dailyStepCounterService.getTodaySteps();
    const currentSteps = stepData?.steps || 0;

    return {
      isInCompetition: await this.isInStepCompetition(npub),
      submittedToday: await this.hasSubmittedToday(npub),
      currentSteps,
      meetsThreshold: currentSteps >= MINIMUM_STEPS_THRESHOLD,
    };
  }
}

export default StepCompetitionService;
