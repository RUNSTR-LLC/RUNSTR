/**
 * BackupService - Export encrypted workout data to Nostr relays
 *
 * Uses NIP-44 self-encryption (user encrypts to themselves) for privacy.
 * Publishes kind 30078 replaceable events with "runstr-workout-backup" identifier.
 *
 * Data backed up:
 * - Local workouts (GPS-tracked, manual, imported)
 * - Step history
 * - Habits (with streaks)
 * - Journal entries
 * - User preferences
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import pako from 'pako';
import { GlobalNDKService } from '../nostr/GlobalNDKService';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import type { NDKSigner } from '@nostr-dev-kit/ndk';
import { LocalWorkoutStorageService } from '../fitness/LocalWorkoutStorageService';
import { getAllHabits } from '../habits/HabitTrackerService';
import { JournalService } from '../journal/JournalService';
import { UnifiedSigningService } from '../auth/UnifiedSigningService';
import type { LocalWorkout } from '../fitness/LocalWorkoutStorageService';
import type { Habit } from '../habits/HabitTrackerService';
import type { JournalEntry } from '../../types/journal';

// Backup event kind (replaceable parameterized)
const BACKUP_EVENT_KIND = 30078;
const BACKUP_D_TAG = 'runstr-workout-backup';
const BACKUP_VERSION = 1;

// Default relays for backup (reliable, high-availability)
export const DEFAULT_BACKUP_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
];

/**
 * Daily step summary for backup
 */
export interface DailyStepSummary {
  date: string; // YYYY-MM-DD
  steps: number;
  source: 'healthkit' | 'health_connect' | 'native';
}

/**
 * User preferences to backup
 */
export interface BackupPreferences {
  unitSystem: 'metric' | 'imperial';
  selectedCharity?: string;
  ppqApiKey?: string;
  ppqCreditId?: string;
}

/**
 * Encrypted payload structure (version 1)
 */
export interface WorkoutBackupPayload {
  version: number;
  exportedAt: string; // ISO timestamp
  appVersion: string;
  workouts: LocalWorkout[];
  stepHistory?: DailyStepSummary[];
  habits?: Habit[];
  journal?: JournalEntry[];
  preferences?: BackupPreferences;
}

/**
 * Backup statistics for UI display
 */
export interface BackupStats {
  workoutCount: number;
  habitCount: number;
  journalCount: number;
  stepDaysCount: number;
  dateRange: {
    oldest: string | null;
    newest: string | null;
  };
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean;
  eventId?: string;
  relaysPublished: string[];
  error?: string;
}

/**
 * BackupService - Handles encrypted data export to Nostr
 */
export class BackupService {
  private static instance: BackupService;

  private constructor() {}

  static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  /**
   * Get statistics about data available for backup
   */
  async getBackupStats(): Promise<BackupStats> {
    try {
      const workoutService = LocalWorkoutStorageService.getInstance();

      const [workouts, habits, journalEntries] = await Promise.all([
        workoutService.getAllWorkouts(),
        getAllHabits(),
        JournalService.getAllEntries(),
      ]);

      // Calculate date range from workouts
      let oldest: string | null = null;
      let newest: string | null = null;

      if (workouts.length > 0) {
        const sortedByDate = [...workouts].sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        oldest = sortedByDate[0].startTime.split('T')[0];
        newest = sortedByDate[sortedByDate.length - 1].startTime.split('T')[0];
      }

      return {
        workoutCount: workouts.length,
        habitCount: habits.length,
        journalCount: journalEntries.length,
        stepDaysCount: 0, // TODO: Implement step history tracking
        dateRange: { oldest, newest },
      };
    } catch (error) {
      console.error('[BackupService] Error getting backup stats:', error);
      return {
        workoutCount: 0,
        habitCount: 0,
        journalCount: 0,
        stepDaysCount: 0,
        dateRange: { oldest: null, newest: null },
      };
    }
  }

  /**
   * Get last backup timestamp from AsyncStorage
   */
  async getLastBackupTime(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('@runstr:last_backup_time');
    } catch {
      return null;
    }
  }

  /**
   * Export all user data to Nostr relays
   *
   * @param selectedRelays - Relays to publish to
   * @returns Export result with success status and published relays
   */
  async exportToNostr(selectedRelays: string[]): Promise<ExportResult> {
    console.log('[BackupService] Starting export...');

    // Step 1: Get signer via UnifiedSigningService (works for both nsec and Amber)
    let signer: NDKSigner;
    let pubkey: string;
    try {
      const signingService = UnifiedSigningService.getInstance();
      const maybeSigner = await signingService.getSigner();
      if (!maybeSigner) {
        console.error('[BackupService] No signer available');
        return { success: false, relaysPublished: [], error: 'Not logged in - please sign in first' };
      }
      signer = maybeSigner;
      const user = await signer.user();
      pubkey = user.pubkey;
      console.log('[BackupService] Signer ready, pubkey:', pubkey.slice(0, 16) + '...');
    } catch (credError) {
      console.error('[BackupService] Failed to get signer:', credError);
      return {
        success: false,
        relaysPublished: [],
        error: 'Failed to initialize signing: ' + (credError instanceof Error ? credError.message : 'Unknown error'),
      };
    }

    // Step 2: Collect backup data
    let payload: WorkoutBackupPayload;
    try {
      payload = await this.collectBackupData();
      console.log(`[BackupService] Collected ${payload.workouts.length} workouts, ${payload.habits?.length || 0} habits, ${payload.journal?.length || 0} journal entries`);
    } catch (collectError) {
      console.error('[BackupService] Failed to collect backup data:', collectError);
      return {
        success: false,
        relaysPublished: [],
        error: 'Failed to collect backup data: ' + (collectError instanceof Error ? collectError.message : 'Unknown error'),
      };
    }

    // Step 3: Encrypt payload with NIP-44 via signer (routes through Amber for Amber users)
    let encryptedContent: string;
    try {
      encryptedContent = await this.encryptPayload(payload, signer);
      console.log('[BackupService] Payload encrypted successfully, length:', encryptedContent.length);
    } catch (encryptError) {
      console.error('[BackupService] NIP-44 encryption failed:', encryptError);
      return {
        success: false,
        relaysPublished: [],
        error: 'Encryption failed: ' + (encryptError instanceof Error ? encryptError.message : 'Unknown error'),
      };
    }

    // Step 4: Create and sign the kind 30078 event
    let event: NDKEvent;
    try {
      event = await this.createBackupEvent(encryptedContent, pubkey, payload, signer);
      console.log('[BackupService] Backup event created, id:', event.id?.slice(0, 8));
    } catch (eventError) {
      console.error('[BackupService] Failed to create event:', eventError);
      return {
        success: false,
        relaysPublished: [],
        error: 'Failed to create event: ' + (eventError instanceof Error ? eventError.message : 'Unknown error'),
      };
    }

    // Step 5: Publish to relays
    let relaysPublished: string[];
    try {
      relaysPublished = await this.publishToRelays(event, selectedRelays);
      console.log(`[BackupService] Published to ${relaysPublished.length} relays:`, relaysPublished);
    } catch (publishError) {
      console.error('[BackupService] Failed to publish event:', publishError);
      return {
        success: false,
        relaysPublished: [],
        error: 'Failed to publish: ' + (publishError instanceof Error ? publishError.message : 'Unknown error'),
      };
    }

    // Step 6: Save last backup timestamp
    try {
      await AsyncStorage.setItem('@runstr:last_backup_time', new Date().toISOString());
    } catch (saveError) {
      // Non-fatal error - don't fail the export
      console.warn('[BackupService] Failed to save backup timestamp:', saveError);
    }

    return {
      success: relaysPublished.length > 0,
      eventId: event.id,
      relaysPublished,
      error: relaysPublished.length === 0 ? 'Failed to publish to any relay' : undefined,
    };
  }

  /**
   * Collect all data for backup
   */
  private async collectBackupData(): Promise<WorkoutBackupPayload> {
    const workoutService = LocalWorkoutStorageService.getInstance();

    const [workouts, habits, journalEntries, unitSystem, selectedCharity, ppqApiKey, ppqCreditId] = await Promise.all([
      workoutService.getAllWorkouts(),
      getAllHabits(),
      JournalService.getAllEntries(),
      AsyncStorage.getItem('@runstr:unit_system'),
      AsyncStorage.getItem('@runstr:selected_charity'),
      AsyncStorage.getItem('@runstr:ppq_api_key'),
      AsyncStorage.getItem('@runstr:ppq_credit_id'),
    ]);

    return {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      appVersion: '1.6.5', // TODO: Get from app config
      workouts,
      habits: habits.length > 0 ? habits : undefined,
      journal: journalEntries.length > 0 ? journalEntries : undefined,
      preferences: {
        unitSystem: (unitSystem as 'metric' | 'imperial') || 'metric',
        selectedCharity: selectedCharity || undefined,
        ppqApiKey: ppqApiKey || undefined,
        ppqCreditId: ppqCreditId || undefined,
      },
    };
  }

  /**
   * Convert Uint8Array to base64 string (React Native compatible)
   */
  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Encrypt payload using NIP-44 self-encryption via signer
   * Routes through Amber for Amber users, uses NDK crypto for nsec users
   *
   * Uses gzip compression to handle payloads exceeding NIP-44's 64KB limit
   */
  private async encryptPayload(
    payload: WorkoutBackupPayload,
    signer: NDKSigner
  ): Promise<string> {
    const plaintext = JSON.stringify(payload);

    // Compress with gzip to handle large payloads (NIP-44 has 64KB limit)
    const compressed = pako.gzip(plaintext);
    const compressedBase64 = this.uint8ArrayToBase64(compressed);

    // Log compression ratio for debugging
    console.log(
      `[BackupService] Compression: ${plaintext.length} → ${compressed.length} bytes ` +
        `(${Math.round((compressed.length / plaintext.length) * 100)}%)`
    );

    // Self-encryption via signer: encrypt to our own pubkey using NIP-44
    // For Amber users, this triggers an Amber intent for NIP-44 encryption
    // For nsec users, NDKPrivateKeySigner handles it internally
    const selfUser = await signer.user();
    const encrypted = await signer.encrypt(selfUser, compressedBase64, 'nip44');

    return encrypted;
  }

  /**
   * Create the kind 30078 backup event
   */
  private async createBackupEvent(
    encryptedContent: string,
    pubkey: string,
    payload: WorkoutBackupPayload,
    signer: NDKSigner
  ): Promise<NDKEvent> {
    const ndk = await GlobalNDKService.getInstance();

    const event = new NDKEvent(ndk);
    event.kind = BACKUP_EVENT_KIND;
    event.pubkey = pubkey;
    event.content = encryptedContent;
    event.created_at = Math.floor(Date.now() / 1000);

    // Tags (metadata visible to relays, content is encrypted)
    event.tags = [
      ['d', BACKUP_D_TAG], // Replaceable identifier
      ['client', 'RUNSTR', '1.6.5'],
      ['encrypted', 'nip44'],
      ['compression', 'gzip'], // Content is gzip compressed before encryption
      ['backup_version', String(BACKUP_VERSION)],
      ['workout_count', String(payload.workouts.length)],
    ];

    // Add optional metadata tags
    if (payload.habits && payload.habits.length > 0) {
      event.tags.push(['habit_count', String(payload.habits.length)]);
    }
    if (payload.journal && payload.journal.length > 0) {
      event.tags.push(['journal_count', String(payload.journal.length)]);
    }

    // Add date range
    if (payload.workouts.length > 0) {
      const sortedWorkouts = [...payload.workouts].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      const oldest = sortedWorkouts[0].startTime.split('T')[0];
      const newest = sortedWorkouts[sortedWorkouts.length - 1].startTime.split('T')[0];
      event.tags.push(['date_range', oldest, newest]);
    }

    // Sign the event via UnifiedSigningService signer
    // Routes through Amber for Amber users, NDK crypto for nsec users
    await event.sign(signer);

    return event;
  }

  /**
   * Publish event to relays via NDK
   */
  private async publishToRelays(event: NDKEvent, _selectedRelays?: string[]): Promise<string[]> {
    const publishedTo: string[] = [];

    try {
      // Publish through NDK's pool - it handles relay connections
      const published = await event.publish();
      if (published.size > 0) {
        // Use relay URLs from the published set
        published.forEach((relay) => {
          publishedTo.push(relay.url);
        });
      }
    } catch (error) {
      console.error('[BackupService] Publish failed:', error);
    }

    return publishedTo;
  }
}

export default BackupService.getInstance();
