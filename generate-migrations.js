/**
 * RUNSTR Database Migration Generator
 * Creates copy-paste SQL scripts for Supabase SQL Editor
 */

const fs = require('fs');
const path = require('path');

function generateMigrations() {
  console.log('🛠️  Generating SQL Migration Scripts...\n');

  const migrations = [];

  // Migration 1: Create payments table
  const paymentsSQL = `
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
`;

  // Migration 2: Create leaderboards table
  const leaderboardsSQL = `
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
`;

  // Migration 3: Sample data generator
  const sampleDataSQL = `
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
`;

  migrations.push({
    name: '004_create_payments_table',
    description: 'Create payments table for Bitcoin transactions',
    sql: paymentsSQL
  });

  migrations.push({
    name: '005_create_leaderboards_table', 
    description: 'Create leaderboards table with auto-calculation',
    sql: leaderboardsSQL
  });

  migrations.push({
    name: '006_sample_data',
    description: 'Generate sample data for testing (optional)',
    sql: sampleDataSQL
  });

  // Create migration files
  const migrationsDir = path.join(__dirname, 'supabase/migrations');
  
  // Ensure migrations directory exists
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  migrations.forEach((migration, index) => {
    const filename = path.join(migrationsDir, `${migration.name}.sql`);
    fs.writeFileSync(filename, migration.sql.trim() + '\n');
    console.log(`✅ Created: ${migration.name}.sql`);
    console.log(`   ${migration.description}`);
  });

  // Create a single copy-paste file
  const allMigrationsSQL = migrations.map(m => `-- ${m.name.toUpperCase()}\n-- ${m.description}\n\n${m.sql}`).join('\n\n');
  const copyPasteFile = path.join(__dirname, 'COPY_PASTE_TO_SUPABASE.sql');
  fs.writeFileSync(copyPasteFile, allMigrationsSQL);
  
  console.log(`\n🎯 READY TO DEPLOY:`);
  console.log(`📁 Individual files: supabase/migrations/`);
  console.log(`📋 Copy-paste file: COPY_PASTE_TO_SUPABASE.sql`);
  console.log(`\n📖 DEPLOYMENT OPTIONS:`);
  console.log(`   Option 1: Copy content from COPY_PASTE_TO_SUPABASE.sql to Supabase SQL Editor`);
  console.log(`   Option 2: Run individual migration files if you prefer step-by-step`);
  console.log(`   Option 3: Skip the sample data (006) if you want empty tables`);
  
  return migrations;
}

// Run the generator
const migrations = generateMigrations();
console.log(`\n✅ Generated ${migrations.length} migration scripts!`);
process.exit(0);