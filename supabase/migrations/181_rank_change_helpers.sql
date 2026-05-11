-- Migration 181: PL/pgSQL helpers for the rank-change trigger (migration 182).
-- Pure functions — no side effects, no state. Safe to re-run.

-- =============================================
-- ordinal(n) → '1st' | '2nd' | '3rd' | '{n}th'
-- =============================================
CREATE OR REPLACE FUNCTION ordinal(n SMALLINT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  mod100 SMALLINT := n % 100;
  mod10  SMALLINT := n % 10;
BEGIN
  -- Teens exception: 11, 12, 13 (and 111, 112, 113, etc.) always take 'th'.
  IF mod100 IN (11, 12, 13) THEN
    RETURN n::text || 'th';
  ELSIF mod10 = 1 THEN RETURN n::text || 'st';
  ELSIF mod10 = 2 THEN RETURN n::text || 'nd';
  ELSIF mod10 = 3 THEN RETURN n::text || 'rd';
  ELSE RETURN n::text || 'th';
  END IF;
END;
$$;

-- =============================================
-- daily_leaderboard_label(id) → user-facing label
-- =============================================
CREATE OR REPLACE FUNCTION daily_leaderboard_label(leaderboard_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE leaderboard_id
    WHEN '5k' THEN RETURN 'Daily Leaderboard 5K';
    WHEN '10k' THEN RETURN 'Daily Leaderboard 10K';
    WHEN 'half_marathon' THEN RETURN 'Daily Leaderboard Half Marathon';
    WHEN 'marathon' THEN RETURN 'Daily Leaderboard Marathon';
    WHEN 'steps' THEN RETURN 'Daily Leaderboard Steps';
    ELSE RETURN 'Daily Leaderboard';
  END CASE;
END;
$$;

-- =============================================
-- body_for_transition(prior_rank, current_rank, label) → push body string
-- prior_rank may be NULL (initial entry).
-- =============================================
CREATE OR REPLACE FUNCTION body_for_transition(
  prior_rank   SMALLINT,
  current_rank SMALLINT,
  label        TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF prior_rank IS NULL THEN
    RETURN ordinal(current_rank) || ' Place: ' || label;
  ELSIF current_rank < prior_rank THEN
    RETURN 'Moved to ' || ordinal(current_rank) || ': ' || label;
  ELSIF current_rank > prior_rank THEN
    RETURN 'Dropped to ' || ordinal(current_rank) || ': ' || label;
  ELSE
    -- Equal ranks — caller (trigger) should have guarded with IS DISTINCT FROM.
    -- Return NULL to surface misuse if it ever happens.
    RETURN NULL;
  END IF;
END;
$$;
