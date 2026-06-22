/**
 * Verifies the distance-tiered reward amounts match the zapper:
 *   <5K → 0, 5K → 500, 10K → 1000, half (21.1K) → 2100, marathon (42.2K) → 4200
 * Run: npx tsx scripts/verify/verify-reward-tiers.ts
 */
import { getWorkoutRewardAmount, REWARD_CONFIG } from '../../src/config/rewards';

const cases: Array<[string, number, number]> = [
  ['0m (no distance)', 0, 0],
  ['1km (old minimum)', 1000, 0],
  ['4.99km (just under 5K)', 4990, 0],
  ['5K exactly', 5000, 500],
  ['7km (between 5K-10K)', 7000, 500],
  ['9.99km (just under 10K)', 9990, 500],
  ['10K exactly', 10000, 1000],
  ['15km (between 10K-half)', 15000, 1000],
  ['21.0km (just under half)', 21000, 1000],
  ['half marathon (21.1K)', 21100, 2100],
  ['30km (between half-marathon)', 30000, 2100],
  ['42.1km (just under marathon)', 42100, 2100],
  ['marathon (42.2K)', 42200, 4200],
  ['50km (ultra)', 50000, 4200],
];

let failures = 0;
for (const [label, meters, expected] of cases) {
  const actual = getWorkoutRewardAmount(meters);
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(30)} → ${actual} (expected ${expected})`);
}

// Sanity: undefined distance → 0, minimum config aligned to 5K tier
const undef = getWorkoutRewardAmount(undefined);
if (undef !== 0) { failures++; console.log(`FAIL  undefined distance → ${undef} (expected 0)`); }
if (REWARD_CONFIG.MIN_WORKOUT_DISTANCE_METERS !== 5000) {
  failures++; console.log(`FAIL  MIN_WORKOUT_DISTANCE_METERS = ${REWARD_CONFIG.MIN_WORKOUT_DISTANCE_METERS} (expected 5000)`);
}

console.log(failures === 0 ? '\nAll tier checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
