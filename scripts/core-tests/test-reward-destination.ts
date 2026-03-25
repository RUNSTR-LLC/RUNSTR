/**
 * Test: Reward Destination Service
 * Run: npx tsx scripts/core-tests/test-reward-destination.ts
 *
 * Tests reward destination routing logic by inlining the core logic from
 * RewardDestinationService and RewardLightningAddressService. Cannot import
 * directly due to AsyncStorage React Native dependency, so we replicate the
 * logic and test all destination types.
 *
 * Validates:
 * - Self destination routes to user's Lightning address
 * - Charity destination routes to charity's Lightning address
 * - PPQ destination uses bolt11 (no Lightning address)
 * - Fallback behavior when addresses are missing
 * - AsyncStorage key names match between services
 * - Lightning address format validation
 */

import * as fs from 'fs';
import * as path from 'path';

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
// Mock AsyncStorage
// ---------------------------------------------------------------------------

let mockStorage: Record<string, string | null> = {};

function setMock(key: string, value: string | null) {
  mockStorage[key] = value;
}

function getMock(key: string): string | null {
  return mockStorage[key] ?? null;
}

function resetMock() {
  mockStorage = {};
}

// ---------------------------------------------------------------------------
// Constants (from src/constants/charities.ts)
// ---------------------------------------------------------------------------

const PPQ_AI_TEAM_ID = 'ppq-ai';
const SELF_TEAM_ID = 'self';
const DEFAULT_CHARITY_ID = 'als-foundation';

interface Charity {
  id: string;
  name: string;
  lightningAddress?: string;
  category: string;
  isPPQ?: boolean;
  isSelf?: boolean;
}

const CHARITIES: Charity[] = [
  { id: 'ppq-ai', name: 'PPQ.AI', category: 'service', isPPQ: true },
  { id: 'als-foundation', name: 'ALS Network', lightningAddress: 'RunningBTC@primal.net', category: 'charity' },
  { id: 'human-rights-foundation', name: 'Human Rights Foundation', lightningAddress: 'nostr@btcpay.hrf.org', category: 'charity' },
  { id: 'bitcoin-bay', name: 'Bitcoin Bay', lightningAddress: 'sats@donate.bitcoinbay.foundation', category: 'project' },
  { id: 'runstr', name: 'RUNSTR', lightningAddress: 'thewildhustle@strike.me', category: 'project' },
];

function getCharityById(id?: string | null): Charity | undefined {
  if (!id) return undefined;
  return CHARITIES.find((c) => c.id === id);
}

function isPPQTeam(id?: string | null): boolean {
  return id === PPQ_AI_TEAM_ID;
}

function isSelfTeam(id?: string | null): boolean {
  return id === SELF_TEAM_ID;
}

// ---------------------------------------------------------------------------
// Storage key constants (must match the actual service files)
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  SELECTED_TEAM: '@runstr:selected_team_id',
  REWARD_LIGHTNING_ADDRESS: '@runstr:reward_lightning_address',
};

// ---------------------------------------------------------------------------
// Inlined RewardDestinationService.getDestinationAddress logic
// ---------------------------------------------------------------------------

interface RewardDestination {
  address: string;
  isCharity: boolean;
  isPPQ: boolean;
  charityName: string;
  charityId: string;
}

function getDestinationAddress(userLnAddress: string | null): RewardDestination {
  const selectedTeamId = getMock(STORAGE_KEYS.SELECTED_TEAM);
  const charity = getCharityById(selectedTeamId || DEFAULT_CHARITY_ID) ||
    getCharityById(DEFAULT_CHARITY_ID) ||
    CHARITIES[0];

  // If user has Lightning address -> send to user
  if (userLnAddress && userLnAddress.length > 0) {
    return {
      address: userLnAddress,
      isCharity: false,
      isPPQ: false,
      charityName: '',
      charityId: '',
    };
  }

  // PPQ team: no Lightning address, uses bolt11
  if (isPPQTeam(charity.id)) {
    return {
      address: '',
      isCharity: false,
      isPPQ: true,
      charityName: charity.name,
      charityId: charity.id,
    };
  }

  // No user address -> send to charity
  return {
    address: charity.lightningAddress || '',
    isCharity: true,
    isPPQ: false,
    charityName: charity.name,
    charityId: charity.id,
  };
}

// ---------------------------------------------------------------------------
// Lightning address validation (from RewardLightningAddressService)
// ---------------------------------------------------------------------------

function isValidLightningAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(address.trim());
}

// ---------------------------------------------------------------------------
// Storage key consistency check
// ---------------------------------------------------------------------------

function runStorageKeyChecks() {
  console.log('\n=== Storage key consistency checks ===\n');

  const srcRoot = path.join(__dirname, '../../src');

  const destService = fs.readFileSync(
    path.join(srcRoot, 'services/rewards/RewardDestinationService.ts'),
    'utf8'
  );
  const lnService = fs.readFileSync(
    path.join(srcRoot, 'services/rewards/RewardLightningAddressService.ts'),
    'utf8'
  );
  const rewardTags = fs.readFileSync(
    path.join(srcRoot, 'utils/rewardTags.ts'),
    'utf8'
  );

  assert(
    'RewardDestinationService uses @runstr:selected_team_id',
    destService.includes("'@runstr:selected_team_id'")
  );

  assert(
    'RewardLightningAddressService uses @runstr:reward_lightning_address',
    lnService.includes("'@runstr:reward_lightning_address'")
  );

  assert(
    'rewardTags.ts uses @runstr:selected_team_id',
    rewardTags.includes("'@runstr:selected_team_id'")
  );

  // Verify default charity is consistent
  assert(
    'Default charity is als-foundation in RewardDestinationService',
    destService.includes("'als-foundation'")
  );
}

// ---------------------------------------------------------------------------
// Destination routing tests
// ---------------------------------------------------------------------------

function runDestinationTests() {
  console.log('\n=== Destination routing tests ===\n');

  // Test 1: User with Lightning address -> rewards go to user regardless of team
  resetMock();
  setMock(STORAGE_KEYS.SELECTED_TEAM, 'als-foundation');
  let dest = getDestinationAddress('user@walletofsatoshi.com');
  assert('User with LN address: rewards go to user', !dest.isCharity && !dest.isPPQ);
  assert('User with LN address: address is user address', dest.address === 'user@walletofsatoshi.com');
  assert('User with LN address: charityName is empty', dest.charityName === '');

  // Test 2: No user address + ALS team -> rewards go to ALS charity
  resetMock();
  setMock(STORAGE_KEYS.SELECTED_TEAM, 'als-foundation');
  dest = getDestinationAddress(null);
  assert('No user address + ALS: isCharity = true', dest.isCharity);
  assert('No user address + ALS: address is ALS address', dest.address === 'RunningBTC@primal.net');
  assert('No user address + ALS: charityName is ALS Network', dest.charityName === 'ALS Network');

  // Test 3: No user address + HRF team -> rewards go to HRF
  resetMock();
  setMock(STORAGE_KEYS.SELECTED_TEAM, 'human-rights-foundation');
  dest = getDestinationAddress(null);
  assert('No user address + HRF: address is HRF', dest.address === 'nostr@btcpay.hrf.org');
  assert('No user address + HRF: isCharity = true', dest.isCharity);

  // Test 4: PPQ team, no user address -> PPQ bolt11 path
  resetMock();
  setMock(STORAGE_KEYS.SELECTED_TEAM, 'ppq-ai');
  dest = getDestinationAddress(null);
  assert('PPQ team: isPPQ = true', dest.isPPQ);
  assert('PPQ team: isCharity = false', !dest.isCharity);
  assert('PPQ team: address is empty (uses bolt11)', dest.address === '');
  assert('PPQ team: charityName is PPQ.AI', dest.charityName === 'PPQ.AI');

  // Test 5: PPQ team BUT user has LN address -> user wins (address takes priority)
  resetMock();
  setMock(STORAGE_KEYS.SELECTED_TEAM, 'ppq-ai');
  dest = getDestinationAddress('override@getalby.com');
  assert('PPQ + user address: rewards go to USER', !dest.isPPQ && !dest.isCharity);
  assert('PPQ + user address: address is user address', dest.address === 'override@getalby.com');

  // Test 6: No team selected -> defaults to ALS (the default charity)
  resetMock();
  // No team set
  dest = getDestinationAddress(null);
  assert('No team: defaults to ALS charity', dest.charityId === 'als-foundation');
  assert('No team: isCharity = true', dest.isCharity);
  assert('No team: address is ALS address', dest.address === 'RunningBTC@primal.net');

  // Test 7: Unknown team ID -> defaults to ALS
  resetMock();
  setMock(STORAGE_KEYS.SELECTED_TEAM, 'nonexistent-team-xyz');
  dest = getDestinationAddress(null);
  assert('Unknown team: defaults to ALS', dest.charityId === 'als-foundation');
}

// ---------------------------------------------------------------------------
// Lightning address validation tests
// ---------------------------------------------------------------------------

function runValidationTests() {
  console.log('\n=== Lightning address validation ===\n');

  assert('Valid: user@domain.com', isValidLightningAddress('user@domain.com'));
  assert('Valid: test123@walletofsatoshi.com', isValidLightningAddress('test123@walletofsatoshi.com'));
  assert('Valid: dash-name@getalby.com', isValidLightningAddress('dash-name@getalby.com'));
  assert('Valid: dot.name@strike.me', isValidLightningAddress('dot.name@strike.me'));
  assert('Valid: underscore_name@blink.sv', isValidLightningAddress('underscore_name@blink.sv'));

  assert('Invalid: empty string', !isValidLightningAddress(''));
  assert('Invalid: no domain', !isValidLightningAddress('user@'));
  assert('Invalid: no user', !isValidLightningAddress('@domain.com'));
  assert('Invalid: no @', !isValidLightningAddress('userdomain.com'));
  assert('Invalid: spaces', !isValidLightningAddress('user @domain.com'));
  assert('Invalid: double @', !isValidLightningAddress('user@@domain.com'));

  // Test all charity addresses pass validation
  console.log('\n=== All charity addresses pass validation ===\n');
  for (const charity of CHARITIES) {
    if (charity.lightningAddress) {
      assert(
        `${charity.name}: ${charity.lightningAddress}`,
        isValidLightningAddress(charity.lightningAddress)
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('\n=== Reward Destination Tests ===');

  runStorageKeyChecks();
  runDestinationTests();
  runValidationTests();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
