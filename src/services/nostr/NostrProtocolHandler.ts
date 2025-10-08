/**
 * NostrProtocolHandler - Nostr Protocol Message Formatting
 * Handles REQ, EVENT, CLOSE message creation and filter management according to Nostr NIPs
 */

// Use NDK's nip19 instead of nostr-tools to avoid crypto conflicts
import { nip19, type NDKSigner, type NostrEvent } from '@nostr-dev-kit/ndk';
import { AmberNDKSigner } from '../auth/amber/AmberNDKSigner';

// Import nostr-tools types only (not functions)
import type { Event, Filter, EventTemplate } from 'nostr-tools';

export interface NostrFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  since?: number;
  until?: number;
  limit?: number;
  [key: string]: any;
}

export interface SubscriptionOptions {
  closeOnEose?: boolean;
  timeout?: number;
  maxEvents?: number;
}

export interface PublishResult {
  eventId: string;
  success: boolean;
  message?: string;
}

export class NostrProtocolHandler {
  private activeSubscriptions: Map<
    string,
    {
      filters: NostrFilter[];
      options: SubscriptionOptions;
      eventCount: number;
      startedAt: number;
    }
  > = new Map();

  /**
   * Get public key from private key hex string
   */
  async getPubkeyFromPrivate(privateKeyHex: string): Promise<string> {
    try {
      // Convert hex private key to Uint8Array
      const privateKeyBytes = new Uint8Array(
        privateKeyHex.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) || []
      );

      if (privateKeyBytes.length !== 32) {
        throw new Error('Private key must be 32 bytes');
      }

      // Get public key using nostr-tools (dynamic import to avoid crypto conflicts)
      const { getPublicKey } = await import('nostr-tools');
      const pubkey = getPublicKey(privateKeyBytes);
      return pubkey;
    } catch (error) {
      console.error('Failed to get pubkey from private key:', error);
      throw error;
    }
  }

  /**
   * Create a REQ message for subscribing to events
   */
  createREQMessage(subscriptionId: string, filters: NostrFilter[]): any[] {
    // Validate subscription ID
    if (!subscriptionId || subscriptionId.length === 0) {
      throw new Error('Subscription ID is required');
    }

    // Validate filters
    if (!Array.isArray(filters) || filters.length === 0) {
      throw new Error('At least one filter is required');
    }

    // Clean and validate filters
    const cleanFilters = this.cleanFilters(filters);

    // Track subscription
    this.activeSubscriptions.set(subscriptionId, {
      filters: cleanFilters,
      options: {},
      eventCount: 0,
      startedAt: Date.now(),
    });

    console.log(`📡 Creating REQ message for subscription: ${subscriptionId}`);
    return ['REQ', subscriptionId, ...cleanFilters];
  }

  /**
   * Create a CLOSE message for closing subscriptions
   */
  createCLOSEMessage(subscriptionId: string): any[] {
    console.log(
      `🔕 Creating CLOSE message for subscription: ${subscriptionId}`
    );

    // Remove from active subscriptions
    this.activeSubscriptions.delete(subscriptionId);

    return ['CLOSE', subscriptionId];
  }

  /**
   * Create an EVENT message for publishing events
   */
  async createEVENTMessage(event: Event): Promise<any[]> {
    // Verify event structure and signature
    if (!this.verifyEventStructure(event)) {
      throw new Error('Invalid event structure');
    }

    // Dynamic import to avoid crypto conflicts
    const { verifyEvent } = await import('nostr-tools');
    if (!verifyEvent(event)) {
      throw new Error('Invalid event signature');
    }

    console.log(`📮 Creating EVENT message for event: ${event.id}`);
    return ['EVENT', event];
  }

  /**
   * Create standardized filters for common use cases
   */
  createProfileFilter(
    pubkey: string,
    options: { limit?: number } = {}
  ): NostrFilter {
    return {
      authors: [pubkey],
      kinds: [0], // Profile metadata
      limit: options.limit || 1,
    };
  }

  /**
   * Create filter for kind 1301 workout events
   */
  createWorkoutFilter(
    pubkey: string,
    options: {
      since?: number;
      until?: number;
      limit?: number;
    } = {}
  ): NostrFilter {
    // Convert npub to hex if needed
    let hexPubkey = pubkey;
    if (pubkey.startsWith('npub1')) {
      try {
        const { data } = nip19.decode(pubkey);
        hexPubkey = data as string;
        console.log('🔑 Converted npub to hex for workout filter:', pubkey.slice(0, 12) + '... → ' + hexPubkey.slice(0, 12) + '...');
      } catch (error) {
        console.error('❌ Failed to decode npub:', error);
        // Fallback to original pubkey
      }
    }

    const filter: NostrFilter = {
      authors: [hexPubkey],
      kinds: [1301], // Workout events
    };

    if (options.since) filter.since = options.since;
    if (options.until) filter.until = options.until;
    if (options.limit) filter.limit = options.limit;

    return filter;
  }

  /**
   * Create filter for following/contact list
   */
  createContactListFilter(pubkey: string): NostrFilter {
    return {
      authors: [pubkey],
      kinds: [3], // Contact list
      limit: 1,
    };
  }

  /**
   * Create filter for text notes
   */
  createTextNoteFilter(
    authors: string[],
    options: {
      since?: number;
      until?: number;
      limit?: number;
    } = {}
  ): NostrFilter {
    const filter: NostrFilter = {
      authors,
      kinds: [1], // Text notes
    };

    if (options.since) filter.since = options.since;
    if (options.until) filter.until = options.until;
    if (options.limit) filter.limit = options.limit;

    return filter;
  }

  /**
   * Create a signed event
   */
  async signEvent(
    eventTemplate: EventTemplate,
    privateKeyHex: string
  ): Promise<Event> {
    try {
      // Convert hex private key to Uint8Array
      const privateKeyBytes = new Uint8Array(
        privateKeyHex.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) || []
      );

      if (privateKeyBytes.length !== 32) {
        throw new Error('Private key must be 32 bytes');
      }

      // Create and sign event (dynamic import to avoid crypto conflicts)
      const { finalizeEvent } = await import('nostr-tools');
      const signedEvent = finalizeEvent(eventTemplate, privateKeyBytes);

      console.log(
        `✅ Signed event: ${signedEvent.id} (kind ${signedEvent.kind})`
      );
      return signedEvent;
    } catch (error) {
      console.error('❌ Failed to sign event:', error);
      throw new Error('Failed to sign event');
    }
  }

  /**
   * Sign an event using an NDKSigner (supports both nsec and Amber)
   */
  async signEventWithSigner(
    eventTemplate: EventTemplate,
    signer: NDKSigner
  ): Promise<Event> {
    try {
      // Get user from signer
      const user = await signer.user();

      // Create unsigned event with pubkey
      const unsignedEvent: NostrEvent = {
        pubkey: user.pubkey,
        created_at: eventTemplate.created_at || Math.floor(Date.now() / 1000),
        kind: eventTemplate.kind!,
        tags: eventTemplate.tags || [],
        content: eventTemplate.content || '',
        id: '',
        sig: ''
      };

      // Sign with the signer (handles both nsec and Amber automatically)
      const signature = await signer.sign(unsignedEvent);

      // Try to get event ID from Amber if it's an AmberNDKSigner
      // Amber calculates the ID as part of signing per NIP-55
      let id: string;
      if (signer instanceof AmberNDKSigner) {
        const amberEventId = signer.getLastSignedEventId();
        if (amberEventId) {
          id = amberEventId;
          console.log('✅ Using event ID from Amber:', id.substring(0, 16) + '...');
        } else {
          // Fallback: calculate event ID if Amber didn't return it
          const { getEventHash } = await import('nostr-tools');
          id = getEventHash(unsignedEvent as any);
          console.log('⚠️ Amber did not return event ID, calculated locally:', id.substring(0, 16) + '...');
        }
      } else {
        // For other signers (nsec), calculate event ID locally
        const { getEventHash } = await import('nostr-tools');
        id = getEventHash(unsignedEvent as any);
      }

      // Create the signed event
      const signedEvent: Event = {
        ...unsignedEvent,
        id,
        sig: signature
      };

      console.log(
        `✅ Signed event with NDKSigner: ${signedEvent.id} (kind ${signedEvent.kind})`
      );
      return signedEvent;
    } catch (error) {
      console.error('❌ Failed to sign event with NDKSigner:', error);
      throw error;
    }
  }

  /**
   * Create a workout event (kind 1301)
   */
  createWorkoutEvent(
    privateKeyHex: string,
    workoutData: {
      type: string;
      duration: number;
      distance?: number;
      calories?: number;
      [key: string]: any;
    }
  ): Promise<Event> {
    const eventTemplate: EventTemplate = {
      kind: 1301,
      content: JSON.stringify(workoutData),
      tags: [
        ['activity', workoutData.type],
        ['duration', workoutData.duration.toString()],
        ...(workoutData.distance
          ? [['distance', workoutData.distance.toString()]]
          : []),
        ...(workoutData.calories
          ? [['calories', workoutData.calories.toString()]]
          : []),
      ],
      created_at: Math.floor(Date.now() / 1000),
    };

    return this.signEvent(eventTemplate, privateKeyHex);
  }

  /**
   * Create a profile event (kind 0)
   */
  createProfileEvent(
    privateKeyHex: string,
    profileData: {
      name?: string;
      about?: string;
      picture?: string;
      lud16?: string;
      [key: string]: any;
    }
  ): Promise<Event> {
    const eventTemplate: EventTemplate = {
      kind: 0,
      content: JSON.stringify(profileData),
      tags: [],
      created_at: Math.floor(Date.now() / 1000),
    };

    return this.signEvent(eventTemplate, privateKeyHex);
  }

  /**
   * Clean and validate filters
   */
  private cleanFilters(filters: NostrFilter[]): NostrFilter[] {
    return filters.map((filter) => {
      const cleaned: NostrFilter = {};

      // Copy allowed fields with validation
      if (filter.ids) {
        cleaned.ids = Array.isArray(filter.ids)
          ? filter.ids.slice(0, 100)
          : [filter.ids];
      }

      if (filter.authors) {
        cleaned.authors = Array.isArray(filter.authors)
          ? filter.authors.slice(0, 100)
          : [filter.authors];
      }

      if (filter.kinds) {
        cleaned.kinds = Array.isArray(filter.kinds)
          ? filter.kinds
          : [filter.kinds];
      }

      if (typeof filter.since === 'number' && filter.since > 0) {
        cleaned.since = filter.since;
      }

      if (typeof filter.until === 'number' && filter.until > 0) {
        cleaned.until = filter.until;
      }

      if (typeof filter.limit === 'number' && filter.limit > 0) {
        cleaned.limit = Math.min(filter.limit, 5000); // Cap at 5000 events
      }

      // Copy custom fields (like #t tags, #e tags, etc.)
      Object.keys(filter).forEach((key) => {
        if (key.startsWith('#')) {
          cleaned[key] = filter[key];
        }
      });

      return cleaned;
    });
  }

  /**
   * Verify event structure
   */
  private verifyEventStructure(event: any): event is Event {
    return (
      typeof event === 'object' &&
      typeof event.id === 'string' &&
      typeof event.pubkey === 'string' &&
      typeof event.created_at === 'number' &&
      typeof event.kind === 'number' &&
      Array.isArray(event.tags) &&
      typeof event.content === 'string' &&
      typeof event.sig === 'string'
    );
  }

  /**
   * Handle event received for subscription
   */
  handleEventForSubscription(subscriptionId: string, event: Event): boolean {
    const subscription = this.activeSubscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    subscription.eventCount++;

    // Check if we've reached max events
    if (
      subscription.options.maxEvents &&
      subscription.eventCount >= subscription.options.maxEvents
    ) {
      console.log(
        `📊 Subscription ${subscriptionId} reached max events (${subscription.options.maxEvents})`
      );
      return false; // Signal to close subscription
    }

    // Check timeout
    if (subscription.options.timeout) {
      const elapsed = Date.now() - subscription.startedAt;
      if (elapsed > subscription.options.timeout) {
        console.log(
          `⏰ Subscription ${subscriptionId} timed out after ${elapsed}ms`
        );
        return false; // Signal to close subscription
      }
    }

    return true; // Continue subscription
  }

  /**
   * Handle EOSE for subscription
   */
  handleEOSEForSubscription(subscriptionId: string): boolean {
    const subscription = this.activeSubscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    console.log(
      `📝 EOSE received for ${subscriptionId}: ${subscription.eventCount} events received`
    );

    // Close subscription if closeOnEose is set
    return !subscription.options.closeOnEose;
  }

  /**
   * Generate subscription ID
   */
  generateSubscriptionId(prefix = 'sub'): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Get subscription statistics
   */
  getSubscriptionStats(): {
    active: number;
    totalEvents: number;
    subscriptions: Array<{
      id: string;
      eventCount: number;
      duration: number;
      filters: NostrFilter[];
    }>;
  } {
    const subscriptions = Array.from(this.activeSubscriptions.entries()).map(
      ([id, sub]) => ({
        id,
        eventCount: sub.eventCount,
        duration: Date.now() - sub.startedAt,
        filters: sub.filters,
      })
    );

    const totalEvents = subscriptions.reduce(
      (sum, sub) => sum + sub.eventCount,
      0
    );

    return {
      active: this.activeSubscriptions.size,
      totalEvents,
      subscriptions,
    };
  }

  /**
   * Validate Nostr event ID format
   */
  isValidEventId(id: string): boolean {
    return typeof id === 'string' && /^[a-f0-9]{64}$/.test(id);
  }

  /**
   * Validate Nostr public key format
   */
  isValidPubkey(pubkey: string): boolean {
    return typeof pubkey === 'string' && /^[a-f0-9]{64}$/.test(pubkey);
  }

  /**
   * Convert timestamp to human readable format
   */
  formatTimestamp(timestamp: number): string {
    return new Date(timestamp * 1000).toISOString();
  }

  /**
   * Parse tag value by tag name
   */
  getTagValue(event: Event, tagName: string): string | undefined {
    const tag = event.tags.find(
      (tag) => Array.isArray(tag) && tag[0] === tagName
    );
    return tag && tag.length > 1 ? tag[1] : undefined;
  }

  /**
   * Get all values for a specific tag
   */
  getTagValues(event: Event, tagName: string): string[] {
    return event.tags
      .filter((tag) => Array.isArray(tag) && tag[0] === tagName)
      .map((tag) => tag[1])
      .filter((value) => typeof value === 'string');
  }

  /**
   * Clear all active subscriptions
   */
  clearAllSubscriptions(): void {
    console.log(
      `🧹 Clearing ${this.activeSubscriptions.size} active subscriptions`
    );
    this.activeSubscriptions.clear();
  }

  /**
   * Get active subscription IDs
   */
  getActiveSubscriptionIds(): string[] {
    return Array.from(this.activeSubscriptions.keys());
  }
}
