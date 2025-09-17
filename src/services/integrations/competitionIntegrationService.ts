/**
 * Competition Integration Service
 * Orchestrates the complete reward distribution system
 * Connects competition completion triggers with captain dashboard and UI components
 */

// import { supabase } from '../supabase';  // REMOVED: Project now uses pure Nostr
import competitionCompletionService from '../competitions/competitionCompletionService';
import rewardDistributionService from '../fitness/rewardDistributionService';
import teamWalletPermissions from '../auth/teamWalletPermissions';

export interface CompetitionIntegration {
  setupAutomaticProcessing: () => void;
  processAllCompetitions: () => Promise<void>;
  getCaptainDashboardData: (
    teamId: string,
    captainId: string
  ) => Promise<CaptainDashboardIntegration>;
  getTeamMembers: (teamId: string) => Promise<TeamMemberInfo[]>;
  schedulePeriodicProcessing: () => void;
}

export interface CaptainDashboardIntegration {
  teamWalletBalance: number;
  pendingDistributions: number;
  recentDistributions: DistributionSummary[];
  upcomingPayouts: PayoutSummary[];
  canDistribute: boolean;
  teamMembers: TeamMemberInfo[];
}

export interface TeamMemberInfo {
  id: string;
  name: string;
  avatar?: string;
  isActive: boolean;
  hasWallet: boolean;
}

export interface DistributionSummary {
  id: string;
  recipientName: string;
  amount: number;
  reason: string;
  status: 'pending' | 'completed' | 'failed' | 'processing';
  timestamp: string;
}

export interface PayoutSummary {
  competitionId: string;
  competitionName: string;
  competitionType: 'event' | 'challenge' | 'league';
  estimatedPayout: number;
  dueDate: string;
}

export class CompetitionIntegrationService {
  private static instance: CompetitionIntegrationService;
  private processingInterval?: NodeJS.Timeout | number;
  private readonly PROCESSING_INTERVAL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): CompetitionIntegrationService {
    if (!CompetitionIntegrationService.instance) {
      CompetitionIntegrationService.instance =
        new CompetitionIntegrationService();
    }
    return CompetitionIntegrationService.instance;
  }

  /**
   * Setup automatic competition processing
   * Called during app initialization
   */
  setupAutomaticProcessing(): void {
    console.log('Setting up automatic competition processing...');

    // Process immediately on setup
    this.processAllCompetitions().catch((error) => {
      console.error('Initial competition processing failed:', error);
    });

    // Schedule periodic processing
    this.schedulePeriodicProcessing();
  }

  /**
   * Process all completed competitions and distribute rewards
   */
  async processAllCompetitions(): Promise<void> {
    try {
      console.log('Processing completed competitions...');

      const results =
        await competitionCompletionService.processCompletedCompetitions();

      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;
      const totalDistributions = results.reduce(
        (sum, r) => sum + (r.distributionsCreated || 0),
        0
      );

      console.log(
        `Competition processing complete: ${successful} successful, ${failed} failed, ${totalDistributions} distributions created`
      );

      // Log individual results for debugging
      results.forEach((result) => {
        if (result.success) {
          console.log(
            `✅ ${result.competitionType} ${result.competitionId}: ${result.distributionsCreated} distributions`
          );
        } else {
          console.log(
            `❌ ${result.competitionType} ${result.competitionId}: ${result.error}`
          );
        }
      });
    } catch (error) {
      console.error('Error processing competitions:', error);
    }
  }

  /**
   * Get comprehensive captain dashboard data
   */
  async getCaptainDashboardData(
    teamId: string,
    captainId: string
  ): Promise<CaptainDashboardIntegration> {
    try {
      // Validate captain permissions
      const permissions = await teamWalletPermissions.getWalletPermissions(
        captainId,
        teamId
      );

      // Get team wallet balance
      const teamWalletBalance =
        (await teamWalletPermissions.getTeamWalletBalance(captainId, teamId)) ||
        0;

      // Get pending distributions count
      const pendingDistributions = await this.getPendingDistributionsCount(
        teamId
      );

      // Get recent distribution history
      const recentDistributions = await this.getRecentDistributions(teamId);

      // Get upcoming payouts
      const upcomingPayouts = await this.getUpcomingPayouts(teamId);

      // Get team members with wallet info
      const teamMembers = await this.getTeamMembers(teamId);

      return {
        teamWalletBalance,
        pendingDistributions,
        recentDistributions,
        upcomingPayouts,
        canDistribute: permissions.canDistribute,
        teamMembers,
      };
    } catch (error) {
      console.error('Error getting captain dashboard data:', error);
      return {
        teamWalletBalance: 0,
        pendingDistributions: 0,
        recentDistributions: [],
        upcomingPayouts: [],
        canDistribute: false,
        teamMembers: [],
      };
    }
  }

  /**
   * Get team members with wallet information
   */
  async getTeamMembers(teamId: string): Promise<TeamMemberInfo[]> {
    try {
      const { data: members, error } = await supabase
        .from('team_members')
        .select(
          `
          users(
            id,
            name,
            avatar,
            personal_wallet_address
          ),
          is_active
        `
        )
        .eq('team_id', teamId)
        .eq('is_active', true);

      if (error) throw error;

      return (members || []).map((member) => ({
        id: member.users[0]?.id || 'unknown',
        name: member.users[0]?.name || 'Unknown User',
        avatar: member.users[0]?.avatar,
        isActive: member.is_active,
        hasWallet: !!member.users[0]?.personal_wallet_address,
      }));
    } catch (error) {
      console.error('Error getting team members:', error);
      return [];
    }
  }

  /**
   * Get count of pending distributions for team
   */
  private async getPendingDistributionsCount(teamId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('reward_distributions')
        .select('id', { count: 'exact' })
        .eq('team_id', teamId)
        .eq('status', 'pending');

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting pending distributions count:', error);
      return 0;
    }
  }

  /**
   * Get recent distribution history for team
   */
  private async getRecentDistributions(
    teamId: string
  ): Promise<DistributionSummary[]> {
    try {
      const distributions =
        await rewardDistributionService.getTeamDistributionHistory(teamId, 10);

      return distributions.map((dist) => ({
        id: dist.id,
        recipientName: `User ${dist.recipientId.slice(0, 8)}...`, // Would need to join with users table for real names
        amount: dist.amount,
        reason: dist.reason,
        status: dist.status,
        timestamp: dist.createdAt,
      }));
    } catch (error) {
      console.error('Error getting recent distributions:', error);
      return [];
    }
  }

  /**
   * Get upcoming payouts for team competitions
   */
  private async getUpcomingPayouts(teamId: string): Promise<PayoutSummary[]> {
    try {
      const payouts: PayoutSummary[] = [];

      // Get ending events
      const { data: events, error: eventsError } = await supabase
        .from('activities')
        .select('id, title, created_at, prize_amount')
        .eq('activity_type', 'event')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .gt('prize_amount', 0)
        .order('created_at', { ascending: true })
        .limit(5);

      if (!eventsError && events) {
        events.forEach((event) => {
          payouts.push({
            competitionId: event.id,
            competitionName: event.title,
            competitionType: 'event',
            estimatedPayout: event.prize_amount,
            dueDate: event.created_at, // Using created_at as placeholder
          });
        });
      }

      // Get ending challenges
      const { data: challenges, error: challengesError } = await supabase
        .from('activities')
        .select('id, title, created_at, prize_amount')
        .eq('activity_type', 'challenge')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .gt('prize_amount', 0)
        .order('created_at', { ascending: true })
        .limit(5);

      if (!challengesError && challenges) {
        challenges.forEach((challenge) => {
          payouts.push({
            competitionId: challenge.id,
            competitionName: challenge.title,
            competitionType: 'challenge',
            estimatedPayout: challenge.prize_amount,
            dueDate: challenge.created_at, // Using created_at as placeholder
          });
        });
      }

      // Get league payouts
      const { data: leagues, error: leaguesError } = await supabase
        .from('activities')
        .select('id, title, prize_amount, requirements_json')
        .eq('activity_type', 'league')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .gt('prize_amount', 0);

      if (!leaguesError && leagues) {
        leagues.forEach((league) => {
          const requirements = league.requirements_json
            ? JSON.parse(league.requirements_json)
            : {};
          const nextPayoutDate = this.calculateNextPayoutDate(
            requirements.payout_frequency || 'weekly',
            requirements.last_payout_at
          );

          payouts.push({
            competitionId: league.id,
            competitionName: `${league.title} (${
              requirements.payout_frequency || 'weekly'
            })`,
            competitionType: 'league',
            estimatedPayout: league.prize_amount,
            dueDate: nextPayoutDate,
          });
        });
      }

      // Sort by due date
      return payouts.sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );
    } catch (error) {
      console.error('Error getting upcoming payouts:', error);
      return [];
    }
  }

  /**
   * Calculate next payout date for league
   */
  private calculateNextPayoutDate(
    frequency: string,
    lastPayoutAt?: string
  ): string {
    const lastPayout = lastPayoutAt ? new Date(lastPayoutAt) : new Date();
    const nextPayout = new Date(lastPayout);

    switch (frequency) {
      case 'daily':
        nextPayout.setDate(nextPayout.getDate() + 1);
        break;
      case 'weekly':
        nextPayout.setDate(nextPayout.getDate() + 7);
        break;
      case 'monthly':
        nextPayout.setMonth(nextPayout.getMonth() + 1);
        break;
    }

    return nextPayout.toISOString();
  }

  /**
   * Schedule periodic processing
   */
  schedulePeriodicProcessing(): void {
    // Clear existing interval
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    // Set up new interval
    this.processingInterval = setInterval(() => {
      this.processAllCompetitions().catch((error) => {
        console.error('Periodic competition processing failed:', error);
      });
    }, this.PROCESSING_INTERVAL);

    console.log(
      `Scheduled periodic competition processing every ${
        this.PROCESSING_INTERVAL / 1000
      }s`
    );
  }

  /**
   * Stop automatic processing
   */
  stopAutomaticProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
      console.log('Stopped automatic competition processing');
    }
  }

  /**
   * Manually trigger processing for specific competition
   */
  async processSpecificCompetition(
    competitionId: string,
    competitionType: 'event' | 'challenge' | 'league'
  ): Promise<{ success: boolean; message: string }> {
    try {
      const result =
        await competitionCompletionService.processSpecificCompetition(
          competitionId,
          competitionType
        );

      if (result.success) {
        return {
          success: true,
          message: `Successfully processed ${competitionType} and created ${
            result.distributionsCreated || 0
          } distributions`,
        };
      } else {
        return {
          success: false,
          message: result.error || 'Processing failed',
        };
      }
    } catch (error) {
      console.error('Error processing specific competition:', error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

export default CompetitionIntegrationService.getInstance();
