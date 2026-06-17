/**
 * Verifies the batched feed→workout matcher (closest-within-window, per author).
 * Run: npx tsx scripts/verify/verify-matched-workout-batch.ts
 */
import { matchBatchRows, TIME_WINDOW_SECONDS } from '../../src/hooks/matchWorkoutPosts';

let failures = 0;
const check = (name: string, cond: boolean) => {
  console.log(`${cond ? '✅' : '❌'} ${name}`);
  if (!cond) failures++;
};

const t0 = new Date('2026-06-17T12:00:00Z').getTime();
const at = (offsetSec: number) => new Date(t0 + offsetSec * 1000).toISOString();

const posts = [
  { id: 'p1', npub: 'alice', created_at: at(0) },     // matches alice's close run
  { id: 'p2', npub: 'bob', created_at: at(0) },       // bob has a workout just outside window
  { id: 'p3', npub: 'carol', created_at: at(0) },     // carol has none
  { id: 'p4', npub: 'alice', created_at: at(7200) },  // 2h later — alice's second run
];

const rows = [
  { npub: 'alice', activity_type: 'running', distance_meters: 5000, duration_seconds: 1500, calories: 300, step_count: 0, created_at: at(120) },   // +2min from p1
  { npub: 'alice', activity_type: 'running', distance_meters: 8000, duration_seconds: 2400, calories: 480, step_count: 0, created_at: at(1800) },  // +30min from p1 (farther)
  { npub: 'alice', activity_type: 'walking', distance_meters: 2000, duration_seconds: 1200, calories: 90, step_count: 2600, created_at: at(7260) },// +1min from p4
  { npub: 'bob', activity_type: 'cycling', distance_meters: 12000, duration_seconds: 2000, calories: 250, step_count: 0, created_at: at(4000) },   // +66min from p2 -> OUT of window
];

const m = matchBatchRows(posts, rows);

// p1 → alice's closest run (+2min, the 5000m one), NOT the +30min 8000m one
const p1 = m.get('p1');
check('p1 matched alice closest run (5000m)', !!p1 && p1.distance_meters === 5000);
check('p1 stripped npub/created_at', !!p1 && !('npub' in p1) && !('created_at' in p1));

// p2 → bob's workout is 66min away, outside ±60min → no match
check('p2 no match (bob workout outside window)', m.get('p2') === null);

// p3 → carol has no rows → null
check('p3 no match (carol has none)', m.get('p3') === null);

// p4 → alice's walk (+1min), not either of her runs
const p4 = m.get('p4');
check('p4 matched alice walk (2000m, 2600 steps)', !!p4 && p4.distance_meters === 2000 && p4.step_count === 2600);

// Every post resolved (no missing keys)
check('all posts resolved', posts.every((p) => m.has(p.id)));

// Window constant sanity
check('window is 60 minutes', TIME_WINDOW_SECONDS === 3600);

console.log(failures === 0 ? '\n✅ Matcher correct' : `\n❌ ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
