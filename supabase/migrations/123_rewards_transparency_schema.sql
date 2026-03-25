-- ============================================================================
-- REWARDS TRANSPARENCY DASHBOARD SCHEMA
-- Migration: 123_rewards_transparency_schema.sql
-- Purpose: Tables for the rewards transparency dashboard showing payment flows
--
-- These tables are READ-ONLY from the app (populated by external watcher service)
-- ============================================================================

-- ============================================================================
-- 1. REWARDS_POOL (Single Row - Pool Health)
-- Already exists from prior migration, but add last_updated_at if missing
-- ============================================================================

-- Create rewards_pool if it doesn't exist (was originally created manually)
CREATE TABLE IF NOT EXISTS rewards_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balance_sats BIGINT NOT NULL DEFAULT 0,
  total_deposited_sats BIGINT NOT NULL DEFAULT 0,
  total_paid_sats BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add last_updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rewards_pool' AND column_name = 'last_updated_at'
  ) THEN
    ALTER TABLE rewards_pool ADD COLUMN last_updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ============================================================================
-- 2. REWARDS_SUMMARY (Period Aggregates)
-- Stores aggregated payment data by time period
-- ============================================================================

CREATE TABLE IF NOT EXISTS rewards_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Period identification
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'all_time')),
  period_start DATE NOT NULL,

  -- Total payment stats
  total_paid_sats BIGINT NOT NULL DEFAULT 0,
  total_recipients INTEGER NOT NULL DEFAULT 0,

  -- User vs Charity breakdown
  direct_to_users_sats BIGINT NOT NULL DEFAULT 0,
  direct_to_users_count INTEGER NOT NULL DEFAULT 0,
  donated_to_charity_sats BIGINT NOT NULL DEFAULT 0,
  donated_to_charity_count INTEGER NOT NULL DEFAULT 0,

  -- Failed payment summary (count only, no personal details)
  failed_payment_sats BIGINT NOT NULL DEFAULT 0,
  failed_payment_count INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one row per period type + start date
  CONSTRAINT rewards_summary_unique_period UNIQUE (period_type, period_start)
);

-- Index for efficient querying by period
CREATE INDEX IF NOT EXISTS idx_rewards_summary_period_type
  ON rewards_summary(period_type, period_start DESC);

-- ============================================================================
-- 3. CHARITY_PAYOUTS (Per-Charity Aggregates)
-- Tracks total payments to each charity by time period
-- ============================================================================

CREATE TABLE IF NOT EXISTS charity_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Charity identification
  charity_id TEXT NOT NULL,
  charity_name TEXT NOT NULL,

  -- Period identification
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'all_time')),
  period_start DATE NOT NULL,

  -- Payment aggregates
  total_sats BIGINT NOT NULL DEFAULT 0,
  payment_count INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one row per charity + period type + start date
  CONSTRAINT charity_payouts_unique UNIQUE (charity_id, period_type, period_start)
);

-- Index for efficient leaderboard queries
CREATE INDEX IF NOT EXISTS idx_charity_payouts_leaderboard
  ON charity_payouts(period_type, period_start DESC, total_sats DESC);

CREATE INDEX IF NOT EXISTS idx_charity_payouts_charity
  ON charity_payouts(charity_id, period_type);

-- ============================================================================
-- 4. PENDING_BATCH_PAYOUTS (Geyser Accumulator)
-- Tracks pending payments waiting to reach minimum threshold (e.g., 1000 sats for Geyser)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pending_batch_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Charity identification
  charity_id TEXT NOT NULL UNIQUE,
  charity_name TEXT NOT NULL,
  lightning_address TEXT NOT NULL,

  -- Accumulation tracking
  accumulated_sats BIGINT NOT NULL DEFAULT 0,
  minimum_sats BIGINT NOT NULL DEFAULT 1000,

  -- Computed progress percentage (for display)
  progress_percent NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN minimum_sats > 0 THEN LEAST(100.0, (accumulated_sats::NUMERIC / minimum_sats::NUMERIC) * 100)
      ELSE 100.0
    END
  ) STORED,

  -- Last update tracking
  last_contribution_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fetching all pending payouts
CREATE INDEX IF NOT EXISTS idx_pending_batch_payouts_progress
  ON pending_batch_payouts(progress_percent DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Read-only for anon, write for service_role
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE rewards_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE charity_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_batch_payouts ENABLE ROW LEVEL SECURITY;

-- rewards_summary: read-only for anon
DROP POLICY IF EXISTS "rewards_summary_select" ON rewards_summary;
CREATE POLICY "rewards_summary_select" ON rewards_summary
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "rewards_summary_service_all" ON rewards_summary;
CREATE POLICY "rewards_summary_service_all" ON rewards_summary
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- charity_payouts: read-only for anon
DROP POLICY IF EXISTS "charity_payouts_select" ON charity_payouts;
CREATE POLICY "charity_payouts_select" ON charity_payouts
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "charity_payouts_service_all" ON charity_payouts;
CREATE POLICY "charity_payouts_service_all" ON charity_payouts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- pending_batch_payouts: read-only for anon
DROP POLICY IF EXISTS "pending_batch_payouts_select" ON pending_batch_payouts;
CREATE POLICY "pending_batch_payouts_select" ON pending_batch_payouts
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "pending_batch_payouts_service_all" ON pending_batch_payouts;
CREATE POLICY "pending_batch_payouts_service_all" ON pending_batch_payouts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE rewards_summary IS 'Aggregated reward payment statistics by time period (daily/weekly/monthly/all-time)';
COMMENT ON TABLE charity_payouts IS 'Per-charity payment aggregates by time period for transparency leaderboard';
COMMENT ON TABLE pending_batch_payouts IS 'Tracks payments waiting to reach minimum threshold (Geyser 1000 sat minimum)';

COMMENT ON COLUMN rewards_summary.period_type IS 'Time period type: daily, weekly, monthly, or all_time';
COMMENT ON COLUMN rewards_summary.direct_to_users_sats IS 'Total sats paid directly to user Lightning addresses';
COMMENT ON COLUMN rewards_summary.donated_to_charity_sats IS 'Total sats donated to charities on behalf of users';
COMMENT ON COLUMN rewards_summary.failed_payment_count IS 'Summary count of failed payments (no personal details)';

COMMENT ON COLUMN pending_batch_payouts.minimum_sats IS 'Minimum sats required before batch payment is sent (e.g., 1000 for Geyser)';
COMMENT ON COLUMN pending_batch_payouts.progress_percent IS 'Computed percentage toward minimum threshold';
