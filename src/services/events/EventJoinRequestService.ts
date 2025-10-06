/**
 * EventJoinRequestService - Handle event join request workflow
 * Creates, queries, and processes event join requests using Nostr events
 * Uses kind 1105 for event join requests (different from team requests)
 * Consistent with team join flow but for event-specific participation
 */

import type { Event } from 'nostr-tools';
import { GlobalNDKService } from '../nostr/GlobalNDKService';
import type { NDKFilter, NDKEvent, NDKSubscription } from '@nostr-dev-kit/ndk';

export interface EventJoinRequest {
  id: string;
  requesterId: string;
  requesterName?: string;
  eventId: string;
  eventName: string;
  teamId: string;
  captainPubkey: string;
  message: string;
  timestamp: number;
  status: 'pending' | 'approved' | 'declined';
  nostrEvent: Event;
}

export interface EventJoinRequestData {
  eventId: string;
  eventName: string;
  teamId: string;
  captainPubkey: string;
  message: string;
}

export interface EventJoinRequestResponse {
  success: boolean;
  requestId?: string;
  message: string;
}

export class EventJoinRequestService {
  private static instance: EventJoinRequestService;
  private cachedRequests: Map<string, EventJoinRequest[]> = new Map();
  private cacheExpiryMs = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate = 0;

  constructor() {
    // No relay manager needed - uses GlobalNDKService
  }

  static getInstance(): EventJoinRequestService {
    if (!EventJoinRequestService.instance) {
      EventJoinRequestService.instance = new EventJoinRequestService();
    }
    return EventJoinRequestService.instance;
  }

  /**
   * Create an event join request event template (requires external signing)
   */
  prepareEventJoinRequest(
    requestData: EventJoinRequestData,
    requesterPubkey: string
  ): Partial<Event> {
    console.log(`📝 Preparing join request for event: ${requestData.eventName}`);

    const tags: string[][] = [
      ['e', requestData.eventId], // Reference to event
      ['p', requestData.captainPubkey], // Tag the captain
      ['t', 'event-join-request'],
      ['event-id', requestData.eventId],
      ['event-name', requestData.eventName],
      ['team-id', requestData.teamId],
    ];

    const eventTemplate = {
      kind: 1105, // Custom kind for event join requests (different from team: 1104)
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content: requestData.message,
      pubkey: requesterPubkey,
    };

    console.log(`✅ Prepared event join request template for: ${requestData.eventName}`);
    return eventTemplate;
  }

  /**
   * Get pending event join requests for a captain
   */
  async getEventJoinRequests(
    captainPubkey: string,
    eventId?: string
  ): Promise<EventJoinRequest[]> {
    const cacheKey = `${captainPubkey}:${eventId || 'all'}`;

    // Check cache first
    if (this.isCacheValid() && this.cachedRequests.has(cacheKey)) {
      console.log(`💾 Retrieved cached event join requests for captain`);
      return this.cachedRequests.get(cacheKey)!;
    }

    console.log(`🔍 Fetching event join requests for captain`);

    try {
      // Get GlobalNDK instance
      const ndk = await GlobalNDKService.getInstance();

      const filter: NDKFilter = {
        kinds: [1105 as any], // Custom event kind
        '#p': [captainPubkey],
        ...(eventId && { '#event-id': [eventId] }),
        limit: 100,
      };

      const requests: EventJoinRequest[] = [];
      const subscription = ndk.subscribe(filter, { closeOnEose: false });

      subscription.on('event', (event: NDKEvent) => {
        try {
          const nostrEvent = this.ndkEventToEvent(event);
          const joinRequest = this.parseJoinRequest(nostrEvent);
          if (joinRequest && (!eventId || joinRequest.eventId === eventId)) {
            requests.push(joinRequest);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to parse event join request:`, error);
        }
      });

      // Wait for events to come in
      await new Promise((resolve) => setTimeout(resolve, 2000));
      subscription.stop();

      // Sort by timestamp (newest first)
      requests.sort((a, b) => b.timestamp - a.timestamp);

      // Update cache
      this.cachedRequests.set(cacheKey, requests);
      this.lastCacheUpdate = Date.now();

      console.log(`✅ Found ${requests.length} event join requests`);
      return requests;
    } catch (error) {
      console.error('❌ Failed to fetch event join requests:', error);
      return [];
    }
  }

  /**
   * Get join requests for specific events
   */
  async getEventJoinRequestsByEventIds(
    eventIds: string[]
  ): Promise<Map<string, EventJoinRequest[]>> {
    const requestsByEvent = new Map<string, EventJoinRequest[]>();

    try {
      // Get GlobalNDK instance
      const ndk = await GlobalNDKService.getInstance();

      const filter: NDKFilter = {
        kinds: [1105 as any], // Custom event kind
        '#event-id': eventIds,
        limit: 500,
      };

      const allRequests: EventJoinRequest[] = [];
      const subscription = ndk.subscribe(filter, { closeOnEose: false });

      subscription.on('event', (event: NDKEvent) => {
        try {
          const nostrEvent = this.ndkEventToEvent(event);
          const joinRequest = this.parseJoinRequest(nostrEvent);
          if (joinRequest) {
            allRequests.push(joinRequest);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to parse event join request:`, error);
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));
      subscription.stop();

      // Group requests by event
      for (const request of allRequests) {
        const eventRequests = requestsByEvent.get(request.eventId) || [];
        eventRequests.push(request);
        requestsByEvent.set(request.eventId, eventRequests);
      }

      return requestsByEvent;
    } catch (error) {
      console.error('❌ Failed to fetch event join requests by IDs:', error);
      return requestsByEvent;
    }
  }

  /**
   * Subscribe to real-time event join requests
   */
  async subscribeToEventJoinRequests(
    captainPubkey: string,
    callback: (joinRequest: EventJoinRequest) => void
  ): Promise<NDKSubscription> {
    console.log(`🔔 Subscribing to event join requests for captain`);

    // Get GlobalNDK instance
    const ndk = await GlobalNDKService.getInstance();

    const filter: NDKFilter = {
      kinds: [1105 as any], // Custom event kind
      '#p': [captainPubkey],
      since: Math.floor(Date.now() / 1000),
    };

    const subscription = ndk.subscribe(filter, { closeOnEose: false });

    subscription.on('event', (event: NDKEvent) => {
      try {
        const nostrEvent = this.ndkEventToEvent(event);
        const joinRequest = this.parseJoinRequest(nostrEvent);
        if (joinRequest) {
          callback(joinRequest);
          console.log(`📥 New event join request received: ${joinRequest.eventName}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to parse real-time event join request:`, error);
      }
    });

    return subscription;
  }

  /**
   * Convert NDKEvent to our Event interface format
   */
  private ndkEventToEvent(ndkEvent: NDKEvent): Event {
    return {
      id: ndkEvent.id || '',
      pubkey: ndkEvent.pubkey || '',
      created_at: ndkEvent.created_at || Math.floor(Date.now() / 1000),
      kind: ndkEvent.kind,
      tags: ndkEvent.tags || [],
      content: ndkEvent.content || '',
      sig: ndkEvent.sig || '',
    };
  }

  /**
   * Parse a Nostr event into EventJoinRequest
   */
  private parseJoinRequest(event: Event): EventJoinRequest | null {
    try {
      const eventIdTag = event.tags.find((t) => t[0] === 'event-id');
      const eventNameTag = event.tags.find((t) => t[0] === 'event-name');
      const teamIdTag = event.tags.find((t) => t[0] === 'team-id');
      const captainTag = event.tags.find((t) => t[0] === 'p');

      if (!eventIdTag || !eventNameTag || !captainTag) {
        return null;
      }

      return {
        id: event.id || '',
        requesterId: event.pubkey,
        eventId: eventIdTag[1],
        eventName: eventNameTag[1],
        teamId: teamIdTag?.[1] || '',
        captainPubkey: captainTag[1],
        message: event.content || '',
        timestamp: event.created_at || Math.floor(Date.now() / 1000),
        status: 'pending',
        nostrEvent: event,
      };
    } catch (error) {
      console.error('❌ Failed to parse event join request:', error);
      return null;
    }
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.lastCacheUpdate < this.cacheExpiryMs;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cachedRequests.clear();
    this.lastCacheUpdate = 0;
  }
}

export default EventJoinRequestService.getInstance();