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
import { callEdgeFunction } from '../../utils/edgeFunctions';

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
  weeklyEarnings: number; // verified sats from reward_payments
  weeklyActiveMembers: number;
  todayActiveMembers: number;
  allTimeWorkouts: number;
  allTimeEarnings: number; // verified sats from reward_payments
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
        .order('member_count', { ascending: false })
        .limit(200);

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
   * Update club details via Edge Function.
   * Server verifies caller is the club captain.
   *
   * @param clubId - UUID of the club to update
   * @param updates - Fields to update (description, lightning_address, banner_url, leaderboard_metric)
   * @param callerNpub - npub of the caller (must be captain)
   * @returns true if update succeeded
   */
  static async updateClub(
    clubId: string,
    updates: { description?: string; lightning_address?: string; banner_url?: string; leaderboard_metric?: string },
    callerNpub?: string,
  ): Promise<boolean> {
    const result = await callEdgeFunction('manage-club', {
      action: 'update-club',
      npub: callerNpub || '',
      club_id: clubId,
      updates,
    });

    if (!result.success) {
      console.error(`[ClubService] updateClub error for ${clubId}:`, result.error);
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
  }

  /**
   * Get club earnings data from workout_submissions (activity stats) and
   * reward_payments (verified sats). Only payments with status='success'
   * are counted as earnings — never estimates based on workout counts.
   * Cached in-memory for 5 minutes.
   */
  static async getClubEarnings(clubId: string, lightningAddress?: string | null): Promise<ClubEarnings> {
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

    // Check cache (keyed by clubId + lightning address)
    const cacheKey = `${clubId}:${lightningAddress || ''}`;
    const cached = earningsCache.get(cacheKey);
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
      const weekStart = monday.toISOString();
      const weekStartDate = weekStart.split('T')[0];
      const todayStr = now.toISOString().split('T')[0];

      // Fetch weekly workout data (includes today)
      const { data: weekData, error: weekErr } = await supabase!
        .from('workout_submissions')
        .select('npub, leaderboard_date')
        .eq('club_id', clubId)
        .not('club_lightning_address', 'is', null)
        .gte('leaderboard_date', weekStartDate)
        .limit(500);

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

      // Fetch all-time workout count
      const { count: allTimeCount, error: allErr } = await supabase!
        .from('workout_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', clubId)
        .not('club_lightning_address', 'is', null)
        .limit(5000);

      if (allErr) {
        console.error('[ClubService] getClubEarnings all-time query error:', allErr);
        return empty;
      }

      // Fetch verified earnings from reward_payments
      let weeklyVerifiedSats = 0;
      let allTimeVerifiedSats = 0;

      if (lightningAddress) {
        // Weekly verified payments
        const { data: weekPayments, error: weekPayErr } = await supabase!
          .from('reward_payments')
          .select('amount_sats')
          .eq('lightning_address', lightningAddress)
          .eq('status', 'success')
          .gte('paid_at', weekStart);

        if (!weekPayErr && weekPayments) {
          weeklyVerifiedSats = weekPayments.reduce((sum: number, r: any) => sum + (r.amount_sats || 0), 0);
        }

        // All-time verified payments
        const { data: allPayments, error: allPayErr } = await supabase!
          .from('reward_payments')
          .select('amount_sats')
          .eq('lightning_address', lightningAddress)
          .eq('status', 'success');

        if (!allPayErr && allPayments) {
          allTimeVerifiedSats = allPayments.reduce((sum: number, r: any) => sum + (r.amount_sats || 0), 0);
        }
      }

      const result: ClubEarnings = {
        weeklyWorkouts,
        weeklyEarnings: weeklyVerifiedSats,
        weeklyActiveMembers: weekNpubs.size,
        todayActiveMembers: todayNpubs.size,
        allTimeWorkouts: allTimeCount || 0,
        allTimeEarnings: allTimeVerifiedSats,
      };

      // Cache result
      earningsCache.set(cacheKey, { data: result, timestamp: Date.now() });
      console.log(`[ClubService] Club earnings for ${clubId}: ${result.weeklyEarnings} verified sats this week`);

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
