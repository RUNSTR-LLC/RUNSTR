/**
 * NostrTeamCreationService - Pure Nostr team creation using NDK
 * Creates teams as kind 33404 events with associated kind 30000 member lists
 * Uses NDK for consistency with the rest of the codebase
 */

import NDK, { NDKEvent, NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';
import { NostrListService } from './NostrListService';
import { TeamMemberCache } from '../team/TeamMemberCache';
import { getTeamListDetector } from '../../utils/teamListDetector';
import type { NostrEvent } from '../../types/nostr';

export interface TeamCreationData {
  name: string;
  about: string;
  captainNpub: string;
  captainHexPubkey: string;
  activityType?: string;
  location?: string;
  isPublic?: boolean;
  initialMembers?: string[]; // Optional initial member npubs
}

export interface TeamCreationResult {
  success: boolean;
  teamId?: string;
  teamEvent?: NostrEvent;
  memberListEvent?: NostrEvent;
  error?: string;
}

export class NostrTeamCreationService {
  private static instance: NostrTeamCreationService;
  private ndk: NDK;
  private listService: NostrListService;
  private listDetector = getTeamListDetector();

  // Global NDK instance following established pattern
  private readonly g = globalThis as any;

  private constructor() {
    this.listService = NostrListService.getInstance();
    this.initializeNDK();
  }

  static getInstance(): NostrTeamCreationService {
    if (!NostrTeamCreationService.instance) {
      NostrTeamCreationService.instance = new NostrTeamCreationService();
    }
    return NostrTeamCreationService.instance;
  }

  private initializeNDK(): void {
    // Use global NDK instance if it exists (shared with NdkTeamService)
    if (this.g.__RUNSTR_NDK_INSTANCE__) {
      console.log('[NostrTeamCreation] Reusing existing NDK instance');
      this.ndk = this.g.__RUNSTR_NDK_INSTANCE__;
    } else {
      console.log('[NostrTeamCreation] Creating new NDK instance');
      this.ndk = new NDK({
        explicitRelayUrls: [
          'wss://relay.damus.io',
          'wss://nos.lol',
          'wss://relay.primal.net',
          'wss://nostr.wine',
          'wss://relay.nostr.band',
        ],
      });
      this.g.__RUNSTR_NDK_INSTANCE__ = this.ndk;
      // Connect will happen when needed
    }
  }

  /**
   * Create a new team with both kind 33404 team event and kind 30000 member list
   */
  async createTeam(
    data: TeamCreationData,
    privateKey: string
  ): Promise<TeamCreationResult> {
    try {
      console.log('NostrTeamCreationService: Creating team', data.name);

      // Ensure NDK is connected
      if (!this.ndk.pool?.stats()?.connected) {
        console.log('Connecting NDK...');
        await this.ndk.connect(2000);
      }

      // Create signer from private key
      const signer = new NDKPrivateKeySigner(privateKey);

      // Generate unique team ID
      const teamId = this.generateTeamId(data.name);

      // Step 1: Create kind 33404 team event using NDK
      const teamEvent = new NDKEvent(this.ndk);
      teamEvent.kind = 33404;
      teamEvent.tags = this.prepareTeamTags(teamId, data);
      teamEvent.content = JSON.stringify({
        name: data.name,
        about: data.about,
        captain: data.captainNpub,
        createdAt: Date.now(),
        version: '1.0.0',
      });
      teamEvent.created_at = Math.floor(Date.now() / 1000);

      // Sign the team event
      await teamEvent.sign(signer);

      // Step 2: Create kind 30000 member list with captain as first member
      const members = [data.captainHexPubkey, ...(data.initialMembers || [])];
      const listTags = this.listDetector.prepareListTags(
        teamId,
        data.name,
        members
      );

      const memberListEvent = new NDKEvent(this.ndk);
      memberListEvent.kind = 30000;
      memberListEvent.tags = listTags;
      memberListEvent.content = '';
      memberListEvent.created_at = Math.floor(Date.now() / 1000);

      // Sign the member list event
      await memberListEvent.sign(signer);

      // Step 3: Publish both events to relays using NDK
      console.log('Publishing team event and member list to Nostr relays via NDK');

      const teamPublishResult = await teamEvent.publish();
      const listPublishResult = await memberListEvent.publish();

      if (!teamPublishResult || !listPublishResult) {
        throw new Error('Failed to publish events to relays');
      }

      // Step 4: Cache the member list locally for immediate access
      await TeamMemberCache.getInstance().setTeamMembers(
        teamId,
        data.captainHexPubkey,
        members.map(pubkey => ({ pubkey, npub: pubkey })) // Simplified for now
      );

      // Step 5: Store the list in NostrListService cache
      this.listService.updateCachedList(
        `${teamId}-members`,
        members.map(pubkey => ({
          pubkey,
          addedAt: Math.floor(Date.now() / 1000),
        }))
      );

      console.log('Team created successfully:', teamId);

      return {
        success: true,
        teamId,
        teamEvent: teamEvent.rawEvent() as NostrEvent,
        memberListEvent: memberListEvent.rawEvent() as NostrEvent,
      };
    } catch (error) {
      console.error('NostrTeamCreationService: Error creating team:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create member list for existing team (for teams created before kind 30000 support)
   */
  async createMemberListForExistingTeam(
    teamId: string,
    teamName: string,
    captainHexPubkey: string,
    privateKey: string,
    initialMembers?: string[]
  ): Promise<TeamCreationResult> {
    try {
      // Check if list already exists
      const existingList = await this.listDetector.hasKind30000List(
        teamId,
        captainHexPubkey
      );

      if (existingList) {
        return {
          success: false,
          error: 'Team already has a member list',
        };
      }

      // Ensure NDK is connected
      if (!this.ndk.pool?.stats()?.connected) {
        console.log('Connecting NDK...');
        await this.ndk.connect(2000);
      }

      // Create signer from private key
      const signer = new NDKPrivateKeySigner(privateKey);

      // Create kind 30000 member list
      const members = [captainHexPubkey, ...(initialMembers || [])];
      const listTags = this.listDetector.prepareListTags(
        teamId,
        teamName,
        members
      );

      const memberListEvent = new NDKEvent(this.ndk);
      memberListEvent.kind = 30000;
      memberListEvent.tags = listTags;
      memberListEvent.content = '';
      memberListEvent.created_at = Math.floor(Date.now() / 1000);

      // Sign the event
      await memberListEvent.sign(signer);

      // Publish to relays
      const publishResult = await memberListEvent.publish();

      if (!publishResult) {
        throw new Error('Failed to publish member list to relays');
      }

      // Cache locally
      await TeamMemberCache.getInstance().setTeamMembers(
        teamId,
        captainHexPubkey,
        members.map(pubkey => ({ pubkey, npub: pubkey }))
      );

      console.log('Member list created for existing team:', teamId);

      return {
        success: true,
        teamId,
        memberListEvent: memberListEvent.rawEvent() as NostrEvent,
      };
    } catch (error) {
      console.error('Error creating member list for existing team:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Prepare tags for kind 33404 team event
   */
  private prepareTeamTags(teamId: string, data: TeamCreationData): string[][] {
    const tags: string[][] = [
      ['d', teamId], // Unique identifier for parameterized replaceable event
      ['name', data.name],
      ['about', data.about],
      ['captain', data.captainHexPubkey],
      ['t', 'team'],
      ['t', 'fitness'],
      ['t', 'runstr'],
    ];

    if (data.activityType) {
      tags.push(['activity', data.activityType]);
      tags.push(['t', data.activityType.toLowerCase()]);
    }

    if (data.location) {
      tags.push(['location', data.location]);
    }

    if (data.isPublic !== undefined) {
      tags.push(['public', data.isPublic ? 'true' : 'false']);
    }

    return tags;
  }

  /**
   * Generate unique team ID based on team name and timestamp
   */
  private generateTeamId(teamName: string): string {
    const sanitized = teamName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 30);

    const timestamp = Date.now().toString(36).substring(-4);
    return `${sanitized}-${timestamp}`;
  }
}

export default NostrTeamCreationService.getInstance();