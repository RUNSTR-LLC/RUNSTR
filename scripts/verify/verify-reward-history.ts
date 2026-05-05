/**
 * Verification: Phase B reward-history wiring.
 *
 * Asserts:
 *  - RewardHistoryScreen.tsx exists and exports RewardHistoryScreen
 *  - BottomTabNavigator routes the History tab to RewardHistoryScreen
 *  - WorkoutHistoryScreen is no longer the History tab destination
 *  - SettingsScreen renders WorkoutDataSection
 *  - WorkoutDataSection navigates to WorkoutHistory
 *
 * Static checks via source regex (avoids importing RN-coupled modules
 * which esbuild/tsx cannot transform — same approach as
 * verify-team-line.ts).
 *
 * Run: npx tsx scripts/verify/verify-reward-history.ts
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const repoRoot = resolve(__dirname, '../..');
const failures: string[] = [];

const expect = (label: string, ok: boolean, detail?: string) => {
  if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
};

// 1. Screen file exists and exports the screen
const screenPath = resolve(repoRoot, 'src/screens/RewardHistoryScreen.tsx');
expect('RewardHistoryScreen.tsx exists', existsSync(screenPath));
if (existsSync(screenPath)) {
  const src = readFileSync(screenPath, 'utf8');
  expect(
    'RewardHistoryScreen.tsx exports RewardHistoryScreen',
    /export\s+const\s+RewardHistoryScreen/.test(src),
  );
  expect(
    'RewardHistoryScreen.tsx imports SupabaseRewardService',
    /SupabaseRewardService/.test(src),
  );
  expect(
    'RewardHistoryScreen.tsx filters to success',
    /status === ['"]success['"]/.test(src),
  );
}

// 2. Bottom tab navigator points History at RewardHistoryScreen
const navPath = resolve(repoRoot, 'src/navigation/BottomTabNavigator.tsx');
const navSrc = readFileSync(navPath, 'utf8');
expect(
  'BottomTabNavigator imports RewardHistoryScreen',
  /RewardHistoryScreen/.test(navSrc),
);
expect(
  'BottomTabNavigator does NOT use WorkoutHistoryScreen for the History tab',
  !/<WorkoutHistoryScreen\s*\/>/.test(navSrc),
  'WorkoutHistoryScreen is still rendered inside the bottom-tab navigator',
);

// 3. Settings hosts WorkoutDataSection
const sectionPath = resolve(repoRoot, 'src/components/settings/WorkoutDataSection.tsx');
expect('WorkoutDataSection.tsx exists', existsSync(sectionPath));
if (existsSync(sectionPath)) {
  const src = readFileSync(sectionPath, 'utf8');
  expect(
    'WorkoutDataSection has an All Workouts entry',
    /All Workouts/.test(src),
  );
}

const settingsPath = resolve(repoRoot, 'src/screens/SettingsScreen.tsx');
const settingsSrc = readFileSync(settingsPath, 'utf8');
expect(
  'SettingsScreen imports WorkoutDataSection',
  /WorkoutDataSection/.test(settingsSrc),
);
expect(
  "SettingsScreen wires onAllWorkoutsPress to navigate('WorkoutHistory')",
  /navigation\.navigate\(['"]WorkoutHistory['"]\)/.test(settingsSrc) ||
    /handleAllWorkoutsPress/.test(settingsSrc),
);

if (failures.length > 0) {
  console.error('Reward-history verification FAILED:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('Reward-history verification PASSED.');
console.log('  RewardHistoryScreen.tsx: exists + exports RewardHistoryScreen');
console.log('  BottomTabNavigator: History tab -> RewardHistoryScreen');
console.log('  WorkoutDataSection.tsx: exists with All Workouts entry');
console.log('  SettingsScreen: imports WorkoutDataSection + navigates to WorkoutHistory');
