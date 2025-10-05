/**
 * ChatService - NIP-28 Team Chat Implementation
 * Handles channel creation, message publishing, and real-time subscriptions
 * Uses existing NDK instance and nostrProfileService for efficiency
 */

import NDK, { NDKEvent, NDKFilter, NDKSubscription } from '@nostr-dev-kit/ndk';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TeamChannel {
  id: string;
  teamId: string;
  teamName: string;
  created_at: number;
  captainPubkey: string;
}

export class ChatService {
  private ndk: NDK | null = null;
  private activeSubscriptions: Map<string, NDKSubscription> = new Map();

  /**
   * Get NDK instance from global scope
   */
  private getNDK(): NDK {
    if (this.ndk) return this.ndk;

    // Get global NDK instance initialized by NostrInitializationService
    const globalNDK = (global as any).preInitializedNDK;

    if (!globalNDK) {
      throw new Error('NDK not initialized. Ensure NostrInitializationService has run.');
    }

    this.ndk = globalNDK;
    return this.ndk;
  }

  /**
   * Create kind 40 team channel (captain only)
   * Uses NDK-generated event ID (not predetermined)
   */
  async createTeamChannel(
    teamId: string,
    teamName: string,
    captainPubkey: string
  ): Promise<NDKEvent> {
    console.log(`📢 Creating chat channel for team: ${teamName}`);

    try {
      const ndk = this.getNDK();

      const event = new NDKEvent(ndk);
      event.kind = 40; // NIP-28 Channel Creation
      event.content = JSON.stringify({
        name: `${teamName} Chat`,
        about: `Team chat for ${teamName}. ⚠️ Messages are public on Nostr.`,
        relays: [] // Use NDK's relay pool
      });
      event.tags = [
        ['d', teamId], // Team identifier tag
        ['team', teamId], // For filtering by team
        ['t', 'runstr-team-chat'] // Category tag
      ];

      await event.sign();
      await event.publish();

      console.log(`✅ Chat channel created with ID: ${event.id}`);

      // Store NDK-generated channel ID locally
      await AsyncStorage.setItem(
        `@runstr:team_chat:${teamId}`,
        event.id!
      );

      return event;
    } catch (error) {
      console.error('❌ Failed to create chat channel:', error);
      throw error;
    }
  }

  /**
   * Find existing channel by team tag
   * Queries by captain pubkey + team tag (not by predetermined ID)
   */
  async getTeamChannel(
    teamId: string,
    captainPubkey: string
  ): Promise<NDKEvent | null> {
    console.log(`🔍 Looking for chat channel for team: ${teamId}`);

    try {
      // Check local storage first
      const storedId = await AsyncStorage.getItem(`@runstr:team_chat:${teamId}`);
      if (storedId) {
        const event = await this.fetchChannelById(storedId);
        if (event) {
          console.log(`✅ Found cached channel ID: ${storedId}`);
          return event;
        }
      }

      // Query by team tag (senior dev's recommendation)
      const ndk = this.getNDK();
      const filter: NDKFilter = {
        kinds: [40],
        '#team': [teamId],
        authors: [captainPubkey] // Only captain can create
      };

      const events = await ndk.fetchEvents(filter);
      const channelEvent = Array.from(events)[0];

      if (channelEvent) {
        console.log(`✅ Found channel via team tag: ${channelEvent.id}`);

        // Cache for next time
        await AsyncStorage.setItem(
          `@runstr:team_chat:${teamId}`,
          channelEvent.id!
        );
      } else {
        console.log(`⚠️ No chat channel found for team: ${teamId}`);
      }

      return channelEvent || null;
    } catch (error) {
      console.error('❌ Failed to get team channel:', error);
      return null;
    }
  }

  /**
   * Fetch channel by event ID
   */
  private async fetchChannelById(channelId: string): Promise<NDKEvent | null> {
    try {
      const ndk = this.getNDK();
      const filter: NDKFilter = {
        kinds: [40],
        ids: [channelId]
      };

      const events = await ndk.fetchEvents(filter);
      return Array.from(events)[0] || null;
    } catch (error) {
      console.error('❌ Failed to fetch channel by ID:', error);
      return null;
    }
  }

  /**
   * Send message to channel (kind 42)
   */
  async sendMessage(
    channelId: string,
    content: string,
    teamId: string
  ): Promise<NDKEvent> {
    console.log(`💬 Sending message to channel: ${channelId.slice(0, 20)}...`);

    try {
      const ndk = this.getNDK();

      const event = new NDKEvent(ndk);
      event.kind = 42; // NIP-28 Channel Message
      event.content = content;
      event.tags = [
        ['e', channelId, '', 'root'], // Reference to channel
        ['team', teamId] // For filtering team messages
      ];

      await event.sign();
      await event.publish();

      console.log(`✅ Message sent: ${event.id}`);

      return event;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Fetch messages from channel (paginated)
   */
  async fetchMessages(
    channelId: string,
    limit: number = 50,
    until?: number
  ): Promise<NDKEvent[]> {
    console.log(`📥 Fetching messages for channel: ${channelId.slice(0, 20)}...`);

    try {
      const ndk = this.getNDK();
      const filter: NDKFilter = {
        kinds: [42],
        '#e': [channelId],
        limit,
        ...(until && { until })
      };

      const events = await ndk.fetchEvents(filter);
      const messages = Array.from(events).sort(
        (a, b) => a.created_at! - b.created_at!
      );

      console.log(`✅ Fetched ${messages.length} messages`);

      return messages;
    } catch (error) {
      console.error('❌ Failed to fetch messages:', error);
      return [];
    }
  }

  /**
   * Subscribe to real-time messages
   * React 18 strict mode safe with cleanup handling
   */
  subscribeToChannel(
    channelId: string,
    onMessage: (event: NDKEvent) => void,
    onEose?: () => void
  ): NDKSubscription {
    console.log(`🔔 Subscribing to channel: ${channelId.slice(0, 20)}...`);

    // Clean up existing subscription if any
    this.unsubscribe(channelId);

    try {
      const ndk = this.getNDK();
      const filter: NDKFilter = {
        kinds: [42],
        '#e': [channelId],
        since: Math.floor(Date.now() / 1000) // Only new messages
      };

      const subscription = ndk.subscribe(filter, {
        closeOnEose: false // Keep open for real-time updates
      });

      subscription.on('event', (event: NDKEvent) => {
        console.log(`📨 New message received: ${event.id?.slice(0, 20)}...`);
        onMessage(event);
      });

      if (onEose) {
        subscription.on('eose', () => {
          console.log('✅ End of stored events reached');
          onEose();
        });
      }

      this.activeSubscriptions.set(channelId, subscription);
      console.log(`✅ Subscribed to channel: ${channelId.slice(0, 20)}...`);

      return subscription;
    } catch (error) {
      console.error('❌ Failed to subscribe to channel:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from channel
   */
  unsubscribe(channelId: string): void {
    const subscription = this.activeSubscriptions.get(channelId);
    if (subscription) {
      console.log(`🔕 Unsubscribing from channel: ${channelId.slice(0, 20)}...`);
      subscription.stop();
      this.activeSubscriptions.delete(channelId);
    }
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup(): void {
    console.log(`🧹 Cleaning up ${this.activeSubscriptions.size} subscriptions`);
    this.activeSubscriptions.forEach(sub => sub.stop());
    this.activeSubscriptions.clear();
  }

  /**
   * Get subscription stats
   */
  getStats(): {
    activeSubscriptions: number;
  } {
    return {
      activeSubscriptions: this.activeSubscriptions.size
    };
  }
}

// Export singleton instance for app-wide usage
export const chatService = new ChatService();
