/**
 * UserTeamService - Fetches user-created teams from Supabase
 *
 * Queries the user_teams table for community-created teams.
 * Follows the static class pattern from SupabaseCompetitionService.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';

// Cache configuration
const USER_TEAMS_CACHE_KEY = '@runstr:user_teams_cache';
const USER_TEAMS_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory cache for individual team lookups (avoids repeated Supabase queries)
const teamByIdCache = new Map<string, { team: UserTeam | null; timestamp: number }>();
const TEAM_BY_ID_TTL = 10 * 60 * 1000; // 10 minutes

export interface UserTeam {
  id: string;
  name: string;
  description: string | null;
  lightning_address: string | null;
  created_by_npub: string;
  member_count: number;
  is_active: boolean;
  created_at: string;
}

export class UserTeamService {
  /**
   * Fetch all active user-created teams from Supabase
   * Results are cached in AsyncStorage for 5 minutes.
   */
  static async fetchActiveTeams(): Promise<UserTeam[]> {
    if (!isSupabaseConfigured()) {
      console.warn('[UserTeamService] Supabase not configured');
      return [];
    }

    // Check cache first
    try {
      const cached = await AsyncStorage.getItem(USER_TEAMS_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < USER_TEAMS_TTL) {
          console.log(`[UserTeamService] Returning ${data.length} cached teams`);
          return data as UserTeam[];
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
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('[UserTeamService] fetchActiveTeams error:', error);
        return [];
      }

      const teams = (data || []) as UserTeam[];
      console.log(`[UserTeamService] Fetched ${teams.length} active teams`);

      // Save to cache
      try {
        await AsyncStorage.setItem(
          USER_TEAMS_CACHE_KEY,
          JSON.stringify({ data: teams, timestamp: Date.now() })
        );
      } catch {
        // Cache write failed, non-critical
      }

      return teams;
    } catch (err) {
      console.error('[UserTeamService] fetchActiveTeams exception:', err);
      return [];
    }
  }

  /**
   * Check if a user already has a team (for spam prevention)
   * Returns true if the npub already owns an active team.
   */
  static async hasExistingTeam(npub: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false;
    }

    try {
      const { data, error } = await supabase!
        .from('user_teams')
        .select('id')
        .eq('created_by_npub', npub)
        .eq('is_active', true)
        .limit(1);

      if (error) {
        console.error('[UserTeamService] hasExistingTeam error:', error);
        return false;
      }

      return (data?.length || 0) > 0;
    } catch (err) {
      console.error('[UserTeamService] hasExistingTeam exception:', err);
      return false;
    }
  }

  /**
   * Fetch a single team by UUID from the user_teams table.
   * Uses an in-memory cache to avoid repeated Supabase queries during a session.
   * The uuid parameter should be the raw UUID (without the "community-" prefix).
   */
  static async getTeamById(uuid: string): Promise<UserTeam | null> {
    if (!isSupabaseConfigured()) {
      console.warn('[UserTeamService] Supabase not configured');
      return null;
    }

    // Check in-memory cache first
    const cached = teamByIdCache.get(uuid);
    if (cached && Date.now() - cached.timestamp < TEAM_BY_ID_TTL) {
      console.log(`[UserTeamService] Returning cached team for ${uuid}`);
      return cached.team;
    }

    try {
      const { data, error } = await supabase!
        .from('user_teams')
        .select('*')
        .eq('id', uuid)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error(`[UserTeamService] getTeamById error for ${uuid}:`, error);
        // Cache the miss to avoid repeated failed queries
        teamByIdCache.set(uuid, { team: null, timestamp: Date.now() });
        return null;
      }

      const team = (data as UserTeam) || null;
      console.log(`[UserTeamService] Fetched team: ${team?.name || 'not found'}`);

      // Cache the result
      teamByIdCache.set(uuid, { team, timestamp: Date.now() });

      return team;
    } catch (err) {
      console.error(`[UserTeamService] getTeamById exception for ${uuid}:`, err);
      return null;
    }
  }

  /**
   * Clear the user teams cache (e.g., after creating a new team)
   */
  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(USER_TEAMS_CACHE_KEY);
      teamByIdCache.clear();
      console.log('[UserTeamService] Cache cleared');
    } catch {
      // Non-critical
    }
  }
}

export default UserTeamService;
