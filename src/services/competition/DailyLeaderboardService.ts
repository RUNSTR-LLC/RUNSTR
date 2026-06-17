/**
 * Daily Leaderboard Service - Supabase Implementation with Hybrid Support
 *
 * Queries daily leaderboards from Supabase instead of Nostr for:
 * - Better anti-cheat (server-validated workouts)
 * - Faster performance (~500ms vs 3-5s with Nostr)
 * - Universal visibility (all users who submitted)
 *
 * HYBRID LEADERBOARDS: Also merges local pending workouts that haven't
 * synced to Supabase yet. This ensures users always see themselves on
 * the leaderboard even if their submission failed.
 *
 * Compatible with existing LeaderboardEntry interface.
 */

import { UnifiedCacheService } from '../cache/UnifiedCacheService';
import { PendingSubmissionService, type PendingSubmission } from './PendingSubmissionService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LeaderboardEntry {
  rank: number;
  npub: string;
  name: string;
  picture?: string; // Cached profile picture from Supabase — lets the row skip a per-user Nostr profile fetch
  score: number;
  formattedScore: string;
  workoutCount: number;
  participationType?: 'in-person' | 'virtual'; // Track how user is participating
  lightningAddress?: string;
  isPending?: boolean; // NEW: true if from local queue, not yet synced
}

export interface DailyLeaderboards {
  date: string;
  leaderboard5k: LeaderboardEntry[];
  leaderboard10k: LeaderboardEntry[];
  leaderboardHalf: LeaderboardEntry[];
  leaderboardMarathon: LeaderboardEntry[];
  leaderboardSteps: LeaderboardEntry[];
  leaderboardCycling20k: LeaderboardEntry[];
  leaderboardCycling40k: LeaderboardEntry[];
  leaderboardCycling100k: LeaderboardEntry[];
}

interface SupabaseWorkoutRow {
  npub: string;
  time_5k_seconds: number | null;
  time_10k_seconds: number | null;
  time_half_seconds: number | null;
  time_marathon_seconds: number | null;
  time_cycling_20k_seconds: number | null;
  time_cycling_40k_seconds: number | null;
  time_cycling_100k_seconds: number | null;
  step_count: number | null;
  profile_name: string | null;
  profile_picture: string | null;
  activity_type: string;
}

class DailyLeaderboardServiceClass {
  private static instance: DailyLeaderboardServiceClass;
  private cacheService: typeof UnifiedCacheService;

  private constructor() {
    this.cacheService = UnifiedCacheService;
  }

  static getInstance(): DailyLeaderboardServiceClass {
    if (!this.instance) {
      this.instance = new DailyLeaderboardServiceClass();
    }
    return this.instance;
  }

  /**
   * Get global daily leaderboards from Supabase
   * Returns 5K, 10K, Half Marathon, Marathon, and Steps leaderboards
   */
  async getGlobalDailyLeaderboards(
    forceRefresh: boolean = false
  ): Promise<DailyLeaderboards> {
    // Use local date (not UTC) so leaderboard matches user's day
    const now = new Date();
    const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const queryStartTime = Date.now();

    console.log(`📊 [DailyLeaderboard/Supabase] ========== QUERY START ==========`);
    console.log(`📊 [DailyLeaderboard/Supabase] Date: ${todayDate}`);
    console.log(`📊 [DailyLeaderboard/Supabase] Force Refresh: ${forceRefresh}`);

    // Check cache first (5-minute TTL) - unless forceRefresh is true
    const cacheKey = `supabase:daily:${todayDate}`;

    if (forceRefresh) {
      console.log(`📊 [DailyLeaderboard/Supabase] 🔄 FORCE REFRESH: Bypassing cache`);
      await this.cacheService.invalidate(cacheKey);
    } else {
      const cached = await this.cacheService.get<DailyLeaderboards>(cacheKey);
      if (cached) {
        console.log(`📊 [DailyLeaderboard/Supabase] ✅ CACHE HIT - Returning cached data`);
        return cached;
      }
      console.log(`📊 [DailyLeaderboard/Supabase] ❌ CACHE MISS - Querying Supabase`);
    }

    // Query Supabase for today's workouts
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[DailyLeaderboard/Supabase] Supabase not configured');
      return this.emptyLeaderboards(todayDate);
    }

    try {
      // Fetch today's workouts with leaderboard fields
      // ADDED source=eq.app filter - only show workouts submitted through RUNSTR app
      // This prevents cheaters from creating fake kind 1301 events via terminal that get picked up by nostr_scan
      const workoutUrl = `${supabaseUrl}/rest/v1/workout_submissions?` +
        `leaderboard_date=eq.${todayDate}&` +
        `source=eq.app&` +
        `select=npub,time_5k_seconds,time_10k_seconds,time_half_seconds,time_marathon_seconds,time_cycling_20k_seconds,time_cycling_40k_seconds,time_cycling_100k_seconds,step_count,profile_name,profile_picture,activity_type&` +
        `limit=10000`;

      // Fetch banned users (permanent bans have null expires_at, temp bans have future expires_at)
      const now = new Date().toISOString();
      const bannedUrl = `${supabaseUrl}/rest/v1/banned_users?` +
        `select=npub&` +
        `or=(expires_at.is.null,expires_at.gt.${now})`;

      // Fetch both in parallel
      const [workoutResponse, bannedResponse] = await Promise.all([
        fetch(workoutUrl, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }),
        fetch(bannedUrl, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }),
      ]);

      if (!workoutResponse.ok) {
        console.error(`[DailyLeaderboard/Supabase] Workout query failed: ${workoutResponse.status}`);
        return this.emptyLeaderboards(todayDate);
      }

      const allRows: SupabaseWorkoutRow[] = await workoutResponse.json();

      // Build set of banned npubs
      let bannedNpubs = new Set<string>();
      if (bannedResponse.ok) {
        const bannedUsers: { npub: string }[] = await bannedResponse.json();
        bannedNpubs = new Set(bannedUsers.map(b => b.npub));
        if (bannedNpubs.size > 0) {
          console.log(`📊 [DailyLeaderboard/Supabase] Filtering out ${bannedNpubs.size} banned users`);
        }
      }

      // Filter out banned users
      const rows = allRows.filter(r => !bannedNpubs.has(r.npub));
      console.log(`📊 [DailyLeaderboard/Supabase] Fetched ${allRows.length} workouts, ${rows.length} after ban filter`);

      // Build leaderboards from Supabase data
      const supabaseResult: DailyLeaderboards = {
        date: todayDate,
        leaderboard5k: this.buildTimeLeaderboard(rows, 'time_5k_seconds', 'running'),
        leaderboard10k: this.buildTimeLeaderboard(rows, 'time_10k_seconds', 'running'),
        leaderboardHalf: this.buildTimeLeaderboard(rows, 'time_half_seconds', 'running'),
        leaderboardMarathon: this.buildTimeLeaderboard(rows, 'time_marathon_seconds', 'running'),
        leaderboardSteps: this.buildStepsLeaderboard(rows),
        leaderboardCycling20k: this.buildTimeLeaderboard(rows, 'time_cycling_20k_seconds', 'cycling'),
        leaderboardCycling40k: this.buildTimeLeaderboard(rows, 'time_cycling_40k_seconds', 'cycling'),
        leaderboardCycling100k: this.buildTimeLeaderboard(rows, 'time_cycling_100k_seconds', 'cycling'),
      };

      // ========== HYBRID LEADERBOARDS: Merge pending submissions ==========
      // Get current user's npub to identify their pending workouts
      const currentUserNpub = await AsyncStorage.getItem('@runstr:npub');

      // Get pending submissions for today
      const pendingToday = await PendingSubmissionService.getPendingForToday();

      // Filter to current user's pending (we only show the current user's pending workouts)
      const userPending = currentUserNpub
        ? pendingToday.filter(p => p.submissionData.npub === currentUserNpub)
        : [];

      console.log(`📊 [DailyLeaderboard/Supabase] Pending workouts for merge: ${userPending.length}`);

      // Merge pending workouts with Supabase results
      const result = this.mergeWithPending(supabaseResult, userPending);

      // Log counts
      console.log(
        `📊 [DailyLeaderboard/Supabase] 🏆 Results: ` +
        `5K=${result.leaderboard5k.length}, ` +
        `10K=${result.leaderboard10k.length}, ` +
        `Half=${result.leaderboardHalf.length}, ` +
        `Marathon=${result.leaderboardMarathon.length}, ` +
        `Steps=${result.leaderboardSteps.length}, ` +
        `Cyc20K=${result.leaderboardCycling20k.length}, ` +
        `Cyc40K=${result.leaderboardCycling40k.length}, ` +
        `Cyc100K=${result.leaderboardCycling100k.length}`
      );

      // Cache for 5 minutes (300 seconds)
      await this.cacheService.setWithCustomTTL(cacheKey, result, 300);
      const totalDuration = Date.now() - queryStartTime;
      console.log(`📊 [DailyLeaderboard/Supabase] 💾 Cached with 5min TTL (${totalDuration}ms)`);

      return result;
    } catch (error) {
      console.error('[DailyLeaderboard/Supabase] Error:', error);
      return this.emptyLeaderboards(todayDate);
    }
  }

  /**
   * Build time-based leaderboard (5K, 10K, Half, Marathon)
   * Keeps only best time per user, sorts by fastest time
   */
  private buildTimeLeaderboard(
    rows: SupabaseWorkoutRow[],
    timeField:
      | 'time_5k_seconds'
      | 'time_10k_seconds'
      | 'time_half_seconds'
      | 'time_marathon_seconds'
      | 'time_cycling_20k_seconds'
      | 'time_cycling_40k_seconds'
      | 'time_cycling_100k_seconds',
    activityType: string
  ): LeaderboardEntry[] {
    // Filter to rows with time data and matching activity type
    const eligible = rows.filter(
      (r) => r[timeField] !== null && r.activity_type === activityType
    );

    // Deduplicate by user - keep only best (fastest) time
    const bestByUser = new Map<string, SupabaseWorkoutRow>();
    for (const row of eligible) {
      const existing = bestByUser.get(row.npub);
      const timeValue = row[timeField] as number;
      if (!existing || timeValue < (existing[timeField] as number)) {
        bestByUser.set(row.npub, row);
      }
    }

    // Sort by time (ascending = fastest first) and build entries
    const sorted = Array.from(bestByUser.values()).sort(
      (a, b) => (a[timeField] as number) - (b[timeField] as number)
    );

    return sorted.map((row, index) => ({
      rank: index + 1,
      npub: row.npub,
      name: row.profile_name || 'Anonymous Athlete',
      picture: row.profile_picture || undefined,
      score: row[timeField] as number,
      formattedScore: this.formatTime(row[timeField] as number),
      workoutCount: 1, // Each row is one workout
    }));
  }

  /**
   * Build steps leaderboard (walking workouts)
   * Keeps only best step count per user, sorts by most steps
   */
  private buildStepsLeaderboard(rows: SupabaseWorkoutRow[]): LeaderboardEntry[] {
    // Filter to walking workouts with step count
    const eligible = rows.filter(
      (r) => r.step_count !== null && r.step_count > 0 && r.activity_type === 'walking'
    );

    // Deduplicate by user - keep highest step count
    const bestByUser = new Map<string, SupabaseWorkoutRow>();
    for (const row of eligible) {
      const existing = bestByUser.get(row.npub);
      if (!existing || (row.step_count || 0) > (existing.step_count || 0)) {
        bestByUser.set(row.npub, row);
      }
    }

    // Sort by steps (descending = most steps first)
    const sorted = Array.from(bestByUser.values()).sort(
      (a, b) => (b.step_count || 0) - (a.step_count || 0)
    );

    return sorted.map((row, index) => ({
      rank: index + 1,
      npub: row.npub,
      name: row.profile_name || 'Anonymous Athlete',
      picture: row.profile_picture || undefined,
      score: row.step_count || 0,
      formattedScore: `${(row.step_count || 0).toLocaleString()} steps`,
      workoutCount: 1,
    }));
  }

  /**
   * Format seconds to MM:SS or HH:MM:SS
   */
  private formatTime(seconds: number): string {
    if (seconds < 3600) {
      // Less than 1 hour: MM:SS
      const min = Math.floor(seconds / 60);
      const sec = Math.round(seconds % 60);
      return `${min}:${sec.toString().padStart(2, '0')}`;
    } else {
      // 1 hour or more: HH:MM:SS
      const hours = Math.floor(seconds / 3600);
      const min = Math.floor((seconds % 3600) / 60);
      const sec = Math.round(seconds % 60);
      return `${hours}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Return empty leaderboards structure
   */
  private emptyLeaderboards(date: string): DailyLeaderboards {
    return {
      date,
      leaderboard5k: [],
      leaderboard10k: [],
      leaderboardHalf: [],
      leaderboardMarathon: [],
      leaderboardSteps: [],
      leaderboardCycling20k: [],
      leaderboardCycling40k: [],
      leaderboardCycling100k: [],
    };
  }

  /**
   * Merge pending submissions with Supabase leaderboard data
   * Adds local pending workouts that aren't already in Supabase
   */
  private mergeWithPending(
    supabaseData: DailyLeaderboards,
    pendingWorkouts: PendingSubmission[]
  ): DailyLeaderboards {
    if (pendingWorkouts.length === 0) {
      return supabaseData;
    }

    const result = { ...supabaseData };

    for (const pending of pendingWorkouts) {
      const { submissionData } = pending;
      const npub = submissionData.npub;
      const activityType = submissionData.type?.toLowerCase();
      const distanceKm = submissionData.distance / 1000;
      const durationSeconds = submissionData.duration;

      // Check if this workout is already in Supabase (by npub match)
      // We don't want to show duplicates
      const isInSupabase = (leaderboard: LeaderboardEntry[]) =>
        leaderboard.some(entry => entry.npub === npub);

      // For running workouts, add to appropriate distance leaderboard
      if (activityType === 'running') {
        // 5K leaderboard (distance >= 5km)
        if (distanceKm >= 5 && !isInSupabase(result.leaderboard5k)) {
          const time5k = this.calculateTimeForDistance(durationSeconds, distanceKm, 5);
          result.leaderboard5k = this.addPendingEntry(
            result.leaderboard5k,
            npub,
            time5k,
            true // isPending
          );
        }

        // 10K leaderboard (distance >= 10km)
        if (distanceKm >= 10 && !isInSupabase(result.leaderboard10k)) {
          const time10k = this.calculateTimeForDistance(durationSeconds, distanceKm, 10);
          result.leaderboard10k = this.addPendingEntry(
            result.leaderboard10k,
            npub,
            time10k,
            true
          );
        }

        // Half Marathon leaderboard (distance >= 21.1km)
        if (distanceKm >= 21.1 && !isInSupabase(result.leaderboardHalf)) {
          const timeHalf = this.calculateTimeForDistance(durationSeconds, distanceKm, 21.1);
          result.leaderboardHalf = this.addPendingEntry(
            result.leaderboardHalf,
            npub,
            timeHalf,
            true
          );
        }

        // Marathon leaderboard (distance >= 42.2km)
        if (distanceKm >= 42.2 && !isInSupabase(result.leaderboardMarathon)) {
          const timeMarathon = this.calculateTimeForDistance(durationSeconds, distanceKm, 42.2);
          result.leaderboardMarathon = this.addPendingEntry(
            result.leaderboardMarathon,
            npub,
            timeMarathon,
            true
          );
        }
      }

      // For cycling workouts, add to appropriate cycling distance leaderboard
      if (activityType === 'cycling') {
        if (distanceKm >= 20 && !isInSupabase(result.leaderboardCycling20k)) {
          const time20k = this.calculateTimeForDistance(durationSeconds, distanceKm, 20);
          result.leaderboardCycling20k = this.addPendingEntry(
            result.leaderboardCycling20k,
            npub,
            time20k,
            true
          );
        }
        if (distanceKm >= 40 && !isInSupabase(result.leaderboardCycling40k)) {
          const time40k = this.calculateTimeForDistance(durationSeconds, distanceKm, 40);
          result.leaderboardCycling40k = this.addPendingEntry(
            result.leaderboardCycling40k,
            npub,
            time40k,
            true
          );
        }
        if (distanceKm >= 100 && !isInSupabase(result.leaderboardCycling100k)) {
          const time100k = this.calculateTimeForDistance(durationSeconds, distanceKm, 100);
          result.leaderboardCycling100k = this.addPendingEntry(
            result.leaderboardCycling100k,
            npub,
            time100k,
            true
          );
        }
      }

      // For walking workouts with steps, add to steps leaderboard
      if (activityType === 'walking' && !isInSupabase(result.leaderboardSteps)) {
        // Extract steps from tags
        const stepsTag = submissionData.tags?.find(t => t[0] === 'steps');
        const steps = stepsTag ? parseInt(stepsTag[1]) || 0 : 0;

        if (steps > 0) {
          result.leaderboardSteps = this.addPendingStepsEntry(
            result.leaderboardSteps,
            npub,
            steps,
            true
          );
        }
      }
    }

    return result;
  }

  /**
   * Calculate time for a specific distance based on pace
   * Used for hybrid leaderboards when extrapolating from total distance
   */
  private calculateTimeForDistance(
    totalDurationSeconds: number,
    totalDistanceKm: number,
    targetDistanceKm: number
  ): number {
    if (totalDistanceKm <= 0) return totalDurationSeconds;

    // If workout exactly matches target, return actual time
    if (Math.abs(totalDistanceKm - targetDistanceKm) < 0.1) {
      return totalDurationSeconds;
    }

    // Calculate pace and extrapolate
    const pacePerKm = totalDurationSeconds / totalDistanceKm;
    return Math.round(pacePerKm * targetDistanceKm);
  }

  /**
   * Add a pending entry to a time-based leaderboard and re-sort
   */
  private addPendingEntry(
    leaderboard: LeaderboardEntry[],
    npub: string,
    timeSeconds: number,
    isPending: boolean
  ): LeaderboardEntry[] {
    const entry: LeaderboardEntry = {
      rank: 0,
      npub,
      name: 'Anonymous Athlete', // Will be resolved by profile lookup in UI
      score: timeSeconds,
      formattedScore: this.formatTime(timeSeconds),
      workoutCount: 1,
      isPending,
    };

    // Add to list
    const updated = [...leaderboard, entry];

    // Sort by time ascending (fastest first)
    updated.sort((a, b) => a.score - b.score);

    // Recalculate ranks
    return updated.map((e, index) => ({ ...e, rank: index + 1 }));
  }

  /**
   * Add a pending entry to steps leaderboard and re-sort
   */
  private addPendingStepsEntry(
    leaderboard: LeaderboardEntry[],
    npub: string,
    steps: number,
    isPending: boolean
  ): LeaderboardEntry[] {
    const entry: LeaderboardEntry = {
      rank: 0,
      npub,
      name: 'Anonymous Athlete',
      score: steps,
      formattedScore: `${steps.toLocaleString()} steps`,
      workoutCount: 1,
      isPending,
    };

    // Add to list
    const updated = [...leaderboard, entry];

    // Sort by steps descending (most steps first)
    updated.sort((a, b) => b.score - a.score);

    // Recalculate ranks
    return updated.map((e, index) => ({ ...e, rank: index + 1 }));
  }
}

// Export singleton instance
export const DailyLeaderboardService = DailyLeaderboardServiceClass.getInstance();
