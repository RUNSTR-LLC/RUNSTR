/**
 * NostrSubscriptionManager - Subscription Management for Nostr Relays
 * Handles active subscriptions, event deduplication, and subscription lifecycle
 */

import type { Event } from 'nostr-tools';
import type { NostrFilter } from './NostrProtocolHandler';

export interface ActiveSubscription {
  filters: NostrFilter[];
  callback: (event: Event, relayUrl: string) => void;
  relayResponses: Map<string, boolean>;
  events: Event[];
  startedAt: number;
  timeout?: NodeJS.Timeout;
}

export class NostrSubscriptionManager {
  private activeSubscriptions: Map<string, ActiveSubscription> = new Map();

  /**
   * Add new subscription
   */
  addSubscription(
    subscriptionId: string,
    filters: NostrFilter[],
    callback: (event: Event, relayUrl: string) => void
  ): void {
    const subscription: ActiveSubscription = {
      filters,
      callback,
      relayResponses: new Map<string, boolean>(),
      events: [],
      startedAt: Date.now(),
    };
    this.activeSubscriptions.set(subscriptionId, subscription);
  }

  /**
   * Get subscription by ID
   */
  getSubscription(subscriptionId: string): ActiveSubscription | undefined {
    return this.activeSubscriptions.get(subscriptionId);
  }

  /**
   * Remove subscription
   */
  removeSubscription(subscriptionId: string): void {
    const subscription = this.activeSubscriptions.get(subscriptionId);
    if (subscription && subscription.timeout) {
      clearTimeout(subscription.timeout);
    }
    this.activeSubscriptions.delete(subscriptionId);
  }

  /**
   * Process event for subscription (with deduplication)
   */
  processEvent(
    subscriptionId: string,
    event: Event,
    relayUrl: string
  ): boolean {
    const subscription = this.activeSubscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    // Deduplicate events by ID
    const existingEvent = subscription.events.find((e) => e.id === event.id);
    if (!existingEvent) {
      subscription.events.push(event);
      try {
        subscription.callback(event, relayUrl);
        return true;
      } catch (error) {
        console.error(
          `❌ Error in subscription callback for ${subscriptionId}:`,
          error
        );
      }
    }

    return false;
  }

  /**
   * Mark relay as completed for EOSE handling
   */
  markRelayComplete(subscriptionId: string, relayUrl: string): void {
    const subscription = this.activeSubscriptions.get(subscriptionId);
    if (subscription) {
      subscription.relayResponses.set(relayUrl, true);
    }
  }

  /**
   * Check if all relays have completed for subscription
   */
  areAllRelaysComplete(
    subscriptionId: string,
    expectedRelayCount: number
  ): boolean {
    const subscription = this.activeSubscriptions.get(subscriptionId);
    if (!subscription) return false;

    return subscription.relayResponses.size >= expectedRelayCount;
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
    const subscriptions = Array.from(this.activeSubscriptions.entries()).map(
      ([id, sub]) => ({
        id,
        eventCount: sub.events.length,
        duration: Date.now() - sub.startedAt,
        relayCount: sub.relayResponses.size,
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
   * Clear all subscriptions
   */
  clear(): void {
    this.activeSubscriptions.forEach((subscription, id) => {
      if (subscription.timeout) {
        clearTimeout(subscription.timeout);
      }
    });
    this.activeSubscriptions.clear();
  }

  /**
   * Get all active subscription IDs
   */
  getActiveSubscriptionIds(): string[] {
    return Array.from(this.activeSubscriptions.keys());
  }

  /**
   * Get subscription event count
   */
  getEventCount(subscriptionId: string): number {
    const subscription = this.activeSubscriptions.get(subscriptionId);
    return subscription ? subscription.events.length : 0;
  }
}
