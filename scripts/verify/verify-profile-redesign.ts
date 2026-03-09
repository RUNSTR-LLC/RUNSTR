/**
 * Verify Profile Redesign v3 — Dashboard Grid with Club card
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../../src');
let passed = 0;
let failed = 0;

function check(label: string, condition: boolean) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.log(`  FAIL: ${label}`); failed++; }
}

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), 'utf-8');
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(SRC, relPath));
}

console.log('\n=== Profile Redesign v3 Verification ===\n');

// 1. Components exist
console.log('1. Components:');
check('ProfileDashboardGrid exists', fileExists('components/profile/ProfileDashboardGrid.tsx'));
check('StatsDetailScreen exists', fileExists('screens/StatsDetailScreen.tsx'));

// 2. Dashboard grid — 2x2: Level | Rewards Destination | Club | Workouts
console.log('\n2. ProfileDashboardGrid:');
const grid = readFile('components/profile/ProfileDashboardGrid.tsx');
check('Level card present', grid.includes('LevelMiniCard'));
check('Rewards card present', grid.includes('RewardsMiniCard'));
check('Club card present', grid.includes('ClubMiniCard'));
check('Workouts card present', grid.includes('WorkoutsMiniCard'));
check('onLevelPress prop', grid.includes('onLevelPress'));
check('onRewardsPress prop', grid.includes('onRewardsPress'));
check('onClubPress prop', grid.includes('onClubPress'));
check('onWorkoutsPress prop', grid.includes('onWorkoutsPress'));
check('Rewards label says "Rewards Destination"', grid.includes('Rewards Destination'));
check('Cards use minHeight', grid.includes('minHeight: 120'));
check('Avatar used for clubs/rewards', grid.includes('Avatar'));

// 3. ProfileScreen
console.log('\n3. ProfileScreen:');
const screen = readFile('screens/ProfileScreen.tsx');
check('Start Workout uses text color', screen.includes('borderColor: theme.colors.text') && screen.includes('color: theme.colors.text'));
check('Passes onLevelPress', screen.includes('onLevelPress={handleStatsPress}'));
check('Passes onClubPress', screen.includes('onClubPress={handleClubPress}'));
check('Passes onRewardsPress', screen.includes('onRewardsPress={handleDestinationPress}'));
check('Navigates to StatsDetail', screen.includes("'StatsDetail'"));
check('Rewards defaults to ALS Foundation', screen.includes('als-foundation'));
check('Uses Promise.allSettled', screen.includes('Promise.allSettled'));
check('Handles empty targetNpub', screen.includes('setIsLoadingSections(false)'));

// 4. StatsDetail screen
console.log('\n4. StatsDetailScreen:');
const stats = readFile('screens/StatsDetailScreen.tsx');
check('Uses LevelCard', stats.includes('<LevelCard'));
check('Uses ActivityBreakdown', stats.includes('<ActivityBreakdown'));
check('Has back button', stats.includes('arrow-back'));
check('Loads data via ProfileDataService', stats.includes('ProfileDataService'));

// 5. Navigator
console.log('\n5. AppNavigator:');
const nav = readFile('navigation/AppNavigator.tsx');
check('StatsDetail in RootStackParamList', nav.includes('StatsDetail'));
check('StatsDetailScreen imported', nav.includes('StatsDetailScreen'));
check('StatsDetail registered as Stack.Screen', nav.includes('name="StatsDetail"'));

// Summary
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
