/**
 * Nostr Competition Participant Service
 * Manages competition-specific participant lists using kind 30002 events
 * Handles join requests, approvals, and participant status tracking
 */

import NDK, { NDKEvent, NDKPrivateKeySigner, NDKUser, type NDKSigner } from '@nostr-dev-kit/ndk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlobalNDKService } from './GlobalNDKService';

// Nostr event kinds for competition participants
const COMPETITION_PARTICIPANT_LIST_KIND = 30002; // Competition participant list
const COMPETITION_JOIN_REQUEST_KIND = 9734; // Join request event (using a placeholder kind)

export interface CompetitionParticipant {
  npub: string;
  hexPubkey: string;
  status: 'pending' | 'approved' | 'rejected';
  joinedAt: number;
  approvedAt?: number;
  approvedBy?: string;
  name?: string;
  avatar?: string;
}

export interface CompetitionParticipantList {
  competitionId: string;
  teamId: string;
  participants: CompetitionParticipant[];
  requireApproval: boolean;
  captainPubkey: string;
  lastUpdated: number;
}

export interface JoinRequest {
  id: string;
  competitionId: string;
  userNpub: string;
  userHexPubkey: string;
  userName?: string;
  userAvatar?: string;
  requestedAt: number;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
}

class NostrCompetitionParticipantService {
  private static instance: NostrCompetitionParticipantService;
  private ndk: NDK | null = null;
  private participantListCache = new Map<string, CompetitionParticipantList>();
  private joinRequestCache = new Map<string, JoinRequest[]>();
  private cacheExpiry = 300000; // 5 minutes
  private lastCacheUpdate = new Map<string, number>();

  private constructor() {
    this.initializeService();
  }

  static getInstance(): NostrCompetitionParticipantService {
    if (!NostrCompetitionParticipantService.instance) {
      NostrCompetitionParticipantService.instance = new NostrCompetitionParticipantService();
    }
    return NostrCompetitionParticipantService.instance;
  }

  private async initializeService() {
    try {
      if (!this.ndk) {
        // Validate connection before initialization
        const connected = GlobalNDKService.isConnected();
        if (!connected) {
          console.warn('[CompetitionParticipant] No relay connections - attempting reconnect...');
          await GlobalNDKService.reconnect();
        }

        // Use GlobalNDKService for shared relay connections
        this.ndk = await GlobalNDKService.getInstance();
      }
    } catch (error) {
      console.error('Failed to initialize NostrCompetitionParticipantService:', error);
    }
  }

  /**
   * Create or update a competition participant list
   * Accepts either hex private key (nsec users) or NDKSigner (Amber users)
   */
  async createParticipantList(
    competitionId: string,
    teamId: string,
    captainPrivateKeyOrSigner: string | NDKSigner,
    requireApproval: boolean = false
  ): Promise<{ success: boolean; eventId?: string; error?: string }> {
    try {
      if (!this.ndk) {
        await this.initializeService();
      }

      // Get signer - either create from private key or use provided signer
      const signer = typeof captainPrivateKeyOrSigner === 'string'
        ? new NDKPrivateKeySigner(captainPrivateKeyOrSigner)
        : captainPrivateKeyOrSigner;
      const user = await signer.user();

      // Create participant list event
      const event = new NDKEvent(this.ndk!);
      event.kind = COMPETITION_PARTICIPANT_LIST_KIND;
      event.content = JSON.stringify({
        competitionId,
        teamId,
        requireApproval,
        createdAt: Date.now(),
      });

      // Add tags for discovery
      event.tags = [
        ['d', `${competitionId}-participants`], // Unique identifier
        ['competition', competitionId],
        ['team', teamId],
        ['require_approval', requireApproval.toString()],
        ['captain', user.pubkey],
      ];

      // Sign and publish
      await event.sign(signer);
      await event.publish();

      // Clear cache for this competition
      this.participantListCache.delete(competitionId);

      return {
        success: true,
        eventId: event.id,
      };
    } catch (error) {
      console.error('Error creating participant list:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Request to join a competition
   * Accepts either hex private key (nsec users) or NDKSigner (Amber users)
   */
  async requestToJoin(
    competitionId: string,
    userPrivateKeyOrSigner: string | NDKSigner,
    message?: string
  ): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      if (!this.ndk) {
        await this.initializeService();
      }

      // Get signer - either create from private key or use provided signer
      const signer = typeof userPrivateKeyOrSigner === 'string'
        ? new NDKPrivateKeySigner(userPrivateKeyOrSigner)
        : userPrivateKeyOrSigner;
      const user = await signer.user();

      // Create join request event
      const event = new NDKEvent(this.ndk!);
      event.kind = COMPETITION_JOIN_REQUEST_KIND;
      event.content = JSON.stringify({
        competitionId,
        message: message || '',
        requestedAt: Date.now(),
      });

      // Add tags for discovery
      event.tags = [
        ['competition', competitionId],
        ['request_type', 'join'],
        ['user', user.pubkey],
      ];

      // Sign and publish
      await event.sign(signer);
      await event.publish();

      // Clear join request cache
      this.joinRequestCache.delete(competitionId);

      return {
        success: true,
        requestId: event.id,
      };
    } catch (error) {
      console.error('Error requesting to join competition:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Approve a participant join request
   * Accepts either hex private key (nsec users) or NDKSigner (Amber users)
   */
  async approveParticipant(
    competitionId: string,
    participantPubkey: string,
    captainPrivateKeyOrSigner: string | NDKSigner
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current participant list
      const currentList = await this.getParticipantList(competitionId);

      if (!currentList) {
        return {
          success: false,
          error: 'Participant list not found',
        };
      }

      // Add participant to approved list
      const updatedParticipants = [
        ...currentList.participants.filter(p => p.hexPubkey !== participantPubkey),
        {
          npub: '', // Will be converted from hex
          hexPubkey: participantPubkey,
          status: 'approved' as const,
          joinedAt: Date.now(),
          approvedAt: Date.now(),
          approvedBy: currentList.captainPubkey,
        },
      ];

      // Update the participant list
      return await this.updateParticipantList(
        competitionId,
        updatedParticipants,
        captainPrivateKeyOrSigner
      );
    } catch (error) {
      console.error('Error approving participant:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Reject a participant join request
   * Accepts either hex private key (nsec users) or NDKSigner (Amber users)
   */
  async rejectParticipant(
    competitionId: string,
    participantPubkey: string,
    captainPrivateKeyOrSigner: string | NDKSigner
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Similar to approve but set status to rejected
      const currentList = await this.getParticipantList(competitionId);

      if (!currentList) {
        return {
          success: false,
          error: 'Participant list not found',
        };
      }

      const updatedParticipants = currentList.participants.map(p =>
        p.hexPubkey === participantPubkey
          ? { ...p, status: 'rejected' as const }
          : p
      );

      return await this.updateParticipantList(
        competitionId,
        updatedParticipants,
        captainPrivateKeyOrSigner
      );
    } catch (error) {
      console.error('Error rejecting participant:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Remove a participant from competition
   * Accepts either hex private key (nsec users) or NDKSigner (Amber users)
   */
  async removeParticipant(
    competitionId: string,
    participantPubkey: string,
    captainPrivateKeyOrSigner: string | NDKSigner
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const currentList = await this.getParticipantList(competitionId);

      if (!currentList) {
        return {
          success: false,
          error: 'Participant list not found',
        };
      }

      const updatedParticipants = currentList.participants.filter(
        p => p.hexPubkey !== participantPubkey
      );

      return await this.updateParticipantList(
        competitionId,
        updatedParticipants,
        captainPrivateKeyOrSigner
      );
    } catch (error) {
      console.error('Error removing participant:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update the participant list
   * Accepts either hex private key (nsec users) or NDKSigner (Amber users)
   */
  private async updateParticipantList(
    competitionId: string,
    participants: CompetitionParticipant[],
    captainPrivateKeyOrSigner: string | NDKSigner
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.ndk) {
        await this.initializeService();
      }

      // Get signer - either create from private key or use provided signer
      const signer = typeof captainPrivateKeyOrSigner === 'string'
        ? new NDKPrivateKeySigner(captainPrivateKeyOrSigner)
        : captainPrivateKeyOrSigner;

      // Create updated participant list event
      const event = new NDKEvent(this.ndk!);
      event.kind = COMPETITION_PARTICIPANT_LIST_KIND;
      event.content = JSON.stringify({
        competitionId,
        participants,
        updatedAt: Date.now(),
      });

      // Add participant tags
      const tags: string[][] = [
        ['d', `${competitionId}-participants`],
        ['competition', competitionId],
      ];

      // Add approved participants as 'p' tags
      participants
        .filter(p => p.status === 'approved')
        .forEach(p => {
          tags.push(['p', p.hexPubkey, '', p.name || '']);
        });

      event.tags = tags;

      // Sign and publish
      await event.sign(signer);
      await event.publish();

      // Clear cache
      this.participantListCache.delete(competitionId);

      return { success: true };
    } catch (error) {
      console.error('Error updating participant list:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get participant list for a competition
   */
  async getParticipantList(
    competitionId: string,
    forceRefresh: boolean = false
  ): Promise<CompetitionParticipantList | null> {
    try {
      // Check cache first
      if (!forceRefresh && this.participantListCache.has(competitionId)) {
        const lastUpdate = this.lastCacheUpdate.get(competitionId) || 0;
        if (Date.now() - lastUpdate < this.cacheExpiry) {
          return this.participantListCache.get(competitionId)!;
        }
      }

      if (!this.ndk) {
        await this.initializeService();
      }

      // Query for participant list
      const filter = {
        kinds: [COMPETITION_PARTICIPANT_LIST_KIND],
        '#d': [`${competitionId}-participants`],
        limit: 1  // Only need latest list
      };

      const events = await this.ndk!.fetchEvents(filter);

      if (events.size === 0) {
        return null;
      }

      // Get the most recent event
      const latestEvent = Array.from(events).sort(
        (a, b) => (b.created_at || 0) - (a.created_at || 0)
      )[0];

      // Parse participant list
      const content = JSON.parse(latestEvent.content);
      const tagsMap = new Map<string, string[]>();
      latestEvent.tags.forEach(tag => {
        if (tag.length >= 2) {
          tagsMap.set(tag[0], tag.slice(1));
        }
      });

      const participantList: CompetitionParticipantList = {
        competitionId: content.competitionId,
        teamId: tagsMap.get('team')?.[0] || '',
        participants: content.participants || [],
        requireApproval: tagsMap.get('require_approval')?.[0] === 'true',
        captainPubkey: tagsMap.get('captain')?.[0] || latestEvent.pubkey,
        lastUpdated: latestEvent.created_at || Date.now() / 1000,
      };

      // Update cache
      this.participantListCache.set(competitionId, participantList);
      this.lastCacheUpdate.set(competitionId, Date.now());

      return participantList;
    } catch (error) {
      console.error('Error getting participant list:', error);
      return null;
    }
  }

  /**
   * Get pending join requests for a competition
   */
  async getPendingJoinRequests(
    competitionId: string,
    forceRefresh: boolean = false
  ): Promise<JoinRequest[]> {
    try {
      // Check cache first
      if (!forceRefresh && this.joinRequestCache.has(competitionId)) {
        const lastUpdate = this.lastCacheUpdate.get(`requests-${competitionId}`) || 0;
        if (Date.now() - lastUpdate < this.cacheExpiry) {
          return this.joinRequestCache.get(competitionId)!;
        }
      }

      if (!this.ndk) {
        await this.initializeService();
      }

      // Query for join requests
      const filter = {
        kinds: [COMPETITION_JOIN_REQUEST_KIND],
        '#competition': [competitionId],
        limit: 100  // Reasonable request queue size
      };

      const events = await this.ndk!.fetchEvents(filter);

      // Parse join requests
      const requests: JoinRequest[] = Array.from(events).map(event => {
        const content = JSON.parse(event.content);
        return {
          id: event.id || '',
          competitionId: content.competitionId,
          userNpub: '', // Will need to convert from hex
          userHexPubkey: event.pubkey,
          userName: content.userName,
          userAvatar: content.userAvatar,
          requestedAt: event.created_at || Date.now() / 1000,
          message: content.message,
          status: 'pending' as const,
        };
      });

      // Filter out already processed requests
      const participantList = await this.getParticipantList(competitionId);
      const processedPubkeys = new Set(
        participantList?.participants.map(p => p.hexPubkey) || []
      );

      const pendingRequests = requests.filter(
        r => !processedPubkeys.has(r.userHexPubkey)
      );

      // Update cache
      this.joinRequestCache.set(competitionId, pendingRequests);
      this.lastCacheUpdate.set(`requests-${competitionId}`, Date.now());

      return pendingRequests;
    } catch (error) {
      console.error('Error getting join requests:', error);
      return [];
    }
  }

  /**
   * Check if user is approved participant
   */
  async isApprovedParticipant(
    competitionId: string,
    userPubkey: string
  ): Promise<boolean> {
    const participantList = await this.getParticipantList(competitionId);

    if (!participantList) {
      return false;
    }

    const participant = participantList.participants.find(
      p => p.hexPubkey === userPubkey
    );

    return participant?.status === 'approved';
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.participantListCache.clear();
    this.joinRequestCache.clear();
    this.lastCacheUpdate.clear();
  }
}

export default NostrCompetitionParticipantService;