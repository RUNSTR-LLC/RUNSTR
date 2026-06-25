# Workout Feed Interactions (Phase 2) — Design

**Date:** 2026-06-24
**Status:** Approved for planning
**Related:** [2026-06-24-workout-feed-redesign-design.md](./2026-06-24-workout-feed-redesign-design.md) (Phase 1, shipped)

## Summary

Make likes, comments, and zaps fully work on the new workout feed by storing them in **Supabase, keyed by the workout's 1301 `event_id`** — a pure in-app implementation with **no Nostr publishing or relay reads**. Counts are read cache-first (instant on first paint). Works identically for RUNSTR and cross-network (`network_workouts`) feed rows, since both carry an `event_id`.

## Why this approach (decision record)

We considered three read paths for interaction counts (Nostr-relay-direct, zapper-aggregated-to-Supabase, pure-in-app-Supabase). Chosen: **pure in-app Supabase**, because:

- **Lowest implementation risk / fastest to ship.** Likes/comments are CRUD; zaps reuse the existing working NWC payment path. No NIP-57 zap-receipt parsing, no relay-read timing/dedup, no external indexer/zapper dependency.
- **Performance-first.** Counts are plain Supabase reads (batched per page, cache-first) → instant, no async relay pop-in.
- **Fitness 1301s are interaction-sparse**, so server-side aggregation infra is premature (YAGNI).

**Tradeoff (accepted):** interactions are RUNSTR-only — not visible to/from other Nostr clients. Low cost given sparse cross-client interaction support today. **Upgrade path (not now):** later we can additively publish kind 7/9735/1 to Nostr on each write, or move aggregation into the always-on zapper, without changing the read model.

## Scope decisions

- **Actions:** like, comment, zap. **Repost is dropped** from the workout feed (Nostr-reposting a workout card is not a meaningful in-app action; the user specified like/zap/comment).
- **Zap = real payment + a record.** The payment goes through the existing `useNWCZap.sendZap(recipientNpub, amount, memo)` (resolves the author's lightning address from their profile). On success we write a `workout_zaps` row. We do **not** custody or simulate — the sats move P2P as today.
- **Trust model:** writes use the Supabase anon key with `WITH CHECK (true)` policies — the established pattern for `social_feed`/`workout_submissions` in this app. This means counts are client-asserted and spoofable by a determined client. Acceptable for social vanity counts (and the zap *payment* is real regardless). Documented, not hidden.

## Data model — new migration

New tables, all keyed by the workout's 1301 `event_id` (TEXT), mirroring the existing public-read + anon-insert RLS pattern (migration 159):

```sql
-- workout_likes
CREATE TABLE workout_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,          -- the workout's 1301 event id
  npub TEXT NOT NULL,              -- who liked
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (event_id, npub)
);
CREATE INDEX idx_workout_likes_event ON workout_likes(event_id);
-- RLS: public SELECT; anon INSERT (WITH CHECK true); anon DELETE (USING true) for unlike

-- workout_comments
CREATE TABLE workout_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  npub TEXT NOT NULL,
  content TEXT NOT NULL,
  author_name TEXT,
  author_avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_workout_comments_event ON workout_comments(event_id);
-- RLS: public SELECT; anon INSERT (WITH CHECK true)

-- workout_zaps
CREATE TABLE workout_zaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  sender_npub TEXT NOT NULL,
  amount INTEGER NOT NULL,          -- sats
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_workout_zaps_event ON workout_zaps(event_id);
-- RLS: public SELECT; anon INSERT (WITH CHECK true)
```

Migration number: next free (latest is 184 → use **185**). Note: per memory, NEVER `db reset`; apply via the migration file + the SQL editor in production.

## Service — `WorkoutInteractionService`

New singleton (`src/services/social/WorkoutInteractionService.ts`), the single owner of interaction reads/writes for the workout feed:

- `getCountsForEvents(eventIds: string[], userNpub: string | null): Promise<Map<string, InteractionCounts>>` — batch-reads the three tables with `.in('event_id', eventIds)`, aggregates per event_id into `{ likeCount, commentCount, zapTotal, likedByMe }`. Three queries per feed page.
- `toggleLike(eventId: string, npub: string): Promise<boolean>` — returns the new liked state (insert if absent, delete if present).
- `getLikers(eventId: string): Promise<string[]>` — npubs (for LikesBottomSheet).
- `addComment(eventId, npub, content, authorName?, authorAvatar?): Promise<WorkoutComment | null>`.
- `getComments(eventId: string, limit?: number): Promise<WorkoutComment[]>`.
- `recordZap(eventId: string, senderNpub: string, amount: number): Promise<void>` — called after a successful payment.
- `getZaps(eventId: string): Promise<WorkoutZap[]>` — sender + amount (for ZapsBottomSheet).

Types (`WorkoutComment`, `WorkoutZap`, `InteractionCounts`) defined alongside the service or in `src/types/`.

## Count hydration

`FeedWorkout` gains optional interaction fields: `likeCount`, `commentCount`, `zapTotal`, `likedByMe`. `WorkoutFeedService.fetchFeed(beforeISO?, limit?, userNpub?)` gains a `userNpub` param; after building (and profile-enriching) the page, it batch-calls `WorkoutInteractionService.getCountsForEvents(eventIds, userNpub)` and attaches the counts to each row (mirroring the existing profile-enrichment step). One extra batched read per page; non-fatal (counts default to 0 on error). `SocialScreen` passes the current `userNpub` into `fetchFeed`.

## UI changes

- **`SocialInteractionRow`**: rewire to the workout feed. Drop the **repost** button. Read counts from the `FeedWorkout`-derived data (`likeCount`/`commentCount`/`zapTotal`/`likedByMe`). On actions:
  - **Like** → optimistic toggle + `WorkoutInteractionService.toggleLike(eventId, userNpub)`.
  - **Comment** → expands `InlineCommentList` (keyed by `eventId`).
  - **Zap** → existing NWC flow `sendZap(authorNpub, amount, memo)`; on `true`, `WorkoutInteractionService.recordZap(eventId, userNpub, amount)` + optimistic `zapTotal` bump.
  - Remove the Phase-1 `feedWorkoutToInteractionPost` adapter (and the `TODO(phase2)` marker) — the row consumes the workout's `eventId`/`npub`/counts directly.
- **`InlineCommentList`**: take `eventId` (not `postId` UUID); read via `getComments`, write via `addComment`.
- **`LikesBottomSheet`**: take `eventId`; read via `getLikers`; resolve names via the existing `nostrProfileService`.
- **`ZapsBottomSheet`**: take `eventId`; read via `getZaps`; resolve names via `nostrProfileService`.

The legacy `SocialFeedService.getZapsForPost`/`getCommentsForPost` (UUID-keyed) and the `social_feed_*` interaction tables are left as-is (the create-post composer / any legacy consumers keep using them). This phase adds the event_id path; it does not migrate the old one.

## Out of scope

- Any Nostr publishing/reading of interactions (deferred upgrade path).
- Reposts on the workout feed.
- Migrating legacy `social_feed` interactions to the new tables.
- Comment moderation/delete (could add author-delete later).

## Edge cases

- **No userNpub (logged-out/anonymous):** likes/comments/zaps require an identity; the UI already gates on `userNpub` for writes. Counts still read (likedByMe = false).
- **Zap to an author with no lightning address:** `sendZap` already fails gracefully (alert); no `recordZap` on failure.
- **Network rows:** identical path (they carry `event_id` + `npub`); names in sheets resolve via `nostrProfileService`.
- **Anon-write spoofing:** accepted trust model (see above).

## Verification

1. `npm run typecheck` clean.
2. `scripts/verify/` script: write a like/comment/zap for a test event_id via `WorkoutInteractionService`, read counts back, assert aggregation correct, clean up the test rows. (Uses the RN stub like the Phase-1 service verify.)
3. Sim: like a workout → count increments + persists across refresh; comment → appears in the inline list; zap (with NWC connected) → payment sends + zap total bumps; open the likes/zaps/comments sheets → populated.
