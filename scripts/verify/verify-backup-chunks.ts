/**
 * Verify backup chunking: every chunk fits NIP-44, nothing is lost or
 * duplicated, and appending a workout only changes the last chunk.
 * Run: npx tsx scripts/verify/verify-backup-chunks.ts
 */
import pako from 'pako';
import {
  chunkWorkouts,
  hashString,
  CHUNKED_BACKUP_VERSION,
  MAX_COMPRESSED_BYTES,
} from '../../src/services/backup/backupChunks';
import type { LocalWorkout } from '../../src/services/fitness/LocalWorkoutStorageService';

// Synthetic history shaped like real GPS runs (with per-km splits) plus noisy
// HealthKit entries — random notes defeat gzip so chunks hit the size cap.
const makeWorkout = (i: number): LocalWorkout => ({
  id: `w${i}-${Math.random().toString(36).slice(2)}`,
  type: i % 3 === 0 ? 'walking' : 'running',
  startTime: new Date(Date.UTC(2022, 0, 1) + i * 36e5 * 7).toISOString(),
  endTime: new Date(Date.UTC(2022, 0, 1) + i * 36e5 * 7 + 18e5).toISOString(),
  duration: 1500 + (i % 900),
  distance: 3000 + (i % 7000),
  source: i % 3 === 0 ? 'healthkit' : 'gps_tracker',
  createdAt: new Date().toISOString(),
  syncedToNostr: true,
  nostrEventId: Math.random().toString(16).slice(2).padEnd(64, 'a'),
  notes: Math.random().toString(36).repeat(4),
  splits: Array.from({ length: 8 }, (_, k) => ({ km: k + 1, time: 300 + k, pace: 300 + Math.random() * 30 })) as never,
});

let failed = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failed++;
};

const history = Array.from({ length: 3000 }, (_, i) => makeWorkout(i));
const chunks = chunkWorkouts(history);
const payloadOf = (list: LocalWorkout[], i: number) => ({ version: CHUNKED_BACKUP_VERSION, chunk: i, workouts: list });

const sizes = chunks.map((c, i) => pako.gzip(JSON.stringify(payloadOf(c, i))).length);
const maxBase64 = Math.max(...sizes.map((n) => 4 * Math.ceil(n / 3)));
check(sizes.every((n) => n <= MAX_COMPRESSED_BYTES), `all ${chunks.length} chunks <= ${MAX_COMPRESSED_BYTES} bytes compressed (max ${Math.max(...sizes)})`);
check(maxBase64 <= 65535, `largest NIP-44 plaintext ${maxBase64} <= 65535`);

const ids = chunks.flat().map((w) => w.id);
check(ids.length === history.length && new Set(ids).size === history.length, `${history.length} workouts in, ${ids.length} out, no duplicates`);

const before = chunks.map((c, i) => hashString(JSON.stringify(payloadOf(c, i))));
const after = chunkWorkouts([...history, makeWorkout(3000)]).map((c, i) => hashString(JSON.stringify(payloadOf(c, i))));
const changed = after.filter((h, i) => h !== before[i]).length;
check(changed === 1, `appending one workout changes ${changed} chunk(s) (expected 1)`);

const shuffled = [...history].sort(() => Math.random() - 0.5);
const reshuffled = chunkWorkouts(shuffled).map((c, i) => hashString(JSON.stringify(payloadOf(c, i))));
check(reshuffled.join() === before.join(), 'chunking is independent of storage order');

check(chunkWorkouts([]).length === 0, 'empty history produces zero chunks');

// Bloated workouts (~1.5KB of incompressible notes each) force the halving path
const heavy = Array.from({ length: 250 }, (_, i) => ({
  ...makeWorkout(i),
  notes: Array.from({ length: 80 }, () => Math.random().toString(36).slice(2)).join(''),
}));
const heavyChunks = chunkWorkouts(heavy);
const heavySizes = heavyChunks.map((c, i) => pako.gzip(JSON.stringify(payloadOf(c, i))).length);
check(
  heavyChunks.length > 3 && heavySizes.every((n) => n <= MAX_COMPRESSED_BYTES) && heavyChunks.flat().length === heavy.length,
  `oversized chunks are halved: 250 heavy workouts -> ${heavyChunks.length} chunks, max ${Math.max(...heavySizes)} bytes`
);

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
