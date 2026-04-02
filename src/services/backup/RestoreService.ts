/**
 * RestoreService - Import encrypted workout data from Nostr relays
 *
 * Searches for kind 30078 events with "runstr-workout-backup" identifier.
 * Decrypts using NIP-44 and merges into local storage with deduplication.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import pako from 'pako';
import { GlobalNDKService } from '../nostr/GlobalNDKService';
import type { NDKEvent, NDKFilter } from '@nostr-dev-kit/ndk';
import type { WorkoutBackupPayload } from './BackupService';
import { DEFAULT_BACKUP_RELAYS } from './BackupService';
import { LocalWorkoutStorageService } from '../fitness/LocalWorkoutStorageService';
import { getAllHabits, createHabit } from '../habits/HabitTrackerService';
import { JournalService } from '../journal/JournalService';
import { UnifiedSigningService } from '../auth/UnifiedSigningService';
import { PendingSubmissionService, type PendingSubmission } from '../competition/PendingSubmissionService';
import type { LocalWorkout } from '../fitness/LocalWorkoutStorageService';
import type { Habit } from '../habits/HabitTrackerService';
import type { JournalEntry } from '../../types/journal';

// Backup event kind
const BACKUP_EVENT_KIND = 30078;
const BACKUP_D_TAG = 'runstr-workout-backup';

/**
 * Backup metadata from event tags (before decryption)
 */
export interface BackupMetadata {
  eventId: string;
  pubkey: string;
  createdAt: Date;
  workoutCount: number;
  habitCount: number;
  journalCount: number;
  dateRange: { oldest: string | null; newest: string | null };
  backupVersion: number;
  relayUrl: string;
}

/**
 * Decrypted backup data
 */
export interface DecryptedBackup {
  metadata: BackupMetadata;
  payload: WorkoutBackupPayload;
}

/**
 * Import result statistics
 */
export interface ImportResult {
  success: boolean;
  error?: string;
  workoutsImported: number;
  workoutsSkipped: number;
  habitsImported: number;
  habitsSkipped: number;
  journalImported: number;
  journalSkipped: number;
}

/**
 * Search result from relay
 */
export interface BackupSearchResult {
  found: boolean;
  backup?: DecryptedBackup;
  error?: string;
}

/**
 * RestoreService - Handles encrypted data import from Nostr
 */
export class RestoreService {
  private static instance: RestoreService;

  private constructor() {}

  static getInstance(): RestoreService {
    if (!RestoreService.instance) {
      RestoreService.instance = new RestoreService();
    }
    return RestoreService.instance;
  }

  /**
   * Search for backup events on specified relays
   */
  async searchForBackup(_relayUrls: string[] = DEFAULT_BACKUP_RELAYS): Promise<BackupSearchResult> {
    try {
      const signingService = UnifiedSigningService.getInstance();
      const signer = await signingService.getSigner();
      if (!signer) {
        return { found: false, error: 'Please log in before importing data' };
      }
      const user = await signer.user();
      const pubkey = user.pubkey;

      console.log('[RestoreService] Searching for backup...');
      const ndk = await GlobalNDKService.getInstance();

      // Filter for user's backup events
      // Request more than 1 in case some relays return truncated/corrupted events
      const filter: NDKFilter = {
        kinds: [BACKUP_EVENT_KIND],
        authors: [pubkey],
        '#d': [BACKUP_D_TAG],
        limit: 5,
      };

      // Fetch from relays
      const events = await ndk.fetchEvents(filter);

      if (events.size === 0) {
        console.log('[RestoreService] No backup found');
        return { found: false };
      }

      // Sort by most recent first, then try each until one decrypts
      const eventsArray = Array.from(events).sort(
        (a, b) => (b.created_at || 0) - (a.created_at || 0)
      );

      // NIP-44 requires at least 132 characters of base64 payload
      const MIN_NIP44_LENGTH = 132;

      for (const event of eventsArray) {
        const contentLength = event.content?.length || 0;
        if (contentLength < MIN_NIP44_LENGTH) {
          console.warn(
            `[RestoreService] Skipping event ${event.id?.slice(0, 8)} — ` +
            `content too short for NIP-44 (${contentLength} chars, need ${MIN_NIP44_LENGTH}+)`
          );
          continue;
        }

        console.log('[RestoreService] Trying backup event:', event.id?.slice(0, 8));

        try {
          const decrypted = await this.decryptBackup(event);
          return { found: true, backup: decrypted };
        } catch (decryptError) {
          console.warn(
            `[RestoreService] Failed to decrypt event ${event.id?.slice(0, 8)}:`,
            decryptError instanceof Error ? decryptError.message : decryptError
          );
          // Try the next event
        }
      }

      // All events failed
      return {
        found: false,
        error: `Found ${eventsArray.length} backup event(s) but none could be decrypted. ` +
          'The backup data may be corrupted or created with a different key.',
      };
    } catch (error) {
      console.error('[RestoreService] Search failed:', error);
      return {
        found: false,
        error: error instanceof Error ? error.message : 'Search failed',
      };
    }
  }

  /**
   * Convert base64 string to Uint8Array (React Native compatible)
   */
  private base64ToUint8Array(base64: string): Uint8Array {
    // Strip whitespace/newlines that may be introduced during encrypt/decrypt
    let cleaned = base64.replace(/\s/g, '');
    // Ensure proper padding — some signers (e.g. Amber) strip trailing '='
    const remainder = cleaned.length % 4;
    if (remainder > 0) {
      cleaned += '='.repeat(4 - remainder);
    }
    const binaryString = atob(cleaned);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Decrypt a backup event
   */
  private async decryptBackup(event: NDKEvent): Promise<DecryptedBackup> {
    // Get signer via UnifiedSigningService (works for both nsec and Amber)
    const signingService = UnifiedSigningService.getInstance();
    const signer = await signingService.getSigner();

    if (!signer) {
      throw new Error('Not logged in');
    }

    // Parse metadata from tags
    const metadata = this.parseMetadata(event);

    // Decrypt content via signer (routes through Amber for Amber users)
    const selfUser = await signer.user();
    const decryptedContent = await signer.decrypt(selfUser, event.content, 'nip44');

    // Check if content is gzip compressed (indicated by tag)
    const isCompressed = event.tags.some(
      (t) => t[0] === 'compression' && t[1] === 'gzip'
    );

    let jsonString: string;
    if (isCompressed) {
      // Decode base64 and decompress
      const compressedBytes = this.base64ToUint8Array(decryptedContent);
      jsonString = pako.ungzip(compressedBytes, { to: 'string' });
      console.log(
        `[RestoreService] Decompressed: ${compressedBytes.length} → ${jsonString.length} bytes`
      );
    } else {
      // Legacy uncompressed backup (backwards compatibility)
      jsonString = decryptedContent;
    }

    const payload: WorkoutBackupPayload = JSON.parse(jsonString);

    return { metadata, payload };
  }

  /**
   * Parse metadata from event tags
   */
  private parseMetadata(event: NDKEvent): BackupMetadata {
    const tags = event.tags;

    // Helper to get tag value
    const getTagValue = (name: string): string | null => {
      const tag = tags.find((t) => t[0] === name);
      return tag ? tag[1] : null;
    };

    // Get date range
    const dateRangeTag = tags.find((t) => t[0] === 'date_range');
    const dateRange = dateRangeTag
      ? { oldest: dateRangeTag[1] || null, newest: dateRangeTag[2] || null }
      : { oldest: null, newest: null };

    return {
      eventId: event.id || '',
      pubkey: event.pubkey,
      createdAt: new Date((event.created_at || 0) * 1000),
      workoutCount: parseInt(getTagValue('workout_count') || '0', 10),
      habitCount: parseInt(getTagValue('habit_count') || '0', 10),
      journalCount: parseInt(getTagValue('journal_count') || '0', 10),
      dateRange,
      backupVersion: parseInt(getTagValue('backup_version') || '1', 10),
      relayUrl: 'multiple', // We don't track which relay specifically
    };
  }

  /**
   * Import backup data into local storage
   */
  async importBackup(backup: DecryptedBackup): Promise<ImportResult> {
    try {
      console.log('[RestoreService] Starting import...');

      const result: ImportResult = {
        success: true,
        workoutsImported: 0,
        workoutsSkipped: 0,
        habitsImported: 0,
        habitsSkipped: 0,
        journalImported: 0,
        journalSkipped: 0,
      };

      // Import workouts
      if (backup.payload.workouts.length > 0) {
        const workoutResult = await this.importWorkouts(backup.payload.workouts);
        result.workoutsImported = workoutResult.imported;
        result.workoutsSkipped = workoutResult.skipped;

        // Queue imported workouts for Supabase submission
        if (workoutResult.imported > 0) {
          await this.queueWorkoutsForSupabase(backup.payload.workouts);
        }
      }

      // Import habits
      if (backup.payload.habits && backup.payload.habits.length > 0) {
        const habitResult = await this.importHabits(backup.payload.habits);
        result.habitsImported = habitResult.imported;
        result.habitsSkipped = habitResult.skipped;
      }

      // Import journal entries
      if (backup.payload.journal && backup.payload.journal.length > 0) {
        const journalResult = await this.importJournal(backup.payload.journal);
        result.journalImported = journalResult.imported;
        result.journalSkipped = journalResult.skipped;
      }

      // Import preferences (optional, don't overwrite if user has set them)
      if (backup.payload.preferences) {
        await this.importPreferences(backup.payload.preferences);
      }

      console.log('[RestoreService] Import complete:', result);
      return result;
    } catch (error) {
      console.error('[RestoreService] Import failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Import failed',
        workoutsImported: 0,
        workoutsSkipped: 0,
        habitsImported: 0,
        habitsSkipped: 0,
        journalImported: 0,
        journalSkipped: 0,
      };
    }
  }

  /**
   * Import workouts with deduplication
   */
  private async importWorkouts(
    workouts: LocalWorkout[]
  ): Promise<{ imported: number; skipped: number }> {
    const workoutService = LocalWorkoutStorageService.getInstance();

    const existingWorkouts = await workoutService.getAllWorkouts();
    const existingIds = new Set(existingWorkouts.map((w) => w.id));
    const existingNostrIds = new Set(
      existingWorkouts.filter((w) => w.nostrEventId).map((w) => w.nostrEventId)
    );

    // Also create a fingerprint set for fallback matching
    const existingFingerprints = new Set(
      existingWorkouts.map((w) => this.getWorkoutFingerprint(w))
    );

    let imported = 0;
    let skipped = 0;

    for (const workout of workouts) {
      // Check for duplicates
      const isDuplicate =
        existingIds.has(workout.id) ||
        (workout.nostrEventId && existingNostrIds.has(workout.nostrEventId)) ||
        existingFingerprints.has(this.getWorkoutFingerprint(workout));

      if (isDuplicate) {
        skipped++;
        continue;
      }

      // Save the workout
      try {
        await workoutService.saveImportedNostrWorkout({
          id: workout.nostrEventId || workout.id,
          type: workout.type,
          startTime: workout.startTime,
          endTime: workout.endTime,
          duration: workout.duration,
          distance: workout.distance,
          calories: workout.calories,
          reps: workout.reps,
          sets: workout.sets,
          notes: workout.notes,
          elevation: workout.elevation,
          pace: workout.pace,
          splits: workout.splits,
        });
        imported++;
      } catch (error) {
        console.warn('[RestoreService] Failed to import workout:', error);
        skipped++;
      }
    }

    return { imported, skipped };
  }

  /**
   * Queue imported workouts for Supabase submission (fire-and-forget)
   */
  private async queueWorkoutsForSupabase(workouts: LocalWorkout[]): Promise<void> {
    try {
      const userNpub = await AsyncStorage.getItem('@runstr:npub');
      if (!userNpub) {
        console.warn('[RestoreService] No npub found, skipping Supabase queue');
        return;
      }

      let queued = 0;
      for (const workout of workouts) {
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
          console.warn('[RestoreService] Failed to queue workout for Supabase:', err);
        }
      }

      console.log(`[RestoreService] Queued ${queued}/${workouts.length} workouts for Supabase submission`);
    } catch (error) {
      console.warn('[RestoreService] Failed to queue workouts for Supabase:', error);
    }
  }

  /**
   * Create a fingerprint for workout matching (fallback deduplication)
   */
  private getWorkoutFingerprint(workout: LocalWorkout): string {
    // Match by start time + type + distance (within tolerance)
    const distanceKm = workout.distance ? Math.round(workout.distance / 100) : 0;
    return `${workout.startTime.slice(0, 16)}_${workout.type}_${distanceKm}`;
  }

  /**
   * Import habits with merge logic
   */
  private async importHabits(
    habits: Habit[]
  ): Promise<{ imported: number; skipped: number }> {
    const existingHabits = await getAllHabits();
    const existingNames = new Set(existingHabits.map((h) => h.name.toLowerCase()));

    let imported = 0;
    let skipped = 0;

    for (const habit of habits) {
      // Skip if habit with same name exists
      if (existingNames.has(habit.name.toLowerCase())) {
        skipped++;
        continue;
      }

      try {
        await createHabit(habit.name, habit.type, habit.icon, habit.color);
        imported++;
      } catch (error) {
        console.warn('[RestoreService] Failed to import habit:', error);
        skipped++;
      }
    }

    return { imported, skipped };
  }

  /**
   * Import journal entries with deduplication
   */
  private async importJournal(
    entries: JournalEntry[]
  ): Promise<{ imported: number; skipped: number }> {
    const existingEntries = await JournalService.getAllEntries();
    const existingDates = new Set(existingEntries.map((e) => e.date));

    let imported = 0;
    let skipped = 0;

    for (const entry of entries) {
      // Skip if entry for this date already exists
      if (existingDates.has(entry.date)) {
        skipped++;
        continue;
      }

      try {
        await JournalService.createEntry({
          content: entry.content,
          mood: entry.mood,
          energy: entry.energy,
          tags: entry.tags,
          date: entry.date,
        });
        imported++;
      } catch (error) {
        console.warn('[RestoreService] Failed to import journal entry:', error);
        skipped++;
      }
    }

    return { imported, skipped };
  }

  /**
   * Import preferences (only if not already set)
   */
  private async importPreferences(
    preferences: { unitSystem?: 'metric' | 'imperial'; selectedCharity?: string; ppqApiKey?: string; ppqCreditId?: string }
  ): Promise<void> {
    // Only import if user hasn't set their own preferences
    const [existingUnitSystem, existingCharity, existingPpqApiKey, existingPpqCreditId] = await Promise.all([
      AsyncStorage.getItem('@runstr:unit_system'),
      AsyncStorage.getItem('@runstr:selected_charity'),
      AsyncStorage.getItem('@runstr:ppq_api_key'),
      AsyncStorage.getItem('@runstr:ppq_credit_id'),
    ]);

    if (!existingUnitSystem && preferences.unitSystem) {
      await AsyncStorage.setItem('@runstr:unit_system', preferences.unitSystem);
    }

    if (!existingCharity && preferences.selectedCharity) {
      await AsyncStorage.setItem('@runstr:selected_charity', preferences.selectedCharity);
    }

    if (!existingPpqApiKey && preferences.ppqApiKey) {
      await AsyncStorage.setItem('@runstr:ppq_api_key', preferences.ppqApiKey);
    }

    if (!existingPpqCreditId && preferences.ppqCreditId) {
      await AsyncStorage.setItem('@runstr:ppq_credit_id', preferences.ppqCreditId);
    }
  }
}

export default RestoreService.getInstance();
