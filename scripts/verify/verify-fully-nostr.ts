/**
 * Verify Phase 2 end state: the app has no Supabase, rewards, or kind 1
 * workout posts, and keeps the Nostr-only pieces that replaced them.
 * Static check — the services import React Native and can't run under tsx.
 * Run: npx tsx scripts/verify/verify-fully-nostr.ts
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

let failed = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failed++;
};

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === '__tests__' ? [] : walk(p);
    return /\.(ts|tsx|js)$/.test(name) ? [p] : [];
  });

const files = [...walk('src'), 'index.js'];
const read = (p: string) => readFileSync(p, 'utf8');
const offenders = (re: RegExp) => files.filter((f) => re.test(read(f)));

// Nothing in the app talks to Supabase or the reward pipeline
const supabase = offenders(/@supabase\/supabase-js|utils\/supabase['"]|utils\/edgeFunctions['"]|\.supabase\.co/);
check(supabase.length === 0, `no Supabase client or edge-function imports (${supabase.join(', ') || 'none'})`);
const rewards = offenders(/services\/rewards\/|SupabaseCompetitionService|PendingSubmissionService|RewardPollingService/);
check(rewards.length === 0, `no reward/submission services (${rewards.join(', ') || 'none'})`);

// Workout posts are 1301 only
const publishing = read('src/services/nostr/workoutPublishingService.ts');
check(!publishing.includes('postWorkoutToSocial') && publishing.includes('publishWorkout1301('), 'workouts publish as kind 1301 only');
check(!/['"]lightning['"]|reward_destination|wot_score/.test(publishing), 'no reward/routing tags built for 1301s');

// Nostr-only replacements are in place
const app = read('src/App.tsx');
check(/restoreInBackground\(\)\s*\.then\(\(\) => Nostr1301ImportService/.test(app), 'login restores 30078 backup, then backfills 1301s');
check(read('src/components/profile/StatsCard.tsx').includes('localWorkoutStorage.getAllWorkouts()'), 'personal records computed from local workouts');
check(read('src/services/backup/BackupService.ts').includes('chunkWorkouts('), 'encrypted backup is chunked');

// Background sync (Supabase-only) is gone; stale Android task gets unregistered
check(!read('index.js').includes('BackgroundSyncTask'), 'no background sync task registered at startup');
check(read('src/contexts/AuthContext.tsx').includes("unregisterTaskAsync('runstr-background-sync')"), 'stale Android background task is unregistered');

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
