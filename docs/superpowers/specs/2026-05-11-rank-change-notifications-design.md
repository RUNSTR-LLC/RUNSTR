# Rank-Change Push Notifications — Design

**Date:** 2026-05-11
**Status:** Draft, pending user approval
**Scope:** Primary work lives in this repo (Supabase trigger + state tables + small app changes). The external `runstr-zapper` is NOT involved in rank-change pushes — only in the existing bonus-payout flow.

## Goal

Push a notification to each user every time their rank changes on a leaderboard they're participating in. Applies to all five daily leaderboards (5K, 10K, Half Marathon, Marathon, Steps) and all captain-created events. The push body describes the new state with delta-aware copy.

## Why

Daily leaderboards in RUNSTR typically have fewer than 10 active participants. Every workout submission can reshuffle the standings, but users don't see it unless they re-open the app. A push on rank change converts the leaderboard from a passive scoreboard into an active engagement loop — the user knows the moment they're passed or pass someone else, and re-opens the app to react.

## Architecture

- **App (this repo):** No changes to the submission, sync, or leaderboard rendering. Adds (1) a settings toggle "Rank-change notifications" defaulted on, and (2) registers a new `rank_change` deep-link type in the existing notification tap handler so taps route to the relevant leaderboard.
- **Supabase (this repo):** Owns everything else.
  - Two state-tracking tables: `daily_leaderboard_rank_snapshots`, `event_leaderboard_rank_snapshots`.
  - A Postgres trigger function `notify_rank_changes()` attached to `workout_submissions` AFTER INSERT and AFTER UPDATE. Recomputes affected leaderboards inline, diffs against the snapshot table, invokes the existing `notify-user` Edge Function for each affected user via `pg_net` (async HTTP), and upserts the snapshot rows.
  - Follows the pattern established by migration 127 (`auto_reward_on_workout` trigger).
- **Zapper:** Uninvolved in this feature. Continues to own its existing schedule-driven jobs (bonus payouts, monthly budget reset).

## Trigger model

A "rank change" is any of these transitions for a given (user, leaderboard) on a given day or event window:

1. **Initial entry** — user had no rank, now has a rank → push
2. **Moved up** — user's rank went from N to N−k (smaller is better) → push
3. **Moved down** — user's rank went from N to N+k → push
4. **No change** — same rank as last snapshot → no push

Every change triggers exactly one push per leaderboard. If a single workout populates multiple split-time leaderboards (e.g. a half-marathon shifts the user on 5K, 10K, and Half), the user receives three separate pushes — one per affected leaderboard. This is by design; the user values knowing which board they moved on, and these multi-board events are rare (most users don't run 21km).

## Trigger semantics

The Postgres trigger fires on **every** `workout_submissions` INSERT and UPDATE. There is no polling, no cron, no schedule. A new workout produces pushes within milliseconds — bounded only by `pg_net`'s async queue depth, typically sub-second in practice.

Each fire of the trigger:

1. Identifies which leaderboards the workout affects:
   - Daily 5K: `time_5k_seconds IS NOT NULL`
   - Daily 10K: `time_10k_seconds IS NOT NULL`
   - Daily Half: `time_half_seconds IS NOT NULL`
   - Daily Marathon: `time_marathon_seconds IS NOT NULL`
   - Daily Steps: `activity_type = 'steps'`
   - Captain events: any active event whose `start_at <= NOW() < end_at` and whose ranking method matches this workout's stats
2. For each affected leaderboard, recomputes the current ranks.
3. For each user in the new ranks list, looks up their prior rank from the appropriate snapshot table.
4. Where rank changed (or prior was NULL), enqueues an async `pg_net.http_post` to `notify-user` with the rank-change payload and upserts the snapshot row.

Day boundary handling: at UTC midnight a new "day" begins automatically because the daily snapshot table is keyed by `snapshot_date`. The first workout submitted on the new day produces an initial-entry push for the submitter and no pushes for anyone else (no prior rows for that date exist yet, but those users haven't submitted today either, so they don't appear in the rank list).

**Practical asymmetry worth noting:** Daily 5K/10K/Half/Marathon are *fastest-split* leaderboards — once a user has submitted their best split of the day, they can only move down (when someone faster submits). They move up only if they themselves run another qualifying workout that day. Daily Steps is genuinely bidirectional because steps accumulate via background sync throughout the day. Captain events depend on the event's `scoring_method` — most are accumulator-style (total distance, total duration) so users can both climb and drop.

## Notification body copy

| Transition          | Body                                                  | Example                                                 |
|---------------------|-------------------------------------------------------|---------------------------------------------------------|
| Initial entry       | `"{ordinal} Place: {leaderboard_label}"`              | `"1st Place: Daily Leaderboard 5K"`                     |
| Moved up            | `"Moved to {ordinal}: {leaderboard_label}"`           | `"Moved to 2nd: Daily Leaderboard 5K"`                  |
| Moved down          | `"Dropped to {ordinal}: {leaderboard_label}"`         | `"Dropped to 4th: Daily Leaderboard 5K"`                |

Where `{ordinal}` is `1st`, `2nd`, `3rd`, `4th`, etc., and `{leaderboard_label}` is one of:
- `"Daily Leaderboard 5K"`
- `"Daily Leaderboard 10K"`
- `"Daily Leaderboard Half Marathon"`
- `"Daily Leaderboard Marathon"`
- `"Daily Leaderboard Steps"`
- For captain events: the event's `name` field as-is (e.g. `"Ohio Ruckers Sprint"`)

The notification `title` is always `"Standings update"`.

## Push payload

After computing a rank change, the zapper invokes the existing `notify-user` Edge Function with:

```jsonc
{
  "npub": "<recipient npub>",
  "title": "Standings update",
  "body": "Moved to 2nd: Daily Leaderboard 5K",
  "data": {
    "type": "rank_change",
    "leaderboard_id": "5k",                 // daily only; omitted for events
    "event_id": "<uuid>",                   // event only; omitted for daily
    "previous_rank": 3,                     // null on initial entry
    "current_rank": 2,
    "deep_link": "leaderboard"
  }
}
```

`notify-user` is fire-and-forget. A failed push does not roll back the snapshot row — the state moves forward regardless, so the next change still produces a single correct push.

## Data model — Supabase additions

```sql
-- Daily leaderboard rank state. One row per (user, leaderboard, day).
-- The zapper writes the user's most recent observed rank every poll cycle.
CREATE TABLE daily_leaderboard_rank_snapshots (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date        DATE         NOT NULL,            -- 'YYYY-MM-DD' UTC
  leaderboard_id       TEXT         NOT NULL,            -- '5k' | '10k' | 'half_marathon' | 'marathon' | 'steps'
  npub                 TEXT         NOT NULL,
  rank                 SMALLINT     NOT NULL,
  last_updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (snapshot_date, leaderboard_id, npub)
);

-- Captain event rank state. One row per (user, event_id) for the duration of the event.
CREATE TABLE event_leaderboard_rank_snapshots (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id             UUID         NOT NULL,
  npub                 TEXT         NOT NULL,
  rank                 SMALLINT     NOT NULL,
  last_updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, npub)
);

ALTER TABLE daily_leaderboard_rank_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_leaderboard_rank_snapshots ENABLE ROW LEVEL SECURITY;

-- Read open, service-role writes only (zapper).
CREATE POLICY "Anyone can read daily rank snapshots" ON daily_leaderboard_rank_snapshots
  FOR SELECT USING (true);
CREATE POLICY "Service role full access on daily rank snapshots" ON daily_leaderboard_rank_snapshots
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can read event rank snapshots" ON event_leaderboard_rank_snapshots
  FOR SELECT USING (true);
CREATE POLICY "Service role full access on event rank snapshots" ON event_leaderboard_rank_snapshots
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

Snapshot rows persist beyond their relevance window — `snapshot_date` lets the zapper query "what was this user's rank yesterday" later. Acceptable storage cost since rows are tiny.

## Trigger function logic (this repo's Postgres function)

### Function: `notify_rank_changes()`
**Attached to:** `workout_submissions` — AFTER INSERT, AFTER UPDATE

```
# Pseudocode for the function body (Postgres PL/pgSQL)

# 1. Determine affected daily leaderboards from NEW row
affected_daily := []
IF NEW.time_5k_seconds IS NOT NULL THEN append('5k')
IF NEW.time_10k_seconds IS NOT NULL THEN append('10k')
IF NEW.time_half_seconds IS NOT NULL THEN append('half_marathon')
IF NEW.time_marathon_seconds IS NOT NULL THEN append('marathon')
IF NEW.activity_type = 'steps' THEN append('steps')

today := NEW.leaderboard_date

# 2. For each affected daily leaderboard
FOR leaderboard_id IN affected_daily:
  ranks := SELECT npub, ROW_NUMBER() OVER (ORDER BY <metric for leaderboard_id>)
           FROM workout_submissions
           WHERE leaderboard_date = today AND <qualifies for leaderboard_id>
  FOR (npub, current_rank) IN ranks:
    prior := SELECT rank FROM daily_leaderboard_rank_snapshots
             WHERE snapshot_date = today AND leaderboard_id = leaderboard_id AND npub = npub
    IF prior IS NULL OR prior != current_rank:
      body := body_for_transition(prior, current_rank, leaderboard_label(leaderboard_id))
      PERFORM pg_net.http_post(
        url := <SUPABASE_URL>/functions/v1/notify-user,
        body := jsonb_build_object('npub', npub, 'title', 'Standings update', 'body', body,
                                    'data', jsonb_build_object('type', 'rank_change',
                                                                'leaderboard_id', leaderboard_id,
                                                                'previous_rank', prior,
                                                                'current_rank', current_rank,
                                                                'deep_link', 'leaderboard'))
      )
      INSERT INTO daily_leaderboard_rank_snapshots (snapshot_date, leaderboard_id, npub, rank)
      VALUES (today, leaderboard_id, npub, current_rank)
      ON CONFLICT (snapshot_date, leaderboard_id, npub) DO UPDATE SET rank = EXCLUDED.rank, last_updated_at = NOW()

# 3. Captain events that include this workout in their window
FOR event IN (SELECT id, name, scoring_method, activity_type FROM competitions
              WHERE NEW.created_at BETWEEN start_date AND end_date
                AND NEW.activity_type = competitions.activity_type
                AND created_by_npub IS NOT NULL):
  ranks := <compute event leaderboard per event.scoring_method>
  FOR (npub, current_rank) IN ranks:
    prior := SELECT rank FROM event_leaderboard_rank_snapshots WHERE event_id = event.id AND npub = npub
    IF prior IS NULL OR prior != current_rank:
      <same body construction and pg_net call, substituting event.name for label and event_id for leaderboard_id>
      UPSERT event_leaderboard_rank_snapshots
```

Helper SQL function `body_for_transition(prior, current, label)`:
- `prior IS NULL` → `"{ordinal(current)} Place: {label}"`
- `current < prior` → `"Moved to {ordinal(current)}: {label}"`
- `current > prior` → `"Dropped to {ordinal(current)}: {label}"`

The trigger MUST NOT issue a push when `current_rank == prior_rank`. The UPSERT and `pg_net` call only fire when state actually changed.

**Why `pg_net.http_post` and not synchronous `http_post`:** `pg_net` is async — the HTTP call queues outside the trigger transaction so the workout insert doesn't block waiting for `notify-user` to return. This is critical: a slow Expo Push API call must not delay or fail the workout submission.

## App changes

**Two small changes in this repo:**

1. **Settings toggle** (`src/screens/SettingsScreen.tsx` or its push-notification section): one new boolean toggle "Rank-change notifications", default `true`. Stored locally and broadcast to the zapper via the existing user-preferences mechanism (same channel as other notification preferences). Until the user-preferences pipe exists, the toggle is local-only and the zapper sends pushes regardless; client-side filtering is acceptable for the first iteration (`notify-user` returns silently if the toggle is off and the local handler drops the payload).

2. **Deep-link handler:** Register `data.type === 'rank_change'` in the existing notification tap router. On tap, navigate to the relevant leaderboard tab:
   - `daily_leaderboard_id` present → navigate to the Leaderboards screen and select that leaderboard
   - `event_id` present → navigate to the event detail screen (`DynamicEventDetailScreen`)
   - If neither (malformed) → fall back to the History tab

## Settings UI copy

```
RANK-CHANGE NOTIFICATIONS
Get a push when your standing changes on a daily leaderboard or captain event.
[toggle: on]
```

No per-leaderboard granularity in version 1. If demand emerges, future iteration can break this into "Daily 5K", "Daily 10K", etc.

## Known accepted behaviors

- **Multi-board pushes:** A 21km run can produce three pushes (5K, 10K, Half). Intentional — the user values knowing which board moved.
- **Rank-1-while-alone:** If you're the first submitter at 6am, you get a "1st Place: Daily Leaderboard 5K" push. When a faster runner submits at 7am, you get "Dropped to 2nd." This is real rank state, not a bug.
- **Push failures don't pause state:** If `notify-user` returns `sent: false`, the snapshot still upserts. The next change still produces a clean delta.
- **No re-entry push for restored rank:** If you go 3rd → 4th → 3rd (passed then someone DQ'd), you get two pushes — "Dropped to 4th" then "Moved to 3rd." Each transition is real.

## Out of scope (deferred)

- Per-leaderboard toggles in settings (single global toggle for v1).
- Snooze / quiet hours.
- Notifications for milestones (entering top 10, finishing in top 3 at end of day) — bonus push already covers end-of-day top 3.
- In-app banners or badge counts that mirror the push state.
- Backfilling pushes for users who installed after the leaderboard for today already exists.
- Notifications for users below the visible cutoff of the in-app leaderboard (currently the app shows all submitters anyway, so no cutoff exists — re-evaluate if a cutoff is added).

## Implementation footprint (for sizing the plan)

- **This repo (all the work):**
  - 1 Supabase migration (~200 lines SQL):
    - Two snapshot tables and RLS.
    - The `notify_rank_changes()` trigger function (PL/pgSQL).
    - The `ordinal()` and `body_for_transition()` helper functions.
    - `CREATE TRIGGER` attaching to `workout_submissions`.
    - `pg_net` extension enabled if not already.
  - 1 file change: settings screen — add toggle and AsyncStorage key.
  - 1 file change: notification tap handler — register `rank_change` deep link.
  - 1 verification script confirming snapshot tables exist, the trigger fires on a test insert, and `pg_net` is enabled.

- **External `runstr-zapper`:** No changes. Uninvolved.

## Acceptance criteria

- [ ] Migration applied, both snapshot tables exist, trigger registered on `workout_submissions`, `pg_net` enabled.
- [ ] Test: insert a sample row into a non-production workout_submissions; observe `notify-user` invocation in `net.http_request_queue` (pg_net's tracking table).
- [ ] Settings screen shows a "Rank-change notifications" toggle, on by default, value persists across launches.
- [ ] Notification tap handler routes `rank_change` payloads correctly: `leaderboard_id` present → Leaderboards screen, `event_id` present → event detail.
- [ ] Verification script reports all checks pass.
