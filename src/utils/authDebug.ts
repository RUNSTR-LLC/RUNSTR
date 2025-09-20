/**
 * Authentication Debug Utilities
 * Temporary utilities for debugging authentication storage issues
 * TO BE REMOVED after fixing authentication issues
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  NSEC_PLAIN: '@runstr:user_nsec',
  NSEC_ENCRYPTED: '@runstr:nsec_encrypted',
  NPUB: '@runstr:npub',
  HEX_PUBKEY: '@runstr:hex_pubkey',
  ENCRYPTION_KEY: '@runstr:encryption_key',
  AUTH_VERSION: '@runstr:auth_version',
  // Legacy keys that might still exist
  LEGACY_NSEC: 'nostrNsec',
  LEGACY_NPUB: 'nostrNpub',
};

/**
 * Debug function to check all authentication-related storage
 */
export async function debugAuthStorage(): Promise<void> {
  console.log('=== Authentication Storage Debug ===');

  for (const [name, key] of Object.entries(STORAGE_KEYS)) {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        // Truncate sensitive data for logging
        let displayValue = value;
        if (name.includes('NSEC') && value.startsWith('nsec')) {
          displayValue = value.slice(0, 15) + '...';
        } else if (name.includes('HEX') && value.length === 64) {
          displayValue = value.slice(0, 16) + '...';
        }
        console.log(`✅ ${name}: ${displayValue}`);
      } else {
        console.log(`❌ ${name}: null`);
      }
    } catch (error) {
      console.log(`❌ ${name}: Error reading - ${error}`);
    }
  }

  console.log('=== End Authentication Debug ===');
}

/**
 * Attempt to recover authentication from any available source
 */
export async function recoverAuthentication(): Promise<{
  nsec: string | null;
  npub: string | null;
  hexPubkey: string | null;
  source: string;
}> {
  console.log('🔧 Attempting authentication recovery...');

  // Check new storage first
  let nsec = await AsyncStorage.getItem(STORAGE_KEYS.NSEC_PLAIN);
  let npub = await AsyncStorage.getItem(STORAGE_KEYS.NPUB);
  let hexPubkey = await AsyncStorage.getItem(STORAGE_KEYS.HEX_PUBKEY);

  if (nsec && npub) {
    console.log('✅ Found auth in new storage');
    return { nsec, npub, hexPubkey, source: 'new_storage' };
  }

  // Check legacy storage
  const legacyNsec = await AsyncStorage.getItem(STORAGE_KEYS.LEGACY_NSEC);
  const legacyNpub = await AsyncStorage.getItem(STORAGE_KEYS.LEGACY_NPUB);

  if (legacyNsec && legacyNpub) {
    console.log('✅ Found auth in legacy storage');
    return {
      nsec: legacyNsec,
      npub: legacyNpub,
      hexPubkey: null,
      source: 'legacy_storage'
    };
  }

  // Check encrypted storage
  const encrypted = await AsyncStorage.getItem(STORAGE_KEYS.NSEC_ENCRYPTED);
  const encryptionKey = await AsyncStorage.getItem(STORAGE_KEYS.ENCRYPTION_KEY);

  if (encrypted && encryptionKey) {
    console.log('⚠️ Found encrypted auth but decryption needed');
    return {
      nsec: null,
      npub: null,
      hexPubkey: null,
      source: 'encrypted_needs_decryption'
    };
  }

  console.log('❌ No authentication found in any storage');
  return { nsec: null, npub: null, hexPubkey: null, source: 'none' };
}

/**
 * Force clear all authentication storage (for testing)
 */
export async function clearAllAuthStorage(): Promise<void> {
  console.log('🗑️ Clearing all authentication storage...');

  for (const key of Object.values(STORAGE_KEYS)) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove ${key}:`, error);
    }
  }

  console.log('✅ All authentication storage cleared');
}