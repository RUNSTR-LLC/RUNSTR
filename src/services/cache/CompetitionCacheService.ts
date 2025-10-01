/**
 * CompetitionCacheService - Caching layer for competition/event/league data
 * Implements 30-minute TTL for competition data with background refresh
 * Prevents redundant Nostr queries when navigating between teams
 */

import { appCache } from '../../utils/cache';
import { NostrCompetitionService } from '../nostr/NostrCompetitionService';
import type { NostrLeagueDefinition, NostrEventDefinition } from '../../types/nostrCompetition';

export interface CachedCompetitions {
  leagues: NostrLeagueDefinition[];
  events: NostrEventDefinition[];
  timestamp: number;
}

export class CompetitionCacheService {
  private static instance: CompetitionCacheService;
  private competitionService: NostrCompetitionService;
  private isRefreshing = false;
  private lastRefreshTime = 0;

  // Cache keys
  private readonly CACHE_KEY_PREFIX = 'competitions';
  private readonly GLOBAL_CACHE_KEY = 'competitions_global';
  private readonly TIMESTAMP_KEY = 'competitions_fetch_time';

  // Cache TTL: 30 minutes (competitions are stable)
  private readonly CACHE_TTL = 30 * 60 * 1000;

  // Background refresh after 5 minutes
  private readonly BACKGROUND_REFRESH_TIME = 5 * 60 * 1000;

  private constructor() {
    this.competitionService = NostrCompetitionService.getInstance();
  }

  static getInstance(): CompetitionCacheService {
    if (!CompetitionCacheService.instance) {
      CompetitionCacheService.instance = new CompetitionCacheService();
    }
    return CompetitionCacheService.instance;
  }

  /**
   * Check if we have cached competitions
   */
  async hasCachedCompetitions(): Promise<boolean> {
    const cached = await appCache.get<CachedCompetitions>(this.GLOBAL_CACHE_KEY);
    return !!(cached && (cached.leagues.length > 0 || cached.events.length > 0));
  }

  /**
   * Get all competitions with cache-first strategy
   * Returns cached data immediately if available, triggers background refresh if stale
   */
  async getAllCompetitions(): Promise<CachedCompetitions> {
    console.log('📦 CompetitionCacheService: Fetching all competitions...');

    // Check cache first
    const cachedData = await appCache.get<CachedCompetitions>(this.GLOBAL_CACHE_KEY);
    const cacheTime = await appCache.get<number>(this.TIMESTAMP_KEY);

    if (cachedData && (cachedData.leagues.length > 0 || cachedData.events.length > 0)) {
      console.log(
        `✅ CompetitionCacheService: Returning ${cachedData.leagues.length} leagues, ${cachedData.events.length} events from cache`
      );

      // Check if background refresh is needed (after 5 minutes)
      if (cacheTime && Date.now() - cacheTime > this.BACKGROUND_REFRESH_TIME) {
        this.refreshInBackground();
      }

      return cachedData;
    }

    // No cache, fetch fresh data
    console.log('🔄 CompetitionCacheService: Cache miss, fetching fresh competitions...');
    return this.fetchAndCacheCompetitions();
  }

  /**
   * Get competitions filtered by team ID
   */
  async getCompetitionsForTeam(teamId: string): Promise<CachedCompetitions> {
    console.log(`📦 CompetitionCacheService: Fetching competitions for team ${teamId}...`);

    // Get all competitions from cache or fetch
    const allCompetitions = await this.getAllCompetitions();

    // Filter by team ID
    const teamLeagues = allCompetitions.leagues.filter(
      (league) => league.metadata?.teamId === teamId || league.tags.some((tag) => tag[0] === 'team' && tag[1] === teamId)
    );

    const teamEvents = allCompetitions.events.filter(
      (event) => event.metadata?.teamId === teamId || event.tags.some((tag) => tag[0] === 'team' && tag[1] === teamId)
    );

    console.log(
      `✅ CompetitionCacheService: Found ${teamLeagues.length} leagues, ${teamEvents.length} events for team ${teamId}`
    );

    return {
      leagues: teamLeagues,
      events: teamEvents,
      timestamp: allCompetitions.timestamp,
    };
  }

  /**
   * Force refresh competitions (used for pull-to-refresh)
   */
  async refreshCompetitions(): Promise<CachedCompetitions> {
    console.log('🔄 CompetitionCacheService: Force refreshing competitions...');
    return this.fetchAndCacheCompetitions();
  }

  /**
   * Fetch competitions from Nostr and update cache
   */
  private async fetchAndCacheCompetitions(): Promise<CachedCompetitions> {
    try {
      // Query recent competitions (last 90 days)
      const now = Math.floor(Date.now() / 1000);
      const ninetyDaysAgo = now - 90 * 24 * 60 * 60;

      const result = await this.competitionService.queryCompetitions({
        kinds: [30100, 30101], // Both leagues and events
        since: ninetyDaysAgo,
        limit: 500,
      });

      const leagues = result.filter((comp): comp is NostrLeagueDefinition => comp.kind === 30100);
      const events = result.filter((comp): comp is NostrEventDefinition => comp.kind === 30101);

      const cachedData: CachedCompetitions = {
        leagues,
        events,
        timestamp: Date.now(),
      };

      // Cache the competitions
      await appCache.set(this.GLOBAL_CACHE_KEY, cachedData, this.CACHE_TTL);
      await appCache.set(this.TIMESTAMP_KEY, Date.now(), this.CACHE_TTL);

      console.log(
        `✅ CompetitionCacheService: Cached ${leagues.length} leagues, ${events.length} events`
      );

      return cachedData;
    } catch (error) {
      console.error('❌ CompetitionCacheService: Error fetching competitions:', error);

      // Try to return stale cache if available
      const staleCachedData = await appCache.get<CachedCompetitions>(this.GLOBAL_CACHE_KEY);
      if (staleCachedData) {
        console.log('⚠️ CompetitionCacheService: Returning stale cache due to error');
        return staleCachedData;
      }

      // Return empty result if all else fails
      return {
        leagues: [],
        events: [],
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Background refresh without blocking UI
   */
  private async refreshInBackground(): Promise<void> {
    // Prevent multiple simultaneous refreshes
    if (this.isRefreshing) {
      return;
    }

    // Rate limit background refreshes (max once per minute)
    if (Date.now() - this.lastRefreshTime < 60000) {
      return;
    }

    this.isRefreshing = true;
    this.lastRefreshTime = Date.now();

    console.log('🔄 CompetitionCacheService: Starting background refresh...');

    try {
      const freshData = await this.fetchAndCacheCompetitions();
      console.log(
        `✅ CompetitionCacheService: Background refresh complete, ${freshData.leagues.length} leagues, ${freshData.events.length} events updated`
      );
    } catch (error) {
      console.error('❌ CompetitionCacheService: Background refresh failed:', error);
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Clear the competition cache (used after competition updates)
   */
  async clearCache(): Promise<void> {
    console.log('🧹 CompetitionCacheService: Clearing competition cache...');
    await appCache.clear('competitions');
    console.log('✅ CompetitionCacheService: Cache cleared successfully');
  }

  /**
   * Get cache status for debugging
   */
  async getCacheStatus(): Promise<{
    hasCachedData: boolean;
    cacheAge: number | null;
    leagueCount: number;
    eventCount: number;
  }> {
    const cachedData = await appCache.get<CachedCompetitions>(this.GLOBAL_CACHE_KEY);
    const cacheTime = await appCache.get<number>(this.TIMESTAMP_KEY);

    return {
      hasCachedData: !!cachedData,
      cacheAge: cacheTime ? Date.now() - cacheTime : null,
      leagueCount: cachedData?.leagues.length || 0,
      eventCount: cachedData?.events.length || 0,
    };
  }
}
