/**
 * NativeStepCounterService - Native Android step counting
 *
 * Uses expo-android-pedometer for background step tracking on ALL Android devices.
 *
 * This service:
 * - Starts a foreground service with persistent notification
 * - Counts steps via Android's TYPE_STEP_COUNTER sensor
 * - Works even when app is backgrounded or closed
 * - Works on privacy ROMs (GrapheneOS/CalyxOS) - the native sensor is independent
 *   of Google Play Services and doesn't require special permissions
 *
 * Note: Previously this service was disabled for privacy ROMs, but testing on
 * GrapheneOS proved the native sensor works (notification shows correct step count).
 * The assumption that privacy ROMs can't use native sensors was incorrect.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key for tracking preference
const BACKGROUND_STEP_TRACKING_KEY = '@runstr:background_step_tracking_enabled';

// Lazy import to avoid loading on iOS
let AndroidPedometer: any = null;

export interface NativeStepData {
  steps: number;
  isTracking: boolean;
  startedAt: Date | null;
}

class NativeStepCounterService {
  private static instance: NativeStepCounterService;
  private isInitialized: boolean = false;
  private isTracking: boolean = false;
  private stepCountAtStart: number = 0;
  private trackingStartTime: Date | null = null;

  private constructor() {
    console.log('[NativeStepCounter] Service created');
  }

  static getInstance(): NativeStepCounterService {
    if (!NativeStepCounterService.instance) {
      NativeStepCounterService.instance = new NativeStepCounterService();
    }
    return NativeStepCounterService.instance;
  }

  /**
   * Check if native step counting should be used
   * Returns true for ALL Android devices (including privacy ROMs like GrapheneOS)
   *
   * Note: Previously this returned false for privacy ROMs, assuming they couldn't
   * use native sensors. Testing proved this was incorrect - the native step sensor
   * works on GrapheneOS (notification shows correct step count). The native sensor
   * uses Android's TYPE_STEP_COUNTER which doesn't require Google Play Services.
   */
  async shouldUseNativeSteps(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.log('[NativeStepCounter] Not Android - skipping');
      return false;
    }

    // Try native sensor on ALL Android devices, including privacy ROMs
    // The native step sensor (TYPE_STEP_COUNTER) works independently of Google Play Services
    // and has been proven to work on GrapheneOS (notification shows correct step count)
    console.log('[NativeStepCounter] Android detected - native step counting available');
    return true;
  }

  /**
   * Check if background step tracking is enabled by user preference
   */
  async isBackgroundTrackingEnabled(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(BACKGROUND_STEP_TRACKING_KEY);
      // Default to false - user must opt in
      return value === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Set background step tracking preference
   */
  async setBackgroundTrackingEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(BACKGROUND_STEP_TRACKING_KEY, enabled ? 'true' : 'false');
      console.log(`[NativeStepCounter] Background tracking preference set to: ${enabled}`);

      if (enabled) {
        await this.startTracking();
      } else {
        await this.stopTracking();
      }
    } catch (error) {
      console.error('[NativeStepCounter] Failed to save preference:', error);
    }
  }

  /**
   * Initialize the native pedometer (lazy load)
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    if (Platform.OS !== 'android') return false;

    try {
      // Dynamic import to avoid loading on iOS
      AndroidPedometer = require('expo-android-pedometer');
      this.isInitialized = true;
      console.log('[NativeStepCounter] expo-android-pedometer loaded successfully');
      return true;
    } catch (error) {
      console.error('[NativeStepCounter] Failed to load expo-android-pedometer:', error);
      return false;
    }
  }

  /**
   * Request ACTIVITY_RECOGNITION permission (required on Android 10+)
   * GrapheneOS may not auto-grant this permission, causing PermissionDenied errors.
   * Returns true if granted, false if denied.
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    const initialized = await this.initialize();
    if (!initialized || !AndroidPedometer) return false;

    try {
      const result = await AndroidPedometer.requestActivityPermissions();
      const granted = result?.status === 'granted';
      console.log(`[NativeStepCounter] ACTIVITY_RECOGNITION permission: ${granted ? 'granted' : 'denied'}`);
      return granted;
    } catch (error) {
      console.warn('[NativeStepCounter] Failed to request permissions:', error);
      return false;
    }
  }

  /**
   * Start background step counting
   * Shows persistent notification on Android
   */
  async startTracking(): Promise<boolean> {
    if (this.isTracking) {
      console.log('[NativeStepCounter] Already tracking');
      return true;
    }

    if (!(await this.shouldUseNativeSteps())) {
      console.log('[NativeStepCounter] Skipping - not Android');
      return false;
    }

    const initialized = await this.initialize();
    if (!initialized || !AndroidPedometer) {
      console.log('[NativeStepCounter] Failed to initialize');
      return false;
    }

    try {
      // Request ACTIVITY_RECOGNITION permission before accessing sensor
      const permGranted = await this.requestPermissions();
      if (!permGranted) {
        console.log('[NativeStepCounter] ACTIVITY_RECOGNITION permission denied - cannot track steps');
        return false;
      }

      // Get current step count as baseline
      const currentSteps = await AndroidPedometer.getStepsCountAsync();
      this.stepCountAtStart = typeof currentSteps === 'number' ? currentSteps : 0;
      this.trackingStartTime = new Date();

      // Start the foreground service with notification config
      await AndroidPedometer.setupBackgroundUpdates({
        title: 'RUNSTR Step Tracking',
        contentTemplate: 'You\'ve taken %d steps today',
        iconResourceName: 'notification_icon',
      });
      this.isTracking = true;

      console.log(`[NativeStepCounter] Started tracking (baseline: ${this.stepCountAtStart} steps)`);
      return true;
    } catch (error) {
      console.error('[NativeStepCounter] Failed to start:', error);
      return false;
    }
  }

  /**
   * Stop background step counting
   * Returns the number of steps counted during this session
   */
  async stopTracking(): Promise<number> {
    if (!this.isTracking) {
      console.log('[NativeStepCounter] Not currently tracking');
      return 0;
    }

    if (!AndroidPedometer) {
      console.log('[NativeStepCounter] Pedometer not initialized');
      return 0;
    }

    const finalSteps = await this.getStepsSinceStart();
    this.isTracking = false;
    this.trackingStartTime = null;

    console.log(`[NativeStepCounter] Stopped tracking (${finalSteps} steps recorded)`);
    return finalSteps;
  }

  /**
   * Get steps counted since tracking started
   * Used during active workouts
   */
  async getStepsSinceStart(): Promise<number> {
    if (!this.isTracking || !AndroidPedometer) {
      return 0;
    }

    try {
      const currentSteps = await AndroidPedometer.getStepsCountAsync();
      const totalCurrentSteps = typeof currentSteps === 'number' ? currentSteps : 0;
      const stepsSinceStart = totalCurrentSteps - this.stepCountAtStart;
      return Math.max(0, stepsSinceStart);
    } catch (error) {
      console.error('[NativeStepCounter] Failed to get steps since start:', error);
      return 0;
    }
  }

  /**
   * Get today's total steps from native sensor
   * Note: This resets on device reboot (Android limitation)
   */
  async getTodaySteps(): Promise<number> {
    if (Platform.OS !== 'android') return 0;

    const initialized = await this.initialize();
    if (!initialized || !AndroidPedometer) return 0;

    try {
      // Request permission before sensor access (GrapheneOS may not auto-grant)
      const permGranted = await this.requestPermissions();
      if (!permGranted) {
        console.log('[NativeStepCounter] ACTIVITY_RECOGNITION denied - returning 0 steps');
        return 0;
      }

      const steps = await AndroidPedometer.getStepsCountAsync();
      const stepCount = typeof steps === 'number' ? steps : 0;
      console.log(`[NativeStepCounter] Today's steps: ${stepCount}`);
      return stepCount;
    } catch (error) {
      console.error('[NativeStepCounter] Failed to get today steps:', error);
      return 0;
    }
  }

  /**
   * Check if currently tracking
   */
  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  /**
   * Check if background step tracking service is currently running
   * Used by DailyStepCounterService to bypass privacy ROM check when service is active
   * If the service is running, it means the native sensor IS working (regardless of ROM detection)
   */
  isServiceRunning(): boolean {
    return this.isTracking;
  }

  /**
   * Get tracking start time (if tracking)
   */
  getTrackingStartTime(): Date | null {
    return this.trackingStartTime;
  }

  /**
   * Get current tracking status
   */
  getStatus(): NativeStepData {
    return {
      steps: 0, // Will be updated by caller
      isTracking: this.isTracking,
      startedAt: this.trackingStartTime,
    };
  }
}

// Export singleton instance
export const nativeStepCounterService = NativeStepCounterService.getInstance();
