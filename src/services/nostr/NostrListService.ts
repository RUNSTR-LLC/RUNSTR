/**
 * NostrListService - Nostr List Management (Kind 30000/30001)
 * Manages team membership lists for fast, targeted queries
 * Integrates with existing NostrRelayManager infrastructure
 */

import { nostrRelayManager } from './NostrRelayManager';
import type { NostrRelayManager } from './NostrRelayManager';
import type { NostrFilter } from './NostrProtocolHandler';

// Define Event type locally to avoid nostr-tools dependency
export interface Event {
  id?: string;
  pubkey?: string;
  created_at?: number;
  kind?: number;
  tags?: string[][];
  content?: string;
  sig?: string;
}

export interface NostrListEvent extends Event {
  kind: 30000 | 30001; // Categorized People List or Generic List
}

export interface NostrList {
  id: string;
  name: string;
  description?: string;
  members: string[]; // Array of pubkeys
  author: string;
  createdAt: number;
  lastUpdated: number;
  dTag: string; // Unique identifier for replaceable events
  tags: string[][];
  nostrEvent: NostrListEvent;
}

export interface ListCreationData {
  name: string;
  description?: string;
  members: string[];
  dTag: string;
  listType?: 'people' | 'generic'; // Kind 30000 vs 30001
}

export interface ListSubscription {
  subscriptionId: string;
  listId: string;
  callback: (updatedList: NostrList) => void;
}

export class NostrListService {
  private relayManager: NostrRelayManager;
  private cachedLists: Map<string, NostrList> = new Map();
  private listSubscriptions: Map<string, ListSubscription> = new Map();
  private static instance: NostrListService;

  constructor(relayManager?: NostrRelayManager) {
    this.relayManager = relayManager || nostrRelayManager;
  }

  static getInstance(): NostrListService {
    if (!NostrListService.instance) {
      NostrListService.instance = new NostrListService();
    }
    return NostrListService.instance;
  }

  /**
   * Create a new Nostr list (team membership list)
   * NOTE: This prepares the event template - signing must be done externally
   */
  prepareListCreation(listData: ListCreationData, authorPubkey: string) {
    console.log(`📝 Preparing list creation: ${listData.name}`);

    const kind = listData.listType === 'generic' ? 30001 : 30000; // Default to people list
    const tags: string[][] = [
      ['d', listData.dTag], // Unique identifier for replaceable event
      ['name', listData.name],
    ];

    // Add description if provided
    if (listData.description) {
      tags.push(['description', listData.description]);
    }

    // Add members as 'p' tags for people lists, 't' tags for generic lists
    const memberTag = kind === 30000 ? 'p' : 't';
    listData.members.forEach((memberPubkey) => {
      tags.push([memberTag, memberPubkey]);
    });

    // Add team-related tags for discovery
    tags.push(['t', 'team']);
    tags.push(['t', 'fitness']);

    const eventTemplate = {
      kind,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content: listData.description || '',
      pubkey: authorPubkey,
    };

    console.log(
      `✅ Prepared ${kind === 30000 ? 'people' : 'generic'} list template:`,
      listData.name
    );
    return eventTemplate;
  }

  /**
   * Get a specific list by author and dTag
   */
  async getList(authorPubkey: string, dTag: string): Promise<NostrList | null> {
    const listId = `${authorPubkey}:${dTag}`;

    // Check cache first
    if (this.cachedLists.has(listId)) {
      console.log(`💾 Retrieved cached list: ${listId}`);
      return this.cachedLists.get(listId)!;
    }

    console.log(`🔍 Fetching list from relays: ${listId}`);

    try {
      const filters: NostrFilter[] = [
        {
          kinds: [30000, 30001],
          authors: [authorPubkey],
          '#d': [dTag],
          limit: 1,
        },
      ];

      let foundList: NostrList | null = null;

      const subscriptionId = await this.relayManager.subscribeToEvents(
        filters,
        (event: Event, relayUrl: string) => {
          console.log(`📥 List event received from ${relayUrl}:`, event.id);

          try {
            const parsedList = this.parseListEvent(event as NostrListEvent);
            if (parsedList) {
              foundList = parsedList;
              this.cachedLists.set(listId, parsedList);
              console.log(
                `✅ Cached list: ${parsedList.name} (${parsedList.members.length} members)`
              );
            }
          } catch (error) {
            console.warn(`⚠️ Failed to parse list event ${event.id}:`, error);
          }
        }
      );

      // Wait for initial results
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Clean up subscription
      this.relayManager.unsubscribe(subscriptionId);

      return foundList;
    } catch (error) {
      console.error(`❌ Failed to fetch list ${listId}:`, error);
      return null;
    }
  }

  /**
   * Get list members (pubkeys only)
   */
  async getListMembers(authorPubkey: string, dTag: string): Promise<string[]> {
    const list = await this.getList(authorPubkey, dTag);
    return list?.members || [];
  }

  /**
   * Subscribe to real-time list updates
   */
  async subscribeToList(
    authorPubkey: string,
    dTag: string,
    callback: (updatedList: NostrList) => void
  ): Promise<string> {
    const listId = `${authorPubkey}:${dTag}`;
    console.log(`🔔 Subscribing to list updates: ${listId}`);

    const filters: NostrFilter[] = [
      {
        kinds: [30000, 30001],
        authors: [authorPubkey],
        '#d': [dTag],
      },
    ];

    const subscriptionId = await this.relayManager.subscribeToEvents(
      filters,
      (event: Event, relayUrl: string) => {
        console.log(`🔄 List update received from ${relayUrl}:`, event.id);

        try {
          const updatedList = this.parseListEvent(event as NostrListEvent);
          if (updatedList) {
            // Update cache
            this.cachedLists.set(listId, updatedList);

            // Notify subscriber
            callback(updatedList);

            console.log(
              `✅ List updated: ${updatedList.name} (${updatedList.members.length} members)`
            );
          }
        } catch (error) {
          console.warn(`⚠️ Failed to parse list update ${event.id}:`, error);
        }
      }
    );

    // Store subscription for cleanup
    this.listSubscriptions.set(subscriptionId, {
      subscriptionId,
      listId,
      callback,
    });

    return subscriptionId;
  }

  /**
   * Unsubscribe from list updates
   */
  unsubscribeFromList(subscriptionId: string): void {
    console.log(`🔕 Unsubscribing from list updates: ${subscriptionId}`);

    this.relayManager.unsubscribe(subscriptionId);
    this.listSubscriptions.delete(subscriptionId);
  }

  /**
   * Parse a Nostr list event into our standard format
   */
  private parseListEvent(event: NostrListEvent): NostrList | null {
    try {
      // Extract basic info
      const dTag = event.tags.find((t) => t[0] === 'd')?.[1];
      if (!dTag) {
        console.warn('List event missing d tag:', event.id);
        return null;
      }

      const name =
        event.tags.find((t) => t[0] === 'name')?.[1] || 'Unnamed List';
      const description = event.tags.find((t) => t[0] === 'description')?.[1];

      // Extract members based on kind
      const memberTag = event.kind === 30000 ? 'p' : 't';
      const members = event.tags
        .filter((t) => t[0] === memberTag && t[1])
        .map((t) => t[1]);

      return {
        id: `${event.pubkey}:${dTag}`,
        name,
        description,
        members,
        author: event.pubkey,
        createdAt: event.created_at,
        lastUpdated: event.created_at,
        dTag,
        tags: event.tags,
        nostrEvent: event,
      };
    } catch (error) {
      console.error('Failed to parse list event:', error);
      return null;
    }
  }

  /**
   * Clear cached lists (useful for testing or manual refresh)
   */
  clearCache(): void {
    console.log('🧹 Clearing list cache');
    this.cachedLists.clear();
  }

  /**
   * Get all cached lists
   */
  getCachedLists(): NostrList[] {
    return Array.from(this.cachedLists.values());
  }

  /**
   * Check if a pubkey is in a specific list
   */
  async isInList(
    authorPubkey: string,
    dTag: string,
    memberPubkey: string
  ): Promise<boolean> {
    const members = await this.getListMembers(authorPubkey, dTag);
    return members.includes(memberPubkey);
  }

  /**
   * Get list statistics
   */
  async getListStats(
    authorPubkey: string,
    dTag: string
  ): Promise<{
    memberCount: number;
    lastUpdated: number;
    age: number; // in seconds
  } | null> {
    const list = await this.getList(authorPubkey, dTag);

    if (!list) return null;

    return {
      memberCount: list.members.length,
      lastUpdated: list.lastUpdated,
      age: Math.floor(Date.now() / 1000) - list.lastUpdated,
    };
  }

  /**
   * Prepare adding a member to a list (creates new list version)
   * Returns unsigned event template for external signing
   */
  prepareAddMember(
    authorPubkey: string,
    dTag: string,
    memberPubkey: string,
    currentList: NostrList
  ) {
    console.log(`📝 Preparing to add member ${memberPubkey} to list ${dTag}`);

    // Check if member is already in list
    if (currentList.members.includes(memberPubkey)) {
      console.log('Member already in list');
      return null;
    }

    // Add member to list
    const updatedMembers = [...currentList.members, memberPubkey];

    // Prepare updated list event
    return this.prepareListUpdate(currentList, updatedMembers, authorPubkey);
  }

  /**
   * Prepare removing a member from a list (creates new list version)
   * Returns unsigned event template for external signing
   */
  prepareRemoveMember(
    authorPubkey: string,
    dTag: string,
    memberPubkey: string,
    currentList: NostrList
  ) {
    console.log(`📝 Preparing to remove member ${memberPubkey} from list ${dTag}`);

    // Check if member is in list
    if (!currentList.members.includes(memberPubkey)) {
      console.log('Member not in list');
      return null;
    }

    // Remove member from list
    const updatedMembers = currentList.members.filter(m => m !== memberPubkey);

    // Prepare updated list event
    return this.prepareListUpdate(currentList, updatedMembers, authorPubkey);
  }

  /**
   * Prepare a list update with new members
   * Helper method for add/remove operations
   */
  private prepareListUpdate(
    currentList: NostrList,
    updatedMembers: string[],
    authorPubkey: string
  ) {
    const kind = currentList.nostrEvent.kind;
    const tags: Array<[string, string]> = [
      ['d', currentList.dTag],
      ['name', currentList.name],
    ];

    // Add description if it exists
    if (currentList.description) {
      tags.push(['description', currentList.description]);
    }

    // Add updated members
    const memberTag = kind === 30000 ? 'p' : 't';
    updatedMembers.forEach((memberPubkey) => {
      tags.push([memberTag, memberPubkey]);
    });

    // Add team-related tags for discovery
    tags.push(['t', 'team']);
    tags.push(['t', 'fitness']);

    const eventTemplate = {
      kind,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content: currentList.description || '',
      pubkey: authorPubkey,
    };

    console.log(`✅ Prepared list update with ${updatedMembers.length} members`);
    return eventTemplate;
  }

  /**
   * Update cached list after successful publish
   */
  updateCachedList(listId: string, updatedMembers: string[]) {
    const cachedList = this.cachedLists.get(listId);
    if (cachedList) {
      cachedList.members = updatedMembers;
      cachedList.lastUpdated = Math.floor(Date.now() / 1000);
      console.log(`✅ Updated cached list: ${listId} with ${updatedMembers.length} members`);
    }
  }

  /**
   * Cleanup all subscriptions (call on app shutdown)
   */
  cleanup(): void {
    console.log('🧹 Cleaning up all list subscriptions');

    for (const subscription of this.listSubscriptions.values()) {
      this.relayManager.unsubscribe(subscription.subscriptionId);
    }

    this.listSubscriptions.clear();
    this.cachedLists.clear();
  }
}

export default NostrListService.getInstance();
