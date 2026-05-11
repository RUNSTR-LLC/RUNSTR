# RUNSTR Zapper — Leaderboard & Event Bonuses Handoff

> Companion to `2026-05-11-leaderboard-and-event-bonuses-design.md`. This document is self-contained for the `runstr-zapper` repo. Hand the maintainer this one file.

## What's being added

Bonus rewards (75/50/25 sats) for top-3 finishers in:
- **Daily leaderboards** — 5K, 10K, Half Marathon, Marathon, Steps. Paid daily at 00:05 UTC.
- **Captain-created events** — paid at event end, gated by eligibility checks.

Plus push notifications on every successful bonus payment.

Funded by a hard-capped monthly budget. When the budget hits zero, payments stop until the 1st of the next month.

## Schema (migrations live in RUNSTR app repo)

The RUNSTR app repo owns the migration. Zapper uses its existing service-role credentials to connect.

```sql
-- Add to existing reward_payments
ALTER TABLE reward_payments ADD COLUMN IF NOT EXISTS metadata JSONB;

-- New: monthly budget state. One row per UTC month.
CREATE TABLE monthly_budget_state (
  month            TEXT        PRIMARY KEY,        -- 'YYYY-MM' UTC
  budget_total     INTEGER     NOT NULL,            -- sats
  budget_spent     INTEGER     NOT NULL DEFAULT 0,
  last_updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- New: daily leaderboard payout idempotency.
CREATE TABLE daily_bonus_payouts (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_date         DATE         NOT NULL,
  leaderboard_id      TEXT         NOT NULL,        -- '5k' | '10k' | 'half_marathon' | 'marathon' | 'steps'
  place               SMALLINT     NOT NULL CHECK (place BETWEEN 1 AND 3),
  recipient_pubkey    TEXT,
  amount_sats         INTEGER      NOT NULL,
  status              TEXT         NOT NULL,        -- 'paid' | 'skipped_no_address' | 'skipped_budget'
  reward_payment_id   UUID         REFERENCES reward_payments(id),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (payout_date, leaderboard_id, place)
);

-- New: captain event payout idempotency.
CREATE TABLE event_bonus_payouts (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            UUID         NOT NULL,
  place               SMALLINT     NOT NULL CHECK (place BETWEEN 1 AND 3),
  recipient_pubkey    TEXT,
  amount_sats         INTEGER      NOT NULL,
  status              TEXT         NOT NULL,        -- 'paid' | 'skipped_no_address' | 'skipped_budget' | 'skipped_ineligible'
  ineligible_reason   TEXT,                          -- populated when status='skipped_ineligible'
  reward_payment_id   UUID         REFERENCES reward_payments(id),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, place)
);
```

## Bonus amounts

- 1st place: **75 sats**
- 2nd place: **50 sats**
- 3rd place: **25 sats**

(Hardcode in config or a constants module — your call.)

## Existing tables the zapper reads

| Source                                    | Purpose                                                                                    |
|-------------------------------------------|--------------------------------------------------------------------------------------------|
| Daily leaderboard view (same one app uses) | Top-3 snapshot per leaderboard per day. Tie-break by earliest qualifying workout `created_at`. |
| Events table                              | `event_id`, `captain_pubkey`, `start_at`, `end_at`, ranking method, participant list.       |
| Lightning address column (user profile)   | Look up before every payment. Missing = skip.                                              |

## Push delivery — call the `notify-user` Edge Function

The zapper does **not** talk to APNs/FCM/Expo directly. Push delivery is handled by an existing Supabase Edge Function:

```
POST {SUPABASE_URL}/functions/v1/notify-user
Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}
Content-Type: application/json

{ "npub": "...", "title": "...", "body": "...", "data": {...} }
```

Or via the Supabase client:

```ts
supabase.functions.invoke('notify-user', {
  body: { npub, title, body, data }
});
```

The function hashes the npub (SHA256), looks up active tokens in `broadcast_tokens`, and posts to Expo's push API. Returns `{ sent: boolean, error?: string, devices?: number }`.

- `sent: true` — delivered to at least one device.
- `sent: false, error: 'no_tokens'` — user has never registered a token. Normal, not an alert.
- Other `sent: false` errors — log them, but never roll back the payment.

## Three jobs to schedule

### Job 1 — Daily bonus payout
**Schedule:** `5 0 * * *` UTC (00:05 daily, 5-min grace for late submissions)

```
For each leaderboard in {5k, 10k, half_marathon, marathon, steps}:
  Snapshot top 3 finishers for yesterday (UTC). Tie-break: earliest submission timestamp.
  For each (place, amount) in [(1, 75), (2, 50), (3, 25)]:
    1. Check budget: monthly_budget_state.budget_spent + amount <= budget_total?
       If not, INSERT daily_bonus_payouts(status='skipped_budget'), continue.
    2. Look up recipient's lightning address.
       If missing, INSERT daily_bonus_payouts(status='skipped_no_address'), continue.
       (Do NOT shift 4th up to 3rd.)
    3. INSERT daily_bonus_payouts(payout_date, leaderboard_id, place, ..., status='paid')
       ON CONFLICT (payout_date, leaderboard_id, place) DO NOTHING.
       If no row inserted: another worker already paid this slot, continue.
    4. Pay the lightning address.
    5. On payment success:
       a. INSERT reward_payments with reward_type='daily_bonus' and metadata.
       b. UPDATE daily_bonus_payouts SET reward_payment_id = <new id>.
       c. UPDATE monthly_budget_state SET budget_spent = budget_spent + amount.
       d. Invoke notify-user Edge Function with { npub, title, body, data } (fire-and-forget — see "Push delivery" above).
       e. On payment failure: existing failure handling, status stays 'paid' but reward_payment_id points to a 'failed' payment row.
```

### Job 2 — Event bonus payout poller
**Schedule:** `*/15 * * * *` (every 15 minutes)

```
Find events where end_at < now() AND no row exists in event_bonus_payouts for that event_id.

For each such event:
  Eligibility checks (ALL must pass):
    (a) ≥4 unique participants with ≥1 valid workout each in [start_at, end_at]
    (b) end_at - start_at >= 24 hours
    (c) No other event by the same captain_pubkey with overlapping [start_at, end_at] window

  If any fail:
    INSERT event_bonus_payouts(event_id, place=1, status='skipped_ineligible', ineligible_reason='...')
    Done with this event. (Single skip row is fine; no need to write three.)

  If all pass:
    Get top 3 from event's leaderboard, then run the same payment loop as Job 1
    with reward_type='event_bonus' and metadata = { event_id, event_name, place }.
```

### Job 3 — Monthly budget reset
**Schedule:** `0 0 1 * *` UTC (midnight on the 1st)

```
INSERT INTO monthly_budget_state (month, budget_total, budget_spent)
VALUES (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM'), <configured_value>, 0)
ON CONFLICT (month) DO NOTHING;
```

The `budget_total` is whatever you've topped up the rewards bucket to. May vary month to month — that's the user's call.

## reward_payments insert shape

```jsonc
// Daily bonus
{
  "npub": "<recipient npub>",
  "lightning_address": "<addr>",
  "amount_sats": 75,
  "reward_type": "daily_bonus",
  "payment_hash": "<hash>",
  "preimage": "<preimage>",
  "status": "success",
  "metadata": {
    "leaderboard_id": "half_marathon",
    "leaderboard_label": "Half Marathon",
    "payout_date": "2026-05-10",
    "place": 1
  }
}

// Event bonus
{
  "npub": "<recipient npub>",
  "lightning_address": "<addr>",
  "amount_sats": 50,
  "reward_type": "event_bonus",
  "payment_hash": "<hash>",
  "preimage": "<preimage>",
  "status": "success",
  "metadata": {
    "event_id": "<uuid>",
    "event_name": "Ohio Ruckers Sprint",
    "place": 2
  }
}
```

The app's History tab reads `reward_type` and `metadata` to render row labels. Keep `metadata.leaderboard_label` and `metadata.event_name` populated — the app uses them directly in the UI string.

## Push notification payload

After every successful `reward_payments` insert with `reward_type IN ('daily_bonus', 'event_bonus')`, invoke `notify-user` (see **Push delivery** above) with:

```jsonc
{
  "npub": "<recipient npub>",
  "title": "Bonus reward",
  "body": "Half Marathon Daily — 1st place — 75 sats",     // daily
  // body: "Ohio Ruckers Sprint — 2nd place — 50 sats",    // event
  "data": {
    "type": "bonus_win",
    "reward_payment_id": "<uuid>",
    "deep_link": "history"
  }
}
```

**Rules:**
- Fire-and-forget. If the `notify-user` call fails, the payment is unaffected. User still sees it in History.
- One push per payment. No batching — if a user wins three daily bonuses (5K + 10K + Steps) they get three notifications.
- Only on `status = 'success'` payments. No pushes for `skipped_*` rows.
- Tapping the notification deep-links to the History tab (existing handler).

## Hard rules (don't break these)

1. **Idempotency comes from the UNIQUE constraints.** Insert the payout row BEFORE attempting the payment. If the insert conflicts, another worker already handled this slot — skip silently. Never call `pay_invoice` without an idempotency row in place.
2. **Skip-no-address does NOT shift positions.** If 1st place has no address, write `skipped_no_address` for place=1 and move to place=2. Do not bump 2nd up to 1st.
3. **Hard budget stop.** No prorating, no partial payments, no queueing. If the budget check fails, write `skipped_budget` and move on.
4. **Push failure is silent.** A failed `notify-user` invocation must not roll back the payment.
5. **Event eligibility writes one skip row, not three.** If an event fails eligibility, a single row with `place=1, status='skipped_ineligible', ineligible_reason='...'` is enough audit trail. No need to write rows for places 2 and 3.

## Decisions left to the zapper repo

These are implementation choices, not contract:
- Cron mechanism (pg_cron, external scheduler, Edge Function on a timer)
- Where bonus amounts live (env vars, config table, hardcoded constants)
- Logging and observability for skipped/failed payouts

## Acceptance criteria (the zapper is done when…)

- [ ] Migrations applied in RUNSTR app repo (zapper sees the new tables).
- [ ] Daily payout job runs at 00:05 UTC and pays 5 leaderboards × 3 places when budget allows.
- [ ] Event poller runs every 15 min, correctly identifies ineligible events, pays eligible ones.
- [ ] Monthly reset job inserts a fresh budget row on the 1st of every UTC month.
- [ ] `reward_payments.metadata` is populated for every bonus payment per the shape above.
- [ ] Push notifications fire on every successful bonus payment.
- [ ] Hard rules above are enforced — verified by running a "tight budget" test where the budget runs out mid-payout and confirming subsequent payments write `skipped_budget` rows.
