/**
 * NDK Conversion Utilities
 * Centralized utility for npub/hex conversions
 * Provides consistent conversion across the entire application
 * Using nostr-tools for nip19 as it's more reliable in React Native
 */

import { nip19 } from 'nostr-tools';

/**
 * Convert npub to hex pubkey
 * @param npubKey - The npub key to convert
 * @returns hex pubkey string or null if conversion fails
 */
export function npubToHex(npubKey: string): string | null {
  try {
    if (!npubKey.startsWith('npub')) {
      // Already hex or invalid
      if (npubKey.length === 64 && /^[0-9a-f]+$/i.test(npubKey)) {
        return npubKey; // Already hex
      }
      console.error('[NDK Conversion] Invalid npub format:', npubKey.slice(0, 20));
      return null;
    }

    const decoded = nip19.decode(npubKey);
    if (decoded.type !== 'npub') {
      console.error('[NDK Conversion] Decoded type is not npub:', decoded.type);
      return null;
    }

    const hexPubkey = decoded.data as string;
    console.log(`[NDK Conversion] Converted npub to hex: ${npubKey.slice(0, 20)}... → ${hexPubkey.slice(0, 20)}...`);
    return hexPubkey;
  } catch (error) {
    console.error('[NDK Conversion] Failed to convert npub to hex:', error);
    return null;
  }
}

/**
 * Convert hex pubkey to npub
 * @param hexPubkey - The hex pubkey to convert
 * @returns npub string or null if conversion fails
 */
export function hexToNpub(hexPubkey: string): string | null {
  try {
    if (hexPubkey.startsWith('npub')) {
      return hexPubkey; // Already npub
    }

    if (hexPubkey.length !== 64 || !/^[0-9a-f]+$/i.test(hexPubkey)) {
      console.error('[NDK Conversion] Invalid hex pubkey format:', hexPubkey.slice(0, 20));
      return null;
    }

    const npub = nip19.npubEncode(hexPubkey);
    console.log(`[NDK Conversion] Converted hex to npub: ${hexPubkey.slice(0, 20)}... → ${npub.slice(0, 20)}...`);
    return npub;
  } catch (error) {
    console.error('[NDK Conversion] Failed to convert hex to npub:', error);
    return null;
  }
}

/**
 * Convert nsec to hex private key
 * @param nsecKey - The nsec key to convert
 * @returns hex private key string or null if conversion fails
 */
export function nsecToHex(nsecKey: string): string | null {
  try {
    if (!nsecKey.startsWith('nsec')) {
      console.error('[NDK Conversion] Invalid nsec format');
      return null;
    }

    const decoded = nip19.decode(nsecKey);
    if (decoded.type !== 'nsec') {
      console.error('[NDK Conversion] Decoded type is not nsec:', decoded.type);
      return null;
    }

    const hexPrivateKey = decoded.data as string;
    console.log('[NDK Conversion] Successfully converted nsec to hex private key');
    return hexPrivateKey;
  } catch (error) {
    console.error('[NDK Conversion] Failed to convert nsec to hex:', error);
    return null;
  }
}

/**
 * Convert hex private key to nsec
 * @param hexPrivateKey - The hex private key to convert
 * @returns nsec string or null if conversion fails
 */
export function hexToNsec(hexPrivateKey: string): string | null {
  try {
    if (hexPrivateKey.startsWith('nsec')) {
      return hexPrivateKey; // Already nsec
    }

    if (hexPrivateKey.length !== 64 || !/^[0-9a-f]+$/i.test(hexPrivateKey)) {
      console.error('[NDK Conversion] Invalid hex private key format');
      return null;
    }

    const nsec = nip19.nsecEncode(hexPrivateKey);
    console.log('[NDK Conversion] Successfully converted hex to nsec');
    return nsec;
  } catch (error) {
    console.error('[NDK Conversion] Failed to convert hex to nsec:', error);
    return null;
  }
}

/**
 * Normalize a pubkey to hex format
 * Accepts either npub or hex and returns hex
 * @param pubkey - The pubkey in npub or hex format
 * @returns hex pubkey string or null if invalid
 */
export function normalizeToHex(pubkey: string): string | null {
  if (!pubkey) {
    return null;
  }

  if (pubkey.startsWith('npub')) {
    return npubToHex(pubkey);
  }

  // Check if it's already hex
  if (pubkey.length === 64 && /^[0-9a-f]+$/i.test(pubkey)) {
    return pubkey;
  }

  console.error('[NDK Conversion] Unable to normalize pubkey:', pubkey.slice(0, 20));
  return null;
}

/**
 * Normalize a pubkey to npub format
 * Accepts either npub or hex and returns npub
 * @param pubkey - The pubkey in npub or hex format
 * @returns npub string or null if invalid
 */
export function normalizeToNpub(pubkey: string): string | null {
  if (!pubkey) {
    return null;
  }

  if (pubkey.startsWith('npub')) {
    return pubkey;
  }

  // Try to convert hex to npub
  return hexToNpub(pubkey);
}

/**
 * Check if a string is a valid npub
 * @param str - The string to check
 * @returns true if valid npub
 */
export function isValidNpub(str: string): boolean {
  if (!str || !str.startsWith('npub')) {
    return false;
  }

  try {
    const decoded = nip19.decode(str);
    return decoded.type === 'npub';
  } catch {
    return false;
  }
}

/**
 * Check if a string is a valid hex pubkey
 * @param str - The string to check
 * @returns true if valid hex pubkey
 */
export function isValidHexPubkey(str: string): boolean {
  return str && str.length === 64 && /^[0-9a-f]+$/i.test(str);
}

/**
 * Check if a string is a valid nsec
 * @param str - The string to check
 * @returns true if valid nsec
 */
export function isValidNsec(str: string): boolean {
  if (!str || !str.startsWith('nsec')) {
    return false;
  }

  try {
    const decoded = nip19.decode(str);
    return decoded.type === 'nsec';
  } catch {
    return false;
  }
}