/**
 * Verify navigation integration — activity menu + lottery wheel
 * Checks that all wiring is consistent and nothing is broken.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath));
}

// ===== 1. All new files exist =====
console.log('\n--- File existence ---');
const requiredFiles = [
  'src/types/activityMenu.ts',
  'src/types/lottery.ts',
  'src/components/activity/ActivityPill.tsx',
  'src/components/activity/ActivityDropdown.tsx',
  'src/components/activity/ActivityCategoryBar.tsx',
  'src/components/lottery/LotteryWheel.tsx',
  'src/components/lottery/LotteryResult.tsx',
  'src/components/lottery/SpinButton.tsx',
  'src/components/lottery/XPExplainer.tsx',
  'src/screens/LevelDetailScreen.tsx',
  'src/services/lottery/LotteryService.ts',
];
for (const f of requiredFiles) {
  check(f, fileExists(f));
}

// ===== 2. Navigation registration =====
console.log('\n--- Navigation ---');
const appNav = readFile('src/navigation/AppNavigator.tsx');
check('LevelDetail in RootStackParamList', appNav.includes('LevelDetail'));
check('LevelDetailScreen imported', appNav.includes('LevelDetailScreen'));
check('LevelDetail Stack.Screen registered', appNav.includes("name=\"LevelDetail\"") || appNav.includes("name='LevelDetail'"));

// ===== 3. WorkoutLevelRing navigates instead of modal =====
console.log('\n--- WorkoutLevelRing ---');
const levelRing = readFile('src/components/profile/WorkoutLevelRing.tsx');
check('No Modal import', !levelRing.includes("from 'react-native'") || !levelRing.match(/import\s+{[^}]*Modal[^}]*}/));
check('useNavigation imported', levelRing.includes('useNavigation'));
check('Navigates to LevelDetail', levelRing.includes("'LevelDetail'"));
check('No setShowExplainer', !levelRing.includes('setShowExplainer'));

// ===== 4. ActivityCategoryBar in ActivityTrackerScreen =====
console.log('\n--- Activity Tracker Integration ---');
const tracker = readFile('src/screens/activity/ActivityTrackerScreen.tsx');
check('ActivityCategoryBar imported', tracker.includes('ActivityCategoryBar'));
check('ActivityCategoryBar in JSX', tracker.includes('<ActivityCategoryBar'));
check('No case mindfulness', !tracker.includes("case 'mindfulness'"));
check('Journal in wellness case', tracker.includes("case 'journal'") || tracker.includes("'journal'"));

// ===== 5. ActivityGridService — 3 categories =====
console.log('\n--- ActivityGridService ---');
const gridService = readFile('src/services/activity/ActivityGridService.ts');
const gridMatches = gridService.match(/key:\s*'(cardio|strength|wellness|mindfulness)'/g) || [];
const uniqueKeys = [...new Set(gridMatches.map(m => m.match(/'(\w+)'/)?.[1]))];
check('3 categories (no mindfulness)', uniqueKeys.length === 3 && !uniqueKeys.includes('mindfulness'));
check('Wellness includes journal', gridService.includes("'journal'") && gridService.includes("'habits'"));

// ===== 6. Category menu matches grid order =====
console.log('\n--- Category Menu Consistency ---');
const menuTypes = readFile('src/types/activityMenu.ts');
// Check cardio order matches
const menuCardioMatch = menuTypes.match(/key:\s*'cardio'[\s\S]*?activities:\s*\[([\s\S]*?)\]/);
const gridCardioMatch = gridService.match(/key:\s*'cardio'[\s\S]*?activities:\s*\[([\s\S]*?)\]/);
if (menuCardioMatch && gridCardioMatch) {
  const menuOrder = [...menuCardioMatch[1].matchAll(/key:\s*'(\w+)'/g)].map(m => m[1]);
  const gridOrder = [...gridCardioMatch[1].matchAll(/'(\w+)'/g)].map(m => m[1]);
  check('Cardio order matches grid', JSON.stringify(menuOrder) === JSON.stringify(gridOrder),
    `menu: ${menuOrder.join(',')} grid: ${gridOrder.join(',')}`);
} else {
  check('Cardio order matches grid', false, 'could not parse');
}

// ===== 7. Lottery Wheel — live spin state =====
console.log('\n--- Lottery Wheel State ---');
const lotterySection = readFile('src/components/lottery/LotteryWheelSection.tsx');
check('No Coming Soon placeholder', !lotterySection.includes('Coming Soon'));
check('Spin eligibility is dynamic (canSpinToday)', lotterySection.includes('canSpinToday'));

// ===== 8. Rewards pool reads from Supabase (not hardcoded) =====
console.log('\n--- Rewards Pool ---');
const rewardsScreen = readFile('src/screens/RewardsScreen.tsx');
check('Pool reads from Supabase', rewardsScreen.includes('getRewardsPoolBalance'));
check('No hardcoded setPoolBalance(0)', !rewardsScreen.includes('setPoolBalance(0)'));

// ===== Summary =====
console.log(`\n=== ${passed}/${passed + failed} checks passed ===`);
process.exit(failed > 0 ? 1 : 0);
