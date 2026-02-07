/**
 * Simple Leaderboard Service - MVP Implementation
 * Calculates competition rankings from kind 1301 workout events
 * ✅ UPDATED: Now with 5-minute caching via CompetitionCacheService for 80% fewer queries
 */

import { GlobalNDKService } from '../nostr/GlobalNDKService';
import { CompetitionCacheService } from '../cache/CompetitionCacheService';
import { UnifiedCacheService } from '../cache/UnifiedCacheService';
import {
  type NDKFilter,
  type NDKEvent,
  NDKSubscriptionCacheUsage,
} from '@nostr-dev-kit/ndk';
import { nip19 } from 'nostr-tools';
import type { League, CompetitionEvent } from './SimpleCompetitionService';
import { NostrFetchLogger } from '../../utils/NostrFetchLogger';

export interface LeaderboardEntry {
  rank: number;
  npub: string;
  name: string;
  score: number;
  formattedScore: string;
  workoutCount: number;
  participationType?: 'in-person' | 'virtual'; // Track how user is participating
  lightningAddress?: string; // User's lightning address from workout ["lightning", "..."] tag
}

export interface Workout {
  id: string;
  npub: string;
  activityType: string;
  distance: number; // in km
  duration: number; // in seconds
  calories?: number;
  timestamp: number; // Unix timestamp
  splits?: Map<number, number>; // km -> elapsed time in seconds (e.g., km 5 -> 1440s)
  splitPaces?: Map<number, number>; // km -> pace in seconds per km
  lightningAddress?: string; // User's reward lightning address from ["lightning", "..."] tag
  steps?: number; // Step count from ["steps", "..."] tag
}

export class SimpleLeaderboardService {
  private static instance: SimpleLeaderboardService;
  private cacheService: typeof UnifiedCacheService;

  private constructor() {
    this.cacheService = UnifiedCacheService;
  }

  static getInstance(): SimpleLeaderboardService {
    if (!SimpleLeaderboardService.instance) {
      SimpleLeaderboardService.instance = new SimpleLeaderboardService();
    }
    return SimpleLeaderboardService.instance;
  }

  /**
   * Get smart TTL for daily leaderboards based on date
   * Today's leaderboards: 5 minutes (data changes frequently)
   * Historical leaderboards: 24 hours (data is frozen)
   */
  private getSmartTTL(dateString: string): number {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const isToday = dateString === today;

    if (isToday) {
      // Active leaderboard - cache for 5 minutes
      return 300; // 5 minutes in seconds
    } else {
      // Historical/completed leaderboard - cache for 24 hours
      return 86400; // 24 hours in seconds
    }
  }

  /**
   * Calculate league leaderboard
   */
  async calculateLeagueLeaderboard(
    league: League,
    teamMembers: string[]
  ): Promise<LeaderboardEntry[]> {
    console.log(`🏆 Calculating leaderboard for league: ${league.name}`);
    console.log(`   Team members: ${teamMembers.length}`);

    // Get workouts for all team members
    const workouts = await this.getWorkouts(
      teamMembers,
      league.activityType,
      new Date(league.startDate),
      new Date(league.endDate)
    );

    console.log(`   Found ${workouts.length} workouts`);

    // Calculate scores by member
    const scoresByMember = this.calculateScores(workouts, league.metric);

    // CRITICAL FIX: Create entries for ALL team members, even those with 0 workouts
    const entries: LeaderboardEntry[] = teamMembers.map((npub) => {
      const memberData = scoresByMember.get(npub);

      if (memberData) {
        // Member has workouts - use their actual scores
        return {
          rank: 0, // Will be set after sorting
          npub,
          name: npub.slice(0, 8) + '...',
          score: memberData.score,
          formattedScore: this.formatScore(memberData.score, league.metric),
          workoutCount: memberData.workoutCount,
          lightningAddress: memberData.lightningAddress,
        };
      } else {
        // Member has NO workouts - show them with 0 score
        return {
          rank: 0, // Will be set after sorting
          npub,
          name: npub.slice(0, 8) + '...',
          score: 0,
          formattedScore: this.formatScore(0, league.metric),
          workoutCount: 0,
        };
      }
    });

    // Sort by score (descending)
    entries.sort((a, b) => b.score - a.score);

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    console.log(
      `✅ Leaderboard calculated: ${entries.length} entries (${teamMembers.length} team members)`
    );
    return entries;
  }

  /**
   * Calculate event leaderboard
   * ✅ UPDATED: Support new scoringType (completion vs fastest_time)
   */
  async calculateEventLeaderboard(
    event: CompetitionEvent,
    teamMembers: string[]
  ): Promise<LeaderboardEntry[]> {
    console.log(`🏆 Calculating leaderboard for event: ${event.name}`);
    console.log(`   Scoring type: ${event.scoringType || event.metric}`);
    console.log(
      `   📊 DEBUG: Starting leaderboard calculation for ${teamMembers.length} members`
    );

    // ⚠️ TEMPORARY: Commented out for testing - this fetch can hang indefinitely
    // ✅ NEW: Fetch join requests to get participation types
    const participationTypeMap = new Map<string, 'in-person' | 'virtual'>();
    // try {
    //   console.log(`   🔍 DEBUG: Starting join request fetch...`);
    //   const joinRequestService = EventJoinRequestService.getInstance();
    //   const joinRequests = await joinRequestService.getEventJoinRequestsByEventIds([event.id]);
    //   const eventRequests = joinRequests.get(event.id) || [];

    //   // Map hex pubkey -> npub for participation type lookup
    //   const { nip19 } = await import('nostr-tools');
    //   for (const request of eventRequests) {
    //     if (request.participationType) {
    //       try {
    //         const npub = nip19.npubEncode(request.requesterId);
    //         participationTypeMap.set(npub, request.participationType);
    //       } catch (error) {
    //         console.warn(`Failed to encode npub for ${request.requesterId}:`, error);
    //       }
    //     }
    //   }
    //   console.log(`   Loaded ${participationTypeMap.size} participation type preferences`);
    // } catch (error) {
    //   console.warn('Failed to fetch participation types (non-critical):', error);
    // }
    console.log(`   ✅ DEBUG: Skipped join request fetch (testing mode)`);

    const eventDate = new Date(event.eventDate);
    const eventStart = new Date(eventDate);
    eventStart.setHours(0, 0, 0, 0);
    const eventEnd = new Date(eventDate);
    eventEnd.setHours(23, 59, 59, 999);

    // Get workouts for event day
    console.log(
      `   🔍 DEBUG: Starting workout fetch for ${teamMembers.length} members...`
    );
    console.log(`   🔍 DEBUG: Activity type: ${event.activityType}`);
    console.log(
      `   🔍 DEBUG: Date range: ${eventStart.toISOString()} to ${eventEnd.toISOString()}`
    );

    const workouts = await this.getWorkouts(
      teamMembers,
      event.activityType,
      eventStart,
      eventEnd
    );

    console.log(`   ✅ DEBUG: Workout fetch complete!`);
    console.log(`   Found ${workouts.length} workouts on event day`);

    // Filter workouts by target distance if specified
    let relevantWorkouts = workouts;
    if (event.targetDistance) {
      const minDistance = event.targetDistance * 0.95; // Allow 5% margin
      relevantWorkouts = workouts.filter((w) => w.distance >= minDistance);
      console.log(
        `   ${relevantWorkouts.length} workouts meet distance requirement`
      );

      // Use split data to extract time at target distance for accurate scoring
      // This ensures runners who go beyond target aren't penalized
      relevantWorkouts = relevantWorkouts.map((workout) => {
        const targetTime = this.extractTargetDistanceTime(
          workout,
          event.targetDistance!
        );

        // Log split data usage for transparency
        if (
          workout.splits &&
          workout.splits.size > 0 &&
          targetTime !== workout.duration
        ) {
          console.log(
            `   ✅ Using split data for ${workout.npub.slice(
              0,
              8
            )}: ${targetTime}s (was ${workout.duration}s)`
          );
        }

        // Return adjusted workout with target distance time
        return {
          ...workout,
          duration: targetTime, // Override with split-based time
        };
      });
    }

    // ✅ FIX: Use scoringType instead of metric
    const scoringType = event.scoringType || event.metric;
    const scoresByMember = this.calculateScores(relevantWorkouts, scoringType);

    // CRITICAL FIX: Create entries for ALL team members, even those with 0 workouts
    const entries: LeaderboardEntry[] = teamMembers.map((npub) => {
      const memberData = scoresByMember.get(npub);
      const participationType = participationTypeMap.get(npub); // ✅ NEW: Get participation type

      if (memberData) {
        // Member has workouts - use their actual scores
        return {
          rank: 0,
          npub,
          name: npub.slice(0, 8) + '...',
          score: memberData.score,
          formattedScore: this.formatScore(memberData.score, scoringType),
          workoutCount: memberData.workoutCount,
          participationType,
          lightningAddress: memberData.lightningAddress,
        };
      } else {
        // Member has NO workouts - show them with 0 score
        return {
          rank: 0,
          npub,
          name: npub.slice(0, 8) + '...',
          score: 0,
          formattedScore: this.formatScore(0, scoringType),
          workoutCount: 0,
          participationType,
        };
      }
    });

    // Sort and rank based on scoring type
    entries.sort((a, b) => {
      // ✅ NEW: For completion events, everyone who completed ranks equally (or by earliest submission)
      if (scoringType === 'completion') {
        // Completed (score > 0) ranks above not completed (score === 0)
        if (a.score > 0 && b.score === 0) return -1;
        if (a.score === 0 && b.score > 0) return 1;
        // Both completed or both not completed - maintain order (stable sort)
        return 0;
      }

      // For time-based metrics (fastest_time), lower is better
      if (scoringType === 'fastest_time' || event.metric === 'fastest_time') {
        // Move zero scores (didn't complete) to bottom
        if (a.score === 0 && b.score > 0) return 1;
        if (a.score > 0 && b.score === 0) return -1;
        return a.score - b.score;
      }

      // For all other metrics, higher is better
      return b.score - a.score;
    });

    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    console.log(
      `✅ Event leaderboard calculated: ${entries.length} entries (${teamMembers.length} team members)`
    );
    return entries;
  }

  /**
   * Calculate team goal progress (for team-total scoring mode)
   * Returns combined team total and percentage of goal
   */
  async calculateTeamGoalProgress(
    event: CompetitionEvent,
    teamMembers: string[]
  ): Promise<{
    current: number;
    goal: number;
    percentage: number;
    formattedCurrent: string;
    formattedGoal: string;
    unit: string;
  }> {
    console.log(`🎯 Calculating team goal progress for: ${event.name}`);
    console.log(`   Team goal: ${event.teamGoal} ${event.targetUnit || 'km'}`);

    const eventDate = new Date(event.eventDate);
    let eventStart: Date;
    let eventEnd: Date;

    // Handle short duration events
    if (event.durationMinutes) {
      eventStart = eventDate;
      eventEnd = new Date(
        eventDate.getTime() + event.durationMinutes * 60 * 1000
      );
    } else {
      // Full day event
      eventStart = new Date(eventDate);
      eventStart.setHours(0, 0, 0, 0);
      eventEnd = new Date(eventDate);
      eventEnd.setHours(23, 59, 59, 999);
    }

    // Get workouts for event period
    const workouts = await this.getWorkouts(
      teamMembers,
      event.activityType,
      eventStart,
      eventEnd
    );

    console.log(`   Found ${workouts.length} workouts`);

    // Calculate total based on metric type
    let total = 0;
    const metric = event.scoringType || event.metric;

    for (const workout of workouts) {
      switch (metric) {
        case 'total_distance':
        case 'fastest_time': // For races, sum all distances
          total += workout.distance;
          break;
        case 'total_duration':
          total += workout.duration;
          break;
        case 'total_calories':
          total += workout.calories || 0;
          break;
        case 'most_workouts':
          total += 1;
          break;
        default:
          total += workout.distance; // Default to distance
      }
    }

    const goal = event.teamGoal || 0;
    const percentage = goal > 0 ? (total / goal) * 100 : 0;
    const unit = event.targetUnit || 'km';

    // Format numbers based on metric
    const formattedCurrent = this.formatTeamGoalValue(total, metric, unit);
    const formattedGoal = this.formatTeamGoalValue(goal, metric, unit);

    console.log(
      `✅ Team progress: ${formattedCurrent} / ${formattedGoal} (${percentage.toFixed(
        1
      )}%)`
    );

    return {
      current: total,
      goal,
      percentage,
      formattedCurrent,
      formattedGoal,
      unit,
    };
  }

  /**
   * Format team goal values for display
   */
  private formatTeamGoalValue(
    value: number,
    metric: string,
    unit: string
  ): string {
    switch (metric) {
      case 'total_distance':
      case 'fastest_time':
        return `${value.toFixed(1)} ${unit}`;
      case 'total_duration':
        const hours = Math.floor(value / 3600);
        const minutes = Math.floor((value % 3600) / 60);
        return `${hours}h ${minutes}m`;
      case 'total_calories':
        return `${Math.round(value)} cal`;
      case 'most_workouts':
        return `${Math.round(value)} workouts`;
      default:
        return `${value.toFixed(1)} ${unit}`;
    }
  }

  /**
   * Timeout wrapper for async operations
   */
  private async fetchWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutError: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(timeoutError)), timeoutMs)
      ),
    ]);
  }

  /**
   * Get workouts for members within date range
   * ✅ PERFORMANCE: Now with 5-minute caching for instant revisits
   */
  private async getWorkouts(
    memberNpubs: string[],
    activityType: string,
    startDate: Date,
    endDate: Date
  ): Promise<Workout[]> {
    NostrFetchLogger.start('Leaderboard.getWorkouts', { members: memberNpubs.length, activityType });

    if (memberNpubs.length === 0) {
      console.log('No members to query workouts for');
      NostrFetchLogger.end('Leaderboard.getWorkouts', 0, 'no members');
      return [];
    }

    // ✅ NEW: Check cache first
    const cachedWorkouts =
      await this.cacheService.getCachedLeaderboardWorkouts<Workout>(
        memberNpubs,
        activityType,
        startDate,
        endDate
      );

    if (cachedWorkouts) {
      console.log(
        `💾 Returning ${cachedWorkouts.length} cached workouts (instant load)`
      );
      NostrFetchLogger.cacheHit('Leaderboard.getWorkouts');
      NostrFetchLogger.end('Leaderboard.getWorkouts', cachedWorkouts.length, 'cached');
      return cachedWorkouts;
    }

    NostrFetchLogger.cacheMiss('Leaderboard.getWorkouts');

    // Cache miss - fetch from Nostr
    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);

    try {
      // Progressive: Accept 2/4 relays for faster leaderboard loading
      const connected = await GlobalNDKService.waitForMinimumConnection(
        2,
        4000
      );
      if (!connected) {
        console.warn(
          '⚠️ Proceeding with minimal relay connectivity for workout query'
        );
      }

      const ndk = await GlobalNDKService.getInstance();

      // ✅ CRITICAL: Convert npubs to hex if needed (NDK requires hex in authors field)
      const hexPubkeys: string[] = [];
      for (const pubkey of memberNpubs) {
        if (pubkey.startsWith('npub1')) {
          // Convert npub to hex
          try {
            const decoded = ndk.nip19.decode(pubkey);
            hexPubkeys.push(decoded.data as string);
            console.log(
              `🔄 Converted npub to hex: ${pubkey.slice(0, 12)}... → ${(
                decoded.data as string
              ).slice(0, 12)}...`
            );
          } catch (decodeError) {
            console.error(`❌ Failed to decode npub: ${pubkey}`, decodeError);
            // Skip invalid npubs
          }
        } else if (pubkey.length === 64 && /^[0-9a-f]+$/i.test(pubkey)) {
          // Already hex format
          hexPubkeys.push(pubkey);
        } else {
          console.error(
            `❌ Invalid pubkey format (not npub or hex): ${pubkey}`
          );
        }
      }

      if (hexPubkeys.length === 0) {
        console.error(
          '❌ No valid pubkeys after format validation - cannot query workouts'
        );
        return [];
      }

      console.log(
        `✅ Validated ${hexPubkeys.length}/${memberNpubs.length} pubkeys for NDK query`
      );

      const filter: NDKFilter = {
        kinds: [1301],
        authors: hexPubkeys, // Use validated hex pubkeys
        since: startTimestamp,
        until: endTimestamp,
        limit: 500, // ✅ Reduced from 1000 to match working pattern (nuclear approach)
        // ✅ NO tag filters - activity filtering done client-side
      };

      // ✅ NUCLEAR PATTERN: Use subscription with guaranteed timeout
      console.log(
        `⏱️ NUCLEAR: Starting subscription for ${hexPubkeys.length} members...`
      );
      console.log(`🔍 NDK Filter:`, JSON.stringify(filter, null, 2));

      const eventsArray: any[] = [];
      const subscription = ndk.subscribe(filter, {
        closeOnEose: false,
      });

      subscription.on('event', (event: any) => {
        console.log(
          `📥 NUCLEAR: Received kind 1301 event ${eventsArray.length + 1}`
        );
        eventsArray.push(event);
      });

      subscription.on('eose', () => {
        console.log(
          '📨 NUCLEAR: EOSE received - continuing to wait for timeout...'
        );
      });

      // ✅ GUARANTEED TIMEOUT: Always fires after 5 seconds
      console.log('⏰ NUCLEAR: Waiting 5 seconds for all events...');
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          // ✅ MEMORY LEAK FIX: Remove listeners before stopping subscription
          subscription.removeAllListeners('event');
          subscription.removeAllListeners('eose');
          subscription.stop();
          resolve();
        }, 5000);
      });

      console.log(`📥 NUCLEAR: Collected ${eventsArray.length} workout events`);

      if (eventsArray.length === 0) {
        console.warn('⚠️ No workout events found - leaderboard will be empty');
        console.warn('   Possible causes:');
        console.warn('   - No workouts published in date range');
        console.warn('   - Pubkey format mismatch');
        console.warn('   - Relay connectivity issues');
        console.warn('   - Activity type filter too restrictive');
      }

      const workouts: Workout[] = [];

      // ✅ PERFORMANCE: Batch process events to avoid blocking UI (runstr-github pattern)
      const BATCH_SIZE = 100;

      for (let i = 0; i < eventsArray.length; i += BATCH_SIZE) {
        const batch = eventsArray.slice(i, i + BATCH_SIZE);

        batch.forEach((event) => {
          const workout = this.parseWorkoutEvent(event);
          if (workout) {
            // Filter by activity type if not "Any"
            if (
              activityType === 'Any' ||
              workout.activityType.toLowerCase() === activityType.toLowerCase()
            ) {
              workouts.push(workout);
            }
          }
        });

        // Yield to UI thread between batches (runstr-github pattern)
        if (i + BATCH_SIZE < eventsArray.length) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      // ✅ NEW: Cache the results for 5 minutes
      if (workouts.length > 0) {
        await this.cacheService.cacheLeaderboardWorkouts(
          memberNpubs,
          activityType,
          startDate,
          endDate,
          workouts
        );
      }

      NostrFetchLogger.end('Leaderboard.getWorkouts', workouts.length, 'fresh');
      return workouts;
    } catch (error) {
      if (error instanceof Error && error.message === 'Workout fetch timeout') {
        console.warn(
          '⚠️ Workout fetch timed out after 5 seconds - showing empty leaderboard'
        );
        console.warn(
          '   This may indicate slow relay connections or large result set'
        );
        NostrFetchLogger.timeout('Leaderboard.getWorkouts', 5000);
        return [];
      }
      console.error('Failed to fetch workouts:', error);
      NostrFetchLogger.error('Leaderboard.getWorkouts', error instanceof Error ? error : String(error));
      return [];
    }
  }

  /**
   * Parse kind 1301 event into Workout
   */
  private parseWorkoutEvent(event: NDKEvent): Workout | null {
    try {
      const getTag = (name: string) =>
        event.tags.find((t) => t[0] === name)?.[1];

      const activityType = getTag('exercise') || 'unknown';
      const distanceStr = getTag('distance');
      const durationStr = getTag('duration');

      if (!distanceStr || !durationStr) {
        return null;
      }

      // Parse distance (could be in km or miles, assume km for now)
      const distance = parseFloat(distanceStr);

      // Parse duration (format: HH:MM:SS)
      const duration = this.parseDuration(durationStr);

      const caloriesStr = getTag('calories');

      // Parse split data (multiple split tags: ["split", "1", "00:05:12"])
      const splits = new Map<number, number>();
      const splitTags = event.tags.filter((t) => t[0] === 'split');
      for (const splitTag of splitTags) {
        const km = parseInt(splitTag[1]);
        const elapsedTime = this.parseDuration(splitTag[2]);
        if (!isNaN(km) && elapsedTime > 0) {
          splits.set(km, elapsedTime);
        }
      }

      // Parse split pace data (multiple split_pace tags: ["split_pace", "1", "360"])
      const splitPaces = new Map<number, number>();
      const splitPaceTags = event.tags.filter((t) => t[0] === 'split_pace');
      for (const paceTag of splitPaceTags) {
        const km = parseInt(paceTag[1]);
        const pace = parseInt(paceTag[2]);
        if (!isNaN(km) && !isNaN(pace)) {
          splitPaces.set(km, pace);
        }
      }

      // Convert hex pubkey to npub format for consistent profile lookups
      let npubFormat: string;
      try {
        npubFormat = nip19.npubEncode(event.pubkey);
      } catch (error) {
        console.warn(
          `Failed to encode npub for ${event.pubkey.slice(0, 8)}, using hex:`,
          error
        );
        npubFormat = event.pubkey; // Fallback to hex if encoding fails
      }

      // Get user's lightning address from workout event
      const lightningAddress = getTag('lightning');

      // Parse step count from ["steps", "..."] tag
      const stepsStr = getTag('steps');
      const steps = stepsStr ? parseInt(stepsStr) : undefined;

      return {
        id: event.id,
        npub: npubFormat, // Now stores npub1... format instead of hex
        activityType,
        distance,
        duration,
        calories: caloriesStr ? parseInt(caloriesStr) : undefined,
        timestamp: event.created_at,
        splits: splits.size > 0 ? splits : undefined,
        splitPaces: splitPaces.size > 0 ? splitPaces : undefined,
        lightningAddress,
        steps,
      };
    } catch (error) {
      console.error('Failed to parse workout event:', error);
      return null;
    }
  }

  /**
   * Parse duration string (HH:MM:SS or MM:SS) to seconds
   */
  private parseDuration(durationStr: string): number {
    const parts = durationStr.split(':');
    if (parts.length === 3) {
      // HH:MM:SS format
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      const seconds = parseInt(parts[2]);
      return hours * 3600 + minutes * 60 + seconds;
    } else if (parts.length === 2) {
      // MM:SS format
      const minutes = parseInt(parts[0]);
      const seconds = parseInt(parts[1]);
      return minutes * 60 + seconds;
    }
    return 0;
  }

  /**
   * Extract time at target distance using split data
   * Returns the elapsed time when runner reached the target distance
   * Falls back to full workout time if splits unavailable
   */
  private extractTargetDistanceTime(
    workout: Workout,
    targetDistanceKm: number
  ): number {
    // FIX: Defensive check - ensure splits is a Map before using Map methods
    // This prevents "undefined is not a function" crash when cached data has plain object
    const splitsIsMap = workout.splits instanceof Map;

    // If no splits available or not a Map, estimate target time from average pace
    // This supports Health Connect/HealthKit workouts that don't have per-km splits
    if (!workout.splits || !splitsIsMap || workout.splits.size === 0) {
      if (workout.distance && workout.distance > 0) {
        // Calculate estimated target time based on average pace
        // e.g., 5.18km in 31:15 → avgPace = 361.9 sec/km → 5K time = 30:10
        const avgPacePerKm = workout.duration / workout.distance;
        const estimatedTargetTime = avgPacePerKm * targetDistanceKm;
        return Math.round(estimatedTargetTime);
      }
      // No distance either - fall back to total workout time
      return workout.duration;
    }

    // Check if we have an exact split at target distance
    const exactSplit = workout.splits.get(targetDistanceKm);
    if (exactSplit !== undefined) {
      return exactSplit;
    }

    // If no exact match, find closest split <= target distance
    // (e.g., for 5k target with splits at 1,2,3,4, use split 4)
    let closestKm = 0;
    let closestTime = 0;

    for (const [km, time] of workout.splits.entries()) {
      if (km <= targetDistanceKm && km > closestKm) {
        closestKm = km;
        closestTime = time;
      }
    }

    // If we found a close split, interpolate to target distance
    if (closestKm > 0 && closestTime > 0) {
      // Calculate remaining distance and estimated time
      const remainingDistance = targetDistanceKm - closestKm;
      const avgPacePerKm = closestTime / closestKm; // Average pace up to this point
      const estimatedTime = closestTime + remainingDistance * avgPacePerKm;

      // Don't exceed total workout time
      return Math.min(estimatedTime, workout.duration);
    }

    // Fall back to full workout time
    return workout.duration;
  }

  /**
   * Calculate scores for each member based on metric
   */
  private calculateScores(
    workouts: Workout[],
    metric: string
  ): Map<string, { score: number; workoutCount: number; lightningAddress?: string; lastTimestamp: number }> {
    const scoresByMember = new Map<
      string,
      { score: number; workoutCount: number; lightningAddress?: string; lastTimestamp: number }
    >();

    for (const workout of workouts) {
      const existing = scoresByMember.get(workout.npub) || {
        score: 0,
        workoutCount: 0,
        lightningAddress: undefined,
        lastTimestamp: 0,
      };

      let score = existing.score;

      switch (metric) {
        case 'completion':
          // ✅ NEW: Binary completion scoring - 1 if completed, 0 if not
          // For completion events, just having ANY workout counts as completed
          score = 1;
          break;

        case 'total_distance':
          score += workout.distance;
          break;

        case 'most_workouts':
          score += 1;
          break;

        case 'total_duration':
          score += workout.duration;
          break;

        case 'total_calories':
          score += workout.calories || 0;
          break;

        case 'fastest_time':
          // For fastest time, we want the LOWEST duration
          if (existing.score === 0 || workout.duration < existing.score) {
            score = workout.duration;
          }
          break;

        case 'average_pace':
          // Calculate pace (min/km) - lower is better
          if (workout.distance > 0) {
            const paceMinutesPerKm = workout.duration / 60 / workout.distance;
            // Take the best pace
            if (existing.score === 0 || paceMinutesPerKm < existing.score) {
              score = paceMinutesPerKm;
            }
          }
          break;

        default:
          // Default to total distance
          score += workout.distance;
      }

      // Track lightning address from the most recent workout
      const isMoreRecent = workout.timestamp > existing.lastTimestamp;
      const lightningAddress = isMoreRecent && workout.lightningAddress
        ? workout.lightningAddress
        : existing.lightningAddress;

      scoresByMember.set(workout.npub, {
        score,
        workoutCount: existing.workoutCount + 1,
        lightningAddress,
        lastTimestamp: isMoreRecent ? workout.timestamp : existing.lastTimestamp,
      });
    }

    return scoresByMember;
  }

  /**
   * Format score for display
   * ✅ UPDATED: Support completion scoring type
   */
  private formatScore(score: number, metric: string): string {
    switch (metric) {
      case 'completion':
        // ✅ NEW: Binary completion display
        return score > 0 ? 'Completed ✓' : 'Not completed';

      case 'total_distance':
        return `${score.toFixed(2)} km`;

      case 'most_workouts':
        return `${score} workouts`;

      case 'total_duration':
        const hours = Math.floor(score / 3600);
        const minutes = Math.floor((score % 3600) / 60);
        return `${hours}h ${minutes}m`;

      case 'total_calories':
        return `${Math.round(score)} cal`;

      case 'fastest_time':
        if (score === 0) return 'Did not complete';
        const mins = Math.floor(score / 60);
        const secs = Math.floor(score % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;

      case 'average_pace':
        const paceMinutes = Math.floor(score);
        const paceSeconds = Math.floor((score % 1) * 60);
        return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')} /km`;

      default:
        return score.toFixed(2);
    }
  }

  /**
   * Get team daily leaderboards (5K/10K/Half/Marathon)
   * Returns singleton leaderboards based on split count in kind 1301 events
   * ✅ NEW: Fully open teams with auto-activating leaderboards
   * @param userHexPubkey - Optional: Filter to only show leaderboards where this user participated
   * @param forceRefresh - Optional: Bypass cache and fetch fresh data from relays
   * @param _isRetry - Internal: Used for retry mechanism (do not set manually)
   */
  async getTeamDailyLeaderboards(
    teamId: string,
    userHexPubkey?: string,
    forceRefresh: boolean = false,
    _isRetry: boolean = false
  ): Promise<{
    teamId: string;
    date: string;
    leaderboard5k: LeaderboardEntry[];
    leaderboard10k: LeaderboardEntry[];
    leaderboardHalf: LeaderboardEntry[];
    leaderboardMarathon: LeaderboardEntry[];
  }> {
    const todayMidnight = this.getTodayMidnightLocal(); // Changed to LOCAL timezone
    const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const queryStartTime = Date.now();

    // ========== DEBUG LOGGING: QUERY START ==========
    console.log(`📊 [Leaderboard] ========== QUERY START ==========`);
    console.log(`📊 [Leaderboard] Team: ${teamId}`);
    console.log(`📊 [Leaderboard] Force Refresh: ${forceRefresh}`);
    console.log(`📊 [Leaderboard] Is Retry: ${_isRetry}`);
    console.log(
      `📊 [Leaderboard] Query range: ${new Date(todayMidnight * 1000).toISOString()} → now`
    );

    // Check cache first (5-minute TTL) - unless forceRefresh is true
    const cacheKey = `team:${teamId}:daily:${todayDate}`;

    if (forceRefresh) {
      console.log(`📊 [Leaderboard] 🔄 FORCE REFRESH: Bypassing cache for ${teamId}`);
      // Clear existing cache entry
      await this.cacheService.invalidate(cacheKey);
    } else {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        console.log(`📊 [Leaderboard] ✅ CACHE HIT - Returning cached data`);
        console.log(`📊 [Leaderboard] ========== QUERY END (cached) ==========`);
        return cached;
      }
      console.log(`📊 [Leaderboard] ❌ CACHE MISS - Querying relays`);
    }

    // Query ALL kind 1301 events from today (no team filter - causes NDK hang)
    // We'll filter client-side for team tag instead
    const ndk = await GlobalNDKService.getInstance();

    // Log relay connection status
    const relayStatus = GlobalNDKService.getStatus();
    console.log(`📊 [Leaderboard] Relay Status: ${relayStatus.connectedRelays}/${relayStatus.relayCount} connected`);

    const filter: NDKFilter = {
      kinds: [1301],
      since: todayMidnight,
      limit: 100, // Reasonable limit to prevent excessive data
    };

    console.log(
      `📊 [Leaderboard] Query filter:`,
      JSON.stringify(filter, null, 2)
    );

    // ========== EOSE-AWARE QUERY with early exit ==========
    // Exit early when EOSE received, max wait 5s
    const collectedEvents = new Set<NDKEvent>();
    let eoseReceived = false;

    const allEvents = await new Promise<Set<NDKEvent>>((resolve) => {
      const subscription = ndk.subscribe(filter, { closeOnEose: false });

      subscription.on('event', (event: NDKEvent) => {
        collectedEvents.add(event);
      });

      subscription.on('eose', () => {
        eoseReceived = true;
        console.log(`📊 [Leaderboard] EOSE received - ${collectedEvents.size} events collected`);
      });

      // Check every 100ms if EOSE received, max wait 5s
      const checkInterval = setInterval(() => {
        if (eoseReceived) {
          clearInterval(checkInterval);
          // ✅ MEMORY LEAK FIX: Remove listeners before stopping subscription
          subscription.removeAllListeners('event');
          subscription.removeAllListeners('eose');
          subscription.stop();
          const queryDuration = Date.now() - queryStartTime;
          console.log(`📊 [Leaderboard] ✅ Early exit on EOSE (${queryDuration}ms)`);
          resolve(collectedEvents);
        }
      }, 100);

      // Hard timeout after 5s
      setTimeout(() => {
        clearInterval(checkInterval);
        // ✅ MEMORY LEAK FIX: Remove listeners before stopping subscription
        subscription.removeAllListeners('event');
        subscription.removeAllListeners('eose');
        subscription.stop();
        const queryDuration = Date.now() - queryStartTime;
        if (!eoseReceived) {
          console.log(`📊 [Leaderboard] ⚠️ Timeout after 5s (no EOSE) - ${collectedEvents.size} events (${queryDuration}ms)`);
        }
        resolve(collectedEvents);
      }, 5000);
    });

    console.log(`📊 [Leaderboard] Total events received: ${allEvents.size}`);

    // ========== RETRY MECHANISM for empty results ==========
    if (allEvents.size === 0 && !_isRetry) {
      console.log(`📊 [Leaderboard] ⚠️ 0 events received - retrying once after 1s...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Recursive call with retry flag
      return this.getTeamDailyLeaderboards(teamId, userHexPubkey, forceRefresh, true);
    }

    // Filter client-side for matching team tag (avoids broken NDK #team filter)
    const teamEvents = Array.from(allEvents).filter((event) => {
      const teamTag = event.tags.find((t) => t[0] === 'team');
      return teamTag && teamTag[1] === teamId;
    });

    console.log(
      `📊 [Leaderboard] Filtered to ${teamEvents.length} workouts with team tag: ${teamId}`
    );
    if (teamEvents.length > 0) {
      console.log(
        `   📋 Event IDs:`,
        teamEvents
          .slice(0, 5)
          .map((e) => e.id)
          .join(', ')
      );
    }

    // Parse workouts and extract split data (reuse existing parseWorkout)
    const workouts: Workout[] = [];
    for (const event of teamEvents) {
      const workout = this.parseWorkoutEvent(event as NDKEvent);
      if (workout) {
        workouts.push(workout);
      }
    }

    console.log(`📊 [Leaderboard] Parsed ${workouts.length} workouts with split data`);

    // Filter by activity type (running only), split count OR distance
    // 5K/10K/Half/Marathon leaderboards are for running workouts only
    const isRunning = (w: Workout) =>
      w.activityType?.toLowerCase() === 'running';

    const eligible5k = workouts.filter((w) => {
      const hasSplits = w.splits && w.splits.size >= 5;
      const hasDistance = w.distance && w.distance >= 5;
      return isRunning(w) && (hasSplits || hasDistance);
    });
    const eligible10k = workouts.filter((w) => {
      const hasSplits = w.splits && w.splits.size >= 10;
      const hasDistance = w.distance && w.distance >= 10;
      return isRunning(w) && (hasSplits || hasDistance);
    });
    const eligibleHalf = workouts.filter((w) => {
      const hasSplits = w.splits && w.splits.size >= 21;
      const hasDistance = w.distance && w.distance >= 21;
      return isRunning(w) && (hasSplits || hasDistance);
    });
    const eligibleMarathon = workouts.filter((w) => {
      const hasSplits = w.splits && w.splits.size >= 42;
      const hasDistance = w.distance && w.distance >= 42;
      return isRunning(w) && (hasSplits || hasDistance);
    });

    console.log(
      `📊 [Leaderboard] 🏆 Eligible: 5K=${eligible5k.length}, 10K=${eligible10k.length}, Half=${eligibleHalf.length}, Marathon=${eligibleMarathon.length}`
    );

    // Calculate leaderboards using split-based time extraction
    const leaderboards = {
      leaderboard5k: this.buildLeaderboard(eligible5k, 5),
      leaderboard10k: this.buildLeaderboard(eligible10k, 10),
      leaderboardHalf: this.buildLeaderboard(eligibleHalf, 21.1),
      leaderboardMarathon: this.buildLeaderboard(eligibleMarathon, 42.2),
    };

    // Filter leaderboards to only show categories where user participated
    if (userHexPubkey) {
      console.log(
        `   🔍 Filtering leaderboards for user: ${userHexPubkey.substring(
          0,
          8
        )}...`
      );

      const hasUserEntry = (leaderboard: LeaderboardEntry[]) => {
        const found = leaderboard.some((entry) => {
          // LeaderboardEntry uses npub, need to convert to hex for comparison
          const entryHex = entry.npub.startsWith('npub')
            ? (nip19.decode(entry.npub).data as string)
            : entry.npub;
          return entryHex === userHexPubkey;
        });
        return found;
      };

      const filtered = {
        leaderboard5k: hasUserEntry(leaderboards.leaderboard5k)
          ? leaderboards.leaderboard5k
          : [],
        leaderboard10k: hasUserEntry(leaderboards.leaderboard10k)
          ? leaderboards.leaderboard10k
          : [],
        leaderboardHalf: hasUserEntry(leaderboards.leaderboardHalf)
          ? leaderboards.leaderboardHalf
          : [],
        leaderboardMarathon: hasUserEntry(leaderboards.leaderboardMarathon)
          ? leaderboards.leaderboardMarathon
          : [],
      };

      console.log(
        `   ✅ Filtered: 5K=${
          filtered.leaderboard5k.length > 0 ? '✓' : '✗'
        }, 10K=${filtered.leaderboard10k.length > 0 ? '✓' : '✗'}, Half=${
          filtered.leaderboardHalf.length > 0 ? '✓' : '✗'
        }, Marathon=${filtered.leaderboardMarathon.length > 0 ? '✓' : '✗'}`
      );

      const result = {
        teamId,
        date: todayDate,
        ...filtered,
      };

      // Cache with smart TTL (5min for today, 24hr for historical)
      const ttl = this.getSmartTTL(todayDate);
      await this.cacheService.setWithCustomTTL(cacheKey, result, ttl);
      const totalDuration = Date.now() - queryStartTime;
      console.log(`📊 [Leaderboard] 💾 Cached with ${ttl === 300 ? '5min' : '24hr'} TTL`);
      console.log(`📊 [Leaderboard] ========== QUERY END (${totalDuration}ms) ==========`);

      return result;
    }

    // No filter - return all leaderboards
    const result = {
      teamId,
      date: todayDate,
      ...leaderboards,
    };

    // Cache with smart TTL (5min for today, 24hr for historical)
    const ttl = this.getSmartTTL(todayDate);
    await this.cacheService.setWithCustomTTL(cacheKey, result, ttl);
    const totalDuration = Date.now() - queryStartTime;
    console.log(`📊 [Leaderboard] 💾 Cached with ${ttl === 300 ? '5min' : '24hr'} TTL`);
    console.log(`📊 [Leaderboard] ========== QUERY END (${totalDuration}ms) ==========`);

    return result;
  }

  /**
   * Get global daily leaderboards (5K/10K/Half/Marathon)
   * Queries ALL kind 1301 events from today across all teams
   * Returns singleton leaderboards based on split count
   * @param forceRefresh - Optional: Bypass cache and fetch fresh data from relays
   * @param _isRetry - Internal: Used for retry mechanism (do not set manually)
   */
  async getGlobalDailyLeaderboards(
    forceRefresh: boolean = false,
    _isRetry: boolean = false
  ): Promise<{
    date: string;
    leaderboard5k: LeaderboardEntry[];
    leaderboard10k: LeaderboardEntry[];
    leaderboardHalf: LeaderboardEntry[];
    leaderboardMarathon: LeaderboardEntry[];
    leaderboardSteps: LeaderboardEntry[];
  }> {
    const todayMidnight = this.getTodayMidnightLocal(); // Use LOCAL timezone to include today's workouts
    const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const queryStartTime = Date.now();

    // ========== DEBUG LOGGING: QUERY START ==========
    console.log(`📊 [GlobalLeaderboard] ========== QUERY START ==========`);
    console.log(`📊 [GlobalLeaderboard] Date: ${todayDate}`);
    console.log(`📊 [GlobalLeaderboard] Force Refresh: ${forceRefresh}`);
    console.log(`📊 [GlobalLeaderboard] Is Retry: ${_isRetry}`);

    // Check cache first (5-minute TTL) - unless forceRefresh is true
    const cacheKey = `global:daily:${todayDate}`;

    if (forceRefresh) {
      console.log(`📊 [GlobalLeaderboard] 🔄 FORCE REFRESH: Bypassing cache`);
      await this.cacheService.invalidate(cacheKey);
    } else {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        console.log(`📊 [GlobalLeaderboard] ✅ CACHE HIT - Returning cached data`);
        console.log(`📊 [GlobalLeaderboard] ========== QUERY END (cached) ==========`);
        return cached;
      }
      console.log(`📊 [GlobalLeaderboard] ❌ CACHE MISS - Querying relays`);
    }

    // Query ALL kind 1301 events from today (no team filter)
    const ndk = await GlobalNDKService.getInstance();

    // Log relay connection status
    const relayStatus = GlobalNDKService.getStatus();
    console.log(`📊 [GlobalLeaderboard] Relay Status: ${relayStatus.connectedRelays}/${relayStatus.relayCount} connected`);

    const filter: NDKFilter = {
      kinds: [1301],
      since: todayMidnight,
    };

    console.log(`📊 [GlobalLeaderboard] Query filter:`, JSON.stringify(filter, null, 2));

    // ========== EOSE-AWARE QUERY with early exit ==========
    // Exit early when EOSE received, max wait 5s
    const collectedEvents = new Set<NDKEvent>();
    let eoseReceived = false;

    const events = await new Promise<Set<NDKEvent>>((resolve) => {
      const subscription = ndk.subscribe(filter, { closeOnEose: false });

      subscription.on('event', (event: NDKEvent) => {
        collectedEvents.add(event);
      });

      subscription.on('eose', () => {
        eoseReceived = true;
        console.log(`📊 [GlobalLeaderboard] EOSE received - ${collectedEvents.size} events collected`);
      });

      // Check every 100ms if EOSE received, max wait 5s
      const checkInterval = setInterval(() => {
        if (eoseReceived) {
          clearInterval(checkInterval);
          // ✅ MEMORY LEAK FIX: Remove listeners before stopping subscription
          subscription.removeAllListeners('event');
          subscription.removeAllListeners('eose');
          subscription.stop();
          const queryDuration = Date.now() - queryStartTime;
          console.log(`📊 [GlobalLeaderboard] ✅ Early exit on EOSE (${queryDuration}ms)`);
          resolve(collectedEvents);
        }
      }, 100);

      // Hard timeout after 5s
      setTimeout(() => {
        clearInterval(checkInterval);
        // ✅ MEMORY LEAK FIX: Remove listeners before stopping subscription
        subscription.removeAllListeners('event');
        subscription.removeAllListeners('eose');
        subscription.stop();
        const queryDuration = Date.now() - queryStartTime;
        if (!eoseReceived) {
          console.log(`📊 [GlobalLeaderboard] ⚠️ Timeout after 5s (no EOSE) - ${collectedEvents.size} events (${queryDuration}ms)`);
        }
        resolve(collectedEvents);
      }, 5000);
    });

    console.log(`📊 [GlobalLeaderboard] Total events received: ${events.size}`);

    // ========== RETRY MECHANISM for empty results ==========
    if (events.size === 0 && !_isRetry) {
      console.log(`📊 [GlobalLeaderboard] ⚠️ 0 events received - retrying once after 1s...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Recursive call with retry flag
      return this.getGlobalDailyLeaderboards(forceRefresh, true);
    }

    // Parse workouts and extract split data
    const workouts: Workout[] = [];
    for (const event of events) {
      const workout = this.parseWorkoutEvent(event as NDKEvent);
      if (workout) {
        workouts.push(workout);
      }
    }

    // Filter by activity type (running only), split count OR distance
    // 5K/10K/Half/Marathon leaderboards are for running workouts only
    const isRunning = (w: Workout) =>
      w.activityType?.toLowerCase() === 'running';

    const eligible5k = workouts.filter((w) => {
      const hasSplits = w.splits && w.splits.size >= 5;
      const hasDistance = w.distance && w.distance >= 5;
      return isRunning(w) && (hasSplits || hasDistance);
    });
    const eligible10k = workouts.filter((w) => {
      const hasSplits = w.splits && w.splits.size >= 10;
      const hasDistance = w.distance && w.distance >= 10;
      return isRunning(w) && (hasSplits || hasDistance);
    });
    const eligibleHalf = workouts.filter((w) => {
      const hasSplits = w.splits && w.splits.size >= 21;
      const hasDistance = w.distance && w.distance >= 21;
      return isRunning(w) && (hasSplits || hasDistance);
    });
    const eligibleMarathon = workouts.filter((w) => {
      const hasSplits = w.splits && w.splits.size >= 42;
      const hasDistance = w.distance && w.distance >= 42;
      return isRunning(w) && (hasSplits || hasDistance);
    });

    // Filter for steps leaderboard - walking workouts with step count
    const isWalking = (w: Workout) =>
      w.activityType?.toLowerCase() === 'walking';
    const eligibleSteps = workouts.filter(
      (w) => isWalking(w) && w.steps && w.steps > 0
    );

    console.log(
      `📊 [GlobalLeaderboard] 🏆 Eligible: 5K=${eligible5k.length}, 10K=${eligible10k.length}, Half=${eligibleHalf.length}, Marathon=${eligibleMarathon.length}, Steps=${eligibleSteps.length}`
    );

    // Calculate global leaderboards
    const result = {
      date: todayDate,
      leaderboard5k: this.buildLeaderboard(eligible5k, 5),
      leaderboard10k: this.buildLeaderboard(eligible10k, 10),
      leaderboardHalf: this.buildLeaderboard(eligibleHalf, 21.1),
      leaderboardMarathon: this.buildLeaderboard(eligibleMarathon, 42.2),
      leaderboardSteps: this.buildStepsLeaderboard(eligibleSteps),
    };

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, result, 300);
    const totalDuration = Date.now() - queryStartTime;
    console.log(`📊 [GlobalLeaderboard] 💾 Cached with 5min TTL`);
    console.log(`📊 [GlobalLeaderboard] ========== QUERY END (${totalDuration}ms) ==========`);

    return result;
  }

  /**
   * Build leaderboard for specific distance
   * Uses split data to extract time at target distance
   * Deduplicates by user - keeps only best time per user
   */
  private buildLeaderboard(
    workouts: Workout[],
    targetKm: number
  ): LeaderboardEntry[] {
    // Step 1: Group workouts by user and keep only their best time
    const bestTimesByUser = new Map<
      string,
      { time: number; workout: Workout }
    >();

    for (const workout of workouts) {
      const time = this.extractTargetDistanceTime(workout, targetKm);
      const existing = bestTimesByUser.get(workout.npub);

      // Keep this workout if it's the user's first or if it's faster than their previous best
      if (!existing || time < existing.time) {
        bestTimesByUser.set(workout.npub, { time, workout });
      }
    }

    // Step 2: Build leaderboard entries from unique users only
    return Array.from(bestTimesByUser.values())
      .map(({ time, workout }) => ({
        npub: workout.npub,
        name: '', // Let ZappableUserRow handle fallback to "Anonymous" based on profile
        time,
        pace: time / targetKm, // seconds per km
        splits: workout.splits,
        timestamp: workout.timestamp,
        workoutId: workout.id,
        score: time, // Use time as score for sorting
        formattedScore: this.formatTime(time),
        workoutCount: 1,
        rank: 0, // Will be set after sorting
        lightningAddress: workout.lightningAddress,
      }))
      .sort((a, b) => a.time - b.time) // Fastest first
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));
  }

  /**
   * Build steps leaderboard
   * Groups by user and keeps MAX steps (not sum - prevents duplicate posting)
   * Sorted by highest steps DESCENDING (most steps = best)
   *
   * Why MAX instead of SUM:
   * - Daily steps are cumulative (10,000 at 6pm includes 5,000 from noon)
   * - Prevents gaming by posting the same step count multiple times
   * - The highest value represents the user's actual daily total
   */
  private buildStepsLeaderboard(workouts: Workout[]): LeaderboardEntry[] {
    // Group by user and keep MAX steps (deduplication)
    const stepsByUser = new Map<
      string,
      { maxSteps: number; workoutCount: number; workout: Workout }
    >();

    for (const workout of workouts) {
      if (!workout.steps || workout.steps <= 0) continue;

      const existing = stepsByUser.get(workout.npub);
      const currentMax = existing?.maxSteps || 0;

      // Only update if this workout has more steps (keep the max)
      if (workout.steps > currentMax) {
        stepsByUser.set(workout.npub, {
          maxSteps: workout.steps,
          workoutCount: (existing?.workoutCount || 0) + 1,
          workout: workout, // Keep workout with highest steps for lightning address
        });
      } else if (existing) {
        // Still count the workout even if not the max
        existing.workoutCount += 1;
      }
    }

    // Sort by steps DESCENDING (most steps = best)
    return Array.from(stepsByUser.values())
      .map(({ maxSteps, workoutCount, workout }) => ({
        npub: workout.npub,
        name: '', // Let ZappableUserRow handle fallback
        score: maxSteps,
        formattedScore: `${maxSteps.toLocaleString()} steps`,
        workoutCount,
        rank: 0, // Will be set after sorting
        lightningAddress: workout.lightningAddress,
      }))
      .sort((a, b) => b.score - a.score) // Most steps first
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
  }

  /**
   * Get midnight UTC timestamp for today
   */
  private getTodayMidnightUTC(): number {
    const now = new Date();
    const midnight = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    return Math.floor(midnight.getTime() / 1000);
  }

  /**
   * Get today's midnight in LOCAL timezone (not UTC)
   * This ensures workouts from "today" in user's timezone are included
   */
  private getTodayMidnightLocal(): number {
    const now = new Date();
    const midnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0
    );
    return Math.floor(midnight.getTime() / 1000);
  }

  /**
   * Format time in seconds to MM:SS or HH:MM:SS
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

export default SimpleLeaderboardService.getInstance();
