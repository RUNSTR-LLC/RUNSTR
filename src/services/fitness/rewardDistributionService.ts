/**
 * Reward Distribution Service
 * Handles manual Bitcoin reward distribution by team captains
 * Manages Lightning payments, transaction logging, and notifications
 */

import { supabase } from '../supabase';
import coinosService from '../coinosService';

export interface RewardDistribution {
  id: string;
  teamId: string;
  captainId: string;
  recipientId: string;
  amount: number; // sats
  reason: string;
  description?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transactionId?: string;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface BatchDistribution {
  id: string;
  teamId: string;
  captainId: string;
  totalAmount: number;
  distributionCount: number;
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed';
  reason: string;
  createdAt: string;
  completedAt?: string;
  distributions: RewardDistribution[];
}

export interface DistributionTemplate {
  name: string;
  reason: string;
  amount: number;
  description?: string;
}

// Common distribution templates
export const DISTRIBUTION_TEMPLATES: DistributionTemplate[] = [
  {
    name: 'Challenge Winner',
    reason: 'challenge_winner',
    amount: 2500,
    description: 'Reward for winning a team challenge',
  },
  {
    name: 'Weekly Top Performer',
    reason: 'weekly_top',
    amount: 5000,
    description: 'Top performer of the week',
  },
  {
    name: 'Consistency Bonus',
    reason: 'consistency',
    amount: 1000,
    description: 'Daily workout streak bonus',
  },
  {
    name: 'Team Event Participation',
    reason: 'event_participation',
    amount: 500,
    description: 'Participation in team event',
  },
  {
    name: 'Custom Reward',
    reason: 'custom',
    amount: 1000,
    description: 'Custom reward amount',
  },
];

export class RewardDistributionService {
  private static instance: RewardDistributionService;

  private constructor() {}

  static getInstance(): RewardDistributionService {
    if (!RewardDistributionService.instance) {
      RewardDistributionService.instance = new RewardDistributionService();
    }
    return RewardDistributionService.instance;
  }

  /**
   * Validate captain permissions for team
   */
  private async validateCaptainPermissions(
    captainId: string,
    teamId: string
  ): Promise<boolean> {
    try {
      const { data: team, error } = await supabase
        .from('teams')
        .select('captain_id')
        .eq('id', teamId)
        .single();

      if (error) throw error;

      return team.captain_id === captainId;
    } catch (error) {
      console.error('Error validating captain permissions:', error);
      return false;
    }
  }

  /**
   * Create a single reward distribution
   */
  async createDistribution(
    captainId: string,
    teamId: string,
    recipientId: string,
    amount: number,
    reason: string,
    description?: string
  ): Promise<{ success: boolean; distributionId?: string; error?: string }> {
    try {
      // Validate captain permissions
      const hasPermission = await this.validateCaptainPermissions(
        captainId,
        teamId
      );
      if (!hasPermission) {
        return { success: false, error: 'Unauthorized: Not team captain' };
      }

      // Validate recipient is team member
      const { data: membership, error: memberError } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('user_id', recipientId)
        .eq('team_id', teamId)
        .single();

      if (memberError || !membership) {
        return { success: false, error: 'Recipient not found in team' };
      }

      // Create distribution record
      const distributionId = `dist_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const { error: insertError } = await supabase
        .from('reward_distributions')
        .insert({
          id: distributionId,
          team_id: teamId,
          captain_id: captainId,
          recipient_id: recipientId,
          amount,
          reason,
          description,
          status: 'pending',
          created_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      console.log(
        `Created distribution ${distributionId}: ${amount} sats to ${recipientId}`
      );
      return { success: true, distributionId };
    } catch (error) {
      console.error('Error creating distribution:', error);
      return {
        success: false,
        error: `Distribution creation failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /**
   * Process a single distribution (send Lightning payment)
   */
  async processDistribution(
    distributionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get distribution details
      const { data: distribution, error: fetchError } = await supabase
        .from('reward_distributions')
        .select(
          `
          *,
          recipients:users!recipient_id(name, personal_wallet_address),
          captains:users!captain_id(name)
        `
        )
        .eq('id', distributionId)
        .single();

      if (fetchError || !distribution) {
        return { success: false, error: 'Distribution not found' };
      }

      if (distribution.status !== 'pending') {
        return { success: false, error: 'Distribution already processed' };
      }

      // Update status to processing
      await supabase
        .from('reward_distributions')
        .update({ status: 'processing' })
        .eq('id', distributionId);

      // Get recipient wallet address
      const recipientWalletAddress =
        distribution.recipients.personal_wallet_address;
      if (!recipientWalletAddress) {
        await this.markDistributionFailed(
          distributionId,
          'Recipient has no wallet address'
        );
        return { success: false, error: 'Recipient wallet not found' };
      }

      // Send Lightning payment via CoinOS
      const paymentResult = await coinosService.sendPayment(
        recipientWalletAddress,
        distribution.amount,
        `RUNSTR Reward: ${distribution.reason}`,
        distribution.captain_id // Use captain's wallet for sending
      );

      if (!paymentResult.success || !paymentResult.transactionId) {
        await this.markDistributionFailed(
          distributionId,
          paymentResult.error || 'Payment failed'
        );
        return {
          success: false,
          error: paymentResult.error || 'Payment failed',
        };
      }

      // Mark distribution as completed
      await supabase
        .from('reward_distributions')
        .update({
          status: 'completed',
          transaction_id: paymentResult.transactionId,
          completed_at: new Date().toISOString(),
        })
        .eq('id', distributionId);

      // Send push notification to recipient
      await this.sendRewardNotification(
        distribution.recipient_id,
        distribution.amount,
        distribution.reason
      );

      console.log(`Distribution ${distributionId} completed successfully`);
      return { success: true };
    } catch (error) {
      console.error('Error processing distribution:', error);
      await this.markDistributionFailed(
        distributionId,
        error instanceof Error ? error.message : 'Unknown error'
      );
      return {
        success: false,
        error: `Processing failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /**
   * Create batch distribution for multiple recipients
   */
  async createBatchDistribution(
    captainId: string,
    teamId: string,
    distributions: {
      recipientId: string;
      amount: number;
      reason: string;
      description?: string;
    }[]
  ): Promise<{ success: boolean; batchId?: string; error?: string }> {
    try {
      // Validate captain permissions
      const hasPermission = await this.validateCaptainPermissions(
        captainId,
        teamId
      );
      if (!hasPermission) {
        return { success: false, error: 'Unauthorized: Not team captain' };
      }

      const batchId = `batch_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const totalAmount = distributions.reduce((sum, d) => sum + d.amount, 0);

      // Create individual distributions
      const distributionIds: string[] = [];
      for (const dist of distributions) {
        const result = await this.createDistribution(
          captainId,
          teamId,
          dist.recipientId,
          dist.amount,
          dist.reason,
          dist.description
        );

        if (result.success && result.distributionId) {
          distributionIds.push(result.distributionId);
        }
      }

      if (distributionIds.length === 0) {
        return { success: false, error: 'No valid distributions created' };
      }

      // Create batch record
      const { error: batchError } = await supabase
        .from('batch_distributions')
        .insert({
          id: batchId,
          team_id: teamId,
          captain_id: captainId,
          total_amount: totalAmount,
          distribution_count: distributionIds.length,
          status: 'pending',
          reason: `Batch reward (${distributionIds.length} recipients)`,
          created_at: new Date().toISOString(),
          distribution_ids: distributionIds,
        });

      if (batchError) throw batchError;

      console.log(
        `Created batch distribution ${batchId} with ${distributionIds.length} recipients`
      );
      return { success: true, batchId };
    } catch (error) {
      console.error('Error creating batch distribution:', error);
      return {
        success: false,
        error: `Batch creation failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /**
   * Process batch distribution
   */
  async processBatchDistribution(batchId: string): Promise<{
    success: boolean;
    processed: number;
    failed: number;
    error?: string;
  }> {
    try {
      // Get batch details
      const { data: batch, error: fetchError } = await supabase
        .from('batch_distributions')
        .select('*, distribution_ids')
        .eq('id', batchId)
        .single();

      if (fetchError || !batch) {
        return {
          success: false,
          processed: 0,
          failed: 0,
          error: 'Batch not found',
        };
      }

      // Update batch status to processing
      await supabase
        .from('batch_distributions')
        .update({ status: 'processing' })
        .eq('id', batchId);

      let processed = 0;
      let failed = 0;

      // Process each distribution
      for (const distributionId of batch.distribution_ids) {
        const result = await this.processDistribution(distributionId);
        if (result.success) {
          processed++;
        } else {
          failed++;
        }
      }

      // Update batch status
      const finalStatus =
        failed === 0 ? 'completed' : processed === 0 ? 'failed' : 'partial';

      await supabase
        .from('batch_distributions')
        .update({
          status: finalStatus,
          completed_at: new Date().toISOString(),
        })
        .eq('id', batchId);

      console.log(
        `Batch ${batchId} completed: ${processed} successful, ${failed} failed`
      );
      return { success: processed > 0, processed, failed };
    } catch (error) {
      console.error('Error processing batch distribution:', error);
      return {
        success: false,
        processed: 0,
        failed: 0,
        error: `Batch processing failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /**
   * Get team distribution history
   */
  async getTeamDistributionHistory(
    teamId: string,
    limit: number = 50
  ): Promise<RewardDistribution[]> {
    try {
      const { data: distributions, error } = await supabase
        .from('reward_distributions')
        .select(
          `
          *,
          recipients:users!recipient_id(name, avatar),
          captains:users!captain_id(name)
        `
        )
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return distributions.map((d) => ({
        id: d.id,
        teamId: d.team_id,
        captainId: d.captain_id,
        recipientId: d.recipient_id,
        amount: d.amount,
        reason: d.reason,
        description: d.description,
        status: d.status,
        transactionId: d.transaction_id,
        createdAt: d.created_at,
        completedAt: d.completed_at,
        errorMessage: d.error_message,
      }));
    } catch (error) {
      console.error('Error getting distribution history:', error);
      return [];
    }
  }

  /**
   * Mark distribution as failed
   */
  private async markDistributionFailed(
    distributionId: string,
    errorMessage: string
  ): Promise<void> {
    try {
      await supabase
        .from('reward_distributions')
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', distributionId);

      console.log(
        `Distribution ${distributionId} marked as failed: ${errorMessage}`
      );
    } catch (error) {
      console.error('Error marking distribution as failed:', error);
    }
  }

  /**
   * Send reward notification to recipient
   */
  private async sendRewardNotification(
    recipientId: string,
    amount: number,
    reason: string
  ): Promise<void> {
    try {
      // TODO: Implement push notification service
      console.log(
        `Sending reward notification to ${recipientId}: ${amount} sats for ${reason}`
      );

      // This would integrate with your push notification service:
      // await pushNotificationService.send(recipientId, {
      //   title: 'Bitcoin Reward Received! ⚡',
      //   body: `You earned ${amount} sats for ${reason}`,
      //   data: { type: 'reward', amount, reason }
      // });
    } catch (error) {
      console.error('Error sending reward notification:', error);
    }
  }

  /**
   * Get distribution templates
   */
  getDistributionTemplates(): DistributionTemplate[] {
    return DISTRIBUTION_TEMPLATES;
  }
}

export default RewardDistributionService.getInstance();
