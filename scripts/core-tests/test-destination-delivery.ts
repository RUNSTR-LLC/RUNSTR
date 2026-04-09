/**
 * Test: Reward Destination Delivery Chain
 * Run: npx tsx scripts/core-tests/test-destination-delivery.ts
 *
 * Tests the full reward delivery chain from destination selection to submission:
 * 1. Validates buildRewardTags routing logic in source
 * 2. Validates charity Lightning addresses match between charities.ts and rewardTags.ts
 * 3. Validates RewardDestinationService destination shape for self/charity/PPQ paths
 * 4. Validates submitWorkoutSimple includes reward tags in submission payload
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
// Source paths
// ---------------------------------------------------------------------------

const srcRoot = path.join(__dirname, '../../src');
const rewardTagsPath = path.join(srcRoot, 'utils/rewardTags.ts');
const charitiesPath = path.join(srcRoot, 'constants/charities.ts');
const destinationServicePath = path.join(srcRoot, 'services/rewards/RewardDestinationService.ts');
const competitionServicePath = path.join(srcRoot, 'services/backend/SupabaseCompetitionService.ts');

// ---------------------------------------------------------------------------
// Helper: Parse charities from source
// ---------------------------------------------------------------------------

interface ParsedCharity {
  id: string;
  name: string;
  lightningAddress?: string;
  isPPQ?: boolean;
  isSelf?: boolean;
}

function parseCharities(): ParsedCharity[] {
  const src = fs.readFileSync(charitiesPath, 'utf8');

  // Match each charity object block in the CHARITIES array
  const charities: ParsedCharity[] = [];
  const charityBlockRegex = /\{\s*id:\s*'([^']+)'[\s\S]*?(?=\},\s*(?:\/\/|\{)|}\s*,?\s*\])/g;

  let match;
  while ((match = charityBlockRegex.exec(src)) !== null) {
    const block = match[0];
    const id = match[1];

    const nameMatch = block.match(/name:\s*'([^']+)'/);
    const lnMatch = block.match(/lightningAddress:\s*'([^']+)'/);
    const isPPQ = block.includes('isPPQ: true');
    const isSelf = block.includes('isSelf: true');

    charities.push({
      id,
      name: nameMatch ? nameMatch[1] : id,
      lightningAddress: lnMatch ? lnMatch[1] : undefined,
      isPPQ,
      isSelf,
    });
  }

  return charities;
}

// ---------------------------------------------------------------------------
// Test 1: buildRewardTags structure checks
// ---------------------------------------------------------------------------

function testBuildRewardTagsStructure() {
  console.log('\n=== buildRewardTags structure checks ===\n');

  const src = fs.readFileSync(rewardTagsPath, 'utf8');

  assert(
    'buildRewardTags is exported async function',
    src.includes('export async function buildRewardTags()')
  );

  assert(
    'buildRewardTags handles self team (isSelf check)',
    src.includes('isSelf') && src.includes('isSelfTeam')
  );

  assert(
    'buildRewardTags handles PPQ team (isPPQ check)',
    src.includes('isPPQ') && src.includes('isPPQTeam')
  );

  assert(
    'buildRewardTags handles community team (isCommunity check)',
    src.includes('isCommunity') && src.includes('isCommunityTeam')
  );

  assert(
    'buildRewardTags adds lightning tag for reward routing',
    src.includes("tags.push(['lightning',")
  );

  assert(
    'buildRewardTags adds reward_destination tag',
    src.includes("tags.push(['reward_destination',")
  );

  assert(
    'buildRewardTags adds team tag for leaderboard grouping',
    src.includes("tags.push(['team',")
  );

  assert(
    'buildRewardTags adds charity metadata tag',
    src.includes("tags.push(['charity',")
  );

  // Self team routing: user's lightning address
  assert(
    'Self team routes to user lightning address',
    src.includes("rewardDestination = 'user'") && src.includes('rewardLightningAddress = userLightningAddress')
  );

  // PPQ routing: no lightning address (bolt11 instead)
  assert(
    'PPQ team sets destination to ppq (no lightning address)',
    src.includes("rewardDestination = 'ppq'")
  );

  // No team defaults to user
  assert(
    'No team selected defaults to user destination',
    src.includes("// Self team, no team, or unknown -- reward goes to user")
  );

  // Charity routing: charity lightning address
  assert(
    'Charity team uses charity.lightningAddress',
    src.includes('rewardLightningAddress = charity.lightningAddress')
  );
}

// ---------------------------------------------------------------------------
// Test 2: Each charity has valid Lightning address in tags
// ---------------------------------------------------------------------------

function testCharityLightningAddresses() {
  console.log('\n=== Charity Lightning address validation ===\n');

  const charities = parseCharities();

  assert(
    `Found ${charities.length} charities in charities.ts`,
    charities.length > 0,
    `Found ${charities.length}`
  );

  // ALS Foundation should be the default
  const als = charities.find((c) => c.id === 'als-foundation');
  assert('ALS Foundation charity exists', !!als);
  assert(
    'ALS Foundation has Lightning address',
    !!als?.lightningAddress,
    als?.lightningAddress || 'missing'
  );
  assert(
    'ALS Foundation Lightning address is RunningBTC@primal.net',
    als?.lightningAddress === 'RunningBTC@primal.net'
  );

  // PPQ.AI should have NO Lightning address
  const ppq = charities.find((c) => c.id === 'ppq-ai');
  assert('PPQ.AI team exists', !!ppq);
  assert(
    'PPQ.AI has NO Lightning address (uses bolt11)',
    !ppq?.lightningAddress
  );
  assert('PPQ.AI has isPPQ flag', ppq?.isPPQ === true);

  // All non-PPQ charities should have Lightning addresses
  const nonPPQCharities = charities.filter((c) => !c.isPPQ && !c.isSelf);
  let allHaveAddresses = true;
  const missingAddresses: string[] = [];

  for (const charity of nonPPQCharities) {
    if (!charity.lightningAddress) {
      allHaveAddresses = false;
      missingAddresses.push(charity.id);
    }
  }

  assert(
    'All non-PPQ charities have Lightning addresses',
    allHaveAddresses,
    missingAddresses.length > 0 ? `Missing: ${missingAddresses.join(', ')}` : undefined
  );

  // Verify each charity Lightning address is non-empty and looks valid
  for (const charity of nonPPQCharities) {
    if (charity.lightningAddress) {
      const looksValid = charity.lightningAddress.includes('@');
      assert(
        `${charity.id} Lightning address looks valid (${charity.lightningAddress})`,
        looksValid,
        charity.lightningAddress
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Test 3: RewardDestinationService destination shape
// ---------------------------------------------------------------------------

function testRewardDestinationService() {
  console.log('\n=== RewardDestinationService shape checks ===\n');

  const src = fs.readFileSync(destinationServicePath, 'utf8');

  // RewardDestination interface shape
  assert(
    'RewardDestination has address field',
    src.includes('address: string')
  );

  assert(
    'RewardDestination has isCharity field',
    src.includes('isCharity: boolean')
  );

  assert(
    'RewardDestination has isPPQ field',
    src.includes('isPPQ: boolean')
  );

  assert(
    'RewardDestination has charityName field',
    src.includes('charityName: string')
  );

  assert(
    'RewardDestination has charityId field',
    src.includes('charityId: string')
  );

  // Self/user path: isCharity=false, isPPQ=false, charityName=empty
  assert(
    'User path returns isCharity: false',
    src.includes('isCharity: false,') && src.includes('isPPQ: false,')
  );

  // PPQ path: isCharity=false, isPPQ=true, address=empty
  assert(
    'PPQ path returns isPPQ: true with empty address',
    src.includes("address: '',") && src.includes('isPPQ: true,')
  );

  // Charity path: isCharity=true, isPPQ=false
  assert(
    'Charity path returns isCharity: true',
    src.includes('isCharity: true,')
  );

  // Default charity is als-foundation
  assert(
    'Default charity is als-foundation',
    src.includes("DEFAULT_CHARITY_ID = 'als-foundation'")
  );

  // getDestinationAddress method exists
  assert(
    'getDestinationAddress() method exists',
    src.includes('async getDestinationAddress(): Promise<RewardDestination>')
  );
}

// ---------------------------------------------------------------------------
// Test 4: submitWorkoutSimple includes reward tags in payload
// ---------------------------------------------------------------------------

function testSubmitWorkoutPayload() {
  console.log('\n=== submitWorkoutSimple payload checks ===\n');

  const src = fs.readFileSync(competitionServicePath, 'utf8');

  assert(
    'submitWorkoutSimple method exists',
    src.includes('static async submitWorkoutSimple(')
  );

  // Verify the payload includes tags in raw_event
  assert(
    'Payload includes tags in raw_event',
    src.includes('tags: submissionTags')
  );

  // submissionTags comes from data.tags
  assert(
    'submissionTags initialized from data.tags',
    src.includes('submissionTags = data.tags || []')
  );

  // Verify PPQ bolt11 is included in payload
  assert(
    'Payload includes ppq_bolt11',
    src.includes('ppq_bolt11: ppqBolt11 || null')
  );

  assert(
    'Payload includes ppq_invoice_id',
    src.includes('ppq_invoice_id: ppqInvoiceId || null')
  );

  // Verify club fields are included
  assert(
    'Payload includes club_id',
    src.includes('club_id: clubId')
  );

  assert(
    'Payload includes club_lightning_address',
    src.includes('club_lightning_address: clubLightningAddress')
  );

  // Verify reward_destination tag is passed through
  assert(
    'Payload includes activity_type',
    src.includes('activity_type: data.type')
  );

  assert(
    'Payload includes distance_meters',
    src.includes('distance_meters: data.distance')
  );

  assert(
    'Payload includes duration_seconds',
    src.includes('duration_seconds: data.duration')
  );
}

// ---------------------------------------------------------------------------
// Test 5: Charity helper functions
// ---------------------------------------------------------------------------

function testCharityHelpers() {
  console.log('\n=== Charity helper function checks ===\n');

  const src = fs.readFileSync(charitiesPath, 'utf8');

  assert(
    'getCharityById helper exists',
    src.includes('export const getCharityById')
  );

  assert(
    'isPPQTeam helper exists',
    src.includes('export const isPPQTeam')
  );

  assert(
    'isSelfTeam helper exists',
    src.includes('export const isSelfTeam')
  );

  assert(
    'isCommunityTeam helper exists',
    src.includes('export const isCommunityTeam')
  );

  assert(
    'PPQ_AI_TEAM_ID constant is ppq-ai',
    src.includes("PPQ_AI_TEAM_ID = 'ppq-ai'")
  );

  assert(
    'SELF_TEAM_ID constant is self',
    src.includes("SELF_TEAM_ID = 'self'")
  );

  assert(
    'COMMUNITY_TEAM_PREFIX is community-',
    src.includes("COMMUNITY_TEAM_PREFIX = 'community-'")
  );
}

// ---------------------------------------------------------------------------
// Test 6: PPQ fallback in submitWorkoutSimple
// ---------------------------------------------------------------------------

function testPPQFallback() {
  console.log('\n=== PPQ fallback logic ===\n');

  const src = fs.readFileSync(competitionServicePath, 'utf8');

  assert(
    'PPQ fallback injects user lightning address on PPQ invoice failure',
    src.includes('PPQ failed') && src.includes('fallback to user lightning')
  );

  assert(
    'PPQ fallback checks for existing lightning tag before injection',
    src.includes("t[0] === 'lightning'") && src.includes('hasLightningTag')
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('\n=== Destination Delivery Chain Tests ===');

  testBuildRewardTagsStructure();
  testCharityLightningAddresses();
  testRewardDestinationService();
  testSubmitWorkoutPayload();
  testCharityHelpers();
  testPPQFallback();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
