/**
 * Verify streak section wiring:
 * 1. StreakSection component exists and exports correctly
 * 2. RewardsScreen imports StreakSection (not LotteryWheelSection)
 * 3. No remaining lottery imports in src/
 * 4. Migration file exists
 */
import * as fs from 'fs';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}`);
    failed++;
  }
}

// 1. StreakSection exists
check('StreakSection component exists',
  fs.existsSync('src/components/streak/StreakSection.tsx'));

// 2. RewardsScreen imports StreakSection
const rewards = fs.readFileSync('src/screens/RewardsScreen.tsx', 'utf-8');
check('RewardsScreen imports StreakSection',
  rewards.includes("from '../components/streak/StreakSection'"));
check('RewardsScreen does NOT import LotteryWheelSection',
  !rewards.includes('LotteryWheelSection'));

// 3. No lottery files remain
check('lottery/ directory removed',
  !fs.existsSync('src/components/lottery'));
check('LotteryService removed',
  !fs.existsSync('src/services/lottery/LotteryService.ts'));
check('lottery types removed',
  !fs.existsSync('src/types/lottery.ts'));

// 4. Migration exists
check('Streak bonus migration exists',
  fs.existsSync('supabase/migrations/173_streak_reward_bonus.sql'));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
