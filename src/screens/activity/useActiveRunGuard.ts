/**
 * useActiveRunGuard - Confirm before navigating away from an active run
 * Uses refs (not state) so the listener is registered once and never reads a
 * stale closure, even after 30+ minutes of state changes.
 */

import { useEffect, type MutableRefObject } from 'react';
import { CustomAlert } from '../../components/ui/CustomAlert';
import { simpleRunTracker } from '../../services/activity/SimpleRunTracker';

export function useActiveRunGuard(
  navigation: any,
  isTrackingRef: MutableRefObject<boolean>,
  isPausedRef: MutableRefObject<boolean>,
  onDiscard: () => void
) {
  // CRITICAL: Prevent navigation away from tracker screen during active tracking
  // This fixes the bug where users were unexpectedly navigated to profile screen mid-workout
  // FIXED: Use refs instead of state to prevent race condition from listener recreation
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      // CRITICAL FIX: Use refs instead of state to avoid stale closure
      // Only prevent navigation if actively tracking (not paused, not stopped)
      if (!isTrackingRef.current || isPausedRef.current) {
        return; // Allow navigation if not tracking or paused
      }

      // Prevent the default action (navigating away)
      e.preventDefault();

      // Show confirmation dialog
      (CustomAlert as any).show({
        title: 'Stop Tracking?',
        message: 'You have an active workout. Do you want to stop and discard it?',
        buttons: [
          {
            text: 'Continue Workout',
            style: 'cancel',
          },
          {
            text: 'Stop & Discard',
            style: 'destructive',
            onPress: async () => {
              // Stop tracking and discard
              await simpleRunTracker.stopTracking();
              onDiscard();
              isTrackingRef.current = false;
              isPausedRef.current = false;
              // Now allow navigation
              navigation.dispatch(e.data.action);
            },
          },
        ],
      });
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]); // FIXED: Only depend on navigation, not state - refs handle state changes
}
