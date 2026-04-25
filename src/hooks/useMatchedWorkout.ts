/**
 * useMatchedWorkout — given a social feed post, try to find the matching
 * workout_submissions row in Supabase so we can render a native card
 * instead of the full-bleed PNG.
 *
 * Matching: same npub, created_at within ±5 minutes of the post.
 *
 * Works for ALL posts (retroactive + new) because workouts are always in
 * Supabase — they're never queried from Nostr.
 *
 * Returns:
 *   - WorkoutCardData | null | 'loading'
 *   - 'loading' only for posts that look like workout posts (have fitness
 *     hashtags). Non-workout posts resolve to null immediately.
 */

import { useEffect, useState } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../utils/supabase';
import type { SocialFeedPost } from '../types/social';
import type { WorkoutCardData } from '../components/social/WorkoutPostCard';

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

// ±60 minutes around the post timestamp. Users often share a workout a
// while after finishing it (review the summary, tweak the caption, share).
// At ±5min we caught 30% of recent posts; at ±60min we catch ~90%.
const TIME_WINDOW_SECONDS = 3600;

// In-memory cache shared across mounts so scrolling a post in and out of
// the viewport doesn't re-query Supabase every time.
const cache = new Map<string, WorkoutCardData | null>();

function isLikelyWorkoutPost(post: SocialFeedPost): boolean {
  if (!post.hashtags || post.hashtags.length === 0) return false;
  return post.hashtags.some((h) => WORKOUT_HASHTAGS.has(h.toLowerCase()));
}

export type MatchedWorkoutResult = WorkoutCardData | null | 'loading';

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

    (async () => {
      try {
        const supabase = getSupabaseClient();
        const postTime = new Date(post.created_at).getTime();
        if (Number.isNaN(postTime)) {
          cache.set(post.id, null);
          if (!cancelled) setState(null);
          return;
        }

        const fromIso = new Date(postTime - TIME_WINDOW_SECONDS * 1000).toISOString();
        const toIso = new Date(postTime + TIME_WINDOW_SECONDS * 1000).toISOString();

        const { data, error } = await supabase
          .from('workout_submissions')
          .select('activity_type, distance_meters, duration_seconds, calories, step_count')
          .eq('npub', post.npub)
          .gte('created_at', fromIso)
          .lte('created_at', toIso)
          .order('created_at', { ascending: false })
          .limit(1);

        if (cancelled) return;

        if (error) {
          cache.set(post.id, null);
          setState(null);
          return;
        }

        const workout = data && data.length > 0 ? (data[0] as WorkoutCardData) : null;
        cache.set(post.id, workout);
        setState(workout);
      } catch {
        if (!cancelled) {
          cache.set(post.id, null);
          setState(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [post.id, post.npub, post.created_at, state]);

  return state;
}
