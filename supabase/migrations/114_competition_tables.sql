-- Migration: Create competitions and competition_participants tables
-- These tables were missing from migrations (existed only in old Supabase)
-- Date: 2026-01-16

-- ============================================================================
-- 1. COMPETITIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE NOT NULL,        -- e.g., 'running-bitcoin', 'season-ii'
  name TEXT NOT NULL,
  description TEXT,
  activity_type TEXT NOT NULL,             -- running, walking, cycling, etc.
  scoring_method TEXT DEFAULT 'total_distance',  -- total_distance, total_duration, workout_count
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  prize_pool_sats INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. COMPETITION_PARTICIPANTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS competition_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  npub TEXT NOT NULL,
  name TEXT,                               -- Cached display name
  picture TEXT,                            -- Cached avatar URL
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(competition_id, npub)
);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_competitions_external_id ON competitions(external_id);
CREATE INDEX IF NOT EXISTS idx_competitions_dates ON competitions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_competition_participants_competition ON competition_participants(competition_id);
CREATE INDEX IF NOT EXISTS idx_competition_participants_npub ON competition_participants(npub);

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_participants ENABLE ROW LEVEL SECURITY;

-- Competitions: Anyone can read, service role manages
CREATE POLICY "Anyone can read competitions" ON competitions
  FOR SELECT USING (true);

CREATE POLICY "Service role manages competitions" ON competitions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Participants: Anyone can read, anyone can join (insert), service role manages all
CREATE POLICY "Anyone can read participants" ON competition_participants
  FOR SELECT USING (true);

CREATE POLICY "Anyone can join competitions" ON competition_participants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role manages participants" ON competition_participants
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- 5. SEED COMPETITIONS DATA
-- ============================================================================

-- Season II: January 1 - March 1, 2026
INSERT INTO competitions (external_id, name, description, activity_type, scoring_method, start_date, end_date, prize_pool_sats)
VALUES (
  'season-ii',
  'Season II',
  'RUNSTR Season II Competition - Two-month distance-based running competition',
  'running',
  'total_distance',
  '2026-01-01T00:00:00Z',
  '2026-03-01T23:59:59Z',
  500000
)
ON CONFLICT (external_id) DO NOTHING;

-- Running Bitcoin: January 10 - January 31, 2026
INSERT INTO competitions (external_id, name, description, activity_type, scoring_method, start_date, end_date, prize_pool_sats)
VALUES (
  'running-bitcoin',
  'Running Bitcoin Challenge',
  '21km Challenge honoring Hal Finney - Bitcoin pioneer and ALS patient. Running + walking eligible.',
  'running',
  'total_distance',
  '2026-01-10T00:00:00Z',
  '2026-01-31T23:59:59Z',
  0
)
ON CONFLICT (external_id) DO NOTHING;

-- January Walking Contest: January 1 - January 31, 2026
INSERT INTO competitions (external_id, name, description, activity_type, scoring_method, start_date, end_date, prize_pool_sats)
VALUES (
  'january-walking',
  'January Walking Contest',
  'January 2026 walking competition - top 3 with longest walking distance win 1k sats each',
  'walking',
  'total_distance',
  '2026-01-01T00:00:00Z',
  '2026-01-31T23:59:59Z',
  3000
)
ON CONFLICT (external_id) DO NOTHING;

-- Einundzwanzig Fitness Challenge: January 21 - February 21, 2026
INSERT INTO competitions (external_id, name, description, activity_type, scoring_method, start_date, end_date, prize_pool_sats)
VALUES (
  'einundzwanzig',
  'Einundzwanzig Fitness Challenge',
  'Team-based charity fundraiser for the German-speaking Bitcoin community. 1 km = 1,000 sats donated.',
  'running',
  'total_distance',
  '2026-01-21T00:00:00Z',
  '2026-02-21T23:59:59Z',
  3000000
)
ON CONFLICT (external_id) DO NOTHING;

-- Einundzwanzig Running: January 21 - February 21, 2026 (activity-specific leaderboard)
INSERT INTO competitions (external_id, name, description, activity_type, scoring_method, start_date, end_date, prize_pool_sats)
VALUES (
  'einundzwanzig-running',
  'Einundzwanzig Fitness Challenge - Running',
  'Team-based charity fundraiser - Running category. 1 km = 1,000 sats donated.',
  'running',
  'total_distance',
  '2026-01-21T00:00:00Z',
  '2026-02-21T23:59:59Z',
  1500000
)
ON CONFLICT (external_id) DO NOTHING;

-- Einundzwanzig Walking: January 21 - February 21, 2026 (activity-specific leaderboard)
INSERT INTO competitions (external_id, name, description, activity_type, scoring_method, start_date, end_date, prize_pool_sats)
VALUES (
  'einundzwanzig-walking',
  'Einundzwanzig Fitness Challenge - Walking',
  'Team-based charity fundraiser - Walking category. 1 km = 1,000 sats donated.',
  'walking',
  'total_distance',
  '2026-01-21T00:00:00Z',
  '2026-02-21T23:59:59Z',
  1500000
)
ON CONFLICT (external_id) DO NOTHING;

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================

COMMENT ON TABLE competitions IS 'Competition/event definitions with dates and scoring rules';
COMMENT ON TABLE competition_participants IS 'Users who have joined competitions (opt-in tracking)';
COMMENT ON COLUMN competitions.external_id IS 'Human-readable ID used in app (e.g., running-bitcoin)';
COMMENT ON COLUMN competitions.scoring_method IS 'How to rank: total_distance, total_duration, or workout_count';
COMMENT ON COLUMN competition_participants.name IS 'Cached Nostr profile name for fast leaderboard display';
COMMENT ON COLUMN competition_participants.picture IS 'Cached Nostr profile picture URL for fast leaderboard display';
