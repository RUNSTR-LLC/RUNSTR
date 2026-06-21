# RUNSTR Zapper — PPQ.AI Backend Invoicing Handoff

> Companion to `2026-06-21-ppq-backend-invoice-design.md`. Self-contained for the `runstr-zapper` repo. Hand the maintainer this one file.

## What's being added

PPQ.AI users earn AI credits instead of sats. Previously the **app** created the topup invoice and wrote `workout_submissions.ppq_bolt11`. That failed for background-synced workouts (no app running). The app no longer creates invoices. The zapper now creates and pays the PPQ.AI invoice itself.

## Schema (migration lives in the RUNSTR app repo — migration 183)

```sql
CREATE TABLE ppq_accounts (
  npub       TEXT PRIMARY KEY,
  api_key    TEXT NOT NULL,   -- Bearer token for api.ppq.ai
  credit_id  TEXT NOT NULL,   -- PPQ.AI credit account UUID
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
-- RLS deny-all to clients; zapper reads with its existing service-role creds.
```

## Logic to add to the workout-reward path

When processing a `workout_submissions` row whose `raw_event.tags` contains `['reward_destination','ppq']`:

1. Compute the reward amount exactly as you do today (base + streak/bonus). Call it `amount_sats`.
2. Look up the key: `SELECT api_key, credit_id FROM ppq_accounts WHERE npub = <row.npub>`.
   - If no row: record a skipped payout (`status='skipped_no_ppq_account'`). **Do NOT** fall back to a Lightning address (would misroute an AI-credit reward to a wallet).
3. Create the topup invoice (server-to-server — same call the app used to make):
   ```
   POST https://api.ppq.ai/topup/create/btc-lightning
   Authorization: Bearer <api_key>
   Content-Type: application/json
   { "credit_id": "<credit_id>", "amount": <amount_sats>, "currency": "SATS" }
   ```
   Response: read `bolt11` (fallback field name `lightning_invoice`).
   - On failure: record a failed payout; rely on your normal retry semantics.
4. Pay `bolt11` via your existing `pay_invoice` path. **Insert the idempotency row BEFORE paying** (same rule as `2026-05-11-zapper-bonuses-handoff.md`) so a PPQ reward is never double-created.

## Critical invariants

- **Invoice amount == paid amount.** Because PPQ topup invoices are fixed-amount, create the invoice for the *final* computed `amount_sats` (after streak/bonus), not a base value.
- **No Lightning fallback for PPQ.** Missing key or failed invoice → skip/fail, never reroute to a wallet.
- **Legacy rows:** older app versions still write `workout_submissions.ppq_bolt11`. If a row already has a non-empty `ppq_bolt11`, keep paying it directly (old path) and skip steps 2–3. Only do the new flow when `ppq_bolt11` is empty.

## Open items to confirm in the zapper code

1. Exact location where the workout reward amount is computed (so the invoice uses it).
2. Whether you want a push notification on successful PPQ topup (parity with sats rewards); if so wire it through the existing notify path.
