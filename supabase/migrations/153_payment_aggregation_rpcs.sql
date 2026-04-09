-- Migration 153: Payment aggregation RPCs
-- Moves SUM/COUNT operations to the database to avoid fetching thousands of rows to the client.

-- RPC 1: get_verified_total
-- Replaces SupabaseRewardService.getVerifiedTotal() which fetches ALL rows to SUM client-side.
CREATE OR REPLACE FUNCTION get_verified_total(user_npub TEXT)
RETURNS BIGINT AS $$
  SELECT COALESCE(SUM(amount_sats), 0)
  FROM reward_payments
  WHERE npub = user_npub
    AND status = 'success'
    AND preimage IS NOT NULL;
$$ LANGUAGE sql STABLE;

-- RPC 2: get_club_earnings_summary
-- Replaces the 4 sequential queries in ClubService.getClubEarnings() with a single call.
CREATE OR REPLACE FUNCTION get_club_earnings_summary(
  p_club_id UUID,
  p_lightning_address TEXT,
  p_week_start_date TEXT,
  p_today_date TEXT,
  p_week_start_timestamp TIMESTAMPTZ
)
RETURNS TABLE(
  weekly_active_members BIGINT,
  today_active_members BIGINT,
  weekly_workouts BIGINT,
  total_workouts BIGINT,
  weekly_earnings BIGINT,
  total_earnings BIGINT
) AS $$
  SELECT
    (SELECT COUNT(DISTINCT npub) FROM workout_submissions
     WHERE club_id = p_club_id AND club_lightning_address IS NOT NULL
     AND leaderboard_date >= p_week_start_date::date),

    (SELECT COUNT(DISTINCT npub) FROM workout_submissions
     WHERE club_id = p_club_id AND club_lightning_address IS NOT NULL
     AND leaderboard_date = p_today_date::date),

    (SELECT COUNT(*) FROM workout_submissions
     WHERE club_id = p_club_id AND club_lightning_address IS NOT NULL
     AND leaderboard_date >= p_week_start_date::date),

    (SELECT COUNT(*) FROM workout_submissions
     WHERE club_id = p_club_id AND club_lightning_address IS NOT NULL),

    CASE WHEN p_lightning_address IS NOT NULL THEN
      (SELECT COALESCE(SUM(amount_sats), 0) FROM reward_payments
       WHERE lightning_address = p_lightning_address AND status = 'success'
       AND paid_at >= p_week_start_timestamp)
    ELSE 0::BIGINT END,

    CASE WHEN p_lightning_address IS NOT NULL THEN
      (SELECT COALESCE(SUM(amount_sats), 0) FROM reward_payments
       WHERE lightning_address = p_lightning_address AND status = 'success')
    ELSE 0::BIGINT END;
$$ LANGUAGE sql STABLE;
