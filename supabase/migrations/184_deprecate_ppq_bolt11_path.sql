-- Migration 184: Mark the client-created ppq_bolt11 path as deprecated.
--
-- PPQ.AI rewards are now created server-side by runstr-zapper, which reads the
-- user's key from ppq_accounts (migration 183) and creates the topup invoice for
-- the exact reward amount. The client no longer writes ppq_bolt11.
--
-- These columns + the migration 176 "skip if reward_destination=ppq and no
-- bolt11" branch remain for backward-compat with rows from old app versions.
-- A future migration can drop them once old clients age out.
-- Date: 2026-06-21

COMMENT ON COLUMN workout_submissions.ppq_bolt11 IS
  'DEPRECATED (2026-06-21): legacy client-created PPQ.AI topup invoice. New flow '
  'creates invoices server-side via ppq_accounts + runstr-zapper. Retained only '
  'for backward-compat with old-client rows.';
COMMENT ON COLUMN workout_submissions.ppq_invoice_id IS
  'DEPRECATED (2026-06-21): see ppq_bolt11. Legacy client-side PPQ.AI invoice id.';
