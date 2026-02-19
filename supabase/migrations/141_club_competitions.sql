-- 141_club_competitions.sql
-- Link competitions to clubs so captains can create events for their club.
-- Nullable: existing events remain unlinked, and if a club is deactivated the event stays.

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES user_teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_competitions_club_id
  ON competitions (club_id)
  WHERE club_id IS NOT NULL;
