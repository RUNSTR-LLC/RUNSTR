/**
 * TeamMembershipService - Two-Tier Membership System
 * Handles local-first team joining with eventual Nostr consistency
 * Local membership for instant UX + official list membership via captain approval
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Event } from 'nostr-tools';
import { NostrRelayManager, nostrRelayManager } from '../nostr/NostrRelayManager';
import { NostrListService } from '../nostr/NostrListService';
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
  private static instance: TeamMembershipService;

  // Storage keys
  private readonly LOCAL_MEMBERSHIPS_KEY = 'runstr:localMemberships';
  private readonly JOIN_REQUESTS_KEY = 'runstr:joinRequests';

  constructor(relayManager?: NostrRelayManager) {
    this.relayManager = relayManager || nostrRelayManager;
    this.listService = NostrListService.getInstance(this.relayManager);
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
  // JOIN REQUEST MANAGEMENT (Kind 33406)
  // ================================================================================

  /**
   * Prepare join request event (Kind 33406) - requires external signing
   */
  prepareJoinRequest(
    teamId: string,
    teamCaptainPubkey: string,
    userPubkey: string,
    message?: string
  ) {
    console.log(`📝 Preparing join request for team: ${teamId}`);

    // Create team 'a' tag reference (assuming team is kind 33404)
    const teamATag = `33404:${teamCaptainPubkey}:${teamId}`;

    const tags: string[][] = [
      ['a', teamATag], // Reference to the team event
      ['p', teamCaptainPubkey], // Notify team captain
      ['t', 'team-join'], // Tag for easy discovery
      ['team_id', teamId], // Custom tag for team identification
    ];

    const eventTemplate = {
      kind: 33406,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content: message || 'Request to join team',
      pubkey: userPubkey,
    };

    console.log(`✅ Prepared join request template for team: ${teamId}`);
    return eventTemplate;
  }

  /**
   * Get join requests for a team (captain view)
   */
  async getTeamJoinRequests(
    teamId: string,
    captainPubkey: string
  ): Promise<JoinRequest[]> {
    console.log(`🔍 Fetching join requests for team: ${teamId}`);

    try {
      const teamATag = `33404:${captainPubkey}:${teamId}`;

      const filters: NostrFilter[] = [
        {
          kinds: [33406],
          '#a': [teamATag], // Join requests for this team
          since: Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60, // Last 7 days
          limit: 50,
        },
      ];

      const joinRequests: JoinRequest[] = [];
      const processedIds = new Set<string>();

      const subscriptionId = await this.relayManager.subscribeToEvents(
        filters,
        (event: Event, relayUrl: string) => {
          if (processedIds.has(event.id)) return;
          processedIds.add(event.id);

          console.log(`📥 Join request received from ${relayUrl}:`, event.id);

          try {
            const joinRequest = this.parseJoinRequest(event, teamId);
            if (joinRequest) {
              joinRequests.push(joinRequest);
              console.log(
                `✅ Parsed join request from: ${joinRequest.requesterPubkey}`
              );
            }
          } catch (error) {
            console.warn(`⚠️ Failed to parse join request ${event.id}:`, error);
          }
        }
      );

      // Wait for initial results
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Clean up subscription
      this.relayManager.unsubscribe(subscriptionId);

      // Sort by newest first
      joinRequests.sort((a, b) => b.requestedAt - a.requestedAt);

      console.log(
        `✅ Found ${joinRequests.length} join requests for team: ${teamId}`
      );
      return joinRequests;
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
   */
  async subscribeToJoinRequests(
    teamId: string,
    captainPubkey: string,
    callback: (joinRequest: JoinRequest) => void
  ): Promise<string> {
    console.log(`🔔 Subscribing to join requests for team: ${teamId}`);

    const teamATag = `33404:${captainPubkey}:${teamId}`;

    const filters: NostrFilter[] = [
      {
        kinds: [33406],
        '#a': [teamATag],
        since: Math.floor(Date.now() / 1000), // Only new requests from now
      },
    ];

    const subscriptionId = await this.relayManager.subscribeToEvents(
      filters,
      (event: Event, relayUrl: string) => {
        console.log(`🔔 New join request from ${relayUrl}:`, event.id);

        try {
          const joinRequest = this.parseJoinRequest(event, teamId);
          if (joinRequest) {
            callback(joinRequest);
            console.log(`✅ New join request: ${joinRequest.requesterPubkey}`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to parse join request ${event.id}:`, error);
        }
      }
    );

    return subscriptionId;
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
   * Check if user is in team's official list
   */
  async isOfficialMember(
    userPubkey: string,
    teamId: string,
    captainPubkey: string
  ): Promise<boolean> {
    return await this.listService.isInList(captainPubkey, teamId, userPubkey);
  }

  // ================================================================================
  // UTILITIES
  // ================================================================================

  /**
   * Parse join request event into our format
   */
  private parseJoinRequest(
    event: Event,
    expectedTeamId: string
  ): JoinRequest | null {
    try {
      const teamIdTag = event.tags.find((t) => t[0] === 'team_id')?.[1];

      // Verify this is for the expected team
      if (teamIdTag !== expectedTeamId) {
        return null;
      }

      // Extract team name from the event (might be in content or we'll resolve later)
      const teamName =
        event.tags.find((t) => t[0] === 'team_name')?.[1] || 'Unknown Team';

      return {
        id: event.id,
        teamId: expectedTeamId,
        teamName,
        requesterPubkey: event.pubkey,
        requestedAt: event.created_at,
        message: event.content,
        nostrEvent: event,
      };
    } catch (error) {
      console.error('Failed to parse join request:', error);
      return null;
    }
  }

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
   */
  async getCurrentTeam(userPubkey: string): Promise<LocalMembership | null> {
    const memberships = await this.getLocalMemberships(userPubkey);
    return memberships[0] || null; // For now, support single team membership
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
