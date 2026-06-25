# Workout Feed Interactions (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Likes, comments, and zaps on the workout feed, stored in Supabase keyed by the workout's 1301 `event_id` — pure in-app, no Nostr publishing/reading.

**Architecture:** A migration adds three `event_id`-keyed tables. `WorkoutInteractionService` owns all reads/writes. `WorkoutFeedService.fetchFeed` hydrates per-page counts onto `FeedWorkout`. `SocialInteractionRow` + the three bottom-sheets are repointed to the service, keyed by `event_id`. Repost is dropped. Zaps reuse the existing `useNWCZap` payment, then record the amount.

**Tech Stack:** React Native, TypeScript, Supabase JS, existing `useNWCZap`/`nostrProfileService`.

## Global Constraints

- Verify via `npx tsx` scripts + `npm run typecheck` (must pass), NOT jest. Service-level verify scripts run with the RN stub: `npx tsx --require ./scripts/mocks/react-native-stubs.js <script>`.
- NEVER `db reset` (wipes prod) — apply migrations via the file + prod SQL editor.
- Anon writes use `WITH CHECK (true)` (established pattern, migration 159). Accepted spoof trust model for social counts.
- Counts keyed on the workout's 1301 `event_id` (TEXT) for BOTH `workout_submissions` and `network_workouts` rows.
- Terminology firewall in visible text: no "Nostr"/"sats"/"Lightning"/"1301"/"kind". 500-line limit. Real data only.
- `FeedWorkout` (Phase 1, `src/types/feedWorkout.ts`) is camelCase: `eventId`, `npub`, `occurredAt`, `authorName`, `authorAvatar`, etc.

---

### Task 1: Migration 185 — interaction tables

**Files:**
- Create: `supabase/migrations/185_workout_interactions.sql`
- Create: `scripts/verify/verify-workout-interactions-schema.ts`

- [ ] **Step 1: Write the migration** `supabase/migrations/185_workout_interactions.sql`:
```sql
-- Phase 2: in-app workout-feed interactions, keyed by the workout's 1301 event_id.
-- Public read; anon insert (WITH CHECK true) mirrors migration 159 (social_feed).

CREATE TABLE IF NOT EXISTS workout_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  npub TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (event_id, npub)
);
CREATE INDEX IF NOT EXISTS idx_workout_likes_event ON workout_likes(event_id);
ALTER TABLE workout_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read workout_likes" ON workout_likes FOR SELECT USING (true);
CREATE POLICY "Anon insert workout_likes" ON workout_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon delete workout_likes" ON workout_likes FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS workout_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  npub TEXT NOT NULL,
  content TEXT NOT NULL,
  author_name TEXT,
  author_avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workout_comments_event ON workout_comments(event_id);
ALTER TABLE workout_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read workout_comments" ON workout_comments FOR SELECT USING (true);
CREATE POLICY "Anon insert workout_comments" ON workout_comments FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS workout_zaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  sender_npub TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workout_zaps_event ON workout_zaps(event_id);
ALTER TABLE workout_zaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read workout_zaps" ON workout_zaps FOR SELECT USING (true);
CREATE POLICY "Anon insert workout_zaps" ON workout_zaps FOR INSERT WITH CHECK (true);
```

- [ ] **Step 2: Apply the migration to the live DB.** This repo has no automated migration runner in-session and `db reset` is forbidden. The implementer MUST report DONE_WITH_CONCERNS noting the SQL needs to be applied by the user via the Supabase SQL editor (or `supabase db push` if they use it) — and write the verify script (Step 3) so it FAILS until applied, PASSES after. Do not claim the tables exist without evidence.

- [ ] **Step 3: Write the verify script** `scripts/verify/verify-workout-interactions-schema.ts` — confirms the three tables exist and are readable (anon SELECT returns no error; count >= 0):
```ts
// Run: npx tsx --require ./scripts/mocks/react-native-stubs.js scripts/verify/verify-workout-interactions-schema.ts
import 'dotenv/config';
import { supabase } from '../../src/utils/supabase';
const tables = ['workout_likes', 'workout_comments', 'workout_zaps'];
(async () => {
  let failed = 0;
  for (const t of tables) {
    const { error } = await supabase!.from(t).select('event_id', { count: 'exact', head: true });
    if (error) { console.error(`FAIL ${t}: ${error.message}`); failed++; }
    else console.log(`OK ${t} exists + readable`);
  }
  console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED (apply migration 185 in Supabase SQL editor)`);
  process.exit(failed === 0 ? 0 : 1);
})();
```

- [ ] **Step 4: Run it.** Before the user applies the SQL: expected FAIL ("relation does not exist"). The controller will apply (or ask the user to apply) the migration, then re-run → `ALL PASS`.

- [ ] **Step 5: Commit**
```bash
git add supabase/migrations/185_workout_interactions.sql scripts/verify/verify-workout-interactions-schema.ts
git commit -m "Feature: migration for event_id-keyed workout interaction tables"
```

---

### Task 2: `WorkoutInteractionService` + types

**Files:**
- Create: `src/services/social/WorkoutInteractionService.ts`
- Create: `scripts/verify/verify-workout-interaction-service.ts`

**Interfaces (Produces):**
```ts
export interface InteractionCounts { likeCount: number; commentCount: number; zapTotal: number; likedByMe: boolean; }
export interface WorkoutComment { id: string; event_id: string; npub: string; content: string; author_name: string | null; author_avatar: string | null; created_at: string; }
export interface WorkoutZap { id: string; event_id: string; sender_npub: string; amount: number; created_at: string; }
// WorkoutInteractionService.getInstance():
//   getCountsForEvents(eventIds: string[], userNpub: string | null): Promise<Map<string, InteractionCounts>>
//   toggleLike(eventId: string, npub: string): Promise<boolean>   // returns new liked state
//   getLikers(eventId: string): Promise<string[]>
//   addComment(eventId, npub, content, authorName?, authorAvatar?): Promise<WorkoutComment | null>
//   getComments(eventId: string, limit?: number): Promise<WorkoutComment[]>
//   recordZap(eventId: string, senderNpub: string, amount: number): Promise<void>
//   getZaps(eventId: string): Promise<WorkoutZap[]>
```

- [ ] **Step 1: Write the failing verify script** `scripts/verify/verify-workout-interaction-service.ts` — round-trips against the LIVE DB using a unique test event_id, then cleans up:
```ts
// Run: npx tsx --require ./scripts/mocks/react-native-stubs.js scripts/verify/verify-workout-interaction-service.ts
import 'dotenv/config';
import { WorkoutInteractionService } from '../../src/services/social/WorkoutInteractionService';
import { supabase } from '../../src/utils/supabase';

const svc = WorkoutInteractionService.getInstance();
const EVT = `__verify_evt_${Date.now()}`;     // unique; avoids Date.now-in-workflow ban (this is a standalone script, fine)
const NPUB = '__verify_npub__';
let failed = 0; const assert = (c: boolean, m: string) => { if (!c) { console.error('FAIL:', m); failed++; } };

(async () => {
  const liked = await svc.toggleLike(EVT, NPUB);          assert(liked === true, 'like on');
  await svc.addComment(EVT, NPUB, 'hi', 'Tester', null);
  await svc.recordZap(EVT, NPUB, 21);
  const counts = (await svc.getCountsForEvents([EVT], NPUB)).get(EVT);
  assert(counts?.likeCount === 1, 'likeCount 1');
  assert(counts?.commentCount === 1, 'commentCount 1');
  assert(counts?.zapTotal === 21, 'zapTotal 21');
  assert(counts?.likedByMe === true, 'likedByMe true');
  assert((await svc.getComments(EVT)).length === 1, 'getComments 1');
  assert((await svc.getLikers(EVT)).includes(NPUB), 'getLikers has npub');
  assert((await svc.getZaps(EVT)).length === 1, 'getZaps 1');
  const unliked = await svc.toggleLike(EVT, NPUB);         assert(unliked === false, 'like off');
  assert((await svc.getCountsForEvents([EVT], NPUB)).get(EVT)?.likeCount === 0, 'likeCount 0 after unlike');
  // cleanup
  await supabase!.from('workout_likes').delete().eq('event_id', EVT);
  await supabase!.from('workout_comments').delete().eq('event_id', EVT);
  await supabase!.from('workout_zaps').delete().eq('event_id', EVT);
  console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
})();
```

- [ ] **Step 2: Run it, verify it fails** (module not found): `npx tsx --require ./scripts/mocks/react-native-stubs.js scripts/verify/verify-workout-interaction-service.ts` → FAIL.

- [ ] **Step 3: Implement** `src/services/social/WorkoutInteractionService.ts`. Singleton mirroring `WorkoutFeedService`. `getCountsForEvents` does three `.in('event_id', eventIds)` reads (likes, comments, zaps) and aggregates into the Map (likeCount = rows per event; commentCount = rows per event; zapTotal = sum(amount); likedByMe = a like row exists for userNpub). `toggleLike` selects existing `(event_id,npub)`; deletes→returns false, else inserts→returns true. Other methods are direct table reads/writes. All wrapped non-fatal (log + sane default). Use `supabase`/`isSupabaseConfigured` from `../../utils/supabase`.

- [ ] **Step 4: Run it, verify PASS** (requires migration 185 applied): → `ALL PASS`.

- [ ] **Step 5: Commit**
```bash
git add src/services/social/WorkoutInteractionService.ts scripts/verify/verify-workout-interaction-service.ts
git commit -m "Feature: WorkoutInteractionService (likes/comments/zaps by event_id)"
```

---

### Task 3: Hydrate counts onto the feed

**Files:**
- Modify: `src/types/feedWorkout.ts` (add optional interaction fields)
- Modify: `src/services/social/WorkoutFeedService.ts` (`fetchFeed` gains `userNpub`, hydrates counts)
- Modify: `src/screens/SocialScreen.tsx` (pass `userNpub` into `fetchFeed`)

- [ ] **Step 1:** Add to `FeedWorkout` (optional, default-absent): `likeCount?: number; commentCount?: number; zapTotal?: number; likedByMe?: boolean;`. Do NOT set them in the normalizers (they're hydrated later).

- [ ] **Step 2:** In `WorkoutFeedService.fetchFeed`, add a 3rd param `userNpub: string | null = null`. After the existing profile-enrichment + before `this.cached = page`, batch-call `WorkoutInteractionService.getCountsForEvents(page.map(w => w.eventId), userNpub)` and assign `likeCount/commentCount/zapTotal/likedByMe` onto each row (default 0/false on miss). Non-fatal (try/catch; leave defaults). Import `WorkoutInteractionService`.

- [ ] **Step 3:** In `SocialScreen.tsx`, pass the screen's `userNpub` into both `fetchFeed()` calls (initial load + `handleLoadMore`).

- [ ] **Step 4:** Extend the service verify (or the feed verify) minimally OR rely on typecheck + the Task-2 verify. Run `npm run typecheck` → PASS. Run the feed verify (`verify-workout-feed-service.ts`) → still `ALL PASS` (counts hydration must not break the page; with no userNpub, likedByMe=false, counts 0 where no interactions).

- [ ] **Step 5: Commit**
```bash
git add src/types/feedWorkout.ts src/services/social/WorkoutFeedService.ts src/screens/SocialScreen.tsx
git commit -m "Feature: hydrate workout-feed interaction counts per page"
```

---

### Task 4: Rewrite `SocialInteractionRow` (Supabase-backed; drop repost)

**Files:**
- Modify: `src/components/social/SocialInteractionRow.tsx`
- Modify: `src/components/social/SocialFeedPost.tsx` (remove `feedWorkoutToInteractionPost`; pass workout to the row)

- [ ] **Step 1:** Change `SocialInteractionRow` props from `{ post: SocialFeedPost }` to `{ workout: FeedWorkout; userNpub: string }`. Initialize local state from the workout's hydrated fields: `likeCount = workout.likeCount ?? 0`, `commentCount = workout.commentCount ?? 0`, `zapTotal = workout.zapTotal ?? 0`, `isLiked = workout.likedByMe ?? false`. **Remove the repost button and all repost state/handlers.**
- [ ] **Step 2:** Wire actions to `WorkoutInteractionService.getInstance()`:
  - Like: optimistic toggle of `isLiked`/`likeCount`, then `await svc.toggleLike(workout.eventId, userNpub)`; on throw, revert.
  - Comment: keep the expand-to-`InlineCommentList` behavior, passing `eventId={workout.eventId}` and `userNpub` (Task 5 updates the list's props).
  - Zap: keep the `useNWCZap` flow — `sendZap(workout.npub, amount, 'Zap from RUNSTR')`; on `true`, optimistic `zapTotal += amount` and `await svc.recordZap(workout.eventId, userNpub, amount)`. (ExternalZapModal path, if present, similarly calls `recordZap` on success.)
  - Likes/Zaps sheets: pass `eventId={workout.eventId}` (Task 5 updates their props).
- [ ] **Step 3:** In `SocialFeedPost.tsx`, delete `feedWorkoutToInteractionPost` and the `TODO(phase2)` comment; render `<SocialInteractionRow workout={workout} userNpub={userNpub} />`.
- [ ] **Step 4:** `npm run typecheck` → PASS.
- [ ] **Step 5: Commit**
```bash
git add src/components/social/SocialInteractionRow.tsx src/components/social/SocialFeedPost.tsx
git commit -m "Refactor: SocialInteractionRow uses WorkoutInteractionService; drop repost"
```

---

### Task 5: Repoint the bottom-sheets to `event_id`

**Files:**
- Modify: `src/components/social/InlineCommentList.tsx`
- Modify: `src/components/social/LikesBottomSheet.tsx`
- Modify: `src/components/social/ZapsBottomSheet.tsx`

- [ ] **Step 1: `InlineCommentList`** — props take `eventId: string` + `userNpub: string` (replace `postId`/`postEventId`/`postAuthorPubkey`). Read via `WorkoutInteractionService.getComments(eventId)`; submit via `addComment(eventId, userNpub, content, authorName?, authorAvatar?)` (resolve the submitter's name/avatar from cached profile/AsyncStorage if readily available, else null). Remove the old Nostr `publishComment` call and `SocialFeedService.getCommentsForPost`.
- [ ] **Step 2: `LikesBottomSheet`** — props take `eventId: string`. Read npubs via `WorkoutInteractionService.getLikers(eventId)`; resolve display names/avatars via the existing `nostrProfileService`. Replace the old `post.liked_by` prop read.
- [ ] **Step 3: `ZapsBottomSheet`** — props take `eventId: string`. Read via `WorkoutInteractionService.getZaps(eventId)`; resolve sender names via `nostrProfileService`. Replace `SocialFeedService.getZapsForPost`.
- [ ] **Step 4:** `npm run typecheck` → PASS (confirm `SocialInteractionRow` passes the new props from Task 4; no remaining `postId`/`liked_by`-prop references in these three files).
- [ ] **Step 5: Simulator check** (user runs): like → count↑, persists on refresh; comment → appears in inline list; zap (NWC connected) → payment sends + total↑; open likes/zaps/comments sheets → populated with resolved names.
- [ ] **Step 6: Commit**
```bash
git add src/components/social/InlineCommentList.tsx src/components/social/LikesBottomSheet.tsx src/components/social/ZapsBottomSheet.tsx
git commit -m "Refactor: interaction bottom-sheets read by event_id via WorkoutInteractionService"
```

---

## Self-Review

- **Spec coverage:** tables (T1 ✓), service (T2 ✓), count hydration (T3 ✓), row rewrite + drop repost + remove adapter (T4 ✓), sheets repointed (T5 ✓), zap = pay-then-record (T2 `recordZap` + T4 wiring ✓), trust model = anon-write policies (T1 ✓).
- **Deferred/legacy:** legacy `SocialFeedService.getZapsForPost`/`getCommentsForPost` + `social_feed_*` tables left intact for the composer/legacy path (not migrated) — by design.
- **Placeholder scan:** none (the Date.now() in the verify script is a standalone tsx script, not a Workflow script — allowed).
- **Type consistency:** `FeedWorkout` camelCase throughout; service returns `InteractionCounts`/`WorkoutComment`/`WorkoutZap` as defined in T2 and consumed in T3/T4/T5; `toggleLike` returns the new liked state, used optimistically in T4.
- **External dependency:** migration 185 must be applied to the live DB (Task 1) before Task 2's verify and the sim checks pass — surfaced as DONE_WITH_CONCERNS, handled by the controller/user.
