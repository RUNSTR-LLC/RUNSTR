/**
 * League Data Bridge Service - Connects wizard competition parameters to live rankings
 * Maps league creation wizard settings to ranking calculation parameters
 * Manages competition lifecycle and participant data integration
 */

import { NostrCompetitionService } from '../nostr/NostrCompetitionService';
import { NostrTeamService } from '../nostr/NostrTeamService';
import workoutDatabase from '../database/workoutDatabase';
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
  private database: any; // Will be lazily initialized
  private nostrCompetitionService = new NostrCompetitionService();
  private nostrTeamService = new NostrTeamService();
  private activeLeagues = new Map<string, ActiveLeague>();

  static getInstance(): LeagueDataBridge {
    if (!LeagueDataBridge.instance) {
      LeagueDataBridge.instance = new LeagueDataBridge();
    }
    return LeagueDataBridge.instance;
  }

  private initDatabase() {
    if (!this.database) {
      this.database = workoutDatabase;
    }
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
        createdBy: creationResult.creatorPubkey || '',
        isActive: this.isLeagueActive(leagueData),
        lastUpdated: new Date().toISOString(),
      };

      // Cache the active league
      this.activeLeagues.set(creationResult.competitionId, activeLeague);

      // Store competition parameters in database cache
      this.initDatabase(); // Ensure database is initialized
      await this.database.cacheCompetition({
        competitionId: creationResult.competitionId,
        type: 'league',
        parameters: JSON.stringify(parameters),
        participants: JSON.stringify(participants.map(p => p.npub)),
        lastUpdated: new Date().toISOString(),
      });

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

    // TODO: Query Nostr for team leagues (not implemented yet)
    try {
      console.log(`🔍 TODO: Query Nostr for team leagues: ${teamId}`);
      
      // For now, return null - no active leagues found
      // This will be implemented when NostrCompetitionService.getTeamLeagues is ready
      console.log('📭 No active league found for team (TODO: implement Nostr query)');
      return null;

    } catch (error) {
      console.error('❌ Failed to get active league:', error);
      return null;
    }
  }

  /**
   * Get league ranking parameters from competition ID
   */
  async getLeagueParameters(competitionId: string): Promise<LeagueParameters | null> {
    this.initDatabase(); // Ensure database is initialized
    // Check cache first
    const cachedLeague = this.activeLeagues.get(competitionId);
    if (cachedLeague) {
      return cachedLeague.parameters;
    }

    // Check database cache
    const cachedCompetition = await this.database.getCachedCompetition(competitionId);
    if (cachedCompetition) {
      try {
        return JSON.parse(cachedCompetition.parameters);
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
    this.initDatabase(); // Ensure database is initialized
    // Check cached league first
    const cachedLeague = this.activeLeagues.get(competitionId);
    if (cachedLeague) {
      return cachedLeague.participants;
    }

    // Check database cache
    const cachedCompetition = await this.database.getCachedCompetition(competitionId);
    if (cachedCompetition) {
      try {
        const participantNpubs = JSON.parse(cachedCompetition.participants);
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
    this.initDatabase(); // Ensure database is initialized
    const league = this.activeLeagues.get(competitionId);
    if (league) {
      league.participants = newParticipants;
      league.lastUpdated = new Date().toISOString();

      // Update database cache
      await this.database.cacheCompetition({
        competitionId,
        type: 'league',
        parameters: JSON.stringify(league.parameters),
        participants: JSON.stringify(newParticipants.map(p => p.npub)),
        lastUpdated: league.lastUpdated,
      });

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
   * Convert Nostr league to ActiveLeague format
   */
  private async convertNostrLeagueToActive(nostrLeague: NostrLeague): Promise<ActiveLeague | null> {
    try {
      const participants = await this.getTeamParticipants(nostrLeague.teamId);

      const parameters: LeagueParameters = {
        activityType: nostrLeague.activityType,
        competitionType: nostrLeague.competitionType,
        startDate: nostrLeague.startDate,
        endDate: nostrLeague.endDate,
        scoringFrequency: nostrLeague.scoringFrequency || 'total',
      };

      return {
        competitionId: nostrLeague.id,
        teamId: nostrLeague.teamId,
        name: nostrLeague.name,
        description: nostrLeague.description || '',
        parameters,
        participants,
        createdBy: nostrLeague.captainId,
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