-- Migration 162: Simplified events — recurring, finalization, XP awards

ALTER TABLE competitions ADD COLUMN IF NOT EXISTS recurring_interval TEXT DEFAULT 'none';
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS recurring_parent_id UUID REFERENCES competitions(id);
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS competition_xp_awards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id),
  npub TEXT NOT NULL,
  placement INTEGER NOT NULL,
  xp_awarded INTEGER NOT NULL,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(competition_id, npub)
);

CREATE INDEX IF NOT EXISTS idx_competition_xp_awards_npub ON competition_xp_awards(npub);
CREATE INDEX IF NOT EXISTS idx_competition_xp_awards_competition ON competition_xp_awards(competition_id);

ALTER TABLE competition_xp_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read xp awards" ON competition_xp_awards;
CREATE POLICY "Anyone can read xp awards" ON competition_xp_awards
  FOR SELECT USING (true);

UPDATE competitions SET is_finalized = true WHERE end_date < NOW();
