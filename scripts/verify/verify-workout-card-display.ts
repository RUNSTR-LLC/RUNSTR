/**
 * Verifies WorkoutPostCard's display rules for steps vs walking vs running.
 * Run: npx tsx scripts/verify/verify-workout-card-display.ts
 */
import { deriveWorkoutCardDisplay } from '../../src/components/social/workoutCardDisplay';
import type { WorkoutCardData } from '../../src/components/social/workoutCardDisplay';

let failures = 0;
const check = (name: string, cond: boolean) => {
  console.log(`${cond ? '✅' : '❌'} ${name}`);
  if (!cond) failures++;
};

// 1. Passive steps sync: type=walking, estimated distance, duration 0, steps.
//    -> steps hero, nothing else (no time/pace/distance/cal).
const stepsSync: WorkoutCardData = {
  activity_type: 'walking',
  distance_meters: 260, // rough estimate
  duration_seconds: 0,
  calories: 0,
  step_count: 8432,
};
const s = deriveWorkoutCardDisplay(stepsSync, 'km');
check('steps sync: steps is hero', s.useStepsHero && s.heroUnit === 'STEPS' && s.heroValue === 8432);
check('steps sync: no time', !s.showTime);
check('steps sync: no pace', !s.showPace);
check('steps sync: no steps stat (it is the hero)', !s.showStepsStat);
check('steps sync: no calories', !s.showCalories);

// 2. Real walking workout: type=walking, real distance + duration + steps.
//    -> distance hero, TIME + STEPS, NO pace.
const walk: WorkoutCardData = {
  activity_type: 'walking',
  distance_meters: 3200,
  duration_seconds: 2400,
  calories: 180,
  step_count: 4100,
};
const w = deriveWorkoutCardDisplay(walk, 'km');
check('walk: distance is hero', !w.useStepsHero && w.heroUnit === 'KM');
check('walk: shows time', w.showTime);
check('walk: NO pace', !w.showPace);
check('walk: shows steps stat', w.showStepsStat);
check('walk: shows calories', w.showCalories);

// 3. The garbage case from the feed: walk, tiny distance, long duration.
//    -> still no nonsense pace.
const garbage: WorkoutCardData = {
  activity_type: 'walking',
  distance_meters: 260,
  duration_seconds: 4480, // 74:40
  calories: 0,
  step_count: 0,
};
const g = deriveWorkoutCardDisplay(garbage, 'km');
check('garbage walk: NO pace (was 283:57/km)', !g.showPace);
check('garbage walk: shows time', g.showTime);

// 4. Running: unchanged — distance hero, time + pace.
const run: WorkoutCardData = {
  activity_type: 'running',
  distance_meters: 5200,
  duration_seconds: 1800,
  calories: 320,
  step_count: 0,
};
const r = deriveWorkoutCardDisplay(run, 'km');
check('run: distance hero', !r.useStepsHero);
check('run: shows time', r.showTime);
check('run: shows pace', r.showPace);
check('run: no steps stat', !r.showStepsStat);

console.log(failures === 0 ? '\n✅ All display rules correct' : `\n❌ ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
