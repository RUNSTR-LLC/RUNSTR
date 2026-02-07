/**
 * Transparency Dashboard Type Definitions
 * Types for the rewards transparency dashboard showing payment flows
 *
 * These types mirror the Supabase table schemas in migration 123
 */

/**
 * Period types for aggregation filtering
 */
export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'all_time';

/**
 * Pool status - current balance and payment stats
 * Maps to rewards_pool table (single row)
 */
export interface PoolStatus {
  balance: number;
  totalPaid: number;
  paymentCount: number;
  lastUpdatedAt: string | null;
}

/**
 * Aggregated rewards summary for a time period
 * Maps to rewards_summary table
 */
export interface RewardsSummary {
  periodType: PeriodType;
  periodStart: string; // ISO date

  totalPaidSats: number;
  totalRecipients: number;

  directToUsersSats: number;
  directToUsersCount: number;
  donatedToCharitySats: number;
  donatedToCharityCount: number;

  failedPaymentSats: number;
  failedPaymentCount: number;

  updatedAt: string;
}

/**
 * Per-charity payment aggregate for transparency leaderboard
 * Maps to charity_payouts table
 */
export interface CharityPayout {
  charityId: string;
  charityName: string;
  periodType: PeriodType;
  periodStart: string; // ISO date
  totalSats: number;
  paymentCount: number;
}

/**
 * Pending batch payout (e.g., Geyser waiting for 1000 sat minimum)
 * Maps to pending_batch_payouts table
 */
export interface PendingBatchPayout {
  charityId: string;
  charityName: string;
  lightningAddress: string;
  accumulatedSats: number;
  minimumSats: number;
  progressPercent: number;
  lastContributionAt: string | null;
}

/**
 * Combined dashboard data for single-fetch optimization
 */
export interface DashboardData {
  pool: PoolStatus | null;
  summary: RewardsSummary | null;
  charityLeaderboard: CharityPayout[];
  pendingPayouts: PendingBatchPayout[];
}

/**
 * Period selector option for UI
 */
export interface PeriodOption {
  type: PeriodType;
  label: string;
  shortLabel: string;
}

/**
 * Available period options for the selector
 */
export const PERIOD_OPTIONS: PeriodOption[] = [
  { type: 'daily', label: 'Today', shortLabel: 'Day' },
  { type: 'weekly', label: 'This Week', shortLabel: 'Week' },
  { type: 'monthly', label: 'This Month', shortLabel: 'Month' },
  { type: 'all_time', label: 'All Time', shortLabel: 'All' },
];
