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
  // Simplification visibility flags.
  // Every flag means "is this visible". `false` = hidden, code stays compiled.
  // NOTE: hiding stops UI access only; a hidden feature's background behavior
  // may still run. That is intentional.
  // ---------------------------------------------------------------------------
  /** Fitness Clubs / Teams: club pages, team chat, captain tools, club affiliations. */
  teams: false,
  /** Captain/user-created events and the Compete hub. */
  customEvents: false,
  /** Season 2 / Season 3 / Einundzwanzig competitions and banners. */
  seasons: false,

  // --- Phase 1 (2026-09-18): Nostr-native running tracker ---
  /** Social tab: the workout feed. */
  social: false,
  /** Leaderboard tab: daily always-on competitions. */
  leaderboard: false,
  /** Level badge, level ring, and the LevelDetail screen. */
  level: false,
  /** Earnings badge and the Rewards screen. */
  earnings: false,
  /** Activity selector bar. When false the tracker is pinned to running. */
  activitySelector: false,
  /** Steps hero on the stats card. Counter services keep running regardless. */
  stepTracking: false,
  /** Cloud export/import button on the workout history screen. */
  cloudBackupButton: false,
  /** Wallet section in Settings. */
  walletSettings: false,
  /** Private-mode toggle. Private is implicit now: nothing posts unless shared. */
  privateMode: false,
  /** Share sheet on a finished workout. When false, the 1301 note is the default. */
  shareSheet: false,
  /** Journal entries and habit check-ins in the history timeline. */
  journalHabits: false,
  /** Non-running workouts in history. Collection is unaffected — display only. */
  nonRunningHistory: false,
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
