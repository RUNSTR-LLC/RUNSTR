/**
 * Pure display logic for WorkoutPostCard — kept free of React Native imports so
 * it can be unit-tested directly (and reused without pulling in the view).
 */

export interface WorkoutCardData {
  activity_type: string;
  distance_meters: number | null;
  duration_seconds: number | null;
  calories: number | null;
  step_count?: number | null;
}

export interface WorkoutCardDisplay {
  isStepsOnly: boolean;
  useStepsHero: boolean;
  useDurationHero: boolean;
  heroValue: number;
  heroUnit: string;
  heroDecimals: number;
  showTime: boolean;
  showPace: boolean;
  showStepsStat: boolean;
  showCalories: boolean;
}

/**
 * Decide what a workout post card shows, by activity type and available data.
 *
 * - Steps post (a step count with no duration — passive daily sync): show just
 *   the step count. Its distance is a rough estimate and there's no real time.
 * - Walking workout (has a duration): show distance + steps + time, but never
 *   pace — a walk's distance is unreliable, so pace is noise (e.g. 283:57/km).
 * - Running / cycling / hiking: distance hero + time + pace, as before.
 */
export function deriveWorkoutCardDisplay(
  workout: WorkoutCardData,
  unit: 'km' | 'mi'
): WorkoutCardDisplay {
  const activityType = (workout.activity_type || '').toLowerCase();
  const isWalking = activityType === 'walking' || activityType === 'steps';

  const hasDistance = !!workout.distance_meters && workout.distance_meters > 0;
  const hasDuration = !!workout.duration_seconds && workout.duration_seconds > 0;
  const hasSteps = !!workout.step_count && workout.step_count > 0;
  const hasCalories = !!workout.calories && workout.calories > 0;

  const isStepsOnly = hasSteps && !hasDuration;

  // Hero: step count for a steps post (or a walk with no usable distance),
  // otherwise the distance.
  const useStepsHero = isStepsOnly || (isWalking && !hasDistance && hasSteps);
  // Non-distance, non-steps activity (e.g. strength) with a duration: time is the hero.
  const useDurationHero = !useStepsHero && !hasDistance && !hasSteps && hasDuration;
  const heroValue = useStepsHero
    ? workout.step_count ?? 0
    : useDurationHero
      ? workout.duration_seconds ?? 0
      : (unit === 'mi' ? (workout.distance_meters ?? 0) / 1609.344 : (workout.distance_meters ?? 0) / 1000);
  const heroUnit = useStepsHero ? 'STEPS' : useDurationHero ? 'TIME' : unit.toUpperCase();
  const heroDecimals = useStepsHero || useDurationHero ? 0 : 2;

  const showPace = hasDistance && hasDuration && !isWalking && !isStepsOnly;
  const showTime = hasDuration && !isStepsOnly && !useDurationHero;
  // Steps as a secondary stat on walking workouts (but not when the step count
  // is already the hero number).
  const showStepsStat = hasSteps && isWalking && !useStepsHero;
  const showCalories = hasCalories && !isStepsOnly;

  return {
    isStepsOnly,
    useStepsHero,
    useDurationHero,
    heroValue,
    heroUnit,
    heroDecimals,
    showTime,
    showPace,
    showStepsStat,
    showCalories,
  };
}
