-- Migration 161: Social feed interaction columns and RPC functions
-- Adds like/repost/zap tracking with atomic Postgres functions

ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS repost_count INTEGER DEFAULT 0;
ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS zap_total INTEGER DEFAULT 0;
ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS liked_by TEXT[] DEFAULT '{}';
ALTER TABLE social_feed ADD COLUMN IF NOT EXISTS reposted_by TEXT[] DEFAULT '{}';

CREATE OR REPLACE FUNCTION toggle_social_like(post_id UUID, user_npub TEXT)
RETURNS TABLE(new_like_count INTEGER, is_liked BOOLEAN) AS $$
DECLARE
  currently_liked BOOLEAN;
BEGIN
  SELECT user_npub = ANY(liked_by) INTO currently_liked
  FROM social_feed WHERE id = post_id;

  IF currently_liked THEN
    UPDATE social_feed
    SET liked_by = array_remove(liked_by, user_npub),
        like_count = GREATEST(like_count - 1, 0)
    WHERE id = post_id;
    RETURN QUERY SELECT like_count, false FROM social_feed WHERE id = post_id;
  ELSE
    UPDATE social_feed
    SET liked_by = array_append(liked_by, user_npub),
        like_count = like_count + 1
    WHERE id = post_id;
    RETURN QUERY SELECT like_count, true FROM social_feed WHERE id = post_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION add_social_repost(post_id UUID, user_npub TEXT)
RETURNS TABLE(new_repost_count INTEGER, was_added BOOLEAN) AS $$
DECLARE
  already_reposted BOOLEAN;
BEGIN
  SELECT user_npub = ANY(reposted_by) INTO already_reposted
  FROM social_feed WHERE id = post_id;

  IF already_reposted THEN
    RETURN QUERY SELECT repost_count, false FROM social_feed WHERE id = post_id;
  ELSE
    UPDATE social_feed
    SET reposted_by = array_append(reposted_by, user_npub),
        repost_count = repost_count + 1
    WHERE id = post_id;
    RETURN QUERY SELECT repost_count, true FROM social_feed WHERE id = post_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION add_social_zap(post_id UUID, amount INTEGER)
RETURNS INTEGER AS $$
DECLARE
  new_total INTEGER;
BEGIN
  UPDATE social_feed
  SET zap_total = zap_total + amount
  WHERE id = post_id
  RETURNING zap_total INTO new_total;
  RETURN new_total;
END;
$$ LANGUAGE plpgsql;
