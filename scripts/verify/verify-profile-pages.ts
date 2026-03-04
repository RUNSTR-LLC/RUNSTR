/**
 * Verify unified profile pages implementation
 * Checks that key files exist, exports are correct, and old code is removed
 */

import * as fs from 'fs';
import * as path from 'path';

const srcRoot = path.join(__dirname, '../../src');
let passed = 0;
let failed = 0;

function check(label: string, ok: boolean) {
  if (ok) {
    console.log(`  OK: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

// 1. New files exist
console.log('\n--- New files ---');
const newFiles = [
  'services/backend/ProfileDataService.ts',
  'components/profile/ProfileHero.tsx',
  'components/profile/ProfileBadgesRow.tsx',
  'components/profile/ProfileStatsGrid.tsx',
  'components/profile/PersonalRecordsSection.tsx',
  'components/profile/ActiveCompetitionsSection.tsx',
  'components/profile/RecentWorkoutsSection.tsx',
  'components/profile/ClubAffiliationsSection.tsx',
];
for (const f of newFiles) {
  check(f, fs.existsSync(path.join(srcRoot, f)));
}

// 2. ProfileScreen uses new components
console.log('\n--- ProfileScreen imports ---');
const ps = fs.readFileSync(path.join(srcRoot, 'screens/ProfileScreen.tsx'), 'utf-8');
const expectedImports = ['ProfileHero', 'ProfileBadgesRow', 'ProfileStatsGrid', 'PersonalRecordsSection', 'ActiveCompetitionsSection', 'RecentWorkoutsSection', 'ClubAffiliationsSection', 'ProfileDataService'];
for (const imp of expectedImports) {
  check(`ProfileScreen imports ${imp}`, ps.includes(imp));
}

// 3. ProfileScreen has route params and isOwner
console.log('\n--- ProfileScreen features ---');
check('Has useRoute', ps.includes('useRoute'));
check('Has isOwner check', ps.includes('isOwner'));
check('Has useNostrProfile for other users', ps.includes('useNostrProfile'));
check('Under 500 lines', ps.split('\n').length < 500);

// 4. Old imports removed from ProfileScreen
console.log('\n--- Old code removed ---');
check('No ProfileHeader import', !ps.includes("from '../components/profile/ProfileHeader'"));
check('No FitnessTrackerBox', !ps.includes('FitnessTrackerBox'));
check('No FitnessHistoryBox', !ps.includes('FitnessHistoryBox'));
check('No FitnessCompetitionsBox', !ps.includes('FitnessCompetitionsBox'));

// 5. Old navigation box files deleted
console.log('\n--- Deleted files ---');
check('MyTeamsBox.tsx deleted', !fs.existsSync(path.join(srcRoot, 'components/profile/MyTeamsBox.tsx')));
check('YourCompetitionsBox.tsx deleted', !fs.existsSync(path.join(srcRoot, 'components/profile/YourCompetitionsBox.tsx')));
check('YourWorkoutsBox.tsx deleted', !fs.existsSync(path.join(srcRoot, 'components/profile/YourWorkoutsBox.tsx')));

// 6. BottomTabNavigator has Events tab
console.log('\n--- Navigation ---');
const btn = fs.readFileSync(path.join(srcRoot, 'navigation/BottomTabNavigator.tsx'), 'utf-8');
check('Has Events tab', btn.includes('Events'));
check('No Rewards tab', !btn.includes("name=\"Rewards\"") && !btn.includes("name='Rewards'"));

// 7. ZappableUserRow has onPress
console.log('\n--- Tap-to-profile ---');
const zur = fs.readFileSync(path.join(srcRoot, 'components/ui/ZappableUserRow.tsx'), 'utf-8');
check('ZappableUserRow has onPress prop', zur.includes('onPress'));

// 8. DailyLeaderboardCard has navigation
const dlc = fs.readFileSync(path.join(srcRoot, 'components/team/DailyLeaderboardCard.tsx'), 'utf-8');
check('DailyLeaderboardCard navigates to Profile', dlc.includes("navigate('Profile'") || dlc.includes('navigate("Profile"'));

// 9. ClubMembersSection has navigation
const cms = fs.readFileSync(path.join(srcRoot, 'components/club/ClubMembersSection.tsx'), 'utf-8');
check('ClubMembersSection navigates to Profile', cms.includes("navigate('Profile'") || cms.includes('navigate("Profile"'));

// 10. AppNavigator has pubkey param
const an = fs.readFileSync(path.join(srcRoot, 'navigation/AppNavigator.tsx'), 'utf-8');
check('AppNavigator Profile accepts pubkey', an.includes('pubkey'));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
