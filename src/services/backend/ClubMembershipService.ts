/**
 * ClubMembershipService - Manages club membership operations
 * Users can belong to ONE club at a time (enforced by UNIQUE index on member_npub).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';
import { Club, ClubMembership, ClubJoinResult } from '../../types/club';
import { callEdgeFunction } from '../../utils/edgeFunctions';

const TAG = '[ClubMembershipService]';
const CLUB_ID_KEY = '@runstr:club_id';
const CLUB_NAME_KEY = '@runstr:club_name';
const CLUB_ROLE_KEY = '@runstr:club_role';
const MEMBERS_CACHE_KEY_PREFIX = '@runstr:club_members_';
const MEMBERS_TTL = 5 * 60 * 1000; // 5 minutes
const membersCache = new Map<string, { members: ClubMembership[]; timestamp: number }>();
const UNIQUE_VIOLATION_CODE = '23505';
const COOLDOWN_DAYS = 7;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

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

  /** Join a club via Edge Function. Fails if user is already in a club. */
  static async joinClub(
    clubId: string,
    npub: string,
  ): Promise<ClubJoinResult> {
    const result = await callEdgeFunction<{ club?: Club }>('manage-club', {
      action: 'join',
      npub,
      club_id: clubId,
    });

    if (!result.success) {
      console.error(`${TAG} joinClub error:`, result.error);
      return { success: false, error: result.error };
    }

    // Cache club state locally
    const club = result.data?.club;
    if (club) {
      await this.cacheClubState(clubId, club.name || '', 'member');
      console.log(`${TAG} Joined club "${club.name}" as member`);
      return { success: true, club };
    }

    await this.cacheClubState(clubId, undefined, 'member');
    console.log(`${TAG} Joined club ${clubId} as member`);
    return { success: true };
  }

  /**
   * Check 7-day cooldown for club switching. Returns whether the user can leave
   * and a human-readable remaining time string. Captains are exempt.
   * Fails open: returns canLeave=true on any error so users aren't locked out.
   */
  static async getCooldownRemaining(
    npub: string
  ): Promise<{ canLeave: boolean; remainingText: string }> {
    const CAN_LEAVE = { canLeave: true, remainingText: '' };

    if (!isSupabaseConfigured()) return CAN_LEAVE;

    try {
      const { data: membership, error } = await supabase!
        .from('club_memberships')
        .select('joined_at, role')
        .eq('member_npub', npub)
        .single();

      if (error || !membership) return CAN_LEAVE;

      // Captains are exempt from cooldown
      if (membership.role === 'captain') return CAN_LEAVE;

      const joinedAt = new Date(membership.joined_at).getTime();
      const cooldownEnd = joinedAt + COOLDOWN_MS;
      const now = Date.now();

      if (now >= cooldownEnd) return CAN_LEAVE;

      // Calculate remaining time
      const remainingMs = cooldownEnd - now;
      const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
      const remainingText =
        remainingDays === 1 ? '1 day' : `${remainingDays} days`;

      return { canLeave: false, remainingText };
    } catch (err) {
      console.warn(`${TAG} getCooldownRemaining error (failing open):`, err);
      return CAN_LEAVE;
    }
  }

  /**
   * Leave the current club via Edge Function.
   * Server enforces captain checks and 7-day cooldown.
   */
  static async leaveClub(npub: string): Promise<{ success: boolean; error?: string }> {
    // Need club_id to send to Edge Function
    let clubId: string | null = null;
    try {
      clubId = await AsyncStorage.getItem(CLUB_ID_KEY);
    } catch { /* ignore */ }

    if (!clubId) {
      // Try to fetch from DB
      if (isSupabaseConfigured()) {
        const { data } = await supabase!
          .from('club_memberships')
          .select('club_id')
          .eq('member_npub', npub)
          .single();
        clubId = data?.club_id || null;
      }
    }

    if (!clubId) {
      await this.clearLocalClubState();
      return { success: false, error: 'Not a member of any club' };
    }

    const result = await callEdgeFunction('manage-club', {
      action: 'leave',
      npub,
      club_id: clubId,
    });

    if (!result.success) {
      console.error(`${TAG} leaveClub error:`, result.error);
      return { success: false, error: result.error };
    }

    await this.clearLocalClubState();
    this.invalidateMembersCache(clubId);
    console.log(`${TAG} Left club ${clubId}`);
    return { success: true };
  }

  /** Switch clubs with recovery. Re-joins original club if join fails. */
  static async switchClub(
    newClubId: string,
    npub: string,
  ): Promise<ClubJoinResult> {
    console.log(`${TAG} Switching to club ${newClubId}...`);

    // Pre-check cooldown before attempting the switch
    const cooldown = await this.getCooldownRemaining(npub);
    if (!cooldown.canLeave) {
      return {
        success: false,
        error: `You must wait ${cooldown.remainingText} before switching clubs. Clubs have a 7-day cooldown to keep teams stable.`,
      };
    }

    // Capture original club ID for recovery
    let originalClubId: string | null = null;
    try {
      originalClubId = await AsyncStorage.getItem(CLUB_ID_KEY);
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
    const joinResult = await this.joinClub(newClubId, npub);
    if (!joinResult.success) {
      console.error(`${TAG} switchClub join failed for ${newClubId}: ${joinResult.error}`);

      // RECOVERY: Attempt to re-join the original club
      if (originalClubId) {
        console.warn(`${TAG} Attempting recovery: re-joining original club ${originalClubId}`);
        const recoveryResult = await this.joinClub(originalClubId, npub);
        if (recoveryResult.success) {
          console.log(`${TAG} Recovery successful: re-joined original club ${originalClubId}`);
          return {
            success: false,
            error: `Failed to join new club: ${joinResult.error}. You have been returned to your previous club.`,
          };
        }
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
        .order('joined_at', { ascending: true })
        .limit(500);

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

  /** Remove a member from a club via Edge Function. Server verifies captain role. */
  static async removeMember(
    clubId: string,
    memberNpub: string,
    callerNpub: string
  ): Promise<{ success: boolean; error?: string }> {
    const result = await callEdgeFunction('manage-club', {
      action: 'remove-member',
      npub: callerNpub,
      club_id: clubId,
      target_npub: memberNpub,
    });

    if (!result.success) {
      console.error(`${TAG} removeMember error:`, result.error);
      return { success: false, error: result.error };
    }

    this.invalidateMembersCache(clubId);
    console.log(`${TAG} Removed member ${memberNpub.slice(0, 12)}... from club ${clubId}`);
    return { success: true };
  }

  /**
   * Transfer captainship to another member via Edge Function.
   * Server handles the promote-first safety pattern.
   */
  static async transferCaptainship(
    clubId: string,
    newCaptainNpub: string,
    callerNpub: string
  ): Promise<{ success: boolean; error?: string }> {
    const result = await callEdgeFunction('manage-club', {
      action: 'transfer-captain',
      npub: callerNpub,
      club_id: clubId,
      target_npub: newCaptainNpub,
    });

    if (!result.success) {
      console.error(`${TAG} transferCaptainship error:`, result.error);
      return { success: false, error: result.error };
    }

    try { await AsyncStorage.setItem(CLUB_ROLE_KEY, 'member'); } catch { /* non-critical */ }
    this.invalidateMembersCache(clubId);

    console.log(`${TAG} Captainship transferred to ${newCaptainNpub.slice(0, 12)}... in club ${clubId}`);
    return { success: true };
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

}

export default ClubMembershipService;
