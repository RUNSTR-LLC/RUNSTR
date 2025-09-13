/**
 * Workout Merge Service - SIMPLIFIED: Pure Nostr Workout Display
 * Focuses on kind 1301 events using proven nuclear approach
 * Tracks posting status for UI state management (manual "Save to Nostr" workflow)
 */

import { NostrWorkoutService } from './nostrWorkoutService';
import { NostrCacheService } from '../cache/NostrCacheService';
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
   * SIMPLIFIED: Get pure Nostr workouts with nuclear approach
   * Focuses on manual "Save to Nostr" workflow - no HealthKit hybrid complexity
   */
  async getMergedWorkouts(userId: string, pubkey?: string): Promise<WorkoutMergeResult> {
    const startTime = Date.now();
    
    try {
      console.log('⚡ SIMPLIFIED: Pure Nostr workout fetching for user', userId);
      console.log('💡 SIMPLIFIED: Manual "Save to Nostr" workflow - no hybrid complexity');
      
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

      // SIMPLIFIED: Pure Nostr workflow - just fetch kind 1301 events
      const [nostrWorkouts, postingStatus] = await Promise.all([
        this.fetchNostrWorkouts(userId, pubkey),
        this.getWorkoutPostingStatus(userId),
      ]);

      console.log(`📊 SIMPLIFIED: Found ${nostrWorkouts.length} Nostr workouts`);

      // Cache the Nostr workouts
      if (nostrWorkouts.length > 0) {
        await NostrCacheService.setCachedWorkouts(pubkey, nostrWorkouts);
        await this.setCacheTimestamp(userId);
        console.log(`💾 Cached ${nostrWorkouts.length} workouts`);
      }

      // SIMPLIFIED: No merge complexity - just convert Nostr workouts to unified format
      const unifiedWorkouts = this.convertNostrToUnified(nostrWorkouts, postingStatus);

      console.log(`✅ SIMPLIFIED: ${unifiedWorkouts.length} workouts ready for display`);
      
      return {
        allWorkouts: unifiedWorkouts,
        healthKitCount: 0, // Pure Nostr approach
        nostrCount: nostrWorkouts.length,
        duplicateCount: 0, // No deduplication needed in pure approach
        fromCache: false,
        loadDuration: Date.now() - startTime,
        cacheAge: 0,
      };
    } catch (error) {
      console.error('❌ SIMPLIFIED WorkoutMergeService: Error fetching workouts:', error);
      throw new Error('Failed to fetch workout data');
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
   * Fetch Nostr workouts - NUCLEAR APPROACH (like successful team discovery)
   * Remove all complex filtering and validation - just get ALL 1301 events for user
   */
  private async fetchNostrWorkouts(userId: string, pubkey?: string): Promise<NostrWorkout[]> {
    try {
      if (!pubkey) {
        console.log('⚠️ No pubkey provided - returning empty array (nuclear approach)');
        return [];
      }

      console.log('🚀🚀🚀 NUCLEAR WORKOUT APPROACH: Getting ALL 1301 events for user (no filtering)...');
      console.log('🔍 Input pubkey analysis:', {
        pubkey: pubkey.slice(0, 12) + '...',
        length: pubkey.length,
        startsWithNpub: pubkey.startsWith('npub1'),
        isValidHex: /^[0-9a-fA-F]{64}$/.test(pubkey)
      });
      
      // NUCLEAR APPROACH: Use NDK (like successful team discovery)
      const { nip19 } = await import('nostr-tools');
      const NDK = await import('@nostr-dev-kit/ndk');
      
      let hexPubkey = pubkey;
      if (pubkey.startsWith('npub1')) {
        const decoded = nip19.decode(pubkey);
        hexPubkey = decoded.data as string;
        console.log(`🔧 Converted npub to hex: ${pubkey.slice(0, 20)}... → ${hexPubkey.slice(0, 20)}...`);
      }

      console.log(`📊 NDK NUCLEAR QUERY: Getting ALL kind 1301 events for ${hexPubkey.slice(0, 16)}...`);

      // Use same NDK singleton as teams (proven reliable)
      const g = globalThis as any;
      let ndk = g.__RUNSTR_NDK_INSTANCE__;
      
      if (!ndk) {
        console.log('[NDK Workout] Creating NDK instance...');
        // Nuclear relay list (comprehensive coverage like successful script)
        const relayUrls = [
          'wss://relay.damus.io',           // Primary - most important
          'wss://nos.lol',                  // Secondary  
          'wss://relay.primal.net',         // Tertiary
          'wss://nostr.wine',              // Quaternary
          'wss://relay.nostr.band',        // Additional
          'wss://relay.snort.social',      // Additional
          'wss://nostr-pub.wellorder.net', // Additional
          'wss://relay.nostrich.de',       // Extra coverage
          'wss://nostr.oxtr.dev',          // Extra coverage
          'wss://relay.wellorder.net',     // Extra coverage
        ];

        ndk = new NDK.default({
          explicitRelayUrls: relayUrls
        });
        
        await ndk.connect();
        console.log('[NDK Workout] Connected to relays');
      } else {
        console.log('[NDK Workout] Reusing existing NDK instance from teams');
      }

      const events: any[] = [];

      // NUCLEAR FILTER: Just kind 1301 + author - NO other restrictions (same as teams work)
      const nuclearFilter = {
        kinds: [1301],
        authors: [hexPubkey],
        limit: 500
        // NO time filters (since/until) - nuclear approach
        // NO content filters - nuclear approach  
        // NO tag validation - nuclear approach
      };

      console.log('🚀 NDK NUCLEAR FILTER:', nuclearFilter);

      // Use NDK subscription (like teams)
      const subscription = ndk.subscribe(nuclearFilter, {
        cacheUsage: NDK.NDKSubscriptionCacheUsage?.ONLY_RELAY
      });

      subscription.on('event', (event: any) => {
        console.log(`📥 NDK NUCLEAR 1301 EVENT:`, {
          id: event.id?.slice(0, 8),
          kind: event.kind,
          created_at: new Date(event.created_at * 1000).toISOString(),
          pubkey: event.pubkey?.slice(0, 8),
          tags: event.tags?.length
        });
        
        // ULTRA NUCLEAR: Accept ANY kind 1301 event - ZERO validation!
        if (event.kind === 1301) {
          events.push(event);
          console.log(`✅ NDK NUCLEAR ACCEPT: Event ${events.length} added - NO filtering!`);
        }
      });

      subscription.on('eose', () => {
        console.log('📨 NDK EOSE received - continuing to wait for complete timeout...');
      });

      // Wait for ALL events (nuclear approach - ultra-fast timeout proven by script) 
      console.log('⏰ NDK NUCLEAR TIMEOUT: Waiting 3 seconds for ALL 1301 events...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      subscription.stop();

      console.log(`🚀🚀🚀 NUCLEAR RESULT: Found ${events.length} raw 1301 events`);

      if (events.length === 0) {
        console.log('⚠️ NO EVENTS FOUND - This suggests:');
        console.log('   1. User has no 1301 events published to these relays');
        console.log('   2. Pubkey conversion issue');
        console.log('   3. Relay connectivity issue');
        console.log(`   Expected ~113 events for target user - checking if this is the right user...`);
      }

      // ULTRA NUCLEAR PARSING: Create workouts from ALL 1301 events - ZERO validation!
      const workouts: NostrWorkout[] = [];
      
      for (const event of events) {
        try {
          // ULTRA NUCLEAR: Accept ANY tags, ANY content, ANY structure
          const tags = event.tags || [];
          let workoutType = 'unknown';
          let duration = 0;
          let distance = 0;
          let calories = 0;
          
          // Try to extract tags but accept ANYTHING - no requirements
          for (const tag of tags) {
            if (tag[0] === 'exercise' && tag[1]) workoutType = tag[1];
            if (tag[0] === 'duration' && tag[1]) {
              const timeStr = tag[1];
              const parts = timeStr.split(':').map((p: string) => parseInt(p));
              if (parts.length === 3) {
                duration = parts[0] * 3600 + parts[1] * 60 + parts[2]; // H:M:S
              } else if (parts.length === 2) {
                duration = parts[0] * 60 + parts[1]; // M:S
              } else {
                duration = 0;
              }
            }
            if (tag[0] === 'distance' && tag[1]) distance = parseFloat(tag[1]) || 0;
            if (tag[0] === 'calories' && tag[1]) calories = parseInt(tag[1]) || 0;
            // Could be other tag formats - just try them all
            if (tag[0] === 'type' && tag[1]) workoutType = tag[1];
            if (tag[0] === 'activity' && tag[1]) workoutType = tag[1];
          }

          // ULTRA NUCLEAR: Create workout even if ALL fields are missing/zero
          const workout: NostrWorkout = {
            id: event.id,
            userId: userId,
            type: workoutType as any,
            startTime: new Date(event.created_at * 1000).toISOString(),
            endTime: new Date((event.created_at + Math.max(duration * 60, 60)) * 1000).toISOString(), // Min 1 minute
            duration: duration,
            distance: distance,
            calories: calories,
            source: 'nostr',
            nostrEventId: event.id,
            nostrPubkey: event.pubkey,
            sourceApp: 'ultra_nuclear_discovery',
            nostrCreatedAt: event.created_at,
            unitSystem: 'metric' as const
          };

          workouts.push(workout);
          console.log(`✅ ULTRA NUCLEAR WORKOUT ${workouts.length}: ${workout.type} - ${new Date(workout.startTime).toDateString()} (dur:${workout.duration}, dist:${workout.distance})`);
          
        } catch (error) {
          console.warn(`⚠️ Error in ultra nuclear parsing ${event.id}:`, error);
          // ULTRA NUCLEAR: Even if parsing fails, create a basic workout
          const fallbackWorkout: NostrWorkout = {
            id: event.id,
            userId: userId,
            type: 'raw_1301' as any,
            startTime: new Date(event.created_at * 1000).toISOString(),
            endTime: new Date((event.created_at + 60) * 1000).toISOString(),
            duration: 0,
            distance: 0,
            calories: 0,
            source: 'nostr',
            nostrEventId: event.id,
            nostrPubkey: event.pubkey,
            sourceApp: 'fallback_nuclear',
            nostrCreatedAt: event.created_at,
            unitSystem: 'metric' as const
          };
          workouts.push(fallbackWorkout);
          console.log(`🆘 FALLBACK WORKOUT ${workouts.length}: raw_1301 - ${new Date(fallbackWorkout.startTime).toDateString()}`);
        }
      }

      console.log(`🎉 NUCLEAR SUCCESS: Created ${workouts.length} workout objects from ${events.length} raw events`);
      
      if (workouts.length > 0) {
        // Show date range
        const dates = workouts.map(w => new Date(w.startTime).getTime()).sort();
        const oldest = new Date(dates[0]);
        const newest = new Date(dates[dates.length - 1]);
        console.log(`📅 Date range: ${oldest.toDateString()} → ${newest.toDateString()}`);
      }

      return workouts.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    } catch (error) {
      console.error('❌ Nuclear workout discovery failed:', error);
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
