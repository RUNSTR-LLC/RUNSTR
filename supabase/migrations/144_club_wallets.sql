-- =============================================
-- Migration 144: Club Wallets (Encrypted CoinOS Credentials)
-- =============================================
--
-- Stores CoinOS wallet credentials for each club. Passwords are encrypted
-- using pgp_sym_encrypt with a Vault secret so that even database access
-- does not reveal plaintext credentials.
--
-- SECURITY:
-- - RLS denies ALL access via anon key (no SELECT, no INSERT, no UPDATE)
-- - Only service_role can read/write (via SECURITY DEFINER RPCs)
-- - Passwords encrypted with pgp_sym_encrypt (requires pgcrypto)
-- - Decryption key stored in Supabase Vault (not in code or env vars)
--
-- PREREQUISITE: Add a Vault secret named 'club_wallet_encryption_key'
-- via Supabase Dashboard > Settings > Vault before running this migration.
-- =============================================

-- Ensure pgcrypto is available for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Club wallets table
CREATE TABLE IF NOT EXISTS club_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL UNIQUE REFERENCES user_teams(id) ON DELETE CASCADE,
  coinos_username TEXT NOT NULL,
  coinos_password_encrypted BYTEA NOT NULL,
  lightning_address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast club lookup
CREATE INDEX IF NOT EXISTS idx_club_wallets_club_id ON club_wallets(club_id);

-- 2. Row Level Security — DENY ALL to anon, ALLOW service_role only
ALTER TABLE club_wallets ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role manages club wallets" ON club_wallets
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- NO policy for anon/authenticated = implicit deny
-- An attacker with the anon key cannot SELECT, INSERT, UPDATE, or DELETE.

-- 3. RPC: Insert a club wallet (encrypts password server-side)
CREATE OR REPLACE FUNCTION insert_club_wallet(
  p_club_id UUID,
  p_coinos_username TEXT,
  p_coinos_password TEXT,
  p_lightning_address TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Get encryption key from Vault
  SELECT decrypted_secret INTO encryption_key
  FROM vault.decrypted_secrets
  WHERE name = 'club_wallet_encryption_key';

  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Vault secret club_wallet_encryption_key not found';
  END IF;

  INSERT INTO club_wallets (club_id, coinos_username, coinos_password_encrypted, lightning_address)
  VALUES (
    p_club_id,
    p_coinos_username,
    pgp_sym_encrypt(p_coinos_password, encryption_key),
    p_lightning_address
  );
END;
$$;

-- 4. RPC: Get decrypted club wallet credentials (service_role only)
CREATE OR REPLACE FUNCTION get_club_wallet_credentials(p_club_id UUID)
RETURNS TABLE(
  coinos_username TEXT,
  coinos_password TEXT,
  lightning_address TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Get encryption key from Vault
  SELECT decrypted_secret INTO encryption_key
  FROM vault.decrypted_secrets
  WHERE name = 'club_wallet_encryption_key';

  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Vault secret club_wallet_encryption_key not found';
  END IF;

  RETURN QUERY
  SELECT
    cw.coinos_username,
    pgp_sym_decrypt(cw.coinos_password_encrypted, encryption_key)::TEXT AS coinos_password,
    cw.lightning_address
  FROM club_wallets cw
  WHERE cw.club_id = p_club_id;
END;
$$;

-- 5. Restrict RPC functions to service_role only
REVOKE ALL ON FUNCTION insert_club_wallet FROM PUBLIC;
GRANT EXECUTE ON FUNCTION insert_club_wallet TO service_role;

REVOKE ALL ON FUNCTION get_club_wallet_credentials FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_club_wallet_credentials TO service_role;

-- =============================================
-- Comments
-- =============================================
COMMENT ON TABLE club_wallets IS 'Encrypted CoinOS wallet credentials for club rewards pools. Service-role access only.';
COMMENT ON COLUMN club_wallets.coinos_password_encrypted IS 'CoinOS password encrypted with pgp_sym_encrypt using Vault key';
COMMENT ON COLUMN club_wallets.lightning_address IS 'CoinOS Lightning address (username@coinos.io) for receiving zaps';

-- =============================================
-- Verification queries:
-- =============================================
--
-- Check table exists:
-- SELECT * FROM club_wallets LIMIT 1;
--
-- Verify RLS blocks anon access (should return 0 rows):
-- SET ROLE anon; SELECT * FROM club_wallets; RESET ROLE;
--
-- Test insert via RPC (requires Vault secret):
-- SELECT insert_club_wallet('some-uuid', 'testuser', 'testpass', 'testuser@coinos.io');
--
-- Test credential retrieval:
-- SELECT * FROM get_club_wallet_credentials('some-uuid');
-- =============================================
