-- =============================================
-- RUNSTR Migration: Create leaderboards table
-- Purpose: Cache performance rankings for teams
-- =============================================

CREATE TABLE IF NOT EXISTS leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ranking context
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period VARCHAR(20) NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'all_time')),
  
  -- Performance metrics
  rank INTEGER NOT NULL,
  total_distance BIGINT DEFAULT 0, -- meters
  total_workouts INTEGER DEFAULT 0,
  total_duration_seconds BIGINT DEFAULT 0,
  avg_pace_seconds INTEGER, -- seconds per mile
  points_earned INTEGER DEFAULT 0,
  
  -- Timestamps
  period_start_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(team_id, user_id, period, period_start_date)
);

-- Indexes for performance
CREATE INDEX idx_leaderboards_team_period ON leaderboards(team_id, period);
CREATE INDEX idx_leaderboards_rank ON leaderboards(team_id, period, rank);
CREATE INDEX idx_leaderboards_user ON leaderboards(user_id);
CREATE INDEX idx_leaderboards_updated_at ON leaderboards(updated_at DESC);

-- RLS Policies
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;

-- Everyone can view leaderboards (public rankings)
CREATE POLICY "Leaderboards are viewable by everyone" ON leaderboards
  FOR SELECT USING (true);

-- Only system/triggers can update leaderboards (no manual updates)
CREATE POLICY "System only can modify leaderboards" ON leaderboards
  FOR ALL USING (false); -- This prevents manual modifications

-- Function to recalculate leaderboards
CREATE OR REPLACE FUNCTION recalculate_team_leaderboard(
  target_team_id UUID,
  target_period VARCHAR(20) DEFAULT 'weekly'
) RETURNS void AS $$
DECLARE
  start_date DATE;
  end_date DATE;
BEGIN
  -- Calculate period boundaries
  CASE target_period
    WHEN 'daily' THEN
      start_date := CURRENT_DATE;
      end_date := CURRENT_DATE + INTERVAL '1 day';
    WHEN 'weekly' THEN
      start_date := CURRENT_DATE - INTERVAL '7 days';
      end_date := CURRENT_DATE;
    WHEN 'monthly' THEN
      start_date := DATE_TRUNC('month', CURRENT_DATE);
      end_date := DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';
    WHEN 'all_time' THEN
      start_date := '1970-01-01'::DATE;
      end_date := CURRENT_DATE + INTERVAL '1 day';
  END CASE;

  -- Clear existing leaderboard for this period
  DELETE FROM leaderboards 
  WHERE team_id = target_team_id 
    AND period = target_period 
    AND period_start_date = start_date;

  -- Recalculate and insert new rankings
  INSERT INTO leaderboards (
    team_id, user_id, period, rank, 
    total_distance, total_workouts, total_duration_seconds, avg_pace_seconds,
    period_start_date, updated_at
  )
  SELECT 
    target_team_id,
    w.user_id,
    target_period,
    ROW_NUMBER() OVER (ORDER BY SUM(w.distance_meters) DESC) as rank,
    SUM(w.distance_meters) as total_distance,
    COUNT(w.id) as total_workouts,
    SUM(w.duration_seconds) as total_duration_seconds,
    CASE 
      WHEN SUM(w.distance_meters) > 0 THEN 
        (SUM(w.duration_seconds) / (SUM(w.distance_meters) / 1609.34))::INTEGER 
      ELSE NULL 
    END as avg_pace_seconds,
    start_date,
    NOW()
  FROM workouts w
  WHERE w.team_id = target_team_id
    AND w.start_time >= start_date
    AND w.start_time < end_date
  GROUP BY w.user_id
  HAVING SUM(w.distance_meters) > 0
  ORDER BY total_distance DESC;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update leaderboards when workouts are added
CREATE OR REPLACE FUNCTION update_leaderboards_on_workout()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate weekly leaderboard for the team
  PERFORM recalculate_team_leaderboard(NEW.team_id, 'weekly');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workout_leaderboard_update
  AFTER INSERT OR UPDATE ON workouts
  FOR EACH ROW
  EXECUTE FUNCTION update_leaderboards_on_workout();

COMMENT ON TABLE leaderboards IS 'Cached performance rankings for team competition tracking';
