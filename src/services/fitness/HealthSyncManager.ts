/**
 * HealthSyncManager - Lightweight foreground sync for HealthKit/Health Connect
 *
 * Syncs health platform workouts to the leaderboard on app foreground and pull-to-refresh.
 * Uses a 5-minute throttle to prevent excessive syncing on rapid foreground/background cycles.
 *
 * Safe because:
 * - Only runs on foreground (not during active GPS tracking)
 * - Both health services have built-in syncInProgress guards
 * - Checks isAuthorized before fetching (no permission popups)
 * - Fire-and-forget — failures never block UI
 */

import { Platform } from 'react-native';

const THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

interface SyncResult {
  synced: boolean;
  error?: string;
}

class HealthSyncManagerClass {
  private static instance: HealthSyncManagerClass;
  private lastSyncTime: number = 0;

  private constructor() {}

  static getInstance(): HealthSyncManagerClass {
    if (!HealthSyncManagerClass.instance) {
      HealthSyncManagerClass.instance = new HealthSyncManagerClass();
    }
    return HealthSyncManagerClass.instance;
  }

  /**
   * Sync today's health platform workouts to the leaderboard.
   * Platform-aware: uses HealthKit on iOS, Health Connect on Android.
   * Throttled to once per 5 minutes.
   */
  async syncTodayToLeaderboard(): Promise<SyncResult> {
    // Throttle check
    const now = Date.now();
    if (now - this.lastSyncTime < THROTTLE_MS) {
      console.log('[HealthSyncManager] Throttled — last sync was less than 5 min ago');
      return { synced: false };
    }

    try {
      if (Platform.OS === 'ios') {
        return await this.syncIOS();
      } else if (Platform.OS === 'android') {
        return await this.syncAndroid();
      }
      return { synced: false, error: 'Unsupported platform' };
    } catch (error) {
      // Swallow "Sync already in progress" silently
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('already in progress')) {
        console.log('[HealthSyncManager] Sync already in progress, skipping');
        return { synced: false };
      }
      console.warn('[HealthSyncManager] Sync failed:', message);
      return { synced: false, error: message };
    }
  }

  private async syncIOS(): Promise<SyncResult> {
    const healthKitService = require('./healthKitService').default;
    const status = healthKitService.getStatus();

    if (!status.available || !status.authorized) {
      console.log('[HealthSyncManager] iOS: HealthKit not available or not authorized');
      return { synced: false };
    }

    console.log('[HealthSyncManager] iOS: Syncing today\'s HealthKit workouts...');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // fetchWorkoutsProgressive triggers cacheWorkouts → submitNewWorkoutsToSupabase internally
    const workouts = await healthKitService.fetchWorkoutsProgressive(todayStart, new Date());
    this.lastSyncTime = Date.now();
    console.log(`[HealthSyncManager] iOS: Synced ${workouts.length} workout(s)`);
    return { synced: true };
  }

  private async syncAndroid(): Promise<SyncResult> {
    const healthConnectService = require('./healthConnectService').default;
    const status = healthConnectService.getStatus();

    if (!status.available || !status.authorized) {
      console.log('[HealthSyncManager] Android: Health Connect not available or not authorized');
      return { synced: false };
    }

    console.log('[HealthSyncManager] Android: Syncing recent Health Connect workouts...');

    // fetchRecentWorkouts(1) fetches last 1 day, triggers auto-submit internally
    const workouts = await healthConnectService.fetchRecentWorkouts(1);
    this.lastSyncTime = Date.now();
    console.log(`[HealthSyncManager] Android: Synced ${workouts.length} workout(s)`);
    return { synced: true };
  }
}

export const HealthSyncManager = HealthSyncManagerClass.getInstance();
