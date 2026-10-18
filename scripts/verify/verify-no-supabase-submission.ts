/**
 * Verify Phase 2 step 1: workouts are no longer sent to Supabase.
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

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
