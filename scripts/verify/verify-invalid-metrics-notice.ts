/**
 * Verify the invalid-metrics skip branch in saveWorkoutToNostr surfaces a
 * user-visible toast instead of silently dropping leaderboard/reward
 * eligibility, and that the validation bounds behave as expected.
 * Run: npx tsx scripts/verify/verify-invalid-metrics-notice.ts
 */
import { readFileSync } from 'fs';
import { isValidWorkoutMetrics } from '../../src/utils/rewardEligibility';

let passed = 0;
let failed = 0;
const check = (name: string, ok: boolean) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  ok ? passed++ : failed++;
};

// 1. The skip branch must contain a Toast within its block.
const src = readFileSync('src/services/nostr/workoutPublishingService.ts', 'utf8');
const idx = src.indexOf('Workout metrics out of bounds');
check('skip branch exists', idx !== -1);
const windowAfter = src.slice(idx, idx + 900);
check('skip branch shows a toast', /Toast\.show\(/.test(windowAfter));
check('toast says workout still saved', /saved locally/i.test(windowAfter));

// 2. Validation bounds sanity — normal workouts pass, corrupt ones fail.
check('normal 5k passes', isValidWorkoutMetrics(5000, 1800) === true);
check('negative distance fails', isValidWorkoutMetrics(-5, 1800) === false);
check('NaN duration fails', isValidWorkoutMetrics(5000, NaN) === false);
check('absurd distance fails', isValidWorkoutMetrics(10_000_000, 1800) === false);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
