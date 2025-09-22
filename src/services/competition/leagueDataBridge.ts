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
}

export class LeagueDataBridge {
  private static instance: LeagueDataBridge;
  private nostrCompetitionService = new NostrCompetitionService();
  private nostrTeamService = new NostrTeamService();
  private activeLeagues = new Map<string, ActiveLeague>();
  private STORAGE_PREFIX = '@runstr:competition:';

  static getInstance(): LeagueDataBridge {
    if (!LeagueDataBridge.instance) {
      LeagueDataBridge.instance = new LeagueDataBridge();
    }
    return LeagueDataBridge.instance;
  }

  private getStorageKey(competitionId: string): string {
    return `${this.STORAGE_PREFIX}${competitionId}`;
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
   */
  async getActiveLeagueForTeam(teamId: string): Promise<ActiveLeague | null> {
    console.log(`🔍 Getting active league for team: ${teamId.slice(0, 8)}...`);

    // Check cached active leagues first
    for (const league of this.activeLeagues.values()) {
      if (league.teamId === teamId && league.isActive) {
        console.log(`✅ Found cached active league: ${league.name}`);
        return league;
      }
    }

    // Query Nostr for team leagues
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
            this.activeLeagues.set(league.id, activeLeague);

            // Also cache in AsyncStorage for offline access
            const storageKey = this.getStorageKey(league.id);
            const cacheData = {
              competitionId: league.id,
              type: 'league',
              parameters: activeLeague.parameters,
              participants: activeLeague.participants.map(p => p.npub),
              lastUpdated: new Date().toISOString(),
            };
            await AsyncStorage.setItem(storageKey, JSON.stringify(cacheData));

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