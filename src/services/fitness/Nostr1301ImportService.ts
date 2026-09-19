/**
 * Nostr1301ImportService - One-time import of user's Nostr workout history
 * Downloads ALL kind 1301 events and saves them to LocalStorage
 * This enables 100% offline analytics without real-time Nostr fetching
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Nuclear1301Service } from './Nuclear1301Service';
import { GlobalNDKService } from '../nostr/GlobalNDKService';
import LocalWorkoutStorageService from './LocalWorkoutStorageService';
import { PendingSubmissionService, type PendingSubmission } from '../competition/PendingSubmissionService';
import type { NostrWorkout } from '../../types/nostrWorkout';
import type { WorkoutType } from '../../types/workout';

export interface ImportProgress {
  total: number;
  imported: number;
  current: string; // Current workout being processed
  percentage: number;
}

export interface ImportResult {
  success: boolean;
  totalImported: number;
  oldestDate: string;
  newestDate: string;
  activityTypes: string[];
  error?: string;
}

export class Nostr1301ImportService {
  private static instance: Nostr1301ImportService;

  // Throttle for the automatic background backfill (Step 5) — the widened
  // dedup makes a full fetch on every launch *correct*, but it is still
  // wasteful without relay-level `since` filtering, so gate at the call
  // site instead.
  private static readonly BACKFILL_TS_KEY = '@runstr:last_1301_backfill';
  private static readonly BACKFILL_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

  private constructor() {}

  static getInstance(): Nostr1301ImportService {
    if (!Nostr1301ImportService.instance) {
      Nostr1301ImportService.instance = new Nostr1301ImportService();
    }
    return Nostr1301ImportService.instance;
  }

  /**
   * Import ALL Nostr workout history for a user
   * One-time operation that saves workouts to LocalStorage
   * @param pubkey User's public key (npub or hex)
   * @param onProgress Optional callback to track import progress
   */
  async importUserHistory(
    pubkey: string,
    onProgress?: (progress: ImportProgress) => void
  ): Promise<ImportResult> {
    try {
      console.log('🚀 Starting Nostr workout history import...');

      // Fetch ALL 1301 events from Nostr
      console.log('📡 Fetching all kind 1301 events from Nostr...');
      const nuclear1301Service = Nuclear1301Service.getInstance();
      const nostrWorkouts = await nuclear1301Service.getUserWorkouts(pubkey);

      if (nostrWorkouts.length === 0) {
        console.log('ℹ️ No Nostr workouts found to import');
        return {
          success: true,
          totalImported: 0,
          oldestDate: '',
          newestDate: '',
          activityTypes: [],
        };
      }

      console.log(`📥 Found ${nostrWorkouts.length} Nostr workouts to import`);

      // Import each workout to LocalStorage
      let importedCount = 0;
      const activityTypesSet = new Set<string>();
      const dates: number[] = [];

      for (let i = 0; i < nostrWorkouts.length; i++) {
        const nostrWorkout = nostrWorkouts[i];

        // Report progress
        if (onProgress) {
          onProgress({
            total: nostrWorkouts.length,
            imported: i,
            current: `${nostrWorkout.type} - ${new Date(
              nostrWorkout.startTime
            ).toLocaleDateString()}`,
            percentage: Math.round((i / nostrWorkouts.length) * 100),
          });
        }

        try {
          // Convert NostrWorkout to LocalWorkout format
          await LocalWorkoutStorageService.saveImportedNostrWorkout({
            id: nostrWorkout.nostrEventId || nostrWorkout.id,
            type: this.normalizeWorkoutType(nostrWorkout.type),
            startTime: nostrWorkout.startTime,
            endTime: nostrWorkout.endTime,
            duration: nostrWorkout.duration,
            distance: nostrWorkout.distance,
            calories: nostrWorkout.calories,
            reps: nostrWorkout.reps,
            sets: nostrWorkout.sets,
            // NEW: Enhanced fields from Nostr kind 1301
            elevation: nostrWorkout.elevationGain,
            pace: nostrWorkout.pace,
            splits: nostrWorkout.splits,
          });

          importedCount++;
          activityTypesSet.add(nostrWorkout.type);
          dates.push(new Date(nostrWorkout.startTime).getTime());
        } catch (error) {
          console.warn(
            `⚠️ Failed to import workout ${nostrWorkout.id}:`,
            error
          );
          // Continue with next workout
        }
      }

      // Final progress update
      if (onProgress) {
        onProgress({
          total: nostrWorkouts.length,
          imported: importedCount,
          current: 'Complete',
          percentage: 100,
        });
      }

      // Calculate statistics
      const sortedDates = dates.sort((a, b) => a - b);
      const oldestDate = new Date(sortedDates[0]).toISOString();
      const newestDate = new Date(
        sortedDates[sortedDates.length - 1]
      ).toISOString();
      const activityTypes = Array.from(activityTypesSet);

      // Mark import as completed
      await LocalWorkoutStorageService.markNostrImportCompleted({
        totalImported: importedCount,
        oldestDate,
        newestDate,
        activityTypes,
      });

      // Historical imports are saved to local storage only — NOT submitted to
      // Supabase competitions.  Queuing old workouts would pollute the daily
      // leaderboard because workout_submissions.created_at defaults to NOW().

      console.log(
        `✅ Import complete: ${importedCount} workouts imported (${
          oldestDate.split('T')[0]
        } → ${newestDate.split('T')[0]})`
      );

      return {
        success: true,
        totalImported: importedCount,
        oldestDate,
        newestDate,
        activityTypes,
      };
    } catch (error) {
      console.error('❌ Nostr workout import failed:', error);
      return {
        success: false,
        totalImported: 0,
        oldestDate: '',
        newestDate: '',
        activityTypes: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Whether enough time has passed since the last automatic backfill to run
   * another one. Fails open: a backfill we did not strictly need is
   * harmless, a backfill we skipped forever is missing history.
   */
  private async shouldBackfill(): Promise<boolean> {
    try {
      const raw = await AsyncStorage.getItem(Nostr1301ImportService.BACKFILL_TS_KEY);
      if (!raw) return true;
      const last = Number(raw);
      if (!Number.isFinite(last)) return true;
      // A future-dated timestamp (clock skew, timezone change, DST) would
      // otherwise make `Date.now() - last` negative — always < the interval
      // — and silently disable backfill until wall-clock time catches up.
      // Treat it as "no record" rather than failing closed.
      if (last > Date.now()) return true;
      return Date.now() - last > Nostr1301ImportService.BACKFILL_INTERVAL_MS;
    } catch {
      return true;
    }
  }

  /**
   * Background backfill. Fetches the user's 1301 history and merges anything
   * missing into local storage. Local is the source of truth — this only adds.
   *
   * Never throws: history must render from local storage whether or not relays
   * answer. Failures are logged and swallowed.
   */
  async backfillInBackground(pubkey: string): Promise<void> {
    try {
      if (!(await this.shouldBackfill())) return;

      // Nuclear1301Service.getUserWorkouts() swallows every internal error
      // (relay connection failures included) and always resolves — even to
      // [] — rather than throwing, so its return value alone cannot tell
      // "the user genuinely has zero 1301 history" apart from "we're
      // offline / relays are unreachable right now". Check connectivity
      // first, without touching that method's signature or behavior, so an
      // offline login isn't stamped as a completed check for the next 6h.
      // Ensure the shared NDK instance exists before waiting on it — if
      // nothing else has touched it yet, waitForMinimumConnection would
      // otherwise see no instance and report "unreachable" immediately.
      await GlobalNDKService.getInstance();
      const relaysReachable = await GlobalNDKService.waitForMinimumConnection(1, 5000);

      const nostrWorkouts = await Nuclear1301Service.getInstance().getUserWorkouts(pubkey);

      if (relaysReachable) {
        // A genuine attempt reached at least one relay — stamp the full
        // throttle regardless of how many workouts came back (0 is a real,
        // common answer for a brand-new account, not a failure).
        await AsyncStorage.setItem(
          Nostr1301ImportService.BACKFILL_TS_KEY,
          String(Date.now())
        ).catch(() => {});
      } else {
        // Offline / relay outage — this was not a real attempt. Leave the
        // throttle untouched so the very next launch retries, matching the
        // pre-throttle behavior for exactly this case.
        console.log(
          '[1301Backfill] no relays reachable — skipping throttle stamp, will retry next launch'
        );
      }

      if (!nostrWorkouts.length) return;

      // Amendment 2: always dedup on the normalized NostrWorkout.type, never
      // a raw exercise/activity tag value — otherwise a POWR note tagged
      // 'run' would not match a local 'running' workout.
      const written = await LocalWorkoutStorageService.saveImportedNostrWorkoutsBulk(
        nostrWorkouts.map((w) => ({
          id: w.nostrEventId || w.id,
          type: this.normalizeWorkoutType(w.type),
          startTime: w.startTime,
          endTime: w.endTime,
          duration: w.duration,
          distance: w.distance,
          calories: w.calories,
          reps: w.reps,
          sets: w.sets,
          elevation: w.elevationGain,
          pace: w.pace,
          splits: w.splits,
        }))
      );

      console.log(`[1301Backfill] merged ${written} new workout(s) from relays`);
    } catch (error) {
      console.warn('[1301Backfill] failed (local history is unaffected):', error);
    }
  }

  /**
   * Queue imported Nostr workouts for Supabase submission (fire-and-forget)
   */
  private async queueImportedForSupabase(nostrWorkouts: NostrWorkout[]): Promise<void> {
    try {
      const userNpub = await AsyncStorage.getItem('@runstr:npub');
      if (!userNpub) {
        console.warn('[Nostr1301Import] No npub found, skipping Supabase queue');
        return;
      }

      let queued = 0;
      for (const workout of nostrWorkouts) {
        try {
          const submission: PendingSubmission = {
            id: workout.id,
            submissionData: {
              eventId: workout.nostrEventId || workout.id,
              npub: userNpub,
              type: workout.type,
              distance: workout.distance || 0,
              duration: workout.duration || 0,
              calories: workout.calories,
              startTime: workout.startTime,
              tags: [],
            },
            createdAt: Date.now(),
            retryCount: 0,
            lastError: '',
            nextRetryTime: Date.now(),
          };
          await PendingSubmissionService.addPending(submission);
          queued++;
        } catch (err) {
          console.warn('[Nostr1301Import] Failed to queue workout for Supabase:', err);
        }
      }

      console.log(`[Nostr1301Import] Queued ${queued}/${nostrWorkouts.length} workouts for Supabase submission`);
    } catch (error) {
      console.warn('[Nostr1301Import] Failed to queue workouts for Supabase:', error);
    }
  }

  /**
   * Normalize workout type to match LocalWorkout's WorkoutType
   * Handles various formats from different Nostr apps
   */
  private normalizeWorkoutType(type: string): WorkoutType {
    const normalized = type.toLowerCase().trim();

    // Map common variations
    const typeMap: Record<string, WorkoutType> = {
      run: 'running',
      running: 'running',
      jog: 'running',
      jogging: 'running',

      walk: 'walking',
      walking: 'walking',
      hike: 'hiking',
      hiking: 'hiking',

      cycle: 'cycling',
      cycling: 'cycling',
      bike: 'cycling',
      biking: 'cycling',

      swim: 'other', // Not supported - mapped to other
      swimming: 'other', // Not supported - mapped to other

      row: 'other', // Not supported - mapped to other
      rowing: 'other', // Not supported - mapped to other

      strength: 'strength',
      'strength training': 'strength',
      weights: 'strength',
      lifting: 'strength',

      yoga: 'other', // Not supported - mapped to other
      meditation: 'meditation',
      meditate: 'meditation',

      fasting: 'fasting',
      fast: 'fasting',

      diet: 'diet',
      meal: 'diet',
      food: 'diet',
    };

    return typeMap[normalized] || 'other';
  }

  /**
   * Check if import has been completed
   */
  async hasImported(): Promise<boolean> {
    return LocalWorkoutStorageService.hasImportedNostrWorkouts();
  }

  /**
   * Get import statistics
   */
  async getImportStats() {
    return LocalWorkoutStorageService.getNostrImportStats();
  }

  /**
   * Reset import (allows re-import)
   * Note: Does not delete imported workouts, only resets the flag
   */
  async resetImport(): Promise<void> {
    await LocalWorkoutStorageService.resetNostrImport();
  }
}

export default Nostr1301ImportService.getInstance();
