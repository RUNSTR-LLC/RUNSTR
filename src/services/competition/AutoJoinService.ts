/**
 * AutoJoinService - Automatically join RUNSTR competitions on workout submission
 *
 * When a user's workout lands during an active RUNSTR event period,
 * auto-join them if:
 * 1. The competition has NO club_id (RUNSTR-wide events only, never club events)
 * 2. The competition's activity_type matches the workout type
 * 3. The workout date falls within the competition date range
 * 4. The user hasn't already joined
 *
 * This runs after every successful workout submission (HealthKit, Health Connect,
 * GPS tracker) as a fire-and-forget call.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';

const AUTO_JOINED_CACHE_KEY = '@runstr:auto_joined_competitions';
const LAST_CHECK_KEY = '@runstr:auto_join_last_check';
const CHECK_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes between checks

interface Competition {
  id: string;
  name: string;
  activity_type: string;
  start_date: string;
  end_date: string;
  club_id: string | null;
  config: { activity_types?: string[] } | null;
  is_open: boolean | null;
}

export class AutoJoinService {
  /**
   * Check and auto-join any matching RUNSTR competitions for a workout.
   *
   * @param npub - User's npub
   * @param workoutType - e.g. 'running', 'walking', 'cycling'
   * @param workoutDate - When the workout started
   * @param profile - Optional cached profile for leaderboard display
   * @returns List of competition names that were joined
   */
  static async checkAndAutoJoin(
    npub: string,
    workoutType: string,
    workoutDate: Date,
    profile?: { name?: string; picture?: string }
  ): Promise<{ joined: string[] }> {
    try {
      if (!isSupabaseConfigured() || !supabase) {
        return { joined: [] };
      }

      // Throttle: don't check more than once every 5 minutes
      const lastCheck = await AsyncStorage.getItem(LAST_CHECK_KEY);
      if (lastCheck) {
        const elapsed = Date.now() - parseInt(lastCheck, 10);
        if (elapsed < CHECK_THROTTLE_MS) {
          return { joined: [] };
        }
      }
      await AsyncStorage.setItem(LAST_CHECK_KEY, String(Date.now()));

      // Load local cache of already-joined competition IDs
      const alreadyJoined = await this.getJoinedCache();

      // Query active RUNSTR competitions (club_id IS NULL = not club events)
      const workoutDateStr = workoutDate.toISOString();
      const { data: competitions, error } = await supabase
        .from('competitions')
        .select('id, name, activity_type, start_date, end_date, club_id, config, is_open')
        .is('club_id', null)
        .lte('start_date', workoutDateStr)
        .gte('end_date', workoutDateStr);

      if (error) {
        console.warn('[AutoJoin] Query error:', error.message);
        return { joined: [] };
      }

      if (!competitions || competitions.length === 0) {
        return { joined: [] };
      }

      const joined: string[] = [];

      for (const comp of competitions as Competition[]) {
        // Skip if already joined
        if (alreadyJoined.has(comp.id)) continue;

        // Skip closed competitions
        if (comp.is_open === false) continue;

        // Check activity type match
        if (!this.matchesActivityType(comp, workoutType)) continue;

        // Check if user already participates (server-side dedup)
        const { data: existing } = await supabase
          .from('competition_participants')
          .select('id')
          .match({ competition_id: comp.id, npub })
          .single();

        if (existing) {
          // Already joined on server, update local cache
          alreadyJoined.add(comp.id);
          continue;
        }

        // Auto-join!
        const { error: joinError } = await supabase
          .from('competition_participants')
          .upsert(
            {
              competition_id: comp.id,
              npub,
              name: profile?.name || null,
              picture: profile?.picture || null,
            },
            { onConflict: 'competition_id,npub' }
          );

        if (joinError) {
          console.warn(`[AutoJoin] Failed to join ${comp.name}:`, joinError.message);
          continue;
        }

        alreadyJoined.add(comp.id);
        joined.push(comp.name);
        console.log(`[AutoJoin] Auto-joined: ${comp.name} (${workoutType})`);
      }

      // Persist updated cache
      await this.saveJoinedCache(alreadyJoined);

      return { joined };
    } catch (err) {
      console.warn('[AutoJoin] Error:', err);
      return { joined: [] };
    }
  }

  /**
   * Check if a competition's activity type matches the workout type.
   * Supports both single activity_type column and config.activity_types array.
   */
  private static matchesActivityType(comp: Competition, workoutType: string): boolean {
    const wType = workoutType.toLowerCase();

    // Check config.activity_types array first (dynamic events)
    if (comp.config?.activity_types && Array.isArray(comp.config.activity_types)) {
      return comp.config.activity_types.some(
        (t: string) => t.toLowerCase() === wType
      );
    }

    // Fall back to single activity_type column
    const compType = comp.activity_type?.toLowerCase() || '';

    // "any" or "all" matches everything
    if (compType === 'any' || compType === 'all') return true;

    return compType === wType;
  }

  /** Load locally cached set of already-joined competition IDs */
  private static async getJoinedCache(): Promise<Set<string>> {
    try {
      const raw = await AsyncStorage.getItem(AUTO_JOINED_CACHE_KEY);
      if (!raw) return new Set();
      return new Set(JSON.parse(raw));
    } catch {
      return new Set();
    }
  }

  /** Persist the set of joined competition IDs */
  private static async saveJoinedCache(ids: Set<string>): Promise<void> {
    try {
      await AsyncStorage.setItem(AUTO_JOINED_CACHE_KEY, JSON.stringify([...ids]));
    } catch {
      // non-critical
    }
  }
}
