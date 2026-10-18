/**
 * WorkoutPublishingService - Workout Submission to Supabase
 *
 * All workouts are submitted to Supabase unconditionally for leaderboard
 * tracking and reward eligibility. Tags are built directly without NDK
 * event creation or signing.
 *
 * Flow:
 * - Get pubkey from AsyncStorage (no NDK signer needed)
 * - Build kind 1301 tags directly
 * - Submit workout to Supabase (for leaderboards and rewards)
 * - Fire-and-forget: cache invalidation, Running Bitcoin checks
 */

import { GlobalNDKService } from './GlobalNDKService';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import {
  WorkoutCardGenerator,
  type WorkoutCardOptions,
} from './workoutCardGenerator';
import type { Workout } from '../../types/workout';
import type { NDKSigner } from '@nostr-dev-kit/ndk';
import { ImageUploadService } from '../media/ImageUploadService';
import { withTimeout, NOSTR_TIMEOUTS } from '../../utils/nostrTimeout';
import Constants from 'expo-constants';
// RewardDestinationService removed - reward routing now uses isPPQTeam() inline

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
   * Entry point for posting a workout to Nostr. Phase 2: always a kind 1301
   * workout note (native in Amethyst, POWR, Chachi) — the kind 1 card post is
   * retired and `options.format` is ignored. The Supabase feed dual-write only
   * runs while FEATURES.supabase is on.
   */
  async postWorkout(
    workout: PublishableWorkout,
    signer: NDKSigner,
    userId: string,
    options: (SocialPostOptions & { format?: 'kind1' | 'kind1301' }) = {}
  ): Promise<WorkoutPublishResult> {
    const eventId = await this.publishWorkout1301(workout, signer, userId);
    return { success: !!eventId, eventId: eventId || undefined };
  }

  /**
   * Publish a workout to Nostr relays as a PUBLIC kind 1301 (NIP-101e) event.
   *
   * This is the structured workout record (rendered natively by Amethyst).
   * It is intentionally NON-BLOCKING and must never throw into the save path:
   * local storage is the source of truth, so publishing is best-effort.
   *
   * Privacy: keeps only an ALLOWLIST of public workout-data tags. The
   * allowlist fails closed: any tag added to the builder later is excluded
   * unless explicitly allowed. The `client:RUNSTR` tag is kept for attribution.
   *
   * @returns the published event id, or null on any failure (never throws).
   */
  async publishWorkout1301(
    workout: PublishableWorkout,
    signer: NDKSigner,
    _userId: string
  ): Promise<string | null> {
    try {
      const ndk = await GlobalNDKService.getInstance();
      // Build the tag set, then keep only allowlisted public workout tags.
      const allTags = await this.createNIP101eWorkoutTags(workout);
      // Allowlist (default-deny): only known workout-data tags are published.
      // A denylist silently leaks any tag added to createNIP101eWorkoutTags
      // later (it already missed the verification/team tags) — an allowlist
      // fails closed instead. Reward/routing and anti-cheat tags are
      // intentionally absent and must never be published.
      const PUBLIC_TAG_ALLOWLIST = new Set([
        'd',
        'title',
        'exercise',
        'duration',
        'source',
        'client',
        't',
        'distance',
        'elevation_gain',
        'elevation_loss',
        'calories',
        'steps',
        'sets',
        'reps',
        'weight',
        'weight_set',
        'meditation_type',
        'meal_type',
        'meal_size',
        'exercise_type',
        'split',
        'split_pace',
        'avg_pace',
        'data_points',
        'recording_pauses',
        'workout_start_time',
      ]);
      const publicTags = allTags.filter((t) => PUBLIC_TAG_ALLOWLIST.has(t[0]));

      const ndkEvent = new NDKEvent(ndk);
      ndkEvent.kind = 1301;
      ndkEvent.content = this.generateWorkoutDescription(workout);
      ndkEvent.tags = publicTags;
      ndkEvent.created_at = workout.startTime
        ? Math.floor(new Date(workout.startTime).getTime() / 1000)
        : Math.floor(Date.now() / 1000);

      // Amber (external signer) needs a longer timeout for user approval.
      const isAmberSigner =
        signer.constructor.name === 'AmberNDKSigner' ||
        (signer as any).AMBER_TIMEOUT_MS !== undefined;
      const signTimeout = isAmberSigner
        ? NOSTR_TIMEOUTS.SIGN_AMBER
        : NOSTR_TIMEOUTS.SIGN;

      await withTimeout(
        ndkEvent.sign(signer),
        signTimeout,
        'Workout 1301 signing'
      );

      const relaysReady = await GlobalNDKService.waitForMinimumConnection(
        1,
        5000
      );
      if (!relaysReady) {
        console.warn(
          '[WorkoutPublishing] No relays connected — attempting 1301 publish anyway'
        );
      }

      const publishResult = await withTimeout(
        ndkEvent.publish(),
        NOSTR_TIMEOUTS.PUBLISH,
        'Workout 1301 publishing'
      );

      const relayCount = publishResult?.size ?? 0;
      if (relayCount === 0) {
        throw new Error('Published 1301 to 0 relays — no relay connections');
      }

      console.log(
        `📡 Published kind 1301 to ${relayCount} relay(s): ${ndkEvent.id}`
      );
      return ndkEvent.id || null;
    } catch (error) {
      // Non-blocking: Supabase is the source of truth; swallow publish errors.
      console.error(
        '[WorkoutPublishing] 1301 publish failed (non-blocking):',
        error
      );
      return null;
    }
  }

  /**
   * Create runstr-compatible tags for kind 1301 workout events
   * Matches the exact format used by runstr GitHub implementation
   */
  private async createNIP101eWorkoutTags(workout: PublishableWorkout): Promise<string[][]> {
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

}

export default WorkoutPublishingService.getInstance();
