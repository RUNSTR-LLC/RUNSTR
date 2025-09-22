/**
 * TeamCacheService - Caching layer for team data
 * Implements 10-minute TTL for team discovery with background refresh
 */

import { appCache } from '../../utils/cache';
import { NostrTeamService, type NostrTeam } from '../nostr/NostrTeamService';
import type { DiscoveryTeam } from '../../types';

export class TeamCacheService {
  private static instance: TeamCacheService;
  private teamService: NostrTeamService;
  private isRefreshing = false;
  private lastRefreshTime = 0;

  // Cache keys
  private readonly CACHE_KEY = 'teams_discovery';
  private readonly TIMESTAMP_KEY = 'teams_fetch_time';

  // Cache TTL: 10 minutes
  private readonly CACHE_TTL = 10 * 60 * 1000;

  // Background refresh after 5 minutes
  private readonly BACKGROUND_REFRESH_TIME = 5 * 60 * 1000;

  private constructor() {
    this.teamService = NostrTeamService.getInstance();
  }

  static getInstance(): TeamCacheService {
    if (!TeamCacheService.instance) {
      TeamCacheService.instance = new TeamCacheService();
    }
    return TeamCacheService.instance;
  }

  /**
   * Get teams with cache-first strategy
   * Returns cached data immediately if available, triggers background refresh if stale
   */
  async getTeams(): Promise<DiscoveryTeam[]> {
    console.log('📦 TeamCacheService: Fetching teams...');

    // Check cache first
    const cachedTeams = await appCache.get<NostrTeam[]>(this.CACHE_KEY);
    const cacheTime = await appCache.get<number>(this.TIMESTAMP_KEY);

    if (cachedTeams && cachedTeams.length > 0) {
      console.log(`✅ TeamCacheService: Returning ${cachedTeams.length} cached teams`);

      // Check if background refresh is needed (after 5 minutes)
      if (cacheTime && Date.now() - cacheTime > this.BACKGROUND_REFRESH_TIME) {
        this.refreshInBackground();
      }

      return this.convertToDiscoveryTeams(cachedTeams);
    }

    // No cache, fetch fresh data
    console.log('🔄 TeamCacheService: Cache miss, fetching fresh teams...');
    return this.fetchAndCacheTeams();
  }

  /**
   * Force refresh teams (used for pull-to-refresh)
   */
  async refreshTeams(): Promise<DiscoveryTeam[]> {
    console.log('🔄 TeamCacheService: Force refreshing teams...');
    return this.fetchAndCacheTeams();
  }

  /**
   * Fetch teams from Nostr and update cache
   */
  private async fetchAndCacheTeams(): Promise<DiscoveryTeam[]> {
    try {
      const teams = await this.teamService.discoverFitnessTeams();

      if (teams && teams.length > 0) {
        // Cache the teams
        await appCache.set(this.CACHE_KEY, teams, this.CACHE_TTL);
        await appCache.set(this.TIMESTAMP_KEY, Date.now(), this.CACHE_TTL);

        console.log(`✅ TeamCacheService: Cached ${teams.length} teams`);
        return this.convertToDiscoveryTeams(teams);
      }

      console.log('⚠️ TeamCacheService: No teams found');
      return [];
    } catch (error) {
      console.error('❌ TeamCacheService: Error fetching teams:', error);

      // Try to return stale cache if available
      const staleCachedTeams = await appCache.get<NostrTeam[]>(this.CACHE_KEY);
      if (staleCachedTeams) {
        console.log('⚠️ TeamCacheService: Returning stale cache due to error');
        return this.convertToDiscoveryTeams(staleCachedTeams);
      }

      return [];
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

    console.log('🔄 TeamCacheService: Starting background refresh...');

    try {
      const teams = await this.teamService.discoverFitnessTeams();

      if (teams && teams.length > 0) {
        await appCache.set(this.CACHE_KEY, teams, this.CACHE_TTL);
        await appCache.set(this.TIMESTAMP_KEY, Date.now(), this.CACHE_TTL);
        console.log(`✅ TeamCacheService: Background refresh complete, ${teams.length} teams updated`);
      }
    } catch (error) {
      console.error('❌ TeamCacheService: Background refresh failed:', error);
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Convert NostrTeam to DiscoveryTeam for UI compatibility
   */
  private convertToDiscoveryTeams(nostrTeams: NostrTeam[]): DiscoveryTeam[] {
    return nostrTeams.map(team => ({
      id: team.id,
      name: team.name,
      description: team.description,
      memberCount: team.memberCount || 0,
      imageUrl: undefined, // NostrTeam doesn't have imageUrl
      skillLevel: 'intermediate' as const,
      weeklyGoal: `${team.activityType || 'Fitness'} goals`,
      joinedDate: undefined,
      location: team.location,
      activityType: team.activityType || 'General Fitness',
      tags: team.tags || [],
      isPublic: team.isPublic,
      prizePool: 0,
      captain: team.captain,
      captainId: team.captainId,
      captainNpub: team.captainNpub,
      createdAt: team.createdAt,
      nostrEvent: team.nostrEvent,
    }));
  }

  /**
   * Clear team cache (used on logout)
   */
  async clearCache(): Promise<void> {
    await appCache.clear('teams');
    console.log('🧹 TeamCacheService: Cache cleared');
  }

  /**
   * Get cache status for debugging
   */
  async getCacheStatus(): Promise<{
    hasCachedData: boolean;
    cacheAge: number | null;
    teamCount: number;
  }> {
    const cachedTeams = await appCache.get<NostrTeam[]>(this.CACHE_KEY);
    const cacheTime = await appCache.get<number>(this.TIMESTAMP_KEY);

    return {
      hasCachedData: !!cachedTeams,
      cacheAge: cacheTime ? Date.now() - cacheTime : null,
      teamCount: cachedTeams?.length || 0,
    };
  }
}