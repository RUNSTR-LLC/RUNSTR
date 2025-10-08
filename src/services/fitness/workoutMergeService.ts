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
import LocalWorkoutStorageService from './LocalWorkoutStorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Workout, WorkoutType } from '../../types/workout';
import type { NostrWorkout } from '../../types/nostrWorkout';
import type { HealthKitWorkout } from './healthKitService';
import { GlobalNDKService } from '../nostr/GlobalNDKService';
import FEATURE_FLAGS from '../../constants/featureFlags';

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

  // Strength training fields (inherited from Workout, but explicit for clarity)
  sets?: number;
  reps?: number;
  notes?: string;

  // UI state
  canSyncToNostr: boolean;
  canPostToSocial: boolean;
}

export interface WorkoutMergeResult {
  allWorkouts: UnifiedWorkout[];
  healthKitCount: number;
  nostrCount: number;
  localCount: number; // NEW: Count of local Activity Tracker workouts
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
  private async initializeNDK() {
    // Use GlobalNDKService for shared relay connections
    try {
      this.ndk = await GlobalNDKService.getInstance();
      console.log('[WorkoutMerge] Using GlobalNDK instance');
    } catch (error) {
      console.warn('[WorkoutMerge] Failed to initialize NDK:', error);
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
   * Pure Nostr implementation - uses pubkey as single source of truth
   */
  async getMergedWorkouts(pubkey: string): Promise<WorkoutMergeResult> {
    const startTime = Date.now();

    try {
      console.log('⚡ Enhanced: Fetching and merging workouts for pubkey:', pubkey.slice(0, 20) + '...');

      if (!pubkey) {
        console.log('❌ No pubkey provided - returning empty results');
        return {
          allWorkouts: [],
          healthKitCount: 0,
          nostrCount: 0,
          localCount: 0,
          duplicateCount: 0,
          fromCache: false,
          loadDuration: Date.now() - startTime,
          cacheAge: 0,
        };
      }

      // Feature flag: Skip HealthKit when disabled
      let healthKitWorkouts: HealthKitWorkout[] = [];
      let usedCache = false; // Track if we used cached data

      if (!FEATURE_FLAGS.ENABLE_HEALTHKIT) {
        console.log('⚠️ HealthKit disabled via feature flag - skipping HealthKit fetch');
      } else {
        // Check cache first for performance
        const cachedWorkouts = await this.healthKitService.getCachedWorkouts();

        if (cachedWorkouts && cachedWorkouts.length > 0) {
          console.log(`📦 Using ${cachedWorkouts.length} cached HealthKit workouts`);
          healthKitWorkouts = cachedWorkouts;
          usedCache = true;
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
          console.log(`✅ HealthKit fetch successful: ${healthKitWorkouts.length} workouts`);
        } catch (hkError) {
          // Log error prominently and throw to let UI components show user-facing errors
          console.error('❌ HealthKit fetch failed:', hkError);
          const errorMessage = hkError instanceof Error ? hkError.message : 'Unknown error';
          console.error(`❌ HealthKit error details: ${errorMessage}`);

          // Create user-friendly error message
          let userFriendlyError = 'Failed to sync Apple Health workouts';

          if (errorMessage.includes('not authorized') || errorMessage.includes('Permission')) {
            userFriendlyError = 'Apple Health permissions are required. Please grant permissions in Settings → Privacy & Security → Health → RUNSTR.';
            console.error('❌ CRITICAL: HealthKit permission issue detected!');
          } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
            userFriendlyError = 'Apple Health sync timed out. This can happen with large workout libraries. Try again or contact support.';
          } else if (errorMessage.includes('not available')) {
            userFriendlyError = 'Apple Health is not available on this device or in the simulator.';
          }

          // Store the error for UI components to access
          await AsyncStorage.setItem('@healthkit:last_error', JSON.stringify({
            message: userFriendlyError,
            timestamp: Date.now(),
            technicalDetails: errorMessage
          }));

          // Continue with empty HealthKit workouts but error is stored for UI
          healthKitWorkouts = [];
        }
      } else {
        console.log('ℹ️ HealthKit not available on this device');
        }
      }

      // Fetch Nostr workouts AND local workouts
      const [nostrWorkouts, localWorkouts, postingStatus] = await Promise.all([
        this.fetchNostrWorkouts(pubkey),
        LocalWorkoutStorageService.getAllWorkouts(),
        this.getWorkoutPostingStatus(pubkey),
      ]);

      console.log(`📊 Found ${healthKitWorkouts.length} HealthKit, ${nostrWorkouts.length} Nostr, ${localWorkouts.length} local workouts`);

      // Deduplicate and merge (now includes local workouts)
      const mergedResult = this.mergeAndDeduplicate(
        healthKitWorkouts,
        nostrWorkouts,
        localWorkouts,
        postingStatus,
        pubkey
      );

      // Cache the results (non-blocking - don't fail if caching fails)
      if (nostrWorkouts.length > 0) {
        try {
          await NostrCacheService.setCachedWorkouts(pubkey, nostrWorkouts);
          await this.setCacheTimestamp(pubkey);
        } catch (cacheError) {
          console.warn('⚠️ WorkoutMergeService: Caching failed, but continuing with workout data:', cacheError);
          // Continue execution - we still have the workout data to return
        }
      }

      console.log(`✅ Merged: ${mergedResult.allWorkouts.length} total, ${mergedResult.duplicateCount} duplicates removed`);

      return {
        ...mergedResult,
        fromCache: usedCache,
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
   * Pure Nostr implementation - uses pubkey as identifier
   */
  private async fetchNostrWorkouts(pubkey: string): Promise<NostrWorkout[]> {
    try {
      if (!pubkey) {
        console.log('⚠️ No pubkey provided - returning empty array');
        return [];
      }

      console.log('🚀 Fetching Nostr workouts for pubkey:', pubkey.slice(0, 20) + '...');

      const { nip19 } = await import('nostr-tools');
      const NDK = await import('@nostr-dev-kit/ndk');

      let hexPubkey = this.ensureHexPubkey(pubkey);

      console.log(`📊 NDK Query: Getting kind 1301 events for ${hexPubkey.slice(0, 16)}...`);

      // Initialize NDK if needed
      if (!this.ndk) {
        await this.initializeNDK();
      }

      const events = new Set<any>();

      // Nuclear filter - minimal restrictions
      const nuclearFilter = {
        kinds: [1301],
        authors: [hexPubkey],
        limit: 500
      };

      console.log('🚀 NDK Filter:', nuclearFilter);

      // Create subscription with timeout and convert to clean workout objects
      const rawEventsPromise = new Promise<any[]>((resolve) => {
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
      });

      return rawEventsPromise.then((events: any[]) => {
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
            let dTagValue = ''; // Extract 'd' tag for deduplication

            // Extract workout data from tags
            for (const tag of tags) {
              if (tag[0] === 'd' && tag[1]) dTagValue = tag[1]; // Extract 'd' tag
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

            // Extract plain primitive values from NDK event to avoid circular references
            // Use pubkey as userId for backwards compatibility with Workout interface
            // CRITICAL FIX: Use 'd' tag as workout ID for proper deduplication with HealthKit workouts
            const workout: NostrWorkout = {
              id: dTagValue || String(event.id || ''), // Use 'd' tag if available, fallback to event ID
              userId: String(hexPubkey || ''), // Use pubkey as userId (pure Nostr)
              type: String(workoutType) as any,
              startTime: new Date(event.created_at * 1000).toISOString(),
              endTime: new Date((event.created_at + Math.max(duration, 60)) * 1000).toISOString(),
              duration: Number(duration),
              distance: Number(distance),
              calories: Number(calories),
              source: 'nostr',
              nostrEventId: String(event.id || ''),
              nostrPubkey: String(event.pubkey || ''),
              sourceApp: 'nostr_discovery',
              nostrCreatedAt: Number(event.created_at),
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
   * Merge and deduplicate HealthKit, Nostr, and Local workouts
   */
  /**
   * PERFORMANCE FIX: O(N) HashMap-based deduplication instead of O(N²) nested loops
   * Prevents 40-second UI freezes with large workout datasets (200+ workouts)
   */
  private mergeAndDeduplicate(
    healthKitWorkouts: HealthKitWorkout[],
    nostrWorkouts: NostrWorkout[],
    localWorkouts: any[], // LocalWorkout[] from LocalWorkoutStorageService
    postingStatus: Map<string, WorkoutStatusUpdate>,
    pubkey: string
  ): WorkoutMergeResult {
    const unified: UnifiedWorkout[] = [];
    let duplicateCount = 0;

    // ✅ BUILD LOOKUP MAPS (O(N) instead of nested O(N²) loops)
    const nostrById = new Map<string, NostrWorkout>();
    const nostrByUUID = new Map<string, NostrWorkout>();
    const nostrByEventId = new Map<string, NostrWorkout>();

    // Index Nostr workouts once for O(1) lookups
    for (const nw of nostrWorkouts) {
      if (nw.id) nostrById.set(nw.id, nw);
      if (nw.nostrEventId) nostrByEventId.set(nw.nostrEventId, nw);
      // Extract UUID from healthkit_UUID format if present
      const uuid = nw.id?.includes('healthkit_') ? nw.id.replace('healthkit_', '') : null;
      if (uuid) nostrByUUID.set(uuid, nw);
    }

    const healthKitById = new Map<string, HealthKitWorkout>();
    const healthKitByUUID = new Map<string, HealthKitWorkout>();

    // Index HealthKit workouts once for O(1) lookups
    for (const hk of healthKitWorkouts) {
      const id = hk.id || `healthkit_${hk.UUID}`;
      healthKitById.set(id, hk);
      if (hk.UUID) healthKitByUUID.set(hk.UUID, hk);
    }

    // ✅ PROCESS HEALTHKIT WORKOUTS (O(N) with hash lookups)
    for (const hkWorkout of healthKitWorkouts) {
      const workoutId = hkWorkout.id || `healthkit_${hkWorkout.UUID}`;
      const uuid = hkWorkout.UUID;

      // Fast O(1) duplicate check via Map lookup instead of O(N) .some() loop
      const isDupe = !!(
        nostrById.has(workoutId) ||
        (uuid && nostrByUUID.has(uuid))
      );

      if (isDupe) {
        duplicateCount++;
      }

      const status = postingStatus.get(workoutId);

      const unifiedWorkout: UnifiedWorkout = {
        id: workoutId,
        userId: pubkey,
        type: (hkWorkout.activityType || 'other') as WorkoutType,
        startTime: hkWorkout.startDate,
        endTime: hkWorkout.endDate,
        duration: hkWorkout.duration,
        distance: hkWorkout.totalDistance || 0,
        calories: hkWorkout.totalEnergyBurned || 0,
        source: 'healthkit',
        syncedAt: new Date().toISOString(),
        syncedToNostr: isDupe,
        postedToSocial: status?.postedToSocial || false,
        canSyncToNostr: !isDupe,
        canPostToSocial: true,
      };

      unified.push(unifiedWorkout);
    }

    // ✅ PROCESS NOSTR-ONLY WORKOUTS (O(N) with hash lookups)
    for (const nostrWorkout of nostrWorkouts) {
      // Fast O(1) duplicate check instead of O(N) .find()
      const uuid = nostrWorkout.id?.includes('healthkit_')
        ? nostrWorkout.id.replace('healthkit_', '')
        : nostrWorkout.id;

      const matchingHK = uuid && healthKitByUUID.has(uuid);

      if (!matchingHK) {
        const status = postingStatus.get(nostrWorkout.id);
        unified.push({
          ...nostrWorkout,
          syncedToNostr: true,
          postedToSocial: status?.postedToSocial || false,
          postingInProgress: false,
          canSyncToNostr: false,
          canPostToSocial: true,
        });
      }
    }

    // ✅ PROCESS LOCAL WORKOUTS (O(N) with hash lookups)
    for (const localWorkout of localWorkouts) {
      // Fast O(1) duplicate check instead of O(N) .find()
      const matchingNostr = localWorkout.nostrEventId && nostrByEventId.has(localWorkout.nostrEventId);

      if (!matchingNostr) {
        const status = postingStatus.get(localWorkout.id);
        unified.push({
          id: localWorkout.id,
          userId: pubkey,
          type: localWorkout.type,
          startTime: localWorkout.startTime,
          endTime: localWorkout.endTime,
          duration: localWorkout.duration,
          distance: localWorkout.distance,
          calories: localWorkout.calories,
          source: localWorkout.source,
          syncedAt: localWorkout.createdAt,
          syncedToNostr: localWorkout.syncedToNostr,
          postedToSocial: status?.postedToSocial || false,
          postingInProgress: false,
          canSyncToNostr: !localWorkout.syncedToNostr,
          canPostToSocial: true,
          nostrEventId: localWorkout.nostrEventId,
          elevationGain: localWorkout.elevation,
          sourceApp: localWorkout.source === 'gps_tracker' ? 'RUNSTR GPS Tracker' : 'RUNSTR Manual Entry',
          sets: localWorkout.sets,
          reps: localWorkout.reps,
          notes: localWorkout.notes,
        });
      } else {
        duplicateCount++;
      }
    }

    // Sort by start time (newest first)
    unified.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    console.log(`⚡ PERFORMANCE: Merged ${unified.length} workouts in O(N) time (was O(N²))`);

    return {
      allWorkouts: unified,
      healthKitCount: healthKitWorkouts.length,
      nostrCount: nostrWorkouts.length,
      localCount: localWorkouts.length,
      duplicateCount,
    };
  }

  /**
   * Enhanced: Check if a workout is a duplicate based on UUID, time window, and stats
   * Uses multiple strategies for more accurate deduplication
   */
  private isDuplicate(
    workout1: HealthKitWorkout | any,
    workouts2: any[]
  ): boolean {
    const workout1Id = workout1.id || workout1.UUID || 'unknown';

    return workouts2.some(w2 => {
      const w2Id = w2.id || w2.UUID || 'unknown';

      // Strategy 1: Exact UUID match (highest confidence)
      if (workout1.UUID && w2.UUID && workout1.UUID === w2.UUID) {
        console.log(`🔍 [Strategy 1] Duplicate found via exact UUID match`);
        console.log(`   HealthKit: ${workout1Id} | Nostr: ${w2Id}`);
        return true;
      }

      // Strategy 2: HealthKit ID match (check both id and UUID fields)
      const id1 = workout1.id || workout1.UUID;
      const id2 = w2.id || w2.UUID;
      if (id1 && id2) {
        // Extract UUID from healthkit_UUID format
        const uuid1 = id1.includes('healthkit_') ? id1.replace('healthkit_', '') : id1;
        const uuid2 = id2.includes('healthkit_') ? id2.replace('healthkit_', '') : id2;
        if (uuid1 === uuid2 && uuid1 !== '') {
          console.log(`🔍 [Strategy 2] Duplicate found via HealthKit ID match`);
          console.log(`   Matched ID: ${uuid1}`);
          console.log(`   HealthKit: ${workout1Id} | Nostr: ${w2Id}`);
          return true;
        }
      }

      // Strategy 3: Time window and stats matching (fuzzy matching)
      // Must be same activity type first
      const type1 = workout1.activityType || workout1.type || 'unknown';
      const type2 = w2.type || w2.activityType || 'unknown';

      // Map HealthKit activity types if needed
      const normalizedType1 = this.normalizeWorkoutType(type1);
      const normalizedType2 = this.normalizeWorkoutType(type2);

      if (normalizedType1 !== normalizedType2) return false;

      // Time window check (within 1 minute for better accuracy)
      const time1 = new Date(workout1.startDate || workout1.startTime).getTime();
      const time2 = new Date(w2.startTime || w2.startDate).getTime();
      const timeDiff = Math.abs(time1 - time2);

      if (timeDiff > 60000) return false; // More than 1 minute apart

      // Duration check (within 10 seconds tolerance)
      const dur1 = workout1.duration || 0;
      const dur2 = w2.duration || 0;
      const durationDiff = Math.abs(dur1 - dur2);

      if (durationDiff > 10) return false; // More than 10 seconds difference

      // Distance check (within 100 meters or 2% tolerance, whichever is larger)
      // Both HealthKit (totalDistance) and Nostr (distance) use meters
      const dist1 = (workout1.totalDistance || workout1.distance || 0);
      const dist2 = w2.distance || 0;

      if (dist1 > 0 && dist2 > 0) {
        const distanceDiff = Math.abs(dist1 - dist2);
        const percentTolerance = Math.max(dist1, dist2) * 0.02; // 2% tolerance
        const absoluteTolerance = 100; // 100 meters
        const tolerance = Math.max(percentTolerance, absoluteTolerance);

        if (distanceDiff > tolerance) return false;
      }

      // If we made it here, it's very likely a duplicate
      console.log(`🔍 [Strategy 3] Duplicate found via fuzzy match (time/stats)`);
      console.log(`   Time diff: ${timeDiff}ms | Duration diff: ${durationDiff}s`);
      console.log(`   Type: ${normalizedType1}`);
      console.log(`   HealthKit: ${workout1Id} | Nostr: ${w2Id}`);
      return true;
    });
  }

  /**
   * Normalize workout types for consistent comparison
   */
  private normalizeWorkoutType(type: string | number): string {
    if (typeof type === 'number') {
      // Map HealthKit numeric types
      const typeMap: Record<number, string> = {
        16: 'running',
        52: 'walking',
        13: 'cycling',
        24: 'hiking',
        46: 'yoga',
        35: 'strength_training',
        3: 'gym'
      };
      return typeMap[type] || 'other';
    }

    // Normalize string types
    const normalizedType = type.toLowerCase().replace(/_/g, '').replace(/-/g, '');

    // Map variations to standard types
    if (normalizedType.includes('run')) return 'running';
    if (normalizedType.includes('walk')) return 'walking';
    if (normalizedType.includes('cycl') || normalizedType.includes('bike')) return 'cycling';
    if (normalizedType.includes('hik')) return 'hiking';
    if (normalizedType.includes('yoga')) return 'yoga';
    if (normalizedType.includes('strength') || normalizedType.includes('weight')) return 'strength_training';
    if (normalizedType.includes('gym')) return 'gym';

    return normalizedType;
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
   * Update workout posting status (uses pubkey as identifier - pure Nostr)
   */
  async updateWorkoutStatus(
    updates: Partial<WorkoutStatusUpdate> & { workoutId: string }
  ): Promise<void> {
    try {
      // Get pubkey from global auth context or stored nsec
      const pubkey = await this.getCurrentPubkey();
      if (!pubkey) {
        console.warn('⚠️ No pubkey available for updating workout status');
        return;
      }

      const statusMap = await this.getWorkoutPostingStatus(pubkey);
      const currentStatus = statusMap.get(updates.workoutId) || { workoutId: updates.workoutId };

      const updatedStatus: WorkoutStatusUpdate = {
        ...currentStatus,
        ...updates,
      };

      statusMap.set(updates.workoutId, updatedStatus);

      // Save back to storage using pubkey as key
      const statusArray = Array.from(statusMap.values());
      await AsyncStorage.setItem(
        `${STORAGE_KEYS.WORKOUT_STATUS}_${pubkey}`,
        JSON.stringify(statusArray)
      );

      console.log(`✅ Updated workout status for ${updates.workoutId}:`, updates);
    } catch (error) {
      console.error('❌ Error updating workout status:', error);
      throw error;
    }
  }

  /**
   * Get workout posting status from storage (uses pubkey as key - pure Nostr)
   */
  private async getWorkoutPostingStatus(
    pubkey: string
  ): Promise<Map<string, WorkoutStatusUpdate>> {
    try {
      const key = `${STORAGE_KEYS.WORKOUT_STATUS}_${pubkey}`;
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
   * Get current user's pubkey from AsyncStorage
   */
  private async getCurrentPubkey(): Promise<string | null> {
    try {
      const npub = await AsyncStorage.getItem('@runstr:npub');
      const hexPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      return hexPubkey || this.ensureHexPubkey(npub || '');
    } catch (error) {
      console.error('❌ Error getting current pubkey:', error);
      return null;
    }
  }

  /**
   * Clear all posting status for user (useful for debugging)
   */
  async clearWorkoutStatus(pubkey: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${STORAGE_KEYS.WORKOUT_STATUS}_${pubkey}`);
      console.log('✅ Cleared workout posting status for pubkey');
    } catch (error) {
      console.error('❌ Error clearing workout status:', error);
      throw error;
    }
  }

  /**
   * Get last HealthKit error for UI display
   */
  async getLastHealthKitError(): Promise<{
    message: string;
    timestamp: number;
    technicalDetails: string;
  } | null> {
    try {
      const stored = await AsyncStorage.getItem('@healthkit:last_error');
      if (!stored) return null;

      const error = JSON.parse(stored);

      // Clear errors older than 1 hour
      if (Date.now() - error.timestamp > 60 * 60 * 1000) {
        await AsyncStorage.removeItem('@healthkit:last_error');
        return null;
      }

      return error;
    } catch (error) {
      console.warn('Failed to get last HealthKit error:', error);
      return null;
    }
  }

  /**
   * Clear stored HealthKit error
   */
  async clearHealthKitError(): Promise<void> {
    try {
      await AsyncStorage.removeItem('@healthkit:last_error');
    } catch (error) {
      console.warn('Failed to clear HealthKit error:', error);
    }
  }

  /**
   * Get merge statistics for UI display (uses pubkey - pure Nostr)
   */
  async getMergeStats(pubkey: string): Promise<{
    totalWorkouts: number;
    healthKitWorkouts: number;
    nostrWorkouts: number;
    localWorkouts: number;
    syncedToNostr: number;
    postedToSocial: number;
    lastMergeAt?: string;
  }> {
    try {
      const result = await this.getMergedWorkouts(pubkey);
      const lastMergeData = await AsyncStorage.getItem(
        `${STORAGE_KEYS.LAST_MERGE}_${pubkey}`
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
        localWorkouts: result.localCount,
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
        localWorkouts: 0,
        syncedToNostr: 0,
        postedToSocial: 0,
      };
    }
  }

  // OPTIMIZATION: Cache management methods
  // Uses pubkey as identifier (pure Nostr)
  private async getCacheTimestamp(pubkey: string): Promise<number> {
    try {
      const timestamp = await AsyncStorage.getItem(`cache_timestamp_${pubkey}`);
      return timestamp ? parseInt(timestamp, 10) : 0;
    } catch {
      return 0;
    }
  }

  private async setCacheTimestamp(pubkey: string): Promise<void> {
    try {
      await AsyncStorage.setItem(`cache_timestamp_${pubkey}`, Date.now().toString());
    } catch (error) {
      console.warn('Failed to set cache timestamp:', error);
    }
  }

  /**
   * OPTIMIZATION: Background refresh to keep cache fresh without blocking UI
   * Pure Nostr implementation - uses only pubkey
   */
  private backgroundRefreshWorkouts(pubkey: string): void {
    console.log('🔄 Starting background refresh to keep cache fresh...');

    // Non-blocking background refresh (1s delay to avoid conflicts)
    setTimeout(async () => {
      try {
        const freshWorkouts = await this.fetchNostrWorkouts(pubkey);
        if (freshWorkouts.length > 0) {
          await NostrCacheService.setCachedWorkouts(pubkey, freshWorkouts);
          await this.setCacheTimestamp(pubkey);
          console.log(`✅ Background refresh completed: ${freshWorkouts.length} workouts cached`);
        }
      } catch (error) {
        console.error('❌ Background refresh failed:', error);
      }
    }, 1000); // Start after 1 second to not block main thread
  }

  /**
   * OPTIMIZATION: Force refresh for pull-to-refresh scenarios
   * Pure Nostr implementation - uses only pubkey
   */
  async forceRefreshWorkouts(pubkey: string): Promise<WorkoutMergeResult> {
    console.log('🔄 Force refresh requested - clearing cache first');

    await NostrCacheService.forceRefreshWorkouts(pubkey);

    return this.getMergedWorkouts(pubkey);
  }

  /**
   * Get older workouts for Load More functionality
   * Fetches workouts older than the specified timestamp
   * Pure Nostr implementation - uses only pubkey
   */
  async getMergedWorkoutsWithPagination(
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

      // Get older Nostr workouts using pagination
      console.log(`🔍 Fetching older Nostr workouts before timestamp: ${untilTimestamp}`);
      const olderNostrWorkouts = await NostrWorkoutService.getWorkoutsWithPagination(hexPubkey, untilTimestamp);

      console.log(`📊 Pagination results: ${olderNostrWorkouts.length} Nostr workouts`);

      // SIMPLIFIED: Convert older Nostr workouts to unified format
      const postingStatus = await this.getWorkoutPostingStatus(hexPubkey);
      const unifiedWorkouts = this.convertNostrToUnified(olderNostrWorkouts, postingStatus);

      // Create simplified result (pure Nostr approach)
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
        localCount: 0, // Pagination doesn't include local workouts
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
        localCount: 0,
        duplicateCount: 0,
        lastSyncAt: new Date().toISOString(),
        fromCache: false,
        loadDuration: 0,
      };
    }
  }
}

export default WorkoutMergeService.getInstance();
