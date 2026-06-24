import 'dotenv/config';
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
