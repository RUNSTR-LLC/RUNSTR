/**
 * Nostr Utilities
 * Helper functions for Nostr key management and validation
 */

import { nip19, getPublicKey } from 'nostr-tools';
import AsyncStorage from '@react-native-async-storage/async-storage';

// React Native polyfill for btoa/atob (Buffer-free implementation)
const btoa = (str: string): string => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  while (i < str.length) {
    const a = str.charCodeAt(i++);
    const b = i < str.length ? str.charCodeAt(i++) : 0;
    const c = i < str.length ? str.charCodeAt(i++) : 0;

    const triplet = (a << 16) | (b << 8) | c;

    result += chars[(triplet >> 18) & 63];
    result += chars[(triplet >> 12) & 63];
    result += i - 2 < str.length ? chars[(triplet >> 6) & 63] : '=';
    result += i - 1 < str.length ? chars[triplet & 63] : '=';
  }
  return result;
};

const atob = (str: string): string => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  str = str.replace(/[^A-Za-z0-9+/]/g, '');

  while (i < str.length) {
    const encoded1 = chars.indexOf(str[i++]);
    const encoded2 = chars.indexOf(str[i++]);
    const encoded3 = chars.indexOf(str[i++]);
    const encoded4 = chars.indexOf(str[i++]);

    const triplet =
      (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;

    result += String.fromCharCode((triplet >> 16) & 255);
    if (encoded3 !== 64) result += String.fromCharCode((triplet >> 8) & 255);
    if (encoded4 !== 64) result += String.fromCharCode(triplet & 255);
  }
  return result;
};

// Storage keys for local encrypted storage
const STORAGE_KEYS = {
  NSEC: '@runstr:user_nsec', // Use plain storage for consistency
  NSEC_ENCRYPTED: '@runstr:nsec_encrypted',
  NPUB: '@runstr:npub',
  HEX_PUBKEY: '@runstr:hex_pubkey',
  AUTH_METHOD: '@runstr:auth_method',
  ENCRYPTION_KEY: '@runstr:encryption_key',
} as const;

export interface NostrKeyPair {
  nsec: string;
  npub: string;
  privateKeyHex: string;
  publicKeyHex: string;
}

/**
 * Generate a new Nostr key pair
 */
export function generateNostrKeyPair(): NostrKeyPair {
  try {
    // Generate 32 bytes of random data for private key
    const privateKeyBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      privateKeyBytes[i] = Math.floor(Math.random() * 256);
    }

    const privateKeyHex = Array.from(privateKeyBytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    const publicKeyHex = getPublicKey(privateKeyBytes);
    const nsec = nip19.nsecEncode(privateKeyBytes);
    const npub = nip19.npubEncode(publicKeyHex);

    return {
      nsec,
      npub,
      privateKeyHex,
      publicKeyHex,
    };
  } catch (error) {
    console.error('Error generating Nostr key pair:', error);
    throw new Error('Failed to generate Nostr keys');
  }
}

/**
 * Validate nsec format
 */
export function validateNsec(nsec: string): boolean {
  try {
    console.log('validateNsec: Input received:', {
      nsec: nsec.slice(0, 20) + '...',
      length: nsec.length,
      startsWithNsec1: nsec.startsWith('nsec1'),
    });

    if (!nsec.startsWith('nsec1')) {
      console.log('validateNsec: Failed - does not start with nsec1');
      return false;
    }

    const decoded = nip19.decode(nsec);
    console.log('validateNsec: Decoded successfully:', {
      type: decoded.type,
      dataLength:
        decoded.data instanceof Uint8Array ? decoded.data.length : 'unknown',
    });

    const isValid =
      decoded.type === 'nsec' &&
      decoded.data instanceof Uint8Array &&
      decoded.data.length === 32;
    console.log('validateNsec: Result:', isValid);

    return isValid;
  } catch (error) {
    console.log(
      'validateNsec: Decode error:',
      error instanceof Error ? error.message : String(error)
    );
    return false;
  }
}

/**
 * Convert nsec to npub
 */
export function nsecToNpub(nsec: string): string {
  try {
    if (!validateNsec(nsec)) {
      throw new Error('Invalid nsec format');
    }

    const decoded = nip19.decode(nsec);
    if (decoded.type !== 'nsec') {
      throw new Error('Not a valid nsec');
    }

    const publicKeyHex = getPublicKey(decoded.data as Uint8Array);
    return nip19.npubEncode(publicKeyHex);
  } catch (error) {
    console.error('Error converting nsec to npub:', error);
    throw new Error('Failed to convert nsec to npub');
  }
}

/**
 * Get private key hex from nsec
 */
export function nsecToPrivateKey(nsec: string): string {
  try {
    if (!validateNsec(nsec)) {
      throw new Error('Invalid nsec format');
    }

    const decoded = nip19.decode(nsec);
    if (decoded.type !== 'nsec') {
      throw new Error('Not a valid nsec');
    }

    return typeof decoded.data === 'string'
      ? decoded.data
      : Array.from(decoded.data as Uint8Array)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
  } catch (error) {
    console.error('Error extracting private key from nsec:', error);
    throw new Error('Failed to extract private key');
  }
}

/**
 * Simple encryption for local storage (XOR-based)
 * React Native compatible version using btoa/atob polyfill
 * Note: This is basic encryption for local storage.
 * In production, consider using stronger encryption methods.
 */
function encryptForStorage(data: string, userId: string): string {
  try {
    const key = userId.slice(0, 16).padEnd(16, '0'); // Use user ID as key
    let encrypted = '';

    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(
        data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }

    // React Native compatible base64 encoding
    return btoa(encrypted);
  } catch (error) {
    console.error('Error encrypting data:', error);
    throw new Error('Failed to encrypt data for storage');
  }
}

/**
 * Simple decryption from local storage
 * React Native compatible version using btoa/atob polyfill
 */
export function decryptFromStorage(encryptedData: string, userId: string): string {
  try {
    const key = userId.slice(0, 16).padEnd(16, '0');
    const data = atob(encryptedData);
    let decrypted = '';

    for (let i = 0; i < data.length; i++) {
      decrypted += String.fromCharCode(
        data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }

    return decrypted;
  } catch (error) {
    console.error('Error decrypting data:', error);
    throw new Error('Failed to decrypt data from storage');
  }
}

/**
 * Store nsec locally (encrypted)
 */
export async function storeNsecLocally(
  nsec: string,
  userId: string
): Promise<void> {
  try {
    if (!validateNsec(nsec)) {
      throw new Error('Invalid nsec format');
    }

    const encryptedNsec = encryptForStorage(nsec, userId);
    await AsyncStorage.setItem(STORAGE_KEYS.NSEC, encryptedNsec);

    // ALSO store plain nsec for NutZap wallet service
    // This is needed for wallet operations until we implement proper key derivation
    await AsyncStorage.setItem('@runstr:user_nsec', nsec);
    console.log('Stored plain nsec at @runstr:user_nsec for wallet operations');

    // Get the hex pubkey from nsec
    const decoded = nip19.decode(nsec);
    if (decoded.type !== 'nsec') {
      throw new Error('Not a valid nsec');
    }
    const publicKeyHex = getPublicKey(decoded.data as Uint8Array);

    // Store the hex pubkey for easy access
    await AsyncStorage.setItem(STORAGE_KEYS.HEX_PUBKEY, publicKeyHex);

    // Also store the npub for quick access
    const npub = nip19.npubEncode(publicKeyHex);
    await AsyncStorage.setItem(STORAGE_KEYS.NPUB, npub);

    console.log('Nostr keys stored locally for user:', userId);
    console.log('Stored hex pubkey:', publicKeyHex.slice(0, 16) + '...');
  } catch (error) {
    console.error('Error storing nsec locally:', error);
    throw new Error('Failed to store Nostr keys locally');
  }
}

/**
 * Retrieve nsec from local storage
 * DEPRECATED: This function now uses the new unified auth system
 * Components should import getAuthenticationData from utils/nostrAuth instead
 */
export async function getNsecFromStorage(
  userId?: string // Made optional since new system doesn't need it
): Promise<string | null> {
  try {
    // Use the new unified authentication system
    const { getAuthenticationData } = await import('./nostrAuth');
    const authData = await getAuthenticationData();

    if (authData && authData.nsec) {
      console.log('[Legacy] getNsecFromStorage: Using new auth system, found nsec');
      return authData.nsec;
    }

    console.log('[Legacy] getNsecFromStorage: No auth data found');
    return null;
  } catch (error) {
    console.error('[Legacy] getNsecFromStorage error:', error);
    return null;
  }
}

/**
 * Get npub from local storage
 */
export async function getNpubFromStorage(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.NPUB);
  } catch (error) {
    console.error('Error retrieving npub from storage:', error);
    return null;
  }
}

/**
 * Get hex pubkey from local storage
 */
export async function getHexPubkeyFromStorage(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.HEX_PUBKEY);
  } catch (error) {
    console.error('Error retrieving hex pubkey from storage:', error);
    return null;
  }
}

/**
 * Store authentication method used
 */
export async function storeAuthMethod(
  method: 'apple' | 'google' | 'nostr'
): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_METHOD, method);
  } catch (error) {
    console.error('Error storing auth method:', error);
  }
}

/**
 * Get stored authentication method
 */
export async function getAuthMethod(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_METHOD);
  } catch (error) {
    console.error('Error retrieving auth method:', error);
    return null;
  }
}

/**
 * Clear all Nostr-related storage
 */
export async function clearNostrStorage(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.NSEC,
      STORAGE_KEYS.NPUB,
      STORAGE_KEYS.HEX_PUBKEY,
      STORAGE_KEYS.AUTH_METHOD,
      '@runstr:user_nsec', // Also clear wallet nsec
    ]);
    console.log('Nostr storage cleared');
  } catch (error) {
    console.error('Error clearing Nostr storage:', error);
  }
}

/**
 * Check if user has stored Nostr keys
 */
export async function hasStoredNostrKeys(): Promise<boolean> {
  try {
    const npub = await getNpubFromStorage();
    return !!npub;
  } catch (error) {
    return false;
  }
}

/**
 * Generate user display name from npub
 */
export function generateDisplayName(npub: string): string {
  try {
    // Take first 8 characters after 'npub1' prefix
    const shortNpub = npub.slice(5, 13);
    return `user_${shortNpub}`;
  } catch (error) {
    return 'Anonymous User';
  }
}

/**
 * Validate and normalize user input nsec
 */
export function normalizeNsecInput(input: string): string {
  console.log('normalizeNsecInput: Raw input received:', {
    input: input.slice(0, 20) + '...',
    length: input.length,
  });

  // Remove whitespace
  let normalized = input.trim();
  console.log('normalizeNsecInput: After trim:', {
    normalized: normalized.slice(0, 20) + '...',
    length: normalized.length,
  });

  // Handle various input formats
  if (normalized.startsWith('nsec1')) {
    console.log('normalizeNsecInput: Input already nsec1 format');
    return normalized;
  }

  // If it's hex (64 characters), convert to nsec
  if (normalized.length === 64 && /^[0-9a-fA-F]+$/.test(normalized)) {
    console.log('normalizeNsecInput: Converting hex to nsec');
    try {
      // Convert hex string to Uint8Array
      const privateKeyBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        privateKeyBytes[i] = parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
      }
      const nsec = nip19.nsecEncode(privateKeyBytes);
      console.log(
        'normalizeNsecInput: Hex conversion successful:',
        nsec.slice(0, 20) + '...'
      );
      return nsec;
    } catch (error) {
      console.log(
        'normalizeNsecInput: Hex conversion failed:',
        error instanceof Error ? error.message : String(error)
      );
      throw new Error('Invalid private key hex format');
    }
  }

  console.log('normalizeNsecInput: Input format not recognized');
  throw new Error(
    'Invalid nsec format. Please enter a valid nsec1... key or hex private key.'
  );
}

/**
 * Get user's Nostr identifiers from storage
 * Returns both npub and hex pubkey for easy use in comparisons
 */
export async function getUserNostrIdentifiers(): Promise<{
  npub: string | null;
  hexPubkey: string | null;
} | null> {
  try {
    const npub = await getNpubFromStorage();
    const hexPubkey = await getHexPubkeyFromStorage();

    if (!npub && !hexPubkey) {
      return null;
    }

    // If we have npub but missing hex, derive it
    if (npub && !hexPubkey) {
      try {
        const decoded = nip19.decode(npub);
        if (decoded.type === 'npub' && typeof decoded.data === 'string') {
          await AsyncStorage.setItem(STORAGE_KEYS.HEX_PUBKEY, decoded.data);
          return { npub, hexPubkey: decoded.data };
        }
      } catch (error) {
        console.error('Error deriving hex from npub:', error);
      }
    }

    return { npub, hexPubkey };
  } catch (error) {
    console.error('Error getting user Nostr identifiers:', error);
    return null;
  }
}
