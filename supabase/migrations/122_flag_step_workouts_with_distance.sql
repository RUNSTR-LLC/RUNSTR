-- Migration: Flag step-based workouts that incorrectly have distance
--
-- Problem: Step-based walking workouts (d tag starts with 'steps_') were
-- incorrectly tagged as GPS source and have distance calculated from steps.
-- This caused double-counting in distance-based competitions.
--
-- Solution: Mark these workouts as unverified so they're excluded from leaderboards.

-- Flag step-based workouts that have distance (these shouldn't have distance)
UPDATE workout_submissions
SET verified = false
WHERE raw_event->'tags' @> '[["d"]]'::jsonb
  AND (
    SELECT value->0
    FROM jsonb_array_elements(raw_event->'tags') AS value
    WHERE value->>0 = 'd'
    LIMIT 1
  ) IS NOT NULL
  AND (
    SELECT value->>1
    FROM jsonb_array_elements(raw_event->'tags') AS value
    WHERE value->>0 = 'd'
    LIMIT 1
  ) LIKE 'steps_%'
  AND distance_meters > 0
  AND verified = true;

-- Log how many were flagged
DO $$
DECLARE
  flagged_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO flagged_count
  FROM workout_submissions
  WHERE verified = false
    AND (
      SELECT value->>1
      FROM jsonb_array_elements(raw_event->'tags') AS value
      WHERE value->>0 = 'd'
      LIMIT 1
    ) LIKE 'steps_%'
    AND distance_meters > 0;

  RAISE NOTICE 'Flagged % step-based workouts with incorrect distance', flagged_count;
END $$;
