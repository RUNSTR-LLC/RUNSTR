-- =============================================
-- Migration 145: Club Payout Log
-- =============================================
--
-- Tracks automated prize payouts for club competitions.
-- Prevents double-pays (unique on competition_id).
-- Members can view payout status (public read), but only
-- service_role can insert/update (edge function writes).
-- =============================================

CREATE TABLE IF NOT EXISTS club_payout_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL UNIQUE REFERENCES competitions(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES user_teams(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'insufficient_funds')),
  total_prize_sats INTEGER NOT NULL DEFAULT 0,
  total_paid_sats INTEGER NOT NULL DEFAULT 0,
  pool_balance_at_check INTEGER,
  results JSONB DEFAULT '[]'::JSONB,
  retry_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_club_payout_log_club_id ON club_payout_log(club_id);
CREATE INDEX IF NOT EXISTS idx_club_payout_log_status ON club_payout_log(status);

-- Row Level Security
ALTER TABLE club_payout_log ENABLE ROW LEVEL SECURITY;

-- Anyone can read payout status (transparency for members)
CREATE POLICY "Anyone can read payout log" ON club_payout_log
  FOR SELECT USING (true);

-- Only service_role can write (edge function handles inserts/updates)
CREATE POLICY "Service role manages payout log" ON club_payout_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- =============================================
-- Comments
-- =============================================
COMMENT ON TABLE club_payout_log IS 'Tracks automated prize payouts for club competitions. Unique per competition to prevent double-pays.';
COMMENT ON COLUMN club_payout_log.results IS 'JSONB array of [{npub, amount, success, error, preimage}] for each winner payout';
COMMENT ON COLUMN club_payout_log.pool_balance_at_check IS 'Club wallet balance at the time payout was attempted';
COMMENT ON COLUMN club_payout_log.status IS 'pending -> in_progress -> completed/failed/insufficient_funds';
