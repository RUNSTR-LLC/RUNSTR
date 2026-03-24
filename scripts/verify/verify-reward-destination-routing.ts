/**
 * Verify: reward destination routing for workout publishing
 *
 * Mirrors current logic in src/services/nostr/workoutPublishingService.ts:
 * - user lightning present => reward_destination=user
 * - else if selected team is PPQ.AI => reward_destination=ppq
 * - else => reward_destination=charity
 *
 * Run: npx tsx scripts/verify/verify-reward-destination-routing.ts
 */

type RewardDestination = 'user' | 'charity' | 'ppq';

interface MockCharity {
  id: string;
  name: string;
  lightningAddress?: string;
}

const PPQ_AI_TEAM_ID = 'ppq-ai';

function isPPQTeam(teamId?: string | null): boolean {
  if (!teamId) return false;
  return teamId === PPQ_AI_TEAM_ID;
}

function computeRewardDestination(
  rewardLightningAddress?: string | null,
  selectedTeamId?: string | null
): RewardDestination {
  const hasLightningAddress = !!(rewardLightningAddress && rewardLightningAddress.length > 0);
  const isPPQ = selectedTeamId ? isPPQTeam(selectedTeamId) : false;

  if (hasLightningAddress) return 'user';
  if (isPPQ) return 'ppq';
  return 'charity';
}

function appendRoutingTags(
  tags: string[][],
  selectedCharity: MockCharity | null,
  rewardLightningAddress: string | null,
  rewardDestination: RewardDestination
): string[][] {
  const out = [...tags];

  // Mirrors workoutPublishingService behavior for team/charity tags
  if (selectedCharity) {
    out.push(['team', selectedCharity.id]);

    if (selectedCharity.lightningAddress) {
      out.push([
        'charity',
        selectedCharity.id,
        selectedCharity.name,
        selectedCharity.lightningAddress,
      ]);
    } else {
      out.push([
        'charity',
        selectedCharity.id,
        selectedCharity.name,
      ]);
    }
  }

  if (rewardLightningAddress) {
    out.push(['lightning', rewardLightningAddress]);
  }

  out.push(['reward_destination', rewardDestination]);
  return out;
}

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

function hasTag(tags: string[][], key: string, value?: string): boolean {
  return tags.some((tag) => tag[0] === key && (value === undefined || tag[1] === value));
}

console.log('\n=== reward destination routing matrix ===');

const userDest = computeRewardDestination('runner@getalby.com', 'ppq-ai');
assert('user lightning overrides PPQ team', userDest === 'user', `got ${userDest}`);

const ppqDest = computeRewardDestination(null, 'ppq-ai');
assert('PPQ team without user lightning routes to ppq', ppqDest === 'ppq', `got ${ppqDest}`);

const charityDest = computeRewardDestination(null, 'runstr');
assert('non-PPQ team without user lightning routes to charity', charityDest === 'charity', `got ${charityDest}`);

const fallbackDest = computeRewardDestination(null, null);
assert('no user lightning and no team still uses charity fallback', fallbackDest === 'charity', `got ${fallbackDest}`);

console.log('\n=== routing tag composition checks ===');

const ppqCharity: MockCharity = {
  id: 'ppq-ai',
  name: 'PPQ.AI',
};
const runstrCharity: MockCharity = {
  id: 'runstr',
  name: 'RUNSTR',
  lightningAddress: 'thewildhustle@strike.me',
};

const ppqTags = appendRoutingTags(
  [['exercise', 'running']],
  ppqCharity,
  null,
  ppqDest
);
assert('ppq tags include team tag', hasTag(ppqTags, 'team', 'ppq-ai'));
assert('ppq tags include charity tag', hasTag(ppqTags, 'charity', 'ppq-ai'));
assert('ppq tags include reward_destination=ppq', hasTag(ppqTags, 'reward_destination', 'ppq'));
assert('ppq tags do not include lightning tag when user has no address', !hasTag(ppqTags, 'lightning'));

const charityTags = appendRoutingTags(
  [['exercise', 'walking']],
  runstrCharity,
  null,
  charityDest
);
assert('charity tags include reward_destination=charity', hasTag(charityTags, 'reward_destination', 'charity'));
assert('charity tag includes selected charity id', hasTag(charityTags, 'charity', 'runstr'));

const userTags = appendRoutingTags(
  [['exercise', 'cycling']],
  runstrCharity,
  'runner@getalby.com',
  userDest
);
assert('user tags include reward_destination=user', hasTag(userTags, 'reward_destination', 'user'));
assert('user tags include lightning tag when user address exists', hasTag(userTags, 'lightning', 'runner@getalby.com'));

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
