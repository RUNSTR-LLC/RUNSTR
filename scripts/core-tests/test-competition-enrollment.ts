/**
 * Test: Competition Enrollment & Leaderboard Flow
 * Run: npx tsx scripts/core-tests/test-competition-enrollment.ts
 *
 * Tests the competition enrollment, leaderboard, and dynamic competition pipeline:
 * 1. Verifies SupabaseCompetitionService method existence and patterns
 * 2. Validates leaderboard query structure
 * 3. Checks HARDCODED_EVENT_IDS and dynamic competition filtering
 * 4. Tests live Supabase connectivity against competitions table
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

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
// Test 1: SupabaseCompetitionService method existence
// ---------------------------------------------------------------------------

function testCompetitionServiceMethods() {
  console.log('\n=== SupabaseCompetitionService methods ===\n');

  const srcRoot = path.join(__dirname, '../../src');
  const src = fs.readFileSync(
    path.join(srcRoot, 'services/backend/SupabaseCompetitionService.ts'),
    'utf8'
  );

  assert(
    'joinCompetition method exists',
    src.includes('static async joinCompetition(')
  );

  assert(
    'leaveCompetition method exists',
    src.includes('static async leaveCompetition(')
  );

  assert(
    'isParticipant method exists',
    src.includes('static async isParticipant(')
  );

  assert(
    'submitWorkoutSimple method exists',
    src.includes('static async submitWorkoutSimple(')
  );

  assert(
    'getLeaderboard method exists',
    src.includes('static async getLeaderboard(')
  );

  assert(
    'fetchDynamicCompetitions method exists',
    src.includes('static async fetchDynamicCompetitions(')
  );

  assert(
    'isInAnyActiveCompetition method exists',
    src.includes('static async isInAnyActiveCompetition(')
  );
}

// ---------------------------------------------------------------------------
// Test 2: HARDCODED_EVENT_IDS
// ---------------------------------------------------------------------------

function testHardcodedEventIds() {
  console.log('\n=== HARDCODED_EVENT_IDS ===\n');

  const srcRoot = path.join(__dirname, '../../src');
  const src = fs.readFileSync(
    path.join(srcRoot, 'services/backend/SupabaseCompetitionService.ts'),
    'utf8'
  );

  assert(
    'HARDCODED_EVENT_IDS is defined',
    src.includes('HARDCODED_EVENT_IDS')
  );

  // Extract the array content
  const match = src.match(/HARDCODED_EVENT_IDS\s*=\s*\[([\s\S]*?)\]/);
  assert(
    'HARDCODED_EVENT_IDS is an array literal',
    !!match
  );

  if (match) {
    const items = match[1].match(/'[^']+'/g) || [];
    assert(
      'HARDCODED_EVENT_IDS has multiple entries',
      items.length >= 3,
      `Found ${items.length} entries`
    );

    // Verify fetchDynamicCompetitions excludes them
    assert(
      'fetchDynamicCompetitions filters out HARDCODED_EVENT_IDS',
      src.includes('HARDCODED_EVENT_IDS.join')
    );
  }
}

// ---------------------------------------------------------------------------
// Test 3: Competition data shape and query patterns
// ---------------------------------------------------------------------------

function testCompetitionDataShape() {
  console.log('\n=== Competition data shape & query patterns ===\n');

  const srcRoot = path.join(__dirname, '../../src');
  const src = fs.readFileSync(
    path.join(srcRoot, 'services/backend/SupabaseCompetitionService.ts'),
    'utf8'
  );

  // WorkoutSubmissionData shape
  assert(
    'WorkoutSubmissionData has eventId field',
    src.includes('eventId: string;')
  );

  assert(
    'WorkoutSubmissionData has npub field',
    src.includes('npub: string;')
  );

  assert(
    'WorkoutSubmissionData has type field',
    src.includes('type: string;')
  );

  assert(
    'WorkoutSubmissionData has distance field',
    src.includes('distance?: number;')
  );

  assert(
    'WorkoutSubmissionData has duration field',
    src.includes('duration: number;')
  );

  assert(
    'WorkoutSubmissionData has startTime field',
    src.includes('startTime: string;')
  );

  assert(
    'WorkoutSubmissionData has tags field',
    src.includes('tags?: string[][];')
  );

  // Leaderboard query structure
  assert(
    'getLeaderboard queries competition_participants',
    src.includes("from('competition_participants')")
  );

  assert(
    'getLeaderboard queries workout_submissions',
    src.includes("from('workout_submissions')")
  );

  // Join uses optimistic local storage
  assert(
    'joinCompetition saves locally first (optimistic)',
    src.includes('saveLocalJoin')
  );

  assert(
    'isParticipant checks local storage first',
    src.includes('isLocallyJoined')
  );

  // Private mode check
  assert(
    'submitWorkoutSimple checks private mode',
    src.includes('private_mode')
  );

  // AbortController timeout
  assert(
    'submitWorkoutSimple has AbortController',
    src.includes('AbortController')
  );
}

// ---------------------------------------------------------------------------
// Test 4: Leaderboard hook structure
// ---------------------------------------------------------------------------

function testLeaderboardHook() {
  console.log('\n=== useSupabaseLeaderboard hook ===\n');

  const srcRoot = path.join(__dirname, '../../src');
  const src = fs.readFileSync(
    path.join(srcRoot, 'hooks/useSupabaseLeaderboard.ts'),
    'utf8'
  );

  assert(
    'Leaderboard hook imports SupabaseCompetitionService',
    src.includes('SupabaseCompetitionService')
  );

  assert(
    'Leaderboard hook has cache with 5-min TTL',
    src.includes('CACHE_TTL') && src.includes('5 * 60 * 1000')
  );

  assert(
    'Leaderboard hook uses AsyncStorage cache',
    src.includes('LEADERBOARD_CACHE_PREFIX')
  );

  assert(
    'Leaderboard hook handles charity rankings',
    src.includes('CharityRanking') || src.includes('charityRankings')
  );
}

// ---------------------------------------------------------------------------
// Test 5: useDynamicCompetitions hook
// ---------------------------------------------------------------------------

function testDynamicCompetitionsHook() {
  console.log('\n=== useDynamicCompetitions hook ===\n');

  const srcRoot = path.join(__dirname, '../../src');
  const src = fs.readFileSync(
    path.join(srcRoot, 'hooks/useDynamicCompetitions.ts'),
    'utf8'
  );

  assert(
    'Hook exports useDynamicCompetitions function',
    src.includes('export function useDynamicCompetitions()')
  );

  assert(
    'Hook derives competition status (active/upcoming/ended)',
    src.includes("'active'") && src.includes("'upcoming'") && src.includes("'ended'")
  );

  assert(
    'Hook sorts LIVE first, then UPCOMING, then ENDED',
    src.includes('STATUS_ORDER')
  );

  assert(
    'DynamicCompetition extends Competition with status field',
    src.includes('status: CompetitionStatus')
  );

  assert(
    'Hook calls fetchDynamicCompetitions',
    src.includes('fetchDynamicCompetitions')
  );

  // Grace period for ended events
  assert(
    'Ended events have a 24-hour grace period',
    src.includes('ENDED_GRACE_MS') && src.includes('24 * 60 * 60 * 1000')
  );
}

// ---------------------------------------------------------------------------
// Test 6: Live Supabase connectivity
// ---------------------------------------------------------------------------

async function testSupabaseConnectivity() {
  console.log('\n=== Supabase connectivity checks ===\n');

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  assert('EXPO_PUBLIC_SUPABASE_URL is set', !!supabaseUrl);
  assert('EXPO_PUBLIC_SUPABASE_ANON_KEY is set', !!supabaseKey);

  if (!supabaseUrl || !supabaseKey) {
    console.log('  SKIP: Cannot run live checks without Supabase credentials');
    return;
  }

  // Test: competitions table is queryable
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `${supabaseUrl}/rest/v1/competitions?select=id,name,start_date,end_date&limit=1`,
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
      assert(
        'competitions table is queryable',
        Array.isArray(data),
        `Got ${data.length} rows`
      );

      if (data.length > 0) {
        const comp = data[0];
        assert(
          'Competition has id field',
          typeof comp.id === 'string' || typeof comp.id === 'number'
        );
        assert(
          'Competition has name field',
          typeof comp.name === 'string'
        );
        assert(
          'Competition has start_date field',
          typeof comp.start_date === 'string'
        );
        assert(
          'Competition has end_date field',
          typeof comp.end_date === 'string'
        );
      }
    } else {
      assert('competitions table is queryable', false, `HTTP ${response.status}`);
    }
  } catch (err: any) {
    assert('competitions table is queryable', false, err.message);
  }

  // Test: competition_participants table is queryable
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `${supabaseUrl}/rest/v1/competition_participants?select=id&limit=1`,
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
      'competition_participants table is queryable',
      response.ok,
      response.ok ? 'OK' : `HTTP ${response.status}`
    );
  } catch (err: any) {
    assert('competition_participants table is queryable', false, err.message);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('\n=== Competition Enrollment & Leaderboard Tests ===');

  testCompetitionServiceMethods();
  testHardcodedEventIds();
  testCompetitionDataShape();
  testLeaderboardHook();
  testDynamicCompetitionsHook();
  await testSupabaseConnectivity();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
