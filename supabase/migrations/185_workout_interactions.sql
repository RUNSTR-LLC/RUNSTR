-- Phase 2: in-app workout-feed interactions, keyed by the workout's 1301 event_id.
-- Public read; anon insert (WITH CHECK true) mirrors migration 159 (social_feed).

CREATE TABLE IF NOT EXISTS workout_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  npub TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (event_id, npub)
);
CREATE INDEX IF NOT EXISTS idx_workout_likes_event ON workout_likes(event_id);
ALTER TABLE workout_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read workout_likes" ON workout_likes FOR SELECT USING (true);
CREATE POLICY "Anon insert workout_likes" ON workout_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon delete workout_likes" ON workout_likes FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS workout_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  npub TEXT NOT NULL,
  content TEXT NOT NULL,
  author_name TEXT,
  author_avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workout_comments_event ON workout_comments(event_id);
ALTER TABLE workout_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read workout_comments" ON workout_comments FOR SELECT USING (true);
CREATE POLICY "Anon insert workout_comments" ON workout_comments FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS workout_zaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  sender_npub TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workout_zaps_event ON workout_zaps(event_id);
ALTER TABLE workout_zaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read workout_zaps" ON workout_zaps FOR SELECT USING (true);
CREATE POLICY "Anon insert workout_zaps" ON workout_zaps FOR INSERT WITH CHECK (true);
