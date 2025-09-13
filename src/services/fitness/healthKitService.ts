/**
 * HealthKit Service - Production Implementation
 * Real iOS HealthKit integration for automatic workout sync
 * Integrates with existing fitness architecture and competition system
 */

import { Platform } from 'react-native';
import { supabase } from '../supabase';
import type { WorkoutData, WorkoutType } from '../../types/workout';

// Environment-based logging utility
const isDevelopment = __DEV__;
const debugLog = (message: string, ...args: any[]) => {
  if (isDevelopment) {
    console.log(message, ...args);
  }
};
const errorLog = (message: string, ...args: any[]) => {
  console.error(message, ...args); // Always log errors
};

// Import @yzlin/expo-healthkit for iOS only
let ExpoHealthKit: any = null;

if (Platform.OS === 'ios') {
  try {
    const healthKitModule = require('@yzlin/expo-healthkit');
    
    // Check different export patterns
    if (healthKitModule.default) {
      ExpoHealthKit = healthKitModule.default;
    } else if (healthKitModule.ExpoHealthKit) {
      ExpoHealthKit = healthKitModule.ExpoHealthKit;
    } else if (typeof healthKitModule === 'object' && healthKitModule.isHealthDataAvailable) {
      ExpoHealthKit = healthKitModule;
    } else {
      ExpoHealthKit = healthKitModule;
    }
  } catch (e) {
    errorLog('HealthKit Service: Failed to import @yzlin/expo-healthkit:', e.message);
    ExpoHealthKit = null;
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
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private readonly PERMISSION_TIMEOUT = 15000; // 15 seconds for permissions

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
    return Platform.OS === 'ios' && ExpoHealthKit !== null;
  }

  /**
   * Wrap HealthKit operations with timeout protection to prevent freezing
   */
  private async withTimeout<T>(
    promise: Promise<T>, 
    timeoutMs: number = this.DEFAULT_TIMEOUT,
    operation: string = 'HealthKit operation'
  ): Promise<T> {
    const timeout = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
    );
    
    try {
      return await Promise.race([promise, timeout]);
    } catch (error) {
      errorLog(`${operation} failed:`, error);
      throw error;
    }
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
      console.log('🔍 DEBUG: HealthKit initialize() starting...');
      
      // Simplified approach: Just request permissions directly
      // iOS should handle already-granted permissions without showing dialogs
      console.log('🔍 DEBUG: Requesting permissions directly...');
      
      // Request permissions from iOS
      const permissionsResult = await this.requestPermissions();
      console.log('🔍 DEBUG: Permission request result:', permissionsResult);
      
      if (!permissionsResult.success) {
        console.log('🔍 DEBUG: Permission request failed, returning failure');
        return permissionsResult;
      }

      this.isAuthorized = true;
      console.log('🔍 DEBUG: HealthKit initialized and authorized successfully');

      return { success: true };
    } catch (error) {
      errorLog('HealthKit: Initialization failed:', error);
      return {
        success: false,
        error: `Initialization failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /**
   * Request HealthKit permissions from iOS - now public for UI components
   */
  async requestPermissions(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      debugLog('HealthKit: Requesting permissions...');
      
      // Check if HealthKit is available first with timeout
      const available = await this.withTimeout(
        ExpoHealthKit.isHealthDataAvailable(),
        5000, // 5 second timeout for availability check
        'HealthKit availability check'
      );
      
      if (!available) {
        return {
          success: false,
          error: 'HealthKit is not available on this device',
        };
      }

      // Define permissions arrays - native module expects two separate arrays
      const readPermissions = [
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        'HKQuantityTypeIdentifierDistanceWalkingRunning', 
        'HKQuantityTypeIdentifierDistanceCycling',
        'HKQuantityTypeIdentifierHeartRate',
        'HKWorkoutTypeIdentifier',
      ];
      const writePermissions: string[] = []; // No write permissions needed for sync-only functionality

      // Call with two separate array parameters (share, read) as expected by native module
      await this.withTimeout(
        ExpoHealthKit.requestAuthorization(writePermissions, readPermissions),
        this.PERMISSION_TIMEOUT,
        'HealthKit permission request'
      );
      
      debugLog('HealthKit: Permissions requested successfully');
      return { success: true };
    } catch (error) {
      errorLog('HealthKit: Permission request failed:', error);
      
      // Provide user-friendly error messages for common timeout scenarios
      let errorMessage = 'HealthKit permissions denied';
      if (error instanceof Error) {
        if (error.message.includes('timed out')) {
          errorMessage = 'Permission request is taking too long. Please try again or check your device settings.';
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
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
    debugLog(`HealthKit: Starting sync for user ${userId}`);

    try {
      // Fetch workouts from last 30 days
      const healthKitWorkouts = await this.fetchRecentWorkouts();
      debugLog(`HealthKit: Fetched ${healthKitWorkouts.length} workouts`);

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
      debugLog(
        `HealthKit: Sync complete - ${newWorkouts} new, ${skippedWorkouts} skipped`
      );

      return {
        success: true,
        workoutsCount: healthKitWorkouts.length,
        newWorkouts,
        skippedWorkouts,
      };
    } catch (error) {
      errorLog('HealthKit: Sync failed:', error);
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
    try {
      const options = {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        to: new Date(),
        limit: 100, // Reasonable limit to avoid overwhelming the system
      };

      const results = await this.withTimeout(
        ExpoHealthKit.queryWorkouts(options),
        this.DEFAULT_TIMEOUT,
        'HealthKit workout query'
      );
      
      // Filter out invalid workouts and transform to our format
      const validWorkouts = (results || []).filter(
        (workout: any) => workout.uuid && workout.startDate && workout.endDate
      ).map((workout: any) => ({
        UUID: workout.uuid,
        startDate: workout.startDate,
        endDate: workout.endDate,
        duration: workout.duration || 0,
        totalDistance: workout.totalDistance || 0,
        totalEnergyBurned: workout.totalEnergyBurned || 0,
        workoutActivityType: workout.workoutActivityType || 0,
        sourceName: workout.sourceName || 'Unknown',
      }));

      debugLog(
        `HealthKit: Retrieved ${validWorkouts.length} valid workouts`
      );
      return validWorkouts;
    } catch (error) {
      errorLog('HealthKit: Failed to fetch workouts:', error);
      
      // Provide user-friendly error messages for timeout scenarios
      if (error instanceof Error && error.message.includes('timed out')) {
        throw new Error('Workout sync is taking too long. Please try syncing fewer days or check your internet connection.');
      }
      
      throw error;
    }
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
      errorLog(
        'HealthKit: Error normalizing workout:',
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
        errorLog('HealthKit: Error inserting workout:', insertError);
        return 'error';
      }

      debugLog(
        `HealthKit: Saved workout - ${workout.type}, ${workout.duration}s`
      );
      return 'saved';
    } catch (error) {
      errorLog('HealthKit: Error saving workout:', error);
      return 'error';
    }
  }

  /**
   * Check the actual iOS HealthKit authorization status (not session-based)
   */
  private async checkActualAuthorizationStatus(): Promise<boolean> {
    if (!HealthKitService.isAvailable()) {
      return false;
    }

    try {
      // Define the same permissions we request
      const readPermissions = [
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        'HKQuantityTypeIdentifierDistanceWalkingRunning',
        'HKQuantityTypeIdentifierDistanceCycling',
        'HKQuantityTypeIdentifierHeartRate',
        'HKWorkoutTypeIdentifier',
      ];
      const writePermissions: string[] = []; // No write permissions needed

      // Check actual iOS authorization status using native method
      // Try object format first (like the original broken requestAuthorization call)
      const authStatus = await this.withTimeout(
        ExpoHealthKit.getRequestStatusForAuthorization({
          read: readPermissions,
          write: writePermissions
        }),
        5000,
        'Authorization status check'
      );

      // DEBUG: Log what iOS actually returns so we can fix our logic
      console.log('🔍 DEBUG: iOS authStatus actual value:', authStatus);
      console.log('🔍 DEBUG: authStatus type:', typeof authStatus);
      console.log('🔍 DEBUG: authStatus JSON:', JSON.stringify(authStatus));

      // For now, let's be more permissive while we debug
      // Consider authorized if we get any truthy response that's not explicitly denied
      const isAuthorized = authStatus && authStatus !== 'denied' && authStatus !== 'notDetermined';
      console.log('🔍 DEBUG: isAuthorized result:', isAuthorized);
      
      return isAuthorized;
    } catch (error) {
      debugLog('HealthKit: Error checking authorization status:', error);
      return false;
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
      authorized: this.isAuthorized, // Still use session flag for immediate response
      syncInProgress: this.syncInProgress,
      lastSyncAt: this.lastSyncAt?.toISOString(),
    };
  }

  /**
   * Get current service status with real iOS authorization check
   */
  async getStatusWithRealCheck(): Promise<{
    available: boolean;
    authorized: boolean;
    syncInProgress: boolean;
    lastSyncAt?: string;
  }> {
    const actuallyAuthorized = await this.checkActualAuthorizationStatus();
    
    // Update our session flag to match reality
    this.isAuthorized = actuallyAuthorized;
    
    return {
      available: HealthKitService.isAvailable(),
      authorized: actuallyAuthorized,
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
      errorLog('HealthKit: Error getting sync stats:', error);
      return {
        totalHealthKitWorkouts: 0,
        recentSyncs: 0,
      };
    }
  }

  /**
   * Get recent workouts for AppleHealthTab - public method for UI components
   */
  async getRecentWorkouts(userId: string, days: number = 30): Promise<any[]> {
    if (!HealthKitService.isAvailable()) {
      debugLog('HealthKit: Not available, returning empty array');
      return [];
    }

    if (!this.isAuthorized) {
      debugLog('HealthKit: Not authorized, attempting initialization...');
      const initResult = await this.initialize();
      if (!initResult.success) {
        errorLog('HealthKit: Failed to initialize for getRecentWorkouts:', initResult.error);
        return [];
      }
    }

    try {
      debugLog(`HealthKit: Fetching recent workouts (${days} days) for user ${userId}`);

      // Use the existing fetchRecentWorkouts method but with custom date range
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);

      const options = {
        from: daysAgo,
        to: new Date(),
        limit: 100, // Reasonable limit
      };

      const healthKitWorkouts = await this.withTimeout(
        ExpoHealthKit.queryWorkouts(options),
        this.DEFAULT_TIMEOUT,
        `HealthKit workout query for ${days} days`
      );

      // Filter and transform to match expected format
      const validWorkouts = (healthKitWorkouts || []).filter(
        (workout: any) => workout.uuid && workout.startDate && workout.endDate
      ).map((workout: any) => {
        const workoutData = this.normalizeWorkout(
          {
            UUID: workout.uuid,
            startDate: workout.startDate,
            endDate: workout.endDate,
            duration: workout.duration || 0,
            totalDistance: workout.totalDistance || 0,
            totalEnergyBurned: workout.totalEnergyBurned || 0,
            workoutActivityType: workout.workoutActivityType || 0,
            sourceName: workout.sourceName || 'Unknown',
          },
          userId
        );

        // Return in format expected by AppleHealthTab (simplified Workout interface)
        return {
          id: workoutData?.id || `healthkit_${workout.uuid}`,
          type: workoutData?.type || 'other',
          duration: workoutData?.duration || 0,
          distance: workoutData?.distance || 0,
          calories: workoutData?.calories || 0,
          startTime: workout.startDate,
          endTime: workout.endDate,
          source: 'healthkit',
          metadata: workoutData?.metadata || {},
        };
      }).filter(Boolean); // Remove any null results

      debugLog(`HealthKit: Retrieved ${validWorkouts.length} valid workouts for UI`);
      return validWorkouts;
    } catch (error) {
      errorLog('HealthKit: Error in getRecentWorkouts:', error);
      
      // Provide user-friendly error messages for timeout scenarios
      if (error instanceof Error && error.message.includes('timed out')) {
        throw new Error('Workout sync is taking too long. Please try again or check your internet connection.');
      }
      
      // Return empty array instead of throwing for UI components
      return [];
    }
  }
}

export default HealthKitService.getInstance();
