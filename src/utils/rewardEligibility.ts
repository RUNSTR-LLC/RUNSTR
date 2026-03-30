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

/** Maximum plausible workout distance: 200km (ultramarathon) */
export const MAX_WORKOUT_DISTANCE_METERS = 200_000;
/** Maximum plausible workout duration: 24 hours */
export const MAX_WORKOUT_DURATION_SECONDS = 86_400;

/** Validate workout metrics are within plausible bounds */
export function isValidWorkoutMetrics(distanceMeters?: number, durationSeconds?: number): boolean {
  if (distanceMeters !== undefined && distanceMeters !== null) {
    if (!Number.isFinite(distanceMeters) || distanceMeters < 0 || distanceMeters > MAX_WORKOUT_DISTANCE_METERS) return false;
  }
  if (durationSeconds !== undefined && durationSeconds !== null) {
    if (!Number.isFinite(durationSeconds) || durationSeconds < 0 || durationSeconds > MAX_WORKOUT_DURATION_SECONDS) return false;
  }
  return true;
}
