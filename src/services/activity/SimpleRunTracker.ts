/**
 * SimpleRunTracker - Clean, working run tracker following proven patterns
 *
 * Key Architecture Decisions:
 * 1. Simple JS timer - Always works, independent of GPS signal
 * 2. Hybrid duration - GPS-synced but falls back to JS when signal lost
 * 3. Single subscription - TaskManager only, no conflicts
 * 4. Post-processing - Calculate distance from stored points after run
 *
 * Inspired by: Junior dev's guide + working reference implementation
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { SplitTrackingService, type Split, type UnitSystem } from './SplitTrackingService';
import { CustomAlertManager as CustomAlert } from '../../components/ui/CustomAlert';
import {
  startNativeWorkoutSession,
  stopNativeWorkoutSession,
} from './WorkoutSessionBridge';
import TTSAnnouncementService from './TTSAnnouncementService';
import { BatteryOptimizationService } from './BatteryOptimizationService';
import {
  activateKeepAwakeAsync,
  deactivateKeepAwake,
} from 'expo-keep-awake';
import {
  Audio,
  InterruptionModeIOS,
  InterruptionModeAndroid,
} from 'expo-av';
import { gpsHealthMonitor, type GPSHealthStatus } from './GPSHealthMonitor';
import { workoutRecovery } from './WorkoutRecovery';

// Storage keys
// MEMORY-ONLY ARCHITECTURE: GPS points are NOT stored, only metrics for crash recovery
const SESSION_STATE_KEY = '@runstr:session_state';
const ACTIVE_METRICS_KEY = '@runstr:active_metrics'; // Periodic save: distance, duration, splits
const LAST_GPS_POINT_KEY = '@runstr:last_gps_point'; // Single point for background task filtering
const UNIT_PREFERENCE_KEY = '@runstr:unit_preference'; // User's km/miles preference

// Task name
export const SIMPLE_TRACKER_TASK = 'runstr-simple-tracker';

// Types
export interface GPSPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
}

export interface RunSession {
  id: string;
  activityType: 'running' | 'walking' | 'cycling' | 'hiking';
  startTime: number;
  endTime?: number;
  distance: number; // meters
  duration: number; // seconds
  pausedDuration: number; // seconds
  pauseCount: number;
  gpsPoints?: GPSPoint[]; // MEMORY-ONLY: Optional, only populated for route display during tracking
  presetDistance?: number; // Optional race preset distance in meters
  splits?: Split[]; // Kilometer splits for running activities
  elevationGain?: number; // Total elevation gain in meters
}

interface SessionState {
  sessionId: string;
  activityType: string;
  isTracking: boolean;
  isPaused: boolean;
  startTime: number;
  pauseCount: number;
  presetDistance?: number; // Optional race preset distance in meters
  // SimpleDurationTracker state (for session recovery)
  trackerStartTime: number;
  trackerTotalPausedTime: number;
  trackerPauseStartTime: number;
  // GPS warm-up counter (read by SimpleRunTrackerTask, reset on new sessions)
  gpsPointCount?: number;
}

/**
 * Simple Duration Tracker (like Reference Implementation)
 * Just calculates: (now - startTime - pausedTime) / 1000
 * No GPS interference, no hybrid logic, no complexity
 */
class SimpleDurationTracker {
  private startTime: number = 0;
  private totalPausedTime: number = 0;
  private pauseStartTime: number = 0;

  start(startTime: number) {
    this.startTime = startTime;
    this.totalPausedTime = 0;
    this.pauseStartTime = 0;

    console.log(
      '[SimpleDurationTracker] Started - pure timestamp tracking (no timer)'
    );
  }

  stop() {
    console.log('[SimpleDurationTracker] Stopped');
  }

  pause() {
    this.pauseStartTime = Date.now();
    console.log('[SimpleDurationTracker] Paused');
  }

  resume() {
    if (this.pauseStartTime > 0) {
      const pauseDuration = Date.now() - this.pauseStartTime;
      this.totalPausedTime += pauseDuration;
      this.pauseStartTime = 0;
      console.log(
        `[SimpleDurationTracker] Resumed (paused for ${(
          pauseDuration / 1000
        ).toFixed(1)}s)`
      );
    }
  }

  /**
   * Get current duration in seconds
   * Pure timestamp calculation - works in foreground, background, across app restarts
   * No timer needed - just math!
   */
  getDuration(): number {
    // If paused, calculate frozen duration using pauseStartTime
    if (this.pauseStartTime > 0) {
      return Math.floor(
        (this.pauseStartTime - this.startTime - this.totalPausedTime) / 1000
      );
    }
    // Otherwise calculate from current time
    const now = Date.now();
    return Math.floor((now - this.startTime - this.totalPausedTime) / 1000);
  }

  getTotalPausedTime(): number {
    const currentPause =
      this.pauseStartTime > 0 ? Date.now() - this.pauseStartTime : 0;
    return Math.floor((this.totalPausedTime + currentPause) / 1000);
  }

  /**
   * Export tracker state for session persistence
   * Duration is calculated on-demand, no need to store it
   */
  exportState() {
    return {
      startTime: this.startTime,
      totalPausedTime: this.totalPausedTime,
      pauseStartTime: this.pauseStartTime,
    };
  }

  /**
   * Restore tracker state from saved session
   * Duration is calculated on-demand from timestamps, no timer needed
   */
  restoreState(state: {
    startTime: number;
    totalPausedTime: number;
    pauseStartTime: number;
  }) {
    this.startTime = state.startTime;
    this.totalPausedTime = state.totalPausedTime;
    this.pauseStartTime = state.pauseStartTime;

    console.log(
      '[SimpleDurationTracker] State restored - timestamp tracking active'
    );
  }
}

/**
 * SimpleRunTracker - Main tracking service
 */
export class SimpleRunTracker {
  private static instance: SimpleRunTracker;

  // Core state
  private sessionId: string | null = null;
  private activityType: 'running' | 'walking' | 'cycling' | 'hiking' = 'running';
  private isTracking = false;
  private isPaused = false;
  private pauseCount = 0;
  private presetDistance: number | null = null; // Race preset distance in meters

  // Duration tracker (simple Date.now() calculation)
  private durationTracker = new SimpleDurationTracker();

  // Split tracker (kilometer splits for running)
  private splitTracker = new SplitTrackingService();

  // Start time
  private startTime: number = 0;

  // MEMORY-ONLY ARCHITECTURE: GPS points stored in memory only, never persisted
  // Distance and elevation are calculated incrementally as points arrive
  private cachedGpsPoints: GPSPoint[] = []; // Only last 100 points for route display
  private lastGpsPoint: GPSPoint | null = null; // Last point for incremental distance
  private runningDistance: number = 0; // Incrementally calculated distance (meters)
  private runningElevationGain: number = 0; // Incrementally calculated elevation gain (meters)
  private lastAltitude: number | null = null; // Last valid altitude for incremental elevation

  // Periodic metrics save for crash recovery (every 30 seconds)
  private metricsSaveInterval: NodeJS.Timeout | null = null;
  private readonly METRICS_SAVE_INTERVAL_MS = 30000; // Save metrics every 30 seconds

  // GPS health tracking for error recovery
  private lastGPSUpdate: number = Date.now();
  private isInGPSRecovery = false;
  private recoveryPointsSkipped = 0;
  private gpsFailureCount = 0;
  private lastGPSError: string | null = null;
  private lastGPSHealthStatus: GPSHealthStatus | null = null;

  // Auto-stop callback (for UI notification when preset distance reached)
  private autoStopCallback: (() => void) | null = null;

  // GPS Watchdog - detects and recovers from silent GPS failures
  // Increased restarts (100 vs 5) to handle aggressive Android battery management
  // Counter resets when GPS successfully receives points, allowing unlimited recovery
  private watchdogInterval: NodeJS.Timeout | null = null;
  private gpsRestartAttempts = 0;
  private readonly MAX_GPS_RESTARTS = 100; // Increased from 5 - resets on successful GPS
  // Platform-aware GPS timeout:
  // - Android (15s): GPS can silently die, needs faster watchdog detection
  // - iOS (30s): GPS is reliable but occasionally delivers in slightly delayed
  //   batches (12-16s apart) during background operation. The old 15s value
  //   caused false-positive watchdog triggers on iOS, each costing ~100m of
  //   distance due to the recovery cycle overhead.
  private readonly GPS_TIMEOUT_MS = Platform.OS === 'ios' ? 30000 : 15000;
  private readonly WATCHDOG_CHECK_MS = 5000; // Check every 5 seconds

  // Silent audio recording - keeps app alive in background (Android insurance)
  private silentRecording: Audio.Recording | null = null;

  // Debug state for diagnostic UI (GPS death diagnosis)
  private debugState = {
    watchdogLastCheck: 0,
    recoverySuccesses: 0,
    recoveryFailures: 0,
    lastRecoveryError: null as string | null,
    totalPointsReceived: 0,
    lastPointAccuracy: 0,
  };

  private constructor() {
    console.log('[SimpleRunTracker] Initialized');
  }

  static getInstance(): SimpleRunTracker {
    if (!SimpleRunTracker.instance) {
      SimpleRunTracker.instance = new SimpleRunTracker();
    }
    return SimpleRunTracker.instance;
  }

  /**
   * Start tracking - INSTANT UI RESPONSE (like reference implementation)
   * Sets state immediately, GPS initializes in background
   * @param activityType - Type of activity (running, walking, cycling)
   * @param presetDistance - Optional race preset distance in meters (for auto-stop)
   */
  async startTracking(
    activityType: 'running' | 'walking' | 'cycling' | 'hiking',
    presetDistance?: number
  ): Promise<boolean> {
    // CRITICAL FIX: Guard against double-calls that would reset distance
    if (this.isTracking) {
      console.warn(
        '[SimpleRunTracker] ⚠️ Already tracking, ignoring startTracking call to prevent distance reset'
      );
      return true; // Return true since we're already tracking
    }

    // INSTANT: Set state immediately (no await blocking)
    this.sessionId = `run_${Date.now()}`;
    this.activityType = activityType;
    this.startTime = Date.now();
    this.isTracking = true;
    this.isPaused = false;
    this.pauseCount = 0;
    this.presetDistance = presetDistance || null;

    // MEMORY-ONLY ARCHITECTURE: Reset GPS state for new session
    this.cachedGpsPoints = []; // Clear cache immediately
    this.lastGpsPoint = null; // Reset last point
    this.runningDistance = 0; // Reset incremental distance
    this.runningElevationGain = 0; // Reset incremental elevation gain
    this.lastAltitude = null; // Reset last altitude

    // Reset debug state for new session
    this.resetDebugState();

    // Reset GPS health monitor for new session
    gpsHealthMonitor.reset();
    this.lastGPSHealthStatus = null;

    // CRITICAL: Prevent Android from suspending the app (Doze Mode)
    // Reference implementation uses this exact pattern - required for background GPS
    try {
      await activateKeepAwakeAsync('gps-tracking');
      console.log('[SimpleRunTracker] 🔋 Keep-awake activated - Android Doze Mode prevented');
    } catch (error) {
      console.warn('[SimpleRunTracker] Keep-awake activation failed:', error);
      // Continue anyway - tracking may still work
    }

    // INSTANT: Start timer immediately (user sees 1, 2, 3... right away!)
    this.durationTracker.start(this.startTime);
    console.log(
      '[SimpleRunTracker] ⏱️ INSTANT START - Stopwatch counting 1, 2, 3, 4, 5...'
    );

    // Start split tracking for running activities
    if (activityType === 'running') {
      // Get unit preference for split intervals (1km vs 1 mile)
      let unitSystem: UnitSystem = 'metric';
      try {
        const stored = await AsyncStorage.getItem(UNIT_PREFERENCE_KEY);
        if (stored === 'imperial' || stored === 'metric') {
          unitSystem = stored;
        }
      } catch (e) {
        // Default to metric
      }
      this.splitTracker.start(this.startTime, unitSystem);
      const intervalLabel = unitSystem === 'imperial' ? 'mile' : 'km';
      console.log(`[SimpleRunTracker] 🏃 Split tracking enabled for running (${intervalLabel} splits)`);
    }

    if (presetDistance) {
      console.log(
        `[SimpleRunTracker] 🎯 Preset distance: ${(
          presetDistance / 1000
        ).toFixed(2)} km`
      );
    }

    // Background tasks (don't block UI)
    this.initializeGPS(activityType).catch((error) => {
      console.error('[SimpleRunTracker] GPS initialization failed:', error);
      // Timer still runs even if GPS fails!
    });

    // Start watchdog to detect and recover from GPS failures
    this.startWatchdog();

    // MEMORY-ONLY ARCHITECTURE: Start periodic metrics save for crash recovery
    this.startMetricsSave();

    // Start silent audio recording for extra Android background insurance
    this.startSilentAudio();

    // Start WorkoutRecovery checkpointing (saves every 30 seconds for crash recovery)
    workoutRecovery.startCheckpointing(
      this.sessionId!,
      activityType as 'running' | 'walking' | 'cycling',
      this.startTime,
      () => ({
        distance: this.runningDistance,
        duration: this.durationTracker.getDuration(),
        pausedDuration: this.durationTracker.getTotalPausedTime(),
        gpsPoints: this.cachedGpsPoints,
      })
    );

    return true;
  }

  /**
   * Initialize GPS in background (non-blocking)
   * Like reference implementation - GPS starts async
   */
  private async initializeGPS(
    activityType: 'running' | 'walking' | 'cycling' | 'hiking'
  ): Promise<void> {
    try {
      console.log(`[SimpleRunTracker] Initializing GPS for ${activityType}...`);

      // === DIAGNOSTIC LOGGING FOR ANDROID GPS ISSUES ===
      // Log platform info to help debug device-specific failures
      console.log(`[GPS-DIAG] Platform: ${Platform.OS}`);
      if (Platform.OS === 'android') {
        console.log(`[GPS-DIAG] Android API Level: ${Platform.Version}`);
      }

      // Check and log permission status
      const foregroundPerm = await Location.getForegroundPermissionsAsync();
      const backgroundPerm = await Location.getBackgroundPermissionsAsync();
      console.log(`[GPS-DIAG] Foreground permission: ${foregroundPerm.status}`);
      console.log(`[GPS-DIAG] Background permission: ${backgroundPerm.status}`);

      // Android 12+: Check if precise location was granted
      if (Platform.OS === 'android' && (Platform.Version as number) >= 31) {
        const accuracy = (foregroundPerm as any).accuracy;
        console.log(
          `[GPS-DIAG] Location accuracy: ${accuracy || 'full (default)'}`
        );
        if (accuracy === 'coarse') {
          console.warn(
            '[GPS-DIAG] ⚠️ APPROXIMATE location only - GPS tracking will be inaccurate!'
          );
        }
      }
      // === END DIAGNOSTIC LOGGING ===

      // Android: Request battery optimization exemption FIRST (CRITICAL!)
      // Without this, Android will kill the background location service after ~30 seconds
      // when user switches to another app (like Spotify)
      // Only prompt if not already exempted (prevents re-prompting after user handled it)
      if (Platform.OS === 'android') {
        try {
          const batteryService = BatteryOptimizationService.getInstance();
          const batteryStatus = await batteryService.checkBatteryOptimizationStatus();
          if (!batteryStatus.exempted) {
            await batteryService.requestBatteryOptimizationExemption();
            console.log('[SimpleRunTracker] Battery optimization exemption requested');
          } else {
            console.log('[SimpleRunTracker] Battery optimization already exempted, skipping prompt');
          }
        } catch (e) {
          console.warn('[SimpleRunTracker] Battery optimization request failed:', e);
          // Continue anyway - tracking may work if user already exempted app
        }
      }

      // iOS: Start native HKWorkoutSession FIRST (signals active workout to iOS)
      // This grants unlimited background location tracking privileges
      // Android: No-op (background tracking already works)
      // DISABLED: Native workout session requires RUNSTRWorkoutBridge.m/swift native modules
      // which are not yet implemented. Commenting out to prevent crashes on real devices.
      // Note: This means iOS background tracking may be limited to ~30 minutes.
      // await startNativeWorkoutSession(activityType);
      console.log(
        '[SimpleRunTracker] Native workout session disabled - using standard background tracking'
      );

      // Clean up any existing GPS watchers
      const isAlreadyRunning = await Location.hasStartedLocationUpdatesAsync(
        SIMPLE_TRACKER_TASK
      );
      if (isAlreadyRunning) {
        console.log('[SimpleRunTracker] Cleaning up previous GPS session...');
        await Location.stopLocationUpdatesAsync(SIMPLE_TRACKER_TASK);
      }

      // MEMORY-ONLY ARCHITECTURE: Clear previous session data
      await AsyncStorage.removeItem(LAST_GPS_POINT_KEY);
      await AsyncStorage.removeItem(ACTIVE_METRICS_KEY);
      await AsyncStorage.removeItem(SESSION_STATE_KEY);

      // Save fresh session state
      await this.saveSessionState();

      // Start GPS tracking (background operation)
      // CRITICAL CONFIG: These options prevent Android from batching/killing GPS updates
      await Location.startLocationUpdatesAsync(SIMPLE_TRACKER_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 3000, // 3 seconds (backup time-based polling)
        distanceInterval: 5, // 5 meters
        deferredUpdatesInterval: 0, // Don't batch updates - send immediately
        deferredUpdatesDistance: 0, // Don't batch updates - send immediately
        foregroundService: {
          notificationTitle: 'RUNSTR Active',
          notificationBody: 'Tracking your workout...',
          notificationColor: '#FF6B35',
          // CRITICAL: Android 8.0+ requires notification channel for foreground services
          // Samsung/GrapheneOS kill services without valid channels after ~5 minutes
          notificationChannelId: 'runstr-gps-tracking',
          notificationChannelName: 'GPS Tracking',
          notificationChannelDescription: 'Shows active workout tracking status',
          notificationId: 123456, // Fixed ID prevents duplicate notifications
          killServiceOnDestroy: false, // CRITICAL: Keep service alive when app killed
        } as any,
        pausesUpdatesAutomatically: false,
        activityType: Location.ActivityType.Fitness,
        showsBackgroundLocationIndicator: true,
      });

      console.log('[SimpleRunTracker] ✅ GPS tracking started');
    } catch (error) {
      console.error('[SimpleRunTracker] GPS initialization error:', error);
      // Timer keeps running even if GPS fails!
    }
  }

  /**
   * Pause tracking
   */
  async pauseTracking(): Promise<void> {
    if (!this.isTracking || this.isPaused) {
      console.warn(
        '[SimpleRunTracker] Cannot pause - not tracking or already paused'
      );
      return;
    }

    this.isPaused = true;
    this.pauseCount++;
    this.durationTracker.pause();

    // Update session state
    await this.saveSessionState();

    console.log('[SimpleRunTracker] Paused');
  }

  /**
   * Resume tracking
   */
  async resumeTracking(): Promise<void> {
    if (!this.isTracking || !this.isPaused) {
      console.warn(
        '[SimpleRunTracker] Cannot resume - not tracking or not paused'
      );
      return;
    }

    this.isPaused = false;
    this.durationTracker.resume();

    // Update session state
    await this.saveSessionState();

    console.log('[SimpleRunTracker] Resumed');
  }

  /**
   * Stop tracking and return final session
   * MEMORY-ONLY ARCHITECTURE: Uses incrementally calculated distance, no GPS array persistence
   */
  async stopTracking(): Promise<RunSession | null> {
    if (!this.isTracking) {
      console.warn('[SimpleRunTracker] Not tracking, nothing to stop');
      return null;
    }

    console.log('[SimpleRunTracker] Stopping tracking...');

    // Stop watchdog first
    this.stopWatchdog();

    // Stop WorkoutRecovery checkpointing
    workoutRecovery.stopCheckpointing();

    // Stop periodic metrics save
    this.stopMetricsSave();

    // Stop silent audio recording
    await this.stopSilentAudio();

    // Stop GPS
    try {
      const isRunning = await Location.hasStartedLocationUpdatesAsync(
        SIMPLE_TRACKER_TASK
      );
      if (isRunning) {
        await Location.stopLocationUpdatesAsync(SIMPLE_TRACKER_TASK);
      }
    } catch (error) {
      console.error('[SimpleRunTracker] Error stopping GPS:', error);
    }

    // Allow device to sleep again (release keep-awake)
    try {
      deactivateKeepAwake('gps-tracking');
      console.log('[SimpleRunTracker] 🔋 Keep-awake deactivated - device can sleep');
    } catch (error) {
      console.warn('[SimpleRunTracker] Keep-awake deactivation failed:', error);
    }

    // Stop duration tracker
    this.durationTracker.stop();

    // iOS: Stop native HKWorkoutSession
    // Android: No-op
    await stopNativeWorkoutSession();

    // MEMORY-ONLY ARCHITECTURE: Use incrementally calculated values (already computed)
    const distance = this.runningDistance;
    const elevationGain = Math.round(this.runningElevationGain);

    // Get splits for running activities
    const splits =
      this.activityType === 'running'
        ? this.splitTracker.getSplits()
        : undefined;

    // Create final session (NO gpsPoints array - memory-only architecture)
    const session: RunSession = {
      id: this.sessionId || `run_${Date.now()}`,
      activityType: this.activityType,
      startTime: this.startTime,
      endTime: Date.now(),
      distance,
      duration: this.durationTracker.getDuration(),
      pausedDuration: this.durationTracker.getTotalPausedTime(),
      pauseCount: this.pauseCount,
      // gpsPoints NOT included - memory-only architecture
      presetDistance: this.presetDistance || undefined,
      splits,
      elevationGain,
    };

    console.log(
      `[SimpleRunTracker] ✅ Splits recorded: ${splits?.length || 0} km markers`
    );

    // Reset ALL state to prevent corruption between sessions
    this.isTracking = false;
    this.isPaused = false;
    this.sessionId = null;
    this.presetDistance = null;
    this.autoStopCallback = null;

    // MEMORY-ONLY ARCHITECTURE: Reset GPS state
    this.cachedGpsPoints = [];
    this.lastGpsPoint = null;
    this.runningDistance = 0;
    this.runningElevationGain = 0;
    this.lastAltitude = null;
    this.lastGPSUpdate = Date.now();

    // Reset GPS recovery state
    this.isInGPSRecovery = false;
    this.recoveryPointsSkipped = 0;
    this.gpsFailureCount = 0;
    this.lastGPSError = null;

    // Reset split tracker for next session
    this.splitTracker.reset();

    // Clear session state from AsyncStorage
    await AsyncStorage.removeItem(SESSION_STATE_KEY);
    await AsyncStorage.removeItem(ACTIVE_METRICS_KEY);
    await AsyncStorage.removeItem(LAST_GPS_POINT_KEY);

    // Clear WorkoutRecovery checkpoint (session ended normally)
    await workoutRecovery.clearCheckpoint();

    console.log(
      `[SimpleRunTracker] ✅ Session completed: ${(distance / 1000).toFixed(
        2
      )} km in ${session.duration}s`
    );

    return session;
  }

  /**
   * Get current session data (for live UI updates)
   * MEMORY-ONLY ARCHITECTURE: Uses incrementally calculated distance and elevation
   */
  getCurrentSession(): Partial<RunSession> | null {
    if (!this.isTracking) {
      return null;
    }

    // MEMORY-ONLY: Use pre-calculated running values (instant, no recalculation)
    const elevationGain = Math.round(this.runningElevationGain);

    // Get splits for running activities
    const splits =
      this.activityType === 'running'
        ? this.splitTracker.getSplits()
        : undefined;

    return {
      id: this.sessionId || `run_${Date.now()}`,
      activityType: this.activityType,
      startTime: this.startTime,
      distance: this.runningDistance, // Use incrementally calculated distance
      duration: this.durationTracker.getDuration(),
      pausedDuration: this.durationTracker.getTotalPausedTime(),
      pauseCount: this.pauseCount,
      gpsPoints: this.cachedGpsPoints.slice(-100), // Last 100 points for route display only
      presetDistance: this.presetDistance || undefined,
      splits,
      elevationGain,
    };
  }

  /**
   * Set callback for auto-stop when preset distance is reached
   * @param callback - Function to call when auto-stop is triggered
   */
  setAutoStopCallback(callback: () => void): void {
    this.autoStopCallback = callback;
  }

  /**
   * Check if auto-stop should be triggered (preset distance reached)
   * Can be called from UI update interval for more responsive auto-stopping
   * @returns true if auto-stop was triggered
   */
  checkAutoStop(): boolean {
    if (!this.presetDistance || !this.isTracking) {
      return false;
    }

    // MEMORY-ONLY: Use incrementally calculated distance
    if (this.runningDistance >= this.presetDistance) {
      console.log(
        `[SimpleRunTracker] 🎯 AUTO-STOP: Reached preset distance ${(
          this.presetDistance / 1000
        ).toFixed(2)} km`
      );

      // Trigger callback if set (UI will call stopTracking)
      if (this.autoStopCallback) {
        this.autoStopCallback();
      }

      return true;
    }

    return false;
  }

  /**
   * Append GPS points from background task (REAL-TIME UPDATES!)
   * MEMORY-ONLY ARCHITECTURE: Calculates distance incrementally, no AsyncStorage writes
   *
   * GPS → Background Task → Incremental distance calculation → UI sees fresh data
   * Timer → Pure JS stopwatch → Counts 1, 2, 3, 4, 5...
   */
  appendGpsPointsToCache(points: GPSPoint[]): void {
    if (points.length === 0) {
      // No points received - check for GPS failure
      const now = Date.now();
      const timeSinceLastGPS = now - this.lastGPSUpdate;

      if (timeSinceLastGPS > 10000) {
        this.gpsFailureCount++;
        console.error(
          `🚨 [SimpleRunTracker] GPS FAILURE DETECTED - No updates for ${(
            timeSinceLastGPS / 1000
          ).toFixed(1)}s`
        );

        if (timeSinceLastGPS > 30000 && this.gpsFailureCount > 3) {
          this.lastGPSError = `GPS signal lost for ${Math.floor(
            timeSinceLastGPS / 1000
          )} seconds`;
          CustomAlert.alert(
            'GPS Signal Lost',
            'Distance tracking has stopped. Please ensure you have a clear view of the sky.',
            [{ text: 'OK', style: 'default' }]
          );
        }
      }
      return;
    }

    const now = Date.now();
    const timeSinceLastGPS = now - this.lastGPSUpdate;

    // GPS recovery detection
    if (timeSinceLastGPS > 10000 && !this.isInGPSRecovery) {
      console.log(
        `🔄 [SimpleRunTracker] GPS recovered after ${(
          timeSinceLastGPS / 1000
        ).toFixed(1)}s - entering recovery mode`
      );
      this.isInGPSRecovery = true;
      this.recoveryPointsSkipped = 0;
    }

    // Skip first 2 points after GPS recovery (often inaccurate)
    // Reduced from 3 to 2 to minimize distance loss during walking
    // FIX: Update lastGpsPoint with skipped point's position to preserve continuity.
    // Previously, skipped points did NOT update lastGpsPoint, so after recovery the
    // next accepted point calculated distance from the pre-gap position (potentially
    // minutes ago), causing either phantom distance or lost distance.
    if (this.isInGPSRecovery) {
      if (this.recoveryPointsSkipped < 2) {
        this.recoveryPointsSkipped++;
        console.log(
          `🔄 [SimpleRunTracker] Skipping recovery point ${this.recoveryPointsSkipped}/2`
        );
        // Accept as position baseline WITHOUT adding distance
        // This ensures the next accepted point measures from the correct location
        if (points.length > 0) {
          this.lastGpsPoint = points[points.length - 1];
        }
        this.lastGPSUpdate = now;
        return;
      } else {
        console.log('✅ [SimpleRunTracker] GPS recovery complete');
        this.isInGPSRecovery = false;
        this.gpsFailureCount = 0;
        this.lastGPSError = null;
      }
    }

    // Update GPS health
    this.lastGPSUpdate = now;

    // Assess GPS signal quality using GPSHealthMonitor
    if (points.length > 0 && points[0].accuracy !== undefined) {
      this.lastGPSHealthStatus = gpsHealthMonitor.assessSignalQuality(points[0].accuracy);

      // Log warnings for poor/lost signal
      if (this.lastGPSHealthStatus.message) {
        console.warn(`[GPSHealthMonitor] ${this.lastGPSHealthStatus.message}`);
      }
    }

    // MEMORY-ONLY ARCHITECTURE: Calculate incremental distance for each point
    for (const point of points) {
      if (this.lastGpsPoint) {
        const increment = this.haversineDistance(this.lastGpsPoint, point);

        // Movement threshold (0.5m min - filter jitter)
        // Note: Teleport filtering already done in Stage 1 (SimpleRunTrackerTask)
        // Removed redundant < 100m check that caused 85% data loss on Android 16
        // due to threshold mismatch (Stage 1 accepts ≤100m, Stage 2 rejected ≥100m)
        if (increment >= 0.5) {
          this.runningDistance += increment;
        }
      }
      this.lastGpsPoint = point;
    }

    // MEMORY-ONLY ARCHITECTURE: Calculate incremental elevation gain for each point
    for (const point of points) {
      if (point.altitude !== undefined && point.altitude !== null) {
        if (this.lastAltitude !== null) {
          const delta = point.altitude - this.lastAltitude;
          // Only count gains > 2m to filter GPS altitude noise (matches existing threshold)
          if (delta > 2) {
            this.runningElevationGain += delta;
          }
        }
        this.lastAltitude = point.altitude;
      }
    }

    // Keep only last 100 points for route display (not full history)
    // MEMORY FIX: Optimize array handling to reduce allocations during long workouts
    // For 60+ min workouts with 3-second intervals, this prevents 1,200+ array reallocations
    const MAX_CACHED_POINTS = 100;
    const newLength = this.cachedGpsPoints.length + points.length;

    if (newLength <= MAX_CACHED_POINTS) {
      // Simple case: just push, no trimming needed
      this.cachedGpsPoints.push(...points);
    } else if (points.length >= MAX_CACHED_POINTS) {
      // New points alone exceed limit, just keep newest
      this.cachedGpsPoints = points.slice(-MAX_CACHED_POINTS);
    } else {
      // Need to trim old points before adding new ones
      const keepFromOld = MAX_CACHED_POINTS - points.length;
      this.cachedGpsPoints = [
        ...this.cachedGpsPoints.slice(-keepFromOld),
        ...points,
      ];
    }

    // Update split tracker for running activities
    if (this.activityType === 'running') {
      const currentDuration = this.durationTracker.getDuration();
      const pausedDuration = this.durationTracker.getTotalPausedTime() * 1000;

      const newSplit = this.splitTracker.update(
        this.runningDistance,
        currentDuration,
        pausedDuration
      );

      if (newSplit) {
        const unitLabel = this.splitTracker.getUnitSystem() === 'imperial' ? 'mi' : 'km';
        console.log(
          `[SimpleRunTracker] 🏃 Split ${
            newSplit.number
          }: ${this.splitTracker.formatSplitTime(
            newSplit.splitTime
          )} (${this.splitTracker.formatPace(newSplit.pace)}/${unitLabel})`
        );

        TTSAnnouncementService.announceSplit(newSplit).catch((err) => {
          console.error('[SimpleRunTracker] Failed to announce split:', err);
        });
      }
    }

    // Check for auto-stop (preset distance reached)
    this.checkAutoStop();

    console.log(
      `[SimpleRunTracker] 📍 Distance: ${(this.runningDistance / 1000).toFixed(
        2
      )} km (+${points.length} points)`
    );
  }

  /**
   * Start periodic metrics save for crash recovery
   * Saves distance, duration, splits every 30 seconds (tiny writes, not GPS arrays)
   */
  private startMetricsSave(): void {
    if (this.metricsSaveInterval) {
      clearInterval(this.metricsSaveInterval);
    }

    this.metricsSaveInterval = setInterval(() => {
      if (this.isTracking && !this.isPaused) {
        // CRITICAL FIX: Wrap async call with error handling to prevent unhandled promise rejections
        // Unhandled rejections can terminate iOS apps during long workouts
        this.saveActiveMetrics().catch((error) => {
          console.error('[SimpleRunTracker] Metrics save failed (non-fatal):', error);
        });
      }
    }, this.METRICS_SAVE_INTERVAL_MS);

    console.log('[SimpleRunTracker] Started periodic metrics save (every 30s)');
  }

  /**
   * Stop periodic metrics save
   */
  private stopMetricsSave(): void {
    if (this.metricsSaveInterval) {
      clearInterval(this.metricsSaveInterval);
      this.metricsSaveInterval = null;
    }
    console.log('[SimpleRunTracker] Stopped periodic metrics save');
  }

  /**
   * Save current metrics to AsyncStorage for crash recovery
   * Only saves aggregate metrics (tiny payload), NOT GPS coordinates
   */
  private async saveActiveMetrics(): Promise<void> {
    try {
      const metrics = {
        distance: this.runningDistance,
        elevationGain: this.runningElevationGain,
        duration: this.durationTracker.getDuration(),
        splits: this.activityType === 'running' ? this.splitTracker.getSplits() : [],
        pauseCount: this.pauseCount,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(ACTIVE_METRICS_KEY, JSON.stringify(metrics));
      console.log(
        `[SimpleRunTracker] 💾 Metrics saved: ${(this.runningDistance / 1000).toFixed(2)} km`
      );
    } catch (error) {
      console.error('[SimpleRunTracker] Error saving metrics:', error);
    }
  }

  /**
   * Calculate total distance from GPS points using Haversine formula
   */
  private calculateTotalDistance(points: GPSPoint[]): number {
    if (points.length < 2) {
      return 0;
    }

    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistance += this.haversineDistance(points[i - 1], points[i]);
    }

    return totalDistance;
  }

  /**
   * Haversine formula for distance between two GPS points
   */
  private haversineDistance(p1: GPSPoint, p2: GPSPoint): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (p1.latitude * Math.PI) / 180;
    const φ2 = (p2.latitude * Math.PI) / 180;
    const Δφ = ((p2.latitude - p1.latitude) * Math.PI) / 180;
    const Δλ = ((p2.longitude - p1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Calculate total elevation gain from GPS points
   * Only counts positive changes > 2m to filter altimeter noise
   */
  private calculateElevationGain(points: GPSPoint[]): number {
    if (points.length < 2) return 0;

    let totalGain = 0;
    let lastAltitude: number | null = null;

    for (const point of points) {
      if (point.altitude === undefined || point.altitude === null) continue;

      if (lastAltitude !== null) {
        const delta = point.altitude - lastAltitude;
        // Only count gains > 2m to filter GPS altitude noise
        if (delta > 2) {
          totalGain += delta;
        }
      }
      lastAltitude = point.altitude;
    }

    return Math.round(totalGain);
  }

  /**
   * Save session state to AsyncStorage (includes complete tracker state)
   * Duration is calculated on-demand, no need to persist it
   */
  private async saveSessionState() {
    try {
      const trackerState = this.durationTracker.exportState();
      const state: SessionState = {
        sessionId: this.sessionId || '',
        activityType: this.activityType,
        isTracking: this.isTracking,
        isPaused: this.isPaused,
        startTime: this.startTime,
        pauseCount: this.pauseCount,
        presetDistance: this.presetDistance || undefined,
        // Include tracker state for session recovery
        trackerStartTime: trackerState.startTime,
        trackerTotalPausedTime: trackerState.totalPausedTime,
        trackerPauseStartTime: trackerState.pauseStartTime,
        // Reset GPS warm-up counter for new sessions
        // This is read by SimpleRunTrackerTask to skip first 3 GPS points
        gpsPointCount: 0,
      };
      await AsyncStorage.setItem(SESSION_STATE_KEY, JSON.stringify(state));
      console.log('[SimpleRunTracker] Session state saved');
    } catch (error) {
      console.error('[SimpleRunTracker] Error saving session state:', error);
    }
  }

  /**
   * Get tracking state
   */
  getTrackingState(): 'idle' | 'tracking' | 'paused' {
    if (!this.isTracking) return 'idle';
    return this.isPaused ? 'paused' : 'tracking';
  }

  /**
   * Check if tracking
   */
  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  /**
   * Check if paused
   */
  isCurrentlyPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Get GPS health status for UI display
   * Includes data from GPSHealthMonitor for comprehensive signal quality assessment
   */
  getGPSStatus(): {
    isHealthy: boolean;
    lastUpdateSeconds: number;
    errorMessage: string | null;
    isInRecovery: boolean;
    signalQuality: 'excellent' | 'good' | 'poor' | 'lost' | 'unknown';
    accuracy: number | null;
  } {
    const now = Date.now();
    const timeSinceLastGPS = (now - this.lastGPSUpdate) / 1000;

    // Use GPSHealthMonitor data if available
    const signalQuality = this.lastGPSHealthStatus?.quality ?? 'unknown';
    const accuracy = this.lastGPSHealthStatus?.accuracy ?? null;
    const healthMonitorMessage = this.lastGPSHealthStatus?.message ?? null;

    return {
      isHealthy: timeSinceLastGPS < 10 && !this.isInGPSRecovery && signalQuality !== 'lost',
      lastUpdateSeconds: Math.floor(timeSinceLastGPS),
      errorMessage: this.lastGPSError || healthMonitorMessage,
      isInRecovery: this.isInGPSRecovery,
      signalQuality,
      accuracy,
    };
  }

  /**
   * Start GPS watchdog - detects and recovers from silent GPS failures
   * Runs in foreground, reads timestamp written by background task
   */
  private startWatchdog(): void {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
    }
    this.gpsRestartAttempts = 0;

    this.watchdogInterval = setInterval(async () => {
      // CRITICAL FIX: Wrap entire watchdog logic in try-catch to prevent crashes
      // Also re-check isTracking after async operations to handle race conditions
      try {
        // Track watchdog activity for debug UI
        this.debugState.watchdogLastCheck = Date.now();

        if (!this.isTracking || this.isPaused) return;

        // Read last GPS time from AsyncStorage (shared with background task)
        try {
          const lastTimeStr = await AsyncStorage.getItem('@runstr:last_gps_time');
          // Re-check tracking state after async operation (may have stopped during await)
          if (!this.isTracking) return;

          if (lastTimeStr) {
            this.lastGPSUpdate = parseInt(lastTimeStr, 10);
          }
        } catch (e) {
          console.warn('[WATCHDOG] Failed to read last GPS time:', e);
          return; // Exit gracefully on storage error
        }

        // Re-check tracking state before attempting recovery
        if (!this.isTracking || this.isPaused) return;

        const gap = Date.now() - this.lastGPSUpdate;

        if (gap > this.GPS_TIMEOUT_MS) {
          console.warn(
            `[WATCHDOG] GPS silent for ${(gap / 1000).toFixed(0)}s - attempting recovery`
          );
          await this.attemptGPSRecovery();
        }
      } catch (error) {
        // CRITICAL: Catch any errors to prevent watchdog from crashing the app
        console.error('[WATCHDOG] Unexpected error (non-fatal):', error);
      }
    }, this.WATCHDOG_CHECK_MS);

    console.log('[WATCHDOG] Started - monitoring GPS health every 5s');
  }

  /**
   * Stop GPS watchdog
   */
  private stopWatchdog(): void {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
    }
    console.log('[WATCHDOG] Stopped');
  }

  /**
   * Restart GPS location task WITHOUT clearing AsyncStorage state.
   * Used by watchdog recovery, session restore, and crash auto-recovery.
   * Unlike initializeGPS(), this preserves:
   * - LAST_GPS_POINT_KEY (Stage 1 filter reference for the background task)
   * - SESSION_STATE_KEY (so background task knows session is still active)
   * - ACTIVE_METRICS_KEY (crash recovery metrics)
   */
  private async restartGPSOnly(_activityType: string): Promise<void> {
    // Clean up any existing GPS watchers
    const isAlreadyRunning = await Location.hasStartedLocationUpdatesAsync(
      SIMPLE_TRACKER_TASK
    );
    if (isAlreadyRunning) {
      console.log('[SimpleRunTracker] Cleaning up previous GPS session...');
      await Location.stopLocationUpdatesAsync(SIMPLE_TRACKER_TASK);
    }

    // Brief pause before restarting (allow OS to release resources)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Restart GPS tracking with same config as initializeGPS
    await Location.startLocationUpdatesAsync(SIMPLE_TRACKER_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 3000,
      distanceInterval: 5,
      deferredUpdatesInterval: 0,
      deferredUpdatesDistance: 0,
      foregroundService: {
        notificationTitle: 'RUNSTR Active',
        notificationBody: 'Tracking your workout...',
        notificationColor: '#FF6B35',
        notificationChannelId: 'runstr-gps-tracking',
        notificationChannelName: 'GPS Tracking',
        notificationChannelDescription: 'Shows active workout tracking status',
        notificationId: 123456,
        killServiceOnDestroy: false,
      } as any,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Fitness,
      showsBackgroundLocationIndicator: true,
    });

    console.log('[SimpleRunTracker] ✅ GPS restarted (state preserved)');
  }

  /**
   * Attempt to recover GPS by restarting the location task
   */
  private async attemptGPSRecovery(): Promise<void> {
    if (this.gpsRestartAttempts >= this.MAX_GPS_RESTARTS) {
      console.error(
        `[WATCHDOG] Max restart attempts (${this.MAX_GPS_RESTARTS}) reached - GPS may be unavailable`
      );
      this.lastGPSError =
        'GPS repeatedly failed to restart. Please check your location settings.';
      return;
    }

    this.gpsRestartAttempts++;
    console.log(
      `[WATCHDOG] GPS recovery attempt ${this.gpsRestartAttempts}/${this.MAX_GPS_RESTARTS}`
    );

    try {
      // Restart GPS WITHOUT clearing AsyncStorage keys
      // initializeGPS() was designed for fresh starts and clears LAST_GPS_POINT_KEY,
      // SESSION_STATE_KEY, and ACTIVE_METRICS_KEY. During mid-workout recovery this
      // causes distance loss (Stage 1 filter loses reference) and a race condition
      // (background task sees no session and drops GPS points).
      await this.restartGPSOnly(this.activityType);

      // Update last GPS time to prevent immediate re-trigger
      this.lastGPSUpdate = Date.now();
      await AsyncStorage.setItem(
        '@runstr:last_gps_time',
        this.lastGPSUpdate.toString()
      );

      // Track recovery success for debug UI
      this.debugState.recoverySuccesses++;
      this.debugState.lastRecoveryError = null;
      console.log('[WATCHDOG] GPS recovery successful');
    } catch (error) {
      // Track recovery failure for debug UI
      this.debugState.recoveryFailures++;
      this.debugState.lastRecoveryError = String(error);
      console.error('[WATCHDOG] GPS recovery failed:', error);
    }
  }

  /**
   * Reset GPS restart counter - called when GPS successfully receives a point
   * This allows unlimited recovery from intermittent failures (e.g., Samsung battery management)
   * while still eventually giving up if GPS is truly broken (permissions revoked, hardware failure)
   */
  public resetGPSRestartCounter(): void {
    if (this.gpsRestartAttempts > 0) {
      console.log(
        `[WATCHDOG] GPS working - resetting restart counter (was ${this.gpsRestartAttempts})`
      );
      this.gpsRestartAttempts = 0;
    }
  }

  /**
   * Start silent audio recording to keep app process alive in background
   * This is an insurance policy for Android - some devices aggressively kill apps
   * even with foreground services
   */
  private async startSilentAudio(): Promise<void> {
    // Only needed on Android
    if (Platform.OS !== 'android') return;

    try {
      // Configure audio session for background playback
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: false,
      });

      // Recording trick: keeps audio session alive without needing a file
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.LOW_QUALITY
      );
      await recording.startAsync();
      this.silentRecording = recording;
      console.log(
        '[SimpleRunTracker] Silent audio recording started (background keep-alive)'
      );
    } catch (e) {
      // Non-fatal - GPS should still work without this
      console.warn('[SimpleRunTracker] Silent audio failed (non-fatal):', e);
    }
  }

  /**
   * Stop silent audio recording
   * FIX 5: Clear reference FIRST to prevent orphaned recordings
   */
  private async stopSilentAudio(): Promise<void> {
    // FIX 5: Capture reference and clear immediately
    // This prevents conflicts if startSilentAudio is called while we're stopping
    const recording = this.silentRecording;
    this.silentRecording = null;

    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      console.log('[SimpleRunTracker] Silent audio recording stopped');
    } catch (e) {
      // Non-fatal - reference already cleared, no orphan
      console.warn('[SimpleRunTracker] Stop silent audio failed:', e);
    }
  }

  /**
   * Check for active session and restore if found
   * MEMORY-ONLY ARCHITECTURE: Restores metrics only, GPS tracking restarts fresh
   */
  async restoreSession(): Promise<boolean> {
    // CRITICAL FIX: Don't overwrite an active session with stale stored data
    // This prevents the bug where navigating away and back resets distance
    if (this.isTracking && this.runningDistance > 0) {
      console.log(
        `[SimpleRunTracker] ✅ Active session with ${(this.runningDistance / 1000).toFixed(2)} km - skipping restore to prevent data loss`
      );
      return true; // Already have a valid active session
    }

    try {
      const sessionStateStr = await AsyncStorage.getItem(SESSION_STATE_KEY);
      if (!sessionStateStr) {
        console.log('[SimpleRunTracker] No active session to restore');
        return false;
      }

      const sessionState: SessionState = JSON.parse(sessionStateStr);

      // Restore session data
      this.sessionId = sessionState.sessionId;
      this.activityType = sessionState.activityType as
        | 'running'
        | 'walking'
        | 'cycling';
      this.isTracking = sessionState.isTracking;
      this.isPaused = sessionState.isPaused;
      this.startTime = sessionState.startTime;
      this.pauseCount = sessionState.pauseCount;
      this.presetDistance = sessionState.presetDistance || null;

      // Restore duration tracker state
      this.durationTracker.restoreState({
        startTime: sessionState.trackerStartTime,
        totalPausedTime: sessionState.trackerTotalPausedTime,
        pauseStartTime: sessionState.trackerPauseStartTime,
      });

      // MEMORY-ONLY ARCHITECTURE: Restore metrics (distance, elevation, splits) from periodic save
      try {
        const metricsStr = await AsyncStorage.getItem(ACTIVE_METRICS_KEY);
        if (metricsStr) {
          const metrics = JSON.parse(metricsStr);
          this.runningDistance = metrics.distance || 0;
          this.runningElevationGain = metrics.elevationGain || 0;
          this.pauseCount = metrics.pauseCount || this.pauseCount;

          // Restore splits if available
          if (metrics.splits && this.activityType === 'running') {
            this.splitTracker.restoreSplits(metrics.splits);
          }

          console.log(
            `[SimpleRunTracker] 📊 Restored metrics: ${(
              this.runningDistance / 1000
            ).toFixed(2)} km, ${Math.round(this.runningElevationGain)}m elevation`
          );
        }
      } catch (metricsError) {
        console.warn('[SimpleRunTracker] Could not restore metrics:', metricsError);
      }

      // Reset GPS state fresh (no coordinates to restore - memory-only)
      // Note: lastAltitude reset to null means first new GPS point won't add elevation delta
      // This is correct behavior - we don't know altitude change during crash recovery gap
      this.cachedGpsPoints = [];
      this.lastGpsPoint = null;
      this.lastAltitude = null;

      // Restart GPS tracking if session was active
      if (this.isTracking && !this.isPaused) {
        console.log(
          '[SimpleRunTracker] 🔄 Restarting GPS tracking for restored session...'
        );

        // Check if task is already running
        const isTaskRunning = await TaskManager.isTaskRegisteredAsync(
          SIMPLE_TRACKER_TASK
        );

        if (!isTaskRunning) {
          // Use restartGPSOnly to preserve AsyncStorage state (session, metrics, last GPS point)
          // initializeGPS() would clear these keys, causing distance loss and race conditions
          await this.restartGPSOnly(this.activityType);
          console.log(
            '[SimpleRunTracker] ✅ GPS tracking restarted successfully'
          );
        } else {
          console.log('[SimpleRunTracker] ℹ️ GPS task already running');
        }

        // Update last GPS update time to prevent immediate failure detection
        this.lastGPSUpdate = Date.now();

        // Start watchdog for restored session
        this.startWatchdog();

        // Start periodic metrics save
        this.startMetricsSave();

        // Start silent audio for restored session too
        this.startSilentAudio();
      }

      console.log(
        `[SimpleRunTracker] ✅ Session restored: ${sessionState.sessionId}`
      );
      if (this.presetDistance) {
        console.log(
          `[SimpleRunTracker] 🎯 Restored preset distance: ${(
            this.presetDistance / 1000
          ).toFixed(2)} km`
        );
      }
      return true;
    } catch (error) {
      console.error('[SimpleRunTracker] Error restoring session:', error);
      return false;
    }
  }

  // ============================================================
  // AUTO-RECOVERY - Silent workout resume after app interruption
  // ============================================================

  /**
   * Check for and automatically recover interrupted workouts
   * Called on tracker screen mount - silently resumes if valid checkpoint found
   *
   * Recovery criteria (all must be true):
   * - Checkpoint exists
   * - Checkpoint < 5 minutes old
   * - Checkpoint distance > 10 meters (real workout, not accidental start)
   * - Checkpoint duration > 60 seconds
   *
   * @returns Object with recovered flag and optional checkpoint data for UI sync
   */
  async checkAndAutoRecover(): Promise<{
    recovered: boolean;
    checkpoint?: {
      distance: number;
      duration: number;
      pausedDuration: number;
      activityType: 'running' | 'walking' | 'cycling' | 'hiking';
    };
  }> {
    // Don't recover if already tracking
    if (this.isTracking) {
      console.log('[SimpleRunTracker] Already tracking, skipping auto-recovery');
      return { recovered: false };
    }

    try {
      const checkpoint = await workoutRecovery.checkForRecoverableWorkout();

      if (!checkpoint) {
        console.log('[SimpleRunTracker] No checkpoint found for auto-recovery');
        return { recovered: false };
      }

      // Check if checkpoint is recent enough (< 15 minutes old)
      // Extended from 5 min to 15 min to align with WorkoutRecovery's 1-hour window
      // and give users more time to recover crashed workouts
      const AUTO_RECOVERY_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes
      const age = Date.now() - checkpoint.timestamp;

      if (age > AUTO_RECOVERY_MAX_AGE_MS) {
        console.log(
          `[SimpleRunTracker] Checkpoint too old for auto-recovery (${Math.round(
            age / 1000
          )}s > 300s), discarding`
        );
        await workoutRecovery.clearCheckpoint();
        return { recovered: false };
      }

      // Additional validation: must have meaningful workout data
      if (checkpoint.distance < 10 || checkpoint.duration < 60) {
        console.log(
          `[SimpleRunTracker] Checkpoint too short for auto-recovery (${checkpoint.distance}m, ${checkpoint.duration}s)`
        );
        await workoutRecovery.clearCheckpoint();
        return { recovered: false };
      }

      // Auto-restore the session
      console.log(
        `[SimpleRunTracker] 🔄 AUTO-RECOVERING interrupted workout: ${(
          checkpoint.distance / 1000
        ).toFixed(2)} km, ${checkpoint.duration}s`
      );

      // Restore state from checkpoint
      this.sessionId = checkpoint.sessionId;
      this.activityType = checkpoint.activityType;
      this.startTime = checkpoint.startTime;
      this.runningDistance = checkpoint.distance;
      this.cachedGpsPoints = checkpoint.gpsPoints || [];
      this.isTracking = true;
      this.isPaused = false;

      // Set last GPS point from cached points for incremental distance
      if (this.cachedGpsPoints.length > 0) {
        this.lastGpsPoint = this.cachedGpsPoints[this.cachedGpsPoints.length - 1];
      }

      // Restore duration tracker state
      // Calculate total paused time including time since checkpoint was saved
      const pausedDurationMs = checkpoint.pausedDuration * 1000;
      const timeSinceCheckpoint = Date.now() - checkpoint.timestamp;
      this.durationTracker.restoreState({
        startTime: checkpoint.startTime,
        totalPausedTime: pausedDurationMs + timeSinceCheckpoint,
        pauseStartTime: 0, // Not paused
      });

      // Reset GPS state for fresh tracking
      this.lastGPSUpdate = Date.now();
      this.isInGPSRecovery = false;
      this.recoveryPointsSkipped = 0;
      this.gpsFailureCount = 0;
      this.lastGPSError = null;

      // Reset debug state
      this.resetDebugState();

      // Reset GPS health monitor
      gpsHealthMonitor.reset();
      this.lastGPSHealthStatus = null;

      // Restore split tracking for running activities
      if (this.activityType === 'running') {
        // Get unit preference for split intervals
        let unitSystem: UnitSystem = 'metric';
        try {
          const stored = await AsyncStorage.getItem(UNIT_PREFERENCE_KEY);
          if (stored === 'imperial' || stored === 'metric') {
            unitSystem = stored;
          }
        } catch (e) {
          // Default to metric
        }
        this.splitTracker.start(checkpoint.startTime, unitSystem);
        // Update split tracker to current distance
        this.splitTracker.update(
          checkpoint.distance,
          checkpoint.duration,
          checkpoint.pausedDuration * 1000
        );
      }

      // Start GPS tracking (use restartGPSOnly to preserve AsyncStorage state)
      await this.restartGPSOnly(this.activityType);

      // Start watchdog
      this.startWatchdog();

      // Start periodic metrics save
      this.startMetricsSave();

      // Start silent audio
      this.startSilentAudio();

      // Start WorkoutRecovery checkpointing (continues saving)
      workoutRecovery.startCheckpointing(
        this.sessionId!,
        this.activityType,
        this.startTime,
        () => ({
          distance: this.runningDistance,
          duration: this.durationTracker.getDuration(),
          pausedDuration: this.durationTracker.getTotalPausedTime(),
          gpsPoints: this.cachedGpsPoints,
        })
      );

      // Clear the old checkpoint (we've restored it)
      await workoutRecovery.clearCheckpoint();

      console.log(
        `[SimpleRunTracker] ✅ AUTO-RECOVERY COMPLETE: Workout resumed`
      );

      return {
        recovered: true,
        checkpoint: {
          distance: checkpoint.distance,
          duration: checkpoint.duration,
          pausedDuration: checkpoint.pausedDuration,
          activityType: checkpoint.activityType,
        },
      };
    } catch (error) {
      console.error('[SimpleRunTracker] Error during auto-recovery:', error);
      // Clear potentially corrupted checkpoint
      try {
        await workoutRecovery.clearCheckpoint();
      } catch (e) {
        // Ignore cleanup errors
      }
      return { recovered: false };
    }
  }

  // ============================================================
  // DEBUG METHODS - For diagnostic UI (GPS death diagnosis)
  // ============================================================

  /**
   * Get comprehensive debug state for diagnostic overlay
   * Async because it checks Location subscription status
   */
  async getDebugState(): Promise<{
    isTracking: boolean;
    isPaused: boolean;
    watchdogActive: boolean;
    watchdogLastCheck: number;
    msSinceWatchdogCheck: number;
    subscriptionReportsActive: boolean;
    taskManagerHeartbeat: number;
    msSinceTaskHeartbeat: number;
    gpsRestartAttempts: number;
    recoverySuccesses: number;
    recoveryFailures: number;
    lastRecoveryError: string | null;
    runningDistance: number;
    totalPointsReceived: number;
    lastPointAccuracy: number;
    cachedPointsCount: number;
    lastGPSError: string | null;
  }> {
    // Check location subscription status
    let subscriptionActive = false;
    try {
      subscriptionActive = await Location.hasStartedLocationUpdatesAsync(
        SIMPLE_TRACKER_TASK
      );
    } catch (e) {
      // Ignore - subscription check failed
    }

    // Read TaskManager heartbeat from AsyncStorage
    let taskHeartbeat = 0;
    try {
      const ts = await AsyncStorage.getItem('@runstr:last_gps_time');
      taskHeartbeat = ts ? parseInt(ts, 10) : 0;
    } catch (e) {
      // Ignore - heartbeat read failed
    }

    return {
      // Core Status
      isTracking: this.isTracking,
      isPaused: this.isPaused,

      // Watchdog Health
      watchdogActive: this.watchdogInterval !== null,
      watchdogLastCheck: this.debugState.watchdogLastCheck,
      msSinceWatchdogCheck: Date.now() - this.debugState.watchdogLastCheck,

      // GPS Subscription
      subscriptionReportsActive: subscriptionActive,
      taskManagerHeartbeat: taskHeartbeat,
      msSinceTaskHeartbeat: taskHeartbeat > 0 ? Date.now() - taskHeartbeat : 0,

      // Recovery Stats
      gpsRestartAttempts: this.gpsRestartAttempts,
      recoverySuccesses: this.debugState.recoverySuccesses,
      recoveryFailures: this.debugState.recoveryFailures,
      lastRecoveryError: this.debugState.lastRecoveryError,

      // Distance Tracking
      runningDistance: this.runningDistance,
      totalPointsReceived: this.debugState.totalPointsReceived,
      lastPointAccuracy: this.debugState.lastPointAccuracy,
      cachedPointsCount: this.cachedGpsPoints.length,

      // Error State
      lastGPSError: this.lastGPSError,
    };
  }

  /**
   * Increment points received counter (called from background task)
   */
  incrementPointsReceived(count: number, accuracy?: number): void {
    this.debugState.totalPointsReceived += count;
    if (accuracy !== undefined) {
      this.debugState.lastPointAccuracy = accuracy;
    }
  }

  /**
   * Reset debug state for new session
   */
  private resetDebugState(): void {
    this.debugState = {
      watchdogLastCheck: 0,
      recoverySuccesses: 0,
      recoveryFailures: 0,
      lastRecoveryError: null,
      totalPointsReceived: 0,
      lastPointAccuracy: 0,
    };
  }
}

// Export singleton instance
export const simpleRunTracker = SimpleRunTracker.getInstance();
