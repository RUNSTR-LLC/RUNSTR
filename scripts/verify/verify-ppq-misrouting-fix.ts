/**
 * Verify: PPQ.AI reward misrouting fix
 *
 * Checks that:
 * 1. SupabaseCompetitionService no longer injects user's lightning address on PPQ failure
 * 2. The DB trigger migration (176) guards against ppq destination without bolt11
 * 3. rewardTags.ts does NOT add a lightning tag for PPQ users
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

// Check 1: No PPQ fallback injection in SupabaseCompetitionService
const competitionService = fs.readFileSync(
  path.join(ROOT, 'src/services/backend/SupabaseCompetitionService.ts'),
  'utf-8'
);

const hasFallbackInjection = competitionService.includes("submissionTags = [...submissionTags, ['lightning', userLnAddress]]");
console.log(`[1] PPQ fallback lightning injection removed: ${!hasFallbackInjection ? 'PASS' : 'FAIL'}`);

const hasSkipMessage = competitionService.includes('reward will be skipped (no fallback to user wallet)');
console.log(`[2] PPQ skip message present: ${hasSkipMessage ? 'PASS' : 'FAIL'}`);

// Check 2: Migration 176 has the safety guard
const migration = fs.readFileSync(
  path.join(ROOT, 'supabase/migrations/176_fix_ppq_reward_misrouting.sql'),
  'utf-8'
);

const hasDestinationCheck = migration.includes("v_reward_destination = 'ppq' AND (v_ppq_bolt11 IS NULL OR v_ppq_bolt11 = '')");
console.log(`[3] DB trigger guards against PPQ without bolt11: ${hasDestinationCheck ? 'PASS' : 'FAIL'}`);

const hasRewardDestinationExtraction = migration.includes("tag_arr->>0 = 'reward_destination'");
console.log(`[4] DB trigger extracts reward_destination tag: ${hasRewardDestinationExtraction ? 'PASS' : 'FAIL'}`);

const hasBaseReward50 = migration.includes('v_reward_amount INT := 50');
console.log(`[5] Base reward is 50 sats: ${hasBaseReward50 ? 'PASS' : 'FAIL'}`);

// Check 3: rewardTags.ts doesn't add lightning for PPQ
const rewardTags = fs.readFileSync(
  path.join(ROOT, 'src/utils/rewardTags.ts'),
  'utf-8'
);

// Find the PPQ path: it sets rewardDestination = 'ppq' without setting rewardLightningAddress
const ppqSetsNoAddress = rewardTags.includes("rewardDestination = 'ppq'") &&
  !rewardTags.includes("rewardDestination = 'ppq';\n    rewardLightningAddress");
console.log(`[6] rewardTags PPQ path does not set lightning address: ${ppqSetsNoAddress ? 'PASS' : 'FAIL'}`);

// The lightning tag is only pushed when rewardLightningAddress is set AND not PPQ
const lightningGuard = rewardTags.includes('if (rewardLightningAddress)') &&
  rewardTags.includes("} else if (!isPPQ)");
console.log(`[7] Lightning tag guarded against PPQ: ${lightningGuard ? 'PASS' : 'FAIL'}`);

console.log('\nAll critical misrouting vectors checked.');
