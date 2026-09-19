/**
 * Verifies the Phase 1 hiding pass: every Phase 1 flag is off, and every
 * unregistered route is absent from the live AuthenticatedStack in src/App.tsx.
 *
 * Run: npx tsx scripts/verify/verify-simplification-phase1.ts
 */
import { readFileSync } from 'fs';
import { FEATURES } from '../../src/config/features';

const PHASE_1_FLAGS = [
  'social', 'leaderboard', 'teams', 'level', 'earnings', 'activitySelector',
  'stepTracking', 'cloudBackupButton', 'walletSettings', 'privateMode',
  'shareSheet', 'journalHabits', 'nonRunningHistory',
] as const;

const REMOVED_ROUTES = [
  'Rewards', 'Compete', 'Leaderboards', 'DynamicEventDetail',
  'Season2', 'Season3', 'EinundzwanzigDetail',
  'ClubChat', 'ClubPage', 'Comments',
  'LevelDetail', 'JournalHistory', 'HealthProfile',
  'AdvancedAnalytics', 'StatsDetail', 'Experimental',
];

const KEPT_ROUTES = [
  'MainTabs', 'Settings', 'HelpSupport', 'ContactSupport',
  'PrivacyPolicy', 'WorkoutHistory', 'ProfileEdit', 'SavedRoutes',
];

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failures++;
};

for (const flag of PHASE_1_FLAGS) {
  check((FEATURES as Record<string, boolean>)[flag] === false, `flag ${flag} is false`);
}

const app = readFileSync('src/App.tsx', 'utf8');
const registered = new Set(
  [...app.matchAll(/<AuthenticatedStack\.Screen[\s\S]*?name="(\w+)"/g)].map((m) => m[1])
);

for (const route of REMOVED_ROUTES) {
  check(!registered.has(route), `route ${route} is unregistered`);
}
for (const route of KEPT_ROUTES) {
  check(registered.has(route), `route ${route} is still registered`);
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
