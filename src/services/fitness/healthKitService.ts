/**
 * HealthKit Service - Fixed Implementation with Performance Optimizations
 * Real iOS HealthKit integration for automatic workout sync
 * Integrates with existing fitness architecture and competition system
 * Includes progressive loading, timeout protection, and proper error handling
 */

import { Platform, InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  id?: string; // Additional ID field for better deduplication
  startDate: string;
  endDate: string;
  duration: number;
  totalDistance?: number;
  totalEnergyBurned?: number;
  workoutActivityType: number;
  sourceName: string;
  activityType?: string; // Mapped activity type for easier comparison
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
  private abortController: AbortController | null = null;
  private isModuleAvailable: boolean = false;

  private constructor() {
    this.initializeModule();
  }

  /**
   * Initialize HealthKit module with proper error handling
   */
  private async initializeModule() {
    if (Platform.OS !== 'ios') {
      console.log('HealthKit not available on Android');
      return;
    }

    try {
      // Lazy load with error handling
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

      this.isModuleAvailable = true;
    } catch (error) {
      console.error('Failed to load HealthKit module:', error);
      this.isModuleAvailable = false;
      ExpoHealthKit = null;
    }
  }

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
   * Check if module is properly loaded
   */
  isAvailable(): boolean {
    return this.isModuleAvailable && ExpoHealthKit !== null;
  }

  /**
   * Safe wrapper for all HealthKit operations with proper timeout and abort handling
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number = this.DEFAULT_TIMEOUT,
    operationName: string = 'HealthKit operation'
  ): Promise<T> {
    if (!this.isModuleAvailable || !ExpoHealthKit) {
      throw new Error('HealthKit not available');
    }

    const timeoutId = setTimeout(() => {
      if (this.abortController) {
        this.abortController.abort();
      }
    }, timeoutMs);

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([operation(), timeout]);
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      errorLog(`${operationName} failed:`, error);
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
   * Request HealthKit permissions from iOS with UI thread protection
   */
  async requestPermissions(): Promise<{
    success: boolean;
    error?: string;
  }> {
    return this.executeWithTimeout(
      async () => {
        // Run after interactions to prevent UI blocking
        return new Promise((resolve, reject) => {
          InteractionManager.runAfterInteractions(async () => {
            try {
              debugLog('HealthKit: Requesting permissions...');

              // Check if HealthKit is available first
              const available = await ExpoHealthKit.isHealthDataAvailable();

              if (!available) {
                resolve({
                  success: false,
                  error: 'HealthKit is not available on this device',
                });
                return;
              }

              // Define permissions arrays
              const readPermissions = [
                'HKQuantityTypeIdentifierActiveEnergyBurned',
                'HKQuantityTypeIdentifierDistanceWalkingRunning',
                'HKQuantityTypeIdentifierDistanceCycling',
                'HKQuantityTypeIdentifierHeartRate',
                'HKWorkoutTypeIdentifier',
              ];
              const writePermissions: string[] = [];

              // Request authorization
              await ExpoHealthKit.requestAuthorization(writePermissions, readPermissions);

              debugLog('HealthKit: Permissions requested successfully');
              resolve({ success: true });
            } catch (error) {
              errorLog('HealthKit: Permission request failed:', error);
              reject(error);
            }
          });
        });
      },
      this.PERMISSION_TIMEOUT,
      'Permission request'
    ).catch(error => {
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
   * Fetch workouts progressively with chunk loading
   */
  async fetchWorkoutsProgressive(
    startDate: Date,
    endDate: Date,
    onProgress?: (progress: { current: number; total: number; workouts: number }) => void
  ): Promise<HealthKitWorkout[]> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;
    this.abortController = new AbortController();

    try {
      const chunks = this.createDateChunks(startDate, endDate, 7); // 7-day chunks
      const allWorkouts: HealthKitWorkout[] = [];
      const processedIds = new Set<string>();

      for (let i = 0; i < chunks.length; i++) {
        // Check if aborted
        if (this.abortController.signal.aborted) {
          throw new Error('Sync cancelled');
        }

        const chunk = chunks[i];

        try {
          const workouts = await this.fetchWorkoutChunk(chunk.start, chunk.end);

          // Deduplicate
          const uniqueWorkouts = workouts.filter(w => {
            const workoutId = w.id || w.UUID;
            if (processedIds.has(workoutId)) return false;
            processedIds.add(workoutId);
            return true;
          });

          allWorkouts.push(...uniqueWorkouts);

          // Report progress
          onProgress?.({
            current: i + 1,
            total: chunks.length,
            workouts: allWorkouts.length
          });

          // Allow UI to breathe between chunks
          await new Promise(resolve => setTimeout(resolve, 50));

        } catch (error) {
          console.warn(`Failed to fetch chunk ${i + 1}/${chunks.length}:`, error);
          // Continue with next chunk instead of failing entirely
        }
      }

      // Cache the results
      await this.cacheWorkouts(allWorkouts);

      return allWorkouts;

    } finally {
      this.syncInProgress = false;
      this.abortController = null;
    }
  }

  /**
   * Fetch a single chunk of workouts
   */
  private async fetchWorkoutChunk(startDate: Date, endDate: Date): Promise<HealthKitWorkout[]> {
    return this.executeWithTimeout(
      async () => {
        const query = {
          from: startDate,
          to: endDate,
          limit: 100
        };

        const results = await ExpoHealthKit.queryWorkouts(query);

        // Transform and validate
        return (results || [])
          .filter((w: any) => w.duration >= 60 && w.uuid) // Min 1 minute
          .map((w: any) => this.transformWorkout(w));
      },
      10000,
      'Workout chunk fetch'
    );
  }

  /**
   * Transform HealthKit workout to our format with activity type mapping
   */
  private transformWorkout(hkWorkout: any): HealthKitWorkout {
    const activityType = HK_WORKOUT_TYPE_MAP[hkWorkout.workoutActivityType] || 'other';

    return {
      UUID: hkWorkout.uuid,
      id: `healthkit_${hkWorkout.uuid}`,
      startDate: hkWorkout.startDate,
      endDate: hkWorkout.endDate,
      duration: hkWorkout.duration || 0,
      totalDistance: hkWorkout.totalDistance || 0,
      totalEnergyBurned: hkWorkout.totalEnergyBurned || 0,
      workoutActivityType: hkWorkout.workoutActivityType || 0,
      sourceName: hkWorkout.sourceName || 'Unknown',
      activityType: activityType
    };
  }

  /**
   * Create date chunks for progressive loading
   */
  private createDateChunks(startDate: Date, endDate: Date, daysPerChunk: number) {
    const chunks = [];
    let current = new Date(startDate);

    while (current < endDate) {
      const chunkEnd = new Date(current);
      chunkEnd.setDate(chunkEnd.getDate() + daysPerChunk);

      chunks.push({
        start: new Date(current),
        end: chunkEnd > endDate ? endDate : chunkEnd
      });

      current = chunkEnd;
    }

    return chunks;
  }

  /**
   * Fetch recent workouts from HealthKit (backward compatibility)
   */
  private async fetchRecentWorkouts(): Promise<HealthKitWorkout[]> {
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = new Date();
    return this.fetchWorkoutsProgressive(startDate, endDate);
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
   * Cache workouts to AsyncStorage
   */
  private async cacheWorkouts(workouts: HealthKitWorkout[]): Promise<void> {
    try {
      const cacheKey = 'healthkit_workouts_cache';
      const cacheData = {
        workouts,
        timestamp: Date.now(),
        version: '1.0'
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      debugLog(`HealthKit: Cached ${workouts.length} workouts`);
    } catch (error) {
      console.warn('Failed to cache workouts:', error);
    }
  }

  /**
   * Get cached workouts from AsyncStorage
   */
  async getCachedWorkouts(): Promise<HealthKitWorkout[] | null> {
    try {
      const cacheKey = 'healthkit_workouts_cache';
      const cached = await AsyncStorage.getItem(cacheKey);

      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const cacheAge = Date.now() - cacheData.timestamp;

      // Cache valid for 5 minutes
      if (cacheAge > 5 * 60 * 1000) {
        debugLog('HealthKit: Cache expired');
        return null;
      }

      debugLog(`HealthKit: Retrieved ${cacheData.workouts.length} cached workouts`);
      return cacheData.workouts;
    } catch (error) {
      console.warn('Failed to get cached workouts:', error);
      return null;
    }
  }

  /**
   * Cancel ongoing sync operation
   */
  cancelSync(): void {
    if (this.abortController) {
      this.abortController.abort();
      debugLog('HealthKit: Sync cancelled by user');
    }
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
