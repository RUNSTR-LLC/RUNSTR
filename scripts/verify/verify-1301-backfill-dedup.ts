/**
 * Verify: Task 11 automatic 1301 backfill dedup contract.
 *
 * 1. Reproduces the Amendment 1 defect: if startTime were derived from
 *    created_at (publish time) instead of the workout_start_time tag, a
 *    workout published ~35 minutes after it started would NOT dedup against
 *    its own local copy, causing a re-import on every launch.
 * 2. Confirms the fix: startTime derived from workout_start_time DOES dedup
 *    against the same local workout.
 * 3. Confirms Amendment 2: dedup only matches on normalized types (e.g.
 *    'running'), not raw tag synonyms (e.g. 'run').
 *
 * Run: npx tsx scripts/verify/verify-1301-backfill-dedup.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { isDuplicateWorkout, type DedupCandidate } from '../../src/utils/workoutDedup';

let failed = 0;
const assert = (cond: boolean, msg: string) => {
  if (cond) {
    console.log(`  PASS: ${msg}`);
  } else {
    console.error(`  FAIL: ${msg}`);
    failed++;
  }
};

// A workout actually started at 06:00:00, GPS-tracked locally, 30 min duration.
const localWorkout: DedupCandidate = {
  nostrEventId: undefined, // not yet synced, e.g. a HealthKit-origin workout
  type: 'running',
  startTime: '2026-09-18T06:00:00.000Z',
  duration: 1800,
};

console.log('\n=== Amendment 1: created_at vs workout_start_time ===');

// BUGGY: same workout re-fetched from a relay, but startTime built from
// event.created_at (publish time), 35 minutes after the workout started.
const buggyRelayCandidate: DedupCandidate = {
  nostrEventId: 'evt123',
  type: 'running',
  startTime: '2026-09-18T06:35:00.000Z', // created_at-derived — WRONG
  duration: 1800,
};
assert(
  !isDuplicateWorkout([localWorkout], buggyRelayCandidate),
  'created_at-derived startTime (35min drift) does NOT dedup — this is the bug the amendment fixes'
);

// FIXED: startTime built from the workout_start_time tag — matches the
// workout's actual start.
const fixedRelayCandidate: DedupCandidate = {
  nostrEventId: 'evt123',
  type: 'running',
  startTime: '2026-09-18T06:00:05.000Z', // workout_start_time-derived, within tolerance
  duration: 1800,
};
assert(
  isDuplicateWorkout([localWorkout], fixedRelayCandidate),
  'workout_start_time-derived startTime DOES dedup within tolerance'
);

console.log('\n=== Amendment 2: normalized types only ===');

// A POWR note tagged with the raw synonym 'run' must be normalized to
// 'running' by the caller BEFORE it reaches isDuplicateWorkout — the helper
// itself does not map synonyms.
const rawSynonymCandidate: DedupCandidate = {
  nostrEventId: 'evt456',
  type: 'run', // raw tag value — should never reach here unnormalized
  startTime: '2026-09-18T06:00:05.000Z',
  duration: 1800,
};
assert(
  !isDuplicateWorkout([localWorkout], rawSynonymCandidate),
  'raw synonym "run" does NOT match normalized "running" — callers must normalize first'
);

const normalizedCandidate: DedupCandidate = {
  ...rawSynonymCandidate,
  type: 'running', // as Nostr1301ImportService.normalizeWorkoutType would produce
};
assert(
  isDuplicateWorkout([localWorkout], normalizedCandidate),
  'normalized type "running" matches correctly'
);

console.log('\n=== Static check: all three Nuclear1301Service sites use resolveWorkoutStartSeconds ===');

const nuclearSrc = fs.readFileSync(
  path.resolve(__dirname, '../../src/services/fitness/Nuclear1301Service.ts'),
  'utf-8'
);

assert(
  nuclearSrc.includes('function resolveWorkoutStartSeconds('),
  'resolveWorkoutStartSeconds helper is defined'
);

// No remaining startTime/endTime built directly off event.created_at * 1000 —
// every site should route through resolveWorkoutStartSeconds instead.
const rawCreatedAtStartTime = /startTime:\s*new Date\(\s*(event\.created_at|createdAt)\s*\*\s*1000\)/;
assert(
  !rawCreatedAtStartTime.test(nuclearSrc),
  'no startTime is built directly from created_at without going through resolveWorkoutStartSeconds'
);

const usageCount = (nuclearSrc.match(/resolveWorkoutStartSeconds\(/g) || []).length;
// 1 definition + 3 call sites (getUserWorkouts main path, its catch fallback,
// getUserWorkoutsWithLimit) = 4 occurrences of the identifier.
assert(
  usageCount === 4,
  `resolveWorkoutStartSeconds is referenced at the 1 definition + 3 call sites (found ${usageCount})`
);

console.log('\n=== Static check: LocalWorkoutStorageService and Nostr1301ImportService wiring ===');

const localStorageSrc = fs.readFileSync(
  path.resolve(__dirname, '../../src/services/fitness/LocalWorkoutStorageService.ts'),
  'utf-8'
);
assert(
  localStorageSrc.includes('export interface ImportedNostrWorkout'),
  'ImportedNostrWorkout is exported'
);
assert(
  localStorageSrc.includes('async saveImportedNostrWorkoutsBulk('),
  'saveImportedNostrWorkoutsBulk is defined'
);
assert(
  localStorageSrc.includes("import { isDuplicateWorkout, type DedupCandidate } from '../../utils/workoutDedup';"),
  'LocalWorkoutStorageService imports the dedup helper'
);

const importServiceSrc = fs.readFileSync(
  path.resolve(__dirname, '../../src/services/fitness/Nostr1301ImportService.ts'),
  'utf-8'
);
assert(
  importServiceSrc.includes('async backfillInBackground(pubkey: string): Promise<void> {'),
  'backfillInBackground is defined'
);
assert(
  importServiceSrc.includes('private async shouldBackfill()'),
  'shouldBackfill throttle guard is defined'
);
assert(
  /if \(!\(await this\.shouldBackfill\(\)\)\) return;/.test(importServiceSrc),
  'backfillInBackground calls the throttle guard first'
);

const appSrc = fs.readFileSync(path.resolve(__dirname, '../../src/App.tsx'), 'utf-8');
assert(
  appSrc.includes('.backfillInBackground(currentUser.npub)') &&
    appSrc.includes('.catch(() => {});'),
  'App.tsx triggers backfillInBackground without awaiting it'
);

console.log(`\n=== Results: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'} ===\n`);
process.exit(failed === 0 ? 0 : 1);
