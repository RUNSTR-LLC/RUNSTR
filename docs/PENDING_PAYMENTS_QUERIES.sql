-- ============================================
-- PENDING PAYMENTS MONITORING QUERIES
-- ============================================
-- These queries help monitor the charity payment retry system.
-- Run them in the Supabase SQL editor or via the CLI.
--
-- Last updated: 2026-01-18
-- ============================================

-- ============================================
-- TOTAL OWED DASHBOARD (Run before manual settlements)
-- ============================================

-- MAIN DASHBOARD: Total owed to each charity
-- Use this to know how much to send via traditional channels
SELECT
    charity_name,
    charity_id,
    charity_lightning_address,
    COUNT(*) as pending_workouts,
    SUM(amount_sats) as total_owed_sats,
    ROUND(SUM(amount_sats) / 100000000.0, 8) as total_owed_btc,
    MIN(created_at)::date as oldest_pending,
    MAX(created_at)::date as newest_pending,
    ROUND(AVG(retry_count), 1) as avg_retries
FROM charity_reward_payments
WHERE status = 'pending'
GROUP BY charity_name, charity_id, charity_lightning_address
ORDER BY total_owed_sats DESC;

-- Quick summary: Total across all charities
SELECT
    'ALL CHARITIES' as charity,
    COUNT(*) as pending_workouts,
    SUM(amount_sats) as total_owed_sats,
    ROUND(SUM(amount_sats) / 100000000.0, 8) as total_owed_btc
FROM charity_reward_payments
WHERE status = 'pending';

-- After manual settlement: Mark payments as settled
-- Replace 'human-rights-foundation' and amount with actual values
/*
-- Step 1: Verify what you're about to mark as settled
SELECT id, amount_sats, created_at
FROM charity_reward_payments
WHERE charity_id = 'human-rights-foundation'
  AND status = 'pending'
ORDER BY created_at;

-- Step 2: Mark as settled (after sending via traditional channels)
UPDATE charity_reward_payments
SET
    status = 'success',
    paid_at = NOW(),
    error_message = 'Manually settled via [wire/direct contact/etc] on YYYY-MM-DD'
WHERE charity_id = 'human-rights-foundation'
  AND status = 'pending';
*/

-- ============================================
-- DAILY MONITORING QUERIES
-- ============================================

-- 1. Summary of all charity payments by status
-- Shows how many payments are in each state
SELECT
    status,
    COUNT(*) as count,
    SUM(amount_sats) as total_sats
FROM charity_reward_payments
GROUP BY status
ORDER BY count DESC;

-- 2. Pending payments due for retry NOW
-- These should be processed by the next cron run
SELECT
    id,
    charity_id,
    charity_name,
    amount_sats,
    retry_count,
    next_retry_at,
    error_message,
    created_at
FROM charity_reward_payments
WHERE status = 'pending'
  AND (next_retry_at IS NULL OR next_retry_at <= NOW())
ORDER BY created_at ASC;

-- 3. Payments scheduled for future retry
-- Shows payments waiting for their next retry attempt
SELECT
    id,
    charity_id,
    charity_name,
    amount_sats,
    retry_count,
    next_retry_at,
    error_message
FROM charity_reward_payments
WHERE status = 'pending'
  AND next_retry_at > NOW()
ORDER BY next_retry_at ASC;

-- ============================================
-- WEEKLY REPORTING QUERIES
-- ============================================

-- 4. Weekly pending payments report by charity
-- Run this weekly to see pending payments per charity
SELECT
    charity_id,
    charity_name,
    charity_lightning_address,
    COUNT(*) as pending_payments,
    SUM(amount_sats) as total_pending_sats,
    MIN(created_at) as oldest_pending,
    MAX(retry_count) as max_retries,
    array_agg(DISTINCT error_message) as error_types
FROM charity_reward_payments
WHERE status = 'pending'
GROUP BY charity_id, charity_name, charity_lightning_address
ORDER BY total_pending_sats DESC;

-- 5. Failed payments (permanently failed after max retries)
-- Review these for manual intervention
SELECT
    charity_id,
    charity_name,
    charity_lightning_address,
    COUNT(*) as failed_count,
    SUM(amount_sats) as total_failed_sats,
    array_agg(DISTINCT error_message) as error_types
FROM charity_reward_payments
WHERE status = 'failed'
GROUP BY charity_id, charity_name, charity_lightning_address
ORDER BY total_failed_sats DESC;

-- 6. Success rate by charity (last 30 days)
-- Identify charities with persistent routing issues
SELECT
    charity_id,
    charity_name,
    COUNT(*) FILTER (WHERE status = 'success') as succeeded,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE status = 'success') / NULLIF(COUNT(*), 0),
        1
    ) as success_rate_pct
FROM charity_reward_payments
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY charity_id, charity_name
ORDER BY success_rate_pct ASC;

-- ============================================
-- BATCH PAYMENT QUERIES (Bitcoin Yucatan, etc.)
-- ============================================

-- 7. Batch payment readiness check
-- Shows charities accumulating for batch payment
SELECT
    charity_id,
    charity_name,
    charity_lightning_address,
    COUNT(*) as pending_count,
    SUM(amount_sats) as total_pending_sats,
    MIN(created_at) as oldest_pending,
    CASE
        WHEN charity_id = 'bitcoin-yucatan' THEN 1000
        ELSE 0
    END as min_batch_amount,
    CASE
        WHEN charity_id = 'bitcoin-yucatan' AND SUM(amount_sats) >= 1000 THEN 'READY'
        WHEN charity_id = 'bitcoin-yucatan' THEN 'ACCUMULATING'
        ELSE 'N/A'
    END as batch_status
FROM charity_reward_payments
WHERE status = 'pending'
GROUP BY charity_id, charity_name, charity_lightning_address
ORDER BY total_pending_sats DESC;

-- 8. Bitcoin Yucatan specific check
-- Geyser.fund requires 1000 sat minimum
SELECT
    'Bitcoin Yucatan' as charity,
    COUNT(*) as pending_payments,
    SUM(amount_sats) as total_sats,
    1000 as min_required,
    SUM(amount_sats) >= 1000 as ready_to_send,
    1000 - SUM(amount_sats) as sats_needed
FROM charity_reward_payments
WHERE charity_id = 'bitcoin-yucatan'
  AND status = 'pending';

-- ============================================
-- DEBUGGING QUERIES
-- ============================================

-- 9. Recent failures with full error details
-- For debugging specific routing issues
SELECT
    id,
    created_at,
    charity_id,
    charity_name,
    charity_lightning_address,
    amount_sats,
    retry_count,
    error_message,
    lnurl_response
FROM charity_reward_payments
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;

-- 10. Retry history for a specific charity
-- Replace 'human-rights-foundation' with the charity you want to investigate
SELECT
    id,
    created_at,
    status,
    amount_sats,
    retry_count,
    next_retry_at,
    error_message
FROM charity_reward_payments
WHERE charity_id = 'human-rights-foundation'
ORDER BY created_at DESC
LIMIT 50;

-- 11. Payments stuck in pending with many retries
-- Candidates for manual review or moving to failed
SELECT
    id,
    charity_id,
    charity_name,
    amount_sats,
    retry_count,
    next_retry_at,
    error_message,
    created_at
FROM charity_reward_payments
WHERE status = 'pending'
  AND retry_count >= 3
ORDER BY retry_count DESC, created_at ASC;

-- ============================================
-- ADMIN ACTIONS
-- ============================================

-- 12. Manually mark a payment as failed (give up on retry)
-- Uncomment and modify to use
/*
UPDATE charity_reward_payments
SET
    status = 'failed',
    error_message = 'Manually marked as failed - routing issue unresolved'
WHERE id = 'your-payment-uuid-here';
*/

-- 13. Reset a failed payment for retry
-- Useful if a routing issue was fixed on the charity side
/*
UPDATE charity_reward_payments
SET
    status = 'pending',
    retry_count = 0,
    next_retry_at = NOW(),
    error_message = 'Reset for retry after routing fix'
WHERE id = 'your-payment-uuid-here';
*/

-- 14. Bulk reset all failed payments for a charity
-- Use after confirming the charity's routing is fixed
/*
UPDATE charity_reward_payments
SET
    status = 'pending',
    retry_count = 0,
    next_retry_at = NOW(),
    error_message = 'Bulk reset for retry'
WHERE charity_id = 'human-rights-foundation'
  AND status = 'failed';
*/

-- ============================================
-- CRON JOB MONITORING
-- ============================================

-- 15. Verify cron job is running
-- Check the supabase cron history for retry-pending-payments
-- Note: This requires access to pg_cron extension logs

-- You can also manually trigger the Edge Function:
-- curl -X POST https://your-project.supabase.co/functions/v1/retry-pending-payments \
--   -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"

-- ============================================
-- VIEWS (created by migration)
-- ============================================

-- View: pending_payments_due
-- Shows all pending payments ready for retry
SELECT * FROM pending_payments_due;

-- View: pending_batch_payments
-- Shows aggregated pending amounts by charity
SELECT * FROM pending_batch_payments;

-- View: charity_payment_failures
-- Shows all permanently failed payments
SELECT * FROM charity_payment_failures;
