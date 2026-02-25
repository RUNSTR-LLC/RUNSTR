/**
 * TeamJoinNotificationHandler - Handles team join request notifications
 * Processes kind 1104 events for team captains
 * Displays in-app notifications for incoming team join requests
 */

import { GlobalNDKService } from '../nostr/GlobalNDKService';
import type { NDKSubscription, NDKEvent } from '@nostr-dev-kit/ndk';
import { getCachedProfile } from './profileHelper';
import { getUserNostrIdentifiers } from '../../utils/nostr';
import { unifiedNotificationStore } from './UnifiedNotificationStore';
import type { TeamJoinNotificationMetadata } from '../../types/unifiedNotifications';
import { TTLDeduplicator } from '../../utils/TTLDeduplicator';

const TEAM_JOIN_REQUEST_KIND = 1104;

export interface TeamJoinNotification {
  id: string;
  teamId: string;
  teamName: string;
  requesterPubkey: string;
  requesterName?: string;
  requesterPicture?: string;
  message?: string;
  timestamp: number;
  read: boolean;
  nostrEventId: string;
}

export type TeamJoinNotificationCallback = (
  notification: TeamJoinNotification
) => void;

export class TeamJoinNotificationHandler {
  private static instance: TeamJoinNotificationHandler;
  private notifications: Map<string, TeamJoinNotification> = new Map();
  private callbacks: Set<TeamJoinNotificationCallback> = new Set();
  private subscription: NDKSubscription | null = null;
  private isActive: boolean = false;
  private deduplicator = new TTLDeduplicator(3600000, 1000); // 1hr TTL, 1000 max entries
  private userHexPubkey: string | null = null;

  private constructor() {}

  static getInstance(): TeamJoinNotificationHandler {
    if (!TeamJoinNotificationHandler.instance) {
      TeamJoinNotificationHandler.instance = new TeamJoinNotificationHandler();
    }
    return TeamJoinNotificationHandler.instance;
  }

  /**
   * Start listening for team join request events
   */
  async startListening(): Promise<void> {
    if (this.isActive) {
      console.log('[TeamJoinHandler] Already active');
      return;
    }

    console.log('[TeamJoinHandler] Starting team join request monitoring...');

    try {
      const userIdentifiers = await getUserNostrIdentifiers();
      if (!userIdentifiers?.hexPubkey) {
        console.warn('[TeamJoinHandler] User not authenticated, cannot start');
        return;
      }

      this.userHexPubkey = userIdentifiers.hexPubkey;

      // Note: Captain status checked locally via CaptainCache
      // The handler will subscribe to all team join requests where the user is tagged as captain
      // If they're not a captain of any teams, they simply won't receive any notifications
      console.log(
        '[TeamJoinHandler] Monitoring team join requests for user as captain...'
      );

      // Get NDK instance
      const ndk = await GlobalNDKService.getInstance();

      // Subscribe to team join requests (kind 1104) where user is tagged as captain
      this.subscription = ndk.subscribe(
        {
          kinds: [TEAM_JOIN_REQUEST_KIND],
          '#p': [this.userHexPubkey], // Captain is tagged
        },
        { closeOnEose: false }
      );

      // Handle incoming events
      this.subscription.on('event', async (ndkEvent: NDKEvent) => {
        await this.handleTeamJoinRequest(ndkEvent);
      });

      this.isActive = true;
      console.log('[TeamJoinHandler] ✅ Team join request monitoring active');
    } catch (error) {
      console.error('[TeamJoinHandler] Failed to start monitoring:', error);
      throw error;
    }
  }

  /**
   * Stop listening for team join request events
   */
  async stopListening(): Promise<void> {
    console.log('[TeamJoinHandler] Stopping team join request monitoring...');

    if (this.subscription) {
      try {
        this.subscription.stop();
        this.subscription = null;
      } catch (error) {
        console.warn('[TeamJoinHandler] Failed to stop subscription:', error);
      }
    }

    this.isActive = false;
    this.deduplicator.clear();

    console.log('[TeamJoinHandler] ✅ Monitoring stopped');
  }

  /**
   * Handle incoming team join request event
   */
  private async handleTeamJoinRequest(ndkEvent: NDKEvent): Promise<void> {
    try {
      // Prevent duplicate processing
      if (!ndkEvent.id || this.deduplicator.isDuplicate(ndkEvent.id)) {
        return;
      }

      console.log(
        `[TeamJoinHandler] Processing team join request: ${ndkEvent.id}`
      );

      // Parse event tags to get team info
      const teamIdTag = ndkEvent.tags.find((t) => t[0] === 'team-id');
      const teamNameTag = ndkEvent.tags.find((t) => t[0] === 'team-name');

      if (!teamIdTag || !teamIdTag[1]) {
        console.warn('[TeamJoinHandler] Missing team-id tag');
        return;
      }

      const teamId = teamIdTag[1];
      const teamName = teamNameTag?.[1] || 'Unknown Team';

      // Get requester info
      const requesterPubkey = ndkEvent.pubkey;
      const requesterProfile = await getCachedProfile(requesterPubkey);

      // Create notification
      const notification: TeamJoinNotification = {
        id: ndkEvent.id,
        teamId,
        teamName,
        requesterPubkey,
        requesterName:
          requesterProfile?.display_name ||
          requesterProfile?.name ||
          'Unknown User',
        requesterPicture: requesterProfile?.picture,
        message: ndkEvent.content || 'Wants to join your team',
        timestamp: (ndkEvent.created_at || Date.now() / 1000) * 1000,
        read: false,
        nostrEventId: ndkEvent.id,
      };

      // Add to local store
      this.notifications.set(notification.id, notification);
      this.notifyCallbacks(notification);

      // Publish to unified notification store
      await this.publishToUnifiedStore(notification);

      console.log(
        `[TeamJoinHandler] ✅ New join request for ${teamName} from ${notification.requesterName}`
      );
    } catch (error) {
      console.error('[TeamJoinHandler] Failed to process join request:', error);
    }
  }

  /**
   * Publish notification to unified store
   */
  private async publishToUnifiedStore(
    notification: TeamJoinNotification
  ): Promise<void> {
    try {
      const metadata: TeamJoinNotificationMetadata = {
        teamId: notification.teamId,
        teamName: notification.teamName,
        requesterPubkey: notification.requesterPubkey,
        requesterName: notification.requesterName,
        requesterPicture: notification.requesterPicture,
        message: notification.message,
      };

      await unifiedNotificationStore.addNotification(
        'team_join_request',
        `New join request for ${notification.teamName}`,
        `${notification.requesterName} wants to join your team`,
        metadata,
        {
          icon: 'people',
          actions: [
            {
              id: 'view_requests',
              type: 'view_join_requests',
              label: 'View Requests',
              isPrimary: true,
            },
          ],
          nostrEventId: notification.nostrEventId,
        }
      );

      console.log(
        '[TeamJoinHandler] Published to unified store:',
        notification.id
      );
    } catch (error) {
      console.error(
        '[TeamJoinHandler] Failed to publish to unified store:',
        error
      );
    }
  }

  /**
   * Register callback for new notifications
   */
  onNotification(callback: TeamJoinNotificationCallback): () => void {
    this.callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Notify all registered callbacks
   */
  private notifyCallbacks(notification: TeamJoinNotification): void {
    this.callbacks.forEach((callback) => {
      try {
        callback(notification);
      } catch (error) {
        console.error(
          '[TeamJoinHandler] Error in notification callback:',
          error
        );
      }
    });
  }

  /**
   * Get all notifications
   */
  getNotifications(): TeamJoinNotification[] {
    return Array.from(this.notifications.values()).sort(
      (a, b) => b.timestamp - a.timestamp
    );
  }

  /**
   * Get unread notification count
   */
  getUnreadCount(): number {
    return Array.from(this.notifications.values()).filter((n) => !n.read)
      .length;
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
    console.log('[TeamJoinHandler] All team join notifications cleared');
  }

  /**
   * Get handler status
   */
  getStatus(): {
    isActive: boolean;
    notificationCount: number;
    processedEventCount: number;
  } {
    return {
      isActive: this.isActive,
      notificationCount: this.notifications.size,
      processedEventCount: this.deduplicator.getStats().size,
    };
  }
}

export const teamJoinNotificationHandler =
  TeamJoinNotificationHandler.getInstance();
