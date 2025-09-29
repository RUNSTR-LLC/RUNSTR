/**
 * BatteryOptimizationService - Dynamic GPS accuracy based on battery level
 * Adjusts tracking parameters to extend battery life
 */

import * as Battery from 'expo-battery';
import * as Location from 'expo-location';

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
    distanceInterval: 5, // 5 meters
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

export class BatteryOptimizationService {
  private static instance: BatteryOptimizationService;
  private currentMode: BatteryMode = 'high_accuracy';
  private batteryLevel: number = 100;
  private isCharging: boolean = false;
  private listeners: Set<(mode: BatteryMode, level: number) => void> = new Set();
  private batterySubscription: Battery.PowerState | null = null;

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

      this.batteryLevel = Math.round((batteryState || 1) * 100);
      this.isCharging = powerState.batteryState === Battery.BatteryState.CHARGING;

      // Determine initial mode
      this.updateModeBasedOnBattery();

      // Subscribe to battery changes
      Battery.addBatteryLevelListener(({ batteryLevel }) => {
        this.batteryLevel = Math.round(batteryLevel * 100);
        this.updateModeBasedOnBattery();
      });

      Battery.addBatteryStateListener(({ batteryState }) => {
        this.isCharging = batteryState === Battery.BatteryState.CHARGING;
        this.updateModeBasedOnBattery();
      });
    } catch (error) {
      console.error('Failed to initialize battery monitoring:', error);
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
  getLocationOptions(activityType: 'running' | 'walking' | 'cycling'): Location.LocationOptions {
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

    return {
      accuracy: config.accuracy,
      timeInterval,
      distanceInterval,
      mayShowUserSettingsDialog: false,
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
    this.listeners.forEach(listener => {
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
   * Get battery warning message
   */
  getBatteryWarning(): string | null {
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
   * Cleanup subscriptions
   */
  cleanup(): void {
    // Battery listeners are automatically cleaned up by Expo
    this.listeners.clear();
  }
}