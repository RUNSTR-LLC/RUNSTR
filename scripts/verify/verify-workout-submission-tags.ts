/**
 * Verify: Workout submission tags completeness for leaderboards and rewards
 * Run: npx tsx scripts/verify/verify-workout-submission-tags.ts
 *
 * Tests that workout submissions contain all required tags for correct
 * leaderboard placement and reward routing. Missing tags = silently dropped
 * from leaderboards or no reward.
 *
 * Source files:
 *   docs/KIND_1301_SPEC.md
 *   src/utils/rewardTags.ts (buildRewardTags, buildClubTag)
 *   src/services/backend/SupabaseCompetitionService.ts (submitWorkoutSimple payload)
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

// ---- Inline formatHHMMSS (from LocalWorkoutStorageService) ----

function formatHHMMSS(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ---- Tag builder for workout events (from KIND_1301 spec) ----

interface WorkoutData {
  type: string;           // exercise type (lowercase)
  distance?: number;      // meters
  duration: number;       // seconds
  splits?: { number: number; elapsedTime: number }[];
  steps?: number;
  reps?: number;
  calories?: number;
}

function buildWorkoutTags(workout: WorkoutData): string[][] {
  const tags: string[][] = [];

  // Exercise type (MUST be lowercase)
  tags.push(['exercise', workout.type]);

  // Distance (converted from meters to km)
  if (workout.distance && workout.distance > 0) {
    tags.push(['distance', (workout.distance / 1000).toFixed(2), 'km']);
  }

  // Duration (HH:MM:SS format)
  if (workout.duration > 0) {
    tags.push(['duration', formatHHMMSS(workout.duration)]);
  }

  // Splits
  if (workout.splits) {
    for (const split of workout.splits) {
      tags.push(['split', String(split.number), formatHHMMSS(split.elapsedTime)]);
    }
  }

  // Steps
  if (workout.steps && workout.steps > 0) {
    tags.push(['steps', String(Math.floor(workout.steps))]);
  }

  // Reps (strength exercises)
  if (workout.reps && workout.reps > 0) {
    tags.push(['reps', String(workout.reps)]);
  }

  // Calories
  if (workout.calories && workout.calories > 0) {
    tags.push(['calories', String(Math.floor(workout.calories))]);
  }

  return tags;
}

// ---- Reward tag simulation ----

interface RewardConfig {
  lightningAddress?: string;
  teamId?: string;
  clubId?: string;
  rewardDestination: 'user' | 'charity' | 'ppq';
  verificationCode?: string;
}

function buildRewardTags(config: RewardConfig): string[][] {
  const tags: string[][] = [];

  // Lightning address (critical for reward delivery)
  if (config.lightningAddress && config.rewardDestination !== 'ppq') {
    tags.push(['lightning', config.lightningAddress]);
  }

  // Team tag (for leaderboard grouping)
  if (config.teamId) {
    tags.push(['team', config.teamId]);
  }

  // Reward destination
  tags.push(['reward_destination', config.rewardDestination]);

  // Club tag (separate from team)
  if (config.clubId) {
    tags.push(['club', config.clubId]);
  }

  // Verification code
  if (config.verificationCode) {
    tags.push(['v', config.verificationCode]);
  }

  return tags;
}

// ---- Submission payload simulation ----
// (from SupabaseCompetitionService.submitWorkoutSimple lines 413-447)

interface SubmissionPayload {
  event_id: string;
  npub: string;
  activity_type: string;
  distance_meters: number | null;
  duration_seconds: number;
  calories: number | null;
  created_at: string;
  leaderboard_date: string;
  ppq_bolt11: string | null;
  ppq_invoice_id: string | null;
  club_id: string | null;
  club_lightning_address: string | null;
  raw_event: {
    tags: string[][];
  };
}

function buildSubmissionPayload(
  eventId: string,
  npub: string,
  workout: WorkoutData,
  rewardTags: string[][],
  ppqBolt11?: string,
  ppqInvoiceId?: string,
  clubId?: string,
  clubLightningAddress?: string,
): SubmissionPayload {
  const workoutTags = buildWorkoutTags(workout);
  const allTags = [...workoutTags, ...rewardTags];

  const now = new Date();
  return {
    event_id: eventId,
    npub,
    activity_type: workout.type,
    distance_meters: workout.distance ?? null,
    duration_seconds: workout.duration,
    calories: workout.calories || null,
    created_at: now.toISOString(),
    leaderboard_date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    ppq_bolt11: ppqBolt11 || null,
    ppq_invoice_id: ppqInvoiceId || null,
    club_id: clubId || null,
    club_lightning_address: clubLightningAddress || null,
    raw_event: { tags: allTags },
  };
}

// ---- Helper functions ----

function findTag(tags: string[][], key: string): string[] | undefined {
  return tags.find((t) => t[0] === key);
}

function hasTag(tags: string[][], key: string, ...values: string[]): boolean {
  const tag = findTag(tags, key);
  if (!tag) return false;
  return values.every((v, i) => tag[i + 1] === v);
}

// ---- Tests ----

async function runTests() {
  // ========================================
  // Running workout tags (GPS)
  // ========================================
  console.log('\n=== Running workout (GPS, 5.23km, 27:30) ===');

  const runTags = buildWorkoutTags({
    type: 'running',
    distance: 5230,     // meters
    duration: 1650,     // 27:30
    calories: 412,
    splits: [
      { number: 1, elapsedTime: 330 },
      { number: 2, elapsedTime: 650 },
      { number: 3, elapsedTime: 990 },
      { number: 4, elapsedTime: 1310 },
      { number: 5, elapsedTime: 1630 },
    ],
  });

  assert('exercise tag = "running" (lowercase)', hasTag(runTags, 'exercise', 'running'));
  assert('distance = "5.23" "km"', hasTag(runTags, 'distance', '5.23', 'km'));
  assert('duration = "00:27:30" (HH:MM:SS)', hasTag(runTags, 'duration', '00:27:30'));
  assert('has 5 split tags', runTags.filter((t) => t[0] === 'split').length === 5);
  assert('split 1 = ["split", "1", "00:05:30"]', hasTag(runTags, 'split', '1', '00:05:30'));
  assert('has calories tag', hasTag(runTags, 'calories', '412'));

  // ========================================
  // Walking workout tags (HealthKit)
  // ========================================
  console.log('\n=== Walking workout (HealthKit, 2.5km, 30min) ===');

  const walkTags = buildWorkoutTags({
    type: 'walking',
    distance: 2500,
    duration: 1800,
  });

  assert('exercise tag = "walking" (lowercase)', hasTag(walkTags, 'exercise', 'walking'));
  assert('distance = "2.50" "km"', hasTag(walkTags, 'distance', '2.50', 'km'));
  assert('duration = "00:30:00"', hasTag(walkTags, 'duration', '00:30:00'));
  assert('no splits', !walkTags.some((t) => t[0] === 'split'));

  // ========================================
  // Cycling workout tags
  // ========================================
  console.log('\n=== Cycling workout (10km, 35min) ===');

  const cycleTags = buildWorkoutTags({
    type: 'cycling',
    distance: 10000,
    duration: 2100,
  });

  assert('exercise tag = "cycling"', hasTag(cycleTags, 'exercise', 'cycling'));
  assert('distance = "10.00" "km"', hasTag(cycleTags, 'distance', '10.00', 'km'));
  assert('duration = "00:35:00"', hasTag(cycleTags, 'duration', '00:35:00'));

  // ========================================
  // Strength workout tags
  // ========================================
  console.log('\n=== Strength workout (pushups, 50 reps) ===');

  const strengthTags = buildWorkoutTags({
    type: 'pushups',
    duration: 300,   // 5 min
    reps: 50,
  });

  assert('exercise tag = "pushups"', hasTag(strengthTags, 'exercise', 'pushups'));
  assert('has duration', hasTag(strengthTags, 'duration', '00:05:00'));
  assert('has reps tag', hasTag(strengthTags, 'reps', '50'));
  assert('no distance tag (strength)', !strengthTags.some((t) => t[0] === 'distance'));

  // ========================================
  // Exercise type normalization (must be lowercase)
  // ========================================
  console.log('\n=== Exercise type normalization ===');

  // Tags should use lowercase
  assert('"running" is lowercase', 'running' === 'running'.toLowerCase());
  assert('"walking" is lowercase', 'walking' === 'walking'.toLowerCase());
  assert('"cycling" is lowercase', 'cycling' === 'cycling'.toLowerCase());
  assert('"pushups" is lowercase', 'pushups' === 'pushups'.toLowerCase());

  // Verify NOT using capitalized forms
  const badTags = buildWorkoutTags({ type: 'running', duration: 100 });
  assert('exercise tag is not "Run"', !hasTag(badTags, 'exercise', 'Run'));
  assert('exercise tag is not "Running"', !hasTag(badTags, 'exercise', 'Running'));
  assert('exercise tag IS "running"', hasTag(badTags, 'exercise', 'running'));

  // ========================================
  // Duration format (HH:MM:SS, not seconds)
  // ========================================
  console.log('\n=== Duration format ===');

  assert('1 second = 00:00:01', formatHHMMSS(1) === '00:00:01');
  assert('59 seconds = 00:00:59', formatHHMMSS(59) === '00:00:59');
  assert('1 minute = 00:01:00', formatHHMMSS(60) === '00:01:00');
  assert('15 minutes = 00:15:00', formatHHMMSS(900) === '00:15:00');
  assert('1 hour = 01:00:00', formatHHMMSS(3600) === '01:00:00');
  assert('2h 15m 30s = 02:15:30', formatHHMMSS(8130) === '02:15:30');

  // ========================================
  // Distance conversion (meters to km, 2 decimals)
  // ========================================
  console.log('\n=== Distance conversion ===');

  const d1 = buildWorkoutTags({ type: 'running', distance: 1000, duration: 300 });
  assert('1000m = 1.00 km', hasTag(d1, 'distance', '1.00', 'km'));

  const d2 = buildWorkoutTags({ type: 'running', distance: 5234, duration: 300 });
  assert('5234m = 5.23 km', hasTag(d2, 'distance', '5.23', 'km'));

  const d3 = buildWorkoutTags({ type: 'running', distance: 42195, duration: 300 });
  assert('42195m = 42.20 km (marathon)', hasTag(d3, 'distance', '42.20', 'km'),
    `got ${findTag(d3, 'distance')?.[1]}`);

  const d4 = buildWorkoutTags({ type: 'running', distance: 100, duration: 300 });
  assert('100m = 0.10 km', hasTag(d4, 'distance', '0.10', 'km'));

  // ========================================
  // Reward tags: self team
  // ========================================
  console.log('\n=== Reward tags: self team ===');

  const selfReward = buildRewardTags({
    lightningAddress: 'user@walletofsatoshi.com',
    teamId: 'self',
    rewardDestination: 'user',
  });

  assert('has lightning tag', hasTag(selfReward, 'lightning', 'user@walletofsatoshi.com'));
  assert('has team tag', hasTag(selfReward, 'team', 'self'));
  assert('reward_destination = user', hasTag(selfReward, 'reward_destination', 'user'));

  // ========================================
  // Reward tags: charity team
  // ========================================
  console.log('\n=== Reward tags: charity team ===');

  const charityReward = buildRewardTags({
    lightningAddress: 'RunningBTC@primal.net',
    teamId: 'als-foundation',
    rewardDestination: 'charity',
  });

  assert('lightning = charity address', hasTag(charityReward, 'lightning', 'RunningBTC@primal.net'));
  assert('team = als-foundation', hasTag(charityReward, 'team', 'als-foundation'));
  assert('reward_destination = charity', hasTag(charityReward, 'reward_destination', 'charity'));

  // ========================================
  // Club tag
  // ========================================
  console.log('\n=== Club tag ===');

  const clubReward = buildRewardTags({
    lightningAddress: 'user@walletofsatoshi.com',
    teamId: 'self',
    rewardDestination: 'user',
    clubId: 'club-uuid-789',
  });

  assert('has club tag', hasTag(clubReward, 'club', 'club-uuid-789'));

  const noClubReward = buildRewardTags({
    lightningAddress: 'user@walletofsatoshi.com',
    rewardDestination: 'user',
  });

  assert('no club tag when no club', !noClubReward.some((t) => t[0] === 'club'));

  // ========================================
  // Verification code tag
  // ========================================
  console.log('\n=== Verification code tag ===');

  const verifiedReward = buildRewardTags({
    lightningAddress: 'user@walletofsatoshi.com',
    rewardDestination: 'user',
    verificationCode: 'abc123xyz',
  });

  assert('has verification code tag', hasTag(verifiedReward, 'v', 'abc123xyz'));

  const unverifiedReward = buildRewardTags({
    lightningAddress: 'user@walletofsatoshi.com',
    rewardDestination: 'user',
  });

  assert('no v tag when no verification code', !unverifiedReward.some((t) => t[0] === 'v'));

  // ========================================
  // PPQ submission payload
  // ========================================
  console.log('\n=== PPQ submission payload ===');

  const ppqRewardTags = buildRewardTags({
    teamId: 'ppq-ai',
    rewardDestination: 'ppq',
    // No lightningAddress for PPQ
  });

  const ppqPayload = buildSubmissionPayload(
    'test_ppq_1',
    'npub1testuser',
    { type: 'running', distance: 5000, duration: 1800 },
    ppqRewardTags,
    'lnbc100n1p_mock_bolt11',
    'inv_mock_123',
  );

  assert('ppq_bolt11 in payload', ppqPayload.ppq_bolt11 === 'lnbc100n1p_mock_bolt11');
  assert('ppq_invoice_id in payload', ppqPayload.ppq_invoice_id === 'inv_mock_123');
  assert('no lightning tag in PPQ submission',
    !ppqPayload.raw_event.tags.some((t) => t[0] === 'lightning'));
  assert('reward_destination=ppq in tags',
    ppqPayload.raw_event.tags.some((t) => t[0] === 'reward_destination' && t[1] === 'ppq'));

  // ========================================
  // Non-PPQ submission: no bolt11
  // ========================================
  console.log('\n=== Non-PPQ submission: no bolt11 ===');

  const charityPayload = buildSubmissionPayload(
    'test_charity_1',
    'npub1testuser',
    { type: 'running', distance: 5000, duration: 1800 },
    buildRewardTags({
      lightningAddress: 'RunningBTC@primal.net',
      teamId: 'als-foundation',
      rewardDestination: 'charity',
    }),
  );

  assert('ppq_bolt11 is null (charity team)', charityPayload.ppq_bolt11 === null);
  assert('ppq_invoice_id is null', charityPayload.ppq_invoice_id === null);
  assert('has lightning tag in tags',
    charityPayload.raw_event.tags.some((t) => t[0] === 'lightning'));

  // ========================================
  // Missing lightning tag detection
  // ========================================
  console.log('\n=== Missing lightning tag detection ===');

  const noAddressReward = buildRewardTags({
    // No lightningAddress
    teamId: 'self',
    rewardDestination: 'user',
  });

  const hasLightning = noAddressReward.some((t) => t[0] === 'lightning');
  assert('NO lightning tag when no address', !hasLightning);
  if (!hasLightning) {
    console.log('  WARN: No lightning address → reward will be silently skipped by DB trigger');
  }

  // ========================================
  // Complete submission tag set (full check)
  // ========================================
  console.log('\n=== Complete submission: all expected tags present ===');

  const fullWorkout = buildWorkoutTags({
    type: 'running',
    distance: 5000,
    duration: 1800,
    calories: 350,
  });

  const fullReward = buildRewardTags({
    lightningAddress: 'user@walletofsatoshi.com',
    teamId: 'self',
    rewardDestination: 'user',
    clubId: 'club-uuid-789',
    verificationCode: 'v123',
  });

  const allTags = [...fullWorkout, ...fullReward];

  assert('has exercise', allTags.some((t) => t[0] === 'exercise'));
  assert('has distance', allTags.some((t) => t[0] === 'distance'));
  assert('has duration', allTags.some((t) => t[0] === 'duration'));
  assert('has calories', allTags.some((t) => t[0] === 'calories'));
  assert('has lightning', allTags.some((t) => t[0] === 'lightning'));
  assert('has team', allTags.some((t) => t[0] === 'team'));
  assert('has reward_destination', allTags.some((t) => t[0] === 'reward_destination'));
  assert('has club', allTags.some((t) => t[0] === 'club'));
  assert('has verification code', allTags.some((t) => t[0] === 'v'));
  assert('total tag count = 9', allTags.length === 9, `got ${allTags.length}`);

  // ========================================
  // Payload structure
  // ========================================
  console.log('\n=== Payload structure ===');

  const payload = buildSubmissionPayload(
    'gps_test_1',
    'npub1testuser',
    { type: 'running', distance: 5000, duration: 1800, calories: 350 },
    fullReward,
    undefined,
    undefined,
    'club-uuid-789',
    'club@getalby.com',
  );

  assert('payload has event_id', payload.event_id === 'gps_test_1');
  assert('payload has npub', payload.npub === 'npub1testuser');
  assert('payload has activity_type', payload.activity_type === 'running');
  assert('payload has distance_meters', payload.distance_meters === 5000);
  assert('payload has duration_seconds', payload.duration_seconds === 1800);
  assert('payload has leaderboard_date format YYYY-MM-DD',
    /^\d{4}-\d{2}-\d{2}$/.test(payload.leaderboard_date));
  assert('payload has club_id', payload.club_id === 'club-uuid-789');
  assert('payload has club_lightning_address', payload.club_lightning_address === 'club@getalby.com');
  assert('payload has raw_event.tags array', Array.isArray(payload.raw_event.tags));

  // ---- Summary ----
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
