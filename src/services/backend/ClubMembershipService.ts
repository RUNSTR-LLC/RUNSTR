/**
 * ClubMembershipService - Manages club membership operations
 *
 * Handles joining, leaving, and switching clubs via the club_memberships table.
 * Users can belong to ONE club at a time (enforced by UNIQUE index on member_npub).
 * Follows the static class pattern from UserTeamService/SupabaseCompetitionService.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';
import { Club, ClubMembership, ClubJoinResult } from '../../types/club';

// AsyncStorage keys for current club state
const CLUB_ID_KEY = '@runstr:club_id';
const CLUB_NAME_KEY = '@runstr:club_name';
const CLUB_ROLE_KEY = '@runstr:club_role';

// Cache for club members list
const MEMBERS_CACHE_KEY_PREFIX = '@runstr:club_members_';
const MEMBERS_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory cache for members (avoids repeated AsyncStorage reads)
const membersCache = new Map<string, { members: ClubMembership[]; timestamp: number }>();

// Postgres unique violation error code
const UNIQUE_VIOLATION_CODE = '23505';

export class ClubMembershipService {
  /**
   * Get the user's current club ID from cache or database.
   * Returns null if user is not in any club.
   */
  static async getCurrentClub(npub: string): Promise<string | null> {
    // Check AsyncStorage cache first (instant)
    try {
      const cachedId = await AsyncStorage.getItem(CLUB_ID_KEY);
      if (cachedId) {
        console.log(`[ClubMembershipService] Returning cached club ID: ${cachedId}`);
        return cachedId;
      }
    } catch {
      // Cache read failed, continue to fetch
    }

    if (!isSupabaseConfigured()) {
      console.warn('[ClubMembershipService] Supabase not configured');
      return null;
    }

    try {
      const { data, error } = await supabase!
        .from('club_memberships')
        .select('club_id')
        .eq('member_npub', npub)
        .single();

      if (error) {
        // PGRST116 = no rows found (not an error, user just isn't in a club)
        if (error.code === 'PGRST116') {
          console.log(`[ClubMembershipService] User ${npub.slice(0, 12)}... not in any club`);
          return null;
        }
        console.error('[ClubMembershipService] getCurrentClub error:', error);
        return null;
      }

      const clubId = data?.club_id || null;

      // Cache the result
      if (clubId) {
        try {
          await AsyncStorage.setItem(CLUB_ID_KEY, clubId);
        } catch {
          // Cache write failed, non-critical
        }
      }

      console.log(`[ClubMembershipService] Current club for ${npub.slice(0, 12)}...: ${clubId || 'none'}`);
      return clubId;
    } catch (err) {
      console.error('[ClubMembershipService] getCurrentClub exception:', err);
      return null;
    }
  }

  /**
   * Join a club. Inserts into club_memberships and increments user_teams.member_count.
   * Fails if user is already in a club (unique constraint on member_npub).
   *
   * @param clubId - UUID of the club to join
   * @param npub - User's Nostr public key
   * @param role - 'member' (default) or 'captain'
   * @returns ClubJoinResult with success status and optional club data
   */
  static async joinClub(
    clubId: string,
    npub: string,
    role: 'member' | 'captain' = 'member'
  ): Promise<ClubJoinResult> {
    if (!isSupabaseConfigured()) {
      console.warn('[ClubMembershipService] Supabase not configured');
      return { success: false, error: 'Backend not configured' };
    }

    try {
      // Insert membership row
      const { error: insertError } = await supabase!
        .from('club_memberships')
        .insert({
          club_id: clubId,
          member_npub: npub,
          role,
        });

      if (insertError) {
        // Unique violation = user is already in a club
        if (insertError.code === UNIQUE_VIOLATION_CODE) {
          console.warn(`[ClubMembershipService] User ${npub.slice(0, 12)}... already in a club`);
          return { success: false, error: 'Already in a club. Leave your current club first.' };
        }
        console.error('[ClubMembershipService] joinClub insert error:', insertError);
        return { success: false, error: insertError.message };
      }

      // Increment member_count on user_teams
      // Use raw SQL increment via RPC if available, otherwise read-then-write
      try {
        const { data: clubData } = await supabase!
          .from('user_teams')
          .select('member_count, name')
          .eq('id', clubId)
          .single();

        if (clubData) {
          await supabase!
            .from('user_teams')
            .update({ member_count: (clubData.member_count || 0) + 1 })
            .eq('id', clubId);

          // Cache club name and role in AsyncStorage for quick access
          try {
            await AsyncStorage.setItem(CLUB_ID_KEY, clubId);
            await AsyncStorage.setItem(CLUB_NAME_KEY, clubData.name || '');
            await AsyncStorage.setItem(CLUB_ROLE_KEY, role);
          } catch {
            // Cache write failed, non-critical
          }

          console.log(`[ClubMembershipService] Joined club "${clubData.name}" as ${role}`);

          return {
            success: true,
            club: {
              id: clubId,
              name: clubData.name,
              description: null,
              lightning_address: null,
              created_by_npub: '',
              member_count: (clubData.member_count || 0) + 1,
              is_active: true,
              created_at: '',
            } as Club,
          };
        }
      } catch (countErr) {
        console.warn('[ClubMembershipService] Failed to increment member_count:', countErr);
        // Join succeeded even if count update failed
      }

      // Cache the club ID even without full club data
      try {
        await AsyncStorage.setItem(CLUB_ID_KEY, clubId);
        await AsyncStorage.setItem(CLUB_ROLE_KEY, role);
      } catch {
        // Cache write failed, non-critical
      }

      console.log(`[ClubMembershipService] Joined club ${clubId} as ${role}`);
      return { success: true };
    } catch (err) {
      console.error('[ClubMembershipService] joinClub exception:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Leave the current club. Deletes from club_memberships and decrements member_count.
   * Also clears all club-related AsyncStorage keys.
   *
   * @param npub - User's Nostr public key
   * @returns Success status
   */
  static async leaveClub(npub: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      console.warn('[ClubMembershipService] Supabase not configured');
      return { success: false, error: 'Backend not configured' };
    }

    try {
      // First, get the current club ID so we can decrement its member_count
      const { data: membership, error: lookupError } = await supabase!
        .from('club_memberships')
        .select('club_id')
        .eq('member_npub', npub)
        .single();

      if (lookupError || !membership) {
        console.warn(`[ClubMembershipService] No membership found for ${npub.slice(0, 12)}...`);
        // Clear local cache anyway in case of stale state
        await this.clearLocalClubState();
        return { success: false, error: 'Not a member of any club' };
      }

      const clubId = membership.club_id;

      // Delete the membership row
      const { error: deleteError } = await supabase!
        .from('club_memberships')
        .delete()
        .eq('member_npub', npub);

      if (deleteError) {
        console.error('[ClubMembershipService] leaveClub delete error:', deleteError);
        return { success: false, error: deleteError.message };
      }

      // Decrement member_count on user_teams
      try {
        const { data: clubData } = await supabase!
          .from('user_teams')
          .select('member_count')
          .eq('id', clubId)
          .single();

        if (clubData) {
          const newCount = Math.max(0, (clubData.member_count || 1) - 1);
          await supabase!
            .from('user_teams')
            .update({ member_count: newCount })
            .eq('id', clubId);
        }
      } catch (countErr) {
        console.warn('[ClubMembershipService] Failed to decrement member_count:', countErr);
        // Leave succeeded even if count update failed
      }

      // Clear all club-related AsyncStorage keys
      await this.clearLocalClubState();

      // Clear members cache for this club
      membersCache.delete(clubId);
      try {
        await AsyncStorage.removeItem(`${MEMBERS_CACHE_KEY_PREFIX}${clubId}`);
      } catch {
        // Non-critical
      }

      console.log(`[ClubMembershipService] Left club ${clubId}`);
      return { success: true };
    } catch (err) {
      console.error('[ClubMembershipService] leaveClub exception:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Switch from current club to a new club.
   * Performs leaveClub + joinClub in sequence.
   *
   * @param newClubId - UUID of the new club to join
   * @param npub - User's Nostr public key
   * @param role - 'member' (default) or 'captain'
   * @returns ClubJoinResult for the new club
   */
  static async switchClub(
    newClubId: string,
    npub: string,
    role: 'member' | 'captain' = 'member'
  ): Promise<ClubJoinResult> {
    console.log(`[ClubMembershipService] Switching to club ${newClubId}...`);

    // Leave current club first
    const leaveResult = await this.leaveClub(npub);
    if (!leaveResult.success) {
      // If not in a club, that's fine -- just join the new one
      if (leaveResult.error !== 'Not a member of any club') {
        console.error('[ClubMembershipService] switchClub leave failed:', leaveResult.error);
        return { success: false, error: `Failed to leave current club: ${leaveResult.error}` };
      }
    }

    // Join new club
    const joinResult = await this.joinClub(newClubId, npub, role);
    if (!joinResult.success) {
      console.error('[ClubMembershipService] switchClub join failed:', joinResult.error);
      return joinResult;
    }

    console.log(`[ClubMembershipService] Successfully switched to club ${newClubId}`);
    return joinResult;
  }

  /**
   * Get all members of a club.
   * Results are cached in-memory and AsyncStorage for 5 minutes.
   *
   * @param clubId - UUID of the club
   * @returns Array of ClubMembership records
   */
  static async getClubMembers(clubId: string): Promise<ClubMembership[]> {
    if (!isSupabaseConfigured()) {
      console.warn('[ClubMembershipService] Supabase not configured');
      return [];
    }

    // Check in-memory cache first
    const memCached = membersCache.get(clubId);
    if (memCached && Date.now() - memCached.timestamp < MEMBERS_TTL) {
      console.log(`[ClubMembershipService] Returning ${memCached.members.length} cached members for ${clubId}`);
      return memCached.members;
    }

    // Check AsyncStorage cache
    const cacheKey = `${MEMBERS_CACHE_KEY_PREFIX}${clubId}`;
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        let parsed;
        try {
          parsed = JSON.parse(cached);
        } catch {
          console.warn('[ClubMembershipService] Corrupted members cache, removing');
          await AsyncStorage.removeItem(cacheKey);
          parsed = null;
        }
        if (parsed && Date.now() - parsed.timestamp < MEMBERS_TTL) {
          const members = parsed.data as ClubMembership[];
          // Populate in-memory cache
          membersCache.set(clubId, { members, timestamp: parsed.timestamp });
          console.log(`[ClubMembershipService] Returning ${members.length} cached members (AsyncStorage)`);
          return members;
        }
      }
    } catch {
      // Cache read failed, continue to fetch
    }

    try {
      const { data, error } = await supabase!
        .from('club_memberships')
        .select('*')
        .eq('club_id', clubId)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error(`[ClubMembershipService] getClubMembers error for ${clubId}:`, error);
        return [];
      }

      const members = (data || []) as ClubMembership[];
      console.log(`[ClubMembershipService] Fetched ${members.length} members for club ${clubId}`);

      // Save to both caches
      const now = Date.now();
      membersCache.set(clubId, { members, timestamp: now });
      try {
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({ data: members, timestamp: now })
        );
      } catch {
        // Cache write failed, non-critical
      }

      return members;
    } catch (err) {
      console.error(`[ClubMembershipService] getClubMembers exception for ${clubId}:`, err);
      return [];
    }
  }

  /**
   * Quick check if a user is a member of a specific club.
   *
   * @param clubId - UUID of the club
   * @param npub - User's Nostr public key
   * @returns true if user is a member
   */
  static async isMember(clubId: string, npub: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false;
    }

    // Check local cache first for speed
    try {
      const cachedId = await AsyncStorage.getItem(CLUB_ID_KEY);
      if (cachedId === clubId) {
        return true;
      }
      // If cached club is different, user is not in this club
      if (cachedId && cachedId !== clubId) {
        return false;
      }
    } catch {
      // Cache read failed, fall through to DB check
    }

    try {
      const { data, error } = await supabase!
        .from('club_memberships')
        .select('id')
        .eq('club_id', clubId)
        .eq('member_npub', npub)
        .single();

      if (error) {
        // PGRST116 = no rows found
        if (error.code === 'PGRST116') {
          return false;
        }
        console.error('[ClubMembershipService] isMember error:', error);
        return false;
      }

      return !!data;
    } catch (err) {
      console.error('[ClubMembershipService] isMember exception:', err);
      return false;
    }
  }

  /**
   * Clear all club membership caches (AsyncStorage and in-memory).
   * Call after operations that change membership state.
   */
  static async clearCache(): Promise<void> {
    try {
      // Clear local club state
      await this.clearLocalClubState();

      // Clear in-memory members cache
      membersCache.clear();

      // Clear all AsyncStorage members caches
      // We can't enumerate all keys efficiently, so clear known ones
      const allKeys = await AsyncStorage.getAllKeys();
      const memberKeys = allKeys.filter((k) => k.startsWith(MEMBERS_CACHE_KEY_PREFIX));
      if (memberKeys.length > 0) {
        await AsyncStorage.multiRemove(memberKeys);
      }

      console.log('[ClubMembershipService] All caches cleared');
    } catch {
      // Non-critical
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Clear club-related AsyncStorage keys (club_id, club_name, club_role)
   */
  private static async clearLocalClubState(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([CLUB_ID_KEY, CLUB_NAME_KEY, CLUB_ROLE_KEY]);
      console.log('[ClubMembershipService] Local club state cleared');
    } catch {
      // Non-critical
    }
  }
}

export default ClubMembershipService;
