/**
 * SupabaseRewardService - Query verified reward payments from Supabase
 *
 * This service queries the reward_payments table populated by the external
 * reward payment tool. It provides:
 * - Verified payment history
 * - User vs charity split breakdown
 * - Pending status for Geyser Fund payments
 * - Verified totals for Impact Level (only payments with preimage proof)
 *
 * SECURITY: Only counts payments with valid preimage as verified.
 * Preimages are cryptographic proof that can't be faked.
 */

import { supabase, isSupabaseConfigured } from '../../utils/supabase';
import { nip19 } from '@nostr-dev-kit/ndk';
import { getCharityByLightningAddress } from '../../constants/charities';

// Geyser Fund charity IDs (payments to these may be pending)
const GEYSER_CHARITY_IDS = ['ashigaru', 'bitcoin-yucatan', 'buho-go', 'wesatoshi'];

// Bound history queries to avoid unbounded payloads on high-activity accounts
const MAX_PAYMENT_HISTORY_ROWS = 200;

export interface PaymentRecord {
  id: string;
  npub: string;
  lightning_address: string;
  amount_sats: number;
  reward_type: string;
  is_ein_bonus: boolean;
  charity_id: string | null;
  payment_hash: string | null;
  preimage: string | null;
  status: 'success' | 'pending' | 'failed';
  error_message: string | null;
  paid_at: string;
}

export interface RewardBreakdown {
  totalSent: number;
  sentToUser: number;
  sentToCharity: number;
  pendingToCharity: number;
  paymentCount: number;
  charityBreakdown: CharityPaymentSummary[];
}

export interface CharityPaymentSummary {
  charityId: string;
  amount: number;
  status: 'success' | 'pending' | 'partial';
  isGeyser: boolean;
}

class SupabaseRewardServiceClass {
  /**
   * Get all payments for a user from reward_payments table
   */
  async getPaymentHistory(pubkey: string): Promise<PaymentRecord[]> {
    if (!isSupabaseConfigured() || !supabase) {
      console.warn('[SupabaseRewardService] Supabase not configured');
      return [];
    }

    try {
      // Convert hex pubkey to npub
      const npub = pubkey.startsWith('npub') ? pubkey : nip19.npubEncode(pubkey);

      const { data, error } = await supabase
        .from('reward_payments')
        .select('*')
        .eq('npub', npub)
        .order('paid_at', { ascending: false })
        .limit(MAX_PAYMENT_HISTORY_ROWS);

      if (error) {
        console.error('[SupabaseRewardService] Error fetching payment history:', error);
        return [];
      }

      return (data || []) as PaymentRecord[];
    } catch (error) {
      console.error('[SupabaseRewardService] getPaymentHistory error:', error);
      return [];
    }
  }

  /**
   * Get reward breakdown: user vs charity, including pending amounts
   */
  async getRewardBreakdown(pubkey: string): Promise<RewardBreakdown> {
    const payments = await this.getPaymentHistory(pubkey);

    let sentToUser = 0;
    let sentToCharity = 0;
    let pendingToCharity = 0;
    const charityMap = new Map<string, { amount: number; status: 'success' | 'pending' | 'partial' }>();

    for (const payment of payments) {
      // Resolve charity: explicit charity_id first, then fallback to lightning address match
      let effectiveCharityId = payment.charity_id;
      if (!effectiveCharityId) {
        const charityByAddress = getCharityByLightningAddress(payment.lightning_address);
        if (charityByAddress) {
          effectiveCharityId = charityByAddress.id;
        }
      }

      if (effectiveCharityId) {
        // Payment went to charity
        if (payment.status === 'success') {
          sentToCharity += payment.amount_sats;
        } else if (payment.status === 'pending') {
          pendingToCharity += payment.amount_sats;
        }

        // Aggregate by charity
        const existing = charityMap.get(effectiveCharityId) || { amount: 0, status: 'success' as const };
        existing.amount += payment.amount_sats;

        // Mark as pending if any payment is pending, partial if mixed
        if (payment.status === 'pending') {
          existing.status = existing.status === 'success' ? 'pending' : 'partial';
        } else if (existing.status === 'pending' && payment.status === 'success') {
          existing.status = 'partial';
        }

        charityMap.set(effectiveCharityId, existing);
      } else {
        // Payment went to user
        if (payment.status === 'success') {
          sentToUser += payment.amount_sats;
        }
      }
    }

    // Build charity breakdown with Geyser flag
    const charityBreakdown: CharityPaymentSummary[] = Array.from(charityMap.entries()).map(
      ([charityId, data]) => ({
        charityId,
        amount: data.amount,
        status: data.status,
        isGeyser: GEYSER_CHARITY_IDS.includes(charityId),
      })
    );

    return {
      totalSent: sentToUser + sentToCharity,
      sentToUser,
      sentToCharity,
      pendingToCharity,
      paymentCount: payments.length,
      charityBreakdown,
    };
  }

  /**
   * Get verified total for Impact Level - ONLY with preimage proof
   * Preimage is cryptographic proof that can't be faked
   */
  async getVerifiedTotal(pubkey: string): Promise<number> {
    if (!isSupabaseConfigured() || !supabase) {
      console.warn('[SupabaseRewardService] Supabase not configured');
      return 0;
    }

    try {
      // Convert hex pubkey to npub
      const npub = pubkey.startsWith('npub') ? pubkey : nip19.npubEncode(pubkey);

      const { data, error } = await supabase
        .from('reward_payments')
        .select('amount_sats')
        .eq('npub', npub)
        .eq('status', 'success')
        .not('preimage', 'is', null);

      if (error) {
        console.error('[SupabaseRewardService] Error fetching verified total:', error);
        return 0;
      }

      return (data || []).reduce((sum, record) => sum + (record.amount_sats || 0), 0);
    } catch (error) {
      console.error('[SupabaseRewardService] getVerifiedTotal error:', error);
      return 0;
    }
  }

  /**
   * Get pending Geyser payments for a user
   */
  async getPendingGeyserPayments(pubkey: string): Promise<PaymentRecord[]> {
    if (!isSupabaseConfigured() || !supabase) {
      console.warn('[SupabaseRewardService] Supabase not configured');
      return [];
    }

    try {
      // Convert hex pubkey to npub
      const npub = pubkey.startsWith('npub') ? pubkey : nip19.npubEncode(pubkey);

      const { data, error } = await supabase
        .from('reward_payments')
        .select('*')
        .eq('npub', npub)
        .eq('status', 'pending')
        .ilike('lightning_address', '%@geyser.fund');

      if (error) {
        console.error('[SupabaseRewardService] Error fetching pending Geyser payments:', error);
        return [];
      }

      return (data || []) as PaymentRecord[];
    } catch (error) {
      console.error('[SupabaseRewardService] getPendingGeyserPayments error:', error);
      return [];
    }
  }

  /**
   * Check if charity is a Geyser Fund charity
   */
  isGeyserCharity(charityId: string): boolean {
    return GEYSER_CHARITY_IDS.includes(charityId);
  }

  /**
   * Get new successful payments since a given timestamp for a specific user
   * IMPORTANT: Filters by npub to ensure per-user isolation
   *
   * @param pubkey - User's public key (hex or npub format)
   * @param sinceTimestamp - ISO timestamp to get payments after
   * @returns Array of payment records since the timestamp
   */
  async getNewPaymentsSince(pubkey: string, sinceTimestamp: string): Promise<PaymentRecord[]> {
    if (!isSupabaseConfigured() || !supabase) {
      console.warn('[SupabaseRewardService] Supabase not configured');
      return [];
    }

    try {
      // Convert hex pubkey to npub
      const npub = pubkey.startsWith('npub') ? pubkey : nip19.npubEncode(pubkey);

      const { data, error } = await supabase
        .from('reward_payments')
        .select('*')
        .eq('npub', npub)
        .eq('status', 'success')
        .gt('paid_at', sinceTimestamp)
        .order('paid_at', { ascending: false })
        .limit(MAX_PAYMENT_HISTORY_ROWS);

      if (error) {
        console.error('[SupabaseRewardService] Error fetching new payments:', error);
        return [];
      }

      return (data || []) as PaymentRecord[];
    } catch (error) {
      console.error('[SupabaseRewardService] getNewPaymentsSince error:', error);
      return [];
    }
  }

  /**
   * Get the timestamp of the most recent successful payment for a specific user
   * Used to initialize the "last seen" timestamp on first run
   *
   * @param pubkey - User's public key (hex or npub format)
   * @returns ISO timestamp of the most recent payment, or null if no payments
   */
  async getMostRecentPaymentTimestamp(pubkey: string): Promise<string | null> {
    if (!isSupabaseConfigured() || !supabase) {
      console.warn('[SupabaseRewardService] Supabase not configured');
      return null;
    }

    try {
      // Convert hex pubkey to npub
      const npub = pubkey.startsWith('npub') ? pubkey : nip19.npubEncode(pubkey);

      const { data, error } = await supabase
        .from('reward_payments')
        .select('paid_at')
        .eq('npub', npub)
        .eq('status', 'success')
        .order('paid_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('[SupabaseRewardService] Error fetching most recent payment:', error);
        return null;
      }

      if (data && data.length > 0) {
        return data[0].paid_at;
      }

      return null;
    } catch (error) {
      console.error('[SupabaseRewardService] getMostRecentPaymentTimestamp error:', error);
      return null;
    }
  }

  /**
   * Get count of verified payments (with preimage)
   */
  async getVerifiedPaymentCount(pubkey: string): Promise<number> {
    if (!isSupabaseConfigured() || !supabase) {
      return 0;
    }

    try {
      const npub = pubkey.startsWith('npub') ? pubkey : nip19.npubEncode(pubkey);

      const { count, error } = await supabase
        .from('reward_payments')
        .select('*', { count: 'exact', head: true })
        .eq('npub', npub)
        .eq('status', 'success')
        .not('preimage', 'is', null);

      if (error) {
        console.error('[SupabaseRewardService] Error fetching verified count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('[SupabaseRewardService] getVerifiedPaymentCount error:', error);
      return 0;
    }
  }

  /**
   * Get current rewards pool balance from Supabase
   */
  async getRewardsPoolBalance(): Promise<{ balance: number; totalPaid: number; paymentCount: number } | null> {
    if (!isSupabaseConfigured() || !supabase) {
      console.warn('[SupabaseRewardService] Supabase not configured');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('rewards_pool')
        .select('balance_sats, total_paid_sats, payment_count')
        .single();

      if (error) {
        console.error('[SupabaseRewardService] Error fetching pool balance:', error);
        return null;
      }

      return {
        balance: data?.balance_sats ?? 0,
        totalPaid: data?.total_paid_sats ?? 0,
        paymentCount: data?.payment_count ?? 0,
      };
    } catch (error) {
      console.error('[SupabaseRewardService] getRewardsPoolBalance error:', error);
      return null;
    }
  }
}

// Export singleton instance
export const SupabaseRewardService = new SupabaseRewardServiceClass();
export default SupabaseRewardService;
