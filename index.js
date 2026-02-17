// MUST BE FIRST - Apply all global polyfills for React Native
import './src/utils/applyGlobalPolyfills';

// Additional polyfill for WebView crypto (needed for NWC)
import 'react-native-webview-crypto';

import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';
import App from './src/App';

// Register background location task BEFORE app initialization
// This ensures TaskManager knows about the background task on both iOS and Android
import './src/services/activity/SimpleRunTrackerTask'; // Unified tracker for all activities

/**
 * Global error handlers to prevent white screen crashes
 * Catches errors that escape React ErrorBoundary (e.g., unhandled promise
 * rejections in background GPS tracking or Nostr queries)
 */
const originalHandler = global.ErrorUtils?.getGlobalHandler?.();

if (global.ErrorUtils) {
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('[GlobalErrorHandler] Caught error:', {
      message: error?.message,
      stack: error?.stack?.substring(0, 500),
      isFatal,
    });

    // Call original handler so React Native can still process it
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

// Handle unhandled promise rejections (Hermes engine)
if (global.HermesInternal) {
  const promiseRejectionTrackingOptions = {
    allRejections: true,
    onUnhandled: (id, rejection) => {
      console.error('[UnhandledPromise] Rejection:', {
        id,
        reason: rejection?.message || String(rejection),
        stack: rejection?.stack?.substring(0, 500),
      });
    },
    onHandled: () => {},
  };

  require('promise/setimmediate/rejection-tracking').enable(
    promiseRejectionTrackingOptions
  );
}

// Suppress known non-critical warnings that clutter logs
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Sending `onAnimatedValueUpdate` with no listeners registered',
]);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
