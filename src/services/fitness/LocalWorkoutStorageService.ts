/**
 * LocalWorkoutStorageService - Persistent storage for Activity Tracker workouts
 * Stores GPS-tracked and manually-entered workouts until synced to Nostr
 * Source of truth for the history the app displays
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WorkoutType } from '../../types/workout';
import type { Split } from '../activity/SplitTrackingService';
import type { VerificationReceipt } from '../../types/verification';
import { isDuplicateWorkout, type DedupCandidate } from '../../utils/workoutDedup';

/**
 * Result returned from saveGPSWorkout
 */
export interface SaveGPSWorkoutResult {
  workoutId: string;
}

/**
 * Param shape shared by both the manual (one-at-a-time) and bulk Nostr
 * import paths — the workout data as read off a 1301 event.
 */
export interface ImportedNostrWorkout {
  id: string; // Nostr event ID
  type: WorkoutType;
  startTime: string;
  endTime: string;
  duration: number; // seconds
  distance?: number; // meters
  calories?: number;
  reps?: number;
  sets?: number;
  notes?: string;
  elevation?: number; // meters (elevation gain)
  pace?: number; // seconds per km
  splits?: Split[];
}

export interface LocalWorkout {
  id: string; // Unique identifier for deduplication
  type: WorkoutType;
  startTime: string; // ISO timestamp
  endTime: string; // ISO timestamp
  duration: number; // seconds
  distance?: number; // meters
  calories?: number; // NEW: Estimated or actual calorie burn/intake
  steps?: number; // Step count (for daily steps workouts)
  source: 'gps_tracker' | 'manual_entry' | 'daily_steps' | 'imported_nostr' | 'health_connect' | 'healthkit';

  // GPS-specific fields
  elevation?: number; // meters
  pace?: number; // minutes per km
  speed?: number; // km/h
  splits?: Split[];
  raceDistance?: string; // Race preset (e.g., '5k', '10k', 'half', 'marathon')

  // Manual entry fields
  reps?: number;
  sets?: number;
  notes?: string;

  // Meditation-specific fields
  meditationType?:
    | 'guided'
    | 'unguided'
    | 'breathwork'
    | 'body_scan'
    | 'gratitude';
  mindfulnessRating?: number; // 1-5

  // Diet/Fasting-specific fields
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  mealTime?: string; // ISO timestamp
  mealSize?: 'small' | 'medium' | 'large' | 'xl'; // NEW: Meal portion size
  fastingDuration?: number; // seconds

  // Strength training-specific fields
  exerciseType?:
    | 'pushups'
    | 'pullups'
    | 'situps'
    | 'squats'
    | 'curls'
    | 'bench'
    | string;
  repsBreakdown?: number[]; // Array of reps per set (e.g., [20, 18, 15])
  weightsPerSet?: number[]; // Array of weights per set (e.g., [135, 145, 155])
  restTime?: number; // Rest between sets in seconds
  weight?: number; // Average weight used in pounds or kilograms
  // Verification (camera-verified workouts)
  verificationReceipt?: VerificationReceipt;

  // Fitness test-specific fields
  fitnessTestScore?: number; // Composite score 0-300
  fitnessTestMaxScore?: number; // Always 300
  fitnessTestGrade?: string; // Elite/Advanced/Intermediate/Beginner/Baseline
  fitnessTestComponents?: {
    pushups: { reps: number; score: number };
    situps: { reps: number; score: number };
    run5k: { timeSeconds: number; score: number };
  };

  // Weather context fields
  weather?: {
    temp: number; // Temperature in Celsius
    feelsLike: number; // Feels like temperature
    description: string; // e.g., "Clear sky"
    icon: string; // Weather icon code
    humidity?: number; // Humidity percentage
    windSpeed?: number; // Wind speed in m/s
  };

  // Route labeling (simple name-based grouping)
  routeId?: string; // Reference to RouteLabel.id if this workout is tagged with a route
  routeLabel?: string; // Route name for display convenience

  // Card/template storage for sharing
  savedCard?: {
    templateId: 'achievement' | 'progress' | 'minimal' | 'stats' | 'elegant' | 'custom_photo' | 'vertical';
    customPhotoUri?: string; // Local file path if user took photo
    generatedAt: string; // ISO timestamp
  };

  // Metadata
  createdAt: string; // ISO timestamp
  syncedToNostr: boolean;
  nostrEventId?: string; // Set when synced
  syncedAt?: string; // ISO timestamp when synced

  // Manual entry flag for competition filtering
  isManualEntry?: boolean; // True for custom/manual workouts (excluded from competitions)

}

const STORAGE_KEYS = {
  LOCAL_WORKOUTS: 'local_workouts',
  WORKOUT_ID_COUNTER: 'local_workout_id_counter',
};

export class LocalWorkoutStorageService {
  private static instance: LocalWorkoutStorageService;
  private workoutCache: LocalWorkout[] | null = null;
  private cacheValid = false;
  /**
   * Set when getAllWorkouts() fails to parse stored data. While true we refuse
   * to overwrite local_workouts so a transient read/corruption error can't wipe
   * the user's history (the corrupt blob is backed up for recovery).
   */
  private dataCorrupted = false;

  private constructor() {}

  /**
   * Invalidate the in-memory cache — forces next getAllWorkouts() to read from AsyncStorage
   */
  private invalidateCache(): void {
    this.workoutCache = null;
    this.cacheValid = false;
  }

  /**
   * Single guarded write path for the workout list. Refuses to persist when a
   * prior read detected corruption — overwriting then would destroy history
   * that we've already backed up. All callers must write through this.
   */
  private async persistWorkouts(workouts: LocalWorkout[]): Promise<void> {
    if (this.dataCorrupted) {
      throw new Error(
        'LocalWorkoutStorage: refusing to write — stored workouts are corrupted ' +
          '(backed up). Aborting to avoid overwriting recoverable history.'
      );
    }
    await AsyncStorage.setItem(
      STORAGE_KEYS.LOCAL_WORKOUTS,
      JSON.stringify(workouts)
    );
  }

  static getInstance(): LocalWorkoutStorageService {
    if (!LocalWorkoutStorageService.instance) {
      LocalWorkoutStorageService.instance = new LocalWorkoutStorageService();
    }
    return LocalWorkoutStorageService.instance;
  }

  /**
   * Generate unique workout ID for local storage
   */
  private async generateWorkoutId(): Promise<string> {
    try {
      const counterStr = await AsyncStorage.getItem(
        STORAGE_KEYS.WORKOUT_ID_COUNTER
      );
      const counter = counterStr ? parseInt(counterStr, 10) : 0;
      const newCounter = counter + 1;
      await AsyncStorage.setItem(
        STORAGE_KEYS.WORKOUT_ID_COUNTER,
        newCounter.toString()
      );

      // Format: local_[timestamp]_[counter]_[random]
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 9);
      return `local_${timestamp}_${newCounter}_${random}`;
    } catch (error) {
      console.error('❌ Failed to generate workout ID:', error);
      // Fallback to simple timestamp-based ID
      return `local_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;
    }
  }

  /**
   * Reserve a contiguous block of `count` workout ids in a SINGLE counter
   * read+write, instead of calling generateWorkoutId() once per id (which
   * would each do its own getItem+setItem). Used by the bulk Nostr import so
   * the gap between reading the existing snapshot and writing it back stays
   * O(1) regardless of batch size — a concurrent write (e.g. a foreground
   * steps submission) landing in a wide, per-item id-generation loop would
   * otherwise risk being silently dropped by the eventual persist.
   * Same id format and same-error fallback as generateWorkoutId().
   */
  private async reserveWorkoutIdBlock(count: number): Promise<string[]> {
    if (count <= 0) return [];
    try {
      const counterStr = await AsyncStorage.getItem(
        STORAGE_KEYS.WORKOUT_ID_COUNTER
      );
      const counter = counterStr ? parseInt(counterStr, 10) : 0;
      const newCounter = counter + count;
      await AsyncStorage.setItem(
        STORAGE_KEYS.WORKOUT_ID_COUNTER,
        newCounter.toString()
      );

      const timestamp = Date.now();
      const ids: string[] = [];
      for (let i = 0; i < count; i++) {
        const random = Math.random().toString(36).substring(2, 9);
        ids.push(`local_${timestamp}_${counter + i + 1}_${random}`);
      }
      return ids;
    } catch (error) {
      console.error('❌ Failed to reserve workout ID block:', error);
      // Fallback: synthesize ids without touching the counter (mirrors
      // generateWorkoutId()'s own catch-path fallback).
      return Array.from(
        { length: count },
        () => `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      );
    }
  }

  /**
   * Save GPS-tracked workout to local storage
   * Returns the workout ID
   */
  async saveGPSWorkout(workout: {
    type: WorkoutType;
    distance: number; // meters
    duration: number; // seconds
    calories: number;
    elevation?: number; // meters
    pace?: number; // minutes per km
    speed?: number; // km/h
    splits?: Split[];
    raceDistance?: string; // Race preset (e.g., '5k', '10k', 'half', 'marathon')
    // Optional: GPS coordinates for weather lookup
    startLatitude?: number;
    startLongitude?: number;
    // Optional: Route tagging
    routeId?: string;
    routeLabel?: string;
  }): Promise<SaveGPSWorkoutResult> {
    try {
      const workoutId = await this.generateWorkoutId();
      const now = new Date().toISOString();
      const startTime = new Date(
        Date.now() - workout.duration * 1000
      ).toISOString();

      // Weather conditions placeholder (WeatherService removed)
      const weather = undefined;

      const localWorkout: LocalWorkout = {
        id: workoutId,
        type: workout.type,
        startTime,
        endTime: now,
        duration: workout.duration,
        distance: workout.distance,
        calories: workout.calories,
        elevation: workout.elevation,
        pace: workout.pace,
        speed: workout.speed,
        splits: workout.splits,
        raceDistance: workout.raceDistance,
        weather, // Add weather data
        routeId: workout.routeId,
        routeLabel: workout.routeLabel,
        source: 'gps_tracker',
        createdAt: now,
        syncedToNostr: false,
      };

      await this.saveWorkout(localWorkout);
      console.log(
        `✅ Saved GPS workout locally: ${workoutId} (${workout.type}, ${(
          workout.distance / 1000
        ).toFixed(2)}km)`
      );

      return { workoutId };
    } catch (error) {
      console.error('❌ Failed to save GPS workout:', error);
      throw error;
    }
  }

  /**
   * Internal method to save workout to AsyncStorage
   * This is the central point for ALL local workout saves - GPS, manual, etc.
   */
  private async saveWorkout(workout: LocalWorkout): Promise<void> {
    try {
      // Use the checked read, not getAllWorkouts(): a transient/corrupted read
      // must never be treated as "no history" here — that would persist a
      // single-workout array over the user's real history (the same defect
      // fixed in saveImportedNostrWorkoutsBulk). Abort the save instead; a
      // failed save the user (or the background caller) can retry is
      // strictly better than a silently destroyed history.
      const { workouts, ok } = await this.readAllWorkoutsChecked();
      if (!ok) {
        throw new Error(
          'LocalWorkoutStorage: refusing to save — could not confirm the existing ' +
            'workout snapshot (storage read failed or is corrupted). Aborting rather ' +
            'than risk overwriting history.'
        );
      }
      workouts.push(workout);
      await this.persistWorkouts(workouts);
      this.invalidateCache();

      // AUTO-BACKUP: Schedule backup to Nostr (3-min debounce collapses rapid saves)
      // Lazy import to avoid circular dependency
      const { AutoBackupService } = await import('../backup/AutoBackupService');
      AutoBackupService.getInstance().scheduleBackup();
    } catch (error) {
      console.error('❌ Failed to save workout to storage:', error);
      throw error;
    }
  }

  /**
   * Read the full workout list, additionally reporting whether the read
   * itself succeeded. `getAllWorkouts()` collapses this to a plain array
   * (unchanged for its many existing callers, all of which already treat
   * "[]" as "nothing to do"); callers that must NOT confuse "storage was
   * unreadable" with "storage is genuinely empty" — notably the bulk Nostr
   * import, where that confusion would make every incoming workout look new
   * and overwrite the user's whole history with just the incoming batch —
   * use this directly and check `ok`.
   */
  private async readAllWorkoutsChecked(): Promise<{
    workouts: LocalWorkout[];
    ok: boolean;
  }> {
    try {
      // Return a COPY of the cache — the same reference is handed to React
      // state, and callers push/mutate the result before persisting.
      if (this.cacheValid && this.workoutCache) {
        return { workouts: [...this.workoutCache], ok: true };
      }

      const data = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_WORKOUTS);
      if (!data) {
        this.workoutCache = [];
        this.cacheValid = true;
        return { workouts: [], ok: true };
      }

      let workouts: LocalWorkout[];
      try {
        workouts = JSON.parse(data);
      } catch (parseError) {
        // Corruption: returning [] here would let the next save overwrite the
        // whole history with a near-empty array. Back the raw blob up and latch
        // dataCorrupted so persistWorkouts() refuses to write until resolved.
        this.dataCorrupted = true;
        const backupKey = `local_workouts_corrupt_${Date.now()}`;
        try {
          await AsyncStorage.setItem(backupKey, data);
        } catch {}
        console.error(
          `❌ local_workouts is corrupted; backed up to ${backupKey}. ` +
            'Writes are now blocked to prevent data loss.',
          parseError
        );
        return { workouts: [], ok: false };
      }

      // Sort by start time (newest first)
      workouts.sort(
        (a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );

      this.workoutCache = workouts;
      this.cacheValid = true;
      return { workouts: [...workouts], ok: true };
    } catch (error) {
      // The read itself failed (e.g. a transient AsyncStorage error) — this
      // is NOT the same as "no workouts" and must not be reported as such
      // to callers that make write decisions based on an empty snapshot.
      console.error('❌ Failed to retrieve local workouts:', error);
      return { workouts: [], ok: false };
    }
  }

  /**
   * Get all local workouts (both synced and unsynced)
   */
  async getAllWorkouts(): Promise<LocalWorkout[]> {
    const { workouts } = await this.readAllWorkoutsChecked();
    return workouts;
  }

  /**
   * Mark workout as synced to Nostr
   */
  async markAsSynced(workoutId: string, nostrEventId: string): Promise<void> {
    try {
      const workouts = await this.getAllWorkouts();
      const workout = workouts.find((w) => w.id === workoutId);

      if (!workout) {
        console.warn(`⚠️ Workout ${workoutId} not found in local storage`);
        return;
      }

      workout.syncedToNostr = true;
      workout.nostrEventId = nostrEventId;
      workout.syncedAt = new Date().toISOString();

      await this.persistWorkouts(workouts);
      this.invalidateCache();
      console.log(
        `✅ Marked workout ${workoutId} as synced (Nostr event: ${nostrEventId})`
      );
    } catch (error) {
      console.error('❌ Failed to mark workout as synced:', error);
      throw error;
    }
  }

  /**
   * Get workout by ID
   */
  async getWorkoutById(workoutId: string): Promise<LocalWorkout | null> {
    const workouts = await this.getAllWorkouts();
    return workouts.find((w) => w.id === workoutId) || null;
  }

  /**
   * Delete a specific workout by ID
   */
  async deleteWorkout(workoutId: string): Promise<void> {
    try {
      // A failed read returns [] — persisting the filter of that would wipe
      // the whole history, so bail instead.
      const { workouts, ok } = await this.readAllWorkoutsChecked();
      if (!ok) throw new Error('Could not read history; nothing was deleted');
      const filteredWorkouts = workouts.filter((w) => w.id !== workoutId);

      await this.persistWorkouts(filteredWorkouts);
      this.invalidateCache();
      console.log(`✅ Deleted workout ${workoutId} from local storage`);
    } catch (error) {
      console.error('❌ Failed to delete workout:', error);
      throw error;
    }
  }

  /**
   * Drop the in-memory copy after local_workouts was replaced underneath us
   * (sign-out stash / sign-in claim in accountRunStash.ts).
   */
  resetCache(): void {
    this.invalidateCache();
  }

  // ========================================================================
  // NOSTR 1301 IMPORT METHODS
  // ========================================================================

  /**
   * Build the LocalWorkout record for an imported Nostr workout, given an
   * already-generated local id. Pure/synchronous — id generation is the
   * caller's responsibility (a single generateWorkoutId() call for the
   * per-item path, a single reserveWorkoutIdBlock() call for the bulk path)
   * so this can be reused without adding a storage round-trip per workout.
   * Shared by the per-item and bulk import paths so the field mapping lives
   * in exactly one place.
   */
  private buildImportedLocalWorkout(
    workout: ImportedNostrWorkout,
    id: string
  ): LocalWorkout {
    return {
      id,
      type: workout.type,
      startTime: workout.startTime,
      endTime: workout.endTime,
      duration: workout.duration,
      distance: workout.distance,
      calories: workout.calories,
      reps: workout.reps,
      sets: workout.sets,
      notes: workout.notes,
      // NEW: Include enhanced fields from Nostr
      elevation: workout.elevation,
      pace: workout.pace,
      splits: workout.splits,
      source: 'imported_nostr',
      createdAt: new Date().toISOString(),
      syncedToNostr: true, // Already exists on Nostr
      nostrEventId: workout.id, // Store original Nostr event ID
    };
  }

  /**
   * Save imported Nostr workout to local storage
   * Used during one-time import of user's Nostr workout history
   */
  async saveImportedNostrWorkout(workout: ImportedNostrWorkout): Promise<string> {
    try {
      // Check if this Nostr event ID already exists to prevent duplicates
      const existingWorkouts = await this.getAllWorkouts();
      const isDuplicate = existingWorkouts.some(
        (w) => w.nostrEventId === workout.id
      );

      if (isDuplicate) {
        console.log(
          `⚠️ Skipping duplicate Nostr workout: ${workout.id.slice(0, 8)}...`
        );
        return workout.id;
      }

      const workoutId = await this.generateWorkoutId();
      const localWorkout = this.buildImportedLocalWorkout(workout, workoutId);

      await this.saveWorkout(localWorkout);
      console.log(
        `✅ Imported Nostr workout: ${localWorkout.id} (${workout.type}, ${new Date(
          workout.startTime
        ).toLocaleDateString()})${workout.splits ? ` [${workout.splits.length} splits]` : ''}`
      );
      return localWorkout.id;
    } catch (error) {
      console.error('❌ Failed to save imported Nostr workout:', error);
      throw error;
    }
  }

  /**
   * Save a run from the encrypted backup exactly as it was recorded — same
   * id, source, and publish state — so a run that was never published does
   * not come back marked "On Nostr". The caller dedups.
   */
  async saveRestoredWorkout(workout: LocalWorkout): Promise<void> {
    await this.saveWorkout({ ...workout, syncedToNostr: !!workout.syncedToNostr });
  }

  /**
   * Bulk-import Nostr workouts. Loads the existing set ONCE, dedups in memory
   * against both stored workouts and earlier members of this batch, and
   * persists the merged list back in a SINGLE write — not once per accepted
   * workout. Unlike saveImportedNostrWorkout (still O(n²), acceptable behind
   * a one-time progress bar), this path runs unattended at every login and
   * must not pay a full array read+stringify+write per workout, nor hold a
   * stale snapshot across N per-item storage round-trips (a concurrent write
   * — e.g. StepCompetitionService's foreground steps submission — landing in
   * that window would otherwise be silently dropped by the eventual persist).
   *
   * Refuses to write when a snapshot could not be confirmed (a transient or
   * corrupted read reporting "no workouts" must never be treated as "the
   * user genuinely has no local history" — that would make every relay
   * workout look new and overwrite real history with just this batch). An
   * abandoned backfill is harmless; a destroyed history is not.
   *
   * Only ever adds — never deletes or overwrites a local workout.
   */
  async saveImportedNostrWorkoutsBulk(
    workouts: ImportedNostrWorkout[]
  ): Promise<number> {
    if (workouts.length === 0) return 0;

    const { workouts: existing, ok } = await this.readAllWorkoutsChecked();
    if (!ok) {
      console.warn(
        '[LocalWorkoutStorage] Bulk import aborted: could not confirm the existing ' +
          'workout snapshot (storage read failed or is corrupted). Refusing to write ' +
          'so an unreadable history is never mistaken for an empty one.'
      );
      return 0;
    }

    // Phase 1: decide what's new — pure in-memory dedup, no I/O, no ids yet.
    const seen: DedupCandidate[] = existing.map((w) => ({
      nostrEventId: w.nostrEventId,
      type: w.type,
      startTime: w.startTime,
      duration: w.duration,
    }));

    const toAccept: ImportedNostrWorkout[] = [];
    for (const workout of workouts) {
      const candidate: DedupCandidate = {
        nostrEventId: workout.id,
        type: workout.type,
        startTime: workout.startTime,
        duration: workout.duration,
      };
      if (isDuplicateWorkout(seen, candidate)) continue;
      toAccept.push(workout);
      seen.push(candidate);
    }

    if (toAccept.length === 0) return 0;

    // Phase 2: reserve every id needed in ONE counter read+write (not one
    // pair per workout), then build all LocalWorkout records synchronously —
    // no awaits between reserving ids and persisting below, so the window in
    // which a concurrent write could be missed stays O(1), not O(N).
    const ids = await this.reserveWorkoutIdBlock(toAccept.length);
    const accepted: LocalWorkout[] = toAccept.map((workout, i) =>
      this.buildImportedLocalWorkout(workout, ids[i])
    );

    // Phase 3: re-read immediately before writing and merge onto that FRESH
    // snapshot — not `existing` captured at the top of this method — so a
    // concurrent write that landed during id reservation is not clobbered.
    // Deliberately NOT re-running dedup against the fresh read: `accepted`
    // was already validated against `existing` and must not be dropped
    // because of an unrelated concurrent write; this is a merge, not a
    // re-decision. If the fresh read itself can't be confirmed, abort
    // rather than fall back to the now-stale initial snapshot.
    const freshRead = await this.readAllWorkoutsChecked();
    if (!freshRead.ok) {
      console.warn(
        '[LocalWorkoutStorage] Bulk import aborted: could not confirm the workout ' +
          'snapshot immediately before writing (storage read failed). Refusing to ' +
          'write rather than risk dropping a concurrent write.'
      );
      return 0;
    }

    await this.persistWorkouts([...freshRead.workouts, ...accepted]);
    this.invalidateCache();

    // Mirror saveWorkout()'s backup side effect, scheduled ONCE for the whole
    // batch (the underlying debounce would collapse N per-item calls to this
    // anyway).
    try {
      const { AutoBackupService } = await import('../backup/AutoBackupService');
      AutoBackupService.getInstance().scheduleBackup();
    } catch (error) {
      console.warn(
        '[LocalWorkoutStorage] Failed to schedule backup after bulk import (non-critical):',
        error
      );
    }

    return accepted.length;
  }
}

export default LocalWorkoutStorageService.getInstance();
