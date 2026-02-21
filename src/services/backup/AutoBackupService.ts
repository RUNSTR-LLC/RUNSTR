/**
 * AutoBackupService - Automatic backup orchestration
 *
 * Triggers BackupService.exportToNostr() automatically after workout saves.
 * Uses a 3-minute debounce to collapse rapid saves into one backup.
 *
 * Auth compatibility:
 * - nsec users: backup runs silently in foreground and background
 * - Amber users: backup deferred to foreground (Amber Intent requires UI)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackupService, DEFAULT_BACKUP_RELAYS } from './BackupService';
import { UnifiedSigningService } from '../auth/UnifiedSigningService';

const DEBOUNCE_MS = 3 * 60 * 1000; // 3 minutes
const PREF_KEY = '@runstr:auto_backup_enabled';
const ERROR_KEY = '@runstr:last_backup_error';

export class AutoBackupService {
  private static instance: AutoBackupService;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isRunning = false;
  private pendingBackup = false;

  private constructor() {}

  static getInstance(): AutoBackupService {
    if (!AutoBackupService.instance) {
      AutoBackupService.instance = new AutoBackupService();
    }
    return AutoBackupService.instance;
  }

  /**
   * Schedule a backup after 3-minute debounce.
   * Safe to call many times -- resets the timer each time.
   */
  scheduleBackup(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.runBackupIfEnabled().catch((err) => {
        console.warn('[AutoBackup] Scheduled backup failed (silent):', err);
      });
    }, DEBOUNCE_MS);
  }

  /**
   * Run backup immediately (flush), skipping debounce.
   */
  async runBackupNow(): Promise<void> {
    this.cancel();
    await this.runBackupIfEnabled();
  }

  /**
   * Called when app transitions to background.
   * nsec users: flush immediately. Amber users: set pendingBackup flag.
   */
  async onAppBackground(): Promise<void> {
    if (!this.debounceTimer && !this.pendingBackup) return; // nothing pending
    this.cancel();

    const authMethod = await this.getAuthMethod();
    if (authMethod === 'amber') {
      this.pendingBackup = true;
      console.log('[AutoBackup] Amber user -- deferring backup to next foreground');
    } else if (authMethod === 'nostr') {
      await this.runBackupIfEnabled();
    }
  }

  /**
   * Called when app returns to foreground.
   * Clears pendingBackup and fires backup (Amber dialog appears while user is in-app).
   */
  async onAppForeground(): Promise<void> {
    if (!this.pendingBackup) return;
    this.pendingBackup = false;
    console.log('[AutoBackup] Foreground -- flushing pending backup');
    await this.runBackupIfEnabled();
  }

  /**
   * Called from HealthKit/WorkManager background handlers.
   * nsec: runs immediately. Amber: sets pendingBackup for next foreground.
   */
  async runBackupInBackground(): Promise<void> {
    const authMethod = await this.getAuthMethod();
    if (authMethod === 'amber') {
      this.pendingBackup = true;
      return;
    }
    await this.runBackupIfEnabled();
  }

  /**
   * Cancel any pending debounce timer.
   */
  cancel(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  // ----- Preference helpers -----

  async isAutoBackupEnabled(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(PREF_KEY);
      return val !== 'false'; // default true
    } catch {
      return true;
    }
  }

  async setAutoBackupEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(PREF_KEY, String(enabled));
    if (enabled) {
      // Trigger a backup soon after re-enabling
      this.scheduleBackup();
    } else {
      this.cancel();
    }
  }

  // ----- Internal -----

  private async runBackupIfEnabled(): Promise<void> {
    if (this.isRunning) return; // concurrency guard

    try {
      const enabled = await this.isAutoBackupEnabled();
      if (!enabled) return;

      // Check signer availability -- skip silently if not logged in
      const signer = await UnifiedSigningService.getInstance().getSigner();
      if (!signer) return;

      this.isRunning = true;
      console.log('[AutoBackup] Starting auto-backup...');

      const result = await BackupService.getInstance().exportToNostr(DEFAULT_BACKUP_RELAYS);

      if (result.success) {
        console.log(`[AutoBackup] Backup complete -- ${result.relaysPublished.length} relays`);
        await AsyncStorage.removeItem(ERROR_KEY);
      } else {
        console.warn('[AutoBackup] Backup failed:', result.error);
        await AsyncStorage.setItem(ERROR_KEY, result.error || 'Unknown error');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.warn('[AutoBackup] Backup error (silent):', msg);
      try { await AsyncStorage.setItem(ERROR_KEY, msg); } catch { /* ignore */ }
    } finally {
      this.isRunning = false;
    }
  }

  private async getAuthMethod(): Promise<'nostr' | 'amber' | null> {
    try {
      return await UnifiedSigningService.getInstance().getAuthMethod();
    } catch {
      return null;
    }
  }
}
