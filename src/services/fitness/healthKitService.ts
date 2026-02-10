/**
 * HealthKit Service - Fixed Implementation with Performance Optimizations
 * Real iOS HealthKit integration for automatic workout sync
 * Integrates with existing fitness architecture and competition system
 * Includes progressive loading, timeout protection, and proper error handling
 */

import { Platform, InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WorkoutData, WorkoutType } from '../../types/workout';
import { SupabaseCompetitionService } from '../backend/SupabaseCompetitionService';
import { buildRewardTags } from '../../utils/rewardTags';

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
    } else if (
      typeof healthKitModule === 'object' &&
      healthKitModule.isHealthDataAvailable
    ) {
      ExpoHealthKit = healthKitModule;
    } else {
      ExpoHealthKit = healthKitModule;
    }
  } catch (e) {
    errorLog(
      'HealthKit Service: Failed to import @yzlin/expo-healthkit:',
      e.message
    );
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
// CORRECT type codes from @yzlin/expo-healthkit HKWorkoutActivityType enum
const HK_WORKOUT_TYPE_MAP: Record<string, WorkoutType> = {
  // Core cardio - CORRECT mappings
  37: 'running', // running
  52: 'walking', // walking
  13: 'cycling', // cycling
  24: 'hiking', // hiking

  // Strength training
  20: 'strength_training', // functionalStrengthTraining
  50: 'strength_training', // traditionalStrengthTraining
  59: 'strength_training', // coreTraining

  // Cardio machines → map to running
  16: 'running', // elliptical
  35: 'running', // rowing
  44: 'running', // stairClimbing
  63: 'running', // highIntensityIntervalTraining
  11: 'running', // crossTraining
  25: 'running', // mixedCardio

  // Other activities → map to running (never 'other')
  46: 'running', // swimming
  57: 'running', // yoga
  66: 'running', // pilates
  58: 'running', // flexibility
  45: 'running', // dance
  60: 'running', // kickboxing
  62: 'running', // jumpRope

  // Sports → map to running as cardio fallback
  1: 'running', // americanFootball
  2: 'running', // archery
  3: 'running', // australianFootball
  4: 'running', // badminton
  5: 'running', // baseball
  6: 'running', // basketball
  7: 'running', // bowling
  8: 'running', // boxing
  9: 'running', // climbing
  10: 'running', // cricket
  14: 'running', // crossCountrySkiing
  15: 'running', // curling
  17: 'running', // downhillSkiing
  18: 'running', // equestrianSports
  19: 'running', // fencing
  21: 'running', // fishing
  22: 'running', // golf
  23: 'running', // gymnastics
  26: 'running', // handball
  27: 'running', // hockey
  28: 'running', // hunting
  29: 'running', // lacrosse
  30: 'running', // martialArts
  31: 'running', // mindAndBody
  32: 'running', // paddleSports
  33: 'running', // play
  34: 'running', // preparationAndRecovery
  36: 'running', // racquetball
  38: 'running', // sailingSports
  39: 'running', // skatingSports
  40: 'running', // snowSports
  41: 'running', // soccer
  42: 'running', // softball
  43: 'running', // squash
  47: 'running', // surfingSports
  48: 'running', // tableTennis
  49: 'running', // tennis
  51: 'running', // trackAndField
  53: 'running', // volleyball
  54: 'running', // waterFitness
  55: 'running', // waterPolo
  56: 'running', // waterSports
  61: 'running', // wrestling
  64: 'running', // wheelchairWalkPace
  65: 'running', // wheelchairRunPace
  67: 'running', // barre
  68: 'running', // cardioDance
  69: 'running', // socialDance
  70: 'running', // pickleball
  71: 'running', // cooldown
  72: 'running', // swimBikeRun
  73: 'running', // transition
  74: 'running', // underwaterDiving
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
   * Load authorization status from AsyncStorage on app startup
   */
  private async loadAuthorizationStatus(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('@healthkit:authorized');
      this.isAuthorized = stored === 'true';
      debugLog(`HealthKit: Loaded authorization status: ${this.isAuthorized}`);
    } catch (error) {
      debugLog('HealthKit: Failed to load authorization status:', error);
      this.isAuthorized = false;
    }
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
      } else if (
        typeof healthKitModule === 'object' &&
        healthKitModule.isHealthDataAvailable
      ) {
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
      console.log(
        `🔍 DEBUG: HealthKit initialized, authorization verified: ${actuallyAuthorized}`
      );

      return {
        success: actuallyAuthorized,
        error: actuallyAuthorized
          ? undefined
          : 'Permission verification failed',
      };
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

              const authResult = await ExpoHealthKit.requestAuthorization(
                readPermissions,
                writePermissions
              );

              console.log('✅ HealthKit authorization completed');
              console.log('📊 Authorization result:', authResult);

              // Update the cached authorization status after successful permission request
              // This ensures getStatus() returns the correct value immediately
              this.isAuthorized = true;

              // Also persist to AsyncStorage for future sessions
              await AsyncStorage.setItem('@healthkit:authorized', 'true');

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
    ).catch((error) => {
      let errorMessage = 'HealthKit permissions denied';
      if (error instanceof Error) {
        if (error.message.includes('timed out')) {
          errorMessage =
            'Permission request is taking too long. Please try again or check your device settings.';
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
    onProgress?: (progress: {
      current: number;
      total: number;
      workouts: number;
    }) => void
  ): Promise<HealthKitWorkout[]> {
    // Check authorization FIRST before attempting to fetch
    if (!this.isAuthorized) {
      console.log('🔍 HealthKit: Not authorized, attempting to initialize...');
      const initResult = await this.initialize();
      if (!initResult.success) {
        throw new Error(
          `HealthKit not authorized: ${initResult.error || 'Permission denied'}`
        );
      }
    }

    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;
    this.abortController = new AbortController();

    console.log(
      `📱 HealthKit: Starting progressive fetch from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
    );

    try {
      const chunks = this.createDateChunks(startDate, endDate, 7); // 7-day chunks
      const allWorkouts: HealthKitWorkout[] = [];
      const processedIds = new Set<string>();

      console.log(
        `📊 HealthKit: Created ${chunks.length} date chunks for fetching`
      );

      for (let i = 0; i < chunks.length; i++) {
        // Check if aborted
        if (this.abortController.signal.aborted) {
          throw new Error('Sync cancelled');
        }

        const chunk = chunks[i];

        try {
          const workouts = await this.fetchWorkoutChunk(chunk.start, chunk.end);

          // Deduplicate
          const uniqueWorkouts = workouts.filter((w) => {
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
            workouts: allWorkouts.length,
          });

          console.log(
            `📊 HealthKit: Chunk ${i + 1}/${
              chunks.length
            } complete, total workouts: ${allWorkouts.length}`
          );

          // Allow UI to breathe between chunks
          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (error) {
          console.warn(
            `⚠️ HealthKit: Failed to fetch chunk ${i + 1}/${chunks.length}:`,
            error
          );
          // Continue with next chunk instead of failing entirely
        }
      }

      // Cache the results
      await this.cacheWorkouts(allWorkouts);

      console.log(
        `✅ HealthKit: Progressive fetch complete, found ${allWorkouts.length} workouts`
      );

      return allWorkouts;
    } finally {
      this.syncInProgress = false;
      this.abortController = null;
    }
  }

  /**
   * Fetch a single chunk of workouts
   */
  private async fetchWorkoutChunk(
    startDate: Date,
    endDate: Date
  ): Promise<HealthKitWorkout[]> {
    return this.executeWithTimeout(
      async () => {
        // HealthKit library expects Date objects, NOT ISO strings
        const query = {
          from: startDate,
          to: endDate,
          limit: 100,
        };

        console.log(
          `📱 Querying HealthKit workouts from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
        );
        console.log('📊 Query object being sent:', {
          from: startDate.toISOString(),
          to: endDate.toISOString(),
          limit: query.limit,
        });

        let results;
        try {
          results = await ExpoHealthKit.queryWorkouts(query);
          console.log(
            `📱 HealthKit query successful, returned ${
              results?.length || 0
            } raw workouts`
          );

          // Log first workout for debugging if any exist
          if (results && results.length > 0) {
            console.log(
              '🏃 First workout sample:',
              JSON.stringify(results[0], null, 2)
            );
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
              console.log(
                `⏱️  Workout too short (${w.duration}s), skipping:`,
                w.uuid
              );
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
    const sourceName = hkWorkout.sourceName || 'Unknown';

    // First try the standard mapping
    let activityType = HK_WORKOUT_TYPE_MAP[hkWorkout.workoutActivityType];

    // If unmapped, always default to running (never 'other')
    if (!activityType) {
      activityType = 'running';
    }

    return {
      UUID: hkWorkout.uuid,
      id: `healthkit_${hkWorkout.uuid}`,
      startDate: hkWorkout.startDate,
      endDate: hkWorkout.endDate,
      duration: hkWorkout.duration || 0,
      totalDistance: hkWorkout.totalDistance || 0,
      totalEnergyBurned: hkWorkout.totalEnergyBurned || 0,
      workoutActivityType: hkWorkout.workoutActivityType || 0,
      sourceName: sourceName,
      activityType: activityType,
    };
  }

  /**
   * Create date chunks for progressive loading
   */
  private createDateChunks(
    startDate: Date,
    endDate: Date,
    daysPerChunk: number
  ) {
    const chunks = [];
    let current = new Date(startDate);

    while (current < endDate) {
      const chunkEnd = new Date(current);
      chunkEnd.setDate(chunkEnd.getDate() + daysPerChunk);

      chunks.push({
        start: new Date(current),
        end: chunkEnd > endDate ? endDate : chunkEnd,
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
      let workoutType = HK_WORKOUT_TYPE_MAP[hkWorkout.workoutActivityType];

      // If unmapped, always default to running (never 'other')
      if (!workoutType) {
        workoutType = 'running';
      }

      // Convert and validate duration
      const duration = Math.round(hkWorkout.duration || 0);
      if (duration < 60) {
        // Skip workouts shorter than 1 minute
        return null;
      }

      // HealthKit already provides distance in meters, no conversion needed
      const distance = hkWorkout.totalDistance
        ? Math.round(hkWorkout.totalDistance)
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
      errorLog('HealthKit: Error normalizing workout:', error, hkWorkout);
      return null;
    }
  }

  /**
   * Save workout to AsyncStorage cache (returns 'saved', 'skipped', or 'error')
   * Pure Nostr architecture - workouts are cached locally, published via other services
   * Also triggers daily reward check on new saves.
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
      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({
          ...workout,
          cachedAt: new Date().toISOString(),
        })
      );

      debugLog(
        `HealthKit: Cached workout - ${workout.type}, ${workout.duration}s`
      );

      // NOTE: Reward trigger removed - HealthKit imports should NOT trigger rewards
      // Only user-generated workouts (gps_tracker, manual_entry, daily_steps) trigger rewards
      // This is handled in LocalWorkoutStorageService.checkStreakAndReward()

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
      console.log(
        '🔍 HealthKit: Verifying authorization by testing workout query...'
      );

      const testQuery = {
        from: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours (Date object)
        to: new Date(), // Current date (Date object)
        limit: 1, // Just test with 1 workout
      };

      try {
        // Attempt to query workouts - if this succeeds, we have permissions
        const testResults = await ExpoHealthKit.queryWorkouts(testQuery);
        console.log(
          '✅ HealthKit: Authorization verified - successfully queried workouts'
        );
        return true; // Query succeeded = permissions granted
      } catch (queryError: any) {
        // Check if error is due to missing permissions vs other issues
        const errorMessage = queryError?.message || String(queryError);

        if (
          errorMessage.includes('not authorized') ||
          errorMessage.includes('permission')
        ) {
          console.log(
            '❌ HealthKit: Authorization check failed - permissions not granted'
          );
          return false;
        }

        // Other errors (network, etc.) don't necessarily mean no permissions
        // If we're not sure, assume permissions are OK to avoid false negatives
        console.warn(
          '⚠️ HealthKit: Authorization check inconclusive, assuming OK:',
          errorMessage
        );
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
   * Save authorization status to both memory and persistent storage
   */
  private async saveAuthorizationStatus(authorized: boolean): Promise<void> {
    this.isAuthorized = authorized;

    try {
      await AsyncStorage.setItem(
        '@healthkit:authorized',
        authorized ? 'true' : 'false'
      );
      debugLog(`HealthKit: Saved authorization status: ${authorized}`);
    } catch (error) {
      debugLog('HealthKit: Failed to save authorization status:', error);
    }
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
   * Also auto-submits NEW cardio workouts to Supabase for leaderboard tracking.
   */
  private async cacheWorkouts(workouts: HealthKitWorkout[]): Promise<void> {
    try {
      const cacheKey = 'healthkit_workouts_cache';

      // Identify new workouts by comparing with previous cache
      const previousCache = await AsyncStorage.getItem(cacheKey);
      const previousIds = new Set<string>();
      if (previousCache) {
        try {
          const parsed = JSON.parse(previousCache);
          (parsed.workouts || []).forEach((w: HealthKitWorkout) => {
            previousIds.add(w.UUID || w.id || '');
          });
        } catch { /* ignore parse errors */ }
      }

      const cacheData = {
        workouts,
        timestamp: Date.now(),
        version: '1.0',
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      debugLog(`HealthKit: Cached ${workouts.length} workouts`);

      // Auto-submit new cardio workouts to Supabase (fire-and-forget)
      this.submitNewWorkoutsToSupabase(workouts, previousIds).catch((err) => {
        console.warn('[HealthKit] Supabase auto-submit error (silent):', err);
      });
    } catch (error) {
      console.warn('Failed to cache workouts:', error);
    }
  }

  /**
   * Submit newly discovered cardio workouts to Supabase for leaderboard tracking.
   */
  private async submitNewWorkoutsToSupabase(
    workouts: HealthKitWorkout[],
    previousIds: Set<string>
  ): Promise<void> {
    const CARDIO_TYPES = ['running', 'walking', 'cycling', 'hiking'];
    const npub = await AsyncStorage.getItem('@runstr:npub');
    if (!npub) return;

    // Build lightning address + charity tags for zapper reward routing
    const rewardTags = await buildRewardTags();

    const newCardio = workouts.filter((w) => {
      const id = w.UUID || w.id || '';
      if (!id || previousIds.has(id)) return false;
      if (!w.activityType || !CARDIO_TYPES.includes(w.activityType)) return false;
      if (!w.totalDistance || w.totalDistance <= 0) return false;
      return true;
    });

    for (const w of newCardio) {
      try {
        const eventId = `hk_${w.UUID || w.id}`;
        const tags: string[][] = [...rewardTags];

        await SupabaseCompetitionService.submitWorkoutSimple({
          eventId,
          npub,
          type: w.activityType || 'running',
          distance: w.totalDistance,
          duration: w.duration,
          calories: w.totalEnergyBurned,
          startTime: w.startDate,
          tags,
        });
        debugLog(`[HealthKit] Auto-submitted ${w.activityType} workout to Supabase: ${eventId}`);
      } catch (err) {
        console.warn(`[HealthKit] Failed to submit workout ${w.UUID}:`, err);
      }
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

      debugLog(
        `HealthKit: Retrieved ${cacheData.workouts.length} cached workouts`
      );
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
      const healthKitKeys = keys.filter((key) =>
        key.startsWith('healthkit_workout_')
      );

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
              if (
                workout.cachedAt &&
                new Date(workout.cachedAt) > sevenDaysAgo
              ) {
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
      debugLog(
        'HealthKit: Not authorized - cannot fetch workouts without user permission'
      );
      // CRITICAL FIX: Do NOT auto-initialize here - this causes unwanted permission popups
      // Permission requests should ONLY happen from explicit user actions (button taps)
      return [];
    }

    try {
      debugLog(
        `HealthKit: Fetching recent workouts (${days} days) for user ${userId}`
      );

      // Create proper date range for HealthKit query
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      console.log(
        `📅 Querying workouts from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
      );

      // HealthKit library expects Date objects, NOT ISO strings
      const options = {
        from: startDate,
        to: endDate,
        limit: 100, // Reasonable limit
        ascending: false, // Get newest workouts first
      };

      console.log('📊 Query options for getRecentWorkouts:', {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
        limit: options.limit,
        ascending: options.ascending,
      });

      // SAFETY CHECK: Double-verify authorization before querying
      // This prevents iOS from showing permission popup unexpectedly
      if (!this.isAuthorized) {
        console.log(
          '⚠️ HealthKit authorization lost before query - aborting to prevent popup'
        );
        return [];
      }

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
        console.error(
          '❌ Query options that failed:',
          JSON.stringify(options, null, 2)
        );
        // Return empty array instead of throwing to prevent UI crashes
        return [];
      }

      console.log(
        `📊 Processing ${
          healthKitWorkouts?.length || 0
        } HealthKit workouts for UI display`
      );

      // Filter and transform to match expected format
      const validWorkouts = (healthKitWorkouts || [])
        .filter((workout: any) => {
          if (!workout.uuid) {
            console.warn('⚠️  Workout missing UUID for UI, skipping');
            return false;
          }
          if (!workout.startDate || !workout.endDate) {
            console.warn(
              '⚠️  Workout missing date info for UI, skipping:',
              workout.uuid
            );
            return false;
          }
          return true;
        })
        .map((workout: any, index: number) => {
          // Debug: Log first workout to see ALL available properties
          if (index === 0 && workout) {
            console.log(
              '📊 DEBUG: Available workout properties:',
              Object.keys(workout)
            );
            console.log('📊 DEBUG: Full workout object:', workout);
            console.log('📊 DEBUG: Specific fields check:');
            console.log('  - uuid:', workout.uuid);
            console.log('  - duration:', workout.duration);
            console.log('  - distance:', workout.distance);
            console.log('  - totalDistance:', workout.totalDistance);
            console.log('  - totalEnergyBurned:', workout.totalEnergyBurned);
            console.log('  - activeEnergyBurned:', workout.activeEnergyBurned);
            console.log('  - energyBurned:', workout.energyBurned);
            console.log(
              '  - workoutActivityType:',
              workout.workoutActivityType
            );
          }

          // Extract distance - HealthKit returns HKQuantity objects, not raw numbers
          // Try to extract numeric value from HKQuantity object (.quantity, .doubleValue, or .value)
          const distanceRaw =
            workout.totalDistance ||
            workout.distance ||
            workout.distanceInMeters;
          const distance =
            distanceRaw?.quantity ||
            distanceRaw?.doubleValue ||
            distanceRaw?.value ||
            (typeof distanceRaw === 'number' ? distanceRaw : 0);

          // Extract calories - HealthKit returns HKQuantity objects, not raw numbers
          // Try to extract numeric value from HKQuantity object (.quantity, .doubleValue, or .value)
          const caloriesRaw =
            workout.totalEnergyBurned ||
            workout.activeEnergyBurned ||
            workout.energyBurned ||
            workout.calories;
          const calories =
            caloriesRaw?.quantity ||
            caloriesRaw?.doubleValue ||
            caloriesRaw?.value ||
            (typeof caloriesRaw === 'number' ? caloriesRaw : 0);

          // Debug: Log extracted values for first workout
          if (index === 0) {
            console.log('📊 DEBUG: Extracted values from first workout:');
            console.log(`  - Distance raw:`, distanceRaw);
            console.log(`  - Distance extracted:`, distance, 'meters');
            console.log(`  - Calories raw:`, caloriesRaw);
            console.log(`  - Calories extracted:`, calories, 'kcal');
          }

          const workoutData = this.normalizeWorkout(
            {
              UUID: workout.uuid,
              startDate: workout.startDate,
              endDate: workout.endDate,
              duration: workout.duration || 0,
              totalDistance: distance,
              totalEnergyBurned: calories,
              workoutActivityType: workout.workoutActivityType || 0,
              sourceName: workout.sourceName || 'Unknown',
            },
            userId
          );

          console.log(
            `🔍 Workout ${workout.uuid?.slice(
              0,
              8
            )}: distance=${distance}m, calories=${calories}kcal, duration=${
              workout.duration
            }s`
          );

          // Return in format expected by AppleHealthTab (simplified Workout interface)
          return {
            id: workoutData?.id || `healthkit_${workout.uuid}`,
            type: workoutData?.type || 'running',
            duration: workoutData?.duration || 0,
            distance: workoutData?.distance || 0,
            calories: workoutData?.calories || 0,
            startTime: workout.startDate,
            endTime: workout.endDate,
            source: 'healthkit',
            metadata: workoutData?.metadata || {},
          };
        })
        .filter(Boolean); // Remove any null results

      console.log(
        `✅ HealthKit: Returning ${validWorkouts.length} valid workouts for UI display`
      );
      return validWorkouts;
    } catch (error) {
      errorLog('HealthKit: Error in getRecentWorkouts:', error);

      console.error('❌ HealthKit getRecentWorkouts failed:', {
        error: error.message,
        userId,
        days,
        authorized: this.isAuthorized,
        available: HealthKitService.isAvailable(),
      });

      // Provide user-friendly error messages for timeout scenarios
      if (error instanceof Error && error.message.includes('timed out')) {
        throw new Error(
          'Workout sync is taking too long. Please try again or check your internet connection.'
        );
      }

      // Return empty array instead of throwing for UI components
      return [];
    }
  }
}

export default HealthKitService.getInstance();
