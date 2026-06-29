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
  // Strength / resistance metrics (present on cross-Nostr 1301 rows only).
  sets?: number | null;
  reps?: number | null;
  weight_kg?: number | null;
  avg_heart_rate?: number | null;
  exercise?: string | null; // 1301 `exercise` tag, e.g. 'strength'
}

export interface WorkoutCardDisplay {
  isStepsOnly: boolean;
  isStrength: boolean;
  useStepsHero: boolean;
  useDurationHero: boolean;
  useSetsHero: boolean;
  heroValue: number;
  heroUnit: string;
  heroDecimals: number;
  showTime: boolean;
  showPace: boolean;
  showStepsStat: boolean;
  showCalories: boolean;
  showSets: boolean;
  showReps: boolean;
  showWeight: boolean;
  showHeartRate: boolean;
}

const STRENGTH_TYPES = new Set([
  'strength', 'weight_training', 'weightlifting', 'weights', 'resistance', 'gym',
]);

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
  const hasSets = !!workout.sets && workout.sets > 0;
  const hasReps = !!workout.reps && workout.reps > 0;
  const hasWeight = !!workout.weight_kg && workout.weight_kg > 0;
  const hasHeartRate = !!workout.avg_heart_rate && workout.avg_heart_rate > 0;

  // A strength / resistance workout — typically a cross-Nostr 1301 from another
  // client (POWR, Amethyst). It has no meaningful distance; its stats are
  // sets / reps / weight / time, and any step count is incidental. Detected by
  // activity type, the 1301 `exercise` tag, or the presence of strength metrics.
  const isStrength =
    STRENGTH_TYPES.has(activityType) ||
    (workout.exercise || '').toLowerCase() === 'strength' ||
    hasSets || hasReps || hasWeight;

  // Steps-only is a passive sync (steps, no duration). Strength rows that
  // happen to carry a step count are not "steps-only".
  const isStepsOnly = !isStrength && hasSteps && !hasDuration;

  // ---- Hero selection ----
  let heroValue: number;
  let heroUnit: string;
  let heroDecimals: number;
  let useStepsHero = false;
  let useDurationHero = false;
  let useSetsHero = false;

  if (isStrength) {
    // Lead a strength card with the lifting stats (sets/reps/weight), then
    // calories. Distance is never used (it would render a bogus 0.00 KM), and
    // time is never the headline — it's only a last-resort hero so a sparse
    // note isn't blank, and it's never shown as a secondary stat here.
    if (hasSets) {
      useSetsHero = true;
      heroValue = workout.sets ?? 0;
      heroUnit = 'SETS';
    } else if (hasReps) {
      heroValue = workout.reps ?? 0;
      heroUnit = 'REPS';
    } else if (hasWeight) {
      heroValue = workout.weight_kg ?? 0;
      heroUnit = 'KG';
    } else if (hasCalories) {
      heroValue = workout.calories ?? 0;
      heroUnit = 'CAL';
    } else if (hasDuration) {
      useDurationHero = true;
      heroValue = workout.duration_seconds ?? 0;
      heroUnit = 'TIME';
    } else {
      heroValue = 0;
      heroUnit = '';
    }
    heroDecimals = 0;
  } else {
    // Hero: step count for a steps post (or a walk with no usable distance),
    // otherwise the distance — with a non-distance, non-steps activity that has
    // a duration (e.g. a generic timed workout) falling back to time.
    useStepsHero = isStepsOnly || (isWalking && !hasDistance && hasSteps);
    useDurationHero = !useStepsHero && !hasDistance && !hasSteps && hasDuration;
    heroValue = useStepsHero
      ? workout.step_count ?? 0
      : useDurationHero
        ? workout.duration_seconds ?? 0
        : (unit === 'mi' ? (workout.distance_meters ?? 0) / 1609.344 : (workout.distance_meters ?? 0) / 1000);
    heroUnit = useStepsHero ? 'STEPS' : useDurationHero ? 'TIME' : unit.toUpperCase();
    heroDecimals = useStepsHero || useDurationHero ? 0 : 2;
  }

  const showPace = hasDistance && hasDuration && !isWalking && !isStepsOnly && !isStrength;
  // Time is never a secondary stat on a strength card (only a last-resort hero).
  const showTime = hasDuration && !isStepsOnly && !useDurationHero && !isStrength;
  // Steps as a secondary stat on walking workouts (but not when the step count
  // is already the hero number, and never on a strength card).
  const showStepsStat = !isStrength && hasSteps && isWalking && !useStepsHero;
  // Calories show unless they're the hero number (the strength fallback case).
  const showCalories = hasCalories && !isStepsOnly && heroUnit !== 'CAL';

  // Strength secondary stats — show what's present and isn't already the hero.
  const showSets = isStrength && hasSets && !useSetsHero;
  const showReps = isStrength && hasReps && heroUnit !== 'REPS';
  const showWeight = isStrength && hasWeight && heroUnit !== 'KG';
  // Heart rate fills out a sparse strength card, but cap the row at 4 cells.
  const strengthCells =
    (showSets ? 1 : 0) + (showReps ? 1 : 0) + (showWeight ? 1 : 0) + (showCalories ? 1 : 0);
  const showHeartRate = isStrength && hasHeartRate && strengthCells < 4;

  return {
    isStepsOnly,
    isStrength,
    useStepsHero,
    useDurationHero,
    useSetsHero,
    heroValue,
    heroUnit,
    heroDecimals,
    showTime,
    showPace,
    showStepsStat,
    showCalories,
    showSets,
    showReps,
    showWeight,
    showHeartRate,
  };
}
