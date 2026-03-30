/**
 * Reward Eligibility Utilities
 *
 * Pure functions for checking reward qualification.
 * Extracted to avoid circular dependencies between service files.
 */

// Cardio-only subset used for boosted subscriber rewards (1000 rewards)
const CARDIO_ACTIVITY_TYPES = ['running', 'walking', 'cycling', 'hiking'];

/**
 * Check if a workout qualifies for boosted subscriber rewards (1000 rewards)
 * Requirements: cardio activity, non-manual source
 */
export function isBoostedQualified(
  activityType: string,
  source: string,
): boolean {
  const isCardio = CARDIO_ACTIVITY_TYPES.includes(activityType);
  const isNonManual = source !== 'manual_entry';
  return isCardio && isNonManual;
}
