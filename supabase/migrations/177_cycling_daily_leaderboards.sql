-- Migration: Cycling Daily Leaderboards
-- Purpose: Add pre-calculated cycling target distance times (20K/40K/100K) for
-- daily cycling leaderboards, mirroring the existing running columns.
--
-- Phase 3 of cycling parity work (see GitHub issue #269).
--
-- Columns are nullable. A cycling workout that doesn't reach 20K will have
-- time_cycling_20k_seconds = NULL. These columns are only populated for
-- activity_type='cycling' rows by submit-workout edge function.
--
-- Distance brackets chosen per cycling standards (not running brackets):
--   20K = short time trial / fast out-and-back
--   40K = standard time trial distance
--   100K = century half (metric century)

-- =============================================
-- Add cycling target time columns
-- =============================================

ALTER TABLE workout_submissions
ADD COLUMN IF NOT EXISTS time_cycling_20k_seconds INTEGER;

ALTER TABLE workout_submissions
ADD COLUMN IF NOT EXISTS time_cycling_40k_seconds INTEGER;

ALTER TABLE workout_submissions
ADD COLUMN IF NOT EXISTS time_cycling_100k_seconds INTEGER;

COMMENT ON COLUMN workout_submissions.time_cycling_20k_seconds IS 'Pre-calculated 20K cycling time from splits or interpolation (NULL if distance < 20km or activity_type != cycling)';
COMMENT ON COLUMN workout_submissions.time_cycling_40k_seconds IS 'Pre-calculated 40K cycling time from splits or interpolation (NULL if distance < 40km or activity_type != cycling)';
COMMENT ON COLUMN workout_submissions.time_cycling_100k_seconds IS 'Pre-calculated 100K cycling time from splits or interpolation (NULL if distance < 100km or activity_type != cycling)';

-- =============================================
-- Partial indexes for fast daily cycling leaderboard queries
-- =============================================

CREATE INDEX IF NOT EXISTS idx_workout_submissions_daily_cyc_20k
  ON workout_submissions(leaderboard_date, time_cycling_20k_seconds ASC)
  WHERE time_cycling_20k_seconds IS NOT NULL AND activity_type = 'cycling';

CREATE INDEX IF NOT EXISTS idx_workout_submissions_daily_cyc_40k
  ON workout_submissions(leaderboard_date, time_cycling_40k_seconds ASC)
  WHERE time_cycling_40k_seconds IS NOT NULL AND activity_type = 'cycling';

CREATE INDEX IF NOT EXISTS idx_workout_submissions_daily_cyc_100k
  ON workout_submissions(leaderboard_date, time_cycling_100k_seconds ASC)
  WHERE time_cycling_100k_seconds IS NOT NULL AND activity_type = 'cycling';
