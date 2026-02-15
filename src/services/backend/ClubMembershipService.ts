/**
 * ClubMembershipService - Manages club membership operations
 * Users can belong to ONE club at a time (enforced by UNIQUE index on member_npub).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';
import { Club, ClubMembership, ClubJoinResult } from '../../types/club';

const TAG = '[ClubMembershipService]';
const CLUB_ID_KEY = '@runstr:club_id';
const CLUB_NAME_KEY = '@runstr:club_name';
const CLUB_ROLE_KEY = '@runstr:club_role';
const MEMBERS_CACHE_KEY_PREFIX = '@runstr:club_members_';
const MEMBERS_TTL = 5 * 60 * 1000; // 5 minutes
const membersCache = new Map<string, { members: ClubMembership[]; timestamp: number }>();
const UNIQUE_VIOLATION_CODE = '23505';

// Reconciliation: track when we last verified membership against Supabase
const RECONCILIATION_KEY = '@runstr:club_reconciled_at';
const RECONCILIATION_TTL = 5 * 60 * 1000; // Re-verify every 5 minutes

export class ClubMembershipService {
  /**
   * Get the user's current club ID from cache or database.
   *
   * Includes RECONCILIATION: If AsyncStorage has a club_id, we periodically
   * verify the membership still exists in Supabase. This handles:
   * - Bug #4: Captain removed a member (DB row deleted, member's device still has stale club_id)
   * - Bug #9: Club was deactivated (all members except captain have stale club_id)
   * - Bug #13: Resolves itself when stale club_id is cleared (no orphaned club tags)
   */
  static async getCurrentClub(npub: string): Promise<string | null> {
    let cachedId: string | null = null;
    try {
      cachedId = await AsyncStorage.getItem(CLUB_ID_KEY);
    } catch { /* continue to fetch */ }

    // If we have a cached club_id, verify it's still valid (reconciliation)
    if (cachedId) {
      if (!isSupabaseConfigured()) return cachedId; // Can't verify without Supabase

      const needsReconciliation = await this.needsReconciliation();
      if (!needsReconciliation) return cachedId; // Recently verified, trust the cache

      // Verify membership still exists in DB
      try {
        const { data, error } = await supabase!
          .from('club_memberships')
          .select('club_id')
          .eq('member_npub', npub)
          .eq('club_id', cachedId)
          .single();

        if (error && error.code === 'PGRST116') {
          // Membership row gone -- user was removed or club was deactivated
          console.warn(
            `${TAG} Reconciliation: membership for ${npub.slice(0, 12)}... in club ${cachedId} no longer exists. Clearing stale local state.`
          );
          await this.clearLocalClubState();
          return null;
        }

        if (error) {
          // Transient error -- don't clear state, just skip reconciliation this time
          console.warn(`${TAG} Reconciliation check failed (transient), keeping cached club:`, error.message);
          return cachedId;
        }

        // Membership exists, but also verify the club is still active
        const { data: clubData, error: clubError } = await supabase!
          .from('user_teams')
          .select('is_active')
          .eq('id', cachedId)
          .single();

        if (clubError && clubError.code === 'PGRST116') {
          // Club row doesn't exist at all
          console.warn(`${TAG} Reconciliation: club ${cachedId} no longer exists. Clearing stale local state.`);
          await this.clearLocalClubState();
          return null;
        }

        if (!clubError && clubData && !clubData.is_active) {
          // Club was deactivated
          console.warn(`${TAG} Reconciliation: club ${cachedId} is deactivated. Clearing stale local state.`);
          await this.clearLocalClubState();
          return null;
        }

        // All good -- membership exists and club is active. Mark reconciliation time.
        await this.markReconciled();
        return cachedId;
      } catch (err) {
        // Network/unexpected error -- don't clear state, keep cached value
        console.warn(`${TAG} Reconciliation exception (keeping cached club):`, err);
        return cachedId;
      }
    }

    // No cached club_id -- query Supabase directly
    if (!isSupabaseConfigured()) return null;

    try {
      const { data, error } = await supabase!
        .from('club_memberships')
        .select('club_id')
        .eq('member_npub', npub)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows = not in a club
        console.error(`${TAG} getCurrentClub error:`, error);
        return null;
      }

      const clubId = data?.club_id || null;
      if (clubId) {
        try { await AsyncStorage.setItem(CLUB_ID_KEY, clubId); } catch { /* non-critical */ }
        await this.markReconciled();
      }
      return clubId;
    } catch (err) {
      console.error(`${TAG} getCurrentClub exception:`, err);
      return null;
    }
  }

  /** Join a club. Fails if user is already in a club (unique constraint). */
  static async joinClub(
    clubId: string,
    npub: string,
    role: 'member' | 'captain' = 'member'
  ): Promise<ClubJoinResult> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Backend not configured' };
    }

    try {
      const { error: insertError } = await supabase!
        .from('club_memberships')
        .insert({ club_id: clubId, member_npub: npub, role });

      if (insertError) {
        if (insertError.code === UNIQUE_VIOLATION_CODE) {
          return { success: false, error: 'Already in a club. Leave your current club first.' };
        }
        console.error(`${TAG} joinClub insert error:`, insertError);
        return { success: false, error: insertError.message };
      }

      // Increment member_count on user_teams
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

          await this.cacheClubState(clubId, clubData.name || '', role);
          console.log(`${TAG} Joined club "${clubData.name}" as ${role}`);

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
        console.warn(`${TAG} Failed to increment member_count:`, countErr);
      }

      await this.cacheClubState(clubId, undefined, role);
      console.log(`${TAG} Joined club ${clubId} as ${role}`);
      return { success: true };
    } catch (err) {
      console.error(`${TAG} joinClub exception:`, err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * Leave the current club. Captains with other members must transfer captainship
   * first. Sole-captain clubs are deactivated automatically on leave.
   */
  static async leaveClub(npub: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Backend not configured' };
    }

    try {
      // Get current membership including role
      const { data: membership, error: lookupError } = await supabase!
        .from('club_memberships')
        .select('club_id, role')
        .eq('member_npub', npub)
        .single();

      if (lookupError || !membership) {
        await this.clearLocalClubState();
        return { success: false, error: 'Not a member of any club' };
      }

      const clubId = membership.club_id;

      // Captain-specific leave logic
      if (membership.role === 'captain') {
        const members = await this.getClubMembers(clubId);
        const otherMembers = members.filter((m) => m.member_npub !== npub);

        if (otherMembers.length > 0) {
          console.warn(
            `${TAG} Captain cannot leave club ${clubId} with ${otherMembers.length} other member(s)`
          );
          return {
            success: false,
            error: 'Transfer captainship before leaving. Use transferCaptainship() to promote another member.',
          };
        }
        // Sole member captain -- will deactivate club after deletion
        console.log(`${TAG} Captain is sole member of ${clubId}, will deactivate club`);
      }

      // Delete the membership row
      const { error: deleteError } = await supabase!
        .from('club_memberships')
        .delete()
        .eq('member_npub', npub);

      if (deleteError) {
        console.error(`${TAG} leaveClub delete error:`, deleteError);
        return { success: false, error: deleteError.message };
      }

      // Decrement member_count (and deactivate if captain was sole member)
      await this.decrementMemberCount(clubId, membership.role === 'captain');

      await this.clearLocalClubState();
      this.invalidateMembersCache(clubId);

      console.log(`${TAG} Left club ${clubId}`);
      return { success: true };
    } catch (err) {
      console.error(`${TAG} leaveClub exception:`, err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /** Switch clubs with recovery. Re-joins original club if join fails. */
  static async switchClub(
    newClubId: string,
    npub: string,
    role: 'member' | 'captain' = 'member'
  ): Promise<ClubJoinResult> {
    console.log(`${TAG} Switching to club ${newClubId}...`);

    // Capture original club ID and role for recovery
    let originalClubId: string | null = null;
    let originalRole: 'member' | 'captain' = 'member';
    try {
      const { data: currentMembership } = await supabase!
        .from('club_memberships')
        .select('club_id, role')
        .eq('member_npub', npub)
        .single();
      if (currentMembership) {
        originalClubId = currentMembership.club_id;
        originalRole = (currentMembership.role as 'member' | 'captain') || 'member';
      }
    } catch { /* recovery won't be possible */ }

    // Leave current club
    const leaveResult = await this.leaveClub(npub);
    if (!leaveResult.success) {
      if (leaveResult.error !== 'Not a member of any club') {
        return { success: false, error: `Failed to leave current club: ${leaveResult.error}` };
      }
      originalClubId = null;
    }

    // Join new club
    const joinResult = await this.joinClub(newClubId, npub, role);
    if (!joinResult.success) {
      console.error(`${TAG} switchClub join failed for ${newClubId}: ${joinResult.error}`);

      // RECOVERY: Attempt to re-join the original club
      if (originalClubId) {
        console.warn(`${TAG} Attempting recovery: re-joining original club ${originalClubId} as ${originalRole}`);
        const recoveryResult = await this.joinClub(originalClubId, npub, originalRole);
        if (recoveryResult.success) {
          console.log(`${TAG} Recovery successful: re-joined original club ${originalClubId}`);
          return {
            success: false,
            error: `Failed to join new club: ${joinResult.error}. You have been returned to your previous club.`,
          };
        }
        // Recovery also failed -- user is orphaned
        console.error(
          `${TAG} CRITICAL: Recovery failed. User ${npub.slice(0, 12)}... is orphaned. ` +
          `Left ${originalClubId}, failed to join ${newClubId}. Error: ${recoveryResult.error}`
        );
        return {
          success: false,
          error: 'Failed to join new club and could not re-join previous club. Please try joining a club manually.',
        };
      }
      return joinResult;
    }

    console.log(`${TAG} Successfully switched to club ${newClubId}`);
    return joinResult;
  }

  /** Get all members of a club. Cached for 5 minutes. */
  static async getClubMembers(clubId: string): Promise<ClubMembership[]> {
    if (!isSupabaseConfigured()) return [];

    // Check in-memory cache
    const memCached = membersCache.get(clubId);
    if (memCached && Date.now() - memCached.timestamp < MEMBERS_TTL) {
      return memCached.members;
    }

    // Check AsyncStorage cache
    const cacheKey = `${MEMBERS_CACHE_KEY_PREFIX}${clubId}`;
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        let parsed;
        try { parsed = JSON.parse(cached); } catch {
          await AsyncStorage.removeItem(cacheKey);
          parsed = null;
        }
        if (parsed && Date.now() - parsed.timestamp < MEMBERS_TTL) {
          const members = parsed.data as ClubMembership[];
          membersCache.set(clubId, { members, timestamp: parsed.timestamp });
          return members;
        }
      }
    } catch { /* continue to fetch */ }

    try {
      const { data, error } = await supabase!
        .from('club_memberships')
        .select('*')
        .eq('club_id', clubId)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error(`${TAG} getClubMembers error for ${clubId}:`, error);
        return [];
      }

      const members = (data || []) as ClubMembership[];
      const now = Date.now();
      membersCache.set(clubId, { members, timestamp: now });
      try {
        await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: members, timestamp: now }));
      } catch { /* non-critical */ }

      return members;
    } catch (err) {
      console.error(`${TAG} getClubMembers exception for ${clubId}:`, err);
      return [];
    }
  }

  /** Quick check if a user is a member of a specific club. */
  static async isMember(clubId: string, npub: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    try {
      const cachedId = await AsyncStorage.getItem(CLUB_ID_KEY);
      if (cachedId === clubId) return true;
      if (cachedId && cachedId !== clubId) return false;
    } catch { /* fall through to DB */ }

    try {
      const { data, error } = await supabase!
        .from('club_memberships')
        .select('id')
        .eq('club_id', clubId)
        .eq('member_npub', npub)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return false;
        console.error(`${TAG} isMember error:`, error);
        return false;
      }
      return !!data;
    } catch (err) {
      console.error(`${TAG} isMember exception:`, err);
      return false;
    }
  }

  /** Clear all club membership caches (AsyncStorage and in-memory). */
  static async clearCache(): Promise<void> {
    try {
      await this.clearLocalClubState();
      membersCache.clear();
      const allKeys = await AsyncStorage.getAllKeys();
      const memberKeys = allKeys.filter((k) => k.startsWith(MEMBERS_CACHE_KEY_PREFIX));
      if (memberKeys.length > 0) await AsyncStorage.multiRemove(memberKeys);
    } catch { /* non-critical */ }
  }

  /** Remove a member from a club. Caller must be the club captain. */
  static async removeMember(
    clubId: string,
    memberNpub: string,
    callerNpub: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Backend not configured' };
    }

    try {
      // Verify caller is the captain of this club
      const { data: callerMembership, error: authError } = await supabase!
        .from('club_memberships')
        .select('role')
        .eq('club_id', clubId)
        .eq('member_npub', callerNpub)
        .single();

      if (authError || !callerMembership || callerMembership.role !== 'captain') {
        console.warn(`${TAG} removeMember unauthorized: ${callerNpub.slice(0, 12)}... is not captain of ${clubId}`);
        return { success: false, error: 'Only the club captain can remove members' };
      }

      const { error: deleteError } = await supabase!
        .from('club_memberships')
        .delete()
        .eq('club_id', clubId)
        .eq('member_npub', memberNpub);

      if (deleteError) {
        console.error(`${TAG} removeMember delete error:`, deleteError);
        return { success: false, error: deleteError.message };
      }

      await this.decrementMemberCount(clubId, false);
      this.invalidateMembersCache(clubId);

      console.log(`${TAG} Removed member ${memberNpub.slice(0, 12)}... from club ${clubId}`);
      return { success: true };
    } catch (err) {
      console.error(`${TAG} removeMember exception:`, err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * Transfer captainship to another member. Validates target before proceeding.
   *
   * Operation order is intentionally promote-first for safety:
   *  1. Promote new captain (briefly 2 captains — safe)
   *  2. Demote old captain(s) (back to exactly 1 captain)
   *  3. Update user_teams.created_by_npub (non-fatal)
   *
   * If step 2 fails after step 1, the club has 2 captains (recoverable).
   * The old order (demote-then-promote) risked leaving 0 captains (unrecoverable).
   */
  static async transferCaptainship(
    clubId: string,
    newCaptainNpub: string,
    callerNpub: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Backend not configured' };
    }

    try {
      // Verify caller is the captain of this club
      const { data: callerMembership, error: authError } = await supabase!
        .from('club_memberships')
        .select('role')
        .eq('club_id', clubId)
        .eq('member_npub', callerNpub)
        .single();

      if (authError || !callerMembership || callerMembership.role !== 'captain') {
        console.warn(`${TAG} transferCaptainship unauthorized: ${callerNpub.slice(0, 12)}... is not captain of ${clubId}`);
        return { success: false, error: 'Only the club captain can transfer captainship' };
      }

      // Validate target is a member of this club
      const { data: targetMembership, error: targetErr } = await supabase!
        .from('club_memberships')
        .select('role')
        .eq('club_id', clubId)
        .eq('member_npub', newCaptainNpub)
        .single();

      if (targetErr || !targetMembership) {
        return { success: false, error: 'Target user is not a member of this club' };
      }

      if (targetMembership.role === 'captain') {
        return { success: false, error: 'Target user is already a captain' };
      }

      // Step 1: Promote new captain FIRST (safe: briefly 2 captains)
      const { error: promoteError } = await supabase!
        .from('club_memberships')
        .update({ role: 'captain' })
        .eq('club_id', clubId)
        .eq('member_npub', newCaptainNpub);

      if (promoteError) {
        console.error(`${TAG} transferCaptainship promote error:`, promoteError);
        return { success: false, error: promoteError.message };
      }

      // Step 2: Demote old captain(s) to member (exclude the newly promoted captain)
      const { error: demoteError } = await supabase!
        .from('club_memberships')
        .update({ role: 'member' })
        .eq('club_id', clubId)
        .eq('role', 'captain')
        .neq('member_npub', newCaptainNpub);

      if (demoteError) {
        console.error(`${TAG} transferCaptainship demote error:`, demoteError);
        console.warn(
          `${TAG} Club ${clubId} may have multiple captains. ` +
          `New captain ${newCaptainNpub.slice(0, 12)}... was promoted but old captain demotion failed.`
        );
        // Don't return failure — the new captain IS promoted, club is functional
        // with 2 captains (better than 0). Log for manual cleanup if needed.
      }

      // Step 3: Update user_teams.created_by_npub (non-fatal if this fails)
      const { error: teamUpdateError } = await supabase!
        .from('user_teams')
        .update({ created_by_npub: newCaptainNpub })
        .eq('id', clubId);

      if (teamUpdateError) {
        console.warn(`${TAG} transferCaptainship team update error:`, teamUpdateError);
      }

      try { await AsyncStorage.setItem(CLUB_ROLE_KEY, 'member'); } catch { /* non-critical */ }
      this.invalidateMembersCache(clubId);

      console.log(`${TAG} Captainship transferred to ${newCaptainNpub.slice(0, 12)}... in club ${clubId}`);
      return { success: true };
    } catch (err) {
      console.error(`${TAG} transferCaptainship exception:`, err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  // --- Private Helpers ---

  /** Clear club-related AsyncStorage keys (including reconciliation timestamp) */
  private static async clearLocalClubState(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([CLUB_ID_KEY, CLUB_NAME_KEY, CLUB_ROLE_KEY, RECONCILIATION_KEY]);
    } catch { /* non-critical */ }
  }

  /** Check whether we need to re-verify membership against Supabase */
  private static async needsReconciliation(): Promise<boolean> {
    try {
      const lastReconciled = await AsyncStorage.getItem(RECONCILIATION_KEY);
      if (!lastReconciled) return true; // Never reconciled
      const elapsed = Date.now() - parseInt(lastReconciled, 10);
      return elapsed >= RECONCILIATION_TTL;
    } catch {
      return true; // If we can't read the timestamp, reconcile to be safe
    }
  }

  /** Record that we successfully verified membership */
  private static async markReconciled(): Promise<void> {
    try {
      await AsyncStorage.setItem(RECONCILIATION_KEY, Date.now().toString());
    } catch { /* non-critical */ }
  }

  /** Cache club ID, name, and role in AsyncStorage */
  private static async cacheClubState(
    clubId: string,
    name?: string,
    role?: string
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(CLUB_ID_KEY, clubId);
      if (name !== undefined) await AsyncStorage.setItem(CLUB_NAME_KEY, name);
      if (role) await AsyncStorage.setItem(CLUB_ROLE_KEY, role);
    } catch { /* non-critical */ }
  }

  /** Invalidate members cache for a club (both in-memory and AsyncStorage) */
  private static invalidateMembersCache(clubId: string): void {
    membersCache.delete(clubId);
    AsyncStorage.removeItem(`${MEMBERS_CACHE_KEY_PREFIX}${clubId}`).catch(() => {});
  }

  /** Decrement member_count on user_teams. Deactivate club if sole captain left. */
  private static async decrementMemberCount(clubId: string, deactivateIfEmpty: boolean): Promise<void> {
    try {
      const { data } = await supabase!.from('user_teams').select('member_count').eq('id', clubId).single();
      if (!data) return;
      const newCount = Math.max(0, (data.member_count || 1) - 1);
      const payload: { member_count: number; is_active?: boolean } = { member_count: newCount };
      if (deactivateIfEmpty && newCount === 0) {
        payload.is_active = false;
        console.log(`${TAG} Deactivating club ${clubId} (no members remain)`);
      }
      await supabase!.from('user_teams').update(payload).eq('id', clubId);
    } catch (err) {
      console.warn(`${TAG} Failed to update member_count for ${clubId}:`, err);
    }
  }
}

export default ClubMembershipService;
