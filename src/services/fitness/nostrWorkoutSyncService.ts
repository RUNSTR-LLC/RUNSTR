/**
 * Nostr Workout Sync Service - Background Synchronization & Real-Time Updates
 * Orchestrates automatic workout syncing and handles real-time subscriptions
 * Integrates with NostrWorkoutService and existing background sync architecture
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NostrWorkoutService } from './nostrWorkoutService';
import nostrCompetitionBridge from '../integrations/nostrCompetitionBridge';
import type {
  NostrWorkoutSyncConfig,
  NostrWorkoutSyncResult,
  NostrWorkoutSubscription,
  NostrWorkoutCache,
  NostrSyncStatus,
  NostrWorkoutCompetition,
} from '../../types/nostrWorkout';

const STORAGE_KEYS = {
  SYNC_CONFIG: 'nostr_sync_config',
  CACHE: 'nostr_cache',
  SUBSCRIPTIONS: 'nostr_subscriptions',
};

const DEFAULT_CONFIG: NostrWorkoutSyncConfig = {
  relayUrls: [
    'wss://relay.damus.io',
    'wss://relay.primal.net',
    'wss://relay.nos.lol',
  ],
  maxRetries: 3,
  retryDelay: 5000,
  batchSize: 50,
  enableRealTimeSync: true,
  autoSyncInterval: 30, // minutes
  preserveRawEvents: false,
  validateHeartRate: true,
  duplicateDetection: true,
  enableCompetitionIntegration: true, // ✨ NEW
  competitionUpdateBatchSize: 10, // ✨ NEW
  competitionSyncDelay: 2000, // ✨ NEW
};

export class NostrWorkoutSyncService {
  private static instance: NostrWorkoutSyncService;
  private workoutService: NostrWorkoutService;
  private config: NostrWorkoutSyncConfig = DEFAULT_CONFIG;
  private syncStatus: NostrSyncStatus = 'idle';
  private activeSubscriptions = new Map<string, NostrWorkoutSubscription>();
  private syncInterval: any = null;
  private isInitialized = false;

  private constructor() {
    this.workoutService = NostrWorkoutService.getInstance();
  }

  static getInstance(): NostrWorkoutSyncService {
    if (!NostrWorkoutSyncService.instance) {
      NostrWorkoutSyncService.instance = new NostrWorkoutSyncService();
    }
    return NostrWorkoutSyncService.instance;
  }

  /**
   * Initialize the sync service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔄 Initializing NostrWorkoutSyncService...');

      await this.loadConfiguration();
      await this.loadActiveSubscriptions();

      this.isInitialized = true;
      console.log('✅ NostrWorkoutSyncService initialized');
    } catch (error) {
      console.error('❌ Failed to initialize NostrWorkoutSyncService:', error);
      throw error;
    }
  }

  /**
   * Start initial sync for a user
   */
  async startInitialSync(
    userId: string,
    pubkey: string,
    options?: {
      maxDays?: number;
      preserveRawEvents?: boolean;
    }
  ): Promise<NostrWorkoutSyncResult> {
    await this.initialize();

    console.log(`🚀 Starting initial Nostr workout sync for user: ${userId}`);
    this.syncStatus = 'syncing';

    try {
      const cache = await this.getUserCache(userId);

      // Determine sync start date
      const sinceDate = this.calculateSyncStartDate(cache, options?.maxDays);

      console.log(`📅 Syncing workouts since: ${sinceDate.toISOString()}`);

      // Fetch workouts from Nostr
      const result = await this.workoutService.fetchUserWorkouts(pubkey, {
        since: sinceDate,
        limit: this.config.batchSize,
        userId,
        preserveRawEvents:
          options?.preserveRawEvents || this.config.preserveRawEvents,
      });

      // Update cache
      await this.updateUserCache(userId, result, pubkey);

      this.syncStatus =
        result.status === 'completed' ? 'completed' : 'partial_error';

      console.log(
        `✅ Initial sync completed: ${result.parsedWorkouts} workouts imported`
      );

      // Process workouts for competitions if enabled
      if (
        this.config.enableCompetitionIntegration &&
        result.workouts &&
        result.workouts.length > 0
      ) {
        await this.processWorkoutsForCompetitions(
          userId,
          result.workouts,
          pubkey
        );
      }

      // Start real-time sync if enabled
      if (this.config.enableRealTimeSync) {
        await this.setupRealtimeSync(userId, pubkey);
      }

      return result;
    } catch (error) {
      console.error('❌ Initial sync failed:', error);
      this.syncStatus = 'error';
      throw error;
    }
  }

  /**
   * Setup real-time sync subscription
   */
  async setupRealtimeSync(userId: string, pubkey: string): Promise<void> {
    if (!this.config.enableRealTimeSync) {
      console.log('⏸️ Real-time sync disabled in config');
      return;
    }

    try {
      const subscriptionId = `workout_${userId}`;

      const subscription: NostrWorkoutSubscription = {
        id: subscriptionId,
        pubkey,
        relayUrls: this.config.relayUrls,
        isActive: true,
        createdAt: new Date().toISOString(),
        eventCount: 0,
      };

      this.activeSubscriptions.set(subscriptionId, subscription);

      // Mock WebSocket subscription setup - in production this would:
      // 1. Open WebSocket connections to relays
      // 2. Send subscription messages for kind 1301 events
      // 3. Handle incoming events in real-time
      console.log(`🔔 Real-time subscription active for user: ${userId}`);

      await this.saveActiveSubscriptions();
    } catch (error) {
      console.error('❌ Failed to setup real-time sync:', error);
    }
  }

  /**
   * Start automatic sync interval
   */
  startAutoSync(userId: string, pubkey: string): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    const intervalMs = this.config.autoSyncInterval * 60 * 1000;

    this.syncInterval = setInterval(async () => {
      try {
        console.log('⏰ Running automatic workout sync...');
        await this.runIncrementalSync(userId, pubkey);
      } catch (error) {
        console.error('❌ Auto sync failed:', error);
      }
    }, intervalMs);

    console.log(
      `⏰ Auto-sync started: every ${this.config.autoSyncInterval} minutes`
    );
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('⏹️ Auto-sync stopped');
    }
  }

  /**
   * Run incremental sync (fetch only new workouts)
   */
  async runIncrementalSync(
    userId: string,
    pubkey: string
  ): Promise<NostrWorkoutSyncResult> {
    const cache = await this.getUserCache(userId);

    // Only fetch workouts newer than last sync
    const sinceDate = cache.lastSyncAt
      ? new Date(cache.lastSyncAt)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days as fallback

    console.log(
      `🔄 Running incremental sync since: ${sinceDate.toISOString()}`
    );

    const result = await this.workoutService.fetchUserWorkouts(pubkey, {
      since: sinceDate,
      limit: 20, // Smaller limit for incremental syncs
      userId,
    });

    await this.updateUserCache(userId, result, pubkey);

    // Process new workouts for competitions if enabled
    if (
      this.config.enableCompetitionIntegration &&
      result.workouts &&
      result.workouts.length > 0
    ) {
      await this.processWorkoutsForCompetitions(
        userId,
        result.workouts,
        pubkey
      );
    }

    return result;
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): NostrSyncStatus {
    return this.syncStatus;
  }

  /**
   * Manual sync trigger
   */
  async triggerManualSync(
    userId: string,
    pubkey: string
  ): Promise<NostrWorkoutSyncResult> {
    console.log('👆 Manual sync triggered');
    this.syncStatus = 'syncing';

    try {
      const result = await this.runIncrementalSync(userId, pubkey);
      this.syncStatus =
        result.status === 'completed' ? 'completed' : 'partial_error';
      return result;
    } catch (error) {
      this.syncStatus = 'error';
      throw error;
    }
  }

  /**
   * Get user's workout cache information
   */
  async getUserCache(userId: string): Promise<NostrWorkoutCache> {
    try {
      const key = `${STORAGE_KEYS.CACHE}_${userId}`;
      const data = await AsyncStorage.getItem(key);

      if (data) {
        return JSON.parse(data);
      }

      // Return default cache
      return {
        userId,
        lastSyncAt: '',
        workoutCount: 0,
        oldestEvent: '',
        newestEvent: '',
        relayStatus: {},
        syncHistory: [],
      };
    } catch (error) {
      console.error('❌ Failed to get user cache:', error);
      throw error;
    }
  }

  /**
   * Update user cache after sync
   */
  private async updateUserCache(
    userId: string,
    syncResult: NostrWorkoutSyncResult,
    pubkey?: string
  ): Promise<void> {
    try {
      const cache = await this.getUserCache(userId);

      // Update relay status
      const relayStatus: Record<string, any> = {};
      for (const relay of syncResult.relayResults) {
        relayStatus[relay.relayUrl] = {
          lastConnected: syncResult.syncedAt,
          status: relay.status === 'success' ? 'connected' : 'error',
        };
      }

      // Get all stored workouts to update cache metadata
      const allWorkouts = await this.workoutService.getStoredWorkouts(userId);
      const workoutDates = allWorkouts
        .map((w: any) => new Date(w.startTime))
        .sort((a: Date, b: Date) => a.getTime() - b.getTime());

      const updatedCache: NostrWorkoutCache = {
        ...cache,
        lastSyncAt: syncResult.syncedAt,
        workoutCount: allWorkouts.length,
        oldestEvent:
          workoutDates.length > 0
            ? workoutDates[0].toISOString()
            : cache.oldestEvent,
        newestEvent:
          workoutDates.length > 0
            ? workoutDates[workoutDates.length - 1].toISOString()
            : cache.newestEvent,
        relayStatus: { ...cache.relayStatus, ...relayStatus },
        syncHistory: [...cache.syncHistory, syncResult].slice(-10), // Keep last 10 sync results
      };

      const key = `${STORAGE_KEYS.CACHE}_${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(updatedCache));
    } catch (error) {
      console.error('❌ Failed to update user cache:', error);
    }
  }

  /**
   * Calculate sync start date based on cache and options
   */
  private calculateSyncStartDate(
    cache: NostrWorkoutCache,
    maxDays?: number
  ): Date {
    // If we have previous sync data, start from last sync
    if (cache.lastSyncAt) {
      return new Date(cache.lastSyncAt);
    }

    // Otherwise, use maxDays limit (default 90 days)
    const daysBack = maxDays || 90;
    return new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  }

  /**
   * Load sync configuration
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_CONFIG);
      if (data) {
        const storedConfig = JSON.parse(data);
        this.config = { ...DEFAULT_CONFIG, ...storedConfig };
      }
    } catch (error) {
      console.error('❌ Failed to load sync config, using defaults:', error);
      this.config = DEFAULT_CONFIG;
    }
  }

  /**
   * Save sync configuration
   */
  async updateConfiguration(
    config: Partial<NostrWorkoutSyncConfig>
  ): Promise<void> {
    try {
      this.config = { ...this.config, ...config };
      await AsyncStorage.setItem(
        STORAGE_KEYS.SYNC_CONFIG,
        JSON.stringify(this.config)
      );
      console.log('✅ Sync configuration updated');
    } catch (error) {
      console.error('❌ Failed to save sync config:', error);
    }
  }

  /**
   * Load active subscriptions
   */
  private async loadActiveSubscriptions(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS);
      if (data) {
        const subscriptions: NostrWorkoutSubscription[] = JSON.parse(data);
        this.activeSubscriptions.clear();

        for (const sub of subscriptions) {
          if (sub.isActive) {
            this.activeSubscriptions.set(sub.id, sub);
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to load active subscriptions:', error);
    }
  }

  /**
   * Save active subscriptions
   */
  private async saveActiveSubscriptions(): Promise<void> {
    try {
      const subscriptions = Array.from(this.activeSubscriptions.values());
      await AsyncStorage.setItem(
        STORAGE_KEYS.SUBSCRIPTIONS,
        JSON.stringify(subscriptions)
      );
    } catch (error) {
      console.error('❌ Failed to save active subscriptions:', error);
    }
  }

  /**
   * Stop real-time sync for user
   */
  async stopRealtimeSync(userId: string): Promise<void> {
    const subscriptionId = `workout_${userId}`;
    const subscription = this.activeSubscriptions.get(subscriptionId);

    if (subscription) {
      subscription.isActive = false;
      this.activeSubscriptions.delete(subscriptionId);
      await this.saveActiveSubscriptions();
      console.log(`🔕 Real-time sync stopped for user: ${userId}`);
    }
  }

  /**
   * Process workouts for competitions
   * Integrates with NostrCompetitionBridge for competition updates
   */
  private async processWorkoutsForCompetitions(
    userId: string,
    workouts: NostrWorkoutCompetition[],
    pubkey: string
  ): Promise<void> {
    if (!this.config.enableCompetitionIntegration) {
      return;
    }

    try {
      console.log(
        `🏆 Processing ${workouts.length} Nostr workouts for competitions...`
      );

      // Get user's team memberships for context
      const teamId = await this.getUserPrimaryTeam(userId);

      // Delay before processing to avoid overwhelming the system
      if (this.config.competitionSyncDelay > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.config.competitionSyncDelay)
        );
      }

      // Process in batches to manage system load
      const batchSize = this.config.competitionUpdateBatchSize;

      for (let i = 0; i < workouts.length; i += batchSize) {
        const batch = workouts.slice(i, i + batchSize);

        const result = await nostrCompetitionBridge.processBatchNostrWorkouts(
          batch,
          userId,
          teamId
        );

        if (result.success) {
          console.log(
            `✅ Processed batch ${Math.floor(i / batchSize) + 1}: ${
              result.processedWorkouts
            } workouts → ${result.competitionsUpdated} competitions updated`
          );
        } else {
          console.error(
            `❌ Failed to process batch ${Math.floor(i / batchSize) + 1}:`,
            result.errors
          );
        }

        // Small delay between batches
        if (i + batchSize < workouts.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      console.log(`🏆 Competition processing completed for user ${userId}`);
    } catch (error) {
      console.error('❌ Error processing workouts for competitions:', error);
    }
  }

  /**
   * Get user's primary team ID for competition processing
   */
  private async getUserPrimaryTeam(
    userId: string
  ): Promise<string | undefined> {
    try {
      // In a real implementation, this could query the user's team memberships
      // For now, we'll let the competition bridge handle team detection
      return undefined;
    } catch (error) {
      console.error('Error getting user primary team:', error);
      return undefined;
    }
  }

  /**
   * Get active subscriptions count
   */
  getActiveSubscriptionsCount(): number {
    return this.activeSubscriptions.size;
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up NostrWorkoutSyncService...');

    this.stopAutoSync();

    // Stop all active subscriptions
    for (const [userId] of this.activeSubscriptions) {
      await this.stopRealtimeSync(userId.replace('workout_', ''));
    }

    this.isInitialized = false;
    console.log('✅ NostrWorkoutSyncService cleanup completed');
  }
}

export default NostrWorkoutSyncService.getInstance();
