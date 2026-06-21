# PPQ.AI Backend Invoice — Design Spec

**Date:** 2026-06-21
**Status:** Approved for planning
**Topic:** Make PPQ.AI credit earning reliable by moving topup-invoice creation off the device and into the backend reward path.

---

## Problem

Users can choose **PPQ.AI** as their reward destination — instead of receiving sats, their workout rewards top up their PPQ.AI AI-credit balance (used by Coach RUNSTR).

Today the flow is **client-driven and effectively broken**:

1. PPQ key + `credit_id` live **only in device AsyncStorage** (`PPQAccountService`, explicitly "never sent to backend").
2. At workout-submit time the **app** calls `PPQAccountService.createTopupInvoice()` (`SupabaseCompetitionService.ts:351`), writes the resulting `ppq_bolt11` onto the `workout_submissions` row (`:435`).
3. The reward payer pays that invoice.

This fails whenever there is no app present to create the invoice:

- **Background / auto-synced workouts** (HealthKit background delivery, Health Connect) submit to Supabase with **no app running** → `ppq_bolt11` is always NULL → no invoice to pay.
- Even in the foreground, client-side invoice creation is network-flaky and often fails.

Migration `176_fix_ppq_reward_misrouting.sql` is a band-aid: when `reward_destination = 'ppq'` but `ppq_bolt11` is NULL, it **skips the reward entirely** (correctly refusing to misroute to the user's wallet). Net effect: **PPQ earning is effectively dead** for the most common (background) path.

## Goal

Earning PPQ.AI credits works reliably regardless of whether the app is open — including fully background-synced workouts. Invoice creation no longer depends on the client.

## Non-goals

- Changing how non-PPQ (Lightning-address) rewards work.
- Reworking PPQ account *creation* or the Coach RUNSTR AI query path (the local key still powers on-device AI queries; that stays).
- Adding encryption-at-rest for the stored key (RLS deny-all is the chosen posture; see Security).

---

## Architecture

The real production payer is the **external `runstr-zapper`** service (separate repo). The in-repo `claim-reward` Edge Function's `claim_reward` workout branch is **vestigial** and is NOT on the live path (per its own header comment and project memory). The zapper polls `workout_submissions`, computes the reward amount (base + streak/bonus), and pays — connecting to Supabase with its own service-role credentials.

Because the zapper owns the reward *amount* math, and a PPQ topup invoice is for a **fixed sats amount**, the zapper must also own invoice **creation** — otherwise any other component creating the invoice would have to duplicate the zapper's amount logic and would drift out of sync.

### Target data flow

```
Workout inserted into workout_submissions  (foreground OR background sync)
   │  reward_destination = 'ppq'
   ▼
runstr-zapper poll loop
   ├─ computes final reward amount (base + streak/bonus)  ← already does this
   ├─ reads ppq_accounts WHERE npub = <row.npub>          ← NEW (service-role)
   ├─ POST api.ppq.ai/topup/create/btc-lightning          ← NEW (using stored key)
   │     { credit_id, amount: <final sats>, currency: 'SATS' }
   │     → bolt11
   └─ pays bolt11 via existing pay path + idempotency      ← existing
```

The device's only remaining responsibility is to (a) **upload its PPQ key once** to the backend and (b) keep tagging `reward_destination = 'ppq'`. It no longer creates invoices.

---

## Components

### 1. `ppq_accounts` table (app repo migration)

```sql
CREATE TABLE ppq_accounts (
  npub          TEXT        PRIMARY KEY,
  api_key       TEXT        NOT NULL,
  credit_id     TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ppq_accounts ENABLE ROW LEVEL SECURITY;
-- NO policies created → deny-all to anon/authenticated clients.
-- Only service-role (Edge Functions, zapper) bypasses RLS and can read/write.
```

- Keyed by `npub` so the zapper can look it up directly from the workout row's `npub`.
- One row per user; re-registration upserts.
- **No client policy of any kind.** With RLS enabled and no policies, the anon key the app ships with has zero access — cannot read, write, or enumerate.

### 2. `register-ppq-account` Edge Function (app repo)

The **only** way a key enters the table. Accepts a NIP-98-signed request, verifies ownership, upserts with service-role.

**Request:** client sends `{ npub, api_key, credit_id }` plus a NIP-98 auth event (kind 27235) signed by the user's key, in the `Authorization` header (`Nostr <base64-event>`).

**Verification (reuse `claim-reward`'s `@noble/secp256k1` pattern):**
1. Parse the auth event; verify the Schnorr signature.
2. Verify `event.pubkey` matches the `npub` in the body (decode npub → hex).
3. Verify the `u` tag matches this function's URL and the `method` tag is `POST`.
4. Verify `created_at` is within ±60s (replay window).
5. On success, `upsert` into `ppq_accounts` (service-role client) and bump `updated_at`.

**Why NIP-98:** it proves the request came from the holder of the npub's private key without that key ever leaving the device — only a signature travels. This blocks an attacker from overwriting another user's PPQ key (which would redirect their AI-credit rewards). The app already signs every kind 1301 / kind 1 / kind 30078 with this same per-user key, so this adds **no new secret and no new exposure**.

### 3. Client changes (app repo)

- **On PPQ setup** (`PPQAccountService.setAccount` / `createAccount` call sites, e.g. `AgentSkillSetupModal` / `PPQAccountSetupModal`): after storing the key locally as today, call `register-ppq-account` to upload it. Local storage is still kept — it powers on-device AI queries.
- **One-time migration:** on app launch (or first PPQ interaction), if a local PPQ key exists but hasn't been uploaded, upload it once. Track an `@runstr:ppq_uploaded` flag to avoid repeat calls.
- **Stop client-side invoice creation for rewards:** remove the `createTopupInvoice` → `ppq_bolt11` write at submit time (`SupabaseCompetitionService.ts:351`, `:435`). Keep `reward_destination = 'ppq'` tagging (`LocalWorkoutStorageService.ts:611`, `workoutPublishingService.ts:1132`).
- `PPQCreditTopupModal`'s manual top-up (`:191`) is a separate user-initiated flow and is **unaffected** — it stays client-side.

### 4. Zapper handoff (separate repo — companion doc)

A self-contained handoff doc (mirroring `2026-05-11-zapper-bonuses-handoff.md`) for the `runstr-zapper` maintainer, specifying:

- Read `ppq_accounts` by `npub` (service-role) when a workout has `reward_destination = 'ppq'`.
- Create a topup invoice: `POST https://api.ppq.ai/topup/create/btc-lightning` with `Authorization: Bearer <api_key>`, body `{ credit_id, amount: <final_reward_sats>, currency: 'SATS' }`; read `bolt11` (fallback field `lightning_invoice`).
- Pay the bolt11 via the existing pay path, inside the existing idempotency row (insert-before-pay) so a PPQ reward is never double-created.
- Failure handling: if `ppq_accounts` has no row for the npub, or invoice creation fails, record a skipped/failed payout (do **not** fall back to a Lightning address — same safety rule as migration 176).

**Assumptions for the maintainer to confirm against the zapper code:**
- Where/how the zapper currently computes the workout reward amount (so the invoice amount matches the paid amount exactly).
- How the zapper handles `reward_destination = 'ppq'` rows *today* (does it currently pay `ppq_bolt11`? that legacy path can remain as a fallback for old-client rows).

---

## Security analysis (open-source app)

The app is open source; anyone can read the full bundle. Audit of current state:

- The client ships **only** the `anon` key (`EXPO_PUBLIC_SUPABASE_ANON_KEY`), via env — no hardcoded literal. No `service_role` key anywhere in `src/`. No raw JWTs committed.
- The `anon` key is **public by design** and safe **only because every table is RLS-gated**. The DB keys (`service_role`) live server-side (Edge Function env / vault) and never enter the bundle.

This design preserves that invariant:

- `ppq_accounts` is **deny-all to the anon key** (RLS, no client policies). An attacker with the full source + anon key cannot read, write, or enumerate it.
- The PPQ key reaches the table only through `register-ppq-account`, gated by a NIP-98 signature from the user's own key.
- **No nsec ever leaves the device.** NIP-98 signs locally; only the signature + signed event travel. The Edge Function verifies with the **public** key. No nsec is sent to the database or the zapper. There is no shared "app key" to leak — only per-user keys, on each user's own device, where they already live.
- This consciously **reverses** the old "PPQ key never leaves the device" principle in `PPQAccountService`. Justification: a PPQ key controls only AI credits (no withdrawal, capped at balance) — low-stakes — and the reliability win (background earning) requires backend access. The reversal is documented here and should be reflected in `PPQAccountService`'s header comment.

---

## Backward compatibility & cleanup

- `workout_submissions.ppq_bolt11` and migration 176's skip path become **legacy**. Rows written by old app versions (with a client-created `ppq_bolt11`) can still be paid by the zapper's existing path; the new flow does not depend on the column.
- Mark `ppq_bolt11` / `ppq_invoice_id` columns and the 176 skip branch as **deprecated** in comments rather than dropping them (subtract carefully; avoid breaking in-flight old-client rows). A later migration can drop them once old clients age out.
- `PPQAccountService.createTopupInvoice` stays (used by the manual `PPQCreditTopupModal` top-up), but is no longer called on the reward path.

## Error handling

- **Upload fails** (network / signature invalid): client retries on next launch; the local key still works for on-device AI. User is not blocked.
- **No `ppq_accounts` row at reward time** (user never upgraded / never uploaded): zapper records a skipped payout and does **not** misroute to a Lightning address.
- **PPQ API down at reward time:** zapper treats it as a payment failure for that workout (existing retry/skip semantics); idempotency row prevents double-pay on retry.

## Testing / verification

App-repo (verifiable here):
1. `npm run typecheck`.
2. Migration applies cleanly; confirm RLS denies the anon client (script in `scripts/verify/`: attempt a `select`/`insert` on `ppq_accounts` with the anon key → expect permission denied).
3. `register-ppq-account`: unit-style verify of NIP-98 — valid signature upserts; wrong pubkey, stale `created_at`, and bad signature are all rejected.
4. Client: verify upload fires once on setup and once for the legacy-key migration (flag prevents repeats).

Zapper-repo (maintainer): invoice amount equals computed reward; idempotency holds across retries; missing-row and API-down cases skip without misrouting.

## Open questions

1. Confirm `api.ppq.ai/topup/create/btc-lightning` accepts the `Bearer <api_key>` + `{credit_id, amount, currency:'SATS'}` shape server-to-server (it's the same call the app makes today).
2. Confirm exactly where the zapper computes the workout reward amount, so invoice amount and paid amount are guaranteed identical.
3. Does the zapper need a notification on successful PPQ topup (parity with sats rewards)? If so, fold into the handoff.
