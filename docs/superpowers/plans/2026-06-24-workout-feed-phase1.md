# Workout Feed Redesign — Phase 1 (Display) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Social feed a pure workout feed sourced directly from Supabase (`workout_submissions` ∪ `network_workouts`), rendering every item as a structured card — deleting the kind-1 → Supabase matching machinery.

**Architecture:** A new `WorkoutFeedService` reads both workout tables, normalizes them into one `FeedWorkout` shape, junk-filters metric-less rows, and paginates by recency. `SocialScreen` consumes it; `SocialFeedPost` becomes a thin card row. The kind-1 ingest (`social_feed`) is no longer read for the feed. Phase 2 (full interaction re-keying to event_id) is a separate plan.

**Tech Stack:** React Native, TypeScript, Expo, Supabase JS, NDK (profile resolution).

## Global Constraints

- Verify via `npm run typecheck` (must pass) + `npx tsx scripts/verify/*.ts` scripts + simulator. No jest for this area.
- **NDK exclusively** for any Nostr op — `GlobalNDKService.getInstance()`. Never nostr-tools, never `new NDK()`.
- Terminology firewall in user-facing text: no "Nostr"/"sats"/"1301"/"kind" in visible copy.
- 500-line file limit per file.
- Real data only — no mocks.
- Single-branch: commit directly to `main`, `Feature:`/`Refactor:` prefixes.
- **Confirmed table schemas** (2026-06-24):
  - `workout_submissions`: `npub, event_id, activity_type, distance_meters, duration_seconds, calories, step_count, profile_name, profile_picture, created_at, raw_event`
  - `network_workouts`: `event_id, pubkey, npub, activity_type, distance_meters, duration_seconds, calories, steps, title, source, client, ingested_at, event_created_at, raw_event, tags` — note **`steps`** (not `step_count`) and **`event_created_at`** (not `created_at`); no profile name/picture columns.

## Known dependency / non-blocker

`network_workouts` is **empty** at plan time (zapper ingest just fixed, no 1301 picked up yet). Phase 1 is built and verified against `workout_submissions` (8,658 rows). Cross-network cards appear automatically once the zapper populates rows — no further app change needed. Do **not** block on it.

---

### Task 1: `FeedWorkout` type + normalizers

**Files:**
- Create: `src/types/feedWorkout.ts`
- Create: `scripts/verify/verify-feed-normalizers.ts`

**Interfaces:**
- Produces: `FeedWorkout` interface; `normalizeSubmissionRow(row)` and `normalizeNetworkRow(row)` → `FeedWorkout`.

- [ ] **Step 1: Write the failing verify script** `scripts/verify/verify-feed-normalizers.ts`:
```ts
import { normalizeSubmissionRow, normalizeNetworkRow } from '../../src/types/feedWorkout';

let failed = 0;
const assert = (cond: boolean, msg: string) => { if (!cond) { console.error('FAIL:', msg); failed++; } };

// workout_submissions row → FeedWorkout
const sub = normalizeSubmissionRow({
  event_id: 'evt1', npub: 'npub1abc', activity_type: 'running',
  distance_meters: 5000, duration_seconds: 1500, calories: 300, step_count: null,
  profile_name: 'Tess', profile_picture: 'http://x/p.png', created_at: '2026-06-24T10:00:00Z',
});
assert(sub.eventId === 'evt1', 'sub eventId');
assert(sub.source === 'runstr', 'sub source');
assert(sub.stepCount === null, 'sub steps null');
assert(sub.occurredAt === '2026-06-24T10:00:00Z', 'sub occurredAt from created_at');
assert(sub.authorName === 'Tess', 'sub authorName');

// network_workouts row → FeedWorkout (steps + event_created_at + title; no profile)
const net = normalizeNetworkRow({
  event_id: 'evt2', npub: 'npub1xyz', pubkey: 'hexpk', activity_type: 'strength',
  distance_meters: null, duration_seconds: 2400, calories: 180, steps: 0,
  title: 'Leg day', event_created_at: '2026-06-24T09:00:00Z', ingested_at: '2026-06-24T09:05:00Z',
});
assert(net.eventId === 'evt2', 'net eventId');
assert(net.source === 'network', 'net source');
assert(net.stepCount === 0, 'net steps mapped from steps col');
assert(net.occurredAt === '2026-06-24T09:00:00Z', 'net occurredAt from event_created_at (not ingested_at)');
assert(net.title === 'Leg day', 'net title');
assert(net.authorName === null, 'net authorName null (resolve later)');

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
```

- [ ] **Step 2: Run it, verify it fails**
Run: `npx tsx scripts/verify/verify-feed-normalizers.ts`
Expected: FAIL (module not found / functions undefined).

- [ ] **Step 3: Implement** `src/types/feedWorkout.ts`:
```ts
/**
 * Unified shape the workout feed renders, normalized from either
 * `workout_submissions` (RUNSTR) or `network_workouts` (cross-Nostr ingest).
 * The UI never branches on source table — it reads FeedWorkout.
 */
export interface FeedWorkout {
  eventId: string;            // Nostr 1301 event id — interaction key (Phase 2) + dedup
  npub: string;
  source: 'runstr' | 'network';
  activityType: string;       // may be non-cardio for network rows
  distanceMeters: number | null;
  durationSeconds: number | null;
  calories: number | null;
  stepCount: number | null;
  title: string | null;       // free-text title (network rows); null for RUNSTR
  occurredAt: string;         // ISO; used for sort + display
  authorName: string | null;  // null for network rows until kind-0 resolution
  authorAvatar: string | null;
}

const toNum = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return typeof n === 'number' && isFinite(n) && !Number.isNaN(n) ? n : null;
};

export function normalizeSubmissionRow(row: any): FeedWorkout {
  return {
    eventId: row.event_id,
    npub: row.npub,
    source: 'runstr',
    activityType: row.activity_type ?? '',
    distanceMeters: toNum(row.distance_meters),
    durationSeconds: toNum(row.duration_seconds),
    calories: toNum(row.calories),
    stepCount: toNum(row.step_count),
    title: null,
    occurredAt: row.created_at,
    authorName: row.profile_name ?? null,
    authorAvatar: row.profile_picture ?? null,
  };
}

export function normalizeNetworkRow(row: any): FeedWorkout {
  return {
    eventId: row.event_id,
    npub: row.npub,
    source: 'network',
    activityType: row.activity_type ?? '',
    distanceMeters: toNum(row.distance_meters),
    durationSeconds: toNum(row.duration_seconds),
    calories: toNum(row.calories),
    stepCount: toNum(row.steps),          // network col is `steps`
    title: row.title ?? null,
    occurredAt: row.event_created_at,     // NOT ingested_at
    authorName: null,                     // resolved via NDK kind-0 later
    authorAvatar: null,
  };
}
```
Note: `toNum` guards the `"NaN"` string seen in live step rows so junk steps normalize to `null`.

- [ ] **Step 4: Run it, verify PASS**
Run: `npx tsx scripts/verify/verify-feed-normalizers.ts` → Expected: `ALL PASS`.

- [ ] **Step 5: Commit**
```bash
git add src/types/feedWorkout.ts scripts/verify/verify-feed-normalizers.ts
git commit -m "Feature: FeedWorkout type + table normalizers for workout feed"
```

---

### Task 2: `WorkoutFeedService` — union read, junk filter, pagination

**Files:**
- Create: `src/services/social/WorkoutFeedService.ts`
- Create: `scripts/verify/verify-workout-feed-service.ts`

**Interfaces:**
- Consumes: `FeedWorkout`, `normalizeSubmissionRow`, `normalizeNetworkRow` (Task 1); `supabase` from `src/utils/supabase`.
- Produces: `WorkoutFeedService.getInstance().fetchFeed(beforeISO?: string, limit = 20): Promise<FeedWorkout[]>` and `isFeedWorthy(w: FeedWorkout): boolean`.

**Design:** Query both tables for the page window, normalize, merge, **drop junk** (`isFeedWorthy` = has any of distance>0, duration>0, steps>0), sort by `occurredAt` desc, slice to `limit`. Pagination: pass the last item's `occurredAt` as `beforeISO`; each table filters its own time column (`created_at` / `event_created_at`) `< beforeISO`. De-dupe defensively by `eventId`.

- [ ] **Step 1: Write the failing verify script** `scripts/verify/verify-workout-feed-service.ts`:
```ts
import { WorkoutFeedService } from '../../src/services/social/WorkoutFeedService';
import type { FeedWorkout } from '../../src/types/feedWorkout';

const svc = WorkoutFeedService.getInstance();

// isFeedWorthy: junk filter
const junk: FeedWorkout = { eventId: 'j', npub: 'n', source: 'runstr', activityType: 'walking',
  distanceMeters: null, durationSeconds: 0, calories: null, stepCount: null, title: null,
  occurredAt: '2026-06-24T00:00:00Z', authorName: null, authorAvatar: null };
const stepsOk: FeedWorkout = { ...junk, eventId: 's', stepCount: 8432 };
let failed = 0;
const assert = (c: boolean, m: string) => { if (!c) { console.error('FAIL:', m); failed++; } };
assert(svc.isFeedWorthy(junk) === false, 'metric-less row is junk');
assert(svc.isFeedWorthy(stepsOk) === true, 'steps>0 row is feed-worthy');

(async () => {
  const page = await svc.fetchFeed(undefined, 10);
  assert(Array.isArray(page), 'returns array');
  assert(page.every(w => svc.isFeedWorthy(w)), 'no junk in live page');
  assert(page.every((w, i) => i === 0 || page[i-1].occurredAt >= w.occurredAt), 'sorted desc');
  console.log(`live page size: ${page.length}`);
  console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
})();
```

- [ ] **Step 2: Run it, verify it fails**
Run: `npx tsx scripts/verify/verify-workout-feed-service.ts` → Expected: FAIL (module not found).

- [ ] **Step 3: Implement** `src/services/social/WorkoutFeedService.ts`:
```ts
import { supabase, isSupabaseConfigured } from '../../utils/supabase';
import {
  type FeedWorkout, normalizeSubmissionRow, normalizeNetworkRow,
} from '../../types/feedWorkout';

const SUB_COLS = 'event_id, npub, activity_type, distance_meters, duration_seconds, calories, step_count, profile_name, profile_picture, created_at';
const NET_COLS = 'event_id, npub, pubkey, activity_type, distance_meters, duration_seconds, calories, steps, title, event_created_at, ingested_at';

export class WorkoutFeedService {
  private static instance: WorkoutFeedService;
  private cached: FeedWorkout[] | null = null;

  static getInstance(): WorkoutFeedService {
    if (!WorkoutFeedService.instance) WorkoutFeedService.instance = new WorkoutFeedService();
    return WorkoutFeedService.instance;
  }

  /** A row earns a feed card only if it has at least one renderable metric. */
  isFeedWorthy(w: FeedWorkout): boolean {
    return (w.distanceMeters ?? 0) > 0 || (w.durationSeconds ?? 0) > 0 || (w.stepCount ?? 0) > 0;
  }

  async fetchFeed(beforeISO?: string, limit = 20): Promise<FeedWorkout[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      let subQ = supabase!.from('workout_submissions').select(SUB_COLS)
        .order('created_at', { ascending: false }).limit(limit);
      let netQ = supabase!.from('network_workouts').select(NET_COLS)
        .order('event_created_at', { ascending: false }).limit(limit);
      if (beforeISO) { subQ = subQ.lt('created_at', beforeISO); netQ = netQ.lt('event_created_at', beforeISO); }

      const [subRes, netRes] = await Promise.all([subQ, netQ]);
      if (subRes.error) console.error('[WorkoutFeed] submissions:', subRes.error.message);
      if (netRes.error) console.error('[WorkoutFeed] network:', netRes.error.message);

      const merged: FeedWorkout[] = [
        ...(subRes.data ?? []).map(normalizeSubmissionRow),
        ...(netRes.data ?? []).map(normalizeNetworkRow),
      ].filter((w) => this.isFeedWorthy(w));

      const seen = new Set<string>();
      const deduped = merged.filter((w) => (seen.has(w.eventId) ? false : (seen.add(w.eventId), true)));
      deduped.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : 0));

      const page = deduped.slice(0, limit);
      if (!beforeISO) this.cached = page;
      return page;
    } catch (e) {
      console.error('[WorkoutFeed] fetchFeed error:', e);
      return [];
    }
  }

  getCached(): FeedWorkout[] | null { return this.cached; }
  clearCache(): void { this.cached = null; }
}
```
Note: querying each table for `limit` then merging is correct for a page but the merged window can under-fill when one table dominates; acceptable for Phase 1 (load-more re-queries with the last `occurredAt`). A server-side union view is the documented Phase-1.5 optimization (spec open question #2) — not required here.

- [ ] **Step 4: Run it, verify PASS**
Run: `npx tsx scripts/verify/verify-workout-feed-service.ts` → Expected: `ALL PASS` + a nonzero live page size.

- [ ] **Step 5: Commit**
```bash
git add src/services/social/WorkoutFeedService.ts scripts/verify/verify-workout-feed-service.ts
git commit -m "Feature: WorkoutFeedService union read of workout_submissions + network_workouts"
```

---

### Task 3: Generalize the card display for non-cardio + duration-only

**Files:**
- Modify: `src/components/social/workoutCardDisplay.ts:35-76`
- Create: `scripts/verify/verify-card-display.ts`

**Why:** `deriveWorkoutCardDisplay` currently makes distance the hero whenever it's not a steps/walk case. A network strength workout with only `duration` would render a `0.00 KM` hero. Add a **duration-hero fallback**: when there's no distance and no steps but there is duration, the hero is the duration.

**Interfaces:**
- Modify: `WorkoutCardDisplay` gains `useDurationHero: boolean`. `WorkoutCardData` unchanged (already matches `FeedWorkout` snake fields via an adapter in Task 4).

- [ ] **Step 1: Write failing verify** `scripts/verify/verify-card-display.ts`:
```ts
import { deriveWorkoutCardDisplay } from '../../src/components/social/workoutCardDisplay';
let failed = 0; const assert = (c: boolean, m: string) => { if (!c) { console.error('FAIL:', m); failed++; } };

// strength: only duration → duration is hero, no 0.00 KM
const s = deriveWorkoutCardDisplay({ activity_type: 'strength', distance_meters: null, duration_seconds: 2400, calories: 180, step_count: null }, 'km');
assert(s.useDurationHero === true, 'strength uses duration hero');
assert(s.useStepsHero === false, 'strength not steps hero');
assert(s.heroUnit !== 'KM', 'strength hero unit not KM');

// running unchanged: distance hero + pace
const r = deriveWorkoutCardDisplay({ activity_type: 'running', distance_meters: 5000, duration_seconds: 1500, calories: 300, step_count: null }, 'km');
assert(r.useDurationHero === false, 'running not duration hero');
assert(r.showPace === true, 'running shows pace');
assert(r.heroUnit === 'KM', 'running hero KM');

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
```

- [ ] **Step 2: Run, verify fails** (`useDurationHero` undefined): `npx tsx scripts/verify/verify-card-display.ts` → FAIL.

- [ ] **Step 3: Implement** — in `workoutCardDisplay.ts`, add `useDurationHero` to the `WorkoutCardDisplay` interface and update the body. Replace the hero block (lines ~51-56) with:
```ts
  const useStepsHero = isStepsOnly || (isWalking && !hasDistance && hasSteps);
  // Non-distance, non-steps activity (e.g. strength) with a duration: time is the hero.
  const useDurationHero = !useStepsHero && !hasDistance && !hasSteps && hasDuration;
  const heroValue = useStepsHero
    ? workout.step_count ?? 0
    : useDurationHero
      ? workout.duration_seconds ?? 0
      : (unit === 'mi' ? (workout.distance_meters ?? 0) / 1609.344 : (workout.distance_meters ?? 0) / 1000);
  const heroUnit = useStepsHero ? 'STEPS' : useDurationHero ? 'TIME' : unit.toUpperCase();
  const heroDecimals = useStepsHero || useDurationHero ? 0 : 2;
```
And update `showTime` so it doesn't double-show when duration is the hero:
```ts
  const showTime = hasDuration && !isStepsOnly && !useDurationHero;
```
Add `useDurationHero` to the returned object. (When `useDurationHero`, `WorkoutPostCard` renders the hero as HH:MM:SS — handled in Task 4.)

- [ ] **Step 4: Run, verify PASS**: `npx tsx scripts/verify/verify-card-display.ts` → `ALL PASS`.

- [ ] **Step 5: Commit**
```bash
git add src/components/social/workoutCardDisplay.ts scripts/verify/verify-card-display.ts
git commit -m "Feature: duration-hero fallback for non-cardio workout cards"
```

---

### Task 4: Rewrite `SocialFeedPost` as a workout-card row + adapter

**Files:**
- Modify: `src/components/social/SocialFeedPost.tsx` (full rewrite of the inner component)
- Modify: `src/components/social/WorkoutPostCard.tsx` (render duration-hero as HH:MM:SS; accept optional `title`)

**Interfaces:**
- Consumes: `FeedWorkout` (Task 1), `deriveWorkoutCardDisplay` (Task 3), existing `Avatar`, `timeAgo`, `SocialInteractionRow`, `WorkoutPostCard`.
- Produces: `SocialFeedPost` now takes `{ workout: FeedWorkout; userNpub: string }`.

- [ ] **Step 1:** In `WorkoutPostCard.tsx`, map a `FeedWorkout` to the `WorkoutCardData` the display fn expects and render the hero. Add an adapter at the top of the component and handle `useDurationHero` by formatting the hero value with the existing `formatDuration` helper when `display.useDurationHero` is true. Accept an optional `title?: string | null` prop and render it above the hero when present.

- [ ] **Step 2:** Rewrite `SocialFeedPostInner` in `SocialFeedPost.tsx`:
```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { Avatar } from '../ui/Avatar';
import { timeAgo } from '../../types/social';
import type { FeedWorkout } from '../../types/feedWorkout';
import { SocialInteractionRow } from './SocialInteractionRow';
import { WorkoutPostCard } from './WorkoutPostCard';

interface SocialFeedPostProps { workout: FeedWorkout; userNpub: string; }

const SocialFeedPostInner: React.FC<SocialFeedPostProps> = ({ workout, userNpub }) => {
  const displayName = workout.authorName || 'Anonymous';
  return (
    <View style={styles.card}>
      <View style={styles.authorRow}>
        <Avatar name={displayName} size={36} imageUrl={workout.authorAvatar || undefined} />
        <View style={styles.authorInfo}>
          <Text style={styles.authorName} numberOfLines={1}>{displayName}</Text>
          <Text style={styles.timestamp}>{timeAgo(workout.occurredAt)}</Text>
        </View>
      </View>
      <WorkoutPostCard workout={workout} title={workout.title} />
      <SocialInteractionRow workout={workout} userNpub={userNpub} />
    </View>
  );
};
export const SocialFeedPost = React.memo(SocialFeedPostInner);
// styles: reuse the existing card/authorRow/authorInfo/authorName/timestamp StyleSheet from the prior version.
```
Keep the existing `styles` block (card, authorRow, authorInfo, authorName, timestamp). Remove `content`/`image` styles and all image/sanitization/matching logic.

- [ ] **Step 3:** `SocialInteractionRow` currently takes `post: SocialFeedPost`. For Phase 1, add an overloaded/adapted prop path so it accepts `{ workout: FeedWorkout }` and keys interactions off `workout.eventId`. **Minimal Phase-1 change:** display the like/zap/comment row keyed by `eventId`; zaps (Nostr-native, to `workout.npub` / event) work; likes/comments may show zero counts until Phase 2 re-keys the `social_feed_zaps`/`social_feed_comments` tables. Add a `// TODO(phase2): re-key interaction reads/writes to event_id` marker. **Do not silently drop interactions** — render the row.

- [ ] **Step 4: Typecheck**: `npm run typecheck` → PASS.

- [ ] **Step 5: Commit**
```bash
git add src/components/social/SocialFeedPost.tsx src/components/social/WorkoutPostCard.tsx src/components/social/SocialInteractionRow.tsx
git commit -m "Refactor: SocialFeedPost renders FeedWorkout cards directly (no kind-1 matching)"
```

---

### Task 5: Repoint `SocialScreen` to `WorkoutFeedService` + delete matching machinery

**Files:**
- Modify: `src/screens/SocialScreen.tsx:79-149` (feed load + renderPost)
- Delete: `src/hooks/useMatchedWorkout.ts`, `src/hooks/matchWorkoutPosts.ts`

- [ ] **Step 1:** In `SocialScreen.tsx`, replace `feedService` (SocialFeedService) usage for the feed with `WorkoutFeedService.getInstance()`. Update state type `posts` to `FeedWorkout[]`. `loadData`: fetch `workoutFeed.fetchFeed()`; pagination uses `posts[posts.length-1].occurredAt`. `renderPost` becomes:
```tsx
const renderPost = useCallback(({ item }: { item: FeedWorkout }) => (
  <SocialFeedPost workout={item} userNpub={userNpub} />
), [userNpub]);
```
Update `keyExtractor` to `item.eventId`. Keep `ClubsRow`, events, and the create-post entry as-is (create-post still uses `SocialFeedService.createLocalPost` if a general-post composer remains; otherwise hide the composer — confirm with product, default: keep composer but it no longer appears in the workout feed).

- [ ] **Step 2:** Delete the orphaned hooks:
```bash
git rm src/hooks/useMatchedWorkout.ts src/hooks/matchWorkoutPosts.ts
```

- [ ] **Step 3: Typecheck**: `npm run typecheck` → PASS (no dangling imports of the deleted hooks).

- [ ] **Step 4: Simulator check** — Social tab: feed shows uniform workout cards from `workout_submissions`; a run shows distance/time/pace; a steps entry with a real count shows a steps card; no plain-text-only posts; ClubsRow intact; pull-to-refresh and load-more work.

- [ ] **Step 5: Commit**
```bash
git add src/screens/SocialScreen.tsx
git commit -m "Feature: Social feed reads workout tables directly; delete kind-1 matching"
```

---

### Task 6: Resolve profile names/avatars for network workouts

**Files:**
- Modify: `src/services/social/WorkoutFeedService.ts` (post-fetch enrichment)
- Reuse: existing profile cache/service (find the established NDK kind-0 resolver — e.g. `NostrProfileService` / profile cache used by `ClubLeaderboardSection`; grep before writing a new one).

- [ ] **Step 1:** After building `page`, batch-resolve `authorName`/`authorAvatar` for rows where `source === 'network'` (and any RUNSTR row missing `profile_name`). Use the existing NDK profile resolver via `GlobalNDKService`; cache by npub; fall back to a truncated npub + default avatar. Do not block initial render — resolve and update, or resolve before returning if fast. **Reachability:** grep for the existing profile-resolution helper and reuse it; do not create a parallel one.

- [ ] **Step 2: Typecheck + sim**: network rows (once present) show real names; absent → truncated npub, no crash. Until `network_workouts` has rows, verify RUNSTR rows still show `profile_name`.

- [ ] **Step 3: Commit**
```bash
git add src/services/social/WorkoutFeedService.ts
git commit -m "Feature: resolve profiles for network workout feed rows"
```

---

### Task 7: Make posting honor the 1301 default everywhere

**Files:**
- Modify: `src/services/nostr/workoutPublishingService.ts:679`
- Modify: `src/screens/activity/ActivityTrackerScreen.tsx:159`, `src/components/profile/shared/SocialShareModal.tsx:76`

**Why:** Preference default is already `kind1301` and `postWorkout` callers honor it, but (a) `postWorkout`'s fallback is `|| 'kind1'`, and (b) `ActivityTrackerScreen` + `SocialShareModal` call `postWorkoutToSocial` directly (always kind 1), bypassing the preference.

- [ ] **Step 1:** In `workoutPublishingService.ts:679`, change the fallback:
```ts
const format = options.format || 'kind1301';
```

- [ ] **Step 2:** In `ActivityTrackerScreen.tsx:159` and `SocialShareModal.tsx:76`, read the preference and route through `postWorkout(workout, { format })` (mirroring `WorkoutSummaryModal.tsx:371-372`) instead of calling `postWorkoutToSocial` unconditionally:
```ts
const format = await NostrPostingPreferencesService.getPostFormat();
const result = await publishingService.postWorkout(workout, { format });
```
Verify `postWorkout` produces the equivalent share for both formats (it routes to the 1301 publish or the kind-1 card path internally). If `postWorkoutToSocial` has side effects these callers depend on (e.g. specific UI return shape), adapt the call but keep the format honored.

- [ ] **Step 3: Typecheck**: `npm run typecheck` → PASS.

- [ ] **Step 4: Simulator check** — with default settings, sharing a workout publishes a 1301 (confirm via `scripts/diagnostics/verify-nostr-events.ts` or relay inspection); switching the Settings toggle to "Card post" publishes kind 1.

- [ ] **Step 5: Commit**
```bash
git add src/services/nostr/workoutPublishingService.ts src/screens/activity/ActivityTrackerScreen.tsx src/components/profile/shared/SocialShareModal.tsx
git commit -m "Fix: honor 1301 post-format default across all share entry points"
```

---

## Self-Review

- **Spec coverage:** feed reads workout_submissions ∪ network_workouts (Tasks 2,5 ✓); cards from structured fields (Tasks 3,4 ✓); delete matching machinery (Task 5 ✓); steps as first-class + junk filter (Tasks 1,2,3 ✓); non-cardio tolerance (Task 3 ✓); default 1301 (Task 7 ✓); interactions kept, event-id-keyed, full re-key deferred to Phase 2 (Task 4 ✓ + noted). Profile resolution for network rows (Task 6 ✓).
- **Deferred to Phase 2 (separate plan):** full re-key of `social_feed_zaps`/`social_feed_comments` to `event_id`; likes/comments write path for network authors; retiring the `social_feed` dual-write.
- **Placeholder scan:** the one TODO marker is an intentional Phase-2 boundary in Task 4, not a gap.
- **Type consistency:** `FeedWorkout` (camelCase) used in service/UI; `WorkoutCardData` (snake) used only inside the display fn via the Task-4 adapter; `useDurationHero` defined in Task 3 and consumed in Task 4. `occurredAt` sourced from `created_at` (runstr) / `event_created_at` (network) consistently.
- **Open dependency:** `network_workouts` empty at plan time — Phase 1 verified against `workout_submissions`; cross-network cards activate when the zapper populates rows.
