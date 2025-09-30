/**
 * LocationPermissionService - Centralized location permission handling
 * Manages permission requests, status checks, and settings navigation
 */

import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PERMISSION_CHECK_KEY = '@runstr:location_permission_checked';
const BACKGROUND_PERMISSION_KEY = '@runstr:background_location_requested';

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

      const hasRequestedBefore = await AsyncStorage.getItem(PERMISSION_CHECK_KEY);

      return {
        foreground: this.mapExpoStatus(foregroundStatus.status),
        background: this.mapExpoStatus(backgroundStatus.status),
        canRequestBackground: foregroundStatus.status === 'granted',
        shouldShowSettings: hasRequestedBefore === 'true' && foregroundStatus.status !== 'granted',
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
   * Request background location permission (iOS only)
   * Should only be called after foreground permission is granted
   */
  async requestBackgroundPermission(): Promise<boolean> {
    try {
      // Check if foreground is granted first
      const foregroundStatus = await Location.getForegroundPermissionsAsync();
      if (foregroundStatus.status !== 'granted') {
        console.warn('Cannot request background permission without foreground permission');
        return false;
      }

      // Check if already granted
      const currentStatus = await Location.getBackgroundPermissionsAsync();
      if (currentStatus.status === 'granted') {
        console.log('✅ Background location permission already granted');
        return true;
      }

      // Check if we've already requested background permission
      const hasRequestedBackground = await AsyncStorage.getItem(BACKGROUND_PERMISSION_KEY);

      if (hasRequestedBackground === 'true' && Platform.OS === 'ios') {
        // On iOS, we can only request once, then user must go to settings
        this.showBackgroundPermissionInfo();
        return false;
      }

      // Request background permission
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
    // We delay the background request slightly to avoid iOS dialog conflicts
    await new Promise(resolve => setTimeout(resolve, 1000));
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
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }

  /**
   * Map Expo permission status to our internal status
   */
  private mapExpoStatus(status: Location.PermissionStatus): LocationPermissionStatus {
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
   * Reset permission check flags (for testing)
   */
  async resetPermissionFlags(): Promise<void> {
    await AsyncStorage.removeItem(PERMISSION_CHECK_KEY);
    await AsyncStorage.removeItem(BACKGROUND_PERMISSION_KEY);
  }
}

export const locationPermissionService = LocationPermissionService.getInstance();