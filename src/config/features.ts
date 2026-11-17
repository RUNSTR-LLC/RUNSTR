/**
 * Feature flags. Every flag means "is this visible"; `false` = hidden.
 *
 * Only flags that live code still reads belong here. The Phase 1 flags for
 * deleted features (social, teams, wallet, rewards, ...) are gone with them.
 */
export const FEATURES = {
  /** Steps hero on the stats card. */
  stepTracking: false,
  /** Non-running workouts in history and records. Health imports still collect them. */
  nonRunningHistory: false,
} as const;

export type FeatureKey = keyof typeof FEATURES;
