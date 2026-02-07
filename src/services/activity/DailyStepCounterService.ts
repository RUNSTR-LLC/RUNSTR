/**
 * DailyStepCounterService - Cross-platform daily step counting
 * iOS: Uses Expo Pedometer API (HealthKit) for auto-counting
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
      console.log('[DailyStepCounterService] Will use Pedometer (HealthKit) for auto-counted steps');
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
   * iOS: Uses Pedometer (HealthKit)
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
   * iOS: Automatically handled by Pedometer API (HealthKit)
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
        // iOS: Check Pedometer availability and request HealthKit access
        const available = await Pedometer.isAvailableAsync();
        if (!available) {
          console.warn('[DailyStepCounterService] Pedometer not available on this device');
          return false;
        }

        // Test if we can access step data (iOS auto-prompts HealthKit permission here)
        const now = new Date();
        const testStart = new Date(now.getTime() - 1000); // 1 second ago
        await Pedometer.getStepCountAsync(testStart, now);

        console.log('[DailyStepCounterService] iOS permissions granted - step data accessible');
        return true;
      }
    } catch (error) {
      console.error('[DailyStepCounterService] Permission error:', error);
      return false;
    }
  }

  /**
   * Check if step counting permission is currently granted
   * iOS: Always returns 'granted' (handled by HealthKit)
   * Android: Always returns 'granted' (uses local workout storage - no permissions needed)
   */
  async checkPermissionStatus(): Promise<
    'granted' | 'denied' | 'never_ask_again' | 'unknown'
  > {
    // Both platforms: always granted
    // iOS: handled by HealthKit automatically
    // Android: uses local workout storage, no permissions needed
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
   * iOS: Uses Pedometer API (HealthKit) - auto-counted throughout day
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
        // iOS: Use Pedometer (HealthKit)
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
   * iOS-specific step fetching via Pedometer (HealthKit)
   */
  private async getTodayStepsIOS(): Promise<DailyStepData | null> {
    // Calculate today's time range (midnight to now)
    const start = new Date();
    start.setHours(0, 0, 0, 0); // Midnight today
    const end = new Date(); // Now

    console.log(`[DailyStepCounterService] iOS: Querying steps from ${start.toISOString()} to ${end.toISOString()}`);

    // Query pedometer data
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

    // Update cache
    this.cachedSteps = stepData;

    console.log(`[DailyStepCounterService] iOS ✅ Today's steps: ${result.steps}`);
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
   * Check if cached data is still valid (less than 5 minutes old)
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
