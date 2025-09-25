/**
 * WorkoutCacheService - Caching layer for workout data
 * Implements 3-minute TTL for workout merge results with background refresh
 */

import { appCache } from '../../utils/cache';
import {
  WorkoutMergeService,
  type UnifiedWorkout,
  type WorkoutMergeResult,
} from '../fitness/workoutMergeService';

export class WorkoutCacheService {
  private static instance: WorkoutCacheService;
  private mergeService: WorkoutMergeService;
  private isRefreshing = false;
  private lastRefreshTime = 0;

  // Cache keys
  private readonly CACHE_KEY = 'user_workouts_merged';
  private readonly TIMESTAMP_KEY = 'workouts_merge_time';
  private readonly VERSION_KEY = 'workouts_cache_version';

  // Cache versioning - bump this when cache structure changes
  private readonly CACHE_VERSION = '2.0.0'; // Updated for NIP-101e compliance

  // Cache TTL: 24 hours for long-term cache, 30 minutes for quick refresh
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly QUICK_REFRESH_TTL = 30 * 60 * 1000; // 30 minutes (increased from 3 minutes)

  // Background refresh after 2 minutes
  private readonly BACKGROUND_REFRESH_TIME = 2 * 60 * 1000;

  private constructor() {
    this.mergeService = WorkoutMergeService.getInstance();
  }

  static getInstance(): WorkoutCacheService {
    if (!WorkoutCacheService.instance) {
      WorkoutCacheService.instance = new WorkoutCacheService();
    }
    return WorkoutCacheService.instance;
  }

  /**
   * Get merged workouts with cache-first strategy and version checking
   * Returns cached data immediately if available and valid, triggers background refresh if stale
   */
  async getMergedWorkouts(limit = 100): Promise<WorkoutMergeResult> {
    console.log('📦 WorkoutCacheService: Fetching merged workouts...');

    // Check cache version first
    const cacheVersion = await appCache.get<string>(this.VERSION_KEY);

    if (cacheVersion !== this.CACHE_VERSION) {
      console.log(`🔄 Cache version mismatch (${cacheVersion} vs ${this.CACHE_VERSION}), clearing cache...`);
      await this.clearCache();
      return this.fetchAndCacheWorkouts(limit);
    }

    // Check cache with TTL validation
    const cachedResult = await appCache.get<WorkoutMergeResult>(this.CACHE_KEY);
    const cacheTime = await appCache.get<number>(this.TIMESTAMP_KEY);

    if (cachedResult && cachedResult.allWorkouts.length > 0 && cacheTime) {
      const cacheAge = Date.now() - cacheTime;

      // Check if cache is expired (24 hours)
      if (cacheAge > this.CACHE_TTL) {
        console.log('⏰ WorkoutCacheService: Cache expired (>24h), fetching fresh data...');
        return this.fetchAndCacheWorkouts(limit);
      }

      console.log(
        `✅ WorkoutCacheService: Returning ${cachedResult.allWorkouts.length} cached workouts (age: ${Math.round(cacheAge / 1000)}s)`
      );

      // Add cache metadata
      cachedResult.fromCache = true;
      cachedResult.cacheAge = cacheAge;

      // Check if background refresh is needed (after 2 minutes)
      if (cacheAge > this.BACKGROUND_REFRESH_TIME) {
        this.refreshInBackground(limit);
      }

      return cachedResult;
    }

    // No cache or invalid cache, fetch fresh data
    console.log('🔄 WorkoutCacheService: Cache miss, fetching fresh workouts...');
    return this.fetchAndCacheWorkouts(limit);
  }

  /**
   * Force refresh workouts (used for pull-to-refresh)
   */
  async refreshWorkouts(limit = 100): Promise<WorkoutMergeResult> {
    console.log('🔄 WorkoutCacheService: Force refreshing workouts...');
    return this.fetchAndCacheWorkouts(limit);
  }

  /**
   * Fetch workouts from services and update cache with versioning
   */
  private async fetchAndCacheWorkouts(limit: number): Promise<WorkoutMergeResult> {
    const startTime = Date.now();

    try {
      // Fetch merged workouts from both HealthKit and Nostr
      const result = await this.mergeService.getMergedWorkouts(limit);

      if (result && result.allWorkouts.length > 0) {
        // Cache the result with version and timestamp
        await appCache.set(this.CACHE_KEY, result, this.CACHE_TTL);
        await appCache.set(this.TIMESTAMP_KEY, Date.now(), this.CACHE_TTL);
        await appCache.set(this.VERSION_KEY, this.CACHE_VERSION, this.CACHE_TTL);

        console.log(
          `✅ WorkoutCacheService: Cached ${result.allWorkouts.length} workouts (v${this.CACHE_VERSION})`
        );
      }

      // Add performance metadata
      result.fromCache = false;
      result.loadDuration = Date.now() - startTime;

      return result;
    } catch (error) {
      console.error('❌ WorkoutCacheService: Error fetching workouts:', error);

      // Try to return stale cache if available
      const staleCachedResult = await appCache.get<WorkoutMergeResult>(this.CACHE_KEY);
      if (staleCachedResult) {
        console.log('⚠️ WorkoutCacheService: Returning stale cache due to error');
        staleCachedResult.fromCache = true;
        return staleCachedResult;
      }

      // Return empty result if all else fails
      return {
        allWorkouts: [],
        healthKitCount: 0,
        nostrCount: 0,
        duplicateCount: 0,
        fromCache: false,
        loadDuration: Date.now() - startTime,
      };
    }
  }

  /**
   * Background refresh without blocking UI
   */
  private async refreshInBackground(limit: number): Promise<void> {
    // Prevent multiple simultaneous refreshes
    if (this.isRefreshing) {
      return;
    }

    // Rate limit background refreshes (max once per 30 seconds)
    if (Date.now() - this.lastRefreshTime < 30000) {
      return;
    }

    this.isRefreshing = true;
    this.lastRefreshTime = Date.now();

    console.log('🔄 WorkoutCacheService: Starting background refresh...');

    try {
      const result = await this.mergeService.getMergedWorkouts(limit);

      if (result && result.allWorkouts.length > 0) {
        await appCache.set(this.CACHE_KEY, result, this.CACHE_TTL);
        await appCache.set(this.TIMESTAMP_KEY, Date.now(), this.CACHE_TTL);
        console.log(
          `✅ WorkoutCacheService: Background refresh complete, ${result.allWorkouts.length} workouts updated`
        );
      }
    } catch (error) {
      console.error('❌ WorkoutCacheService: Background refresh failed:', error);
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Update posting status for a specific workout
   * This updates the cache without requiring a full refresh
   */
  async updateWorkoutStatus(
    workoutId: string,
    updates: {
      syncedToNostr?: boolean;
      postedToSocial?: boolean;
      nostrEventId?: string;
    }
  ): Promise<void> {
    const cachedResult = await appCache.get<WorkoutMergeResult>(this.CACHE_KEY);

    if (cachedResult) {
      // Find and update the workout
      const workout = cachedResult.allWorkouts.find((w) => w.id === workoutId);
      if (workout) {
        Object.assign(workout, updates);

        // Update cache with modified data
        await appCache.set(this.CACHE_KEY, cachedResult, this.CACHE_TTL);
        console.log(`✅ WorkoutCacheService: Updated status for workout ${workoutId}`);
      }
    }

    // Also update in the merge service for persistence
    await this.mergeService.updateWorkoutStatus({
      workoutId,
      ...updates,
    });
  }

  /**
   * Clear workout cache (used on logout or manual refresh)
   */
  async clearCache(): Promise<void> {
    await appCache.clear('workout');
    console.log('🧹 WorkoutCacheService: Cache cleared');
  }

  /**
   * Get cache status for debugging
   */
  async getCacheStatus(): Promise<{
    hasCachedData: boolean;
    cacheAge: number | null;
    workoutCount: number;
    healthKitCount: number;
    nostrCount: number;
  }> {
    const cachedResult = await appCache.get<WorkoutMergeResult>(this.CACHE_KEY);
    const cacheTime = await appCache.get<number>(this.TIMESTAMP_KEY);

    return {
      hasCachedData: !!cachedResult,
      cacheAge: cacheTime ? Date.now() - cacheTime : null,
      workoutCount: cachedResult?.allWorkouts.length || 0,
      healthKitCount: cachedResult?.healthKitCount || 0,
      nostrCount: cachedResult?.nostrCount || 0,
    };
  }
}