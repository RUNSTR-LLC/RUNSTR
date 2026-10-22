/**
 * Verify the post-run summary and Home/History cleanup: both publish through
 * publishRun (kind 1301, recorded on the run), show Nostr status plainly, and
 * no longer carry share-card, WoT, reward, team, or notification UI.
 * Static check — the components import React Native and can't run under tsx.
 * Run: npx tsx scripts/verify/verify-run-summary-and-history.ts
 */
import { readFileSync } from 'fs';

let failed = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failed++;
};
const read = (p: string) => readFileSync(p, 'utf8');
const lines = (p: string) => read(p).split('\n').length;

const summary = read('src/components/activity/WorkoutSummaryModal.tsx');
check(summary.includes('publishRun('), 'summary publishes through publishRun');
check(summary.includes('Published to Nostr') && summary.includes("'Retry'"), 'summary shows published state and a retry');
check(!/EnhancedSocialShareModal|WoTService|Rewards|routeAchievements/.test(summary), 'summary has no share card, WoT, rewards, or route achievements');

const publish = read('src/services/nostr/publishRun.ts');
check(publish.includes('markAsPosted(') && publish.includes('markAsSynced('), 'publishRun records the run as published');

const history = read('src/components/profile/tabs/UnifiedWorkoutsTab.tsx');
check(history.includes('publishRun(') && history.includes('On Nostr'), 'history publishes directly and marks runs on Nostr');
check(!history.includes('WoTService'), 'history publish is not gated on WoT');
check(!/JournalEditorModal|TimelineEntryCard|getAllHabits/.test(history), 'history has no hidden journal/habit timeline');
check(!read('src/screens/WorkoutHistoryScreen.tsx').includes('EnhancedSocialShareModal'), 'history has no share-card modal');

const home = read('src/screens/ProfileScreen.tsx');
check(!/NotificationBadge|ActivityCategoryBar|activityGridService|currentTeam=/.test(home), 'home has no notification, activity grid, or team UI');
check(!/TeamLine|earnings|streak/.test(read('src/components/profile/ProfileHero.tsx')), 'profile hero has no team, earnings, or level badges');

const tracker = read('src/screens/activity/RunningTrackerScreen.tsx');
check(!/RouteSelectionModal|DistanceGoalPickerModal|handlePostWeeklyDistance/.test(tracker), 'tracker has no unreachable route/goal/weekly-share code');

for (const p of [
  'src/components/activity/WorkoutSummaryModal.tsx',
  'src/screens/ProfileScreen.tsx',
  'src/components/profile/ProfileHero.tsx',
  'src/screens/WorkoutHistoryScreen.tsx',
  'src/screens/activity/RunningTrackerScreen.tsx',
  'src/components/profile/tabs/UnifiedWorkoutsTab.tsx',
]) {
  check(lines(p) <= 500, `${p} is within 500 lines (${lines(p)})`);
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
