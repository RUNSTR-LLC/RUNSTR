-- RPC to get competition finishers who meet qualifying distance
-- Used by finalize-ticketed-event Edge Function

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
  workout_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
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
  ORDER BY total_distance_meters DESC;
$$;
