/**
 * Verify: buildRewardTags() reward routing logic
 * Run: npx tsx scripts/verify/verify-reward-routing.ts
 *
 * Tests the most critical function in the app — determines WHERE rewards go
 * for every single workout. Inlines logic from src/utils/rewardTags.ts with
 * mocked AsyncStorage and services.
 *
 * Source: src/utils/rewardTags.ts → buildRewardTags()
 * Helpers: src/constants/charities.ts → isSelfTeam, isPPQTeam, isCommunityTeam
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

// ---- Mock infrastructure ----

// Simulates AsyncStorage.getItem
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

// ---- Inline team detection helpers (from src/constants/charities.ts) ----

const PPQ_AI_TEAM_ID = 'ppq-ai';
const SELF_TEAM_ID = 'self';
const COMMUNITY_TEAM_PREFIX = 'community-';

function isSelfTeam(teamId?: string | null): boolean {
  if (!teamId) return false;
  return teamId === SELF_TEAM_ID;
}

function isPPQTeam(teamId?: string | null): boolean {
  if (!teamId) return false;
  return teamId === PPQ_AI_TEAM_ID;
}

function isCommunityTeam(teamId?: string | null): boolean {
  if (!teamId) return false;
  return teamId.startsWith(COMMUNITY_TEAM_PREFIX);
}

function extractCommunityTeamUUID(teamId: string): string {
  return teamId.slice(COMMUNITY_TEAM_PREFIX.length);
}

// ---- Mock charity data (subset of src/constants/charities.ts) ----

interface MockCharity {
  id: string;
  name: string;
  lightningAddress?: string;
}

const MOCK_CHARITIES: MockCharity[] = [
  { id: 'ppq-ai', name: 'PPQ.AI' }, // No lightningAddress — uses bolt11
  { id: 'als-foundation', name: 'ALS Network', lightningAddress: 'RunningBTC@primal.net' },
  { id: 'human-rights-foundation', name: 'Human Rights Foundation', lightningAddress: 'nostr@btcpay.hrf.org' },
  { id: 'bitcoin-bay', name: 'Bitcoin Bay', lightningAddress: 'sats@donate.bitcoinbay.foundation' },
  { id: 'no-address-charity', name: 'No Address Charity' }, // Test case: no lightningAddress
];

function getCharityById(charityId?: string | null): MockCharity | undefined {
  if (!charityId) return undefined;
  return MOCK_CHARITIES.find((c) => c.id === charityId);
}

// ---- Mock community teams (from Supabase user_teams table) ----

interface MockCommunityTeam {
  id: string;
  name: string;
  lightning_address?: string;
}

let mockCommunityTeams: Record<string, MockCommunityTeam> = {};

function setMockCommunityTeam(uuid: string, team: MockCommunityTeam) {
  mockCommunityTeams[uuid] = team;
}

function resetMockCommunityTeams() {
  mockCommunityTeams = {};
}

// ---- Mock services ----

let mockUserLightningAddress: string | null = 'user@walletofsatoshi.com';
let mockSupabaseConfigured = true;

// ---- Inline buildRewardTags logic (from src/utils/rewardTags.ts) ----
// Adapted to use mocks instead of real AsyncStorage/services

async function buildRewardTags(): Promise<string[][]> {
  const tags: string[][] = [];

  const userLightningAddress = mockUserLightningAddress;
  const selectedTeamId = getMockStorage('@runstr:selected_team_id');

  const isSelf = selectedTeamId ? isSelfTeam(selectedTeamId) : false;
  const isPPQ = selectedTeamId ? isPPQTeam(selectedTeamId) : false;
  const isCommunity = selectedTeamId ? isCommunityTeam(selectedTeamId) : false;
  const isCharity = selectedTeamId && !isSelf && !isPPQ && !isCommunity;

  let rewardDestination: 'user' | 'charity' | 'ppq';
  let rewardLightningAddress: string | null = null;

  let communityTeamName: string | null = null;
  let communityTeamLightningAddress: string | null = null;

  if (isPPQ) {
    rewardDestination = 'ppq';
    // PPQ uses bolt11 invoice, not lightning address
  } else if (isCommunity && selectedTeamId) {
    const uuid = extractCommunityTeamUUID(selectedTeamId);
    let team: MockCommunityTeam | null = null;
    if (mockSupabaseConfigured) {
      team = mockCommunityTeams[uuid] || null;
    }

    if (team?.lightning_address) {
      rewardDestination = 'charity';
      rewardLightningAddress = team.lightning_address;
      communityTeamName = team.name;
      communityTeamLightningAddress = team.lightning_address;
    } else {
      rewardDestination = 'user';
      rewardLightningAddress = userLightningAddress;
      communityTeamName = team?.name || null;
    }
  } else if (isCharity) {
    const charity = getCharityById(selectedTeamId);
    if (charity?.lightningAddress) {
      rewardDestination = 'charity';
      rewardLightningAddress = charity.lightningAddress;
    } else {
      rewardDestination = 'user';
      rewardLightningAddress = userLightningAddress;
    }
  } else {
    // Self team, no team, or unknown — reward goes to user
    rewardDestination = 'user';
    rewardLightningAddress = userLightningAddress;
  }

  // Lightning address tag (DB trigger extracts this to send reward)
  if (rewardLightningAddress) {
    tags.push(['lightning', rewardLightningAddress]);
  } else if (!isPPQ) {
    console.warn('  WARN: No lightning address — auto-reward trigger will skip this workout');
  }

  // Team tag (for leaderboard grouping)
  if (selectedTeamId) {
    tags.push(['team', selectedTeamId]);
  }

  // Charity metadata
  if (isCommunity && communityTeamName) {
    if (communityTeamLightningAddress) {
      tags.push(['charity', selectedTeamId!, communityTeamName, communityTeamLightningAddress]);
    } else {
      tags.push(['charity', selectedTeamId!, communityTeamName]);
    }
  } else if (isCharity) {
    const charity = getCharityById(selectedTeamId);
    if (charity) {
      if (charity.lightningAddress) {
        tags.push(['charity', charity.id, charity.name, charity.lightningAddress]);
      } else {
        tags.push(['charity', charity.id, charity.name]);
      }
    }
  }

  // Reward destination (for audit trail)
  tags.push(['reward_destination', rewardDestination]);

  // Club tag
  const clubId = getMockStorage('@runstr:club_id');
  if (clubId) {
    tags.push(['club', clubId]);
  }

  return tags;
}

// ---- Helper functions for assertions ----

function findTag(tags: string[][], key: string): string[] | undefined {
  return tags.find((t) => t[0] === key);
}

function hasTag(tags: string[][], key: string, ...values: string[]): boolean {
  const tag = findTag(tags, key);
  if (!tag) return false;
  return values.every((v, i) => tag[i + 1] === v);
}

function hasNoTag(tags: string[][], key: string): boolean {
  return !findTag(tags, key);
}

// ---- Tests ----

async function runTests() {
  // ========================================
  // Team detection helpers
  // ========================================
  console.log('\n=== Team detection helpers ===');

  assert('isSelfTeam("self") = true', isSelfTeam('self'));
  assert('isSelfTeam("ppq-ai") = false', !isSelfTeam('ppq-ai'));
  assert('isSelfTeam(null) = false', !isSelfTeam(null));

  assert('isPPQTeam("ppq-ai") = true', isPPQTeam('ppq-ai'));
  assert('isPPQTeam("self") = false', !isPPQTeam('self'));
  assert('isPPQTeam(null) = false', !isPPQTeam(null));

  assert('isCommunityTeam("community-abc123") = true', isCommunityTeam('community-abc123'));
  assert('isCommunityTeam("als-foundation") = false', !isCommunityTeam('als-foundation'));
  assert('isCommunityTeam(null) = false', !isCommunityTeam(null));

  assert(
    'extractCommunityTeamUUID("community-abc123") = "abc123"',
    extractCommunityTeamUUID('community-abc123') === 'abc123'
  );

  // ========================================
  // Self team: rewards go to user
  // ========================================
  console.log('\n=== Self team → user lightning address ===');
  resetMockStorage();
  resetMockCommunityTeams();
  mockUserLightningAddress = 'user@walletofsatoshi.com';
  setMockStorage('@runstr:selected_team_id', 'self');

  let tags = await buildRewardTags();
  assert('has lightning tag with user address', hasTag(tags, 'lightning', 'user@walletofsatoshi.com'));
  assert('has team tag "self"', hasTag(tags, 'team', 'self'));
  assert('reward_destination = "user"', hasTag(tags, 'reward_destination', 'user'));
  assert('no charity tag', hasNoTag(tags, 'charity'));

  // ========================================
  // PPQ.AI team: NO lightning tag, uses bolt11
  // ========================================
  console.log('\n=== PPQ.AI team → no lightning tag (bolt11 path) ===');
  resetMockStorage();
  mockUserLightningAddress = 'user@walletofsatoshi.com';
  setMockStorage('@runstr:selected_team_id', 'ppq-ai');

  tags = await buildRewardTags();
  assert('NO lightning tag (PPQ uses bolt11)', hasNoTag(tags, 'lightning'));
  assert('has team tag "ppq-ai"', hasTag(tags, 'team', 'ppq-ai'));
  assert('reward_destination = "ppq"', hasTag(tags, 'reward_destination', 'ppq'));
  assert('no charity tag', hasNoTag(tags, 'charity'));

  // ========================================
  // Charity team: rewards go to charity address
  // ========================================
  console.log('\n=== Charity team (ALS) → charity lightning address ===');
  resetMockStorage();
  mockUserLightningAddress = 'user@walletofsatoshi.com';
  setMockStorage('@runstr:selected_team_id', 'als-foundation');

  tags = await buildRewardTags();
  assert('has lightning tag with ALS address', hasTag(tags, 'lightning', 'RunningBTC@primal.net'));
  assert('has team tag "als-foundation"', hasTag(tags, 'team', 'als-foundation'));
  assert('reward_destination = "charity"', hasTag(tags, 'reward_destination', 'charity'));
  assert(
    'has charity metadata tag',
    hasTag(tags, 'charity', 'als-foundation', 'ALS Network', 'RunningBTC@primal.net')
  );

  // ========================================
  // Another charity (HRF)
  // ========================================
  console.log('\n=== Charity team (HRF) → HRF lightning address ===');
  resetMockStorage();
  mockUserLightningAddress = 'user@walletofsatoshi.com';
  setMockStorage('@runstr:selected_team_id', 'human-rights-foundation');

  tags = await buildRewardTags();
  assert('has lightning tag with HRF address', hasTag(tags, 'lightning', 'nostr@btcpay.hrf.org'));
  assert('reward_destination = "charity"', hasTag(tags, 'reward_destination', 'charity'));

  // ========================================
  // Community team with lightning address
  // ========================================
  console.log('\n=== Community team (with address) → community address ===');
  resetMockStorage();
  resetMockCommunityTeams();
  mockUserLightningAddress = 'user@walletofsatoshi.com';
  setMockStorage('@runstr:selected_team_id', 'community-uuid-123');
  setMockCommunityTeam('uuid-123', {
    id: 'uuid-123',
    name: 'Bitcoin Runners',
    lightning_address: 'runners@getalby.com',
  });

  tags = await buildRewardTags();
  assert('has lightning tag with community address', hasTag(tags, 'lightning', 'runners@getalby.com'));
  assert('has team tag', hasTag(tags, 'team', 'community-uuid-123'));
  assert('reward_destination = "charity"', hasTag(tags, 'reward_destination', 'charity'));
  assert(
    'has charity metadata with community name and address',
    hasTag(tags, 'charity', 'community-uuid-123', 'Bitcoin Runners', 'runners@getalby.com')
  );

  // ========================================
  // No team selected: defaults to user
  // ========================================
  console.log('\n=== No team selected → defaults to user address ===');
  resetMockStorage();
  resetMockCommunityTeams();
  mockUserLightningAddress = 'user@walletofsatoshi.com';
  // No team set — @runstr:selected_team_id is null

  tags = await buildRewardTags();
  assert('has lightning tag with user address', hasTag(tags, 'lightning', 'user@walletofsatoshi.com'));
  assert('no team tag', hasNoTag(tags, 'team'));
  assert('reward_destination = "user"', hasTag(tags, 'reward_destination', 'user'));
  assert('no charity tag', hasNoTag(tags, 'charity'));

  // ========================================
  // Charity with no lightning address: falls back to user
  // ========================================
  console.log('\n=== Charity with no address → falls back to user ===');
  resetMockStorage();
  mockUserLightningAddress = 'user@walletofsatoshi.com';
  setMockStorage('@runstr:selected_team_id', 'no-address-charity');

  tags = await buildRewardTags();
  assert('has lightning tag with USER address (fallback)', hasTag(tags, 'lightning', 'user@walletofsatoshi.com'));
  assert('reward_destination = "user" (fallback)', hasTag(tags, 'reward_destination', 'user'));
  assert('has team tag', hasTag(tags, 'team', 'no-address-charity'));

  // ========================================
  // Community team with no lightning address: falls back to user
  // ========================================
  console.log('\n=== Community team with no address → falls back to user ===');
  resetMockStorage();
  resetMockCommunityTeams();
  mockUserLightningAddress = 'user@walletofsatoshi.com';
  setMockStorage('@runstr:selected_team_id', 'community-uuid-456');
  setMockCommunityTeam('uuid-456', {
    id: 'uuid-456',
    name: 'No Address Club',
    // No lightning_address
  });

  tags = await buildRewardTags();
  assert('has lightning tag with USER address (fallback)', hasTag(tags, 'lightning', 'user@walletofsatoshi.com'));
  assert('reward_destination = "user" (fallback)', hasTag(tags, 'reward_destination', 'user'));
  assert(
    'charity metadata has name but no address',
    (() => {
      const charityTag = findTag(tags, 'charity');
      return charityTag !== undefined && charityTag[2] === 'No Address Club' && charityTag.length === 3;
    })()
  );

  // ========================================
  // EDGE CASE: No user address AND no team
  // ========================================
  console.log('\n=== EDGE CASE: No user address, no team → reward lost ===');
  resetMockStorage();
  resetMockCommunityTeams();
  mockUserLightningAddress = null; // No user address configured
  // No team selected

  tags = await buildRewardTags();
  assert('NO lightning tag (reward will be silently lost)', hasNoTag(tags, 'lightning'));
  assert('reward_destination = "user"', hasTag(tags, 'reward_destination', 'user'));
  console.log('  WARN: This scenario means the reward is silently skipped by the DB trigger');

  // ========================================
  // Club tag inclusion
  // ========================================
  console.log('\n=== Club tag ===');
  resetMockStorage();
  resetMockCommunityTeams();
  mockUserLightningAddress = 'user@walletofsatoshi.com';
  setMockStorage('@runstr:selected_team_id', 'self');
  setMockStorage('@runstr:club_id', 'club-uuid-789');

  tags = await buildRewardTags();
  assert('has club tag', hasTag(tags, 'club', 'club-uuid-789'));

  // Without club
  resetMockStorage();
  setMockStorage('@runstr:selected_team_id', 'self');
  tags = await buildRewardTags();
  assert('no club tag when no club_id', hasNoTag(tags, 'club'));

  // ========================================
  // PPQ.AI with club (both coexist)
  // ========================================
  console.log('\n=== PPQ.AI + club tag coexistence ===');
  resetMockStorage();
  mockUserLightningAddress = 'user@walletofsatoshi.com';
  setMockStorage('@runstr:selected_team_id', 'ppq-ai');
  setMockStorage('@runstr:club_id', 'club-uuid-789');

  tags = await buildRewardTags();
  assert('NO lightning tag (PPQ)', hasNoTag(tags, 'lightning'));
  assert('reward_destination = "ppq"', hasTag(tags, 'reward_destination', 'ppq'));
  assert('has club tag alongside PPQ', hasTag(tags, 'club', 'club-uuid-789'));

  // ---- Summary ----
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
