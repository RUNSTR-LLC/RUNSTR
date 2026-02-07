-- Migration: Pending Payments Retry System
-- Purpose: Add retry tracking columns for failed charity payments
-- Date: 2026-01-18
--
-- Background: Some charities have intermittent routing issues (HRF, Bitcoin Bay) or
-- minimum amount requirements (Bitcoin Yucatan - 1000 sat min on Geyser.fund).
-- This migration adds columns to track retry attempts and schedule future retries.

-- Add retry tracking columns
ALTER TABLE charity_reward_payments
ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE charity_reward_payments
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

-- Add index for finding payments due for retry
CREATE INDEX IF NOT EXISTS idx_charity_payments_pending_retry
ON charity_reward_payments(next_retry_at)
WHERE status = 'pending' AND next_retry_at IS NOT NULL;

-- Add index for batch payment aggregation (charities with minimum amounts)
CREATE INDEX IF NOT EXISTS idx_charity_payments_pending_batch
ON charity_reward_payments(charity_id, status)
WHERE status = 'pending';

-- Add comments for documentation
COMMENT ON COLUMN charity_reward_payments.retry_count IS 'Number of retry attempts (0 = never retried)';
COMMENT ON COLUMN charity_reward_payments.next_retry_at IS 'When to attempt the next retry (null = no scheduled retry)';

-- Create view for payments due for retry
CREATE OR REPLACE VIEW pending_payments_due AS
SELECT
    id,
    created_at,
    user_pubkey,
    charity_id,
    charity_name,
    charity_lightning_address,
    amount_sats,
    reward_type,
    retry_count,
    next_retry_at,
    error_message
FROM charity_reward_payments
WHERE status = 'pending'
  AND (next_retry_at IS NULL OR next_retry_at <= NOW());

COMMENT ON VIEW pending_payments_due IS 'Pending charity payments that are due for retry attempt';

-- Create view for batch payment candidates (aggregated by charity)
CREATE OR REPLACE VIEW pending_batch_payments AS
SELECT
    charity_id,
    charity_name,
    charity_lightning_address,
    COUNT(*) as pending_count,
    SUM(amount_sats) as total_pending_sats,
    MIN(created_at) as oldest_pending,
    MAX(created_at) as newest_pending,
    array_agg(id ORDER BY created_at) as payment_ids
FROM charity_reward_payments
WHERE status = 'pending'
GROUP BY charity_id, charity_name, charity_lightning_address;

COMMENT ON VIEW pending_batch_payments IS 'Aggregated pending payments by charity for batch processing';

-- Create function to calculate exponential backoff for retry scheduling
-- Base delay: 1 hour, max delay: 24 hours, multiplier: 2
CREATE OR REPLACE FUNCTION calculate_next_retry(current_retry_count INTEGER)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    base_delay_minutes INTEGER := 60; -- 1 hour
    max_delay_minutes INTEGER := 1440; -- 24 hours
    multiplier INTEGER := 2;
    delay_minutes INTEGER;
BEGIN
    -- Exponential backoff: base * 2^retry_count
    delay_minutes := LEAST(
        base_delay_minutes * POWER(multiplier, current_retry_count),
        max_delay_minutes
    );
    RETURN NOW() + (delay_minutes || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_next_retry IS 'Calculate next retry time using exponential backoff (1hr, 2hr, 4hr, 8hr, 16hr, 24hr max)';
