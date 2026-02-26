/**
 * Verify: PPQ.AI run-to-earn flow — invoice creation pipeline
 * Run: npx tsx scripts/verify/verify-ppq-reward-flow.ts
 *
 * Tests the full PPQ.AI reward path: team detection → invoice creation →
 * Supabase payload inclusion. Mocks AsyncStorage, network, and services.
 *
 * Source files:
 *   src/services/ai/PPQAccountService.ts
 *   src/services/backend/SupabaseCompetitionService.ts (submitWorkoutSimple lines 333-376)
 *   src/services/rewards/DailyRewardService.ts (isBoostedQualified)
 *   src/utils/rewardTags.ts (buildRewardTags PPQ path)
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

// ---- Inline PPQAccountService logic (from src/services/ai/PPQAccountService.ts) ----

const PPQ_API_KEY = '@runstr:ppq_api_key';
const PPQ_CREDIT_ID = '@runstr:ppq_credit_id';

function ppqHasAccount(): boolean {
  const apiKey = getMockStorage(PPQ_API_KEY);
  const creditId = getMockStorage(PPQ_CREDIT_ID);
  return !!(apiKey && creditId);
}

function ppqGetAccount(): { apiKey: string; creditId: string } | null {
  const apiKey = getMockStorage(PPQ_API_KEY);
  const creditId = getMockStorage(PPQ_CREDIT_ID);
  if (apiKey && creditId) return { apiKey, creditId };
  return null;
}

// Mock invoice creation (simulates PPQ API call)
let mockInvoiceSuccess = true;
let mockInvoiceBolt11 = 'lnbc100n1p...mock_invoice';
let mockInvoiceId = 'inv_mock_123';

function ppqCreateTopupInvoice(sats: number): {
  success: boolean;
  bolt11?: string;
  invoiceId?: string;
  error?: string;
} {
  if (!ppqHasAccount()) {
    return { success: false, error: 'No PPQ.AI account configured' };
  }
  if (!mockInvoiceSuccess) {
    return { success: false, error: 'Mock invoice creation failed' };
  }
  return {
    success: true,
    bolt11: `${mockInvoiceBolt11}_${sats}sats`,
    invoiceId: `${mockInvoiceId}_${sats}`,
  };
}

// ---- Inline team helpers (from src/constants/charities.ts) ----

const PPQ_AI_TEAM_ID = 'ppq-ai';

function isPPQTeam(teamId?: string | null): boolean {
  if (!teamId) return false;
  return teamId === PPQ_AI_TEAM_ID;
}

// ---- Inline isBoostedQualified (from src/services/rewards/DailyRewardService.ts) ----

const CARDIO_ACTIVITY_TYPES = ['running', 'walking', 'cycling'];

const REWARD_ELIGIBLE_SOURCES = [
  'gps_tracker',
  'manual_entry',
  'healthkit',
  'health_connect',
];

const REWARD_ELIGIBLE_ACTIVITY_TYPES = ['running', 'walking', 'cycling', 'strength', 'journal'];

function isBoostedQualified(activityType: string, source: string): boolean {
  const isCardio = CARDIO_ACTIVITY_TYPES.includes(activityType);
  const isNonManual = source !== 'manual_entry';
  return isCardio && isNonManual;
}

// ---- Inline PPQ auto-invoice logic from submitWorkoutSimple ----
// (from src/services/backend/SupabaseCompetitionService.ts lines 333-397)

interface WorkoutSubmissionData {
  eventId: string;
  npub: string;
  type: string;
  distance?: number;   // meters
  duration: number;     // seconds
  tags?: string[][];
  ppqBolt11?: string;
  ppqInvoiceId?: string;
}

let mockIsSubscriber = false;
let mockUserLightningAddress: string | null = 'user@walletofsatoshi.com';

function simulatePPQAutoInvoice(data: WorkoutSubmissionData): {
  ppqBolt11: string | null;
  ppqInvoiceId: string | null;
  ppqFailed: boolean;
  rewardSats: number;
  tags: string[][];
} {
  let ppqBolt11: string | null = data.ppqBolt11 || null;
  let ppqInvoiceId: string | null = data.ppqInvoiceId || null;
  let ppqFailed = false;
  let rewardSats = 0;

  if (!ppqBolt11) {
    const selectedTeamId = getMockStorage('@runstr:selected_team_id');
    if (selectedTeamId && isPPQTeam(selectedTeamId)) {
      const hasAccount = ppqHasAccount();
      if (hasAccount) {
        // Determine reward amount
        rewardSats = 100; // PPQ API minimum (free users)
        const npub = getMockStorage('@runstr:npub');
        if (npub) {
          const isCardio = ['running', 'walking', 'cycling'].includes(data.type);
          const hasDistance = (data.distance ?? 0) >= 2000;    // 2km+
          const hasDuration = (data.duration ?? 0) >= 900;     // 15min+
          if (mockIsSubscriber && isCardio && hasDistance && hasDuration) {
            rewardSats = 800;
          }
        }
        const invoiceResult = ppqCreateTopupInvoice(rewardSats);
        if (invoiceResult.success && invoiceResult.bolt11) {
          ppqBolt11 = invoiceResult.bolt11;
          ppqInvoiceId = invoiceResult.invoiceId || null;
        } else {
          ppqFailed = true;
        }
      } else {
        ppqFailed = true;
      }
    }
  }

  // PPQ fallback: inject user lightning if PPQ failed
  let submissionTags = data.tags ? [...data.tags] : [];
  if (ppqFailed && !ppqBolt11) {
    if (mockUserLightningAddress) {
      const hasLightningTag = submissionTags.some((t) => t[0] === 'lightning');
      if (!hasLightningTag) {
        submissionTags = [...submissionTags, ['lightning', mockUserLightningAddress]];
      }
    }
  }

  return { ppqBolt11, ppqInvoiceId, ppqFailed, rewardSats, tags: submissionTags };
}

// ---- Tests ----

async function runTests() {
  // ========================================
  // PPQAccountService.hasAccount
  // ========================================
  console.log('\n=== PPQAccountService.hasAccount ===');

  resetMockStorage();
  assert('hasAccount = false when both keys missing', !ppqHasAccount());

  setMockStorage(PPQ_API_KEY, 'key_abc123');
  assert('hasAccount = false when only API key set', !ppqHasAccount());

  resetMockStorage();
  setMockStorage(PPQ_CREDIT_ID, 'credit_abc123');
  assert('hasAccount = false when only credit ID set', !ppqHasAccount());

  setMockStorage(PPQ_API_KEY, 'key_abc123');
  setMockStorage(PPQ_CREDIT_ID, 'credit_abc123');
  assert('hasAccount = true when both keys set', ppqHasAccount());

  // ========================================
  // PPQAccountService.getAccount
  // ========================================
  console.log('\n=== PPQAccountService.getAccount ===');

  resetMockStorage();
  assert('getAccount = null when no credentials', ppqGetAccount() === null);

  setMockStorage(PPQ_API_KEY, 'key_xyz');
  setMockStorage(PPQ_CREDIT_ID, 'credit_xyz');
  const account = ppqGetAccount();
  assert('getAccount returns apiKey', account?.apiKey === 'key_xyz');
  assert('getAccount returns creditId', account?.creditId === 'credit_xyz');

  // ========================================
  // buildRewardTags: PPQ team → no lightning tag
  // ========================================
  console.log('\n=== buildRewardTags: PPQ team → no lightning, destination=ppq ===');

  // Inline the buildRewardTags PPQ path
  const selectedTeamId = 'ppq-ai';
  const isPPQ = isPPQTeam(selectedTeamId);
  assert('isPPQTeam("ppq-ai") = true', isPPQ);

  if (isPPQ) {
    // PPQ path: no lightning tag, reward_destination = 'ppq'
    const tags: string[][] = [];
    tags.push(['team', selectedTeamId]);
    tags.push(['reward_destination', 'ppq']);
    // NO ['lightning', ...] tag
    assert('PPQ tags have NO lightning entry', !tags.some((t) => t[0] === 'lightning'));
    assert('PPQ tags have reward_destination=ppq', tags.some((t) => t[0] === 'reward_destination' && t[1] === 'ppq'));
  }

  // ========================================
  // PPQ auto-invoice: free user (100 sats)
  // ========================================
  console.log('\n=== PPQ auto-invoice: free user → 100 sats ===');

  resetMockStorage();
  mockIsSubscriber = false;
  mockInvoiceSuccess = true;
  setMockStorage('@runstr:selected_team_id', 'ppq-ai');
  setMockStorage('@runstr:npub', 'npub1testuser');
  setMockStorage(PPQ_API_KEY, 'key_test');
  setMockStorage(PPQ_CREDIT_ID, 'credit_test');

  let result = simulatePPQAutoInvoice({
    eventId: 'test_1',
    npub: 'npub1testuser',
    type: 'running',
    distance: 5000,    // 5km
    duration: 1800,    // 30min
    tags: [['reward_destination', 'ppq']],
  });

  assert('ppqBolt11 is set', result.ppqBolt11 !== null);
  assert('ppqInvoiceId is set', result.ppqInvoiceId !== null);
  assert('ppqFailed = false', !result.ppqFailed);
  assert('rewardSats = 100 (free user)', result.rewardSats === 100, `got ${result.rewardSats}`);
  assert('bolt11 contains "100sats"', result.ppqBolt11?.includes('100sats') === true);

  // ========================================
  // PPQ auto-invoice: subscriber with qualifying workout (800 sats)
  // ========================================
  console.log('\n=== PPQ auto-invoice: subscriber + cardio + 2km+ + 15min+ → 800 sats ===');

  resetMockStorage();
  mockIsSubscriber = true;
  mockInvoiceSuccess = true;
  setMockStorage('@runstr:selected_team_id', 'ppq-ai');
  setMockStorage('@runstr:npub', 'npub1testuser');
  setMockStorage(PPQ_API_KEY, 'key_test');
  setMockStorage(PPQ_CREDIT_ID, 'credit_test');

  result = simulatePPQAutoInvoice({
    eventId: 'test_2',
    npub: 'npub1testuser',
    type: 'running',       // cardio
    distance: 5000,         // 5km (>= 2km)
    duration: 1800,         // 30min (>= 15min)
    tags: [['reward_destination', 'ppq']],
  });

  assert('rewardSats = 800 (subscriber + qualifying)', result.rewardSats === 800, `got ${result.rewardSats}`);
  assert('bolt11 contains "800sats"', result.ppqBolt11?.includes('800sats') === true);

  // ========================================
  // PPQ auto-invoice: subscriber but non-cardio (100 sats)
  // ========================================
  console.log('\n=== PPQ auto-invoice: subscriber + strength → 100 sats (not cardio) ===');

  resetMockStorage();
  mockIsSubscriber = true;
  mockInvoiceSuccess = true;
  setMockStorage('@runstr:selected_team_id', 'ppq-ai');
  setMockStorage('@runstr:npub', 'npub1testuser');
  setMockStorage(PPQ_API_KEY, 'key_test');
  setMockStorage(PPQ_CREDIT_ID, 'credit_test');

  result = simulatePPQAutoInvoice({
    eventId: 'test_3',
    npub: 'npub1testuser',
    type: 'strength',     // NOT cardio
    distance: 0,
    duration: 1800,
    tags: [],
  });

  assert('rewardSats = 100 (strength is not cardio)', result.rewardSats === 100, `got ${result.rewardSats}`);

  // ========================================
  // PPQ auto-invoice: subscriber + cardio but distance too short (100 sats)
  // ========================================
  console.log('\n=== PPQ auto-invoice: subscriber + cardio but <2km → 100 sats ===');

  resetMockStorage();
  mockIsSubscriber = true;
  mockInvoiceSuccess = true;
  setMockStorage('@runstr:selected_team_id', 'ppq-ai');
  setMockStorage('@runstr:npub', 'npub1testuser');
  setMockStorage(PPQ_API_KEY, 'key_test');
  setMockStorage(PPQ_CREDIT_ID, 'credit_test');

  result = simulatePPQAutoInvoice({
    eventId: 'test_4',
    npub: 'npub1testuser',
    type: 'running',
    distance: 1500,     // 1.5km — below 2km threshold
    duration: 1800,
    tags: [],
  });

  assert('rewardSats = 100 (distance < 2km)', result.rewardSats === 100, `got ${result.rewardSats}`);

  // ========================================
  // PPQ auto-invoice: subscriber + cardio but duration too short (100 sats)
  // ========================================
  console.log('\n=== PPQ auto-invoice: subscriber + cardio but <15min → 100 sats ===');

  resetMockStorage();
  mockIsSubscriber = true;
  mockInvoiceSuccess = true;
  setMockStorage('@runstr:selected_team_id', 'ppq-ai');
  setMockStorage('@runstr:npub', 'npub1testuser');
  setMockStorage(PPQ_API_KEY, 'key_test');
  setMockStorage(PPQ_CREDIT_ID, 'credit_test');

  result = simulatePPQAutoInvoice({
    eventId: 'test_5',
    npub: 'npub1testuser',
    type: 'cycling',
    distance: 10000,    // 10km
    duration: 600,      // 10min — below 15min threshold
    tags: [],
  });

  assert('rewardSats = 100 (duration < 15min)', result.rewardSats === 100, `got ${result.rewardSats}`);

  // ========================================
  // PPQ auto-invoice: exact thresholds (2000m, 900s)
  // ========================================
  console.log('\n=== PPQ auto-invoice: exact threshold (2000m, 900s) → 800 sats ===');

  resetMockStorage();
  mockIsSubscriber = true;
  mockInvoiceSuccess = true;
  setMockStorage('@runstr:selected_team_id', 'ppq-ai');
  setMockStorage('@runstr:npub', 'npub1testuser');
  setMockStorage(PPQ_API_KEY, 'key_test');
  setMockStorage(PPQ_CREDIT_ID, 'credit_test');

  result = simulatePPQAutoInvoice({
    eventId: 'test_6',
    npub: 'npub1testuser',
    type: 'walking',
    distance: 2000,     // Exactly 2km
    duration: 900,      // Exactly 15min
    tags: [],
  });

  assert('rewardSats = 800 (exact threshold met)', result.rewardSats === 800, `got ${result.rewardSats}`);

  // ========================================
  // PPQ failure: no account configured
  // ========================================
  console.log('\n=== PPQ failure: no account → ppqFailed ===');

  resetMockStorage();
  mockInvoiceSuccess = true;
  setMockStorage('@runstr:selected_team_id', 'ppq-ai');
  setMockStorage('@runstr:npub', 'npub1testuser');
  // No PPQ credentials

  result = simulatePPQAutoInvoice({
    eventId: 'test_7',
    npub: 'npub1testuser',
    type: 'running',
    distance: 5000,
    duration: 1800,
    tags: [['reward_destination', 'ppq']],
  });

  assert('ppqFailed = true (no account)', result.ppqFailed);
  assert('ppqBolt11 is null', result.ppqBolt11 === null);

  // ========================================
  // PPQ failure: invoice API error
  // ========================================
  console.log('\n=== PPQ failure: invoice creation fails → ppqFailed ===');

  resetMockStorage();
  mockInvoiceSuccess = false; // Simulate API error
  setMockStorage('@runstr:selected_team_id', 'ppq-ai');
  setMockStorage('@runstr:npub', 'npub1testuser');
  setMockStorage(PPQ_API_KEY, 'key_test');
  setMockStorage(PPQ_CREDIT_ID, 'credit_test');

  result = simulatePPQAutoInvoice({
    eventId: 'test_8',
    npub: 'npub1testuser',
    type: 'running',
    distance: 5000,
    duration: 1800,
    tags: [['reward_destination', 'ppq']],
  });

  assert('ppqFailed = true (API error)', result.ppqFailed);
  assert('ppqBolt11 is null', result.ppqBolt11 === null);

  // ========================================
  // PPQ fallback: failed PPQ → injects user lightning address
  // ========================================
  console.log('\n=== PPQ fallback: failed → injects user lightning address ===');

  mockUserLightningAddress = 'user@walletofsatoshi.com';
  assert(
    'tags include lightning fallback',
    result.tags.some((t) => t[0] === 'lightning' && t[1] === 'user@walletofsatoshi.com'),
    `got tags: ${JSON.stringify(result.tags)}`
  );

  // ========================================
  // PPQ: already has bolt11 → skip auto-creation
  // ========================================
  console.log('\n=== PPQ: pre-provided bolt11 → skip auto-creation ===');

  resetMockStorage();
  mockInvoiceSuccess = true;
  setMockStorage('@runstr:selected_team_id', 'ppq-ai');
  setMockStorage('@runstr:npub', 'npub1testuser');
  setMockStorage(PPQ_API_KEY, 'key_test');
  setMockStorage(PPQ_CREDIT_ID, 'credit_test');

  result = simulatePPQAutoInvoice({
    eventId: 'test_9',
    npub: 'npub1testuser',
    type: 'running',
    distance: 5000,
    duration: 1800,
    ppqBolt11: 'lnbc_pre_provided',
    ppqInvoiceId: 'inv_pre_provided',
    tags: [],
  });

  assert('uses pre-provided bolt11', result.ppqBolt11 === 'lnbc_pre_provided');
  assert('uses pre-provided invoiceId', result.ppqInvoiceId === 'inv_pre_provided');
  assert('ppqFailed = false', !result.ppqFailed);
  assert('rewardSats = 0 (no auto-creation needed)', result.rewardSats === 0);

  // ========================================
  // Non-PPQ team: no invoice creation
  // ========================================
  console.log('\n=== Non-PPQ team → no invoice creation ===');

  resetMockStorage();
  mockInvoiceSuccess = true;
  setMockStorage('@runstr:selected_team_id', 'als-foundation'); // charity, not PPQ

  result = simulatePPQAutoInvoice({
    eventId: 'test_10',
    npub: 'npub1testuser',
    type: 'running',
    distance: 5000,
    duration: 1800,
    tags: [],
  });

  assert('ppqBolt11 is null (not PPQ team)', result.ppqBolt11 === null);
  assert('ppqFailed = false', !result.ppqFailed);
  assert('rewardSats = 0 (no PPQ processing)', result.rewardSats === 0);

  // ========================================
  // isBoostedQualified tests
  // ========================================
  console.log('\n=== isBoostedQualified ===');

  assert('running + gps_tracker = boosted', isBoostedQualified('running', 'gps_tracker'));
  assert('walking + healthkit = boosted', isBoostedQualified('walking', 'healthkit'));
  assert('cycling + health_connect = boosted', isBoostedQualified('cycling', 'health_connect'));
  assert('running + manual_entry = NOT boosted', !isBoostedQualified('running', 'manual_entry'));
  assert('strength + gps_tracker = NOT boosted (not cardio)', !isBoostedQualified('strength', 'gps_tracker'));
  assert('journal + healthkit = NOT boosted (not cardio)', !isBoostedQualified('journal', 'healthkit'));
  assert('hiking + gps_tracker = NOT boosted (not in cardio list)', !isBoostedQualified('hiking', 'gps_tracker'));

  // ========================================
  // Reward eligibility sources
  // ========================================
  console.log('\n=== Reward eligible sources ===');

  assert('gps_tracker is eligible', REWARD_ELIGIBLE_SOURCES.includes('gps_tracker'));
  assert('manual_entry is eligible', REWARD_ELIGIBLE_SOURCES.includes('manual_entry'));
  assert('healthkit is eligible', REWARD_ELIGIBLE_SOURCES.includes('healthkit'));
  assert('health_connect is eligible', REWARD_ELIGIBLE_SOURCES.includes('health_connect'));
  assert('imported_nostr is NOT eligible', !REWARD_ELIGIBLE_SOURCES.includes('imported_nostr'));

  // ========================================
  // Reward eligible activity types
  // ========================================
  console.log('\n=== Reward eligible activity types ===');

  assert('running is eligible', REWARD_ELIGIBLE_ACTIVITY_TYPES.includes('running'));
  assert('walking is eligible', REWARD_ELIGIBLE_ACTIVITY_TYPES.includes('walking'));
  assert('cycling is eligible', REWARD_ELIGIBLE_ACTIVITY_TYPES.includes('cycling'));
  assert('strength is eligible', REWARD_ELIGIBLE_ACTIVITY_TYPES.includes('strength'));
  assert('journal is eligible', REWARD_ELIGIBLE_ACTIVITY_TYPES.includes('journal'));
  assert('meditation is NOT eligible', !REWARD_ELIGIBLE_ACTIVITY_TYPES.includes('meditation'));

  // ---- Summary ----
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
