/**
 * ClubService - Fetches fitness clubs from Supabase
 *
 * Queries the user_teams table for active clubs (social fitness groups).
 * Clubs are separate from charity/reward destinations.
 * Follows the static class pattern from UserTeamService.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';
import { Club } from '../../types/club';

// Cache configuration
const CLUBS_CACHE_KEY = '@runstr:clubs_cache';
const CLUBS_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory cache for individual club lookups (avoids repeated Supabase queries)
const clubByIdCache = new Map<string, { club: Club | null; timestamp: number }>();
const CLUB_BY_ID_TTL = 10 * 60 * 1000; // 10 minutes

// In-memory cache for club earnings (5 min TTL, same as leaderboard)
const earningsCache = new Map<string, { data: ClubEarnings; timestamp: number }>();
const EARNINGS_TTL = 5 * 60 * 1000; // 5 minutes

// Earnings data returned by getClubEarnings
export interface ClubEarnings {
  weeklyWorkouts: number;
  weeklyEarnings: number; // weeklyWorkouts * 10
  weeklyActiveMembers: number;
  todayActiveMembers: number;
  allTimeWorkouts: number;
  allTimeEarnings: number; // allTimeWorkouts * 10
}

export class ClubService {
  /**
   * Fetch all active clubs from Supabase user_teams table.
   * Results are cached in AsyncStorage for 5 minutes.
   */
  static async fetchActiveClubs(): Promise<Club[]> {
    if (!isSupabaseConfigured()) {
      console.warn('[ClubService] Supabase not configured');
      return [];
    }

    // Check cache first
    try {
      const cached = await AsyncStorage.getItem(CLUBS_CACHE_KEY);
      if (cached) {
        let parsed;
        try {
          parsed = JSON.parse(cached);
        } catch {
          // Corrupted cache (e.g., device reboot mid-write), remove it
          console.warn('[ClubService] Corrupted clubs cache, removing');
          await AsyncStorage.removeItem(CLUBS_CACHE_KEY);
          parsed = null;
        }
        if (parsed && Date.now() - parsed.timestamp < CLUBS_TTL) {
          console.log(`[ClubService] Returning ${parsed.data.length} cached clubs`);
          return parsed.data as Club[];
        }
      }
    } catch {
      // Cache read failed, continue to fetch
    }

    try {
      const { data, error } = await supabase!
        .from('user_teams')
        .select('*')
        .eq('is_active', true)
        .order('member_count', { ascending: false });

      if (error) {
        console.error('[ClubService] fetchActiveClubs error:', error);
        return [];
      }

      const clubs = (data || []) as Club[];
      console.log(`[ClubService] Fetched ${clubs.length} active clubs`);

      // Save to cache
      try {
        await AsyncStorage.setItem(
          CLUBS_CACHE_KEY,
          JSON.stringify({ data: clubs, timestamp: Date.now() })
        );
      } catch {
        // Cache write failed, non-critical
      }

      return clubs;
    } catch (err) {
      console.error('[ClubService] fetchActiveClubs exception:', err);
      return [];
    }
  }

  /**
   * Fetch a single club by UUID from the user_teams table.
   * Uses an in-memory cache to avoid repeated Supabase queries during a session.
   */
  static async getClubById(clubId: string): Promise<Club | null> {
    if (!isSupabaseConfigured()) {
      console.warn('[ClubService] Supabase not configured');
      return null;
    }

    // Check in-memory cache first
    const cached = clubByIdCache.get(clubId);
    if (cached && Date.now() - cached.timestamp < CLUB_BY_ID_TTL) {
      console.log(`[ClubService] Returning cached club for ${clubId}`);
      return cached.club;
    }

    try {
      const { data, error } = await supabase!
        .from('user_teams')
        .select('*')
        .eq('id', clubId)
        .eq('is_active', true)
        .single();

      if (error) {
        // PGRST116 = "no rows found" -- this is a real "not found", safe to cache
        if (error.code === 'PGRST116') {
          console.log(`[ClubService] Club ${clubId} not found (or inactive), caching null`);
          clubByIdCache.set(clubId, { club: null, timestamp: Date.now() });
          return null;
        }

        // Any other error (network failure, timeout, 5xx, etc.) is transient.
        // Do NOT cache null -- next call should retry the query.
        console.error(`[ClubService] getClubById transient error for ${clubId}:`, error);
        return null;
      }

      const club = (data as Club) || null;
      console.log(`[ClubService] Fetched club: ${club?.name || 'not found'}`);

      // Cache successful results
      clubByIdCache.set(clubId, { club, timestamp: Date.now() });

      return club;
    } catch (err) {
      // Exception (network down, etc.) -- do NOT cache, allow retry
      console.error(`[ClubService] getClubById exception for ${clubId}:`, err);
      return null;
    }
  }

  /**
   * Search clubs by name (case-insensitive).
   * Does NOT use cache -- always queries Supabase for fresh search results.
   */
  static async searchClubs(query: string): Promise<Club[]> {
    if (!isSupabaseConfigured()) {
      console.warn('[ClubService] Supabase not configured');
      return [];
    }

    const trimmed = query.trim();
    if (trimmed.length === 0) {
      return [];
    }

    try {
      const { data, error } = await supabase!
        .from('user_teams')
        .select('*')
        .eq('is_active', true)
        .ilike('name', `%${trimmed}%`)
        .order('member_count', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[ClubService] searchClubs error:', error);
        return [];
      }

      const clubs = (data || []) as Club[];
      console.log(`[ClubService] Search "${trimmed}" returned ${clubs.length} clubs`);

      return clubs;
    } catch (err) {
      console.error('[ClubService] searchClubs exception:', err);
      return [];
    }
  }

  /**
   * Update club details in the user_teams table.
   * Only the captain should call this (enforced at the UI level).
   * Clears caches after a successful update so fresh data is fetched.
   *
   * @param clubId - UUID of the club to update
   * @param updates - Fields to update (description, lightning_address, banner_url)
   * @returns true if update succeeded
   */
  static async updateClub(
    clubId: string,
    updates: { description?: string; lightning_address?: string; banner_url?: string }
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn('[ClubService] Supabase not configured');
      return false;
    }

    try {
      const { error } = await supabase!
        .from('user_teams')
        .update(updates)
        .eq('id', clubId);

      if (error) {
        console.error(`[ClubService] updateClub error for ${clubId}:`, error);
        return false;
      }

      console.log(`[ClubService] Updated club ${clubId}:`, Object.keys(updates));

      // Invalidate caches so next read gets fresh data
      clubByIdCache.delete(clubId);
      try {
        await AsyncStorage.removeItem(CLUBS_CACHE_KEY);
      } catch {
        // Non-critical
      }

      return true;
    } catch (err) {
      console.error(`[ClubService] updateClub exception for ${clubId}:`, err);
      return false;
    }
  }

  /**
   * Get club earnings data from workout_submissions.
   * Counts qualifying workouts (those with a club_lightning_address) and
   * multiplies by 10 sats per workout for the earnings totals.
   * Cached in-memory for 5 minutes.
   */
  static async getClubEarnings(clubId: string): Promise<ClubEarnings> {
    const empty: ClubEarnings = {
      weeklyWorkouts: 0,
      weeklyEarnings: 0,
      weeklyActiveMembers: 0,
      todayActiveMembers: 0,
      allTimeWorkouts: 0,
      allTimeEarnings: 0,
    };

    if (!isSupabaseConfigured()) {
      return empty;
    }

    // Check cache
    const cached = earningsCache.get(clubId);
    if (cached && Date.now() - cached.timestamp < EARNINGS_TTL) {
      return cached.data;
    }

    try {
      // Calculate date boundaries
      const now = new Date();
      const day = now.getUTCDay(); // 0 = Sunday
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setUTCDate(now.getUTCDate() + diffToMonday);
      monday.setUTCHours(0, 0, 0, 0);
      const weekStart = monday.toISOString().split('T')[0];
      const todayStr = now.toISOString().split('T')[0];

      // Fetch weekly data (includes today)
      const { data: weekData, error: weekErr } = await supabase!
        .from('workout_submissions')
        .select('npub, leaderboard_date')
        .eq('club_id', clubId)
        .not('club_lightning_address', 'is', null)
        .gte('leaderboard_date', weekStart);

      if (weekErr) {
        console.error('[ClubService] getClubEarnings week query error:', weekErr);
        return empty;
      }

      const weekRows = weekData || [];
      const weeklyWorkouts = weekRows.length;
      const weekNpubs = new Set(weekRows.map((r: any) => r.npub));
      const todayNpubs = new Set(
        weekRows.filter((r: any) => r.leaderboard_date === todayStr).map((r: any) => r.npub)
      );

      // Fetch all-time count
      const { count: allTimeCount, error: allErr } = await supabase!
        .from('workout_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', clubId)
        .not('club_lightning_address', 'is', null);

      if (allErr) {
        console.error('[ClubService] getClubEarnings all-time query error:', allErr);
        return empty;
      }

      const result: ClubEarnings = {
        weeklyWorkouts,
        weeklyEarnings: weeklyWorkouts * 10,
        weeklyActiveMembers: weekNpubs.size,
        todayActiveMembers: todayNpubs.size,
        allTimeWorkouts: allTimeCount || 0,
        allTimeEarnings: (allTimeCount || 0) * 10,
      };

      // Cache result
      earningsCache.set(clubId, { data: result, timestamp: Date.now() });
      console.log(`[ClubService] Club earnings for ${clubId}: ${result.weeklyEarnings} sats this week`);

      return result;
    } catch (err) {
      console.error('[ClubService] getClubEarnings exception:', err);
      return empty;
    }
  }

  /**
   * Clear both AsyncStorage and in-memory caches.
   * Call after creating a new club or when data may be stale.
   */
  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CLUBS_CACHE_KEY);
      clubByIdCache.clear();
      earningsCache.clear();
      console.log('[ClubService] Cache cleared');
    } catch {
      // Non-critical
    }
  }
}

export default ClubService;
