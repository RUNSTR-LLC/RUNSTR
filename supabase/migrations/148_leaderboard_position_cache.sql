-- Migration: 148_leaderboard_position_cache.sql
-- Purpose: Cache leaderboard positions for active competitions to detect
--          position changes and send targeted push notifications.
--
-- Components:
-- 1. leaderboard_position_cache table
-- 2. compute_competition_leaderboard() SQL function
-- 3. Cron job: check-leaderboard-positions every 5 min (6AM-10PM UTC)
-- 4. RLS policies and indexes

-- ============================================================================
-- 1. TABLE: leaderboard_position_cache
-- ============================================================================

CREATE TABLE leaderboard_position_cache (
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  npub TEXT NOT NULL,
  position INTEGER NOT NULL,
  total_distance_meters BIGINT DEFAULT 0,
  last_notified_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (competition_id, npub)
);

-- Index for efficient per-competition lookups
CREATE INDEX idx_leaderboard_position_cache_competition
  ON leaderboard_position_cache(competition_id);

-- ============================================================================
-- 2. RLS: Service role only
-- ============================================================================

ALTER TABLE leaderboard_position_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only on leaderboard_position_cache"
  ON leaderboard_position_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 3. FUNCTION: compute_competition_leaderboard
--
-- Returns ranked participants by total distance from workout_submissions.
-- Uses created_at for time filtering (workout_submissions has no submitted_at).
-- distance_meters is NUMERIC in workout_submissions, cast to BIGINT for output.
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_competition_leaderboard(
  p_competition_id UUID,
  p_activity_type TEXT,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS TABLE (
  npub TEXT,
  position INTEGER,
  total_distance_meters BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.npub,
    ROW_NUMBER() OVER (
      ORDER BY COALESCE(SUM(ws.distance_meters), 0) DESC
    )::INTEGER AS position,
    COALESCE(SUM(ws.distance_meters), 0)::BIGINT AS total_distance_meters
  FROM competition_participants cp
  LEFT JOIN workout_submissions ws
    ON ws.npub = cp.npub
    AND ws.activity_type = p_activity_type
    AND ws.created_at >= p_start
    AND ws.created_at <= p_end
  WHERE cp.competition_id = p_competition_id
  GROUP BY cp.npub
  ORDER BY total_distance_meters DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compute_competition_leaderboard IS
  'Compute ranked leaderboard for a competition by total distance. Used by check-leaderboard-positions Edge Function.';

-- ============================================================================
-- 4. CRON JOB: check-leaderboard-positions
-- Runs every 5 minutes during active hours (6 AM - 10 PM UTC)
-- Same schedule pattern as broadcast-running-update (migration 107)
-- ============================================================================

SELECT cron.schedule(
  'check-leaderboard-positions',
  '*/5 6-22 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/check-leaderboard-positions',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================================
-- 5. COMMENTS
-- ============================================================================

COMMENT ON TABLE leaderboard_position_cache IS
  'Cached leaderboard positions per competition+user. Used to detect position changes and throttle notifications (1hr cooldown).';
