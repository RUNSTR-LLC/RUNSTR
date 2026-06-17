/**
 * useMatchedWorkout — given a social feed post, try to find the matching
 * workout_submissions row in Supabase so we can render a native card
 * instead of the full-bleed PNG.
 *
 * Matching: same npub, created_at within ±60 minutes of the post.
 *
 * Works for ALL posts (retroactive + new) because workouts are always in
 * Supabase — they're never queried from Nostr.
 *
 * BATCHING: posts that mount together (a FlatList window renders ~6-10 rows at
 * once) are coalesced into a SINGLE Supabase query instead of one-per-post.
 * Previously each post fired its own query — a feed of 20 workout posts meant
 * ~20 round-trips on first render. Now they share one `.in('npub', …)` query
 * over the combined time window, matched client-side. Results feed the same
 * in-memory cache so scrolling a post in and out doesn't re-query.
 *
 * Returns:
 *   - WorkoutCardData | null | 'loading'
 *   - 'loading' only for posts that look like workout posts (have fitness
 *     hashtags). Non-workout posts resolve to null immediately.
 */

import { useEffect, useState } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../utils/supabase';
import type { SocialFeedPost } from '../types/social';
import type { WorkoutCardData } from '../components/social/workoutCardDisplay';
import { matchBatchRows, TIME_WINDOW_SECONDS } from './matchWorkoutPosts';

const WORKOUT_HASHTAGS = new Set([
  'runstr',
  'running',
  'walking',
  'cycling',
  'hiking',
  'fitness',
  'workout',
  'strength',
  'pushups',
  'pullups',
  'situps',
  'squats',
  'bench',
  'gym',
]);

// How long to wait for sibling posts to mount before firing the batch query.
// One FlatList render commits its row window within a frame or two, so a short
// debounce collects them all into one query.
const BATCH_DEBOUNCE_MS = 50;

// Safety cap on the batched query. A feed page is recent posts, so the rows
// returned (active authors × their workouts in the window) is normally small.
const BATCH_ROW_LIMIT = 500;

// In-memory cache shared across mounts so scrolling a post in and out of
// the viewport doesn't re-query Supabase every time.
const cache = new Map<string, WorkoutCardData | null>();

function isLikelyWorkoutPost(post: SocialFeedPost): boolean {
  if (!post.hashtags || post.hashtags.length === 0) return false;
  return post.hashtags.some((h) => WORKOUT_HASHTAGS.has(h.toLowerCase()));
}

export type MatchedWorkoutResult = WorkoutCardData | null | 'loading';

// --- Batched loader -------------------------------------------------------

type Resolver = (result: WorkoutCardData | null) => void;
interface PendingEntry {
  post: SocialFeedPost;
  resolvers: Resolver[];
}

let pending = new Map<string, PendingEntry>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function enqueueMatch(post: SocialFeedPost): Promise<WorkoutCardData | null> {
  if (cache.has(post.id)) {
    return Promise.resolve(cache.get(post.id) ?? null);
  }
  return new Promise<WorkoutCardData | null>((resolve) => {
    const existing = pending.get(post.id);
    if (existing) {
      existing.resolvers.push(resolve);
    } else {
      pending.set(post.id, { post, resolvers: [resolve] });
    }
    if (!flushTimer) {
      flushTimer = setTimeout(flushBatch, BATCH_DEBOUNCE_MS);
    }
  });
}

function settle(entries: PendingEntry[], result: WorkoutCardData | null) {
  for (const entry of entries) {
    cache.set(entry.post.id, result);
    entry.resolvers.forEach((r) => r(result));
  }
}

async function flushBatch(): Promise<void> {
  flushTimer = null;
  const batch = pending;
  pending = new Map();
  const entries = [...batch.values()];
  if (entries.length === 0) return;

  try {
    if (!isSupabaseConfigured()) {
      settle(entries, null);
      return;
    }

    // Combined time window across every post in the batch.
    let minTime = Infinity;
    let maxTime = -Infinity;
    for (const { post } of entries) {
      const t = new Date(post.created_at).getTime();
      if (!Number.isNaN(t)) {
        if (t < minTime) minTime = t;
        if (t > maxTime) maxTime = t;
      }
    }
    if (!Number.isFinite(minTime)) {
      // Every post had an unparseable timestamp.
      settle(entries, null);
      return;
    }

    const npubs = [...new Set(entries.map((e) => e.post.npub))];
    const fromIso = new Date(minTime - TIME_WINDOW_SECONDS * 1000).toISOString();
    const toIso = new Date(maxTime + TIME_WINDOW_SECONDS * 1000).toISOString();

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('workout_submissions')
      .select(
        'npub, activity_type, distance_meters, duration_seconds, calories, step_count, created_at'
      )
      .in('npub', npubs)
      .gte('created_at', fromIso)
      .lte('created_at', toIso)
      .limit(BATCH_ROW_LIMIT);

    if (error) {
      settle(entries, null);
      return;
    }

    const matches = matchBatchRows(
      entries.map((e) => e.post),
      data ?? []
    );
    for (const entry of entries) {
      const workout = matches.get(entry.post.id) ?? null;
      cache.set(entry.post.id, workout);
      entry.resolvers.forEach((r) => r(workout));
    }
  } catch {
    settle(entries, null);
  }
}

export function useMatchedWorkout(post: SocialFeedPost): MatchedWorkoutResult {
  const [state, setState] = useState<MatchedWorkoutResult>(() => {
    if (cache.has(post.id)) return cache.get(post.id) ?? null;
    if (!isLikelyWorkoutPost(post)) return null;
    if (!isSupabaseConfigured()) return null;
    return 'loading';
  });

  useEffect(() => {
    if (state !== 'loading') return;
    let cancelled = false;

    enqueueMatch(post).then((result) => {
      if (!cancelled) setState(result);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id, post.npub, post.created_at]);

  return state;
}
