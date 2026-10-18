/**
 * Verify Phase 2 steps 1-5: workouts are no longer sent to Supabase, personal
 * records are computed from local storage, every post is a kind 1301 note, and
 * the encrypted backup restores on login, and startup Supabase calls are gated.
 * Static check — the services import React Native and can't run under tsx.
 * Run: npx tsx scripts/verify/verify-no-supabase-submission.ts
 */
import { readFileSync } from 'fs';
import { FEATURES } from '../../src/config/features';

const checks: Array<[string, string, string]> = [
  ['src/services/backend/SupabaseCompetitionService.ts', 'if (!FEATURES.supabase) {', 'submitWorkoutSimple choke point'],
  ['src/services/nostr/workoutPublishingService.ts', '} else if (!FEATURES.supabase) {', 'finish-run publish path skips Supabase branch'],
  ['src/services/fitness/LocalWorkoutStorageService.ts', 'if (!FEATURES.supabase) {\n      return;', 'autoSubmitToSupabase returns early'],
  ['src/components/profile/tabs/UnifiedWorkoutsTab.tsx', 'FEATURES.supabase && localWorkout?.supabaseSubmitted === false', 'Compete/retry button hidden'],
  ['src/App.tsx', 'FEATURES.supabase\n            ? await PendingSubmissionService.retryAll()', 'foreground retry queue skipped'],
];

let failed = 0;
const flagOff = FEATURES.supabase === false;
console.log(`${flagOff ? 'PASS' : 'FAIL'}  FEATURES.supabase is false`);
if (!flagOff) failed++;

for (const [file, needle, label] of checks) {
  const ok = readFileSync(file, 'utf8').includes(needle);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label} (${file})`);
  if (!ok) failed++;
}

const tabCount = readFileSync('src/components/profile/tabs/UnifiedWorkoutsTab.tsx', 'utf8')
  .split('localWorkout?.supabaseSubmitted === false').length - 1;
const gatedCount = readFileSync('src/components/profile/tabs/UnifiedWorkoutsTab.tsx', 'utf8')
  .split('FEATURES.supabase && localWorkout?.supabaseSubmitted === false').length - 1;
const allGated = tabCount === gatedCount;
console.log(`${allGated ? 'PASS' : 'FAIL'}  every Compete condition gated (${gatedCount}/${tabCount})`);
if (!allGated) failed++;

// Step 2: personal records come from local storage, not Supabase
const statsCard = readFileSync('src/components/profile/StatsCard.tsx', 'utf8');
const prsLocal =
  !/utils\/supabase|nostr-tools/.test(statsCard) && statsCard.includes('localWorkoutStorage.getAllWorkouts()');
console.log(`${prsLocal ? 'PASS' : 'FAIL'}  StatsCard PRs computed from local workouts`);
if (!prsLocal) failed++;

// Step 3: every post is a kind 1301 note; kind 1 path and format picker retired
const publishing = readFileSync('src/services/nostr/workoutPublishingService.ts', 'utf8');
const postWorkoutBody = publishing.slice(publishing.indexOf('async postWorkout('), publishing.indexOf('private async dualWriteWorkoutFeed('));
const only1301 = !postWorkoutBody.includes('postWorkoutToSocial(') && postWorkoutBody.includes('publishWorkout1301(');
console.log(`${only1301 ? 'PASS' : 'FAIL'}  postWorkout publishes 1301 only`);
if (!only1301) failed++;
const toggleOff = readFileSync('src/components/settings/NostrPostingSection.tsx', 'utf8').includes('const SHOW_FORMAT_TOGGLE = false;');
console.log(`${toggleOff ? 'PASS' : 'FAIL'}  Post format picker hidden`);
if (!toggleOff) failed++;

// Step 4: encrypted 30078 backup restores on login, before the 1301 backfill
const app = readFileSync('src/App.tsx', 'utf8');
const restoreFirst = /restoreInBackground\(\)\s*\.then\(\(\) => Nostr1301ImportService\.getInstance\(\)\.backfillInBackground/.test(app);
console.log(`${restoreFirst ? 'PASS' : 'FAIL'}  login restores 30078 backup, then backfills 1301s`);
if (!restoreFirst) failed++;
const restore = readFileSync('src/services/backup/RestoreService.ts', 'utf8');
const noQueue = restore.includes('workoutResult.imported > 0 && FEATURES.supabase');
console.log(`${noQueue ? 'PASS' : 'FAIL'}  restore no longer queues workouts for Supabase`);
if (!noQueue) failed++;

// Step 5: login/startup Supabase calls gated on FEATURES.supabase
const gates: Array<[string, string, string]> = [
  ['src/App.tsx', '!currentUser || !FEATURES.supabase) {', 'reward polling'],
  ['src/contexts/AuthContext.tsx', 'isInitializing || !FEATURES.supabase) return;\n\n    (async', 'push token_key upsert'],
  ['src/contexts/AuthContext.tsx', 'isInitializing || !FEATURES.supabase) return;\n    void PPQAccountService', 'PPQ key migration'],
  ['src/services/notifications/ExpoNotificationProvider.ts', 'if (FEATURES.supabase) {\n        try {\n          await BroadcastTokenService.registerToken', 'broadcast token registration'],
  ['src/services/initialization/AppInitializationService.ts', 'FEATURES.supabase ? this.prefetchSeason2Data()', 'Season 2 leaderboard prefetch'],
  ['src/screens/ProfileScreen.tsx', 'if (!pubkey || !FEATURES.supabase) return;', 'profile earnings badge'],
  ['src/screens/ProfileScreen.tsx', 'if (targetNpub && FEATURES.supabase) { loadProfileSections', 'profile section queries'],
];
for (const [file, needle, label] of gates) {
  const ok = readFileSync(file, 'utf8').includes(needle);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label} gated (${file})`);
  if (!ok) failed++;
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
