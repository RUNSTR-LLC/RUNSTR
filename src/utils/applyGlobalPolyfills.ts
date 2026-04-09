/**
 * Global Polyfills for React Native
 * Based on Alby's NWC React Native Expo demo
 * Provides critical Web APIs needed by @getalby/sdk
 */

// Text encoding/decoding support
import { TextEncoder, TextDecoder } from 'text-encoding';

// URL API support
import 'react-native-url-polyfill/auto';

// Cryptographic random values
import 'react-native-get-random-values';

// Message port functionality
import 'message-port-polyfill';

// Note: React Native provides native WebSocket implementation
// No polyfill needed for WebSocket

/**
 * Apply all polyfills globally
 * This ensures they're available before any SDK code runs
 */
export function applyGlobalPolyfills(): void {
  // Apply TextEncoder/TextDecoder globally
  if (typeof global.TextEncoder === 'undefined') {
    global.TextEncoder = TextEncoder as any;
  }
  if (typeof global.TextDecoder === 'undefined') {
    global.TextDecoder = TextDecoder as any;
  }

  // Ensure crypto is available globally
  if (typeof global.crypto === 'undefined') {
    // React Native provides crypto through react-native-get-random-values
    // But we need to ensure it's on the global object
    global.crypto = globalThis.crypto;
  }

  // Log successful polyfill initialization
  console.log('[Polyfills] Applied global polyfills for React Native');
  console.log(
    '[Polyfills] TextEncoder:',
    typeof global.TextEncoder !== 'undefined'
  );
  console.log(
    '[Polyfills] TextDecoder:',
    typeof global.TextDecoder !== 'undefined'
  );
  console.log('[Polyfills] crypto:', typeof global.crypto !== 'undefined');
  console.log('[Polyfills] WebSocket:', typeof WebSocket !== 'undefined');
}

// Apply polyfills immediately when this module is imported
applyGlobalPolyfills();
