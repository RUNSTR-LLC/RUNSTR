/**
 * AndroidBackgroundSyncTask - Periodic background sync for Health Connect on Android
 *
 * CRITICAL: This file must be imported in index.js BEFORE app initialization
 * so TaskManager knows about the background task on Android.
 *
 * Uses expo-background-fetch (backed by WorkManager) for periodic sync
 * with a minimum interval of 15 minutes.
 *
 * On each wake:
 * 1. Check GPS session guard (skip if active tracking)
 * 2. Check npub guard (skip if not logged in)
 * 3. Fetch recent workouts from Health Connect
 * 4. Fetch today's steps from Health Connect
 * 5. Submit any new data to Supabase
 * 6. Auto-join matching RUNSTR competitions
 */

import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ANDROID_SYNC_TASK = 'runstr-background-sync';

const SESSION_STATE_KEY = '@runstr:session_state';

if (Platform.OS === 'android') {
  TaskManager.defineTask(ANDROID_SYNC_TASK, async () => {
    console.log('[AndroidBgSync] Background sync triggered');

    try {
      // 1. npub guard: skip if not logged in
      const npub = await AsyncStorage.getItem('@runstr:npub');
      if (!npub) {
        console.log('[AndroidBgSync] No npub, skipping');
        const BackgroundFetch = require('expo-background-fetch');
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      // 2. GPS session guard: skip if user is actively tracking a workout
      const sessionStateStr = await AsyncStorage.getItem(SESSION_STATE_KEY);
      if (sessionStateStr) {
        try {
          const sessionState = JSON.parse(sessionStateStr);
          const sessionAge = Date.now() - (sessionState.startTime || 0);
          if (sessionAge < 14400000) { // 4 hours
            console.log('[AndroidBgSync] GPS session active, skipping');
            const BackgroundFetch = require('expo-background-fetch');
            return BackgroundFetch.BackgroundFetchResult.NoData;
          }
        } catch { /* stale/invalid session, proceed */ }
      }

      // 3. Import Health Connect service and sync workouts
      let hasNewData = false;
      try {
        const { HealthConnectService } = await import('./healthConnectService');
        const hcService = HealthConnectService.getInstance();

        if (hcService.isAvailable()) {
          // fetchRecentWorkouts triggers submitNewWorkoutsToSupabase internally
          const workouts = await hcService.getRecentWorkouts(npub, 1); // last 24h
          if (workouts && workouts.length > 0) {
            hasNewData = true;
            console.log(`[AndroidBgSync] Synced ${workouts.length} workouts`);
          }

          // 4. Sync today's steps
          await syncAndroidSteps(npub);
        }
      } catch (err) {
        console.warn('[AndroidBgSync] Health Connect sync error:', err);
      }

      const BackgroundFetch = require('expo-background-fetch');
      return hasNewData
        ? BackgroundFetch.BackgroundFetchResult.NewData
        : BackgroundFetch.BackgroundFetchResult.NoData;
    } catch (error) {
      console.error('[AndroidBgSync] Error:', error);
      const BackgroundFetch = require('expo-background-fetch');
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });

  console.log('[AndroidBgSync] Task registered successfully');
}

/**
 * Sync today's step count from Health Connect to Supabase.
 */
async function syncAndroidSteps(npub: string): Promise<void> {
  try {
    const { HealthConnectService } = await import('./healthConnectService');
    const hcService = HealthConnectService.getInstance();

    // getTodaySteps might not exist on all versions of the service
    if (typeof (hcService as any).getTodaySteps !== 'function') {
      console.log('[AndroidBgSync] getTodaySteps not available');
      return;
    }

    const steps = await (hcService as any).getTodaySteps();
    if (!steps || steps <= 0) return;

    const now = new Date();
    const dateStr = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      .toISOString()
      .split('T')[0];
    const eventId = `steps_${npub}_${dateStr}`;
    const estimatedDistanceMeters = Math.round(steps * 0.762);

    const { SupabaseCompetitionService } = await import(
      '../backend/SupabaseCompetitionService'
    );
    const { buildRewardTags } = await import('../../utils/rewardTags');
    const rewardTags = await buildRewardTags();

    // Get cached profile
    let profile: { name?: string; picture?: string } = {};
    try {
      const profilesJson = await AsyncStorage.getItem('@runstr:nostr_profiles');
      if (profilesJson) {
        const profiles = JSON.parse(profilesJson);
        const hexPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
        if (hexPubkey && profiles[hexPubkey]) {
          profile = {
            name: profiles[hexPubkey].name || profiles[hexPubkey].displayName,
            picture: profiles[hexPubkey].picture,
          };
        }
      }
    } catch { /* non-critical */ }

    await SupabaseCompetitionService.submitWorkoutSimple({
      eventId,
      npub,
      type: 'walking',
      distance: estimatedDistanceMeters,
      duration: 0,
      calories: 0,
      startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
      tags: [
        ...rewardTags,
        ['steps', String(steps)],
      ],
      profileName: profile.name,
      profilePicture: profile.picture,
    });

    console.log(`[AndroidBgSync] Step sync: ${steps} steps (${eventId})`);
  } catch (error) {
    console.warn('[AndroidBgSync] Step sync error:', error);
  }
}
