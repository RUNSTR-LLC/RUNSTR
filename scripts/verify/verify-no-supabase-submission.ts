/**
 * Verify Phase 2 steps 1-3: workouts are no longer sent to Supabase, personal
 * records are computed from local storage, and every post is a kind 1301 note.
 * Static check — the services import React Native and can't run under tsx.
 * Run: npx tsx scripts/verify/verify-no-supabase-submission.ts
 */
import { readFileSync } from 'fs';
import { FEATURES } from '../../src/config/features';

const checks: Array<[string, string, string]> = [
  ['src/services/backend/SupabaseCompetitionService.ts', 'if (!FEATURES.supabaseSubmission) {', 'submitWorkoutSimple choke point'],
  ['src/services/nostr/workoutPublishingService.ts', '} else if (!FEATURES.supabaseSubmission) {', 'finish-run publish path skips Supabase branch'],
  ['src/services/fitness/LocalWorkoutStorageService.ts', 'if (!FEATURES.supabaseSubmission) {\n      return;', 'autoSubmitToSupabase returns early'],
  ['src/components/profile/tabs/UnifiedWorkoutsTab.tsx', 'FEATURES.supabaseSubmission && localWorkout?.supabaseSubmitted === false', 'Compete/retry button hidden'],
  ['src/App.tsx', 'FEATURES.supabaseSubmission\n            ? await PendingSubmissionService.retryAll()', 'foreground retry queue skipped'],
];

let failed = 0;
const flagOff = FEATURES.supabaseSubmission === false;
console.log(`${flagOff ? 'PASS' : 'FAIL'}  FEATURES.supabaseSubmission is false`);
if (!flagOff) failed++;

for (const [file, needle, label] of checks) {
  const ok = readFileSync(file, 'utf8').includes(needle);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label} (${file})`);
  if (!ok) failed++;
}

const tabCount = readFileSync('src/components/profile/tabs/UnifiedWorkoutsTab.tsx', 'utf8')
  .split('localWorkout?.supabaseSubmitted === false').length - 1;
const gatedCount = readFileSync('src/components/profile/tabs/UnifiedWorkoutsTab.tsx', 'utf8')
  .split('FEATURES.supabaseSubmission && localWorkout?.supabaseSubmitted === false').length - 1;
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

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
