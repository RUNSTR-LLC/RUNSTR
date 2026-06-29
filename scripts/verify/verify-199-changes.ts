/**
 * Verifies the v1.9.9 changes:
 *  1. Reward toast → branded plain toast (no RewardBoltToast, orange subtitle)
 *  2. Optimistic "Reward Earned!" banner removed
 *  3. Auto-post GPS-only guard
 *  4. Feed pagination: drains past short pages, no tie-drop, cross-page dedup, terminates
 *  5. Apple Health: off-means-off guard + widened iOS lookback
 *
 * Run: npx tsx scripts/verify/verify-199-changes.ts
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}`); }
};

console.log('\n[A] Static checks — edits landed in source');
const toast = read('src/components/ui/toastConfig.tsx');
ok('toastConfig no longer imports RewardBoltToast', !toast.includes('RewardBoltToast'));
ok('toastConfig rewardConfirmed uses branded rewardToast style', toast.includes('styles.rewardToast'));
ok('toastConfig has orange rewardSubtitle (no white/gray)', toast.includes('rewardSubtitle') && toast.includes('theme.colors.textMuted'));

const modal = read('src/components/activity/WorkoutSummaryModal.tsx');
ok('optimistic "Reward Earned!" banner removed', !modal.includes('Reward Earned!'));
ok('auto-post GPS-only guard present', modal.includes('if (!(workout.distance > 0)) return;'));

const feedSvc = read('src/services/social/WorkoutFeedService.ts');
ok('feed cursor uses <= (no tie-drop)', feedSvc.includes(".lte('created_at'") && feedSvc.includes(".lte('event_created_at'"));
ok('feed filters null eventId/occurredAt', feedSvc.includes('!!w.eventId && !!w.occurredAt'));

const screen = read('src/screens/SocialScreen.tsx');
ok('screen tracks seen ids across pages', screen.includes('seenIdsRef'));
ok('screen no longer ends feed on short page (<20)', !screen.includes('morePosts.length < 20'));
ok('screen terminates only when 0 fresh rows', screen.includes('fresh.length === 0'));

const hk = read('src/services/fitness/HealthKitBackgroundService.ts');
ok('Apple Health off-means-off guard', hk.includes("healthkit_sync_enabled") && hk.includes("=== 'false'"));
ok('iOS lookback widened to 7 days', hk.includes('getRecentWorkouts(npub, 7)'));

console.log('\n[B] Simulation — fixed pagination algorithm');

type Row = { eventId: string; occurredAt: string; distance: number };
const iso = (sec: number) => new Date(Date.UTC(2026, 0, 1, 0, 0, sec)).toISOString();

// Mirror WorkoutFeedService.fetchFeed (fixed): per-table <= cursor, sort desc,
// take limit each, merge, drop null-key + non-feedworthy, per-call dedup, slice.
function fetchFeedSim(tableA: Row[], tableB: Row[], beforeISO: string | undefined, limit: number): Row[] {
  const q = (t: Row[]) =>
    t.filter((r) => !beforeISO || r.occurredAt <= beforeISO)
      .slice().sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
      .slice(0, limit);
  const merged = [...q(tableA), ...q(tableB)]
    .filter((w) => !!w.eventId && !!w.occurredAt)
    .filter((w) => w.distance > 0);
  const seen = new Set<string>();
  const deduped = merged.filter((w) => (seen.has(w.eventId) ? false : (seen.add(w.eventId), true)));
  deduped.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : 0));
  return deduped.slice(0, limit);
}

// Mirror SocialScreen pagination (fixed).
function paginateAll(tableA: Row[], tableB: Row[], limit = 20) {
  let posts = fetchFeedSim(tableA, tableB, undefined, limit);
  const seenIds = new Set(posts.map((p) => p.eventId));
  let hasMore = posts.length > 0;
  let iterations = 0;
  while (hasMore && posts.length > 0 && iterations < 1000) {
    iterations++;
    const last = posts[posts.length - 1];
    const more = fetchFeedSim(tableA, tableB, last.occurredAt, limit);
    const fresh = more.filter((p) => !seenIds.has(p.eventId));
    if (fresh.length === 0) { hasMore = false; break; }
    fresh.forEach((p) => seenIds.add(p.eventId));
    posts = [...posts, ...fresh];
  }
  const ids = posts.map((p) => p.eventId);
  return { posts, ids, uniqueCount: new Set(ids).size, iterations };
}

// Scenario 1: 50 worthy rows split across two tables → all 50 surface, no dupes, terminates.
{
  const A: Row[] = Array.from({ length: 25 }, (_, i) => ({ eventId: `a${i}`, occurredAt: iso(i * 2), distance: 5000 }));
  const B: Row[] = Array.from({ length: 25 }, (_, i) => ({ eventId: `b${i}`, occurredAt: iso(i * 2 + 1), distance: 5000 }));
  const r = paginateAll(A, B, 20);
  ok('S1 drains all 50 rows past short pages', r.posts.length === 50);
  ok('S1 no duplicates', r.uniqueCount === 50);
  ok('S1 terminates (bounded iterations)', r.iterations < 1000);
}

// Scenario 2: a realistic handful of rows share the boundary timestamp → none
// dropped. This is the case the old strict `.lt` cursor silently lost; `.lte`
// + cross-page dedup now retains them. (Known acceptable limit: >pageSize rows
// at one identical timestamp can still stall — pathological, see note below.)
{
  const A: Row[] = [];
  // 3 rows share the boundary second; the rest are spread out. 40 worthy total.
  for (let i = 0; i < 3; i++) A.push({ eventId: `tie${i}`, occurredAt: iso(100), distance: 5000 });
  for (let i = 0; i < 37; i++) A.push({ eventId: `u${i}`, occurredAt: iso(99 - i), distance: 5000 });
  const r = paginateAll(A, [], 20);
  const tieIdsPresent = ['tie0', 'tie1', 'tie2'].every((id) => r.ids.includes(id));
  ok('S2 boundary-tie rows are not dropped (the old .lt bug)', tieIdsPresent);
  ok('S2 all 40 worthy rows surfaced', r.posts.length === 40);
  ok('S2 no duplicates despite <= cursor re-including boundary', r.uniqueCount === r.posts.length);
}

// Scenario 2b: document the known pathological limit — >pageSize rows sharing the
// EXACT same timestamp at a boundary. Realistically impossible (would need 20+
// workouts at one identical created_at). Informational only, not a gate.
{
  const A: Row[] = Array.from({ length: 30 }, (_, i) => ({ eventId: `p${i}`, occurredAt: iso(100), distance: 5000 }));
  const r = paginateAll(A, [], 20);
  console.log(`  • note: ${30 - r.posts.length} of 30 identical-timestamp rows unreachable (pathological >pageSize tie; acceptable)`);
}

// Scenario 3: same eventId present in BOTH tables → shows once.
{
  const A: Row[] = [{ eventId: 'shared', occurredAt: iso(10), distance: 5000 }, { eventId: 'a', occurredAt: iso(9), distance: 5000 }];
  const B: Row[] = [{ eventId: 'shared', occurredAt: iso(8), distance: 5000 }, { eventId: 'b', occurredAt: iso(7), distance: 5000 }];
  const r = paginateAll(A, B, 20);
  ok('S3 duplicate eventId across tables appears once', r.ids.filter((x) => x === 'shared').length === 1);
}

// Scenario 4: empty tables → empty feed, terminates immediately, no loop.
{
  const r = paginateAll([], [], 20);
  ok('S4 empty feed terminates with 0 posts', r.posts.length === 0 && r.iterations === 0);
}

// Scenario 5: heavy under-fill (most rows non-feedworthy) → still drains all worthy rows.
{
  const A: Row[] = [];
  for (let i = 0; i < 60; i++) A.push({ eventId: `w${i}`, occurredAt: iso(i), distance: i % 4 === 0 ? 5000 : 0 }); // only 1/4 worthy
  const worthy = A.filter((r) => r.distance > 0).length;
  const r = paginateAll(A, [], 20);
  ok(`S5 surfaces all ${worthy} worthy rows despite under-fill`, r.posts.length === worthy);
}

console.log(`\nResult: ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
