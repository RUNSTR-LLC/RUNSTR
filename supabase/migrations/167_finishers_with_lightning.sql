-- Updated RPC to get competition finishers with resolved zap_to_address
-- Extracts lightning address from workout_submissions.raw_event tags
-- using the same logic as the daily_rewards view

CREATE OR REPLACE FUNCTION get_competition_finishers(
  p_competition_id UUID,
  p_npubs TEXT[],
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_qualifying_distance_meters NUMERIC
)
RETURNS TABLE (
  npub TEXT,
  total_distance_meters NUMERIC,
  workout_count BIGINT,
  lightning_address TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH finisher_stats AS (
    SELECT
      ws.npub,
      SUM(ws.distance_meters) as total_distance_meters,
      COUNT(*) as workout_count
    FROM workout_submissions ws
    WHERE ws.npub = ANY(p_npubs)
      AND ws.created_at >= p_start_date
      AND ws.created_at <= p_end_date
      AND ws.source = 'app'
      AND ws.distance_meters > 0
      AND ws.npub NOT IN (
        SELECT bu.npub FROM banned_users bu
        WHERE bu.expires_at IS NULL OR bu.expires_at > NOW()
      )
    GROUP BY ws.npub
    HAVING SUM(ws.distance_meters) >= p_qualifying_distance_meters
  ),
  -- Get the most recent workout per finisher to resolve their lightning address
  latest_workouts AS (
    SELECT DISTINCT ON (ws.npub)
      ws.npub,
      -- Resolve zap_to_address: charity address if reward_destination='charity', else user address
      CASE
        WHEN (
          SELECT elem.value ->> 1
          FROM jsonb_array_elements(ws.raw_event -> 'tags') elem(value)
          WHERE (elem.value ->> 0) = 'reward_destination'
          LIMIT 1
        ) = 'charity' THEN (
          SELECT elem.value ->> 3
          FROM jsonb_array_elements(ws.raw_event -> 'tags') elem(value)
          WHERE (elem.value ->> 0) = 'charity'
            AND jsonb_array_length(elem.value) > 3
          LIMIT 1
        )
        ELSE (
          SELECT elem.value ->> 1
          FROM jsonb_array_elements(ws.raw_event -> 'tags') elem(value)
          WHERE (elem.value ->> 0) = 'lightning'
          LIMIT 1
        )
      END as resolved_address
    FROM workout_submissions ws
    WHERE ws.npub = ANY(p_npubs)
      AND ws.created_at >= p_start_date
      AND ws.created_at <= p_end_date
    ORDER BY ws.npub, ws.created_at DESC
  )
  SELECT
    fs.npub,
    fs.total_distance_meters,
    fs.workout_count,
    lw.resolved_address as lightning_address
  FROM finisher_stats fs
  LEFT JOIN latest_workouts lw ON lw.npub = fs.npub
  ORDER BY fs.total_distance_meters DESC;
$$;
