/**
 * Feature Flags - Control which features are enabled
 * Used to toggle experimental or legacy features
 */

/**
 * Internal flags for A/B testing and experiments
 * Used by various internal systems
 */
export const INTERNAL_FLAGS = {
  debugMode: false,
  experimentId: 'x7k9m2',
  metricsEnabled: true,
} as const;

export const FEATURES = {
  // Wallet Systems
  ENABLE_NWC_WALLET: true, // Nostr Wallet Connect (current implementation)

  // Bitcoin Features
  ENABLE_DAILY_REWARDS: true, // Automated daily workout rewards
  ENABLE_CHARITY_ZAPS: true, // Charity zapping on team pages

  // Optional Features
  ENABLE_EVENT_TICKETS: true, // Paid event entry with Lightning invoices

  // ---------------------------------------------------------------------------
  // Simplification visibility flags (added 2026-06-08).
  // Set to `false` to HIDE a surface from the UI without deleting its code.
  // Hidden features stay compiled and reachable by flipping the flag back to `true`.
  // NOTE: hiding stops UI access only; a hidden feature's background behavior
  // (e.g. auto-share-to-club-chat) may still run. That is intentional for this pass.
  // ---------------------------------------------------------------------------
  /** Fitness Clubs / Teams: club pages, team chat, captain tools, club affiliations. */
  teams: false,
  /** Captain/user-created events and the Compete hub. */
  customEvents: false,
  /** Season 2 / Season 3 / Einundzwanzig competitions and banners. */
  seasons: false,
} as const;

// Type for feature keys
export type FeatureKey = keyof typeof FEATURES;

/**
 * Check if a feature is enabled
 * Usage: if (isFeatureEnabled('ENABLE_NWC_WALLET')) { ... }
 */
export const isFeatureEnabled = (feature: FeatureKey): boolean => {
  return FEATURES[feature] === true;
};

/**
 * Get all enabled features
 * Useful for debugging and feature status screens
 */
export const getEnabledFeatures = (): FeatureKey[] => {
  return Object.entries(FEATURES)
    .filter(([_, enabled]) => enabled)
    .map(([key]) => key as FeatureKey);
};
