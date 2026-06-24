import { supabase, isSupabaseConfigured } from '../../utils/supabase';
import {
  type FeedWorkout, normalizeSubmissionRow, normalizeNetworkRow,
} from '../../types/feedWorkout';

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
      if (!beforeISO) this.cached = page;
      return page;
    } catch (e) {
      console.error('[WorkoutFeed] fetchFeed error:', e);
      return [];
    }
  }

  getCached(): FeedWorkout[] | null { return this.cached; }
  clearCache(): void { this.cached = null; }
}
