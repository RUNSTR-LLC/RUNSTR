/**
 * Health Connect Service - Android Health Connect integration
 * Mirrors HealthKitService API for consistent cross-platform experience
 * Supports Android 14+ where Health Connect is built into the OS
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WorkoutData, WorkoutType } from '../../types/workout';
import { inferActivityTypeSimple } from '../../utils/activityInference';
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
  console.error(message, ...args);
};

const SUBMITTED_IDS_KEY = '@healthconnect:submitted_workout_ids';
const MAX_SUBMITTED_IDS = 500;

// Import react-native-health-connect for Android only
let HealthConnect: any = null;
let ExerciseType: any = null;

if (Platform.OS === 'android') {
  try {
    const healthConnectModule = require('react-native-health-connect');
    HealthConnect = healthConnectModule;
    ExerciseType = healthConnectModule.ExerciseType;
    debugLog('Health Connect module loaded successfully');
  } catch (e: any) {
    errorLog('Health Connect: Failed to import react-native-health-connect:', e.message);
    HealthConnect = null;
    ExerciseType = null;
  }
}

// Health Connect exercise type mappings to RUNSTR workout types
// Values from: react-native-health-connect/src/constants.ts (ExerciseType)
// IMPORTANT: Health Connect uses DIFFERENT values than Google Fit!
const HC_EXERCISE_TYPE_MAP: Record<number, WorkoutType> = {
  // Running - ExerciseType.RUNNING = 56, ExerciseType.RUNNING_TREADMILL = 57
  56: 'running',          // RUNNING
  57: 'running',          // RUNNING_TREADMILL

  // Walking - ExerciseType.WALKING = 79
  79: 'walking',          // WALKING

  // Cycling - ExerciseType.BIKING = 8, ExerciseType.BIKING_STATIONARY = 9
  8: 'cycling',           // BIKING
  9: 'cycling',           // BIKING_STATIONARY

  // Hiking - ExerciseType.HIKING = 37
  37: 'hiking',           // HIKING

  // Strength Training - ExerciseType.STRENGTH_TRAINING = 70, ExerciseType.WEIGHTLIFTING = 81
  70: 'strength_training', // STRENGTH_TRAINING
  81: 'strength_training', // WEIGHTLIFTING

  // Gym/Cardio Equipment
  25: 'gym',              // ELLIPTICAL
  54: 'gym',              // ROWING_MACHINE
  68: 'gym',              // STAIR_CLIMBING
  69: 'gym',              // STAIR_CLIMBING_MACHINE
  36: 'gym',              // HIGH_INTENSITY_INTERVAL_TRAINING
  10: 'gym',              // BOOT_CAMP
  13: 'gym',              // CALISTHENICS

  // Other activities
  83: 'other',            // YOGA
  73: 'other',            // SWIMMING_OPEN_WATER
  74: 'other',            // SWIMMING_POOL
  48: 'other',            // PILATES
  16: 'other',            // DANCING
  33: 'meditation',       // GUIDED_BREATHING (closest to meditation)
  0: 'other',             // OTHER_WORKOUT
};

// Health Connect permissions to request
const HEALTH_CONNECT_PERMISSIONS = [
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'TotalCaloriesBurned' },
];

export interface HealthConnectWorkout {
  id: string;
  startTime: string;
  endTime: string;
  duration: number; // seconds
  totalDistance?: number; // meters
  totalEnergyBurned?: number; // calories
  exerciseType: number;
  sourceName: string;
  activityType?: WorkoutType;
  steps?: number;
  heartRate?: {
    avg: number;
    max: number;
  };
}

export interface HealthConnectSyncResult {
  success: boolean;
  workoutsCount?: number;
  newWorkouts?: number;
  skippedWorkouts?: number;
  error?: string;
}

// Debug info interface for troubleshooting
export interface HealthConnectDebugInfo {
  // Connection status
  provider: string | null;
  sdkStatus: number;
  sdkStatusText: string;

  // Permissions
  permissions: {
    exerciseSession: boolean;
    steps: boolean;
    heartRate: boolean;
    distance: boolean;
    calories: boolean;
  };

  // Query results
  exerciseSessionsFound: number;
  exerciseTypesFound: number[]; // Raw IDs for debugging unmapped types
  dateRangeQueried: { start: string; end: string } | null;

  // Errors
  lastError: string | null;

  // Metadata
  timestamp: string;
  appVersion: string;
}

// Health Connect provider package names
const HC_PROVIDER_BUILTIN = 'com.android.healthconnect'; // Android 14+ built-in (also GrapheneOS)
const HC_PROVIDER_GOOGLE = 'com.google.android.apps.healthdata'; // Google's app for older devices

export class HealthConnectService {
  private static instance: HealthConnectService;
  private isAuthorized = false;
  private syncInProgress = false;
  private lastSyncAt?: Date;
  private readonly DEFAULT_TIMEOUT = 60000; // 60 seconds
  private readonly PERMISSION_TIMEOUT = 30000; // 30 seconds for permissions
  private isModuleAvailable: boolean = false;
  private sdkAvailable: boolean | null = null;
  private clientInitialized: boolean = false;
  private detectedProvider: string | null = null; // Track which provider was detected

  // Debug tracking properties
  private lastSdkStatus: number = 0;
  private lastError: string | null = null;
  private exerciseTypesFound: number[] = [];
  private lastDateRangeQueried: { start: string; end: string } | null = null;
  private lastExerciseSessionsFound: number = 0;

  private constructor() {
    this.initializeModule();
    this.loadAuthorizationStatus();
  }

  /**
   * Load authorization status from AsyncStorage on app startup
   */
  private async loadAuthorizationStatus(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('@healthconnect:authorized');
      this.isAuthorized = stored === 'true';
      debugLog(`Health Connect: Loaded authorization status: ${this.isAuthorized}`);
    } catch (error) {
      debugLog('Health Connect: Failed to load authorization status:', error);
      this.isAuthorized = false;
    }
  }

  /**
   * Initialize Health Connect module with proper error handling
   */
  private async initializeModule() {
    if (Platform.OS !== 'android') {
      console.log('Health Connect not available on iOS');
      return;
    }

    try {
      const healthConnectModule = require('react-native-health-connect');
      HealthConnect = healthConnectModule;
      this.isModuleAvailable = true;
      debugLog('Health Connect module initialized successfully');
    } catch (error: any) {
      console.error('Failed to load Health Connect module:', error);
      this.isModuleAvailable = false;
      HealthConnect = null;
    }
  }

  static getInstance(): HealthConnectService {
    if (!HealthConnectService.instance) {
      HealthConnectService.instance = new HealthConnectService();
    }
    return HealthConnectService.instance;
  }

  /**
   * Check if Health Connect is available on this device
   */
  static isAvailable(): boolean {
    return Platform.OS === 'android' && HealthConnect !== null;
  }

  /**
   * Check if module is properly loaded
   */
  isAvailable(): boolean {
    return this.isModuleAvailable && HealthConnect !== null;
  }

  /**
   * Ensure the Health Connect client is initialized before any API calls
   * This is idempotent - safe to call multiple times
   * Uses the provider detected in checkSdkAvailability()
   */
  private async ensureClientInitialized(): Promise<boolean> {
    if (this.clientInitialized) {
      return true;
    }

    if (!this.isAvailable()) {
      return false;
    }

    try {
      // Use detected provider, or default to built-in (Android 14+)
      const provider = this.detectedProvider || HC_PROVIDER_BUILTIN;
      const initialized = await HealthConnect.initialize(provider);
      this.clientInitialized = true;
      debugLog(`Health Connect: Client initialized with provider ${provider}:`, initialized);
      return true;
    } catch (error) {
      errorLog('Health Connect: Failed to initialize client:', error);
      return false;
    }
  }

  /**
   * Check if Health Connect SDK is available (Android 14+ or Health Connect app installed)
   * Tries built-in Android 14+ provider first (com.android.healthconnect), then falls back
   * to Google's app (com.google.android.apps.healthdata) for older devices.
   */
  async checkSdkAvailability(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    if (this.sdkAvailable !== null) {
      return this.sdkAvailable;
    }

    try {
      // SDK_AVAILABLE = 3, SDK_UNAVAILABLE = 1, SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED = 2

      // Try Android 14+ built-in Health Connect first (works on GrapheneOS, stock Android 14+)
      let status = await HealthConnect.getSdkStatus(HC_PROVIDER_BUILTIN);
      debugLog(`Health Connect SDK status (built-in): ${status}`);

      if (status === 3) {
        this.detectedProvider = HC_PROVIDER_BUILTIN;
      } else {
        // If not available, try Google's Health Connect app (for older devices with Play Store)
        const googleStatus = await HealthConnect.getSdkStatus(HC_PROVIDER_GOOGLE);
        debugLog(`Health Connect SDK status (Google): ${googleStatus}`);
        if (googleStatus === 3) {
          status = googleStatus;
          this.detectedProvider = HC_PROVIDER_GOOGLE;
        }
      }

      this.sdkAvailable = status === 3;
      this.lastSdkStatus = status;
      debugLog(`Health Connect SDK available: ${this.sdkAvailable}, provider: ${this.detectedProvider}`);
      return this.sdkAvailable;
    } catch (error: any) {
      errorLog('Health Connect: Error checking SDK availability:', error);
      this.sdkAvailable = false;
      this.lastSdkStatus = 0;
      this.lastError = `SDK check failed: ${error?.message || 'Unknown error'}`;
      return false;
    }
  }

  /**
   * Initialize Health Connect and request permissions
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    if (!HealthConnectService.isAvailable()) {
      return {
        success: false,
        error: 'Health Connect not available on this device',
      };
    }

    try {
      debugLog('Health Connect: initialize() starting...');

      // Check SDK availability first
      const sdkAvailable = await this.checkSdkAvailability();
      if (!sdkAvailable) {
        return {
          success: false,
          error: 'Health Connect is not available. Please update to Android 14 or install Health Connect from Play Store.',
        };
      }

      // Initialize the Health Connect client
      const clientReady = await this.ensureClientInitialized();
      if (!clientReady) {
        return {
          success: false,
          error: 'Failed to initialize Health Connect client',
        };
      }

      // Request permissions (don't call this.requestPermissions() to avoid circular dependency)
      const grantedPermissions = await HealthConnect.requestPermission(HEALTH_CONNECT_PERMISSIONS);
      debugLog('Health Connect: Granted permissions:', grantedPermissions);

      // Check if we got at least the essential permissions (ExerciseSession)
      const hasExercisePermission = grantedPermissions.some(
        (p: any) => p.recordType === 'ExerciseSession' && p.accessType === 'read'
      );

      if (!hasExercisePermission) {
        await this.saveAuthorizationStatus(false);
        return {
          success: false,
          error: 'Exercise permission not granted. Please allow access to workout data.',
        };
      }

      await this.saveAuthorizationStatus(true);
      debugLog('Health Connect: Initialization complete');

      return { success: true };
    } catch (error: any) {
      errorLog('Health Connect: Initialization failed:', error);
      return {
        success: false,
        error: `Initialization failed: ${error?.message || 'Unknown error'}`,
      };
    }
  }

  /**
   * Request Health Connect permissions
   */
  async requestPermissions(): Promise<{ success: boolean; error?: string }> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Health Connect not available' };
    }

    try {
      debugLog('Health Connect: Requesting permissions...');

      // Ensure client is initialized before requesting permissions
      const clientReady = await this.ensureClientInitialized();
      if (!clientReady) {
        return {
          success: false,
          error: 'Failed to initialize Health Connect client',
        };
      }

      const grantedPermissions = await HealthConnect.requestPermission(HEALTH_CONNECT_PERMISSIONS);

      debugLog('Health Connect: Granted permissions:', grantedPermissions);

      // Check if we got at least the essential permissions (ExerciseSession)
      const hasExercisePermission = grantedPermissions.some(
        (p: any) => p.recordType === 'ExerciseSession' && p.accessType === 'read'
      );

      if (!hasExercisePermission) {
        return {
          success: false,
          error: 'Exercise permission not granted. Please allow access to workout data.',
        };
      }

      this.isAuthorized = true;
      await AsyncStorage.setItem('@healthconnect:authorized', 'true');

      debugLog('Health Connect: Permissions granted successfully');
      return { success: true };
    } catch (error: any) {
      errorLog('Health Connect: Permission request failed:', error);
      return {
        success: false,
        error: `Permission request failed: ${error?.message || 'Unknown error'}`,
      };
    }
  }

  /**
   * Fetch recent workouts from Health Connect
   */
  async fetchRecentWorkouts(days: number = 30): Promise<HealthConnectWorkout[]> {
    if (!this.isAuthorized) {
      debugLog('Health Connect: Not authorized, attempting to initialize...');
      const initResult = await this.initialize();
      if (!initResult.success) {
        throw new Error(`Health Connect not authorized: ${initResult.error || 'Permission denied'}`);
      }
    }

    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;

    try {
      // Ensure client is initialized before reading records
      const clientReady = await this.ensureClientInitialized();
      if (!clientReady) {
        throw new Error('Failed to initialize Health Connect client');
      }

      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      // Track date range for debug info
      this.lastDateRangeQueried = { start: startTime, end: endTime };

      debugLog(`Health Connect: Fetching workouts from ${startTime} to ${endTime}`);

      // Read exercise sessions
      const exerciseSessions = await HealthConnect.readRecords('ExerciseSession', {
        timeRangeFilter: {
          operator: 'between',
          startTime,
          endTime,
        },
      });

      // Track raw session count and exercise types for debug info
      const rawRecords = exerciseSessions?.records || [];
      this.lastExerciseSessionsFound = rawRecords.length;
      this.exerciseTypesFound = [...new Set(rawRecords.map((s: any) => s.exerciseType || 0))] as number[];

      debugLog(`Health Connect: Fetched ${rawRecords.length} exercise sessions`);
      debugLog(`Health Connect: Exercise types found: [${this.exerciseTypesFound.join(', ')}]`);

      const workouts: HealthConnectWorkout[] = [];

      for (const session of rawRecords) {
        const workout = await this.transformExerciseSession(session);
        if (workout) {
          workouts.push(workout);
        }
      }

      // Sort by startTime descending (newest first) to match iOS HealthKit behavior
      workouts.sort((a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );

      // Cache the results
      await this.cacheWorkouts(workouts);

      // Clear last error on success
      this.lastError = null;

      debugLog(`Health Connect: Returning ${workouts.length} valid workouts`);
      return workouts;
    } catch (error: any) {
      errorLog('Health Connect: Error fetching workouts:', error);
      this.lastError = `Fetch failed: ${error?.message || 'Unknown error'}`;
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Transform Health Connect ExerciseSession to our workout format
   */
  private async transformExerciseSession(session: any): Promise<HealthConnectWorkout | null> {
    try {
      const startTime = new Date(session.startTime);
      const endTime = new Date(session.endTime);
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

      // Skip workouts shorter than 1 minute
      if (duration < 60) {
        return null;
      }

      const exerciseType = session.exerciseType || 0;
      // Get mapped type first - will use inference if not mapped
      const mappedType = HC_EXERCISE_TYPE_MAP[exerciseType];

      // Try to get associated metrics
      let totalDistance = 0;
      let totalCalories = 0;
      let steps = 0;
      let avgHeartRate = 0;
      let maxHeartRate = 0;

      // Fetch distance for this session using aggregateRecord to avoid double-counting
      // Per Android docs: "For cumulative types, use aggregate() instead of readRecords()
      // to avoid double counting from multiple sources"
      try {
        const distanceResult = await HealthConnect.aggregateRecord({
          recordType: 'Distance',
          timeRangeFilter: {
            operator: 'between',
            startTime: session.startTime,
            endTime: session.endTime,
          },
        });

        totalDistance = distanceResult?.DISTANCE_TOTAL?.inMeters || 0;
      } catch (e) {
        debugLog('Health Connect: Could not fetch distance:', e);
      }

      // Fetch calories for this session using aggregateRecord to avoid double-counting
      try {
        const caloriesResult = await HealthConnect.aggregateRecord({
          recordType: 'ActiveCaloriesBurned',
          timeRangeFilter: {
            operator: 'between',
            startTime: session.startTime,
            endTime: session.endTime,
          },
        });

        totalCalories = caloriesResult?.ENERGY_TOTAL?.inKilocalories || 0;
      } catch (e) {
        debugLog('Health Connect: Could not fetch calories:', e);
      }

      // Fetch steps for this session using aggregateRecord to avoid double-counting
      try {
        const stepsResult = await HealthConnect.aggregateRecord({
          recordType: 'Steps',
          timeRangeFilter: {
            operator: 'between',
            startTime: session.startTime,
            endTime: session.endTime,
          },
        });

        steps = stepsResult?.COUNT_TOTAL || 0;
      } catch (e) {
        debugLog('Health Connect: Could not fetch steps:', e);
      }

      // Fetch heart rate for this session
      try {
        const heartRateRecords = await HealthConnect.readRecords('HeartRate', {
          timeRangeFilter: {
            operator: 'between',
            startTime: session.startTime,
            endTime: session.endTime,
          },
        });

        const samples = heartRateRecords?.records || [];
        if (samples.length > 0) {
          const bpmValues = samples.flatMap((r: any) =>
            (r.samples || []).map((s: any) => s.beatsPerMinute || 0)
          ).filter((v: number) => v > 0);

          if (bpmValues.length > 0) {
            avgHeartRate = Math.round(bpmValues.reduce((a: number, b: number) => a + b, 0) / bpmValues.length);
            maxHeartRate = Math.max(...bpmValues);
          }
        }
      } catch (e) {
        debugLog('Health Connect: Could not fetch heart rate:', e);
      }

      // Determine activity type: use mapped type if available, otherwise infer from metrics
      let activityType: WorkoutType;
      if (mappedType) {
        activityType = mappedType;
      } else {
        // Use smart inference based on workout metrics
        activityType = inferActivityTypeSimple({
          distance: totalDistance,
          duration,
          steps,
          heartRate: avgHeartRate > 0 ? { avg: avgHeartRate, max: maxHeartRate } : undefined,
        });
        debugLog(`Health Connect: Inferred activity type '${activityType}' for unmapped exercise type ${exerciseType}`);
      }

      return {
        id: `healthconnect_${session.metadata?.id || session.startTime}`,
        startTime: session.startTime,
        endTime: session.endTime,
        duration,
        totalDistance: Math.round(totalDistance),
        totalEnergyBurned: Math.round(totalCalories),
        exerciseType,
        sourceName: session.metadata?.dataOrigin?.packageName || 'Health Connect',
        activityType,
        steps: steps > 0 ? steps : undefined,
        heartRate: avgHeartRate > 0 ? { avg: avgHeartRate, max: maxHeartRate } : undefined,
      };
    } catch (error) {
      errorLog('Health Connect: Error transforming exercise session:', error);
      return null;
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
      available: HealthConnectService.isAvailable(),
      authorized: this.isAuthorized,
      syncInProgress: this.syncInProgress,
      lastSyncAt: this.lastSyncAt?.toISOString(),
    };
  }

  /**
   * Get current service status with real authorization check
   */
  async getStatusWithRealCheck(): Promise<{
    available: boolean;
    authorized: boolean;
    syncInProgress: boolean;
    lastSyncAt?: string;
    sdkAvailable: boolean;
  }> {
    const sdkAvailable = await this.checkSdkAvailability();

    // Check actual permission status
    let actuallyAuthorized = false;
    if (sdkAvailable && this.isAvailable()) {
      try {
        // Ensure client is initialized before checking permissions
        const clientReady = await this.ensureClientInitialized();
        if (clientReady) {
          const permissions = await HealthConnect.getGrantedPermissions();
          actuallyAuthorized = permissions.some(
            (p: any) => p.recordType === 'ExerciseSession' && p.accessType === 'read'
          );
        }
      } catch (e) {
        debugLog('Health Connect: Error checking permissions:', e);
      }
    }

    await this.saveAuthorizationStatus(actuallyAuthorized);

    return {
      available: HealthConnectService.isAvailable(),
      authorized: actuallyAuthorized,
      syncInProgress: this.syncInProgress,
      lastSyncAt: this.lastSyncAt?.toISOString(),
      sdkAvailable,
    };
  }

  /**
   * Get debug information for troubleshooting
   * Returns detailed status info that users can share when reporting issues
   */
  async getDebugInfo(): Promise<HealthConnectDebugInfo> {
    // Get SDK status text
    const sdkStatusText = this.lastSdkStatus === 3 ? 'Available' :
                          this.lastSdkStatus === 2 ? 'Provider update required' :
                          this.lastSdkStatus === 1 ? 'Unavailable' : 'Unknown';

    // Check permissions
    let permissions = {
      exerciseSession: false,
      steps: false,
      heartRate: false,
      distance: false,
      calories: false,
    };

    if (this.sdkAvailable && this.isAvailable()) {
      try {
        const clientReady = await this.ensureClientInitialized();
        if (clientReady) {
          const grantedPermissions = await HealthConnect.getGrantedPermissions();
          permissions = {
            exerciseSession: grantedPermissions.some((p: any) => p.recordType === 'ExerciseSession' && p.accessType === 'read'),
            steps: grantedPermissions.some((p: any) => p.recordType === 'Steps' && p.accessType === 'read'),
            heartRate: grantedPermissions.some((p: any) => p.recordType === 'HeartRate' && p.accessType === 'read'),
            distance: grantedPermissions.some((p: any) => p.recordType === 'Distance' && p.accessType === 'read'),
            calories: grantedPermissions.some((p: any) => p.recordType === 'ActiveCaloriesBurned' && p.accessType === 'read'),
          };
        }
      } catch (e) {
        debugLog('Health Connect: Error getting permissions for debug info:', e);
      }
    }

    return {
      provider: this.detectedProvider,
      sdkStatus: this.lastSdkStatus,
      sdkStatusText,
      permissions,
      exerciseSessionsFound: this.lastExerciseSessionsFound,
      exerciseTypesFound: this.exerciseTypesFound,
      dateRangeQueried: this.lastDateRangeQueried,
      lastError: this.lastError,
      timestamp: new Date().toISOString(),
      appVersion: '1.5.3-debug', // TODO: Get from app config
    };
  }

  /**
   * Save authorization status to both memory and persistent storage
   */
  private async saveAuthorizationStatus(authorized: boolean): Promise<void> {
    this.isAuthorized = authorized;

    try {
      await AsyncStorage.setItem('@healthconnect:authorized', authorized ? 'true' : 'false');
      debugLog(`Health Connect: Saved authorization status: ${authorized}`);
    } catch (error) {
      debugLog('Health Connect: Failed to save authorization status:', error);
    }
  }

  /**
   * Cache workouts to AsyncStorage
   * Also auto-submits NEW cardio workouts to Supabase for leaderboard tracking.
   */
  private async cacheWorkouts(workouts: HealthConnectWorkout[]): Promise<void> {
    try {
      const cacheKey = 'healthconnect_workouts_cache';

      // Identify new workouts by comparing with previous cache
      const previousCache = await AsyncStorage.getItem(cacheKey);
      const previousIds = new Set<string>();
      if (previousCache) {
        try {
          const parsed = JSON.parse(previousCache);
          (parsed.workouts || []).forEach((w: HealthConnectWorkout) => {
            previousIds.add(w.id || '');
          });
        } catch { /* ignore parse errors */ }
      }

      const cacheData = {
        workouts,
        timestamp: Date.now(),
        version: '1.0',
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      this.lastSyncAt = new Date();
      debugLog(`Health Connect: Cached ${workouts.length} workouts`);

      // Auto-submit new cardio workouts to Supabase (fire-and-forget)
      this.submitNewWorkoutsToSupabase(workouts, previousIds).catch((err) => {
        console.warn('[HealthConnect] Supabase auto-submit error (silent):', err);
      });
    } catch (error) {
      console.warn('Failed to cache Health Connect workouts:', error);
    }
  }

  /**
   * Submit newly discovered cardio workouts to Supabase for leaderboard tracking.
   */
  private async submitNewWorkoutsToSupabase(
    workouts: HealthConnectWorkout[],
    previousIds: Set<string>
  ): Promise<void> {
    const CARDIO_TYPES = ['running', 'walking', 'cycling', 'hiking'];
    const npub = await AsyncStorage.getItem('@runstr:npub');
    if (!npub) return;

    const submittedIds = await this.getSubmittedIds();

    const newCardio = workouts.filter((w) => {
      if (!w.id || previousIds.has(w.id) || submittedIds.has(w.id)) return false;
      if (!w.activityType || !CARDIO_TYPES.includes(w.activityType)) return false;
      if (!w.totalDistance || w.totalDistance <= 0) return false;
      return true;
    });

    // Build reward tags once for all workouts (lightning, team, charity, reward_destination)
    const rewardTags = await buildRewardTags();

    // Fetch cached profile for leaderboard display (name/picture)
    const profile = await this.getCachedProfile();

    for (const w of newCardio) {
      try {
        const eventId = `hc_${w.id}`;
        const result = await SupabaseCompetitionService.submitWorkoutSimple({
          eventId,
          npub,
          type: w.activityType || 'running',
          distance: w.totalDistance,
          duration: w.duration,
          calories: w.totalEnergyBurned,
          startTime: w.startTime,
          tags: [...rewardTags],
          profileName: profile.name,
          profilePicture: profile.picture,
        });

        if (!result.success) {
          // Permanent rejections (anti-cheat flagged): mark as submitted to avoid infinite retries
          if (result.flagged) {
            submittedIds.add(w.id);
            console.warn(`[HealthConnect] Workout flagged by anti-cheat, skipping: ${eventId} - ${result.error}`);
          } else {
            // Transient failure (network, timeout): leave unmarked so next sync retries
            console.warn(`[HealthConnect] Submission failed (will retry): ${eventId} - ${result.error}`);
          }
          continue;
        }

        submittedIds.add(w.id);
        debugLog(`[HealthConnect] Auto-submitted ${w.activityType} workout to Supabase: ${eventId}`);

        // Auto-join RUNSTR competitions for this workout (fire-and-forget)
        import('../competition/AutoJoinService').then(({ AutoJoinService }) => {
          AutoJoinService.checkAndAutoJoin(
            npub,
            w.activityType || 'running',
            new Date(w.startTime),
            profile
          ).catch(() => {});
        }).catch(() => {});
      } catch (err) {
        console.warn(`[HealthConnect] Failed to submit workout ${w.id}:`, err);
      }
    }

    await this.saveSubmittedIds(submittedIds);
  }

  private async getSubmittedIds(): Promise<Set<string>> {
    try {
      const raw = await AsyncStorage.getItem(SUBMITTED_IDS_KEY);
      if (!raw) return new Set();
      return new Set(JSON.parse(raw));
    } catch {
      return new Set();
    }
  }

  private async saveSubmittedIds(ids: Set<string>): Promise<void> {
    try {
      const trimmed = Array.from(ids).slice(-MAX_SUBMITTED_IDS);
      await AsyncStorage.setItem(SUBMITTED_IDS_KEY, JSON.stringify(trimmed));
    } catch (error) {
      console.warn('[HealthConnect] Failed to save submitted workout IDs:', error);
    }
  }

  /**
   * Get cached profile data for leaderboard display.
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
   * Get cached workouts from AsyncStorage
   */
  async getCachedWorkouts(): Promise<HealthConnectWorkout[] | null> {
    try {
      const cacheKey = 'healthconnect_workouts_cache';
      const cached = await AsyncStorage.getItem(cacheKey);

      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const cacheAge = Date.now() - cacheData.timestamp;

      // Cache valid for 5 minutes
      if (cacheAge > 5 * 60 * 1000) {
        debugLog('Health Connect: Cache expired');
        return null;
      }

      debugLog(`Health Connect: Retrieved ${cacheData.workouts.length} cached workouts`);
      return cacheData.workouts;
    } catch (error) {
      console.warn('Failed to get cached Health Connect workouts:', error);
      return null;
    }
  }

  /**
   * Force re-authorization
   */
  async reauthorize(): Promise<{ success: boolean; error?: string }> {
    await this.saveAuthorizationStatus(false);
    return await this.initialize();
  }

  /**
   * Cancel ongoing sync operation
   */
  cancelSync(): void {
    if (this.syncInProgress) {
      this.syncInProgress = false;
      debugLog('Health Connect: Sync cancelled by user');
    }
  }

  /**
   * Get recent workouts for UI components (public method)
   */
  async getRecentWorkouts(userId: string, days: number = 30): Promise<any[]> {
    if (!HealthConnectService.isAvailable()) {
      debugLog('Health Connect: Not available, returning empty array');
      return [];
    }

    if (!this.isAuthorized) {
      debugLog('Health Connect: Not authorized - cannot fetch workouts without user permission');
      return [];
    }

    try {
      debugLog(`Health Connect: Fetching recent workouts (${days} days) for user ${userId}`);

      const healthConnectWorkouts = await this.fetchRecentWorkouts(days);

      // Transform to match expected UI format
      return healthConnectWorkouts.map((workout) => ({
        id: workout.id,
        type: workout.activityType || 'other',
        duration: workout.duration,
        distance: workout.totalDistance || 0,
        calories: workout.totalEnergyBurned || 0,
        startTime: workout.startTime,
        endTime: workout.endTime,
        source: 'health_connect',
        steps: workout.steps,
        heartRate: workout.heartRate,
        metadata: {
          sourceApp: workout.sourceName,
          originalExerciseType: workout.exerciseType,
          healthConnectId: workout.id,
          syncedVia: 'health_connect_service',
        },
      }));
    } catch (error) {
      errorLog('Health Connect: Error in getRecentWorkouts:', error);
      return [];
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(userId: string): Promise<{
    totalHealthConnectWorkouts: number;
    recentSyncs: number;
    lastSyncDate?: string;
  }> {
    try {
      const cached = await this.getCachedWorkouts();
      return {
        totalHealthConnectWorkouts: cached?.length || 0,
        recentSyncs: cached ? 1 : 0,
        lastSyncDate: this.lastSyncAt?.toISOString(),
      };
    } catch (error) {
      errorLog('Health Connect: Error getting sync stats:', error);
      return {
        totalHealthConnectWorkouts: 0,
        recentSyncs: 0,
      };
    }
  }

  // Cache for daily steps (separate from workout cache)
  private cachedDailySteps: { steps: number; startTime: Date; endTime: Date; lastUpdated: Date } | null = null;
  private readonly stepsCacheExpiry = 5 * 1000; // 5 seconds for near-real-time updates

  /**
   * Get today's total step count from Health Connect
   * Mirrors HealthKit behavior - queries from midnight to now
   */
  async getTodaySteps(): Promise<{ steps: number; startTime: Date; endTime: Date } | null> {
    if (!this.isAvailable()) {
      debugLog('Health Connect: Not available for step counting');
      return null;
    }

    // Check cache validity
    if (this.cachedDailySteps && this.isStepsCacheValid()) {
      debugLog(`Health Connect: Returning cached steps: ${this.cachedDailySteps.steps}`);
      return {
        steps: this.cachedDailySteps.steps,
        startTime: this.cachedDailySteps.startTime,
        endTime: this.cachedDailySteps.endTime,
      };
    }

    // Check authorization - if not authorized, try to initialize
    if (!this.isAuthorized) {
      debugLog('Health Connect: Not authorized for steps, attempting to initialize...');
      const initResult = await this.initialize();
      if (!initResult.success) {
        debugLog('Health Connect: Failed to authorize for steps:', initResult.error);
        return null;
      }
    }

    try {
      // Ensure client is initialized before reading records
      const clientReady = await this.ensureClientInitialized();
      if (!clientReady) {
        debugLog('Health Connect: Failed to initialize client for steps');
        return null;
      }

      // Verify Steps permission before querying
      const hasSteps = await this.hasStepsPermission();
      if (!hasSteps) {
        debugLog('Health Connect: Steps permission not granted, cannot query steps');
        return null;
      }

      // Calculate today's time range (midnight to now)
      const startTime = new Date();
      startTime.setHours(0, 0, 0, 0); // Midnight today
      const endTime = new Date(); // Now

      debugLog(`Health Connect: Querying steps from ${startTime.toISOString()} to ${endTime.toISOString()}`);

      // Use aggregateRecord instead of readRecords for cumulative data like steps
      // Per Android docs: "For cumulative types like StepsRecord, use aggregate()
      // instead of readRecords() to avoid double counting from multiple sources"
      const result = await HealthConnect.aggregateRecord({
        recordType: 'Steps',
        timeRangeFilter: {
          operator: 'between',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
      });

      debugLog('Health Connect: aggregateRecord result:', JSON.stringify(result));

      // COUNT_TOTAL contains the properly aggregated step count
      const totalSteps = result?.COUNT_TOTAL || 0;

      if (totalSteps === 0) {
        debugLog('Health Connect: 0 steps returned - check if user has step data in Health Connect app');
      }

      debugLog(`Health Connect: ✅ Today's steps (aggregated): ${totalSteps}`);

      // Update cache
      this.cachedDailySteps = {
        steps: totalSteps,
        startTime,
        endTime,
        lastUpdated: new Date(),
      };

      return {
        steps: totalSteps,
        startTime,
        endTime,
      };
    } catch (error) {
      errorLog('Health Connect: Error getting today steps:', error);
      return null;
    }
  }

  /**
   * Check if step cache is still valid (less than 30 seconds old)
   */
  private isStepsCacheValid(): boolean {
    if (!this.cachedDailySteps) return false;
    const age = Date.now() - this.cachedDailySteps.lastUpdated.getTime();
    return age < this.stepsCacheExpiry;
  }

  /**
   * Clear daily steps cache (forces fresh query on next call)
   */
  clearStepsCache(): void {
    this.cachedDailySteps = null;
    debugLog('Health Connect: Steps cache cleared');
  }

  /**
   * Check if Steps permission is granted
   */
  async hasStepsPermission(): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const sdkAvailable = await this.checkSdkAvailability();
      if (!sdkAvailable) return false;

      // Ensure client is initialized before checking permissions
      const clientReady = await this.ensureClientInitialized();
      if (!clientReady) return false;

      const permissions = await HealthConnect.getGrantedPermissions();
      return permissions.some(
        (p: any) => p.recordType === 'Steps' && p.accessType === 'read'
      );
    } catch (error) {
      debugLog('Health Connect: Error checking steps permission:', error);
      return false;
    }
  }

  /**
   * Open Health Connect settings/app
   */
  async openHealthConnectSettings(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Health Connect not available');
    }

    try {
      // Ensure client is initialized before opening settings
      await this.ensureClientInitialized();
      await HealthConnect.openHealthConnectSettings();
    } catch (error) {
      errorLog('Health Connect: Error opening settings:', error);
      throw error;
    }
  }
}

export default HealthConnectService.getInstance();
