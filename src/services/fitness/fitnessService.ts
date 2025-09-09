/**
 * Fitness Service - Main Orchestrator
 * Single entry point for all fitness-related functionality
 * Coordinates workout sync, leaderboards, and reward distribution
 */

import healthKitService from './healthKitService';
import workoutDataProcessor from './workoutDataProcessor';
import teamLeaderboardService from './teamLeaderboardService';
import rewardDistributionService from './rewardDistributionService';
import backgroundSyncService from './backgroundSyncService';
import nostrWorkoutService from './nostrWorkoutService';
import nostrWorkoutSyncService from './nostrWorkoutSyncService';
import type { WorkoutData, WorkoutStats, LeaderboardEntry } from '../../types';
import type {
  NostrWorkoutSyncResult,
  NostrSyncStatus,
  NostrWorkoutStats,
} from '../../types/nostrWorkout';
import type {
  RewardDistribution,
  DistributionTemplate,
} from './rewardDistributionService';
import type {
  SyncResult,
  NotificationPayload,
  SyncConfiguration,
} from './backgroundSyncService';
import type {
  TeamLeaderboardData,
  LeaderboardUpdate,
} from './teamLeaderboardService';

export interface FitnessServiceStatus {
  isInitialized: boolean;
  healthKitAvailable: boolean;
  backgroundSyncEnabled: boolean;
  lastSyncAt?: string;
  activeSubscriptions: string[];
  nostrSync?: {
    status: NostrSyncStatus;
    lastSyncAt?: string;
    workoutCount: number;
    activeSubscriptions: number;
  };
}

export class FitnessService {
  private static instance: FitnessService;
  private isInitialized = false;
  private activeTeamSubscriptions = new Set<string>();

  private constructor() {}

  static getInstance(): FitnessService {
    if (!FitnessService.instance) {
      FitnessService.instance = new FitnessService();
    }
    return FitnessService.instance;
  }

  // ============================================================================
  // INITIALIZATION & SETUP
  // ============================================================================

  /**
   * Initialize all fitness services
   */
  async initialize(config?: {
    syncConfig?: Partial<SyncConfiguration>;
    enableBackgroundSync?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('FitnessService: Initializing all services...');

      // Initialize background sync service (this initializes HealthKit too)
      const syncResult = await backgroundSyncService.initialize(
        config?.syncConfig
      );
      if (!syncResult.success) {
        console.warn(
          'FitnessService: Background sync initialization failed:',
          syncResult.error
        );
      }

      // Start background sync if enabled
      if (config?.enableBackgroundSync !== false) {
        // Perform initial sync
        await backgroundSyncService.syncNow();
      }

      this.isInitialized = true;
      console.log('FitnessService: All services initialized successfully');

      return { success: true };
    } catch (error) {
      console.error('FitnessService: Initialization failed:', error);
      return {
        success: false,
        error: `Service initialization failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /**
   * Get service status including Nostr sync status
   */
  getStatus(): FitnessServiceStatus {
    const healthKitStatus = healthKitService.getStatus();
    const syncStatus = backgroundSyncService.getSyncStatus();

    return {
      isInitialized: this.isInitialized,
      healthKitAvailable:
        healthKitStatus.available && healthKitStatus.authorized,
      backgroundSyncEnabled: !syncStatus.isSyncing,
      lastSyncAt:
        syncStatus.lastSyncTime > 0
          ? new Date(syncStatus.lastSyncTime).toISOString()
          : undefined,
      activeSubscriptions: Array.from(this.activeTeamSubscriptions),
      nostrSync: {
        status: nostrWorkoutSyncService.getSyncStatus(),
        workoutCount: 0, // Will be populated by getUserNostrSyncStatus
        activeSubscriptions:
          nostrWorkoutSyncService.getActiveSubscriptionsCount(),
      },
    };
  }

  // ============================================================================
  // WORKOUT SYNC & PROCESSING
  // ============================================================================

  /**
   * Sync workouts for user
   */
  async syncUserWorkouts(userId: string, teamId?: string): Promise<SyncResult> {
    return backgroundSyncService.performBackgroundSync('manual');
  }

  /**
   * Get user workout statistics
   */
  async getUserWorkoutStats(
    userId: string,
    teamId?: string
  ): Promise<WorkoutStats | null> {
    return workoutDataProcessor.getUserWorkoutStats(userId, teamId);
  }

  /**
   * Process individual workout
   */
  async processWorkout(
    workout: WorkoutData
  ): Promise<{ success: boolean; score?: number; error?: string }> {
    return workoutDataProcessor.processWorkout(workout);
  }

  /**
   * Process multiple workouts in batch
   */
  async processBatchWorkouts(workouts: WorkoutData[]): Promise<{
    success: boolean;
    processedCount: number;
    totalScore: number;
    errors: string[];
  }> {
    return workoutDataProcessor.processBatchWorkouts(workouts);
  }

  // ============================================================================
  // NOSTR WORKOUT SYNC (Phase 2 Integration)
  // ============================================================================

  /**
   * Start initial Nostr workout sync for user
   */
  async startNostrWorkoutSync(
    userId: string,
    pubkey: string,
    options?: { maxDays?: number; preserveRawEvents?: boolean }
  ): Promise<NostrWorkoutSyncResult> {
    console.log(
      `FitnessService: Starting Nostr workout sync for user ${userId}`
    );

    try {
      await nostrWorkoutSyncService.initialize();
      const result = await nostrWorkoutSyncService.startInitialSync(
        userId,
        pubkey,
        options
      );

      console.log(
        `FitnessService: Nostr sync completed - ${result.parsedWorkouts} workouts imported`
      );
      return result;
    } catch (error) {
      console.error('FitnessService: Nostr sync failed:', error);
      throw error;
    }
  }

  /**
   * Get Nostr workout statistics for user
   */
  async getNostrWorkoutStats(userId: string): Promise<NostrWorkoutStats> {
    return nostrWorkoutService.getWorkoutStats(userId);
  }

  /**
   * Get Nostr sync status for user
   */
  async getNostrSyncStatus(userId: string): Promise<{
    status: NostrSyncStatus;
    lastSyncAt?: string;
    workoutCount: number;
  }> {
    const cache = await nostrWorkoutSyncService.getUserCache(userId);
    const status = nostrWorkoutSyncService.getSyncStatus();

    return {
      status,
      lastSyncAt: cache.lastSyncAt,
      workoutCount: cache.workoutCount,
    };
  }

  /**
   * Trigger manual Nostr workout sync
   */
  async triggerManualNostrSync(
    userId: string,
    pubkey: string
  ): Promise<NostrWorkoutSyncResult> {
    console.log(
      `FitnessService: Manual Nostr sync triggered for user ${userId}`
    );
    return nostrWorkoutSyncService.triggerManualSync(userId, pubkey);
  }

  /**
   * Start automatic Nostr sync for user
   */
  async startAutoNostrSync(userId: string, pubkey: string): Promise<void> {
    await nostrWorkoutSyncService.initialize();
    nostrWorkoutSyncService.startAutoSync(userId, pubkey);
    console.log(`FitnessService: Auto Nostr sync started for user ${userId}`);
  }

  /**
   * Stop automatic Nostr sync
   */
  stopAutoNostrSync(): void {
    nostrWorkoutSyncService.stopAutoSync();
    console.log('FitnessService: Auto Nostr sync stopped');
  }

  // ============================================================================
  // TEAM LEADERBOARDS & REAL-TIME UPDATES
  // ============================================================================

  /**
   * Subscribe to team leaderboard updates
   */
  async subscribeToTeamLeaderboard(
    teamId: string,
    callback: (update: LeaderboardUpdate) => void
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await teamLeaderboardService.subscribeToTeam(
        teamId,
        callback
      );

      if (result.success) {
        this.activeTeamSubscriptions.add(teamId);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Subscription failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /**
   * Unsubscribe from team leaderboard updates
   */
  async unsubscribeFromTeamLeaderboard(
    teamId: string,
    callback?: (update: LeaderboardUpdate) => void
  ): Promise<void> {
    await teamLeaderboardService.unsubscribeFromTeam(teamId, callback);
    this.activeTeamSubscriptions.delete(teamId);
  }

  /**
   * Get team leaderboard data
   */
  async getTeamLeaderboard(
    teamId: string
  ): Promise<TeamLeaderboardData | null> {
    return teamLeaderboardService.getTeamLeaderboard(teamId);
  }

  /**
   * Get user's rank in team
   */
  async getUserRankInTeam(
    userId: string,
    teamId: string
  ): Promise<{
    rank: number | null;
    score: number;
    totalMembers: number;
  }> {
    return teamLeaderboardService.getUserRankInTeam(userId, teamId);
  }

  /**
   * Generate team leaderboard (one-time fetch)
   */
  async generateTeamLeaderboard(
    teamId: string,
    limit?: number
  ): Promise<LeaderboardEntry[]> {
    return workoutDataProcessor.generateTeamLeaderboard(teamId, limit);
  }

  // ============================================================================
  // REWARD DISTRIBUTION (CAPTAIN FEATURES)
  // ============================================================================

  /**
   * Create reward distribution for single user
   */
  async createRewardDistribution(
    captainId: string,
    teamId: string,
    recipientId: string,
    amount: number,
    reason: string,
    description?: string
  ): Promise<{ success: boolean; distributionId?: string; error?: string }> {
    return rewardDistributionService.createDistribution(
      captainId,
      teamId,
      recipientId,
      amount,
      reason,
      description
    );
  }

  /**
   * Create batch reward distribution
   */
  async createBatchRewardDistribution(
    captainId: string,
    teamId: string,
    distributions: {
      recipientId: string;
      amount: number;
      reason: string;
      description?: string;
    }[]
  ): Promise<{ success: boolean; batchId?: string; error?: string }> {
    return rewardDistributionService.createBatchDistribution(
      captainId,
      teamId,
      distributions
    );
  }

  /**
   * Process reward distribution (send Bitcoin payment)
   */
  async processRewardDistribution(
    distributionId: string
  ): Promise<{ success: boolean; error?: string }> {
    return rewardDistributionService.processDistribution(distributionId);
  }

  /**
   * Process batch reward distribution
   */
  async processBatchRewardDistribution(batchId: string): Promise<{
    success: boolean;
    processed: number;
    failed: number;
    error?: string;
  }> {
    return rewardDistributionService.processBatchDistribution(batchId);
  }

  /**
   * Get team distribution history
   */
  async getTeamDistributionHistory(
    teamId: string,
    limit?: number
  ): Promise<RewardDistribution[]> {
    return rewardDistributionService.getTeamDistributionHistory(teamId, limit);
  }

  /**
   * Get reward distribution templates
   */
  getDistributionTemplates(): DistributionTemplate[] {
    return rewardDistributionService.getDistributionTemplates();
  }

  // ============================================================================
  // BACKGROUND SYNC & NOTIFICATIONS
  // ============================================================================

  /**
   * Trigger manual sync
   */
  async syncNow(): Promise<SyncResult> {
    return backgroundSyncService.syncNow();
  }

  /**
   * Send push notification
   */
  async sendNotification(
    payload: NotificationPayload
  ): Promise<{ success: boolean; error?: string }> {
    return backgroundSyncService.sendNotification(payload);
  }

  /**
   * Update sync configuration
   */
  updateSyncConfig(config: Partial<SyncConfiguration>): void {
    backgroundSyncService.updateConfig(config);
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    isSyncing: boolean;
    lastSyncTime: number;
    config: SyncConfiguration;
  } {
    return backgroundSyncService.getSyncStatus();
  }

  // ============================================================================
  // UTILITY & CONVENIENCE METHODS
  // ============================================================================

  /**
   * Quick setup for new user
   */
  async setupUserFitness(
    userId: string,
    teamId?: string
  ): Promise<{
    success: boolean;
    syncResult?: SyncResult;
    error?: string;
  }> {
    try {
      console.log(`FitnessService: Setting up fitness for user ${userId}`);

      // Ensure services are initialized
      if (!this.isInitialized) {
        const initResult = await this.initialize();
        if (!initResult.success) {
          return { success: false, error: initResult.error };
        }
      }

      // Perform initial workout sync
      const syncResult = await this.syncUserWorkouts(userId, teamId);

      console.log(
        `FitnessService: User setup completed - ${syncResult.workoutsProcessed} workouts synced`
      );
      return { success: true, syncResult };
    } catch (error) {
      console.error('FitnessService: User setup failed:', error);
      return {
        success: false,
        error: `User setup failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /**
   * Quick captain setup (includes leaderboard subscription)
   */
  async setupCaptainFeatures(
    captainId: string,
    teamId: string,
    leaderboardCallback: (update: LeaderboardUpdate) => void
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(
        `FitnessService: Setting up captain features for ${captainId}`
      );

      // Setup regular user features first
      const userSetup = await this.setupUserFitness(captainId, teamId);
      if (!userSetup.success) {
        return userSetup;
      }

      // Subscribe to team leaderboard updates
      const subscriptionResult = await this.subscribeToTeamLeaderboard(
        teamId,
        leaderboardCallback
      );
      if (!subscriptionResult.success) {
        return subscriptionResult;
      }

      console.log(
        `FitnessService: Captain features setup completed for team ${teamId}`
      );
      return { success: true };
    } catch (error) {
      console.error('FitnessService: Captain setup failed:', error);
      return {
        success: false,
        error: `Captain setup failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /**
   * Cleanup all services (call on app shutdown)
   */
  async cleanup(): Promise<void> {
    console.log('FitnessService: Cleaning up all services...');

    // Unsubscribe from all team leaderboards
    for (const teamId of this.activeTeamSubscriptions) {
      await this.unsubscribeFromTeamLeaderboard(teamId);
    }

    // Cleanup individual services
    await backgroundSyncService.cleanup();

    this.isInitialized = false;
    this.activeTeamSubscriptions.clear();

    console.log('FitnessService: Cleanup completed');
  }

  /**
   * Get comprehensive service metrics
   */
  getServiceMetrics(): {
    status: FitnessServiceStatus;
    syncMetrics: any;
    leaderboardSubscriptions: number;
  } {
    return {
      status: this.getStatus(),
      syncMetrics: backgroundSyncService.getMetrics(),
      leaderboardSubscriptions: this.activeTeamSubscriptions.size,
    };
  }
}

export default FitnessService.getInstance();
