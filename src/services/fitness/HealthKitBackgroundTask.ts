/**
 * HealthKitBackgroundTask - Early HealthKit listener registration
 *
 * CRITICAL: This file must be imported in index.js BEFORE app initialization
 * so iOS wakes RUNSTR when new HealthKit workouts appear (e.g., from Apple Watch).
 *
 * Mirrors the SimpleRunTrackerTask.ts pattern: module-level registration
 * that runs at import time, before React renders or auth checks complete.
 *
 * Architecture:
 * iOS HealthKit background delivery → cold start → index.js imports this file
 * → addQueryUpdateListener fires → routes to HealthKitBackgroundService
 */

import { Platform } from 'react-native';

if (Platform.OS === 'ios') {
  try {
    const hk = require('@yzlin/expo-healthkit');
    const enableBackgroundDelivery = hk.enableBackgroundDelivery;
    const subscribeToQuery = hk.subscribeToQuery;
    const addQueryUpdateListener =
      hk.default?.addQueryUpdateListener ?? hk.addQueryUpdateListener;
    const HKUpdateFrequency = hk.HKUpdateFrequency;
    const HKWorkoutTypeIdentifier = 'HKWorkoutTypeIdentifier';

    if (enableBackgroundDelivery && subscribeToQuery && addQueryUpdateListener) {
      // Register the observer query listener at module level (before app init)
      // iOS requires this to be registered on every app launch for background delivery
      (async () => {
        try {
          const enabled = await enableBackgroundDelivery(
            HKWorkoutTypeIdentifier,
            HKUpdateFrequency.immediate
          );
          console.log(`[HKBackgroundTask] enableBackgroundDelivery: ${enabled}`);

          const queryId = await subscribeToQuery(HKWorkoutTypeIdentifier);
          console.log(`[HKBackgroundTask] subscribeToQuery: ${queryId}`);

          addQueryUpdateListener(async (event: { typeIdentifier: string }) => {
            console.log('[HKBackgroundTask] Workout update received, routing to service...');
            try {
              // Lazy import to avoid circular deps at module load time
              const { HealthKitBackgroundService } = await import(
                './HealthKitBackgroundService'
              );
              const service = HealthKitBackgroundService.getInstance();
              await (service as any).handleWorkoutUpdate(event);
            } catch (err) {
              console.error('[HKBackgroundTask] Error routing to service:', err);
            }
          });

          console.log('[HKBackgroundTask] Early listener registered successfully');
        } catch (err) {
          console.warn('[HKBackgroundTask] Early registration failed:', err);
        }
      })();
    } else {
      console.warn('[HKBackgroundTask] HealthKit background APIs not available');
    }
  } catch (e) {
    console.warn('[HKBackgroundTask] Failed to import @yzlin/expo-healthkit:', e);
  }
}
