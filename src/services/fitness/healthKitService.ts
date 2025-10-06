/**
 * HealthKit Service - Fixed Implementation with Performance Optimizations
 * Real iOS HealthKit integration for automatic workout sync
 * Integrates with existing fitness architecture and competition system
 * Includes progressive loading, timeout protection, and proper error handling
 */

import { Platform, InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { supabase } from '../supabase';  // REMOVED: Project now uses pure Nostr
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

// Enhanced HealthKit permissions configuration (NIP-101e requirements)
const HEALTHKIT_READ_PERMISSIONS = [
  'ActiveEnergyBurned',
  'DistanceWalkingRunning',
  'DistanceCycling',
  'HeartRate',
  'Workout',
  // New additions for richer workout data
  'StepCount',
  'FlightsClimbed',
  'VO2Max',
  'RestingHeartRate',
  'HeartRateVariabilitySDNN',
  // Note: WorkoutRoute requires special handling and additional configuration
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
  private readonly DEFAULT_TIMEOUT = 60000; // 60 seconds (increased for large workout libraries)
  private readonly PERMISSION_TIMEOUT = 30000; // 30 seconds for permissions (increased for careful users)
  private abortController: AbortController | null = null;
  private isModuleAvailable: boolean = false;

  private constructor() {
    this.initializeModule();
    this.loadAuthorizationStatus();
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

  /**
   * Load authorization status from AsyncStorage to persist across app restarts
   */
  private async loadAuthorizationStatus() {
    try {
      const stored = await AsyncStorage.getItem('@healthkit:authorized');
      if (stored === 'true') {
        this.isAuthorized = true;
        console.log('✅ HealthKit: Loaded persisted authorization status');
      }
    } catch (error) {
      console.warn('Failed to load HealthKit authorization status:', error);
    }
  }

  /**
   * Save authorization status to AsyncStorage for persistence
   */
  private async saveAuthorizationStatus(authorized: boolean) {
    try {
      await AsyncStorage.setItem('@healthkit:authorized', authorized ? 'true' : 'false');
      this.isAuthorized = authorized;
      console.log(`✅ HealthKit: Saved authorization status: ${authorized}`);
    } catch (error) {
      console.warn('Failed to save HealthKit authorization status:', error);
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
        await this.saveAuthorizationStatus(false);
        return permissionsResult;
      }

      // Verify actual iOS authorization status after permission request
      const actuallyAuthorized = await this.checkActualAuthorizationStatus();
      await this.saveAuthorizationStatus(actuallyAuthorized);
      console.log(`🔍 DEBUG: HealthKit initialized, authorization verified: ${actuallyAuthorized}`);

      return { success: actuallyAuthorized, error: actuallyAuthorized ? undefined : 'Permission verification failed' };
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

              // Enhanced permissions arrays for NIP-101e compliance
              const readPermissions = [
                'HKQuantityTypeIdentifierActiveEnergyBurned',
                'HKQuantityTypeIdentifierDistanceWalkingRunning',
                'HKQuantityTypeIdentifierDistanceCycling',
                'HKQuantityTypeIdentifierHeartRate',
                'HKWorkoutTypeIdentifier',
                // New additions for richer data
                'HKQuantityTypeIdentifierStepCount',
                'HKQuantityTypeIdentifierFlightsClimbed',
                'HKQuantityTypeIdentifierVO2Max',
                'HKQuantityTypeIdentifierRestingHeartRate',
                'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
                // Note: HKWorkoutRoute requires special entitlements
              ];
              const writePermissions: string[] = [];

              // Request authorization with detailed logging
              console.log('📱 Requesting HealthKit authorization...');
              console.log('📋 Read permissions:', readPermissions.slice(0, 5)); // Log first 5 for brevity
              console.log('📝 Write permissions:', writePermissions);

              const authResult = await ExpoHealthKit.requestAuthorization(readPermissions, writePermissions);

              console.log('✅ HealthKit authorization completed');
              console.log('📊 Authorization result:', authResult);

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
    // Check authorization FIRST before attempting to fetch
    if (!this.isAuthorized) {
      console.log('🔍 HealthKit: Not authorized, attempting to initialize...');
      const initResult = await this.initialize();
      if (!initResult.success) {
        throw new Error(`HealthKit not authorized: ${initResult.error || 'Permission denied'}`);
      }
    }

    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;
    this.abortController = new AbortController();

    console.log(`📱 HealthKit: Starting progressive fetch from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);

    try {
      const chunks = this.createDateChunks(startDate, endDate, 7); // 7-day chunks
      const allWorkouts: HealthKitWorkout[] = [];
      const processedIds = new Set<string>();

      console.log(`📊 HealthKit: Created ${chunks.length} date chunks for fetching`);

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

          console.log(`📊 HealthKit: Chunk ${i + 1}/${chunks.length} complete, total workouts: ${allWorkouts.length}`);

          // Allow UI to breathe between chunks
          await new Promise(resolve => setTimeout(resolve, 50));

        } catch (error) {
          console.warn(`⚠️ HealthKit: Failed to fetch chunk ${i + 1}/${chunks.length}:`, error);
          // Continue with next chunk instead of failing entirely
        }
      }

      // Cache the results
      await this.cacheWorkouts(allWorkouts);

      console.log(`✅ HealthKit: Progressive fetch complete, found ${allWorkouts.length} workouts`);

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
        // HealthKit library expects Date objects, NOT ISO strings
        const query = {
          from: startDate,
          to: endDate,
          limit: 100
        };

        console.log(`📱 Querying HealthKit workouts from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
        console.log('📊 Query object being sent:', { from: startDate.toISOString(), to: endDate.toISOString(), limit: query.limit });

        let results;
        try {
          results = await ExpoHealthKit.queryWorkouts(query);
          console.log(`📱 HealthKit query successful, returned ${results?.length || 0} raw workouts`);

          // Log first workout for debugging if any exist
          if (results && results.length > 0) {
            console.log('🏃 First workout sample:', JSON.stringify(results[0], null, 2));
          }
        } catch (queryError) {
          console.error('❌ HealthKit queryWorkouts failed:', queryError);
          console.error('Query that failed:', query);
          throw queryError;
        }

        // Transform and validate
        const validWorkouts = (results || [])
          .filter((w: any) => {
            if (!w.uuid) {
              console.warn('⚠️  Workout missing UUID, skipping:', w);
              return false;
            }
            if (!w.duration || w.duration < 60) {
              console.log(`⏱️  Workout too short (${w.duration}s), skipping:`, w.uuid);
              return false;
            }
            return true;
          })
          .map((w: any) => this.transformWorkout(w));

        console.log(`✅ Returning ${validWorkouts.length} valid workouts`);
        return validWorkouts;
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
   * Save workout to AsyncStorage cache (returns 'saved', 'skipped', or 'error')
   * Pure Nostr architecture - workouts are cached locally, published via other services
   */
  private async saveWorkout(
    workout: WorkoutData
  ): Promise<'saved' | 'skipped' | 'error'> {
    try {
      // Check if workout already exists in cache
      const cacheKey = `healthkit_workout_${workout.id}`;
      const existing = await AsyncStorage.getItem(cacheKey);

      if (existing) {
        return 'skipped'; // Already exists
      }

      // Save to local cache (AsyncStorage)
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        ...workout,
        cachedAt: new Date().toISOString()
      }));

      debugLog(
        `HealthKit: Cached workout - ${workout.type}, ${workout.duration}s`
      );
      return 'saved';
    } catch (error) {
      errorLog('HealthKit: Error caching workout:', error);
      return 'error';
    }
  }

  /**
   * Check the actual iOS HealthKit authorization status (not session-based)
   * Improved to actually verify iOS permissions instead of assuming success
   */
  private async checkActualAuthorizationStatus(): Promise<boolean> {
    if (!HealthKitService.isAvailable()) {
      return false;
    }

    try {
      // Try to query workouts as a test - if we can fetch data, permissions are granted
      // This is more reliable than getAuthorizationStatusForType which returns "undetermined" for privacy
      console.log('🔍 HealthKit: Verifying authorization by testing workout query...');

      const testQuery = {
        from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
        to: new Date().toISOString(),
        limit: 1 // Just test with 1 workout
      };

      try {
        // Attempt to query workouts - if this succeeds, we have permissions
        const testResults = await ExpoHealthKit.queryWorkouts(testQuery);
        console.log('✅ HealthKit: Authorization verified - successfully queried workouts');
        return true; // Query succeeded = permissions granted
      } catch (queryError: any) {
        // Check if error is due to missing permissions vs other issues
        const errorMessage = queryError?.message || String(queryError);

        if (errorMessage.includes('not authorized') || errorMessage.includes('permission')) {
          console.log('❌ HealthKit: Authorization check failed - permissions not granted');
          return false;
        }

        // Other errors (network, etc.) don't necessarily mean no permissions
        // If we're not sure, assume permissions are OK to avoid false negatives
        console.warn('⚠️ HealthKit: Authorization check inconclusive, assuming OK:', errorMessage);
        return true;
      }
    } catch (error) {
      errorLog('HealthKit: Error checking authorization status:', error);
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

    // Update our session flag and persist to match reality
    await this.saveAuthorizationStatus(actuallyAuthorized);

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
    await this.saveAuthorizationStatus(false);
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
   * Get sync statistics from local cache
   */
  async getSyncStats(userId: string): Promise<{
    totalHealthKitWorkouts: number;
    recentSyncs: number;
    lastSyncDate?: string;
  }> {
    try {
      // Get all cached HealthKit workouts for this user
      const keys = await AsyncStorage.getAllKeys();
      const healthKitKeys = keys.filter(key => key.startsWith('healthkit_workout_'));

      let totalCount = 0;
      let recentCount = 0;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      for (const key of healthKitKeys) {
        try {
          const workoutData = await AsyncStorage.getItem(key);
          if (workoutData) {
            const workout = JSON.parse(workoutData);
            if (workout.userId === userId) {
              totalCount++;
              if (workout.cachedAt && new Date(workout.cachedAt) > sevenDaysAgo) {
                recentCount++;
              }
            }
          }
        } catch (parseError) {
          // Skip corrupted entries
          continue;
        }
      }

      return {
        totalHealthKitWorkouts: totalCount,
        recentSyncs: recentCount,
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

      // Create proper date range for HealthKit query
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      console.log(`📅 Querying workouts from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);

      // HealthKit library expects Date objects, NOT ISO strings
      const options = {
        from: startDate,
        to: endDate,
        limit: 100, // Reasonable limit
        ascending: false // Get newest workouts first
      };

      console.log('📊 Query options for getRecentWorkouts:', { from: startDate.toISOString(), to: endDate.toISOString(), limit: options.limit, ascending: options.ascending });

      let healthKitWorkouts;
      try {
        healthKitWorkouts = await this.executeWithTimeout(
          async () => {
            console.log('🔄 Executing ExpoHealthKit.queryWorkouts...');
            const results = await ExpoHealthKit.queryWorkouts(options);
            console.log('✅ Query completed, got response');
            return results;
          },
          this.DEFAULT_TIMEOUT,
          `HealthKit workout query for ${days} days`
        );
      } catch (queryError) {
        console.error('❌ Failed to query HealthKit workouts:', queryError);
        console.error('❌ Query options that failed:', JSON.stringify(options, null, 2));
        // Return empty array instead of throwing to prevent UI crashes
        return [];
      }

      console.log(`📊 Processing ${healthKitWorkouts?.length || 0} HealthKit workouts for UI display`);

      // Filter and transform to match expected format
      const validWorkouts = (healthKitWorkouts || []).filter(
        (workout: any) => {
          if (!workout.uuid) {
            console.warn('⚠️  Workout missing UUID for UI, skipping');
            return false;
          }
          if (!workout.startDate || !workout.endDate) {
            console.warn('⚠️  Workout missing date info for UI, skipping:', workout.uuid);
            return false;
          }
          return true;
        }
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

      console.log(`✅ HealthKit: Returning ${validWorkouts.length} valid workouts for UI display`);
      return validWorkouts;
    } catch (error) {
      errorLog('HealthKit: Error in getRecentWorkouts:', error);
      
      console.error('❌ HealthKit getRecentWorkouts failed:', {
        error: error.message,
        userId,
        days,
        authorized: this.isAuthorized,
        available: HealthKitService.isAvailable()
      });

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
