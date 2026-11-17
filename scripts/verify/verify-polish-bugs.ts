/**
 * Verifies the 2026-11-17 bug pass (static checks):
 * 1. Sign-out keeps runs, keyed by pubkey; sign-in claims them back
 * 2. Restore keeps each run's own publish state
 * 3. deleteWorkout refuses to write after a failed read
 * 4. Post-run publish uses the saved run's start time
 * 5. Profile edit signs with any signer (Amber too) via NDK
 * 6. Delete Account handles errors and keeps other accounts' runs
 *
 * Run: npx tsx scripts/verify/verify-polish-bugs.ts
 */
import { readFileSync } from 'fs';

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failures++;
};
const read = (p: string) => readFileSync(p, 'utf8');

const auth = read('src/services/auth/authService.ts');
const stash = read('src/services/fitness/accountRunStash.ts');
check(auth.indexOf('stashRunsForSignOut') < auth.indexOf('await clearNostrStorage()') &&
  auth.includes('await stashRunsForSignOut('), '1. sign-out stashes runs before the pubkey is cleared');
check((auth.match(/await claimRunsForSignedInUser\(\)/g) || []).length === 2, '1. nsec and Amber sign-in claim stashed runs');
check(['@runstr:auto_restore_done', '@runstr:last_1301_backfill'].every((k) => stash.includes(k)),
  '1. restore flag and backfill throttle reset on sign-out');
check(stash.includes('local_workouts:${hexPubkey}') || stash.includes('`${WORKOUTS_KEY}:${hexPubkey}`'), '1. stash is keyed by pubkey');

const restore = read('src/services/backup/RestoreService.ts');
const storage = read('src/services/fitness/LocalWorkoutStorageService.ts');
check(restore.includes('saveRestoredWorkout(workout)') && !restore.includes('saveImportedNostrWorkout('),
  '2. restore no longer routes backups through the 1301 import path');
check(/saveRestoredWorkout[\s\S]{0,200}syncedToNostr: !!workout\.syncedToNostr/.test(storage), '2. restored run keeps its publish state');

const del = storage.slice(storage.indexOf('async deleteWorkout'), storage.indexOf('resetCache()'));
check(del.includes('readAllWorkoutsChecked') && del.includes('if (!ok)'), '3. deleteWorkout checks the read before writing');

const summary = read('src/components/activity/WorkoutSummaryModal.tsx');
check(/stored\?\.startTime \?\?/.test(summary), '4. publish uses the stored run start time');

const pub = read('src/services/nostr/NostrProfilePublisher.ts');
check(!pub.includes('getNsec') && !pub.includes('nostrRelayManager') && !pub.includes('nostr-tools'),
  '5. profile publisher needs no nsec, no NostrRelayManager, no nostr-tools');
check(pub.includes('GlobalNDKService.getInstance()') && pub.includes('event.sign(signer)'), '5. profile publishes through NDK');

const settings = read('src/screens/useSettingsState.ts');
const delAcct = settings.slice(settings.indexOf('handleDeleteAccount'), settings.indexOf('handleRefresh'));
check(delAcct.includes('try {') && delAcct.includes('catch (error)'), '6. Delete Account catches errors');
check(!delAcct.includes('AsyncStorage.clear()') && delAcct.includes("!k.startsWith('local_workouts:')"),
  "6. Delete Account keeps other accounts' stashed runs");

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
