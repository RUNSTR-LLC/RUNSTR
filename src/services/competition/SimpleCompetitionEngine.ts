/**
 * SimpleCompetitionEngine - Pure Nostr Competition Data Pipeline
 * Implements the core simplified flow: Teams → Members → Workouts → Leaderboards
 * Replaces complex hybrid systems with straightforward Nostr event aggregation
 */

import { NostrListService } from '../nostr/NostrListService';
import type { NostrLeagueDefinition, NostrEventDefinition } from '../../types/nostrCompetition';
import type { NostrWorkout } from '../../types/nostrWorkout';

export interface SimpleParticipant {
  pubkey: string;
  name: string;
  position: number;
  score: number;
  totalDistance: number; // meters
  totalDuration: number; // seconds
  workoutCount: number;
  averagePace?: number; // min/km for running workouts
  bestPace?: number; // min/km for running workouts
  totalCalories: number;
  lastActivity?: number; // timestamp
}

export interface SimpleLeaderboard {
  competitionId: string;
  type: 'league' | 'event';
  participants: SimpleParticipant[];
  lastUpdated: number;
  totalWorkouts: number;
  dateRange: {
    startTime: number;
    endTime: number;
  };
  scoringMethod: string;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ScoringRules {
  goalType: 'distance' | 'speed' | 'duration' | 'consistency';
  activityType: string;
  competitionType: string;
}

export class SimpleCompetitionEngine {
  private static instance: SimpleCompetitionEngine;
  private nostrListService: NostrListService;
  private cache: Map<string, SimpleLeaderboard> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.nostrListService = NostrListService.getInstance();
  }

  static getInstance(): SimpleCompetitionEngine {
    if (!SimpleCompetitionEngine.instance) {
      SimpleCompetitionEngine.instance = new SimpleCompetitionEngine();
    }
    return SimpleCompetitionEngine.instance;
  }

  /**
   * Core method: Get competition leaderboard using pure Nostr data pipeline
   */
  async getCompetitionLeaderboard(
    competition: NostrLeagueDefinition | NostrEventDefinition,
    teamId: string
  ): Promise<SimpleLeaderboard> {
    console.log(`🏆 SimpleCompetitionEngine: Computing leaderboard for ${competition.name}`);

    // Check cache first
    const cached = this.getCachedLeaderboard(competition.id);
    if (cached) {
      console.log(`⚡ Using cached leaderboard for: ${competition.name}`);
      return cached;
    }

    try {
      // Step 1: Get team members using proven NostrListService
      const memberIds = await this.getTeamMembers(teamId, competition.captainPubkey);
      console.log(`👥 Found ${memberIds.length} team members`);

      if (memberIds.length === 0) {
        return this.createEmptyLeaderboard(competition, 'No team members found');
      }

      // Step 2: Get competition date range
      const dateRange = this.getCompetitionDateRange(competition);
      console.log(`📅 Competition range: ${dateRange.startDate.toDateString()} → ${dateRange.endDate.toDateString()}`);

      // Step 3: Get member workouts using nuclear approach
      const memberWorkouts = await this.getMemberWorkouts(memberIds, dateRange, competition.activityType);
      console.log(`📊 Found workouts for ${memberWorkouts.size} participants`);

      // Step 4: Apply wizard-defined scoring rules
      const scoringRules: ScoringRules = {
        goalType: this.getGoalTypeFromCompetition(competition),
        activityType: competition.activityType,
        competitionType: competition.competitionType
      };

      const participants = this.calculateRankings(memberWorkouts, scoringRules);

      // Step 5: Create leaderboard
      const leaderboard: SimpleLeaderboard = {
        competitionId: competition.id,
        type: this.isLeague(competition) ? 'league' : 'event',
        participants,
        lastUpdated: Date.now(),
        totalWorkouts: participants.reduce((sum, p) => sum + p.workoutCount, 0),
        dateRange: {
          startTime: dateRange.startDate.getTime() / 1000,
          endTime: dateRange.endDate.getTime() / 1000,
        },
        scoringMethod: this.describeScoringMethod(scoringRules),
      };

      // Cache the result
      this.cacheLeaderboard(competition.id, leaderboard);

      console.log(`✅ Leaderboard computed: ${participants.length} participants, ${leaderboard.totalWorkouts} workouts`);
      return leaderboard;

    } catch (error) {
      console.error(`❌ Failed to compute leaderboard:`, error);
      return this.createEmptyLeaderboard(competition, 'Failed to load leaderboard data');
    }
  }

  /**
   * Get team members using proven NostrListService
   */
  private async getTeamMembers(teamId: string, captainPubkey: string): Promise<string[]> {
    try {
      // Use the proven NostrListService pattern
      // Teams use dTag pattern like 'team-members' or similar
      const membersList = await this.nostrListService.getListMembers(captainPubkey, `${teamId}-members`);
      
      if (membersList.length === 0) {
        // Fallback: try alternate dTag patterns
        const alternativePatterns = [
          `${teamId}`,
          `team-${teamId}`,
          `members-${teamId}`,
          'team-members'
        ];
        
        for (const pattern of alternativePatterns) {
          const fallbackMembers = await this.nostrListService.getListMembers(captainPubkey, pattern);
          if (fallbackMembers.length > 0) {
            console.log(`📋 Found members using pattern: ${pattern}`);
            return fallbackMembers;
          }
        }
      }
      
      return membersList;
    } catch (error) {
      console.error('❌ Failed to get team members:', error);
      return [];
    }
  }

  /**
   * Get member workouts using nuclear approach (from WorkoutMergeService)
   */
  private async getMemberWorkouts(
    memberIds: string[],
    dateRange: DateRange,
    activityType: string
  ): Promise<Map<string, NostrWorkout[]>> {
    const memberWorkouts = new Map<string, NostrWorkout[]>();
    
    console.log(`🔍 Fetching workouts for ${memberIds.length} members...`);

    // Fetch workouts for each member in parallel
    const fetchPromises = memberIds.map(async (pubkey) => {
      try {
        const workouts = await this.fetchUserWorkouts(pubkey, dateRange, activityType);
        memberWorkouts.set(pubkey, workouts);
        console.log(`📊 Found ${workouts.length} workouts for member ${pubkey.substring(0, 8)}...`);
      } catch (error) {
        console.error(`❌ Failed to fetch workouts for ${pubkey}:`, error);
        memberWorkouts.set(pubkey, []);
      }
    });

    await Promise.all(fetchPromises);

    const totalWorkouts = Array.from(memberWorkouts.values()).reduce(
      (sum, workouts) => sum + workouts.length, 0
    );
    console.log(`✅ Fetched ${totalWorkouts} total workouts across all members`);

    return memberWorkouts;
  }

  /**
   * Fetch user workouts using nuclear approach (simplified from WorkoutMergeService)
   */
  private async fetchUserWorkouts(
    pubkey: string, 
    dateRange: DateRange, 
    activityType: string
  ): Promise<NostrWorkout[]> {
    try {
      console.log(`🚀 Nuclear workout fetch for ${pubkey.substring(0, 8)}...`);
      
      // Use NDK nuclear approach like WorkoutMergeService
      const { nip19 } = await import('nostr-tools');
      const NDK = await import('@nostr-dev-kit/ndk');
      
      let hexPubkey = pubkey;
      if (pubkey.startsWith('npub1')) {
        const decoded = nip19.decode(pubkey);
        hexPubkey = decoded.data as string;
      }

      // Use global NDK instance (like WorkoutMergeService)
      const g = globalThis as any;
      let ndk = g.__RUNSTR_NDK_INSTANCE__;
      
      if (!ndk) {
        const relayUrls = [
          'wss://relay.damus.io',
          'wss://nos.lol',
          'wss://relay.primal.net',
          'wss://nostr.wine',
          'wss://relay.nostr.band',
        ];

        ndk = new NDK.default({
          explicitRelayUrls: relayUrls
        });
        
        await ndk.connect();
        g.__RUNSTR_NDK_INSTANCE__ = ndk;
      }

      const events: any[] = [];

      // Nuclear filter: kind 1301 + author + time range
      const filter = {
        kinds: [1301],
        authors: [hexPubkey],
        since: Math.floor(dateRange.startDate.getTime() / 1000),
        until: Math.floor(dateRange.endDate.getTime() / 1000),
        limit: 100
      };

      const subscription = ndk.subscribe(filter, {
        cacheUsage: NDK.NDKSubscriptionCacheUsage?.ONLY_RELAY
      });

      subscription.on('event', (event: any) => {
        if (event.kind === 1301) {
          events.push(event);
        }
      });

      // Wait for events
      await new Promise(resolve => setTimeout(resolve, 2000));
      subscription.stop();

      // Parse events into workouts
      const workouts: NostrWorkout[] = [];
      
      for (const event of events) {
        try {
          const workout = this.parseWorkoutEvent(event, pubkey);
          if (workout && this.matchesActivityType(workout, activityType)) {
            workouts.push(workout);
          }
        } catch (error) {
          console.warn(`⚠️ Error parsing workout event ${event.id}:`, error);
        }
      }

      return workouts.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    } catch (error) {
      console.error('❌ Nuclear workout fetch failed:', error);
      return [];
    }
  }

  /**
   * Parse workout event into NostrWorkout
   */
  private parseWorkoutEvent(event: any, userId: string): NostrWorkout {
    const tags = event.tags || [];
    let workoutType = 'unknown';
    let duration = 0;
    let distance = 0;
    let calories = 0;
    
    // Extract data from tags
    for (const tag of tags) {
      if (tag[0] === 'exercise' && tag[1]) workoutType = tag[1];
      if (tag[0] === 'type' && tag[1]) workoutType = tag[1];
      if (tag[0] === 'activity' && tag[1]) workoutType = tag[1];
      
      if (tag[0] === 'duration' && tag[1]) {
        const timeStr = tag[1];
        const parts = timeStr.split(':').map((p: string) => parseInt(p));
        if (parts.length === 3) {
          duration = parts[0] * 3600 + parts[1] * 60 + parts[2]; // H:M:S
        } else if (parts.length === 2) {
          duration = parts[0] * 60 + parts[1]; // M:S
        }
      }
      
      if (tag[0] === 'distance' && tag[1]) distance = parseFloat(tag[1]) || 0;
      if (tag[0] === 'calories' && tag[1]) calories = parseInt(tag[1]) || 0;
    }

    return {
      id: event.id,
      userId: userId,
      type: workoutType as any,
      startTime: new Date(event.created_at * 1000).toISOString(),
      endTime: new Date((event.created_at + Math.max(duration, 60)) * 1000).toISOString(),
      duration: duration,
      distance: distance,
      calories: calories,
      source: 'nostr',
      nostrEventId: event.id,
      nostrPubkey: event.pubkey,
      sourceApp: 'simple_competition_engine',
      tags: event.tags || []
    };
  }

  /**
   * Check if workout matches activity type
   */
  private matchesActivityType(workout: NostrWorkout, activityType: string): boolean {
    const type = activityType.toLowerCase();
    const workoutType = workout.type.toLowerCase();
    
    if (type.includes('any') || type.includes('all')) return true;
    if (type.includes('run') && workoutType.includes('run')) return true;
    if (type.includes('walk') && workoutType.includes('walk')) return true;
    if (type.includes('cycl') && workoutType.includes('cycl')) return true;
    if (type.includes('bike') && workoutType.includes('bike')) return true;
    
    return workoutType.includes(type) || type.includes(workoutType);
  }

  /**
   * Calculate rankings based on scoring rules
   */
  private calculateRankings(
    memberWorkouts: Map<string, NostrWorkout[]>,
    scoringRules: ScoringRules
  ): SimpleParticipant[] {
    const participants: SimpleParticipant[] = [];

    memberWorkouts.forEach((workouts, pubkey) => {
      const participant = this.calculateParticipantScore(pubkey, workouts, scoringRules);
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
   * Calculate individual participant score
   */
  private calculateParticipantScore(
    pubkey: string,
    workouts: NostrWorkout[],
    scoringRules: ScoringRules
  ): SimpleParticipant {
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
    switch (scoringRules.goalType) {
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
      name: `Member ${pubkey.substring(0, 8)}`,
      position: 0, // Will be set during ranking
      score: Math.round(score * 100) / 100,
      totalDistance: Math.round(totalDistance),
      totalDuration: Math.round(totalDuration),
      workoutCount: workouts.length,
      averagePace: averagePace > 0 ? Math.round(averagePace * 100) / 100 : undefined,
      bestPace: bestPace > 0 ? Math.round(bestPace * 100) / 100 : undefined,
      totalCalories: Math.round(totalCalories),
      lastActivity: lastActivity || undefined,
    };
  }

  /**
   * Helper methods
   */
  private getCompetitionDateRange(competition: NostrLeagueDefinition | NostrEventDefinition): DateRange {
    if (this.isLeague(competition)) {
      return {
        startDate: new Date(competition.startDate),
        endDate: new Date(competition.endDate)
      };
    } else {
      const eventDate = new Date(competition.eventDate);
      return {
        startDate: new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), 0, 0, 0),
        endDate: new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), 23, 59, 59)
      };
    }
  }

  private getGoalTypeFromCompetition(competition: NostrLeagueDefinition | NostrEventDefinition): 'distance' | 'speed' | 'duration' | 'consistency' {
    const competitionType = competition.competitionType.toLowerCase();
    
    if (competitionType.includes('distance') || competitionType.includes('total')) return 'distance';
    if (competitionType.includes('speed') || competitionType.includes('pace') || competitionType.includes('fast')) return 'speed';
    if (competitionType.includes('duration') || competitionType.includes('time')) return 'duration';
    if (competitionType.includes('consistency') || competitionType.includes('frequency')) return 'consistency';
    
    return 'distance'; // Default
  }

  private isLeague(competition: NostrLeagueDefinition | NostrEventDefinition): competition is NostrLeagueDefinition {
    return 'duration' in competition;
  }

  private describeScoringMethod(scoringRules: ScoringRules): string {
    switch (scoringRules.goalType) {
      case 'distance':
        return `Ranked by total distance (${scoringRules.activityType})`;
      case 'speed':
        return `Ranked by average pace (${scoringRules.activityType})`;
      case 'duration':
        return `Ranked by total active time (${scoringRules.activityType})`;
      case 'consistency':
        return `Ranked by number of workouts (${scoringRules.activityType})`;
      default:
        return `Ranked by performance (${scoringRules.activityType})`;
    }
  }

  private createEmptyLeaderboard(
    competition: Partial<NostrLeagueDefinition | NostrEventDefinition>,
    reason: string
  ): SimpleLeaderboard {
    console.log(`📋 Creating empty leaderboard: ${reason}`);
    
    return {
      competitionId: competition.id || 'unknown',
      type: this.isLeague(competition as any) ? 'league' : 'event',
      participants: [],
      lastUpdated: Date.now(),
      totalWorkouts: 0,
      dateRange: {
        startTime: Date.now() / 1000,
        endTime: Date.now() / 1000,
      },
      scoringMethod: `No data: ${reason}`,
    };
  }

  /**
   * Cache management
   */
  private getCachedLeaderboard(competitionId: string): SimpleLeaderboard | null {
    const cached = this.cache.get(competitionId);
    if (!cached) return null;

    // Check if cache is still fresh
    const isStale = Date.now() - cached.lastUpdated > this.CACHE_DURATION;
    if (isStale) {
      this.cache.delete(competitionId);
      return null;
    }

    return cached;
  }

  private cacheLeaderboard(competitionId: string, leaderboard: SimpleLeaderboard): void {
    this.cache.set(competitionId, leaderboard);
  }

  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Cleared SimpleCompetitionEngine cache');
  }
}

export default SimpleCompetitionEngine.getInstance();