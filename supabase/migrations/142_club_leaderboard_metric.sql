-- Add leaderboard_metric column to user_teams (clubs)
-- Captains can choose 'distance' (default: shows distance + time) or 'steps' (shows step count)
ALTER TABLE user_teams ADD COLUMN IF NOT EXISTS leaderboard_metric TEXT DEFAULT 'distance';
