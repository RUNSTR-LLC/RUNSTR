/**
 * Workout Merge Service - Unified Workout Display & Status Tracking
 * Combines HealthKit and Nostr workouts for display in WorkoutHistoryScreen
 * Tracks posting status (synced to Nostr, posted to social) for UI state management
 */

import { supabase } from '../supabase';
import { NostrWorkoutService } from './nostrWorkoutService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Workout, WorkoutType } from '../../types/workout';
import type { NostrWorkout } from '../../types/nostrWorkout';

// Extended workout interface with posting status
export interface UnifiedWorkout extends Workout {
  // Posting status flags
  syncedToNostr?: boolean;
  postedToSocial?: boolean;
  postingInProgress?: boolean;

  // Nostr-specific fields (if available)
  nostrEventId?: string;
  nostrPubkey?: string;
  elevationGain?: number;
  route?: Array<{
    latitude: number;
    longitude: number;
    elevation?: number;
    timestamp?: number;
  }>;
  unitSystem?: 'metric' | 'imperial';
  sourceApp?: string;
  location?: string;

  // UI state
  canSyncToNostr: boolean;
  canPostToSocial: boolean;
}

export interface WorkoutMergeResult {
  allWorkouts: UnifiedWorkout[];
  healthKitCount: number;
  nostrCount: number;
  duplicateCount: number;
  lastSyncAt?: string;
}

export interface WorkoutStatusUpdate {
  workoutId: string;
  syncedToNostr?: boolean;
  postedToSocial?: boolean;
  nostrEventId?: string;
}

const STORAGE_KEYS = {
  WORKOUT_STATUS: 'workout_posting_status',
  LAST_MERGE: 'last_workout_merge',
};

export class WorkoutMergeService {
  private static instance: WorkoutMergeService;
  private nostrWorkoutService: NostrWorkoutService;

  private constructor() {
    this.nostrWorkoutService = NostrWorkoutService.getInstance();
  }

  static getInstance(): WorkoutMergeService {
    if (!WorkoutMergeService.instance) {
      WorkoutMergeService.instance = new WorkoutMergeService();
    }
    return WorkoutMergeService.instance;
  }

  /**
   * Get merged workouts for user - combines HealthKit and Nostr sources
   */
  async getMergedWorkouts(userId: string, pubkey?: string): Promise<WorkoutMergeResult> {
    try {
      console.log('🔄 WorkoutMergeService: Merging workouts for user', userId);

      // Fetch workouts from Nostr relays if pubkey is available
      const [healthKitWorkouts, nostrWorkouts, postingStatus] =
        await Promise.all([
          this.fetchHealthKitWorkouts(userId),
          this.fetchNostrWorkouts(userId, pubkey),
          this.getWorkoutPostingStatus(userId),
        ]);

      console.log(
        `📱 Found ${healthKitWorkouts.length} HealthKit workouts, ${nostrWorkouts.length} Nostr workouts`
      );

      // Deduplicate and merge workouts
      const mergedResult = this.mergeAndDeduplicateWorkouts(
        healthKitWorkouts,
        nostrWorkouts,
        postingStatus
      );

      // Cache merge timestamp
      await AsyncStorage.setItem(
        `${STORAGE_KEYS.LAST_MERGE}_${userId}`,
        new Date().toISOString()
      );

      console.log(
        `✅ Merged ${mergedResult.allWorkouts.length} total workouts (${mergedResult.duplicateCount} duplicates removed)`
      );
      return mergedResult;
    } catch (error) {
      console.error('❌ WorkoutMergeService: Error merging workouts:', error);
      throw new Error('Failed to merge workout data');
    }
  }

  /**
   * Fetch HealthKit workouts - NOSTR NATIVE: No database queries
   * HealthKit workouts will be published to Nostr as 1301 events
   */
  private async fetchHealthKitWorkouts(userId: string): Promise<Workout[]> {
    // RUNSTR is Nostr-native - all workouts come from Nostr events (kind 1301)
    // HealthKit integration should publish workouts to Nostr, not store in database
    console.log('📱 RUNSTR is Nostr-native - all workouts fetched from Nostr relays only');
    return [];
  }

  /**
   * Fetch Nostr workouts - query relays if pubkey available, otherwise get stored
   */
  private async fetchNostrWorkouts(userId: string, pubkey?: string): Promise<NostrWorkout[]> {
    try {
      if (pubkey) {
        console.log('🔍 Fetching Nostr workouts from relays for pubkey:', pubkey.slice(0, 12) + '...');
        // Fetch fresh workouts from Nostr relays
        const result = await this.nostrWorkoutService.fetchUserWorkouts(pubkey, {
          userId,
          limit: 100,
          preserveRawEvents: false
        });
        console.log(`📥 Fetched ${result.parsedWorkouts} workouts from Nostr relays`);
      }
      
      // Always return stored workouts (which will include newly fetched ones)
      return await this.nostrWorkoutService.getStoredWorkouts(userId);
    } catch (error) {
      console.error('❌ Error fetching Nostr workouts:', error);
      return [];
    }
  }

  /**
   * Merge and deduplicate workouts from both sources
   */
  private mergeAndDeduplicateWorkouts(
    healthKitWorkouts: Workout[],
    nostrWorkouts: NostrWorkout[],
    postingStatus: Map<string, WorkoutStatusUpdate>
  ): WorkoutMergeResult {
    const unifiedWorkouts: UnifiedWorkout[] = [];
    const processedIds = new Set<string>();
    let duplicateCount = 0;

    // Process Nostr workouts first (they have more complete data)
    for (const nostrWorkout of nostrWorkouts) {
      const unified: UnifiedWorkout = {
        ...nostrWorkout,
        // Nostr workouts are already synced and can be posted to social
        syncedToNostr: true,
        postedToSocial:
          postingStatus.get(nostrWorkout.id)?.postedToSocial || false,
        postingInProgress: false,
        canSyncToNostr: false, // Already synced
        canPostToSocial: true,
      };

      unifiedWorkouts.push(unified);
      processedIds.add(this.generateDedupeKey(nostrWorkout));
    }

    // Process HealthKit workouts, checking for duplicates
    for (const healthKitWorkout of healthKitWorkouts) {
      const dedupeKey = this.generateDedupeKey(healthKitWorkout);

      if (processedIds.has(dedupeKey)) {
        duplicateCount++;
        continue;
      }

      const status = postingStatus.get(healthKitWorkout.id) || {
        workoutId: healthKitWorkout.id,
      };
      const unified: UnifiedWorkout = {
        ...healthKitWorkout,
        // HealthKit workouts need status from storage
        syncedToNostr: status.syncedToNostr || false,
        postedToSocial: status.postedToSocial || false,
        postingInProgress: false,
        canSyncToNostr: !(status.syncedToNostr || false),
        canPostToSocial: true,
        // Add Nostr event ID if synced
        nostrEventId: status.nostrEventId,
      };

      unifiedWorkouts.push(unified);
      processedIds.add(dedupeKey);
    }

    // Sort by start time (newest first)
    unifiedWorkouts.sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    return {
      allWorkouts: unifiedWorkouts,
      healthKitCount: healthKitWorkouts.length,
      nostrCount: nostrWorkouts.length,
      duplicateCount,
    };
  }

  /**
   * Generate deduplication key for workouts
   */
  private generateDedupeKey(workout: Workout): string {
    const startTime = new Date(workout.startTime).getTime();
    const endTime = new Date(workout.endTime).getTime();
    const duration = workout.duration;
    const distance = Math.round(workout.distance || 0);

    return `${workout.type}_${startTime}_${endTime}_${duration}_${distance}`;
  }

  /**
   * Update workout posting status
   */
  async updateWorkoutStatus(
    userId: string,
    workoutId: string,
    updates: Partial<WorkoutStatusUpdate>
  ): Promise<void> {
    try {
      const statusMap = await this.getWorkoutPostingStatus(userId);
      const currentStatus = statusMap.get(workoutId) || { workoutId };

      const updatedStatus: WorkoutStatusUpdate = {
        ...currentStatus,
        ...updates,
      };

      statusMap.set(workoutId, updatedStatus);

      // Save back to storage
      const statusArray = Array.from(statusMap.values());
      await AsyncStorage.setItem(
        `${STORAGE_KEYS.WORKOUT_STATUS}_${userId}`,
        JSON.stringify(statusArray)
      );

      console.log(`✅ Updated workout status for ${workoutId}:`, updates);
    } catch (error) {
      console.error('❌ Error updating workout status:', error);
      throw error;
    }
  }

  /**
   * Get workout posting status from storage
   */
  private async getWorkoutPostingStatus(
    userId: string
  ): Promise<Map<string, WorkoutStatusUpdate>> {
    try {
      const key = `${STORAGE_KEYS.WORKOUT_STATUS}_${userId}`;
      const data = await AsyncStorage.getItem(key);

      if (!data) {
        return new Map();
      }

      const statusArray: WorkoutStatusUpdate[] = JSON.parse(data);
      return new Map(statusArray.map((status) => [status.workoutId, status]));
    } catch (error) {
      console.error('❌ Error getting workout posting status:', error);
      return new Map();
    }
  }

  /**
   * Mark workout as being posted (to show loading state)
   */
  async setWorkoutPostingInProgress(
    userId: string,
    workoutId: string,
    inProgress: boolean
  ): Promise<void> {
    await this.updateWorkoutStatus(userId, workoutId, {
      workoutId,
      // Note: postingInProgress is handled in memory, not persisted
    });
  }

  /**
   * Clear all posting status for user (useful for debugging)
   */
  async clearWorkoutStatus(userId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${STORAGE_KEYS.WORKOUT_STATUS}_${userId}`);
      console.log('✅ Cleared workout posting status for user');
    } catch (error) {
      console.error('❌ Error clearing workout status:', error);
      throw error;
    }
  }

  /**
   * Get merge statistics for UI display
   */
  async getMergeStats(userId: string): Promise<{
    totalWorkouts: number;
    healthKitWorkouts: number;
    nostrWorkouts: number;
    syncedToNostr: number;
    postedToSocial: number;
    lastMergeAt?: string;
  }> {
    try {
      const result = await this.getMergedWorkouts(userId);
      const lastMergeData = await AsyncStorage.getItem(
        `${STORAGE_KEYS.LAST_MERGE}_${userId}`
      );

      const syncedCount = result.allWorkouts.filter(
        (w) => w.syncedToNostr
      ).length;
      const postedCount = result.allWorkouts.filter(
        (w) => w.postedToSocial
      ).length;

      return {
        totalWorkouts: result.allWorkouts.length,
        healthKitWorkouts: result.healthKitCount,
        nostrWorkouts: result.nostrCount,
        syncedToNostr: syncedCount,
        postedToSocial: postedCount,
        lastMergeAt: lastMergeData || undefined,
      };
    } catch (error) {
      console.error('❌ Error getting merge stats:', error);
      return {
        totalWorkouts: 0,
        healthKitWorkouts: 0,
        nostrWorkouts: 0,
        syncedToNostr: 0,
        postedToSocial: 0,
      };
    }
  }
}

export default WorkoutMergeService.getInstance();
