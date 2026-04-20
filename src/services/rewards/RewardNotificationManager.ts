/**
 * RewardNotificationManager - Imperative API for reward notifications
 * Uses Toast for non-blocking notifications that don't conflict with modals
 *
 * Only shows CONFIRMED payment notifications from RewardPollingService:
 * - showRewardConfirmed() — "Reward Received!" (payment sent to user's wallet)
 * - showRewardDonated() — "Reward Donated!" (payment sent to charity)
 * - showBatchRewardsConfirmed() — batch notification for 3+ payments
 * - showPledgeRewardSent() / showPledgeCompleted() — pledge notifications
 */

import Toast from 'react-native-toast-message';

/**
 * @deprecated Use charityName?: string instead
 * Kept for backwards compatibility during transition
 */
export interface DonationSplit {
  userAmount: number;
  charityAmount: number;
  charityName?: string;
}

/**
 * Pledge progress info for reward notifications
 */
export interface PledgeInfo {
  eventName: string;
  recipientName: string;
  completedWorkouts: number;
  totalWorkouts: number;
  isComplete: boolean;
}

export interface RewardNotificationState {
  visible: boolean;
  amount: number;
  charityName?: string;
  /** If set, this is a pledge reward notification */
  pledgeInfo?: PledgeInfo;
}

type NotificationCallback = (state: RewardNotificationState) => void;

class RewardNotificationManagerClass {
  // Keep callback for backwards compatibility with RewardNotificationProvider
  // But Toast is now the primary notification method
  private callback: NotificationCallback | null = null;

  /**
   * Register a callback from the RewardNotificationProvider
   * Called automatically when the provider mounts
   * @deprecated Toast is now used instead - this is kept for backwards compatibility
   */
  register(callback: NotificationCallback): void {
    this.callback = callback;
  }

  /**
   * Unregister the callback when provider unmounts
   * @deprecated Toast is now used instead - this is kept for backwards compatibility
   */
  unregister(): void {
    this.callback = null;
  }

  /**
   * Hide the notification
   * @deprecated Toast auto-dismisses - this is kept for backwards compatibility
   */
  hide(): void {
    Toast.hide();
  }

  /**
   * Show a pledge reward notification as a non-blocking toast
   * Called when a daily reward is routed to a pledge destination
   *
   * @param amount - Amount of sats sent (usually 50)
   * @param eventName - Name of the event the pledge is for
   * @param recipientName - Name of recipient (captain or charity name)
   * @param completedWorkouts - Number of workouts completed after this one
   * @param totalWorkouts - Total workouts required for pledge
   */
  showPledgeRewardSent(
    amount: number,
    eventName: string,
    recipientName: string,
    completedWorkouts: number,
    totalWorkouts: number
  ): void {
    const isComplete = completedWorkouts >= totalWorkouts;
    const progress = `${completedWorkouts}/${totalWorkouts}`;

    let title = 'Pledge Reward Sent!';
    let subtitle = `+${amount} sats to ${recipientName} (${progress})`;

    if (isComplete) {
      title = 'Pledge Complete!';
      subtitle = `${eventName} - ${amount} sats sent to ${recipientName}`;
    }

    Toast.show({
      type: 'pledge',
      text1: title,
      text2: subtitle,
      position: 'top',
      visibilityTime: isComplete ? 6000 : 5000, // Show longer for completion
    });
  }

  /**
   * Show a pledge completion notification
   * Called when user completes all pledged workouts
   *
   * @param eventName - Name of the event
   * @param totalSats - Total sats sent over all pledge workouts
   * @param recipientName - Name of recipient
   */
  showPledgeCompleted(
    eventName: string,
    totalSats: number,
    recipientName: string
  ): void {
    // Use the same notification but with isComplete flag
    this.showPledgeRewardSent(
      totalSats,
      eventName,
      recipientName,
      1, // Completed
      1 // Of 1 (100%)
    );
  }

  /**
   * Show confirmed reward notification (payment received)
   * Called when Supabase confirms the payment was actually sent to user's wallet
   *
   * @param amount - Amount of sats received
   */
  showRewardConfirmed(amount: number, sponsorName?: string): void {
    console.log('[RewardNotification] showRewardConfirmed called:', { amount });
    Toast.show({
      type: 'rewardConfirmed',
      text1: 'Reward Received!',
      text2: `You earned ${amount} sats`,
      position: 'top',
      visibilityTime: 5000,
    });
  }

  /**
   * Show confirmed donation notification (payment sent to charity)
   * Called when Supabase confirms the payment was actually sent to charity
   *
   * @param amount - Amount of sats donated
   * @param charityName - Name of the charity that received the donation
   */
  showRewardDonated(amount: number, charityName: string, sponsorName?: string): void {
    console.log('[RewardNotification] showRewardDonated called:', { amount, charityName });
    Toast.show({
      type: 'rewardDonated',
      text1: 'Reward Received!',
      text2: `You earned ${amount} sats`,
      position: 'top',
      visibilityTime: 5000,
    });
  }

  /**
   * Show batch donation notification (multiple payments sent to charities)
   * Called when multiple charity payments are detected at once
   *
   * @param count - Number of charity payments
   * @param totalAmount - Total amount of sats donated
   */
  showBatchRewardsDonated(count: number, totalAmount: number, sponsorName?: string): void {
    console.log('[RewardNotification] showBatchRewardsDonated called:', { count, totalAmount });
    Toast.show({
      type: 'rewardDonated',
      text1: 'Rewards Received!',
      text2: `You earned ${totalAmount} sats`,
      position: 'top',
      visibilityTime: 6000,
    });
  }

  /**
   * Show batch rewards confirmed notification
   * Called when multiple payments are detected at once (prevents toast spam)
   *
   * @param count - Number of payments received
   * @param totalAmount - Total amount of sats received
   */
  showBatchRewardsConfirmed(count: number, totalAmount: number, sponsorName?: string): void {
    console.log('[RewardNotification] showBatchRewardsConfirmed called:', { count, totalAmount });
    Toast.show({
      type: 'rewardConfirmed',
      text1: 'Rewards Received!',
      text2: `You earned ${totalAmount} sats`,
      position: 'top',
      visibilityTime: 6000,
    });
  }
}

// Export singleton instance
export const RewardNotificationManager = new RewardNotificationManagerClass();
export default RewardNotificationManager;
