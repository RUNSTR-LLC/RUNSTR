-- =============================================
-- RUNSTR Migration: Drop existing complex tables
-- Purpose: Clean up traditional app structure for hybrid Nostr/Supabase approach
-- =============================================

-- Drop all complex traditional app tables
-- Note: This will delete all existing data - make sure you have backups if needed

-- Drop dependent tables first (foreign key constraints)
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

-- Drop main tables
DROP TABLE IF EXISTS teams CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_team_member_count() CASCADE;
DROP FUNCTION IF EXISTS update_team_avg_pace() CASCADE;
DROP FUNCTION IF EXISTS recalculate_team_leaderboard(UUID, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS update_leaderboards_on_workout() CASCADE;
DROP FUNCTION IF EXISTS update_event_leaderboard_rankings() CASCADE;
DROP FUNCTION IF EXISTS update_league_leaderboard_rankings() CASCADE;

-- Note: We keep device_tokens table as it's already perfect for hybrid architecture

COMMENT ON SCHEMA public IS 'Cleaned up for hybrid Nostr/Supabase architecture - Nostr for social, Supabase for automation only';