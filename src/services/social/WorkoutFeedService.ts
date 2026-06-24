import { supabase, isSupabaseConfigured } from '../../utils/supabase';
import {
  type FeedWorkout, normalizeSubmissionRow, normalizeNetworkRow,
} from '../../types/feedWorkout';
import { nostrProfileService } from '../nostr/NostrProfileService';

const SUB_COLS = 'event_id, npub, activity_type, distance_meters, duration_seconds, calories, step_count, profile_name, profile_picture, created_at';
const NET_COLS = 'event_id, npub, pubkey, activity_type, distance_meters, duration_seconds, calories, steps, title, event_created_at, ingested_at';

export class WorkoutFeedService {
  private static instance: WorkoutFeedService;
  private cached: FeedWorkout[] | null = null;

  static getInstance(): WorkoutFeedService {
    if (!WorkoutFeedService.instance) WorkoutFeedService.instance = new WorkoutFeedService();
    return WorkoutFeedService.instance;
  }

  /** A row earns a feed card only if it has at least one renderable metric. */
  isFeedWorthy(w: FeedWorkout): boolean {
    return (w.distanceMeters ?? 0) > 0 || (w.durationSeconds ?? 0) > 0 || (w.stepCount ?? 0) > 0;
  }

  /**
   * Fetch a page of feed workouts. Each table is queried for `limit` rows then merged and sliced,
   * so a page may under-fill when one table dominates. Load-more re-queries by the last item's
   * `occurredAt`. No `hasMore` signal — treat short pages as "keep paginating", not "end of feed".
   */
  async fetchFeed(beforeISO?: string, limit = 20): Promise<FeedWorkout[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      let subQ = supabase!.from('workout_submissions').select(SUB_COLS)
        .order('created_at', { ascending: false }).limit(limit);
      let netQ = supabase!.from('network_workouts').select(NET_COLS)
        .order('event_created_at', { ascending: false }).limit(limit);
      if (beforeISO) { subQ = subQ.lt('created_at', beforeISO); netQ = netQ.lt('event_created_at', beforeISO); }

      const [subRes, netRes] = await Promise.all([subQ, netQ]);
      if (subRes.error) console.error('[WorkoutFeed] submissions:', subRes.error.message);
      if (netRes.error) console.error('[WorkoutFeed] network:', netRes.error.message);

      const merged: FeedWorkout[] = [
        ...(subRes.data ?? []).map(normalizeSubmissionRow),
        ...(netRes.data ?? []).map(normalizeNetworkRow),
      ].filter((w) => this.isFeedWorthy(w));

      const seen = new Set<string>();
      const deduped = merged.filter((w) => (seen.has(w.eventId) ? false : (seen.add(w.eventId), true)));
      deduped.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : 0));

      const page = deduped.slice(0, limit);

      // Enrich rows that are missing an authorName (network rows + any RUNSTR rows without profile_name).
      // De-dupe by npub so each unique author is fetched at most once per page.
      const needsEnrichment = page.filter((w) => !w.authorName);
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
