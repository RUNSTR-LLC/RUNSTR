/**
 * Backup chunking — splits workout history across several kind 30078 events.
 *
 * A single NIP-44 payload caps out at ~49KB compressed, which heavy users
 * outgrow. The main backup event (d = BACKUP_D_TAG) keeps habits, journal and
 * preferences plus a ['chunks', N] tag; workouts live in chunk events
 * d = `${BACKUP_D_TAG}:w0` … `:w{N-1}`.
 *
 * Chunks are fixed-size runs of workouts sorted oldest-first, so appending a
 * new workout normally changes only the last chunk — unchanged chunks are
 * skipped on republish (fewer Amber prompts, less relay traffic).
 *
 * Pure helpers only (plus one relay fetch); no React Native imports so the
 * chunking can be verified under tsx.
 */
import pako from 'pako';
import type { NDKEvent, NDKFilter } from '@nostr-dev-kit/ndk';
import type { LocalWorkout } from '../fitness/LocalWorkoutStorageService';

export const BACKUP_EVENT_KIND = 30078;
export const BACKUP_D_TAG = 'runstr-workout-backup';
/** v2 = workouts split into chunk events. v1 = everything in the main event. */
export const CHUNKED_BACKUP_VERSION = 2;
/** NIP-44 caps plaintext at 65535 bytes; base64 adds 4/3, so ~49KB compressed. */
export const MAX_COMPRESSED_BYTES = 49000;
const WORKOUTS_PER_CHUNK = 100;

export interface WorkoutChunkPayload {
  version: number;
  chunk: number;
  workouts: LocalWorkout[];
}

export const chunkDTag = (index: number): string => `${BACKUP_D_TAG}:w${index}`;

export const compressedSize = (value: unknown): number =>
  pako.gzip(JSON.stringify(value)).length;

/** Fixed-size chunks, oldest first; any chunk still too large is halved until it fits. */
export function chunkWorkouts(workouts: LocalWorkout[]): LocalWorkout[][] {
  const sorted = [...workouts].sort(
    (a, b) => a.startTime.localeCompare(b.startTime) || a.id.localeCompare(b.id)
  );
  const chunks: LocalWorkout[][] = [];
  const fit = (list: LocalWorkout[]) => {
    const tooBig = compressedSize({ version: CHUNKED_BACKUP_VERSION, chunk: 0, workouts: list }) > MAX_COMPRESSED_BYTES;
    if (list.length > 1 && tooBig) {
      const mid = Math.ceil(list.length / 2);
      fit(list.slice(0, mid));
      fit(list.slice(mid));
    } else {
      chunks.push(list);
    }
  };
  for (let i = 0; i < sorted.length; i += WORKOUTS_PER_CHUNK) {
    fit(sorted.slice(i, i + WORKOUTS_PER_CHUNK));
  }
  return chunks;
}

/** Cheap content fingerprint (FNV-1a) used to skip republishing unchanged chunks. */
export function hashString(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${input.length}:${(hash >>> 0).toString(16)}`;
}

export const getChunkCount = (event: NDKEvent): number =>
  parseInt(event.tags.find((t) => t[0] === 'chunks')?.[1] || '0', 10);

/**
 * Fetch and decrypt every chunk listed by the main backup event.
 * Throws if any chunk is missing or undecryptable — a partial restore would
 * look complete, so the caller should surface the error instead.
 */
export async function fetchChunkWorkouts(
  ndk: { fetchEvents: (filter: NDKFilter) => Promise<Set<NDKEvent>> },
  pubkey: string,
  count: number,
  decrypt: (event: NDKEvent) => Promise<WorkoutChunkPayload>
): Promise<LocalWorkout[]> {
  if (count <= 0) return [];
  const dTags = Array.from({ length: count }, (_, i) => chunkDTag(i));
  const events = await ndk.fetchEvents({
    kinds: [BACKUP_EVENT_KIND],
    authors: [pubkey],
    '#d': dTags,
  });

  // Newest event per d tag (relays may return replaced versions)
  const latest = new Map<string, NDKEvent>();
  for (const event of events) {
    const d = event.tags.find((t) => t[0] === 'd')?.[1];
    if (!d) continue;
    const current = latest.get(d);
    if (!current || (event.created_at || 0) > (current.created_at || 0)) latest.set(d, event);
  }

  const workouts: LocalWorkout[] = [];
  for (const d of dTags) {
    const event = latest.get(d);
    if (!event) throw new Error(`Backup chunk ${d} not found on relays`);
    const payload = await decrypt(event);
    workouts.push(...payload.workouts);
  }
  return workouts;
}
