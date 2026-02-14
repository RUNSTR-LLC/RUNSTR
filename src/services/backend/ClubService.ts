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
        console.error(`[ClubService] getClubById error for ${clubId}:`, error);
        // Cache the miss to avoid repeated failed queries
        clubByIdCache.set(clubId, { club: null, timestamp: Date.now() });
        return null;
      }

      const club = (data as Club) || null;
      console.log(`[ClubService] Fetched club: ${club?.name || 'not found'}`);

      // Cache the result
      clubByIdCache.set(clubId, { club, timestamp: Date.now() });

      return club;
    } catch (err) {
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
   * Clear both AsyncStorage and in-memory caches.
   * Call after creating a new club or when data may be stale.
   */
  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CLUBS_CACHE_KEY);
      clubByIdCache.clear();
      console.log('[ClubService] Cache cleared');
    } catch {
      // Non-critical
    }
  }
}

export default ClubService;
