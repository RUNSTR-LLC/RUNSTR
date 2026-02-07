/**
 * NostrLeaderboardService - Kind 30150 Leaderboard Note Handler
 *
 * Fetches and caches comprehensive leaderboard data from Nostr.
 * The external aggregator publishes a single kind 30150 note every 2 minutes
 * containing ALL competition data and participant rankings.
 *
 * Benefits:
 * - Single fetch gets all data (no multiple kind 0 profile queries)
 * - Cache-first navigation (instant screen transitions)
 * - Pull-to-refresh for fresh data
 * - Verification code for anti-bot protection
 */

import { GlobalNDKService } from '../nostr/GlobalNDKService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NDKFilter, NDKEvent } from '@nostr-dev-kit/ndk';

// Storage key for cached leaderboard data
const LEADERBOARD_CACHE_KEY = '@runstr:leaderboard_cache';
const PENDING_WORKOUTS_KEY = '@runstr:pending_workouts';

// External aggregator's pubkey (will be configured when service is deployed)
// For now, use a placeholder that can be updated
const AGGREGATOR_PUBKEY = process.env.EXPO_PUBLIC_LEADERBOARD_AGGREGATOR_PUBKEY || '';

/**
 * Competition definition from kind 30150 note
 */
export interface Competition {
  id: string;
  name: string;
  activityType: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

/**
 * Leaderboard entry with embedded profile data (for competitions)
 * No additional kind 0 queries needed!
 */
export interface LeaderboardEntry {
  competitionId: string;
  rank: number;
  npub: string;
  displayName: string;
  avatarUrl: string;
  distanceMeters: number;
  durationSeconds: number;
  lightningAddress: string;
  teamId: string;
}

/**
 * Daily leaderboard definition (5K, 10K, Half, Marathon, Steps)
 */
export interface DailyLeaderboard {
  id: string;           // '5k', '10k', 'half', 'marathon', 'steps'
  name: string;         // 'Half Marathon'
  activityType: string; // 'running', 'walking'
  scoringType: string;  // 'time' (ASC) or 'steps' (DESC)
}

/**
 * Daily leaderboard entry (fastest times or most steps today)
 */
export interface DailyLeaderboardEntry {
  dailyId: string;      // '5k', '10k', etc.
  rank: number;
  npub: string;
  displayName: string;
  avatarUrl: string;
  score: number;        // Seconds for time, count for steps
  formattedScore: string; // '18:00' or '15,000 steps'
  lightningAddress: string;
}

/**
 * Pool statistics from leaderboard note
 */
export interface PoolStats {
  period: string;       // 'monthly'
  totalAmount: number;  // e.g., 100
  currency: string;     // 'USD'
  claimedCount: number; // Number of rewards claimed
}

/**
 * Impact data for a user (charity contribution tracking)
 * External service tracks all charity payments and provides cumulative totals
 */
export interface ImpactData {
  npub: string;
  totalSatsToCharity: number;  // Cumulative sats sent to charities
  workoutCount: number;        // Number of workouts that went to charity
}

/**
 * Complete leaderboard data from kind 30150 note
 */
export interface LeaderboardData {
  updatedAt: number;
  // Competition-based leaderboards (Season II, Running Bitcoin, etc.)
  competitions: Competition[];
  entries: LeaderboardEntry[];
  // Daily time/distance leaderboards (5K, 10K, Half, Marathon, Steps)
  dailyLeaderboards: DailyLeaderboard[];
  dailyEntries: DailyLeaderboardEntry[];
  // Impact Level data (charity contribution tracking)
  impactData: ImpactData[];
  // Verification and pool stats
  vcode: string;          // Current verification code
  vcodeValidFrom: number; // Unix timestamp
  vcodeValidUntil: number;
  pool?: PoolStats;
}

/**
 * Pending workout for optimistic UI display
 */
export interface PendingWorkout {
  eventId: string;
  competitionId: string;
  npub: string;
  distanceMeters: number;
  durationSeconds: number;
  addedAt: number;
}

class NostrLeaderboardServiceClass {
  private static instance: NostrLeaderboardServiceClass;
  private cachedData: LeaderboardData | null = null;
  private isRefreshing: boolean = false;

  private constructor() {}

  static getInstance(): NostrLeaderboardServiceClass {
    if (!NostrLeaderboardServiceClass.instance) {
      NostrLeaderboardServiceClass.instance = new NostrLeaderboardServiceClass();
    }
    return NostrLeaderboardServiceClass.instance;
  }

  /**
   * Get cached leaderboard data (instant, no network)
   * Used for navigation - never shows loading state
   */
  async getCachedLeaderboard(): Promise<LeaderboardData | null> {
    // Return in-memory cache if available
    if (this.cachedData) {
      return this.cachedData;
    }

    // Load from AsyncStorage
    try {
      const cached = await AsyncStorage.getItem(LEADERBOARD_CACHE_KEY);
      if (cached) {
        this.cachedData = JSON.parse(cached);
        console.log('[NostrLeaderboard] Loaded cached data from AsyncStorage');
        return this.cachedData;
      }
    } catch (error) {
      console.error('[NostrLeaderboard] Error loading cache:', error);
    }

    return null;
  }

  /**
   * Refresh leaderboard from Nostr (pull-to-refresh)
   * Fetches fresh kind 30150 note and updates cache
   */
  async refreshLeaderboard(): Promise<LeaderboardData | null> {
    if (this.isRefreshing) {
      console.log('[NostrLeaderboard] Already refreshing, skipping...');
      return this.cachedData;
    }

    this.isRefreshing = true;
    console.log('[NostrLeaderboard] Refreshing from Nostr...');

    try {
      const note = await this.fetchLeaderboardNote();
      if (note) {
        const data = this.parseLeaderboardNote(note);
        if (data) {
          // Save to cache
          await this.saveToCache(data);
          this.cachedData = data;
          console.log(`[NostrLeaderboard] Refreshed: ${data.competitions.length} competitions, ${data.entries.length} entries`);
          return data;
        }
      }

      console.log('[NostrLeaderboard] No leaderboard note found');
      return this.cachedData; // Return existing cache if refresh fails
    } catch (error) {
      console.error('[NostrLeaderboard] Refresh failed:', error);
      return this.cachedData;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Get current verification code for workout publishing
   * Returns null if no valid vcode available
   */
  async getCurrentVcode(): Promise<string | null> {
    const data = await this.getCachedLeaderboard();
    if (!data || !data.vcode) {
      return null;
    }

    // Check if vcode is still valid
    const now = Math.floor(Date.now() / 1000);
    if (now > data.vcodeValidUntil) {
      console.log('[NostrLeaderboard] Vcode expired, refreshing...');
      const refreshed = await this.refreshLeaderboard();
      return refreshed?.vcode || null;
    }

    return data.vcode;
  }

  /**
   * Get leaderboard entries for a specific competition
   */
  async getCompetitionLeaderboard(competitionId: string): Promise<LeaderboardEntry[]> {
    const data = await this.getCachedLeaderboard();
    if (!data) return [];

    // Filter entries for this competition
    const entries = data.entries.filter(e => e.competitionId === competitionId);

    // Merge with pending workouts for optimistic display
    const pending = await this.getPendingWorkouts();
    const pendingForComp = pending.filter(p => p.competitionId === competitionId);

    if (pendingForComp.length > 0) {
      return this.mergeWithPending(entries, pendingForComp);
    }

    return entries;
  }

  /**
   * Get all active competitions
   */
  async getActiveCompetitions(): Promise<Competition[]> {
    const data = await this.getCachedLeaderboard();
    if (!data) return [];

    const now = new Date().toISOString().split('T')[0];
    return data.competitions.filter(c => c.endDate >= now);
  }

  /**
   * Get pool statistics
   */
  async getPoolStats(): Promise<PoolStats | null> {
    const data = await this.getCachedLeaderboard();
    return data?.pool || null;
  }

  /**
   * Get all daily leaderboard definitions
   */
  async getDailyLeaderboards(): Promise<DailyLeaderboard[]> {
    const data = await this.getCachedLeaderboard();
    return data?.dailyLeaderboards || [];
  }

  /**
   * Get entries for a specific daily leaderboard (5K, 10K, Half, Marathon, Steps)
   */
  async getDailyLeaderboard(dailyId: string): Promise<DailyLeaderboardEntry[]> {
    const data = await this.getCachedLeaderboard();
    if (!data) return [];

    return data.dailyEntries.filter(e => e.dailyId === dailyId);
  }

  /**
   * Get all daily leaderboard entries
   */
  async getAllDailyEntries(): Promise<DailyLeaderboardEntry[]> {
    const data = await this.getCachedLeaderboard();
    return data?.dailyEntries || [];
  }

  /**
   * Add a pending workout for optimistic UI display
   * Called when user taps "Compete" - shows them on leaderboard immediately
   */
  async addPendingWorkout(workout: PendingWorkout): Promise<void> {
    try {
      const existing = await this.getPendingWorkouts();
      existing.push(workout);
      await AsyncStorage.setItem(PENDING_WORKOUTS_KEY, JSON.stringify(existing));
      console.log(`[NostrLeaderboard] Added pending workout: ${workout.eventId}`);
    } catch (error) {
      console.error('[NostrLeaderboard] Error adding pending workout:', error);
    }
  }

  /**
   * Clear a pending workout after it appears in official leaderboard
   */
  async clearPendingWorkout(eventId: string): Promise<void> {
    try {
      const existing = await this.getPendingWorkouts();
      const filtered = existing.filter(w => w.eventId !== eventId);
      await AsyncStorage.setItem(PENDING_WORKOUTS_KEY, JSON.stringify(filtered));
      console.log(`[NostrLeaderboard] Cleared pending workout: ${eventId}`);
    } catch (error) {
      console.error('[NostrLeaderboard] Error clearing pending workout:', error);
    }
  }

  /**
   * Get all pending workouts
   */
  async getPendingWorkouts(): Promise<PendingWorkout[]> {
    try {
      const stored = await AsyncStorage.getItem(PENDING_WORKOUTS_KEY);
      if (stored) {
        const workouts = JSON.parse(stored);
        // Filter out stale pending workouts (older than 10 minutes)
        const now = Date.now();
        return workouts.filter((w: PendingWorkout) => now - w.addedAt < 600000);
      }
    } catch (error) {
      console.error('[NostrLeaderboard] Error getting pending workouts:', error);
    }
    return [];
  }

  /**
   * Clear all cached data (for logout)
   */
  async clearCache(): Promise<void> {
    this.cachedData = null;
    await AsyncStorage.removeItem(LEADERBOARD_CACHE_KEY);
    await AsyncStorage.removeItem(PENDING_WORKOUTS_KEY);
    console.log('[NostrLeaderboard] Cache cleared');
  }

  // ===== Private Methods =====

  /**
   * Fetch kind 30150 leaderboard note from Nostr
   */
  private async fetchLeaderboardNote(): Promise<NDKEvent | null> {
    if (!AGGREGATOR_PUBKEY) {
      console.warn(
        '[NostrLeaderboard] ⚠️ EXPO_PUBLIC_LEADERBOARD_AGGREGATOR_PUBKEY not configured!\n' +
        'Leaderboard data will not be available until external aggregator service is deployed.\n' +
        'Current leaderboards still use Supabase via DailyLeaderboardService.'
      );
      return null;
    }

    try {
      const ndk = await GlobalNDKService.getInstance();

      const filter: NDKFilter = {
        kinds: [30150],
        authors: [AGGREGATOR_PUBKEY],
        '#d': ['runstr-leaderboards'],
        limit: 1,
      };

      const events = await ndk.fetchEvents(filter);
      const eventArray = Array.from(events);

      if (eventArray.length > 0) {
        return eventArray[0];
      }
    } catch (error) {
      console.error('[NostrLeaderboard] Error fetching note:', error);
    }

    return null;
  }

  /**
   * Parse kind 30150 note into LeaderboardData
   */
  private parseLeaderboardNote(event: NDKEvent): LeaderboardData | null {
    try {
      const competitions: Competition[] = [];
      const entries: LeaderboardEntry[] = [];
      const dailyLeaderboards: DailyLeaderboard[] = [];
      const dailyEntries: DailyLeaderboardEntry[] = [];
      let vcode = '';
      let vcodeValidFrom = 0;
      let vcodeValidUntil = 0;
      let pool: PoolStats | undefined;
      let updatedAt = event.created_at || 0;

      for (const tag of event.tags) {
        switch (tag[0]) {
          case 'updated':
            updatedAt = parseInt(tag[1]);
            break;

          case 'competition':
            // Format: ["competition", id, name, activityType, startDate, endDate]
            if (tag.length >= 6) {
              competitions.push({
                id: tag[1],
                name: tag[2],
                activityType: tag[3],
                startDate: tag[4],
                endDate: tag[5],
              });
            }
            break;

          case 'lb':
            // Format: ["lb", competitionId, rank, npub, displayName, avatarUrl, distanceM, durationS, lightningAddr, teamId]
            if (tag.length >= 10) {
              entries.push({
                competitionId: tag[1],
                rank: parseInt(tag[2]),
                npub: tag[3],
                displayName: tag[4],
                avatarUrl: tag[5],
                distanceMeters: parseInt(tag[6]),
                durationSeconds: parseInt(tag[7]),
                lightningAddress: tag[8],
                teamId: tag[9],
              });
            }
            break;

          case 'daily':
            // Format: ["daily", id, name, activityType, scoringType]
            // Example: ["daily", "5k", "5K Run", "running", "time"]
            if (tag.length >= 5) {
              dailyLeaderboards.push({
                id: tag[1],
                name: tag[2],
                activityType: tag[3],
                scoringType: tag[4],
              });
            }
            break;

          case 'dlb':
            // Format: ["dlb", dailyId, rank, npub, displayName, avatarUrl, score, formattedScore, lightningAddr]
            // Example: ["dlb", "5k", "1", "npub1...", "Alice", "https://...", "1080", "18:00", "alice@getalby.com"]
            if (tag.length >= 9) {
              dailyEntries.push({
                dailyId: tag[1],
                rank: parseInt(tag[2]),
                npub: tag[3],
                displayName: tag[4],
                avatarUrl: tag[5],
                score: parseInt(tag[6]),
                formattedScore: tag[7],
                lightningAddress: tag[8],
              });
            }
            break;

          case 'vcode':
            // Format: ["vcode", code, validFrom, validUntil]
            if (tag.length >= 4) {
              vcode = tag[1];
              vcodeValidFrom = parseInt(tag[2]);
              vcodeValidUntil = parseInt(tag[3]);
            }
            break;

          case 'pool':
            // Format: ["pool", period, totalAmount, currency, claimedCount, label]
            if (tag.length >= 5) {
              pool = {
                period: tag[1],
                totalAmount: parseFloat(tag[2]),
                currency: tag[3],
                claimedCount: parseInt(tag[4]),
              };
            }
            break;
        }
      }

      return {
        updatedAt,
        competitions,
        entries,
        dailyLeaderboards,
        dailyEntries,
        impactData: [],
        vcode,
        vcodeValidFrom,
        vcodeValidUntil,
        pool,
      };
    } catch (error) {
      console.error('[NostrLeaderboard] Error parsing note:', error);
      return null;
    }
  }

  /**
   * Save leaderboard data to AsyncStorage cache
   */
  private async saveToCache(data: LeaderboardData): Promise<void> {
    try {
      await AsyncStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify(data));
      console.log('[NostrLeaderboard] Saved to cache');
    } catch (error) {
      console.error('[NostrLeaderboard] Error saving cache:', error);
    }
  }

  /**
   * Merge official entries with pending workouts for optimistic display
   */
  private mergeWithPending(
    entries: LeaderboardEntry[],
    pending: PendingWorkout[]
  ): LeaderboardEntry[] {
    const merged = [...entries];

    for (const workout of pending) {
      // Check if this workout is already in the official leaderboard
      const existingIndex = entries.findIndex(
        e => e.npub === workout.npub && e.competitionId === workout.competitionId
      );

      if (existingIndex === -1) {
        // Add as new entry at the bottom (will be ranked when official note arrives)
        merged.push({
          competitionId: workout.competitionId,
          rank: merged.length + 1,
          npub: workout.npub,
          displayName: 'You', // Placeholder until official note
          avatarUrl: '',
          distanceMeters: workout.distanceMeters,
          durationSeconds: workout.durationSeconds,
          lightningAddress: '',
          teamId: '',
        });
      }
    }

    // Re-sort by distance (descending) and re-rank
    merged.sort((a, b) => b.distanceMeters - a.distanceMeters);
    merged.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return merged;
  }
}

// Export singleton instance
export const NostrLeaderboardService = NostrLeaderboardServiceClass.getInstance();
export default NostrLeaderboardService;
