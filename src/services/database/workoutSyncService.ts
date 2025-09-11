/**
 * Workout Sync Service - Background sync from Nostr 1301 events to SQLite
 * Bridges existing NostrWorkoutService with new local database layer
 */

import workoutDatabase, { WorkoutDatabase } from './workoutDatabase';
import workoutMetricsCalculator, { WorkoutMetricsCalculator } from '../competition/workoutMetricsCalculator';
import NostrWorkoutService from '../fitness/nostrWorkoutService';
import { NostrWorkout } from '../../types/nostrWorkout';

export interface SyncResult {
  totalProcessed: number;
  newWorkouts: number;
  duplicatesSkipped: number;
  errors: number;
  syncDuration: number;
  lastSyncTime: string;
}

export interface SyncOptions {
  userNpub: string;
  userId: string;
  sinceDays?: number;
  forceFullSync?: boolean;
  batchSize?: number;
}

export class WorkoutSyncService {
  private static instance: WorkoutSyncService;
  private database: WorkoutDatabase;
  private metricsCalculator: WorkoutMetricsCalculator;
  private nostrService: NostrWorkoutService;

  constructor() {
    this.database = workoutDatabase;
    this.metricsCalculator = workoutMetricsCalculator;
    this.nostrService = NostrWorkoutService.getInstance();
  }

  static getInstance(): WorkoutSyncService {
    if (!WorkoutSyncService.instance) {
      WorkoutSyncService.instance = new WorkoutSyncService();
    }
    return WorkoutSyncService.instance;
  }

  /**
   * Sync user's workout data from Nostr to local SQLite database
   */
  async syncUserWorkouts(options: SyncOptions): Promise<SyncResult> {
    const startTime = Date.now();
    console.log(`🔄 Starting workout sync for ${options.userNpub.slice(0, 8)}...`);

    try {
      // Initialize database
      await this.database.initialize();

      // Calculate sync window
      const sinceDays = options.sinceDays || 30;
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - sinceDays);

      // Fetch workouts from Nostr
      console.log(`📥 Fetching Nostr workouts since ${sinceDate.toISOString()}`);
      const nostrResult = await this.nostrService.fetchUserWorkouts(options.userNpub, {
        since: options.forceFullSync ? undefined : sinceDate,
        limit: 500,
        userId: options.userId,
        preserveRawEvents: false,
      });

      if (nostrResult.status === 'error') {
        throw new Error(`Nostr sync failed: ${nostrResult.errors.join(', ')}`);
      }

      // Get stored workouts to find new ones
      const storedWorkouts = await this.nostrService.getStoredWorkouts(options.userId);
      console.log(`💾 Found ${storedWorkouts.length} stored Nostr workouts`);

      // Convert Nostr workouts to database format
      const workoutRecords = storedWorkouts.map(nostrWorkout => 
        this.metricsCalculator.extractWorkoutFromNostrEvent(nostrWorkout)
      );

      // Batch insert workouts
      const batchSize = options.batchSize || 50;
      let totalProcessed = 0;
      let newWorkouts = 0;
      let duplicatesSkipped = 0;
      let errors = 0;

      for (let i = 0; i < workoutRecords.length; i += batchSize) {
        const batch = workoutRecords.slice(i, i + batchSize);
        
        try {
          const insertedIds = await this.database.bulkInsertWorkouts(batch);
          newWorkouts += insertedIds.length;
          duplicatesSkipped += batch.length - insertedIds.length;
          totalProcessed += batch.length;
          
          console.log(`📊 Batch ${Math.floor(i/batchSize) + 1}: ${insertedIds.length} new, ${batch.length - insertedIds.length} duplicates`);
          
        } catch (error) {
          console.error(`❌ Batch insert failed:`, error);
          errors += batch.length;
        }
      }

      const syncDuration = Date.now() - startTime;
      const lastSyncTime = new Date().toISOString();

      // Store sync metadata
      await this.storeSyncMetadata(options.userNpub, lastSyncTime);

      const result: SyncResult = {
        totalProcessed,
        newWorkouts,
        duplicatesSkipped,
        errors,
        syncDuration,
        lastSyncTime,
      };

      console.log(`✅ Workout sync completed:`, result);
      return result;

    } catch (error) {
      const syncDuration = Date.now() - startTime;
      console.error('❌ Workout sync failed:', error);
      
      return {
        totalProcessed: 0,
        newWorkouts: 0,
        duplicatesSkipped: 0,
        errors: 1,
        syncDuration,
        lastSyncTime: new Date().toISOString(),
      };
    }
  }

  /**
   * Sync workouts for multiple team members
   */
  async syncTeamWorkouts(teamMembers: string[]): Promise<Record<string, SyncResult>> {
    console.log(`🏃‍♀️ Starting team workout sync for ${teamMembers.length} members`);

    const results: Record<string, SyncResult> = {};

    // Sync each member's workouts
    for (const npub of teamMembers) {
      try {
        console.log(`🔄 Syncing workouts for member: ${npub.slice(0, 8)}...`);
        
        const syncResult = await this.syncUserWorkouts({
          userNpub: npub,
          userId: npub, // Use npub as userId for team members
          sinceDays: 7, // Recent workouts for team competitions
          batchSize: 25, // Smaller batches for team sync
        });

        results[npub] = syncResult;

      } catch (error) {
        console.error(`❌ Team member sync failed for ${npub.slice(0, 8)}:`, error);
        results[npub] = {
          totalProcessed: 0,
          newWorkouts: 0,
          duplicatesSkipped: 0,
          errors: 1,
          syncDuration: 0,
          lastSyncTime: new Date().toISOString(),
        };
      }
    }

    const totalNew = Object.values(results).reduce((sum, r) => sum + r.newWorkouts, 0);
    console.log(`✅ Team sync completed: ${totalNew} new workouts across ${teamMembers.length} members`);

    return results;
  }

  /**
   * Get workouts for competition calculations
   */
  async getCompetitionWorkouts(
    participantNpubs: string[],
    activityType: string,
    startDate: string,
    endDate: string
  ): Promise<Record<string, any[]>> {
    console.log(`🏆 Getting competition workouts for ${participantNpubs.length} participants`);

    const participantWorkouts: Record<string, any[]> = {};

    for (const npub of participantNpubs) {
      try {
        const workouts = await this.database.getUserWorkouts(npub, {
          type: activityType.toLowerCase(),
          startDate,
          endDate,
          limit: 100,
        });

        participantWorkouts[npub] = workouts;
        console.log(`📊 Found ${workouts.length} ${activityType} workouts for ${npub.slice(0, 8)}...`);

      } catch (error) {
        console.error(`❌ Failed to get workouts for ${npub.slice(0, 8)}:`, error);
        participantWorkouts[npub] = [];
      }
    }

    return participantWorkouts;
  }

  /**
   * Background sync - run periodically to keep data fresh
   */
  async backgroundSync(userNpub: string, userId: string): Promise<void> {
    try {
      console.log(`🔄 Running background sync for ${userNpub.slice(0, 8)}...`);

      const lastSync = await this.getLastSyncTime(userNpub);
      const hoursSinceLastSync = lastSync 
        ? (Date.now() - new Date(lastSync).getTime()) / (1000 * 60 * 60)
        : 24;

      // Skip if synced recently (within 2 hours)
      if (hoursSinceLastSync < 2) {
        console.log(`⏭️ Skipping background sync: last sync ${hoursSinceLastSync.toFixed(1)}h ago`);
        return;
      }

      // Run incremental sync
      await this.syncUserWorkouts({
        userNpub,
        userId,
        sinceDays: 7, // Only recent workouts for background sync
        batchSize: 25,
      });

    } catch (error) {
      console.error('❌ Background sync failed:', error);
    }
  }

  /**
   * Force full resync - useful for debugging or data recovery
   */
  async fullResync(userNpub: string, userId: string): Promise<SyncResult> {
    console.log(`🔄 Starting FULL resync for ${userNpub.slice(0, 8)}...`);

    // Clear existing data for this user
    try {
      await this.database.initialize();
      // Note: We don't have a method to clear user-specific data yet
      // This would need to be added to the database service
      console.log('⚠️ Full resync: clearing existing data not implemented yet');
    } catch (error) {
      console.warn('Failed to clear existing data:', error);
    }

    // Sync all data
    return await this.syncUserWorkouts({
      userNpub,
      userId,
      forceFullSync: true,
      batchSize: 100,
    });
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(userNpub: string): Promise<{
    totalWorkouts: number;
    lastSyncTime: string | null;
    oldestWorkout: string | null;
    newestWorkout: string | null;
    workoutTypes: Record<string, number>;
  }> {
    try {
      await this.database.initialize();

      const workouts = await this.database.getUserWorkouts(userNpub, { limit: 1000 });
      const lastSync = await this.getLastSyncTime(userNpub);

      // Analyze workout types
      const workoutTypes: Record<string, number> = {};
      let oldestWorkout: string | null = null;
      let newestWorkout: string | null = null;

      for (const workout of workouts) {
        // Count by type
        workoutTypes[workout.type] = (workoutTypes[workout.type] || 0) + 1;
        
        // Track date range
        if (!oldestWorkout || workout.startTime < oldestWorkout) {
          oldestWorkout = workout.startTime;
        }
        if (!newestWorkout || workout.startTime > newestWorkout) {
          newestWorkout = workout.startTime;
        }
      }

      return {
        totalWorkouts: workouts.length,
        lastSyncTime: lastSync,
        oldestWorkout,
        newestWorkout,
        workoutTypes,
      };

    } catch (error) {
      console.error('❌ Failed to get sync stats:', error);
      return {
        totalWorkouts: 0,
        lastSyncTime: null,
        oldestWorkout: null,
        newestWorkout: null,
        workoutTypes: {},
      };
    }
  }

  // ================================================================================
  // PRIVATE HELPERS
  // ================================================================================

  /**
   * Store sync metadata
   */
  private async storeSyncMetadata(userNpub: string, syncTime: string): Promise<void> {
    try {
      // This could be stored in AsyncStorage or a separate metadata table
      // For now, just log it
      console.log(`📝 Sync metadata: ${userNpub.slice(0, 8)} at ${syncTime}`);
    } catch (error) {
      console.error('Failed to store sync metadata:', error);
    }
  }

  /**
   * Get last sync time
   */
  private async getLastSyncTime(userNpub: string): Promise<string | null> {
    try {
      // This would come from stored metadata
      // For now, return null to always sync
      return null;
    } catch (error) {
      console.error('Failed to get last sync time:', error);
      return null;
    }
  }
}

export default WorkoutSyncService.getInstance();