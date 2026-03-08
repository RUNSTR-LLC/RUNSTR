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
 * Global crash visibility guards for issue #28 (white-screen crash report).
 * Keep this lightweight: log escaping JS exceptions + unhandled rejections
 * so we can correlate crash paths without changing runtime behavior.
 */
const installGlobalCrashGuards = () => {
  const errorUtils = global.ErrorUtils;

  if (errorUtils?.getGlobalHandler && errorUtils?.setGlobalHandler) {
    const originalHandler = errorUtils.getGlobalHandler();

    errorUtils.setGlobalHandler((error, isFatal) => {
      console.error('🚨 [GlobalErrorHandler]', {
        message: error?.message,
        isFatal,
        stack: error?.stack,
      });

      if (typeof originalHandler === 'function') {
        originalHandler(error, isFatal);
      }
    });
  }

  const previousUnhandledRejection = globalThis.onunhandledrejection;

  globalThis.onunhandledrejection = event => {
    console.error('🚨 [UnhandledPromiseRejection]', {
      reason: event?.reason?.message || String(event?.reason),
      stack: event?.reason?.stack,
    });

    if (typeof previousUnhandledRejection === 'function') {
      previousUnhandledRejection(event);
    }
  };
};

installGlobalCrashGuards();

// Suppress known non-critical warnings that clutter logs
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Sending `onAnimatedValueUpdate` with no listeners registered',
]);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);