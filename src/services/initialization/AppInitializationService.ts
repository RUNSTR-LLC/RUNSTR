/**
 * AppInitializationService - Centralized app data initialization
 * Coordinates background data fetching for workouts, season data, and teams
 * Runs after authentication without blocking UI
 */

import { WorkoutCacheService } from '../cache/WorkoutCacheService';
import { season1Service } from '../season/Season1Service';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class AppInitializationService {
  private static instance: AppInitializationService;
  private isInitialized = false;
  private isInitializing = false;

  private constructor() {}

  static getInstance(): AppInitializationService {
    if (!AppInitializationService.instance) {
      AppInitializationService.instance = new AppInitializationService();
    }
    return AppInitializationService.instance;
  }

  /**
   * Initialize all app data after authentication
   * Non-blocking - runs in background
   */
  async initializeAppData(pubkey: string): Promise<void> {
    if (this.isInitializing || this.isInitialized) {
      console.log('[AppInit] Already initialized or initializing, skipping...');
      return;
    }

    this.isInitializing = true;
    console.log('[AppInit] 🚀 Starting app data initialization...');

    try {
      // Run all initializations in parallel (non-blocking)
      await Promise.allSettled([
        this.warmUpWorkoutCache(pubkey),
        this.prefetchSeasonData(),
        this.warmUpTeamData(),
      ]);

      this.isInitialized = true;
      console.log('[AppInit] ✅ App data initialization complete');
    } catch (error) {
      console.error('[AppInit] ❌ Initialization error:', error);
      // Don't throw - app can still function with partial data
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Warm up workout cache for instant display
   * Fetches from cache if available, triggers background refresh if stale
   */
  private async warmUpWorkoutCache(pubkey: string): Promise<void> {
    try {
      console.log('[AppInit] 🏃 Warming up workout cache...');
      const cacheService = WorkoutCacheService.getInstance();

      // Get cached workouts immediately (non-blocking)
      const result = await cacheService.getMergedWorkouts(pubkey, 500);

      console.log(
        `[AppInit] ✅ Workout cache warm-up complete: ${result.allWorkouts.length} workouts (fromCache: ${result.fromCache})`
      );

      // Log cache status for debugging
      const cacheStatus = await cacheService.getCacheStatus();
      console.log('[AppInit] 📊 Cache status:', {
        hasCachedData: cacheStatus.hasCachedData,
        cacheAge: cacheStatus.cacheAge ? `${Math.round(cacheStatus.cacheAge / 1000)}s` : 'N/A',
        workoutCount: cacheStatus.workoutCount,
        healthKitCount: cacheStatus.healthKitCount,
        nostrCount: cacheStatus.nostrCount,
      });
    } catch (error) {
      console.error('[AppInit] ⚠️ Workout cache warm-up failed:', error);
      // Non-critical - workouts will load on demand
    }
  }

  /**
   * Prefetch Season 1 competition data
   * Caches participant lists and leaderboards
   */
  private async prefetchSeasonData(): Promise<void> {
    try {
      console.log('[AppInit] 🏆 Prefetching Season 1 data...');

      // Use Season1Service's built-in prefetch method
      await season1Service.prefetchAll();

      console.log('[AppInit] ✅ Season 1 data prefetch complete');
    } catch (error) {
      console.error('[AppInit] ⚠️ Season data prefetch failed:', error);
      // Non-critical - season data will load on demand
    }
  }

  /**
   * Warm up team data cache
   * Placeholder for future team cache warming
   */
  private async warmUpTeamData(): Promise<void> {
    try {
      console.log('[AppInit] 👥 Warming up team data...');

      // TODO: Add team cache warming when TeamCacheService is enhanced
      // For now, just log that it's a placeholder

      console.log('[AppInit] ℹ️ Team data warm-up placeholder (no action needed)');
    } catch (error) {
      console.error('[AppInit] ⚠️ Team data warm-up failed:', error);
    }
  }

  /**
   * Reset initialization state (for logout/re-login)
   */
  reset(): void {
    this.isInitialized = false;
    this.isInitializing = false;
    console.log('[AppInit] 🔄 Initialization state reset');
  }

  /**
   * Check if app data has been initialized
   */
  getInitializationStatus(): {
    isInitialized: boolean;
    isInitializing: boolean;
  } {
    return {
      isInitialized: this.isInitialized,
      isInitializing: this.isInitializing,
    };
  }
}

// Export singleton instance
export const appInitializationService = AppInitializationService.getInstance();
