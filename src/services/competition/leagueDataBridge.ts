/**
 * League Data Bridge Service - Connects wizard competition parameters to live rankings
 * Maps league creation wizard settings to ranking calculation parameters
 * Manages competition lifecycle and participant data integration
 */

import { NostrCompetitionService } from '../nostr/NostrCompetitionService';
import { NostrTeamService } from '../nostr/NostrTeamService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  LeagueParameters,
  LeagueParticipant,
} from './leagueRankingService';
import type {
  NostrActivityType,
  NostrLeagueCompetitionType,
} from '../../types/nostrCompetition';

// Temporary NostrLeague interface until it's added to types
interface NostrLeague {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  activityType: NostrActivityType;
  competitionType: NostrLeagueCompetitionType;
  startDate: string;
  endDate: string;
  scoringFrequency?: 'daily' | 'weekly' | 'total';
  captainId: string;
}

export interface ActiveLeague {
  competitionId: string;
  teamId: string;
  name: string;
  description: string;
  parameters: LeagueParameters;
  participants: LeagueParticipant[];
  createdBy: string;
  isActive: boolean;
  lastUpdated: string;
  prizePoolSats?: number; // Optional prize pool amount in sats
}

export interface LeagueCreationData {
  teamId: string;
  name: string;
  description: string;
  activityType: NostrActivityType;
  competitionType: NostrLeagueCompetitionType;
  startDate: string;
  endDate: string;
  duration: number;
  entryFeesSats: number;
  maxParticipants: number;
  requireApproval: boolean;
  allowLateJoining: boolean;
  scoringFrequency: 'daily' | 'weekly' | 'total';
  prizePoolSats?: number; // Optional prize pool amount in sats
}

export class LeagueDataBridge {
  private static instance: LeagueDataBridge;
  private nostrCompetitionService = new NostrCompetitionService();
  private nostrTeamService = new NostrTeamService();
  private activeLeagues = new Map<string, ActiveLeague>();
  private STORAGE_PREFIX = '@runstr:competition:';
  private ACTIVE_LEAGUE_PREFIX = '@runstr:active_league:'; // For team-specific active league cache

  // Cache TTL configuration (matching leagueRankingService pattern)
  private readonly CACHE_FRESH_MS = 5 * 60 * 1000; // 5 minutes fresh
  private readonly CACHE_STALE_MS = 24 * 60 * 60 * 1000; // 24 hours max stale

  static getInstance(): LeagueDataBridge {
    if (!LeagueDataBridge.instance) {
      LeagueDataBridge.instance = new LeagueDataBridge();
    }
    return LeagueDataBridge.instance;
  }

  private getStorageKey(competitionId: string): string {
    return `${this.STORAGE_PREFIX}${competitionId}`;
  }

  private getActiveLeagueStorageKey(teamId: string): string {
    return `${this.ACTIVE_LEAGUE_PREFIX}${teamId}`;
  }

  /**
   * Process league creation from wizard data
   */
  async processLeagueCreation(
    leagueData: LeagueCreationData,
    creatorPrivateKey: string
  ): Promise<{
    success: boolean;
    competitionId?: string;
    activeLeague?: ActiveLeague;
    message?: string;
  }> {
    console.log(`🏁 Processing league creation: ${leagueData.name}`);

    try {
      // Create league via Nostr Competition Service (static method)
      const creationResult = await NostrCompetitionService.createLeague(
        leagueData,
        creatorPrivateKey
      );

      if (!creationResult.success || !creationResult.competitionId) {
        return {
          success: false,
          message: creationResult.message || 'Failed to create league on Nostr',
        };
      }

      console.log(`✅ League created on Nostr: ${creationResult.competitionId}`);

      // Get team members as initial participants
      const participants = await this.getTeamParticipants(leagueData.teamId);

      // Create league parameters for ranking service
      const parameters: LeagueParameters = {
        activityType: leagueData.activityType,
        competitionType: leagueData.competitionType,
        startDate: leagueData.startDate,
        endDate: leagueData.endDate,
        scoringFrequency: leagueData.scoringFrequency,
      };

      // Create active league record
      const activeLeague: ActiveLeague = {
        competitionId: creationResult.competitionId,
        teamId: leagueData.teamId,
        name: leagueData.name,
        description: leagueData.description,
        parameters,
        participants,
        createdBy: '', // Will be set from Nostr event when queried
        isActive: this.isLeagueActive(leagueData),
        lastUpdated: new Date().toISOString(),
        prizePoolSats: leagueData.prizePoolSats,
      };

      // Cache the active league
      this.activeLeagues.set(creationResult.competitionId, activeLeague);

      // Store competition parameters in AsyncStorage cache
      const storageKey = this.getStorageKey(creationResult.competitionId);
      const cacheData = {
        competitionId: creationResult.competitionId,
        type: 'league',
        parameters,
        participants: participants.map(p => p.npub),
        lastUpdated: new Date().toISOString(),
      };
      await AsyncStorage.setItem(storageKey, JSON.stringify(cacheData));

      console.log(`🎯 League fully processed: ${activeLeague.name}`);

      return {
        success: true,
        competitionId: creationResult.competitionId,
        activeLeague,
        message: `League "${leagueData.name}" created successfully`,
      };

    } catch (error) {
      console.error('❌ Failed to process league creation:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all active competitions (leagues and events) for a team
   */
  async getActiveCompetitionsForTeam(teamId: string): Promise<{ leagues: ActiveLeague[], events: any[] }> {
    console.log(`🔍 Getting all active competitions for team: ${teamId.slice(0, 8)}...`);

    const activeLeagues: ActiveLeague[] = [];
    const activeEvents: any[] = [];

    try {
      // Query both leagues and events from Nostr
      const result = await this.nostrCompetitionService.queryCompetitions({
        kinds: [30100, 30101], // Both league and event kinds
        '#team': [teamId],
        limit: 100
      });

      const now = new Date();

      // Process leagues
      for (const league of result.leagues) {
        const startDate = new Date(league.startDate);
        const endDate = new Date(league.endDate);

        if (now >= startDate && now <= endDate) {
          const activeLeague = await this.convertNostrLeagueToActive(league, teamId);
          if (activeLeague) {
            activeLeagues.push(activeLeague);
            this.activeLeagues.set(league.id, activeLeague);
          }
        }
      }

      // Process events
      for (const event of result.events) {
        const eventDate = new Date(event.eventDate);
        const eventEndDate = new Date(eventDate);
        eventEndDate.setHours(23, 59, 59); // Event ends at end of day

        if (now >= eventDate && now <= eventEndDate) {
          activeEvents.push(event);
        }
      }

      console.log(`✅ Found ${activeLeagues.length} leagues and ${activeEvents.length} events`);
      return { leagues: activeLeagues, events: activeEvents };

    } catch (error) {
      console.error('❌ Failed to get competitions from Nostr:', error);
      return { leagues: [], events: [] };
    }
  }

  /**
   * Get active league for a team
   * Uses persistent cache with stale-while-revalidate pattern (instant display, background refresh)
   */
  async getActiveLeagueForTeam(teamId: string): Promise<ActiveLeague | null> {
    console.log(`🔍 Getting active league for team: ${teamId.slice(0, 8)}...`);

    // Step 1: Check in-memory cache (fastest)
    for (const league of this.activeLeagues.values()) {
      if (league.teamId === teamId && league.isActive) {
        console.log(`⚡ Found in-memory active league: ${league.name}`);
        return league;
      }
    }

    // Step 2: Check persistent cache (AsyncStorage)
    const cacheKey = this.getActiveLeagueStorageKey(teamId);
    try {
      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (cachedData) {
        const cached = JSON.parse(cachedData);
        const cacheAge = Date.now() - cached.timestamp;

        // Fresh cache (< 5 minutes) - return immediately
        if (cacheAge < this.CACHE_FRESH_MS) {
          console.log(`✅ Returning fresh cached league (age: ${Math.round(cacheAge / 1000)}s)`);
          const activeLeague = cached.league as ActiveLeague;
          this.activeLeagues.set(activeLeague.competitionId, activeLeague);
          return activeLeague;
        }

        // Stale cache (5 min - 24 hours) - return immediately, refresh in background
        if (cacheAge < this.CACHE_STALE_MS) {
          const ageHours = Math.round(cacheAge / (1000 * 60 * 60));
          const ageMinutes = Math.round(cacheAge / (1000 * 60));
          console.log(`⚡ Returning stale cache (age: ${ageHours > 0 ? ageHours + 'h' : ageMinutes + 'm'}), refreshing in background`);

          const activeLeague = cached.league as ActiveLeague;
          this.activeLeagues.set(activeLeague.competitionId, activeLeague);

          // Trigger background refresh without blocking
          this.refreshActiveLeagueInBackground(teamId);

          return activeLeague;
        }

        console.log(`🗑️ Cache expired (age: ${Math.round(cacheAge / (1000 * 60 * 60))}h), fetching fresh`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to read cached league:', error);
    }

    // Step 3: No cache or cache expired - query Nostr (blocking)
    return this.fetchActiveLeagueFromNostr(teamId);
  }

  /**
   * Fetch active league from Nostr (blocking call)
   */
  private async fetchActiveLeagueFromNostr(teamId: string): Promise<ActiveLeague | null> {
    try {
      console.log(`🔍 Querying Nostr for team leagues: ${teamId}`);

      // Query competitions from Nostr for this team
      const result = await this.nostrCompetitionService.queryCompetitions({
        kinds: [30100], // League kind
        '#team': [teamId],
        limit: 50
      });

      // Find active leagues from the results
      const now = new Date();
      for (const league of result.leagues) {
        const startDate = new Date(league.startDate);
        const endDate = new Date(league.endDate);

        // Check if league is currently active
        if (now >= startDate && now <= endDate) {
          // Convert to ActiveLeague format and cache it
          const activeLeague = await this.convertNostrLeagueToActive(league, teamId);
          if (activeLeague) {
            // Cache in memory
            this.activeLeagues.set(league.id, activeLeague);

            // Cache in persistent storage with timestamp
            await this.cacheActiveLeague(teamId, activeLeague);

            console.log(`✅ Found active league from Nostr: ${league.name}`);
            return activeLeague;
          }
        }
      }

      console.log('📭 No active league found for team');
      return null;

    } catch (error) {
      console.error('❌ Failed to query leagues from Nostr:', error);

      // Fall back to cached data if Nostr query fails
      const cachedIds = await this.getCachedCompetitionIds(teamId);
      for (const competitionId of cachedIds) {
        const cached = await this.getLeagueParameters(competitionId);
        if (cached) {
          const cachedLeague = this.activeLeagues.get(competitionId);
          if (cachedLeague && cachedLeague.isActive) {
            console.log('📦 Using cached league data');
            return cachedLeague;
          }
        }
      }

      return null;
    }
  }

  /**
   * Refresh active league in background (non-blocking)
   */
  private async refreshActiveLeagueInBackground(teamId: string): Promise<void> {
    try {
      console.log(`🔄 Background refresh started for team: ${teamId.slice(0, 8)}...`);

      const freshLeague = await this.fetchActiveLeagueFromNostr(teamId);

      if (freshLeague) {
        console.log(`✅ Background refresh complete: ${freshLeague.name}`);
      } else {
        console.log(`📭 Background refresh found no active league`);
      }
    } catch (error) {
      console.error('❌ Background refresh failed:', error);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Cache active league with timestamp in persistent storage
   */
  private async cacheActiveLeague(teamId: string, league: ActiveLeague): Promise<void> {
    try {
      const cacheKey = this.getActiveLeagueStorageKey(teamId);
      const cacheData = {
        league,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log(`💾 Cached active league to persistent storage: ${league.name}`);
    } catch (error) {
      console.error('❌ Failed to cache active league:', error);
    }
  }

  /**
   * Get league ranking parameters from competition ID
   */
  async getLeagueParameters(competitionId: string): Promise<LeagueParameters | null> {
    // Check memory cache first
    const cachedLeague = this.activeLeagues.get(competitionId);
    if (cachedLeague) {
      return cachedLeague.parameters;
    }

    // Check AsyncStorage cache
    const storageKey = this.getStorageKey(competitionId);
    const cachedData = await AsyncStorage.getItem(storageKey);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        return parsed.parameters;
      } catch (error) {
        console.warn('⚠️ Failed to parse cached competition parameters');
      }
    }

    // TODO: Query Nostr as fallback (not implemented yet)
    console.log(`🔍 TODO: Query Nostr for league parameters: ${competitionId}`);
    // This will be implemented when NostrCompetitionService.getLeague is ready

    return null;
  }

  /**
   * Get participants for a league
   */
  async getLeagueParticipants(competitionId: string): Promise<LeagueParticipant[]> {
    // Check memory cache first
    const cachedLeague = this.activeLeagues.get(competitionId);
    if (cachedLeague) {
      return cachedLeague.participants;
    }

    // Check AsyncStorage cache
    const storageKey = this.getStorageKey(competitionId);
    const cachedData = await AsyncStorage.getItem(storageKey);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        const participantNpubs = parsed.participants || [];
        return participantNpubs.map((npub: string) => ({
          npub,
          name: this.formatNpub(npub),
          isActive: true,
        }));
      } catch (error) {
        console.warn('⚠️ Failed to parse cached participants');
      }
    }

    // Fallback to empty array
    console.log('📭 No participants found for competition');
    return [];
  }

  /**
   * Update league when new participant joins
   */
  async updateLeagueParticipants(
    competitionId: string,
    newParticipants: LeagueParticipant[]
  ): Promise<void> {
    const league = this.activeLeagues.get(competitionId);
    if (league) {
      league.participants = newParticipants;
      league.lastUpdated = new Date().toISOString();

      // Update AsyncStorage cache
      const storageKey = this.getStorageKey(competitionId);
      const cacheData = {
        competitionId,
        type: 'league',
        parameters: league.parameters,
        participants: newParticipants.map(p => p.npub),
        lastUpdated: league.lastUpdated,
      };
      await AsyncStorage.setItem(storageKey, JSON.stringify(cacheData));

      console.log(`👥 Updated league participants: ${newParticipants.length} members`);
    }
  }

  /**
   * Check if a league should be considered active
   */
  isLeagueCurrentlyActive(competitionId: string): boolean {
    const league = this.activeLeagues.get(competitionId);
    return league ? league.isActive : false;
  }

  // ================================================================================
  // PRIVATE HELPER METHODS
  // ================================================================================

  /**
   * Get team members as league participants
   */
  private async getTeamParticipants(teamId: string): Promise<LeagueParticipant[]> {
    try {
      const teamData = await this.nostrTeamService.getTeamById(teamId);
      if (!teamData) {
        console.warn(`⚠️ Team not found: ${teamId}`);
        return [];
      }

      // TODO: Get team member list (not implemented yet)
      console.log(`👥 TODO: Get team members for: ${teamId}`);
      
      // For now, return empty array - no members found
      // This will be implemented when NostrTeamService.getTeamMembers is ready
      return [];

    } catch (error) {
      console.error('❌ Failed to get team participants:', error);
      return [];
    }
  }

  /**
   * Check if league is currently active based on dates
   */
  private isLeagueActive(leagueData: LeagueCreationData): boolean {
    const now = new Date();
    const start = new Date(leagueData.startDate);
    const end = new Date(leagueData.endDate);
    
    return now >= start && now <= end;
  }

  /**
   * Check if Nostr league is currently active
   */
  private isNostrLeagueActive(league: NostrLeague): boolean {
    const now = new Date();
    const start = new Date(league.startDate);
    const end = new Date(league.endDate);
    
    return now >= start && now <= end;
  }

  /**
   * Get cached competition IDs for a team
   */
  private async getCachedCompetitionIds(teamId: string): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const competitionKeys = keys.filter(key => key.startsWith(this.STORAGE_PREFIX));
      const competitionIds: string[] = [];

      for (const key of competitionKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.teamId === teamId || parsed.parameters?.teamId === teamId) {
            competitionIds.push(key.replace(this.STORAGE_PREFIX, ''));
          }
        }
      }

      return competitionIds;
    } catch (error) {
      console.error('Failed to get cached competition IDs:', error);
      return [];
    }
  }

  /**
   * Convert Nostr league to ActiveLeague format
   */
  private async convertNostrLeagueToActive(nostrLeague: any, teamId?: string): Promise<ActiveLeague | null> {
    try {
      const actualTeamId = teamId || nostrLeague.teamId;
      const participants = await this.getTeamParticipants(actualTeamId);

      const parameters: LeagueParameters = {
        activityType: nostrLeague.activityType,
        competitionType: nostrLeague.competitionType,
        startDate: nostrLeague.startDate,
        endDate: nostrLeague.endDate,
        scoringFrequency: nostrLeague.scoringFrequency || 'total',
      };

      return {
        competitionId: nostrLeague.id,
        teamId: actualTeamId,
        name: nostrLeague.name,
        description: nostrLeague.description || '',
        parameters,
        participants,
        createdBy: nostrLeague.captainId || nostrLeague.captainPubkey,
        isActive: this.isNostrLeagueActive(nostrLeague),
        lastUpdated: new Date().toISOString(),
        prizePoolSats: nostrLeague.prizePoolSats,
      };

    } catch (error) {
      console.error('❌ Failed to convert Nostr league:', error);
      return null;
    }
  }

  /**
   * Extract parameters from Nostr league
   */
  private extractParametersFromNostrLeague(league: NostrLeague): LeagueParameters {
    return {
      activityType: league.activityType,
      competitionType: league.competitionType,
      startDate: league.startDate,
      endDate: league.endDate,
      scoringFrequency: league.scoringFrequency || 'total',
    };
  }

  /**
   * Format npub for display
   */
  private formatNpub(npub: string): string {
    return `${npub.slice(0, 8)}...${npub.slice(-4)}`;
  }

  /**
   * Clear all cached leagues
   */
  clearCache(): void {
    this.activeLeagues.clear();
    console.log('🧹 League data bridge cache cleared');
  }

  /**
   * Get all active leagues (for debugging)
   */
  getActiveLeagues(): ActiveLeague[] {
    return Array.from(this.activeLeagues.values()).filter(league => league.isActive);
  }
}

export default LeagueDataBridge.getInstance();