/**
 * JoinRequestService
 * Manages challenge and event join requests via Nostr events
 * Handles subscriptions, approvals, and rejections
 */

import NDK, { NDKEvent, NDKFilter, NDKSubscription } from '@nostr-dev-kit/ndk';
import { ndkStore } from '../../store/ndkStore';
import { NostrListService } from '../nostr/NostrListService';
import type { JoinRequest } from '../../components/competition/JoinRequestCard';

// Kind 1106: Challenge acceptance requests
// Kind 1101: Event join requests
// Kind 1102: Join acceptance/rejection notifications

export class JoinRequestService {
  private static instance: JoinRequestService;
  private subscriptions = new Map<string, NDKSubscription>();
  private requestListeners = new Map<string, (request: JoinRequest) => void>();

  static getInstance(): JoinRequestService {
    if (!JoinRequestService.instance) {
      JoinRequestService.instance = new JoinRequestService();
    }
    return JoinRequestService.instance;
  }

  /**
   * Subscribe to join requests for a competition
   */
  async subscribeToRequests(
    competitionId: string,
    creatorPubkey: string,
    type: 'challenge' | 'event',
    onNewRequest: (request: JoinRequest) => void
  ): Promise<void> {
    const ndk = ndkStore.getState().ndk;
    if (!ndk) {
      throw new Error('NDK not initialized');
    }

    // Store listener
    this.requestListeners.set(competitionId, onNewRequest);

    // Unsubscribe from existing subscription if any
    this.unsubscribe(competitionId);

    const kind = type === 'challenge' ? 1106 : 1101;

    const filter: NDKFilter = {
      kinds: [kind],
      '#e': [competitionId],
      '#p': [creatorPubkey],
    };

    const sub = ndk.subscribe(filter, { closeOnEose: false });

    sub.on('event', (event: NDKEvent) => {
      const request = this.parseRequestEvent(event, competitionId, type);
      if (request) {
        onNewRequest(request);
      }
    });

    this.subscriptions.set(competitionId, sub);

    console.log(`[JoinRequestService] Subscribed to ${type} requests for ${competitionId}`);
  }

  /**
   * Parse Nostr event into JoinRequest
   */
  private parseRequestEvent(
    event: NDKEvent,
    competitionId: string,
    type: 'challenge' | 'event'
  ): JoinRequest | null {
    try {
      const requesterPubkey = event.pubkey;
      const timestamp = event.created_at || Math.floor(Date.now() / 1000);

      return {
        id: event.id || `${requesterPubkey}-${timestamp}`,
        requesterPubkey,
        competitionId,
        competitionType: type,
        timestamp,
        eventId: event.id || '',
      };
    } catch (error) {
      console.error('[JoinRequestService] Failed to parse request event:', error);
      return null;
    }
  }

  /**
   * Fetch existing join requests
   */
  async fetchRequests(
    competitionId: string,
    creatorPubkey: string,
    type: 'challenge' | 'event'
  ): Promise<JoinRequest[]> {
    const ndk = ndkStore.getState().ndk;
    if (!ndk) {
      throw new Error('NDK not initialized');
    }

    const kind = type === 'challenge' ? 1106 : 1101;

    const filter: NDKFilter = {
      kinds: [kind],
      '#e': [competitionId],
      '#p': [creatorPubkey],
    };

    const events = await ndk.fetchEvents(filter);
    const requests: JoinRequest[] = [];

    events.forEach((event) => {
      const request = this.parseRequestEvent(event, competitionId, type);
      if (request) {
        requests.push(request);
      }
    });

    console.log(`[JoinRequestService] Fetched ${requests.length} ${type} requests`);
    return requests;
  }

  /**
   * Approve join request - Add to kind 30000 list and publish acceptance
   */
  async approveRequest(request: JoinRequest): Promise<void> {
    const ndk = ndkStore.getState().ndk;
    if (!ndk) {
      throw new Error('NDK not initialized');
    }

    // Add to kind 30000 participant list
    await NostrListService.getInstance().addMember(
      request.competitionId,
      request.requesterPubkey
    );

    // Publish acceptance notification (kind 1102)
    const acceptEvent = new NDKEvent(ndk);
    acceptEvent.kind = 1102;
    acceptEvent.content = `Welcome to the ${request.competitionType}!`;
    acceptEvent.tags = [
      ['e', request.competitionId],
      ['p', request.requesterPubkey],
      ['t', 'join_accepted'],
    ];

    await acceptEvent.publish();

    console.log(`[JoinRequestService] Approved request from ${request.requesterPubkey}`);
  }

  /**
   * Reject join request - Publish rejection notification
   */
  async rejectRequest(request: JoinRequest): Promise<void> {
    const ndk = ndkStore.getState().ndk;
    if (!ndk) {
      throw new Error('NDK not initialized');
    }

    // Publish rejection notification (kind 1102)
    const rejectEvent = new NDKEvent(ndk);
    rejectEvent.kind = 1102;
    rejectEvent.content = `Sorry, your ${request.competitionType} join request was declined.`;
    rejectEvent.tags = [
      ['e', request.competitionId],
      ['p', request.requesterPubkey],
      ['t', 'join_rejected'],
    ];

    await rejectEvent.publish();

    console.log(`[JoinRequestService] Rejected request from ${request.requesterPubkey}`);
  }

  /**
   * Publish challenge acceptance request (kind 1106)
   */
  async publishChallengeAcceptance(
    challengeId: string,
    creatorPubkey: string
  ): Promise<void> {
    const ndk = ndkStore.getState().ndk;
    if (!ndk) {
      throw new Error('NDK not initialized');
    }

    const event = new NDKEvent(ndk);
    event.kind = 1106;
    event.content = 'Challenge acceptance request';
    event.tags = [
      ['e', challengeId],
      ['p', creatorPubkey],
      ['t', 'join_request'],
    ];

    await event.publish();

    console.log(`[JoinRequestService] Published challenge acceptance for ${challengeId}`);
  }

  /**
   * Publish event join request (kind 1101)
   */
  async publishEventJoinRequest(
    eventId: string,
    captainPubkey: string,
    eventName: string
  ): Promise<void> {
    const ndk = ndkStore.getState().ndk;
    if (!ndk) {
      throw new Error('NDK not initialized');
    }

    const event = new NDKEvent(ndk);
    event.kind = 1101;
    event.content = 'Requesting to join event';
    event.tags = [
      ['e', eventId],
      ['p', captainPubkey],
      ['t', 'join_request'],
      ['event_name', eventName],
    ];

    await event.publish();

    console.log(`[JoinRequestService] Published event join request for ${eventId}`);
  }

  /**
   * Unsubscribe from competition requests
   */
  unsubscribe(competitionId: string): void {
    const sub = this.subscriptions.get(competitionId);
    if (sub) {
      sub.stop();
      this.subscriptions.delete(competitionId);
      this.requestListeners.delete(competitionId);
      console.log(`[JoinRequestService] Unsubscribed from ${competitionId}`);
    }
  }

  /**
   * Clean up all subscriptions
   */
  cleanup(): void {
    this.subscriptions.forEach((sub) => sub.stop());
    this.subscriptions.clear();
    this.requestListeners.clear();
    console.log('[JoinRequestService] Cleaned up all subscriptions');
  }
}

export default JoinRequestService.getInstance();
