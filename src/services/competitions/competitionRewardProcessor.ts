/**
 * Competition Reward Processor
 * Handles Bitcoin reward distribution for completed competitions
 * Integrates with reward distribution service and tracks payout status
 */

import { supabase } from '../supabase';
import rewardDistributionService from '../fitness/rewardDistributionService';
import competitionWinnerCalculation from './competitionWinnerCalculation';
import type { Event, Challenge, League } from '../../types/team';

export interface CompletionResult {
  success: boolean;
  distributionsCreated?: number;
  error?: string;
  competitionId: string;
  competitionType: 'event' | 'challenge' | 'league';
}

export class CompetitionRewardProcessor {
  private static instance: CompetitionRewardProcessor;

  private constructor() {}

  static getInstance(): CompetitionRewardProcessor {
    if (!CompetitionRewardProcessor.instance) {
      CompetitionRewardProcessor.instance = new CompetitionRewardProcessor();
    }
    return CompetitionRewardProcessor.instance;
  }

  /**
   * Distribute rewards for a completed event
   * Uses winner calculation service to determine prize recipients
   */
  async processEventRewards(event: Event): Promise<CompletionResult> {
    try {
      // Get event leaderboard to determine winners
      const winners = await competitionWinnerCalculation.calculateEventWinners(
        event
      );

      if (winners.length === 0) {
        return {
          success: false,
          error: 'No winners found for event',
          competitionId: event.id,
          competitionType: 'event',
        };
      }

      // Create distributions for winners
      let distributionsCreated = 0;
      for (const winner of winners) {
        const distributionResult =
          await rewardDistributionService.createDistribution(
            event.createdBy, // Event creator (should be team captain)
            event.teamId,
            winner.winnerId,
            winner.rewardAmount,
            'event_winner',
            `Winner of ${event.name} - Rank #${winner.rank}`
          );

        if (distributionResult.success && distributionResult.distributionId) {
          // Process the distribution immediately
          await rewardDistributionService.processDistribution(
            distributionResult.distributionId
          );
          distributionsCreated++;
        }
      }

      // Mark event as having rewards distributed
      await supabase
        .from('activities')
        .update({ rewards_distributed: true })
        .eq('id', event.id);

      return {
        success: distributionsCreated > 0,
        distributionsCreated,
        competitionId: event.id,
        competitionType: 'event',
      };
    } catch (error) {
      console.error(`Error distributing event rewards for ${event.id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        competitionId: event.id,
        competitionType: 'event',
      };
    }
  }

  /**
   * Distribute rewards for a completed challenge
   * Winner is already determined, just process the payout
   */
  async processChallengeRewards(
    challenge: Challenge
  ): Promise<CompletionResult> {
    try {
      // For challenges, the winner is already determined
      if (!challenge.winnerId) {
        throw new Error('Challenge winner not determined');
      }

      const distributionResult =
        await rewardDistributionService.createDistribution(
          challenge.challengerId, // Challenger (should be team captain or have permission)
          challenge.teamId,
          challenge.winnerId,
          challenge.prizePool,
          'challenge_winner',
          `Winner of challenge: ${challenge.name}`
        );

      if (distributionResult.success && distributionResult.distributionId) {
        // Process the distribution immediately
        const processResult =
          await rewardDistributionService.processDistribution(
            distributionResult.distributionId
          );

        if (processResult.success) {
          // Mark challenge as having rewards distributed
          await supabase
            .from('activities')
            .update({ rewards_distributed: true })
            .eq('id', challenge.id)
            .eq('activity_type', 'challenge');

          return {
            success: true,
            distributionsCreated: 1,
            competitionId: challenge.id,
            competitionType: 'challenge',
          };
        }
      }

      return {
        success: false,
        error: distributionResult.error || 'Distribution processing failed',
        competitionId: challenge.id,
        competitionType: 'challenge',
      };
    } catch (error) {
      console.error(
        `Error distributing challenge rewards for ${challenge.id}:`,
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        competitionId: challenge.id,
        competitionType: 'challenge',
      };
    }
  }

  /**
   * Distribute league payouts based on current leaderboard
   * Process periodic payouts for league winners
   */
  async processLeaguePayouts(league: League): Promise<CompletionResult> {
    try {
      // Get current league leaderboard
      const winners = await competitionWinnerCalculation.calculateLeagueWinners(
        league
      );

      if (winners.length === 0) {
        return {
          success: false,
          error: 'No winners found for league payout',
          competitionId: league.id,
          competitionType: 'league',
        };
      }

      // Get team captain for distribution authority
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('captain_id')
        .eq('id', league.teamId)
        .single();

      if (teamError || !team) {
        return {
          success: false,
          error: 'Team not found for league',
          competitionId: league.id,
          competitionType: 'league',
        };
      }

      // Create distributions for league winners
      let distributionsCreated = 0;
      for (const winner of winners) {
        const distributionResult =
          await rewardDistributionService.createDistribution(
            team.captain_id,
            league.teamId,
            winner.winnerId,
            winner.rewardAmount,
            `league_${league.payoutFrequency}`,
            `${league.payoutFrequency} league winner - ${league.name}`
          );

        if (distributionResult.success && distributionResult.distributionId) {
          // Process the distribution immediately
          await rewardDistributionService.processDistribution(
            distributionResult.distributionId
          );
          distributionsCreated++;
        }
      }

      // Update league's last payout time
      await supabase
        .from('activities')
        .update({
          requirements_json: JSON.stringify({
            ...((league as any).requirements_json
              ? JSON.parse((league as any).requirements_json)
              : {}),
            lastPayoutAt: new Date().toISOString(),
          }),
        })
        .eq('id', league.id)
        .eq('activity_type', 'league');

      return {
        success: distributionsCreated > 0,
        distributionsCreated,
        competitionId: league.id,
        competitionType: 'league',
      };
    } catch (error) {
      console.error(
        `Error distributing league payouts for ${league.id}:`,
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        competitionId: league.id,
        competitionType: 'league',
      };
    }
  }

  /**
   * Batch process multiple competition rewards
   * Useful for processing all completed competitions at once
   */
  async processBatchRewards(
    events: Event[] = [],
    challenges: Challenge[] = [],
    leagues: League[] = []
  ): Promise<CompletionResult[]> {
    const results: CompletionResult[] = [];

    try {
      // Process events
      for (const event of events) {
        const result = await this.processEventRewards(event);
        results.push(result);
      }

      // Process challenges
      for (const challenge of challenges) {
        const result = await this.processChallengeRewards(challenge);
        results.push(result);
      }

      // Process leagues
      for (const league of leagues) {
        const result = await this.processLeaguePayouts(league);
        results.push(result);
      }
    } catch (error) {
      console.error('Error in batch reward processing:', error);
    }

    return results;
  }

  /**
   * Check payout status for a specific competition
   */
  async getPayoutStatus(
    competitionId: string,
    competitionType: 'event' | 'challenge' | 'league'
  ): Promise<{
    paid: boolean;
    distributionCount: number;
    totalAmount: number;
  }> {
    try {
      const { data: distributions, error } = await supabase
        .from('reward_distributions')
        .select('amount, status')
        .eq('competition_id', competitionId)
        .eq('competition_type', competitionType);

      if (error) throw error;

      const distributionCount = distributions?.length || 0;
      const totalAmount =
        distributions?.reduce((sum, d) => sum + d.amount, 0) || 0;
      const paid =
        distributions?.every((d) => d.status === 'completed') || false;

      return { paid, distributionCount, totalAmount };
    } catch (error) {
      console.error(
        `Error checking payout status for ${competitionType} ${competitionId}:`,
        error
      );
      return { paid: false, distributionCount: 0, totalAmount: 0 };
    }
  }

  /**
   * Retry failed distribution for a competition
   */
  async retryFailedDistribution(
    competitionId: string,
    competitionType: 'event' | 'challenge' | 'league'
  ): Promise<CompletionResult> {
    try {
      // Get the competition data
      const table =
        competitionType === 'event'
          ? 'events'
          : competitionType === 'challenge'
          ? 'challenges'
          : 'leagues';

      const { data: competition, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', competitionId)
        .single();

      if (error || !competition) {
        return {
          success: false,
          error: `${competitionType} not found`,
          competitionId,
          competitionType,
        };
      }

      // Process based on type
      switch (competitionType) {
        case 'event':
          return await this.processEventRewards(competition);
        case 'challenge':
          return await this.processChallengeRewards(competition);
        case 'league':
          return await this.processLeaguePayouts(competition);
        default:
          return {
            success: false,
            error: 'Invalid competition type',
            competitionId,
            competitionType,
          };
      }
    } catch (error) {
      console.error(
        `Error retrying failed distribution for ${competitionType} ${competitionId}:`,
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        competitionId,
        competitionType,
      };
    }
  }
}

export default CompetitionRewardProcessor.getInstance();
