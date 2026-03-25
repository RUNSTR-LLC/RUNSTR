/**
 * LocationPermissionService - Centralized location permission handling
 * Manages permission requests, status checks, and settings navigation
 */

import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PERMISSION_CHECK_KEY = '@runstr:location_permission_checked';
const BACKGROUND_PERMISSION_KEY = '@runstr:background_location_requested';

// Android API level constants for version-specific permission handling
// See: https://developer.android.com/develop/sensors-and-location/location/permissions
const ANDROID_10 = 29; // ACCESS_BACKGROUND_LOCATION introduced as separate permission
const ANDROID_11 = 30; // Background location MUST be granted from Settings (no dialog)
const ANDROID_12 = 31; // Precise vs Approximate location choice introduced
const ANDROID_14 = 34; // FOREGROUND_SERVICE_LOCATION permission required

/**
 * Get the Android API version (0 if not Android)
 */
const getAndroidVersion = (): number => {
  return Platform.OS === 'android' ? (Platform.Version as number) : 0;
};

export type LocationPermissionStatus =
  | 'undetermined'
  | 'granted'
  | 'denied'
  | 'restricted'
  | 'background_granted'
  | 'background_denied';

export interface PermissionResult {
  foreground: LocationPermissionStatus;
  background: LocationPermissionStatus;
  canRequestBackground: boolean;
  shouldShowSettings: boolean;
}

class LocationPermissionService {
  private static instance: LocationPermissionService;

  private constructor() {}

  static getInstance(): LocationPermissionService {
    if (!LocationPermissionService.instance) {
      LocationPermissionService.instance = new LocationPermissionService();
    }
    return LocationPermissionService.instance;
  }

  /**
   * Check current permission status without requesting
   */
  async checkPermissionStatus(): Promise<PermissionResult> {
    try {
      const foregroundStatus = await Location.getForegroundPermissionsAsync();
      const backgroundStatus = await Location.getBackgroundPermissionsAsync();

      const hasRequestedBefore = await AsyncStorage.getItem(
        PERMISSION_CHECK_KEY
      );

      return {
        foreground: this.mapExpoStatus(foregroundStatus.status),
        background: this.mapExpoStatus(backgroundStatus.status),
        canRequestBackground: foregroundStatus.status === 'granted',
        shouldShowSettings:
          hasRequestedBefore === 'true' &&
          foregroundStatus.status !== 'granted',
      };
    } catch (error) {
      console.error('Error checking permission status:', error);
      return {
        foreground: 'undetermined',
        background: 'undetermined',
        canRequestBackground: false,
        shouldShowSettings: false,
      };
    }
  }

  /**
   * Request foreground location permission
   */
  async requestForegroundPermission(): Promise<boolean> {
    try {
      // First check if already granted
      const currentStatus = await Location.getForegroundPermissionsAsync();
      if (currentStatus.status === 'granted') {
        console.log('✅ Foreground location permission already granted');
        return true;
      }

      // Mark that we've requested permission at least once
      await AsyncStorage.setItem(PERMISSION_CHECK_KEY, 'true');

      // Request permission
      console.log('📍 Requesting foreground location permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        console.log('✅ Foreground location permission granted');
        return true;
      } else {
        console.log('❌ Foreground location permission denied:', status);

        // Show alert with option to open settings
        this.showPermissionDeniedAlert('foreground');
        return false;
      }
    } catch (error) {
      console.error('Error requesting foreground permission:', error);
      return false;
    }
  }

  /**
   * Request background location permission
   * Handles Android version-specific requirements:
   * - Android 8-9 (API 26-28): Background granted automatically with foreground
   * - Android 10 (API 29): Can request via in-app dialog
   * - Android 11+ (API 30+): MUST be granted from Settings - dialog won't work
   */
  async requestBackgroundPermission(): Promise<boolean> {
    try {
      const androidVersion = getAndroidVersion();

      // Log Android version for debugging
      if (androidVersion > 0) {
        console.log(`📱 Android API level: ${androidVersion}`);
      }

      // Check if foreground is granted first
      const foregroundStatus = await Location.getForegroundPermissionsAsync();
      if (foregroundStatus.status !== 'granted') {
        console.warn(
          'Cannot request background permission without foreground permission'
        );
        return false;
      }

      // Check if already granted
      const currentStatus = await Location.getBackgroundPermissionsAsync();
      if (currentStatus.status === 'granted') {
        console.log('✅ Background location permission already granted');
        return true;
      }

      // Android 8-9 (API 26-28): Background location is granted automatically with foreground
      // No separate permission request needed
      if (androidVersion > 0 && androidVersion < ANDROID_10) {
        console.log(
          '✅ Android 8-9: Background location granted automatically with foreground'
        );
        return true;
      }

      // Android 14+ (API 34+): Try system dialog first - it works better now
      if (androidVersion >= ANDROID_14) {
        console.log('📍 Android 14+: Trying system dialog first...');
        const { status } = await Location.requestBackgroundPermissionsAsync();

        if (status === 'granted') {
          console.log('✅ Android 14+: Background location granted via system dialog');
          await AsyncStorage.setItem(BACKGROUND_PERMISSION_KEY, 'true');
          return true;
        }

        // If dialog didn't grant, fall through to Settings guide
        console.log('📍 Android 14+: System dialog did not grant, showing Settings guide...');
        return this.showAndroid11BackgroundSettingsGuide();
      }

      // Android 11-13 (API 30-33): MUST go to Settings - in-app dialog won't work
      // See: https://developer.android.com/about/versions/11/privacy/location
      if (androidVersion >= ANDROID_11) {
        console.log(
          '📍 Android 11-13: Background location must be granted from Settings'
        );
        return this.showAndroid11BackgroundSettingsGuide();
      }

      // Check if we've already requested background permission
      const hasRequestedBackground = await AsyncStorage.getItem(
        BACKGROUND_PERMISSION_KEY
      );

      if (hasRequestedBackground === 'true' && Platform.OS === 'ios') {
        // On iOS, we can only request once, then user must go to settings
        this.showBackgroundPermissionInfo();
        return false;
      }

      // Android 10 or iOS: Can use in-app dialog
      console.log('📍 Requesting background location permission...');
      const { status } = await Location.requestBackgroundPermissionsAsync();

      // Mark that we've requested background permission
      await AsyncStorage.setItem(BACKGROUND_PERMISSION_KEY, 'true');

      if (status === 'granted') {
        console.log('✅ Background location permission granted');
        return true;
      } else {
        console.log('⚠️ Background location permission not granted:', status);

        // Show info about background tracking
        this.showBackgroundPermissionInfo();
        return false;
      }
    } catch (error) {
      console.error('Error requesting background permission:', error);
      return false;
    }
  }

  /**
   * Request all necessary permissions for activity tracking
   */
  async requestActivityTrackingPermissions(): Promise<{
    foreground: boolean;
    background: boolean;
  }> {
    // Step 1: Request foreground permission
    const foregroundGranted = await this.requestForegroundPermission();

    if (!foregroundGranted) {
      return { foreground: false, background: false };
    }

    // Step 2: Request background permission (optional, continues if denied)
    // We delay the background request to ensure iOS dialog fully dismisses
    // iOS dialogs need ~2 seconds to animate out before showing next prompt
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const backgroundGranted = await this.requestBackgroundPermission();

    return {
      foreground: foregroundGranted,
      background: backgroundGranted,
    };
  }

  /**
   * Open device settings for location permissions
   */
  async openLocationSettings(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        const settingsUrl = 'app-settings:';
        const canOpenSettingsUrl = await Linking.canOpenURL(settingsUrl);

        if (canOpenSettingsUrl) {
          await Linking.openURL(settingsUrl);
          return;
        }
      }

      await Linking.openSettings();
    } catch (error) {
      console.error('Error opening location settings:', error);
    }
  }

  /**
   * Map Expo permission status to our internal status
   */
  private mapExpoStatus(
    status: Location.PermissionStatus
  ): LocationPermissionStatus {
    switch (status) {
      case Location.PermissionStatus.GRANTED:
        return 'granted';
      case Location.PermissionStatus.DENIED:
        return 'denied';
      case Location.PermissionStatus.UNDETERMINED:
        return 'undetermined';
      default:
        return 'restricted';
    }
  }

  /**
   * Show alert when foreground permission is denied
   */
  private showPermissionDeniedAlert(type: 'foreground' | 'background'): void {
    Alert.alert(
      'Location Permission Required',
      type === 'foreground'
        ? 'RUNSTR needs location access to track your workouts accurately. Please enable location permissions in Settings.'
        : 'Background location allows RUNSTR to continue tracking when the app is in the background.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => this.openLocationSettings(),
        },
      ]
    );
  }

  /**
   * Show info about background location tracking
   */
  private showBackgroundPermissionInfo(): void {
    Alert.alert(
      'Background Tracking Available',
      'Your workout will be tracked while the app is open. For continuous tracking when switching apps, enable "Always Allow" location access in Settings.',
      [
        { text: 'OK', style: 'default' },
        {
          text: 'Open Settings',
          onPress: () => this.openLocationSettings(),
        },
      ]
    );
  }

  /**
   * Android 11+ specific: Guide user to Settings for background location
   * On Android 11+, background location MUST be granted from Settings
   * The in-app dialog doesn't have an option to enable it
   * See: https://developer.android.com/about/versions/11/privacy/location
   *
   * Returns false after opening Settings - the PermissionRequestModal's AppState
   * listener will detect when user returns and re-check permissions.
   */
  private showAndroid11BackgroundSettingsGuide(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'Background Location Required',
        'To track your workout while using other apps (like music), Android requires you to enable background location from Settings.\n\n' +
          'Tap "Open Settings", then:\n' +
          '1. Tap "Permissions"\n' +
          '2. Tap "Location"\n' +
          '3. Select "Allow all the time"\n\n' +
          'Without this, GPS tracking will stop when you switch apps.',
        [
          {
            text: 'Skip for Now',
            style: 'cancel',
            onPress: () => {
              console.log('⚠️ User skipped Android 11+ background location setup');
              resolve(false);
            },
          },
          {
            text: 'Open Settings',
            onPress: async () => {
              console.log('📍 Opening Settings for Android 11+ background location');
              await AsyncStorage.setItem(BACKGROUND_PERMISSION_KEY, 'true');
              await Linking.openSettings();
              // Return false - the modal's AppState listener will re-check
              // permissions when user returns from Settings
              resolve(false);
            },
          },
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * Check if precise (not approximate) location was granted
   * Android 12+ (API 31+) lets users choose between Precise and Approximate location
   * GPS tracking requires PRECISE location - approximate (~2km accuracy) won't work
   * See: https://developer.android.com/develop/sensors-and-location/location/permissions
   */
  async checkPreciseLocationGranted(): Promise<{
    granted: boolean;
    isPrecise: boolean;
    androidVersion: number;
  }> {
    const androidVersion = getAndroidVersion();

    // Not applicable for iOS or Android < 12
    if (androidVersion < ANDROID_12) {
      return { granted: true, isPrecise: true, androidVersion };
    }

    try {
      const status = await Location.getForegroundPermissionsAsync();

      if (status.status !== 'granted') {
        return { granted: false, isPrecise: false, androidVersion };
      }

      // Check the accuracy field - 'full' means precise, 'coarse' means approximate
      // expo-location exposes this via the 'accuracy' field on Android 12+
      const accuracy = (status as any).accuracy;
      const isPrecise = accuracy === 'full' || accuracy === undefined;

      console.log(
        `📍 Android ${androidVersion}: Location accuracy = ${accuracy || 'full (default)'}`
      );

      if (!isPrecise) {
        console.warn(
          '⚠️ User granted APPROXIMATE location only - GPS tracking may not work correctly'
        );
        this.showPreciseLocationRequired();
      }

      return { granted: true, isPrecise, androidVersion };
    } catch (error) {
      console.error('Error checking precise location:', error);
      return { granted: false, isPrecise: false, androidVersion };
    }
  }

  /**
   * Show alert when user only granted approximate location (Android 12+)
   */
  private showPreciseLocationRequired(): void {
    Alert.alert(
      'Precise Location Needed',
      'You selected "Approximate" location, but GPS tracking requires "Precise" location for accurate distance measurement.\n\n' +
        'To fix this:\n' +
        '1. Open Settings\n' +
        '2. Tap "Permissions" → "Location"\n' +
        '3. Enable "Use precise location"\n\n' +
        'Without precise location, your workout distance may be very inaccurate.',
      [
        { text: 'Continue Anyway', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => this.openLocationSettings(),
        },
      ]
    );
  }

  /**
   * Reset permission check flags (for testing)
   */
  async resetPermissionFlags(): Promise<void> {
    await AsyncStorage.removeItem(PERMISSION_CHECK_KEY);
    await AsyncStorage.removeItem(BACKGROUND_PERMISSION_KEY);
  }
}

export const locationPermissionService =
  LocationPermissionService.getInstance();
