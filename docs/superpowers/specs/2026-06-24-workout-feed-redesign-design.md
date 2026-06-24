# Workout Feed Redesign — Design

**Date:** 2026-06-24
**Status:** Approved for planning
**Related:** [2026-06-24-settings-cleanup-design.md](./2026-06-24-settings-cleanup-design.md)

## Summary

Turn the Social feed into a **pure workout feed sourced directly from Supabase workout tables**, where every item is a structured workout card. Stop ingesting kind-1 posts and stop re-matching them to workouts after the fact. Make **1301 the default post format**. Keep all interactions (likes, zaps, comments) working, re-keyed to the workout's Nostr event ID so they work across both RUNSTR-origin and cross-network workouts.

## Background / Why

Today's feed is indirect and fragile:

- `SocialFeedService.fetchFeed()` reads the **`social_feed`** table (kind-1 posts).
- For each post, `useMatchedWorkout` / `matchWorkoutPosts` re-query **`workout_submissions`** by `npub` + timestamp (±60 min) to *guess* which workout the post is about, then draw a card.
- When the match misses, the post renders as plain text with **no card** — the exact bug observed (a walk showed "Completed a walk with RUNSTR!" with no stats).

Meanwhile the data we actually want is already structured in Supabase:

- **`workout_submissions`** — every RUNSTR workout (incl. anonymous users), written on workout finish. 8,658 rows, all card fields present.
- **`network_workouts`** — kind-1301 events ingested from across Nostr by the external zapper (RUNSTR-tagged events are filtered out at ingest, so there is **no overlap** with `workout_submissions` — dedup is handled upstream).

So the feed should read structured workout rows directly and render uniform cards. No matching, no `social_feed` dependency for workout rendering.

## Target architecture

```
                 ┌─────────────────────┐
RUNSTR app  ───► │ workout_submissions │ ─┐
(on finish)      └─────────────────────┘  │
                                          ├─►  Feed query (UNION)  ─►  WorkoutCard (structured)
zapper ingest ─► ┌─────────────────────┐  │      sort by time, paginate, filter junk
(kind 1301)      │  network_workouts   │ ─┘
                 └─────────────────────┘
```

- **Feed data source:** union of `workout_submissions` ∪ `network_workouts`, sorted by recency, paginated.
- **Card rendering:** built entirely from structured columns. One consistent card style for every item.
- **No kind-1 in the feed.** The matching machinery is deleted.
- **Interactions:** keyed off the workout's Nostr **event ID**, so they work for both tables (including external Nostr authors).

## Data model

### `workout_submissions` (confirmed live)

Relevant columns: `id`, `npub`, `event_id`, `activity_type`, `distance_meters`, `duration_seconds`, `calories`, `step_count`, `splits_json`, `created_at`, `profile_name`, `profile_picture`, `raw_event`, `source`, `verified`.

### `network_workouts` (contract — CONFIRM against zapper repo)

The table exists and is anon-readable but was **empty at design time** (zapper ingest just fixed; rows expected shortly). Exact columns must be confirmed from the zapper's `src/supabase/networkWorkouts.ts` / `src/nostr/normalizeWorkout.ts` **before implementation**. Expected normalized contract (the feed needs these — map actual names to this shape):

| Feed needs | Expected `network_workouts` field | Notes |
|---|---|---|
| event id | `event_id` (the 1301 event id) | interaction key; also dedup key |
| author pubkey | `pubkey` / `npub` | profile resolution |
| activity type | `activity_type` | **may be non-cardio** (strength, yoga, etc.) |
| distance | `distance_meters` | may be null |
| duration | `duration_seconds` | may be null |
| calories | `calories` | may be null |
| steps | `step_count` | may be null |
| title | `title` | optional free-text from 1301 |
| timestamp | `start_time` / `created_at` | **column name differs from `workout_submissions`** — note `network_workouts` has no `created_at` (confirmed); use its actual time column |
| raw event | `raw_event` | fallback parsing |

**Action item:** before writing the implementation plan, paste the real `network_workouts` column list into this spec and finalize the field mapping.

## Feed query design

- A new read path in `SocialFeedService` (or a dedicated `WorkoutFeedService`) that returns a **unified `FeedWorkout` shape** from both tables.
- Normalize both tables into one `FeedWorkout` interface at the service boundary so the UI never branches on source table.
- **Sort** by recency using each table's own time column (alias to a common `occurred_at`).
- **Pagination:** cursor/limit, mirroring current 20-per-page behavior. Unioning two tables with different time columns: either a Postgres **view**/RPC that unions+normalizes server-side (preferred for clean pagination), or two paginated queries merged client-side. **Recommended:** a Supabase view or RPC `get_workout_feed(limit, before)` that unions, normalizes, and orders — keeps pagination correct and the client simple. (This is the one piece that may need a migration in *this* repo.)
- **Dedup:** none needed between tables (handled at ingest), but keep a defensive de-dupe by `event_id` in case a RUNSTR event slips into `network_workouts`.

## Card rendering rules

Reuse the existing display logic (`deriveWorkoutCardDisplay` in `workoutCardDisplay.ts`) as the starting point, generalized to be **tolerant of any activity type and any subset of metrics**:

- **Hero metric selection** (first available, in priority order):
  1. distance (if `distance_meters > 0`) → show distance as hero
  2. steps (if `step_count > 0`) → show steps as hero
  3. duration (if `duration_seconds > 0`) → show duration as hero
- **Secondary stats:** show whichever of {time, pace, calories, steps} are present and meaningful for the type. Pace only when distance + duration both present and the activity is distance-based.
- **Steps are first-class:** a step/walk entry with `step_count > 0` renders a steps-hero card. (Per decision: *if a user posts steps, the feed shows them.*)
- **Non-cardio / unknown types:** render a generic card — type label + whatever metrics exist (e.g. a strength workout might show only duration + calories, or just a title). **Never assume run/walk/cycle.** Unknown type → title + available stats, no crash.
- **Junk filter:** exclude rows with **no renderable metric at all** (no distance, no duration, no steps). This drops the empty `steps_…` rows that have `duration: 0`, `distance: null`, `step_count: null` (the current blank-card cause). A valid steps entry (step_count > 0) is **not** junk and is shown.
- **Title:** prefer the 1301 `title` if present (network workouts); RUNSTR rows can synthesize a caption ("Completed a {type}") as today.

### Related bug (note, fix tracked separately)

The synthetic daily-step rows currently store `step_count: null` while `raw_event` carries `["steps","NaN"]` — steps are being lost at write time. This belongs to the step-rewards/steps thread, not this feed work, but it must be fixed for step cards to render real counts. **Cross-reference and fix in tandem** so the feed isn't shipping empty step cards.

## Interactions (likes, zaps, comments)

Requirement: **all three keep working**, across both RUNSTR-origin and cross-network workouts.

The current interaction tables (`social_feed_zaps`, `social_feed_comments`) and like state are keyed to `social_feed` **post IDs**. Workout rows have no `social_feed` post ID — `network_workouts` rows are *other people's Nostr events* with no `social_feed` row at all. So interactions must be **re-keyed to the Nostr event ID** (`event_id`), which both tables carry.

**Recommended approach — event-ID-keyed, Nostr-native where it counts:**

- **Zaps:** already Nostr-native (NIP-57). Zap the workout author against the **1301 event id**. Works identically for RUNSTR and external authors. This is the lowest-friction interaction and is the priority if anything must phase.
- **Likes:** publish kind 7 reactions referencing the 1301 `event_id`; read counts back from relays and/or mirror to a Supabase table re-keyed by `event_id` for fast display.
- **Comments:** publish kind 1 replies (NIP-10/NIP-22) referencing the `event_id`; same read/mirror strategy.
- Migrate/extend the interaction tables to key by `event_id` instead of `social_feed` post id (or add an `event_id` column and backfill).

**This is the heaviest part of the project and the area with the most open questions** — see Open Questions. It should likely be its own implementation plan phase (Phase 2), after the display rewrite (Phase 1) is shippable.

## Posting changes

- **Default post format flips to `kind1301`** (today it defaults to `kind1`). Update the default in `NostrPostingPreferencesService` / wherever `getPostFormat()` falls back, and the manual `postWorkout()` default.
- **kind 1 becomes opt-in** via the Settings toggle (see settings spec): "card post that shows in every Nostr app." Posting kind 1 does **not** affect feed rendering — RUNSTR users always appear via `workout_submissions`; external users via their 1301 in `network_workouts`. kind 1 is purely for visibility in non-fitness Nostr clients.
- **`social_feed` dual-write:** the feed no longer reads `social_feed` for workout rendering. Decide whether to keep dual-writing it (for any non-feed consumer) or retire it. **Recommended:** stop relying on it for the feed; assess remaining consumers before removing the dual-write to avoid breaking anything else.

## Components: delete / change / keep

**Delete (matching machinery, orphaned once feed repoints):**
- `src/hooks/useMatchedWorkout.ts`
- `src/hooks/matchWorkoutPosts.ts`
- The match-driven branches in `src/components/social/SocialFeedPost.tsx`

**Change:**
- `src/screens/SocialScreen.tsx` — fetch from the new workout-feed source; `renderPost` renders the workout card directly.
- `src/services/social/SocialFeedService.ts` (or new `WorkoutFeedService`) — new union read path.
- `src/components/social/SocialFeedPost.tsx` — becomes a thin workout-card row (card + interaction row), no decision tree.
- `src/components/social/workoutCardDisplay.ts` / `WorkoutPostCard.tsx` — generalize to tolerant rendering (any type, any metric subset).
- `src/components/social/SocialInteractionRow.tsx` — re-key to `event_id`.

**Keep:**
- `src/components/social/ClubsRow.tsx` (club avatar row — independent of feed data).
- Profile resolution / theming utilities.

## Edge cases

- **`network_workouts` empty** → feed shows only RUNSTR workouts until ingest produces rows. No error state; just fewer items.
- **External authors with no cached profile** (`network_workouts` likely lacks `profile_name`/`profile_picture`) → resolve via NDK profile fetch (kind 0) with graceful fallback to a truncated npub + default avatar. Cache to avoid repeated lookups.
- **Non-cardio / malformed 1301s** → tolerant card; never crash; junk filter drops metric-less rows.
- **Anonymous RUNSTR users** → already covered by `workout_submissions`.
- **Time-column mismatch** between tables → normalize to a common `occurred_at` at the service/view boundary.

## Phasing (for the implementation plan)

1. **Phase 1 — Display rewrite (shippable on its own):** new union read path, tolerant structured cards, junk filter, delete matching machinery, default → 1301, toggle in Settings. Interactions: keep zaps working (Nostr-native, event-id) at minimum; likes/comments may show read-only counts initially.
2. **Phase 2 — Full interactions:** likes + comments fully re-keyed to `event_id` and working across RUNSTR + network workouts.

## Out of scope

- The zapper-side ingest itself (separate repo; already built/fixed).
- The `step_count`/`NaN` write bug fix (tracked with the steps thread; cross-referenced here).
- Step-rewards reinstatement (separate brainstorm).

## Open questions / dependencies (resolve before/within planning)

1. **`network_workouts` exact schema** — paste real column list from the zapper repo; finalize the field map and the time column.
2. **Feed query mechanism** — Supabase view/RPC (preferred) vs client-side merge. If a view/RPC, it needs a migration in this repo.
3. **Interaction re-keying** — confirm the migration path for `social_feed_zaps`/`social_feed_comments` to `event_id`, and how much goes Nostr-native vs Supabase-mirrored. Biggest unknown.
4. **`social_feed` dual-write** — enumerate remaining consumers before retiring it.
5. **Profile resolution volume** for external npubs — batching/caching strategy.

## Verification

1. `npm run typecheck` passes.
2. `scripts/verify/` script: query the new union feed path, assert it returns normalized `FeedWorkout` rows from `workout_submissions` (and `network_workouts` once populated), correctly sorted, with junk rows excluded.
3. Sim check: feed shows uniform cards; a real walk/run renders a card with stats; a step entry with a real count renders a steps card; no plain-text-only workout posts.
4. Interactions: zap a workout (RUNSTR and, once available, a network workout) and confirm it lands; likes/comments per phase.
