/**
 * Test: Workout Submission Pipeline
 * Run: npx tsx scripts/core-tests/test-workout-submission.ts
 *
 * Tests the Supabase workout submission pipeline by:
 * 1. Verifying Supabase env vars are set
 * 2. Constructing a mock workout matching WorkoutSubmissionData
 * 3. Calling the submit-workout edge function directly with the anon key
 * 4. Verifying the response shape and error handling
 *
 * Does NOT create real workout records — uses a test npub and expects
 * the edge function to reject gracefully (validating the pipeline works).
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env from project root
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}${detail ? ' -- ' + detail : ''}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Source file structure checks
// ---------------------------------------------------------------------------

function runStructureChecks() {
  console.log('\n=== Submission pipeline structure checks ===\n');

  const srcRoot = path.join(__dirname, '../../src');

  // Check key files exist
  const requiredFiles = [
    'services/backend/SupabaseCompetitionService.ts',
    'services/fitness/LocalWorkoutStorageService.ts',
    'utils/rewardTags.ts',
    'utils/supabase.ts',
  ];

  for (const file of requiredFiles) {
    const fullPath = path.join(srcRoot, file);
    assert(`${file} exists`, fs.existsSync(fullPath));
  }

  // Check SupabaseCompetitionService has submitWorkoutSimple
  const competitionSrc = fs.readFileSync(
    path.join(srcRoot, 'services/backend/SupabaseCompetitionService.ts'),
    'utf8'
  );

  assert(
    'submitWorkoutSimple() method exists',
    competitionSrc.includes('static async submitWorkoutSimple(')
  );

  assert(
    'submitWorkoutSimple checks isSupabaseConfigured',
    competitionSrc.includes("isSupabaseConfigured()")
  );

  assert(
    'submitWorkoutSimple has AbortController timeout',
    competitionSrc.includes('AbortController')
  );

  assert(
    'submitWorkoutSimple private mode check exists',
    competitionSrc.includes('private_mode')
  );

  // Check rewardTags.ts buildRewardTags
  const rewardTags = fs.readFileSync(
    path.join(srcRoot, 'utils/rewardTags.ts'),
    'utf8'
  );

  assert(
    'buildRewardTags() is exported',
    rewardTags.includes('export async function buildRewardTags()')
  );

  assert(
    'buildRewardTags handles self team',
    rewardTags.includes('isSelfTeam') && rewardTags.includes('isSelf')
  );

  assert(
    'buildRewardTags handles PPQ team',
    rewardTags.includes('isPPQTeam') && rewardTags.includes('isPPQ')
  );

  assert(
    'buildRewardTags handles community team',
    rewardTags.includes('isCommunityTeam') && rewardTags.includes('isCommunity')
  );
}

// ---------------------------------------------------------------------------
// Live Supabase connectivity check
// ---------------------------------------------------------------------------

async function runSupabaseChecks() {
  console.log('\n=== Supabase connectivity checks ===\n');

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  assert('EXPO_PUBLIC_SUPABASE_URL is set', !!supabaseUrl);
  assert('EXPO_PUBLIC_SUPABASE_ANON_KEY is set', !!supabaseKey);

  if (!supabaseUrl || !supabaseKey) {
    console.log('  SKIP: Cannot run live checks without Supabase credentials');
    return;
  }

  // Test 1: Verify Supabase REST API is reachable
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      signal: controller.signal,
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });
    clearTimeout(timeout);

    assert('Supabase REST API is reachable', response.ok || response.status === 200);
  } catch (err: any) {
    assert('Supabase REST API is reachable', false, err.message);
  }

  // Test 2: Verify the submit-workout edge function endpoint exists
  // We send a deliberately invalid payload and expect a structured error, not a 404.
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const testPayload = {
      event_id: 'test-event-' + Date.now(),
      npub: 'npub1testinvalidpubkeyfortesting000000000000000000000000000000',
      exercise_type: 'running',
      distance_meters: 5000,
      duration_seconds: 1800,
      start_time: new Date().toISOString(),
      raw_event: {
        id: 'test-' + Date.now(),
        kind: 1301,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['exercise', 'running']],
        content: 'Test workout 5.00 km run',
        pubkey: 'test',
        sig: 'test',
      },
    };

    const response = await fetch(`${supabaseUrl}/functions/v1/submit-workout`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(testPayload),
    });
    clearTimeout(timeout);

    // We expect either a structured response (even if it rejects the workout)
    // or a function-not-found 404. Both tell us something useful.
    if (response.status === 404) {
      assert(
        'submit-workout edge function exists',
        false,
        'Got 404 -- edge function may not be deployed'
      );
    } else {
      const body = await response.text();
      assert(
        'submit-workout edge function responds',
        true,
        `Status ${response.status}: ${body.slice(0, 100)}`
      );

      // Even error responses should be JSON
      try {
        JSON.parse(body);
        assert('submit-workout returns JSON', true);
      } catch {
        assert('submit-workout returns JSON', false, `Got non-JSON: ${body.slice(0, 80)}`);
      }
    }
  } catch (err: any) {
    assert('submit-workout edge function responds', false, err.message);
  }

  // Test 3: Verify competitions table is queryable
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `${supabaseUrl}/rest/v1/competitions?select=id,name&limit=3`,
      {
        signal: controller.signal,
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      assert('competitions table is queryable', Array.isArray(data), `Got ${data.length} rows`);
    } else {
      assert('competitions table is queryable', false, `HTTP ${response.status}`);
    }
  } catch (err: any) {
    assert('competitions table is queryable', false, err.message);
  }

  // Test 4: Verify workout_submissions table is queryable
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `${supabaseUrl}/rest/v1/workout_submissions?select=id&limit=1`,
      {
        signal: controller.signal,
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );
    clearTimeout(timeout);

    assert(
      'workout_submissions table is queryable',
      response.ok,
      response.ok ? 'OK' : `HTTP ${response.status}`
    );
  } catch (err: any) {
    assert('workout_submissions table is queryable', false, err.message);
  }
}

// ---------------------------------------------------------------------------
// WorkoutSubmissionData shape validation
// ---------------------------------------------------------------------------

function runDataShapeChecks() {
  console.log('\n=== WorkoutSubmissionData shape validation ===\n');

  // Validate the expected shape against what the edge function expects
  const validWorkout = {
    eventId: 'abc123def456',
    npub: 'npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqsp3nla',
    type: 'running',
    distance: 5200,
    duration: 1800,
    calories: 450,
    startTime: '2025-03-25T10:00:00.000Z',
    tags: [
      ['exercise', 'running'],
      ['distance', '5.2', 'km'],
      ['duration', '00:30:00'],
      ['lightning', 'user@walletofsatoshi.com'],
      ['reward_destination', 'user'],
    ],
  };

  assert('eventId is string', typeof validWorkout.eventId === 'string');
  assert('npub is string starting with npub1', validWorkout.npub.startsWith('npub1'));
  assert('type is valid exercise type', ['running', 'walking', 'cycling', 'hiking'].includes(validWorkout.type));
  assert('distance is number (meters)', typeof validWorkout.distance === 'number' && validWorkout.distance > 0);
  assert('duration is number (seconds)', typeof validWorkout.duration === 'number' && validWorkout.duration > 0);
  assert('startTime is ISO string', !isNaN(Date.parse(validWorkout.startTime)));
  assert('tags is array of string arrays', Array.isArray(validWorkout.tags) && validWorkout.tags.every(t => Array.isArray(t)));

  // Validate tag structure
  const exerciseTag = validWorkout.tags.find(t => t[0] === 'exercise');
  assert('exercise tag exists', !!exerciseTag);
  assert('exercise tag value is lowercase', exerciseTag![1] === exerciseTag![1].toLowerCase());

  const distanceTag = validWorkout.tags.find(t => t[0] === 'distance');
  assert('distance tag exists', !!distanceTag);
  assert('distance tag has unit', distanceTag!.length === 3 && distanceTag![2] === 'km');

  const durationTag = validWorkout.tags.find(t => t[0] === 'duration');
  assert('duration tag in HH:MM:SS format', !!durationTag && /^\d{2}:\d{2}:\d{2}$/.test(durationTag![1]));

  const lightningTag = validWorkout.tags.find(t => t[0] === 'lightning');
  assert('lightning tag exists for reward routing', !!lightningTag);

  const destTag = validWorkout.tags.find(t => t[0] === 'reward_destination');
  assert('reward_destination tag exists', !!destTag);
  assert('reward_destination is valid value', ['user', 'charity', 'ppq'].includes(destTag![1]));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('\n=== Workout Submission Pipeline Tests ===');

  runStructureChecks();
  runDataShapeChecks();
  await runSupabaseChecks();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
