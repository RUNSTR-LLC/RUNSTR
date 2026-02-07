-- RUNSTR Team Members Table
-- Tracks team membership for discovery and team management

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Membership Details
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'captain', 'co_captain')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  
  -- Member Performance Stats
  total_workouts INTEGER DEFAULT 0,
  total_distance_meters BIGINT DEFAULT 0,
  total_duration_seconds BIGINT DEFAULT 0,
  avg_pace_seconds INTEGER, -- average pace in seconds per mile
  last_workout_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(team_id, user_id)
);

-- Function to update team member count automatically
CREATE OR REPLACE FUNCTION update_team_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
    UPDATE teams 
    SET member_count = member_count + 1
    WHERE id = NEW.team_id;
    
  ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.is_active = true AND NEW.is_active = false) THEN
    UPDATE teams 
    SET member_count = GREATEST(0, member_count - 1)
    WHERE id = COALESCE(OLD.team_id, NEW.team_id);
    
  ELSIF TG_OP = 'UPDATE' AND OLD.is_active = false AND NEW.is_active = true THEN
    UPDATE teams 
    SET member_count = member_count + 1
    WHERE id = NEW.team_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update team average pace
CREATE OR REPLACE FUNCTION update_team_avg_pace()
RETURNS TRIGGER AS $$
BEGIN
  -- Update team average pace based on active members
  UPDATE teams 
  SET avg_pace_seconds = (
    SELECT AVG(avg_pace_seconds)::INTEGER
    FROM team_members 
    WHERE team_id = COALESCE(NEW.team_id, OLD.team_id)
    AND is_active = true 
    AND avg_pace_seconds IS NOT NULL
  )
  WHERE id = COALESCE(NEW.team_id, OLD.team_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_member_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON team_members
  FOR EACH ROW
  EXECUTE PROCEDURE update_team_member_count();

CREATE TRIGGER update_team_pace_trigger
  AFTER INSERT OR UPDATE OR DELETE ON team_members
  FOR EACH ROW
  EXECUTE PROCEDURE update_team_avg_pace();

-- Indexes
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_active ON team_members(is_active) WHERE is_active = true;
CREATE INDEX idx_team_members_role ON team_members(role);

-- RLS Policies
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Team members can view their own membership and all members of their teams
CREATE POLICY "Team members can view team memberships" ON team_members
  FOR SELECT USING (
    auth.uid() = user_id OR
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Users can join teams (insert their own membership)
CREATE POLICY "Users can join teams" ON team_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can leave teams (update their own membership)
CREATE POLICY "Users can manage their own membership" ON team_members
  FOR UPDATE USING (auth.uid() = user_id);

-- Initial data: Add some sample teams for development
INSERT INTO teams (name, description, about, prize_pool, difficulty_level, is_featured, member_count) VALUES
('Bitcoin Runners', 'The official bitcoin runners competition group.', 'Perfect for serious athletes looking for big rewards.', 250000, 'advanced', true, 147),
('Speed Demons', 'Elite runners pushing limits.', 'High-intensity challenges with premium rewards for top performers.', 180000, 'elite', false, 89),
('Weekend Warriors', 'Perfect for casual runners.', 'Fun challenges with achievable goals and steady rewards.', 75000, 'beginner', false, 203),
('Urban Pacers', 'City runners focused on consistency and improvement.', 'Balanced competition with fair rewards.', 120000, 'intermediate', false, 156)
ON CONFLICT (name) DO NOTHING;