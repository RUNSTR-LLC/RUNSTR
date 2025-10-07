/**
 * LeaderboardService - Fast Competition Scoring via Team Lists
 * Calculates leaderboards by querying 1301 workout events from team member lists
 * Provides real-time competition scoring for events and leagues
 */

import type { Event } from 'nostr-tools';
import { GlobalNDKService } from '../nostr/GlobalNDKService';
import type { NDKFilter, NDKEvent, NDKSubscription } from '@nostr-dev-kit/ndk';
import { NostrTeamService } from '../nostr/NostrTeamService';
import type { NostrTeam } from '../nostr/NostrTeamService';
import type { NostrCompetition } from '../integrations/NostrCompetitionContextService';
import type { CompetitionGoalType } from '../../types/nostrCompetition';

// Updated interfaces for Nostr compatibility
export interface CompetitionParticipant {
  pubkey: string;
  totalDistance: number; // meters
  totalDuration: number; // seconds
  workoutCount: number;
  averagePace: number; // seconds per km
  lastActivity: number; // Unix timestamp
}

export interface CompetitionLeaderboard {
  competitionId: string;
  participants: LeaderboardEntry[];
  lastUpdated: number; // Unix timestamp
  totalWorkouts: number;
}

export interface WorkoutEvent {
  id: string;
  pubkey: string;
  created_at: number;
  tags: string[][];
  content: string;
}

export interface WorkoutData {
  distance?: number; // in meters
  duration?: number; // in seconds
  calories?: number;
  pace?: number; // seconds per km
  activityType?: string;
  heartRate?: number;
}

export interface LeaderboardEntry extends CompetitionParticipant {
  position: number;
  score: number; // Calculated based on competition goal type
}

export interface CompetitionStats {
  totalWorkouts: number;
  totalDistance: number; // meters
  totalDuration: number; // seconds
  averagePace: number; // seconds per km
  uniqueParticipants: number;
  timeRange: {
    start: number;
    end: number;
    current: number;
  };
}

export class LeaderboardService {
  private teamService: NostrTeamService;
  private cachedLeaderboards: Map<string, CompetitionLeaderboard> = new Map();
  private static instance: LeaderboardService;

  constructor() {
    this.teamService = new NostrTeamService();
  }

  static getInstance(): LeaderboardService {
    if (!LeaderboardService.instance) {
      LeaderboardService.instance = new LeaderboardService();
    }
    return LeaderboardService.instance;
  }

  // ================================================================================
  // LEADERBOARD CALCULATION
  // ================================================================================

  /**
   * Calculate competition leaderboard from team member workouts
   */
  async calculateLeaderboard(
    competition: NostrCompetition,
    team: NostrTeam
  ): Promise<CompetitionLeaderboard> {
    console.log(
      `📊 Calculating leaderboard for ${competition.type}: ${competition.name}`
    );

    try {
      // Get team members (fast list query)
      const teamMembers = await this.teamService.getTeamMembers(team);
      console.log(
        `👥 Found ${teamMembers.length} team members for competition`
      );

      if (teamMembers.length === 0) {
        return this.createEmptyLeaderboard(competition.id);
      }

      // Determine competition time range
      let startTime: number, endTime: number;
      
      if (competition.type === 'league') {
        startTime = Math.floor(new Date(competition.startDate!).getTime() / 1000);
        endTime = Math.floor(new Date(competition.endDate!).getTime() / 1000);
      } else {
        // Event - use the event date as a full day
        const eventDate = new Date(competition.eventDate!);
        const startOfDay = new Date(eventDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(eventDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        startTime = Math.floor(startOfDay.getTime() / 1000);
        endTime = Math.floor(endOfDay.getTime() / 1000);
      }

      // Query workout events from team members during competition timeframe
      const workoutEvents = await this.queryMemberWorkouts(
        teamMembers,
        startTime,
        endTime,
        competition.id
      );

      console.log(
        `🏃‍♂️ Found ${workoutEvents.length} workout events during competition`
      );

      // Group workouts by participant
      const participantWorkouts =
        this.groupWorkoutsByParticipant(workoutEvents);

      // Calculate participant stats and scores
      const participants: LeaderboardEntry[] = [];

      for (const [pubkey, workouts] of participantWorkouts.entries()) {
        const participantStats = this.calculateParticipantStats(
          workouts,
          competition.goalType
        );
        const score = this.calculateScore(participantStats, competition);

        participants.push({
          pubkey,
          position: 0, // Will be set after sorting
          score,
          totalDistance: Math.round(participantStats.totalDistance),
          totalDuration: Math.round(participantStats.totalDuration),
          workoutCount: participantStats.workoutCount,
          averagePace: Math.round(participantStats.averagePace),
          lastActivity: participantStats.lastActivity,
        });
      }

      // Add missing team members with zero scores
      for (const memberPubkey of teamMembers) {
        if (!participantWorkouts.has(memberPubkey)) {
          participants.push({
            pubkey: memberPubkey,
            position: 0,
            score: 0,
            totalDistance: 0,
            totalDuration: 0,
            workoutCount: 0,
            averagePace: 0,
            lastActivity: 0,
          });
        }
      }

      // Sort by score (higher is better) and assign positions
      participants.sort((a, b) => b.score - a.score);
      participants.forEach((participant, index) => {
        participant.position = index + 1;
      });

      const leaderboard: CompetitionLeaderboard = {
        competitionId: competition.id,
        participants,
        lastUpdated: Math.floor(Date.now() / 1000),
        totalWorkouts: workoutEvents.length,
      };

      // Cache the result
      this.cachedLeaderboards.set(competition.id, leaderboard);

      console.log(
        `✅ Calculated leaderboard with ${participants.length} participants`
      );
      return leaderboard;
    } catch (error) {
      console.error(
        `❌ Failed to calculate leaderboard for ${competition.name}:`,
        error
      );
      return this.createEmptyLeaderboard(competition.id);
    }
  }

  /**
   * Get cached leaderboard or calculate if not cached
   */
  async getLeaderboard(
    competition: NostrCompetition,
    team: NostrTeam,
    forceRefresh = false
  ): Promise<CompetitionLeaderboard> {
    if (!forceRefresh && this.cachedLeaderboards.has(competition.id)) {
      const cached = this.cachedLeaderboards.get(competition.id)!;
      // Return cached if less than 5 minutes old
      const age = Math.floor(Date.now() / 1000) - cached.lastUpdated;
      if (age < 300) {
        console.log(`💾 Returning cached leaderboard (${age}s old)`);
        return cached;
      }
    }

    return await this.calculateLeaderboard(competition, team);
  }

  /**
   * Subscribe to real-time leaderboard updates
   */
  async subscribeToLeaderboardUpdates(
    competition: NostrCompetition,
    team: NostrTeam,
    callback: (leaderboard: CompetitionLeaderboard) => void
  ): Promise<NDKSubscription> {
    console.log(
      `🔔 Subscribing to leaderboard updates for: ${competition.name}`
    );

    // Get team members for targeted subscription
    const teamMembers = await this.teamService.getTeamMembers(team);

    // Determine competition time range for subscription
    let startTime: number, endTime: number;
    
    if (competition.type === 'league') {
      startTime = Math.floor(new Date(competition.startDate!).getTime() / 1000);
      endTime = Math.floor(new Date(competition.endDate!).getTime() / 1000);
    } else {
      // Event - use the event date as a full day
      const eventDate = new Date(competition.eventDate!);
      const startOfDay = new Date(eventDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(eventDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      startTime = Math.floor(startOfDay.getTime() / 1000);
      endTime = Math.floor(endOfDay.getTime() / 1000);
    }

    // Get GlobalNDK instance
    const ndk = await GlobalNDKService.getInstance();

    const ndkFilter: NDKFilter = {
      kinds: [1301 as any], // Custom kind
      authors: teamMembers,
      since: startTime,
      until: endTime,
    };

    const subscription = ndk.subscribe(ndkFilter, { closeOnEose: false });

    subscription.on('event', async (event: NDKEvent) => {
      console.log(`🔄 New workout event for leaderboard: ${event.id}`);

      // Recalculate leaderboard when new workout is received
      try {
        const updatedLeaderboard = await this.calculateLeaderboard(
          competition,
          team
        );
        callback(updatedLeaderboard);
        console.log(`✅ Leaderboard updated for ${competition.name}`);
      } catch (error) {
        console.warn('Failed to update leaderboard:', error);
      }
    });

    return subscription;
  }

  // ================================================================================
  // WORKOUT QUERYING
  // ================================================================================

  /**
   * Query 1301 workout events from specific team members during timeframe
   */
  private async queryMemberWorkouts(
    memberPubkeys: string[],
    startTime: number,
    endTime: number,
    competitionId: string
  ): Promise<WorkoutEvent[]> {
    console.log(`🔍 Querying workouts from ${memberPubkeys.length} members`);

    // Split large member lists into batches for better performance
    const batchSize = Math.min(50, memberPubkeys.length);  // Larger batches for better performance
    const batches = [];
    for (let i = 0; i < memberPubkeys.length; i += batchSize) {
      batches.push(memberPubkeys.slice(i, i + batchSize));
    }

    const allWorkouts: WorkoutEvent[] = [];
    const processedIds = new Set<string>();

    // Get GlobalNDK instance
    const ndk = await GlobalNDKService.getInstance();

    for (const batch of batches) {
      const filter: NDKFilter = {
        kinds: [1301 as any], // Custom kind
        authors: batch,
        since: startTime,
        until: endTime,
        limit: 100,
      };

      const subscription = ndk.subscribe(filter, { closeOnEose: false });

      subscription.on('event', (event: NDKEvent) => {
        const eventId = event.id || '';
        if (processedIds.has(eventId)) return;
        processedIds.add(eventId);

        // Convert NDKEvent to Event format
        const workoutEvent: WorkoutEvent = {
          id: eventId,
          pubkey: event.pubkey || '',
          created_at: event.created_at || Math.floor(Date.now() / 1000),
          tags: event.tags || [],
          content: event.content || '',
        };

        // Check if workout is tagged for this competition (optional)
        const isForCompetition = this.isWorkoutForCompetition(
          workoutEvent,
          competitionId
        );

        allWorkouts.push(workoutEvent);
      });

      // Wait for batch results
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Clean up subscription
      subscription.stop();
    }

    console.log(
      `✅ Queried ${allWorkouts.length} workout events from team members`
    );
    return allWorkouts;
  }

  // ================================================================================
  // WORKOUT DATA PROCESSING
  // ================================================================================

  /**
   * Parse workout data from 1301 event tags
   */
  private parseWorkoutData(workoutEvent: WorkoutEvent): WorkoutData {
    const tags = new Map(
      workoutEvent.tags.map((tag) => [tag[0], tag.slice(1)])
    );

    const distance = this.parseDistance(tags.get('distance'));
    const duration = this.parseDuration(tags.get('duration'));
    const calories = tags.get('calories')?.[0]
      ? parseFloat(tags.get('calories')![0])
      : undefined;
    const activityType = tags.get('activity_type')?.[0] || 'workout';
    const heartRate = tags.get('heart_rate')?.[0]
      ? parseFloat(tags.get('heart_rate')![0])
      : undefined;

    // Calculate pace if distance and duration available
    let pace: number | undefined;
    if (distance && duration && distance > 0) {
      const km = distance / 1000;
      pace = duration / km; // seconds per km
    }

    return {
      distance,
      duration,
      calories,
      pace,
      activityType,
      heartRate,
    };
  }

  /**
   * Parse distance from tag (handle different units)
   */
  private parseDistance(distanceTag?: string[]): number | undefined {
    if (!distanceTag || !distanceTag[0]) return undefined;

    const value = parseFloat(distanceTag[0]);
    const unit = distanceTag[1] || 'km';

    // Convert to meters
    switch (unit.toLowerCase()) {
      case 'm':
      case 'meters':
        return value;
      case 'km':
      case 'kilometers':
        return value * 1000;
      case 'mi':
      case 'miles':
        return value * 1609.344;
      default:
        return value * 1000; // Assume km if unknown
    }
  }

  /**
   * Parse duration from tag (handle HH:MM:SS or seconds)
   */
  private parseDuration(durationTag?: string[]): number | undefined {
    if (!durationTag || !durationTag[0]) return undefined;

    const value = durationTag[0];

    // If contains colons, parse as HH:MM:SS
    if (value.includes(':')) {
      const parts = value.split(':').map((p) => parseInt(p));
      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
      } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1]; // MM:SS
      }
    }

    // Otherwise parse as seconds
    return parseFloat(value);
  }

  /**
   * Group workouts by participant pubkey
   */
  private groupWorkoutsByParticipant(
    workouts: WorkoutEvent[]
  ): Map<string, WorkoutEvent[]> {
    const grouped = new Map<string, WorkoutEvent[]>();

    for (const workout of workouts) {
      if (!grouped.has(workout.pubkey)) {
        grouped.set(workout.pubkey, []);
      }
      grouped.get(workout.pubkey)!.push(workout);
    }

    return grouped;
  }

  /**
   * Calculate participant statistics from their workouts
   */
  private calculateParticipantStats(
    workouts: WorkoutEvent[],
    goalType: CompetitionGoalType
  ) {
    let totalDistance = 0;
    let totalDuration = 0;
    let totalCalories = 0;
    let workoutCount = 0;
    let lastActivity = 0;
    const paces: number[] = [];

    for (const workout of workouts) {
      const data = this.parseWorkoutData(workout);

      if (data.distance) totalDistance += data.distance;
      if (data.duration) totalDuration += data.duration;
      if (data.calories) totalCalories += data.calories;
      if (data.pace && data.pace > 0) paces.push(data.pace);

      workoutCount++;
      lastActivity = Math.max(lastActivity, workout.created_at);
    }

    const averagePace =
      paces.length > 0
        ? paces.reduce((sum, pace) => sum + pace, 0) / paces.length
        : 0;

    return {
      totalDistance,
      totalDuration,
      totalCalories,
      workoutCount,
      lastActivity,
      averagePace,
    };
  }

  /**
   * Calculate score based on competition goal type
   */
  private calculateScore(
    stats: ReturnType<typeof this.calculateParticipantStats>,
    competition: NostrCompetition
  ): number {
    switch (competition.goalType) {
      case 'distance':
        return stats.totalDistance; // Score = total meters

      case 'speed':
        // Score based on average pace (lower is better, so invert)
        return stats.averagePace > 0 ? 10000 / stats.averagePace : 0;

      case 'duration':
        return stats.totalDuration; // Score = total seconds

      case 'consistency':
        // Score based on workout frequency and consistency
        let competitionDays = 1; // Default for events
        
        if (competition.type === 'league' && competition.startDate && competition.endDate) {
          const startTime = Math.floor(new Date(competition.startDate).getTime() / 1000);
          const endTime = Math.floor(new Date(competition.endDate).getTime() / 1000);
          competitionDays = (endTime - startTime) / (24 * 60 * 60);
        }
        
        const workoutsPerDay = stats.workoutCount / competitionDays;
        return workoutsPerDay * 1000; // Scale for better scoring

      default:
        return stats.totalDistance; // Default to distance
    }
  }

  // ================================================================================
  // UTILITIES
  // ================================================================================

  /**
   * Check if workout is tagged for specific competition
   */
  private isWorkoutForCompetition(
    workoutEvent: Event,
    competitionId: string
  ): boolean {
    // Check for competition tags
    return workoutEvent.tags.some(
      (tag) =>
        (tag[0] === 'challenge_uuid' || tag[0] === 'competition_id') &&
        tag[1] === competitionId
    );
  }

  /**
   * Create empty leaderboard
   */
  private createEmptyLeaderboard(
    competitionId: string
  ): CompetitionLeaderboard {
    return {
      competitionId,
      participants: [],
      lastUpdated: Math.floor(Date.now() / 1000),
      totalWorkouts: 0,
    };
  }

  /**
   * Get competition statistics
   */
  async getCompetitionStats(
    competition: NostrCompetition,
    team: NostrTeam
  ): Promise<CompetitionStats> {
    const leaderboard = await this.getLeaderboard(competition, team);

    const totalDistance = leaderboard.participants.reduce(
      (sum, p) => sum + (p.totalDistance || 0),
      0
    );
    const totalDuration = leaderboard.participants.reduce(
      (sum, p) => sum + (p.totalDuration || 0),
      0
    );
    const participantsWithPace = leaderboard.participants.filter(
      (p) => p.averagePace && p.averagePace > 0
    );
    const averagePace =
      participantsWithPace.length > 0
        ? participantsWithPace.reduce((sum, p) => sum + p.averagePace!, 0) /
          participantsWithPace.length
        : 0;

    return {
      totalWorkouts: leaderboard.totalWorkouts,
      totalDistance,
      totalDuration,
      averagePace,
      uniqueParticipants: leaderboard.participants.filter(
        (p) => p.workoutCount! > 0
      ).length,
      timeRange: {
        start: competition.type === 'league' 
          ? Math.floor(new Date(competition.startDate!).getTime() / 1000)
          : Math.floor(new Date(competition.eventDate!).getTime() / 1000),
        end: competition.type === 'league'
          ? Math.floor(new Date(competition.endDate!).getTime() / 1000) 
          : Math.floor(new Date(competition.eventDate!).getTime() / 1000) + (24 * 60 * 60), // End of event day
        current: Math.floor(Date.now() / 1000),
      },
    };
  }

  /**
   * Clear cached leaderboards
   */
  clearCache(): void {
    this.cachedLeaderboards.clear();
  }

  /**
   * Get cached leaderboards
   */
  getCachedLeaderboards(): CompetitionLeaderboard[] {
    return Array.from(this.cachedLeaderboards.values());
  }
}

export default LeaderboardService.getInstance();
