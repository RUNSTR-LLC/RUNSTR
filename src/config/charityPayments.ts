/**
 * Charity Payments Configuration
 * Settings for handling problem charities with payment routing issues
 *
 * PROBLEM CATEGORIES:
 * 1. RETRY_ELIGIBLE_CHARITIES - Temporary routing issues (BTCPay, custom domains)
 *    Solution: Mark as 'pending' and retry with exponential backoff
 *
 * 2. BATCH_PAYMENT_CHARITIES - Minimum amount requirements (Geyser.fund = 1000 sats)
 *    Solution: Accumulate pending payments until total >= minAmount, then batch pay
 */

/**
 * Charities with known routing issues that should auto-retry
 * These charities have intermittent failures due to:
 * - BTCPay Server routing issues
 * - Custom domain LNURL resolution issues
 * - Occasional server downtime
 *
 * When payments to these charities fail, they're marked as 'pending' for retry
 * instead of 'failed' (permanent).
 */
export const RETRY_ELIGIBLE_CHARITIES: string[] = [
  'bitcoin-bay', // sats@donate.bitcoinbay.foundation - Custom domain issues
];

/**
 * Charities with minimum payment requirements
 * These charities use Lightning providers with minimum invoice amounts.
 * Our standard 50 sat rewards are rejected.
 *
 * Solution: Accumulate pending payments until total >= minAmount,
 * then send a single batch payment.
 */
export interface BatchPaymentConfig {
  minAmount: number; // Minimum sats required for payment
  address: string; // Lightning address for verification
  note: string; // Description of why batching is needed
}

export const BATCH_PAYMENT_CHARITIES: Record<string, BatchPaymentConfig> = {};

/**
 * Retry configuration
 * Controls how often and how many times we retry failed payments
 */
export const RETRY_CONFIG = {
  /**
   * Maximum number of retry attempts before giving up
   * After this many retries, status changes from 'pending' to 'failed'
   */
  MAX_RETRIES: 5,

  /**
   * Base delay for exponential backoff (in minutes)
   * Actual delays: 60min, 120min, 240min, 480min, 960min (capped at MAX_DELAY)
   */
  BASE_DELAY_MINUTES: 60,

  /**
   * Maximum delay between retries (in minutes)
   * 24 hours = 1440 minutes
   */
  MAX_DELAY_MINUTES: 1440,

  /**
   * Backoff multiplier
   * delay = BASE_DELAY * (MULTIPLIER ^ retry_count)
   */
  MULTIPLIER: 2,
} as const;

/**
 * Helper Functions
 */

/**
 * Check if a charity is eligible for automatic retry on payment failure
 */
export function isRetryEligibleCharity(charityId: string): boolean {
  return RETRY_ELIGIBLE_CHARITIES.includes(charityId);
}

/**
 * Check if a charity requires batch payments (has minimum amount requirement)
 */
export function isBatchPaymentCharity(charityId: string): boolean {
  return charityId in BATCH_PAYMENT_CHARITIES;
}

/**
 * Get batch payment config for a charity (or undefined if not a batch charity)
 */
export function getBatchPaymentConfig(
  charityId: string
): BatchPaymentConfig | undefined {
  return BATCH_PAYMENT_CHARITIES[charityId];
}

/**
 * Check if a charity should have payments marked as 'pending' on failure
 * This includes both retry-eligible and batch-payment charities
 */
export function shouldMarkPendingOnFailure(charityId: string): boolean {
  return isRetryEligibleCharity(charityId) || isBatchPaymentCharity(charityId);
}

/**
 * Calculate next retry time using exponential backoff
 * @param retryCount Current number of retries (0 = first retry)
 * @returns Date when next retry should be attempted
 */
export function calculateNextRetryTime(retryCount: number): Date {
  const delayMinutes = Math.min(
    RETRY_CONFIG.BASE_DELAY_MINUTES *
      Math.pow(RETRY_CONFIG.MULTIPLIER, retryCount),
    RETRY_CONFIG.MAX_DELAY_MINUTES
  );

  const nextRetry = new Date();
  nextRetry.setMinutes(nextRetry.getMinutes() + delayMinutes);
  return nextRetry;
}

/**
 * Check if we should give up retrying (max retries exceeded)
 */
export function hasExceededMaxRetries(retryCount: number): boolean {
  return retryCount >= RETRY_CONFIG.MAX_RETRIES;
}
