/**
 * GarminActivityService - Fetch and sync workouts from Garmin Connect
 * Mirrors HealthKitService architecture for consistency
 *
 * Features:
 * - Progressive loading (7-day chunks)
 * - Activity type mapping (Garmin → RUNSTR)
 * - Local caching in AsyncStorage
 * - Deduplication by activity ID
 * - Auto-token refresh on API calls
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WorkoutData, WorkoutType } from '../../types/workout';
import type {
  GarminActivity,
  GarminActivitiesResponse,
  GarminSyncResult,
  GarminServiceStatus,
} from '../../types/garmin';
import { GARMIN_ACTIVITY_TYPE_MAP } from '../../types/garmin';
import { GarminAuthService } from './garminAuthService';

const GARMIN_API_BASE = 'https://apis.garmin.com';

export class GarminActivityService {
  private static instance: GarminActivityService;
  private authService: GarminAuthService;
  private syncInProgress = false;
  private lastSyncAt?: Date;
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private abortController: AbortController | null = null;

  private constructor() {
    this.authService = GarminAuthService.getInstance();
  }

  static getInstance(): GarminActivityService {
    if (!GarminActivityService.instance) {
      GarminActivityService.instance = new GarminActivityService();
    }
    return GarminActivityService.instance;
  }

  /**
   * Initialize service and check authentication
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    const isAuthenticated = await this.authService.checkAuthentication();

    if (!isAuthenticated) {
      return {
        success: false,
        error: 'Not authenticated. Please connect your Garmin account.',
      };
    }

    return { success: true };
  }

  /**
   * Sync workouts from Garmin (last 30 days by default)
   */
  async syncWorkouts(
    userId: string,
    days: number = 30
  ): Promise<GarminSyncResult> {
    if (this.syncInProgress) {
      return { success: false, error: 'Sync already in progress' };
    }

    this.syncInProgress = true;
    console.log(`🏃 Starting Garmin sync for user ${userId} (${days} days)...`);

    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch activities progressively
      const garminActivities = await this.fetchActivitiesProgressive(
        startDate,
        endDate
      );

      console.log(`📊 Fetched ${garminActivities.length} Garmin activities`);

      // Process and save new workouts
      let newWorkouts = 0;
      let skippedWorkouts = 0;

      for (const activity of garminActivities) {
        const normalized = this.normalizeWorkout(activity, userId);
        if (normalized) {
          const saveResult = await this.saveWorkout(normalized);
          if (saveResult === 'saved') {
            newWorkouts++;
          } else if (saveResult === 'skipped') {
            skippedWorkouts++;
          }
        }
      }

      this.lastSyncAt = new Date();
      console.log(
        `✅ Garmin sync complete - ${newWorkouts} new, ${skippedWorkouts} skipped`
      );

      return {
        success: true,
        workoutsCount: garminActivities.length,
        newWorkouts,
        skippedWorkouts,
      };
    } catch (error) {
      console.error('❌ Garmin sync failed:', error);
      return {
        success: false,
        error: `Sync failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Fetch activities progressively in chunks (like HealthKit)
   */
  async fetchActivitiesProgressive(
    startDate: Date,
    endDate: Date,
    onProgress?: (progress: {
      current: number;
      total: number;
      workouts: number;
    }) => void
  ): Promise<GarminActivity[]> {
    this.abortController = new AbortController();

    console.log(
      `📱 Garmin: Starting progressive fetch from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
    );

    try {
      const chunks = this.createDateChunks(startDate, endDate, 7); // 7-day chunks
      const allActivities: GarminActivity[] = [];
      const processedIds = new Set<string>();

      console.log(`📊 Created ${chunks.length} date chunks for fetching`);

      for (let i = 0; i < chunks.length; i++) {
        // Check if aborted
        if (this.abortController.signal.aborted) {
          throw new Error('Sync cancelled');
        }

        const chunk = chunks[i];

        try {
          const activities = await this.fetchActivityChunk(
            chunk.start,
            chunk.end
          );

          // Deduplicate
          const uniqueActivities = activities.filter((a) => {
            if (processedIds.has(a.activityId)) return false;
            processedIds.add(a.activityId);
            return true;
          });

          allActivities.push(...uniqueActivities);

          // Report progress
          onProgress?.({
            current: i + 1,
            total: chunks.length,
            workouts: allActivities.length,
          });

          console.log(
            `📊 Chunk ${i + 1}/${chunks.length} complete, total activities: ${
              allActivities.length
            }`
          );

          // Allow UI to breathe between chunks
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.warn(
            `⚠️ Failed to fetch chunk ${i + 1}/${chunks.length}:`,
            error
          );
          // Continue with next chunk instead of failing entirely
        }
      }

      // Cache the results
      await this.cacheActivities(allActivities);

      console.log(
        `✅ Progressive fetch complete, found ${allActivities.length} activities`
      );

      return allActivities;
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Fetch a single chunk of activities from Garmin API
   */
  private async fetchActivityChunk(
    startDate: Date,
    endDate: Date
  ): Promise<GarminActivity[]> {
    try {
      // Convert dates to Unix timestamps (seconds)
      const uploadStartTime = Math.floor(startDate.getTime() / 1000);
      const uploadEndTime = Math.floor(endDate.getTime() / 1000);

      // Get valid access token (auto-refreshes if needed)
      const accessToken = await this.authService.getAccessToken();

      // Build API URL
      const url = `${GARMIN_API_BASE}/wellness-api/rest/activities?uploadStartTimeInSeconds=${uploadStartTime}&uploadEndTimeInSeconds=${uploadEndTime}`;

      console.log(
        `📱 Querying Garmin activities from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
      );

      // Fetch from Garmin API
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: this.abortController?.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Garmin API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data: GarminActivity[] = await response.json();

      console.log(`📱 Garmin API returned ${data?.length || 0} activities`);

      // Garmin API returns array directly (not wrapped in object)
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('❌ Failed to fetch Garmin activity chunk:', error);
      throw error;
    }
  }

  /**
   * Create date chunks for progressive loading
   */
  private createDateChunks(
    startDate: Date,
    endDate: Date,
    daysPerChunk: number
  ) {
    const chunks = [];
    let current = new Date(startDate);

    while (current < endDate) {
      const chunkEnd = new Date(current);
      chunkEnd.setDate(chunkEnd.getDate() + daysPerChunk);

      chunks.push({
        start: new Date(current),
        end: chunkEnd > endDate ? endDate : chunkEnd,
      });

      current = chunkEnd;
    }

    return chunks;
  }

  /**
   * Normalize Garmin activity to RUNSTR WorkoutData format
   */
  private normalizeWorkout(
    activity: GarminActivity,
    userId: string
  ): WorkoutData | null {
    try {
      // Map Garmin activity type to RUNSTR workout type (default to running, never 'other')
      const workoutType = (GARMIN_ACTIVITY_TYPE_MAP[activity.activityType] ||
        'running') as WorkoutType;

      // Skip very short activities (< 60 seconds)
      if (activity.durationInSeconds < 60) {
        console.log(
          `⏱️  Activity ${activity.activityId} too short (${activity.durationInSeconds}s), skipping`
        );
        return null;
      }

      // Convert Garmin timestamp to ISO string
      // Garmin provides Unix timestamp in seconds + offset for local time
      const startTimeMs =
        (activity.startTimeInSeconds + activity.startTimeOffsetInSeconds) *
        1000;
      const endTimeMs = startTimeMs + activity.durationInSeconds * 1000;

      const startTime = new Date(startTimeMs).toISOString();
      const endTime = new Date(endTimeMs).toISOString();

      return {
        id: `garmin_${activity.activityId}`,
        userId,
        type: workoutType,
        source: 'garmin',
        distance: activity.distanceInMeters
          ? Math.round(activity.distanceInMeters)
          : undefined,
        duration: activity.durationInSeconds,
        calories: activity.activeKilocalories
          ? Math.round(activity.activeKilocalories)
          : undefined,
        startTime,
        endTime,
        syncedAt: new Date().toISOString(),
        metadata: {
          sourceApp: activity.deviceName || 'Garmin Connect',
          garminActivityId: activity.activityId,
          garminActivityType: activity.activityType,
          activityName: activity.activityName,
          syncedVia: 'garmin_activity_service',
          // Include additional metrics based on activity type
          ...(activity.averageSpeedInMetersPerSecond && {
            averageSpeed: activity.averageSpeedInMetersPerSecond,
          }),
          ...(activity.averagePaceInMinutesPerKilometer && {
            averagePace: activity.averagePaceInMinutesPerKilometer,
          }),
          ...(activity.averageHeartRateInBeatsPerMinute && {
            averageHeartRate: activity.averageHeartRateInBeatsPerMinute,
          }),
          ...(activity.steps && { steps: activity.steps }),
          ...(activity.totalElevationGainInMeters && {
            elevationGain: activity.totalElevationGainInMeters,
          }),
        },
      };
    } catch (error) {
      console.error('❌ Error normalizing Garmin activity:', error, activity);
      return null;
    }
  }

  /**
   * Save workout to AsyncStorage cache
   */
  private async saveWorkout(
    workout: WorkoutData
  ): Promise<'saved' | 'skipped' | 'error'> {
    try {
      // Check if workout already exists in cache
      const cacheKey = `garmin_workout_${workout.id}`;
      const existing = await AsyncStorage.getItem(cacheKey);

      if (existing) {
        return 'skipped'; // Already exists
      }

      // Save to local cache
      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({
          ...workout,
          cachedAt: new Date().toISOString(),
        })
      );

      console.log(
        `✅ Cached Garmin workout - ${workout.type}, ${workout.duration}s, ${
          workout.distance
            ? (workout.distance / 1000).toFixed(2) + 'km'
            : 'no distance'
        }`
      );
      return 'saved';
    } catch (error) {
      console.error('❌ Error caching Garmin workout:', error);
      return 'error';
    }
  }

  /**
   * Get recent workouts for UI display (like HealthKit)
   */
  async getRecentWorkouts(userId: string, days: number = 30): Promise<any[]> {
    try {
      console.log(
        `📊 Getting recent Garmin workouts (${days} days) for user ${userId}`
      );

      // Get all cached Garmin workouts for this user
      const keys = await AsyncStorage.getAllKeys();
      const garminKeys = keys.filter((key) =>
        key.startsWith('garmin_workout_')
      );

      if (garminKeys.length === 0) {
        console.log('No cached Garmin workouts found');
        return [];
      }

      const workouts: any[] = [];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      for (const key of garminKeys) {
        try {
          const workoutData = await AsyncStorage.getItem(key);
          if (workoutData) {
            const workout = JSON.parse(workoutData);

            // Filter by user and date
            if (
              workout.userId === userId &&
              new Date(workout.startTime) > cutoffDate
            ) {
              workouts.push(workout);
            }
          }
        } catch (parseError) {
          console.warn(`Failed to parse workout ${key}, skipping`);
          continue;
        }
      }

      // Sort by start time (newest first)
      workouts.sort(
        (a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );

      console.log(`✅ Returning ${workouts.length} Garmin workouts for UI`);
      return workouts;
    } catch (error) {
      console.error('❌ Error getting recent Garmin workouts:', error);
      return [];
    }
  }

  /**
   * Cache activities to AsyncStorage
   */
  private async cacheActivities(activities: GarminActivity[]): Promise<void> {
    try {
      const cacheKey = 'garmin_activities_cache';
      const cacheData = {
        activities,
        timestamp: Date.now(),
        version: '1.0',
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log(`✅ Cached ${activities.length} Garmin activities`);
    } catch (error) {
      console.warn('Failed to cache Garmin activities:', error);
    }
  }

  /**
   * Get service status
   */
  async getStatus(): Promise<GarminServiceStatus> {
    const isAuthenticated = await this.authService.checkAuthentication();

    return {
      available: true,
      authenticated: isAuthenticated,
      syncInProgress: this.syncInProgress,
      lastSyncAt: this.lastSyncAt?.toISOString(),
    };
  }

  /**
   * Cancel ongoing sync
   */
  cancelSync(): void {
    if (this.abortController) {
      this.abortController.abort();
      console.log('🛑 Garmin sync cancelled by user');
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(userId: string): Promise<{
    totalGarminWorkouts: number;
    recentSyncs: number;
    lastSyncDate?: string;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const garminKeys = keys.filter((key) =>
        key.startsWith('garmin_workout_')
      );

      let totalCount = 0;
      let recentCount = 0;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      for (const key of garminKeys) {
        try {
          const workoutData = await AsyncStorage.getItem(key);
          if (workoutData) {
            const workout = JSON.parse(workoutData);
            if (workout.userId === userId) {
              totalCount++;
              if (
                workout.cachedAt &&
                new Date(workout.cachedAt) > sevenDaysAgo
              ) {
                recentCount++;
              }
            }
          }
        } catch (parseError) {
          continue;
        }
      }

      return {
        totalGarminWorkouts: totalCount,
        recentSyncs: recentCount,
        lastSyncDate: this.lastSyncAt?.toISOString(),
      };
    } catch (error) {
      console.error('❌ Error getting Garmin sync stats:', error);
      return {
        totalGarminWorkouts: 0,
        recentSyncs: 0,
      };
    }
  }
}

// Lazy singleton - only initialize when actually used (e.g., Garmin tab)
let _garminActivityServiceInstance: GarminActivityService | null = null;

export function getGarminActivityService(): GarminActivityService {
  if (!_garminActivityServiceInstance) {
    _garminActivityServiceInstance = GarminActivityService.getInstance();
  }
  return _garminActivityServiceInstance;
}

// For backward compatibility - use a Proxy to lazy-init on property access
const garminActivityService = new Proxy({} as GarminActivityService, {
  get(_target, prop) {
    const instance = getGarminActivityService();
    const value = (instance as any)[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});

export default garminActivityService;
