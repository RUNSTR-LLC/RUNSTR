-- Migration 183: ppq_accounts — server-side storage of users' PPQ.AI keys
--
-- Purpose: Let the backend reward payer (runstr-zapper) create a PPQ.AI topup
--          invoice and pay it, instead of depending on the app to create the
--          invoice on-device. Fixes PPQ.AI earning for background-synced
--          workouts (no app running => no client-created invoice => no reward).
--
-- Security: A PPQ.AI key controls only AI credits (no withdrawal). RLS is
--           enabled with NO client policies, so the public anon key the app
--           ships with has ZERO access. Only service-role (Edge Functions,
--           zapper) can read/write. Keys enter ONLY via the register-ppq-account
--           Edge Function, which verifies a NIP-98 signature from the npub owner.
-- Date: 2026-06-21

CREATE TABLE IF NOT EXISTS ppq_accounts (
  npub        TEXT        PRIMARY KEY,
  api_key     TEXT        NOT NULL,
  credit_id   TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ppq_accounts ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies: RLS-enabled + no policy = deny-all to anon/authenticated.
-- service-role bypasses RLS.

COMMENT ON TABLE ppq_accounts IS
  'PPQ.AI keys keyed by npub. Written ONLY by register-ppq-account Edge Function '
  '(NIP-98 verified). Read by runstr-zapper (service-role) to create+pay topup '
  'invoices for users whose reward_destination is ppq. RLS deny-all to clients.';
COMMENT ON COLUMN ppq_accounts.api_key IS 'PPQ.AI API key (Bearer token for api.ppq.ai). Low-stakes: AI credits only, no withdrawal.';
COMMENT ON COLUMN ppq_accounts.credit_id IS 'PPQ.AI credit account UUID, used in topup/balance calls.';
