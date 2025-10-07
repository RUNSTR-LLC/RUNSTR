/**
 * Simple Leaderboard Service - MVP Implementation
 * Calculates competition rankings from kind 1301 workout events
 * No caching, straightforward scoring logic using global NDK
 */

import { GlobalNDKService } from '../nostr/GlobalNDKService';
import type { NDKFilter, NDKEvent } from '@nostr-dev-kit/ndk';
import type { League, CompetitionEvent } from './SimpleCompetitionService';

export interface LeaderboardEntry {
  rank: number;
  npub: string;
  name: string;
  score: number;
  formattedScore: string;
  workoutCount: number;
}

export interface Workout {
  id: string;
  npub: string;
  activityType: string;
  distance: number; // in km
  duration: number; // in seconds
  calories?: number;
  timestamp: number; // Unix timestamp
}

export class SimpleLeaderboardService {
  private static instance: SimpleLeaderboardService;

  private constructor() {}

  static getInstance(): SimpleLeaderboardService {
    if (!SimpleLeaderboardService.instance) {
      SimpleLeaderboardService.instance = new SimpleLeaderboardService();
    }
    return SimpleLeaderboardService.instance;
  }

  /**
   * Calculate league leaderboard
   */
  async calculateLeagueLeaderboard(
    league: League,
    teamMembers: string[]
  ): Promise<LeaderboardEntry[]> {
    console.log(`🏆 Calculating leaderboard for league: ${league.name}`);
    console.log(`   Team members: ${teamMembers.length}`);

    // Get workouts for all team members
    const workouts = await this.getWorkouts(
      teamMembers,
      league.activityType,
      new Date(league.startDate),
      new Date(league.endDate)
    );

    console.log(`   Found ${workouts.length} workouts`);

    // Calculate scores by member
    const scoresByMember = this.calculateScores(workouts, league.metric);

    // CRITICAL FIX: Create entries for ALL team members, even those with 0 workouts
    const entries: LeaderboardEntry[] = teamMembers.map((npub) => {
      const memberData = scoresByMember.get(npub);

      if (memberData) {
        // Member has workouts - use their actual scores
        return {
          rank: 0, // Will be set after sorting
          npub,
          name: npub.slice(0, 8) + '...',
          score: memberData.score,
          formattedScore: this.formatScore(memberData.score, league.metric),
          workoutCount: memberData.workoutCount,
        };
      } else {
        // Member has NO workouts - show them with 0 score
        return {
          rank: 0, // Will be set after sorting
          npub,
          name: npub.slice(0, 8) + '...',
          score: 0,
          formattedScore: this.formatScore(0, league.metric),
          workoutCount: 0,
        };
      }
    });

    // Sort by score (descending)
    entries.sort((a, b) => b.score - a.score);

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    console.log(`✅ Leaderboard calculated: ${entries.length} entries (${teamMembers.length} team members)`);
    return entries;
  }

  /**
   * Calculate event leaderboard
   */
  async calculateEventLeaderboard(
    event: CompetitionEvent,
    teamMembers: string[]
  ): Promise<LeaderboardEntry[]> {
    console.log(`🏆 Calculating leaderboard for event: ${event.name}`);

    const eventDate = new Date(event.eventDate);
    const eventStart = new Date(eventDate);
    eventStart.setHours(0, 0, 0, 0);
    const eventEnd = new Date(eventDate);
    eventEnd.setHours(23, 59, 59, 999);

    // Get workouts for event day
    const workouts = await this.getWorkouts(
      teamMembers,
      event.activityType,
      eventStart,
      eventEnd
    );

    console.log(`   Found ${workouts.length} workouts on event day`);

    // Filter workouts by target distance if specified
    let relevantWorkouts = workouts;
    if (event.targetDistance) {
      const minDistance = event.targetDistance * 0.95; // Allow 5% margin
      relevantWorkouts = workouts.filter(w => w.distance >= minDistance);
      console.log(`   ${relevantWorkouts.length} workouts meet distance requirement`);
    }

    // Calculate scores
    const scoresByMember = this.calculateScores(relevantWorkouts, event.metric);

    // CRITICAL FIX: Create entries for ALL team members, even those with 0 workouts
    const entries: LeaderboardEntry[] = teamMembers.map((npub) => {
      const memberData = scoresByMember.get(npub);

      if (memberData) {
        // Member has workouts - use their actual scores
        return {
          rank: 0,
          npub,
          name: npub.slice(0, 8) + '...',
          score: memberData.score,
          formattedScore: this.formatScore(memberData.score, event.metric),
          workoutCount: memberData.workoutCount,
        };
      } else {
        // Member has NO workouts - show them with 0 score
        return {
          rank: 0,
          npub,
          name: npub.slice(0, 8) + '...',
          score: 0,
          formattedScore: this.formatScore(0, event.metric),
          workoutCount: 0,
        };
      }
    });

    // Sort and rank
    entries.sort((a, b) => {
      // For time-based metrics, lower is better
      if (event.metric === 'fastest_time') {
        return a.score - b.score;
      }
      return b.score - a.score;
    });

    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    console.log(`✅ Event leaderboard calculated: ${entries.length} entries (${teamMembers.length} team members)`);
    return entries;
  }

  /**
   * Timeout wrapper for async operations
   */
  private async fetchWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutError: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(timeoutError)), timeoutMs)
      ),
    ]);
  }

  /**
   * Get workouts for members within date range
   */
  private async getWorkouts(
    memberNpubs: string[],
    activityType: string,
    startDate: Date,
    endDate: Date
  ): Promise<Workout[]> {
    if (memberNpubs.length === 0) {
      console.log('No members to query workouts for');
      return [];
    }

    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);

    try {
      // CRITICAL: Wait for all relays to connect before querying
      const connected = await GlobalNDKService.waitForConnection();
      if (!connected) {
        console.warn('⚠️ Proceeding with partial relay connectivity for workout query');
      }

      const ndk = await GlobalNDKService.getInstance();

      const filter: NDKFilter = {
        kinds: [1301],
        authors: memberNpubs,
        since: startTimestamp,
        until: endTimestamp,
        limit: 1000,
      };

      // Add 5-second timeout to prevent UI freeze
      console.log(`⏱️ Fetching workouts with 5s timeout for ${memberNpubs.length} members...`);
      const events = await this.fetchWithTimeout(
        ndk.fetchEvents(filter),
        5000,
        'Workout fetch timeout'
      );

      const workouts: Workout[] = [];

      events.forEach((event) => {
        const workout = this.parseWorkoutEvent(event);
        if (workout) {
          // Filter by activity type if not "Any"
          if (activityType === 'Any' || workout.activityType.toLowerCase() === activityType.toLowerCase()) {
            workouts.push(workout);
          }
        }
      });

      return workouts;

    } catch (error) {
      if (error instanceof Error && error.message === 'Workout fetch timeout') {
        console.warn('⚠️ Workout fetch timed out after 5 seconds - showing empty leaderboard');
        console.warn('   This may indicate slow relay connections or large result set');
        return [];
      }
      console.error('Failed to fetch workouts:', error);
      return [];
    }
  }

  /**
   * Parse kind 1301 event into Workout
   */
  private parseWorkoutEvent(event: NDKEvent): Workout | null {
    try {
      const getTag = (name: string) => event.tags.find(t => t[0] === name)?.[1];

      const activityType = getTag('exercise') || 'unknown';
      const distanceStr = getTag('distance');
      const durationStr = getTag('duration');

      if (!distanceStr || !durationStr) {
        return null;
      }

      // Parse distance (could be in km or miles, assume km for now)
      const distance = parseFloat(distanceStr);

      // Parse duration (format: HH:MM:SS)
      const duration = this.parseDuration(durationStr);

      const caloriesStr = getTag('calories');

      return {
        id: event.id,
        npub: event.pubkey,
        activityType,
        distance,
        duration,
        calories: caloriesStr ? parseInt(caloriesStr) : undefined,
        timestamp: event.created_at,
      };
    } catch (error) {
      console.error('Failed to parse workout event:', error);
      return null;
    }
  }

  /**
   * Parse duration string (HH:MM:SS) to seconds
   */
  private parseDuration(durationStr: string): number {
    const parts = durationStr.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      const seconds = parseInt(parts[2]);
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
  }

  /**
   * Calculate scores for each member based on metric
   */
  private calculateScores(
    workouts: Workout[],
    metric: string
  ): Map<string, { score: number; workoutCount: number }> {
    const scoresByMember = new Map<string, { score: number; workoutCount: number }>();

    for (const workout of workouts) {
      const existing = scoresByMember.get(workout.npub) || { score: 0, workoutCount: 0 };

      let score = existing.score;

      switch (metric) {
        case 'total_distance':
          score += workout.distance;
          break;

        case 'most_workouts':
          score += 1;
          break;

        case 'total_duration':
          score += workout.duration;
          break;

        case 'total_calories':
          score += workout.calories || 0;
          break;

        case 'fastest_time':
          // For fastest time, we want the LOWEST duration
          if (existing.score === 0 || workout.duration < existing.score) {
            score = workout.duration;
          }
          break;

        case 'average_pace':
          // Calculate pace (min/km) - lower is better
          if (workout.distance > 0) {
            const paceMinutesPerKm = (workout.duration / 60) / workout.distance;
            // Take the best pace
            if (existing.score === 0 || paceMinutesPerKm < existing.score) {
              score = paceMinutesPerKm;
            }
          }
          break;

        default:
          // Default to total distance
          score += workout.distance;
      }

      scoresByMember.set(workout.npub, {
        score,
        workoutCount: existing.workoutCount + 1,
      });
    }

    return scoresByMember;
  }

  /**
   * Format score for display
   */
  private formatScore(score: number, metric: string): string {
    switch (metric) {
      case 'total_distance':
        return `${score.toFixed(2)} km`;

      case 'most_workouts':
        return `${score} workouts`;

      case 'total_duration':
        const hours = Math.floor(score / 3600);
        const minutes = Math.floor((score % 3600) / 60);
        return `${hours}h ${minutes}m`;

      case 'total_calories':
        return `${Math.round(score)} cal`;

      case 'fastest_time':
        const mins = Math.floor(score / 60);
        const secs = Math.floor(score % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;

      case 'average_pace':
        const paceMinutes = Math.floor(score);
        const paceSeconds = Math.floor((score % 1) * 60);
        return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')} /km`;

      default:
        return score.toFixed(2);
    }
  }
}

export default SimpleLeaderboardService.getInstance();
