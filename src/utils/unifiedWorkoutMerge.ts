/**
 * Unified Workout Merge Utility
 * Merges local workouts with health app workouts (HealthKit/Health Connect)
 * Handles deduplication to avoid showing the same workout twice
 */

import type { LocalWorkout } from '../services/fitness/LocalWorkoutStorageService';
import type { Workout } from '../types/workout';

export interface MergeResult {
  workouts: Workout[];
  duplicatesRemoved: number;
  localCount: number;
  healthCount: number;
}

/**
 * Check if two workouts are duplicates using fuzzy matching
 * Matches by: same start time (within 5 minutes) + same type + similar duration OR distance
 * Wide time window catches simultaneous multi-app tracking (e.g., RUNSTR GPS + Nike Run Club)
 */
function isDuplicateByFuzzyMatch(
  healthWorkout: Workout,
  localWorkouts: LocalWorkout[]
): boolean {
  const healthStart = new Date(healthWorkout.startTime).getTime();
  const TIME_WINDOW_MS = 300 * 1000; // 5 minute tolerance for multi-app tracking
  const DURATION_TOLERANCE_S = 10; // 10 second tolerance
  const DISTANCE_TOLERANCE_RATIO = 0.2; // 20% distance tolerance

  return localWorkouts.some((local) => {
    const localStart = new Date(local.startTime).getTime();
    const timeDiff = Math.abs(healthStart - localStart);

    // Must be same type and within time window
    if (timeDiff > TIME_WINDOW_MS || healthWorkout.type !== local.type) {
      return false;
    }

    const durationDiff = Math.abs(
      (healthWorkout.duration || 0) - (local.duration || 0)
    );

    // Match by duration (tight tolerance)
    if (durationDiff <= DURATION_TOLERANCE_S) {
      return true;
    }

    // Match by distance (within 20%) - catches multi-app tracking with time drift
    const healthDist = healthWorkout.distance || 0;
    const localDist = local.distance || 0;
    if (healthDist > 0 && localDist > 0) {
      const maxDist = Math.max(healthDist, localDist);
      const distDiff = Math.abs(healthDist - localDist);
      if (distDiff / maxDist <= DISTANCE_TOLERANCE_RATIO) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Convert LocalWorkout to Workout interface for unified display
 * Preserves all enriched data (splits, savedCard, weather, etc.) for detail view
 */
export function localToWorkout(local: LocalWorkout, userId: string): Workout {
  return {
    id: local.id,
    userId: userId,
    type: local.type,
    source: local.source as Workout['source'],
    duration: local.duration,
    distance: local.distance,
    calories: local.calories,
    startTime: local.startTime,
    endTime: local.endTime,
    syncedAt: local.syncedAt || new Date().toISOString(),
    pace: local.pace,
    // GPS tracking fields
    splits: local.splits,
    elevation: local.elevation,
    speed: local.speed,
    raceDistance: local.raceDistance,
    steps: local.steps,
    // Route fields
    routeId: local.routeId,
    routeLabel: local.routeLabel,
    // Saved card for sharing
    savedCard: local.savedCard,
    // Weather
    weather: local.weather,
    // Strength training fields
    sets: local.sets,
    reps: local.reps,
    weight: local.weight,
    weightsPerSet: local.weightsPerSet,
    exerciseType: local.exerciseType,
    repsBreakdown: local.repsBreakdown,
    // Meditation fields
    meditationType: local.meditationType,
    // Diet fields
    mealType: local.mealType,
    mealSize: local.mealSize,
    // Notes
    notes: local.notes,
    // Fitness test fields
    fitnessTestScore: local.fitnessTestScore,
    fitnessTestGrade: local.fitnessTestGrade,
    fitnessTestComponents: local.fitnessTestComponents,
    // Metadata
    metadata: {
      isLocal: true,
      originalSource: local.source,
      nostrEventId: local.nostrEventId,
      syncedToNostr: local.syncedToNostr,
    },
  };
}

/**
 * Merge local workouts with health app workouts, removing duplicates
 *
 * Deduplication strategy:
 * 1. Local workouts with source='healthkit' or 'health_connect' were previously imported
 *    - These should NOT show duplicate health app entries
 * 2. Check exact ID match (healthkit UUID or health_connect ID)
 * 3. Check fuzzy match: same start time (1 min) + type + duration (10s)
 *
 * @param localWorkouts - Workouts from LocalWorkoutStorageService
 * @param healthWorkouts - Workouts from HealthKit or Health Connect
 * @param userId - Current user ID
 * @returns Merged, deduplicated, sorted workout list
 */
export function mergeWorkoutsWithDeduplication(
  localWorkouts: LocalWorkout[],
  healthWorkouts: Workout[],
  userId: string
): MergeResult {
  // Build a set of IDs from local workouts that came from health apps
  const importedHealthIds = new Set<string>();
  localWorkouts.forEach((w) => {
    if (w.source === 'healthkit' || w.source === 'health_connect') {
      importedHealthIds.add(w.id);
    }
  });

  // Filter out health workouts that are already in local storage
  const uniqueHealthWorkouts = healthWorkouts.filter((hw) => {
    // Check exact ID match
    if (importedHealthIds.has(hw.id)) {
      return false;
    }

    // Check fuzzy match (time + type + duration)
    if (isDuplicateByFuzzyMatch(hw, localWorkouts)) {
      return false;
    }

    return true;
  });

  const duplicatesRemoved = healthWorkouts.length - uniqueHealthWorkouts.length;

  // Convert local workouts to Workout format
  const convertedLocalWorkouts = localWorkouts.map((w) =>
    localToWorkout(w, userId)
  );

  // Merge and sort by startTime (newest first)
  const merged = [...convertedLocalWorkouts, ...uniqueHealthWorkouts].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );

  return {
    workouts: merged,
    duplicatesRemoved,
    localCount: localWorkouts.length,
    healthCount: uniqueHealthWorkouts.length,
  };
}
