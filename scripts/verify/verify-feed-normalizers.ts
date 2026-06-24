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
