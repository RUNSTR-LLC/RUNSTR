/**
 * HealthKit Service - Production Implementation
 * Real iOS HealthKit integration for automatic workout sync
 * Integrates with existing fitness architecture and competition system
 */

import { Platform } from 'react-native';
import { supabase } from '../supabase';
import type { WorkoutData, WorkoutType } from '../../types/workout';

// Import react-native-health for iOS only
let AppleHealthKit: any = null;
if (Platform.OS === 'ios') {
  try {
    AppleHealthKit = require('react-native-health').default;
  } catch (e) {
    console.warn('HealthKit library not available');
  }
}

// HealthKit permissions configuration
const HEALTHKIT_READ_PERMISSIONS = [
  'ActiveEnergyBurned',
  'DistanceWalkingRunning',
  'DistanceCycling',
  'HeartRate',
  'Workout',
];

// Workout type mappings (iOS HealthKit -> RUNSTR)
const HK_WORKOUT_TYPE_MAP: Record<string, WorkoutType> = {
  16: 'running', // HKWorkoutActivityTypeRunning
  52: 'walking', // HKWorkoutActivityTypeWalking
  13: 'cycling', // HKWorkoutActivityTypeCycling
  24: 'hiking', // HKWorkoutActivityTypeHiking
  46: 'yoga', // HKWorkoutActivityTypeYoga
  35: 'strength_training', // HKWorkoutActivityTypeStrengthTraining
  3: 'gym', // HKWorkoutActivityTypeTraditionalStrengthTraining
};

export interface HealthKitWorkout {
  UUID: string;
  startDate: string;
  endDate: string;
  duration: number;
  totalDistance?: number;
  totalEnergyBurned?: number;
  workoutActivityType: number;
  sourceName: string;
}

export interface HealthKitSyncResult {
  success: boolean;
  workoutsCount?: number;
  newWorkouts?: number;
  skippedWorkouts?: number;
  error?: string;
}

export class HealthKitService {
  private static instance: HealthKitService;
  private isAuthorized = false;
  private syncInProgress = false;
  private lastSyncAt?: Date;

  private constructor() {}

  static getInstance(): HealthKitService {
    if (!HealthKitService.instance) {
      HealthKitService.instance = new HealthKitService();
    }
    return HealthKitService.instance;
  }

  /**
   * Check if HealthKit is available on this device
   */
  static isAvailable(): boolean {
    return Platform.OS === 'ios' && AppleHealthKit !== null;
  }

  /**
   * Initialize HealthKit and request permissions
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    if (!HealthKitService.isAvailable()) {
      return {
        success: false,
        error: 'HealthKit not available on this device',
      };
    }

    try {
      console.log('🍎 Initializing HealthKit service...');

      // Request permissions from iOS
      const permissionsResult = await this.requestPermissions();
      if (!permissionsResult.success) {
        return permissionsResult;
      }

      this.isAuthorized = true;
      console.log('✅ HealthKit initialized and authorized');

      return { success: true };
    } catch (error) {
      console.error('❌ HealthKit initialization failed:', error);
      return {
        success: false,
        error: `Initialization failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /**
   * Request HealthKit permissions from iOS
   */
  private async requestPermissions(): Promise<{
    success: boolean;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const permissions = {
        permissions: {
          read: HEALTHKIT_READ_PERMISSIONS,
          write: [], // No write permissions needed for sync-only functionality
        },
      };

      console.log('🔐 Requesting HealthKit permissions...');
      AppleHealthKit.initHealthKit(permissions, (error: any) => {
        if (error) {
          console.error('❌ HealthKit permission denied:', error);
          resolve({
            success: false,
            error:
              'HealthKit permissions denied. Enable in Settings > Privacy & Security > Health > RUNSTR',
          });
        } else {
          console.log('✅ HealthKit permissions granted');
          resolve({ success: true });
        }
      });
    });
  }

  /**
   * Sync workouts from HealthKit to RUNSTR database
   */
  async syncWorkouts(
    userId: string,
    teamId?: string
  ): Promise<HealthKitSyncResult> {
    if (!this.isAuthorized) {
      const initResult = await this.initialize();
      if (!initResult.success) {
        return { success: false, error: initResult.error };
      }
    }

    if (this.syncInProgress) {
      return { success: false, error: 'Sync already in progress' };
    }

    this.syncInProgress = true;
    console.log(`🏃‍♂️ Starting HealthKit sync for user ${userId}`);

    try {
      // Fetch workouts from last 30 days
      const healthKitWorkouts = await this.fetchRecentWorkouts();
      console.log(`📱 Fetched ${healthKitWorkouts.length} HealthKit workouts`);

      // Process and save new workouts
      let newWorkouts = 0;
      let skippedWorkouts = 0;

      for (const hkWorkout of healthKitWorkouts) {
        const normalized = this.normalizeWorkout(hkWorkout, userId, teamId);
        if (normalized) {
          const saveResult = await this.saveWorkout(normalized);
          if (saveResult === 'saved') {
            newWorkouts++;
          } else if (saveResult === 'skipped') {
            skippedWorkouts++;
          }
        }
      }

      this.lastSyncAt = new Date();
      console.log(
        `✅ HealthKit sync complete: ${newWorkouts} new workouts, ${skippedWorkouts} skipped`
      );

      return {
        success: true,
        workoutsCount: healthKitWorkouts.length,
        newWorkouts,
        skippedWorkouts,
      };
    } catch (error) {
      console.error('❌ HealthKit sync failed:', error);
      return {
        success: false,
        error: `Sync failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Fetch recent workouts from HealthKit
   */
  private async fetchRecentWorkouts(): Promise<HealthKitWorkout[]> {
    return new Promise((resolve, reject) => {
      const options = {
        startDate: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000
        ).toISOString(), // 30 days ago
        endDate: new Date().toISOString(),
        limit: 100, // Reasonable limit to avoid overwhelming the system
      };

      AppleHealthKit.getSamples(
        'Workout',
        options,
        (error: any, results: any[]) => {
          if (error) {
            console.error('❌ Failed to fetch HealthKit workouts:', error);
            reject(error);
          } else {
            // Filter out invalid workouts
            const validWorkouts = (results || []).filter(
              (workout) => workout.UUID && workout.startDate && workout.endDate
            );

            console.log(
              `📥 Retrieved ${validWorkouts.length} valid workouts from HealthKit`
            );
            resolve(validWorkouts);
          }
        }
      );
    });
  }

  /**
   * Normalize HealthKit workout to RUNSTR WorkoutData format
   */
  private normalizeWorkout(
    hkWorkout: HealthKitWorkout,
    userId: string,
    teamId?: string
  ): WorkoutData | null {
    try {
      // Map HealthKit activity type to RUNSTR workout type
      const workoutType =
        HK_WORKOUT_TYPE_MAP[hkWorkout.workoutActivityType] || 'other';

      // Convert and validate duration
      const duration = Math.round(hkWorkout.duration || 0);
      if (duration < 60) {
        // Skip workouts shorter than 1 minute
        console.log(`⏩ Skipping short workout: ${duration}s`);
        return null;
      }

      // Convert distance from kilometers to meters
      const distance = hkWorkout.totalDistance
        ? Math.round(hkWorkout.totalDistance * 1000)
        : 0;

      // Round calories
      const calories = hkWorkout.totalEnergyBurned
        ? Math.round(hkWorkout.totalEnergyBurned)
        : 0;

      return {
        id: `healthkit_${hkWorkout.UUID}`,
        userId,
        teamId,
        type: workoutType,
        source: 'healthkit',
        distance,
        duration,
        calories,
        startTime: hkWorkout.startDate,
        endTime: hkWorkout.endDate,
        syncedAt: new Date().toISOString(),
        metadata: {
          sourceApp: hkWorkout.sourceName || 'Apple Health',
          originalActivityType: hkWorkout.workoutActivityType,
          healthKitUUID: hkWorkout.UUID,
          syncedVia: 'healthkit_service',
        },
      };
    } catch (error) {
      console.error(
        '❌ Error normalizing HealthKit workout:',
        error,
        hkWorkout
      );
      return null;
    }
  }

  /**
   * Save workout to database (returns 'saved', 'skipped', or 'error')
   */
  private async saveWorkout(
    workout: WorkoutData
  ): Promise<'saved' | 'skipped' | 'error'> {
    try {
      // Check if workout already exists
      const { data: existing, error: checkError } = await supabase
        .from('workouts')
        .select('id')
        .eq('id', workout.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = "no rows returned", which means workout doesn't exist
        throw checkError;
      }

      if (existing) {
        return 'skipped'; // Already exists
      }

      // Insert new workout
      const { error: insertError } = await supabase.from('workouts').insert({
        id: workout.id,
        user_id: workout.userId,
        team_id: workout.teamId,
        type: workout.type,
        source: workout.source,
        distance_meters: workout.distance,
        duration_seconds: workout.duration,
        calories: workout.calories,
        start_time: workout.startTime,
        end_time: workout.endTime,
        synced_at: workout.syncedAt,
        metadata: workout.metadata,
      });

      if (insertError) {
        console.error('❌ Error inserting workout:', insertError);
        return 'error';
      }

      console.log(
        `💾 Saved HealthKit workout: ${workout.type}, ${workout.duration}s, ${workout.distance}m`
      );
      return 'saved';
    } catch (error) {
      console.error('❌ Error saving HealthKit workout:', error);
      return 'error';
    }
  }

  /**
   * Get current service status
   */
  getStatus(): {
    available: boolean;
    authorized: boolean;
    syncInProgress: boolean;
    lastSyncAt?: string;
  } {
    return {
      available: HealthKitService.isAvailable(),
      authorized: this.isAuthorized,
      syncInProgress: this.syncInProgress,
      lastSyncAt: this.lastSyncAt?.toISOString(),
    };
  }

  /**
   * Force re-authorization (useful for troubleshooting)
   */
  async reauthorize(): Promise<{ success: boolean; error?: string }> {
    this.isAuthorized = false;
    return await this.initialize();
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(userId: string): Promise<{
    totalHealthKitWorkouts: number;
    recentSyncs: number;
    lastSyncDate?: string;
  }> {
    try {
      const { count, error } = await supabase
        .from('workouts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('source', 'healthkit');

      if (error) throw error;

      return {
        totalHealthKitWorkouts: count || 0,
        recentSyncs: 0, // Could be calculated from last 7 days
        lastSyncDate: this.lastSyncAt?.toISOString(),
      };
    } catch (error) {
      console.error('Error getting HealthKit sync stats:', error);
      return {
        totalHealthKitWorkouts: 0,
        recentSyncs: 0,
      };
    }
  }
}

export default HealthKitService.getInstance();
