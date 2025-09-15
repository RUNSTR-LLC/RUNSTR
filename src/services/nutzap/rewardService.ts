/**
 * NutZap Reward Service
 * Simplified reward distribution using captain's personal NutZap wallet
 * Pure P2P Bitcoin payments without team wallets or backend
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import nutzapService from './nutzapService';
import NDK, { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk';

// Create NDK instance for publishing reward events
const ndk = new NDK({
  explicitRelayUrls: [
    'wss://relay.damus.io',
    'wss://relay.primal.net',
    'wss://nos.lol'
  ]
});

// Storage keys for reward history
const STORAGE_KEYS = {
  REWARD_HISTORY: '@runstr:reward_history',
  PENDING_REWARDS: '@runstr:pending_rewards',
} as const;

// Custom Nostr event kind for team rewards
const REWARD_EVENT_KIND = 9401; // Custom kind for RUNSTR rewards

export interface TeamReward {
  id: string;
  teamId: string;
  captainPubkey: string;
  recipientPubkey: string;
  amount: number; // sats
  reason: string;
  memo?: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
  txId?: string;
  error?: string;
}

export interface RewardTemplate {
  name: string;
  reason: string;
  defaultAmount: number;
  description: string;
}

// Simplified reward templates
export const REWARD_TEMPLATES: RewardTemplate[] = [
  {
    name: 'Challenge Winner',
    reason: 'challenge_winner',
    defaultAmount: 2500,
    description: 'Won team challenge',
  },
  {
    name: 'Weekly MVP',
    reason: 'weekly_mvp',
    defaultAmount: 5000,
    description: 'Most valuable player of the week',
  },
  {
    name: 'Consistency Bonus',
    reason: 'consistency',
    defaultAmount: 1000,
    description: 'Maintained workout streak',
  },
  {
    name: 'Event Participation',
    reason: 'event',
    defaultAmount: 500,
    description: 'Participated in team event',
  },
  {
    name: 'Custom Reward',
    reason: 'custom',
    defaultAmount: 1000,
    description: 'Custom reward from captain',
  },
];

class NutzapRewardService {
  private static instance: NutzapRewardService;

  private constructor() {}

  static getInstance(): NutzapRewardService {
    if (!NutzapRewardService.instance) {
      NutzapRewardService.instance = new NutzapRewardService();
    }
    return NutzapRewardService.instance;
  }

  /**
   * Send reward from captain's personal wallet to team member
   */
  async sendReward(
    teamId: string,
    recipientPubkey: string,
    amount: number,
    reason: string,
    memo?: string
  ): Promise<{ success: boolean; rewardId?: string; error?: string }> {
    try {
      console.log(`[RewardService] Sending ${amount} sats to ${recipientPubkey.slice(0, 8)}...`);

      // Create reward ID
      const rewardId = `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create reward record
      const reward: TeamReward = {
        id: rewardId,
        teamId,
        captainPubkey: '', // Will be set from wallet
        recipientPubkey,
        amount,
        reason,
        memo,
        timestamp: new Date(),
        status: 'pending',
      };

      // Save pending reward
      await this.savePendingReward(reward);

      // Send nutzap from captain's personal wallet
      const sendResult = await nutzapService.sendNutzap(
        recipientPubkey,
        amount,
        memo || `RUNSTR Team Reward: ${reason}`
      );

      if (sendResult.success) {
        // Update reward status
        reward.status = 'completed';
        reward.txId = `nutzap_${Date.now()}`;

        // Publish reward event to Nostr for transparency
        await this.publishRewardEvent(reward);

        // Save to history
        await this.saveRewardToHistory(reward);

        // Remove from pending
        await this.removePendingReward(rewardId);

        console.log(`[RewardService] ✅ Reward sent successfully: ${rewardId}`);
        return { success: true, rewardId };
      } else {
        // Update reward status
        reward.status = 'failed';
        reward.error = sendResult.error;

        // Save failed reward
        await this.saveRewardToHistory(reward);
        await this.removePendingReward(rewardId);

        console.error(`[RewardService] ❌ Reward failed: ${sendResult.error}`);
        return { success: false, error: sendResult.error };
      }
    } catch (error) {
      console.error('[RewardService] Error sending reward:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send reward',
      };
    }
  }

  /**
   * Send batch rewards to multiple team members
   */
  async sendBatchRewards(
    teamId: string,
    rewards: Array<{
      recipientPubkey: string;
      amount: number;
      reason: string;
      memo?: string;
    }>
  ): Promise<{
    success: boolean;
    successful: number;
    failed: number;
    results: Array<{ recipientPubkey: string; success: boolean; error?: string }>;
  }> {
    const results: Array<{ recipientPubkey: string; success: boolean; error?: string }> = [];
    let successful = 0;
    let failed = 0;

    for (const reward of rewards) {
      const result = await this.sendReward(
        teamId,
        reward.recipientPubkey,
        reward.amount,
        reward.reason,
        reward.memo
      );

      if (result.success) {
        successful++;
        results.push({ recipientPubkey: reward.recipientPubkey, success: true });
      } else {
        failed++;
        results.push({
          recipientPubkey: reward.recipientPubkey,
          success: false,
          error: result.error,
        });
      }

      // Small delay between sends to avoid overwhelming the mint
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return {
      success: successful > 0,
      successful,
      failed,
      results,
    };
  }

  /**
   * Get captain's current wallet balance
   */
  async getCaptainBalance(): Promise<number> {
    try {
      return await nutzapService.getBalance();
    } catch (error) {
      console.error('[RewardService] Error getting balance:', error);
      return 0;
    }
  }

  /**
   * Publish reward event to Nostr for transparency
   */
  private async publishRewardEvent(reward: TeamReward): Promise<void> {
    try {
      // Ensure NDK is connected
      if (!ndk.pool) {
        await ndk.connect();
      }

      const event = new NDKEvent(ndk);
      event.kind = REWARD_EVENT_KIND as NDKKind;
      event.content = JSON.stringify({
        teamId: reward.teamId,
        amount: reward.amount,
        reason: reward.reason,
        memo: reward.memo,
        timestamp: reward.timestamp.toISOString(),
      });
      event.tags = [
        ['p', reward.recipientPubkey], // Tag recipient
        ['t', reward.teamId], // Tag team
        ['amount', reward.amount.toString()],
        ['reason', reward.reason],
      ];

      await event.publish();
      console.log('[RewardService] Published reward event to Nostr');
    } catch (error) {
      console.error('[RewardService] Error publishing to Nostr:', error);
      // Non-fatal - reward still succeeded
    }
  }

  /**
   * Get reward history for a team
   */
  async getTeamRewardHistory(teamId: string, limit: number = 50): Promise<TeamReward[]> {
    try {
      const historyStr = await AsyncStorage.getItem(STORAGE_KEYS.REWARD_HISTORY);
      if (!historyStr) return [];

      const allHistory: TeamReward[] = JSON.parse(historyStr);
      return allHistory
        .filter(r => r.teamId === teamId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('[RewardService] Error loading history:', error);
      return [];
    }
  }

  /**
   * Get pending rewards
   */
  async getPendingRewards(): Promise<TeamReward[]> {
    try {
      const pendingStr = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_REWARDS);
      return pendingStr ? JSON.parse(pendingStr) : [];
    } catch (error) {
      console.error('[RewardService] Error loading pending rewards:', error);
      return [];
    }
  }

  /**
   * Save reward to history
   */
  private async saveRewardToHistory(reward: TeamReward): Promise<void> {
    try {
      const historyStr = await AsyncStorage.getItem(STORAGE_KEYS.REWARD_HISTORY);
      const history: TeamReward[] = historyStr ? JSON.parse(historyStr) : [];

      // Add new reward
      history.push(reward);

      // Keep only last 1000 rewards
      if (history.length > 1000) {
        history.splice(0, history.length - 1000);
      }

      await AsyncStorage.setItem(STORAGE_KEYS.REWARD_HISTORY, JSON.stringify(history));
    } catch (error) {
      console.error('[RewardService] Error saving to history:', error);
    }
  }

  /**
   * Save pending reward
   */
  private async savePendingReward(reward: TeamReward): Promise<void> {
    try {
      const pendingStr = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_REWARDS);
      const pending: TeamReward[] = pendingStr ? JSON.parse(pendingStr) : [];
      pending.push(reward);
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_REWARDS, JSON.stringify(pending));
    } catch (error) {
      console.error('[RewardService] Error saving pending reward:', error);
    }
  }

  /**
   * Remove pending reward
   */
  private async removePendingReward(rewardId: string): Promise<void> {
    try {
      const pendingStr = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_REWARDS);
      if (!pendingStr) return;

      const pending: TeamReward[] = JSON.parse(pendingStr);
      const filtered = pending.filter(r => r.id !== rewardId);
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_REWARDS, JSON.stringify(filtered));
    } catch (error) {
      console.error('[RewardService] Error removing pending reward:', error);
    }
  }

  /**
   * Get reward templates
   */
  getRewardTemplates(): RewardTemplate[] {
    return REWARD_TEMPLATES;
  }

  /**
   * Calculate total rewards sent by captain
   */
  async getCaptainRewardStats(captainPubkey: string): Promise<{
    totalSent: number;
    rewardCount: number;
    uniqueRecipients: number;
  }> {
    try {
      const historyStr = await AsyncStorage.getItem(STORAGE_KEYS.REWARD_HISTORY);
      if (!historyStr) {
        return { totalSent: 0, rewardCount: 0, uniqueRecipients: 0 };
      }

      const history: TeamReward[] = JSON.parse(historyStr);
      const captainRewards = history.filter(
        r => r.captainPubkey === captainPubkey && r.status === 'completed'
      );

      const totalSent = captainRewards.reduce((sum, r) => sum + r.amount, 0);
      const rewardCount = captainRewards.length;
      const uniqueRecipients = new Set(captainRewards.map(r => r.recipientPubkey)).size;

      return { totalSent, rewardCount, uniqueRecipients };
    } catch (error) {
      console.error('[RewardService] Error calculating stats:', error);
      return { totalSent: 0, rewardCount: 0, uniqueRecipients: 0 };
    }
  }
}

// Export singleton instance
export default NutzapRewardService.getInstance();