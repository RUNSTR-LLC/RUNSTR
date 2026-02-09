-- Migration: 128_reward_push_token_key.sql
-- Purpose: Add token_key column to broadcast_tokens so the external zapping
--          tool can look up a device token by sha256(npub) and send a push
--          notification after a successful reward payment.

ALTER TABLE broadcast_tokens ADD COLUMN IF NOT EXISTS token_key TEXT;

CREATE INDEX IF NOT EXISTS idx_broadcast_tokens_token_key
  ON broadcast_tokens(token_key) WHERE token_key IS NOT NULL AND is_active = true;
