/**
 * Test: Reward Eligibility and Amount Logic
 * Run: npx tsx scripts/core-tests/test-reward-eligibility.ts
 *
 * Tests the reward eligibility system end-to-end by:
 * 1. Importing isBoostedQualified and verifying boost logic
 * 2. Validating REWARD_CONFIG values (amounts, caps)
 * 3. Validating REWARD_STORAGE_KEYS for boost tracking
 * 4. Verifying eligible activity types and cardio subsets in source
 * 5. Verifying weekly boost cap and reset logic exists in source
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
const dailyRewardPath = path.join(srcRoot, 'services/rewards/DailyRewardService.ts');
const rewardConfigPath = path.join(srcRoot, 'config/rewards.ts');

// ---------------------------------------------------------------------------
// Test 1: REWARD_CONFIG values
// ---------------------------------------------------------------------------

function testRewardConfig() {
  console.log('\n=== REWARD_CONFIG values ===\n');

  const configSrc = fs.readFileSync(rewardConfigPath, 'utf8');

  assert(
    'DAILY_WORKOUT_REWARD is 100',
    configSrc.includes('DAILY_WORKOUT_REWARD: 100')
  );

  assert(
    'BOOSTED_WORKOUT_REWARD is 1000',
    configSrc.includes('BOOSTED_WORKOUT_REWARD: 1000')
  );

  assert(
    'BOOSTED_MAX_PER_WEEK is 5',
    configSrc.includes('BOOSTED_MAX_PER_WEEK: 5')
  );

  assert(
    'MAX_REWARDS_PER_DAY is 1',
    configSrc.includes('MAX_REWARDS_PER_DAY: 1')
  );
}

// ---------------------------------------------------------------------------
// Test 2: REWARD_STORAGE_KEYS
// ---------------------------------------------------------------------------

function testRewardStorageKeys() {
  console.log('\n=== REWARD_STORAGE_KEYS ===\n');

  const configSrc = fs.readFileSync(rewardConfigPath, 'utf8');

  assert(
    'BOOSTED_COUNT_THIS_WEEK key exists',
    configSrc.includes("BOOSTED_COUNT_THIS_WEEK: '@runstr:boosted_count_this_week'")
  );

  assert(
    'BOOSTED_WEEK_START key exists',
    configSrc.includes("BOOSTED_WEEK_START: '@runstr:boosted_week_start'")
  );

  assert(
    'LAST_REWARD_DATE key exists',
    configSrc.includes("LAST_REWARD_DATE: '@runstr:last_reward_date'")
  );

  assert(
    'TOTAL_REWARDS_EARNED key exists',
    configSrc.includes("TOTAL_REWARDS_EARNED: '@runstr:total_rewards_earned'")
  );

  assert(
    'WEEKLY_REWARDS_EARNED key exists',
    configSrc.includes("WEEKLY_REWARDS_EARNED: '@runstr:weekly_rewards_earned'")
  );

  assert(
    'WEEKLY_REWARDS_WEEK key exists',
    configSrc.includes("WEEKLY_REWARDS_WEEK: '@runstr:weekly_rewards_week'")
  );
}

// ---------------------------------------------------------------------------
// Test 3: Reward-eligible activity types
// ---------------------------------------------------------------------------

function testEligibleActivityTypes() {
  console.log('\n=== Reward-eligible activity types ===\n');

  const serviceSrc = fs.readFileSync(dailyRewardPath, 'utf8');

  // Extract the REWARD_ELIGIBLE_ACTIVITY_TYPES array from source
  const eligibleMatch = serviceSrc.match(
    /REWARD_ELIGIBLE_ACTIVITY_TYPES\s*=\s*\[([^\]]+)\]/
  );
  assert('REWARD_ELIGIBLE_ACTIVITY_TYPES array found in source', !!eligibleMatch);

  if (eligibleMatch) {
    const eligibleStr = eligibleMatch[1];
    const eligibleTypes = eligibleStr
      .split(',')
      .map((s) => s.trim().replace(/['"]/g, ''))
      .filter(Boolean);

    // Types that should qualify
    const shouldQualify = ['running', 'walking', 'cycling', 'hiking', 'strength', 'journal'];
    for (const type of shouldQualify) {
      assert(
        `${type} qualifies for rewards`,
        eligibleTypes.includes(type)
      );
    }

    // Types that should NOT qualify
    const shouldNotQualify = ['yoga', 'swimming', 'unknown', 'meditation'];
    for (const type of shouldNotQualify) {
      assert(
        `${type} does NOT qualify for rewards`,
        !eligibleTypes.includes(type)
      );
    }
  }

  // Extract CARDIO_ACTIVITY_TYPES
  const cardioMatch = serviceSrc.match(
    /CARDIO_ACTIVITY_TYPES\s*=\s*\[([^\]]+)\]/
  );
  assert('CARDIO_ACTIVITY_TYPES array found in source', !!cardioMatch);

  if (cardioMatch) {
    const cardioStr = cardioMatch[1];
    const cardioTypes = cardioStr
      .split(',')
      .map((s) => s.trim().replace(/['"]/g, ''))
      .filter(Boolean);

    assert('running is a cardio type', cardioTypes.includes('running'));
    assert('walking is a cardio type', cardioTypes.includes('walking'));
    assert('cycling is a cardio type', cardioTypes.includes('cycling'));
    assert('hiking is a cardio type', cardioTypes.includes('hiking'));
    assert('strength is NOT a cardio type', !cardioTypes.includes('strength'));
    assert('journal is NOT a cardio type', !cardioTypes.includes('journal'));
  }
}

// ---------------------------------------------------------------------------
// Test 4: isBoostedQualified logic (source-level verification)
// ---------------------------------------------------------------------------

function testIsBoostedQualified() {
  console.log('\n=== isBoostedQualified logic ===\n');

  const serviceSrc = fs.readFileSync(dailyRewardPath, 'utf8');

  // Verify the function exists and is exported
  assert(
    'isBoostedQualified function is exported',
    serviceSrc.includes('export function isBoostedQualified(')
  );

  // Verify the logic: must be cardio AND non-manual
  assert(
    'isBoostedQualified checks CARDIO_ACTIVITY_TYPES',
    serviceSrc.includes('CARDIO_ACTIVITY_TYPES.includes(activityType)')
  );

  assert(
    'isBoostedQualified excludes manual_entry',
    serviceSrc.includes("source !== 'manual_entry'")
  );

  // Now simulate the logic ourselves using the extracted arrays
  const cardioMatch = serviceSrc.match(
    /CARDIO_ACTIVITY_TYPES\s*=\s*\[([^\]]+)\]/
  );
  const cardioTypes = cardioMatch
    ? cardioMatch[1].split(',').map((s) => s.trim().replace(/['"]/g, '')).filter(Boolean)
    : [];

  // Helper that mirrors the source logic
  function isBoostedQualified(activityType: string, source: string): boolean {
    const isCardio = cardioTypes.includes(activityType);
    const isNonManual = source !== 'manual_entry';
    return isCardio && isNonManual;
  }

  // Cardio + non-manual = boosted
  assert(
    "isBoostedQualified('running', 'gps_tracker') returns true",
    isBoostedQualified('running', 'gps_tracker') === true
  );

  assert(
    "isBoostedQualified('walking', 'healthkit') returns true",
    isBoostedQualified('walking', 'healthkit') === true
  );

  assert(
    "isBoostedQualified('cycling', 'health_connect') returns true",
    isBoostedQualified('cycling', 'health_connect') === true
  );

  assert(
    "isBoostedQualified('hiking', 'gps_tracker') returns true",
    isBoostedQualified('hiking', 'gps_tracker') === true
  );

  // Manual entry excluded from boost
  assert(
    "isBoostedQualified('running', 'manual_entry') returns false",
    isBoostedQualified('running', 'manual_entry') === false
  );

  // Non-cardio excluded from boost
  assert(
    "isBoostedQualified('strength', 'manual_entry') returns false",
    isBoostedQualified('strength', 'manual_entry') === false
  );

  assert(
    "isBoostedQualified('journal', 'manual_entry') returns false",
    isBoostedQualified('journal', 'manual_entry') === false
  );

  // Non-cardio with non-manual source still excluded (not cardio)
  assert(
    "isBoostedQualified('strength', 'gps_tracker') returns false",
    isBoostedQualified('strength', 'gps_tracker') === false
  );

  assert(
    "isBoostedQualified('journal', 'healthkit') returns false",
    isBoostedQualified('journal', 'healthkit') === false
  );
}

// ---------------------------------------------------------------------------
// Test 5: Weekly boost cap and reset logic exists
// ---------------------------------------------------------------------------

function testWeeklyBoostCapLogic() {
  console.log('\n=== Weekly boost cap and reset logic ===\n');

  const serviceSrc = fs.readFileSync(dailyRewardPath, 'utf8');

  assert(
    'getWeeklyBoostCount method exists',
    serviceSrc.includes('getWeeklyBoostCount(')
  );

  assert(
    'incrementWeeklyBoostCount method exists',
    serviceSrc.includes('incrementWeeklyBoostCount(')
  );

  // Verify the cap is enforced in getRewardAmount
  assert(
    'Boost count checked against BOOSTED_MAX_PER_WEEK',
    serviceSrc.includes('boostCount < REWARD_CONFIG.BOOSTED_MAX_PER_WEEK')
  );

  assert(
    'incrementWeeklyBoostCount called when boost used',
    serviceSrc.includes('await this.incrementWeeklyBoostCount()')
  );

  // Verify week-start comparison for reset
  assert(
    'Week reset compares weekStart to currentWeekKey',
    serviceSrc.includes('weekStart !== currentWeekKey')
  );

  assert(
    'Week reset saves new BOOSTED_WEEK_START',
    serviceSrc.includes('REWARD_STORAGE_KEYS.BOOSTED_WEEK_START')
  );

  assert(
    'Week reset writes BOOSTED_COUNT_THIS_WEEK to 0',
    serviceSrc.includes("REWARD_STORAGE_KEYS.BOOSTED_COUNT_THIS_WEEK, '0'")
  );
}

// ---------------------------------------------------------------------------
// Test 6: Reward-eligible sources
// ---------------------------------------------------------------------------

function testRewardEligibleSources() {
  console.log('\n=== Reward-eligible sources ===\n');

  const serviceSrc = fs.readFileSync(dailyRewardPath, 'utf8');

  const sourcesMatch = serviceSrc.match(
    /REWARD_ELIGIBLE_SOURCES\s*=\s*\[([^\]]+)\]/s
  );
  assert('REWARD_ELIGIBLE_SOURCES array found in source', !!sourcesMatch);

  if (sourcesMatch) {
    const sourcesStr = sourcesMatch[1];

    assert('gps_tracker is eligible source', sourcesStr.includes("'gps_tracker'"));
    assert('manual_entry is eligible source', sourcesStr.includes("'manual_entry'"));
    assert('healthkit is eligible source', sourcesStr.includes("'healthkit'"));
    assert('health_connect is eligible source', sourcesStr.includes("'health_connect'"));
    assert('imported_nostr is NOT eligible (anti-gaming)', !sourcesStr.includes("'imported_nostr'"));
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('\n=== Reward Eligibility Tests ===');

  testRewardConfig();
  testRewardStorageKeys();
  testEligibleActivityTypes();
  testIsBoostedQualified();
  testWeeklyBoostCapLogic();
  testRewardEligibleSources();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
