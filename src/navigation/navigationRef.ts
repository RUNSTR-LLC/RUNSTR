/**
 * Shared navigation ref for deep-link routing from push notifications.
 * Used by ExpoNotificationProvider to navigate when user taps a notification.
 */
import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

/**
 * Navigate to a screen from outside React component tree.
 * Safe to call before navigation is ready - will no-op silently.
 */
export function navigate(name: string, params?: Record<string, any>): void {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.navigate({ name, params })
    );
  } else {
    console.warn('[navigationRef] Navigation not ready, cannot navigate to:', name);
  }
}
