/**
 * Competition Completion Service - Main Orchestrator
 * Coordinates competition completion detection and reward distribution
 * Delegates heavy lifting to specialized services for maintainability
 *
 * NOTE: This service uses Supabase and needs Nostr rewrite
 */

// @ts-nocheck - Supabase code needs Nostr rewrite

// import { supabase } from '../supabase';  // REMOVED: Project now uses pure Nostr
import competitionRewardProcessor from './competitionRewardProcessor';
import type { Event, Challenge, League } from '../../types/team';

export interface CompletionResult {
  success: boolean;
  distributionsCreated?: number;
  error?: string;
  competitionId: string;
  competitionType: 'event' | 'challenge' | 'league';
}

export class CompetitionCompletionService {
  private static instance: CompetitionCompletionService;

  private constructor() {}

  static getInstance(): CompetitionCompletionService {
    if (!CompetitionCompletionService.instance) {
      CompetitionCompletionService.instance =
        new CompetitionCompletionService();
    }
    return CompetitionCompletionService.instance;
  }

  /**
   * Check and process all completed competitions
   * Main entry point for periodic competition processing
   */
  async processCompletedCompetitions(): Promise<CompletionResult[]> {
    const results: CompletionResult[] = [];

    try {
      console.log('🔍 Scanning for completed competitions...');

      // Get completed competitions
      const completedEvents = await this.getCompletedEvents();
      const completedChallenges = await this.getCompletedChallenges();
      const dueLeagues = await this.getDueLeagues();

      console.log(
        `Found: ${completedEvents.length} events, ${completedChallenges.length} challenges, ${dueLeagues.length} leagues`
      );

      // Process all competitions using reward processor
      const processingResults =
        await competitionRewardProcessor.processBatchRewards(
          completedEvents,
          completedChallenges,
          dueLeagues
        );

      results.push(...processingResults);

      // Log summary
      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;
      console.log(
        `✅ Competition processing complete: ${successful} successful, ${failed} failed`
      );
    } catch (error) {
      console.error('❌ Error processing completed competitions:', error);
    }

    return results;
  }

  /**
   * Get completed events that haven't had rewards distributed
   */
  private async getCompletedEvents(): Promise<Event[]> {
    try {
      const { data: events, error } = await supabase
        .from('activities')
        .select('*')
        .eq('activity_type', 'event')
        .eq('status', 'completed')
        .is('rewards_distributed', false)
        .gt('prize_amount', 0);

      if (error) throw error;
      return events || [];
    } catch (error) {
      console.error('Error fetching completed events:', error);
      return [];
    }
  }

  /**
   * Get completed challenges that haven't had rewards distributed
   */
  private async getCompletedChallenges(): Promise<Challenge[]> {
    try {
      const { data: challenges, error } = await supabase
        .from('activities')
        .select('*')
        .eq('activity_type', 'challenge')
        .eq('status', 'completed')
        .is('rewards_distributed', false)
        .gt('prize_amount', 0)
        .not('challenger_id', 'is', null);

      if (error) throw error;
      return challenges || [];
    } catch (error) {
      console.error('Error fetching completed challenges:', error);
      return [];
    }
  }

  /**
   * Get leagues that are due for payout
   */
  private async getDueLeagues(): Promise<League[]> {
    try {
      const { data: leagues, error } = await supabase
        .from('activities')
        .select('*')
        .eq('activity_type', 'league')
        .eq('status', 'active')
        .gt('prize_amount', 0);

      if (error) throw error;

      // Filter leagues that are actually due for payout
      const dueLeagues: League[] = [];
      for (const league of leagues || []) {
        if (await this.isLeaguePayoutDue(league)) {
          dueLeagues.push(league);
        }
      }

      return dueLeagues;
    } catch (error) {
      console.error('Error fetching due leagues:', error);
      return [];
    }
  }

  /**
   * Check if league payout is due based on frequency
   */
  private async isLeaguePayoutDue(league: League): Promise<boolean> {
    try {
      const now = new Date();
      const lastPayout = league.lastPayoutAt
        ? new Date(league.lastPayoutAt)
        : new Date(league.createdAt);

      let payoutInterval: number;
      switch (league.payoutFrequency) {
        case 'daily':
          payoutInterval = 24 * 60 * 60 * 1000; // 1 day in milliseconds
          break;
        case 'weekly':
          payoutInterval = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
          break;
        case 'monthly':
          payoutInterval = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
          break;
        default:
          return false;
      }

      return now.getTime() - lastPayout.getTime() >= payoutInterval;
    } catch (error) {
      console.error(
        `Error checking league payout due for ${league.id}:`,
        error
      );
      return false;
    }
  }

  /**
   * Manually trigger completion processing for a specific competition
   */
  async processSpecificCompetition(
    competitionId: string,
    competitionType: 'event' | 'challenge' | 'league'
  ): Promise<CompletionResult> {
    try {
      console.log(
        `🎯 Processing specific ${competitionType}: ${competitionId}`
      );

      // Delegate to reward processor's retry method
      const result = await competitionRewardProcessor.retryFailedDistribution(
        competitionId,
        competitionType
      );

      if (result.success) {
        console.log(
          `✅ Successfully processed ${competitionType} ${competitionId}`
        );
      } else {
        console.log(
          `❌ Failed to process ${competitionType} ${competitionId}: ${result.error}`
        );
      }

      return result;
    } catch (error) {
      console.error(
        `Error processing specific competition ${competitionId}:`,
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

  /**
   * Get processing statistics for monitoring
   */
  async getProcessingStats(): Promise<{
    pendingEvents: number;
    pendingChallenges: number;
    dueLeagues: number;
    totalPendingPayouts: number;
  }> {
    try {
      const [events, challenges, leagues] = await Promise.all([
        this.getCompletedEvents(),
        this.getCompletedChallenges(),
        this.getDueLeagues(),
      ]);

      // Calculate total pending payout amounts
      const totalEventPayouts = events.reduce((sum, e) => sum + e.prizePool, 0);
      const totalChallengePayouts = challenges.reduce(
        (sum, c) => sum + c.prizePool,
        0
      );
      const totalLeaguePayouts = leagues.reduce(
        (sum, l) => sum + l.payoutAmount,
        0
      );

      return {
        pendingEvents: events.length,
        pendingChallenges: challenges.length,
        dueLeagues: leagues.length,
        totalPendingPayouts:
          totalEventPayouts + totalChallengePayouts + totalLeaguePayouts,
      };
    } catch (error) {
      console.error('Error getting processing stats:', error);
      return {
        pendingEvents: 0,
        pendingChallenges: 0,
        dueLeagues: 0,
        totalPendingPayouts: 0,
      };
    }
  }

  /**
   * Health check for competition processing system
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    message: string;
    details: any;
  }> {
    try {
      const stats = await this.getProcessingStats();

      // Check if database connections work
      const { error: dbError } = await supabase
        .from('activities')
        .select('id')
        .eq('activity_type', 'event')
        .limit(1);

      if (dbError) {
        return {
          status: 'unhealthy',
          message: 'Database connection failed',
          details: { error: dbError.message },
        };
      }

      // Check for excessive pending competitions (warning threshold)
      const totalPending =
        stats.pendingEvents + stats.pendingChallenges + stats.dueLeagues;
      if (totalPending > 50) {
        return {
          status: 'degraded',
          message: `High number of pending competitions: ${totalPending}`,
          details: stats,
        };
      }

      return {
        status: 'healthy',
        message: 'Competition processing system is operational',
        details: stats,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Health check failed',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}

export default CompetitionCompletionService.getInstance();

// Re-export types and interfaces for backward compatibility
export type { WinnerCalculation } from './competitionWinnerCalculation';
export { default as competitionWinnerCalculation } from './competitionWinnerCalculation';
export { default as competitionRewardProcessor } from './competitionRewardProcessor';
