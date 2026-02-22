/**
 * WorkoutPublishingService - Workout Submission to Supabase
 *
 * All workouts are submitted to Supabase unconditionally for leaderboard
 * tracking and reward eligibility. Kind 1301 events are created locally
 * (for event structure/signing) but NOT published to Nostr relays.
 *
 * Flow:
 * - Create and sign a kind 1301 event locally
 * - Submit workout to Supabase (for leaderboards and rewards)
 * - Fire-and-forget: cache invalidation, Running Bitcoin checks
 */

import { GlobalNDKService } from './GlobalNDKService';
import { NDKEvent, NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';
import {
  WorkoutCardGenerator,
  type WorkoutCardOptions,
} from './workoutCardGenerator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Workout } from '../../types/workout';
import type { WorkoutType } from '../../types/workout';
import type { NDKSigner } from '@nostr-dev-kit/ndk';
import { CacheInvalidationService } from '../cache/CacheInvalidationService';
import { RewardLightningAddressService } from '../rewards/RewardLightningAddressService';
// Note: DailyRewardService import removed - rewards now trigger from SupabaseCompetitionService
import { ImageUploadService } from '../media/ImageUploadService';
import { LocalTeamMembershipService } from '../team/LocalTeamMembershipService';
import { getCharityById, type Charity, isPPQTeam, isSelfTeam, isCommunityTeam, extractCommunityTeamUUID, SELF_TEAM_ID } from '../../constants/charities';
import { UserTeamService } from '../backend/UserTeamService';
import { isSupabaseConfigured } from '../../utils/supabase';
// PPQAccountService import removed - PPQ bolt11 now created centrally in submitWorkoutSimple()
import { SatlantisEventJoinService } from '../satlantis/SatlantisEventJoinService';
import { withTimeout, fireAndForget, NOSTR_TIMEOUTS } from '../../utils/nostrTimeout';
import { RunningBitcoinService } from '../challenge/RunningBitcoinService';
import { isRunningBitcoinActive, isEligibleActivityType } from '../../constants/runningBitcoin';
import Toast from 'react-native-toast-message';
import { nip19 } from '@nostr-dev-kit/ndk';
import Constants from 'expo-constants';
import { SupabaseCompetitionService } from '../backend/SupabaseCompetitionService';
// RewardDestinationService removed - reward routing now uses isPPQTeam() inline
import { EinundzwanzigService } from '../challenge/EinundzwanzigService';
import { isEinundzwanzigActive } from '../../constants/einundzwanzig';
import { PendingSubmissionService } from '../competition/PendingSubmissionService';
import { WoTService } from '../wot/WoTService';

// Import split type for race replay data
import type { Split } from '../activity/SplitTrackingService';

// Extended workout interface for publishing (simplified from UnifiedWorkout)
export interface PublishableWorkout extends Workout {
  elevationGain?: number;
  elevationLoss?: number;
  unitSystem?: 'metric' | 'imperial';
  nostrEventId?: string;
  sourceApp?: string;
  canSyncToNostr?: boolean;
  canPostToSocial?: boolean;
  // Strength training fields (inherited from Workout, but explicit for clarity)
  sets?: number;
  reps?: number;
  notes?: string;
  // Race replay data (kilometer splits for running)
  splits?: Split[];
  // Enhanced tracking data
  positions?: Array<{ latitude: number; longitude: number; timestamp: number }>;
  pauseCount?: number;
  // Meditation-specific fields
  meditationType?:
    | 'guided'
    | 'unguided'
    | 'breathwork'
    | 'body_scan'
    | 'gratitude';
  mindfulnessRating?: number;
  // Diet/Fasting-specific fields
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  mealTime?: string;
  mealSize?: 'small' | 'medium' | 'large' | 'xl';
  fastingDuration?: number;
  // Strength training-specific fields
  exerciseType?: string;
  repsBreakdown?: number[];
  restTime?: number;
  // Competition team for leaderboard participation
  competitionTeam?: string | null;
}

export interface WorkoutPublishResult {
  success: boolean;
  eventId?: string;
  error?: string;
  publishedToRelays?: number;
  failedRelays?: string[];
  rewardEarned?: boolean;
  rewardAmount?: number;
}

export interface SocialPostOptions {
  customMessage?: string;
  includeStats?: boolean;
  includeMotivation?: boolean;
  cardTemplate?: 'achievement' | 'progress' | 'minimal' | 'stats';
  cardOptions?: WorkoutCardOptions;
  includeCard?: boolean;
  userAvatar?: string; // User's profile picture URL
  userName?: string; // User's display name
  cardImageUri?: string; // Pre-rendered card image URI (optional)
}

export class WorkoutPublishingService {
  private static instance: WorkoutPublishingService;
  private cardGenerator: WorkoutCardGenerator;
  private imageUploadService: ImageUploadService;

  private constructor() {
    this.cardGenerator = WorkoutCardGenerator.getInstance();
    this.imageUploadService = ImageUploadService.getInstance();
  }

  static getInstance(): WorkoutPublishingService {
    if (!WorkoutPublishingService.instance) {
      WorkoutPublishingService.instance = new WorkoutPublishingService();
    }
    return WorkoutPublishingService.instance;
  }

  /**
   * Save workout to Supabase for leaderboard tracking and rewards.
   *
   * NOTE: This method is named "saveWorkoutToNostr" for historical reasons.
   * It no longer publishes to Nostr relays -- Supabase is the single source
   * of truth. The name is kept to avoid breaking the many callers that
   * reference it (GPS tracker, HealthKit sync, batch save, etc.).
   *
   * Supports both direct privateKeyHex (nsec users) and NDKSigner (Amber users)
   */
  async saveWorkoutToNostr(
    workout: PublishableWorkout,
    privateKeyHexOrSigner: string | NDKSigner,
    userId: string
  ): Promise<WorkoutPublishResult> {
    try {
      console.log(
        `🔄 Publishing workout ${workout.id} as kind 1301 event (runstr format)...`
      );

      const ndk = await GlobalNDKService.getInstance();
      const isSigner = typeof privateKeyHexOrSigner !== 'string';

      // Get signer and pubkey with error handling
      // CRASH FIX: signer.user() can fail if Amber disconnects or nsec is invalid
      let signer: NDKSigner;
      let pubkey: string;

      if (isSigner) {
        signer = privateKeyHexOrSigner;
        try {
          const user = await signer.user();
          pubkey = user.pubkey;
        } catch (signerError) {
          console.warn('[WorkoutPublishing] Failed to get pubkey from signer, using stored fallback:', signerError);
          const storedPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
          if (!storedPubkey) {
            throw new Error('No authentication found. Please log in again.');
          }
          pubkey = storedPubkey;
        }
      } else {
        signer = new NDKPrivateKeySigner(privateKeyHexOrSigner);
        try {
          const user = await signer.user();
          pubkey = user.pubkey;
        } catch (signerError) {
          console.warn('[WorkoutPublishing] Failed to get pubkey from NDKPrivateKeySigner:', signerError);
          const storedPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
          if (!storedPubkey) {
            throw new Error('No authentication found. Please log in again.');
          }
          pubkey = storedPubkey;
        }
      }

      // Get user's selected team from TeamsScreen (charities ARE teams now)
      // The selected_team_id now stores charity ID directly
      const selectedTeamId = await AsyncStorage.getItem('@runstr:selected_team_id');

      // Look up the charity data (team data) from the charity ID
      // Self team is dynamic (not in CHARITIES array), so construct it inline
      // Community teams are fetched from Supabase user_teams table
      let selectedCharity: Charity | null = null;
      if (selectedTeamId) {
        if (isSelfTeam(selectedTeamId)) {
          selectedCharity = {
            id: SELF_TEAM_ID,
            name: 'You',
            displayName: 'You',
            description: 'Rewards go to your Lightning address',
            category: 'service',
            isSelf: true,
          };
        } else if (isCommunityTeam(selectedTeamId)) {
          // Community team -- look up from Supabase
          const uuid = extractCommunityTeamUUID(selectedTeamId);
          let communityTeam = null;
          if (isSupabaseConfigured()) {
            try {
              communityTeam = await UserTeamService.getTeamById(uuid);
            } catch (err) {
              console.warn(`[WorkoutPublishing] Failed to fetch community team '${uuid}':`, err);
            }
          }
          if (communityTeam) {
            selectedCharity = {
              id: selectedTeamId,
              name: communityTeam.name,
              displayName: communityTeam.name,
              lightningAddress: communityTeam.lightning_address || undefined,
              description: communityTeam.description || 'Community team',
              category: 'project',
            };
          }
        } else {
          selectedCharity = getCharityById(selectedTeamId) || null;
        }
      }

      // Get user's reward lightning address for tagging (for external reward scripts)
      const rewardLightningAddress =
        await RewardLightningAddressService.getRewardLightningAddress();

      // Get reward destination for external reward service routing
      // Must match buildRewardTags() logic in src/utils/rewardTags.ts:
      // - PPQ.AI team -> 'ppq' (rewards go to bolt11 invoice)
      // - Charity/community team with lightning address -> 'charity' (charity gets 50 sats)
      // - Self team, no team, or charity without lightning address -> 'user' (user gets 50 sats)
      const isSelf = selectedTeamId ? isSelfTeam(selectedTeamId) : false;
      const isPPQ = selectedTeamId ? isPPQTeam(selectedTeamId) : false;
      let rewardDestination: 'user' | 'charity' | 'ppq';
      let effectiveLightningAddress: string | null = rewardLightningAddress; // Default: user's address

      if (isPPQ) {
        rewardDestination = 'ppq';
        effectiveLightningAddress = null; // PPQ uses bolt11 invoice, not lightning address
      } else if (!isSelf && selectedCharity && !selectedCharity.isSelf && selectedCharity.lightningAddress) {
        // Charity/community team with a lightning address -> route reward to charity
        rewardDestination = 'charity';
        effectiveLightningAddress = selectedCharity.lightningAddress;
      } else {
        // Self team, no team, or charity without lightning address -> reward goes to user
        rewardDestination = 'user';
        effectiveLightningAddress = rewardLightningAddress;
      }

      // Create unsigned NDKEvent
      const ndkEvent = new NDKEvent(ndk);
      ndkEvent.kind = 1301;
      ndkEvent.content = this.generateWorkoutDescription(workout);
      ndkEvent.tags = await this.createNIP101eWorkoutTags(
        workout,
        pubkey,
        selectedCharity, // Charity provides both team ID and charity data
        effectiveLightningAddress,
        rewardDestination
      );
      ndkEvent.created_at = Math.floor(
        new Date(workout.startTime).getTime() / 1000
      );

      // Sign and publish WITH TIMEOUT PROTECTION
      // These operations can hang indefinitely without timeouts
      // Use longer timeout for Amber (external signer needs user approval)
      const isAmberSigner = signer.constructor.name === 'AmberNDKSigner' ||
                            (signer as any).AMBER_TIMEOUT_MS !== undefined;
      const signTimeout = isAmberSigner ? NOSTR_TIMEOUTS.SIGN_AMBER : NOSTR_TIMEOUTS.SIGN;

      // Logging for debugging signing issues (especially Amber)
      console.log(`[WorkoutPublishing] 🔐 Signing workout event...`);
      console.log(`[WorkoutPublishing]    Signer type: ${isAmberSigner ? 'AMBER (external)' : 'NDK (internal)'}`);
      console.log(`[WorkoutPublishing]    Timeout: ${signTimeout / 1000}s`);

      const signStartTime = Date.now();
      try {
        await withTimeout(
          ndkEvent.sign(signer),
          signTimeout,
          'Event signing'
        );
        const signDuration = Date.now() - signStartTime;
        console.log(`[WorkoutPublishing] ✅ Signing succeeded in ${signDuration}ms`);
      } catch (signError) {
        const signDuration = Date.now() - signStartTime;
        console.error(`[WorkoutPublishing] ❌ Signing FAILED after ${signDuration}ms:`, signError);
        throw signError; // Re-throw to be caught by outer try/catch
      }

      // ============================================================================
      // SUPABASE SUBMISSION (unconditional -- all workouts go to Supabase)
      // This enables rewards and leaderboard tracking for ALL users,
      // not just those currently in a competition.
      // ============================================================================
      const exerciseType = this.getExerciseVerb(workout.type);
      const npub = nip19.npubEncode(pubkey);

      console.log(`[WorkoutPublishing] 🗄️ Submitting workout to Supabase...`);
      console.log(`[WorkoutPublishing]    npub: ${npub.slice(0, 20)}...`);
      console.log(`[WorkoutPublishing]    type: ${exerciseType}, distance: ${workout.distance}m, duration: ${workout.duration}s`);

      // VALIDATION: Ensure we have valid distance/duration before submitting
      const distanceMeters = workout.distance || 0;
      const durationSeconds = workout.duration || 0;

      // Fetch cached profile for leaderboard display (name/picture)
      const profile = await this.getCachedProfile();

      if (distanceMeters === 0 && durationSeconds === 0) {
        console.warn('[WorkoutPublishing] ⚠️ Skipping Supabase submission: no distance or duration');
        console.warn('[WorkoutPublishing]    This workout will not appear on leaderboards');
        // Continue - wellness activities (meditation, etc.) don't need leaderboard entry
      } else {
        // PPQ.AI bolt11 creation is now handled inside submitWorkoutSimple()
        // This ensures ALL submission paths (HealthKit, background, manual) get PPQ support

        // Submit to Supabase SYNCHRONOUSLY - this is the primary save path
        const supabaseStartTime = Date.now();
        try {
          const submissionResult = await SupabaseCompetitionService.submitWorkoutSimple({
            eventId: ndkEvent.id || workout.id,
            npub: npub,
            type: exerciseType,
            distance: distanceMeters,
            duration: durationSeconds,
            calories: workout.calories,
            startTime: workout.startTime,
            tags: ndkEvent.tags,
            profileName: profile.name,
            profilePicture: profile.picture,
          });
          const supabaseDuration = Date.now() - supabaseStartTime;

          if (submissionResult.success) {
            console.log(`[WorkoutPublishing] ✅ Supabase submission successful in ${supabaseDuration}ms`);
            console.log(`[WorkoutPublishing]    Workout will appear on daily leaderboard`);
          } else if (submissionResult.error?.includes('duplicate')) {
            console.log(`[WorkoutPublishing] ℹ️ Duplicate workout (already submitted) in ${supabaseDuration}ms`);
          } else {
            console.warn(`[WorkoutPublishing] ⚠️ Supabase submission FAILED in ${supabaseDuration}ms:`, submissionResult.error);
            if (submissionResult.flagged) {
              Toast.show({
                type: 'info',
                text1: 'Workout Saved',
                text2: 'Under review - may take time to appear on leaderboard',
                position: 'bottom',
                visibilityTime: 4000,
              });
            } else {
              // Non-flagged failure - queue for retry
              await PendingSubmissionService.addPending({
                id: ndkEvent.id || workout.id,
                submissionData: {
                  eventId: ndkEvent.id || workout.id,
                  npub,
                  type: exerciseType,
                  distance: distanceMeters,
                  duration: durationSeconds,
                  calories: workout.calories,
                  startTime: workout.startTime,
                  tags: ndkEvent.tags,
                  profileName: profile.name,
                  profilePicture: profile.picture,
                },
                createdAt: Date.now(),
                retryCount: 0,
                lastError: submissionResult.error || 'Unknown error',
                nextRetryTime: Date.now() + 60000, // 1 minute
              });

              const isPrivateMode = submissionResult.error?.includes('Private mode');
              Toast.show({
                type: 'info',
                text1: isPrivateMode ? 'Private Mode Active' : 'Workout Saved Locally',
                text2: isPrivateMode
                  ? 'Turn off Private Mode to appear on leaderboards'
                  : 'Will sync to leaderboard on next refresh',
                position: 'bottom',
                visibilityTime: isPrivateMode ? 5000 : 3000,
              });
            }
          }
        } catch (supabaseError) {
          const supabaseDuration = Date.now() - supabaseStartTime;
          console.warn(`[WorkoutPublishing] ⚠️ Supabase ERROR after ${supabaseDuration}ms:`, supabaseError);

          // Queue for retry on network/exception errors
          await PendingSubmissionService.addPending({
            id: ndkEvent.id || workout.id,
            submissionData: {
              eventId: ndkEvent.id || workout.id,
              npub,
              type: exerciseType,
              distance: distanceMeters,
              duration: durationSeconds,
              calories: workout.calories,
              startTime: workout.startTime,
              tags: ndkEvent.tags,
            },
            createdAt: Date.now(),
            retryCount: 0,
            lastError: supabaseError instanceof Error ? supabaseError.message : 'Unknown error',
            nextRetryTime: Date.now() + 60000, // 1 minute
          });

          Toast.show({
            type: 'info',
            text1: 'Workout Saved Locally',
            text2: 'Will sync to leaderboard on next refresh',
            position: 'bottom',
            visibilityTime: 3000,
          });
        }
      }

      // ============================================================================
      // FIRE-AND-FORGET: Non-critical operations that should NEVER block UI
      // NOTE: Nostr publishing has been removed - Supabase is the single source of truth
      // ============================================================================

      // Cache invalidation (non-blocking)
      fireAndForget(
        CacheInvalidationService.invalidateWorkout(pubkey),
        'cacheInvalidation'
      );

      // 🎁 Reward trigger MOVED to Supabase submission success
      // Rewards now require passing anti-cheat validation (see SupabaseCompetitionService)
      // This gates rewards behind competition submission instead of local save

      // 🏃 Running Bitcoin auto-pay check (non-blocking)
      if (isRunningBitcoinActive() && isEligibleActivityType(exerciseType)) {
        fireAndForget(
          (async () => {
            console.log('[WorkoutPublishing] Checking Running Bitcoin auto-pay...');
            try {
              const autoPayResult = await RunningBitcoinService.checkAndAutoPayReward(npub);
              if (autoPayResult.paid) {
                console.log('🏃⚡ Running Bitcoin: Auto-paid 1000 sats for 21km completion!');
                // Show toast notification so user knows they got paid
                Toast.show({
                  type: 'success',
                  text1: '🏃 21km Complete!',
                  text2: '1,000 sats sent to your Lightning address!',
                  position: 'bottom',
                  visibilityTime: 5000,
                });
              }
            } catch (rbError) {
              console.error('[WorkoutPublishing] Running Bitcoin auto-pay failed:', rbError);
            }
          })(),
          'runningBitcoinAutoPay'
        );
      }

      // Return success immediately (Supabase is what matters for competitions)
      // User sees "Workout Saved!" without waiting for Nostr relays
      return {
        success: true,
        eventId: ndkEvent.id,
        rewardEarned: false,
        rewardAmount: undefined,
      };
    } catch (error) {
      console.error('❌ Error saving workout to Nostr:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Post workout as Kind 1 social event with workout card image.
   * WoT eligibility should be checked at UI layer before calling.
   */
  async postWorkoutToSocial(
    workout: PublishableWorkout,
    privateKeyHexOrSigner: string | NDKSigner,
    userId: string,
    options: SocialPostOptions = {}
  ): Promise<WorkoutPublishResult> {
    try {
      console.log(`🔄 Creating social post for workout ${workout.id}...`);

      const ndk = await GlobalNDKService.getInstance();
      const isSigner = typeof privateKeyHexOrSigner !== 'string';

      // Get signer
      let signer: NDKSigner;
      if (isSigner) {
        signer = privateKeyHexOrSigner;
      } else {
        signer = new NDKPrivateKeySigner(privateKeyHexOrSigner);
      }

      // Generate workout card image if requested
      let imageUrl: string | undefined;
      let imageDimensions: { width: number; height: number } | undefined;

      if (options.includeCard !== false) {
        console.log('🎨 Generating workout card image...');

        try {
          // Fetch competition team name for card branding
          const competitionTeamId =
            await LocalTeamMembershipService.getCompetitionTeam();
          let teamName: string | undefined;

          if (competitionTeamId) {
            try {
              const NdkTeamService = (await import('../team/NdkTeamService'))
                .default;
              const teamData = await NdkTeamService.getTeamById(
                competitionTeamId
              );
              teamName = teamData?.name ? `Team ${teamData.name}` : undefined;
            } catch (err) {
              console.warn('⚠️ Failed to fetch team name for card:', err);
            }
          }

          // Generate SVG card
          const cardData = await this.cardGenerator.generateWorkoutCard(
            workout,
            {
              template: options.cardTemplate || 'achievement',
              userAvatar: options.userAvatar,
              userName: options.userName,
              teamName,
              ...options.cardOptions,
            }
          );

          // Note: Image conversion will happen in the UI layer (SocialShareModal)
          // using WorkoutCardRenderer + captureRef, then pass cardImageUri in options
          if (options.cardImageUri) {
            console.log(
              '📤 Uploading card image to nostr.build with NIP-98 auth...',
              {
                uri: options.cardImageUri,
                filename: `runstr-workout-${workout.id}.png`,
                hasSigner: !!signer,
              }
            );
            const uploadResult = await this.imageUploadService.uploadImage(
              options.cardImageUri,
              `runstr-workout-${workout.id}.png`,
              signer
            );

            console.log('📤 Upload result:', {
              success: uploadResult.success,
              hasUrl: !!uploadResult.url,
              hasDimensions: !!uploadResult.dimensions,
              error: uploadResult.error,
            });

            if (uploadResult.success && uploadResult.url) {
              imageUrl = uploadResult.url;
              imageDimensions = uploadResult.dimensions || cardData.dimensions;
              console.log(`✅ Image uploaded successfully to: ${imageUrl}`);
            } else {
              // Throw error instead of continuing silently - user needs feedback
              throw new Error(
                `Image upload failed: ${uploadResult.error || 'Unknown error'}`
              );
            }
          } else {
            console.warn('⚠️ No cardImageUri provided - posting without image');
          }
        } catch (cardError) {
          console.warn('⚠️ Card generation failed (non-blocking):', cardError);
          // Continue without image - post will still have text content
        }
      }

      // Get user's selected team (charity) for tagging
      // Self team is dynamic (not in CHARITIES array)
      // Community teams are fetched from Supabase user_teams table
      const selectedTeamId = await AsyncStorage.getItem('@runstr:selected_team_id');
      let selectedCharity: Charity | null = null;
      if (selectedTeamId) {
        if (isSelfTeam(selectedTeamId)) {
          selectedCharity = {
            id: SELF_TEAM_ID,
            name: 'You',
            displayName: 'You',
            description: 'Rewards go to your Lightning address',
            category: 'service',
            isSelf: true,
          };
        } else if (isCommunityTeam(selectedTeamId)) {
          // Community team -- look up from Supabase
          const uuid = extractCommunityTeamUUID(selectedTeamId);
          let communityTeam = null;
          if (isSupabaseConfigured()) {
            try {
              communityTeam = await UserTeamService.getTeamById(uuid);
            } catch (err) {
              console.warn(`[WorkoutPublishing] Failed to fetch community team for social post:`, err);
            }
          }
          if (communityTeam) {
            selectedCharity = {
              id: selectedTeamId,
              name: communityTeam.name,
              displayName: communityTeam.name,
              lightningAddress: communityTeam.lightning_address || undefined,
              description: communityTeam.description || 'Community team',
              category: 'project',
            };
          }
        } else {
          selectedCharity = getCharityById(selectedTeamId) || null;
        }
      }

      // Create unsigned NDKEvent
      const ndkEvent = new NDKEvent(ndk);
      ndkEvent.kind = 1;
      ndkEvent.content = await this.generateSocialPostContent(
        workout,
        options,
        imageUrl
      );
      ndkEvent.tags = this.createSocialPostTags(
        workout,
        imageUrl,
        imageDimensions,
        selectedCharity // Charity provides both team ID and charity data
      );
      ndkEvent.created_at = Math.floor(Date.now() / 1000);

      // Sign and publish WITH TIMEOUT PROTECTION
      // Use longer timeout for Amber (external signer needs user approval)
      const isAmberSigner = signer.constructor.name === 'AmberNDKSigner' ||
                            (signer as any).AMBER_TIMEOUT_MS !== undefined;
      const signTimeout = isAmberSigner ? NOSTR_TIMEOUTS.SIGN_AMBER : NOSTR_TIMEOUTS.SIGN;

      await withTimeout(
        ndkEvent.sign(signer),
        signTimeout,
        'Social post signing'
      );
      await withTimeout(
        ndkEvent.publish(),
        NOSTR_TIMEOUTS.PUBLISH,
        'Social post publishing'
      );

      console.log(`✅ Workout posted to social: ${ndkEvent.id}`);

      // Cache invalidation (fire-and-forget) - social post appears on next refresh
      // CRASH FIX: Add .catch() to prevent unhandled promise rejection
      signer.user().then((user) => {
        fireAndForget(
          CacheInvalidationService.invalidateWorkout(user.pubkey),
          'socialCacheInvalidation'
        );
      }).catch((err) => {
        console.warn('[WorkoutPublishing] Failed to get user for cache invalidation:', err);
      });

      return {
        success: true,
        eventId: ndkEvent.id,
      };
    } catch (error) {
      console.error('❌ Error posting workout to social:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get cached profile data for leaderboard display (name/picture).
   * Reads from the local Nostr profile cache in AsyncStorage.
   */
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

  /**
   * Create runstr-compatible tags for kind 1301 workout events
   * Matches the exact format used by runstr GitHub implementation
   * ✅ UPDATED: Charity is now the team - adds charity ID to BOTH team AND charity tags
   * ✅ UPDATED: Now includes lightning address tag for external reward scripts
   * ✅ UPDATED: Now includes reward_destination tag for external reward routing
   */
  private async createNIP101eWorkoutTags(
    workout: PublishableWorkout,
    pubkey: string,
    selectedCharity: Charity | null,
    rewardLightningAddress: string | null,
    rewardDestination: 'user' | 'charity' | 'ppq'
  ): Promise<string[][]> {
    // Map workout type to simple exercise verb (run, walk, cycle)
    const exerciseVerb = this.getExerciseVerb(workout.type);

    // Format duration as HH:MM:SS string
    const durationFormatted = this.formatDurationHHMMSS(workout.duration);

    // Get specific exercise name for better title
    const specificExercise = this.getSpecificExerciseName(workout);
    const title = specificExercise
      ? `${
          specificExercise.charAt(0).toUpperCase() + specificExercise.slice(1)
        }`
      : `${
          exerciseVerb.charAt(0).toUpperCase() + exerciseVerb.slice(1)
        } Workout`;

    // Determine source tag value based on workout origin
    // Manual entries are tagged differently to exclude from GPS-based competitions
    // Note: 'manual' is used by WorkoutHistoryScreen for step-based walking imports
    const isManual = (workout as any).isManualEntry === true ||
                     (workout as any).source === 'manual_entry' ||
                     (workout as any).source === 'manual';
    const sourceTag = isManual ? 'manual' : 'gps';

    // Start with required tags (always present)
    const tags: string[][] = [
      ['d', workout.id], // Unique workout ID
      ['title', title],
      ['exercise', exerciseVerb], // Simple activity type: running, yoga, strength, etc.
      ['duration', durationFormatted], // HH:MM:SS format (always included)
      ['source', sourceTag], // Data source: 'gps' for tracked, 'manual' for manual entry
      ['client', 'RUNSTR', Constants.expoConfig?.version || '1.6.5'], // Client info with version
      ['t', this.getActivityHashtag(workout.type)], // Primary hashtag
    ];

    // Add distance for cardio activities (running, cycling, treadmill, etc.)
    // EXCLUDE strength training and gym workouts (they use reps/sets instead)
    const isStrengthWorkout =
      workout.type === 'strength_training' || workout.type === 'gym';
    if (workout.distance && workout.distance > 0 && !isStrengthWorkout) {
      const distanceKm = (workout.distance / 1000).toFixed(2);
      const distanceUnit = workout.unitSystem === 'imperial' ? 'mi' : 'km';
      const distanceValue =
        workout.unitSystem === 'imperial'
          ? (parseFloat(distanceKm) * 0.621371).toFixed(2)
          : distanceKm;
      tags.push(['distance', distanceValue, distanceUnit]);
    }

    // Add elevation if available (for running, hiking, cycling)
    if (workout.elevationGain && workout.elevationGain > 0) {
      const elevationUnit = workout.unitSystem === 'imperial' ? 'ft' : 'm';
      const elevationValue =
        workout.unitSystem === 'imperial'
          ? Math.round(workout.elevationGain * 3.28084).toString()
          : Math.round(workout.elevationGain).toString();
      tags.push(['elevation_gain', elevationValue, elevationUnit]);
    }

    // Add calories if available
    if (workout.calories && workout.calories > 0) {
      tags.push(['calories', Math.round(workout.calories).toString()]);
    }

    // Add steps count for walking/step-based workouts (enables step-based competition scoring)
    const steps = (workout.metadata as any)?.steps;
    if (steps && typeof steps === 'number' && steps > 0) {
      tags.push(['steps', steps.toString()]);
    }

    // Add sets and reps for strength training workouts (pushups, pullups, etc.)
    if (workout.sets && workout.sets > 0) {
      tags.push(['sets', workout.sets.toString()]);
    }
    if (workout.reps && workout.reps > 0) {
      tags.push(['reps', workout.reps.toString()]);
    }

    // Add weight for strength training workouts (non-breaking - optional field)
    if (workout.weight && workout.weight > 0) {
      tags.push(['weight', workout.weight.toString(), 'lbs']);
    }

    // Add per-set weight data for strength training (enables volume-based competition scoring)
    if (workout.weightsPerSet && Array.isArray(workout.weightsPerSet)) {
      workout.weightsPerSet.forEach((weight, index) => {
        if (weight > 0) {
          tags.push([
            'weight_set',
            (index + 1).toString(), // Set number (1-indexed)
            weight.toString(),
            'lbs',
          ]);
        }
      });
    }

    // Add meditation subtype for meditation workouts
    if (workout.meditationType) {
      tags.push(['meditation_type', workout.meditationType]);
    }

    // Add meal type for diet/nutrition workouts
    if (workout.mealType) {
      tags.push(['meal_type', workout.mealType]);
    }

    // Add meal size for diet/nutrition workouts (non-breaking - optional field)
    if (workout.mealSize) {
      tags.push(['meal_size', workout.mealSize]);
    }

    // Add exercise type for strength training workouts
    if (workout.exerciseType) {
      tags.push(['exercise_type', workout.exerciseType]);
    }

    // Add split times for running workouts (race replay data)
    if (workout.splits && workout.splits.length > 0) {
      for (const split of workout.splits) {
        // Format: ["split", "km_number", "elapsed_time_HH:MM:SS"]
        const elapsedTimeFormatted = this.formatDurationHHMMSS(
          split.elapsedTime
        );
        tags.push(['split', split.number.toString(), elapsedTimeFormatted]);
      }

      // Add individual split paces (seconds per km/mi)
      for (const split of workout.splits) {
        // Format: ["split_pace", "split_number", "pace_in_seconds"]
        tags.push([
          'split_pace',
          split.number.toString(),
          Math.round(split.splitTime).toString(),
        ]);
      }

      // Calculate and add average pace from splits
      const totalSplitTime = workout.splits.reduce(
        (sum, s) => sum + s.splitTime,
        0
      );
      const averagePaceSeconds = totalSplitTime / workout.splits.length;
      const paceFormatted = this.formatPaceMMSS(averagePaceSeconds);
      const paceUnit = workout.unitSystem === 'imperial' ? 'min/mi' : 'min/km';

      // If using imperial, convert pace from min/km to min/mi
      if (workout.unitSystem === 'imperial') {
        const paceMinPerMile = averagePaceSeconds * 1.60934; // Convert km pace to mile pace
        const paceFormattedMiles = this.formatPaceMMSS(paceMinPerMile);
        tags.push(['avg_pace', paceFormattedMiles, paceUnit]);
      } else {
        tags.push(['avg_pace', paceFormatted, paceUnit]);
      }
    }

    // Add elevation loss if available (for running, hiking, cycling)
    if (workout.elevationLoss && workout.elevationLoss > 0) {
      const elevationUnit = workout.unitSystem === 'imperial' ? 'ft' : 'm';
      const elevationValue =
        workout.unitSystem === 'imperial'
          ? Math.round(workout.elevationLoss * 3.28084).toString()
          : Math.round(workout.elevationLoss).toString();
      tags.push(['elevation_loss', elevationValue, elevationUnit]);
    }

    // Add GPS data point count if available
    if (workout.positions && workout.positions.length > 0) {
      tags.push(['data_points', workout.positions.length.toString()]);
    }

    // Add pause count if available
    if (workout.pauseCount !== undefined) {
      tags.push(['recording_pauses', workout.pauseCount.toString()]);
    }

    // Add workout start timestamp (Unix seconds)
    if (workout.startTime) {
      const startTimestamp = this.toUnixSeconds(workout.startTime);
      tags.push(['workout_start_time', startTimestamp]);
    }

    // Add team AND charity tags (charities ARE teams now)
    // Self team: add team tag but skip charity tag (user isn't supporting a charity)
    if (selectedCharity) {
      if (selectedCharity.isSelf) {
        // Self team: tag as 'self', no charity tag
        tags.push(['team', SELF_TEAM_ID]);
        console.log('   ✅ Added team tag: self (rewards go to user)');
      } else {
        // Team tag for leaderboards and competition filtering
        tags.push(['team', selectedCharity.id]);
        console.log(`   ✅ Added team tag: ${selectedCharity.id}`);

        // Charity tag for external client parsing and donations
        // PPQ.AI has no Lightning address (uses bolt11 invoices instead)
        if (selectedCharity.lightningAddress) {
          tags.push([
            'charity',
            selectedCharity.id,
            selectedCharity.name,
            selectedCharity.lightningAddress,
          ]);
        } else {
          tags.push([
            'charity',
            selectedCharity.id,
            selectedCharity.name,
          ]);
        }
        console.log(`   ✅ Added charity tag: ${selectedCharity.name}`);
      }
    }

    // Add club tag (separate from reward destination)
    // Club is the user's social club, independent of charity/team selection
    const clubId = await AsyncStorage.getItem('@runstr:club_id');
    if (clubId) {
      tags.push(['club', clubId]);
      console.log(`   ✅ Added club tag: ${clubId}`);
    }

    // Add reward lightning address tag (for external reward scripts)
    if (rewardLightningAddress) {
      tags.push(['lightning', rewardLightningAddress]);
      console.log(`   ✅ Added lightning address tag: ${rewardLightningAddress}`);
    }

    // Add reward_destination tag (for external reward routing)
    // 'user' = send to user's Lightning address
    // 'ppq' = send to PPQ.AI bolt11 invoice (AI credits)
    // 'charity' = send to charity's Lightning address
    tags.push(['reward_destination', rewardDestination]);
    console.log(`   ✅ Added reward_destination tag: ${rewardDestination}`);

    // Add event tags for active RUNSTR events (workout belongs to these events)
    // This enables event leaderboards to query workouts by event ID without RSVP queries
    try {
      const activeEventIds = await SatlantisEventJoinService.getActiveEventIds();
      for (const eventId of activeEventIds) {
        tags.push(['e', eventId]);
        console.log(`   ✅ Added event tag: ${eventId}`);
      }
      if (activeEventIds.length > 0) {
        console.log(`   📋 Workout tagged with ${activeEventIds.length} active event(s)`);
      }
    } catch (error) {
      console.warn('   ⚠️ Failed to get active events for tagging:', error);
      // Non-blocking - workout publishing continues without event tags
    }

    // Add challenge tag for Einundzwanzig participants (enables double rewards)
    // External reward service checks this tag to award 100 sats instead of 50
    try {
      if (isEinundzwanzigActive() && await EinundzwanzigService.hasJoined(pubkey)) {
        tags.push(['challenge', 'einundzwanzig']);
        console.log('   ✅ Added challenge tag: einundzwanzig (double rewards eligible)');
      }
    } catch (error) {
      console.warn('   ⚠️ Failed to check Einundzwanzig participation:', error);
      // Non-blocking - workout publishes without challenge tag
    }

    // Add WoT score for fraud prevention gating
    // External reward service uses this to gate rewards for new/low-WoT accounts
    try {
      const cachedScore = await WoTService.getInstance().getCachedScore(pubkey);
      const wotScore = cachedScore ?? 0;
      tags.push(['wot_score', wotScore.toString()]);
      console.log(`   ✅ Added wot_score tag: ${wotScore}`);
    } catch (error) {
      // Non-blocking - default to 0 if WoT lookup fails
      tags.push(['wot_score', '0']);
      console.warn('   ⚠️ Failed to get WoT score, defaulting to 0:', error);
    }

    return tags;
  }

  /**
   * Get simple exercise verb for in-app competitions
   * Supports cardio, strength, wellness, and nutrition activities
   */
  private getExerciseVerb(workoutType: string): string {
    const type = workoutType.toLowerCase();
    // Cardio activities
    if (type.includes('run') || type === 'running') return 'running';
    if (type.includes('walk') || type === 'walking') return 'walking';
    if (type.includes('cycl') || type === 'cycling' || type.includes('bike'))
      return 'cycling';
    if (type.includes('hik')) return 'hiking';
    if (type.includes('swim')) return 'swimming';
    if (type.includes('row')) return 'rowing';
    // Strength activities
    if (
      type.includes('strength') ||
      type.includes('gym') ||
      type.includes('weight')
    )
      return 'strength';
    if (
      type.includes('pushup') ||
      type.includes('pullup') ||
      type.includes('situp')
    )
      return 'strength';
    if (type.includes('squat') || type.includes('burpee')) return 'strength';
    // Wellness activities
    if (type.includes('yoga')) return 'yoga';
    if (type.includes('meditation')) return 'meditation';
    // Nutrition activities
    if (type.includes('diet') || type.includes('meal')) return 'diet';
    if (type.includes('fasting') || type.includes('fast')) return 'fasting';
    // Default to 'running' for unrecognized types (never 'other')
    return 'running';
  }

  /**
   * Format duration as HH:MM:SS string for runstr compatibility
   */
  private formatDurationHHMMSS(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Format pace as MM:SS string for avg_pace tag
   */
  private formatPaceMMSS(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }

  /**
   * Get activity hashtag for in-app competitions
   * Supports cardio, strength, wellness, and nutrition activities
   */
  private getActivityHashtag(workoutType: string): string {
    const type = workoutType.toLowerCase();
    // Cardio hashtags
    if (type.includes('run') || type === 'running') return 'Running';
    if (type.includes('walk') || type === 'walking') return 'Walking';
    if (type.includes('cycl') || type === 'cycling' || type.includes('bike'))
      return 'Cycling';
    if (type.includes('hik')) return 'Hiking';
    if (type.includes('swim')) return 'Swimming';
    if (type.includes('row')) return 'Rowing';
    // Strength hashtags
    if (
      type.includes('gym') ||
      type.includes('strength') ||
      type.includes('weight')
    )
      return 'Strength';
    if (
      type.includes('pushup') ||
      type.includes('pullup') ||
      type.includes('situp')
    )
      return 'Strength';
    if (type.includes('squat') || type.includes('burpee')) return 'Strength';
    // Wellness hashtags
    if (type.includes('yoga')) return 'Yoga';
    if (type.includes('meditation')) return 'Meditation';
    // Nutrition hashtags
    if (type.includes('diet') || type.includes('meal')) return 'Diet';
    if (type.includes('fasting') || type.includes('fast')) return 'Fasting';
    return 'Fitness';
  }

  /**
   * Convert date/time to Unix timestamp in seconds (NIP-101e requirement)
   */
  private toUnixSeconds(dateInput: string | Date | number): string {
    let timestamp: number;

    if (typeof dateInput === 'string') {
      timestamp = new Date(dateInput).getTime();
    } else if (typeof dateInput === 'number') {
      // Check if already in seconds (Unix timestamp)
      timestamp = dateInput < 10000000000 ? dateInput * 1000 : dateInput;
    } else if (dateInput instanceof Date) {
      timestamp = dateInput.getTime();
    } else {
      timestamp = Date.now();
    }

    return Math.floor(timestamp / 1000).toString();
  }

  /**
   * Generate human-readable workout description for content field
   * Matches runstr GitHub format
   */
  private generateWorkoutDescription(workout: PublishableWorkout): string {
    const exerciseVerb = this.getExerciseVerb(workout.type);
    const specificExercise = this.getSpecificExerciseName(workout);

    // Priority 1: User's custom notes (if not auto-generated from preset)
    if (workout.notes && !this.isAutoGeneratedNote(workout.notes)) {
      return workout.notes;
    }
    if (workout.metadata?.notes && workout.metadata.notes.length > 0) {
      return workout.metadata.notes;
    }

    // Priority 2: Strength workouts with sets/reps and specific exercise name
    if (
      (workout.sets || workout.reps) &&
      exerciseVerb === 'strength' &&
      specificExercise
    ) {
      if (workout.reps && workout.sets) {
        return `Completed ${workout.reps} ${specificExercise} in ${workout.sets} sets with RUNSTR!`;
      } else if (workout.reps) {
        return `Completed ${workout.reps} ${specificExercise} with RUNSTR!`;
      }
    }

    // Priority 3: Any workout with a specific exercise name (yoga, meditation, treadmill, etc.)
    if (specificExercise) {
      return `Completed a ${specificExercise} with RUNSTR!`;
    }

    // Priority 4: Generic descriptions with proper grammar
    switch (exerciseVerb) {
      case 'running':
        return 'Completed a run with RUNSTR!';
      case 'walking':
        return 'Completed a walk with RUNSTR!';
      case 'cycling':
        return 'Completed a bike ride with RUNSTR!';
      case 'hiking':
        return 'Completed a hike with RUNSTR!';
      case 'strength':
        return 'Completed a strength training workout with RUNSTR!';
      case 'meditation':
        return 'Completed a meditation session with RUNSTR!';
      default:
        return 'Completed a workout with RUNSTR!';
    }
  }

  /**
   * Check if notes field is auto-generated from preset name
   * Auto-generated notes are just the exercise name (e.g., "Pushups", "Yoga")
   */
  private isAutoGeneratedNote(notes: string): boolean {
    const autoGenerated = [
      'pushups',
      'pullups',
      'situps',
      'yoga',
      'meditation',
      'treadmill',
      'weight training',
      'stretching',
    ];
    return autoGenerated.includes(notes.toLowerCase().split(':')[0]);
  }

  /**
   * Extract specific exercise name from workout metadata or type
   * Returns exercise name like "pushups", "pullups", "yoga session", etc.
   */
  private getSpecificExerciseName(workout: PublishableWorkout): string | null {
    // Check meditation subtype first
    if (workout.meditationType) {
      const meditationTypeMap: Record<string, string> = {
        guided: 'guided meditation',
        unguided: 'unguided meditation',
        breathwork: 'breathwork session',
        body_scan: 'body scan meditation',
        gratitude: 'gratitude meditation',
      };
      return meditationTypeMap[workout.meditationType] || 'meditation session';
    }

    // Check meal type for diet workouts
    if (workout.mealType) {
      return `${workout.mealType} meal`;
    }

    // Check exercise type for strength workouts
    if (workout.exerciseType) {
      return workout.exerciseType;
    }

    // Check notes first (where we store the specific exercise name from manual entry)
    if (workout.notes) {
      const notes = workout.notes.toLowerCase();
      // Strength exercises
      if (notes.includes('pushup')) return 'pushups';
      if (notes.includes('pullup')) return 'pullups';
      if (notes.includes('situp') || notes.includes('sit-up')) return 'situps';
      if (notes.includes('squat')) return 'squats';
      if (notes.includes('burpee')) return 'burpees';
      if (notes.includes('weight training') || notes.startsWith('weights'))
        return 'weight training';
      // Cardio exercises
      if (notes.includes('treadmill')) return 'treadmill run';
      // Wellness activities
      if (notes.startsWith('yoga')) return 'yoga session';
      if (notes.startsWith('meditation')) return 'meditation session';
      if (notes.startsWith('stretching')) return 'stretching session';
    }

    // Check metadata (from manual entry screen)
    if (workout.metadata?.title) {
      const title = workout.metadata.title.toLowerCase();
      // Strength exercises
      if (title.includes('pushup')) return 'pushups';
      if (title.includes('pullup')) return 'pullups';
      if (title.includes('situp') || title.includes('sit-up')) return 'situps';
      if (title.includes('squat')) return 'squats';
      if (title.includes('burpee')) return 'burpees';
      if (title.includes('weight training') || title.includes('weights'))
        return 'weight training';
      // Cardio exercises
      if (title.includes('treadmill')) return 'treadmill run';
      // Wellness activities
      if (title.includes('yoga')) return 'yoga session';
      if (title.includes('meditation')) return 'meditation session';
      if (title.includes('stretching')) return 'stretching session';
    }

    // Check workout type string
    const typeStr = workout.type.toLowerCase();
    if (typeStr.includes('pushup')) return 'pushups';
    if (typeStr.includes('pullup')) return 'pullups';
    if (typeStr.includes('situp') || typeStr.includes('sit-up'))
      return 'situps';
    if (typeStr.includes('squat')) return 'squats';
    if (typeStr.includes('burpee')) return 'burpees';

    // Check sourceApp for exercise type
    if (workout.sourceApp) {
      const sourceStr = workout.sourceApp.toLowerCase();
      if (sourceStr.includes('pushup')) return 'pushups';
      if (sourceStr.includes('pullup')) return 'pullups';
      if (sourceStr.includes('situp')) return 'situps';
      if (sourceStr.includes('weight')) return 'weight training';
      if (sourceStr.includes('treadmill')) return 'treadmill run';
    }

    return null;
  }

  /**
   * Get readable workout type for social posts
   */
  private getReadableWorkoutType(workoutType: string): string {
    const type = workoutType.toLowerCase();
    if (type.includes('run') || type === 'running') return 'run';
    if (type.includes('walk') || type === 'walking') return 'walk';
    if (type.includes('cycl') || type === 'cycling' || type.includes('bike'))
      return 'bike ride';
    if (type.includes('hik')) return 'hike';
    if (type.includes('swim')) return 'swim';
    if (type.includes('row')) return 'rowing session';
    if (type.includes('gym') || type.includes('strength')) return 'gym workout';
    if (type.includes('yoga')) return 'yoga';
    if (type.includes('meditation')) return 'meditation';
    if (type.includes('stretch')) return 'stretching';
    return 'workout';
  }

  /**
   * Format duration for social posts (MM:SS or HH:MM:SS)
   */
  private formatDurationForPost(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Calculate pace (min:sec per km or mi)
   */
  private calculatePace(
    distanceMeters: number,
    durationSeconds: number,
    unitSystem?: 'metric' | 'imperial'
  ): string {
    if (distanceMeters <= 0 || durationSeconds <= 0) return 'N/A';

    const distanceKm = distanceMeters / 1000;
    const distanceMiles = distanceKm * 0.621371;

    const minutesPerUnit =
      unitSystem === 'imperial'
        ? durationSeconds / 60 / distanceMiles
        : durationSeconds / 60 / distanceKm;

    const paceMinutes = Math.floor(minutesPerUnit);
    const paceSeconds = Math.round((minutesPerUnit - paceMinutes) * 60);

    const unit = unitSystem === 'imperial' ? '/mi' : '/km';
    return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')} ${unit}`;
  }

  /**
   * Create tags for kind 1 social posts with NIP-94 image metadata
   * ✅ UPDATED: Charity is now the team - adds charity ID to BOTH team AND charity tags
   */
  private createSocialPostTags(
    workout: PublishableWorkout,
    imageUrl?: string,
    imageDimensions?: { width: number; height: number },
    selectedCharity?: Charity | null
  ): string[][] {
    const tags: string[][] = [
      ['t', 'fitness'], // General fitness hashtag
      ['t', workout.type], // Activity-specific hashtag
      ['t', 'RUNSTR'], // RUNSTR brand hashtag
    ];

    // Add specific tags based on workout type
    if (workout.type === 'running') {
      tags.push(['t', 'running']);
      if (workout.distance && workout.distance >= 5000) {
        tags.push(['t', '5K']);
      }
      if (workout.distance && workout.distance >= 10000) {
        tags.push(['t', '10K']);
      }
    } else if (workout.type === 'cycling') {
      tags.push(['t', 'cycling']);
      tags.push(['t', 'bike']);
    } else if (workout.type === 'gym' || workout.type === 'strength_training') {
      tags.push(['t', 'gym']);
      tags.push(['t', 'strength']);
    }

    // Add NIP-94 image metadata tag (imeta) if image was uploaded
    if (imageUrl) {
      const imetaTag = ['imeta', `url ${imageUrl}`];
      if (imageDimensions) {
        imetaTag.push(`dim ${imageDimensions.width}x${imageDimensions.height}`);
      }
      imetaTag.push('m image/png');
      tags.push(imetaTag);
    }

    // Reference the original workout event if it exists
    if (workout.nostrEventId) {
      tags.push(['e', workout.nostrEventId]);
    }

    // Add team AND charity tags (charities ARE teams now)
    // Self team: add team tag but skip charity tag
    if (selectedCharity) {
      if (selectedCharity.isSelf) {
        tags.push(['team', SELF_TEAM_ID]);
        console.log('   ✅ Added team tag to kind 1: self');
      } else {
        // Team tag for leaderboards and competition filtering
        tags.push(['team', selectedCharity.id]);

        // Team name hashtag
        const teamHashtag = selectedCharity.name.replace(/[^a-zA-Z0-9]/g, '');
        tags.push(['t', teamHashtag]);

        console.log(`   ✅ Added team tag to kind 1: ${selectedCharity.id}`);

        // Charity tag for external client parsing and donations
        if (selectedCharity.lightningAddress) {
          tags.push([
            'charity',
            selectedCharity.id,
            selectedCharity.name,
            selectedCharity.lightningAddress,
          ]);
        } else {
          tags.push([
            'charity',
            selectedCharity.id,
            selectedCharity.name,
          ]);
        }
        console.log(`   ✅ Added charity tag to kind 1: ${selectedCharity.name}`);
      }
    }

    return tags;
  }

  /**
   * Generate social post content with clean format
   * If imageUrl is provided, content is minimal (image + hashtags only)
   * Otherwise, full text stats are included
   * ✅ UPDATED: Now includes team mention (charities ARE teams)
   */
  private async generateSocialPostContent(
    workout: PublishableWorkout,
    options: SocialPostOptions,
    imageUrl?: string
  ): Promise<string> {
    let content = '';
    const activityHashtag = this.getActivityHashtag(workout.type);

    // Get selected team (charity) from TeamsScreen selection
    // Self team doesn't have a team name for social posts
    // Community teams are fetched from Supabase user_teams table
    const selectedTeamId = await AsyncStorage.getItem('@runstr:selected_team_id');
    let teamName: string | null = null;
    if (selectedTeamId && !isSelfTeam(selectedTeamId)) {
      if (isCommunityTeam(selectedTeamId)) {
        // Community team -- look up name from Supabase
        const uuid = extractCommunityTeamUUID(selectedTeamId);
        if (isSupabaseConfigured()) {
          try {
            const communityTeam = await UserTeamService.getTeamById(uuid);
            teamName = communityTeam?.name || null;
          } catch (err) {
            console.warn(`[WorkoutPublishing] Failed to fetch community team name for social post:`, err);
          }
        }
      } else {
        const selectedCharity = getCharityById(selectedTeamId);
        teamName = selectedCharity?.name || null;
      }
    }

    // Generate activity-specific team mention (e.g., "Running for Bitcoin Beach!")
    const getTeamMention = () => {
      if (!teamName) return null;
      const exerciseVerb = this.getExerciseVerb(workout.type);
      const verbMap: Record<string, string> = {
        running: 'Running',
        walking: 'Walking',
        cycling: 'Cycling',
        hiking: 'Hiking',
        swimming: 'Swimming',
        rowing: 'Rowing',
        strength: 'Training',
        yoga: 'Practicing yoga',
        meditation: 'Meditating',
        diet: 'Eating healthy',
        fasting: 'Fasting',
      };
      const verb = verbMap[exerciseVerb] || 'Working out';
      return `${verb} for ${teamName}!`;
    };

    // If we have an image, keep it minimal - the card has all the stats
    if (imageUrl) {
      content = `${imageUrl}\n\n`;
      const teamMention = getTeamMention();
      if (teamMention) {
        content += `${teamMention}\n\n`;
      }
      content += `#RUNSTR #${activityHashtag}`;
      if (teamName) {
        const teamHashtag = teamName.replace(/[^a-zA-Z0-9]/g, '');
        content += ` #${teamHashtag}`;
      }
      return content;
    }

    // Fallback: Full text content when no image is available
    // Custom message takes priority
    if (options.customMessage) {
      content = options.customMessage + '\n\n';
    } else {
      // Generate clean header with specific exercise details
      const exerciseVerb = this.getExerciseVerb(workout.type);
      const specificExercise = this.getSpecificExerciseName(workout);

      // For strength workouts with sets/reps and specific exercise, create detailed header
      if (
        (workout.sets || workout.reps) &&
        exerciseVerb === 'strength' &&
        specificExercise
      ) {
        if (workout.reps && workout.sets) {
          content = `Completed ${workout.reps} ${specificExercise} in ${workout.sets} sets with RUNSTR!\n\n`;
        } else if (workout.reps) {
          content = `Completed ${workout.reps} ${specificExercise} with RUNSTR!\n\n`;
        } else {
          content = `Completed ${specificExercise} with RUNSTR!\n\n`;
        }
      }
      // For any workout with a specific exercise name (yoga, meditation, treadmill, etc.)
      else if (specificExercise) {
        content = `Completed ${specificExercise} with RUNSTR!\n\n`;
      }
      // Generic format with readable workout type
      else {
        const workoutType = this.getReadableWorkoutType(workout.type);
        content = `Just completed ${workoutType} with RUNSTR!\n\n`;
      }
    }

    // Add workout stats in vertical format
    content += this.formatWorkoutStats(workout);

    // Add team mention (activity-specific shout-out)
    const teamMention = getTeamMention();
    if (teamMention) {
      content += `\n\n${teamMention}`;
    }

    // Add hashtags (including team hashtag if user has selected a team)
    content += `\n\n#RUNSTR #${activityHashtag}`;
    if (teamName) {
      const teamHashtag = teamName.replace(/[^a-zA-Z0-9]/g, '');
      content += ` #${teamHashtag}`;
    }

    return content.trim();
  }

  /**
   * Format workout stats for social post in vertical list format
   */
  private formatWorkoutStats(workout: PublishableWorkout): string {
    const stats = [];

    // Strength training stats (sets/reps) - show first for strength workouts
    if (workout.reps && workout.reps > 0) {
      stats.push(`💪 Reps: ${workout.reps}`);
    }
    if (workout.sets && workout.sets > 0) {
      stats.push(`🔢 Sets: ${workout.sets}`);
    }

    // Steps (for walking/step-based workouts)
    const steps = workout.steps ?? (workout.metadata as any)?.steps;
    if (steps && typeof steps === 'number' && steps > 0) {
      stats.push(`👟 Steps: ${steps.toLocaleString()}`);
    }

    // Duration - format as HH:MM:SS or MM:SS
    const durationFormatted = this.formatDurationForPost(workout.duration);
    stats.push(`⏱️ Duration: ${durationFormatted}`);

    // Distance
    if (workout.distance && workout.distance > 0) {
      const distanceKm = (workout.distance / 1000).toFixed(2);
      const distanceDisplay =
        workout.unitSystem === 'imperial'
          ? `${(parseFloat(distanceKm) * 0.621371).toFixed(2)} mi`
          : `${distanceKm} km`;
      stats.push(`📏 Distance: ${distanceDisplay}`);

      // Pace - only if we have both distance and duration
      if (workout.duration > 0) {
        const paceStr = this.calculatePace(
          workout.distance,
          workout.duration,
          workout.unitSystem
        );
        stats.push(`⚡ Pace: ${paceStr}`);
      }
    }

    // Calories
    if (workout.calories && workout.calories > 0) {
      stats.push(`🔥 Calories: ${Math.round(workout.calories)} kcal`);
    }

    // Elevation gain
    if (workout.elevationGain && workout.elevationGain > 0) {
      const elevationDisplay =
        workout.unitSystem === 'imperial'
          ? `${Math.round(workout.elevationGain * 3.28084)} ft`
          : `${Math.round(workout.elevationGain)} m`;
      stats.push(`🏔️ Elevation Gain: ${elevationDisplay}`);
    }

    return stats.join('\n');
  }

}

export default WorkoutPublishingService.getInstance();
