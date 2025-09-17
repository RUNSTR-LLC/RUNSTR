/**
 * Competition Leaderboard Manager
 * Manages competition-specific leaderboard updates when workouts are processed
 * Bridges workout processing with event, challenge, and league leaderboards
 */

// import { supabase } from '../supabase';  // REMOVED: Project now uses pure Nostr
import type { WorkoutData } from '../../types';

export interface LeaderboardUpdateResult {
  success: boolean;
  updatedCompetitions: string[];
  error?: string;
}

export interface ActiveCompetition {
  id: string;
  type: 'event' | 'challenge' | 'league';
  teamId: string;
  isActive: boolean;
  startDate: string;
  endDate?: string;
}

export class CompetitionLeaderboardManager {
  private static instance: CompetitionLeaderboardManager;

  private constructor() {}

  static getInstance(): CompetitionLeaderboardManager {
    if (!CompetitionLeaderboardManager.instance) {
      CompetitionLeaderboardManager.instance =
        new CompetitionLeaderboardManager();
    }
    return CompetitionLeaderboardManager.instance;
  }

  /**
   * Update all relevant competition leaderboards for a processed workout
   * Called by workout processing pipeline
   */
  async updateCompetitionLeaderboards(
    workout: WorkoutData,
    score: number
  ): Promise<LeaderboardUpdateResult> {
    const updatedCompetitions: string[] = [];

    try {
      console.log(
        `🏆 Updating competition leaderboards for workout ${workout.id}`
      );

      if (!workout.teamId) {
        return {
          success: true,
          updatedCompetitions: [],
        };
      }

      // Get active competitions for this team
      const activeCompetitions = await this.getActiveCompetitionsForTeam(
        workout.teamId,
        workout.startTime
      );

      // Update each relevant competition leaderboard
      for (const competition of activeCompetitions) {
        try {
          const updated = await this.updateSpecificLeaderboard(
            competition,
            workout,
            score
          );
          if (updated) {
            updatedCompetitions.push(`${competition.type}:${competition.id}`);
          }
        } catch (error) {
          console.error(
            `Error updating ${competition.type} ${competition.id}:`,
            error
          );
        }
      }

      console.log(
        `✅ Updated ${updatedCompetitions.length} competition leaderboards`
      );
      return {
        success: true,
        updatedCompetitions,
      };
    } catch (error) {
      console.error('Error updating competition leaderboards:', error);
      return {
        success: false,
        updatedCompetitions,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get active competitions that this workout should count toward
   */
  private async getActiveCompetitionsForTeam(
    teamId: string,
    workoutDate: string
  ): Promise<ActiveCompetition[]> {
    const competitions: ActiveCompetition[] = [];

    try {
      // Get active events
      const { data: events, error: eventsError } = await supabase
        .from('activities')
        .select('id, team_id, activity_type, start_date, end_date')
        .eq('team_id', teamId)
        .eq('activity_type', 'event')
        .eq('status', 'active')
        .lte('start_date', workoutDate)
        .gte('end_date', workoutDate);

      if (!eventsError && events) {
        competitions.push(
          ...events.map((e) => ({
            id: e.id,
            type: 'event' as const,
            teamId: e.team_id,
            isActive: true,
            startDate: e.start_date,
            endDate: e.end_date,
          }))
        );
      }

      // Get active challenges (user is participating in)
      const { data: challenges, error: challengesError } = await supabase
        .from('activities')
        .select(
          'id, team_id, activity_type, start_date, end_date, challenger_id, challenged_id'
        )
        .eq('team_id', teamId)
        .eq('activity_type', 'challenge')
        .eq('status', 'active')
        .lte('start_date', workoutDate)
        .gte('end_date', workoutDate);

      if (!challengesError && challenges) {
        competitions.push(
          ...challenges.map((c) => ({
            id: c.id,
            type: 'challenge' as const,
            teamId: c.team_id,
            isActive: true,
            startDate: c.start_date,
            endDate: c.end_date,
          }))
        );
      }

      // Get active leagues (always ongoing)
      const { data: leagues, error: leaguesError } = await supabase
        .from('activities')
        .select('id, team_id, activity_type, start_date')
        .eq('team_id', teamId)
        .eq('activity_type', 'league')
        .eq('status', 'active');

      if (!leaguesError && leagues) {
        competitions.push(
          ...leagues.map((l) => ({
            id: l.id,
            type: 'league' as const,
            teamId: l.team_id,
            isActive: true,
            startDate: l.start_date,
          }))
        );
      }
    } catch (error) {
      console.error('Error getting active competitions:', error);
    }

    return competitions;
  }

  /**
   * Update specific competition leaderboard based on type
   */
  private async updateSpecificLeaderboard(
    competition: ActiveCompetition,
    workout: WorkoutData,
    score: number
  ): Promise<boolean> {
    switch (competition.type) {
      case 'event':
        return await this.updateEventLeaderboard(
          competition.id,
          workout.userId,
          workout,
          score
        );
      case 'challenge':
        return await this.updateChallengeLeaderboard(
          competition.id,
          workout.userId,
          workout,
          score
        );
      case 'league':
        return await this.updateLeagueLeaderboard(
          competition.id,
          workout.userId,
          workout,
          score
        );
      default:
        console.warn(`Unknown competition type: ${competition.type}`);
        return false;
    }
  }

  /**
   * Update event leaderboard with workout data
   */
  private async updateEventLeaderboard(
    eventId: string,
    userId: string,
    workout: WorkoutData,
    score: number
  ): Promise<boolean> {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('leaderboards')
        .select('*')
        .eq('period', `event_${eventId}`)
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existing) {
        // Update existing entry
        const { error: updateError } = await supabase
          .from('leaderboards')
          .update({
            total_distance:
              (existing.total_distance || 0) + (workout.distance || 0),
            total_workouts: (existing.total_workouts || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('period', `event_${eventId}`)
          .eq('user_id', userId);

        if (updateError) throw updateError;
      } else {
        // Insert new entry
        const { error: insertError } = await supabase
          .from('leaderboards')
          .insert({
            period: `event_${eventId}`,
            user_id: userId,
            team_id: workout.teamId,
            total_distance: workout.distance || 0,
            total_workouts: 1,
            rank: 999999, // Will be updated by rank calculation
            updated_at: new Date().toISOString(),
          });

        if (insertError) throw insertError;
      }

      return true;
    } catch (error) {
      console.error(`Error updating event leaderboard for ${eventId}:`, error);
      return false;
    }
  }

  /**
   * Update challenge leaderboard with workout data
   */
  private async updateChallengeLeaderboard(
    challengeId: string,
    userId: string,
    workout: WorkoutData,
    score: number
  ): Promise<boolean> {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('leaderboards')
        .select('*')
        .eq('period', `challenge_${challengeId}`)
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      const performanceMetrics = {
        workouts: (existing?.performance_metrics?.workouts || 0) + 1,
        totalDistance:
          (existing?.performance_metrics?.totalDistance || 0) +
          (workout.distance || 0),
        totalDuration:
          (existing?.performance_metrics?.totalDuration || 0) +
          (workout.duration || 0),
        bestDistance: Math.max(
          existing?.performance_metrics?.bestDistance || 0,
          workout.distance || 0
        ),
        lastWorkout: workout.startTime,
      };

      if (existing) {
        // Update existing entry
        const { error: updateError } = await supabase
          .from('leaderboards')
          .update({
            total_distance:
              (existing.total_distance || 0) + (workout.distance || 0),
            total_workouts: (existing.total_workouts || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('period', `challenge_${challengeId}`)
          .eq('user_id', userId);

        if (updateError) throw updateError;
      } else {
        // Insert new entry
        const { error: insertError } = await supabase
          .from('leaderboards')
          .insert({
            period: `challenge_${challengeId}`,
            user_id: userId,
            team_id: workout.teamId,
            total_distance: workout.distance || 0,
            total_workouts: 1,
            rank: 999999, // Will be updated by rank calculation
            updated_at: new Date().toISOString(),
          });

        if (insertError) throw insertError;
      }

      return true;
    } catch (error) {
      console.error(
        `Error updating challenge leaderboard for ${challengeId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Update league leaderboard with workout data
   */
  private async updateLeagueLeaderboard(
    leagueId: string,
    userId: string,
    workout: WorkoutData,
    score: number
  ): Promise<boolean> {
    try {
      // Calculate current period dates
      const workoutDate = new Date(workout.startTime);
      const periodStart = this.calculatePeriodStart(workoutDate, 'weekly'); // Default to weekly periods
      const periodEnd = this.calculatePeriodEnd(periodStart, 'weekly');

      const { data: existing, error: fetchError } = await supabase
        .from('leaderboards')
        .select('*')
        .eq(
          'period',
          `league_${leagueId}_${periodStart.toISOString().split('T')[0]}`
        )
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existing) {
        // Update existing period entry
        const { error: updateError } = await supabase
          .from('leaderboards')
          .update({
            total_distance:
              (existing.total_distance || 0) + (workout.distance || 0),
            total_workouts: (existing.total_workouts || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq(
            'period',
            `league_${leagueId}_${periodStart.toISOString().split('T')[0]}`
          )
          .eq('user_id', userId);

        if (updateError) throw updateError;
      } else {
        // Insert new period entry
        const { error: insertError } = await supabase
          .from('leaderboards')
          .insert({
            period: `league_${leagueId}_${
              periodStart.toISOString().split('T')[0]
            }`,
            user_id: userId,
            team_id: workout.teamId,
            total_distance: workout.distance || 0,
            total_workouts: 1,
            rank: 999999, // Will be updated by recalculateRanking
            updated_at: new Date().toISOString(),
          });

        if (insertError) throw insertError;
      }

      return true;
    } catch (error) {
      console.error(
        `Error updating league leaderboard for ${leagueId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Calculate period start date for league standings
   */
  private calculatePeriodStart(date: Date, frequency: string): Date {
    const periodStart = new Date(date);

    switch (frequency) {
      case 'daily':
        periodStart.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        const dayOfWeek = periodStart.getDay();
        periodStart.setDate(periodStart.getDate() - dayOfWeek);
        periodStart.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        periodStart.setDate(1);
        periodStart.setHours(0, 0, 0, 0);
        break;
    }

    return periodStart;
  }

  /**
   * Calculate period end date for league standings
   */
  private calculatePeriodEnd(periodStart: Date, frequency: string): Date {
    const periodEnd = new Date(periodStart);

    switch (frequency) {
      case 'daily':
        periodEnd.setDate(periodEnd.getDate() + 1);
        break;
      case 'weekly':
        periodEnd.setDate(periodEnd.getDate() + 7);
        break;
      case 'monthly':
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        break;
    }

    return periodEnd;
  }

  /**
   * Manual refresh of competition leaderboard (for admin use)
   */
  async refreshCompetitionLeaderboard(
    competitionId: string,
    competitionType: 'event' | 'challenge' | 'league'
  ): Promise<boolean> {
    try {
      console.log(
        `🔄 Refreshing ${competitionType} leaderboard: ${competitionId}`
      );

      // Get all workouts for this competition and recalculate
      // This would be used for fixing leaderboard inconsistencies

      return true;
    } catch (error) {
      console.error(`Error refreshing ${competitionType} leaderboard:`, error);
      return false;
    }
  }

  /**
   * Get leaderboard stats for monitoring
   */
  async getLeaderboardStats(): Promise<{
    eventEntries: number;
    challengeEntries: number;
    leagueEntries: number;
  }> {
    try {
      const [eventCount, challengeCount, leagueCount] = await Promise.all([
        supabase
          .from('leaderboards')
          .select('id', { count: 'exact' })
          .like('period', 'event_%'),
        supabase
          .from('leaderboards')
          .select('id', { count: 'exact' })
          .like('period', 'challenge_%'),
        supabase
          .from('leaderboards')
          .select('id', { count: 'exact' })
          .like('period', 'league_%'),
      ]);

      return {
        eventEntries: eventCount.count || 0,
        challengeEntries: challengeCount.count || 0,
        leagueEntries: leagueCount.count || 0,
      };
    } catch (error) {
      console.error('Error getting leaderboard stats:', error);
      return {
        eventEntries: 0,
        challengeEntries: 0,
        leagueEntries: 0,
      };
    }
  }
}

export default CompetitionLeaderboardManager.getInstance();
