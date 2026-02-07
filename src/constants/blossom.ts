/**
 * Blossom Constants - Configuration for Blossom server integration
 */

import type { BlossomServer } from '../types/blossom';

/**
 * Default Blossom servers to check for user media
 * These are well-known public Blossom servers
 */
export const DEFAULT_BLOSSOM_SERVERS: BlossomServer[] = [
  { url: 'https://blossom.band', name: 'Blossom.Band', isDefault: true },
  { url: 'https://blossom.primal.net', name: 'Blossom.Primal', isDefault: true },
];

/**
 * AsyncStorage keys for Blossom data
 */
export const BLOSSOM_STORAGE_KEYS = {
  SERVERS: '@runstr:blossom_servers',
  LAST_SYNC: '@runstr:blossom_last_sync',
  TRACKS_CACHE: '@runstr:blossom_tracks_cache',
};

/**
 * Cache TTLs for Blossom data (in milliseconds)
 */
export const BLOSSOM_CACHE_TTL = {
  TRACKS: 10 * 60 * 1000, // 10 minutes for track list
  CONNECTION_TEST: 5 * 60 * 1000, // 5 minutes for connection status
};

/**
 * API request timeouts (in milliseconds)
 */
export const BLOSSOM_TIMEOUTS = {
  LIST: 15000, // 15 seconds for listing blobs
  AUTH: 5000, // 5 seconds for auth check
  CONNECTION_TEST: 5000, // 5 seconds for testing connection
};

/**
 * Kind 24242 event type for Blossom authentication
 * Different from Wavlake's NIP-98 (kind 27235)
 */
export const BLOSSOM_AUTH_KIND = 24242;

/**
 * Auth event expiration time (in seconds)
 */
export const BLOSSOM_AUTH_EXPIRATION = 3600; // 1 hour
