/**
 * TeamMembershipService - Local Team Membership Management
 * Handles local-first team joining using AsyncStorage
 * Team data now comes from Supabase clubs
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Event } from 'nostr-tools';
import { normalizeUserKeyForStorage } from '../../utils/nostr';

export interface LocalMembership {
  teamId: string;
  teamName: string;
  captainPubkey: string;
  joinedAt: number;
  status: 'local' | 'requested' | 'official'; // Progression through membership tiers
  requestEventId?: string;
}

export interface JoinRequest {
  id: string;
  teamId: string;
  teamName: string;
  requesterPubkey: string;
  requesterName?: string;
  requestedAt: number;
  message?: string;
  nostrEvent: Event;
}

export interface MembershipStatus {
  isLocalMember: boolean;
  isOfficialMember: boolean;
  hasRequestPending: boolean;
  joinedAt?: number;
  requestEventId?: string;
}

export interface TeamSwitchResult {
  success: boolean;
  error?: string;
  cooldownUntil?: string;
}

export class TeamMembershipService {
  private static instance: TeamMembershipService;

  // Storage keys
  private readonly LOCAL_MEMBERSHIPS_KEY = 'runstr:localMemberships';

  constructor() {}

  static getInstance(): TeamMembershipService {
    if (!TeamMembershipService.instance) {
      TeamMembershipService.instance = new TeamMembershipService();
    }
    return TeamMembershipService.instance;
  }

  // ================================================================================
  // LOCAL MEMBERSHIP MANAGEMENT
  // ================================================================================

  /**
   * Join team locally (instant UX, no Nostr operations)
   */
  async joinTeamLocally(
    teamId: string,
    teamName: string,
    captainPubkey: string,
    userPubkey: string
  ): Promise<boolean> {
    console.log(`🏃‍♂️ Joining team locally: ${teamName} (${teamId})`);

    try {
      // CRITICAL: Normalize pubkey to npub format for consistent storage keys
      const normalizedKey = normalizeUserKeyForStorage(userPubkey);
      if (!normalizedKey) {
        console.error('Failed to normalize user pubkey for storage');
        return false;
      }

      // Check if already a local member
      const existingMembership = await this.getLocalMembership(
        normalizedKey,
        teamId
      );
      if (existingMembership) {
        console.log('Already a local member of this team');
        return true;
      }

      // Create local membership
      const membership: LocalMembership = {
        teamId,
        teamName,
        captainPubkey,
        joinedAt: Math.floor(Date.now() / 1000),
        status: 'local',
      };

      // Store locally with normalized key
      const memberships = await this.getLocalMemberships(normalizedKey);
      memberships.push(membership);

      await AsyncStorage.setItem(
        `${this.LOCAL_MEMBERSHIPS_KEY}:${normalizedKey}`,
        JSON.stringify(memberships)
      );

      console.log(
        `✅ Local membership created for team: ${teamName} (key: ${normalizedKey.slice(
          0,
          20
        )}...)`
      );
      return true;
    } catch (error) {
      console.error('Failed to join team locally:', error);
      return false;
    }
  }

  /**
   * Get user's local memberships
   * Includes fallback check for old hex-based storage keys
   */
  async getLocalMemberships(userPubkey: string): Promise<LocalMembership[]> {
    try {
      // CRITICAL: Normalize pubkey to npub format for consistent storage keys
      const normalizedKey = normalizeUserKeyForStorage(userPubkey);
      if (!normalizedKey) {
        console.error('Failed to normalize user pubkey for retrieval');
        return [];
      }

      // Try npub key first (new format)
      let stored = await AsyncStorage.getItem(
        `${this.LOCAL_MEMBERSHIPS_KEY}:${normalizedKey}`
      );

      // FALLBACK: Check hex key for old data (backward compatibility)
      if (
        !stored &&
        userPubkey.length === 64 &&
        /^[0-9a-fA-F]+$/.test(userPubkey)
      ) {
        console.log(
          '🔄 No data at npub key, checking hex key for old team data...'
        );
        stored = await AsyncStorage.getItem(
          `${this.LOCAL_MEMBERSHIPS_KEY}:${userPubkey}`
        );
        if (stored) {
          console.log('✅ Found team data at old hex key, will use it');
        }
      }

      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get local memberships:', error);
      return [];
    }
  }

  /**
   * Get specific local membership
   */
  async getLocalMembership(
    userPubkey: string,
    teamId: string
  ): Promise<LocalMembership | null> {
    const memberships = await this.getLocalMemberships(userPubkey);
    return memberships.find((m) => m.teamId === teamId) || null;
  }

  /**
   * Update local membership status
   */
  async updateLocalMembershipStatus(
    userPubkey: string,
    teamId: string,
    status: 'local' | 'requested' | 'official',
    requestEventId?: string
  ): Promise<void> {
    const memberships = await this.getLocalMemberships(userPubkey);
    const membershipIndex = memberships.findIndex((m) => m.teamId === teamId);

    if (membershipIndex >= 0) {
      memberships[membershipIndex].status = status;
      if (requestEventId) {
        memberships[membershipIndex].requestEventId = requestEventId;
      }

      // CRITICAL: Normalize pubkey for consistent storage
      const normalizedKey = normalizeUserKeyForStorage(userPubkey);
      if (!normalizedKey) {
        console.error('Failed to normalize user pubkey for update');
        return;
      }

      await AsyncStorage.setItem(
        `${this.LOCAL_MEMBERSHIPS_KEY}:${normalizedKey}`,
        JSON.stringify(memberships)
      );

      console.log(`📝 Updated local membership status: ${teamId} -> ${status}`);
    }
  }

  // ================================================================================
  // JOIN REQUEST MANAGEMENT (now handled via Supabase)
  // ================================================================================

  /**
   * Prepare join request event — now a no-op (join handled via Supabase)
   */
  prepareJoinRequest(
    _teamId: string,
    _teamName: string,
    _teamCaptainPubkey: string,
    _userPubkey: string,
    _message?: string
  ) {
    console.log('Join requests now handled via Supabase clubs');
    return null;
  }

  // ================================================================================
  // MEMBERSHIP STATUS QUERIES
  // ================================================================================

  /**
   * Get comprehensive membership status for a user and team
   */
  async getMembershipStatus(
    userPubkey: string,
    teamId: string,
    _captainPubkey: string
  ): Promise<MembershipStatus> {
    const localMembership = await this.getLocalMembership(userPubkey, teamId);

    return {
      isLocalMember: !!localMembership,
      isOfficialMember: !!localMembership,
      hasRequestPending: localMembership?.status === 'requested',
      joinedAt: localMembership?.joinedAt,
      requestEventId: localMembership?.requestEventId,
    };
  }

  /**
   * Check if user is a team member (via Supabase clubs)
   */
  async isOfficialMember(
    _userPubkey: string,
    _teamId: string,
    _captainPubkey: string
  ): Promise<boolean> {
    // Official membership now checked via ClubMembershipService
    return false;
  }

  /**
   * Get team members via Supabase
   */
  async getTeamMembers(
    teamId: string,
    _captainPubkey: string
  ): Promise<string[]> {
    try {
      const { ClubMembershipService } = await import('../backend/ClubMembershipService');
      const members = await ClubMembershipService.getClubMembers(teamId);
      return members.map((m) => m.member_npub);
    } catch (error) {
      console.error('Failed to get team members:', error);
      return [];
    }
  }

  // ================================================================================
  // UTILITIES
  // ================================================================================

  /**
   * Clear local memberships (useful for testing)
   */
  async clearLocalMemberships(userPubkey: string): Promise<void> {
    // CRITICAL: Normalize pubkey for consistent storage
    const normalizedKey = normalizeUserKeyForStorage(userPubkey);
    if (!normalizedKey) {
      console.error('Failed to normalize user pubkey for clearing');
      return;
    }

    await AsyncStorage.removeItem(
      `${this.LOCAL_MEMBERSHIPS_KEY}:${normalizedKey}`
    );
    console.log('🧹 Cleared local memberships');
  }

  /**
   * Get user's current team (first local membership)
   * @deprecated Use getPrimaryTeam() for multi-team support
   */
  async getCurrentTeam(userPubkey: string): Promise<LocalMembership | null> {
    const memberships = await this.getLocalMemberships(userPubkey);
    return memberships[0] || null; // For now, support single team membership
  }

  /**
   * Get all teams user is a member of
   */
  async getAllTeams(userPubkey: string): Promise<LocalMembership[]> {
    return await this.getLocalMemberships(userPubkey);
  }

  /**
   * Get user's primary team (designated favorite or first team)
   */
  async getPrimaryTeam(userPubkey: string): Promise<LocalMembership | null> {
    const memberships = await this.getLocalMemberships(userPubkey);
    if (memberships.length === 0) return null;

    // Check if user has set a primary team preference
    try {
      // CRITICAL: Normalize pubkey for consistent storage
      const normalizedKey = normalizeUserKeyForStorage(userPubkey);
      if (!normalizedKey) {
        return memberships[0]; // Fallback to first team
      }

      const primaryTeamId = await AsyncStorage.getItem(
        `runstr:primaryTeamId:${normalizedKey}`
      );

      if (primaryTeamId) {
        const primaryTeam = memberships.find((m) => m.teamId === primaryTeamId);
        if (primaryTeam) return primaryTeam;
      }
    } catch (error) {
      console.error('Failed to get primary team preference:', error);
    }

    // Fallback to first team
    return memberships[0];
  }

  /**
   * Set user's primary team (designated favorite)
   */
  async setPrimaryTeam(userPubkey: string, teamId: string): Promise<boolean> {
    try {
      // Verify user is actually a member of this team
      const memberships = await this.getLocalMemberships(userPubkey);
      const isMember = memberships.some((m) => m.teamId === teamId);

      if (!isMember) {
        console.error('Cannot set primary team: User is not a member');
        return false;
      }

      // CRITICAL: Normalize pubkey for consistent storage
      const normalizedKey = normalizeUserKeyForStorage(userPubkey);
      if (!normalizedKey) {
        console.error(
          'Failed to normalize user pubkey for setting primary team'
        );
        return false;
      }

      await AsyncStorage.setItem(
        `runstr:primaryTeamId:${normalizedKey}`,
        teamId
      );

      console.log(`⭐ Set primary team: ${teamId}`);
      return true;
    } catch (error) {
      console.error('Failed to set primary team:', error);
      return false;
    }
  }

  /**
   * Leave team locally (remove from local storage)
   */
  async leaveTeamLocally(userPubkey: string, teamId: string): Promise<boolean> {
    try {
      const memberships = await this.getLocalMemberships(userPubkey);
      const filteredMemberships = memberships.filter(
        (m) => m.teamId !== teamId
      );

      // CRITICAL: Normalize pubkey for consistent storage
      const normalizedKey = normalizeUserKeyForStorage(userPubkey);
      if (!normalizedKey) {
        console.error('Failed to normalize user pubkey for leaving team');
        return false;
      }

      await AsyncStorage.setItem(
        `${this.LOCAL_MEMBERSHIPS_KEY}:${normalizedKey}`,
        JSON.stringify(filteredMemberships)
      );

      console.log(`🚪 Left team locally: ${teamId}`);
      return true;
    } catch (error) {
      console.error('Failed to leave team locally:', error);
      return false;
    }
  }
}

export default TeamMembershipService.getInstance();
