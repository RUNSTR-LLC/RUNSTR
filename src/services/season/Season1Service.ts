/**
 * Season1Service - Returns RUNSTR Season 1 competition data
 * Uses static hard-coded results for instant performance (no Nostr queries)
 * Season 1 ended on 2025-10-09 so data is final and immutable
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SEASON_1_CONFIG } from '../../types/season';
import type {
  Season1Participant,
  Season1Leaderboard,
  SeasonActivityType,
} from '../../types/season';

// Import static Season 1 results
const season1Results = require('../../data/season1Results.json');

// Cache keys
const CACHE_KEYS = {
  PARTICIPANTS: '@season1:participants',
  ALL_WORKOUTS: '@season1:all_workouts',
  PROFILES: '@season1:profiles',
};

// Cache duration in milliseconds
const CACHE_DURATION = {
  PARTICIPANTS: 24 * 60 * 60 * 1000, // 24 hours
  WORKOUTS: 24 * 60 * 60 * 1000, // 24 hours
  PROFILES: 24 * 60 * 60 * 1000, // 24 hours
};

// Query timeout in milliseconds
const QUERY_TIMEOUT = 15000; // 15 seconds

class Season1Service {
  // Simple in-memory cache for the static data
  private staticDataLoaded: boolean = false;

  /**
   * Get participant list from static data (instant, no Nostr query)
   */
  async fetchParticipantList(): Promise<string[]> {
    console.log(
      '[Season1] ⚡ Using static Season 1 results (instant, no fetching)'
    );

    // Extract all unique participant pubkeys from the static data
    const participants = new Set<string>();

    Object.values(season1Results.leaderboards).forEach((leaderboard: any) => {
      leaderboard.participants.forEach((p: any) => {
        participants.add(p.pubkey);
      });
    });

    const participantArray = Array.from(participants);
    console.log(
      `[Season1] ✅ Loaded ${participantArray.length} participants from static data`
    );

    return participantArray;
  }

  /**
   * No longer needed - all data is in static JSON
   * Kept for backward compatibility but returns empty data
   */
  private async fetchAllWorkoutsAndProfiles(participants: string[]): Promise<{
    workouts: any[];
    profiles: Map<string, any>;
  }> {
    console.log(
      '[Season1] ⚡ Skipping workout/profile fetch - using static leaderboard data'
    );
    return {
      workouts: [], // Not needed - we have final results
      profiles: new Map(), // Not needed - names/pictures in static data
    };
  }

  /**
   * Get leaderboard from static data (instant, no calculations needed)
   */
  async fetchLeaderboard(
    activityType: SeasonActivityType
  ): Promise<Season1Leaderboard> {
    console.log(
      `[Season1] ⚡ Loading ${activityType} leaderboard from static data (instant!)`
    );

    try {
      // Get the static leaderboard for the requested activity type
      const leaderboardData = season1Results.leaderboards[activityType];

      if (!leaderboardData) {
        console.log(`[Season1] No leaderboard found for ${activityType}`);
        return {
          activityType,
          participants: [],
          lastUpdated: Date.now(),
          totalParticipants: 0,
        };
      }

      // Convert static data to Season1Leaderboard format
      const result: Season1Leaderboard = {
        activityType,
        participants: leaderboardData.participants.map((p: any) => ({
          pubkey: p.pubkey,
          npub: p.npub,
          name: p.name,
          picture: p.picture,
          totalDistance: p.totalDistance,
          workoutCount: p.workoutCount,
          lastActivityDate: p.lastActivityDate,
        })),
        lastUpdated: leaderboardData.lastUpdated,
        totalParticipants: leaderboardData.totalParticipants,
      };

      console.log(
        `[Season1] ✅ ${activityType} leaderboard loaded instantly with ${result.participants.length} participants`
      );

      // Optional: Cache in AsyncStorage for offline access
      await AsyncStorage.setItem(
        `${CACHE_KEYS.PARTICIPANTS}_${activityType}`,
        JSON.stringify(result)
      ).catch(() => {}); // Ignore cache errors

      return result;
    } catch (error) {
      console.error('[Season1] Error loading static leaderboard:', error);

      // Try to load from AsyncStorage as fallback
      try {
        const cached = await AsyncStorage.getItem(
          `${CACHE_KEYS.PARTICIPANTS}_${activityType}`
        );
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (cacheError) {
        console.error('[Season1] Cache fallback failed:', cacheError);
      }

      return {
        activityType,
        participants: [],
        lastUpdated: Date.now(),
        totalParticipants: 0,
      };
    }
  }

  /**
   * Normalize activity type from various formats
   */
  private normalizeActivityType(type: string): SeasonActivityType | null {
    if (!type) return null;

    const normalized = type.toLowerCase().trim();

    // Check for running variations
    if (normalized.includes('run') || normalized.includes('jog'))
      return 'running';

    // Check for walking variations
    if (normalized.includes('walk') || normalized.includes('hike'))
      return 'walking';

    // Check for cycling variations
    if (
      normalized.includes('cycl') ||
      normalized.includes('bike') ||
      normalized.includes('ride')
    )
      return 'cycling';

    // Additional cardio types that might map to running
    if (normalized === 'cardio' || normalized === 'treadmill') return 'running';

    // Direct matches
    if (normalized === 'running') return 'running';
    if (normalized === 'walking') return 'walking';
    if (normalized === 'cycling') return 'cycling';

    return null;
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    console.log('[Season1] Clearing all caches...');

    this.staticDataLoaded = false;

    await Promise.all([
      AsyncStorage.removeItem(CACHE_KEYS.PARTICIPANTS),
      AsyncStorage.removeItem(CACHE_KEYS.ALL_WORKOUTS),
      AsyncStorage.removeItem(CACHE_KEYS.PROFILES),
      AsyncStorage.removeItem(`${CACHE_KEYS.PARTICIPANTS}_running`),
      AsyncStorage.removeItem(`${CACHE_KEYS.PARTICIPANTS}_cycling`),
      AsyncStorage.removeItem(`${CACHE_KEYS.PARTICIPANTS}_walking`),
    ]);
  }

  /**
   * Prefetch all Season 1 data (instant - just loads static JSON)
   */
  async prefetchAll(): Promise<void> {
    console.log('[Season1] ⚡ Prefetching Season 1 static data (instant!)');
    try {
      // Simply preload all three leaderboards into AsyncStorage for offline access
      await Promise.all([
        this.fetchLeaderboard('running'),
        this.fetchLeaderboard('cycling'),
        this.fetchLeaderboard('walking'),
      ]);
      console.log(
        '[Season1] ✅ All Season 1 leaderboards loaded instantly from static data'
      );
      this.staticDataLoaded = true;
    } catch (error) {
      console.error('[Season1] Prefetch error:', error);
    }
  }
}

// Export singleton instance
export const season1Service = new Season1Service();
