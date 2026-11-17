/**
 * Keeps each account's runs on the phone across sign-out.
 *
 * Sign-out moves `local_workouts` to `local_workouts:<hex pubkey>` so the
 * next person to sign in starts with an empty history; signing back in with
 * the same key brings the runs back. The once-per-install restore flag and
 * the 1301 backfill throttle are per-account state too, so they are reset on
 * sign-out — both jobs are additive and dedup, so re-running them is safe.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LocalWorkoutStorageService,
  type LocalWorkout,
} from './LocalWorkoutStorageService';

const WORKOUTS_KEY = 'local_workouts';
const stashKey = (hexPubkey: string) => `${WORKOUTS_KEY}:${hexPubkey}`;

export const PER_ACCOUNT_FLAGS = [
  '@runstr:auto_restore_done',
  '@runstr:last_1301_backfill',
  'nostr_workout_import_completed',
  'nostr_workout_import_stats',
];

const parse = (raw: string | null): LocalWorkout[] | null => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/** Call before the keys are cleared. Never throws. */
export async function stashRunsForSignOut(hexPubkey: string | null): Promise<void> {
  try {
    const current = await AsyncStorage.getItem(WORKOUTS_KEY);
    if (hexPubkey && current) {
      // Merge into an existing stash in case a claim never ran
      const stashed = parse(await AsyncStorage.getItem(stashKey(hexPubkey))) ?? [];
      const runs = parse(current);
      if (runs === null) return; // unreadable: leave it in place, don't lose it
      const ids = new Set(runs.map((w) => w.id));
      const merged = [...runs, ...stashed.filter((w) => !ids.has(w.id))];
      await AsyncStorage.setItem(stashKey(hexPubkey), JSON.stringify(merged));
    }
    if (hexPubkey || !current) {
      await AsyncStorage.multiRemove([WORKOUTS_KEY, ...PER_ACCOUNT_FLAGS]);
    }
  } catch (error) {
    console.warn('[accountRunStash] stash failed:', error);
  } finally {
    LocalWorkoutStorageService.getInstance().resetCache();
  }
}

/** Call right after sign-in stores the hex pubkey. Never throws. */
export async function claimStashedRuns(hexPubkey: string | null): Promise<void> {
  if (!hexPubkey) return;
  try {
    const stashed = parse(await AsyncStorage.getItem(stashKey(hexPubkey)));
    if (!stashed || stashed.length === 0) return;
    const current = parse(await AsyncStorage.getItem(WORKOUTS_KEY));
    if (current === null) return; // don't overwrite unreadable history
    const ids = new Set(current.map((w) => w.id));
    const merged = [...current, ...stashed.filter((w) => !ids.has(w.id))];
    await AsyncStorage.setItem(WORKOUTS_KEY, JSON.stringify(merged));
    await AsyncStorage.removeItem(stashKey(hexPubkey));
    LocalWorkoutStorageService.getInstance().resetCache();
  } catch (error) {
    console.warn('[accountRunStash] claim failed:', error);
  }
}
