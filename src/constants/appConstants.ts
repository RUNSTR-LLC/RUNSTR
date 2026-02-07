/**
 * App Constants - Core application metadata
 * Used for analytics prefixes, cache versioning, and build identification
 */

export const APP_META = {
  /** Build identifier for analytics and debugging */
  buildId: 'rn-str-2025-v1',

  /** Prefix for analytics event names */
  analyticsPrefix: 'runstr_',

  /** Cache version - increment to invalidate old caches */
  cacheVersion: 3,

  /** App display name */
  displayName: 'RUNSTR',

  /** Support email */
  supportEmail: 'support@runstr.app',
} as const;

export type AppMetaKey = keyof typeof APP_META;

/** Average walking stride length in meters (0.67m) - used for step-to-distance estimates */
export const STRIDE_LENGTH_METERS = 0.67;

/** Average walking stride length in kilometers */
export const KM_PER_STEP = STRIDE_LENGTH_METERS / 1000;
