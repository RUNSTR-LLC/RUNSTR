/**
 * Workout Merge Service - Enhanced with Deduplication and Subscription Management
 * Focuses on kind 1301 events using proven nuclear approach
 * Tracks posting status for UI state management (manual "Save to Nostr" workflow)
 * Includes proper deduplication between HealthKit and Nostr workouts
 * Manages NDK subscriptions to prevent memory leaks
 */

import { NostrWorkoutService } from './nostrWorkoutService';
import { NostrCacheService } from '../cache/NostrCacheService';
import { HealthKitService } from './healthKitService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Workout, WorkoutType } from '../../types/workout';
import type { NostrWorkout } from '../../types/nostrWorkout';
import type { HealthKitWorkout } from './healthKitService';

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
  // OPTIMIZATION: Performance tracking
  fromCache?: boolean;
  loadDuration?: number;
  cacheAge?: number;
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
  private healthKitService: HealthKitService;
  private subscriptions: Set<any> = new Set();
  private ndk: any = null;

  private constructor() {
    this.nostrWorkoutService = NostrWorkoutService.getInstance();
    this.healthKitService = HealthKitService.getInstance();
    this.initializeNDK();
  }

  /**
   * Initialize NDK with global instance reuse
   */
  private initializeNDK() {
    // Reuse global instance
    const g = globalThis as any;
    this.ndk = g.__RUNSTR_NDK_INSTANCE__;

    if (!this.ndk) {
      console.warn('NDK not initialized - will initialize on first use');
    }
  }

  static getInstance(): WorkoutMergeService {
    if (!WorkoutMergeService.instance) {
      WorkoutMergeService.instance = new WorkoutMergeService();
    }
    return WorkoutMergeService.instance;
  }

  /**
   * Enhanced: Get merged workouts with proper deduplication between HealthKit and Nostr
   */
  async getMergedWorkouts(userId: string, pubkey?: string): Promise<WorkoutMergeResult> {
    const startTime = Date.now();

    try {
      console.log('⚡ Enhanced: Fetching and merging workouts for user', userId);

      if (!pubkey) {
        console.log('❌ No pubkey provided - returning empty results');
        return {
          allWorkouts: [],
          healthKitCount: 0,
          nostrCount: 0,
          duplicateCount: 0,
          fromCache: false,
          loadDuration: Date.now() - startTime,
          cacheAge: 0,
        };
      }

      // Check cache first for performance
      const cachedWorkouts = await this.healthKitService.getCachedWorkouts();
      let healthKitWorkouts: HealthKitWorkout[] = [];

      if (cachedWorkouts && cachedWorkouts.length > 0) {
        console.log(`📦 Using ${cachedWorkouts.length} cached HealthKit workouts`);
        healthKitWorkouts = cachedWorkouts;
      } else if (HealthKitService.isAvailable()) {
        // Fetch HealthKit workouts progressively
        console.log('🔄 Fetching HealthKit workouts progressively...');
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = new Date();

        try {
          healthKitWorkouts = await this.healthKitService.fetchWorkoutsProgressive(
            startDate,
            endDate,
            (progress) => {
              console.log(`📊 Progress: ${progress.current}/${progress.total} chunks, ${progress.workouts} workouts`);
            }
          );
        } catch (hkError) {
          console.warn('⚠️ HealthKit fetch failed, continuing with Nostr only:', hkError);
        }
      }

      // Fetch Nostr workouts
      const [nostrWorkouts, postingStatus] = await Promise.all([
        this.fetchNostrWorkouts(userId, pubkey),
        this.getWorkoutPostingStatus(userId),
      ]);

      console.log(`📊 Found ${healthKitWorkouts.length} HealthKit, ${nostrWorkouts.length} Nostr workouts`);

      // Deduplicate and merge
      const mergedResult = this.mergeAndDeduplicate(
        healthKitWorkouts,
        nostrWorkouts,
        postingStatus
      );

      // Cache the results
      if (nostrWorkouts.length > 0) {
        await NostrCacheService.setCachedWorkouts(pubkey, nostrWorkouts);
        await this.setCacheTimestamp(userId);
      }

      console.log(`✅ Merged: ${mergedResult.allWorkouts.length} total, ${mergedResult.duplicateCount} duplicates removed`);

      return {
        ...mergedResult,
        fromCache: cachedWorkouts !== null,
        loadDuration: Date.now() - startTime,
        cacheAge: 0,
      };
    } catch (error) {
      console.error('❌ WorkoutMergeService: Error fetching workouts:', error);
      throw new Error('Failed to fetch workout data');
    } finally {
      // Always cleanup subscriptions
      this.cleanupSubscriptions();
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
   * Fetch Nostr workouts with proper subscription management
   */
  private async fetchNostrWorkouts(userId: string, pubkey?: string): Promise<NostrWorkout[]> {
    try {
      if (!pubkey) {
        console.log('⚠️ No pubkey provided - returning empty array');
        return [];
      }

      console.log('🚀 Fetching Nostr workouts with nuclear approach...');

      const { nip19 } = await import('nostr-tools');
      const NDK = await import('@nostr-dev-kit/ndk');

      let hexPubkey = this.ensureHexPubkey(pubkey);

      console.log(`📊 NDK Query: Getting kind 1301 events for ${hexPubkey.slice(0, 16)}...`);

      // Initialize NDK if needed
      if (!this.ndk) {
        const g = globalThis as any;
        this.ndk = g.__RUNSTR_NDK_INSTANCE__;

        if (!this.ndk) {
          console.log('[NDK Workout] Creating NDK instance...');
          const relayUrls = [
            'wss://relay.damus.io',
            'wss://nos.lol',
            'wss://relay.primal.net',
            'wss://nostr.wine',
            'wss://relay.nostr.band',
            'wss://relay.snort.social',
            'wss://nostr-pub.wellorder.net',
            'wss://relay.nostrich.de',
            'wss://nostr.oxtr.dev',
            'wss://relay.wellorder.net',
          ];

          this.ndk = new NDK.default({
            explicitRelayUrls: relayUrls
          });

          await this.ndk.connect();
          g.__RUNSTR_NDK_INSTANCE__ = this.ndk; // Store globally
          console.log('[NDK Workout] Connected to relays');
        }
      }

      const events = new Set<any>();

      // Nuclear filter - minimal restrictions
      const nuclearFilter = {
        kinds: [1301],
        authors: [hexPubkey],
        limit: 500
      };

      console.log('🚀 NDK Filter:', nuclearFilter);

      // Create subscription with timeout
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          subscription.stop();
          this.subscriptions.delete(subscription);
          resolve(Array.from(events));
        }, 5000); // 5 second timeout

        const subscription = this.ndk.subscribe(nuclearFilter, {
          closeOnEose: false,
          groupable: true
        });

        // Track subscription for cleanup
        this.subscriptions.add(subscription);

        subscription.on('event', (event: any) => {
          if (event.kind === 1301) {
            events.add(event);
            console.log(`📥 Event ${events.size}: ${event.id?.slice(0, 8)}`);
          }
        });

        subscription.on('eose', () => {
          console.log('📨 EOSE received - found', events.size, 'events');
          clearTimeout(timeout);
          subscription.stop();
          this.subscriptions.delete(subscription);
          resolve(Array.from(events));
        });

        subscription.on('error', (error: any) => {
          console.error('Nostr subscription error:', error);
          clearTimeout(timeout);
          subscription.stop();
          this.subscriptions.delete(subscription);
          resolve(Array.from(events)); // Return partial results
        });
      }) as Promise<any[]>;

      return result.then((events: any[]) => {
        console.log(`🚀 Found ${events.length} raw 1301 events`);

        // Parse events into NostrWorkout format
        const workouts: NostrWorkout[] = [];

        for (const event of events) {
          try {
            const tags = event.tags || [];
            let workoutType = 'unknown';
            let duration = 0;
            let distance = 0;
            let calories = 0;

            // Extract workout data from tags
            for (const tag of tags) {
              if (tag[0] === 'exercise' && tag[1]) workoutType = tag[1];
              if (tag[0] === 'duration' && tag[1]) {
                const timeStr = tag[1];
                const parts = timeStr.split(':').map((p: string) => parseInt(p));
                if (parts.length === 3) {
                  duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
                } else if (parts.length === 2) {
                  duration = parts[0] * 60 + parts[1];
                } else {
                  duration = parseInt(timeStr) || 0;
                }
              }
              if (tag[0] === 'distance' && tag[1]) distance = parseFloat(tag[1]) || 0;
              if (tag[0] === 'calories' && tag[1]) calories = parseInt(tag[1]) || 0;
            }

            const workout: NostrWorkout = {
              id: event.id,
              userId: userId,
              type: workoutType as any,
              startTime: new Date(event.created_at * 1000).toISOString(),
              endTime: new Date((event.created_at + Math.max(duration, 60)) * 1000).toISOString(),
              duration: duration,
              distance: distance,
              calories: calories,
              source: 'nostr',
              nostrEventId: event.id,
              nostrPubkey: event.pubkey,
              sourceApp: 'nostr_discovery',
              nostrCreatedAt: event.created_at,
              unitSystem: 'metric' as const,
              syncedAt: new Date().toISOString()
            };

            workouts.push(workout);
          } catch (error) {
            console.warn(`⚠️ Error parsing event ${event.id}:`, error);
          }
        }

        return workouts.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      });
    } catch (error) {
      console.error('❌ Nostr workout discovery failed:', error);
      return [];
    }
  }


  /**
   * SIMPLIFIED: Convert Nostr workouts to unified format (no merge complexity)
   */
  private convertNostrToUnified(
    nostrWorkouts: NostrWorkout[],
    postingStatus: Map<string, WorkoutStatusUpdate>
  ): UnifiedWorkout[] {
    console.log('🔧 SIMPLIFIED: Converting Nostr workouts to unified format');
    
    const unifiedWorkouts: UnifiedWorkout[] = nostrWorkouts.map(nostrWorkout => ({
      ...nostrWorkout,
      // Nostr workouts are already synced (since they're from kind 1301 events)
      syncedToNostr: true,
      postedToSocial: postingStatus.get(nostrWorkout.id)?.postedToSocial || false,
      postingInProgress: false,
      canSyncToNostr: false, // Already synced to Nostr
      canPostToSocial: true, // Can always post to social
    }));

    // Sort by start time (newest first)
    unifiedWorkouts.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    console.log(`✅ SIMPLIFIED: Converted ${unifiedWorkouts.length} Nostr workouts`);
    return unifiedWorkouts;
  }

  /**
   * Merge and deduplicate HealthKit and Nostr workouts
   */
  private mergeAndDeduplicate(
    healthKitWorkouts: HealthKitWorkout[],
    nostrWorkouts: NostrWorkout[],
    postingStatus: Map<string, WorkoutStatusUpdate>
  ): WorkoutMergeResult {
    const unified: UnifiedWorkout[] = [];
    let duplicateCount = 0;

    // Add HealthKit workouts and check for duplicates in Nostr
    for (const hkWorkout of healthKitWorkouts) {
      const isDupe = this.isDuplicate(hkWorkout, nostrWorkouts);

      if (isDupe) {
        duplicateCount++;
      }

      const unifiedWorkout: UnifiedWorkout = {
        id: hkWorkout.id || `healthkit_${hkWorkout.UUID}`,
        userId: '', // Will be set by caller
        type: (hkWorkout.activityType || 'other') as WorkoutType,
        startTime: hkWorkout.startDate,
        endTime: hkWorkout.endDate,
        duration: hkWorkout.duration,
        distance: hkWorkout.totalDistance ? hkWorkout.totalDistance * 1000 : 0, // km to m
        calories: hkWorkout.totalEnergyBurned || 0,
        source: 'healthkit',
        syncedToNostr: isDupe,
        postedToSocial: false,
        canSyncToNostr: !isDupe, // Can sync if not already in Nostr
        canPostToSocial: true,
      };

      unified.push(unifiedWorkout);
    }

    // Add Nostr-only workouts (not matching any HealthKit workout)
    for (const nostrWorkout of nostrWorkouts) {
      const matchingHK = healthKitWorkouts.find(hk =>
        this.isDuplicate(hk, [nostrWorkout])
      );

      if (!matchingHK) {
        const status = postingStatus.get(nostrWorkout.id);
        unified.push({
          ...nostrWorkout,
          syncedToNostr: true,
          postedToSocial: status?.postedToSocial || false,
          postingInProgress: false,
          canSyncToNostr: false, // Already in Nostr
          canPostToSocial: true,
        });
      }
    }

    // Sort by start time (newest first)
    unified.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    return {
      allWorkouts: unified,
      healthKitCount: healthKitWorkouts.length,
      nostrCount: nostrWorkouts.length,
      duplicateCount,
    };
  }

  /**
   * Check if a workout is a duplicate based on time window and stats
   */
  private isDuplicate(
    workout1: HealthKitWorkout | any,
    workouts2: any[]
  ): boolean {
    return workouts2.some(w2 => {
      // Time window check (within 2 minutes)
      const time1 = new Date(workout1.startDate || workout1.startTime).getTime();
      const time2 = new Date(w2.startTime).getTime();
      const timeDiff = Math.abs(time1 - time2);

      if (timeDiff > 120000) return false; // More than 2 minutes apart

      // Activity type check
      const type1 = workout1.activityType || workout1.type;
      const type2 = w2.type;
      if (type1 !== type2) return false;

      // Distance check (within 5% tolerance if both have distance)
      const dist1 = workout1.totalDistance || workout1.distance || 0;
      const dist2 = w2.distance || 0;

      if (dist1 > 0 && dist2 > 0) {
        const distanceDiff = Math.abs(dist1 - dist2);
        const tolerance = Math.max(dist1, dist2) * 0.05;
        if (distanceDiff > tolerance) return false;
      }

      // Duration check (within 60 seconds tolerance)
      const dur1 = workout1.duration || 0;
      const dur2 = w2.duration || 0;
      if (Math.abs(dur1 - dur2) > 60) return false;

      return true; // It's a duplicate
    });
  }

  /**
   * Ensure pubkey is in hex format
   */
  private ensureHexPubkey(pubkey: string): string {
    if (pubkey.startsWith('npub')) {
      try {
        const { nip19 } = require('nostr-tools');
        const decoded = nip19.decode(pubkey);
        return decoded.data as string;
      } catch (error) {
        console.error('Failed to decode npub:', error);
        return pubkey;
      }
    }
    return pubkey;
  }

  /**
   * Cleanup all active subscriptions
   */
  private cleanupSubscriptions(): void {
    this.subscriptions.forEach(sub => {
      try {
        sub.stop();
      } catch (error) {
        console.warn('Failed to stop subscription:', error);
      }
    });
    this.subscriptions.clear();
    console.log('✅ Cleaned up', this.subscriptions.size, 'subscriptions');
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

  // OPTIMIZATION: Cache management methods
  private async getCacheTimestamp(userId: string): Promise<number> {
    try {
      const timestamp = await AsyncStorage.getItem(`cache_timestamp_${userId}`);
      return timestamp ? parseInt(timestamp, 10) : 0;
    } catch {
      return 0;
    }
  }

  private async setCacheTimestamp(userId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(`cache_timestamp_${userId}`, Date.now().toString());
    } catch (error) {
      console.warn('Failed to set cache timestamp:', error);
    }
  }

  /**
   * OPTIMIZATION: Background refresh to keep cache fresh without blocking UI
   */
  private backgroundRefreshWorkouts(userId: string, pubkey: string): void {
    console.log('🔄 Starting background refresh to keep cache fresh...');
    
    // Non-blocking background refresh (3s delay to avoid conflicts)
    setTimeout(async () => {
      try {
        const freshWorkouts = await this.fetchNostrWorkouts(userId, pubkey);
        if (freshWorkouts.length > 0) {
          await NostrCacheService.setCachedWorkouts(pubkey, freshWorkouts);
          await this.setCacheTimestamp(userId);
          console.log(`✅ Background refresh completed: ${freshWorkouts.length} workouts cached`);
        }
      } catch (error) {
        console.error('❌ Background refresh failed:', error);
      }
    }, 1000); // Start after 1 second to not block main thread
  }

  /**
   * OPTIMIZATION: Force refresh for pull-to-refresh scenarios
   */
  async forceRefreshWorkouts(userId: string, pubkey?: string): Promise<WorkoutMergeResult> {
    console.log('🔄 Force refresh requested - clearing cache first');
    
    if (pubkey) {
      await NostrCacheService.forceRefreshWorkouts(pubkey);
    }
    
    return this.getMergedWorkouts(userId, pubkey);
  }

  /**
   * Get older workouts for Load More functionality
   * Fetches workouts older than the specified timestamp
   */
  async getMergedWorkoutsWithPagination(
    userId: string, 
    pubkey: string, 
    untilTimestamp: number
  ): Promise<WorkoutMergeResult> {
    try {
      console.log(`📖 WorkoutMergeService: Loading older workouts before ${new Date(untilTimestamp * 1000).toISOString()}`);
      
      const startTime = Date.now();

      // CRITICAL BUG FIX: Convert npub to hex if needed
      let hexPubkey = pubkey;
      if (pubkey.startsWith('npub1')) {
        const { nip19 } = await import('nostr-tools');
        const decoded = nip19.decode(pubkey);
        hexPubkey = decoded.data as string;
        console.log(`🔧 Converted npub to hex for pagination: ${pubkey.slice(0, 20)}... → ${hexPubkey.slice(0, 20)}...`);
      }

      // Get HealthKit workouts older than timestamp (these are already local)
      const healthKitWorkouts = await this.fetchHealthKitWorkouts(userId);
      const olderHealthKitWorkouts = healthKitWorkouts.filter(w => 
        new Date(w.startTime).getTime() / 1000 < untilTimestamp
      );

      // Get older Nostr workouts using pagination
      console.log(`🔍 Fetching older Nostr workouts before timestamp: ${untilTimestamp}`);
      const olderNostrWorkouts = await NostrWorkoutService.getWorkoutsWithPagination(hexPubkey, untilTimestamp);
      
      console.log(`📊 Pagination results: ${olderHealthKitWorkouts.length} HealthKit, ${olderNostrWorkouts.length} Nostr`);

      // SIMPLIFIED: Convert older Nostr workouts to unified format
      const postingStatus = await this.getWorkoutPostingStatus(userId);
      const unifiedWorkouts = this.convertNostrToUnified(olderNostrWorkouts, postingStatus);
      
      // Create simplified result (no HealthKit in pure Nostr approach)
      const mergedResult = {
        allWorkouts: unifiedWorkouts,
        healthKitCount: 0, // Pure Nostr approach
        nostrCount: olderNostrWorkouts.length,
        duplicateCount: 0, // No deduplication needed
      };

      const loadDuration = Date.now() - startTime;

      const result: WorkoutMergeResult = {
        allWorkouts: mergedResult.allWorkouts,
        healthKitCount: mergedResult.healthKitCount,
        nostrCount: mergedResult.nostrCount,
        duplicateCount: mergedResult.duplicateCount,
        lastSyncAt: new Date().toISOString(),
        fromCache: false,
        loadDuration,
      };

      console.log(`✅ Pagination completed: ${result.allWorkouts.length} older workouts, ${loadDuration}ms`);
      return result;

    } catch (error) {
      console.error('❌ WorkoutMergeService pagination failed:', error);
      // Return empty result instead of throwing
      return {
        allWorkouts: [],
        healthKitCount: 0,
        nostrCount: 0,
        duplicateCount: 0,
        lastSyncAt: new Date().toISOString(),
        fromCache: false,
        loadDuration: 0,
      };
    }
  }
}

export default WorkoutMergeService.getInstance();
