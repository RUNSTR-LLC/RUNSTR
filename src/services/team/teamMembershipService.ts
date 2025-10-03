/**
 * TeamMembershipService - Two-Tier Membership System
 * Handles local-first team joining with eventual Nostr consistency
 * Local membership for instant UX + official kind 30000 list membership via captain approval
 * Integrates with TeamJoinRequestService for complete join workflow
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Event } from 'nostr-tools';
import {
  NostrRelayManager,
  nostrRelayManager,
} from '../nostr/NostrRelayManager';
import { NostrListService } from '../nostr/NostrListService';
import { TeamJoinRequestService } from './TeamJoinRequestService';
import type { NostrFilter } from '../nostr/NostrProtocolHandler';

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

export class TeamMembershipService {
  private relayManager: NostrRelayManager;
  private listService: NostrListService;
  private joinRequestService: TeamJoinRequestService;
  private static instance: TeamMembershipService;

  // Storage keys
  private readonly LOCAL_MEMBERSHIPS_KEY = 'runstr:localMemberships';

  constructor(relayManager?: NostrRelayManager) {
    this.relayManager = relayManager || nostrRelayManager;
    this.listService = NostrListService.getInstance(this.relayManager);
    this.joinRequestService = TeamJoinRequestService.getInstance(
      this.relayManager
    );
  }

  static getInstance(relayManager?: NostrRelayManager): TeamMembershipService {
    if (!TeamMembershipService.instance) {
      TeamMembershipService.instance = new TeamMembershipService(relayManager);
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
      // Check if already a local member
      const existingMembership = await this.getLocalMembership(
        userPubkey,
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

      // Store locally
      const memberships = await this.getLocalMemberships(userPubkey);
      memberships.push(membership);

      await AsyncStorage.setItem(
        `${this.LOCAL_MEMBERSHIPS_KEY}:${userPubkey}`,
        JSON.stringify(memberships)
      );

      console.log(`✅ Local membership created for team: ${teamName}`);
      return true;
    } catch (error) {
      console.error('Failed to join team locally:', error);
      return false;
    }
  }

  /**
   * Get user's local memberships
   */
  async getLocalMemberships(userPubkey: string): Promise<LocalMembership[]> {
    try {
      const stored = await AsyncStorage.getItem(
        `${this.LOCAL_MEMBERSHIPS_KEY}:${userPubkey}`
      );
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

      await AsyncStorage.setItem(
        `${this.LOCAL_MEMBERSHIPS_KEY}:${userPubkey}`,
        JSON.stringify(memberships)
      );

      console.log(`📝 Updated local membership status: ${teamId} -> ${status}`);
    }
  }

  // ================================================================================
  // JOIN REQUEST MANAGEMENT (Kind 1104 via TeamJoinRequestService)
  // ================================================================================

  /**
   * Prepare join request event (Kind 1104) - requires external signing
   * Uses TeamJoinRequestService for consistent request handling
   */
  prepareJoinRequest(
    teamId: string,
    teamName: string,
    teamCaptainPubkey: string,
    userPubkey: string,
    message?: string
  ) {
    console.log(`📝 Preparing join request for team: ${teamName} (${teamId})`);

    return this.joinRequestService.prepareJoinRequest(
      {
        teamId,
        teamName,
        captainPubkey: teamCaptainPubkey,
        message: message || 'Request to join team',
      },
      userPubkey
    );
  }

  /**
   * Get join requests for a team (captain view)
   * Delegates to TeamJoinRequestService for consistent handling
   */
  async getTeamJoinRequests(teamId: string): Promise<JoinRequest[]> {
    console.log(`🔍 Fetching join requests for team: ${teamId}`);

    try {
      const requests = await this.joinRequestService.getTeamJoinRequests(
        teamId
      );

      // Convert TeamJoinRequest to JoinRequest format
      return requests.map((req) => ({
        id: req.id,
        teamId: req.teamId,
        teamName: req.teamName,
        requesterPubkey: req.requesterId,
        requesterName: req.requesterName,
        requestedAt: req.timestamp,
        message: req.message,
        nostrEvent: req.nostrEvent,
      }));
    } catch (error) {
      console.error(
        `❌ Failed to fetch join requests for team ${teamId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Subscribe to real-time join requests (for captain dashboard)
   * Delegates to TeamJoinRequestService for consistent handling
   */
  async subscribeToJoinRequests(
    captainPubkey: string,
    callback: (joinRequest: JoinRequest) => void
  ): Promise<string> {
    console.log(
      `🔔 Subscribing to join requests for captain: ${captainPubkey}`
    );

    return this.joinRequestService.subscribeToJoinRequests(
      captainPubkey,
      (teamJoinRequest) => {
        // Convert TeamJoinRequest to JoinRequest format
        const joinRequest: JoinRequest = {
          id: teamJoinRequest.id,
          teamId: teamJoinRequest.teamId,
          teamName: teamJoinRequest.teamName,
          requesterPubkey: teamJoinRequest.requesterId,
          requesterName: teamJoinRequest.requesterName,
          requestedAt: teamJoinRequest.timestamp,
          message: teamJoinRequest.message,
          nostrEvent: teamJoinRequest.nostrEvent,
        };
        callback(joinRequest);
      }
    );
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
    captainPubkey: string
  ): Promise<MembershipStatus> {
    console.log(`🔍 Checking membership status: ${userPubkey} in ${teamId}`);

    // Check local membership
    const localMembership = await this.getLocalMembership(userPubkey, teamId);

    // Check official membership (from Nostr list)
    const isOfficialMember = await this.listService.isInList(
      captainPubkey,
      teamId,
      userPubkey
    );

    return {
      isLocalMember: !!localMembership,
      isOfficialMember,
      hasRequestPending: localMembership?.status === 'requested',
      joinedAt: localMembership?.joinedAt,
      requestEventId: localMembership?.requestEventId,
    };
  }

  /**
   * Check if user is in team's official kind 30000 list
   * Uses dTag pattern: ${teamId}-members for team membership lists
   */
  async isOfficialMember(
    userPubkey: string,
    teamId: string,
    captainPubkey: string
  ): Promise<boolean> {
    const memberListDTag = `${teamId}-members`;
    return await this.listService.isInList(
      captainPubkey,
      memberListDTag,
      userPubkey
    );
  }

  // ================================================================================
  // TEAM MEMBER LIST MANAGEMENT (Kind 30000)
  // ================================================================================

  /**
   * Prepare team member list creation (Kind 30000) - requires external signing
   * Creates initial empty member list for a team
   */
  prepareMemberListCreation(
    teamId: string,
    teamName: string,
    captainPubkey: string,
    initialMembers: string[] = []
  ) {
    console.log(`📝 Preparing member list creation for team: ${teamName}`);

    const memberListDTag = `${teamId}-members`;

    return this.listService.prepareListCreation(
      {
        name: `${teamName} Members`,
        description: `Official member list for team: ${teamName}`,
        members: [captainPubkey, ...initialMembers], // Captain is always included
        dTag: memberListDTag,
        listType: 'people', // Kind 30000 for people lists
      },
      captainPubkey
    );
  }

  /**
   * Get team members from official kind 30000 list
   */
  async getTeamMembers(
    teamId: string,
    captainPubkey: string
  ): Promise<string[]> {
    const memberListDTag = `${teamId}-members`;
    return await this.listService.getListMembers(captainPubkey, memberListDTag);
  }

  /**
   * Get team member list stats
   */
  async getTeamMemberStats(
    teamId: string,
    captainPubkey: string
  ): Promise<{
    memberCount: number;
    lastUpdated: number;
    age: number;
  } | null> {
    const memberListDTag = `${teamId}-members`;
    return await this.listService.getListStats(captainPubkey, memberListDTag);
  }

  // ================================================================================
  // UTILITIES
  // ================================================================================

  /**
   * Clear local memberships (useful for testing)
   */
  async clearLocalMemberships(userPubkey: string): Promise<void> {
    await AsyncStorage.removeItem(
      `${this.LOCAL_MEMBERSHIPS_KEY}:${userPubkey}`
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
      const primaryTeamId = await AsyncStorage.getItem(
        `runstr:primaryTeamId:${userPubkey}`
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

      await AsyncStorage.setItem(`runstr:primaryTeamId:${userPubkey}`, teamId);

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

      await AsyncStorage.setItem(
        `${this.LOCAL_MEMBERSHIPS_KEY}:${userPubkey}`,
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
