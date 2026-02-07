/**
 * @deprecated - This service is DEPRECATED as of v3 architecture migration
 *
 * StepRewardService (DEPRECATED)
 *
 * Step rewards (5 sats per 1,000 steps) have been REMOVED to simplify fraud detection.
 * The only reward now is 50 sats per daily workout, handled by external service.
 *
 * REASON FOR REMOVAL:
 * - Step rewards were prone to gaming (fake step count imports)
 * - Having two reward types (workout + steps) complicated fraud detection
 * - Simplifying to one reward type (50 sats per workout) makes anti-cheat easier
 *
 * MIGRATION:
 * - All references to StepRewardService should be removed
 * - StepPollingService can be disabled or removed
 * - UI showing step rewards should be hidden
 *
 * This file is kept for reference but should not be imported.
 *
 * === ORIGINAL DOCUMENTATION (for reference) ===
 * Provided 5 sats per 1,000 steps, with 50 sat daily cap.
 * Used Supabase edge function for payment via NWC.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { REWARD_CONFIG } from '../../config/rewards';
import { supabase } from '../../utils/supabase';
import { RewardDestinationService } from './RewardDestinationService';
import { DonationTrackingService } from '../donation/DonationTrackingService';

// Step reward configuration
const STEP_CONFIG = {
  SATS_PER_MILESTONE: 5,        // 5 sats per 1k steps
  MILESTONE_INCREMENT: 1000,    // Every 1,000 steps
  MAX_DAILY_SATS: 50,           // Server-enforced cap (10 milestones max)
  ENABLED: true,
};

// Storage key patterns
const STORAGE_KEYS = {
  // Array of milestones rewarded today: [1000, 2000, 3000...]
  MILESTONES_TODAY: (pubkey: string, date: string) =>
    `@runstr:step_milestones:${date}:${pubkey}`,
  // Weekly step rewards total
  WEEKLY_REWARDS: (pubkey: string, weekKey: string) =>
    `@runstr:step_rewards_weekly:${pubkey}:${weekKey}`,
  // All-time step rewards total
  TOTAL_REWARDS: (pubkey: string) =>
    `@runstr:step_rewards_total:${pubkey}`,
};

export interface MilestoneReward {
  milestone: number;  // e.g., 5000
  amount: number;     // sats paid
  success: boolean;
  error?: string;
}

export interface StepRewardStats {
  todayMilestones: number[];
  todaySats: number;
  weeklySats: number;
  totalSats: number;
}

/**
 * Get today's date string in YYYY-MM-DD format (local timezone)
 */
function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Get current week key in YYYY-WXX format
 */
function getWeekKey(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

class StepRewardServiceClass {
  private static instance: StepRewardServiceClass;
  private isProcessing: boolean = false;

  private constructor() {
    console.log('[StepReward] Service initialized');
  }

  static getInstance(): StepRewardServiceClass {
    if (!StepRewardServiceClass.instance) {
      StepRewardServiceClass.instance = new StepRewardServiceClass();
    }
    return StepRewardServiceClass.instance;
  }

  /**
   * Check if step rewards are enabled
   */
  isEnabled(): boolean {
    return STEP_CONFIG.ENABLED && (REWARD_CONFIG as any).STEP_REWARDS_ENABLED !== false;
  }

  /**
   * Get milestones already rewarded today
   */
  async getRewardedMilestonesToday(userPubkey: string): Promise<number[]> {
    try {
      const dateKey = getTodayDateString();
      const storageKey = STORAGE_KEYS.MILESTONES_TODAY(userPubkey, dateKey);
      const stored = await AsyncStorage.getItem(storageKey);

      if (!stored) return [];

      const milestones = JSON.parse(stored);
      return Array.isArray(milestones) ? milestones : [];
    } catch (error) {
      console.error('[StepReward] Error getting rewarded milestones:', error);
      return [];
    }
  }

  /**
   * Mark a milestone as rewarded
   */
  private async markMilestoneRewarded(
    userPubkey: string,
    milestone: number
  ): Promise<void> {
    try {
      const dateKey = getTodayDateString();
      const storageKey = STORAGE_KEYS.MILESTONES_TODAY(userPubkey, dateKey);

      const existing = await this.getRewardedMilestonesToday(userPubkey);
      if (!existing.includes(milestone)) {
        existing.push(milestone);
        existing.sort((a, b) => a - b);
        await AsyncStorage.setItem(storageKey, JSON.stringify(existing));
        console.log(`[StepReward] Marked milestone ${milestone} as rewarded`);
      }
    } catch (error) {
      console.error('[StepReward] Error marking milestone:', error);
    }
  }

  /**
   * Call Supabase claim-reward edge function for step rewards
   * Server handles: eligibility check (50 sat cap), LNURL invoice, NWC payment
   */
  private async claimStepRewardViaSupabase(
    lightningAddress: string,
    amountSats: number
  ): Promise<{
    success: boolean;
    amount_paid?: number;
    reason?: string;
    remaining_step_allowance?: number;
  }> {
    try {
      if (!supabase) {
        console.error('[StepReward] Supabase not configured');
        return { success: false, reason: 'supabase_not_configured' };
      }

      console.log(`[StepReward] Calling claim-reward: steps ${amountSats} sats`);

      const { data, error } = await supabase.functions.invoke('claim-reward', {
        body: {
          lightning_address: lightningAddress,
          reward_type: 'steps',
          amount_sats: amountSats,
        },
      });

      if (error) {
        console.error('[StepReward] Supabase function error:', error);
        return { success: false, reason: 'supabase_error' };
      }

      console.log('[StepReward] claim-reward response:', data);
      return data;
    } catch (error) {
      console.error('[StepReward] Error calling claim-reward:', error);
      return { success: false, reason: 'network_error' };
    }
  }

  /**
   * Record charity payment to Supabase for audit trail
   * Non-blocking: failures are logged but don't affect user experience
   */
  private async recordCharityPaymentToSupabase(params: {
    userPubkey: string;
    charityId: string;
    charityName: string;
    charityLightningAddress: string;
    amountSats: number;
    rewardType: 'workout' | 'steps';
    donationPercentage: number;
    paymentHash?: string;
    preimage?: string;
  }): Promise<void> {
    try {
      if (!supabase) {
        console.log('[StepReward] Supabase not configured, skipping audit trail');
        return;
      }

      const { data, error } = await supabase.functions.invoke('claim-reward', {
        body: {
          operation: 'record_charity_payment',
          user_pubkey: params.userPubkey,
          charity_id: params.charityId,
          charity_name: params.charityName,
          charity_lightning_address: params.charityLightningAddress,
          amount_sats: params.amountSats,
          reward_type: params.rewardType,
          donation_percentage: params.donationPercentage,
          payment_hash: params.paymentHash,
          preimage: params.preimage,
        },
      });

      if (error) {
        console.error('[StepReward] Error recording charity payment:', error);
        return;
      }

      if (data?.success) {
        console.log('[StepReward] Charity payment recorded to Supabase:', data.payment_id);
      } else {
        console.log('[StepReward] Failed to record charity payment:', data?.reason);
      }
    } catch (error) {
      console.error('[StepReward] Exception recording charity payment:', error);
    }
  }

  /**
   * Log a failed charity payment to Supabase for monitoring and debugging.
   * This helps identify which charities have routing issues.
   * Non-blocking: failures are logged but don't affect user experience
   */
  private async logCharityPaymentFailure(params: {
    userPubkey: string;
    charityId: string;
    charityName: string;
    charityLightningAddress: string;
    amountSats: number;
    rewardType: 'workout' | 'steps';
    errorMessage: string;
    lnurlResponse?: Record<string, unknown>;
  }): Promise<void> {
    try {
      if (!supabase) {
        console.log('[StepReward] Supabase not configured, skipping failure logging');
        return;
      }

      const { data, error } = await supabase.functions.invoke('claim-reward', {
        body: {
          operation: 'log_charity_payment_failure',
          user_pubkey: params.userPubkey,
          charity_id: params.charityId,
          charity_name: params.charityName,
          charity_lightning_address: params.charityLightningAddress,
          amount_sats: params.amountSats,
          reward_type: params.rewardType,
          error_message: params.errorMessage,
          lnurl_response: params.lnurlResponse,
        },
      });

      if (error) {
        console.error('[StepReward] Error logging charity payment failure:', error);
        return;
      }

      if (data?.success) {
        console.log('[StepReward] Charity payment failure logged:', data.failure_id);
      } else {
        console.log('[StepReward] Failed to log charity payment failure:', data?.reason);
      }
    } catch (error) {
      console.error('[StepReward] Exception logging charity payment failure:', error);
    }
  }

  /**
   * Pay a milestone reward via Supabase
   * Server handles invoice request and NWC payment with 50 sat daily cap
   *
   * Uses unified RewardDestinationService for destination logic:
   * - If toggle ON + user has Lightning address → user gets reward
   * - Otherwise → charity gets reward (charity is always the fallback)
   */
  private async payMilestoneReward(
    userPubkey: string,
    milestone: number
  ): Promise<MilestoneReward> {
    const amount = STEP_CONFIG.SATS_PER_MILESTONE;

    // Get unified destination (user OR charity)
    let destination: {
      address: string;
      isCharity: boolean;
      charityName: string;
      charityId: string;
    };

    try {
      destination = await RewardDestinationService.getDestinationAddress();

      console.log(`[StepReward] Destination for milestone ${milestone}:`, {
        address: destination.address,
        isCharity: destination.isCharity,
        charityName: destination.charityName,
      });

      // Call Supabase to handle payment (server enforces 50 sat cap)
      const result = await this.claimStepRewardViaSupabase(destination.address, amount);

      if (result.success) {
        const amountPaid = result.amount_paid || amount;
        console.log(
          `[StepReward] ✅ Milestone ${milestone} paid: ${amountPaid} sats to ${destination.isCharity ? destination.charityName : 'user'}`
        );

        // Track charity donation for impact score
        if (destination.isCharity) {
          // Record locally for Impact Level XP
          try {
            await DonationTrackingService.recordDonation({
              donorPubkey: userPubkey,
              amount: amountPaid,
              charityId: destination.charityId,
              charityName: destination.charityName,
            });
            console.log(`[StepReward] ✅ Donation recorded for impact: ${amountPaid} sats to ${destination.charityName}`);
          } catch (trackingError) {
            console.error('[StepReward] Failed to record donation for impact:', trackingError);
          }

          // Record to Supabase for audit trail
          try {
            await this.recordCharityPaymentToSupabase({
              userPubkey,
              charityId: destination.charityId,
              charityName: destination.charityName,
              charityLightningAddress: destination.address,
              amountSats: amountPaid,
              rewardType: 'steps',
              donationPercentage: 100,
            });
          } catch (recordError) {
            console.error('[StepReward] Failed to record charity payment to Supabase:', recordError);
          }
        }

        // Show toast with charity name when appropriate
        this.showRewardToast(
          milestone,
          amountPaid,
          destination.isCharity ? destination.charityName : undefined
        );

        return { milestone, amount: amountPaid, success: true };
      }

      // Check if daily cap reached
      if (result.reason === 'daily_cap_reached') {
        console.log('[StepReward] Daily step cap reached (50 sats)');
        return {
          milestone,
          amount: 0,
          success: false,
          error: 'Daily cap reached',
        };
      }

      // Log charity payment failure for monitoring
      if (destination.isCharity) {
        try {
          await this.logCharityPaymentFailure({
            userPubkey,
            charityId: destination.charityId,
            charityName: destination.charityName,
            charityLightningAddress: destination.address,
            amountSats: amount,
            rewardType: 'steps',
            errorMessage: result.reason || 'Payment failed',
          });
        } catch (logError) {
          console.error('[StepReward] Failed to log charity payment failure:', logError);
        }
      }

      return {
        milestone,
        amount,
        success: false,
        error: result.reason || 'Payment failed',
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[StepReward] Error paying milestone ${milestone}:`, error);

      return {
        milestone,
        amount,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Update weekly and total reward counters
   */
  private async updateRewardCounters(
    userPubkey: string,
    satsEarned: number
  ): Promise<void> {
    try {
      const weekKey = getWeekKey();
      const weeklyKey = STORAGE_KEYS.WEEKLY_REWARDS(userPubkey, weekKey);
      const totalKey = STORAGE_KEYS.TOTAL_REWARDS(userPubkey);

      // Update weekly
      const weeklyStr = await AsyncStorage.getItem(weeklyKey);
      const weekly = weeklyStr ? parseInt(weeklyStr) : 0;
      await AsyncStorage.setItem(weeklyKey, String(weekly + satsEarned));

      // Update total
      const totalStr = await AsyncStorage.getItem(totalKey);
      const total = totalStr ? parseInt(totalStr) : 0;
      await AsyncStorage.setItem(totalKey, String(total + satsEarned));

      console.log(`[StepReward] Updated counters: +${satsEarned} sats`);
    } catch (error) {
      console.error('[StepReward] Error updating counters:', error);
    }
  }

  /**
   * Show toast notification for step rewards
   * Shows charity name when rewards go to charity
   */
  private showRewardToast(milestone: number, amount: number, charityName?: string): void {
    Toast.show({
      type: 'stepReward',
      text1: charityName ? `+${amount} sats for ${charityName}!` : `+${amount} sats!`,
      text2: `${milestone.toLocaleString()} steps reached`,
      position: 'top',
      visibilityTime: 4000,
    });
  }

  /**
   * Main method: Check current steps and reward any new milestones
   * Call this periodically while app is active
   *
   * @param currentSteps - Current step count from DailyStepCounterService
   * @param userPubkey - User's public key
   * @returns Array of milestone rewards (successful and failed)
   */
  async checkAndRewardMilestones(
    currentSteps: number,
    userPubkey: string
  ): Promise<MilestoneReward[]> {
    // Skip if disabled
    if (!this.isEnabled()) {
      return [];
    }

    // Skip if no steps or no user
    if (!currentSteps || currentSteps <= 0 || !userPubkey) {
      return [];
    }

    // Prevent concurrent processing
    if (this.isProcessing) {
      console.log('[StepReward] Already processing, skipping');
      return [];
    }

    this.isProcessing = true;
    const rewards: MilestoneReward[] = [];

    try {
      // Calculate which milestones the user has reached (1000, 2000, 3000...)
      const reachedMilestones: number[] = [];
      for (let m = STEP_CONFIG.MILESTONE_INCREMENT; m <= currentSteps; m += STEP_CONFIG.MILESTONE_INCREMENT) {
        reachedMilestones.push(m);
      }

      if (reachedMilestones.length === 0) {
        return [];
      }

      // Get already rewarded milestones
      const alreadyRewarded = await this.getRewardedMilestonesToday(userPubkey);

      // Find new milestones to reward
      const newMilestones = reachedMilestones.filter(m => !alreadyRewarded.includes(m));

      if (newMilestones.length === 0) {
        return [];
      }

      console.log(`[StepReward] New milestones to reward: ${newMilestones.join(', ')}`);

      // Process each new milestone (stop if daily cap reached)
      let totalEarned = 0;
      let dailyCapReached = false;

      for (const milestone of newMilestones) {
        // Skip remaining milestones if cap reached
        if (dailyCapReached) {
          console.log(`[StepReward] Skipping milestone ${milestone} - daily cap reached`);
          break;
        }

        const result = await this.payMilestoneReward(userPubkey, milestone);
        rewards.push(result);

        if (result.success) {
          // Mark as rewarded ONLY on success
          await this.markMilestoneRewarded(userPubkey, milestone);
          totalEarned += result.amount;
          // Toast is shown inside payMilestoneReward with charity name
        } else if (result.error === 'Daily cap reached') {
          // Server said cap reached, stop processing
          dailyCapReached = true;
        }
      }

      // Update counters if any rewards were paid
      if (totalEarned > 0) {
        await this.updateRewardCounters(userPubkey, totalEarned);
      }

      return rewards;
    } catch (error) {
      console.error('[StepReward] Error in checkAndRewardMilestones:', error);
      return rewards;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get step reward statistics for display
   */
  async getStats(userPubkey: string): Promise<StepRewardStats> {
    try {
      const todayMilestones = await this.getRewardedMilestonesToday(userPubkey);
      const todaySats = todayMilestones.length * STEP_CONFIG.SATS_PER_MILESTONE;

      // Get weekly total
      const weekKey = getWeekKey();
      const weeklyKey = STORAGE_KEYS.WEEKLY_REWARDS(userPubkey, weekKey);
      const weeklyStr = await AsyncStorage.getItem(weeklyKey);
      const weeklySats = weeklyStr ? parseInt(weeklyStr) : 0;

      // Get all-time total
      const totalKey = STORAGE_KEYS.TOTAL_REWARDS(userPubkey);
      const totalStr = await AsyncStorage.getItem(totalKey);
      const totalSats = totalStr ? parseInt(totalStr) : 0;

      return {
        todayMilestones,
        todaySats,
        weeklySats,
        totalSats,
      };
    } catch (error) {
      console.error('[StepReward] Error getting stats:', error);
      return {
        todayMilestones: [],
        todaySats: 0,
        weeklySats: 0,
        totalSats: 0,
      };
    }
  }

  /**
   * Get the next milestone and steps remaining
   */
  getNextMilestone(currentSteps: number): { nextMilestone: number; stepsRemaining: number } {
    const nextMilestone = Math.ceil((currentSteps + 1) / STEP_CONFIG.MILESTONE_INCREMENT) * STEP_CONFIG.MILESTONE_INCREMENT;
    const stepsRemaining = nextMilestone - currentSteps;
    return { nextMilestone, stepsRemaining };
  }

  /**
   * Get reward amount per milestone
   */
  getRewardAmount(): number {
    return STEP_CONFIG.SATS_PER_MILESTONE;
  }

  /**
   * Get milestone increment
   */
  getMilestoneIncrement(): number {
    return STEP_CONFIG.MILESTONE_INCREMENT;
  }

  /**
   * Get max daily sats from step rewards
   */
  getMaxDailySats(): number {
    return STEP_CONFIG.MAX_DAILY_SATS;
  }
}

// Export singleton instance
export const StepRewardService = StepRewardServiceClass.getInstance();
export default StepRewardService;
