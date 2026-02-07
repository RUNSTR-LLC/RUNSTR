-- Migration: Flag Impossible Workouts
-- Purpose: Mark workouts with impossible target times as unverified
-- These workouts will be excluded from leaderboards once the verified filter is added
-- Date: 2026-01-16

-- Flag workouts with 5K time faster than world record (12:30 = 750 seconds)
-- World record is 12:35, we use 12:30 to avoid false positives
UPDATE workout_submissions
SET verified = false
WHERE time_5k_seconds IS NOT NULL
  AND time_5k_seconds < 750
  AND verified = true;

-- Flag workouts with 10K time faster than world record (26:00 = 1560 seconds)
-- World record is 26:11
UPDATE workout_submissions
SET verified = false
WHERE time_10k_seconds IS NOT NULL
  AND time_10k_seconds < 1560
  AND verified = true;

-- Flag workouts with Half Marathon time faster than world record (57:20 = 3440 seconds)
-- World record is 57:30
UPDATE workout_submissions
SET verified = false
WHERE time_half_seconds IS NOT NULL
  AND time_half_seconds < 3440
  AND verified = true;

-- Flag workouts with Marathon time faster than world record (2:00:00 = 7200 seconds)
-- World record is 2:00:35
UPDATE workout_submissions
SET verified = false
WHERE time_marathon_seconds IS NOT NULL
  AND time_marathon_seconds < 7200
  AND verified = true;

-- Also flag running workouts with impossible overall pace
-- A 5K run completed in 11 minutes = 2:12/km = 132 sec/km
-- For distances >= 5km, minimum pace should be 145 sec/km (2:25/km)
UPDATE workout_submissions
SET verified = false
WHERE activity_type = 'running'
  AND distance_meters IS NOT NULL
  AND duration_seconds IS NOT NULL
  AND distance_meters >= 5000  -- 5km or more
  AND (duration_seconds / (distance_meters / 1000.0)) < 145  -- pace faster than 2:25/km
  AND verified = true;

-- Log summary of flagged workouts (for debugging)
-- This will be visible in Supabase migration logs
DO $$
DECLARE
  flagged_5k INTEGER;
  flagged_10k INTEGER;
  flagged_half INTEGER;
  flagged_marathon INTEGER;
  flagged_pace INTEGER;
BEGIN
  SELECT COUNT(*) INTO flagged_5k FROM workout_submissions
    WHERE time_5k_seconds IS NOT NULL AND time_5k_seconds < 750 AND verified = false;
  SELECT COUNT(*) INTO flagged_10k FROM workout_submissions
    WHERE time_10k_seconds IS NOT NULL AND time_10k_seconds < 1560 AND verified = false;
  SELECT COUNT(*) INTO flagged_half FROM workout_submissions
    WHERE time_half_seconds IS NOT NULL AND time_half_seconds < 3440 AND verified = false;
  SELECT COUNT(*) INTO flagged_marathon FROM workout_submissions
    WHERE time_marathon_seconds IS NOT NULL AND time_marathon_seconds < 7200 AND verified = false;
  SELECT COUNT(*) INTO flagged_pace FROM workout_submissions
    WHERE activity_type = 'running' AND distance_meters >= 5000
    AND (duration_seconds / (distance_meters / 1000.0)) < 145 AND verified = false;

  RAISE NOTICE 'Flagged impossible workouts - 5K: %, 10K: %, Half: %, Marathon: %, Pace: %',
    flagged_5k, flagged_10k, flagged_half, flagged_marathon, flagged_pace;
END $$;
