/**
 * NostrCompetitionLeaderboardService - Real-time Competition Leaderboards
 * Fetches kind 1301 workout events and computes dynamic leaderboards for leagues, events, and challenges
 * Leverages existing NostrWorkoutService optimization and NostrTeamService caching
 */

import { NostrWorkoutService } from '../fitness/nostrWorkoutService';
import { NostrTeamService, getNostrTeamService } from '../nostr/NostrTeamService';
import type { NostrTeam } from '../nostr/NostrTeamService';
import type { Competition } from './competitionService';
import type { NostrWorkout } from '../../types/nostrWorkout';
import type { WorkoutType } from '../../types/workout';

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
  private nostrWorkoutService: NostrWorkoutService;
  private nostrTeamService: NostrTeamService;
  private cache: LeaderboardCache = {};
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.nostrWorkoutService = NostrWorkoutService.getInstance();
    this.nostrTeamService = getNostrTeamService();
  }

  static getInstance(): NostrCompetitionLeaderboardService {
    if (!NostrCompetitionLeaderboardService.instance) {
      NostrCompetitionLeaderboardService.instance = new NostrCompetitionLeaderboardService();
    }
    return NostrCompetitionLeaderboardService.instance;
  }

  /**
   * Get league leaderboard - all team members ranked by competition parameters
   */
  async computeLeagueLeaderboard(
    team: NostrTeam,
    competition: Competition,
    userId?: string
  ): Promise<CompetitionLeaderboard> {
    console.log(`🏆 Computing league leaderboard for: ${competition.name}`);

    // Check cache first
    const cached = this.getCachedLeaderboard(competition.id);
    if (cached) {
      console.log(`⚡ Using cached league leaderboard for: ${competition.name}`);
      return cached;
    }

    try {
      // Get team members (with caching)
      const memberIds = await this.getTeamMembersForCompetition(team);
      console.log(`👥 Found ${memberIds.length} team members for league`);

      if (memberIds.length === 0) {
        return this.createEmptyLeaderboard(competition, 'league', 'No team members found');
      }

      // Fetch workouts for all members within competition timeframe
      const participantWorkouts = await this.fetchMemberWorkouts(
        memberIds,
        competition,
        userId
      );

      // Compute rankings based on competition parameters
      const participants = this.rankParticipants(participantWorkouts, competition);

      const leaderboard: CompetitionLeaderboard = {
        competitionId: competition.id,
        type: 'league',
        participants,
        lastUpdated: Date.now(),
        totalWorkouts: participants.reduce((sum, p) => sum + (p.workoutCount || 0), 0),
        dateRange: {
          startTime: competition.startTime,
          endTime: competition.endTime,
        },
        scoringMethod: this.describeScoringMethod(competition),
      };

      // Cache the result
      this.cacheLeaderboard(competition.id, leaderboard, memberIds);

      console.log(`✅ League leaderboard computed: ${participants.length} participants`);
      return leaderboard;

    } catch (error) {
      console.error(`❌ Failed to compute league leaderboard:`, error);
      return this.createEmptyLeaderboard(competition, 'league', 'Failed to load leaderboard data');
    }
  }

  /**
   * Get event leaderboard - event participants ranked by competition parameters
   */
  async computeEventLeaderboard(
    competition: Competition,
    participantIds?: string[], // Optional: specific participants, defaults to all team members
    userId?: string
  ): Promise<CompetitionLeaderboard> {
    console.log(`🎯 Computing event leaderboard for: ${competition.name}`);

    // Check cache first
    const cached = this.getCachedLeaderboard(competition.id);
    if (cached) {
      console.log(`⚡ Using cached event leaderboard for: ${competition.name}`);
      return cached;
    }

    try {
      let memberIds = participantIds;

      // If no specific participants, get team members
      if (!memberIds) {
        // Need team data to get members - try to get from cached teams
        const cachedTeams = this.nostrTeamService.getCachedTeams();
        const team = cachedTeams.find(t => t.id === competition.teamId);
        
        if (team) {
          memberIds = await this.getTeamMembersForCompetition(team);
        } else {
          console.warn(`⚠️ Team not found in cache for competition: ${competition.teamId}`);
          memberIds = [];
        }
      }

      console.log(`👥 Found ${memberIds.length} event participants`);

      if (memberIds.length === 0) {
        return this.createEmptyLeaderboard(competition, 'event', 'No participants found');
      }

      // Fetch workouts for participants within event timeframe
      const participantWorkouts = await this.fetchMemberWorkouts(
        memberIds,
        competition,
        userId
      );

      // Compute rankings based on event parameters
      const participants = this.rankParticipants(participantWorkouts, competition);

      const leaderboard: CompetitionLeaderboard = {
        competitionId: competition.id,
        type: 'event',
        participants,
        lastUpdated: Date.now(),
        totalWorkouts: participants.reduce((sum, p) => sum + (p.workoutCount || 0), 0),
        dateRange: {
          startTime: competition.startTime,
          endTime: competition.endTime,
        },
        scoringMethod: this.describeScoringMethod(competition),
      };

      // Cache the result
      this.cacheLeaderboard(competition.id, leaderboard, memberIds);

      console.log(`✅ Event leaderboard computed: ${participants.length} participants`);
      return leaderboard;

    } catch (error) {
      console.error(`❌ Failed to compute event leaderboard:`, error);
      return this.createEmptyLeaderboard(competition, 'event', 'Failed to load leaderboard data');
    }
  }

  /**
   * Get challenge leaderboard - head-to-head comparison between 2 participants
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
    console.log(`⚔️ Computing challenge leaderboard: ${participant1} vs ${participant2}`);

    // Check cache first
    const cached = this.getCachedLeaderboard(challengeId);
    if (cached) {
      console.log(`⚡ Using cached challenge leaderboard for: ${challengeId}`);
      return cached;
    }

    try {
      // Create mock competition object for challenge
      const mockCompetition: Competition = {
        id: challengeId,
        name: 'Challenge',
        description: 'Head-to-head challenge',
        type: 'event', // Treat challenge like a short event
        teamId: '', // Not applicable for challenges
        captainPubkey: '',
        startTime: challengeParams.startTime,
        endTime: challengeParams.endTime,
        activityType: challengeParams.activityType,
        competitionType: 'Challenge',
        goalType: challengeParams.goalType,
        goalValue: challengeParams.goalValue,
        goalUnit: challengeParams.goalUnit,
        entryFeesSats: 0,
        maxParticipants: 2,
        requireApproval: false,
        createdAt: challengeParams.startTime,
        isActive: Date.now() / 1000 < challengeParams.endTime,
        participantCount: 2,
        nostrEvent: {} as any, // Mock event
      };

      // Fetch workouts for both participants
      const participantWorkouts = await this.fetchMemberWorkouts(
        [participant1, participant2],
        mockCompetition,
        userId
      );

      // Compute head-to-head rankings
      const participants = this.rankParticipants(participantWorkouts, mockCompetition);

      const leaderboard: CompetitionLeaderboard = {
        competitionId: challengeId,
        type: 'challenge',
        participants,
        lastUpdated: Date.now(),
        totalWorkouts: participants.reduce((sum, p) => sum + (p.workoutCount || 0), 0),
        dateRange: {
          startTime: challengeParams.startTime,
          endTime: challengeParams.endTime,
        },
        scoringMethod: this.describeScoringMethod(mockCompetition),
      };

      // Cache the result
      this.cacheLeaderboard(challengeId, leaderboard, [participant1, participant2]);

      console.log(`✅ Challenge leaderboard computed: ${participants.length} participants`);
      return leaderboard;

    } catch (error) {
      console.error(`❌ Failed to compute challenge leaderboard:`, error);
      return this.createEmptyLeaderboard(
        { id: challengeId } as Competition, 
        'challenge', 
        'Failed to load challenge data'
      );
    }
  }

  /**
   * Get team members for competition with caching
   */
  private async getTeamMembersForCompetition(team: NostrTeam): Promise<string[]> {
    try {
      const memberIds = await this.nostrTeamService.getTeamMembers(team);
      console.log(`📋 Retrieved ${memberIds.length} team members from NostrTeamService`);
      return memberIds;
    } catch (error) {
      console.error(`❌ Failed to get team members:`, error);
      return [];
    }
  }

  /**
   * Fetch workouts for multiple members within competition timeframe
   */
  private async fetchMemberWorkouts(
    memberIds: string[],
    competition: Competition,
    currentUserId?: string
  ): Promise<Map<string, { workouts: NostrWorkout[]; memberName?: string }>> {
    const participantWorkouts = new Map<string, { workouts: NostrWorkout[]; memberName?: string }>();
    
    console.log(`🔍 Fetching workouts for ${memberIds.length} members...`);

    const startDate = new Date(competition.startTime * 1000);
    const endDate = new Date(competition.endTime * 1000);

    // Fetch workouts for each member in parallel
    const fetchPromises = memberIds.map(async (pubkey) => {
      try {
        // Use the same user ID format as existing services
        const userId = currentUserId || pubkey;
        
        const result = await this.nostrWorkoutService.fetchUserWorkouts(pubkey, {
          since: startDate,
          until: endDate,
          limit: 100,
          userId,
          preserveRawEvents: false,
        });

        // Filter workouts by activity type if specified
        let workouts: NostrWorkout[] = [];
        
        if (result.status === 'completed' || result.status === 'partial_error') {
          workouts = await this.nostrWorkoutService.getFilteredWorkouts(userId, {
            startDate,
            endDate,
            activityTypes: this.mapActivityType(competition.activityType),
            limit: 100,
          });
        }

        participantWorkouts.set(pubkey, { 
          workouts,
          memberName: `Member ${memberIds.indexOf(pubkey) + 1}`, // Simple naming for now
        });

        console.log(`📊 Found ${workouts.length} workouts for member ${pubkey.substring(0, 8)}...`);

      } catch (error) {
        console.error(`❌ Failed to fetch workouts for ${pubkey}:`, error);
        participantWorkouts.set(pubkey, { workouts: [] });
      }
    });

    await Promise.all(fetchPromises);

    const totalWorkouts = Array.from(participantWorkouts.values()).reduce(
      (sum, data) => sum + data.workouts.length, 0
    );
    console.log(`✅ Fetched ${totalWorkouts} total workouts across all members`);

    return participantWorkouts;
  }

  /**
   * Map competition activity type to workout types
   */
  private mapActivityType(activityType: string): WorkoutType[] {
    const type = activityType.toLowerCase();
    
    if (type.includes('run')) return ['running'];
    if (type.includes('walk')) return ['walking'];
    if (type.includes('cycl') || type.includes('bike')) return ['cycling'];
    if (type.includes('hik')) return ['hiking'];
    if (type.includes('yoga')) return ['yoga'];
    if (type.includes('strength') || type.includes('weight')) return ['strength_training'];
    if (type.includes('gym')) return ['gym'];
    
    // Default to all types for general fitness competitions
    return ['running', 'walking', 'cycling', 'hiking', 'yoga', 'strength_training', 'gym', 'other'];
  }

  /**
   * Rank participants based on competition parameters
   */
  private rankParticipants(
    participantWorkouts: Map<string, { workouts: NostrWorkout[]; memberName?: string }>,
    competition: Competition
  ): CompetitionParticipant[] {
    const participants: CompetitionParticipant[] = [];

    participantWorkouts.forEach(({ workouts, memberName }, pubkey) => {
      const participant = this.calculateParticipantScore(pubkey, workouts, competition, memberName);
      participants.push(participant);
    });

    // Sort by score (descending - higher is better)
    participants.sort((a, b) => b.score - a.score);

    // Assign positions
    participants.forEach((participant, index) => {
      participant.position = index + 1;
    });

    return participants;
  }

  /**
   * Calculate individual participant score based on competition type
   */
  private calculateParticipantScore(
    pubkey: string,
    workouts: NostrWorkout[],
    competition: Competition,
    memberName?: string
  ): CompetitionParticipant {
    let score = 0;
    let totalDistance = 0;
    let totalDuration = 0;
    let totalCalories = 0;
    const paces: number[] = [];

    // Aggregate workout data
    workouts.forEach(workout => {
      if (workout.distance) totalDistance += workout.distance;
      if (workout.duration) totalDuration += workout.duration;
      if (workout.calories) totalCalories += workout.calories;
      
      // Calculate pace for running/walking workouts (min/km)
      if (workout.distance && workout.duration && workout.distance > 0) {
        const paceSecondsPerKm = workout.duration / (workout.distance / 1000);
        const paceMinPerKm = paceSecondsPerKm / 60;
        if (paceMinPerKm > 0 && paceMinPerKm < 30) { // Sanity check
          paces.push(paceMinPerKm);
        }
      }
    });

    // Calculate score based on goal type
    switch (competition.goalType) {
      case 'distance':
        score = totalDistance; // Total distance in meters
        break;
      
      case 'speed':
        if (paces.length > 0) {
          const averagePace = paces.reduce((sum, pace) => sum + pace, 0) / paces.length;
          score = 1000 / averagePace; // Inverse of pace (faster = higher score)
        }
        break;
      
      case 'duration':
        score = totalDuration; // Total active time in seconds
        break;
      
      case 'consistency':
        score = workouts.length; // Number of workouts
        break;
      
      default:
        score = totalDistance; // Default to distance
    }

    const averagePace = paces.length > 0 ? paces.reduce((sum, pace) => sum + pace, 0) / paces.length : 0;
    const bestPace = paces.length > 0 ? Math.min(...paces) : 0;
    const lastActivity = workouts.length > 0 ? 
      Math.max(...workouts.map(w => new Date(w.startTime).getTime())) : 0;

    return {
      pubkey,
      name: memberName || `Member ${pubkey.substring(0, 8)}`,
      score: Math.round(score * 100) / 100, // Round to 2 decimal places
      totalDistance: Math.round(totalDistance),
      totalDuration: Math.round(totalDuration),
      workoutCount: workouts.length,
      averagePace: averagePace > 0 ? Math.round(averagePace * 100) / 100 : undefined,
      bestPace: bestPace > 0 ? Math.round(bestPace * 100) / 100 : undefined,
      totalCalories: Math.round(totalCalories),
      lastActivity: lastActivity || undefined,
      workoutDetails: workouts, // Include for detailed views
    };
  }

  /**
   * Create a description of how scores were calculated
   */
  private describeScoringMethod(competition: Competition): string {
    switch (competition.goalType) {
      case 'distance':
        return `Ranked by total distance (${competition.activityType})`;
      case 'speed':
        return `Ranked by average pace (${competition.activityType})`;
      case 'duration':
        return `Ranked by total active time (${competition.activityType})`;
      case 'consistency':
        return `Ranked by number of workouts (${competition.activityType})`;
      default:
        return `Ranked by performance (${competition.activityType})`;
    }
  }

  /**
   * Create empty leaderboard for error cases
   */
  private createEmptyLeaderboard(
    competition: Partial<Competition>,
    type: 'league' | 'event' | 'challenge',
    reason: string
  ): CompetitionLeaderboard {
    console.log(`📋 Creating empty leaderboard: ${reason}`);
    
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
   * Get cached leaderboard if still fresh
   */
  private getCachedLeaderboard(competitionId: string): CompetitionLeaderboard | null {
    const cached = this.cache[competitionId];
    if (!cached) return null;

    const isStale = Date.now() - cached.cachedAt > this.CACHE_DURATION;
    if (isStale) {
      delete this.cache[competitionId];
      return null;
    }

    return cached.leaderboard;
  }

  /**
   * Cache leaderboard for performance
   */
  private cacheLeaderboard(
    competitionId: string,
    leaderboard: CompetitionLeaderboard,
    memberList?: string[]
  ): void {
    this.cache[competitionId] = {
      leaderboard,
      cachedAt: Date.now(),
      memberList,
    };
  }

  /**
   * Clear cache for specific competition
   */
  clearCompetitionCache(competitionId: string): void {
    delete this.cache[competitionId];
    console.log(`🗑️ Cleared cache for competition: ${competitionId}`);
  }

  /**
   * Clear all cached leaderboards
   */
  clearAllCache(): void {
    this.cache = {};
    console.log(`🗑️ Cleared all leaderboard cache`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { cachedCompetitions: number; oldestCache: number | null; newestCache: number | null } {
    const competitions = Object.keys(this.cache);
    const times = competitions.map(id => this.cache[id].cachedAt);
    
    return {
      cachedCompetitions: competitions.length,
      oldestCache: times.length > 0 ? Math.min(...times) : null,
      newestCache: times.length > 0 ? Math.max(...times) : null,
    };
  }
}

export default NostrCompetitionLeaderboardService.getInstance();