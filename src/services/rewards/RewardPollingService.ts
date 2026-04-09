/**
 * RewardPollingService - Poll Supabase for confirmed reward payments
 *
 * This service polls Supabase every 45 seconds when the app is in the foreground
 * to check for new confirmed reward payments. When payments are detected,
 * it shows appropriate toast notifications.
 *
 * ARCHITECTURE:
 * - Polls Supabase reward_payments table for new successful payments
 * - Per-user isolation via npub filtering and per-user storage keys
 * - Integrates with AppStateManager to pause when app is backgrounded
 * - Shows "Reward Received!" for user payments, "Reward Donated!" for charity payments
 * - Batches notifications if more than 3 payments arrive at once
 *
 * SECURITY:
 * - All queries filter by user's npub to ensure per-user isolation
 * - Last seen timestamp stored per-user: @runstr:last_seen_payment_timestamp:{pubkey}
 * - Cleanup on logout prevents cross-user leakage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupabaseRewardService, PaymentRecord } from './SupabaseRewardService';
import { RewardNotificationManager } from './RewardNotificationManager';
import { AppStateManager } from '../core/AppStateManager';
import { getCharityById } from '../../constants/charities';
import { SponsorService } from '../backend/SponsorService';

// Polling interval in milliseconds (45 seconds)
const POLLING_INTERVAL_MS = 45 * 1000;

// Batching threshold - if more than this many payments, show batch notification
const BATCH_THRESHOLD = 3;

// Storage key prefix for last seen timestamp (per-user)
const LAST_SEEN_KEY_PREFIX = '@runstr:last_seen_payment_timestamp:';

class RewardPollingServiceClass {
  private currentUserPubkey: string | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private appStateUnsubscribe: (() => void) | null = null;
  private isPolling: boolean = false;

  /**
   * Initialize the polling service for a specific user
   * Call this after user authentication
   *
   * @param userPubkey - The authenticated user's public key (hex format)
   */
  async initialize(userPubkey: string): Promise<void> {
    console.log('[RewardPollingService] Initializing for user:', userPubkey.slice(0, 8) + '...');

    // Clean up any existing polling
    this.cleanup();

    // Store current user
    this.currentUserPubkey = userPubkey;

    // Initialize last seen timestamp if not set
    await this.initializeLastSeenTimestamp();

    // Register for app state changes
    this.appStateUnsubscribe = AppStateManager.onStateChange((isActive) => {
      if (isActive) {
        console.log('[RewardPollingService] App foregrounded - resuming polling');
        this.startPolling();
        // Do an immediate check when app comes to foreground
        this.checkForNewPayments();
      } else {
        console.log('[RewardPollingService] App backgrounded - pausing polling');
        this.stopPolling();
      }
    });

    // Start polling if app is active
    if (AppStateManager.isActive()) {
      this.startPolling();
      // Do an initial check
      setTimeout(() => this.checkForNewPayments(), 2000);
    }

    console.log('[RewardPollingService] Initialized successfully');
  }

  /**
   * Initialize the last seen timestamp on first run
   * Sets it to the most recent payment to avoid backfill notifications
   */
  private async initializeLastSeenTimestamp(): Promise<void> {
    if (!this.currentUserPubkey) return;

    const storageKey = `${LAST_SEEN_KEY_PREFIX}${this.currentUserPubkey}`;
    const existingTimestamp = await AsyncStorage.getItem(storageKey);

    if (!existingTimestamp) {
      console.log('[RewardPollingService] First run - initializing last seen timestamp');

      // Use 24-hour lookback window instead of "most recent or now"
      // This ensures payments between app sessions are not missed
      const lookbackDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await AsyncStorage.setItem(storageKey, lookbackDate);
      console.log('[RewardPollingService] Initialized with 24h lookback to:', lookbackDate);
    } else {
      console.log('[RewardPollingService] Existing last seen timestamp:', existingTimestamp);
    }
  }

  /**
   * Start the polling interval
   */
  private startPolling(): void {
    if (this.pollingInterval) {
      return; // Already polling
    }

    console.log('[RewardPollingService] Starting polling every 45 seconds');
    this.isPolling = true;

    this.pollingInterval = setInterval(() => {
      if (AppStateManager.isActive() && this.currentUserPubkey) {
        this.checkForNewPayments();
      }
    }, POLLING_INTERVAL_MS);
  }

  /**
   * Stop the polling interval
   */
  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    console.log('[RewardPollingService] Polling stopped');
  }

  /**
   * Check for new payments since the last seen timestamp
   */
  private async checkForNewPayments(): Promise<void> {
    if (!this.currentUserPubkey) {
      console.warn('[RewardPollingService] No user pubkey - skipping check');
      return;
    }

    // Don't check if app is not active
    if (!AppStateManager.canDoNetworkOps()) {
      console.log('[RewardPollingService] Network ops blocked - skipping check');
      return;
    }

    try {
      const storageKey = `${LAST_SEEN_KEY_PREFIX}${this.currentUserPubkey}`;
      const lastSeenTimestamp = await AsyncStorage.getItem(storageKey);

      if (!lastSeenTimestamp) {
        console.warn('[RewardPollingService] No last seen timestamp - initializing');
        await this.initializeLastSeenTimestamp();
        return;
      }

      console.log('[RewardPollingService] Checking for payments since:', lastSeenTimestamp);

      // Query for new payments
      const newPayments = await SupabaseRewardService.getNewPaymentsSince(
        this.currentUserPubkey,
        lastSeenTimestamp
      );

      if (newPayments.length === 0) {
        console.log('[RewardPollingService] No new payments');
        return;
      }

      console.log(`[RewardPollingService] Found ${newPayments.length} new payment(s)`);

      // Update last seen timestamp to the most recent payment
      const mostRecentPayment = newPayments[0]; // Already sorted desc by paid_at
      await AsyncStorage.setItem(storageKey, mostRecentPayment.paid_at);

      // Show notifications
      await this.showNotifications(newPayments);
    } catch (error) {
      console.error('[RewardPollingService] Error checking for new payments:', error);
    }
  }

  /**
   * Show appropriate notifications for new payments
   */
  private async showNotifications(payments: PaymentRecord[]): Promise<void> {
    // Fetch active sponsor name (cached with 30min TTL via SponsorService)
    let sponsorName: string | undefined;
    try {
      const sponsor = await SponsorService.getActiveSponsor();
      sponsorName = sponsor.name;
    } catch {
      // Non-critical - notifications will just omit sponsor name
    }

    // If too many payments, show batch notification
    if (payments.length > BATCH_THRESHOLD) {
      const totalAmount = payments.reduce((sum, p) => sum + p.amount_sats, 0);
      // Check if any are charity payments (explicit or by lightning address)
      const charityPayments = payments.filter((p) => !!p.charity_id);
      const userPayments = payments.length - charityPayments.length;
      const charityTotal = charityPayments.reduce((sum, p) => sum + p.amount_sats, 0);
      const userTotal = totalAmount - charityTotal;

      if (charityPayments.length > 0 && userPayments > 0) {
        // Mixed batch - show both
        RewardNotificationManager.showBatchRewardsConfirmed(userPayments, userTotal, sponsorName);
        setTimeout(() => {
          RewardNotificationManager.showBatchRewardsDonated(charityPayments.length, charityTotal, sponsorName);
        }, 500);
      } else if (charityPayments.length > 0) {
        RewardNotificationManager.showBatchRewardsDonated(charityPayments.length, charityTotal, sponsorName);
      } else {
        RewardNotificationManager.showBatchRewardsConfirmed(payments.length, totalAmount, sponsorName);
      }
      return;
    }

    // Show individual notifications (up to BATCH_THRESHOLD)
    // Reverse to show oldest first (so newest is on top)
    const paymentsToShow = payments.slice(0, BATCH_THRESHOLD).reverse();

    paymentsToShow.forEach((payment, index) => {
      // Stagger notifications slightly to avoid overlap
      setTimeout(() => {
        if (payment.charity_id) {
          // Backend set charity_id explicitly — this is a real charity payment
          const charity = getCharityById(payment.charity_id);
          const charityName = charity?.name || payment.charity_id;
          RewardNotificationManager.showRewardDonated(payment.amount_sats, charityName, sponsorName);
        } else {
          // No charity_id = payment went to user
          RewardNotificationManager.showRewardConfirmed(payment.amount_sats, sponsorName);
        }
      }, index * 500);
    });
  }

  /**
   * Clean up the service (call on logout)
   */
  cleanup(): void {
    console.log('[RewardPollingService] Cleaning up');

    // Stop polling
    this.stopPolling();

    // Unsubscribe from app state changes
    if (this.appStateUnsubscribe) {
      this.appStateUnsubscribe();
      this.appStateUnsubscribe = null;
    }

    // Clear user reference
    this.currentUserPubkey = null;
  }

  /**
   * Check if service is currently polling
   */
  isActive(): boolean {
    return this.isPolling && this.currentUserPubkey !== null;
  }

  /**
   * Get debug info for troubleshooting
   */
  getDebugInfo(): {
    isPolling: boolean;
    hasUser: boolean;
    userPrefix: string | null;
  } {
    return {
      isPolling: this.isPolling,
      hasUser: this.currentUserPubkey !== null,
      userPrefix: this.currentUserPubkey ? this.currentUserPubkey.slice(0, 8) + '...' : null,
    };
  }
}

// Export singleton instance
export const RewardPollingService = new RewardPollingServiceClass();
export default RewardPollingService;
