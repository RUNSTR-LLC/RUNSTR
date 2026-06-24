import { deriveWorkoutCardDisplay } from '../../src/components/social/workoutCardDisplay';
let failed = 0; const assert = (c: boolean, m: string) => { if (!c) { console.error('FAIL:', m); failed++; } };

// strength: only duration → duration is hero, no 0.00 KM
const s = deriveWorkoutCardDisplay({ activity_type: 'strength', distance_meters: null, duration_seconds: 2400, calories: 180, step_count: null }, 'km');
assert(s.useDurationHero === true, 'strength uses duration hero');
assert(s.useStepsHero === false, 'strength not steps hero');
assert(s.heroUnit !== 'KM', 'strength hero unit not KM');

// running unchanged: distance hero + pace
const r = deriveWorkoutCardDisplay({ activity_type: 'running', distance_meters: 5000, duration_seconds: 1500, calories: 300, step_count: null }, 'km');
assert(r.useDurationHero === false, 'running not duration hero');
assert(r.showPace === true, 'running shows pace');
assert(r.heroUnit === 'KM', 'running hero KM');

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
