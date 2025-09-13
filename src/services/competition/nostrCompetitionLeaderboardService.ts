/**
 * NostrCompetitionLeaderboardService - Simplified Competition Leaderboards
 * Delegates to SimpleCompetitionEngine for pure Nostr data pipeline
 * Maintains existing interface while removing complex hybrid system coordination
 */

import { SimpleCompetitionEngine, type SimpleLeaderboard, type SimpleParticipant } from './SimpleCompetitionEngine';
import { NostrCompetitionService } from '../nostr/NostrCompetitionService';
import type { NostrTeam } from '../nostr/NostrTeamService';
import type { Competition } from './competitionService';
import type { NostrLeagueDefinition, NostrEventDefinition } from '../../types/nostrCompetition';

export interface CompetitionParticipant {
  pubkey: string;
  name?: string;
  position?: number;
  score: number;
  totalDistance?: number; // meters
  totalDuration?: number; // seconds
  workoutCount?: number;
  averagePace?: number; // min/km
  bestPace?: number; // min/km
  totalCalories?: number;
  lastActivity?: number; // timestamp
  workoutDetails?: NostrWorkout[]; // For detailed views
}

export interface CompetitionLeaderboard {
  competitionId: string;
  type: 'league' | 'event' | 'challenge';
  participants: CompetitionParticipant[];
  lastUpdated: number;
  totalWorkouts: number;
  dateRange: {
    startTime: number;
    endTime: number;
  };
  scoringMethod: string; // Description of how scores were calculated
}

export interface LeaderboardCache {
  [competitionId: string]: {
    leaderboard: CompetitionLeaderboard;
    cachedAt: number;
    memberList?: string[]; // Cached team members for this competition
  };
}

export class NostrCompetitionLeaderboardService {
  private static instance: NostrCompetitionLeaderboardService;
  private simpleEngine: SimpleCompetitionEngine;
  private nostrCompetitionService: NostrCompetitionService;

  constructor() {
    this.simpleEngine = SimpleCompetitionEngine.getInstance();
    this.nostrCompetitionService = NostrCompetitionService.getInstance();
  }

  static getInstance(): NostrCompetitionLeaderboardService {
    if (!NostrCompetitionLeaderboardService.instance) {
      NostrCompetitionLeaderboardService.instance = new NostrCompetitionLeaderboardService();
    }
    return NostrCompetitionLeaderboardService.instance;
  }

  /**
   * Get league leaderboard - SIMPLIFIED: Delegates to SimpleCompetitionEngine
   */
  async computeLeagueLeaderboard(
    team: NostrTeam,
    competition: Competition,
    userId?: string
  ): Promise<CompetitionLeaderboard> {
    console.log(`🏆 SIMPLIFIED: Computing league leaderboard for: ${competition.name}`);

    try {
      // Convert Competition to NostrLeagueDefinition format for SimpleCompetitionEngine
      const leagueDefinition: NostrLeagueDefinition = await this.convertToNostrLeague(competition);
      
      // Delegate to SimpleCompetitionEngine
      const simpleLeaderboard = await this.simpleEngine.getCompetitionLeaderboard(leagueDefinition, team.id);
      
      // Convert SimpleLeaderboard back to CompetitionLeaderboard format (for UI compatibility)
      return this.convertToCompetitionLeaderboard(simpleLeaderboard, 'league');

    } catch (error) {
      console.error(`❌ SIMPLIFIED: Failed to compute league leaderboard:`, error);
      return this.createEmptyLeaderboard(competition, 'league', 'Failed to load leaderboard data');
    }
  }

  /**
   * Get event leaderboard - SIMPLIFIED: Delegates to SimpleCompetitionEngine
   */
  async computeEventLeaderboard(
    competition: Competition,
    participantIds?: string[], // Optional: specific participants, defaults to all team members
    userId?: string
  ): Promise<CompetitionLeaderboard> {
    console.log(`🎯 SIMPLIFIED: Computing event leaderboard for: ${competition.name}`);

    try {
      // Convert Competition to NostrEventDefinition format for SimpleCompetitionEngine
      const eventDefinition: NostrEventDefinition = await this.convertToNostrEvent(competition);
      
      // Delegate to SimpleCompetitionEngine
      const simpleLeaderboard = await this.simpleEngine.getCompetitionLeaderboard(eventDefinition, competition.teamId);
      
      // Convert SimpleLeaderboard back to CompetitionLeaderboard format (for UI compatibility)
      return this.convertToCompetitionLeaderboard(simpleLeaderboard, 'event');

    } catch (error) {
      console.error(`❌ SIMPLIFIED: Failed to compute event leaderboard:`, error);
      return this.createEmptyLeaderboard(competition, 'event', 'Failed to load leaderboard data');
    }
  }

  /**
   * Get challenge leaderboard - SIMPLIFIED: Keep basic challenge support
   */
  async computeChallengeLeaderboard(
    challengeId: string,
    participant1: string,
    participant2: string,
    challengeParams: {
      activityType: string;
      goalType: 'distance' | 'speed' | 'duration' | 'consistency';
      startTime: number;
      endTime: number;
      goalValue?: number;
      goalUnit?: string;
    },
    userId?: string
  ): Promise<CompetitionLeaderboard> {
    console.log(`⚔️ SIMPLIFIED: Challenge leaderboard not supported - use SimpleCompetitionEngine directly`);
    
    // Return empty leaderboard - challenges are not part of the simplified system
    return this.createEmptyLeaderboard(
      { id: challengeId } as Competition,
      'challenge',
      'Challenge leaderboards not supported in simplified system'
    );
  }

  /**
   * Convert Competition to NostrLeagueDefinition for SimpleCompetitionEngine
   */
  private async convertToNostrLeague(competition: Competition): Promise<NostrLeagueDefinition> {
    return {
      id: competition.id,
      name: competition.name,
      description: competition.description || '',
      teamId: competition.teamId,
      captainPubkey: competition.captainPubkey,
      activityType: competition.activityType,
      competitionType: competition.competitionType,
      startDate: new Date(competition.startTime * 1000).toISOString(),
      endDate: new Date(competition.endTime * 1000).toISOString(),
      duration: Math.floor((competition.endTime - competition.startTime) / (24 * 60 * 60)), // days
      entryFeesSats: competition.entryFeesSats,
      maxParticipants: competition.maxParticipants,
      requireApproval: competition.requireApproval,
      allowLateJoining: false,
      scoringFrequency: 'realtime',
      createdAt: competition.createdAt,
      updatedAt: competition.createdAt,
      status: 'active'
    };
  }

  /**
   * Convert Competition to NostrEventDefinition for SimpleCompetitionEngine
   */
  private async convertToNostrEvent(competition: Competition): Promise<NostrEventDefinition> {
    return {
      id: competition.id,
      name: competition.name,
      description: competition.description || '',
      teamId: competition.teamId,
      captainPubkey: competition.captainPubkey,
      activityType: competition.activityType,
      competitionType: competition.competitionType,
      eventDate: new Date(competition.startTime * 1000).toISOString(),
      targetValue: competition.goalValue,
      targetUnit: competition.goalUnit,
      entryFeesSats: competition.entryFeesSats,
      maxParticipants: competition.maxParticipants,
      requireApproval: competition.requireApproval,
      createdAt: competition.createdAt,
      updatedAt: competition.createdAt,
      status: 'active'
    };
  }

  /**
   * Convert SimpleLeaderboard back to CompetitionLeaderboard for UI compatibility
   */
  private convertToCompetitionLeaderboard(
    simpleLeaderboard: SimpleLeaderboard,
    type: 'league' | 'event' | 'challenge'
  ): CompetitionLeaderboard {
    const participants: CompetitionParticipant[] = simpleLeaderboard.participants.map(simple => ({
      pubkey: simple.pubkey,
      name: simple.name,
      position: simple.position,
      score: simple.score,
      totalDistance: simple.totalDistance,
      totalDuration: simple.totalDuration,
      workoutCount: simple.workoutCount,
      averagePace: simple.averagePace,
      bestPace: simple.bestPace,
      totalCalories: simple.totalCalories,
      lastActivity: simple.lastActivity,
      workoutDetails: [] // SimpleCompetitionEngine doesn't include detailed workouts for performance
    }));

    return {
      competitionId: simpleLeaderboard.competitionId,
      type,
      participants,
      lastUpdated: simpleLeaderboard.lastUpdated,
      totalWorkouts: simpleLeaderboard.totalWorkouts,
      dateRange: simpleLeaderboard.dateRange,
      scoringMethod: simpleLeaderboard.scoringMethod
    };
  }

  /**
   * Create empty leaderboard for error cases
   */
  private createEmptyLeaderboard(
    competition: Partial<Competition>,
    type: 'league' | 'event' | 'challenge',
    reason: string
  ): CompetitionLeaderboard {
    console.log(`📋 SIMPLIFIED: Creating empty leaderboard: ${reason}`);
    
    return {
      competitionId: competition.id || 'unknown',
      type,
      participants: [],
      lastUpdated: Date.now(),
      totalWorkouts: 0,
      dateRange: {
        startTime: competition.startTime || Date.now() / 1000,
        endTime: competition.endTime || Date.now() / 1000,
      },
      scoringMethod: `No data: ${reason}`,
    };
  }

  /**
   * SIMPLIFIED: Clear cache - delegates to SimpleCompetitionEngine
   */
  clearCompetitionCache(competitionId: string): void {
    this.simpleEngine.clearCache();
    console.log(`🗑️ SIMPLIFIED: Cleared cache for competition: ${competitionId}`);
  }

  /**
   * SIMPLIFIED: Clear all cached leaderboards - delegates to SimpleCompetitionEngine
   */
  clearAllCache(): void {
    this.simpleEngine.clearCache();
    console.log(`🗑️ SIMPLIFIED: Cleared all leaderboard cache`);
  }

  /**
   * SIMPLIFIED: Get cache statistics - simplified version
   */
  getCacheStats(): { cachedCompetitions: number; oldestCache: number | null; newestCache: number | null } {
    // SimpleCompetitionEngine manages its own cache, so return simplified stats
    return {
      cachedCompetitions: 0,
      oldestCache: null,
      newestCache: null,
    };
  }
}

export default NostrCompetitionLeaderboardService.getInstance();