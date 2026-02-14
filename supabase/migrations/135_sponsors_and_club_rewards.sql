-- Migration 135: Reward Sponsors + Club Reward Routing
--
-- 1. reward_sponsors table: Configurable sponsor display on Rewards screen
-- 2. club_lightning_address on workout_submissions: Enables 10-sat club rewards

-- =============================================
-- 1. Reward Sponsors (app-configurable via Supabase)
-- =============================================

CREATE TABLE IF NOT EXISTS reward_sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,                    -- URL to sponsor logo (null = use local fallback)
  website_url TEXT,                 -- Link when tapped
  display_text TEXT DEFAULT 'This week''s rewards brought to you by',
  is_active BOOLEAN DEFAULT false,  -- Only one active at a time
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE reward_sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reward_sponsors_read" ON reward_sponsors
  FOR SELECT USING (true);

-- Seed with RUNSTR as default sponsor
INSERT INTO reward_sponsors (name, logo_url, website_url, display_text, is_active)
VALUES (
  'RUNSTR',
  NULL,
  'https://runstr.club',
  'Rewards brought to you by',
  true
);

-- =============================================
-- 2. Club Lightning Address on Workout Submissions
-- =============================================
-- The external zapper sends 10 sats to this address per qualified workout.
-- Separate from the main reward_lightning_address (which gets 50 sats).

ALTER TABLE workout_submissions
  ADD COLUMN IF NOT EXISTS club_lightning_address TEXT;

-- Index for the external zapper to query pending club rewards
CREATE INDEX IF NOT EXISTS idx_workout_submissions_club_lightning
  ON workout_submissions(club_lightning_address)
  WHERE club_lightning_address IS NOT NULL;
