/**
 * Auth Debug Helper - Diagnostic utilities for authentication storage
 * Use this to debug issues with missing npub/hex_pubkey in AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Check and log the status of all auth-related AsyncStorage keys
 * Call this during app startup or when debugging auth issues
 */
export async function checkAuthStorageStatus(): Promise<{
  hasNpub: boolean;
  hasHexPubkey: boolean;
  hasNsec: boolean;
  allPresent: boolean;
}> {
  console.log('🔍 ================================');
  console.log('🔍 AUTH STORAGE DEBUG');
  console.log('🔍 ================================');

  const keys = [
    { key: '@runstr:npub', name: 'NPUB (public key)' },
    { key: '@runstr:hex_pubkey', name: 'HEX PUBKEY' },
    { key: '@runstr:user_nsec', name: 'NSEC (private key)' },
    { key: '@runstr:nsec_encrypted', name: 'ENCRYPTED NSEC' },
    { key: '@runstr:encryption_key', name: 'ENCRYPTION KEY' },
  ];

  let hasNpub = false;
  let hasHexPubkey = false;
  let hasNsec = false;

  for (const { key, name } of keys) {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        console.log(`✅ ${name}`);
        console.log(`   Key: ${key}`);
        console.log(`   Value: ${value.slice(0, 20)}...`);

        if (key === '@runstr:npub') hasNpub = true;
        if (key === '@runstr:hex_pubkey') hasHexPubkey = true;
        if (key === '@runstr:user_nsec' || key === '@runstr:nsec_encrypted') hasNsec = true;
      } else {
        console.log(`❌ ${name}`);
        console.log(`   Key: ${key}`);
        console.log(`   Value: NOT FOUND`);
      }
    } catch (error) {
      console.error(`❌ Error reading ${name}:`, error);
    }
  }

  console.log('🔍 ================================');
  console.log('📊 SUMMARY:');
  console.log(`   NPUB: ${hasNpub ? '✅' : '❌'}`);
  console.log(`   HEX PUBKEY: ${hasHexPubkey ? '✅' : '❌'}`);
  console.log(`   NSEC: ${hasNsec ? '✅' : '❌'}`);

  const allPresent = hasNpub && hasHexPubkey && hasNsec;
  console.log(`   STATUS: ${allPresent ? '✅ ALL KEYS PRESENT' : '❌ MISSING KEYS'}`);

  if (!allPresent) {
    console.log('⚠️  WARNING: Some auth keys are missing!');
    console.log('   This will cause:');
    console.log('   - Workout prefetch to fail');
    console.log('   - Profile data not loading');
    console.log('   - "NO WORKOUTS FOUND" errors');
    console.log('   SOLUTION: Re-login to store keys properly');
  }

  console.log('🔍 ================================');

  return {
    hasNpub,
    hasHexPubkey,
    hasNsec,
    allPresent,
  };
}

/**
 * Get a summary of auth storage status without detailed logging
 * Useful for quick checks in UI components
 */
export async function getAuthStorageStatus(): Promise<{
  hasNpub: boolean;
  hasHexPubkey: boolean;
  hasNsec: boolean;
  allPresent: boolean;
  npub?: string;
  hexPubkey?: string;
}> {
  const npub = await AsyncStorage.getItem('@runstr:npub');
  const hexPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
  const nsec = await AsyncStorage.getItem('@runstr:user_nsec');
  const encryptedNsec = await AsyncStorage.getItem('@runstr:nsec_encrypted');

  const hasNpub = !!npub;
  const hasHexPubkey = !!hexPubkey;
  const hasNsec = !!(nsec || encryptedNsec);
  const allPresent = hasNpub && hasHexPubkey && hasNsec;

  return {
    hasNpub,
    hasHexPubkey,
    hasNsec,
    allPresent,
    npub: npub || undefined,
    hexPubkey: hexPubkey || undefined,
  };
}

/**
 * Clear all auth storage (useful for debugging)
 * WARNING: This will log the user out!
 */
export async function clearAuthStorage(): Promise<void> {
  console.log('🧹 Clearing all auth storage...');

  const keys = [
    '@runstr:npub',
    '@runstr:hex_pubkey',
    '@runstr:user_nsec',
    '@runstr:nsec_encrypted',
    '@runstr:encryption_key',
    '@runstr:auth_version',
  ];

  await AsyncStorage.multiRemove(keys);
  console.log('✅ Auth storage cleared');
}
