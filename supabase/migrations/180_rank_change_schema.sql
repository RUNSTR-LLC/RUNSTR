-- Migration 180: Rank-change notification schema additions
-- Supports the notify_rank_changes() trigger added in migration 182.
-- See docs/superpowers/specs/2026-05-11-rank-change-notifications-design.md.

-- =============================================
-- 1. Ensure pg_net extension is enabled.
-- (Already enabled in earlier migrations that use net.http_post — idempotent here.)
-- =============================================
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =============================================
-- 2. daily_leaderboard_rank_snapshots
-- One row per (snapshot_date, leaderboard_id, npub). Written by notify_rank_changes().
-- =============================================
CREATE TABLE IF NOT EXISTS daily_leaderboard_rank_snapshots (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date   DATE         NOT NULL,
  leaderboard_id  TEXT         NOT NULL CHECK (leaderboard_id IN ('5k', '10k', 'half_marathon', 'marathon', 'steps')),
  npub            TEXT         NOT NULL,
  rank            SMALLINT     NOT NULL CHECK (rank >= 1),
  last_updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (snapshot_date, leaderboard_id, npub)
);

CREATE INDEX IF NOT EXISTS idx_daily_rank_snapshots_date_lb
  ON daily_leaderboard_rank_snapshots (snapshot_date, leaderboard_id);

ALTER TABLE daily_leaderboard_rank_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read daily rank snapshots" ON daily_leaderboard_rank_snapshots;
CREATE POLICY "Anyone can read daily rank snapshots" ON daily_leaderboard_rank_snapshots
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role full access on daily rank snapshots" ON daily_leaderboard_rank_snapshots;
CREATE POLICY "Service role full access on daily rank snapshots" ON daily_leaderboard_rank_snapshots
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================
-- 3. event_leaderboard_rank_snapshots
-- One row per (event_id, npub). Written by notify_rank_changes().
-- =============================================
CREATE TABLE IF NOT EXISTS event_leaderboard_rank_snapshots (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID         NOT NULL,
  npub            TEXT         NOT NULL,
  rank            SMALLINT     NOT NULL CHECK (rank >= 1),
  last_updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, npub)
);

CREATE INDEX IF NOT EXISTS idx_event_rank_snapshots_event
  ON event_leaderboard_rank_snapshots (event_id);

ALTER TABLE event_leaderboard_rank_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read event rank snapshots" ON event_leaderboard_rank_snapshots;
CREATE POLICY "Anyone can read event rank snapshots" ON event_leaderboard_rank_snapshots
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role full access on event rank snapshots" ON event_leaderboard_rank_snapshots;
CREATE POLICY "Service role full access on event rank snapshots" ON event_leaderboard_rank_snapshots
  FOR ALL TO service_role USING (true) WITH CHECK (true);
