/**
 * Verify: Failed submissions are queued for retry via PendingSubmissionService
 * Checks that each submission path properly enqueues failures and that the
 * retry service has max attempts + exponential backoff.
 *
 * Run: npx tsx scripts/verify/verify-pending-submission-retry.ts
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

// ---- PendingSubmissionService structure ----
console.log('\n=== PendingSubmissionService Design ===');

const pendingSrc = readFile('services/competition/PendingSubmissionService.ts');

// Max retries
const maxRetriesMatch = pendingSrc.match(/MAX_RETRIES\s*=\s*(\d+)/);
assert(
  'MAX_RETRIES is defined',
  maxRetriesMatch !== null,
  maxRetriesMatch ? `MAX_RETRIES = ${maxRetriesMatch[1]}` : 'No MAX_RETRIES constant found'
);

if (maxRetriesMatch) {
  const maxRetries = parseInt(maxRetriesMatch[1]);
  assert(
    'MAX_RETRIES is reasonable (between 3 and 10)',
    maxRetries >= 3 && maxRetries <= 10,
    `MAX_RETRIES = ${maxRetries}`
  );
}

// Exponential backoff
const backoffMatch = pendingSrc.match(/BACKOFF_INTERVALS\s*=\s*\[([^\]]+)\]/);
assert(
  'BACKOFF_INTERVALS is defined',
  backoffMatch !== null,
  backoffMatch ? `intervals: [${backoffMatch[1].trim()}]` : 'No BACKOFF_INTERVALS found'
);

if (backoffMatch) {
  const intervals = backoffMatch[1].split(',').map(s => parseInt(s.trim()));
  const isIncreasing = intervals.every((val, i) => i === 0 || val > intervals[i - 1]);
  assert(
    'Backoff intervals are strictly increasing (exponential)',
    isIncreasing,
    `intervals: [${intervals.join(', ')}]`
  );

  assert(
    'First backoff interval is 1 minute (60000ms)',
    intervals[0] === 60000,
    `First interval: ${intervals[0]}ms`
  );
}

// retryAll respects backoff
assert(
  'retryAll checks nextRetryTime before retrying',
  pendingSrc.includes('submission.nextRetryTime > now') ||
    pendingSrc.includes('nextRetryTime > now'),
  'Should skip submissions where backoff has not elapsed'
);

// retryAll checks max retries
assert(
  'retryAll skips submissions exceeding MAX_RETRIES',
  pendingSrc.includes('retryCount >= MAX_RETRIES') ||
    pendingSrc.includes('retryCount > MAX_RETRIES'),
  'Should not retry beyond max attempts'
);

// addPending deduplicates
assert(
  'addPending prevents duplicate entries',
  pendingSrc.includes('p.id === submission.id') ||
    pendingSrc.includes('existingIndex'),
  'Should update existing entry instead of duplicating'
);

// Storage key
assert(
  'Uses @runstr: prefixed storage key',
  pendingSrc.includes("'@runstr:pending_submissions'"),
  'Should use consistent @runstr: prefix'
);

// ---- Path 1: WorkoutPublishingService queues failures ----
console.log('\n=== WorkoutPublishingService Failure Queuing ===');

const publishingSrc = readFile('services/nostr/workoutPublishingService.ts');

// Count PendingSubmissionService.addPending calls
const addPendingCalls = (publishingSrc.match(/PendingSubmissionService\.addPending/g) || []).length;
assert(
  'WorkoutPublishingService calls PendingSubmissionService.addPending',
  addPendingCalls > 0,
  `Found ${addPendingCalls} call(s)`
);

assert(
  'Queues on submission result failure (non-flagged)',
  publishingSrc.includes('Non-flagged failure - queue for retry') ||
    (publishingSrc.includes('addPending') && publishingSrc.includes('submissionResult.error')),
  'Should queue when Supabase returns a non-flagged error'
);

assert(
  'Queues on network/exception errors',
  publishingSrc.includes('supabaseError') &&
    publishingSrc.includes('PendingSubmissionService.addPending'),
  'Should queue when Supabase throws an exception'
);

// ---- Path 2: LocalWorkoutStorageService.autoSubmitToSupabase queuing ----
console.log('\n=== LocalWorkoutStorageService Failure Queuing ===');

const localWorkoutSrc = readFile('services/fitness/LocalWorkoutStorageService.ts');

// Check if autoSubmitToSupabase queues failures
const autoSubmitStart = localWorkoutSrc.indexOf('private async autoSubmitToSupabase');
const autoSubmitEnd = localWorkoutSrc.indexOf('private async', autoSubmitStart + 50);
const autoSubmitBlock = localWorkoutSrc.slice(autoSubmitStart, autoSubmitEnd > 0 ? autoSubmitEnd : autoSubmitStart + 3000);

const autoSubmitQueuesPending = autoSubmitBlock.includes('PendingSubmissionService');
assert(
  'autoSubmitToSupabase queues failures to PendingSubmissionService',
  autoSubmitQueuesPending,
  autoSubmitQueuesPending
    ? undefined
    : 'WARNING: autoSubmitToSupabase does NOT queue failures — they are only logged and lost'
);

// Check if it at least tracks status
assert(
  'autoSubmitToSupabase tracks failure status locally',
  autoSubmitBlock.includes('updateSupabaseStatus') && autoSubmitBlock.includes('false'),
  'Should mark workout as failed in local storage'
);

// ---- Path 3: HealthKitBackgroundService failure handling ----
console.log('\n=== HealthKitBackgroundService Failure Handling ===');

const hkBackgroundSrc = readFile('services/fitness/HealthKitBackgroundService.ts');

const hkBgQueuesPending = hkBackgroundSrc.includes('PendingSubmissionService');
assert(
  'HK Background queues failures to PendingSubmissionService',
  hkBgQueuesPending,
  hkBgQueuesPending
    ? undefined
    : 'WARNING: HK Background does NOT queue failures — relies on next sync cycle for retry'
);

// Check that failed IDs are not added to submittedIds (so they retry)
assert(
  'HK Background does not mark failed workouts as submitted',
  hkBackgroundSrc.includes("Don't add to submittedIds") ||
    hkBackgroundSrc.includes('// Don\'t add to submittedIds'),
  'Failed workouts should retry on next sync'
);

// ---- Path 4: HealthKitService.submitNewWorkoutsToSupabase failure handling ----
console.log('\n=== HealthKitService Failure Handling ===');

const hkServiceSrc = readFile('services/fitness/healthKitService.ts');

const hkServiceQueuesPending = hkServiceSrc.includes('PendingSubmissionService');
assert(
  'HK Service queues failures to PendingSubmissionService',
  hkServiceQueuesPending,
  hkServiceQueuesPending
    ? undefined
    : 'WARNING: HK Service does NOT queue failures — relies on next sync for retry'
);

// ---- Retry trigger points ----
console.log('\n=== Retry Trigger Points ===');

// Check where retryAll is called
const retryAllPattern = /PendingSubmissionService\.retryAll/;

// Check common trigger locations
const appSrc = fs.readFileSync(path.join(SRC, 'App.tsx'), 'utf-8');
const hasAppRetry = retryAllPattern.test(appSrc);
assert(
  'PendingSubmissionService.retryAll is called on app foreground or startup',
  hasAppRetry,
  hasAppRetry ? 'Found in App.tsx' : 'Not found in App.tsx — check LeaderboardsScreen or other triggers'
);

// Check leaderboards screen
const leaderboardSrc = readFile('screens/LeaderboardsScreen.tsx');
const hasLeaderboardRetry = retryAllPattern.test(leaderboardSrc);
assert(
  'PendingSubmissionService.retryAll is called on leaderboard refresh',
  hasLeaderboardRetry,
  hasLeaderboardRetry ? 'Found in LeaderboardsScreen.tsx' : 'Not in LeaderboardsScreen.tsx'
);

// Summary
console.log('\n=== Queue Coverage Summary ===');
console.log(`  WorkoutPublishingService:    queues failures = YES`);
console.log(`  LocalWorkoutStorageService:  queues failures = ${autoSubmitQueuesPending ? 'YES' : 'NO (tracks locally)'}`);
console.log(`  HealthKitBackgroundService:  queues failures = ${hkBgQueuesPending ? 'YES' : 'NO (retries on next sync)'}`);
console.log(`  HealthKitService:            queues failures = ${hkServiceQueuesPending ? 'YES' : 'NO (retries on next sync)'}`);

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
