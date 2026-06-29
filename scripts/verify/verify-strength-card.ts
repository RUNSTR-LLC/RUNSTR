/**
 * Verifies the strength / resistance branch of the workout card display, using
 * the real `network_workouts` row pulled from Amethyst (Mi Fitness) plus a
 * POWR-style row that carries structured sets/reps/weight.
 * Run: npx tsx scripts/verify/verify-strength-card.ts
 */
import { deriveWorkoutCardDisplay } from '../../src/components/social/workoutCardDisplay';
import type { WorkoutCardData } from '../../src/components/social/workoutCardDisplay';

let failures = 0;
const check = (name: string, cond: boolean) => {
  console.log(`${cond ? '✅' : '❌'} ${name}`);
  if (!cond) failures++;
};

// 1. The actual bug: weight_training with duration + steps + calories, no
//    distance and no structured sets/reps/weight (Amethyst / Mi Fitness).
//    Previously rendered "0.00 KM" because it has both steps and duration.
const amethyst: WorkoutCardData = {
  activity_type: 'weight_training',
  exercise: 'strength',
  distance_meters: null,
  duration_seconds: 4444,
  calories: 273,
  step_count: 237,
  sets: null,
  reps: null,
  weight_kg: null,
  avg_heart_rate: 100,
};
const a = deriveWorkoutCardDisplay(amethyst, 'km');
check('amethyst: detected as strength', a.isStrength);
check('amethyst: duration is hero (TIME), not 0.00 KM', a.useDurationHero && a.heroUnit === 'TIME');
check('amethyst: hero is NOT a distance unit', a.heroUnit !== 'KM' && a.heroUnit !== 'MI');
check('amethyst: no steps hero', !a.useStepsHero);
check('amethyst: no steps stat on a strength card', !a.showStepsStat);
check('amethyst: no pace', !a.showPace);
check('amethyst: shows calories', a.showCalories);
check('amethyst: shows heart rate', a.showHeartRate);

// 2. POWR-style strength: structured sets/reps/weight, no duration.
const powr: WorkoutCardData = {
  activity_type: 'strength',
  exercise: 'strength',
  distance_meters: null,
  duration_seconds: null,
  calories: 200,
  step_count: null,
  sets: 29,
  reps: 221,
  weight_kg: 60,
  avg_heart_rate: null,
};
const p = deriveWorkoutCardDisplay(powr, 'km');
check('powr: detected as strength', p.isStrength);
check('powr: sets is hero', p.useSetsHero && p.heroUnit === 'SETS' && p.heroValue === 29);
check('powr: shows reps', p.showReps);
check('powr: shows weight', p.showWeight);
check('powr: shows calories', p.showCalories);
check('powr: no distance/pace', !p.showPace);
check('powr: sets not double-shown as a stat (it is the hero)', !p.showSets);

// 3. Regression: a plain run is untouched by the strength branch.
const run: WorkoutCardData = {
  activity_type: 'running',
  distance_meters: 5200,
  duration_seconds: 1800,
  calories: 320,
  step_count: null,
};
const r = deriveWorkoutCardDisplay(run, 'km');
check('run: not strength', !r.isStrength);
check('run: distance hero + pace', r.heroUnit === 'KM' && r.showPace);

console.log(failures === 0 ? '\n✅ All strength-card rules correct' : `\n❌ ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
