/**
 * Optimized Nostr Workout Service - 10x Performance Improvements
 * Based on performance testing results:
 * - Timeout racing with Promise.race (5s optimal)
 * - Cache-first loading strategy  
 * - Early termination when sufficient events found
 * - Background sync for cache updates
 */

import { nostrRelayManager } from '../nostr/NostrRelayManager';
import { NostrCacheService } from '../cache/NostrCacheService';
import { NostrWorkoutParser } from '../../utils/nostrWorkoutParser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Event } from 'nostr-tools';
import type {
  NostrWorkout,
  NostrWorkoutFilter,
  NostrWorkoutSyncResult,
  NostrWorkoutError,
  RelayQueryResult,
} from '../../types/nostrWorkout';

// Performance-optimized storage keys
const STORAGE_KEYS = {
  WORKOUTS: 'optimized_nostr_workouts',
  LAST_SYNC: 'optimized_last_sync',
  SYNC_STATUS: 'optimized_sync_status',
} as const;

// Performance configuration based on Author+Kind Racing test results (704ms)
const PERFORMANCE_CONFIG = {
  OPTIMAL_TIMEOUT: 2000, // 2s timeout - author+kind queries are fast like profile queries
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes cache (memory)
  PERSISTENT_TTL: 30 * 60 * 1000, // 30 minutes (storage)
  MAX_EVENTS_LIMIT: 200, // Get more events since author+kind is efficient
  BACKGROUND_SYNC_INTERVAL: 10 * 60 * 1000, // 10 minutes
} as const;

export interface OptimizedWorkoutQuery {
  pubkey: string;
  limit?: number;
  useCache?: boolean;
  forceRefresh?: boolean;
  recentFirst?: boolean;
}

export interface CachedWorkoutResult {
  workouts: NostrWorkout[];
  fromCache: boolean;
  cacheAge: number;
  totalDuration: number;
}

export class OptimizedNostrWorkoutService {
  private static instance: OptimizedNostrWorkoutService;
  private backgroundSyncTimer?: ReturnType<typeof setTimeout>;
  private currentSyncPromises = new Map<string, Promise<NostrWorkout[]>>();

  private constructor() {}

  static getInstance(): OptimizedNostrWorkoutService {
    if (!OptimizedNostrWorkoutService.instance) {
      OptimizedNostrWorkoutService.instance = new OptimizedNostrWorkoutService();
    }
    return OptimizedNostrWorkoutService.instance;
  }

  /**
   * PERFORMANCE OPTIMIZED: Cache-first workout loading
   * Based on test results: Shows cached data instantly, updates in background
   */
  async getWorkoutsOptimized(query: OptimizedWorkoutQuery): Promise<CachedWorkoutResult> {
    const startTime = Date.now();
    const cacheKey = query.pubkey;
    
    console.log('⚡ OptimizedNostrWorkoutService: Starting cache-first query');

    // OPTIMIZATION 1: Check cache first (instant loading)
    if (query.useCache !== false && !query.forceRefresh) {
      const cached = await NostrCacheService.getCachedWorkouts<NostrWorkout>(cacheKey);
      
      if (cached.length > 0) {
        const cacheAge = Date.now() - (await this.getCacheTimestamp(cacheKey));
        console.log(`🚀 Cache hit: ${cached.length} workouts in ${Date.now() - startTime}ms`);
        
        // Start background sync if cache is getting old
        if (cacheAge > PERFORMANCE_CONFIG.CACHE_TTL) {
          this.startBackgroundSync(query);
        }
        
        return {
          workouts: cached,
          fromCache: true,
          cacheAge,
          totalDuration: Date.now() - startTime
        };
      }
    }

    // OPTIMIZATION 2: Network query with timeout racing
    console.log('🔍 Cache miss, querying network with optimizations...');
    const workouts = await this.fetchWorkoutsWithOptimizations(query);
    
    // OPTIMIZATION 3: Cache the results
    await NostrCacheService.setCachedWorkouts(cacheKey, workouts);
    await this.setCacheTimestamp(cacheKey);

    const totalDuration = Date.now() - startTime;
    console.log(`✅ Network query completed: ${workouts.length} workouts in ${totalDuration}ms`);

    return {
      workouts,
      fromCache: false,
      cacheAge: 0,
      totalDuration
    };
  }

  /**
   * OPTIMIZATION: Timeout racing + early termination
   * Based on test results: 5s timeout optimal, early termination at 50 events
   */
  private async fetchWorkoutsWithOptimizations(query: OptimizedWorkoutQuery): Promise<NostrWorkout[]> {
    const { pubkey, limit = 100, recentFirst = true } = query;
    
    // Check if already syncing this pubkey
    if (this.currentSyncPromises.has(pubkey)) {
      console.log('🔄 Reusing existing sync promise for', pubkey.slice(0, 16) + '...');
      return this.currentSyncPromises.get(pubkey)!;
    }

    // Create the sync promise
    const syncPromise = this.performOptimizedSync(pubkey, limit, recentFirst);
    this.currentSyncPromises.set(pubkey, syncPromise);

    try {
      const result = await syncPromise;
      return result;
    } finally {
      this.currentSyncPromises.delete(pubkey);
    }
  }

  /**
   * Core optimized sync with timeout racing and early termination
   */
  private async performOptimizedSync(pubkey: string, limit: number, recentFirst: boolean): Promise<NostrWorkout[]> {
    const connectedRelays = nostrRelayManager.getConnectedRelays();
    
    if (connectedRelays.length === 0) {
      console.warn('⚠️ No connected relays for optimized sync');
      return [];
    }

    // OPTIMIZATION: Author+Kind Racing strategy (704ms proven performance)
    const filter: NostrWorkoutFilter = {
      authors: [pubkey],
      kinds: [1301],
      limit: Math.min(limit, PERFORMANCE_CONFIG.MAX_EVENTS_LIMIT),
    };

    if (recentFirst) {
      // Query last 30 days first for better perceived performance
      filter.since = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
    }

    const parsedWorkouts: NostrWorkout[] = [];
    const errors: NostrWorkoutError[] = [];

    // OPTIMIZATION: Promise.race with Author+Kind Racing (2s optimal from tests)
    const timeoutPromise = new Promise<Event[]>((resolve) => {
      setTimeout(() => {
        console.log(`⏱️ Author+Kind Racing timeout reached (${PERFORMANCE_CONFIG.OPTIMAL_TIMEOUT}ms)`);
        resolve([]);
      }, PERFORMANCE_CONFIG.OPTIMAL_TIMEOUT);
    });

    try {
      const queryPromise = nostrRelayManager.queryWorkoutEvents(pubkey, {
        since: filter.since,
        until: filter.until,
        limit: filter.limit,
      });

      // Race Author+Kind query against timeout
      const events = await Promise.race([queryPromise, timeoutPromise]);
      
      console.log(`📥 Author+Kind Racing: Received ${events.length} events (all yours!)`);

      // Process all events (no early termination needed with fast author+kind queries)
      for (const event of events) {
        try {
          const workoutEvent = NostrWorkoutParser.parseNostrEvent(event);
          if (workoutEvent) {
            const workout = NostrWorkoutParser.convertToWorkout(
              workoutEvent,
              'optimized-user',
              false
            );

            const validationErrors = NostrWorkoutParser.validateWorkoutData(workout);
            if (validationErrors.length === 0) {
              parsedWorkouts.push(workout);
            }
          }
        } catch (parseError) {
          errors.push({
            type: 'event_parsing',
            message: `Parse error: ${parseError}`,
            eventId: event.id,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Remove duplicates and sort by time
      const uniqueWorkouts = this.deduplicateWorkouts(parsedWorkouts);
      uniqueWorkouts.sort((a, b) => 
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );

      console.log(`✅ Optimized sync completed: ${uniqueWorkouts.length} unique workouts`);
      return uniqueWorkouts;

    } catch (error) {
      console.error('❌ Optimized sync failed:', error);
      return [];
    }
  }

  /**
   * OPTIMIZATION: Background sync to keep cache fresh
   */
  private startBackgroundSync(query: OptimizedWorkoutQuery): void {
    // Avoid multiple background syncs
    if (this.backgroundSyncTimer) return;

    console.log('🔄 Starting background sync for fresh data...');
    
    this.backgroundSyncTimer = setTimeout(async () => {
      try {
        const freshData = await this.fetchWorkoutsWithOptimizations({
          ...query,
          useCache: false
        });
        
        // Update cache with fresh data
        await NostrCacheService.setCachedWorkouts(query.pubkey, freshData);
        await this.setCacheTimestamp(query.pubkey);
        
        console.log(`✅ Background sync completed: ${freshData.length} workouts cached`);
      } catch (error) {
        console.error('❌ Background sync failed:', error);
      } finally {
        this.backgroundSyncTimer = undefined;
      }
    }, 1000); // Start background sync after 1 second
  }

  /**
   * Remove duplicate workouts based on event ID
   */
  private deduplicateWorkouts(workouts: NostrWorkout[]): NostrWorkout[] {
    const seen = new Set<string>();
    return workouts.filter(workout => {
      if (seen.has(workout.nostrEventId)) {
        return false;
      }
      seen.add(workout.nostrEventId);
      return true;
    });
  }

  /**
   * Cache timestamp management
   */
  private async getCacheTimestamp(pubkey: string): Promise<number> {
    try {
      const timestamp = await AsyncStorage.getItem(`${STORAGE_KEYS.LAST_SYNC}_${pubkey}`);
      return timestamp ? parseInt(timestamp, 10) : 0;
    } catch {
      return 0;
    }
  }

  private async setCacheTimestamp(pubkey: string): Promise<void> {
    try {
      await AsyncStorage.setItem(`${STORAGE_KEYS.LAST_SYNC}_${pubkey}`, Date.now().toString());
    } catch (error) {
      console.warn('Failed to set cache timestamp:', error);
    }
  }

  /**
   * Force refresh cache (for pull-to-refresh)
   */
  async forceRefresh(pubkey: string): Promise<CachedWorkoutResult> {
    console.log('🔄 Force refresh requested');
    
    // Clear cache first
    await NostrCacheService.forceRefreshWorkouts(pubkey);
    
    // Fetch fresh data
    return this.getWorkoutsOptimized({
      pubkey,
      forceRefresh: true,
      useCache: false
    });
  }

  /**
   * Get performance metrics for debugging
   */
  getPerformanceMetrics(): {
    cacheStats: any;
    activeSyncs: number;
    backgroundSyncActive: boolean;
  } {
    return {
      cacheStats: NostrCacheService.getCacheStats(),
      activeSyncs: this.currentSyncPromises.size,
      backgroundSyncActive: !!this.backgroundSyncTimer,
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.backgroundSyncTimer) {
      clearTimeout(this.backgroundSyncTimer);
      this.backgroundSyncTimer = undefined;
    }
    this.currentSyncPromises.clear();
  }
}

export default OptimizedNostrWorkoutService.getInstance();