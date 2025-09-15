/**
 * Competition1301QueryService - Query kind 1301 workout events for competitions
 * Fetches and aggregates workout data from team members within specified date ranges
 * Uses proven Nuclear1301Service pattern for reliable Nostr queries
 */

import type { NostrWorkout } from '../../types/nostrWorkout';
import type { NostrActivityType } from '../../types/nostrCompetition';

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
  memberNpubs: string[];
  activityType: NostrActivityType | 'Any';
  startDate: Date;
  endDate: Date;
}

export interface QueryResult {
  metrics: Map<string, WorkoutMetrics>;
  totalWorkouts: number;
  queryTime: number;
  fromCache: boolean;
}

export class Competition1301QueryService {
  private static instance: Competition1301QueryService;
  private queryCache: Map<string, { result: QueryResult; timestamp: number }> = new Map();
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
    const cacheKey = this.getCacheKey(query);

    // Check cache
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_EXPIRY) {
      console.log('✅ Returning cached competition query results');
      return { ...cached.result, fromCache: true };
    }

    console.log(`🔍 Querying workouts for ${query.memberNpubs.length} members`);
    console.log(`📅 Date range: ${query.startDate.toISOString()} to ${query.endDate.toISOString()}`);
    console.log(`🏃 Activity type: ${query.activityType}`);

    const metrics = new Map<string, WorkoutMetrics>();
    let totalWorkouts = 0;

    // Query each member's workouts in parallel
    const memberPromises = query.memberNpubs.map(async (npub) => {
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

    console.log(`✅ Query complete: ${totalWorkouts} workouts in ${result.queryTime}ms`);
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
      // Import required tools
      const { nip19 } = await import('nostr-tools');
      const NDK = await import('@nostr-dev-kit/ndk');

      // Convert npub to hex if needed
      let hexPubkey = npub;
      if (npub.startsWith('npub1')) {
        const decoded = nip19.decode(npub);
        hexPubkey = decoded.data as string;
      }

      // Use singleton NDK instance
      const g = globalThis as any;
      let ndk = g.__RUNSTR_NDK_INSTANCE__;

      if (!ndk) {
        const relayUrls = [
          'wss://relay.damus.io',
          'wss://nos.lol',
          'wss://relay.primal.net',
          'wss://nostr.wine',
          'wss://relay.nostr.band',
        ];

        ndk = new NDK.default({ explicitRelayUrls: relayUrls });
        await ndk.connect();
        g.__RUNSTR_NDK_INSTANCE__ = ndk;
      }

      // Build filter for 1301 events
      const filter: any = {
        kinds: [1301],
        authors: [hexPubkey],
        since: Math.floor(query.startDate.getTime() / 1000),
        until: Math.floor(query.endDate.getTime() / 1000),
        limit: 500,
      };

      // Add activity type filter if not "Any"
      if (query.activityType !== 'Any') {
        filter['#t'] = [this.mapActivityTypeToTag(query.activityType)];
      }

      const events: any[] = [];

      // Subscribe with timeout
      const sub = ndk.subscribe(filter, { closeOnEose: false });

      await new Promise<void>((resolve) => {
        sub.on('event', (event: any) => {
          events.push(event);
        });

        // 3-second timeout (proven pattern from Nuclear1301Service)
        setTimeout(() => {
          sub.stop();
          resolve();
        }, 3000);
      });

      // Parse events into NostrWorkout format
      return events.map(event => this.parseWorkoutEvent(event));

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
    workouts.forEach(workout => {
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
      if (!metrics.lastActivityDate || workout.startTime > metrics.lastActivityDate) {
        metrics.lastActivityDate = workout.startTime;
      }
    });

    metrics.activeDays = activeDaysSet.size;

    // Calculate averages
    if (metrics.totalDistance > 0 && metrics.totalDuration > 0) {
      metrics.averagePace = metrics.totalDuration / metrics.totalDistance; // min/km
      metrics.averageSpeed = (metrics.totalDistance / metrics.totalDuration) * 60; // km/h
    }

    // Calculate streak
    metrics.streakDays = this.calculateStreak(Array.from(activeDaysSet));

    return metrics;
  }

  /**
   * Parse workout event into NostrWorkout format
   */
  private parseWorkoutEvent(event: any): NostrWorkout {
    const tags = event.tags || [];
    const workout: NostrWorkout = {
      id: event.id,
      source: 'nostr',
      type: (this.extractTag(tags, 't') || 'Unknown') as any,
      activityType: this.extractTag(tags, 't') || 'Unknown',
      startTime: new Date(event.created_at * 1000).toISOString(),
      endTime: new Date(event.created_at * 1000).toISOString(),
      duration: parseInt(this.extractTag(tags, 'duration') || '0'),
      distance: parseFloat(this.extractTag(tags, 'distance') || '0'),
      calories: parseInt(this.extractTag(tags, 'calories') || '0'),
      averageHeartRate: parseInt(this.extractTag(tags, 'avg_hr') || '0'),
      maxHeartRate: parseInt(this.extractTag(tags, 'max_hr') || '0'),
      nostrEventId: event.id,
      nostrPubkey: event.pubkey,
      nostrCreatedAt: event.created_at,
      unitSystem: (this.extractTag(tags, 'unit') === 'mi' ? 'imperial' : 'metric') as any,
    };

    return workout;
  }

  /**
   * Extract tag value from event tags
   */
  private extractTag(tags: string[][], tagName: string): string | undefined {
    const tag = tags.find(t => t[0] === tagName);
    return tag?.[1];
  }

  /**
   * Parse distance in kilometers
   */
  private parseDistance(workout: NostrWorkout): number {
    if (!workout.distance) return 0;

    // Convert to km if needed
    if (workout.unitSystem === 'imperial') {
      return workout.distance * 1.60934;
    }
    return workout.distance;
  }

  /**
   * Parse duration in minutes
   */
  private parseDuration(workout: NostrWorkout): number {
    return workout.duration || 0;
  }

  /**
   * Calculate consecutive day streak
   */
  private calculateStreak(activeDays: string[]): number {
    if (activeDays.length === 0) return 0;

    // Sort dates
    const sortedDates = activeDays
      .map(d => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    let streak = 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if most recent activity was today or yesterday
    const mostRecent = sortedDates[0];
    const daysDiff = Math.floor((today.getTime() - mostRecent.getTime()) / (24 * 60 * 60 * 1000));

    if (daysDiff > 1) return 0; // Streak broken

    // Count consecutive days
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = sortedDates[i - 1];
      const currDate = sortedDates[i];
      const diff = Math.floor((prevDate.getTime() - currDate.getTime()) / (24 * 60 * 60 * 1000));

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
      'Running': 'running',
      'Walking': 'walking',
      'Cycling': 'cycling',
      'Strength Training': 'strength',
      'Meditation': 'meditation',
      'Yoga': 'yoga',
      'Diet': 'diet',
      'Any': 'any',
    } as const;
    return mapping[activityType] || activityType.toLowerCase();
  }

  /**
   * Generate cache key for query
   */
  private getCacheKey(query: CompetitionQuery): string {
    return `${query.memberNpubs.sort().join(',')}:${query.activityType}:${query.startDate.getTime()}:${query.endDate.getTime()}`;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.queryCache.clear();
    console.log('🧹 Cleared competition query cache');
  }
}

export default Competition1301QueryService.getInstance();