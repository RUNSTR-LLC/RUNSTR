/**
 * Cache TTL and key for the one cached relay read: the user's kind 0 profile.
 * Values are in milliseconds.
 */

const HOUR = 60 * 60 * 1000;

export const CacheTTL = {
  /**
   * kind 0 profile. It is refetched from relays on every launch; the TTL only
   * decides how long the last copy is kept to show while that fetch runs.
   * Long on purpose: at 24h the copy was gone after a day away and startup
   * fell back to a placeholder user.
   */
  USER_PROFILE: 30 * 24 * HOUR,
} as const;

export const CacheKeys = {
  USER_PROFILE: (pubkey: string) => `user_profile_${pubkey}`,
} as const;
