/**
 * TeamJoinRequestService - Handle team join request workflow
 * Creates, queries, and processes team join requests using Nostr events
 * Uses kind 1104 for join requests with simple approve/decline workflow
 */

import type { Event } from 'nostr-tools';
import { GlobalNDKService } from '../nostr/GlobalNDKService';
import type { NDKFilter, NDKEvent, NDKSubscription } from '@nostr-dev-kit/ndk';

export interface TeamJoinRequest {
  id: string;
  requesterId: string;
  requesterName?: string;
  teamId: string;
  teamName: string;
  captainPubkey: string;
  message: string;
  timestamp: number;
  status: 'pending' | 'approved' | 'declined';
  nostrEvent: Event;
}

export interface JoinRequestData {
  teamId: string;
  teamName: string;
  captainPubkey: string;
  message: string;
}

export interface JoinRequestResponse {
  success: boolean;
  requestId?: string;
  message: string;
}

export class TeamJoinRequestService {
  private static instance: TeamJoinRequestService;
  private cachedRequests: Map<string, TeamJoinRequest[]> = new Map();
  private cacheExpiryMs = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate = 0;

  constructor() {
    // No relay manager needed - uses GlobalNDKService
  }

  static getInstance(): TeamJoinRequestService {
    if (!TeamJoinRequestService.instance) {
      TeamJoinRequestService.instance = new TeamJoinRequestService();
    }
    return TeamJoinRequestService.instance;
  }

  /**
   * Create a join request event template (requires external signing)
   */
  prepareJoinRequest(
    requestData: JoinRequestData,
    requesterPubkey: string
  ): Partial<Event> {
    console.log(`📝 Preparing join request for team: ${requestData.teamName}`);

    const tags: string[][] = [
      ['e', requestData.teamId], // Reference to team event
      ['p', requestData.captainPubkey], // Tag the captain
      ['t', 'team-join-request'],
      ['team-id', requestData.teamId],
      ['team-name', requestData.teamName],
    ];

    const eventTemplate = {
      kind: 1104, // Custom kind for team join requests
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content: requestData.message,
      pubkey: requesterPubkey,
    };

    console.log(`✅ Prepared join request template for: ${requestData.teamName}`);
    return eventTemplate;
  }

  /**
   * Get pending join requests for a captain
   */
  async getJoinRequests(
    captainPubkey: string,
    teamId?: string
  ): Promise<TeamJoinRequest[]> {
    const cacheKey = `${captainPubkey}:${teamId || 'all'}`;

    // Check cache first
    if (this.isCacheValid() && this.cachedRequests.has(cacheKey)) {
      console.log(`💾 Retrieved cached join requests for captain: ${captainPubkey.slice(0, 8)}`);
      return this.cachedRequests.get(cacheKey)!;
    }

    console.log(`🔍 Fetching join requests for captain: ${captainPubkey.slice(0, 8)}`);

    try {
      // Get GlobalNDK instance
      const ndk = await GlobalNDKService.getInstance();

      const filter: NDKFilter = {
        kinds: [1104 as any], // Custom event kind
        '#p': [captainPubkey],
        ...(teamId && { '#team-id': [teamId] }),
        limit: 50,
      };

      const requests: TeamJoinRequest[] = [];
      let processedEvents = 0;

      const subscription = ndk.subscribe(filter, { closeOnEose: false });

      subscription.on('event', (event: NDKEvent) => {
        console.log(`📥 Join request received: ${event.id.slice(0, 8)}`);
        processedEvents++;

        try {
          const nostrEvent = this.ndkEventToEvent(event);
          const request = this.parseJoinRequestEvent(nostrEvent);
          if (request) {
            requests.push(request);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to parse join request ${event.id}:`, error);
        }
      });

      // Wait for initial results
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Clean up subscription
      subscription.stop();

      // Sort by timestamp (newest first)
      requests.sort((a, b) => b.timestamp - a.timestamp);

      // Cache results
      this.cachedRequests.set(cacheKey, requests);
      this.lastCacheUpdate = Date.now();

      console.log(`✅ Found ${requests.length} join requests (${processedEvents} events processed)`);
      return requests;
    } catch (error) {
      console.error(`❌ Failed to fetch join requests:`, error);
      return [];
    }
  }

  /**
   * Get join requests for a specific team
   */
  async getTeamJoinRequests(teamId: string): Promise<TeamJoinRequest[]> {
    console.log(`🔍 Fetching join requests for team: ${teamId}`);

    try {
      // Get GlobalNDK instance
      const ndk = await GlobalNDKService.getInstance();

      const filter: NDKFilter = {
        kinds: [1104 as any], // Custom event kind
        '#team-id': [teamId],
        limit: 20,
      };

      const requests: TeamJoinRequest[] = [];

      const subscription = ndk.subscribe(filter, { closeOnEose: false });

      subscription.on('event', (event: NDKEvent) => {
        try {
          const nostrEvent = this.ndkEventToEvent(event);
          const request = this.parseJoinRequestEvent(nostrEvent);
          if (request) {
            requests.push(request);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to parse team join request:`, error);
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 1500));
      subscription.stop();

      requests.sort((a, b) => b.timestamp - a.timestamp);

      console.log(`✅ Found ${requests.length} join requests for team ${teamId}`);
      return requests;
    } catch (error) {
      console.error(`❌ Failed to fetch team join requests:`, error);
      return [];
    }
  }

  /**
   * Check if a user has a pending join request for a team
   */
  async hasPendingRequest(
    requesterPubkey: string,
    teamId: string
  ): Promise<boolean> {
    console.log(`🔍 Checking pending request: ${requesterPubkey.slice(0, 8)} → team ${teamId}`);

    try {
      // Get GlobalNDK instance
      const ndk = await GlobalNDKService.getInstance();

      const filter: NDKFilter = {
        kinds: [1104 as any], // Custom event kind
        authors: [requesterPubkey],
        '#team-id': [teamId],
        limit: 5,
      };

      let hasPending = false;

      const subscription = ndk.subscribe(filter, { closeOnEose: false });

      subscription.on('event', (event: NDKEvent) => {
        const nostrEvent = this.ndkEventToEvent(event);
        const request = this.parseJoinRequestEvent(nostrEvent);
        if (request && request.status === 'pending') {
          hasPending = true;
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
      subscription.stop();

      console.log(`${hasPending ? '✅' : '❌'} Pending request status: ${hasPending}`);
      return hasPending;
    } catch (error) {
      console.error(`❌ Failed to check pending request:`, error);
      return false;
    }
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
   * Parse a join request Nostr event
   */
  private parseJoinRequestEvent(event: Event): TeamJoinRequest | null {
    try {
      const teamIdTag = event.tags.find((t) => t[0] === 'team-id')?.[1];
      const teamNameTag = event.tags.find((t) => t[0] === 'team-name')?.[1];
      const captainTag = event.tags.find((t) => t[0] === 'p')?.[1];

      if (!teamIdTag || !captainTag) {
        console.warn(`Join request missing required tags: ${event.id}`);
        return null;
      }

      return {
        id: event.id,
        requesterId: event.pubkey,
        teamId: teamIdTag,
        teamName: teamNameTag || 'Unknown Team',
        captainPubkey: captainTag,
        message: event.content || 'No message provided',
        timestamp: event.created_at,
        status: 'pending', // Default status for parsed events
        nostrEvent: event,
      };
    } catch (error) {
      console.error('Failed to parse join request event:', error);
      return null;
    }
  }

  /**
   * Subscribe to real-time join request updates for a captain
   */
  async subscribeToJoinRequests(
    captainPubkey: string,
    callback: (request: TeamJoinRequest) => void
  ): Promise<NDKSubscription> {
    console.log(`🔔 Subscribing to join requests for captain: ${captainPubkey.slice(0, 8)}`);

    // Get GlobalNDK instance
    const ndk = await GlobalNDKService.getInstance();

    const filter: NDKFilter = {
      kinds: [1104 as any], // Custom event kind
      '#p': [captainPubkey],
      since: Math.floor(Date.now() / 1000),
    };

    const subscription = ndk.subscribe(filter, { closeOnEose: false });

    subscription.on('event', (event: NDKEvent) => {
      console.log(`🔔 New join request: ${event.id.slice(0, 8)}`);

      try {
        const nostrEvent = this.ndkEventToEvent(event);
        const request = this.parseJoinRequestEvent(nostrEvent);
        if (request) {
          callback(request);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to parse real-time join request:`, error);
      }
    });

    return subscription;
  }

  /**
   * Unsubscribe from join request updates
   */
  unsubscribeFromJoinRequests(subscription: NDKSubscription): void {
    console.log(`🔕 Unsubscribing from join requests`);
    subscription.stop();
  }

  /**
   * Clear cached requests
   */
  clearCache(): void {
    console.log('🧹 Clearing join request cache');
    this.cachedRequests.clear();
    this.lastCacheUpdate = 0;
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.lastCacheUpdate < this.cacheExpiryMs;
  }

  /**
   * Get cached request count for debugging
   */
  getCacheStats(): { cachedTeams: number; lastUpdate: number } {
    return {
      cachedTeams: this.cachedRequests.size,
      lastUpdate: this.lastCacheUpdate,
    };
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup(): void {
    console.log('🧹 Cleaning up TeamJoinRequestService');
    this.clearCache();
  }
}

export default TeamJoinRequestService.getInstance();