/**
 * Verifies the strength / resistance branch of the workout card display, plus
 * the content-parsing fallback that recovers sets/reps from a note body when
 * the structured columns are empty (Amethyst / Mi Fitness case).
 * Run: npx tsx scripts/verify/verify-strength-card.ts
 */
import { deriveWorkoutCardDisplay } from '../../src/components/social/workoutCardDisplay';
import type { WorkoutCardData } from '../../src/components/social/workoutCardDisplay';
import { normalizeNetworkRow, parseStrengthFromContent } from '../../src/types/feedWorkout';

let failures = 0;
const check = (name: string, cond: boolean) => {
  console.log(`${cond ? '✅' : '❌'} ${name}`);
  if (!cond) failures++;
};

// 1. The real bug from the screenshot: a weight_training note whose sets/reps
//    live only in the body. After parsing it has sets=29, reps=221. The card
//    must lead with SETS, show REPS/CAL/BPM, and NEVER show time.
const amethyst: WorkoutCardData = {
  activity_type: 'weight_training',
  exercise: 'strength',
  distance_meters: null,
  duration_seconds: 4444,
  calories: 273,
  step_count: 237,
  sets: 29,
  reps: 221,
  weight_kg: null,
  avg_heart_rate: 100,
};
const a = deriveWorkoutCardDisplay(amethyst, 'km');
check('amethyst: detected as strength', a.isStrength);
check('amethyst: SETS is the hero (29), not time', a.useSetsHero && a.heroUnit === 'SETS' && a.heroValue === 29);
check('amethyst: does NOT show time', !a.showTime && !a.useDurationHero);
check('amethyst: shows reps', a.showReps);
check('amethyst: shows calories', a.showCalories);
check('amethyst: shows heart rate', a.showHeartRate);
check('amethyst: no steps stat / no pace', !a.showStepsStat && !a.showPace);

// 2. Content-parsing fallback: structured columns null, sets/reps only in body.
const parsed = parseStrengthFromContent('BP heavy\n1:13:36\n29 Sets\n7 Tons\n221 Reps\nBench 30 kg × 5 reps');
check('parse: sets=29 from body', parsed.sets === 29);
check('parse: reps=221 from body (summary, not the per-set "5 reps")', parsed.reps === 221);
check('parse: empty body → nulls', parseStrengthFromContent(undefined).sets === null);

const normalized = normalizeNetworkRow({
  event_id: 'e1', npub: 'n1', activity_type: 'weight_training',
  sets: null, reps: null, weight_kg: null, duration_seconds: 4444, calories: 273, steps: 237,
  avg_heart_rate: 100, event_created_at: '2026-06-26T00:00:00Z',
  raw_event: { content: '#workout\n29 Sets\n221 Reps\nBench 30 kg × 5 reps' },
});
check('normalize: recovers sets=29 from raw_event body', normalized.sets === 29);
check('normalize: recovers reps=221 from raw_event body', normalized.reps === 221);
check('normalize: keeps full note body in content for tap-to-expand',
  normalized.content === '#workout\n29 Sets\n221 Reps\nBench 30 kg × 5 reps');

// 3. POWR-style strength with structured sets/reps/weight, no duration.
const powr: WorkoutCardData = {
  activity_type: 'strength', exercise: 'strength',
  distance_meters: null, duration_seconds: null, calories: 200, step_count: null,
  sets: 12, reps: 96, weight_kg: 60, avg_heart_rate: null,
};
const p = deriveWorkoutCardDisplay(powr, 'km');
check('powr: SETS hero', p.useSetsHero && p.heroValue === 12);
check('powr: shows reps + weight + calories', p.showReps && p.showWeight && p.showCalories);
check('powr: no time', !p.showTime && !p.useDurationHero);

// 4. Sparse strength (only duration + calories): leads with calories, NOT time.
const sparse: WorkoutCardData = {
  activity_type: 'strength', distance_meters: null, duration_seconds: 2400,
  calories: 180, step_count: null, sets: null, reps: null, weight_kg: null,
};
const s = deriveWorkoutCardDisplay(sparse, 'km');
check('sparse strength: calories hero, not time', s.heroUnit === 'CAL' && !s.useDurationHero);
check('sparse strength: never a distance hero', s.heroUnit !== 'KM');
check('sparse strength: no time stat', !s.showTime);

// 5. Regression: a plain run is untouched by the strength branch.
const run: WorkoutCardData = {
  activity_type: 'running', distance_meters: 5200, duration_seconds: 1800, calories: 320, step_count: null,
};
const r = deriveWorkoutCardDisplay(run, 'km');
check('run: not strength, distance hero + pace + time', !r.isStrength && r.heroUnit === 'KM' && r.showPace && r.showTime);

console.log(failures === 0 ? '\n✅ All strength-card rules correct' : `\n❌ ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
