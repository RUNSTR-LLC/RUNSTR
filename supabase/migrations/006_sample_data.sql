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
