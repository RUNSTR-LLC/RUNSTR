/**
 * ChallengeNotificationHandler - Handles challenge request notifications
 * Processes kinds 1105 (requests), 1106 (accepts), 1107 (declines)
 * Displays in-app notifications for incoming challenge requests
 */

import { challengeRequestService, type PendingChallenge } from '../challenge/ChallengeRequestService';
import { nostrProfileService } from '../nostr/NostrProfileService';
import { getUserNostrIdentifiers } from '../../utils/nostr';
import type { Event } from 'nostr-tools';
import {
  CHALLENGE_REQUEST_KIND,
  CHALLENGE_ACCEPT_KIND,
  CHALLENGE_DECLINE_KIND,
} from '../../types/challenge';

export interface ChallengeNotification {
  id: string;
  type: 'request' | 'accepted' | 'declined';
  challengeId: string;
  challengerPubkey: string;
  challengerName?: string;
  challengerPicture?: string;
  activityType: string;
  metric: string;
  duration: number;
  wagerAmount: number;
  timestamp: number;
  read: boolean;
}

export type ChallengeNotificationCallback = (notification: ChallengeNotification) => void;

export class ChallengeNotificationHandler {
  private static instance: ChallengeNotificationHandler;
  private notifications: Map<string, ChallengeNotification> = new Map();
  private callbacks: Set<ChallengeNotificationCallback> = new Set();
  private subscriptionId?: string;
  private isActive: boolean = false;
  private processedEvents: Set<string> = new Set();

  private constructor() {
    this.loadNotifications();
  }

  static getInstance(): ChallengeNotificationHandler {
    if (!ChallengeNotificationHandler.instance) {
      ChallengeNotificationHandler.instance = new ChallengeNotificationHandler();
    }
    return ChallengeNotificationHandler.instance;
  }

  /**
   * Load notifications from storage (via challengeRequestService)
   */
  private async loadNotifications(): Promise<void> {
    try {
      const pendingChallenges = await challengeRequestService.getPendingChallenges();

      for (const challenge of pendingChallenges) {
        const notification = await this.challengeToNotification(challenge, 'request');
        if (notification) {
          this.notifications.set(notification.id, notification);
        }
      }

      console.log(`Loaded ${this.notifications.size} challenge notifications`);
    } catch (error) {
      console.error('Failed to load challenge notifications:', error);
    }
  }

  /**
   * Convert PendingChallenge to ChallengeNotification
   */
  private async challengeToNotification(
    challenge: PendingChallenge,
    type: 'request' | 'accepted' | 'declined'
  ): Promise<ChallengeNotification | null> {
    try {
      const profile = await nostrProfileService.getProfile(challenge.challengerPubkey);

      return {
        id: challenge.challengeId,
        type,
        challengeId: challenge.challengeId,
        challengerPubkey: challenge.challengerPubkey,
        challengerName: profile?.display_name || profile?.name || 'Unknown User',
        challengerPicture: profile?.picture,
        activityType: challenge.activityType,
        metric: challenge.metric,
        duration: challenge.duration,
        wagerAmount: challenge.wagerAmount,
        timestamp: challenge.requestedAt * 1000,
        read: false,
      };
    } catch (error) {
      console.error('Failed to create notification from challenge:', error);
      return null;
    }
  }

  /**
   * Start listening for challenge events
   */
  async startListening(): Promise<void> {
    if (this.isActive) {
      console.log('Challenge notification handler already active');
      return;
    }

    console.log('Starting challenge notification monitoring...');

    try {
      const userIdentifiers = await getUserNostrIdentifiers();
      if (!userIdentifiers?.hexPubkey) {
        console.warn('User not authenticated, cannot start challenge notifications');
        return;
      }

      // Subscribe to incoming challenge requests
      this.subscriptionId = await challengeRequestService.subscribeToIncomingChallenges(
        async (challenge: PendingChallenge) => {
          if (this.processedEvents.has(challenge.challengeId)) {
            return;
          }

          this.processedEvents.add(challenge.challengeId);

          const notification = await this.challengeToNotification(challenge, 'request');
          if (notification) {
            this.notifications.set(notification.id, notification);
            this.notifyCallbacks(notification);
            console.log(
              `New challenge request from ${notification.challengerName}: ${notification.activityType}`
            );
          }
        }
      );

      this.isActive = true;
      console.log(`Challenge notification monitoring active: ${this.subscriptionId}`);
    } catch (error) {
      console.error('Failed to start challenge notification monitoring:', error);
      throw error;
    }
  }

  /**
   * Stop listening for challenge events
   */
  async stopListening(): Promise<void> {
    console.log('Stopping challenge notification monitoring...');

    if (this.subscriptionId) {
      try {
        await challengeRequestService.unsubscribe(this.subscriptionId);
      } catch (error) {
        console.warn('Failed to unsubscribe from challenge notifications:', error);
      }
    }

    this.subscriptionId = undefined;
    this.isActive = false;
    this.processedEvents.clear();

    console.log('Challenge notification monitoring stopped');
  }

  /**
   * Register callback for new notifications
   */
  onNotification(callback: ChallengeNotificationCallback): () => void {
    this.callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Notify all registered callbacks
   */
  private notifyCallbacks(notification: ChallengeNotification): void {
    this.callbacks.forEach((callback) => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error in notification callback:', error);
      }
    });
  }

  /**
   * Get all notifications
   */
  getNotifications(): ChallengeNotification[] {
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
   * Accept a challenge from notification
   */
  async acceptChallenge(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const notification = this.notifications.get(notificationId);
      if (!notification) {
        return { success: false, error: 'Notification not found' };
      }

      const result = await challengeRequestService.acceptChallenge(notification.challengeId);

      if (result.success) {
        // Update notification
        notification.type = 'accepted';
        notification.read = true;
        this.notifications.set(notificationId, notification);

        console.log(`Challenge accepted: ${notificationId}`);
      }

      return result;
    } catch (error) {
      console.error('Failed to accept challenge:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Decline a challenge from notification
   */
  async declineChallenge(
    notificationId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const notification = this.notifications.get(notificationId);
      if (!notification) {
        return { success: false, error: 'Notification not found' };
      }

      const result = await challengeRequestService.declineChallenge(
        notification.challengeId,
        reason
      );

      if (result.success) {
        // Update notification
        notification.type = 'declined';
        notification.read = true;
        this.notifications.set(notificationId, notification);

        console.log(`Challenge declined: ${notificationId}`);
      }

      return result;
    } catch (error) {
      console.error('Failed to decline challenge:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
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
    console.log('All challenge notifications cleared');
  }

  /**
   * Refresh notifications from pending challenges
   */
  async refresh(): Promise<void> {
    await this.loadNotifications();
  }
}

export const challengeNotificationHandler = ChallengeNotificationHandler.getInstance();
