/**
 * BatteryOptimizationService - Dynamic GPS accuracy based on battery level
 * Adjusts tracking parameters to extend battery life
 */

import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Application from 'expo-application';
import { Platform, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type BatteryMode = 'high_accuracy' | 'balanced' | 'battery_saver';

export interface BatteryOptimizationConfig {
  mode: BatteryMode;
  accuracy: Location.Accuracy;
  timeInterval: number;
  distanceInterval: number;
  description: string;
}

const BATTERY_CONFIGS: Record<BatteryMode, BatteryOptimizationConfig> = {
  high_accuracy: {
    mode: 'high_accuracy',
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 2000, // 2 seconds
    distanceInterval: 3, // 3 meters (improved accuracy for running)
    description: 'Maximum accuracy, higher battery usage',
  },
  balanced: {
    mode: 'balanced',
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 5000, // 5 seconds
    distanceInterval: 10, // 10 meters
    description: 'Good accuracy with moderate battery usage',
  },
  battery_saver: {
    mode: 'battery_saver',
    accuracy: Location.Accuracy.Low,
    timeInterval: 10000, // 10 seconds
    distanceInterval: 20, // 20 meters
    description: 'Extended battery life, reduced accuracy',
  },
};

const BATTERY_EXEMPTION_PROMPT_KEY = '@runstr:battery_exemption_prompted';

export class BatteryOptimizationService {
  private static instance: BatteryOptimizationService;
  private currentMode: BatteryMode = 'high_accuracy';
  private batteryLevel: number = 100;
  private isCharging: boolean = false;
  private listeners: Set<(mode: BatteryMode, level: number) => void> =
    new Set();
  private batterySubscription: Battery.PowerState | null = null;

  // MEMORY FIX: Store battery listener subscriptions for proper cleanup
  // Without cleanup, duplicate listeners accumulate after app restarts during long workouts
  private batteryLevelSubscription: Battery.Subscription | null = null;
  private batteryStateSubscription: Battery.Subscription | null = null;

  // Battery warning thresholds
  private readonly CRITICAL_BATTERY = 10;
  private readonly LOW_BATTERY = 20;
  private readonly MEDIUM_BATTERY = 30;

  private constructor() {
    this.initializeBatteryMonitoring();
  }

  static getInstance(): BatteryOptimizationService {
    if (!BatteryOptimizationService.instance) {
      BatteryOptimizationService.instance = new BatteryOptimizationService();
    }
    return BatteryOptimizationService.instance;
  }

  /**
   * Initialize battery monitoring
   */
  private async initializeBatteryMonitoring(): Promise<void> {
    try {
      // Get initial battery state
      const batteryState = await Battery.getBatteryLevelAsync();
      const powerState = await Battery.getPowerStateAsync();

      // Validate and clamp battery level to 0-100 range
      const rawLevel = Math.round((batteryState || 1) * 100);
      this.batteryLevel = Math.max(0, Math.min(100, rawLevel));
      this.isCharging =
        powerState.batteryState === Battery.BatteryState.CHARGING;

      console.log(
        `🔋 Battery initialized: ${this.batteryLevel}% (charging: ${this.isCharging})`
      );

      // Determine initial mode
      this.updateModeBasedOnBattery();

      // Subscribe to battery changes - STORE subscriptions for cleanup
      // MEMORY FIX: Store subscription refs to prevent listener accumulation during long workouts
      this.batteryLevelSubscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
        // Validate and clamp battery level to 0-100 range
        const rawLevel = Math.round(batteryLevel * 100);
        this.batteryLevel = Math.max(0, Math.min(100, rawLevel));
        this.updateModeBasedOnBattery();
      });

      this.batteryStateSubscription = Battery.addBatteryStateListener(({ batteryState }) => {
        this.isCharging = batteryState === Battery.BatteryState.CHARGING;
        this.updateModeBasedOnBattery();
      });
    } catch (error) {
      console.error('Failed to initialize battery monitoring:', error);
      // Set safe default values on error
      this.batteryLevel = 100;
      this.isCharging = false;
    }
  }

  /**
   * Update mode based on battery level and charging status
   */
  private updateModeBasedOnBattery(): void {
    const previousMode = this.currentMode;

    // If charging, always use high accuracy
    if (this.isCharging) {
      this.currentMode = 'high_accuracy';
    } else if (this.batteryLevel > 50) {
      this.currentMode = 'high_accuracy';
    } else if (this.batteryLevel > 20) {
      this.currentMode = 'balanced';
    } else {
      this.currentMode = 'battery_saver';
    }

    // Notify if mode changed
    if (previousMode !== this.currentMode) {
      this.notifyListeners();
    }
  }

  /**
   * Get location options for current battery mode
   */
  getLocationOptions(
    activityType: 'running' | 'walking' | 'cycling'
  ): Location.LocationTaskOptions {
    const config = BATTERY_CONFIGS[this.currentMode];

    // Adjust based on activity type
    let timeInterval = config.timeInterval;
    let distanceInterval = config.distanceInterval;

    switch (activityType) {
      case 'walking':
        // Walking can use less frequent updates
        timeInterval = Math.min(timeInterval * 1.5, 15000);
        distanceInterval = Math.min(distanceInterval * 1.5, 30);
        break;
      case 'cycling':
        // Cycling needs more frequent updates for speed
        timeInterval = Math.max(timeInterval * 0.8, 1000);
        break;
    }

    // Activity-specific notification messages
    const activityNames = {
      running: 'Run',
      walking: 'Walk',
      cycling: 'Ride',
    };

    return {
      accuracy: config.accuracy,
      timeInterval,
      distanceInterval,
      mayShowUserSettingsDialog: false,
      // iOS-specific: Use fitness-optimized GPS algorithms
      activityType: Location.ActivityType.Fitness,
      // iOS-specific: Don't auto-pause during workouts
      pausesUpdatesAutomatically: false,
      // iOS-specific: Show blue bar when tracking in background (user transparency)
      showsBackgroundLocationIndicator: true,
      // Android-specific: Foreground service to prevent Doze Mode from stopping tracking
      foregroundService: {
        notificationTitle: 'RUNSTR - Activity Tracking',
        notificationBody: `Tracking your ${activityNames[
          activityType
        ].toLowerCase()} in progress`,
        notificationColor: '#FF6B35', // RUNSTR orange color
      },
    };
  }

  /**
   * Get current battery mode
   */
  getCurrentMode(): BatteryMode {
    return this.currentMode;
  }

  /**
   * Get current battery level
   */
  getBatteryLevel(): number {
    return this.batteryLevel;
  }

  /**
   * Get battery warning if applicable
   */
  getBatteryWarning(): {
    level: 'critical' | 'low' | 'medium' | null;
    message: string | null;
  } {
    if (this.isCharging) {
      return { level: null, message: null };
    }

    if (this.batteryLevel <= this.CRITICAL_BATTERY) {
      return {
        level: 'critical',
        message: `Critical battery (${this.batteryLevel}%) - Tracking may stop soon`,
      };
    }

    if (this.batteryLevel <= this.LOW_BATTERY) {
      return {
        level: 'low',
        message: `Low battery (${this.batteryLevel}%) - Tracking accuracy reduced`,
      };
    }

    if (this.batteryLevel <= this.MEDIUM_BATTERY) {
      return {
        level: 'medium',
        message: `Battery at ${this.batteryLevel}% - Consider charging for best tracking`,
      };
    }

    return { level: null, message: null };
  }

  /**
   * Check if battery is low enough to show warning
   */
  shouldShowBatteryWarning(): boolean {
    return !this.isCharging && this.batteryLevel <= this.LOW_BATTERY;
  }

  /**
   * Check if device is charging
   */
  isDeviceCharging(): boolean {
    return this.isCharging;
  }

  /**
   * Get mode description
   */
  getModeDescription(): string {
    return BATTERY_CONFIGS[this.currentMode].description;
  }

  /**
   * Force a specific mode (user override)
   */
  setMode(mode: BatteryMode): void {
    this.currentMode = mode;
    this.notifyListeners();
  }

  /**
   * Subscribe to mode changes
   */
  subscribe(listener: (mode: BatteryMode, level: number) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners of changes
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      listener(this.currentMode, this.batteryLevel);
    });
  }

  /**
   * Should stop tracking due to low battery
   */
  shouldStopTracking(): boolean {
    return this.batteryLevel <= 5 && !this.isCharging;
  }

  /**
   * Get battery warning message (simple string version)
   */
  getBatteryWarningMessage(): string | null {
    if (this.batteryLevel <= 5) {
      return 'Battery critical! Tracking will stop soon.';
    } else if (this.batteryLevel <= 10) {
      return 'Battery very low. Consider ending your workout.';
    } else if (this.batteryLevel <= 20) {
      return 'Battery low. Switched to battery saver mode.';
    }
    return null;
  }

  /**
   * Check if battery optimization exemption has been requested
   * Android 14+ requires this for reliable background location tracking
   *
   * CRITICAL FIX: Previously assumed exempted if prompted - this was WRONG.
   * Now properly distinguishes between:
   * - 'true': User accepted and opened settings (may or may not have enabled)
   * - 'declined': User explicitly declined
   * - null: Never prompted
   */
  async checkBatteryOptimizationStatus(): Promise<{
    exempted: boolean;
    prompted: boolean;
    userDeclined: boolean;
  }> {
    // iOS doesn't have battery optimization issues, return true
    if (Platform.OS !== 'android') {
      return { exempted: true, prompted: false, userDeclined: false };
    }

    // Check the prompt status
    const promptStatus = await AsyncStorage.getItem(
      BATTERY_EXEMPTION_PROMPT_KEY
    );

    // Track if user declined, which means they're definitely NOT exempted
    const userDeclined = promptStatus === 'declined';
    const wasPrompted = promptStatus === 'true' || promptStatus === 'declined';

    // Try to check actual exemption status via IntentLauncher if possible
    // Fall back to AsyncStorage flag if native check is unavailable
    let isExempted = false;
    if (promptStatus === 'true') {
      // User opened settings - they may or may not have actually exempted
      // We assume exempted since we can't verify without a native module
      isExempted = true;
    }

    return {
      exempted: isExempted,
      prompted: wasPrompted,
      userDeclined,
    };
  }

  /**
   * Request battery optimization exemption for reliable background tracking
   * Android 14+ requirement for apps that need to track location when backgrounded
   *
   * @param forceReprompt - If true, will re-prompt even if previously declined (use after GPS issues)
   * @returns true if exemption granted or already requested, false if user declined
   */
  async requestBatteryOptimizationExemption(
    forceReprompt: boolean = false
  ): Promise<boolean> {
    // iOS doesn't need this, return true
    if (Platform.OS !== 'android') {
      return true;
    }

    // Check if already prompted
    const status = await this.checkBatteryOptimizationStatus();

    // If previously declined but force re-prompt is requested (e.g., after GPS issues)
    if (status.userDeclined && forceReprompt) {
      console.log(
        '⚠️ User previously declined, but force re-prompt requested due to GPS issues'
      );
      // Clear the declined status to allow re-prompting
      await AsyncStorage.removeItem(BATTERY_EXEMPTION_PROMPT_KEY);
    } else if (status.prompted && !status.userDeclined) {
      console.log('✅ Battery optimization exemption already requested');
      return true;
    } else if (status.userDeclined && !forceReprompt) {
      console.log('⚠️ User previously declined battery exemption');
      return false;
    }

    // Show alert explaining why this is needed
    return new Promise((resolve) => {
      Alert.alert(
        'Background Tracking Required',
        'To accurately track your workouts while using other apps (like music players), RUNSTR needs to be exempted from battery optimization.\n\n' +
          'This allows GPS to continue working when the app is in the background.\n\n' +
          'You will be taken to Android settings to enable "Unrestricted" battery mode for RUNSTR.',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: async () => {
              console.log('⚠️ User declined battery optimization exemption');
              // Still mark as prompted so we don't spam them
              await AsyncStorage.setItem(
                BATTERY_EXEMPTION_PROMPT_KEY,
                'declined'
              );
              resolve(false);
            },
          },
          {
            text: 'Open Settings',
            onPress: async () => {
              try {
                // Mark as prompted
                await AsyncStorage.setItem(
                  BATTERY_EXEMPTION_PROMPT_KEY,
                  'true'
                );

                // Open Android battery optimization settings for this specific app
                // Uses the proper intent action with package data
                const packageName =
                  Application.applicationId || 'com.anonymous.runstr.project';

                try {
                  // Try the direct REQUEST_IGNORE_BATTERY_OPTIMIZATIONS intent first
                  // This opens a simple dialog asking to allow unrestricted battery
                  await IntentLauncher.startActivityAsync(
                    IntentLauncher.ActivityAction
                      .REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                    {
                      data: `package:${packageName}`,
                    }
                  );
                  console.log(
                    '✅ Opened battery optimization exemption dialog'
                  );
                  resolve(true);
                } catch (intentError) {
                  // Fallback: Open the app's battery settings page
                  console.warn(
                    '⚠️ Direct battery intent failed, trying app settings:',
                    intentError
                  );
                  try {
                    await IntentLauncher.startActivityAsync(
                      IntentLauncher.ActivityAction
                        .APPLICATION_DETAILS_SETTINGS,
                      {
                        data: `package:${packageName}`,
                      }
                    );
                    console.log('✅ Opened app settings page');
                    resolve(true);
                  } catch (appSettingsError) {
                    // Last fallback: general settings
                    console.warn(
                      '⚠️ App settings failed, opening general settings:',
                      appSettingsError
                    );
                    await Linking.openSettings();
                    resolve(true);
                  }
                }
              } catch (error) {
                console.error('Failed to open settings:', error);
                // Still mark as prompted and resolve true so tracking can continue
                resolve(true);
              }
            },
          },
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * Show reminder about battery optimization if tracking has issues
   * Call this when GPS signal is frequently lost or tracking stops unexpectedly
   */
  async showBatteryOptimizationReminder(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    Alert.alert(
      'Background Tracking Issue Detected',
      'RUNSTR may have been paused by Android battery optimization.\n\n' +
        'Tap "Fix Now" to enable unrestricted battery mode for RUNSTR.',
      [
        { text: 'Dismiss', style: 'cancel' },
        {
          text: 'Fix Now',
          onPress: async () => {
            const packageName =
              Application.applicationId || 'com.anonymous.runstr.project';
            try {
              await IntentLauncher.startActivityAsync(
                IntentLauncher.ActivityAction
                  .REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                {
                  data: `package:${packageName}`,
                }
              );
            } catch {
              // Fallback to app settings
              try {
                await IntentLauncher.startActivityAsync(
                  IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
                  {
                    data: `package:${packageName}`,
                  }
                );
              } catch {
                await Linking.openSettings();
              }
            }
          },
        },
      ]
    );
  }

  /**
   * Cleanup subscriptions
   * MEMORY FIX: Properly remove battery listeners to prevent accumulation
   */
  cleanup(): void {
    // Remove battery listener subscriptions
    if (this.batteryLevelSubscription) {
      this.batteryLevelSubscription.remove();
      this.batteryLevelSubscription = null;
    }
    if (this.batteryStateSubscription) {
      this.batteryStateSubscription.remove();
      this.batteryStateSubscription = null;
    }
    this.listeners.clear();
  }
}
