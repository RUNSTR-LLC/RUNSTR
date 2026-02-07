/**
 * Verification script for EIN challenge step/GPS handling
 *
 * Simple formula: per day, use max(step_distance, gps_distance)
 * - Fair: never overcounts
 * - Simple: easy to understand
 */

interface MockWorkout {
  id: string;
  pubkey: string;
  distance: number;
  createdAt: number;
}

interface TestCase {
  name: string;
  workouts: MockWorkout[];
  expectedDistance: number;
  expectedWorkoutCount: number;
}

function runTest(testCase: TestCase): boolean {
  console.log(`\n${testCase.name}`);

  const joinedPubkeys = new Set(['user1']);
  const userStats = new Map<string, { distance: number; workoutCount: number }>();
  const gpsDistanceByDay = new Map<string, number>();

  // First pass: GPS workouts
  for (const w of testCase.workouts) {
    if (!joinedPubkeys.has(w.pubkey)) continue;
    if (w.id?.startsWith('steps_')) continue;

    const dateStr = new Date(w.createdAt * 1000).toISOString().split('T')[0];
    const dayKey = `${w.pubkey}:${dateStr}`;
    gpsDistanceByDay.set(dayKey, (gpsDistanceByDay.get(dayKey) || 0) + w.distance);

    const existing = userStats.get(w.pubkey) || { distance: 0, workoutCount: 0 };
    existing.distance += w.distance;
    existing.workoutCount += 1;
    userStats.set(w.pubkey, existing);
  }

  // Second pass: Step workouts (only if > GPS)
  for (const w of testCase.workouts) {
    if (!joinedPubkeys.has(w.pubkey)) continue;
    if (!w.id?.startsWith('steps_')) continue;

    const dateStr = w.id.split('_')[1];
    const dayKey = `${w.pubkey}:${dateStr}`;
    const gpsThisDay = gpsDistanceByDay.get(dayKey) || 0;

    if (w.distance > gpsThisDay) {
      const extra = w.distance - gpsThisDay;
      const existing = userStats.get(w.pubkey) || { distance: 0, workoutCount: 0 };
      existing.distance += extra;
      if (gpsThisDay === 0) existing.workoutCount += 1;
      userStats.set(w.pubkey, existing);
    }
  }

  const stats = userStats.get('user1') || { distance: 0, workoutCount: 0 };
  const pass = Math.abs(stats.distance - testCase.expectedDistance) < 0.01
            && stats.workoutCount === testCase.expectedWorkoutCount;

  console.log(`  Got: ${stats.distance}km, ${stats.workoutCount} workouts`);
  console.log(`  Expected: ${testCase.expectedDistance}km, ${testCase.expectedWorkoutCount} workouts`);
  console.log(`  ${pass ? 'PASS' : 'FAIL'}`);

  return pass;
}

const jan15 = Math.floor(new Date('2025-01-15T12:00:00Z').getTime() / 1000);
const jan16 = Math.floor(new Date('2025-01-16T12:00:00Z').getTime() / 1000);

const tests: TestCase[] = [
  {
    name: 'GPS only (5km)',
    workouts: [{ id: 'gps_1', pubkey: 'user1', distance: 5, createdAt: jan15 }],
    expectedDistance: 5,
    expectedWorkoutCount: 1,
  },
  {
    name: 'Steps only (8km)',
    workouts: [{ id: 'steps_2025-01-15_user1', pubkey: 'user1', distance: 8, createdAt: jan15 }],
    expectedDistance: 8,
    expectedWorkoutCount: 1,
  },
  {
    name: 'GPS > Steps (5km GPS, 3km steps) → 5km',
    workouts: [
      { id: 'gps_1', pubkey: 'user1', distance: 5, createdAt: jan15 },
      { id: 'steps_2025-01-15_user1', pubkey: 'user1', distance: 3, createdAt: jan15 },
    ],
    expectedDistance: 5, // max(5, 3) = 5
    expectedWorkoutCount: 1,
  },
  {
    name: 'Steps > GPS (5km GPS, 12km steps) → 12km',
    workouts: [
      { id: 'gps_1', pubkey: 'user1', distance: 5, createdAt: jan15 },
      { id: 'steps_2025-01-15_user1', pubkey: 'user1', distance: 12, createdAt: jan15 },
    ],
    expectedDistance: 12, // max(5, 12) = 12
    expectedWorkoutCount: 1,
  },
  {
    name: 'Multi-day: Day1 GPS+Steps, Day2 Steps only',
    workouts: [
      { id: 'gps_1', pubkey: 'user1', distance: 5, createdAt: jan15 },
      { id: 'steps_2025-01-15_user1', pubkey: 'user1', distance: 10, createdAt: jan15 },
      { id: 'steps_2025-01-16_user1', pubkey: 'user1', distance: 8, createdAt: jan16 },
    ],
    expectedDistance: 18, // max(5,10)=10 + max(0,8)=8 = 18
    expectedWorkoutCount: 2, // 1 GPS + 1 step-only day
  },
];

console.log('=== EIN Step/GPS MAX Test ===');
const allPass = tests.every(runTest);
console.log(`\n${allPass ? '✅ ALL PASS' : '❌ SOME FAILED'}`);
process.exit(allPass ? 0 : 1);
