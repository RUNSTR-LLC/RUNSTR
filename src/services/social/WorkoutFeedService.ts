import { supabase, isSupabaseConfigured } from '../../utils/supabase';
import {
  type FeedWorkout, normalizeSubmissionRow, normalizeNetworkRow,
} from '../../types/feedWorkout';
import { nostrProfileService } from '../nostr/NostrProfileService';
import { WorkoutInteractionService } from './WorkoutInteractionService';

const SUB_COLS = 'event_id, npub, activity_type, distance_meters, duration_seconds, calories, step_count, profile_name, profile_picture, created_at';
const NET_COLS = 'event_id, npub, pubkey, activity_type, distance_meters, duration_seconds, calories, steps, exercise, sets, reps, weight_kg, avg_heart_rate, title, raw_event, event_created_at, ingested_at';

export class WorkoutFeedService {
  private static instance: WorkoutFeedService;
  private cached: FeedWorkout[] | null = null;

  static getInstance(): WorkoutFeedService {
    if (!WorkoutFeedService.instance) WorkoutFeedService.instance = new WorkoutFeedService();
    return WorkoutFeedService.instance;
  }

  /**
   * A row earns a feed card only if it has at least one renderable metric AND
   * is not a passive daily-step sync. Passive step rows (a step count with no
   * duration, carrying only an estimated distance) belong on the leaderboard,
   * not the feed — per the product rule that step syncs never post. Real
   * workouts (duration), strength rows (sets/reps/weight), and distance
   * activities all still qualify.
   */
  isFeedWorthy(w: FeedWorkout): boolean {
    const hasStrength = (w.sets ?? 0) > 0 || (w.reps ?? 0) > 0 || (w.weightKg ?? 0) > 0;
    const isPassiveStepSync =
      (w.stepCount ?? 0) > 0 && !((w.durationSeconds ?? 0) > 0) && !hasStrength;
    if (isPassiveStepSync) return false;
    return (w.distanceMeters ?? 0) > 0 || (w.durationSeconds ?? 0) > 0 || hasStrength;
  }

  /**
   * Fetch a page of feed workouts. Each table is queried for `limit` rows then merged and sliced,
   * so a page may under-fill when one table dominates. Load-more re-queries by the last item's
   * `occurredAt`. No `hasMore` signal — treat short pages as "keep paginating", not "end of feed".
   */
  async fetchFeed(beforeISO?: string, limit = 20, userNpub: string | null = null): Promise<FeedWorkout[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      let subQ = supabase!.from('workout_submissions').select(SUB_COLS)
        .order('created_at', { ascending: false }).limit(limit);
      let netQ = supabase!.from('network_workouts').select(NET_COLS)
        .order('event_created_at', { ascending: false }).limit(limit);
      // Use <= so rows sharing the exact boundary timestamp aren't skipped (a
      // strict < silently drops tie rows → gaps). The screen dedups by eventId
      // across pages, so the re-included boundary row is harmless.
      if (beforeISO) { subQ = subQ.lte('created_at', beforeISO); netQ = netQ.lte('event_created_at', beforeISO); }

      const [subRes, netRes] = await Promise.all([subQ, netQ]);
      if (subRes.error) console.error('[WorkoutFeed] submissions:', subRes.error.message);
      if (netRes.error) console.error('[WorkoutFeed] network:', netRes.error.message);

      const merged: FeedWorkout[] = [
        ...(subRes.data ?? []).map(normalizeSubmissionRow),
        ...(netRes.data ?? []).map(normalizeNetworkRow),
      ]
        // Drop rows missing the id/timestamp we key on: eventId is the FlatList
        // key + interaction key + dedup key; occurredAt is the pagination cursor.
        // A null in either would collapse keys or break "load more".
        .filter((w) => !!w.eventId && !!w.occurredAt)
        .filter((w) => this.isFeedWorthy(w));

      const seen = new Set<string>();
      const deduped = merged.filter((w) => (seen.has(w.eventId) ? false : (seen.add(w.eventId), true)));
      deduped.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : 0));

      const page = deduped.slice(0, limit);

      // Enrich rows that are missing an authorName (network rows + any RUNSTR rows without profile_name).
      // De-dupe by npub so each unique author is fetched at most once per page.
      const needsEnrichment = page.filter((w) => !w.authorName && w.npub);
      if (needsEnrichment.length > 0) {
        const uniqueNpubs = [...new Set(needsEnrichment.map((w) => w.npub))];
        // Fetch concurrently; failures are non-fatal — rows keep their existing (null) values.
        const profileResults = await Promise.allSettled(
          uniqueNpubs.map(async (npub) => {
            const profile = await nostrProfileService.getProfile(npub);
            return { npub, profile };
          })
        );
        const profileMap = new Map<string, { name: string | null; avatar: string | null }>();
        for (const result of profileResults) {
          if (result.status === 'fulfilled' && result.value.profile) {
            const { npub, profile } = result.value;
            profileMap.set(npub, {
              name: profile.display_name || profile.name || null,
              avatar: profile.picture || null,
            });
          }
        }
        for (const row of needsEnrichment) {
          const resolved = profileMap.get(row.npub);
          if (resolved) {
            row.authorName = resolved.name;
            row.authorAvatar = resolved.avatar;
          }
        }
      }

      // Hydrate per-page interaction counts (non-fatal — tables may not exist yet).
      try {
        const countsMap = await WorkoutInteractionService.getInstance().getCountsForEvents(
          page.map((w) => w.eventId),
          userNpub,
        );
        for (const row of page) {
          const counts = countsMap.get(row.eventId);
          row.likeCount = counts?.likeCount ?? 0;
          row.commentCount = counts?.commentCount ?? 0;
          row.zapTotal = counts?.zapTotal ?? 0;
          row.likedByMe = counts?.likedByMe ?? false;
        }
      } catch (e) {
        console.error('[WorkoutFeed] interaction hydration error:', e);
        // Leave defaults (fields absent / undefined) — non-fatal.
      }

      if (!beforeISO) this.cached = page;
      return page;
    } catch (e) {
      console.error('[WorkoutFeed] fetchFeed error:', e);
      return [];
    }
  }

  /** Returns the first-page cache only (set when !beforeISO); later pages are not cached. */
  getCached(): FeedWorkout[] | null { return this.cached; }
  clearCache(): void { this.cached = null; }
}
