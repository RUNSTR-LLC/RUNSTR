/**
 * Pure matching logic for pairing social feed posts with Supabase workout
 * rows. Kept free of React/Supabase imports so it can be unit-tested directly.
 */

import type { WorkoutCardData } from '../components/social/workoutCardDisplay';

// ±60 minutes around the post timestamp. Users often share a workout a
// while after finishing it (review the summary, tweak the caption, share).
// At ±5min we caught 30% of recent posts; at ±60min we catch ~90%.
export const TIME_WINDOW_SECONDS = 3600;

/**
 * For each (postId, npub, postTime) pick the closest workout row from the same
 * author within ±TIME_WINDOW_SECONDS. Each row must carry `npub` and
 * `created_at`; those are stripped from the returned card data.
 */
export function matchBatchRows(
  posts: Array<{ id: string; npub: string; created_at: string }>,
  rows: Array<Record<string, any>>
): Map<string, WorkoutCardData | null> {
  const byNpub = new Map<string, any[]>();
  for (const row of rows) {
    const arr = byNpub.get(row.npub);
    if (arr) arr.push(row);
    else byNpub.set(row.npub, [row]);
  }

  const windowMs = TIME_WINDOW_SECONDS * 1000;
  const result = new Map<string, WorkoutCardData | null>();
  for (const post of posts) {
    const postTime = new Date(post.created_at).getTime();
    const candidates = byNpub.get(post.npub) ?? [];

    // Closest workout within ±window wins. A user may have several workouts
    // near the post time; closest-wins handles "shared right after" and
    // "shared a bit later" without newest-wins mismatches.
    let best: any = null;
    let bestDelta = Infinity;
    for (const row of candidates) {
      const delta = Math.abs(new Date(row.created_at).getTime() - postTime);
      if (delta <= windowMs && delta < bestDelta) {
        bestDelta = delta;
        best = row;
      }
    }

    if (best) {
      const { created_at: _ca, npub: _np, ...cardData } = best;
      result.set(post.id, cardData as WorkoutCardData);
    } else {
      result.set(post.id, null);
    }
  }
  return result;
}
