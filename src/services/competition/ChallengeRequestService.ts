/**
 * ChallengeRequestService
 * Handles challenge requests, acceptances, and declines using Nostr events
 */

import { nostrRelayManager } from '../nostr/NostrRelayManager';
import { SimpleNostrService } from '../nostr/SimpleNostrService';
import { NostrListService } from '../nostr/NostrListService';
import { ChallengeService } from './ChallengeService';
import type { NostrRelayManager } from '../nostr/NostrRelayManager';
import type { NostrFilter } from '../nostr/NostrProtocolHandler';
import type { Event } from '../nostr/NostrListService';
import type { ChallengeRequest, ChallengeMetadata, ChallengeStatus } from '../../types/challenge';
import {
  CHALLENGE_REQUEST_KIND,
  CHALLENGE_ACCEPT_KIND,
  CHALLENGE_DECLINE_KIND,
  CHALLENGE_COMPLETE_KIND
} from '../../types/challenge';
import { getUserNostrIdentifiers } from '../../utils/nostr';
import { npubToHex } from '../../utils/ndkConversion';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class ChallengeRequestService {
  private static instance: ChallengeRequestService;
  private relayManager: NostrRelayManager;
  private simpleNostrService: SimpleNostrService;
  private listService: NostrListService;
  private challengeService: ChallengeService;
  private pendingRequests: Map<string, ChallengeRequest> = new Map();
  private subscriptionId?: string;

  constructor() {
    this.relayManager = nostrRelayManager;
    this.simpleNostrService = SimpleNostrService.getInstance();
    this.listService = NostrListService.getInstance();
    this.challengeService = ChallengeService.getInstance();
  }

  static getInstance(): ChallengeRequestService {
    if (!ChallengeRequestService.instance) {
      ChallengeRequestService.instance = new ChallengeRequestService();
    }
    return ChallengeRequestService.instance;
  }

  /**
   * Send a challenge request to another user
   */
  async sendChallengeRequest(
    challengeId: string,
    challengedUserPubkey: string,
    challengeDetails: ChallengeMetadata
  ): Promise<void> {
    const userIdentifiers = await getUserNostrIdentifiers();
    if (!userIdentifiers?.hexPubkey) {
      throw new Error('User not authenticated');
    }

    // Convert npub to hex if needed
    let hexChallengedPubkey = challengedUserPubkey;
    if (challengedUserPubkey.startsWith('npub')) {
      const converted = npubToHex(challengedUserPubkey);
      if (!converted) {
        throw new Error('Invalid challenged user pubkey');
      }
      hexChallengedPubkey = converted;
    }

    // Create challenge request event
    const content = `You've been challenged to a ${challengeDetails.activity} challenge! ` +
      `Wager: ${challengeDetails.wager} sats. ${challengeDetails.description || ''}`;

    const tags = [
      ['p', hexChallengedPubkey], // Tag the challenged user
      ['p', userIdentifiers.hexPubkey], // Tag the challenger
      ['t', 'challenge-request'],
      ['challenge-id', challengeId],
      ['challenge-name', challengeDetails.name],
      ['activity', challengeDetails.activity],
      ['metric', challengeDetails.metric],
      ['wager', challengeDetails.wager.toString()],
      ['starts', challengeDetails.startsAt.toString()],
      ['expires', challengeDetails.expiresAt.toString()]
    ];

    if (challengeDetails.target) {
      tags.push(['target', challengeDetails.target]);
    }

    // Publish the request
    await this.simpleNostrService.publishEvent(
      CHALLENGE_REQUEST_KIND,
      content,
      tags
    );

    console.log(`✅ Sent challenge request to ${hexChallengedPubkey.slice(0, 8)}...`);
  }

  /**
   * Accept a challenge request
   */
  async acceptChallenge(
    challengeId: string,
    challengerPubkey: string
  ): Promise<void> {
    const userIdentifiers = await getUserNostrIdentifiers();
    if (!userIdentifiers?.hexPubkey) {
      throw new Error('User not authenticated');
    }

    // Convert npub to hex if needed
    let hexChallengerPubkey = challengerPubkey;
    if (challengerPubkey.startsWith('npub')) {
      const converted = npubToHex(challengerPubkey);
      if (!converted) {
        throw new Error('Invalid challenger pubkey');
      }
      hexChallengerPubkey = converted;
    }

    // 1. Send acceptance notification
    const acceptContent = "Challenge accepted! Let's go! 💪";
    const acceptTags = [
      ['p', hexChallengerPubkey], // Notify the challenger
      ['t', 'challenge-accepted'],
      ['challenge-id', challengeId]
    ];

    await this.simpleNostrService.publishEvent(
      CHALLENGE_ACCEPT_KIND,
      acceptContent,
      acceptTags
    );

    // 2. Add user to challenge list
    await this.challengeService.addParticipant(challengeId, userIdentifiers.hexPubkey);

    // 3. Update challenge status locally
    await this.challengeService.updateChallengeStatus(challengeId, 'active' as ChallengeStatus);

    // 4. Remove from pending requests
    this.pendingRequests.delete(challengeId);

    console.log(`✅ Accepted challenge ${challengeId}`);
  }

  /**
   * Decline a challenge request
   */
  async declineChallenge(
    challengeId: string,
    challengerPubkey: string
  ): Promise<void> {
    const userIdentifiers = await getUserNostrIdentifiers();
    if (!userIdentifiers?.hexPubkey) {
      throw new Error('User not authenticated');
    }

    // Convert npub to hex if needed
    let hexChallengerPubkey = challengerPubkey;
    if (challengerPubkey.startsWith('npub')) {
      const converted = npubToHex(challengerPubkey);
      if (!converted) {
        throw new Error('Invalid challenger pubkey');
      }
      hexChallengerPubkey = converted;
    }

    // Send decline notification
    const declineContent = "Challenge declined";
    const declineTags = [
      ['p', hexChallengerPubkey], // Notify the challenger
      ['t', 'challenge-declined'],
      ['challenge-id', challengeId]
    ];

    await this.simpleNostrService.publishEvent(
      CHALLENGE_DECLINE_KIND,
      declineContent,
      declineTags
    );

    // Update challenge status locally
    await this.challengeService.updateChallengeStatus(challengeId, 'declined' as ChallengeStatus);

    // Remove from pending requests
    this.pendingRequests.delete(challengeId);

    console.log(`✅ Declined challenge ${challengeId}`);
  }

  /**
   * Subscribe to challenge requests for the current user
   */
  async subscribeToChallengeRequests(
    callback: (request: ChallengeRequest) => void
  ): Promise<void> {
    const userIdentifiers = await getUserNostrIdentifiers();
    if (!userIdentifiers?.hexPubkey) {
      throw new Error('User not authenticated');
    }

    // Unsubscribe from previous subscription if exists
    if (this.subscriptionId) {
      this.relayManager.unsubscribe(this.subscriptionId);
    }

    // Subscribe to challenge request events where user is tagged
    const filters: NostrFilter[] = [
      {
        kinds: [CHALLENGE_REQUEST_KIND],
        '#p': [userIdentifiers.hexPubkey],
        limit: 50
      }
    ];

    this.subscriptionId = await this.relayManager.subscribeToEvents(
      filters,
      (event: Event, relayUrl: string) => {
        try {
          const request = this.parseChallengeRequest(event);
          if (request && !this.pendingRequests.has(request.challengeId)) {
            this.pendingRequests.set(request.challengeId, request);
            callback(request);
            console.log(`📥 New challenge request: ${request.challengeId}`);
          }
        } catch (error) {
          console.error('Error parsing challenge request:', error);
        }
      }
    );

    console.log('🔔 Subscribed to challenge requests');
  }

  /**
   * Subscribe to challenge responses (accepts/declines) for the current user
   */
  async subscribeToChallengeResponses(
    callback: (response: { type: 'accept' | 'decline'; challengeId: string; responderPubkey: string }) => void
  ): Promise<void> {
    const userIdentifiers = await getUserNostrIdentifiers();
    if (!userIdentifiers?.hexPubkey) {
      throw new Error('User not authenticated');
    }

    // Subscribe to accept/decline events where user is tagged
    const filters: NostrFilter[] = [
      {
        kinds: [CHALLENGE_ACCEPT_KIND, CHALLENGE_DECLINE_KIND],
        '#p': [userIdentifiers.hexPubkey],
        limit: 50
      }
    ];

    await this.relayManager.subscribeToEvents(
      filters,
      (event: Event, relayUrl: string) => {
        try {
          const challengeIdTag = event.tags?.find(t => t[0] === 'challenge-id');
          if (!challengeIdTag) return;

          const response = {
            type: event.kind === CHALLENGE_ACCEPT_KIND ? 'accept' as const : 'decline' as const,
            challengeId: challengeIdTag[1],
            responderPubkey: event.pubkey || ''
          };

          callback(response);
          console.log(`📥 Challenge ${response.type}: ${response.challengeId}`);
        } catch (error) {
          console.error('Error parsing challenge response:', error);
        }
      }
    );

    console.log('🔔 Subscribed to challenge responses');
  }

  /**
   * Get pending challenge requests for the current user
   */
  async getPendingRequests(): Promise<ChallengeRequest[]> {
    const userIdentifiers = await getUserNostrIdentifiers();
    if (!userIdentifiers?.hexPubkey) {
      throw new Error('User not authenticated');
    }

    // Query for recent challenge requests
    const filters: NostrFilter[] = [
      {
        kinds: [CHALLENGE_REQUEST_KIND],
        '#p': [userIdentifiers.hexPubkey],
        limit: 20
      }
    ];

    const requests: ChallengeRequest[] = [];
    const processedIds = new Set<string>();

    const subscriptionId = await this.relayManager.subscribeToEvents(
      filters,
      (event: Event, relayUrl: string) => {
        try {
          const request = this.parseChallengeRequest(event);
          if (request && !processedIds.has(request.challengeId)) {
            processedIds.add(request.challengeId);

            // Check if challenge is still pending
            const now = Date.now() / 1000;
            if (request.expiresAt > now) {
              requests.push(request);
              this.pendingRequests.set(request.challengeId, request);
            }
          }
        } catch (error) {
          console.error('Error parsing challenge request:', error);
        }
      }
    );

    // Wait for results
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Unsubscribe
    this.relayManager.unsubscribe(subscriptionId);

    // Sort by most recent first
    requests.sort((a, b) => b.requestedAt - a.requestedAt);

    console.log(`📊 Found ${requests.length} pending challenge requests`);
    return requests;
  }

  /**
   * Parse a challenge request event
   */
  private parseChallengeRequest(event: Event): ChallengeRequest | null {
    if (!event.tags || !event.pubkey) return null;

    const tags = new Map(event.tags.map(t => [t[0], t[1]]));
    const challengeId = tags.get('challenge-id');
    const challengeName = tags.get('challenge-name');

    if (!challengeId || !challengeName) return null;

    // Get challenger info (second p tag is the challenger)
    const pTags = event.tags.filter(t => t[0] === 'p');
    const challengerPubkey = pTags[1]?.[1] || event.pubkey;

    const challengeDetails: ChallengeMetadata = {
      id: challengeId,
      name: challengeName,
      description: event.content,
      activity: tags.get('activity') as any || 'running',
      metric: tags.get('metric') as any || 'distance',
      target: tags.get('target'),
      wager: parseInt(tags.get('wager') || '0'),
      status: 'pending' as ChallengeStatus,
      createdAt: event.created_at || 0,
      startsAt: parseInt(tags.get('starts') || '0'),
      expiresAt: parseInt(tags.get('expires') || '0'),
      challengerPubkey,
      challengedPubkey: pTags[0]?.[1] || ''
    };

    return {
      challengeId,
      challengerName: challengerPubkey.slice(0, 8) + '...', // Will be replaced with actual name
      challengerPubkey,
      challengeDetails,
      requestedAt: event.created_at || 0,
      expiresAt: challengeDetails.expiresAt
    };
  }

  /**
   * Mark challenge as complete and notify participants
   */
  async completeChallenge(
    challengeId: string,
    winnerId: string,
    participants: string[]
  ): Promise<void> {
    const userIdentifiers = await getUserNostrIdentifiers();
    if (!userIdentifiers?.hexPubkey) {
      throw new Error('User not authenticated');
    }

    const content = `Challenge completed! Winner: ${winnerId === userIdentifiers.hexPubkey ? 'You' : 'Your opponent'}`;
    const tags = [
      ['t', 'challenge-completed'],
      ['challenge-id', challengeId],
      ['winner', winnerId]
    ];

    // Tag all participants
    participants.forEach(p => tags.push(['p', p]));

    await this.simpleNostrService.publishEvent(
      CHALLENGE_COMPLETE_KIND,
      content,
      tags
    );

    // Update challenge status
    await this.challengeService.updateChallengeStatus(challengeId, 'completed' as ChallengeStatus);

    console.log(`✅ Marked challenge ${challengeId} as complete`);
  }

  /**
   * Get challenge request count for badge display
   */
  getPendingRequestCount(): number {
    const now = Date.now() / 1000;
    return Array.from(this.pendingRequests.values())
      .filter(r => r.expiresAt > now)
      .length;
  }

  /**
   * Clear cached requests
   */
  clearCache(): void {
    this.pendingRequests.clear();
    console.log('🧹 Cleared challenge request cache');
  }

  /**
   * Cleanup subscriptions
   */
  cleanup(): void {
    if (this.subscriptionId) {
      this.relayManager.unsubscribe(this.subscriptionId);
      this.subscriptionId = undefined;
    }
    this.clearCache();
    console.log('🧹 Cleaned up challenge request service');
  }
}

export default ChallengeRequestService.getInstance();