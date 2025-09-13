-- =============================================
-- RUNSTR Migration: Restore Team Management Tables
-- Purpose: Add back teams and team_members tables for competition automation
-- Strategy: Competition-first hybrid architecture
-- - Supabase: Team management, competition automation, member tracking
-- - Nostr: Team discovery, social features, announcements
-- =============================================

-- 1. TEAMS TABLE: Core team data for competition automation
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  about TEXT, -- Team mission/vibe for discovery
  
  -- Team Leadership (Updated for npub compatibility)
  captain_id TEXT, -- Will store user ID (could be npub or traditional ID)
  captain_npub TEXT, -- Store captain's npub for Nostr integration
  
  -- Financial Information
  prize_pool BIGINT DEFAULT 0, -- satoshis
  join_reward BIGINT DEFAULT 0, -- satoshis for joining
  exit_fee BIGINT DEFAULT 2000, -- default 2000 sats
  sponsored_by TEXT, -- "Sponsored by Blockstream"
  
  -- Team Discovery Stats
  member_count INTEGER DEFAULT 0,
  avg_pace_seconds INTEGER, -- average pace in seconds per mile
  difficulty_level VARCHAR(20) DEFAULT 'intermediate' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'elite')),
  
  -- Status & Metadata
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  avatar TEXT, -- URL or identifier
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Wallet Integration (for Bitcoin rewards)
  wallet_id TEXT, -- CoinOS wallet ID
  wallet_username TEXT, -- CoinOS username
  wallet_password TEXT -- CoinOS password (encrypted)
);

-- 2. TEAM_MEMBERS TABLE: Member tracking for competition automation
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Store user ID (npub or traditional)
  npub TEXT, -- Store member's npub for Nostr integration
  
  -- Membership Details
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('captain', 'member', 'moderator')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  
  -- Competition Stats (for leaderboards)
  total_workouts INTEGER DEFAULT 0,
  total_distance_meters REAL DEFAULT 0,
  total_duration_minutes INTEGER DEFAULT 0,
  total_calories INTEGER DEFAULT 0,
  total_score REAL DEFAULT 0,
  
  -- Performance Tracking
  best_pace_seconds INTEGER, -- Best pace in seconds per mile
  last_workout_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one membership per user per team
  UNIQUE(team_id, user_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_teams_active ON teams(is_active);
CREATE INDEX IF NOT EXISTS idx_teams_featured ON teams(is_featured);
CREATE INDEX IF NOT EXISTS idx_teams_difficulty ON teams(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_teams_member_count ON teams(member_count);
CREATE INDEX IF NOT EXISTS idx_teams_captain ON teams(captain_id);
CREATE INDEX IF NOT EXISTS idx_teams_captain_npub ON teams(captain_npub) WHERE captain_npub IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_npub ON team_members(npub) WHERE npub IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_members_active ON team_members(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);
CREATE INDEX IF NOT EXISTS idx_team_members_score ON team_members(total_score);

-- Row Level Security Policies
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Teams are viewable by everyone" ON teams
  FOR SELECT USING (true);

CREATE POLICY "Team captains can manage their teams" ON teams
  FOR ALL USING (
    captain_id = current_setting('app.current_user_id', true) OR
    captain_npub = current_setting('app.current_user_npub', true)
  );

-- Team members policies  
CREATE POLICY "Team members can view their team's members" ON team_members
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = current_setting('app.current_user_id', true)
      OR npub = current_setting('app.current_user_npub', true)
    )
  );

CREATE POLICY "Users can manage their own membership" ON team_members
  FOR ALL USING (
    user_id = current_setting('app.current_user_id', true) OR
    npub = current_setting('app.current_user_npub', true)
  );

CREATE POLICY "Team captains can manage their team members" ON team_members
  FOR ALL USING (
    team_id IN (
      SELECT id FROM teams 
      WHERE captain_id = current_setting('app.current_user_id', true)
      OR captain_npub = current_setting('app.current_user_npub', true)
    )
  );

-- Helper Functions

-- Function to update updated_at timestamp (reuse existing or create)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update team member count
CREATE OR REPLACE FUNCTION update_team_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE teams 
        SET member_count = member_count + 1 
        WHERE id = NEW.team_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE teams 
        SET member_count = GREATEST(member_count - 1, 0) 
        WHERE id = OLD.team_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle active status changes
        IF OLD.is_active = true AND NEW.is_active = false THEN
            UPDATE teams 
            SET member_count = GREATEST(member_count - 1, 0) 
            WHERE id = OLD.team_id;
        ELSIF OLD.is_active = false AND NEW.is_active = true THEN
            UPDATE teams 
            SET member_count = member_count + 1 
            WHERE id = NEW.team_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
    BEFORE UPDATE ON team_members
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_team_member_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON team_members
    FOR EACH ROW
    EXECUTE PROCEDURE update_team_member_count();

-- Comments for documentation
COMMENT ON TABLE teams IS 'Core team data for competition automation and team management';
COMMENT ON TABLE team_members IS 'Team membership tracking with competition stats for leaderboards';

COMMENT ON COLUMN teams.captain_id IS 'Team captain user ID - can be npub or traditional ID';
COMMENT ON COLUMN teams.captain_npub IS 'Team captain Nostr public key for hybrid integration';
COMMENT ON COLUMN team_members.user_id IS 'Member user ID - can be npub or traditional ID';  
COMMENT ON COLUMN team_members.npub IS 'Member Nostr public key for hybrid integration';
COMMENT ON COLUMN team_members.total_score IS 'Calculated competition score for leaderboards';

-- Insert sample data for testing (optional - remove for production)
-- This ensures the system has some test teams for development
/*
INSERT INTO teams (name, about, captain_id, captain_npub, member_count, is_active) VALUES 
('Test Competition Team', 'A team for testing competition automation', 'test-captain-1', 'npub1test', 1, true)
ON CONFLICT DO NOTHING;
*/