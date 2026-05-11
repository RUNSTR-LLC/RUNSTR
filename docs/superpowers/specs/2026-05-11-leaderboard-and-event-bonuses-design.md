# Daily Leaderboard and Event Bonus Rewards — Design

**Date:** 2026-05-11
**Status:** Draft, pending user approval
**Scope:** Primary work lives in the external `runstr-zapper` repo. Minimal app changes (History screen labelling) and a small Supabase migration in this repo.

## Goal

Pay top-3 finishers in daily leaderboards and captain-created events a fixed bonus (75/50/25 sats), funded by a hard-capped monthly rewards budget. When the budget hits zero, payments stop until the 1st of the next month.

## Why

Per-workout rewards alone don't create a "win condition." Bonuses for placing on a leaderboard turn passive earning into a daily competition without changing the submission pipeline or asking users to opt into anything new.

## Architecture

- **App (this repo):** No changes to submission, workout sync, or leaderboard calculation. The History tab gets minor label changes so bonus payments render differently from per-workout payments.
- **Zapper (external `runstr-zapper` repo):** Owns budget tracking, schedule, eligibility checks, idempotency, and payment execution. Two new scheduled jobs plus a budget gate around every payment.
- **Supabase (this repo):** Migration to add a `metadata` JSONB column to `reward_payments`, plus two idempotency tables and a monthly budget table that the zapper reads and writes.

## Funding rules

- **Monthly budget:** Configurable per month by updating a single row in `monthly_budget_state.budget_total`. Working target: $40/month (~40,000 sats) given the scope below. See **Budget math** below.
- **Reset cadence:** Budget resets at 00:00 UTC on the 1st of each month. The zapper inserts a fresh `monthly_budget_state` row keyed by month.
- **Hard stop:** Before any payment, the zapper checks `budget_spent + this_payment <= budget_total`. If not, the payment is skipped and logged. There is no queueing, no prorating, no partial payment.
- **Sporadic outages are an accepted product behavior**, not a bug. The History tab simply shows whatever did get paid.

### Budget math (5 leaderboards + events + per-workout)

| Line item                                  | Monthly spend                    |
|--------------------------------------------|----------------------------------|
| Daily bonuses (5 leaderboards × 150 × 30)  | **22,500 sats** (fixed)          |
| Captain event bonuses                      | ~3,000–12,000 sats (variable)    |
| Per-workout rewards                        | residual (whatever's left)       |

- At **$20 (~20k sats):** daily bonuses alone exceed the budget. Most months, only the first ~150 daily-bonus payments fire and everything else is starved.
- At **$25 (~25k sats):** daily bonuses fit but barely; event bonuses and per-workout often get nothing.
- At **$40 (~40k sats):** daily bonuses always fire (~22.5k), events get ~12k headroom, per-workout gets the rest (~5–10k). This is the recommended budget for the scope below.

The budget is a single configurable number; raising it from $20 to $40 is updating one row. The choice is yours and can change month to month.

## Daily leaderboard bonuses

- **Eligible leaderboards:** All five — 5K, 10K, Half Marathon, Marathon, Steps.
- **Schedule:** Zapper job runs at 00:05 UTC daily (5-minute grace window for late submissions to land before the snapshot).
- **Snapshot:** Top 3 finishers on yesterday's leaderboard for each eligible activity.
- **Payout:** 1st = 75 sats, 2nd = 50, 3rd = 25.
- **Ties:** Tie-broken by earliest submission timestamp on the qualifying workout.
- **No address:** If a winner has no Lightning address registered, skip them with `status = 'skipped_no_address'`. Do not shift 4th up to 3rd. Keeps the math honest and incentivizes setting up an address.
- **Idempotency:** Keyed by `(payout_date, leaderboard_id, place)` in a new `daily_bonus_payouts` table. Zapper refuses to insert a duplicate.

## Captain event bonuses

- **Trigger:** Zapper polls every 15 minutes for events where `end_at < now()` and no row exists in `event_bonus_payouts` for that event.
- **Eligibility filters — all must pass:**
  1. **≥4 unique participants**, each with ≥1 valid workout submitted during the event window.
  2. **≥24 hour event duration** (`end_at - start_at ≥ 24 hours`).
  3. **Captain has no other bonus-eligible event whose window `[start_at, end_at]` overlaps this one.** Checked against the event window, not creation time, so pre-scheduling a future event doesn't block a current one.
- **If filters fail:** Event ends normally, leaderboard still displays, no bonus pays out. Record the failure reason in `event_bonus_payouts` with `status = 'skipped_ineligible'` so we have an audit trail.
- **If filters pass:** Pay top 3 by the event's ranking method, 75/50/25, same tie-break and address rules as daily leaderboards.
- **Idempotency:** Keyed by `(event_id, place)` in `event_bonus_payouts`.

## Budget priority

When the budget gets tight, the zapper pays in this order:

1. **Daily leaderboard bonuses** — predictable, marquee, fixed total (~22.5k sats/month).
2. **Captain event bonuses** — variable; depends on event volume.
3. **Per-workout rewards** — whatever is left, possibly zero in busy months.

This means daily bonuses are protected. Per-workout rewards starve first. The user's funding-model preference (predictable cost > predictable reward flow) supports this priority.

## Data model — Supabase additions

```sql
-- Extend reward_payments with structured context for bonus labeling.
ALTER TABLE reward_payments
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- reward_type values used by the zapper:
--   'workout'             -- existing per-workout payment (unchanged default)
--   'daily_bonus'         -- daily leaderboard placement
--   'event_bonus'         -- captain event placement
-- metadata shape:
--   daily_bonus:  { "leaderboard_id": "5k" | "10k" | "half_marathon" | "marathon" | "steps",
--                   "leaderboard_label": "5K" | "10K" | "Half Marathon" | "Marathon" | "Steps",
--                   "payout_date":   "YYYY-MM-DD",
--                   "place":         1 | 2 | 3 }
--   event_bonus:  { "event_id":   uuid,
--                   "event_name": text,
--                   "place":      1 | 2 | 3 }

-- Monthly budget state. One row per UTC month.
CREATE TABLE monthly_budget_state (
  month            TEXT        PRIMARY KEY,        -- 'YYYY-MM' UTC
  budget_total     INTEGER     NOT NULL,            -- sats
  budget_spent     INTEGER     NOT NULL DEFAULT 0,  -- sats
  last_updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily leaderboard payout idempotency.
CREATE TABLE daily_bonus_payouts (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_date         DATE         NOT NULL,
  leaderboard_id      TEXT         NOT NULL,                    -- '5k' | '10k' | 'half_marathon' | 'marathon' | 'steps'
  place               SMALLINT     NOT NULL CHECK (place BETWEEN 1 AND 3),
  recipient_pubkey    TEXT,
  amount_sats         INTEGER      NOT NULL,
  status              TEXT         NOT NULL,                    -- 'paid' | 'skipped_no_address' | 'skipped_budget'
  reward_payment_id   UUID         REFERENCES reward_payments(id),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (payout_date, leaderboard_id, place)
);

-- Captain event payout idempotency.
CREATE TABLE event_bonus_payouts (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            UUID         NOT NULL,
  place               SMALLINT     NOT NULL CHECK (place BETWEEN 1 AND 3),
  recipient_pubkey    TEXT,
  amount_sats         INTEGER      NOT NULL,
  status              TEXT         NOT NULL,                    -- 'paid' | 'skipped_no_address' | 'skipped_budget' | 'skipped_ineligible'
  ineligible_reason   TEXT,                                     -- nullable; populated when status='skipped_ineligible'
  reward_payment_id   UUID         REFERENCES reward_payments(id),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, place)
);

-- All three tables: same RLS pattern as reward_payments (read-all, zapper writes via service_role).
```

## App changes

**Only file affected:** `src/screens/RewardHistoryScreen.tsx` (the row renderer).

Read `reward_type` and `metadata` from `reward_payments`. Render the row label per type:

| `reward_type`  | Label rendered                                            | Source                                            |
|----------------|-----------------------------------------------------------|---------------------------------------------------|
| `workout`      | "Workout reward"                                           | (unchanged)                                       |
| `daily_bonus`  | "{leaderboard_label} Daily — {place} place" (e.g. "Half Marathon Daily — 1st place") | `metadata.leaderboard_label` + `metadata.place` |
| `event_bonus`  | "{event_name} — {place} place"                            | `metadata.event_name` + `metadata.place`          |

Expanded row content (paid-to + payment hash) is unchanged. No new screens, no new components — just a labelling helper inside the existing renderer.

## Push notifications for bonus wins

After a bonus payment succeeds, the zapper invokes the existing `notify-user` Supabase Edge Function with `{ npub, title, body, data }`. The function hashes the npub (SHA256), looks up active tokens in the `broadcast_tokens` table (populated client-side by `BroadcastTokenService`), and posts to Expo's push API. No new app-side wiring required and the zapper does not need a direct Expo/APNs/FCM integration.

**Notification payload:**

| Field    | Value                                                                  |
|----------|-------------------------------------------------------------------------|
| `title`  | "Bonus reward"                                                          |
| `body`   | Daily bonus: `"{leaderboard_label} Daily — {place} place — {sats} sats"` <br/> Event bonus: `"{event_name} — {place} place — {sats} sats"` |
| `data`   | `{ "type": "bonus_win", "reward_payment_id": uuid, "deep_link": "history" }` |

**Examples:**
- "Half Marathon Daily — 1st place — 75 sats"
- "Ohio Ruckers Sprint — 2nd place — 50 sats"

**Behavior rules:**
- Fire-and-forget. If the `notify-user` invocation fails (no registered token, Expo API error, network failure), the bonus payment is unaffected. The user still sees the bonus in the History tab.
- Tapping the notification routes to the History tab. The deep link handler is shared with existing notification types (already implemented).
- One notification per bonus payment. If a user wins three daily bonuses in a row (5K + 10K + Steps), they get three notifications. No batching for the first iteration.
- No notifications for `status = 'skipped_no_address'` or `status = 'skipped_budget'` — only on successful payment.

## Zapper job schedule (external repo)

These are descriptive; the zapper repo owns implementation:

- **Daily leaderboard payout** — cron `5 0 * * *` (00:05 UTC daily).
- **Event payout poller** — cron `*/15 * * * *` (every 15 minutes).
- **Monthly budget reset** — cron `0 0 1 * *` (00:00 UTC on the 1st). Inserts new `monthly_budget_state` row with the configured `budget_total`.

## Known accepted risks

- **Sock puppets.** A captain can ask 3 friends (or alt accounts) to participate, passing the 4-unique-people floor. Acceptable risk; monitor via `reward_payments` queries — if the same 4 pubkeys keep winning together under the same captain, revisit.
- **Co-captain stacking.** One person could create multiple captain pubkeys to bypass the 1-event-at-a-time rule. Same monitoring approach.
- **Hot-month per-workout starvation.** Per-workout rewards may dry up mid-month in busy event seasons. Accepted per the funding-model decision.
- **Late submissions just past midnight.** A workout submitted at 00:01 UTC for the prior day's leaderboard will miss the 00:05 snapshot if the leaderboard's day cutoff matches submission timestamp. Mitigation: 5-min grace window is the only buffer. If misses become common, extend grace to 10 min.

## Out of scope (deferred)

- Variable bonus pools scaled by event participant count.
- Captain-funded prize pools with RUNSTR matching.
- Sybil detection for sock-puppet accounts.
- Real-time/mid-event bonus payouts. Bonuses always pay at end.
- Batching multiple bonus notifications into one (each win = one push).
- Backfill of old `reward_payments` rows. They keep `reward_type = 'workout'`, render as "Workout reward."

## Open questions

None — the design is complete enough to plan.

## Implementation footprint (for sizing the plan)

- **This repo:**
  - 1 Supabase migration (~80 lines SQL).
  - 1 file change: `src/screens/RewardHistoryScreen.tsx` label rendering (~30 lines).
  - 1 verification script in `scripts/verify/` checking that `metadata` writes/reads round-trip and that the History label switches correctly on `reward_type`.
- **External `runstr-zapper` repo:**
  - 3 cron jobs (daily payout, event poller, monthly reset).
  - Budget-gate wrapper around the existing payment function.
  - Eligibility checks for captain events.
  - Push notification dispatch after successful bonus payment (invokes existing `notify-user` Edge Function; no Expo/APNs/FCM integration needed in the zapper).

This repo's plan is small. The bulk of the work is in the zapper repo, which is tracked separately.
