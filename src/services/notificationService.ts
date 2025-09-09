/**
 * NotificationService - Manages notification history with local storage
 * Handles push notification history, 7-day retention, and read/unread state
 */

import { SafeStorage } from '../utils/storage';
import {
  NotificationHistory,
  NotificationType,
  Notification as NotificationHistoryItem,
} from '../types';

const NOTIFICATION_STORAGE_KEY = '@runstr_notification_history';
const RETENTION_DAYS = 7;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export class NotificationService {
  /**
   * Get all notification history (automatically cleans old notifications)
   */
  static async getNotificationHistory(): Promise<NotificationHistory> {
    try {
      const stored = await SafeStorage.getItem(NOTIFICATION_STORAGE_KEY);

      if (!stored) {
        return {
          items: [],
          unreadCount: 0,
          lastUpdated: new Date().toISOString(),
        };
      }

      const history: NotificationHistory = JSON.parse(stored);

      // Clean old notifications (older than 7 days)
      const cleanedHistory = await this.cleanOldNotifications(history);

      return cleanedHistory;
    } catch (error) {
      console.error('Failed to get notification history:', error);
      return {
        items: [],
        unreadCount: 0,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Add new notification to history
   */
  static async addNotification(
    type: NotificationType,
    title: string,
    message: string,
    metadata?: NotificationHistoryItem['metadata']
  ): Promise<void> {
    try {
      const currentHistory = await this.getNotificationHistory();

      const newNotification: NotificationHistoryItem = {
        id: `notification_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        type,
        title,
        message,
        timestamp: new Date().toISOString(),
        isRead: false,
        metadata,
      };

      const updatedHistory: NotificationHistory = {
        items: [newNotification, ...currentHistory.items],
        unreadCount: currentHistory.unreadCount + 1,
        lastUpdated: new Date().toISOString(),
      };

      await SafeStorage.setItem(
        NOTIFICATION_STORAGE_KEY,
        JSON.stringify(updatedHistory)
      );
    } catch (error) {
      console.error('Failed to add notification:', error);
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      const history = await this.getNotificationHistory();

      const updatedItems = history.items.map((item) =>
        item.id === notificationId ? { ...item, isRead: true } : item
      );

      const wasUnread = history.items.find(
        (item) => item.id === notificationId && !item.isRead
      );

      const updatedHistory: NotificationHistory = {
        items: updatedItems,
        unreadCount: wasUnread
          ? Math.max(0, history.unreadCount - 1)
          : history.unreadCount,
        lastUpdated: new Date().toISOString(),
      };

      await SafeStorage.setItem(
        NOTIFICATION_STORAGE_KEY,
        JSON.stringify(updatedHistory)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(): Promise<void> {
    try {
      const history = await this.getNotificationHistory();

      const updatedItems = history.items.map((item) => ({
        ...item,
        isRead: true,
      }));

      const updatedHistory: NotificationHistory = {
        items: updatedItems,
        unreadCount: 0,
        lastUpdated: new Date().toISOString(),
      };

      await SafeStorage.setItem(
        NOTIFICATION_STORAGE_KEY,
        JSON.stringify(updatedHistory)
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }

  /**
   * Clear all notification history
   */
  static async clearHistory(): Promise<void> {
    try {
      await SafeStorage.removeItem(NOTIFICATION_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear notification history:', error);
    }
  }

  /**
   * Get unread count only
   */
  static async getUnreadCount(): Promise<number> {
    try {
      const history = await this.getNotificationHistory();
      return history.unreadCount;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Remove notifications older than 7 days
   */
  private static async cleanOldNotifications(
    history: NotificationHistory
  ): Promise<NotificationHistory> {
    const cutoffDate = new Date(
      Date.now() - RETENTION_DAYS * MILLISECONDS_PER_DAY
    );

    const filteredItems = history.items.filter((item) => {
      const notificationDate = new Date(item.timestamp);
      return notificationDate >= cutoffDate;
    });

    // Recalculate unread count after filtering
    const unreadCount = filteredItems.filter((item) => !item.isRead).length;

    const cleanedHistory: NotificationHistory = {
      items: filteredItems,
      unreadCount,
      lastUpdated: new Date().toISOString(),
    };

    // Save cleaned history back to storage if items were removed
    if (filteredItems.length !== history.items.length) {
      try {
        await SafeStorage.setItem(
          NOTIFICATION_STORAGE_KEY,
          JSON.stringify(cleanedHistory)
        );
      } catch (error) {
        console.error('Failed to save cleaned notification history:', error);
      }
    }

    return cleanedHistory;
  }

  /**
   * Helper methods for creating specific notification types
   */
  static async addBitcoinEarnedNotification(
    bitcoinAmount: number,
    workoutId: string
  ): Promise<void> {
    await this.addNotification(
      'bitcoin_earned',
      'Bitcoin Earned! 💰',
      `You earned ${bitcoinAmount} sats from your workout`,
      { bitcoinAmount, workoutId }
    );
  }

  static async addTeamEventNotification(
    eventId: string,
    eventName: string,
    message: string
  ): Promise<void> {
    await this.addNotification('team_event', 'Team Event Update 🏃‍♀️', message, {
      eventId,
      eventName,
    });
  }

  static async addChallengeNotification(
    challengeId: string,
    challengerId: string,
    challengerName: string,
    message: string
  ): Promise<void> {
    await this.addNotification(
      'challenge_from_user',
      'New Challenge! ⚡',
      message,
      { challengeId, challengerId, challengerName }
    );
  }

  static async addPositionChangeNotification(
    oldPosition: number,
    newPosition: number,
    leagueId: string,
    leagueName: string
  ): Promise<void> {
    const isImprovement = newPosition < oldPosition;
    const title = isImprovement
      ? 'Position Improved! 📈'
      : 'Position Changed 📊';
    const message = `You moved from #${oldPosition} to #${newPosition} in ${leagueName}`;

    await this.addNotification('position_change', title, message, {
      oldPosition,
      newPosition,
      leagueId,
      leagueName,
    });
  }
}
