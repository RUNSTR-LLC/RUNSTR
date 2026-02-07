/**
 * RewardsTransparencyService - Query reward transparency data from Supabase
 *
 * Provides access to:
 * - Current rewards pool status
 * - Period-based reward summaries (daily/weekly/monthly/all-time)
 * - Charity payout leaderboard
 * - Pending batch payouts (Geyser accumulator)
 *
 * All tables are read-only from the app, populated by external watcher service.
 */

import { supabase, isSupabaseConfigured } from '../../utils/supabase';
import type {
  PeriodType,
  PoolStatus,
  RewardsSummary,
  CharityPayout,
  PendingBatchPayout,
  DashboardData,
} from '../../types/transparencyDashboard';
import {
  isBatchPaymentCharity,
  getBatchPaymentConfig,
} from '../../config/charityPayments';

class RewardsTransparencyServiceClass {
  /**
   * Get current rewards pool status
   */
  async getPoolStatus(): Promise<PoolStatus | null> {
    if (!isSupabaseConfigured() || !supabase) {
      console.warn('[RewardsTransparencyService] Supabase not configured');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('rewards_pool')
        .select('balance_sats, total_paid_sats, payment_count, last_updated_at')
        .single();

      if (error) {
        console.error('[RewardsTransparencyService] Error fetching pool status:', error);
        return null;
      }

      return {
        balance: data?.balance_sats ?? 0,
        totalPaid: data?.total_paid_sats ?? 0,
        paymentCount: data?.payment_count ?? 0,
        lastUpdatedAt: data?.last_updated_at ?? null,
      };
    } catch (error) {
      console.error('[RewardsTransparencyService] getPoolStatus error:', error);
      return null;
    }
  }

  /**
   * Get rewards summary for a specific period
   */
  async getSummary(periodType: PeriodType): Promise<RewardsSummary | null> {
    if (!isSupabaseConfigured() || !supabase) {
      console.warn('[RewardsTransparencyService] Supabase not configured');
      return null;
    }

    try {
      // For all_time, get the single all_time record
      // For other periods, get the most recent record for that period type
      const { data, error } = await supabase
        .from('rewards_summary')
        .select('*')
        .eq('period_type', periodType)
        .order('period_start', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // No data yet is not an error
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('[RewardsTransparencyService] Error fetching summary:', error);
        return null;
      }

      return {
        periodType: data.period_type,
        periodStart: data.period_start,
        totalPaidSats: data.total_paid_sats,
        totalRecipients: data.total_recipients,
        directToUsersSats: data.direct_to_users_sats,
        directToUsersCount: data.direct_to_users_count,
        donatedToCharitySats: data.donated_to_charity_sats,
        donatedToCharityCount: data.donated_to_charity_count,
        failedPaymentSats: data.failed_payment_sats,
        failedPaymentCount: data.failed_payment_count,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('[RewardsTransparencyService] getSummary error:', error);
      return null;
    }
  }

  /**
   * Get charity leaderboard for a specific period
   */
  async getCharityLeaderboard(
    periodType: PeriodType,
    limit: number = 10
  ): Promise<CharityPayout[]> {
    if (!isSupabaseConfigured() || !supabase) {
      console.warn('[RewardsTransparencyService] Supabase not configured');
      return [];
    }

    try {
      // Get most recent period start for this period type
      const { data: periodData, error: periodError } = await supabase
        .from('charity_payouts')
        .select('period_start')
        .eq('period_type', periodType)
        .order('period_start', { ascending: false })
        .limit(1);

      if (periodError || !periodData || periodData.length === 0) {
        return [];
      }

      const latestPeriodStart = periodData[0].period_start;

      // Get charity payouts for this period, ordered by total sats
      const { data, error } = await supabase
        .from('charity_payouts')
        .select('charity_id, charity_name, period_type, period_start, total_sats, payment_count')
        .eq('period_type', periodType)
        .eq('period_start', latestPeriodStart)
        .order('total_sats', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[RewardsTransparencyService] Error fetching charity leaderboard:', error);
        return [];
      }

      return (data || []).map((row) => ({
        charityId: row.charity_id,
        charityName: row.charity_name,
        periodType: row.period_type,
        periodStart: row.period_start,
        totalSats: row.total_sats,
        paymentCount: row.payment_count,
      }));
    } catch (error) {
      console.error('[RewardsTransparencyService] getCharityLeaderboard error:', error);
      return [];
    }
  }

  /**
   * Get all pending batch payouts (Geyser accumulator)
   * Only shows charities configured in BATCH_PAYMENT_CHARITIES
   * Uses config thresholds (not database values) for display consistency
   */
  async getPendingBatchPayouts(): Promise<PendingBatchPayout[]> {
    if (!isSupabaseConfigured() || !supabase) {
      console.warn('[RewardsTransparencyService] Supabase not configured');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('pending_batch_payouts')
        .select('*')
        .order('progress_percent', { ascending: false });

      if (error) {
        console.error('[RewardsTransparencyService] Error fetching pending payouts:', error);
        return [];
      }

      // Filter to only show charities configured in BATCH_PAYMENT_CHARITIES
      // and use config thresholds (not database values) for display
      return (data || [])
        .filter((row) => isBatchPaymentCharity(row.charity_id))
        .map((row) => {
          const config = getBatchPaymentConfig(row.charity_id);
          const minimumSats = config?.minAmount ?? row.minimum_sats;
          const progressPercent = minimumSats > 0
            ? (row.accumulated_sats / minimumSats) * 100
            : 0;
          return {
            charityId: row.charity_id,
            charityName: row.charity_name,
            lightningAddress: row.lightning_address,
            accumulatedSats: row.accumulated_sats,
            minimumSats, // Use config value
            progressPercent: Math.min(100, progressPercent), // Recalculate based on config threshold
            lastContributionAt: row.last_contribution_at,
          };
        });
    } catch (error) {
      console.error('[RewardsTransparencyService] getPendingBatchPayouts error:', error);
      return [];
    }
  }

  /**
   * Combined fetch for dashboard - single method to get all data
   * Optimized to run queries in parallel
   */
  async getDashboardData(periodType: PeriodType): Promise<DashboardData> {
    // Run all queries in parallel for better performance
    const [pool, summary, charityLeaderboard, pendingPayouts] = await Promise.all([
      this.getPoolStatus(),
      this.getSummary(periodType),
      this.getCharityLeaderboard(periodType),
      this.getPendingBatchPayouts(),
    ]);

    return {
      pool,
      summary,
      charityLeaderboard,
      pendingPayouts,
    };
  }

  /**
   * Helper: Calculate user vs charity percentage split
   */
  calculateSplit(summary: RewardsSummary | null): {
    userPercent: number;
    charityPercent: number;
  } {
    if (!summary || summary.totalPaidSats === 0) {
      return { userPercent: 0, charityPercent: 0 };
    }

    const total = summary.directToUsersSats + summary.donatedToCharitySats;
    if (total === 0) {
      return { userPercent: 0, charityPercent: 0 };
    }

    const userPercent = Math.round((summary.directToUsersSats / total) * 100);
    const charityPercent = 100 - userPercent;

    return { userPercent, charityPercent };
  }
}

// Export singleton instance
export const RewardsTransparencyService = new RewardsTransparencyServiceClass();
export default RewardsTransparencyService;
