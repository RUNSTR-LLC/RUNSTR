/**
 * EventJoinNotificationHandler - Handles event join request notifications
 * Processes kind 1105 events with 'event-join-request' tag
 * Displays in-app notifications for incoming event join requests
 */

import { EventJoinRequestService, type EventJoinRequest } from '../events/EventJoinRequestService';
import { nostrProfileService } from '../nostr/NostrProfileService';
import { getUserNostrIdentifiers } from '../../utils/nostr';
import { unifiedNotificationStore } from './UnifiedNotificationStore';
import type { EventJoinNotificationMetadata } from '../../types/unifiedNotifications';

export interface EventJoinNotification {
  id: string;
  type: 'join_request';
  requestId: string;
  requesterId: string;
  requesterName?: string;
  requesterPicture?: string;
  eventId: string;
  eventName: string;
  teamId: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export type EventJoinNotificationCallback = (notification: EventJoinNotification) => void;

export class EventJoinNotificationHandler {
  private static instance: EventJoinNotificationHandler;
  private notifications: Map<string, EventJoinNotification> = new Map();
  private callbacks: Set<EventJoinNotificationCallback> = new Set();
  private subscriptionId?: string;
  private isActive: boolean = false;
  private processedEvents: Set<string> = new Set();

  private constructor() {
    this.loadNotifications();
  }

  static getInstance(): EventJoinNotificationHandler {
    if (!EventJoinNotificationHandler.instance) {
      EventJoinNotificationHandler.instance = new EventJoinNotificationHandler();
    }
    return EventJoinNotificationHandler.instance;
  }

  /**
   * Load notifications from storage (via EventJoinRequestService)
   */
  private async loadNotifications(): Promise<void> {
    try {
      const userIdentifiers = await getUserNostrIdentifiers();
      if (!userIdentifiers?.hexPubkey) {
        console.log('[EventJoinNotifications] User not authenticated');
        return;
      }

      const requestService = EventJoinRequestService.getInstance();
      const joinRequests = await requestService.getEventJoinRequests(userIdentifiers.hexPubkey);

      for (const request of joinRequests) {
        const notification = await this.requestToNotification(request);
        if (notification) {
          this.notifications.set(notification.id, notification);
        }
      }

      console.log(`[EventJoinNotifications] Loaded ${this.notifications.size} event join notifications`);
    } catch (error) {
      console.error('[EventJoinNotifications] Failed to load notifications:', error);
    }
  }

  /**
   * Convert EventJoinRequest to EventJoinNotification
   */
  private async requestToNotification(
    request: EventJoinRequest
  ): Promise<EventJoinNotification | null> {
    try {
      const profile = await nostrProfileService.getProfile(request.requesterId);

      return {
        id: request.id,
        type: 'join_request',
        requestId: request.id,
        requesterId: request.requesterId,
        requesterName: profile?.display_name || profile?.name || 'Unknown User',
        requesterPicture: profile?.picture,
        eventId: request.eventId,
        eventName: request.eventName,
        teamId: request.teamId,
        message: request.message,
        timestamp: request.timestamp * 1000,
        read: false,
      };
    } catch (error) {
      console.error('[EventJoinNotifications] Failed to create notification from request:', error);
      return null;
    }
  }

  /**
   * Start listening for event join requests
   */
  async startListening(): Promise<void> {
    if (this.isActive) {
      console.log('[EventJoinNotifications] Handler already active');
      return;
    }

    console.log('[EventJoinNotifications] Starting monitoring...');

    try {
      const userIdentifiers = await getUserNostrIdentifiers();
      if (!userIdentifiers?.hexPubkey) {
        console.warn('[EventJoinNotifications] User not authenticated, cannot start');
        return;
      }

      const requestService = EventJoinRequestService.getInstance();

      // Subscribe to incoming event join requests
      this.subscriptionId = await requestService.subscribeToEventJoinRequests(
        userIdentifiers.hexPubkey,
        async (request: EventJoinRequest) => {
          if (this.processedEvents.has(request.id)) {
            return;
          }

          this.processedEvents.add(request.id);

          const notification = await this.requestToNotification(request);
          if (notification) {
            this.notifications.set(notification.id, notification);
            this.notifyCallbacks(notification);

            // Publish to unified notification store
            await this.publishToUnifiedStore(notification);

            console.log(
              `[EventJoinNotifications] New request from ${notification.requesterName} for ${notification.eventName}`
            );
          }
        }
      );

      this.isActive = true;
      console.log(`[EventJoinNotifications] Monitoring active: ${this.subscriptionId}`);
    } catch (error) {
      console.error('[EventJoinNotifications] Failed to start monitoring:', error);
      throw error;
    }
  }

  /**
   * Stop listening for event join requests
   */
  async stopListening(): Promise<void> {
    console.log('[EventJoinNotifications] Stopping monitoring...');

    if (this.subscriptionId) {
      try {
        const requestService = EventJoinRequestService.getInstance();
        // Note: EventJoinRequestService doesn't expose unsubscribe method
        // This is handled by NostrRelayManager cleanup
        console.log(`[EventJoinNotifications] Stopped subscription: ${this.subscriptionId}`);
      } catch (error) {
        console.warn('[EventJoinNotifications] Failed to unsubscribe:', error);
      }
    }

    this.subscriptionId = undefined;
    this.isActive = false;
    this.processedEvents.clear();

    console.log('[EventJoinNotifications] Monitoring stopped');
  }

  /**
   * Register callback for new notifications
   */
  onNotification(callback: EventJoinNotificationCallback): () => void {
    this.callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Notify all registered callbacks
   */
  private notifyCallbacks(notification: EventJoinNotification): void {
    this.callbacks.forEach((callback) => {
      try {
        callback(notification);
      } catch (error) {
        console.error('[EventJoinNotifications] Error in notification callback:', error);
      }
    });
  }

  /**
   * Get all notifications
   */
  getNotifications(): EventJoinNotification[] {
    return Array.from(this.notifications.values()).sort(
      (a, b) => b.timestamp - a.timestamp
    );
  }

  /**
   * Get unread notification count
   */
  getUnreadCount(): number {
    return Array.from(this.notifications.values()).filter((n) => !n.read).length;
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.read = true;
      this.notifications.set(notificationId, notification);
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    this.notifications.forEach((notification) => {
      notification.read = true;
    });
  }

  /**
   * Remove a notification
   */
  removeNotification(notificationId: string): void {
    this.notifications.delete(notificationId);
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.notifications.clear();
    console.log('[EventJoinNotifications] All notifications cleared');
  }

  /**
   * Refresh notifications from event join requests
   */
  async refresh(): Promise<void> {
    await this.loadNotifications();
  }

  /**
   * Publish event join notification to unified store
   */
  private async publishToUnifiedStore(notification: EventJoinNotification): Promise<void> {
    try {
      const metadata: EventJoinNotificationMetadata = {
        requestId: notification.requestId,
        eventId: notification.eventId,
        eventName: notification.eventName,
        teamId: notification.teamId,
        requesterId: notification.requesterId,
        requesterName: notification.requesterName,
        requesterPicture: notification.requesterPicture,
        message: notification.message,
      };

      await unifiedNotificationStore.addNotification(
        'event_join_request',
        `${notification.requesterName || 'Someone'} wants to join your event`,
        notification.eventName,
        metadata,
        {
          icon: 'calendar',
          actions: [
            {
              id: 'view_dashboard',
              type: 'view_event_requests',
              label: 'View Requests',
              isPrimary: true,
            },
          ],
          nostrEventId: notification.requestId,
        }
      );
    } catch (error) {
      console.error('[EventJoinNotifications] Failed to publish to unified store:', error);
    }
  }
}

export const eventJoinNotificationHandler = EventJoinNotificationHandler.getInstance();
