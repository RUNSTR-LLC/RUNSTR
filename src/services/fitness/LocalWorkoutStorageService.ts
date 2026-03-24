/**
 * LocalWorkoutStorageService - Persistent storage for Activity Tracker workouts
 * Stores GPS-tracked and manually-entered workouts until synced to Nostr
 * Integrates with WorkoutMergeService for unified workout history display
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WorkoutType } from '../../types/workout';
import type { Split } from '../activity/SplitTrackingService';
import { DailyRewardService } from '../rewards/DailyRewardService';
import { RewardDestinationService } from '../rewards/RewardDestinationService';
import { SupabaseCompetitionService } from '../backend/SupabaseCompetitionService';
import Toast from 'react-native-toast-message';

/**
 * Result returned from saveGPSWorkout including reward info
 */
export interface SaveGPSWorkoutResult {
  workoutId: string;
  rewardSent?: boolean;
  rewardAmount?: number;
}

export interface LocalWorkout {
  id: string; // Unique identifier for deduplication
  type: WorkoutType;
  startTime: string; // ISO timestamp
  endTime: string; // ISO timestamp
  duration: number; // seconds
  distance?: number; // meters
  calories?: number; // NEW: Estimated or actual calorie burn/intake
  steps?: number; // Step count (for daily steps workouts)
  source: 'gps_tracker' | 'manual_entry' | 'daily_steps' | 'imported_nostr' | 'health_connect' | 'healthkit';

  // GPS-specific fields
  elevation?: number; // meters
  pace?: number; // minutes per km
  speed?: number; // km/h
  splits?: Split[];
  raceDistance?: string; // Race preset (e.g., '5k', '10k', 'half', 'marathon')

  // Manual entry fields
  reps?: number;
  sets?: number;
  notes?: string;

  // Meditation-specific fields
  meditationType?:
    | 'guided'
    | 'unguided'
    | 'breathwork'
    | 'body_scan'
    | 'gratitude';
  mindfulnessRating?: number; // 1-5

  // Diet/Fasting-specific fields
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  mealTime?: string; // ISO timestamp
  mealSize?: 'small' | 'medium' | 'large' | 'xl'; // NEW: Meal portion size
  fastingDuration?: number; // seconds

  // Strength training-specific fields
  exerciseType?:
    | 'pushups'
    | 'pullups'
    | 'situps'
    | 'squats'
    | 'curls'
    | 'bench'
    | string;
  repsBreakdown?: number[]; // Array of reps per set (e.g., [20, 18, 15])
  weightsPerSet?: number[]; // Array of weights per set (e.g., [135, 145, 155])
  restTime?: number; // Rest between sets in seconds
  weight?: number; // Average weight used in pounds or kilograms

  // Fitness test-specific fields
  fitnessTestScore?: number; // Composite score 0-300
  fitnessTestMaxScore?: number; // Always 300
  fitnessTestGrade?: string; // Elite/Advanced/Intermediate/Beginner/Baseline
  fitnessTestComponents?: {
    pushups: { reps: number; score: number };
    situps: { reps: number; score: number };
    run5k: { timeSeconds: number; score: number };
  };

  // Weather context fields
  weather?: {
    temp: number; // Temperature in Celsius
    feelsLike: number; // Feels like temperature
    description: string; // e.g., "Clear sky"
    icon: string; // Weather icon code
    humidity?: number; // Humidity percentage
    windSpeed?: number; // Wind speed in m/s
  };

  // Route labeling (simple name-based grouping)
  routeId?: string; // Reference to RouteLabel.id if this workout is tagged with a route
  routeLabel?: string; // Route name for display convenience

  // Card/template storage for sharing
  savedCard?: {
    templateId: 'achievement' | 'progress' | 'minimal' | 'stats' | 'elegant' | 'custom_photo' | 'vertical';
    customPhotoUri?: string; // Local file path if user took photo
    generatedAt: string; // ISO timestamp
  };

  // Metadata
  createdAt: string; // ISO timestamp
  syncedToNostr: boolean;
  nostrEventId?: string; // Set when synced
  syncedAt?: string; // ISO timestamp when synced

  // Manual entry flag for competition filtering
  isManualEntry?: boolean; // True for custom/manual workouts (excluded from competitions)

  // Supabase competition submission status
  supabaseSubmitted?: boolean; // true=success, false=failed, undefined=not attempted
  supabaseError?: string; // Last error message on failure
}

const STORAGE_KEYS = {
  LOCAL_WORKOUTS: 'local_workouts',
  WORKOUT_ID_COUNTER: 'local_workout_id_counter',
  NOSTR_IMPORT_FLAG: 'nostr_workout_import_completed',
  NOSTR_IMPORT_STATS: 'nostr_workout_import_stats',
  // Custom exercise name storage (per category)
  CUSTOM_EXERCISES_CARDIO: '@runstr:custom_exercises_cardio',
  CUSTOM_EXERCISES_STRENGTH: '@runstr:custom_exercises_strength',
  CUSTOM_EXERCISES_DIET: '@runstr:custom_exercises_diet',
  CUSTOM_EXERCISES_WELLNESS: '@runstr:custom_exercises_wellness',
  // Water tracking
  WATER_DAILY_GOAL: '@runstr:water_daily_goal',
};

export class LocalWorkoutStorageService {
  private static instance: LocalWorkoutStorageService;

  private constructor() {}

  static getInstance(): LocalWorkoutStorageService {
    if (!LocalWorkoutStorageService.instance) {
      LocalWorkoutStorageService.instance = new LocalWorkoutStorageService();
    }
    return LocalWorkoutStorageService.instance;
  }

  /**
   * Generate unique workout ID for local storage
   */
  private async generateWorkoutId(): Promise<string> {
    try {
      const counterStr = await AsyncStorage.getItem(
        STORAGE_KEYS.WORKOUT_ID_COUNTER
      );
      const counter = counterStr ? parseInt(counterStr, 10) : 0;
      const newCounter = counter + 1;
      await AsyncStorage.setItem(
        STORAGE_KEYS.WORKOUT_ID_COUNTER,
        newCounter.toString()
      );

      // Format: local_[timestamp]_[counter]_[random]
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 9);
      return `local_${timestamp}_${newCounter}_${random}`;
    } catch (error) {
      console.error('❌ Failed to generate workout ID:', error);
      // Fallback to simple timestamp-based ID
      return `local_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;
    }
  }

  /**
   * Save GPS-tracked workout to local storage
   * Returns workout ID and reward info if a reward was sent
   */
  async saveGPSWorkout(workout: {
    type: WorkoutType;
    distance: number; // meters
    duration: number; // seconds
    calories: number;
    elevation?: number; // meters
    pace?: number; // minutes per km
    speed?: number; // km/h
    splits?: Split[];
    raceDistance?: string; // Race preset (e.g., '5k', '10k', 'half', 'marathon')
    // Optional: GPS coordinates for weather lookup
    startLatitude?: number;
    startLongitude?: number;
    // Optional: Route tagging
    routeId?: string;
    routeLabel?: string;
  }): Promise<SaveGPSWorkoutResult> {
    try {
      const workoutId = await this.generateWorkoutId();
      const now = new Date().toISOString();
      const startTime = new Date(
        Date.now() - workout.duration * 1000
      ).toISOString();

      // Fetch weather conditions if GPS coordinates available
      let weather;
      if (workout.startLatitude && workout.startLongitude) {
        try {
          const { weatherService } = await import('../activity/WeatherService');
          const conditions = await weatherService.getWeatherForWorkout(
            workout.startLatitude,
            workout.startLongitude
          );

          if (conditions) {
            weather = {
              temp: conditions.temp,
              feelsLike: conditions.feelsLike,
              description: conditions.description,
              icon: conditions.icon,
              humidity: conditions.humidity,
              windSpeed: conditions.windSpeed,
            };
            console.log(
              `✅ Weather recorded: ${conditions.temp}°C, ${conditions.description}`
            );
          }
        } catch (weatherError) {
          console.warn(
            '⚠️ Failed to fetch weather, continuing without:',
            weatherError
          );
          // Non-critical - continue saving workout without weather
        }
      }

      const localWorkout: LocalWorkout = {
        id: workoutId,
        type: workout.type,
        startTime,
        endTime: now,
        duration: workout.duration,
        distance: workout.distance,
        calories: workout.calories,
        elevation: workout.elevation,
        pace: workout.pace,
        speed: workout.speed,
        splits: workout.splits,
        raceDistance: workout.raceDistance,
        weather, // Add weather data
        routeId: workout.routeId,
        routeLabel: workout.routeLabel,
        source: 'gps_tracker',
        createdAt: now,
        syncedToNostr: false,
      };

      await this.saveWorkout(localWorkout);
      console.log(
        `✅ Saved GPS workout locally: ${workoutId} (${workout.type}, ${(
          workout.distance / 1000
        ).toFixed(2)}km)`
      );

      // Reward is now triggered in the central saveWorkout() method
      // This ensures ANY workout hitting local storage triggers reward check
      // (rate limited to 1 per day by DailyRewardService)
      return { workoutId, rewardSent: false, rewardAmount: 0 };
    } catch (error) {
      console.error('❌ Failed to save GPS workout:', error);
      throw error;
    }
  }

  /**
   * Save manually-entered workout to local storage
   */
  async saveManualWorkout(workout: {
    type: WorkoutType;
    duration?: number; // seconds (consistent with saveGPSWorkout)
    distance?: number; // km
    reps?: number;
    sets?: number;
    notes?: string;
    calories?: number; // NEW: Optional calorie estimation
    // Meditation fields
    meditationType?:
      | 'guided'
      | 'unguided'
      | 'breathwork'
      | 'body_scan'
      | 'gratitude';
    mindfulnessRating?: number;
    // Diet/Fasting fields
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    mealTime?: string;
    mealSize?: 'small' | 'medium' | 'large' | 'xl'; // NEW: Meal portion size
    fastingDuration?: number;
    // Strength training fields
    exerciseType?: string;
    repsBreakdown?: number[];
    weightsPerSet?: number[];
    restTime?: number;
    weight?: number;
  }): Promise<string> {
    try {
      const workoutId = await this.generateWorkoutId();
      const now = new Date().toISOString();

      // Duration is already in seconds (no conversion needed)
      const durationSeconds = workout.duration || 0;
      const startTime = workout.duration
        ? new Date(Date.now() - durationSeconds * 1000).toISOString()
        : now;

      // Convert distance from km to meters (if provided)
      const distanceMeters = workout.distance
        ? workout.distance * 1000
        : undefined;

      const localWorkout: LocalWorkout = {
        id: workoutId,
        type: workout.type,
        startTime,
        endTime: now,
        duration: durationSeconds,
        distance: distanceMeters,
        calories: workout.calories, // NEW: Include calorie data
        reps: workout.reps,
        sets: workout.sets,
        notes: workout.notes,
        // Meditation fields
        meditationType: workout.meditationType,
        mindfulnessRating: workout.mindfulnessRating,
        // Diet/Fasting fields
        mealType: workout.mealType,
        mealTime: workout.mealTime,
        mealSize: workout.mealSize, // NEW: Include meal size
        fastingDuration: workout.fastingDuration,
        // Strength training fields
        exerciseType: workout.exerciseType,
        repsBreakdown: workout.repsBreakdown,
        weightsPerSet: workout.weightsPerSet,
        restTime: workout.restTime,
        weight: workout.weight,
        // Metadata
        source: 'manual_entry',
        createdAt: now,
        syncedToNostr: false,
      };

      await this.saveWorkout(localWorkout);
      console.log(
        `✅ Saved manual workout locally: ${workoutId} (${workout.type})`
      );
      return workoutId;
    } catch (error) {
      console.error('❌ Failed to save manual workout:', error);
      throw error;
    }
  }

  /**
   * Save daily steps workout to local storage (used for manual social-post flow)
   */
  async saveDailyStepsWorkout(workout: {
    steps: number;
    distance?: number; // meters (estimated non-GPS step distance)
    startTime: string; // ISO timestamp (midnight today)
    endTime: string; // ISO timestamp (now)
    duration: number; // seconds from midnight to now
    calories?: number;
  }): Promise<string> {
    try {
      const workoutId = await this.generateWorkoutId();

      const localWorkout: LocalWorkout = {
        id: workoutId,
        type: 'walking',
        startTime: workout.startTime,
        endTime: workout.endTime,
        duration: workout.duration,
        distance: workout.distance,
        steps: workout.steps,
        calories: workout.calories,
        source: 'daily_steps',
        createdAt: new Date().toISOString(),
        syncedToNostr: false,
      };

      await this.saveWorkout(localWorkout);
      console.log(
        `✅ Saved daily steps workout locally: ${workoutId} (${workout.steps} steps${workout.distance ? `, ~${(workout.distance / 1000).toFixed(2)}km` : ''})`
      );
      return workoutId;
    } catch (error) {
      console.error('❌ Failed to save daily steps workout:', error);
      throw error;
    }
  }

  /**
   * Upsert today's daily step workout entry (create or update)
   * Uses deterministic ID: steps_YYYY-MM-DD_npub12chars
   * Called by StepCompetitionService to keep workout history in sync with step count.
   * Does NOT trigger autoSubmitToSupabase (StepCompetitionService handles Supabase separately).
   */
  async upsertDailyStepsWorkout(workout: {
    steps: number;
    distance: number; // meters (estimated non-GPS step distance)
    startTime: string; // ISO timestamp (midnight today)
    endTime: string; // ISO timestamp (now)
    duration: number; // seconds from midnight to now
    calories?: number;
  }, deterministicId: string): Promise<string> {
    try {
      const workouts = await this.getAllWorkouts();
      const existingIndex = workouts.findIndex(w => w.id === deterministicId);

      if (existingIndex !== -1) {
        // UPDATE existing entry
        workouts[existingIndex].steps = workout.steps;
        workouts[existingIndex].distance = workout.distance;
        workouts[existingIndex].endTime = workout.endTime;
        workouts[existingIndex].calories = workout.calories;

        await AsyncStorage.setItem(
          STORAGE_KEYS.LOCAL_WORKOUTS,
          JSON.stringify(workouts)
        );
        console.log(
          `✅ Updated daily steps workout: ${deterministicId} (${workout.steps} steps, ~${(workout.distance / 1000).toFixed(2)}km)`
        );
      } else {
        // CREATE new entry - write directly to storage (no saveWorkout to skip autoSubmit/reward)
        // supabaseSubmitted defaults to false so the Compete button shows if submission failed
        const localWorkout: LocalWorkout = {
          id: deterministicId,
          type: 'walking',
          startTime: workout.startTime,
          endTime: workout.endTime,
          duration: workout.duration,
          distance: workout.distance,
          steps: workout.steps,
          calories: workout.calories,
          source: 'daily_steps',
          createdAt: new Date().toISOString(),
          syncedToNostr: false,
          supabaseSubmitted: false,
        };

        workouts.push(localWorkout);
        await AsyncStorage.setItem(
          STORAGE_KEYS.LOCAL_WORKOUTS,
          JSON.stringify(workouts)
        );
        console.log(
          `✅ Created daily steps workout: ${deterministicId} (${workout.steps} steps, ~${(workout.distance / 1000).toFixed(2)}km)`
        );
      }

      return deterministicId;
    } catch (error) {
      console.error('❌ Failed to upsert daily steps workout:', error);
      throw error;
    }
  }

  /**
   * Check if daily steps have already been posted for a specific date
   * @param date - ISO date string (YYYY-MM-DD)
   */
  async hasDailyStepsForDate(date: string): Promise<boolean> {
    try {
      const workouts = await this.getAllWorkouts();

      // Find any daily_steps workout for this date
      const hasSteps = workouts.some((workout) => {
        if (workout.source !== 'daily_steps') return false;

        // Extract date from startTime (YYYY-MM-DD)
        const workoutDate = workout.startTime.split('T')[0];
        return workoutDate === date;
      });

      return hasSteps;
    } catch (error) {
      console.error('❌ Failed to check daily steps for date:', error);
      return false;
    }
  }

  /**
   * Internal method to save workout to AsyncStorage
   * This is the central point for ALL local workout saves - GPS, manual, etc.
   * Reward trigger is here to ensure ANY workout triggers the daily reward check.
   */
  private async saveWorkout(workout: LocalWorkout): Promise<void> {
    try {
      const workouts = await this.getAllWorkouts();
      workouts.push(workout);
      await AsyncStorage.setItem(
        STORAGE_KEYS.LOCAL_WORKOUTS,
        JSON.stringify(workouts)
      );

      // REWARD TRIGGER: Only user-generated cardio workouts on a new day trigger rewards
      // Uses checkStreakAndReward() which:
      // 1. Filters by source (only gps_tracker, manual_entry)
      // 2. Filters by activity type (only running, walking, cycling)
      // 3. Uses atomic "streak incremented today" flag to prevent race conditions
      try {
        const pubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
        if (pubkey) {
          console.log(`[LocalWorkoutStorage] Checking streak reward for ${workout.source} ${workout.type} workout...`);
          // Fire and forget - don't block workout save for reward
          DailyRewardService.checkStreakAndReward(pubkey, workout.source, workout.type, workout.id).catch((rewardError) => {
            console.warn('[LocalWorkoutStorage] Reward error (silent):', rewardError);
          });
        }
      } catch (rewardError) {
        // Silent failure - never block workout saves for reward issues
        console.warn('[LocalWorkoutStorage] Reward trigger error (silent):', rewardError);
      }

      // AUTO-SUBMIT TO SUPABASE: Fire-and-forget for leaderboard/competition tracking
      this.autoSubmitToSupabase(workout).catch((err) => {
        console.warn('[LocalWorkoutStorage] Supabase auto-submit error (silent):', err);
      });
    } catch (error) {
      console.error('❌ Failed to save workout to storage:', error);
      throw error;
    }
  }

  /**
   * Format seconds into HH:MM:SS string for kind 1301 tags
   */
  private formatHHMMSS(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  /**
   * Build kind 1301 tags array from a local workout
   */
  private buildWorkoutTags(workout: LocalWorkout): string[][] {
    const tags: string[][] = [];
    tags.push(['exercise', workout.type]);

    if (workout.distance) {
      tags.push(['distance', (workout.distance / 1000).toFixed(2), 'km']);
    }

    if (workout.duration) {
      tags.push(['duration', this.formatHHMMSS(workout.duration)]);
    }

    // Splits — critical for accurate 5K/10K/Half/Marathon target times
    if (workout.splits && workout.splits.length > 0) {
      for (const split of workout.splits) {
        tags.push(['split', String(split.number), this.formatHHMMSS(split.elapsedTime)]);
      }
    }

    // Steps (for daily_steps workouts)
    if (workout.steps) {
      tags.push(['steps', workout.steps.toString()]);
      tags.push(['source', 'auto_steps']);
    }

    return tags;
  }

  /**
   * Get cached profile data (name/picture) for the current user
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
   * Add reward-routing audit tags without leaking user Lightning addresses.
   */
  private async appendRewardDestinationTags(tags: string[][]): Promise<void> {
    try {
      const destination = await RewardDestinationService.getDestinationAddress();

      if (destination.isPPQ) {
        tags.push(['reward_destination', 'ppq']);
      } else if (destination.isCharity) {
        tags.push(['reward_destination', 'charity']);
      } else {
        tags.push(['reward_destination', 'user']);
      }

      if (destination.charityId) {
        tags.push(['reward_charity_id', destination.charityId]);
      }
    } catch (error) {
      console.warn('[LocalWorkoutStorage] Failed to add reward destination tags:', error);
    }
  }

  /**
   * Auto-submit cardio workouts to Supabase for leaderboard tracking.
   * Fire-and-forget — errors are logged, never block the save path.
   */
  private async autoSubmitToSupabase(workout: LocalWorkout): Promise<void> {
    const CARDIO_TYPES: string[] = ['running', 'walking', 'cycling', 'hiking'];
    if (!CARDIO_TYPES.includes(workout.type)) return;
    if (!workout.distance || workout.distance <= 0) return;

    const npub = await AsyncStorage.getItem('@runstr:npub');
    if (!npub) return;

    console.log(`[LocalWorkoutStorage] Auto-submitting ${workout.type} workout to Supabase...`);

    try {
      // Build tags with splits, team, and exercise metadata
      const tags = this.buildWorkoutTags(workout);

      // Include team/charity tag
      const selectedTeamId = await AsyncStorage.getItem('@runstr:selected_team_id');
      if (selectedTeamId) {
        tags.push(['team', selectedTeamId]);
      }

      // Include reward routing audit tags (user/charity/ppq)
      await this.appendRewardDestinationTags(tags);

      // Get profile for leaderboard display
      const profile = await this.getCachedProfile();

      const result = await SupabaseCompetitionService.submitWorkoutSimple({
        eventId: workout.id,
        npub,
        type: workout.type,
        distance: workout.distance,
        duration: workout.duration,
        calories: workout.calories,
        startTime: workout.startTime,
        tags,
        profileName: profile.name,
        profilePicture: profile.picture,
      });

      if (result.success) {
        await this.updateSupabaseStatus(workout.id, true);
        Toast.show({
          type: 'success',
          text1: 'Workout Submitted',
          text2: 'Your workout is on the leaderboard',
          position: 'bottom',
          visibilityTime: 3000,
        });
      } else if (result.flagged) {
        await this.updateSupabaseStatus(workout.id, true); // Flagged but submitted
        Toast.show({
          type: 'error',
          text1: 'Workout Under Review',
          text2: 'May take time to appear on leaderboard',
          position: 'bottom',
          visibilityTime: 4000,
        });
      } else {
        await this.updateSupabaseStatus(workout.id, false, result.error || 'Submission failed');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await this.updateSupabaseStatus(workout.id, false, errorMsg).catch(() => {});
      console.warn(`[LocalWorkoutStorage] Supabase auto-submit failed for ${workout.id}:`, errorMsg);
    }

    console.log(`[LocalWorkoutStorage] Supabase auto-submit complete for ${workout.id}`);
  }

  /**
   * Update Supabase submission status for a workout
   */
  async updateSupabaseStatus(
    workoutId: string,
    submitted: boolean,
    error?: string
  ): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_WORKOUTS);
      if (!data) return;
      const workouts: LocalWorkout[] = JSON.parse(data);
      const workout = workouts.find((w) => w.id === workoutId);
      if (!workout) return;

      workout.supabaseSubmitted = submitted;
      workout.supabaseError = submitted ? undefined : error;

      await AsyncStorage.setItem(
        STORAGE_KEYS.LOCAL_WORKOUTS,
        JSON.stringify(workouts)
      );
    } catch (err) {
      console.warn('[LocalWorkoutStorage] Failed to update supabase status:', err);
    }
  }

  /**
   * Retry Supabase submission for a failed workout (called by Compete button)
   */
  async retrySupabaseSubmission(
    workoutId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const workout = await this.getWorkoutById(workoutId);
      if (!workout) return { success: false, error: 'Workout not found' };

      const npub = await AsyncStorage.getItem('@runstr:npub');
      if (!npub) return { success: false, error: 'Not logged in' };

      // Build full tags (splits, exercise, team) — same logic as autoSubmitToSupabase
      const tags = this.buildWorkoutTags(workout);

      const selectedTeamId = await AsyncStorage.getItem('@runstr:selected_team_id');
      if (selectedTeamId) {
        tags.push(['team', selectedTeamId]);
      }

      await this.appendRewardDestinationTags(tags);

      const profile = await this.getCachedProfile();

      // For step workouts (source: 'daily_steps'), send duration as 0
      // The locally-stored duration is time-since-midnight, not actual workout duration
      const isStepWorkout = workout.source === 'daily_steps' || workout.id.startsWith('steps_');
      const duration = isStepWorkout ? 0 : workout.duration;

      const result = await SupabaseCompetitionService.submitWorkoutSimple({
        eventId: workout.id,
        npub,
        type: workout.type,
        distance: workout.distance ?? 0,
        duration,
        calories: workout.calories,
        startTime: workout.startTime,
        tags,
        profileName: profile.name,
        profilePicture: profile.picture,
      });

      if (result.success || result.flagged) {
        await this.updateSupabaseStatus(workoutId, true);
        return { success: true };
      }

      await this.updateSupabaseStatus(workoutId, false, result.error || 'Retry failed');
      return { success: false, error: result.error };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await this.updateSupabaseStatus(workoutId, false, errorMsg).catch(() => {});
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Get all local workouts (both synced and unsynced)
   */
  async getAllWorkouts(): Promise<LocalWorkout[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_WORKOUTS);
      if (!data) return [];

      const workouts: LocalWorkout[] = JSON.parse(data);

      // Sort by start time (newest first)
      return workouts.sort(
        (a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
    } catch (error) {
      console.error('❌ Failed to retrieve local workouts:', error);
      return [];
    }
  }

  /**
   * Get only unsynced workouts
   */
  async getUnsyncedWorkouts(): Promise<LocalWorkout[]> {
    const allWorkouts = await this.getAllWorkouts();
    return allWorkouts.filter((w) => !w.syncedToNostr);
  }

  /**
   * Mark workout as synced to Nostr
   */
  async markAsSynced(workoutId: string, nostrEventId: string): Promise<void> {
    try {
      const workouts = await this.getAllWorkouts();
      const workout = workouts.find((w) => w.id === workoutId);

      if (!workout) {
        console.warn(`⚠️ Workout ${workoutId} not found in local storage`);
        return;
      }

      workout.syncedToNostr = true;
      workout.nostrEventId = nostrEventId;
      workout.syncedAt = new Date().toISOString();

      await AsyncStorage.setItem(
        STORAGE_KEYS.LOCAL_WORKOUTS,
        JSON.stringify(workouts)
      );
      console.log(
        `✅ Marked workout ${workoutId} as synced (Nostr event: ${nostrEventId})`
      );
    } catch (error) {
      console.error('❌ Failed to mark workout as synced:', error);
      throw error;
    }
  }

  /**
   * Save workout card/template selection for sharing
   */
  async saveWorkoutCard(
    workoutId: string,
    card: {
      templateId: 'achievement' | 'progress' | 'minimal' | 'stats' | 'elegant' | 'custom_photo' | 'vertical';
      customPhotoUri?: string;
    }
  ): Promise<void> {
    try {
      const workouts = await this.getAllWorkouts();
      const workoutIndex = workouts.findIndex((w) => w.id === workoutId);

      if (workoutIndex === -1) {
        console.warn(`[LocalWorkoutStorage] Workout ${workoutId} not found`);
        return;
      }

      workouts[workoutIndex].savedCard = {
        ...card,
        generatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.LOCAL_WORKOUTS,
        JSON.stringify(workouts)
      );
      console.log(`[LocalWorkoutStorage] Saved card for workout: ${workoutId} (template: ${card.templateId})`);
    } catch (error) {
      console.error('[LocalWorkoutStorage] Failed to save workout card:', error);
      throw error;
    }
  }

  /**
   * Clean up old synced workouts (optional - keeps storage lean)
   * Removes synced workouts older than specified days
   */
  async cleanupSyncedWorkouts(olderThanDays: number = 30): Promise<number> {
    try {
      const workouts = await this.getAllWorkouts();
      const cutoffDate = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

      const remainingWorkouts = workouts.filter((workout) => {
        if (!workout.syncedToNostr) return true; // Keep unsynced workouts
        if (!workout.syncedAt) return true; // Keep if sync date unknown

        const syncDate = new Date(workout.syncedAt).getTime();
        return syncDate > cutoffDate; // Keep if synced recently
      });

      const removedCount = workouts.length - remainingWorkouts.length;

      if (removedCount > 0) {
        await AsyncStorage.setItem(
          STORAGE_KEYS.LOCAL_WORKOUTS,
          JSON.stringify(remainingWorkouts)
        );
        console.log(
          `✅ Cleaned up ${removedCount} synced workouts older than ${olderThanDays} days`
        );
      }

      return removedCount;
    } catch (error) {
      console.error('❌ Failed to cleanup synced workouts:', error);
      return 0;
    }
  }

  /**
   * Update route for an existing workout
   */
  async updateWorkoutRoute(
    workoutId: string,
    routeId: string,
    routeLabel: string
  ): Promise<void> {
    try {
      const workouts = await this.getAllWorkouts();
      const workout = workouts.find((w) => w.id === workoutId);

      if (!workout) {
        console.warn(`[LocalWorkoutStorage] Workout ${workoutId} not found`);
        return;
      }

      workout.routeId = routeId;
      workout.routeLabel = routeLabel;

      await AsyncStorage.setItem(
        STORAGE_KEYS.LOCAL_WORKOUTS,
        JSON.stringify(workouts)
      );
      console.log(`[LocalWorkoutStorage] Updated workout ${workoutId} with route "${routeLabel}"`);
    } catch (error) {
      console.error('[LocalWorkoutStorage] Failed to update workout route:', error);
      throw error;
    }
  }

  /**
   * Get workout by ID
   */
  async getWorkoutById(workoutId: string): Promise<LocalWorkout | null> {
    const workouts = await this.getAllWorkouts();
    return workouts.find((w) => w.id === workoutId) || null;
  }

  /**
   * Get workouts by route ID
   */
  async getWorkoutsByRoute(routeId: string): Promise<LocalWorkout[]> {
    const workouts = await this.getAllWorkouts();
    return workouts.filter((w) => w.routeId === routeId);
  }

  /**
   * Delete a specific workout by ID
   */
  async deleteWorkout(workoutId: string): Promise<void> {
    try {
      const workouts = await this.getAllWorkouts();
      const filteredWorkouts = workouts.filter((w) => w.id !== workoutId);

      await AsyncStorage.setItem(
        STORAGE_KEYS.LOCAL_WORKOUTS,
        JSON.stringify(filteredWorkouts)
      );
      console.log(`✅ Deleted workout ${workoutId} from local storage`);
    } catch (error) {
      console.error('❌ Failed to delete workout:', error);
      throw error;
    }
  }

  /**
   * Clear all local workouts (use with caution)
   */
  async clearAllWorkouts(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.LOCAL_WORKOUTS);
      console.log('✅ Cleared all local workouts');
    } catch (error) {
      console.error('❌ Failed to clear local workouts:', error);
      throw error;
    }
  }

  /**
   * Get storage statistics for UI display
   */
  async getStats(): Promise<{
    total: number;
    synced: number;
    unsynced: number;
    totalStorageKB: number;
  }> {
    try {
      const workouts = await this.getAllWorkouts();
      const synced = workouts.filter((w) => w.syncedToNostr).length;

      const data = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_WORKOUTS);
      const storageBytes = data ? new Blob([data]).size : 0;

      return {
        total: workouts.length,
        synced,
        unsynced: workouts.length - synced,
        totalStorageKB: Math.round(storageBytes / 1024),
      };
    } catch (error) {
      console.error('❌ Failed to get storage stats:', error);
      return { total: 0, synced: 0, unsynced: 0, totalStorageKB: 0 };
    }
  }

  // ========================================================================
  // NOSTR 1301 IMPORT METHODS
  // ========================================================================

  /**
   * Save imported Nostr workout to local storage
   * Used during one-time import of user's Nostr workout history
   */
  async saveImportedNostrWorkout(workout: {
    id: string; // Nostr event ID
    type: WorkoutType;
    startTime: string;
    endTime: string;
    duration: number; // seconds
    distance?: number; // meters
    calories?: number;
    reps?: number;
    sets?: number;
    notes?: string;
    // NEW: Enhanced fields from Nostr kind 1301
    elevation?: number; // meters (elevation gain)
    pace?: number; // seconds per km
    splits?: Split[];
  }): Promise<string> {
    try {
      // Check if this Nostr event ID already exists to prevent duplicates
      const existingWorkouts = await this.getAllWorkouts();
      const isDuplicate = existingWorkouts.some(
        (w) => w.nostrEventId === workout.id
      );

      if (isDuplicate) {
        console.log(
          `⚠️ Skipping duplicate Nostr workout: ${workout.id.slice(0, 8)}...`
        );
        return workout.id;
      }

      const workoutId = await this.generateWorkoutId();

      const localWorkout: LocalWorkout = {
        id: workoutId,
        type: workout.type,
        startTime: workout.startTime,
        endTime: workout.endTime,
        duration: workout.duration,
        distance: workout.distance,
        calories: workout.calories,
        reps: workout.reps,
        sets: workout.sets,
        notes: workout.notes,
        // NEW: Include enhanced fields from Nostr
        elevation: workout.elevation,
        pace: workout.pace,
        splits: workout.splits,
        source: 'imported_nostr',
        createdAt: new Date().toISOString(),
        syncedToNostr: true, // Already exists on Nostr
        nostrEventId: workout.id, // Store original Nostr event ID
      };

      await this.saveWorkout(localWorkout);
      console.log(
        `✅ Imported Nostr workout: ${workoutId} (${workout.type}, ${new Date(
          workout.startTime
        ).toLocaleDateString()})${workout.splits ? ` [${workout.splits.length} splits]` : ''}`
      );
      return workoutId;
    } catch (error) {
      console.error('❌ Failed to save imported Nostr workout:', error);
      throw error;
    }
  }

  /**
   * Check if Nostr workout import has been completed
   */
  async hasImportedNostrWorkouts(): Promise<boolean> {
    try {
      const flag = await AsyncStorage.getItem(STORAGE_KEYS.NOSTR_IMPORT_FLAG);
      return flag === 'true';
    } catch (error) {
      console.error('❌ Failed to check Nostr import flag:', error);
      return false;
    }
  }

  /**
   * Mark Nostr import as completed and save import statistics
   */
  async markNostrImportCompleted(stats: {
    totalImported: number;
    oldestDate: string;
    newestDate: string;
    activityTypes: string[];
  }): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.NOSTR_IMPORT_FLAG, 'true');
      await AsyncStorage.setItem(
        STORAGE_KEYS.NOSTR_IMPORT_STATS,
        JSON.stringify({
          ...stats,
          importedAt: new Date().toISOString(),
        })
      );
      console.log(
        `✅ Nostr import marked complete: ${stats.totalImported} workouts`
      );
    } catch (error) {
      console.error('❌ Failed to mark Nostr import completed:', error);
      throw error;
    }
  }

  /**
   * Get Nostr import statistics (for displaying to user)
   */
  async getNostrImportStats(): Promise<{
    totalImported: number;
    oldestDate: string;
    newestDate: string;
    activityTypes: string[];
    importedAt: string;
  } | null> {
    try {
      const statsData = await AsyncStorage.getItem(
        STORAGE_KEYS.NOSTR_IMPORT_STATS
      );
      if (!statsData) return null;

      return JSON.parse(statsData);
    } catch (error) {
      console.error('❌ Failed to get Nostr import stats:', error);
      return null;
    }
  }

  /**
   * Reset Nostr import (allows user to re-import if needed)
   * WARNING: This does NOT delete imported workouts, only resets the flag
   */
  async resetNostrImport(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.NOSTR_IMPORT_FLAG);
      await AsyncStorage.removeItem(STORAGE_KEYS.NOSTR_IMPORT_STATS);
      console.log('✅ Nostr import flag reset');
    } catch (error) {
      console.error('❌ Failed to reset Nostr import:', error);
      throw error;
    }
  }

  /**
   * Get count of imported Nostr workouts
   */
  async getImportedNostrWorkoutCount(): Promise<number> {
    try {
      const workouts = await this.getAllWorkouts();
      return workouts.filter((w) => w.source === 'imported_nostr').length;
    } catch (error) {
      console.error('❌ Failed to get imported Nostr workout count:', error);
      return 0;
    }
  }

  /**
   * Get total steps from today's tracked workouts (for Android daily step display)
   * Sums steps from all local workouts with startTime today
   * Used as alternative to Health Connect for more reliable step counting
   */
  async getTodayTrackedSteps(): Promise<{
    steps: number;
    workoutCount: number;
  }> {
    try {
      const workouts = await this.getAllWorkouts();

      // Get today's date bounds
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Filter workouts for today that have step data
      const todayWorkouts = workouts.filter((workout) => {
        const workoutDate = new Date(workout.startTime);
        const isToday = workoutDate >= todayStart;
        const hasSteps = (workout.steps || 0) > 0;
        return isToday && hasSteps;
      });

      const totalSteps = todayWorkouts.reduce(
        (sum, w) => sum + (w.steps || 0),
        0
      );

      console.log(
        `[LocalWorkoutStorageService] Today's tracked steps: ${totalSteps} from ${todayWorkouts.length} workouts`
      );

      return {
        steps: totalSteps,
        workoutCount: todayWorkouts.length,
      };
    } catch (error) {
      console.error(
        '[LocalWorkoutStorageService] Error getting today tracked steps:',
        error
      );
      return {
        steps: 0,
        workoutCount: 0,
      };
    }
  }

  /**
   * Get total GPS-tracked workout distance for today
   * Returns sum of all GPS workouts (source: 'gps_tracker') completed today
   * Used to combine with step estimates for accurate daily distance
   */
  async getTodayGPSDistance(): Promise<{
    distanceMeters: number;
    workoutCount: number;
  }> {
    try {
      const workouts = await this.getAllWorkouts();

      // Get today's date bounds
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Filter for GPS-tracked workouts today
      const todayGPSWorkouts = workouts.filter((workout) => {
        const workoutDate = new Date(workout.startTime);
        const isToday = workoutDate >= todayStart;
        const isGPSTracked = workout.source === 'gps_tracker';
        const hasDistance = (workout.distance || 0) > 0;
        return isToday && isGPSTracked && hasDistance;
      });

      const totalDistance = todayGPSWorkouts.reduce(
        (sum, w) => sum + (w.distance || 0),
        0
      );

      console.log(
        `[LocalWorkoutStorageService] Today's GPS distance: ${(totalDistance / 1000).toFixed(2)}km from ${todayGPSWorkouts.length} workouts`
      );

      return {
        distanceMeters: totalDistance,
        workoutCount: todayGPSWorkouts.length,
      };
    } catch (error) {
      console.error(
        '[LocalWorkoutStorageService] Error getting today GPS distance:',
        error
      );
      return {
        distanceMeters: 0,
        workoutCount: 0,
      };
    }
  }

  /**
   * Save fitness test result as workout
   */
  async saveFitnessTestWorkout(testData: {
    testId: string;
    startTime: number; // milliseconds timestamp
    endTime: number; // milliseconds timestamp
    duration: number; // seconds
    score: number; // 0-300
    grade: string; // Elite/Advanced/Intermediate/Beginner/Baseline
    pushups: { reps: number; score: number } | null;
    situps: { reps: number; score: number } | null;
    run5k: { timeSeconds: number; score: number } | null;
  }): Promise<string> {
    try {
      const workoutId = await this.generateWorkoutId();
      const startTimeISO = new Date(testData.startTime).toISOString();
      const endTimeISO = new Date(testData.endTime).toISOString();

      const localWorkout: LocalWorkout = {
        id: workoutId,
        type: 'other',
        startTime: startTimeISO,
        endTime: endTimeISO,
        duration: testData.duration,
        exerciseType: 'fitness_test',
        notes: `RUNSTR Fitness Test - ${testData.grade}`,
        // Fitness test-specific fields
        fitnessTestScore: testData.score,
        fitnessTestMaxScore: 300,
        fitnessTestGrade: testData.grade,
        fitnessTestComponents: {
          pushups: testData.pushups || { reps: 0, score: 0 },
          situps: testData.situps || { reps: 0, score: 0 },
          run5k: testData.run5k || { timeSeconds: 0, score: 0 },
        },
        source: 'manual_entry',
        createdAt: endTimeISO,
        syncedToNostr: false,
      };

      await this.saveWorkout(localWorkout);
      console.log(
        `✅ Saved fitness test as workout: ${workoutId} (${testData.score}/300 - ${testData.grade})`
      );
      return workoutId;
    } catch (error) {
      console.error('❌ Failed to save fitness test workout:', error);
      throw error;
    }
  }

  // ========================================================================
  // CUSTOM EXERCISE NAME STORAGE (for Manual Entry feature)
  // ========================================================================

  /**
   * Get the storage key for a given category
   */
  private getCustomExerciseKey(
    category: 'cardio' | 'strength' | 'diet' | 'wellness'
  ): string {
    const keyMap = {
      cardio: STORAGE_KEYS.CUSTOM_EXERCISES_CARDIO,
      strength: STORAGE_KEYS.CUSTOM_EXERCISES_STRENGTH,
      diet: STORAGE_KEYS.CUSTOM_EXERCISES_DIET,
      wellness: STORAGE_KEYS.CUSTOM_EXERCISES_WELLNESS,
    };
    return keyMap[category];
  }

  /**
   * Save a custom exercise name for a category
   * Prevents duplicates (case-insensitive)
   */
  async saveCustomExerciseName(
    category: 'cardio' | 'strength' | 'diet' | 'wellness',
    name: string
  ): Promise<void> {
    try {
      const trimmedName = name.trim();
      if (!trimmedName) {
        console.warn('⚠️ Cannot save empty exercise name');
        return;
      }

      const key = this.getCustomExerciseKey(category);
      const existing = await this.getCustomExerciseNames(category);

      // Check for case-insensitive duplicate
      const isDuplicate = existing.some(
        (existingName) =>
          existingName.toLowerCase() === trimmedName.toLowerCase()
      );

      if (isDuplicate) {
        console.log(
          `⚠️ Custom exercise "${trimmedName}" already exists in ${category}`
        );
        return;
      }

      // Add to list and save
      existing.push(trimmedName);
      await AsyncStorage.setItem(key, JSON.stringify(existing));
      console.log(`✅ Saved custom exercise "${trimmedName}" to ${category}`);
    } catch (error) {
      console.error('❌ Failed to save custom exercise name:', error);
      throw error;
    }
  }

  /**
   * Get all custom exercise names for a category
   */
  async getCustomExerciseNames(
    category: 'cardio' | 'strength' | 'diet' | 'wellness'
  ): Promise<string[]> {
    try {
      const key = this.getCustomExerciseKey(category);
      const data = await AsyncStorage.getItem(key);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Failed to get custom exercise names:', error);
      return [];
    }
  }

  /**
   * Delete a custom exercise name from a category
   */
  async deleteCustomExerciseName(
    category: 'cardio' | 'strength' | 'diet' | 'wellness',
    name: string
  ): Promise<void> {
    try {
      const key = this.getCustomExerciseKey(category);
      const existing = await this.getCustomExerciseNames(category);

      // Filter out the name (case-insensitive match)
      const filtered = existing.filter(
        (existingName) => existingName.toLowerCase() !== name.toLowerCase()
      );

      await AsyncStorage.setItem(key, JSON.stringify(filtered));
      console.log(`✅ Deleted custom exercise "${name}" from ${category}`);
    } catch (error) {
      console.error('❌ Failed to delete custom exercise name:', error);
      throw error;
    }
  }

  // ========================================================================
  // WATER TRACKING
  // ========================================================================

  /**
   * Get the user's daily water goal (in ml)
   * Returns default of 2000ml if not set
   */
  async getWaterDailyGoal(): Promise<number> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.WATER_DAILY_GOAL);
      if (!data) return 2000; // Default 2000ml
      return parseInt(data, 10);
    } catch (error) {
      console.error('❌ Failed to get water daily goal:', error);
      return 2000;
    }
  }

  /**
   * Set the user's daily water goal (in ml)
   */
  async setWaterDailyGoal(goalMl: number): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.WATER_DAILY_GOAL,
        goalMl.toString()
      );
      console.log(`✅ Set water daily goal to ${goalMl}ml`);
    } catch (error) {
      console.error('❌ Failed to set water daily goal:', error);
      throw error;
    }
  }
}

export default LocalWorkoutStorageService.getInstance();
