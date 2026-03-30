/**
 * Verify: HealthKit background sync includes reward destination tags
 * Compares background path (HealthKitBackgroundService) with foreground path
 * (LocalWorkoutStorageService) to ensure parity
 * Run: npx tsx scripts/verify/verify-reward-destination-background-sync.ts
 */

import fs from 'fs';

const BG_FILE = 'src/services/fitness/HealthKitBackgroundService.ts';
const FG_FILE = 'src/services/fitness/LocalWorkoutStorageService.ts';
const HK_FILE = 'src/services/fitness/healthKitService.ts';
const TAGS_FILE = 'src/utils/rewardTags.ts';

const bgSrc = fs.readFileSync(BG_FILE, 'utf-8');
const fgSrc = fs.readFileSync(FG_FILE, 'utf-8');
const hkSrc = fs.readFileSync(HK_FILE, 'utf-8');
const tagsSrc = fs.readFileSync(TAGS_FILE, 'utf-8');

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

console.log('\n=== Reward Destination in Background Sync ===\n');

// 1. Background service calls buildRewardTags
console.log('--- HealthKitBackgroundService reward tags ---');
assert(
  'Background service imports buildRewardTags',
  bgSrc.includes('buildRewardTags')
);
assert(
  'Background service calls buildRewardTags() for workout submissions',
  bgSrc.includes('buildRewardTags()') && bgSrc.includes('rewardTags')
);
assert(
  'Background service spreads rewardTags into submission tags',
  bgSrc.includes('[...rewardTags]')
);
assert(
  'Background service has timeout protection for buildRewardTags',
  bgSrc.includes('buildRewardTags timeout') || bgSrc.includes('Promise.race')
);
assert(
  'Background service handles buildRewardTags failure gracefully',
  bgSrc.includes('submitting without reward tags') || bgSrc.includes('buildRewardTags failed')
);

// 2. Background step sync also includes reward tags
console.log('\n--- Background step sync reward tags ---');
assert(
  'Step sync also calls buildRewardTags',
  // Count occurrences of buildRewardTags() -- should appear twice (workouts + steps)
  (bgSrc.match(/buildRewardTags\(\)/g) || []).length >= 2,
  `Found ${(bgSrc.match(/buildRewardTags\(\)/g) || []).length} calls to buildRewardTags()`
);
assert(
  'Step sync spreads rewardTags into step submission',
  bgSrc.includes('...rewardTags,') && bgSrc.includes('steps')
);

// 3. buildRewardTags includes reward_destination tag
console.log('\n--- buildRewardTags output ---');
assert(
  'buildRewardTags includes reward_destination tag',
  tagsSrc.includes("'reward_destination'") || tagsSrc.includes('"reward_destination"')
);
assert(
  'buildRewardTags includes lightning address tag',
  tagsSrc.includes("'lightning'") || tagsSrc.includes('"lightning"')
);
assert(
  'buildRewardTags is an async function returning string[][]',
  tagsSrc.includes('async function buildRewardTags') && tagsSrc.includes('Promise<string[][]>')
);

// 4. Foreground comparison -- LocalWorkoutStorageService
console.log('\n--- Foreground parity (LocalWorkoutStorageService) ---');
assert(
  'Foreground also calls buildRewardTags',
  fgSrc.includes('buildRewardTags')
);
assert(
  'Foreground has timeout protection for buildRewardTags',
  fgSrc.includes('buildRewardTags timed out') || fgSrc.includes('Promise.race')
);

// 5. Foreground HealthKit service also includes reward tags
console.log('\n--- Foreground parity (healthKitService) ---');
assert(
  'Foreground HealthKit imports buildRewardTags',
  hkSrc.includes('import { buildRewardTags }')
);
assert(
  'Foreground HealthKit calls buildRewardTags()',
  hkSrc.includes('buildRewardTags()')
);
assert(
  'Foreground HealthKit spreads rewardTags into tags',
  hkSrc.includes('[...rewardTags]')
);

// 6. All three submission paths use the same buildRewardTags function
console.log('\n--- Shared reward tag source ---');
assert(
  'All paths import from same module (../../utils/rewardTags)',
  bgSrc.includes('utils/rewardTags') &&
  fgSrc.includes('utils/rewardTags') &&
  hkSrc.includes('utils/rewardTags'),
  'All services should import buildRewardTags from the same utility'
);

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
