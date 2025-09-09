-- RUNSTR Team Activities Table
-- Tracks recent events, challenges, and announcements for team discovery

CREATE TABLE IF NOT EXISTS team_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Activity Details
  activity_type VARCHAR(20) NOT NULL CHECK (activity_type IN ('event', 'challenge', 'announcement', 'payout')),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Activity Metadata
  creator_id UUID REFERENCES auth.users(id),
  prize_amount BIGINT DEFAULT 0, -- satoshis for challenges/events
  participant_count INTEGER DEFAULT 0,
  
  -- Status & Timing
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- For team discovery display
  is_highlighted BOOLEAN DEFAULT false -- Show in team discovery card
);

-- Team Payouts Table
-- Tracks recent reward distributions for team discovery
CREATE TABLE IF NOT EXISTS team_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Payout Details
  amount_sats BIGINT NOT NULL,
  recipient_id UUID REFERENCES auth.users(id),
  description TEXT,
  
  -- Source Information
  event_id UUID, -- Reference to event if applicable
  challenge_id UUID, -- Reference to challenge if applicable
  
  -- Timestamp
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team Statistics Table
-- Cached stats for performance on team discovery
CREATE TABLE IF NOT EXISTS team_stats (
  team_id UUID PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Real-time Statistics
  active_events INTEGER DEFAULT 0,
  active_challenges INTEGER DEFAULT 0,
  total_events_this_week INTEGER DEFAULT 0,
  total_payouts_this_week BIGINT DEFAULT 0,
  
  -- Performance Metrics
  avg_workout_distance_meters DECIMAL(10,2),
  avg_workout_duration_seconds INTEGER,
  total_member_workouts_this_week INTEGER DEFAULT 0,
  
  -- Last Updated
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_team_activities_team_type ON team_activities(team_id, activity_type);
CREATE INDEX idx_team_activities_created_at ON team_activities(created_at DESC);
CREATE INDEX idx_team_activities_highlighted ON team_activities(is_highlighted) WHERE is_highlighted = true;

CREATE INDEX idx_team_payouts_team_id ON team_payouts(team_id);
CREATE INDEX idx_team_payouts_paid_at ON team_payouts(paid_at DESC);

CREATE INDEX idx_team_stats_team_id ON team_stats(team_id);

-- RLS Policies
ALTER TABLE team_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_stats ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read activities/stats for discovery
CREATE POLICY "Team activities are viewable by everyone" ON team_activities
  FOR SELECT USING (true);

CREATE POLICY "Team payouts are viewable by everyone" ON team_payouts
  FOR SELECT USING (true);

CREATE POLICY "Team stats are viewable by everyone" ON team_stats
  FOR SELECT USING (true);

-- Only team members and captains can create activities
CREATE POLICY "Team members can create activities" ON team_activities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE id = team_id 
      AND (captain_id = auth.uid() OR id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      ))
    )
  );

-- Trigger to update team_stats updated_at
CREATE TRIGGER update_team_stats_updated_at
    BEFORE UPDATE ON team_stats
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();