/**
 * Test: Club Operations
 * Run: npx tsx scripts/core-tests/test-club-operations.ts
 *
 * Tests the Fitness Club system:
 * 1. Verifies ClubMembershipService methods (join, leave, members, cooldown)
 * 2. Verifies ClubChatService methods (send, get, subscribe)
 * 3. Checks club creation path (Pro-only guard)
 * 4. Validates 7-day cooldown logic
 * 5. Tests live Supabase connectivity against user_teams table
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
// Test 1: ClubMembershipService methods
// ---------------------------------------------------------------------------

function testClubMembershipService() {
  console.log('\n=== ClubMembershipService methods ===\n');

  const srcRoot = path.join(__dirname, '../../src');
  const src = fs.readFileSync(
    path.join(srcRoot, 'services/backend/ClubMembershipService.ts'),
    'utf8'
  );

  assert(
    'joinClub method exists',
    src.includes('static async joinClub(')
  );

  assert(
    'leaveClub method exists',
    src.includes('static async leaveClub(')
  );

  assert(
    'getClubMembers method exists',
    src.includes('static async getClubMembers(')
  );

  assert(
    'getCurrentClub method exists',
    src.includes('static async getCurrentClub(')
  );

  assert(
    'getCooldownRemaining method exists',
    src.includes('static async getCooldownRemaining(')
  );

  // Singleton enforcement: one club at a time
  assert(
    'Enforces one club at a time (UNIQUE index comment)',
    src.includes('ONE club at a time') || src.includes('UNIQUE')
  );
}

// ---------------------------------------------------------------------------
// Test 2: 7-day cooldown logic
// ---------------------------------------------------------------------------

function testCooldownLogic() {
  console.log('\n=== 7-day cooldown logic ===\n');

  const srcRoot = path.join(__dirname, '../../src');
  const src = fs.readFileSync(
    path.join(srcRoot, 'services/backend/ClubMembershipService.ts'),
    'utf8'
  );

  assert(
    'COOLDOWN_DAYS is defined as 7',
    src.includes('COOLDOWN_DAYS = 7')
  );

  assert(
    'COOLDOWN_MS is derived from COOLDOWN_DAYS',
    src.includes('COOLDOWN_MS = COOLDOWN_DAYS')
  );

  assert(
    'Captains are exempt from cooldown',
    src.includes("role === 'captain'") && src.includes('exempt')
  );

  assert(
    'Cooldown calculates remaining days',
    src.includes('remainingDays') || src.includes('remainingMs')
  );

  assert(
    'Cooldown returns canLeave boolean',
    src.includes('canLeave: false') && src.includes('canLeave: true')
  );

  // Fails open on error
  assert(
    'Cooldown fails open on error (canLeave: true)',
    src.includes('failing open') || src.includes('CAN_LEAVE')
  );
}

// ---------------------------------------------------------------------------
// Test 3: ClubChatService methods
// ---------------------------------------------------------------------------

function testClubChatService() {
  console.log('\n=== ClubChatService methods ===\n');

  const srcRoot = path.join(__dirname, '../../src');
  const src = fs.readFileSync(
    path.join(srcRoot, 'services/backend/ClubChatService.ts'),
    'utf8'
  );

  assert(
    'sendMessage method exists',
    src.includes('static async sendMessage(')
  );

  assert(
    'getMessages method exists',
    src.includes('static async getMessages(')
  );

  assert(
    'deleteMessage method exists',
    src.includes('static async deleteMessage(')
  );

  assert(
    'subscribeToMessages method exists',
    src.includes('static subscribeToMessages(')
  );

  // Real-time subscription
  assert(
    'Uses RealtimeChannel for live messages',
    src.includes('RealtimeChannel')
  );

  assert(
    'Has active channel tracking',
    src.includes('activeChannel') && src.includes('activeClubId')
  );

  // Rate limiting
  assert(
    'Client-side rate limit: 5 messages per 60 seconds',
    src.includes('RATE_LIMIT_MAX = 5') && src.includes('RATE_LIMIT_WINDOW = 60')
  );

  // Content limits
  assert(
    'Message content max length is 1000',
    src.includes('MAX_CONTENT_LENGTH = 1000')
  );

  // Cache
  assert(
    'Chat messages are cached with 5-min TTL',
    src.includes('CACHE_TTL') && src.includes('5 * 60 * 1000')
  );

  assert(
    'Cache limited to 50 messages per club',
    src.includes('MAX_CACHED_MESSAGES = 50')
  );

  // Send timeout
  assert(
    'Send message has 10s timeout',
    src.includes('SEND_TIMEOUT_MS = 10_000') || src.includes('SEND_TIMEOUT_MS = 10000')
  );
}

// ---------------------------------------------------------------------------
// Test 4: Club creation path (Pro-only)
// ---------------------------------------------------------------------------

function testClubCreationPath() {
  console.log('\n=== Club creation path ===\n');

  const srcRoot = path.join(__dirname, '../../src');

  // Check SimpleTeamCreationModal for the create-club action
  const modalPath = path.join(srcRoot, 'components/subscription/SimpleTeamCreationModal.tsx');
  const modalExists = fs.existsSync(modalPath);
  assert('SimpleTeamCreationModal exists', modalExists);

  if (modalExists) {
    const modal = fs.readFileSync(modalPath, 'utf8');
    assert(
      'Club creation uses create-club action via Edge Function',
      modal.includes("'create-club'") || modal.includes('"create-club"')
    );
  }

  // Verify ClubService reads from user_teams table
  const clubServicePath = path.join(srcRoot, 'services/backend/ClubService.ts');
  assert('ClubService.ts exists', fs.existsSync(clubServicePath));

  const clubService = fs.readFileSync(clubServicePath, 'utf8');
  assert(
    'ClubService queries user_teams table',
    clubService.includes("from('user_teams')")
  );

  assert(
    'ClubService filters by is_active',
    clubService.includes("eq('is_active', true)")
  );

  assert(
    'ClubService orders by member_count',
    clubService.includes("order('member_count'")
  );
}

// ---------------------------------------------------------------------------
// Test 5: Club data shape
// ---------------------------------------------------------------------------

function testClubDataShape() {
  console.log('\n=== Club data shape ===\n');

  const srcRoot = path.join(__dirname, '../../src');

  // Check types/club.ts for the Club interface
  const clubTypesPath = path.join(srcRoot, 'types/club.ts');
  const clubTypesExist = fs.existsSync(clubTypesPath);
  assert('types/club.ts exists', clubTypesExist);

  if (clubTypesExist) {
    const types = fs.readFileSync(clubTypesPath, 'utf8');

    assert(
      'Club interface exists',
      types.includes('interface Club') || types.includes('export interface Club')
    );

    // Check for key fields
    const hasId = types.includes('id:') || types.includes('id?:');
    const hasName = types.includes('name:') || types.includes('name?:');
    const hasCaptain = types.includes('created_by_npub') || types.includes('captain_pubkey') || types.includes('captain_npub');
    const hasMemberCount = types.includes('member_count');

    assert('Club has id field', hasId);
    assert('Club has name field', hasName);
    assert('Club has captain/creator field (created_by_npub)', hasCaptain);
    assert('Club has member_count field', hasMemberCount);
  }

  // Membership service caches club state locally
  const membershipSrc = fs.readFileSync(
    path.join(srcRoot, 'services/backend/ClubMembershipService.ts'),
    'utf8'
  );

  assert(
    'Club ID cached in AsyncStorage with @runstr:club_id',
    membershipSrc.includes("'@runstr:club_id'")
  );

  assert(
    'Club name cached in AsyncStorage with @runstr:club_name',
    membershipSrc.includes("'@runstr:club_name'")
  );

  assert(
    'Club role cached in AsyncStorage with @runstr:club_role',
    membershipSrc.includes("'@runstr:club_role'")
  );
}

// ---------------------------------------------------------------------------
// Test 6: Reconciliation (stale membership detection)
// ---------------------------------------------------------------------------

function testReconciliation() {
  console.log('\n=== Club membership reconciliation ===\n');

  const srcRoot = path.join(__dirname, '../../src');
  const src = fs.readFileSync(
    path.join(srcRoot, 'services/backend/ClubMembershipService.ts'),
    'utf8'
  );

  assert(
    'Reconciliation key exists',
    src.includes('RECONCILIATION_KEY')
  );

  assert(
    'Reconciliation has TTL (5 min)',
    src.includes('RECONCILIATION_TTL') && src.includes('5 * 60 * 1000')
  );

  assert(
    'Reconciliation clears stale local state',
    src.includes('clearLocalClubState')
  );

  assert(
    'Reconciliation handles deactivated clubs',
    src.includes('is_active') && src.includes('deactivated')
  );
}

// ---------------------------------------------------------------------------
// Test 7: Live Supabase connectivity
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

  // Test: user_teams table is queryable
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `${supabaseUrl}/rest/v1/user_teams?select=id,name,member_count&is_active=eq.true&limit=1`,
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
        'user_teams table is queryable',
        Array.isArray(data),
        `Got ${data.length} rows`
      );

      if (data.length > 0) {
        const club = data[0];
        assert(
          'Club row has id',
          club.id !== undefined
        );
        assert(
          'Club row has name',
          typeof club.name === 'string'
        );
        assert(
          'Club row has member_count',
          typeof club.member_count === 'number'
        );
      }
    } else {
      assert('user_teams table is queryable', false, `HTTP ${response.status}`);
    }
  } catch (err: any) {
    assert('user_teams table is queryable', false, err.message);
  }

  // Test: club_memberships table is queryable
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `${supabaseUrl}/rest/v1/club_memberships?select=club_id&limit=1`,
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
      'club_memberships table is queryable',
      response.ok,
      response.ok ? 'OK' : `HTTP ${response.status}`
    );
  } catch (err: any) {
    assert('club_memberships table is queryable', false, err.message);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('\n=== Club Operations Tests ===');

  testClubMembershipService();
  testCooldownLogic();
  testClubChatService();
  testClubCreationPath();
  testClubDataShape();
  testReconciliation();
  await testSupabaseConnectivity();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
