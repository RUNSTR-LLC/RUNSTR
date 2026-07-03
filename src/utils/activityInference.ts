/**
 * Activity Type Inference Utility
 * Intelligently detects cardio activity type (running/walking/cycling) from workout metrics
 * Used when activity type is unknown or missing from imported workouts
 */

import type { WorkoutType } from '../types/workout';

// Speed thresholds in km/h for activity detection
const SPEED_THRESHOLDS = {
  // Walking is typically < 6.5 km/h (~4 mph)
  WALK_MAX: 6.5,
  // Running is typically 6.5-18 km/h (~4-11 mph)
  RUN_MAX: 18,
  // Cycling is typically > 15 km/h (~9 mph), but we use higher threshold
  // to avoid false positives from fast runners
  CYCLE_MIN: 18,
};

// Pace thresholds in seconds per km
const PACE_THRESHOLDS = {
  // Walking: > 9:14/km (slower than 6.5 km/h)
  WALK_MIN_PACE: 553, // seconds per km
  // Running: 3:20-9:14/km (6.5-18 km/h)
  RUN_MIN_PACE: 200, // seconds per km (3:20/km = very fast running)
  RUN_MAX_PACE: 553, // seconds per km (9:14/km = slow jogging)
  // Cycling: < 3:20/km (faster than 18 km/h)
  CYCLE_MAX_PACE: 200, // seconds per km
};

export interface ActivityInferenceInput {
  distance?: number; // in meters
  duration?: number; // in seconds
  pace?: number; // in seconds per km (if already calculated)
  speed?: number; // in km/h (if already calculated)
  steps?: number; // step count (indicates walking/running, not cycling)
  heartRate?: { avg?: number; max?: number };
  elevationGain?: number; // in meters (high elevation suggests hiking)
}

export interface ActivityInferenceResult {
  type: WorkoutType;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

/**
 * Infer activity type from workout metrics
 * Returns the most likely activity type with confidence level
 *
 * @param input - Workout metrics to analyze
 * @returns Inferred activity type, confidence, and reason
 */
export function inferActivityType(
  input: ActivityInferenceInput
): ActivityInferenceResult {
  const { distance, duration, pace, speed, steps, elevationGain } = input;

  // If we have no useful data, return 'other' with low confidence
  if (!distance && !duration && !pace && !speed && !steps) {
    return {
      type: 'other',
      confidence: 'low',
      reason: 'No distance, duration, or step data available',
    };
  }

  // Calculate speed if we have distance and duration
  let calculatedSpeed: number | undefined;
  if (distance && duration && duration > 0) {
    // Convert m/s to km/h
    calculatedSpeed = (distance / duration) * 3.6;
  }

  // Use provided speed or calculated speed
  const effectiveSpeed = speed ?? calculatedSpeed;

  // Calculate pace if we have distance and duration
  let calculatedPace: number | undefined;
  if (distance && duration && distance > 0) {
    // seconds per km
    calculatedPace = (duration / distance) * 1000;
  }

  // Use provided pace or calculated pace
  const effectivePace = pace ?? calculatedPace;

  // If we have steps but no distance, it's likely walking or running
  if (steps && steps > 0 && !distance) {
    // Rough heuristic: typical steps per minute
    // Walking: ~100-120 steps/min, Running: ~150-180 steps/min
    if (duration && duration > 0) {
      const stepsPerMinute = (steps / duration) * 60;
      if (stepsPerMinute < 140) {
        return {
          type: 'walking',
          confidence: 'medium',
          reason: `Step cadence (${Math.round(stepsPerMinute)}/min) suggests walking`,
        };
      } else {
        return {
          type: 'running',
          confidence: 'medium',
          reason: `Step cadence (${Math.round(stepsPerMinute)}/min) suggests running`,
        };
      }
    }
    // Steps without duration - assume walking as safer default
    return {
      type: 'walking',
      confidence: 'low',
      reason: 'Has step data, defaulting to walking',
    };
  }

  // Check for hiking (significant elevation gain relative to distance)
  if (elevationGain && distance && distance > 0) {
    const elevationRatio = elevationGain / (distance / 1000); // meters gained per km
    // Hiking typically has > 50m elevation gain per km
    if (elevationRatio > 50 && effectiveSpeed && effectiveSpeed < 6) {
      return {
        type: 'hiking',
        confidence: 'high',
        reason: `High elevation gain (${Math.round(elevationRatio)}m/km) with slow pace`,
      };
    }
  }

  // Primary detection: use speed/pace
  if (effectiveSpeed !== undefined) {
    if (effectiveSpeed >= SPEED_THRESHOLDS.CYCLE_MIN) {
      return {
        type: 'cycling',
        confidence: 'high',
        reason: `Speed (${effectiveSpeed.toFixed(1)} km/h) indicates cycling`,
      };
    } else if (effectiveSpeed >= SPEED_THRESHOLDS.WALK_MAX) {
      return {
        type: 'running',
        confidence: 'high',
        reason: `Speed (${effectiveSpeed.toFixed(1)} km/h) indicates running`,
      };
    } else if (effectiveSpeed > 0) {
      return {
        type: 'walking',
        confidence: 'high',
        reason: `Speed (${effectiveSpeed.toFixed(1)} km/h) indicates walking`,
      };
    }
  }

  // Alternative: use pace if speed calculation failed
  if (effectivePace !== undefined && effectivePace > 0) {
    if (effectivePace < PACE_THRESHOLDS.CYCLE_MAX_PACE) {
      return {
        type: 'cycling',
        confidence: 'high',
        reason: `Pace (${formatPace(effectivePace)}/km) indicates cycling`,
      };
    } else if (effectivePace <= PACE_THRESHOLDS.RUN_MAX_PACE) {
      return {
        type: 'running',
        confidence: 'high',
        reason: `Pace (${formatPace(effectivePace)}/km) indicates running`,
      };
    } else {
      return {
        type: 'walking',
        confidence: 'high',
        reason: `Pace (${formatPace(effectivePace)}/km) indicates walking`,
      };
    }
  }

  // If we have distance but couldn't calculate speed (duration might be 0 or missing)
  if (distance && distance > 0) {
    // Long distance without speed info - assume running as reasonable default
    if (distance >= 1000) {
      return {
        type: 'running',
        confidence: 'low',
        reason: 'Has distance data, defaulting to running',
      };
    }
    return {
      type: 'walking',
      confidence: 'low',
      reason: 'Short distance, defaulting to walking',
    };
  }

  // Duration only - could be anything
  if (duration && duration > 0) {
    return {
      type: 'running',
      confidence: 'low',
      reason: 'Duration only, defaulting to running',
    };
  }

  // Fallback - should rarely reach here
  return {
    type: 'other',
    confidence: 'low',
    reason: 'Could not determine activity type from available data',
  };
}

/**
 * Simple wrapper that just returns the inferred type
 * Use this when you don't need confidence/reason info
 */
export function inferActivityTypeSimple(
  input: ActivityInferenceInput
): WorkoutType {
  return inferActivityType(input).type;
}

// Speed at/above which a "walking" label is clearly wrong and the session is a run.
// Deliberately higher than WALK_MAX (6.5) so genuine brisk/race walks stay walks —
// we only override when the source app or Health Connect obviously mislabeled a run.
const WALK_OVERRIDE_SPEED_KMH = 8.0;

/**
 * Correct a workout mislabeled as "walking" when its average speed clearly
 * indicates running. Source apps and Health Connect sometimes tag runs as
 * walks; when that happens we trust the measured speed over the label.
 *
 * Only ever promotes walking -> running (never the reverse), and only when
 * distance/duration are present and speed is unambiguously in running range.
 *
 * @param labeledType - The activity type from the source label or mapping
 * @param distanceMeters - Total distance in meters
 * @param durationSeconds - Duration in seconds
 * @returns 'running' if a walk label looks like a run, otherwise labeledType unchanged
 */
export function correctWalkingMislabel(
  labeledType: WorkoutType,
  distanceMeters?: number,
  durationSeconds?: number
): WorkoutType {
  if (labeledType !== 'walking') return labeledType;
  if (!distanceMeters || !durationSeconds || durationSeconds <= 0) {
    return labeledType;
  }
  const speedKmh = (distanceMeters / durationSeconds) * 3.6;
  return speedKmh >= WALK_OVERRIDE_SPEED_KMH ? 'running' : labeledType;
}

/**
 * Format pace as MM:SS string for logging
 */
function formatPace(secondsPerKm: number): string {
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Check if an activity type is a valid cardio type
 */
export function isValidCardioType(type: string | undefined | null): boolean {
  if (!type) return false;
  const cardioTypes = ['running', 'walking', 'cycling', 'hiking'];
  return cardioTypes.includes(type.toLowerCase());
}

/**
 * Normalize activity type string to standard format
 * Maps common variations to canonical types
 */
export function normalizeActivityType(type: string): WorkoutType {
  const normalized = type.toLowerCase().trim();

  // Running variations
  if (
    normalized === 'run' ||
    normalized === 'running' ||
    normalized === 'jogging' ||
    normalized === 'jog'
  ) {
    return 'running';
  }

  // Walking variations
  if (normalized === 'walk' || normalized === 'walking') {
    return 'walking';
  }

  // Cycling variations
  if (
    normalized === 'cycle' ||
    normalized === 'cycling' ||
    normalized === 'bike' ||
    normalized === 'biking'
  ) {
    return 'cycling';
  }

  // Hiking variations
  if (normalized === 'hike' || normalized === 'hiking') {
    return 'hiking';
  }

  // Strength/gym variations
  if (
    normalized === 'strength' ||
    normalized === 'strength_training' ||
    normalized === 'gym' ||
    normalized === 'weightlifting' ||
    normalized === 'weights'
  ) {
    return 'strength_training';
  }

  // Meditation
  if (normalized === 'meditation' || normalized === 'meditate') {
    return 'meditation';
  }

  // Diet
  if (normalized === 'diet' || normalized === 'meal') {
    return 'diet';
  }

  // Return as-is if it's already a valid WorkoutType
  const validTypes: WorkoutType[] = [
    'running',
    'cycling',
    'walking',
    'gym',
    'other',
    'hiking',
    'strength_training',
    'strength',
    'meditation',
    'diet',
    'fasting',
  ];

  if (validTypes.includes(normalized as WorkoutType)) {
    return normalized as WorkoutType;
  }

  // Unknown type - will need inference
  return 'other';
}
