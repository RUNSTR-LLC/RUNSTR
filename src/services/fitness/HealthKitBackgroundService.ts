/**
 * HealthKitBackgroundService
 * Registers for HealthKit background delivery so iOS wakes RUNSTR
 * when new workouts appear (e.g. from Apple Watch, Nike Run Club).
 * On wake, fetches new workouts and submits them to Supabase for
 * leaderboard tracking and auto-rewards.
 *
 * Includes:
 * - GPS session guard (skip sync if active GPS tracking)
 * - Step sync (query today's steps and submit to Supabase)
 * - Auto-join RUNSTR competitions on new workout submission
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EventSubscription } from 'expo-modules-core';

// Only import HealthKit APIs on iOS
let enableBackgroundDelivery: any;
let subscribeToQuery: any;
let unsubscribeFromQuery: any;
let addQueryUpdateListener: any;
let queryQuantitySamples: any;
let HKUpdateFrequency: any;
let HKWorkoutTypeIdentifier: string;

if (Platform.OS === 'ios') {
  try {
    const hk = require('@yzlin/expo-healthkit');
    enableBackgroundDelivery = hk.enableBackgroundDelivery;
    subscribeToQuery = hk.subscribeToQuery;
    unsubscribeFromQuery = hk.unsubscribeFromQuery;
    addQueryUpdateListener = hk.default?.addQueryUpdateListener ?? hk.addQueryUpdateListener;
    queryQuantitySamples = hk.default?.queryQuantitySamples ?? hk.queryQuantitySamples;
    HKUpdateFrequency = hk.HKUpdateFrequency;
    HKWorkoutTypeIdentifier = 'HKWorkoutTypeIdentifier';
  } catch (e) {
    console.warn('[HKBackground] Failed to import @yzlin/expo-healthkit:', e);
  }
}

const SUBMITTED_IDS_KEY = '@healthkit_bg:submitted_ids';
const MAX_STORED_IDS = 500;
const SESSION_STATE_KEY = '@runstr:session_state';

export class HealthKitBackgroundService {
  private static instance: HealthKitBackgroundService;
  private queryId: string | null = null;
  private listener: EventSubscription | null = null;
  private isSetup = false;
  private syncInProgress = false;

  private constructor() {}

  static getInstance(): HealthKitBackgroundService {
    if (!HealthKitBackgroundService.instance) {
      HealthKitBackgroundService.instance = new HealthKitBackgroundService();
    }
    return HealthKitBackgroundService.instance;
  }

  /**
   * Register for HealthKit background delivery.
   * Must be called on every app launch (iOS requirement).
   * Kept as safety-net backup; HealthKitBackgroundTask.ts provides early registration.
   */
  async setupBackgroundDelivery(): Promise<void> {
    if (Platform.OS !== 'ios') return;
    if (this.isSetup) return;
    if (!enableBackgroundDelivery || !subscribeToQuery || !addQueryUpdateListener) {
      console.warn('[HKBackground] HealthKit background APIs not available');
      return;
    }

    try {
      const enabled = await enableBackgroundDelivery(
        HKWorkoutTypeIdentifier,
        HKUpdateFrequency.immediate,
      );
      console.log(`[HKBackground] enableBackgroundDelivery: ${enabled}`);

      this.queryId = await subscribeToQuery(HKWorkoutTypeIdentifier);
      console.log(`[HKBackground] subscribeToQuery: ${this.queryId}`);

      this.listener = addQueryUpdateListener(this.handleWorkoutUpdate.bind(this));
      console.log('[HKBackground] Background delivery registered');

      this.isSetup = true;
    } catch (error) {
      console.error('[HKBackground] Setup failed:', error);
    }
  }

  /**
   * Handle a workout update event from HealthKit observer query.
   * Called by both HealthKitBackgroundTask (early registration) and
   * setupBackgroundDelivery (safety-net registration).
   *
   * Guards:
   * - Skips if no npub (not logged in)
   * - Skips if GPS session is active (prevents conflicts)
   *
   * After workout sync, also syncs today's step count.
   */
  async handleWorkoutUpdate(_event: { typeIdentifier: string }): Promise<void> {
    console.log('[HKBackground] Workout update received');

    // SYNC MUTEX: Prevent concurrent background wakes from racing
    if (this.syncInProgress) {
      console.log('[HKBackground] Sync already in progress, skipping');
      return;
    }
    this.syncInProgress = true;

    try {
      const npub = await AsyncStorage.getItem('@runstr:npub');
      if (!npub) {
        console.log('[HKBackground] No npub found, skipping');
        return;
      }

      // GPS SESSION GUARD: Skip sync if user is actively tracking a workout
      const sessionGuardResult = await this.checkGPSSessionGuard();
      if (sessionGuardResult) {
        console.log(`[HKBackground] GPS session active, skipping sync: ${sessionGuardResult}`);
        return;
      }

      // Reuse HealthKitService for consistent workout fetching + normalization
      const { HealthKitService } = await import('./healthKitService');
      const healthKit = HealthKitService.getInstance();
      const recentWorkouts = await healthKit.getRecentWorkouts(npub, 1); // last 24h

      if (!recentWorkouts || recentWorkouts.length === 0) {
        console.log('[HKBackground] No recent workouts found');
        await this.syncTodaySteps(npub);
        return;
      }

      // Load previously submitted IDs for dedup
      const submittedIds = await this.getSubmittedIds();
      const CARDIO_TYPES = ['running', 'walking', 'cycling', 'hiking'];

      const { isValidWorkoutMetrics } = await import('../../utils/rewardEligibility');

      const newWorkouts = recentWorkouts.filter((w) => {
        if (submittedIds.has(w.id)) return false;
        if (!CARDIO_TYPES.includes(w.type)) {
          console.log(`[HKBackground] Skipping ${w.id}: type '${w.type}' not in CARDIO_TYPES`);
          return false;
        }
        if (!w.distance || w.distance <= 0) {
          console.log(`[HKBackground] Skipping ${w.id}: distance=${w.distance}`);
          return false;
        }
        if (!w.duration || w.duration <= 0) {
          console.log(`[HKBackground] Skipping ${w.id}: duration=${w.duration}`);
          return false;
        }
        if (!isValidWorkoutMetrics(w.distance, w.duration)) {
          console.warn(`[HKBackground] Skipping ${w.id}: metrics out of bounds (distance=${w.distance}, duration=${w.duration})`);
          return false;
        }
        return true;
      });

      if (newWorkouts.length === 0) {
        console.log('[HKBackground] No new cardio workouts to submit');
        await this.syncTodaySteps(npub);
        return;
      }

      // Build reward tags with timeout and error handling
      // If buildRewardTags fails (network, Supabase down), submit without reward tags
      // rather than losing the entire sync
      let rewardTags: string[][] = [];
      try {
        const { buildRewardTags } = await import('../../utils/rewardTags');
        rewardTags = await Promise.race([
          buildRewardTags(),
          new Promise<string[][]>((_, reject) =>
            setTimeout(() => reject(new Error('buildRewardTags timeout')), 8000)
          ),
        ]);
      } catch (err) {
        console.warn('[HKBackground] buildRewardTags failed, submitting without reward tags:', err);
      }

      // Fetch cached profile for leaderboard display (name/picture)
      const profile = await this.getCachedProfile();

      const { SupabaseCompetitionService } = await import(
        '../backend/SupabaseCompetitionService'
      );

      for (const w of newWorkouts) {
        try {
          const eventId = `hk_bg_${w.id}`;
          const tags: string[][] = [...rewardTags];

          await SupabaseCompetitionService.submitWorkoutSimple({
            eventId,
            npub,
            type: w.type,
            distance: w.distance,
            duration: w.duration,
            calories: w.calories,
            startTime: w.startTime,
            tags,
            profileName: profile.name,
            profilePicture: profile.picture,
          });

          submittedIds.add(w.id);
          console.log(`[HKBackground] Submitted ${w.type} workout: ${eventId}`);

          // Auto-join RUNSTR competitions (fire-and-forget with logging)
          this.tryAutoJoin(npub, w.type, new Date(w.startTime), profile).catch((err) => {
            console.warn('[HKBackground] Auto-join error (non-fatal):', err);
          });
        } catch (err) {
          console.warn(`[HKBackground] Failed to submit workout ${w.id}:`, err);
          // Don't add to submittedIds - will retry on next sync

          // Queue for retry via PendingSubmissionService
          try {
            const { PendingSubmissionService } = await import('../competition/PendingSubmissionService');
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            const failedEventId = `hk_bg_${w.id}`;
            await PendingSubmissionService.addPending({
              id: failedEventId,
              submissionData: {
                eventId: failedEventId,
                npub,
                type: w.type,
                distance: w.distance,
                duration: w.duration,
                calories: w.calories,
                startTime: w.startTime,
                tags: [...rewardTags],
                profileName: profile.name,
                profilePicture: profile.picture,
              },
              createdAt: Date.now(),
              retryCount: 0,
              lastError: errorMsg,
              nextRetryTime: Date.now() + 60000,
            });
          } catch (queueError) {
            console.warn('[HKBackground] Failed to queue for retry:', queueError);
          }
        }
      }

      // Persist updated submitted IDs
      await this.saveSubmittedIds(submittedIds);

      // Sync today's step count after workout sync
      await this.syncTodaySteps(npub);

      // Trigger background backup (nsec: silent, Amber: deferred)
      try {
        const { AutoBackupService } = await import('../backup/AutoBackupService');
        AutoBackupService.getInstance().runBackupInBackground();
      } catch (err) {
        console.warn('[HKBackground] Background backup failed (silent):', err);
      }
    } catch (error) {
      console.error('[HKBackground] handleWorkoutUpdate error:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Check if a GPS tracking session is active.
   * Returns a reason string if sync should be skipped, null if safe to proceed.
   */
  private async checkGPSSessionGuard(): Promise<string | null> {
    try {
      const sessionStateStr = await AsyncStorage.getItem(SESSION_STATE_KEY);
      if (!sessionStateStr) return null;

      const sessionState = JSON.parse(sessionStateStr);
      // Check if session is recent (within last 4 hours)
      const sessionAge = Date.now() - (sessionState.startTime || 0);
      if (sessionAge > 14400000) return null; // Stale session, safe to sync

      return `${sessionState.activityType || 'unknown'} session active`;
    } catch {
      return null; // Parse error = no valid session, safe to sync
    }
  }

  /**
   * Sync today's step count from HealthKit to Supabase.
   * Uses upsert via steps_ event ID prefix (server handles dedup).
   */
  private async syncTodaySteps(npub: string): Promise<void> {
    try {
      if (!queryQuantitySamples) {
        console.log('[HKBackground] queryQuantitySamples not available, skipping step sync');
        return;
      }

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const stepSamples = await queryQuantitySamples(
        'HKQuantityTypeIdentifierStepCount',
        {
          from: startOfDay,
          to: now,
        }
      );

      if (!stepSamples || stepSamples.length === 0) {
        console.log('[HKBackground] No step data today');
        return;
      }

      // Aggregate total steps from all sources
      let totalSteps = 0;
      for (const sample of stepSamples) {
        const qty = sample.quantity ?? sample.value ?? 0;
        totalSteps += typeof qty === 'number' ? qty : 0;
      }

      if (totalSteps <= 0) {
        console.log('[HKBackground] Zero steps today');
        return;
      }

      // Estimate distance from steps (avg stride 0.762m)
      const estimatedDistanceMeters = Math.round(totalSteps * 0.762);

      const dateStr = startOfDay.toISOString().split('T')[0]; // YYYY-MM-DD
      const eventId = `steps_${npub}_${dateStr}`;

      const { SupabaseCompetitionService } = await import(
        '../backend/SupabaseCompetitionService'
      );

      // Build reward tags with timeout protection
      let rewardTags: string[][] = [];
      try {
        const { buildRewardTags } = await import('../../utils/rewardTags');
        rewardTags = await Promise.race([
          buildRewardTags(),
          new Promise<string[][]>((_, reject) =>
            setTimeout(() => reject(new Error('buildRewardTags timeout')), 8000)
          ),
        ]);
      } catch (err) {
        console.warn('[HKBackground] Step sync: buildRewardTags failed:', err);
      }

      const profile = await this.getCachedProfile();

      await SupabaseCompetitionService.submitWorkoutSimple({
        eventId,
        npub,
        type: 'walking',
        distance: estimatedDistanceMeters,
        duration: 0,
        calories: 0,
        startTime: startOfDay.toISOString(),
        tags: [
          ...rewardTags,
          ['steps', String(Math.floor(totalSteps))],
        ],
        profileName: profile.name,
        profilePicture: profile.picture,
      });

      console.log(`[HKBackground] Step sync: ${totalSteps} steps (${eventId})`);
    } catch (error) {
      console.warn('[HKBackground] Step sync error:', error);
    }
  }

  /**
   * Try to auto-join RUNSTR competitions for a submitted workout.
   */
  private async tryAutoJoin(
    npub: string,
    workoutType: string,
    workoutDate: Date,
    profile: { name?: string; picture?: string }
  ): Promise<void> {
    try {
      const { AutoJoinService } = await import('../competition/AutoJoinService');
      const result = await AutoJoinService.checkAndAutoJoin(
        npub,
        workoutType,
        workoutDate,
        profile
      );
      if (result.joined.length > 0) {
        console.log(`[HKBackground] Auto-joined competitions: ${result.joined.join(', ')}`);
      }
    } catch (err) {
      // Silent - auto-join is best-effort
    }
  }

  /** Get cached profile data for leaderboard display. */
  private async getCachedProfile(): Promise<{ name?: string; picture?: string }> {
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

  /** Load previously submitted workout IDs from AsyncStorage */
  private async getSubmittedIds(): Promise<Set<string>> {
    try {
      const raw = await AsyncStorage.getItem(SUBMITTED_IDS_KEY);
      if (!raw) return new Set();
      return new Set(JSON.parse(raw));
    } catch (err) {
      console.warn('[HKBackground] Failed to load submitted IDs, starting fresh:', err);
      return new Set();
    }
  }

  /** Persist submitted workout IDs, capping at MAX_STORED_IDS */
  private async saveSubmittedIds(ids: Set<string>): Promise<void> {
    try {
      const arr = Array.from(ids);
      const trimmed = arr.slice(-MAX_STORED_IDS);
      await AsyncStorage.setItem(SUBMITTED_IDS_KEY, JSON.stringify(trimmed));
    } catch (error) {
      console.warn('[HKBackground] Failed to save submitted IDs:', error);
    }
  }

  /** Unsubscribe from HealthKit observer query and remove listener */
  async cleanup(): Promise<void> {
    if (this.listener) {
      this.listener.remove();
      this.listener = null;
    }
    if (this.queryId && unsubscribeFromQuery) {
      try {
        await unsubscribeFromQuery(this.queryId);
      } catch (e) {
        console.warn('[HKBackground] Failed to unsubscribe:', e);
      }
      this.queryId = null;
    }
    this.isSetup = false;
  }
}

export default HealthKitBackgroundService.getInstance();
