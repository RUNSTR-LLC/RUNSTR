/**
 * Unified Authentication System for Nostr
 * Provides reliable storage and retrieval of authentication data
 * with verification, fallback mechanisms, and migration support
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NDKPrivateKeySigner, NDKUser } from '@nostr-dev-kit/ndk';

const STORAGE_KEYS = {
  NSEC_PLAIN: '@runstr:user_nsec',
  NSEC_ENCRYPTED: '@runstr:nsec_encrypted',
  NPUB: '@runstr:npub',
  HEX_PUBKEY: '@runstr:hex_pubkey',
  ENCRYPTION_KEY: '@runstr:encryption_key', // Store the key used for encryption
  AUTH_VERSION: '@runstr:auth_version', // Track storage version for migrations
};

const CURRENT_AUTH_VERSION = '2.0';

export interface AuthStorage {
  nsec: string;
  npub: string;
  hexPubkey: string;
}

/**
 * Stores authentication data with verification
 * Returns true if all storage operations succeeded and were verified
 */
export async function storeAuthenticationData(
  nsec: string,
  userId: string
): Promise<boolean> {
  try {
    console.log('[Auth] Starting authentication storage...');
    console.log('[Auth] nsec format check:', {
      startsWithNsec: nsec?.startsWith('nsec1'),
      length: nsec?.length,
      sample: nsec ? nsec.slice(0, 10) + '...' : 'null'
    });

    // Validate nsec format first
    if (!nsec || !nsec.startsWith('nsec1') || nsec.length < 63) {
      console.error('[Auth] Invalid nsec format:', {
        startsWithNsec: nsec?.startsWith('nsec1'),
        length: nsec?.length,
        sample: nsec ? nsec.slice(0, 10) + '...' : 'null'
      });
      return false;
    }

    // Use NDK to process the nsec and get public key
    console.log('[Auth] Creating NDK signer...');
    const signer = new NDKPrivateKeySigner(nsec);
    const user = await signer.user();

    if (!user.pubkey) {
      console.error('[Auth] Failed to derive public key from nsec');
      return false;
    }

    const hexPubkey = user.pubkey;
    const npub = user.npub;

    console.log('[Auth] Derived keys:', {
      npub: npub.slice(0, 20) + '...',
      hexPubkey: hexPubkey.slice(0, 16) + '...'
    });

    // Store all authentication data in a transaction-like manner
    const storageOperations = [
      // Store plain nsec for wallet operations
      AsyncStorage.setItem(STORAGE_KEYS.NSEC_PLAIN, nsec),

      // Store encrypted version with consistent key
      AsyncStorage.setItem(
        STORAGE_KEYS.NSEC_ENCRYPTED,
        encryptNsec(nsec, userId)
      ),

      // Store the encryption key reference (critical for decryption)
      AsyncStorage.setItem(STORAGE_KEYS.ENCRYPTION_KEY, userId),

      // Store public key data
      AsyncStorage.setItem(STORAGE_KEYS.NPUB, npub),
      AsyncStorage.setItem(STORAGE_KEYS.HEX_PUBKEY, hexPubkey),

      // Store version for future migrations
      AsyncStorage.setItem(STORAGE_KEYS.AUTH_VERSION, CURRENT_AUTH_VERSION),
    ];

    // Execute all storage operations
    console.log('[Auth] Executing storage operations...');
    await Promise.all(storageOperations);

    // Verify storage succeeded by reading back
    console.log('[Auth] Verifying storage...');
    const verification = await verifyAuthenticationStorage();

    if (!verification) {
      console.error('[Auth] Storage verification failed - clearing invalid data');
      await clearAuthenticationStorage();
      return false;
    }

    console.log('[Auth] ✅ Authentication stored and verified successfully');
    console.log('[Auth] Stored for npub:', npub.slice(0, 20) + '...');

    return true;
  } catch (error) {
    console.error('[Auth] Storage error:', error);
    // Don't clear on error - might be temporary
    return false;
  }
}

/**
 * Retrieves authentication data with multiple fallback mechanisms
 */
export async function getAuthenticationData(): Promise<AuthStorage | null> {
  try {
    console.log('[Auth] Retrieving authentication data...');

    // Try plain storage first (fastest)
    const plainNsec = await AsyncStorage.getItem(STORAGE_KEYS.NSEC_PLAIN);
    console.log('[Auth] Plain nsec retrieved:', plainNsec ? `${plainNsec.slice(0, 10)}...` : 'null');

    if (plainNsec && plainNsec.startsWith('nsec1')) {
      console.log('[Auth] Retrieved valid nsec from plain storage');

      // Get associated public key data
      const npub = await AsyncStorage.getItem(STORAGE_KEYS.NPUB);
      const hexPubkey = await AsyncStorage.getItem(STORAGE_KEYS.HEX_PUBKEY);

      if (npub && hexPubkey) {
        return {
          nsec: plainNsec,
          npub,
          hexPubkey,
        };
      } else {
        console.log('[Auth] Missing public key data, deriving from nsec...');
        // Derive missing data from nsec
        const signer = new NDKPrivateKeySigner(plainNsec);
        const user = await signer.user();

        // Store the derived data for next time
        await AsyncStorage.setItem(STORAGE_KEYS.NPUB, user.npub);
        await AsyncStorage.setItem(STORAGE_KEYS.HEX_PUBKEY, user.pubkey);

        return {
          nsec: plainNsec,
          npub: user.npub,
          hexPubkey: user.pubkey,
        };
      }
    }

    // Fallback to encrypted storage
    console.log('[Auth] Plain storage invalid, trying encrypted fallback...');

    const encryptedNsec = await AsyncStorage.getItem(STORAGE_KEYS.NSEC_ENCRYPTED);
    const encryptionKey = await AsyncStorage.getItem(STORAGE_KEYS.ENCRYPTION_KEY);

    console.log('[Auth] Encrypted data found:', !!encryptedNsec, 'Key found:', !!encryptionKey);

    if (!encryptedNsec || !encryptionKey) {
      console.log('[Auth] No encrypted data or key found');
      return null;
    }

    const nsec = decryptNsec(encryptedNsec, encryptionKey);
    console.log('[Auth] Decrypted nsec:', nsec ? `${nsec.slice(0, 10)}...` : 'null');

    if (!nsec.startsWith('nsec1')) {
      console.error('[Auth] Decryption produced invalid nsec');
      return null;
    }

    // Restore plain storage for future use
    await AsyncStorage.setItem(STORAGE_KEYS.NSEC_PLAIN, nsec);
    console.log('[Auth] Restored plain storage from encrypted');

    // Get public key data
    const npub = await AsyncStorage.getItem(STORAGE_KEYS.NPUB);
    const hexPubkey = await AsyncStorage.getItem(STORAGE_KEYS.HEX_PUBKEY);

    if (!npub || !hexPubkey) {
      console.log('[Auth] Deriving public keys from decrypted nsec...');
      // Derive from nsec if missing
      const signer = new NDKPrivateKeySigner(nsec);
      const user = await signer.user();

      await AsyncStorage.setItem(STORAGE_KEYS.NPUB, user.npub);
      await AsyncStorage.setItem(STORAGE_KEYS.HEX_PUBKEY, user.pubkey);

      return {
        nsec,
        npub: user.npub,
        hexPubkey: user.pubkey,
      };
    }

    return {
      nsec,
      npub,
      hexPubkey,
    };
  } catch (error) {
    console.error('[Auth] Retrieval error:', error);
    return null;
  }
}

/**
 * Verifies that authentication data can be retrieved after storage
 */
async function verifyAuthenticationStorage(): Promise<boolean> {
  try {
    const keys = [
      STORAGE_KEYS.NSEC_PLAIN,
      STORAGE_KEYS.NSEC_ENCRYPTED,
      STORAGE_KEYS.NPUB,
      STORAGE_KEYS.HEX_PUBKEY,
      STORAGE_KEYS.ENCRYPTION_KEY,
    ];

    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      if (!value) {
        console.error(`[Auth] Verification failed: ${key} is null`);
        return false;
      }
    }

    // Verify nsec format
    const nsec = await AsyncStorage.getItem(STORAGE_KEYS.NSEC_PLAIN);
    if (!nsec?.startsWith('nsec1')) {
      console.error('[Auth] Verification failed: Invalid nsec format');
      return false;
    }

    // Verify we can decrypt the encrypted version
    const encrypted = await AsyncStorage.getItem(STORAGE_KEYS.NSEC_ENCRYPTED);
    const encryptionKey = await AsyncStorage.getItem(STORAGE_KEYS.ENCRYPTION_KEY);

    if (encrypted && encryptionKey) {
      const decrypted = decryptNsec(encrypted, encryptionKey);
      if (decrypted !== nsec) {
        console.error('[Auth] Verification failed: Decryption mismatch');
        return false;
      }
    }

    console.log('[Auth] All verification checks passed');
    return true;
  } catch (error) {
    console.error('[Auth] Verification error:', error);
    return false;
  }
}

/**
 * Simple XOR encryption (should be replaced with proper encryption)
 */
function encryptNsec(nsec: string, key: string): string {
  // Use consistent 32-char key
  const keyPadded = key.slice(0, 32).padEnd(32, '0');
  let encrypted = '';

  for (let i = 0; i < nsec.length; i++) {
    encrypted += String.fromCharCode(
      nsec.charCodeAt(i) ^ keyPadded.charCodeAt(i % keyPadded.length)
    );
  }

  // Base64 encode for safe storage - React Native doesn't have btoa
  // Use a simple base64 implementation
  const base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;

  while (i < encrypted.length) {
    const a = encrypted.charCodeAt(i++);
    const b = i < encrypted.length ? encrypted.charCodeAt(i++) : 0;
    const c = i < encrypted.length ? encrypted.charCodeAt(i++) : 0;

    const bitmap = (a << 16) | (b << 8) | c;

    result += base64chars.charAt((bitmap >> 18) & 63);
    result += base64chars.charAt((bitmap >> 12) & 63);
    result += i - 2 < encrypted.length ? base64chars.charAt((bitmap >> 6) & 63) : '=';
    result += i - 1 < encrypted.length ? base64chars.charAt(bitmap & 63) : '=';
  }

  return result;
}

/**
 * Simple XOR decryption
 * EXPORTED for wallet service to use correct decryption matching encryptNsec
 */
export function decryptNsec(encrypted: string, key: string): string {
  try {
    // Use consistent 32-char key
    const keyPadded = key.slice(0, 32).padEnd(32, '0');

    // Base64 decode - React Native doesn't have atob
    // Use a simple base64 decode implementation
    const base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const base64inv: { [key: string]: number } = {};
    for (let i = 0; i < base64chars.length; i++) {
      base64inv[base64chars[i]] = i;
    }

    // Remove padding and convert to binary
    encrypted = encrypted.replace(/[^A-Za-z0-9+/]/g, '');
    let data = '';
    let bits = 0;
    let value = 0;

    for (let i = 0; i < encrypted.length; i++) {
      const c = encrypted[i];
      if (c === '=') break;

      value = (value << 6) | base64inv[c];
      bits += 6;

      if (bits >= 8) {
        bits -= 8;
        data += String.fromCharCode((value >> bits) & 0xff);
        value &= (1 << bits) - 1;
      }
    }

    let decrypted = '';

    for (let i = 0; i < data.length; i++) {
      decrypted += String.fromCharCode(
        data.charCodeAt(i) ^ keyPadded.charCodeAt(i % keyPadded.length)
      );
    }

    return decrypted;
  } catch (error) {
    console.error('[Auth] Decryption error:', error);
    return '';
  }
}

/**
 * Clears all authentication data
 */
export async function clearAuthenticationStorage(): Promise<void> {
  const keys = Object.values(STORAGE_KEYS);
  await AsyncStorage.multiRemove(keys);
  console.log('[Auth] Cleared all authentication data');
}

/**
 * Migration function to fix existing broken storage
 */
export async function migrateAuthenticationStorage(
  userNpub: string,
  userId: string
): Promise<boolean> {
  try {
    console.log('[Auth] Starting storage migration...');

    // Check if we already have correct version
    const version = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_VERSION);
    if (version === CURRENT_AUTH_VERSION) {
      console.log('[Auth] Already on latest version');
      return true;
    }

    // Try to recover nsec from various sources
    let nsec = await AsyncStorage.getItem(STORAGE_KEYS.NSEC_PLAIN);
    console.log('[Auth] Plain nsec found:', !!nsec);

    if (!nsec || !nsec.startsWith('nsec1')) {
      // Try encrypted with different keys
      const encrypted = await AsyncStorage.getItem(STORAGE_KEYS.NSEC_ENCRYPTED);
      console.log('[Auth] Encrypted nsec found:', !!encrypted);

      if (encrypted) {
        // Try npub as key (old broken method)
        nsec = decryptNsec(encrypted, userNpub);
        console.log('[Auth] Decrypted with npub:', nsec?.slice(0, 10) || 'failed');

        if (!nsec?.startsWith('nsec1')) {
          // Try userId as key (correct method)
          nsec = decryptNsec(encrypted, userId);
          console.log('[Auth] Decrypted with userId:', nsec?.slice(0, 10) || 'failed');
        }

        if (!nsec?.startsWith('nsec1')) {
          // Try hex pubkey as key
          const hexPubkey = await AsyncStorage.getItem(STORAGE_KEYS.HEX_PUBKEY);
          if (hexPubkey) {
            nsec = decryptNsec(encrypted, hexPubkey);
            console.log('[Auth] Decrypted with hexPubkey:', nsec?.slice(0, 10) || 'failed');
          }
        }
      }
    }

    if (!nsec || !nsec.startsWith('nsec1')) {
      console.error('[Auth] Migration failed: Cannot recover valid nsec');
      return false;
    }

    console.log('[Auth] Successfully recovered nsec, re-storing...');

    // Re-store with proper structure
    return await storeAuthenticationData(nsec, userId);
  } catch (error) {
    console.error('[Auth] Migration error:', error);
    return false;
  }
}

/**
 * Check authentication health
 */
export async function checkAuthenticationHealth(): Promise<boolean> {
  try {
    const authData = await getAuthenticationData();
    return !!authData && !!authData.nsec && !!authData.npub;
  } catch (error) {
    console.error('[Auth] Health check failed:', error);
    return false;
  }
}

/**
 * Get just the nsec for backwards compatibility
 */
export async function getNsec(): Promise<string | null> {
  const authData = await getAuthenticationData();
  return authData?.nsec || null;
}

/**
 * Get just the npub for backwards compatibility
 */
export async function getNpub(): Promise<string | null> {
  const authData = await getAuthenticationData();
  return authData?.npub || null;
}