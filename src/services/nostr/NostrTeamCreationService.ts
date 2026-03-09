/**
 * NostrTeamCreationService - Pure Nostr team creation using NDK
 * Creates teams as kind 33404 events with associated kind 30000 member lists
 * Uses NDK for consistency with the rest of the codebase
 */

import NDK, {
  NDKEvent,
  NDKPrivateKeySigner,
  type NDKSigner,
} from '@nostr-dev-kit/ndk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NostrListService } from './NostrListService';
import { TeamMemberCache } from '../team/TeamMemberCache';
import { getTeamListDetector } from '../../utils/teamListDetector';
import { GlobalNDKService } from './GlobalNDKService';
// NostrEvent type replaced with NDKEvent from NDK library

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
  private ndk: NDK | null = null;
  private listService: NostrListService;
  private listDetector = getTeamListDetector();

  private constructor() {
    this.listService = NostrListService.getInstance();
    // NDK will be initialized lazily on first use via ensureNDK()
  }

  static getInstance(): NostrTeamCreationService {
    if (!NostrTeamCreationService.instance) {
      NostrTeamCreationService.instance = new NostrTeamCreationService();
    }
    return NostrTeamCreationService.instance;
  }

  /**
   * Ensure NDK instance is initialized using GlobalNDKService
   * Lazy initialization pattern - only connects when needed
   */
  private async ensureNDK(): Promise<NDK> {
    if (this.ndk) {
      return this.ndk;
    }

    console.log('[NostrTeamCreation] Initializing NDK via GlobalNDKService');
    this.ndk = await GlobalNDKService.getInstance();

    // Progressive: Accept 2/4 relays for faster team creation UX
    const connected = await GlobalNDKService.waitForMinimumConnection(2, 4000);
    if (!connected) {
      console.warn(
        '[NostrTeamCreation] Proceeding with minimal relay connectivity'
      );
    }

    return this.ndk;
  }

  /**
   * Create a new team with both kind 33404 team event and kind 30000 member list
   * Accepts either hex private key (nsec users) or NDKSigner (Amber users)
   */
  async createTeam(
    data: TeamCreationData,
    privateKeyOrSigner: string | NDKSigner
  ): Promise<TeamCreationResult> {
    try {
      const validated = this.validateTeamCreationData(data);
      if (!validated.valid) {
        return {
          success: false,
          error: validated.error,
        };
      }

      const normalizedData = validated.data;
      console.log('NostrTeamCreationService: Creating team', normalizedData.name);

      // Ensure NDK is initialized and connected
      const ndk = await this.ensureNDK();

      // Get signer - either create from private key or use provided signer
      const signer =
        typeof privateKeyOrSigner === 'string'
          ? new NDKPrivateKeySigner(privateKeyOrSigner)
          : privateKeyOrSigner;

      // Generate unique team ID
      const teamId = this.generateTeamId(normalizedData.name);

      // Step 1: Create kind 33404 team event using NDK
      const teamEvent = new NDKEvent(ndk);
      teamEvent.kind = 33404;
      teamEvent.tags = this.prepareTeamTags(teamId, normalizedData);
      teamEvent.content = JSON.stringify({
        name: normalizedData.name,
        about: normalizedData.about,
        captain: normalizedData.captainNpub,
        createdAt: Date.now(),
        version: '1.0.0',
      });
      teamEvent.created_at = Math.floor(Date.now() / 1000);

      // Sign the team event
      await teamEvent.sign(signer);

      // Step 2: Create kind 30000 member list with captain as first member
      const members = [
        normalizedData.captainHexPubkey,
        ...(normalizedData.initialMembers || []),
      ];
      const listTags = this.listDetector.prepareListTags(
        teamId,
        normalizedData.name,
        members
      );

      const memberListEvent = new NDKEvent(ndk);
      memberListEvent.kind = 30000;
      memberListEvent.tags = listTags;
      memberListEvent.content = '';
      memberListEvent.created_at = Math.floor(Date.now() / 1000);

      // Sign the member list event
      await memberListEvent.sign(signer);

      // Step 3: Publish both events to relays using NDK
      console.log(
        'Publishing team event and member list to Nostr relays via NDK'
      );

      const teamPublishResult = await teamEvent.publish();
      const listPublishResult = await memberListEvent.publish();

      if (!teamPublishResult || !listPublishResult) {
        throw new Error('Failed to publish events to relays');
      }

      // Step 3.5: Auto-create team chat (kind 40)
      console.log('Auto-creating team chat channel');
      try {
        const chatEvent = new NDKEvent(ndk);
        chatEvent.kind = 40; // NIP-28 Channel Creation
        chatEvent.content = JSON.stringify({
          name: `${normalizedData.name} Chat`,
          about: `Team chat for ${normalizedData.name}. ⚠️ Messages are public on Nostr.`,
          relays: [],
        });
        chatEvent.tags = [
          ['d', teamId],
          ['team', teamId],
          ['t', 'runstr-team-chat'],
        ];
        chatEvent.created_at = Math.floor(Date.now() / 1000);

        await chatEvent.sign(signer);
        await chatEvent.publish();

        // Cache channel ID for immediate access
        await AsyncStorage.setItem(
          `@runstr:team_chat:${teamId}`,
          chatEvent.id!
        );

        console.log('Team chat channel created:', chatEvent.id);
      } catch (chatError) {
        console.warn('Failed to auto-create chat (non-critical):', chatError);
        // Don't fail team creation if chat creation fails
      }

      // Step 4: Cache the member list locally for immediate access
      await TeamMemberCache.getInstance().setTeamMembers(
        teamId,
        normalizedData.captainHexPubkey,
        members.map((pubkey) => ({ pubkey, npub: pubkey })) // Simplified for now
      );

      // Step 5: Store the list in NostrListService cache
      this.listService.updateCachedList(
        `${teamId}-members`,
        members.map((pubkey) => ({
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
   * Accepts either hex private key (nsec users) or NDKSigner (Amber users)
   */
  async createMemberListForExistingTeam(
    teamId: string,
    teamName: string,
    captainHexPubkey: string,
    privateKeyOrSigner: string | NDKSigner,
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

      // Ensure NDK is initialized and connected
      const ndk = await this.ensureNDK();

      // Get signer - either create from private key or use provided signer
      const signer =
        typeof privateKeyOrSigner === 'string'
          ? new NDKPrivateKeySigner(privateKeyOrSigner)
          : privateKeyOrSigner;

      // Create kind 30000 member list
      const members = [captainHexPubkey, ...(initialMembers || [])];
      const listTags = this.listDetector.prepareListTags(
        teamId,
        teamName,
        members
      );

      const memberListEvent = new NDKEvent(ndk);
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
        members.map((pubkey) => ({ pubkey, npub: pubkey }))
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

  private validateTeamCreationData(
    data: TeamCreationData
  ):
    | { valid: true; data: TeamCreationData }
    | { valid: false; error: string } {
    const MAX_NAME_LENGTH = 60;
    const MAX_ABOUT_LENGTH = 500;
    const MAX_ACTIVITY_LENGTH = 32;
    const MAX_LOCATION_LENGTH = 80;
    const MAX_INITIAL_MEMBERS = 100;

    const normalizedName = data.name.trim().replace(/\s+/g, ' ');
    const normalizedAbout = data.about.trim();
    const normalizedActivityType = data.activityType?.trim();
    const normalizedLocation = data.location?.trim();

    if (!normalizedName) {
      return { valid: false, error: 'Team name is required' };
    }

    if (normalizedName.length > MAX_NAME_LENGTH) {
      return {
        valid: false,
        error: `Team name must be ${MAX_NAME_LENGTH} characters or less`,
      };
    }

    if (normalizedAbout.length > MAX_ABOUT_LENGTH) {
      return {
        valid: false,
        error: `Team description must be ${MAX_ABOUT_LENGTH} characters or less`,
      };
    }

    if (
      normalizedActivityType &&
      normalizedActivityType.length > MAX_ACTIVITY_LENGTH
    ) {
      return {
        valid: false,
        error: `Activity type must be ${MAX_ACTIVITY_LENGTH} characters or less`,
      };
    }

    if (normalizedLocation && normalizedLocation.length > MAX_LOCATION_LENGTH) {
      return {
        valid: false,
        error: `Location must be ${MAX_LOCATION_LENGTH} characters or less`,
      };
    }

    if ((data.initialMembers?.length || 0) > MAX_INITIAL_MEMBERS) {
      return {
        valid: false,
        error: `Initial members are capped at ${MAX_INITIAL_MEMBERS}`,
      };
    }

    const normalizedMembers = Array.from(
      new Set((data.initialMembers || []).map((member) => member.trim()))
    ).filter(Boolean);

    return {
      valid: true,
      data: {
        ...data,
        name: normalizedName,
        about: normalizedAbout,
        activityType: normalizedActivityType,
        location: normalizedLocation,
        initialMembers: normalizedMembers,
      },
    };
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

    if (data.charityId) {
      tags.push(['charity', data.charityId]);
    }

    if (data.flashUrl) {
      tags.push(['flash', data.flashUrl]);
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
