/**
 * Verifies WorkoutFeedService.isFeedWorthy: passive step syncs are excluded
 * from the feed (the "auto-post off but steps still posting" fix) while real
 * workouts, strength rows, and distance activities still qualify.
 * Run: npx tsx --require ./scripts/mocks/react-native-stubs.js scripts/verify/verify-feed-worthy.ts
 */
import { WorkoutFeedService } from '../../src/services/social/WorkoutFeedService';
import type { FeedWorkout } from '../../src/types/feedWorkout';

const svc = WorkoutFeedService.getInstance();
let failures = 0;
const check = (name: string, cond: boolean) => {
  console.log(`${cond ? '✅' : '❌'} ${name}`);
  if (!cond) failures++;
};

const base: FeedWorkout = {
  eventId: 'x', npub: 'n', source: 'runstr', activityType: 'walking',
  distanceMeters: null, durationSeconds: null, calories: null, stepCount: null,
  title: null, occurredAt: '2026-06-27T00:00:00Z', authorName: null, authorAvatar: null,
};

// Passive daily-step sync: steps + estimated distance, duration 0. EXCLUDED.
check('passive steps excluded',
  !svc.isFeedWorthy({ ...base, activityType: 'walking', stepCount: 8432, distanceMeters: 260, durationSeconds: 0 }));

// Real GPS walk: has duration. INCLUDED.
check('real walk included',
  svc.isFeedWorthy({ ...base, activityType: 'walking', stepCount: 4100, distanceMeters: 3200, durationSeconds: 2400 }));

// Strength row with duration + incidental steps (Amethyst). INCLUDED.
check('strength w/ duration+steps included',
  svc.isFeedWorthy({ ...base, activityType: 'weight_training', stepCount: 237, durationSeconds: 4444, distanceMeters: null }));

// Pure strength row: sets only, no duration/distance/steps. INCLUDED.
check('strength sets-only included',
  svc.isFeedWorthy({ ...base, activityType: 'strength', sets: 29, reps: 221, weightKg: 60, durationSeconds: null, distanceMeters: null, stepCount: null }));

// Strength logged with steps but no duration (defensive): still INCLUDED.
check('strength w/ steps but no duration included',
  svc.isFeedWorthy({ ...base, activityType: 'strength', sets: 5, stepCount: 50, durationSeconds: null }));

// Empty row: nothing renderable. EXCLUDED.
check('empty row excluded',
  !svc.isFeedWorthy({ ...base }));

// Run. INCLUDED.
check('run included',
  svc.isFeedWorthy({ ...base, activityType: 'running', distanceMeters: 5000, durationSeconds: 1500 }));

console.log(failures === 0 ? '\n✅ All feed-worthy rules correct' : `\n❌ ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
