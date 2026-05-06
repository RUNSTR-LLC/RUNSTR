/**
 * Competition1301QueryService - Query kind 1301 workout events for competitions
 * Fetches and aggregates workout data from team members within specified date ranges
 * Uses proven Nuclear1301Service pattern for reliable Nostr queries
 */

import type { NostrWorkout } from '../../types/nostrWorkout';
import type { NostrActivityType } from '../../types/nostrCompetition';
import { ClubMembershipService } from '../backend/ClubMembershipService';
import { GlobalNDKService } from '../nostr/GlobalNDKService';

export interface WorkoutMetrics {
  npub: string;
  totalDistance: number; // in kilometers
  totalDuration: number; // in minutes
  totalCalories: number;
  workoutCount: number;
  activeDays: number;
  longestDistance: number;
  longestDuration: number;
  averagePace?: number; // min/km
  averageSpeed?: number; // km/h
  lastActivityDate?: string;
  streakDays: number;
  workouts: NostrWorkout[];
}

export interface CompetitionQuery {
  memberNpubs?: string[]; // Optional - will fetch from kind 30000 if not provided
  teamId?: string; // For fetching members from kind 30000 list
  captainPubkey?: string; // Captain's pubkey for fetching list
  activityType: NostrActivityType | 'Any';
  startDate: Date;
  endDate: Date;
}

export interface QueryResult {
  metrics: Map<string, WorkoutMetrics>;
  totalWorkouts: number;
  queryTime: number;
  fromCache: boolean;
  error?: string; // For handling missing lists
}

export class Competition1301QueryService {
  private static instance: Competition1301QueryService;
  private queryCache: Map<string, { result: QueryResult; timestamp: number }> =
    new Map();
  private readonly CACHE_EXPIRY = 60000; // 1 minute

  private constructor() {}

  static getInstance(): Competition1301QueryService {
    if (!Competition1301QueryService.instance) {
      Competition1301QueryService.instance = new Competition1301QueryService();
    }
    return Competition1301QueryService.instance;
  }

  /**
   * Query workouts for multiple team members
   */
  async queryMemberWorkouts(query: CompetitionQuery): Promise<QueryResult> {
    const startTime = Date.now();

    // Get member list from kind 30000 if not provided
    let memberNpubs = query.memberNpubs;

    if (!memberNpubs && query.teamId) {
      // Fetch members from Supabase club_memberships
      const clubMembers = await ClubMembershipService.getClubMembers(query.teamId);

      if (!clubMembers || clubMembers.length === 0) {
        console.warn(`⚠️ Club ${query.teamId} has no members`);
        return {
          metrics: new Map(),
          totalWorkouts: 0,
          queryTime: Date.now() - startTime,
          fromCache: false,
          error: 'Club has no members.',
        };
      }

      memberNpubs = clubMembers.map((m) => m.member_npub);
    }

    if (!memberNpubs || memberNpubs.length === 0) {
      return {
        metrics: new Map(),
        totalWorkouts: 0,
        queryTime: Date.now() - startTime,
        fromCache: false,
        error: 'No members to query',
      };
    }

    const cacheKey = this.getCacheKey({ ...query, memberNpubs });

    // Check cache
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_EXPIRY) {
      console.log('✅ Returning cached competition query results');
      return { ...cached.result, fromCache: true };
    }

    console.log(`🔍 Querying workouts for ${memberNpubs.length} members`);
    console.log(
      `📅 Date range: ${query.startDate.toISOString()} to ${query.endDate.toISOString()}`
    );
    console.log(`🏃 Activity type: ${query.activityType}`);

    const metrics = new Map<string, WorkoutMetrics>();
    let totalWorkouts = 0;

    // Query each member's workouts in parallel
    const memberPromises = memberNpubs.map(async (npub) => {
      const workouts = await this.fetchMemberWorkouts(npub, query);
      const memberMetrics = this.calculateMetrics(workouts, query);
      metrics.set(npub, memberMetrics);
      totalWorkouts += workouts.length;
    });

    await Promise.all(memberPromises);

    const result: QueryResult = {
      metrics,
      totalWorkouts,
      queryTime: Date.now() - startTime,
      fromCache: false,
    };

    // Cache result
    this.queryCache.set(cacheKey, { result, timestamp: Date.now() });

    console.log(
      `✅ Query complete: ${totalWorkouts} workouts in ${result.queryTime}ms`
    );
    return result;
  }

  /**
   * Fetch workouts for a single member using NDK
   */
  private async fetchMemberWorkouts(
    npub: string,
    query: CompetitionQuery
  ): Promise<NostrWorkout[]> {
    try {
      // Import required NDK (no nostr-tools needed)
      const NDK = await import('@nostr-dev-kit/ndk');

      // Convert npub to hex if needed using NDK's built-in nip19
      let hexPubkey = npub;
      if (npub.startsWith('npub1')) {
        // NDK has nip19 utilities built-in
        const { nip19 } = NDK;
        const decoded = nip19.decode(npub);
        hexPubkey = decoded.data as string;
      }

      // Use GlobalNDKService for shared relay connections
      const ndk = await GlobalNDKService.getInstance();

      // Build filter for 1301 events (NO tag filters - "nuclear" approach)
      const filter: any = {
        kinds: [1301],
        authors: [hexPubkey],
        since: Math.floor(query.startDate.getTime() / 1000),
        until: Math.floor(query.endDate.getTime() / 1000),
        limit: 500,
        // ✅ REMOVED: #t tag filter (causes "unindexed tag filter" relay errors)
        // Activity type filtering done client-side after fetching
      };

      const events: any[] = [];

      // Subscribe with timeout
      const sub = ndk.subscribe(filter, { closeOnEose: false });

      await new Promise<void>((resolve) => {
        sub.on('event', (event: any) => {
          events.push(event);
        });

        // 2-second timeout for faster response
        setTimeout(() => {
          // ✅ MEMORY LEAK FIX: Remove listeners before stopping subscription
          sub.removeAllListeners('event');
          sub.removeAllListeners('eose');
          sub.stop();
          resolve();
        }, 2000);
      });

      // Parse events into NostrWorkout format
      const allWorkouts = events.map((event) => this.parseWorkoutEvent(event));

      // ✅ FILTER OUT MANUAL ENTRIES: Exclude manual entries from competition leaderboards
      // Manual entries (custom exercises) are tagged with ['source', 'manual'] and should not
      // be included in GPS-based competitions to ensure fair leaderboard rankings
      const competitiveWorkouts = allWorkouts.filter((workout) => {
        // If dataSource is 'manual', exclude from competitions
        // All other sources (gps, healthkit, RUNSTR, undefined) are allowed
        return workout.dataSource !== 'manual';
      });

      const manualEntriesFiltered = allWorkouts.length - competitiveWorkouts.length;
      if (manualEntriesFiltered > 0) {
        console.log(
          `🚫 Excluded ${manualEntriesFiltered} manual entries from competition (${allWorkouts.length} → ${competitiveWorkouts.length})`
        );
      }

      // ✅ CLIENT-SIDE FILTERING: Filter by activity type AFTER fetching (nuclear pattern)
      // Use case-insensitive comparison (mapSportToActivityType returns 'Running', kind 1301 has 'running')
      if (query.activityType === 'Any') {
        console.log(
          `📦 Returning all ${competitiveWorkouts.length} workouts (any activity type)`
        );
        return competitiveWorkouts;
      }

      const normalizedQueryType = query.activityType.toLowerCase();
      const filteredWorkouts = competitiveWorkouts.filter(
        (workout) => ((workout as any).activityType || '').toLowerCase() === normalizedQueryType
      );
      console.log(
        `📦 Filtered ${competitiveWorkouts.length} → ${filteredWorkouts.length} ${query.activityType} workouts (case-insensitive)`
      );
      return filteredWorkouts;
    } catch (error) {
      console.error(`Failed to fetch workouts for ${npub}:`, error);
      return [];
    }
  }

  /**
   * Calculate aggregated metrics from workouts
   */
  private calculateMetrics(
    workouts: NostrWorkout[],
    query: CompetitionQuery
  ): WorkoutMetrics {
    const metrics: WorkoutMetrics = {
      npub: '',
      totalDistance: 0,
      totalDuration: 0,
      totalCalories: 0,
      workoutCount: workouts.length,
      activeDays: 0,
      longestDistance: 0,
      longestDuration: 0,
      streakDays: 0,
      workouts,
    };

    if (workouts.length === 0) return metrics;

    // Set npub from first workout
    metrics.npub = workouts[0].nostrPubkey || '';

    // Track unique days for active days count
    const activeDaysSet = new Set<string>();

    // Process each workout
    workouts.forEach((workout) => {
      // Distance
      const distance = this.parseDistance(workout);
      metrics.totalDistance += distance;
      metrics.longestDistance = Math.max(metrics.longestDistance, distance);

      // Duration
      const duration = this.parseDuration(workout);
      metrics.totalDuration += duration;
      metrics.longestDuration = Math.max(metrics.longestDuration, duration);

      // Calories
      metrics.totalCalories += workout.calories || 0;

      // Active days
      const workoutDate = new Date(workout.startTime).toDateString();
      activeDaysSet.add(workoutDate);

      // Last activity
      if (
        !metrics.lastActivityDate ||
        workout.startTime > metrics.lastActivityDate
      ) {
        metrics.lastActivityDate = workout.startTime;
      }
    });

    metrics.activeDays = activeDaysSet.size;

    // Calculate averages
    if (metrics.totalDistance > 0 && metrics.totalDuration > 0) {
      metrics.averagePace = metrics.totalDuration / metrics.totalDistance; // min/km
      metrics.averageSpeed =
        (metrics.totalDistance / metrics.totalDuration) * 60; // km/h
    }

    // Calculate streak
    metrics.streakDays = this.calculateStreak(Array.from(activeDaysSet));

    return metrics;
  }

  /**
   * Parse workout event into NostrWorkout format
   * Supports both runstr format and other 1301 formats
   */
  private parseWorkoutEvent(event: any): NostrWorkout {
    const tags = event.tags || [];

    // Parse exercise/activity type
    let workoutType =
      this.extractTag(tags, 'exercise') || // runstr format
      this.extractTag(tags, 'type') || // NIP-101e format
      this.extractTag(tags, 'activity') || // Alternative
      'unknown';

    // Parse duration - support both HH:MM:SS and seconds
    let duration = 0;
    const durationTag = this.extractTag(tags, 'duration');
    if (durationTag) {
      if (durationTag.includes(':')) {
        // HH:MM:SS format (runstr style)
        const parts = durationTag.split(':').map((p) => parseInt(p) || 0);
        if (parts.length === 3) {
          duration = parts[0] * 3600 + parts[1] * 60 + parts[2]; // Convert to seconds
        } else if (parts.length === 2) {
          duration = parts[0] * 60 + parts[1]; // MM:SS
        }
      } else {
        // Raw seconds
        duration = parseInt(durationTag) || 0;
      }
    }

    // Parse distance - look for tag with unit
    let distance = 0; // in meters
    const distanceTagIndex = tags.findIndex((t: string[]) => t[0] === 'distance');
    if (distanceTagIndex !== -1) {
      const distanceTag = tags[distanceTagIndex];
      const distValue = parseFloat(distanceTag[1]) || 0;
      const unit = distanceTag[2] || 'km'; // Default to km

      // Convert to meters for internal storage
      if (unit === 'km') {
        distance = distValue * 1000;
      } else if (unit === 'mi' || unit === 'miles') {
        distance = distValue * 1609.344;
      } else if (unit === 'm') {
        distance = distValue;
      } else {
        // Assume km if unrecognized
        distance = distValue * 1000;
      }
    }

    // Calculate end time based on duration
    const startTimestamp = event.created_at * 1000;
    const endTimestamp = startTimestamp + duration * 1000; // duration is in seconds

    // Parse source tag for competition filtering
    const sourceTag = this.extractTag(tags, 'source');
    let dataSource: 'gps' | 'manual' | 'healthkit' | 'RUNSTR' | undefined;
    if (sourceTag) {
      const sourceValue = sourceTag.toLowerCase();
      if (sourceValue === 'manual') {
        dataSource = 'manual';
      } else if (sourceValue === 'gps') {
        dataSource = 'gps';
      } else if (sourceValue === 'healthkit') {
        dataSource = 'healthkit';
      } else if (sourceValue === 'runstr') {
        dataSource = 'RUNSTR';
      }
    }

    const workout: NostrWorkout & { activityType?: string } = {
      id: event.id,
      userId: event.pubkey,
      source: 'nostr',
      type: workoutType as any,
      activityType: workoutType,
      startTime: new Date(startTimestamp).toISOString(),
      endTime: new Date(endTimestamp).toISOString(),
      duration: duration, // in seconds
      distance: distance, // in meters
      calories: parseInt(this.extractTag(tags, 'calories') || '0'),
      heartRate: {
        avg: parseInt(this.extractTag(tags, 'avg_hr') || '0'),
        max: parseInt(this.extractTag(tags, 'max_hr') || '0'),
      },
      nostrEventId: event.id,
      nostrPubkey: event.pubkey,
      nostrCreatedAt: event.created_at,
      unitSystem: 'metric' as const,
      syncedAt: new Date().toISOString(),
      dataSource: dataSource, // For filtering manual entries from competitions
    };

    return workout;
  }

  /**
   * Extract tag value from event tags
   */
  private extractTag(tags: string[][], tagName: string): string | undefined {
    const tag = tags.find((t) => t[0] === tagName);
    return tag?.[1];
  }

  /**
   * Parse distance in kilometers
   */
  private parseDistance(workout: NostrWorkout): number {
    if (!workout.distance) return 0;

    // Distance is stored in meters, convert to km
    return workout.distance / 1000;
  }

  /**
   * Parse duration in minutes
   */
  private parseDuration(workout: NostrWorkout): number {
    if (!workout.duration) return 0;

    // Duration is stored in seconds, convert to minutes
    return workout.duration / 60;
  }

  /**
   * Calculate consecutive day streak
   */
  private calculateStreak(activeDays: string[]): number {
    if (activeDays.length === 0) return 0;

    // Sort dates
    const sortedDates = activeDays
      .map((d) => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    let streak = 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if most recent activity was today or yesterday
    const mostRecent = sortedDates[0];
    const daysDiff = Math.floor(
      (today.getTime() - mostRecent.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (daysDiff > 1) return 0; // Streak broken

    // Count consecutive days
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = sortedDates[i - 1];
      const currDate = sortedDates[i];
      const diff = Math.floor(
        (prevDate.getTime() - currDate.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Map activity type to Nostr tag
   */
  private mapActivityTypeToTag(activityType: NostrActivityType): string {
    const mapping: Record<NostrActivityType | 'Any', string> = {
      Running: 'running',
      Walking: 'walking',
      Cycling: 'cycling',
      'Strength Training': 'strength',
      Meditation: 'meditation',
      Yoga: 'yoga',
      Diet: 'diet',
      Any: 'any',
    } as const;
    return mapping[activityType] || activityType.toLowerCase();
  }

  /**
   * Generate cache key for query
   */
  private getCacheKey(query: CompetitionQuery): string {
    return `${(query.memberNpubs || []).sort().join(',')}:${
      query.activityType
    }:${query.startDate.getTime()}:${query.endDate.getTime()}`;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.queryCache.clear();
    console.log('🧹 Cleared competition query cache');
  }

  /**
   * Query ALL kind 1301 workouts in a date range for open events
   * Unlike queryMemberWorkouts, this doesn't filter by author - it gets ALL qualifying workouts
   * Used for open events where anyone can participate without RSVP
   */
  async queryOpenEventWorkouts(params: {
    activityType: string;
    startDate: Date;
    endDate: Date;
    minDistance?: number; // Minimum distance in km (e.g., 5 for 5K events)
    minSplits?: number; // Minimum split count (e.g., 5 for 5K events)
  }): Promise<QueryResult> {
    const startTime = Date.now();
    const { activityType, startDate, endDate, minDistance, minSplits } = params;

    const cacheKey = `open:${activityType}:${startDate.getTime()}:${endDate.getTime()}:${minDistance}:${minSplits}`;

    // Check cache
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_EXPIRY) {
      console.log('✅ Returning cached open event query results');
      return { ...cached.result, fromCache: true };
    }

    console.log(`🔓 Querying OPEN EVENT workouts (no author filter)`);
    console.log(
      `📅 Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`
    );
    console.log(`🏃 Activity type: ${activityType}`);
    if (minDistance) console.log(`📏 Min distance: ${minDistance} km`);
    if (minSplits) console.log(`📊 Min splits: ${minSplits}`);

    try {
      const ndk = await GlobalNDKService.getInstance();

      // Check relay connectivity
      const status = GlobalNDKService.getStatus();
      console.log(`🔌 Relay status: ${status.connectedRelays}/${status.relayCount} relays connected`);
      if (status.connectedRelays === 0) {
        console.log('⚠️ No relays connected! Waiting for connection...');
        await GlobalNDKService.waitForMinimumConnection(1, 5000);
        const newStatus = GlobalNDKService.getStatus();
        console.log(`🔌 After wait: ${newStatus.connectedRelays}/${newStatus.relayCount} relays connected`);
      }

      // Build filter - NO authors field to get ALL kind 1301 events in range
      const filter: any = {
        kinds: [1301],
        since: Math.floor(startDate.getTime() / 1000),
        until: Math.floor(endDate.getTime() / 1000),
        limit: 500,
      };

      console.log(`📡 NDK Filter:`, JSON.stringify(filter));

      const events: any[] = [];

      // Subscribe with timeout (5 seconds for broader query)
      const sub = ndk.subscribe(filter, { closeOnEose: false });

      await new Promise<void>((resolve) => {
        sub.on('event', (event: any) => {
          events.push(event);
        });

        // 5-second timeout for open queries (larger result set)
        setTimeout(() => {
          // ✅ MEMORY LEAK FIX: Remove listeners before stopping subscription
          sub.removeAllListeners('event');
          sub.removeAllListeners('eose');
          sub.stop();
          resolve();
        }, 5000);
      });

      console.log(`📥 Received ${events.length} raw kind 1301 events`);

      // Parse and filter workouts
      const metrics = new Map<string, WorkoutMetrics>();
      let totalWorkouts = 0;
      let filteredByActivity = 0;
      let filteredByDistance = 0;
      let filteredBySplits = 0;
      let filteredByManual = 0;

      for (const event of events) {
        const workout = this.parseWorkoutEvent(event);

        // ✅ FILTER OUT MANUAL ENTRIES: Exclude manual entries from competition leaderboards
        // Manual entries (custom exercises) should not be included in competitive events
        if (workout.dataSource === 'manual') {
          filteredByManual++;
          if (filteredByManual <= 3) {
            console.log(`   🚫 Filtered manual entry: pubkey ${event.pubkey?.substring(0, 8)}...`);
          }
          continue;
        }

        // Filter by activity type (case-insensitive comparison)
        // mapSportToActivityType returns 'Running' but kind 1301 uses 'running'
        const normalizedWorkoutType = ((workout as any).activityType || '').toLowerCase();
        const normalizedQueryType = activityType.toLowerCase();
        if (normalizedQueryType !== 'any' && normalizedWorkoutType !== normalizedQueryType) {
          filteredByActivity++;
          // DEBUG: Log first few filtered-by-activity
          if (filteredByActivity <= 3) {
            console.log(`   ❌ Filtered by activity: got "${(workout as any).activityType}" (${normalizedWorkoutType}), wanted "${activityType}" (${normalizedQueryType})`);
          }
          continue;
        }

        // Filter by minimum distance (convert meters to km)
        const distanceKm = (workout.distance || 0) / 1000;
        if (minDistance && distanceKm < minDistance * 0.95) {
          // 5% tolerance
          filteredByDistance++;
          // DEBUG: Log first few filtered-by-distance
          if (filteredByDistance <= 3) {
            console.log(`   ❌ Filtered by distance: got ${distanceKm.toFixed(2)}km, need ${(minDistance * 0.95).toFixed(2)}km`);
          }
          continue;
        }

        // Filter by minimum splits
        const splitCount = this.countSplits(event);
        if (minSplits && splitCount < minSplits) {
          filteredBySplits++;
          // DEBUG: Log first few filtered-by-splits
          if (filteredBySplits <= 3) {
            console.log(`   ❌ Filtered by splits: got ${splitCount}, need ${minSplits}`);
          }
          continue;
        }

        // DEBUG: Log qualifying workouts
        console.log(`   ✅ QUALIFYING: pubkey ${event.pubkey?.substring(0, 8)}..., activity: ${(workout as any).activityType}, distance: ${distanceKm.toFixed(2)}km, splits: ${splitCount}`);

        // Add to metrics (keyed by pubkey/npub)
        const npub = workout.nostrPubkey || event.pubkey;
        const existing = metrics.get(npub);

        if (existing) {
          // Add to existing metrics
          existing.workouts.push(workout);
          existing.totalDistance += distanceKm;
          existing.totalDuration += (workout.duration || 0) / 60;
          existing.workoutCount++;
          if (distanceKm > existing.longestDistance) {
            existing.longestDistance = distanceKm;
          }
        } else {
          // Create new metrics entry
          metrics.set(npub, {
            npub,
            totalDistance: distanceKm,
            totalDuration: (workout.duration || 0) / 60,
            totalCalories: workout.calories || 0,
            workoutCount: 1,
            activeDays: 1,
            longestDistance: distanceKm,
            longestDuration: (workout.duration || 0) / 60,
            streakDays: 0,
            workouts: [workout],
          });
        }

        totalWorkouts++;
      }

      console.log(`✅ Open event query complete:`);
      console.log(`   - ${totalWorkouts} qualifying workouts`);
      console.log(`   - ${metrics.size} unique participants`);
      console.log(
        `   - Filtered: ${filteredByManual} manual, ${filteredByActivity} by activity, ${filteredByDistance} by distance, ${filteredBySplits} by splits`
      );

      const result: QueryResult = {
        metrics,
        totalWorkouts,
        queryTime: Date.now() - startTime,
        fromCache: false,
      };

      // Cache result
      this.queryCache.set(cacheKey, { result, timestamp: Date.now() });

      return result;
    } catch (error) {
      console.error('❌ Open event query failed:', error);
      return {
        metrics: new Map(),
        totalWorkouts: 0,
        queryTime: Date.now() - startTime,
        fromCache: false,
        error: error instanceof Error ? error.message : 'Query failed',
      };
    }
  }

  /**
   * Count split tags in a workout event
   */
  private countSplits(event: any): number {
    const tags = event.tags || [];
    return tags.filter((t: string[]) => t[0] === 'split').length;
  }
}

export default Competition1301QueryService.getInstance();
