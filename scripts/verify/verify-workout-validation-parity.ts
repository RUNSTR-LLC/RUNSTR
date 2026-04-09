/**
 * Verify: Workout submission paths all apply validation
 * Checks that distance bounds, duration bounds, and type filtering
 * are applied consistently across all submission code paths.
 *
 * Run: npx tsx scripts/verify/verify-workout-validation-parity.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../../src');

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(SRC, relativePath), 'utf-8');
}

// ---- Submission Path 1: LocalWorkoutStorageService.autoSubmitToSupabase ----
console.log('\n=== Path 1: LocalWorkoutStorageService.autoSubmitToSupabase ===');

const localWorkoutSrc = readFile('services/fitness/LocalWorkoutStorageService.ts');

assert(
  'autoSubmitToSupabase checks CARDIO_TYPES',
  localWorkoutSrc.includes("CARDIO_TYPES") &&
    localWorkoutSrc.includes("CARDIO_TYPES.includes(workout.type)"),
  'Should filter non-cardio types before submitting'
);

assert(
  'autoSubmitToSupabase checks distance > 0',
  /!workout\.distance\s*\|\|\s*workout\.distance\s*<=\s*0/.test(localWorkoutSrc) ||
    localWorkoutSrc.includes('workout.distance <= 0'),
  'Should reject zero/negative distance'
);

assert(
  'autoSubmitToSupabase checks npub exists',
  localWorkoutSrc.includes("if (!npub)") &&
    localWorkoutSrc.includes("Skipping Supabase submit: no npub"),
  'Should skip if no npub'
);

// Check if autoSubmitToSupabase validates duration
const autoSubmitBlock = localWorkoutSrc.slice(
  localWorkoutSrc.indexOf('private async autoSubmitToSupabase'),
  localWorkoutSrc.indexOf('private async autoSubmitToSupabase') + 2000
);
const hasDurationValidation = /duration\s*(<=|<|===?\s*0|!workout\.duration)/.test(autoSubmitBlock);
assert(
  'autoSubmitToSupabase validates duration bounds',
  hasDurationValidation,
  'WARNING: autoSubmitToSupabase does NOT validate duration bounds (only distance)'
);

// ---- Submission Path 2: WorkoutPublishingService.saveWorkoutToNostr ----
console.log('\n=== Path 2: WorkoutPublishingService.saveWorkoutToNostr ===');

const publishingSrc = readFile('services/nostr/workoutPublishingService.ts');

assert(
  'saveWorkoutToNostr checks distance and duration',
  publishingSrc.includes('distanceMeters === 0 && durationSeconds === 0'),
  'Should check for zero distance AND duration'
);

assert(
  'saveWorkoutToNostr uses getExerciseVerb for type mapping',
  publishingSrc.includes('this.getExerciseVerb(workout.type)'),
  'Should normalize exercise types via getExerciseVerb'
);

assert(
  'saveWorkoutToNostr queues failed submissions to PendingSubmissionService',
  publishingSrc.includes('PendingSubmissionService.addPending'),
  'Should queue failures for retry'
);

// Check if saveWorkoutToNostr has upper bound validation on distance
const hasDistanceUpperBound = /MAX_WORKOUT_DISTANCE|MAX_DISTANCE|distance\s*>\s*\d{5,}/.test(publishingSrc);
assert(
  'saveWorkoutToNostr validates distance upper bounds',
  hasDistanceUpperBound,
  'WARNING: No MAX_WORKOUT_DISTANCE check found — unreasonable distances could be submitted'
);

// ---- Submission Path 3: HealthKitBackgroundService.handleWorkoutUpdate ----
console.log('\n=== Path 3: HealthKitBackgroundService.handleWorkoutUpdate ===');

const hkBackgroundSrc = readFile('services/fitness/HealthKitBackgroundService.ts');

assert(
  'HK Background checks CARDIO_TYPES',
  hkBackgroundSrc.includes("CARDIO_TYPES") &&
    hkBackgroundSrc.includes("CARDIO_TYPES.includes(w.type)"),
  'Should filter non-cardio types'
);

assert(
  'HK Background checks distance > 0',
  hkBackgroundSrc.includes('w.distance <= 0') || hkBackgroundSrc.includes('!w.distance'),
  'Should reject zero/null distance'
);

assert(
  'HK Background checks duration > 0',
  hkBackgroundSrc.includes('w.duration <= 0') || hkBackgroundSrc.includes('!w.duration'),
  'Should reject zero/null duration'
);

assert(
  'HK Background has GPS session guard',
  hkBackgroundSrc.includes('checkGPSSessionGuard'),
  'Should skip if GPS session is active'
);

assert(
  'HK Background has sync mutex',
  hkBackgroundSrc.includes('syncInProgress'),
  'Should prevent concurrent syncs'
);

// Check for distance upper bound
const hkHasDistanceUpperBound = /MAX_WORKOUT_DISTANCE|MAX_DISTANCE|distance\s*>\s*\d{5,}/.test(hkBackgroundSrc);
assert(
  'HK Background validates distance upper bounds',
  hkHasDistanceUpperBound,
  'WARNING: No upper bound on distance — a corrupt HealthKit entry could slip through'
);

// ---- Submission Path 4: HealthKitService.submitNewWorkoutsToSupabase ----
console.log('\n=== Path 4: HealthKitService.submitNewWorkoutsToSupabase ===');

const hkServiceSrc = readFile('services/fitness/healthKitService.ts');

assert(
  'HK Service checks CARDIO_TYPES',
  hkServiceSrc.includes("CARDIO_TYPES = ['running', 'walking', 'cycling', 'hiking']") &&
    hkServiceSrc.includes("CARDIO_TYPES.includes(w.activityType)"),
  'Should filter non-cardio types'
);

assert(
  'HK Service checks totalDistance > 0',
  hkServiceSrc.includes('w.totalDistance <= 0') || hkServiceSrc.includes('!w.totalDistance'),
  'Should reject zero/null distance'
);

// Check if HK Service validates duration
const hkSubmitBlock = hkServiceSrc.slice(
  hkServiceSrc.indexOf('submitNewWorkoutsToSupabase'),
  hkServiceSrc.indexOf('submitNewWorkoutsToSupabase') + 2000
);
const hkHasDurationFilter = /duration\s*(<=|<|===?\s*0|!w\.duration)/.test(hkSubmitBlock);
assert(
  'HK Service validates duration in submitNewWorkoutsToSupabase',
  hkHasDurationFilter,
  'WARNING: submitNewWorkoutsToSupabase does NOT filter by duration (only distance + type)'
);

// Check dedup via submittedIds
assert(
  'HK Service deduplicates via submittedIds',
  hkServiceSrc.includes('submittedIds.has(id)') || hkServiceSrc.includes('submittedIds.has(w'),
  'Should skip already-submitted workouts'
);

// ---- Cross-path consistency ----
console.log('\n=== Cross-path Consistency ===');

// Extract CARDIO_TYPES from each path
const cardioRegex = /CARDIO_TYPES\s*[:=]\s*\[([^\]]+)\]/g;
const allCardioArrays: string[] = [];
const allSources = [localWorkoutSrc, hkBackgroundSrc, hkServiceSrc];

for (const src of allSources) {
  let match;
  cardioRegex.lastIndex = 0;
  while ((match = cardioRegex.exec(src)) !== null) {
    const types = match[1].replace(/['"]/g, '').split(',').map(s => s.trim()).sort().join(',');
    allCardioArrays.push(types);
  }
}

const uniqueCardioArrays = [...new Set(allCardioArrays)];
assert(
  'CARDIO_TYPES arrays are identical across all submission paths',
  uniqueCardioArrays.length === 1,
  uniqueCardioArrays.length > 1
    ? `Found ${uniqueCardioArrays.length} different arrays: ${uniqueCardioArrays.map(a => `[${a}]`).join(' vs ')}`
    : undefined
);

// Summary of gaps
console.log('\n=== Validation Gap Summary ===');
console.log('  Path 1 (autoSubmitToSupabase):  type=YES  distance>0=YES  duration>0=NO   upper_bound=NO');
console.log('  Path 2 (saveWorkoutToNostr):    type=YES  distance>0=YES  duration>0=YES  upper_bound=NO');
console.log('  Path 3 (HK Background):         type=YES  distance>0=YES  duration>0=YES  upper_bound=NO');
console.log('  Path 4 (HK Service):            type=YES  distance>0=YES  duration>0=NO   upper_bound=NO');

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
