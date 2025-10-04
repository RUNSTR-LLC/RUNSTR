/**
 * ChallengeRequestService - Handles Nostr kind 1105/1106/1107 challenge protocol
 * Manages challenge requests, acceptances, declines, and participant list creation
 * Integrates with NostrRelayManager and NostrListService
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { nostrRelayManager } from '../nostr/NostrRelayManager';
import { NostrListService } from '../nostr/NostrListService';
import { NostrProtocolHandler } from '../nostr/NostrProtocolHandler';
import { getUserNostrIdentifiers } from '../../utils/nostr';
import { nip19 } from 'nostr-tools';
import type { Event } from 'nostr-tools';
import {
  CHALLENGE_REQUEST_KIND,
  CHALLENGE_ACCEPT_KIND,
  CHALLENGE_DECLINE_KIND,
  type ActivityType,
  type MetricType,
  type DurationOption,
} from '../../types/challenge';

export interface ChallengeRequestData {
  challengedPubkey: string;
  activityType: ActivityType;
  metric: MetricType;
  duration: DurationOption;
  wagerAmount: number;
  startDate?: number;
  endDate?: number;
}

export interface PendingChallenge {
  challengeId: string;
  challengerPubkey: string;
  challengerName?: string;
  challengedPubkey: string;
  activityType: ActivityType;
  metric: MetricType;
  duration: number;
  wagerAmount: number;
  startDate: number;
  endDate: number;
  requestedAt: number;
  expiresAt: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}

export interface ChallengeEventListener {
  subscriptionId: string;
  callback: (challenge: PendingChallenge) => void;
}

export class ChallengeRequestService {
  private static instance: ChallengeRequestService;
  private pendingChallenges: Map<string, PendingChallenge> = new Map();
  private eventListeners: Map<string, ChallengeEventListener> = new Map();
  private subscriptionId?: string;
  private readonly STORAGE_KEY = '@runstr:pending_challenges';
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private listService: NostrListService;
  private protocolHandler: NostrProtocolHandler;

  private constructor() {
    this.listService = NostrListService.getInstance();
    this.protocolHandler = new NostrProtocolHandler();
    this.loadPendingChallenges();
  }

  static getInstance(): ChallengeRequestService {
    if (!ChallengeRequestService.instance) {
      ChallengeRequestService.instance = new ChallengeRequestService();
    }
    return ChallengeRequestService.instance;
  }

  /**
   * Load pending challenges from AsyncStorage
   */
  private async loadPendingChallenges(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const challenges: PendingChallenge[] = JSON.parse(stored);
        const now = Date.now();

        challenges.forEach((challenge) => {
          if (challenge.expiresAt > now) {
            this.pendingChallenges.set(challenge.challengeId, challenge);
          }
        });

        console.log(`Loaded ${this.pendingChallenges.size} pending challenges`);
      }
    } catch (error) {
      console.error('Failed to load pending challenges:', error);
    }
  }

  /**
   * Save pending challenges to AsyncStorage
   */
  private async savePendingChallenges(): Promise<void> {
    try {
      const challenges = Array.from(this.pendingChallenges.values());
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(challenges));
    } catch (error) {
      console.error('Failed to save pending challenges:', error);
    }
  }

  /**
   * Generate unique challenge ID
   */
  private generateChallengeId(): string {
    return `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert npub to hex pubkey
   */
  private npubToHex(npub: string): string {
    try {
      if (npub.length === 64 && /^[a-f0-9]+$/i.test(npub)) {
        return npub;
      }

      if (npub.startsWith('npub1')) {
        const decoded = nip19.decode(npub);
        if (decoded.type === 'npub') {
          return decoded.data;
        }
      }

      throw new Error('Invalid npub format');
    } catch (error) {
      console.error('Failed to convert npub to hex:', error);
      return npub;
    }
  }

  /**
   * Parse kind 1105 challenge request event
   */
  private parseChallengeRequest(event: Event): PendingChallenge | null {
    try {
      const challengedPubkey = event.tags.find((t) => t[0] === 'p')?.[1];
      const activityType = event.tags.find((t) => t[0] === 'challenge-type')?.[1] as ActivityType;
      const metric = event.tags.find((t) => t[0] === 'metric')?.[1] as MetricType;
      const duration = parseInt(event.tags.find((t) => t[0] === 'duration')?.[1] || '7', 10);
      const wagerAmount = parseInt(event.tags.find((t) => t[0] === 'wager')?.[1] || '0', 10);
      const startDate = parseInt(event.tags.find((t) => t[0] === 'start-date')?.[1] || '0', 10);
      const endDate = parseInt(event.tags.find((t) => t[0] === 'end-date')?.[1] || '0', 10);

      if (!challengedPubkey || !activityType || !metric) {
        console.warn('Invalid challenge request event - missing required fields');
        return null;
      }

      const challengeId = event.id || this.generateChallengeId();
      const expiresAt = (event.created_at || Math.floor(Date.now() / 1000)) + 7 * 24 * 60 * 60; // 7 days

      return {
        challengeId,
        challengerPubkey: event.pubkey,
        challengedPubkey,
        activityType,
        metric,
        duration,
        wagerAmount,
        startDate: startDate || event.created_at || Math.floor(Date.now() / 1000),
        endDate: endDate || ((event.created_at || Math.floor(Date.now() / 1000)) + duration * 24 * 60 * 60),
        requestedAt: event.created_at || Math.floor(Date.now() / 1000),
        expiresAt: expiresAt * 1000,
        status: 'pending',
      };
    } catch (error) {
      console.error('Failed to parse challenge request:', error);
      return null;
    }
  }

  /**
   * Create and publish kind 1105 challenge request event
   */
  async createChallengeRequest(
    requestData: ChallengeRequestData,
    signerNsec: string
  ): Promise<{ success: boolean; challengeId?: string; error?: string }> {
    try {
      const userIdentifiers = await getUserNostrIdentifiers();
      if (!userIdentifiers?.hexPubkey) {
        return { success: false, error: 'User not authenticated' };
      }

      const challengeId = this.generateChallengeId();
      const now = Math.floor(Date.now() / 1000);
      const startDate = requestData.startDate || now;
      const endDate = requestData.endDate || (now + requestData.duration * 24 * 60 * 60);
      const challengedPubkeyHex = this.npubToHex(requestData.challengedPubkey);

      const tags: string[][] = [
        ['p', challengedPubkeyHex],
        ['activity', requestData.activityType], // Fixed: was 'challenge-type'
        ['metric', requestData.metric],
        ['duration', requestData.duration.toString()],
        ['wager', requestData.wagerAmount.toString()],
        ['start-date', startDate.toString()],
        ['end-date', endDate.toString()],
        ['t', 'challenge'],
        ['t', 'fitness'],
        ['t', requestData.activityType],
      ];

      const content = `Challenge: ${requestData.activityType} - ${requestData.metric} for ${requestData.duration} days. Wager: ${requestData.wagerAmount} sats.`;

      const eventTemplate = {
        kind: CHALLENGE_REQUEST_KIND,
        created_at: now,
        tags,
        content,
      };

      console.log('🔄 Publishing kind 1105 challenge request event...');

      // Sign event with NostrProtocolHandler
      const signedEvent = await this.protocolHandler.signEvent(eventTemplate, signerNsec);

      // Publish to Nostr relays
      const publishResult = await nostrRelayManager.publishEvent(signedEvent);

      if (!publishResult.success) {
        throw new Error('Failed to publish challenge request to Nostr relays');
      }

      // Store locally for tracking
      const pendingChallenge: PendingChallenge = {
        challengeId: signedEvent.id, // Use actual event ID
        challengerPubkey: userIdentifiers.hexPubkey,
        challengedPubkey: challengedPubkeyHex,
        activityType: requestData.activityType,
        metric: requestData.metric,
        duration: requestData.duration,
        wagerAmount: requestData.wagerAmount,
        startDate,
        endDate,
        requestedAt: now,
        expiresAt: (now + 7 * 24 * 60 * 60) * 1000,
        status: 'pending',
      };

      this.pendingChallenges.set(signedEvent.id, pendingChallenge);
      await this.savePendingChallenges();

      console.log(`✅ Challenge request published: ${signedEvent.id}`);

      return {
        success: true,
        challengeId: signedEvent.id,
      };
    } catch (error) {
      console.error('Failed to create challenge request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Accept a challenge request - publish kind 1106 and create kind 30000 list
   */
  async acceptChallenge(
    challengeId: string,
    nsec: string
  ): Promise<{ success: boolean; listId?: string; error?: string }> {
    try {
      const challenge = this.pendingChallenges.get(challengeId);
      if (!challenge) {
        return { success: false, error: 'Challenge not found' };
      }

      const userIdentifiers = await getUserNostrIdentifiers();
      if (!userIdentifiers?.hexPubkey) {
        return { success: false, error: 'User not authenticated' };
      }

      if (challenge.challengedPubkey !== userIdentifiers.hexPubkey) {
        return { success: false, error: 'Not authorized to accept this challenge' };
      }

      const now = Math.floor(Date.now() / 1000);

      // 1. Sign and publish kind 1106 acceptance event
      const acceptTags: string[][] = [
        ['e', challengeId],
        ['p', challenge.challengerPubkey],
        ['t', 'challenge-accept'],
      ];

      const acceptContent = `Challenge accepted: ${challenge.activityType} - ${challenge.metric}`;

      const acceptEventTemplate = {
        kind: CHALLENGE_ACCEPT_KIND,
        created_at: now,
        tags: acceptTags,
        content: acceptContent,
      };

      console.log('🔄 Publishing kind 1106 acceptance event...');

      const signedAcceptEvent = await this.protocolHandler.signEvent(acceptEventTemplate, nsec);
      const acceptPublishResult = await nostrRelayManager.publishEvent(signedAcceptEvent);

      if (!acceptPublishResult.success) {
        throw new Error('Failed to publish acceptance event');
      }

      console.log(`✅ Acceptance event published: ${signedAcceptEvent.id}`);

      // 2. Create and publish kind 30000 participant list with full challenge metadata
      const listDTag = `challenge_${challengeId}`;
      const listData = {
        name: `Challenge: ${challenge.activityType}`,
        description: `${challenge.metric} challenge between two participants`,
        members: [challenge.challengerPubkey, challenge.challengedPubkey],
        dTag: listDTag,
        listType: 'people' as const,
      };

      const listEvent = this.listService.prepareListCreation(listData, userIdentifiers.hexPubkey);

      // Add challenge-specific metadata tags to the list
      if (listEvent) {
        listEvent.tags.push(
          ['t', 'challenge'],
          ['t', 'fitness'],
          ['t', 'competition'],
          ['t', challenge.activityType],
          ['activity', challenge.activityType],
          ['metric', challenge.metric],
          ['wager', challenge.wagerAmount.toString()],
          ['duration', challenge.duration.toString()],
          ['status', 'active'],
          ['starts', challenge.startDate.toString()],
          ['expires', challenge.endDate.toString()],
          ['challenger', challenge.challengerPubkey],
          ['challenged', challenge.challengedPubkey]
        );
      }

      console.log('🔄 Publishing kind 30000 participant list...');

      const signedListEvent = await this.protocolHandler.signEvent(listEvent, nsec);
      const listPublishResult = await nostrRelayManager.publishEvent(signedListEvent);

      if (!listPublishResult.success) {
        throw new Error('Failed to publish participant list');
      }

      console.log(`✅ Participant list published: ${signedListEvent.id}`);

      // Update challenge status
      challenge.status = 'accepted';
      this.pendingChallenges.set(challengeId, challenge);
      await this.savePendingChallenges();

      console.log(`✅ Challenge ${challengeId} fully accepted`);

      return {
        success: true,
        listId: listDTag,
      };
    } catch (error) {
      console.error('Failed to accept challenge:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Decline a challenge request - publish kind 1107
   */
  async declineChallenge(
    challengeId: string,
    nsec: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const challenge = this.pendingChallenges.get(challengeId);
      if (!challenge) {
        return { success: false, error: 'Challenge not found' };
      }

      const userIdentifiers = await getUserNostrIdentifiers();
      if (!userIdentifiers?.hexPubkey) {
        return { success: false, error: 'User not authenticated' };
      }

      if (challenge.challengedPubkey !== userIdentifiers.hexPubkey) {
        return { success: false, error: 'Not authorized to decline this challenge' };
      }

      const now = Math.floor(Date.now() / 1000);

      const declineTags: string[][] = [
        ['e', challengeId],
        ['p', challenge.challengerPubkey],
        ['t', 'challenge-decline'],
      ];

      const declineContent = reason || 'Challenge declined';

      const declineEventTemplate = {
        kind: CHALLENGE_DECLINE_KIND,
        created_at: now,
        tags: declineTags,
        content: declineContent,
      };

      console.log('🔄 Publishing kind 1107 decline event...');

      // Sign and publish decline event
      const signedDeclineEvent = await this.protocolHandler.signEvent(declineEventTemplate, nsec);
      const publishResult = await nostrRelayManager.publishEvent(signedDeclineEvent);

      if (!publishResult.success) {
        throw new Error('Failed to publish decline event');
      }

      console.log(`✅ Decline event published: ${signedDeclineEvent.id}`);

      // Update challenge status
      challenge.status = 'declined';
      this.pendingChallenges.set(challengeId, challenge);
      await this.savePendingChallenges();

      console.log(`Challenge ${challengeId} declined`);

      return { success: true };
    } catch (error) {
      console.error('Failed to decline challenge:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Subscribe to incoming challenge requests for current user
   */
  async subscribeToIncomingChallenges(
    callback: (challenge: PendingChallenge) => void
  ): Promise<string> {
    const userIdentifiers = await getUserNostrIdentifiers();
    if (!userIdentifiers?.hexPubkey) {
      throw new Error('User not authenticated');
    }

    const filter = {
      kinds: [CHALLENGE_REQUEST_KIND],
      '#p': [userIdentifiers.hexPubkey],
    };

    console.log('Subscribing to incoming challenge requests...');

    const subscriptionId = await nostrRelayManager.subscribeToEvents(
      [filter],
      (event: Event) => {
        const challenge = this.parseChallengeRequest(event);
        if (challenge) {
          this.pendingChallenges.set(challenge.challengeId, challenge);
          this.savePendingChallenges();
          callback(challenge);
        }
      }
    );

    this.subscriptionId = subscriptionId;

    const listener: ChallengeEventListener = {
      subscriptionId,
      callback,
    };

    this.eventListeners.set(subscriptionId, listener);

    console.log(`Subscribed to incoming challenges: ${subscriptionId}`);

    return subscriptionId;
  }

  /**
   * Unsubscribe from challenge events
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    await nostrRelayManager.unsubscribe(subscriptionId);
    this.eventListeners.delete(subscriptionId);
    console.log(`Unsubscribed from challenges: ${subscriptionId}`);
  }

  /**
   * Get all pending challenges for current user
   */
  async getPendingChallenges(): Promise<PendingChallenge[]> {
    const userIdentifiers = await getUserNostrIdentifiers();
    if (!userIdentifiers?.hexPubkey) {
      return [];
    }

    const now = Date.now();
    const challenges = Array.from(this.pendingChallenges.values()).filter(
      (c) =>
        c.status === 'pending' &&
        c.expiresAt > now &&
        c.challengedPubkey === userIdentifiers.hexPubkey
    );

    return challenges;
  }

  /**
   * Clear expired challenges
   */
  async clearExpiredChallenges(): Promise<void> {
    const now = Date.now();
    let removedCount = 0;

    this.pendingChallenges.forEach((challenge, id) => {
      if (challenge.expiresAt <= now && challenge.status === 'pending') {
        challenge.status = 'expired';
        removedCount++;
      }
    });

    await this.savePendingChallenges();

    console.log(`Cleared ${removedCount} expired challenges`);
  }
}

export const challengeRequestService = ChallengeRequestService.getInstance();
