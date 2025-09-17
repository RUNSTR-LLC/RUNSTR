/**
 * Crypto Polyfill for React Native
 * MUST be imported before Cashu library
 */

import { getRandomBytes } from 'expo-crypto';

// Set up crypto.getRandomValues polyfill
if (typeof global.crypto === 'undefined') {
  global.crypto = {} as any;
}

global.crypto.getRandomValues = function<T extends ArrayBufferView | null>(array: T): T {
  if (array && 'length' in array) {
    const bytes = getRandomBytes(array.length as number);
    if (array instanceof Uint8Array) {
      array.set(bytes);
    }
  }
  return array;
};

// Also add crypto.randomUUID if needed
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = function() {
    const bytes = getRandomBytes(16);
    // Set version (4) and variant bits
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  };
}

// Export flag to confirm polyfill is applied
export const cryptoPolyfillApplied = true;

console.log('[CryptoPolyfill] React Native crypto polyfill applied successfully');