/**
 * BackgroundSyncRegistration - Lifecycle management for Android background fetch
 *
 * Registers/unregisters the expo-background-fetch task on login/logout.
 * Platform-guarded to Android only (iOS uses HealthKit background delivery).
 */

import { Platform } from 'react-native';
import { ANDROID_SYNC_TASK } from './AndroidBackgroundSyncTask';

export class BackgroundSyncRegistration {
  /**
   * Register the Android background sync task.
   * Called after user login on Android.
   * Uses WorkManager with a minimum interval of 15 minutes.
   */
  static async register(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      const BackgroundFetch = require('expo-background-fetch');

      // Check current status first
      const status = await BackgroundFetch.getStatusAsync();
      if (status === BackgroundFetch.BackgroundFetchStatus.Denied) {
        console.warn('[BgSync] Background fetch denied by system');
        return;
      }

      await BackgroundFetch.registerTaskAsync(ANDROID_SYNC_TASK, {
        minimumInterval: 15 * 60, // 15 minutes (Android minimum)
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log('[BgSync] Android background sync registered');
    } catch (error) {
      console.warn('[BgSync] Registration failed:', error);
    }
  }

  /**
   * Unregister the Android background sync task.
   * Called on user logout.
   */
  static async unregister(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      const BackgroundFetch = require('expo-background-fetch');
      await BackgroundFetch.unregisterTaskAsync(ANDROID_SYNC_TASK);
      console.log('[BgSync] Android background sync unregistered');
    } catch (error) {
      // May fail if not registered - that's OK
      console.log('[BgSync] Unregister result:', error);
    }
  }
}
