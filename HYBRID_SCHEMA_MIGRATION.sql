-- =============================================
-- RUNSTR Hybrid Nostr/Supabase Schema Migration
-- Purpose: Replace complex traditional app structure with minimal hybrid architecture
-- 
-- IMPORTANT: This will DROP ALL EXISTING DATA in current tables!
-- Make sure to backup any important data before running this migration.
-- =============================================

-- Step 1: Drop all existing complex tables
-- Note: This removes all teams, activities, leaderboards, payments, etc.

DROP TABLE IF EXISTS leaderboards CASCADE;
DROP TABLE IF EXISTS event_leaderboard CASCADE;
DROP TABLE IF EXISTS challenge_leaderboard CASCADE;
DROP TABLE IF EXISTS league_leaderboard CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS team_payouts CASCADE;
DROP TABLE IF EXISTS team_stats CASCADE;
DROP TABLE IF EXISTS team_activities CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- Drop old functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_team_member_count() CASCADE;
DROP FUNCTION IF EXISTS update_team_avg_pace() CASCADE;
DROP FUNCTION IF EXISTS recalculate_team_leaderboard(UUID, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS update_leaderboards_on_workout() CASCADE;
DROP FUNCTION IF EXISTS update_event_leaderboard_rankings() CASCADE;
DROP FUNCTION IF EXISTS update_league_leaderboard_rankings() CASCADE;

-- Step 2: Create minimal hybrid schema

-- Enable RLS by default
ALTER DEFAULT PRIVILEGES GRANT ALL ON TABLES TO authenticated;

-- 1. USERS TABLE: Minimal npub-only records
CREATE TABLE users (
  npub TEXT PRIMARY KEY,
  device_token TEXT,
  healthkit_enabled BOOLEAN DEFAULT false,
  last_sync TIMESTAMP WITH TIME ZONE,
  ghost_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. WORKOUTS TABLE: Competition metrics only
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npub TEXT NOT NULL REFERENCES users(npub) ON DELETE CASCADE,
  workout_id TEXT UNIQUE,
  type TEXT NOT NULL,
  duration INTEGER,
  distance REAL,
  calories INTEGER,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. COMPETITION_ENTRIES TABLE: Auto-entry tracking
CREATE TABLE competition_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npub TEXT NOT NULL REFERENCES users(npub) ON DELETE CASCADE,
  competition_id TEXT NOT NULL,
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  score REAL,
  auto_entered BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(npub, competition_id, workout_id)
);

-- 4. DEVICE_TOKENS TABLE: Update existing or create new
DROP TABLE IF EXISTS device_tokens CASCADE;
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL,
  npub TEXT NOT NULL,
  device_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(npub, device_id)
);

-- Performance indexes
CREATE INDEX idx_users_device_token ON users(device_token) WHERE device_token IS NOT NULL;
CREATE INDEX idx_users_healthkit_enabled ON users(healthkit_enabled) WHERE healthkit_enabled = true;
CREATE INDEX idx_users_last_sync ON users(last_sync);

CREATE INDEX idx_workouts_npub ON workouts(npub);
CREATE INDEX idx_workouts_type ON workouts(type);
CREATE INDEX idx_workouts_start_time ON workouts(start_time);
CREATE INDEX idx_workouts_workout_id ON workouts(workout_id) WHERE workout_id IS NOT NULL;

CREATE INDEX idx_competition_entries_npub ON competition_entries(npub);
CREATE INDEX idx_competition_entries_competition ON competition_entries(competition_id);
CREATE INDEX idx_competition_entries_workout ON competition_entries(workout_id);
CREATE INDEX idx_competition_entries_auto ON competition_entries(auto_entered);

CREATE INDEX idx_device_tokens_npub ON device_tokens(npub);
CREATE INDEX idx_device_tokens_active ON device_tokens(is_active) WHERE is_active = true;
CREATE INDEX idx_device_tokens_platform ON device_tokens(platform);

-- Row Level Security Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own record" ON users
  FOR ALL USING (npub = current_setting('app.current_user_npub', true));

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own workouts" ON workouts
  FOR ALL USING (npub = current_setting('app.current_user_npub', true));

ALTER TABLE competition_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own competition entries" ON competition_entries
  FOR ALL USING (npub = current_setting('app.current_user_npub', true));

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own device tokens" ON device_tokens
  FOR ALL USING (npub = current_setting('app.current_user_npub', true));

-- Helper function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_device_tokens_updated_at
    BEFORE UPDATE ON device_tokens
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Hybrid Nostr/Supabase schema migration completed successfully!';
    RAISE NOTICE 'Schema now has 4 minimal tables: users, workouts, competition_entries, device_tokens';
    RAISE NOTICE 'All social features should use Nostr events, Supabase is for background automation only';
END $$;