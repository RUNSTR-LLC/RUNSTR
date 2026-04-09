/**
 * Feature Flags - Control experimental/optional features
 * Centralized feature toggles for easy enable/disable
 */

export const FEATURE_FLAGS = {
  /**
   * HealthKit Integration (iOS)
   * When false: Hides HealthKit sync UI, permission prompts, and merge logic
   * Workouts come from Nostr 1301 events and local Activity Tracker only
   */
  ENABLE_HEALTHKIT: true,

  /**
   * Health Connect Integration (Android)
   * When false: Hides Health Connect sync UI, permission prompts, and merge logic
   * Workouts come from Nostr 1301 events and local Activity Tracker only
   */
  ENABLE_HEALTH_CONNECT: true,

  /**
   * Workout Merge Service
   * When false: Uses separate Public/Private tabs instead of merged view
   * Public = 1301 notes from Nostr, Private = Local Activity Tracker workouts
   */
  ENABLE_WORKOUT_MERGE: false,

  /**
   * Two-Tab Workouts
   * When true: Shows Public/Private workout tabs
   * When false: Shows unified workout history
   */
  TWO_TAB_WORKOUTS: true,

} as const;

export default FEATURE_FLAGS;
