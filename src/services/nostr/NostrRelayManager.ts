/**
 * NostrRelayManager - Real WebSocket Implementation
 * Manages multiple relay connections with real-time event subscriptions
 * Supports profile fetching and workout event queries via live Nostr relays
 */

import {
  NostrWebSocketConnection,
  type ConnectionState,
} from './NostrWebSocketConnection';
import { NostrProtocolHandler, type NostrFilter } from './NostrProtocolHandler';
import { NostrSubscriptionManager } from './NostrSubscriptionManager';
import type { Event } from 'nostr-tools';

export interface RelayConnection {
  url: string;
  status: ConnectionState;
  lastConnected?: Date;
  errorCount: number;
  connection?: NostrWebSocketConnection;
}

export interface RelayManagerConfig {
  relayUrls: string[];
  maxRetries: number;
  retryDelay: number;
  connectionTimeout: number;
  reconnectInterval: number;
  enablePing: boolean;
}

export interface SubscriptionResult {
  subscriptionId: string;
  events: Event[];
  relayCount: number;
  completedRelays: Set<string>;
}

export class NostrRelayManager {
  private connections: Map<string, RelayConnection> = new Map();
  private wsConnections: Map<string, NostrWebSocketConnection> = new Map();
  private config: RelayManagerConfig;
  private protocolHandler: NostrProtocolHandler;
  private subscriptionManager: NostrSubscriptionManager;
  private eventListeners: Map<string, Set<(...args: any[]) => void>> =
    new Map();

  constructor(config?: Partial<RelayManagerConfig>) {
    this.config = {
      relayUrls: [
        'wss://relay.damus.io',
        'wss://relay.primal.net',
        'wss://nostr.wine',
        'wss://nos.lol',
      ],
      maxRetries: 5,
      retryDelay: 3000,
      connectionTimeout: 15000,
      reconnectInterval: 45000,
      enablePing: false,
      ...config,
    };

    this.protocolHandler = new NostrProtocolHandler();
    this.subscriptionManager = new NostrSubscriptionManager();
    this.initializeConnections();
  }

  /**
   * Initialize WebSocket connections to all configured relays
   */
  private async initializeConnections(): Promise<void> {
    console.log('🔄 Initializing real Nostr relay connections...');

    for (const url of this.config.relayUrls) {
      await this.connectToRelay(url);
    }

    console.log(
      `✅ Initiated connections to ${this.config.relayUrls.length} Nostr relays`
    );
  }

  /**
   * Connect to a specific relay
   */
  private async connectToRelay(url: string): Promise<void> {
    // Initialize connection tracking
    const connection: RelayConnection = {
      url,
      status: 'disconnected',
      errorCount: 0,
    };
    this.connections.set(url, connection);

    // Create WebSocket connection
    const wsConnection = new NostrWebSocketConnection({
      url,
      connectionTimeout: this.config.connectionTimeout,
      pingInterval: 30000, // 30 seconds
      maxReconnectAttempts: this.config.maxRetries,
      reconnectDelay: this.config.retryDelay,
      enablePing: this.config.enablePing,
    });

    this.wsConnections.set(url, wsConnection);

    // Set up event listeners
    wsConnection.on('connected', () => {
      connection.status = 'connected';
      connection.lastConnected = new Date();
      connection.errorCount = 0;
      console.log(`✅ Connected to Nostr relay: ${url}`);
      this.notifyStatusChange();
    });

    wsConnection.on('disconnected', () => {
      connection.status = 'disconnected';
      console.log(`🔌 Disconnected from Nostr relay: ${url}`);
      this.notifyStatusChange();
    });

    wsConnection.on('error', (error: Error) => {
      connection.status = 'error';
      connection.errorCount++;
      console.error(`❌ Error from relay ${url}:`, error.message);
      this.notifyStatusChange();
    });

    wsConnection.on(
      'stateChange',
      ({ newState }: { newState: ConnectionState }) => {
        connection.status = newState;
        this.notifyStatusChange();
      }
    );
  }

  /**
   * Get connected relays
   */
  getConnectedRelays(): RelayConnection[] {
    return Array.from(this.connections.values()).filter(
      (conn) => conn.status === 'connected'
    );
  }

  /**
   * Get all relay connections with status
   */
  getAllConnections(): RelayConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connection status summary
   */
  getConnectionStatus(): {
    total: number;
    connected: number;
    connecting: number;
    disconnected: number;
    error: number;
  } {
    const connections = this.getAllConnections();

    return {
      total: connections.length,
      connected: connections.filter((c) => c.status === 'connected').length,
      connecting: connections.filter((c) => c.status === 'connecting').length,
      disconnected: connections.filter((c) => c.status === 'disconnected')
        .length,
      error: connections.filter((c) => c.status === 'error').length,
    };
  }

  /**
   * Subscribe to events from connected relays
   */
  async subscribeToEvents(
    filters: NostrFilter[],
    eventCallback: (event: Event, relayUrl: string) => void
  ): Promise<string> {
    console.log('📡 Subscribing to Nostr events:', filters);

    const connectedRelays = this.getConnectedRelays();

    if (connectedRelays.length === 0) {
      console.warn('⚠️ No connected relays available for subscription');
      throw new Error('No connected relays available');
    }

    // Generate unique subscription ID
    const subscriptionId = this.protocolHandler.generateSubscriptionId('sub');

    // Track subscription
    this.subscriptionManager.addSubscription(
      subscriptionId,
      filters,
      eventCallback
    );

    // Subscribe to each connected relay
    let successCount = 0;
    for (const connection of connectedRelays) {
      const wsConnection = this.wsConnections.get(connection.url);
      if (wsConnection && wsConnection.isConnected()) {
        try {
          wsConnection.subscribe(subscriptionId, filters, (event: Event) => {
            // Use subscription manager for deduplication and callback handling
            this.subscriptionManager.processEvent(
              subscriptionId,
              event,
              connection.url
            );
          });
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to subscribe to ${connection.url}:`, error);
        }
      }
    }

    if (successCount === 0) {
      this.subscriptionManager.removeSubscription(subscriptionId);
      throw new Error('Failed to subscribe to any relays');
    }

    console.log(
      `✅ Subscribed to ${successCount} relays with ID: ${subscriptionId}`
    );
    return subscriptionId;
  }

  /**
   * Publish event to connected relays
   */
  async publishEvent(
    event: Event
  ): Promise<{ successful: string[]; failed: string[] }> {
    const connectedRelays = this.getConnectedRelays();
    const results = { successful: [] as string[], failed: [] as string[] };

    if (connectedRelays.length === 0) {
      console.warn('⚠️ No connected relays available for publishing');
      return results;
    }

    console.log(
      `📮 Publishing event ${event.id} to ${connectedRelays.length} relays`
    );

    // Publish to each connected relay
    const publishPromises = connectedRelays.map(async (connection) => {
      const wsConnection = this.wsConnections.get(connection.url);
      if (!wsConnection || !wsConnection.isConnected()) {
        results.failed.push(connection.url);
        return;
      }

      try {
        // Set up OK message listener for this event
        const timeout = setTimeout(() => {
          results.failed.push(connection.url);
        }, 5000); // 5 second timeout

        const okListener = wsConnection.on(
          'ok',
          (okMessage: {
            eventId: string;
            success: boolean;
            reason?: string;
          }) => {
            if (okMessage.eventId === event.id) {
              clearTimeout(timeout);
              okListener(); // Remove listener

              if (okMessage.success) {
                results.successful.push(connection.url);
              } else {
                console.warn(
                  `❌ Event rejected by ${connection.url}: ${okMessage.reason}`
                );
                results.failed.push(connection.url);
              }
            }
          }
        );

        // Publish the event
        wsConnection.publish(event);
      } catch (error) {
        console.error(`❌ Failed to publish to ${connection.url}:`, error);
        results.failed.push(connection.url);
      }
    });

    // Wait for all publish attempts to complete
    await Promise.allSettled(publishPromises);

    console.log(
      `✅ Published to ${results.successful.length} relays, failed: ${results.failed.length}`
    );
    return results;
  }

  /**
   * Add listener for connection status changes
   */
  onStatusChange(callback: () => void): () => void {
    const listeners = this.eventListeners.get('statusChange') || new Set();
    listeners.add(callback);
    this.eventListeners.set('statusChange', listeners);

    // Return unsubscribe function
    return () => {
      listeners.delete(callback);
    };
  }

  /**
   * Notify status change listeners
   */
  private notifyStatusChange(): void {
    const listeners = this.eventListeners.get('statusChange');
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback();
        } catch (error: any) {
          console.error('Error in status change callback:', error);
        }
      });
    }
  }

  /**
   * Query relays for kind 1301 workout events
   */
  async queryWorkoutEvents(
    pubkey: string,
    options: {
      since?: number;
      until?: number;
      limit?: number;
    } = {}
  ): Promise<Event[]> {
    const workoutFilter = this.protocolHandler.createWorkoutFilter(
      pubkey,
      options
    );
    const events: Event[] = [];

    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(events), 8000);

      this.subscribeToEvents([workoutFilter], (event: Event) => {
        if (!events.some((e) => e.id === event.id)) {
          events.push(event);
        }
      })
        .then((subId) => {
          setTimeout(() => {
            clearTimeout(timeout);
            this.unsubscribeFromWorkoutEvents(subId);
            resolve(events);
          }, 5000);
        })
        .catch(() => resolve(events));
    });
  }

  /**
   * Subscribe to real-time kind 1301 workout events
   */
  async subscribeToWorkoutEvents(
    pubkey: string,
    eventCallback: (event: Event, relayUrl: string) => void
  ): Promise<string> {
    console.log(
      `🔔 Setting up real-time workout subscription for: ${pubkey.substring(
        0,
        8
      )}...`
    );

    const connectedRelays = this.getConnectedRelays();

    if (connectedRelays.length === 0) {
      console.warn('⚠️ No connected relays available for workout subscription');
      throw new Error('No connected relays');
    }

    // Create workout filter for real-time events (no since/until to get live events)
    const workoutFilter = this.protocolHandler.createWorkoutFilter(pubkey);

    // Subscribe using the general subscription method
    const subscriptionId = await this.subscribeToEvents(
      [workoutFilter],
      eventCallback
    );

    console.log(
      `✅ Real-time workout subscription active: ${subscriptionId} on ${connectedRelays.length} relays`
    );
    return subscriptionId;
  }

  /**
   * Unsubscribe from workout events
   */
  async unsubscribeFromWorkoutEvents(subscriptionId: string): Promise<void> {
    console.log(`🔕 Unsubscribing from workout events: ${subscriptionId}`);

    const subscription =
      this.subscriptionManager.getSubscription(subscriptionId);
    if (!subscription) {
      console.warn(`⚠️ Subscription ${subscriptionId} not found`);
      return;
    }

    // Unsubscribe from all connected relays
    const connectedRelays = this.getConnectedRelays();
    for (const connection of connectedRelays) {
      const wsConnection = this.wsConnections.get(connection.url);
      if (wsConnection && wsConnection.isConnected()) {
        try {
          wsConnection.unsubscribe(subscriptionId);
        } catch (error) {
          console.error(
            `❌ Failed to unsubscribe from ${connection.url}:`,
            error
          );
        }
      }
    }

    // Clean up local tracking
    this.subscriptionManager.removeSubscription(subscriptionId);

    console.log(
      `✅ Unsubscribed from ${subscriptionId} on ${connectedRelays.length} relays`
    );
  }

  /**
   * Generic unsubscribe method (alias for unsubscribeFromWorkoutEvents)
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    return this.unsubscribeFromWorkoutEvents(subscriptionId);
  }

  /**
   * Get relay URLs for external use
   */
  getRelayUrls(): string[] {
    return [...this.config.relayUrls];
  }

  /**
   * Check if connected to any relays
   */
  hasConnectedRelays(): boolean {
    return this.getConnectedRelays().length > 0;
  }

  /**
   * Query for profile events (kind 0) - Simplified version
   */
  async queryProfileEvents(pubkey: string): Promise<Event[]> {
    const profileFilter = this.protocolHandler.createProfileFilter(pubkey);
    const events: Event[] = [];

    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(events), 5000);

      this.subscribeToEvents([profileFilter], (event: Event) => {
        if (!events.some((e) => e.id === event.id)) {
          events.push(event);
        }
      })
        .then((subId) => {
          setTimeout(() => {
            clearTimeout(timeout);
            this.unsubscribeFromWorkoutEvents(subId);
            resolve(events);
          }, 3000);
        })
        .catch(() => resolve(events));
    });
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
      relayCount: number;
    }>;
  } {
    return this.subscriptionManager.getSubscriptionStats();
  }

  /**
   * Force reconnect to all relays
   */
  async reconnectAll(): Promise<void> {
    console.log('🔄 Reconnecting to all Nostr relays...');

    const reconnectPromises = Array.from(this.wsConnections.entries()).map(
      ([url, wsConnection]) => {
        return new Promise<void>((resolve) => {
          wsConnection.reconnect();
          // Give each connection a moment to attempt reconnection
          setTimeout(resolve, 1000);
        });
      }
    );

    await Promise.all(reconnectPromises);
    console.log('✅ Reconnection attempts completed');
  }

  /**
   * Cleanup connections and timers
   */
  async disconnect(): Promise<void> {
    console.log('🔄 Disconnecting from all Nostr relays...');

    // Clear all active subscriptions
    this.subscriptionManager.clear();

    // Disconnect all WebSocket connections
    const disconnectPromises = Array.from(this.wsConnections.values()).map(
      (wsConnection) => {
        return new Promise<void>((resolve) => {
          wsConnection.disconnect();
          setTimeout(resolve, 100); // Give a moment for cleanup
        });
      }
    );

    await Promise.all(disconnectPromises);

    // Clear tracking maps
    this.connections.clear();
    this.wsConnections.clear();
    this.eventListeners.clear();

    console.log('✅ All Nostr relays disconnected');
  }
}

// Singleton instance for app-wide usage
export const nostrRelayManager = new NostrRelayManager();
