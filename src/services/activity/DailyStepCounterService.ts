/**
 * DailyStepCounterService - Cross-platform daily step counting
 * iOS: Queries HealthKit cumulativeSum (matches Apple Health app's daily total —
 *      includes Apple Watch + 3rd-party sources). Falls back to CMPedometer
 *      (expo-sensors) when HealthKit auth is not granted or returns nothing.
 * Android: Uses native step sensor or Health Connect aggregation API
 *          Returns 0 if no step data available (no mixing of data sources)
 */

import { Pedometer } from 'expo-sensors';
import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import healthConnectService from '../fitness/healthConnectService';
import { privacyROMDetectionService } from '../platform/PrivacyROMDetectionService';
import { nativeStepCounterService } from './NativeStepCounterService';

const STORAGE_KEY_BACKGROUND_TRACKING = '@runstr:background_step_tracking_enabled';

// Lazy-loaded HealthKit module (iOS only). Mirrors the pattern used by
// HealthKitBackgroundService so we don't pull HealthKit into the Android bundle.
let HealthKit: { queryStatisticsForQuantity?: any } | null = null;
if (Platform.OS === 'ios') {
  try {
    const hk = require('@yzlin/expo-healthkit');
    HealthKit = {
      queryStatisticsForQuantity:
        hk.default?.queryStatisticsForQuantity ?? hk.queryStatisticsForQuantity,
    };
  } catch (e) {
    console.warn('[DailyStepCounterService] @yzlin/expo-healthkit unavailable:', e);
  }
}

export interface DailyStepData {
  steps: number;
  startTime: Date;
  endTime: Date;
  lastUpdated: Date;
}

export class DailyStepCounterService {
  private static instance: DailyStepCounterService;
  private cachedSteps: DailyStepData | null = null;
  private cacheExpiry: number = 5 * 1000; // 5 seconds for near-real-time updates

  private constructor() {
    console.log(`[DailyStepCounterService] Initialized for ${Platform.OS}`);
    if (Platform.OS === 'android') {
      console.log('[DailyStepCounterService] Android priority: Native sensor → Health Connect → Local tracked steps');
    } else {
      console.log('[DailyStepCounterService] iOS priority: HealthKit cumulativeSum → CMPedometer fallback');
    }
  }

  static getInstance(): DailyStepCounterService {
    if (!DailyStepCounterService.instance) {
      DailyStepCounterService.instance = new DailyStepCounterService();
    }
    return DailyStepCounterService.instance;
  }

  /**
   * Check if step counting is available on the device
   * iOS: Uses CMPedometer (we'll prefer HealthKit at query time but fall back
   *      to CMPedometer, so availability == CMPedometer availability)
   * Android: Always available (Health Connect or local tracked steps fallback)
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        // Android: Always available - Health Connect or local tracked steps
        console.log('[DailyStepCounterService] Android: Step counting available (Health Connect or local fallback)');
        return true;
      } else {
        // iOS: Check Pedometer availability
        const available = await Pedometer.isAvailableAsync();
        console.log(`[DailyStepCounterService] Pedometer available: ${available}`);
        return available;
      }
    } catch (error) {
      console.error('[DailyStepCounterService] Error checking availability:', error);
      return Platform.OS === 'android'; // Android always true, iOS false on error
    }
  }

  /**
   * Request permissions for step data
   * iOS: Triggers Motion & Fitness permission via CMPedometer. HealthKit
   *      permission is requested separately via HealthKitService when the user
   *      connects Apple Health from settings/onboarding.
   * Android: No permissions needed (uses local workout storage)
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        // Android: Request ACTIVITY_RECOGNITION for native step sensor
        console.log('[DailyStepCounterService] Android: Requesting ACTIVITY_RECOGNITION permission...');
        const granted = await nativeStepCounterService.requestPermissions();
        if (!granted) {
          console.log('[DailyStepCounterService] Android: ACTIVITY_RECOGNITION denied, falling back to Health Connect');
        }
        // Return true regardless - Health Connect fallback doesn't need this permission
        return true;
      } else {
        // iOS: Verify CMPedometer access (Motion & Fitness prompt fires here
        // if not yet granted). HealthKit permission is requested elsewhere.
        const available = await Pedometer.isAvailableAsync();
        if (!available) {
          console.warn('[DailyStepCounterService] CMPedometer not available on this device');
          return false;
        }

        const now = new Date();
        const testStart = new Date(now.getTime() - 1000); // 1 second ago
        await Pedometer.getStepCountAsync(testStart, now);

        console.log('[DailyStepCounterService] iOS Motion & Fitness permission granted');
        return true;
      }
    } catch (error) {
      console.error('[DailyStepCounterService] Permission error:', error);
      return false;
    }
  }

  /**
   * Check if step counting permission is currently granted
   * iOS: Always returns 'granted' — actual prompts happen in requestPermissions()
   * Android: Always returns 'granted' (uses local workout storage - no permissions needed)
   */
  async checkPermissionStatus(): Promise<
    'granted' | 'denied' | 'never_ask_again' | 'unknown'
  > {
    return 'granted';
  }

  /**
   * Set background step tracking enabled/disabled
   * Persists the user's preference to AsyncStorage
   */
  async setBackgroundTrackingEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_BACKGROUND_TRACKING, JSON.stringify(enabled));
      console.log(`[DailyStepCounterService] Background tracking ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('[DailyStepCounterService] Error saving background tracking setting:', error);
    }
  }

  /**
   * Check if background step tracking is enabled
   * Returns true by default if no preference is saved (backwards compatible)
   */
  async isBackgroundTrackingEnabled(): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_BACKGROUND_TRACKING);
      if (stored === null) {
        // Default to true for backwards compatibility
        return true;
      }
      return JSON.parse(stored);
    } catch (error) {
      console.error('[DailyStepCounterService] Error reading background tracking setting:', error);
      return true; // Default to enabled on error
    }
  }

  /**
   * Open device settings for manual permission grant
   * Opens app settings on both platforms
   */
  async openSettings(): Promise<void> {
    console.log('[DailyStepCounterService] Opening app settings');
    Linking.openSettings();
  }

  /**
   * Get today's step count (from midnight to now)
   * Uses cached value if less than 5 seconds old
   * iOS: HealthKit cumulativeSum (Watch + iPhone + 3rd-party), CMPedometer fallback
   * Android: Uses native step sensor or Health Connect API
   */
  async getTodaySteps(): Promise<DailyStepData | null> {
    try {
      // Check cache validity (works for both platforms)
      if (this.cachedSteps && this.isCacheValid()) {
        console.log('[DailyStepCounterService] Returning cached steps');
        return this.cachedSteps;
      }

      if (Platform.OS === 'android') {
        // Android: Use Health Connect
        return await this.getTodayStepsAndroid();
      } else {
        // iOS: HealthKit cumulativeSum, CMPedometer fallback
        return await this.getTodayStepsIOS();
      }
    } catch (error) {
      // Use warn instead of error - this is expected on simulators and when permissions are denied
      // CMErrorDomain error 104 = pedometer not available (simulator/no hardware)
      console.warn('[DailyStepCounterService] Steps unavailable:', error);
      return null;
    }
  }

  /**
   * iOS step fetch: HealthKit cumulativeSum first, CMPedometer fallback.
   *
   * HealthKit's HKStatisticsQuery with cumulativeSum returns the same number
   * Apple Health shows for the day — iOS coordinates iPhone + Watch samples to
   * avoid double-counting, and 3rd-party app contributions are merged in.
   * CMPedometer (expo-sensors) only sees iPhone-detected steps, so a user
   * wearing a Watch sees a much lower number than Health.app reports.
   */
  private async getTodayStepsIOS(): Promise<DailyStepData | null> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();

    // 1. Try HealthKit (matches Apple Health app's daily total)
    if (HealthKit?.queryStatisticsForQuantity) {
      try {
        const result = await HealthKit.queryStatisticsForQuantity({
          quantityType: 'HKQuantityTypeIdentifierStepCount',
          from: start,
          to: end,
          options: ['cumulativeSum'],
        });

        const sum = result?.sumQuantity?.quantity;
        if (typeof sum === 'number' && sum >= 0) {
          const steps = Math.round(sum);
          const stepData: DailyStepData = {
            steps,
            startTime: start,
            endTime: end,
            lastUpdated: new Date(),
          };
          this.cachedSteps = stepData;
          console.log(`[DailyStepCounterService] iOS ✅ HealthKit steps: ${steps}`);
          return stepData;
        }
        console.log('[DailyStepCounterService] iOS: HealthKit returned no sum, falling back to CMPedometer');
      } catch (error) {
        // Most common cause: HealthKit auth not granted yet. Falling back to
        // CMPedometer (Motion & Fitness permission) keeps the screen working.
        console.log('[DailyStepCounterService] iOS: HealthKit query failed, falling back to CMPedometer:', error);
      }
    }

    // 2. Fall back to CMPedometer via expo-sensors
    console.log(`[DailyStepCounterService] iOS: Querying CMPedometer ${start.toISOString()} → ${end.toISOString()}`);
    const result = await Pedometer.getStepCountAsync(start, end);
    if (!result) {
      console.warn('[DailyStepCounterService] iOS: No step data returned');
      return null;
    }

    const stepData: DailyStepData = {
      steps: result.steps,
      startTime: start,
      endTime: end,
      lastUpdated: new Date(),
    };
    this.cachedSteps = stepData;
    console.log(`[DailyStepCounterService] iOS ✅ CMPedometer steps: ${result.steps}`);
    return stepData;
  }

  /**
   * Android-specific step fetching
   * Priority: Native sensor (all Android) → Health Connect fallback
   *
   * Native sensor: Uses expo-android-pedometer (TYPE_STEP_COUNTER) - works on ALL Android
   *                including privacy ROMs like GrapheneOS. Does NOT require Google Play Services.
   * Health Connect: Falls back to HC if native sensor returns 0 or fails
   *
   * Note: Previously we assumed privacy ROMs couldn't use native sensors, but testing
   * on GrapheneOS proved this was incorrect - the notification shows correct step count.
   */
  private async getTodayStepsAndroid(): Promise<DailyStepData | null> {
    // Calculate time bounds for today
    const startTime = new Date();
    startTime.setHours(0, 0, 0, 0); // Midnight today
    const endTime = new Date(); // Now

    // 1. First check if native service is already running (user enabled background tracking)
    // If running, bypass privacy ROM check - the service IS working (proven by notification)
    // This fixes the bug where UI shows 0 steps while notification shows correct count
    const isServiceRunning = nativeStepCounterService.isServiceRunning();
    const shouldTryNative = isServiceRunning || await nativeStepCounterService.shouldUseNativeSteps();

    if (shouldTryNative) {
      try {
        console.log(`[DailyStepCounterService] Android: Trying native step sensor (serviceRunning=${isServiceRunning})...`);
        const nativeSteps = await nativeStepCounterService.getTodaySteps();

        if (nativeSteps > 0) {
          console.log(`[DailyStepCounterService] Android ✅ Native sensor steps: ${nativeSteps}`);

          const stepData: DailyStepData = {
            steps: nativeSteps,
            startTime,
            endTime,
            lastUpdated: new Date(),
          };

          // Update cache
          this.cachedSteps = stepData;
          return stepData;
        }
        console.log('[DailyStepCounterService] Native sensor returned 0, trying Health Connect...');
      } catch (error) {
        console.log('[DailyStepCounterService] Native step counter error:', error);
      }
    }

    // 2. Try Health Connect (for privacy ROMs or if native unavailable)
    try {
      console.log('[DailyStepCounterService] Android: Trying Health Connect for steps...');
      const healthConnectSteps = await healthConnectService.getTodaySteps();

      if (healthConnectSteps && healthConnectSteps.steps > 0) {
        console.log(`[DailyStepCounterService] Android ✅ Health Connect steps: ${healthConnectSteps.steps}`);

        const stepData: DailyStepData = {
          steps: healthConnectSteps.steps,
          startTime: healthConnectSteps.startTime,
          endTime: healthConnectSteps.endTime,
          lastUpdated: new Date(),
        };

        // Update cache
        this.cachedSteps = stepData;
        return stepData;
      }

      // Health Connect returned 0 or null - check if privacy ROM
      if (healthConnectSteps?.steps === 0) {
        const rom = await privacyROMDetectionService.detectROM();
        if (rom.isPrivacyROM) {
          console.log(`[DailyStepCounterService] ${rom.romType} detected - Health Connect returned 0 steps`);
          if (rom.sensorNotes) {
            console.log(`[DailyStepCounterService] Note: ${rom.sensorNotes}`);
          }
        }
      }
    } catch (error) {
      console.log('[DailyStepCounterService] Health Connect not available:', error);
    }

    // 3. No step data available - return 0 (don't mix data sources with local tracked workouts)
    console.log('[DailyStepCounterService] Android: No step data from native sensor or Health Connect, returning 0');
    const stepData: DailyStepData = {
      steps: 0,
      startTime,
      endTime,
      lastUpdated: new Date(),
    };

    // Update cache
    this.cachedSteps = stepData;
    return stepData;
  }

  /**
   * Get step count for a specific date range
   */
  async getSteps(start: Date, end: Date): Promise<number | null> {
    try {
      const result = await Pedometer.getStepCountAsync(start, end);
      return result ? result.steps : null;
    } catch (error) {
      console.error(
        '[DailyStepCounterService] Error getting steps for range:',
        error
      );
      return null;
    }
  }

  /**
   * Clear cached step data (forces fresh query on next call)
   */
  clearCache(): void {
    this.cachedSteps = null;
    console.log('[DailyStepCounterService] Cache cleared');
  }

  /**
   * Check if cached data is still valid (less than cacheExpiry ms old — 5s)
   */
  private isCacheValid(): boolean {
    if (!this.cachedSteps) return false;

    const age = Date.now() - this.cachedSteps.lastUpdated.getTime();
    return age < this.cacheExpiry;
  }

  /**
   * Subscribe to live step updates (real-time)
   * Returns unsubscribe function
   */
  subscribeLiveSteps(callback: (steps: number) => void): () => void {
    let subscription: any = null;

    const startSubscription = async () => {
      try {
        subscription = Pedometer.watchStepCount((result) => {
          console.log(
            `[DailyStepCounterService] Live step update: ${result.steps}`
          );
          callback(result.steps);
        });
      } catch (error) {
        console.error(
          '[DailyStepCounterService] Error subscribing to live steps:',
          error
        );
      }
    };

    startSubscription();

    // Return unsubscribe function
    return () => {
      if (subscription) {
        subscription.remove();
        console.log('[DailyStepCounterService] Unsubscribed from live steps');
      }
    };
  }

  /**
   * Get platform-specific info for debugging
   */
  getPlatformInfo(): { platform: string; available: boolean } {
    return {
      platform: Platform.OS,
      available: false, // Will be updated by isAvailable()
    };
  }
}

// Export singleton instance
export const dailyStepCounterService = DailyStepCounterService.getInstance();
