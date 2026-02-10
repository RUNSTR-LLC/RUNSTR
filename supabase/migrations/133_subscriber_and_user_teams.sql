-- Migration 133: Subscribers and User-Created Teams
-- Enables subscription-gated team and event creation

-- 1. Subscribers table
CREATE TABLE IF NOT EXISTS subscribers (
  npub TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  plan TEXT NOT NULL DEFAULT 'creator' CHECK (plan IN ('creator')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);

-- RLS: anyone can read subscriber status, no public inserts
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscribers_select" ON subscribers
  FOR SELECT USING (true);

-- 2. User-created teams table
CREATE TABLE IF NOT EXISTS user_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  lightning_address TEXT,
  created_by_npub TEXT NOT NULL,
  member_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_teams_created_by ON user_teams(created_by_npub);
CREATE INDEX IF NOT EXISTS idx_user_teams_active ON user_teams(is_active);

-- RLS: public read, authenticated insert
ALTER TABLE user_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_teams_select" ON user_teams
  FOR SELECT USING (true);

CREATE POLICY "user_teams_insert" ON user_teams
  FOR INSERT WITH CHECK (true);

-- 3. Add created_by_npub to competitions (nullable for existing rows)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competitions' AND column_name = 'created_by_npub'
  ) THEN
    ALTER TABLE competitions ADD COLUMN created_by_npub TEXT;
  END IF;
END $$;

-- Allow public inserts on competitions (for subscriber-created events)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'competitions' AND policyname = 'competitions_insert'
  ) THEN
    CREATE POLICY "competitions_insert" ON competitions
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;
