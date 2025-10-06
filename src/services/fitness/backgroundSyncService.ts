/**
 * Background Sync Service
 * Orchestrates workout sync, notifications, and background processing
 * Handles invisible-first operation with push notifications as primary UI
 */

import { AppState, Platform } from 'react-native';
import healthKitService from './healthKitService';
import workoutDataProcessor from './workoutDataProcessor';
import teamLeaderboardService from './teamLeaderboardService';
import nostrWorkoutSyncService from './nostrWorkoutSyncService';
// import { supabase } from '../supabase';  // REMOVED: Project now uses pure Nostr
import { AuthService } from '../auth/authService';

export interface SyncResult {
  success: boolean;
  workoutsProcessed: number;
  totalScore: number;
  errors: string[];
  lastSyncAt: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  type: 'reward' | 'challenge' | 'leaderboard' | 'sync' | 'team';
  data?: Record<string, any>;
}

export interface SyncConfiguration {
  intervalMinutes: number;
  retryAttempts: number;
  enableNotifications: boolean;
  syncOnAppBackground: boolean;
  syncOnAppForeground: boolean;
  foregroundSyncThresholdMinutes: number; // How long to wait before syncing on foreground
  maxBackoffDelayMinutes: number; // Maximum delay for exponential backoff
}

const DEFAULT_SYNC_CONFIG: SyncConfiguration = {
  intervalMinutes: 30, // Sync every 30 minutes - good for battery life
  retryAttempts: 3,
  enableNotifications: true,
  syncOnAppBackground: true,
  syncOnAppForeground: true,
  foregroundSyncThresholdMinutes: 15, // Increased from 10min to reduce unnecessary syncs
  maxBackoffDelayMinutes: 120, // Maximum 2 hour delay for failed syncs
};

export class BackgroundSyncService {
  private static instance: BackgroundSyncService;
  private syncInterval: any = null;
  private isSyncing = false;
  private lastSyncTime = 0;
  private syncConfig = DEFAULT_SYNC_CONFIG;
  private appStateListener: any = null;
  private retryTimeouts = new Map<string, NodeJS.Timeout>();
  private failureCount = 0; // Track consecutive failures for backoff

  private constructor() {
    this.setupAppStateListener();
  }

  static getInstance(): BackgroundSyncService {
    if (!BackgroundSyncService.instance) {
      BackgroundSyncService.instance = new BackgroundSyncService();
    }
    return BackgroundSyncService.instance;
  }

  /**
   * Update sync configuration - allows users to customize sync behavior
   * Recommended settings:
   * - Low battery usage: intervalMinutes: 60, foregroundSyncThresholdMinutes: 30
   * - Balanced (default): intervalMinutes: 30, foregroundSyncThresholdMinutes: 15  
   * - Frequent sync: intervalMinutes: 15, foregroundSyncThresholdMinutes: 10
   */
  updateSyncConfiguration(config: Partial<SyncConfiguration>): void {
    this.syncConfig = { ...this.syncConfig, ...config };
    
    // Restart periodic sync if interval changed
    if (config.intervalMinutes && this.syncInterval) {
      this.startPeriodicSync();
    }
    
    console.log('BackgroundSync: Configuration updated', this.syncConfig);
  }

  /**
   * Get current sync configuration
   */
  getSyncConfiguration(): SyncConfiguration {
    return { ...this.syncConfig };
  }

  /**
   * Initialize background sync service
   */
  async initialize(
    config?: Partial<SyncConfiguration>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('BackgroundSync: Initializing service...');

      // Merge custom config
      if (config) {
        this.syncConfig = { ...DEFAULT_SYNC_CONFIG, ...config };
      }

      // Initialize HealthKit
      const healthKitResult = await healthKitService.initialize();
      if (!healthKitResult.success) {
        console.warn(
          'BackgroundSync: HealthKit initialization failed:',
          healthKitResult.error
        );
      }

      // Setup periodic sync
      this.startPeriodicSync();

      // Log HealthKit availability
      if (healthKitResult.success) {
        console.log('BackgroundSync: HealthKit ready for sync operations');
      } else {
        console.log(
          'BackgroundSync: HealthKit not available, continuing without it'
        );
      }

      // Request notification permissions
      if (this.syncConfig.enableNotifications) {
        await this.requestNotificationPermissions();
      }

      console.log('BackgroundSync: Service initialized successfully');
      return { success: true };
    } catch (error) {
      console.error('BackgroundSync: Initialization failed:', error);
      return {
        success: false,
        error: `Initialization failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /**
   * Start periodic background sync
   */
  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    const intervalMs = this.syncConfig.intervalMinutes * 60 * 1000;

    this.syncInterval = setInterval(() => {
      this.performBackgroundSync('periodic');
    }, intervalMs);

    console.log(
      `BackgroundSync: Periodic sync started (${this.syncConfig.intervalMinutes}min intervals)`
    );
  }

  /**
   * Setup app state listener for foreground/background sync
   */
  private setupAppStateListener(): void {
    this.appStateListener = AppState.addEventListener(
      'change',
      (nextAppState) => {
        console.log(`BackgroundSync: App state changed to ${nextAppState}`);

        if (nextAppState === 'active' && this.syncConfig.syncOnAppForeground) {
          // App came to foreground - sync if it's been a while
          const timeSinceLastSync = Date.now() - this.lastSyncTime;
          const thresholdMs = this.syncConfig.foregroundSyncThresholdMinutes * 60 * 1000;
          if (timeSinceLastSync > thresholdMs) {
            this.performBackgroundSync('foreground');
          }
        } else if (
          nextAppState === 'background' &&
          this.syncConfig.syncOnAppBackground
        ) {
          // App went to background - do quick sync
          this.performBackgroundSync('background');
        }
      }
    );
  }

  /**
   * Perform background workout sync
   */
  async performBackgroundSync(
    trigger: 'periodic' | 'foreground' | 'background' | 'manual'
  ): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('BackgroundSync: Sync already in progress, skipping');
      return {
        success: false,
        workoutsProcessed: 0,
        totalScore: 0,
        errors: ['Sync already in progress'],
        lastSyncAt: new Date().toISOString(),
      };
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      console.log(`BackgroundSync: Starting sync (trigger: ${trigger})`);

      // Get current user
      const user = await AuthService.getCurrentUserWithWallet();
      if (!user) {
        return {
          success: false,
          workoutsProcessed: 0,
          totalScore: 0,
          errors: ['User not authenticated'],
          lastSyncAt: new Date().toISOString(),
        };
      }

      const errors: string[] = [];
      let workoutsProcessed = 0;
      let totalScore = 0;

      // Sync workouts from HealthKit (iOS only)
      if (healthKitService.getStatus().available) {
        const healthKitResult = await healthKitService.syncWorkouts(
          user.id,
          user.teamId
        );
        if (healthKitResult.success) {
          const newHealthKitWorkouts = healthKitResult.newWorkouts || 0;
          workoutsProcessed += newHealthKitWorkouts;
          console.log(
            `BackgroundSync: HealthKit sync completed - ${newHealthKitWorkouts} new workouts`
          );
        } else {
          errors.push(`HealthKit sync failed: ${healthKitResult.error}`);
        }
      }

      // Sync workouts from Nostr (all platforms)
      try {
        // Get user's Nostr pubkey for sync
        const userNpub = user.npub;
        if (userNpub) {
          const nostrSyncResult =
            await nostrWorkoutSyncService.triggerManualSync(user.id, userNpub);
          if (nostrSyncResult.status === 'completed') {
            const newNostrWorkouts = nostrSyncResult.parsedWorkouts || 0;
            workoutsProcessed += newNostrWorkouts;
            console.log(
              `BackgroundSync: Nostr sync completed - ${newNostrWorkouts} workouts parsed`
            );
          } else {
            errors.push(
              `Nostr sync failed: ${nostrSyncResult.errors.join(', ')}`
            );
          }
        } else {
          console.log(
            'BackgroundSync: No Nostr pubkey found, skipping Nostr sync'
          );
        }
      } catch (nostrError) {
        const errorMessage =
          nostrError instanceof Error ? nostrError.message : 'Nostr sync error';
        errors.push(`Nostr sync failed: ${errorMessage}`);
        console.error('BackgroundSync: Nostr sync error:', nostrError);
      }

      // Process new workouts
      if (workoutsProcessed > 0) {
        const unprocessedWorkouts = await this.getUnprocessedWorkouts(user.id);

        for (const workout of unprocessedWorkouts) {
          const processResult = await workoutDataProcessor.processWorkout(
            workout
          );
          if (processResult.success) {
            totalScore += processResult.score || 0;
          } else {
            errors.push(`Workout processing failed: ${processResult.error}`);
          }
        }
      }

      // Update last sync time
      this.lastSyncTime = Date.now();

      // Send success notification if workouts were processed
      if (workoutsProcessed > 0 && this.syncConfig.enableNotifications) {
        await this.sendSyncNotification(workoutsProcessed, totalScore);
      }

      // Update team leaderboard if user is in a team
      if (user.teamId) {
        await teamLeaderboardService.getTeamLeaderboard(user.teamId);
      }

      const duration = Date.now() - startTime;
      console.log(
        `BackgroundSync: Sync completed in ${duration}ms - ${workoutsProcessed} workouts, ${totalScore} points`
      );

      return {
        success: true,
        workoutsProcessed,
        totalScore,
        errors,
        lastSyncAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('BackgroundSync: Sync failed:', error);
      return {
        success: false,
        workoutsProcessed: 0,
        totalScore: 0,
        errors: [error instanceof Error ? error.message : 'Unknown sync error'],
        lastSyncAt: new Date().toISOString(),
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Get unprocessed workouts from database
   */
  private async getUnprocessedWorkouts(userId: string): Promise<any[]> {
    // Pure Nostr app doesn't need database processing
    // Workouts are handled directly via kind 1301 events
    return [];
  }

  /**
   * Send push notification
   */
  async sendNotification(
    payload: NotificationPayload
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.syncConfig.enableNotifications) {
        return { success: false, error: 'Notifications disabled' };
      }

      console.log(`Sending notification: ${payload.title}`);

      // In production, this would use react-native-push-notification or similar:
      // const PushNotification = require('react-native-push-notification');
      // PushNotification.localNotification({
      //   title: payload.title,
      //   message: payload.body,
      //   data: payload.data,
      //   channelId: 'runstr-notifications',
      //   importance: 'high',
      //   priority: 'high',
      // });

      // For MVP, we'll just log it
      console.log('📱 NOTIFICATION:', payload.title, '-', payload.body);

      return { success: true };
    } catch (error) {
      console.error('Error sending notification:', error);
      return {
        success: false,
        error: `Notification failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /**
   * Send sync completion notification
   */
  private async sendSyncNotification(
    workoutCount: number,
    totalScore: number
  ): Promise<void> {
    const payload: NotificationPayload = {
      title: '⚡ Workouts Synced!',
      body: `${workoutCount} workouts synced, earned ${totalScore} points`,
      type: 'sync',
      data: {
        workoutCount,
        totalScore,
        timestamp: new Date().toISOString(),
      },
    };

    await this.sendNotification(payload);
  }

  /**
   * Request notification permissions
   */
  private async requestNotificationPermissions(): Promise<boolean> {
    try {
      console.log('BackgroundSync: Requesting notification permissions...');

      // In production, this would use proper notification library:
      // const { requestPermissions } = require('react-native-permissions');
      // const result = await requestPermissions(['NOTIFICATIONS']);
      // return result === 'granted';

      // For MVP, assume granted
      console.log(
        'BackgroundSync: Notification permissions granted (simulated)'
      );
      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Manual sync trigger
   */
  async syncNow(): Promise<SyncResult> {
    console.log('BackgroundSync: Manual sync requested');
    return this.performBackgroundSync('manual');
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    isSyncing: boolean;
    lastSyncTime: number;
    config: SyncConfiguration;
  } {
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      config: this.syncConfig,
    };
  }

  /**
   * Update sync configuration
   */
  updateConfig(config: Partial<SyncConfiguration>): void {
    this.syncConfig = { ...this.syncConfig, ...config };

    // Restart periodic sync with new interval
    if (config.intervalMinutes) {
      this.startPeriodicSync();
    }

    console.log('BackgroundSync: Configuration updated', this.syncConfig);
  }

  /**
   * Stop background sync
   */
  stop(): void {
    console.log('BackgroundSync: Stopping service...');

    // Clear sync interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Clear retry timeouts
    this.retryTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.retryTimeouts.clear();

    // Remove app state listener
    if (this.appStateListener) {
      this.appStateListener.remove();
      this.appStateListener = null;
    }

    console.log('BackgroundSync: Service stopped');
  }

  /**
   * Cleanup (call on app shutdown)
   */
  async cleanup(): Promise<void> {
    console.log('BackgroundSync: Cleaning up...');

    this.stop();
    await teamLeaderboardService.cleanup();

    console.log('BackgroundSync: Cleanup completed');
  }

  /**
   * Get performance metrics
   */
  getMetrics(): {
    totalSyncs: number;
    averageSyncDuration: number;
    lastSyncSuccess: boolean;
    totalWorkoutsProcessed: number;
  } {
    // In production, these would be tracked
    return {
      totalSyncs: 0,
      averageSyncDuration: 0,
      lastSyncSuccess: true,
      totalWorkoutsProcessed: 0,
    };
  }
}

export default BackgroundSyncService.getInstance();
