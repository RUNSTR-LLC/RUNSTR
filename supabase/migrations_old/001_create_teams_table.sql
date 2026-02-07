-- RUNSTR Teams Table
-- Core team data for team discovery and management

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  about TEXT, -- Team mission/vibe for discovery
  
  -- Team Leadership
  captain_id UUID REFERENCES auth.users(id),
  
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_teams_active ON teams(is_active);
CREATE INDEX idx_teams_featured ON teams(is_featured);
CREATE INDEX idx_teams_difficulty ON teams(difficulty_level);
CREATE INDEX idx_teams_member_count ON teams(member_count);

-- RLS Policies
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read teams for discovery
CREATE POLICY "Teams are viewable by everyone" ON teams
  FOR SELECT USING (true);

-- Only captains can manage their teams
CREATE POLICY "Team captains can manage their teams" ON teams
  FOR ALL USING (auth.uid() = captain_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();