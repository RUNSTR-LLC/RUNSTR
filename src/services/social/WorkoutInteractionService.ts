import { supabase, isSupabaseConfigured } from '../../utils/supabase';

export interface InteractionCounts {
  likeCount: number;
  commentCount: number;
  zapTotal: number;
  likedByMe: boolean;
}

export interface WorkoutComment {
  id: string;
  event_id: string;
  npub: string;
  content: string;
  author_name: string | null;
  author_avatar: string | null;
  created_at: string;
}

export interface WorkoutZap {
  id: string;
  event_id: string;
  sender_npub: string;
  amount: number;
  created_at: string;
}

export class WorkoutInteractionService {
  private static instance: WorkoutInteractionService;

  static getInstance(): WorkoutInteractionService {
    if (!WorkoutInteractionService.instance) {
      WorkoutInteractionService.instance = new WorkoutInteractionService();
    }
    return WorkoutInteractionService.instance;
  }

  /**
   * Fetch aggregated interaction counts for a batch of event IDs.
   * Returns a Map keyed by event_id. Events not in DB get zero counts.
   */
  async getCountsForEvents(
    eventIds: string[],
    userNpub: string | null,
  ): Promise<Map<string, InteractionCounts>> {
    const result = new Map<string, InteractionCounts>();
    if (eventIds.length === 0) return result;

    // Pre-populate with zero counts so every requested ID has an entry.
    for (const id of eventIds) {
      result.set(id, { likeCount: 0, commentCount: 0, zapTotal: 0, likedByMe: false });
    }

    if (!isSupabaseConfigured()) return result;

    try {
      const [likesRes, commentsRes, zapsRes] = await Promise.all([
        supabase!.from('workout_likes').select('event_id, npub').in('event_id', eventIds),
        supabase!.from('workout_comments').select('event_id').in('event_id', eventIds),
        supabase!.from('workout_zaps').select('event_id, amount').in('event_id', eventIds),
      ]);

      if (likesRes.error) console.error('[WorkoutInteraction] likes fetch:', likesRes.error.message);
      if (commentsRes.error) console.error('[WorkoutInteraction] comments fetch:', commentsRes.error.message);
      if (zapsRes.error) console.error('[WorkoutInteraction] zaps fetch:', zapsRes.error.message);

      // Aggregate likes
      for (const row of likesRes.data ?? []) {
        const entry = result.get(row.event_id);
        if (entry) {
          entry.likeCount += 1;
          if (userNpub && row.npub === userNpub) entry.likedByMe = true;
        }
      }

      // Aggregate comments
      for (const row of commentsRes.data ?? []) {
        const entry = result.get(row.event_id);
        if (entry) entry.commentCount += 1;
      }

      // Aggregate zaps
      for (const row of zapsRes.data ?? []) {
        const entry = result.get(row.event_id);
        if (entry) entry.zapTotal += row.amount ?? 0;
      }
    } catch (e) {
      console.error('[WorkoutInteraction] getCountsForEvents error:', e);
    }

    return result;
  }

  /**
   * Toggle a like for the given (eventId, npub) pair.
   * Returns true if the like was added, false if it was removed.
   */
  async toggleLike(eventId: string, npub: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const { data: existing } = await supabase!
        .from('workout_likes')
        .select('id')
        .eq('event_id', eventId)
        .eq('npub', npub)
        .maybeSingle();

      if (existing) {
        await supabase!.from('workout_likes').delete().eq('id', existing.id);
        return false;
      } else {
        await supabase!.from('workout_likes').insert({ event_id: eventId, npub });
        return true;
      }
    } catch (e) {
      console.error('[WorkoutInteraction] toggleLike error:', e);
      return false;
    }
  }

  /** Returns all npubs that liked a given event. */
  async getLikers(eventId: string): Promise<string[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data, error } = await supabase!
        .from('workout_likes')
        .select('npub')
        .eq('event_id', eventId);
      if (error) console.error('[WorkoutInteraction] getLikers:', error.message);
      return (data ?? []).map((r) => r.npub);
    } catch (e) {
      console.error('[WorkoutInteraction] getLikers error:', e);
      return [];
    }
  }

  /** Add a comment to a workout. Returns the created row or null on failure. */
  async addComment(
    eventId: string,
    npub: string,
    content: string,
    authorName?: string,
    authorAvatar?: string | null,
  ): Promise<WorkoutComment | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase!
        .from('workout_comments')
        .insert({
          event_id: eventId,
          npub,
          content,
          author_name: authorName ?? null,
          author_avatar: authorAvatar ?? null,
        })
        .select()
        .single();
      if (error) { console.error('[WorkoutInteraction] addComment:', error.message); return null; }
      return data as WorkoutComment;
    } catch (e) {
      console.error('[WorkoutInteraction] addComment error:', e);
      return null;
    }
  }

  /** Fetch comments for an event, newest first, optional limit (default 50). */
  async getComments(eventId: string, limit = 50): Promise<WorkoutComment[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data, error } = await supabase!
        .from('workout_comments')
        .select('id, event_id, npub, content, author_name, author_avatar, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) console.error('[WorkoutInteraction] getComments:', error.message);
      return (data ?? []) as WorkoutComment[];
    } catch (e) {
      console.error('[WorkoutInteraction] getComments error:', e);
      return [];
    }
  }

  /** Record a zap (does not check for duplicates — callers ensure idempotency). */
  async recordZap(eventId: string, senderNpub: string, amount: number): Promise<void> {
    if (!isSupabaseConfigured()) return;
    try {
      const { error } = await supabase!
        .from('workout_zaps')
        .insert({ event_id: eventId, sender_npub: senderNpub, amount });
      if (error) console.error('[WorkoutInteraction] recordZap:', error.message);
    } catch (e) {
      console.error('[WorkoutInteraction] recordZap error:', e);
    }
  }

  /** Fetch all zaps for an event, newest first. */
  async getZaps(eventId: string): Promise<WorkoutZap[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data, error } = await supabase!
        .from('workout_zaps')
        .select('id, event_id, sender_npub, amount, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (error) console.error('[WorkoutInteraction] getZaps:', error.message);
      return (data ?? []) as WorkoutZap[];
    } catch (e) {
      console.error('[WorkoutInteraction] getZaps error:', e);
      return [];
    }
  }
}
