-- 004_CREATE_PAYMENTS_TABLE
-- Create payments table for Bitcoin transactions


-- =============================================
-- RUNSTR Migration: Create payments table
-- Purpose: Track all Bitcoin transactions and rewards
-- =============================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Transaction parties
  from_user_id UUID REFERENCES auth.users(id),
  to_user_id UUID REFERENCES auth.users(id),
  
  -- Payment details
  amount_sats BIGINT NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('reward', 'entry_fee', 'prize_distribution')),
  
  -- Context
  activity_id UUID REFERENCES activities(id),
  team_id UUID REFERENCES teams(id),
  
  -- Lightning Network details
  lightning_invoice TEXT,
  payment_hash TEXT,
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  description TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_payments_from_user ON payments(from_user_id);
CREATE INDEX idx_payments_to_user ON payments(to_user_id);
CREATE INDEX idx_payments_activity ON payments(activity_id);
CREATE INDEX idx_payments_team ON payments(team_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- RLS Policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can see payments they're involved in
CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (
    auth.uid() = from_user_id OR 
    auth.uid() = to_user_id
  );

-- Team members can see team-related payments
CREATE POLICY "Team members can view team payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = payments.team_id 
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

-- Only team captains can create payment distributions
CREATE POLICY "Team captains can create payments" ON payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE id = team_id 
      AND captain_id = auth.uid()
    )
  );

-- Sample data (optional - run this in separate query if you want test data)
-- INSERT INTO payments (from_user_id, to_user_id, amount_sats, transaction_type, description, status)
-- SELECT 
--   (SELECT id FROM auth.users WHERE email IS NOT NULL LIMIT 1) as from_user,
--   (SELECT id FROM auth.users WHERE email IS NOT NULL OFFSET 1 LIMIT 1) as to_user,
--   5000,
--   'reward',
--   'Weekly 5K Challenge completion reward',
--   'completed'
-- WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 2);

COMMENT ON TABLE payments IS 'Tracks all Bitcoin transactions, rewards, and payments in RUNSTR';


-- 005_CREATE_LEADERBOARDS_TABLE
-- Create leaderboards table with auto-calculation


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


-- 006_SAMPLE_DATA
-- Generate sample data for testing (optional)


-- =============================================
-- RUNSTR Sample Data Generator (OPTIONAL)
-- Purpose: Create realistic test data for development
-- Run this AFTER the above migrations if you want sample data
-- =============================================

-- Create sample team memberships (join users to teams)
INSERT INTO team_members (team_id, user_id, role, joined_at, is_active)
SELECT 
  t.id as team_id,
  u.id as user_id,
  CASE WHEN t.captain_id = u.id THEN 'captain' ELSE 'member' END as role,
  NOW() - INTERVAL '7 days' as joined_at,
  true as is_active
FROM teams t
CROSS JOIN auth.users u
WHERE u.role IS NOT NULL
LIMIT 4; -- Join first 2 users to first 2 teams

-- Create sample activities
INSERT INTO activities (
  team_id, activity_type, title, description, creator_id, 
  prize_amount, status, start_date, end_date, is_highlighted
)
SELECT 
  t.id,
  'event',
  'Weekly 5K Challenge',
  'Complete a 5K run this week to earn Bitcoin rewards. All team members welcome!',
  t.captain_id,
  5000,
  'active',
  CURRENT_DATE - INTERVAL '1 day',
  CURRENT_DATE + INTERVAL '6 days',
  true
FROM teams t
LIMIT 2;

INSERT INTO activities (
  team_id, activity_type, title, description, creator_id, 
  prize_amount, status, challenger_id, challenged_id
)
SELECT 
  t.id,
  'challenge',
  'Speed Demon 5K Face-off',
  'Head-to-head 5K challenge. First to complete wins the full prize!',
  u1.id,
  1000,
  'active',
  u1.id,
  u2.id
FROM teams t
JOIN auth.users u1 ON u1.role IS NOT NULL
JOIN auth.users u2 ON u2.role IS NOT NULL AND u2.id != u1.id
LIMIT 1;

-- Create sample workout data (simulate HealthKit sync)
INSERT INTO workouts (
  user_id, team_id, type, source, distance_meters, duration_seconds,
  start_time, synced_at
)
SELECT 
  tm.user_id,
  tm.team_id,
  'running',
  'healthkit',
  3000 + (RANDOM() * 2000)::INTEGER, -- 3-5km
  1800 + (RANDOM() * 1200)::INTEGER, -- 30-50 minutes
  NOW() - (RANDOM() * INTERVAL '7 days'),
  NOW()
FROM team_members tm
WHERE tm.is_active = true;

-- This will trigger leaderboard calculations automatically
COMMENT ON COLUMN workouts.synced_at IS 'Sample data created by migration script';


-- 007_CREATE_COMPETITION_LEADERBOARDS
-- Create competition-specific leaderboard tables for winner detection


-- =============================================
-- RUNSTR Migration: Competition-specific leaderboards
-- Purpose: Enable winner detection for events, challenges, and leagues
-- =============================================

-- Event Leaderboards: Track performance for time-limited events
CREATE TABLE IF NOT EXISTS event_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Competition context
  event_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Performance metrics
  score INTEGER DEFAULT 0,
  rank INTEGER,
  total_workouts INTEGER DEFAULT 0,
  total_distance_meters BIGINT DEFAULT 0,
  total_duration_seconds BIGINT DEFAULT 0,
  best_performance JSONB, -- Store best single workout metrics
  
  -- Progress tracking
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate entries
  UNIQUE(event_id, user_id)
);

-- Challenge Leaderboards: Head-to-head competition tracking
CREATE TABLE IF NOT EXISTS challenge_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Challenge context
  challenge_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Challenge-specific metrics
  score INTEGER DEFAULT 0,
  completion_status VARCHAR(20) DEFAULT 'in_progress' CHECK (completion_status IN ('in_progress', 'completed', 'abandoned')),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Performance data
  performance_metrics JSONB, -- Flexible storage for challenge-specific data
  proof_of_work JSONB, -- Store workout IDs and verification data
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(challenge_id, user_id)
);

-- League Leaderboards: Recurring competition standings
CREATE TABLE IF NOT EXISTS league_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- League context
  league_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Scoring and ranking
  period_score INTEGER DEFAULT 0, -- Score for current period
  total_score INTEGER DEFAULT 0,  -- All-time score in league
  rank INTEGER,
  
  -- Period tracking
  period_type VARCHAR(20) DEFAULT 'weekly' CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  period_start_date DATE,
  period_end_date DATE,
  
  -- Performance metrics
  period_workouts INTEGER DEFAULT 0,
  period_distance_meters BIGINT DEFAULT 0,
  
  -- Timestamps
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(league_id, user_id, period_start_date)
);

-- Performance indexes for event leaderboards
CREATE INDEX idx_event_leaderboard_event ON event_leaderboard(event_id);
CREATE INDEX idx_event_leaderboard_user ON event_leaderboard(user_id);
CREATE INDEX idx_event_leaderboard_score ON event_leaderboard(event_id, score DESC);
CREATE INDEX idx_event_leaderboard_rank ON event_leaderboard(event_id, rank ASC);

-- Performance indexes for challenge leaderboards
CREATE INDEX idx_challenge_leaderboard_challenge ON challenge_leaderboard(challenge_id);
CREATE INDEX idx_challenge_leaderboard_user ON challenge_leaderboard(user_id);
CREATE INDEX idx_challenge_leaderboard_status ON challenge_leaderboard(challenge_id, completion_status);

-- Performance indexes for league leaderboards
CREATE INDEX idx_league_leaderboard_league ON league_leaderboard(league_id);
CREATE INDEX idx_league_leaderboard_user ON league_leaderboard(user_id);
CREATE INDEX idx_league_leaderboard_period ON league_leaderboard(league_id, period_start_date);
CREATE INDEX idx_league_leaderboard_rank ON league_leaderboard(league_id, period_start_date, rank ASC);

-- RLS Policies for event_leaderboard
ALTER TABLE event_leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event leaderboards are viewable by team members" ON event_leaderboard
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN team_members tm ON tm.team_id = a.team_id
      WHERE a.id = event_id 
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
    )
  );

-- RLS Policies for challenge_leaderboard
ALTER TABLE challenge_leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Challenge participants can view challenge leaderboard" ON challenge_leaderboard
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = challenge_id 
      AND (a.challenger_id = auth.uid() OR a.challenged_id = auth.uid())
    )
  );

CREATE POLICY "Challenge participants can update their own progress" ON challenge_leaderboard
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for league_leaderboard
ALTER TABLE league_leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "League leaderboards are viewable by team members" ON league_leaderboard
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN team_members tm ON tm.team_id = a.team_id
      WHERE a.id = league_id 
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
    )
  );

-- Auto-ranking function for event leaderboards
CREATE OR REPLACE FUNCTION update_event_leaderboard_rankings()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate ranks for all participants in this event
  WITH ranked_participants AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        ORDER BY score DESC, 
        total_distance_meters DESC, 
        total_workouts DESC
      ) as new_rank
    FROM event_leaderboard 
    WHERE event_id = NEW.event_id
  )
  UPDATE event_leaderboard el 
  SET rank = rp.new_rank
  FROM ranked_participants rp
  WHERE el.id = rp.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_event_leaderboard_ranking
  AFTER INSERT OR UPDATE ON event_leaderboard
  FOR EACH ROW EXECUTE FUNCTION update_event_leaderboard_rankings();

-- Auto-ranking function for league leaderboards
CREATE OR REPLACE FUNCTION update_league_leaderboard_rankings()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate ranks for current period in this league
  WITH ranked_participants AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        ORDER BY period_score DESC, 
        period_distance_meters DESC, 
        period_workouts DESC
      ) as new_rank
    FROM league_leaderboard 
    WHERE league_id = NEW.league_id 
    AND period_start_date = NEW.period_start_date
  )
  UPDATE league_leaderboard ll 
  SET rank = rp.new_rank
  FROM ranked_participants rp
  WHERE ll.id = rp.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_league_leaderboard_ranking
  AFTER INSERT OR UPDATE ON league_leaderboard
  FOR EACH ROW EXECUTE FUNCTION update_league_leaderboard_rankings();

COMMENT ON TABLE event_leaderboard IS 'Tracks participant performance in time-limited events for winner determination';
COMMENT ON TABLE challenge_leaderboard IS 'Tracks head-to-head challenge progress and completion status';  
COMMENT ON TABLE league_leaderboard IS 'Maintains periodic standings for recurring league competitions';
