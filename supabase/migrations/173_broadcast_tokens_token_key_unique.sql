-- Clean up duplicate token_keys before adding unique index.
-- Keep only the most recent row per token_key (latest device token).
DELETE FROM broadcast_tokens a
USING broadcast_tokens b
WHERE a.token_key IS NOT NULL
  AND a.token_key = b.token_key
  AND a.created_at < b.created_at;

-- Add unique partial index on token_key for upsert-by-user support.
-- Allows updating device token when it changes (app update, iOS update).
-- NULL token_keys excluded (anonymous registrations use token conflict).
CREATE UNIQUE INDEX IF NOT EXISTS idx_broadcast_tokens_token_key_unique
  ON broadcast_tokens (token_key)
  WHERE token_key IS NOT NULL;
