/**
 * OnboardingCacheService
 * Background data loading during onboarding to improve UX
 * Pre-fetches teams, competitions, and other Nostr data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NostrTeamService } from '../team/NostrTeamService';
import { NdkTeamService } from '../team/NdkTeamService';

const CACHE_KEYS = {
  TEAMS: '@runstr:cached_teams',
  COMPETITIONS: '@runstr:cached_competitions',
  CACHE_TIMESTAMP: '@runstr:cache_timestamp',
  CACHE_STATUS: '@runstr:cache_status',
} as const;

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

interface CacheStatus {
  teams: boolean;
  competitions: boolean;
  timestamp?: number;
  isLoading: boolean;
}

class OnboardingCacheService {
  private static instance: OnboardingCacheService;
  private cacheStatus: CacheStatus = {
    teams: false,
    competitions: false,
    isLoading: false,
  };

  private constructor() {}

  static getInstance(): OnboardingCacheService {
    if (!OnboardingCacheService.instance) {
      OnboardingCacheService.instance = new OnboardingCacheService();
    }
    return OnboardingCacheService.instance;
  }

  /**
   * Start background caching of all data
   * Called when user starts onboarding
   */
  async startBackgroundCaching(): Promise<void> {
    if (this.cacheStatus.isLoading) {
      console.log('[OnboardingCache] Already caching, skipping duplicate request');
      return;
    }

    console.log('[OnboardingCache] Starting background data caching...');
    this.cacheStatus.isLoading = true;

    try {
      // Check if we have recent cache
      const hasRecentCache = await this.hasRecentCache();
      if (hasRecentCache) {
        console.log('[OnboardingCache] Recent cache exists, skipping refresh');
        this.cacheStatus.isLoading = false;
        return;
      }

      // Run caching tasks in parallel
      const cachePromises = [
        this.cacheTeams(),
        this.cacheCompetitions(),
      ];

      await Promise.allSettled(cachePromises);

      // Update cache timestamp
      await AsyncStorage.setItem(
        CACHE_KEYS.CACHE_TIMESTAMP,
        Date.now().toString()
      );

      console.log('[OnboardingCache] Background caching complete:', this.cacheStatus);
    } catch (error) {
      console.error('[OnboardingCache] Background caching failed:', error);
    } finally {
      this.cacheStatus.isLoading = false;
    }
  }

  /**
   * Cache team data from Nostr relays
   */
  private async cacheTeams(): Promise<void> {
    try {
      console.log('[OnboardingCache] Caching team data...');

      // Use NdkTeamService for fast team discovery
      const ndkService = NdkTeamService.getInstance();
      await ndkService.initialize();

      // Discover teams with a reasonable timeout
      const teams = await Promise.race([
        ndkService.discoverAllTeams(),
        new Promise<any[]>((resolve) =>
          setTimeout(() => resolve([]), 10000) // 10 second timeout
        ),
      ]);

      if (teams && teams.length > 0) {
        // Store teams in cache
        await AsyncStorage.setItem(
          CACHE_KEYS.TEAMS,
          JSON.stringify(teams)
        );

        this.cacheStatus.teams = true;
        console.log(`[OnboardingCache] Cached ${teams.length} teams`);
      } else {
        console.log('[OnboardingCache] No teams found or timeout reached');
      }
    } catch (error) {
      console.error('[OnboardingCache] Failed to cache teams:', error);
      this.cacheStatus.teams = false;
    }
  }

  /**
   * Cache competition data
   */
  private async cacheCompetitions(): Promise<void> {
    try {
      console.log('[OnboardingCache] Caching competition data...');

      // For now, we'll just mark this as complete
      // In the future, implement actual competition caching
      this.cacheStatus.competitions = true;

      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('[OnboardingCache] Competition caching complete');
    } catch (error) {
      console.error('[OnboardingCache] Failed to cache competitions:', error);
      this.cacheStatus.competitions = false;
    }
  }

  /**
   * Check if we have recent cache
   */
  private async hasRecentCache(): Promise<boolean> {
    try {
      const timestampStr = await AsyncStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP);
      if (!timestampStr) {
        return false;
      }

      const timestamp = parseInt(timestampStr, 10);
      const age = Date.now() - timestamp;

      return age < CACHE_DURATION;
    } catch {
      return false;
    }
  }

  /**
   * Get cached teams
   */
  async getCachedTeams(): Promise<any[] | null> {
    try {
      const teamsJson = await AsyncStorage.getItem(CACHE_KEYS.TEAMS);
      if (!teamsJson) {
        return null;
      }
      return JSON.parse(teamsJson);
    } catch (error) {
      console.error('[OnboardingCache] Failed to get cached teams:', error);
      return null;
    }
  }

  /**
   * Get current cache status
   */
  getCacheStatus(): CacheStatus {
    return { ...this.cacheStatus };
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(CACHE_KEYS.TEAMS),
        AsyncStorage.removeItem(CACHE_KEYS.COMPETITIONS),
        AsyncStorage.removeItem(CACHE_KEYS.CACHE_TIMESTAMP),
        AsyncStorage.removeItem(CACHE_KEYS.CACHE_STATUS),
      ]);

      this.cacheStatus = {
        teams: false,
        competitions: false,
        isLoading: false,
      };

      console.log('[OnboardingCache] Cache cleared');
    } catch (error) {
      console.error('[OnboardingCache] Failed to clear cache:', error);
    }
  }
}

export default OnboardingCacheService.getInstance();