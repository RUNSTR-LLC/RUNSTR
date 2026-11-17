/**
 * Cache TTL and key for the one cached relay read: the user's kind 0 profile.
 * Values are in milliseconds.
 */

const HOUR = 60 * 60 * 1000;

export const CacheTTL = {
  /** kind 0 profile — changes only when the user edits it */
  USER_PROFILE: 24 * HOUR,
} as const;

export const CacheKeys = {
  USER_PROFILE: (pubkey: string) => `user_profile_${pubkey}`,
} as const;
