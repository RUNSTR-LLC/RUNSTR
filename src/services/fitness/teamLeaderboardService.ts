/**
 * Team Leaderboard Service
 * Real-time team rankings and statistics using Supabase subscriptions
 * Handles live updates, rank calculations, and performance tracking
 */

// import { supabase } from '../supabase';  // REMOVED: Project now uses pure Nostr
// import { RealtimeChannel } from '@supabase/supabase-js';  // REMOVED: Project now uses pure Nostr
import type { LeaderboardEntry, TeamStats, WorkoutData } from '../../types';

export interface LeaderboardUpdate {
  type: 'member_update' | 'new_workout' | 'rank_change';
  teamId: string;
  data: LeaderboardEntry[] | WorkoutData;
  timestamp: string;
}

export interface TeamLeaderboardData {
  leaderboard: LeaderboardEntry[];
  teamStats: TeamStats;
  lastUpdated: string;
  updateCount: number;
}

type LeaderboardCallback = (update: LeaderboardUpdate) => void;

export class TeamLeaderboardService {
  private static instance: TeamLeaderboardService;
  private subscriptions = new Map<string, RealtimeChannel>();
  private callbacks = new Map<string, LeaderboardCallback[]>();
  private leaderboardCache = new Map<string, TeamLeaderboardData>();
  private refreshIntervals = new Map<string, any>();

  private constructor() {}

  static getInstance(): TeamLeaderboardService {
    if (!TeamLeaderboardService.instance) {
      TeamLeaderboardService.instance = new TeamLeaderboardService();
    }
    return TeamLeaderboardService.instance;
  }

  /**
   * Subscribe to real-time leaderboard updates for a team
   */
  async subscribeToTeam(
    teamId: string,
    callback: LeaderboardCallback
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Subscribing to leaderboard updates for team ${teamId}`);

      // Add callback to list
      if (!this.callbacks.has(teamId)) {
        this.callbacks.set(teamId, []);
      }
      this.callbacks.get(teamId)!.push(callback);

      // If already subscribed, just add the callback
      if (this.subscriptions.has(teamId)) {
        console.log(`Already subscribed to team ${teamId}`);
        return { success: true };
      }

      // Create Supabase subscription for team workouts
      const channel = supabase
        .channel(`team-${teamId}-leaderboard`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'workouts',
            filter: `team_id=eq.${teamId}`,
          },
          async (payload) => {
            await this.handleWorkoutUpdate(teamId, payload);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'team_members',
            filter: `team_id=eq.${teamId}`,
          },
          async (payload) => {
            await this.handleMemberUpdate(teamId, payload);
          }
        )
        .subscribe();

      this.subscriptions.set(teamId, channel);

      // Set up periodic refresh (every 5 minutes)
      const refreshInterval = setInterval(() => {
        this.refreshTeamLeaderboard(teamId);
      }, 5 * 60 * 1000);

      this.refreshIntervals.set(teamId, refreshInterval);

      // Initial leaderboard load
      await this.refreshTeamLeaderboard(teamId);

      console.log(`Successfully subscribed to team ${teamId} leaderboard`);
      return { success: true };
    } catch (error) {
      console.error('Error subscribing to team leaderboard:', error);
      return {
        success: false,
        error: `Subscription failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /**
   * Unsubscribe from team leaderboard updates
   */
  async unsubscribeFromTeam(
    teamId: string,
    callback?: LeaderboardCallback
  ): Promise<void> {
    try {
      console.log(`Unsubscribing from team ${teamId} leaderboard`);

      // Remove specific callback or all callbacks
      if (callback) {
        const callbacks = this.callbacks.get(teamId) || [];
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }

        // If still have callbacks, don't unsubscribe
        if (callbacks.length > 0) return;
      }

      // Clean up subscription
      const subscription = this.subscriptions.get(teamId);
      if (subscription) {
        await supabase.removeChannel(subscription);
        this.subscriptions.delete(teamId);
      }

      // Clean up refresh interval
      const interval = this.refreshIntervals.get(teamId);
      if (interval) {
        clearInterval(interval);
        this.refreshIntervals.delete(teamId);
      }

      // Clean up callbacks and cache
      this.callbacks.delete(teamId);
      this.leaderboardCache.delete(teamId);

      console.log(`Unsubscribed from team ${teamId} leaderboard`);
    } catch (error) {
      console.error('Error unsubscribing from team leaderboard:', error);
    }
  }

  /**
   * Handle workout table updates
   */
  private async handleWorkoutUpdate(
    teamId: string,
    payload: any
  ): Promise<void> {
    try {
      console.log(`Workout update for team ${teamId}:`, payload.eventType);

      // Refresh leaderboard after workout changes
      await this.refreshTeamLeaderboard(teamId);

      // Notify subscribers
      const callbacks = this.callbacks.get(teamId) || [];
      const cachedData = this.leaderboardCache.get(teamId);

      if (cachedData) {
        const update: LeaderboardUpdate = {
          type: 'new_workout',
          teamId,
          data: cachedData.leaderboard,
          timestamp: new Date().toISOString(),
        };

        callbacks.forEach((callback) => {
          try {
            callback(update);
          } catch (error) {
            console.error('Error in leaderboard callback:', error);
          }
        });
      }
    } catch (error) {
      console.error('Error handling workout update:', error);
    }
  }

  /**
   * Handle team member table updates
   */
  private async handleMemberUpdate(
    teamId: string,
    payload: any
  ): Promise<void> {
    try {
      console.log(`Member update for team ${teamId}:`, payload.eventType);

      // Refresh leaderboard after member changes
      await this.refreshTeamLeaderboard(teamId);

      // Notify subscribers
      const callbacks = this.callbacks.get(teamId) || [];
      const cachedData = this.leaderboardCache.get(teamId);

      if (cachedData) {
        const update: LeaderboardUpdate = {
          type: 'member_update',
          teamId,
          data: cachedData.leaderboard,
          timestamp: new Date().toISOString(),
        };

        callbacks.forEach((callback) => {
          try {
            callback(update);
          } catch (error) {
            console.error('Error in leaderboard callback:', error);
          }
        });
      }
    } catch (error) {
      console.error('Error handling member update:', error);
    }
  }

  /**
   * Refresh team leaderboard data
   */
  private async refreshTeamLeaderboard(teamId: string): Promise<void> {
    try {
      // Get team leaderboard
      const leaderboard = await this.fetchTeamLeaderboard(teamId);

      // Get team stats
      const teamStats = await this.fetchTeamStats(teamId);

      // Update cache
      const cachedData = this.leaderboardCache.get(teamId);
      const leaderboardData: TeamLeaderboardData = {
        leaderboard,
        teamStats,
        lastUpdated: new Date().toISOString(),
        updateCount: (cachedData?.updateCount || 0) + 1,
      };

      this.leaderboardCache.set(teamId, leaderboardData);

      console.log(
        `Refreshed leaderboard for team ${teamId}: ${leaderboard.length} members`
      );
    } catch (error) {
      console.error('Error refreshing team leaderboard:', error);
    }
  }

  /**
   * Fetch current team leaderboard from database
   */
  private async fetchTeamLeaderboard(
    teamId: string
  ): Promise<LeaderboardEntry[]> {
    try {
      const { data: members, error } = await supabase
        .from('team_members')
        .select(
          `
          user_id,
          total_workouts,
          total_distance_meters,
          total_score,
          last_workout_at,
          users!inner(name, avatar)
        `
        )
        .eq('team_id', teamId)
        .order('total_score', { ascending: false })
        .limit(50);

      if (error) throw error;

      return members.map((member, index) => ({
        userId: member.user_id,
        userName: (member.users as any).name,
        rank: index + 1,
        score: member.total_score || 0,
        avatar:
          (member.users as any).avatar ||
          (member.users as any).name.charAt(0).toUpperCase(),
        stats: {
          totalWorkouts: member.total_workouts || 0,
          totalDistance: member.total_distance_meters || 0,
          lastWorkout: member.last_workout_at,
        },
      }));
    } catch (error) {
      console.error('Error fetching team leaderboard:', error);
      return [];
    }
  }

  /**
   * Fetch team statistics
   */
  private async fetchTeamStats(teamId: string): Promise<TeamStats> {
    try {
      const { data: stats, error } = await supabase
        .from('team_members')
        .select('total_workouts, total_distance_meters, total_score')
        .eq('team_id', teamId);

      if (error) throw error;

      const totalMembers = stats.length;
      const totalWorkouts = stats.reduce(
        (sum, s) => sum + (s.total_workouts || 0),
        0
      );
      const totalDistance = stats.reduce(
        (sum, s) => sum + (s.total_distance_meters || 0),
        0
      );
      const totalScore = stats.reduce(
        (sum, s) => sum + (s.total_score || 0),
        0
      );

      // Get recent activity count (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const { data: recentWorkouts, error: recentError } = await supabase
        .from('workouts')
        .select('id')
        .eq('team_id', teamId)
        .gte('start_time', sevenDaysAgo.toISOString());

      if (recentError) throw recentError;

      return {
        memberCount: totalMembers,
        avgPace: '7:30/mi', // TODO: Calculate from actual workout data
        activeEvents: recentWorkouts?.length || 0,
        activeChallenges: 0, // TODO: Get actual challenge count
      };
    } catch (error) {
      console.error('Error fetching team stats:', error);
      return {
        memberCount: 0,
        avgPace: '--',
        activeEvents: 0,
        activeChallenges: 0,
      };
    }
  }

  /**
   * Get cached leaderboard data for a team
   */
  getCachedLeaderboard(teamId: string): TeamLeaderboardData | null {
    return this.leaderboardCache.get(teamId) || null;
  }

  /**
   * Get leaderboard data for a team (with caching)
   */
  async getTeamLeaderboard(
    teamId: string
  ): Promise<TeamLeaderboardData | null> {
    try {
      // Check cache first
      const cached = this.leaderboardCache.get(teamId);
      if (cached) {
        const ageMinutes =
          (Date.now() - new Date(cached.lastUpdated).getTime()) / (1000 * 60);
        if (ageMinutes < 5) {
          // Cache for 5 minutes
          return cached;
        }
      }

      // Fetch fresh data
      const leaderboard = await this.fetchTeamLeaderboard(teamId);
      const teamStats = await this.fetchTeamStats(teamId);

      const leaderboardData: TeamLeaderboardData = {
        leaderboard,
        teamStats,
        lastUpdated: new Date().toISOString(),
        updateCount: (cached?.updateCount || 0) + 1,
      };

      this.leaderboardCache.set(teamId, leaderboardData);
      return leaderboardData;
    } catch (error) {
      console.error('Error getting team leaderboard:', error);
      return null;
    }
  }

  /**
   * Get user's rank in team
   */
  async getUserRankInTeam(
    userId: string,
    teamId: string
  ): Promise<{
    rank: number | null;
    score: number;
    totalMembers: number;
  }> {
    try {
      const leaderboardData = await this.getTeamLeaderboard(teamId);
      if (!leaderboardData) {
        return { rank: null, score: 0, totalMembers: 0 };
      }

      const userEntry = leaderboardData.leaderboard.find(
        (entry) => entry.userId === userId
      );

      return {
        rank: userEntry?.rank || null,
        score: userEntry?.score || 0,
        totalMembers: leaderboardData.teamStats.memberCount,
      };
    } catch (error) {
      console.error('Error getting user rank:', error);
      return { rank: null, score: 0, totalMembers: 0 };
    }
  }

  /**
   * Clean up all subscriptions (call on app shutdown)
   */
  async cleanup(): Promise<void> {
    console.log('Cleaning up team leaderboard subscriptions');

    // Unsubscribe from all teams
    for (const teamId of this.subscriptions.keys()) {
      await this.unsubscribeFromTeam(teamId);
    }

    // Clear all maps
    this.subscriptions.clear();
    this.callbacks.clear();
    this.leaderboardCache.clear();
    this.refreshIntervals.clear();

    console.log('Team leaderboard service cleaned up');
  }
}

export default TeamLeaderboardService.getInstance();
