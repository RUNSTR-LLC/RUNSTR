-- Migration: Charity Payment Failures Enhancement
-- Purpose: Add LNURL response tracking for debugging failed charity payments
-- Date: 2026-01-18
--
-- Background: Investigation revealed charity payments to BTCPay Server and Geyser Fund
-- addresses are failing silently. This migration adds detailed failure tracking.

-- Add lnurl_response column to capture full LNURL error details
ALTER TABLE charity_reward_payments
ADD COLUMN IF NOT EXISTS lnurl_response JSONB;

COMMENT ON COLUMN charity_reward_payments.lnurl_response IS 'Full LNURL response for debugging failed payments';

-- Create a dedicated view for failed charity payments (for monitoring)
CREATE OR REPLACE VIEW charity_payment_failures AS
SELECT
    id,
    created_at,
    user_pubkey,
    charity_id,
    charity_name,
    charity_lightning_address,
    amount_sats,
    reward_type,
    error_message,
    lnurl_response
FROM charity_reward_payments
WHERE status = 'failed';

COMMENT ON VIEW charity_payment_failures IS 'View of all failed charity payments for monitoring and debugging';

-- Create index for finding failures by charity (helps identify systematic routing issues)
CREATE INDEX IF NOT EXISTS idx_charity_payments_failed_charity
ON charity_reward_payments(charity_id)
WHERE status = 'failed';

-- Create index for recent failures (common monitoring query)
CREATE INDEX IF NOT EXISTS idx_charity_payments_failed_recent
ON charity_reward_payments(created_at DESC)
WHERE status = 'failed';
