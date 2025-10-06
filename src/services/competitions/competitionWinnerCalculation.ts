/**
 * Competition Winner Calculation Service
 * Determines winners for events, challenges, and leagues based on leaderboard data
 * Handles prize distribution calculations and ranking logic
 */

// @ts-nocheck - Supabase code needs Nostr rewrite

// import { supabase } from '../supabase';  // REMOVED: Project now uses pure Nostr
import type { Event, Challenge, League } from '../../types/team';

export interface WinnerCalculation {
  winnerId: string;
  winnerName: string;
  rank: number;
  score: number;
  rewardAmount: number;
}

export class CompetitionWinnerCalculation {
  private static instance: CompetitionWinnerCalculation;

  private constructor() {}

  static getInstance(): CompetitionWinnerCalculation {
    if (!CompetitionWinnerCalculation.instance) {
      CompetitionWinnerCalculation.instance =
        new CompetitionWinnerCalculation();
    }
    return CompetitionWinnerCalculation.instance;
  }

  /**
   * Calculate event winners based on leaderboard
   * Distribute prize pool among top performers (50%/30%/20%)
   */
  async calculateEventWinners(event: Event): Promise<WinnerCalculation[]> {
    try {
      // Get event participants and their scores from general leaderboards table
      const { data: leaderboard, error } = await supabase
        .from('leaderboards')
        .select('user_id, total_distance, rank, users(name)')
        .eq('period', `event_${event.id}`)
        .order('rank', { ascending: true })
        .limit(3); // Top 3 winners

      if (error || !leaderboard || leaderboard.length === 0) {
        console.log(`No leaderboard data found for event ${event.id}`);
        return [];
      }

      // Prize distribution: 50% for 1st, 30% for 2nd, 20% for 3rd
      const prizeDistribution = [0.5, 0.3, 0.2];
      const winners: WinnerCalculation[] = [];

      leaderboard.forEach((entry, index) => {
        if (index < prizeDistribution.length) {
          winners.push({
            winnerId: entry.user_id,
            winnerName: entry.users?.[0]?.name || 'Unknown User',
            rank: entry.rank,
            score: entry.total_distance, // Use total_distance as score
            rewardAmount: Math.floor(
              event.prizePool * prizeDistribution[index]
            ),
          });
        }
      });

      return winners;
    } catch (error) {
      console.error(`Error calculating event winners for ${event.id}:`, error);
      return [];
    }
  }

  /**
   * Calculate challenge winner - head-to-head competition
   * Winner is already determined, just format the result
   */
  async calculateChallengeWinner(
    challenge: Challenge
  ): Promise<WinnerCalculation | null> {
    try {
      if (!challenge.winnerId) {
        console.log(`Challenge ${challenge.id} has no winner determined`);
        return null;
      }

      // Get winner information from challenge leaderboard
      const { data: winnerData, error } = await supabase
        .from('leaderboards')
        .select('user_id, total_distance, users(name)')
        .eq('period', `challenge_${challenge.id}`)
        .eq('user_id', challenge.winnerId)
        .single();

      if (error || !winnerData) {
        // Fallback to basic user lookup if no leaderboard entry
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('name')
          .eq('id', challenge.winnerId)
          .single();

        if (userError) {
          console.error(`Error getting challenge winner info:`, userError);
          return null;
        }

        return {
          winnerId: challenge.winnerId,
          winnerName: user.name || 'Unknown User',
          rank: 1,
          score: 0,
          rewardAmount: challenge.prizePool,
        };
      }

      return {
        winnerId: winnerData.user_id,
        winnerName: winnerData.users?.[0]?.name || 'Unknown User',
        rank: 1,
        score: winnerData.total_distance || 0,
        rewardAmount: challenge.prizePool,
      };
    } catch (error) {
      console.error(
        `Error calculating challenge winner for ${challenge.id}:`,
        error
      );
      return null;
    }
  }

  /**
   * Calculate league winners for payout period
   * Top performer gets the full payout amount
   */
  async calculateLeagueWinners(league: League): Promise<WinnerCalculation[]> {
    try {
      // Get current league standings (top performer gets the payout)
      const { data: leaderboard, error } = await supabase
        .from('leaderboards')
        .select('user_id, total_distance, rank, users(name)')
        .eq('period', `league_${league.id}`)
        .order('rank', { ascending: true })
        .limit(1); // Just the top performer

      if (error || !leaderboard || leaderboard.length === 0) {
        console.log(`No leaderboard data found for league ${league.id}`);
        return [];
      }

      const topPerformer = leaderboard[0];
      return [
        {
          winnerId: topPerformer.user_id,
          winnerName: topPerformer.users?.[0]?.name || 'Unknown User',
          rank: topPerformer.rank,
          score: topPerformer.total_distance,
          rewardAmount: league.payoutAmount,
        },
      ];
    } catch (error) {
      console.error(
        `Error calculating league winners for ${league.id}:`,
        error
      );
      return [];
    }
  }

  /**
   * Get detailed event leaderboard for analysis
   */
  async getEventLeaderboard(
    eventId: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const { data: leaderboard, error } = await supabase
        .from('leaderboards')
        .select('user_id, total_distance, rank, total_workouts, users(name)')
        .eq('period', `event_${eventId}`)
        .order('rank', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return leaderboard || [];
    } catch (error) {
      console.error(`Error getting event leaderboard for ${eventId}:`, error);
      return [];
    }
  }

  /**
   * Get challenge participants and their progress
   */
  async getChallengeProgress(challengeId: string): Promise<any[]> {
    try {
      const { data: progress, error } = await supabase
        .from('leaderboards')
        .select('user_id, total_distance, users(name)')
        .eq('period', `challenge_${challengeId}`)
        .order('total_distance', { ascending: false });

      if (error) throw error;
      return progress || [];
    } catch (error) {
      console.error(
        `Error getting challenge progress for ${challengeId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Get league standings for current period
   */
  async getLeagueStandings(
    leagueId: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const { data: standings, error } = await supabase
        .from('leaderboards')
        .select('user_id, total_distance, rank, total_workouts, users(name)')
        .eq('period', `league_${leagueId}`)
        .order('rank', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return standings || [];
    } catch (error) {
      console.error(`Error getting league standings for ${leagueId}:`, error);
      return [];
    }
  }
}

export default CompetitionWinnerCalculation.getInstance();
