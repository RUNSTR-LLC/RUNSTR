-- =============================================
-- RUNSTR Migration: Create hybrid Nostr/Supabase schema
-- Purpose: Minimal privacy-first tables for hybrid architecture
-- - Nostr: Social features, teams, profiles, competition events
-- - Supabase: Background sync, device tokens, competition automation
-- =============================================

-- Enable Row Level Security by default
ALTER DEFAULT PRIVILEGES GRANT ALL ON TABLES TO authenticated;

-- 1. USERS TABLE: Minimal npub-only records for background services
CREATE TABLE IF NOT EXISTS users (
  npub TEXT PRIMARY KEY,                          -- Nostr public key (derived from nsec)
  device_token TEXT,                              -- Push notification token (nullable)
  healthkit_enabled BOOLEAN DEFAULT false,        -- Auto-sync consent for HealthKit
  last_sync TIMESTAMP WITH TIME ZONE,             -- Background sync tracking
  ghost_mode BOOLEAN DEFAULT false,               -- Competition-only participation (no social features)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. WORKOUTS TABLE: Competition metrics only (privacy-first)
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npub TEXT NOT NULL REFERENCES users(npub) ON DELETE CASCADE,
  workout_id TEXT UNIQUE,                         -- HealthKit UUID or Nostr event ID
  type TEXT NOT NULL,                             -- Exercise type (running, cycling, etc.)
  duration INTEGER,                               -- Minutes
  distance REAL,                                  -- Meters
  calories INTEGER,                               -- Total burned
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,   -- Workout start time
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. COMPETITION_ENTRIES TABLE: Auto-entry tracking for background sync
CREATE TABLE IF NOT EXISTS competition_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npub TEXT NOT NULL REFERENCES users(npub) ON DELETE CASCADE,
  competition_id TEXT NOT NULL,                   -- Nostr event ID
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  score REAL,                                     -- Calculated points
  auto_entered BOOLEAN DEFAULT false,             -- Auto vs manual entry
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate entries
  UNIQUE(npub, competition_id, workout_id)
);

-- 4. DEVICE_TOKENS TABLE: Already exists and is perfect - just update for npub
-- Check if device_tokens table exists, if not create it
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL,
  npub TEXT NOT NULL,                             -- Updated: Use npub instead of user_id
  device_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One active token per device per user
  UNIQUE(npub, device_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_users_device_token ON users(device_token) WHERE device_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_healthkit_enabled ON users(healthkit_enabled) WHERE healthkit_enabled = true;
CREATE INDEX IF NOT EXISTS idx_users_last_sync ON users(last_sync);

CREATE INDEX IF NOT EXISTS idx_workouts_npub ON workouts(npub);
CREATE INDEX IF NOT EXISTS idx_workouts_type ON workouts(type);
CREATE INDEX IF NOT EXISTS idx_workouts_start_time ON workouts(start_time);
CREATE INDEX IF NOT EXISTS idx_workouts_workout_id ON workouts(workout_id) WHERE workout_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_competition_entries_npub ON competition_entries(npub);
CREATE INDEX IF NOT EXISTS idx_competition_entries_competition ON competition_entries(competition_id);
CREATE INDEX IF NOT EXISTS idx_competition_entries_workout ON competition_entries(workout_id);
CREATE INDEX IF NOT EXISTS idx_competition_entries_auto ON competition_entries(auto_entered);

CREATE INDEX IF NOT EXISTS idx_device_tokens_npub ON device_tokens(npub);
CREATE INDEX IF NOT EXISTS idx_device_tokens_active ON device_tokens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_device_tokens_platform ON device_tokens(platform);

-- Row Level Security Policies

-- Users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own record" ON users
  FOR ALL USING (npub = current_setting('app.current_user_npub', true));

-- Workouts table  
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own workouts" ON workouts
  FOR ALL USING (npub = current_setting('app.current_user_npub', true));

-- Competition entries table
ALTER TABLE competition_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own competition entries" ON competition_entries
  FOR ALL USING (npub = current_setting('app.current_user_npub', true));

-- Device tokens table
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own device tokens" ON device_tokens
  FOR ALL USING (npub = current_setting('app.current_user_npub', true));

-- Helper function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update triggers for tables with updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_device_tokens_updated_at
    BEFORE UPDATE ON device_tokens
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE users IS 'Minimal npub-only records for background services and device management';
COMMENT ON TABLE workouts IS 'Privacy-first workout metrics for competition automation only';
COMMENT ON TABLE competition_entries IS 'Auto-entry tracking for background HealthKit sync';
COMMENT ON TABLE device_tokens IS 'Push notification device tokens for backend services';

COMMENT ON COLUMN users.npub IS 'Nostr public key - derived from user''s nsec, no traditional auth needed';
COMMENT ON COLUMN users.ghost_mode IS 'Competition participation without social features';
COMMENT ON COLUMN workouts.workout_id IS 'HealthKit UUID or Nostr event ID for deduplication';
COMMENT ON COLUMN competition_entries.auto_entered IS 'Distinguishes background sync entries from manual Nostr events';