/**
 * THE GATE for Phase 1.
 *
 * Everything else in this phase is reversible with a flag flip; duplicated
 * workout history is not. This script actually CALLS the dedup wiring and
 * asserts on returned values — it does not restate the implementation as
 * greps (that was tried once, in an earlier version of this file, and an
 * adversarial review correctly judged it too weak to be a gate).
 *
 * Three things are pinned here, each load-bearing for the automatic 1301
 * backfill introduced in Task 11:
 *
 *   (a) resolveWorkoutStartSeconds — the helper that decides a workout's
 *       startTime from the `workout_start_time` tag vs. `created_at`
 *       (publish time). This is what makes dedup work at all: if a relay
 *       copy's startTime drifts from the local copy's by more than the
 *       60s tolerance, isDuplicateWorkout's time key can never catch it.
 *       A Critical bug here — using created_at unconditionally — was found
 *       in review of Task 11 and is exactly what this table pins against
 *       regressing.
 *
 *   (b) isDuplicateWorkout, end-to-end, against the realistic mixed-history
 *       shape: a GPS workout that carries a nostrEventId (went through
 *       markAsSynced / the summary modal) sitting alongside a Health-synced
 *       workout that does NOT (markAsSynced has exactly one caller, and
 *       Health-synced workouts never pass through it). That asymmetry is
 *       the entire reason the (type, startTime, duration) key exists
 *       alongside the nostrEventId key — a script that only ever
 *       constructs workouts WITH event ids would never exercise it.
 *
 *   (c) The duration guard: a non-finite or zero duration must decline the
 *       time key rather than silently calling two different workouts a
 *       match. The failure direction that matters is data loss (discarding
 *       a real workout because a corrupt/missing duration made it look like
 *       a duplicate), so this is asserted with a same-type/same-time-window
 *       pair on both sides of the guard, plus a control proving the pair
 *       WOULD match if both durations were valid — otherwise "declines"
 *       could vacuously pass for unrelated reasons.
 *
 * Does NOT re-test the 17 cases already in
 * src/utils/__tests__/workoutDedup.test.ts — this tests the wiring those
 * unit tests cannot reach (resolveWorkoutStartSeconds is a different
 * module, and the mixed-history shape is a caller concern, not a unit-level
 * one).
 *
 * NOT covered here: LocalWorkoutStorageService.saveImportedNostrWorkoutsBulk
 * itself. That service imports @react-native-async-storage/async-storage at
 * module scope, which crashes esbuild under tsx (confirmed: "Unexpected
 * 'typeof'" from node_modules/react-native/index.js) the same way
 * scripts/verify/verify-workout-storage-guards.ts already documents for
 * this exact file. Exercising the real bulk method would require either a
 * jest run (out of scope — this script is a tsx gate per Task 12) or an
 * algorithm replica that reimplements the method's logic rather than calls
 * it, which is the same "restates the implementation" problem this rewrite
 * exists to get away from. Reported as a gap, not papered over.
 *
 * Run: npx tsx scripts/verify/verify-1301-backfill.ts
 */
import {
  resolveWorkoutStartSeconds,
  NOSTR_GENESIS_SECONDS,
} from '../../src/utils/resolveWorkoutStartTime';
import { isDuplicateWorkout, type DedupCandidate } from '../../src/utils/workoutDedup';

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failures++;
};

// ---------------------------------------------------------------------------
// (a) resolveWorkoutStartSeconds — table test
// ---------------------------------------------------------------------------
console.log('\n=== (a) resolveWorkoutStartSeconds ===');

const NOW_SECONDS = Math.floor(Date.now() / 1000);
const CREATED_AT = NOW_SECONDS - 600; // a plausible publish time, 10 min ago

type StartTimeCase = {
  label: string;
  tags: any[];
  createdAt: number;
  expected: number;
};

const startTimeCases: StartTimeCase[] = [
  {
    label: 'tag absent falls back to created_at',
    tags: [],
    createdAt: CREATED_AT,
    expected: CREATED_AT,
  },
  {
    label: 'tag present and valid is used over created_at',
    tags: [['workout_start_time', String(CREATED_AT - 60)]],
    createdAt: CREATED_AT,
    expected: CREATED_AT - 60,
  },
  {
    label: 'non-numeric tag ("abc") falls back to created_at',
    tags: [['workout_start_time', 'abc']],
    createdAt: CREATED_AT,
    expected: CREATED_AT,
  },
  {
    label: 'tag "0" falls back to created_at (predates genesis)',
    tags: [['workout_start_time', '0']],
    createdAt: CREATED_AT,
    expected: CREATED_AT,
  },
  {
    label: 'tag given in milliseconds (not seconds) falls back to created_at',
    tags: [['workout_start_time', String(CREATED_AT * 1000)]],
    createdAt: CREATED_AT,
    expected: CREATED_AT,
  },
  {
    label: 'tag more than a day in the future falls back to created_at',
    tags: [['workout_start_time', String(NOW_SECONDS + 2 * 24 * 60 * 60)]],
    createdAt: CREATED_AT,
    expected: CREATED_AT,
  },
  {
    label: 'tag before the Nostr genesis falls back to created_at',
    tags: [['workout_start_time', String(NOSTR_GENESIS_SECONDS - 1)]],
    createdAt: CREATED_AT,
    expected: CREATED_AT,
  },
  {
    label: 'tag exactly at the Nostr genesis is accepted (boundary)',
    tags: [['workout_start_time', String(NOSTR_GENESIS_SECONDS)]],
    createdAt: CREATED_AT,
    expected: NOSTR_GENESIS_SECONDS,
  },
];

for (const c of startTimeCases) {
  const actual = resolveWorkoutStartSeconds(c.tags, c.createdAt);
  check(actual === c.expected, `${c.label} (got ${actual}, expected ${c.expected})`);
}

// ---------------------------------------------------------------------------
// (b) End-to-end dedup: the realistic mixed-history scenario
// ---------------------------------------------------------------------------
console.log('\n=== (b) End-to-end dedup against a mixed local history ===');

// A GPS run that went through the summary modal: carries an event id.
const gpsWorkout: DedupCandidate = {
  nostrEventId: 'evt-gps-1',
  type: 'running',
  startTime: '2026-09-18T07:00:00.000Z',
  duration: 1800,
};

// A Health-synced run, published to Nostr outside the modal: no event id
// locally. This is the case key 2 of isDuplicateWorkout exists for.
const healthWorkout: DedupCandidate = {
  nostrEventId: undefined,
  type: 'running',
  startTime: '2026-09-17T06:15:00.000Z',
  duration: 2400,
};

const localHistory: DedupCandidate[] = [gpsWorkout, healthWorkout];
const localHistoryLengthBefore = localHistory.length;

// What comes back from relays for the SAME two workouts. The GPS one keeps
// its event id (small jitter in startTime, as resolveWorkoutStartSeconds
// vs. the exact local clock would produce). The Health one arrives with a
// nostrEventId the local copy never had — the zapper/another client's note
// for a workout the phone already holds — so only the time/type key can
// catch it.
const relayGpsCopy: DedupCandidate = {
  ...gpsWorkout,
  startTime: '2026-09-18T07:00:15.000Z',
};
const relayHealthCopy: DedupCandidate = {
  nostrEventId: 'evt-relay-for-health-workout',
  type: 'running',
  startTime: '2026-09-17T06:15:20.000Z',
  duration: 2402,
};

const relayCopies = [relayGpsCopy, relayHealthCopy];
const wouldImport = relayCopies.filter((w) => !isDuplicateWorkout(localHistory, w));
check(
  wouldImport.length === 0,
  `zero of ${relayCopies.length} relay copies of already-held workouts would be imported (got ${wouldImport.length})`
);

// A genuinely new workout, from another client, must still come through.
const genuinelyNew: DedupCandidate = {
  nostrEventId: 'evt-new-from-another-client',
  type: 'running',
  startTime: '2026-09-16T06:00:00.000Z',
  duration: 1500,
};
check(
  !isDuplicateWorkout(localHistory, genuinelyNew),
  'a genuinely new workout from another client is still imported'
);

// Backfill must never shrink local history.
check(
  localHistory.length === localHistoryLengthBefore,
  'local history array is never shrunk by dedup checks'
);

// ---------------------------------------------------------------------------
// (c) Duration guard: non-finite/zero duration declines the time key
// ---------------------------------------------------------------------------
console.log('\n=== (c) Duration guard (data-loss direction) ===');

const sameWindowType = 'running';
const sameWindowStart = '2026-09-15T06:00:00.000Z';
const sameWindowStartWithinTolerance = '2026-09-15T06:00:10.000Z';

// Control: identical type/time window, BOTH durations valid and within
// tolerance — this MUST match, proving the declines below are caused
// specifically by the duration guard and not by type/time mismatch.
const controlExisting: DedupCandidate = {
  nostrEventId: undefined,
  type: sameWindowType,
  startTime: sameWindowStart,
  duration: 1800,
};
const controlCandidate: DedupCandidate = {
  nostrEventId: undefined,
  type: sameWindowType,
  startTime: sameWindowStartWithinTolerance,
  duration: 1802,
};
check(
  isDuplicateWorkout([controlExisting], controlCandidate),
  'control: same type/time window with two VALID durations does match'
);

// Existing workout has a non-finite (corrupt) duration.
const existingWithNaNDuration: DedupCandidate = {
  nostrEventId: undefined,
  type: sameWindowType,
  startTime: sameWindowStart,
  duration: NaN,
};
check(
  !isDuplicateWorkout([existingWithNaNDuration], controlCandidate),
  'a non-finite EXISTING duration declines the time key (does not falsely mark a distinct workout duplicate)'
);

// Two UNRELATED workouts that both have a zero duration — the known
// failure sentinel from upstream parsing (see workoutDedup.ts). Without the
// guard, 0 vs 0 is a perfect (but bogus) duration match: this is the actual
// risk the guard exists for, not merely "0 happens to differ from 1800 by
// more than the tolerance" (which the raw numeric check would already
// reject on its own, so testing against a large duration would not pin the
// zero-sentinel branch specifically).
const existingWithZeroDuration: DedupCandidate = {
  nostrEventId: undefined,
  type: sameWindowType,
  startTime: sameWindowStart,
  duration: 0,
};
const candidateWithZeroDuration: DedupCandidate = {
  nostrEventId: undefined,
  type: sameWindowType,
  startTime: sameWindowStartWithinTolerance,
  duration: 0,
};
check(
  !isDuplicateWorkout([existingWithZeroDuration], candidateWithZeroDuration),
  'two unrelated workouts that both have a zero (unknown) duration are not falsely matched'
);

console.log(
  failures === 0 ? '\nGate passed.' : `\n${failures} check(s) failed — DO NOT SHIP.`
);
process.exit(failures === 0 ? 0 : 1);
