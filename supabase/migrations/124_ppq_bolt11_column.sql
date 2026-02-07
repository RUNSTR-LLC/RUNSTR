-- =============================================
-- RUNSTR Migration: PPQ.AI Bolt11 Invoice Column
-- Purpose: Store PPQ.AI topup invoice with workout submissions
-- When user's team is PPQ.AI, rewards go to their AI credits
-- via the bolt11 invoice instead of their Lightning address
-- =============================================

-- Add ppq_bolt11 column to workout_submissions
-- This stores the PPQ.AI topup invoice created by the app when team=PPQ.AI
ALTER TABLE workout_submissions
ADD COLUMN IF NOT EXISTS ppq_bolt11 TEXT;

-- Add ppq_invoice_id column for tracking
ALTER TABLE workout_submissions
ADD COLUMN IF NOT EXISTS ppq_invoice_id TEXT;

-- Add index for efficient queries on workouts with PPQ invoices
CREATE INDEX IF NOT EXISTS idx_workout_submissions_ppq_bolt11
ON workout_submissions(ppq_bolt11)
WHERE ppq_bolt11 IS NOT NULL;

-- Comment explaining the column
COMMENT ON COLUMN workout_submissions.ppq_bolt11 IS 'PPQ.AI Lightning invoice for users who selected PPQ.AI as their team. Rewards are sent to this invoice instead of their Lightning address.';
COMMENT ON COLUMN workout_submissions.ppq_invoice_id IS 'PPQ.AI invoice ID for tracking payment status.';
