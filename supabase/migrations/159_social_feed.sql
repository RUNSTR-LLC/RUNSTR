-- Migration 159: Social feed table
-- Stores Nostr kind 1 posts with fitness hashtags.
-- Populated by external indexer + app dual-write.

CREATE TABLE IF NOT EXISTS social_feed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  npub TEXT NOT NULL,
  content TEXT NOT NULL,
  images TEXT[],
  hashtags TEXT[],
  author_name TEXT,
  author_avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  indexed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_feed_created_at ON social_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_feed_npub ON social_feed(npub);

ALTER TABLE social_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read social feed" ON social_feed;
CREATE POLICY "Anyone can read social feed" ON social_feed
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert social feed" ON social_feed;
CREATE POLICY "Anyone can insert social feed" ON social_feed
  FOR INSERT WITH CHECK (true);
