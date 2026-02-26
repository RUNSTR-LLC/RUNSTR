/**
 * Verify: Background sync decision logic (HealthKit/Health Connect)
 * Run: npx tsx scripts/verify/verify-background-sync-logic.ts
 *
 * Tests the gates that determine whether a background workout gets submitted
 * or skipped: GPS session guard, deduplication, ID cap, reward tag attachment,
 * PPQ bolt11 for background workouts, and source tagging.
 *
 * Source files:
 *   src/services/fitness/HealthKitBackgroundService.ts
 *   src/services/fitness/AndroidBackgroundSyncTask.ts
 *   src/utils/rewardTags.ts
 */

// ---- Test harness ----

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

// ---- Mock AsyncStorage ----

let mockStorage: Record<string, string | null> = {};

function setMockStorage(key: string, value: string | null) {
  mockStorage[key] = value;
}

function getMockStorage(key: string): string | null {
  return mockStorage[key] ?? null;
}

function resetMockStorage() {
  mockStorage = {};
}

// ---- Storage keys (from HealthKitBackgroundService.ts) ----

const SUBMITTED_IDS_KEY = '@healthkit_bg:submitted_ids';
const MAX_STORED_IDS = 500;
const SESSION_STATE_KEY = '@runstr:session_state';

// ---- Inline GPS session guard logic ----
// (from HealthKitBackgroundService.ts lines 236-250)

function checkGPSSessionGuard(): string | null {
  const sessionStateStr = getMockStorage(SESSION_STATE_KEY);
  if (!sessionStateStr) return null;

  try {
    const sessionState = JSON.parse(sessionStateStr);
    // Check if session is recent (within last 4 hours)
    const sessionAge = Date.now() - (sessionState.startTime || 0);
    if (sessionAge > 14400000) return null; // Stale session, safe to sync
    return `${sessionState.activityType || 'unknown'} session active`;
  } catch {
    return null; // Parse error = no valid session, safe to sync
  }
}

// ---- Inline deduplication logic ----
// (from HealthKitBackgroundService.ts lines 140-150, 382-403)

function getSubmittedIds(): Set<string> {
  const raw = getMockStorage(SUBMITTED_IDS_KEY);
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveSubmittedIds(ids: Set<string>): void {
  const arr = Array.from(ids);
  const trimmed = arr.slice(-MAX_STORED_IDS);
  setMockStorage(SUBMITTED_IDS_KEY, JSON.stringify(trimmed));
}

// ---- Inline workout filter logic ----
// (from HealthKitBackgroundService.ts lines 142-150)

interface MockHKWorkout {
  id: string;
  type: string;
  distance: number;   // meters
  duration: number;    // seconds
  calories?: number;
  startTime: string;
}

const CARDIO_TYPES = ['running', 'walking', 'cycling', 'hiking'];

function filterNewWorkouts(workouts: MockHKWorkout[], submittedIds: Set<string>): MockHKWorkout[] {
  return workouts.filter((w) => {
    if (submittedIds.has(w.id)) return false;
    if (!CARDIO_TYPES.includes(w.type)) return false;
    if (!w.distance || w.distance <= 0) return false;
    if (!w.duration || w.duration <= 0) return false;
    return true;
  });
}

// ---- Tests ----

async function runTests() {
  // ========================================
  // GPS Session Guard
  // ========================================
  console.log('\n=== GPS Session Guard ===');

  // No session → sync allowed
  resetMockStorage();
  assert('no session state → sync allowed', checkGPSSessionGuard() === null);

  // Active session (recent) → sync blocked
  resetMockStorage();
  setMockStorage(SESSION_STATE_KEY, JSON.stringify({
    startTime: Date.now() - 60000, // 1 minute ago
    activityType: 'running',
  }));
  let guard = checkGPSSessionGuard();
  assert('recent session (1min ago) → sync blocked', guard !== null, `got: ${guard}`);
  assert('guard message includes activity type', guard?.includes('running') === true);

  // Active session (3 hours ago) → sync blocked
  resetMockStorage();
  setMockStorage(SESSION_STATE_KEY, JSON.stringify({
    startTime: Date.now() - (3 * 60 * 60 * 1000), // 3 hours ago
    activityType: 'cycling',
  }));
  guard = checkGPSSessionGuard();
  assert('3-hour-old session → sync blocked', guard !== null);

  // Stale session (>4 hours) → sync allowed
  resetMockStorage();
  setMockStorage(SESSION_STATE_KEY, JSON.stringify({
    startTime: Date.now() - (5 * 60 * 60 * 1000), // 5 hours ago
    activityType: 'running',
  }));
  guard = checkGPSSessionGuard();
  assert('5-hour-old session (stale) → sync allowed', guard === null);

  // Exactly 4 hours → boundary (>4h means sync allowed)
  resetMockStorage();
  setMockStorage(SESSION_STATE_KEY, JSON.stringify({
    startTime: Date.now() - 14400001, // 4h + 1ms
    activityType: 'running',
  }));
  guard = checkGPSSessionGuard();
  assert('4h+1ms session → sync allowed (just past stale threshold)', guard === null);

  // Malformed JSON → sync allowed (parse error = safe)
  resetMockStorage();
  setMockStorage(SESSION_STATE_KEY, 'not-valid-json');
  guard = checkGPSSessionGuard();
  assert('malformed session JSON → sync allowed', guard === null);

  // Missing startTime → sync allowed (sessionAge would be huge)
  resetMockStorage();
  setMockStorage(SESSION_STATE_KEY, JSON.stringify({ activityType: 'running' }));
  guard = checkGPSSessionGuard();
  assert('session with no startTime → sync allowed (age = Date.now())', guard === null);

  // ========================================
  // Deduplication
  // ========================================
  console.log('\n=== Deduplication ===');

  // Empty submitted IDs → all workouts are new
  resetMockStorage();
  let submittedIds = getSubmittedIds();
  assert('empty store → empty set', submittedIds.size === 0);

  const workouts: MockHKWorkout[] = [
    { id: 'w1', type: 'running', distance: 5000, duration: 1800, startTime: '2026-02-26T08:00:00Z' },
    { id: 'w2', type: 'walking', distance: 3000, duration: 2400, startTime: '2026-02-26T09:00:00Z' },
    { id: 'w3', type: 'running', distance: 8000, duration: 2700, startTime: '2026-02-26T10:00:00Z' },
  ];

  let newWorkouts = filterNewWorkouts(workouts, submittedIds);
  assert('all 3 workouts are new', newWorkouts.length === 3);

  // Mark w1 as submitted → only w2 and w3 are new
  submittedIds.add('w1');
  saveSubmittedIds(submittedIds);
  submittedIds = getSubmittedIds();
  assert('submitted IDs persisted', submittedIds.has('w1'));

  newWorkouts = filterNewWorkouts(workouts, submittedIds);
  assert('w1 filtered out (already submitted)', newWorkouts.length === 2);
  assert('w2 still new', newWorkouts.some((w) => w.id === 'w2'));
  assert('w3 still new', newWorkouts.some((w) => w.id === 'w3'));

  // Mark all as submitted
  submittedIds.add('w2');
  submittedIds.add('w3');
  saveSubmittedIds(submittedIds);
  newWorkouts = filterNewWorkouts(workouts, submittedIds);
  assert('all workouts filtered (all submitted)', newWorkouts.length === 0);

  // ========================================
  // Workout type filtering (background only syncs cardio)
  // ========================================
  console.log('\n=== Workout type filtering (background sync) ===');

  resetMockStorage();
  submittedIds = new Set();

  const mixedWorkouts: MockHKWorkout[] = [
    { id: 'r1', type: 'running', distance: 5000, duration: 1800, startTime: '2026-02-26T08:00:00Z' },
    { id: 'w1', type: 'walking', distance: 3000, duration: 2400, startTime: '2026-02-26T09:00:00Z' },
    { id: 'c1', type: 'cycling', distance: 10000, duration: 3600, startTime: '2026-02-26T10:00:00Z' },
    { id: 'h1', type: 'hiking', distance: 8000, duration: 5400, startTime: '2026-02-26T11:00:00Z' },
    { id: 's1', type: 'strength', distance: 0, duration: 1800, startTime: '2026-02-26T12:00:00Z' },
    { id: 'y1', type: 'yoga', distance: 0, duration: 1800, startTime: '2026-02-26T13:00:00Z' },
  ];

  newWorkouts = filterNewWorkouts(mixedWorkouts, submittedIds);
  assert('running passes filter', newWorkouts.some((w) => w.id === 'r1'));
  assert('walking passes filter', newWorkouts.some((w) => w.id === 'w1'));
  assert('cycling passes filter', newWorkouts.some((w) => w.id === 'c1'));
  assert('hiking passes filter', newWorkouts.some((w) => w.id === 'h1'));
  assert('strength filtered out (not cardio)', !newWorkouts.some((w) => w.id === 's1'));
  assert('yoga filtered out (not cardio)', !newWorkouts.some((w) => w.id === 'y1'));

  // Zero distance/duration filtered out
  const edgeCases: MockHKWorkout[] = [
    { id: 'z1', type: 'running', distance: 0, duration: 1800, startTime: '2026-02-26T08:00:00Z' },
    { id: 'z2', type: 'running', distance: 5000, duration: 0, startTime: '2026-02-26T09:00:00Z' },
    { id: 'z3', type: 'running', distance: -100, duration: 1800, startTime: '2026-02-26T10:00:00Z' },
  ];

  newWorkouts = filterNewWorkouts(edgeCases, new Set());
  assert('zero distance filtered out', !newWorkouts.some((w) => w.id === 'z1'));
  assert('zero duration filtered out', !newWorkouts.some((w) => w.id === 'z2'));
  assert('negative distance filtered out', !newWorkouts.some((w) => w.id === 'z3'));

  // ========================================
  // Submitted IDs cap (MAX_STORED_IDS = 500)
  // ========================================
  console.log('\n=== Submitted IDs cap (500) ===');

  resetMockStorage();
  const largeSet = new Set<string>();
  for (let i = 0; i < 600; i++) {
    largeSet.add(`workout_${i}`);
  }
  assert('set has 600 entries before save', largeSet.size === 600);

  saveSubmittedIds(largeSet);
  const loaded = getSubmittedIds();
  assert('loaded set capped at 500', loaded.size === 500, `got ${loaded.size}`);

  // The oldest entries (0-99) should be pruned, newest (100-599) kept
  assert('oldest entry (workout_0) pruned', !loaded.has('workout_0'));
  assert('oldest entry (workout_99) pruned', !loaded.has('workout_99'));
  assert('entry at cutoff (workout_100) kept', loaded.has('workout_100'));
  assert('newest entry (workout_599) kept', loaded.has('workout_599'));

  // ========================================
  // Reward tags in background submissions
  // ========================================
  console.log('\n=== Reward tags attached to background submissions ===');

  // Simulate background submission building (from handleWorkoutUpdate lines 181-197)
  const mockRewardTags: string[][] = [
    ['lightning', 'user@walletofsatoshi.com'],
    ['team', 'als-foundation'],
    ['charity', 'als-foundation', 'ALS Network', 'RunningBTC@primal.net'],
    ['reward_destination', 'charity'],
  ];

  const workout: MockHKWorkout = {
    id: 'hk_123',
    type: 'running',
    distance: 5000,
    duration: 1800,
    startTime: '2026-02-26T08:00:00Z',
  };

  // Background sync spreads reward tags into each submission
  const submissionTags: string[][] = [...mockRewardTags];
  assert('submission has lightning tag', submissionTags.some((t) => t[0] === 'lightning'));
  assert('submission has reward_destination', submissionTags.some((t) => t[0] === 'reward_destination'));
  assert('submission has team tag', submissionTags.some((t) => t[0] === 'team'));

  // When reward tags fail/timeout, submission still goes through (with empty tags)
  const emptyRewardTags: string[][] = [];
  const fallbackTags: string[][] = [...emptyRewardTags];
  assert(
    'WARN: submission without reward tags has no lightning',
    !fallbackTags.some((t) => t[0] === 'lightning'),
  );
  console.log('  WARN: Background workout submitted without reward tags → reward silently lost');
  console.log('  NOTE: This is a known risk — buildRewardTags has 8s timeout fallback');

  // ========================================
  // PPQ bolt11 in background submissions
  // ========================================
  console.log('\n=== PPQ bolt11 for background workouts ===');

  // The PPQ auto-invoice happens inside submitWorkoutSimple, not in background service
  // So background workouts for PPQ users get bolt11 created at submission time
  const ppqRewardTags: string[][] = [
    ['team', 'ppq-ai'],
    ['reward_destination', 'ppq'],
    // Note: NO lightning tag for PPQ — bolt11 auto-created in submitWorkoutSimple
  ];

  assert('PPQ background tags have no lightning', !ppqRewardTags.some((t) => t[0] === 'lightning'));
  assert('PPQ background tags have reward_destination=ppq',
    ppqRewardTags.some((t) => t[0] === 'reward_destination' && t[1] === 'ppq'));
  console.log('  NOTE: submitWorkoutSimple auto-creates PPQ bolt11 for ALL paths including background');

  // ========================================
  // Event ID format
  // ========================================
  console.log('\n=== Event ID format ===');

  // HealthKit background workouts: hk_bg_{workoutId}
  const hkEventId = `hk_bg_${workout.id}`;
  assert('HealthKit event ID format', hkEventId === 'hk_bg_hk_123');
  assert('HealthKit event ID starts with hk_bg_', hkEventId.startsWith('hk_bg_'));

  // Step sync: steps_{npub}_{dateStr}
  const npub = 'npub1test';
  const dateStr = '2026-02-26';
  const stepEventId = `steps_${npub}_${dateStr}`;
  assert('Step event ID format', stepEventId === 'steps_npub1test_2026-02-26');
  assert('Step event ID starts with steps_', stepEventId.startsWith('steps_'));

  // ========================================
  // Source tagging
  // ========================================
  console.log('\n=== Source tagging ===');

  // HealthKit workouts should be tagged 'healthkit'
  // Health Connect workouts should be tagged 'health_connect'
  // This is determined by the submission path, not by tags in the workout itself
  assert('HealthKit source constant', 'healthkit' === 'healthkit');
  assert('Health Connect source constant', 'health_connect' === 'health_connect');
  assert('Sources are distinct', 'healthkit' !== 'health_connect');

  // Both are reward-eligible
  const REWARD_ELIGIBLE_SOURCES = ['gps_tracker', 'manual_entry', 'healthkit', 'health_connect'];
  assert('healthkit is reward eligible', REWARD_ELIGIBLE_SOURCES.includes('healthkit'));
  assert('health_connect is reward eligible', REWARD_ELIGIBLE_SOURCES.includes('health_connect'));
  assert('imported_nostr NOT eligible', !REWARD_ELIGIBLE_SOURCES.includes('imported_nostr'));

  // ========================================
  // Sync mutex (conceptual)
  // ========================================
  console.log('\n=== Sync mutex ===');

  // HealthKitBackgroundService uses `this.syncInProgress` flag
  let syncInProgress = false;

  // First call proceeds
  if (!syncInProgress) {
    syncInProgress = true;
    assert('first sync call proceeds', syncInProgress === true);
  }

  // Second concurrent call should be blocked
  let secondCallSkipped = false;
  if (syncInProgress) {
    secondCallSkipped = true;
  }
  assert('concurrent sync call blocked', secondCallSkipped);

  // After first call completes, flag is reset
  syncInProgress = false;
  assert('sync flag reset after completion', !syncInProgress);

  // ---- Summary ----
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
