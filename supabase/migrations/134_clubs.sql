-- Migration 134: Clubs System
-- Adds club memberships table for social fitness clubs (separate from reward destinations)
-- Adds club chat messages table with Supabase Realtime
-- Adds club_id to workout_submissions for club leaderboards

-- =============================================
-- 1. Club Memberships (one club per user)
-- =============================================

CREATE TABLE IF NOT EXISTS club_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES user_teams(id) ON DELETE CASCADE,
  member_npub TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'captain')),
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- One club per user (enforced at database level)
CREATE UNIQUE INDEX IF NOT EXISTS idx_club_memberships_one_per_user
  ON club_memberships(member_npub);

-- Fast lookups by club
CREATE INDEX IF NOT EXISTS idx_club_memberships_club
  ON club_memberships(club_id);

-- Fast lookups by member
CREATE INDEX IF NOT EXISTS idx_club_memberships_member
  ON club_memberships(member_npub);

-- RLS
ALTER TABLE club_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "club_memberships_read" ON club_memberships
  FOR SELECT USING (true);

CREATE POLICY "club_memberships_insert" ON club_memberships
  FOR INSERT WITH CHECK (true);

CREATE POLICY "club_memberships_delete" ON club_memberships
  FOR DELETE USING (true);

-- =============================================
-- 2. Club Chat Messages
-- =============================================

CREATE TABLE IF NOT EXISTS club_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES user_teams(id) ON DELETE CASCADE,
  sender_npub TEXT NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 1000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Fetch messages by club, newest first (excluding deleted)
CREATE INDEX IF NOT EXISTS idx_club_messages_club_created
  ON club_messages(club_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Rate limiting index
CREATE INDEX IF NOT EXISTS idx_club_messages_sender_recent
  ON club_messages(sender_npub, created_at DESC);

-- RLS
ALTER TABLE club_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "club_messages_read" ON club_messages
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "club_messages_insert" ON club_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "club_messages_update" ON club_messages
  FOR UPDATE USING (true) WITH CHECK (deleted_at IS NOT NULL);

-- Enable Supabase Realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE club_messages;

-- =============================================
-- 3. Add club_id to workout_submissions
-- =============================================

ALTER TABLE workout_submissions ADD COLUMN IF NOT EXISTS club_id UUID;

CREATE INDEX IF NOT EXISTS idx_workout_submissions_club_id
  ON workout_submissions(club_id) WHERE club_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workout_submissions_club_date
  ON workout_submissions(club_id, leaderboard_date) WHERE club_id IS NOT NULL;
