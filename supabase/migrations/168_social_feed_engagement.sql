-- Migration 168: Social feed engagement tables
-- Adds zaps table, comments table, comment_count column.
-- Adds merge functions for indexer array updates.
-- Drops RPCs that are replaced by Nostr-first write architecture.

-- ============================================
-- New table: social_feed_zaps
-- ============================================

CREATE TABLE social_feed_zaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  post_id UUID NOT NULL REFERENCES social_feed(id) ON DELETE CASCADE,
  sender_npub TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ,
  indexed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_social_feed_zaps_post ON social_feed_zaps (post_id, created_at DESC);

ALTER TABLE social_feed_zaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON social_feed_zaps FOR SELECT USING (true);

-- ============================================
-- New table: social_feed_comments
-- ============================================

CREATE TABLE social_feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  post_id UUID NOT NULL REFERENCES social_feed(id) ON DELETE CASCADE,
  sender_npub TEXT NOT NULL,
  content TEXT NOT NULL,
  author_name TEXT,
  author_avatar TEXT,
  created_at TIMESTAMPTZ,
  indexed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_social_feed_comments_post ON social_feed_comments (post_id, created_at DESC);

ALTER TABLE social_feed_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON social_feed_comments FOR SELECT USING (true);

-- ============================================
-- Add comment_count to social_feed
-- ============================================

ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- ============================================
-- Merge functions for indexer array updates
-- ============================================

CREATE OR REPLACE FUNCTION merge_liked_by(target_post_id UUID, new_npubs TEXT[])
RETURNS VOID AS $$
DECLARE
  merged TEXT[];
BEGIN
  SELECT ARRAY(
    SELECT DISTINCT unnest(liked_by || new_npubs)
  ) INTO merged
  FROM social_feed WHERE id = target_post_id;

  UPDATE social_feed
  SET liked_by = merged,
      like_count = array_length(merged, 1)
  WHERE id = target_post_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION merge_reposted_by(target_post_id UUID, new_npubs TEXT[])
RETURNS VOID AS $$
DECLARE
  merged TEXT[];
BEGIN
  SELECT ARRAY(
    SELECT DISTINCT unnest(reposted_by || new_npubs)
  ) INTO merged
  FROM social_feed WHERE id = target_post_id;

  UPDATE social_feed
  SET reposted_by = merged,
      repost_count = array_length(merged, 1)
  WHERE id = target_post_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Drop RPCs replaced by indexer-only writes
-- ============================================

DROP FUNCTION IF EXISTS toggle_social_like(UUID, TEXT);
DROP FUNCTION IF EXISTS add_social_repost(UUID, TEXT);
DROP FUNCTION IF EXISTS add_social_zap(UUID, INTEGER);
