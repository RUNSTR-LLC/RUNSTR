/**
 * UnifiedNotificationStore - Single source of truth for all notifications
 * Handles persistence, unread counts, and real-time updates
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UnifiedNotification,
  UnifiedNotificationType,
  NotificationStorage,
  NotificationSubscriber,
  NotificationFilter,
  GroupedNotifications,
  NotificationMetadata,
  NotificationAction,
} from '../../types/unifiedNotifications';

const STORAGE_KEY = '@runstr:unified_notifications';
const RETENTION_DAYS = 30;
const STORAGE_VERSION = 1;
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

export class UnifiedNotificationStore {
  private static instance: UnifiedNotificationStore;
  private notifications: UnifiedNotification[] = [];
  private subscribers: Set<NotificationSubscriber> = new Set();
  private isInitialized = false;
  private userPubkey: string | null = null;

  private constructor() {}

  static getInstance(): UnifiedNotificationStore {
    if (!UnifiedNotificationStore.instance) {
      UnifiedNotificationStore.instance = new UnifiedNotificationStore();
    }
    return UnifiedNotificationStore.instance;
  }

  /**
   * Initialize the store with user context
   */
  async initialize(userPubkey: string): Promise<void> {
    if (this.isInitialized && this.userPubkey === userPubkey) {
      console.log('[UnifiedNotificationStore] Already initialized for this user');
      return;
    }

    console.log('[UnifiedNotificationStore] Initializing...');
    this.userPubkey = userPubkey;

    try {
      await this.loadFromStorage();
      await this.cleanupOldNotifications();
      this.isInitialized = true;
      console.log(`[UnifiedNotificationStore] Initialized with ${this.notifications.length} notifications`);
    } catch (error) {
      console.error('[UnifiedNotificationStore] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Add a new notification
   */
  async addNotification(
    type: UnifiedNotificationType,
    title: string,
    body: string,
    metadata: NotificationMetadata,
    options?: {
      icon?: string;
      actions?: NotificationAction[];
      nostrEventId?: string;
    }
  ): Promise<UnifiedNotification> {
    const notification: UnifiedNotification = {
      id: this.generateId(),
      type,
      timestamp: Date.now(),
      isRead: false,
      title,
      body,
      icon: options?.icon || this.getDefaultIcon(type),
      metadata,
      actions: options?.actions,
      nostrEventId: options?.nostrEventId,
    };

    // Check for duplicates (same nostrEventId)
    if (options?.nostrEventId) {
      const exists = this.notifications.some(
        (n) => n.nostrEventId === options.nostrEventId
      );
      if (exists) {
        console.log('[UnifiedNotificationStore] Duplicate notification, skipping:', options.nostrEventId);
        return notification; // Return without adding
      }
    }

    // Add to beginning of array (newest first)
    this.notifications.unshift(notification);

    // Save to storage
    await this.saveToStorage();

    // Notify subscribers
    this.notifySubscribers();

    console.log(`[UnifiedNotificationStore] Added notification: ${type} - "${title}"`);

    return notification;
  }

  /**
   * Get all notifications with optional filtering
   */
  getNotifications(filter?: NotificationFilter): UnifiedNotification[] {
    let filtered = [...this.notifications];

    if (filter) {
      // Filter by type
      if (filter.types && filter.types.length > 0) {
        filtered = filtered.filter((n) => filter.types!.includes(n.type));
      }

      // Filter by read status
      if (filter.unreadOnly) {
        filtered = filtered.filter((n) => !n.isRead);
      }

      // Filter by date range
      if (filter.startDate) {
        filtered = filtered.filter((n) => n.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        filtered = filtered.filter((n) => n.timestamp <= filter.endDate!);
      }

      // Limit results
      if (filter.limit && filter.limit > 0) {
        filtered = filtered.slice(0, filter.limit);
      }
    }

    return filtered;
  }

  /**
   * Get notifications grouped by date
   */
  getGroupedNotifications(): GroupedNotifications {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const grouped: GroupedNotifications = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    };

    for (const notification of this.notifications) {
      if (notification.timestamp >= oneDayAgo) {
        grouped.today.push(notification);
      } else if (notification.timestamp >= twoDaysAgo) {
        grouped.yesterday.push(notification);
      } else if (notification.timestamp >= oneWeekAgo) {
        grouped.thisWeek.push(notification);
      } else {
        grouped.older.push(notification);
      }
    }

    return grouped;
  }

  /**
   * Get unread notification count
   */
  getUnreadCount(types?: UnifiedNotificationType[]): number {
    let notifications = this.notifications.filter((n) => !n.isRead);

    if (types && types.length > 0) {
      notifications = notifications.filter((n) => types.includes(n.type));
    }

    return notifications.length;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.find((n) => n.id === notificationId);

    if (!notification) {
      console.warn('[UnifiedNotificationStore] Notification not found:', notificationId);
      return;
    }

    if (notification.isRead) {
      return; // Already read
    }

    notification.isRead = true;

    await this.saveToStorage();
    this.notifySubscribers();

    console.log('[UnifiedNotificationStore] Marked as read:', notificationId);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(types?: UnifiedNotificationType[]): Promise<void> {
    let updated = false;

    for (const notification of this.notifications) {
      if (notification.isRead) continue;

      if (!types || types.includes(notification.type)) {
        notification.isRead = true;
        updated = true;
      }
    }

    if (updated) {
      await this.saveToStorage();
      this.notifySubscribers();
      console.log('[UnifiedNotificationStore] Marked all as read');
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const index = this.notifications.findIndex((n) => n.id === notificationId);

    if (index === -1) {
      console.warn('[UnifiedNotificationStore] Notification not found:', notificationId);
      return;
    }

    this.notifications.splice(index, 1);

    await this.saveToStorage();
    this.notifySubscribers();

    console.log('[UnifiedNotificationStore] Deleted notification:', notificationId);
  }

  /**
   * Clear all notifications
   */
  async clearAll(): Promise<void> {
    this.notifications = [];

    await this.saveToStorage();
    this.notifySubscribers();

    console.log('[UnifiedNotificationStore] Cleared all notifications');
  }

  /**
   * Subscribe to notification changes
   */
  subscribe(callback: NotificationSubscriber): () => void {
    this.subscribers.add(callback);

    // Immediately call with current state
    callback(this.notifications, this.getUnreadCount());

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get a single notification by ID
   */
  getNotification(notificationId: string): UnifiedNotification | undefined {
    return this.notifications.find((n) => n.id === notificationId);
  }

  /**
   * Check if notification exists (by nostr event ID)
   */
  hasNotification(nostrEventId: string): boolean {
    return this.notifications.some((n) => n.nostrEventId === nostrEventId);
  }

  /**
   * Cleanup method
   */
  cleanup(): void {
    console.log('[UnifiedNotificationStore] Cleaning up...');
    this.subscribers.clear();
    this.isInitialized = false;
    this.userPubkey = null;
    console.log('[UnifiedNotificationStore] Cleanup complete');
  }

  // Private methods

  /**
   * Load notifications from AsyncStorage
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);

      if (!stored) {
        console.log('[UnifiedNotificationStore] No stored notifications found');
        this.notifications = [];
        return;
      }

      const data: NotificationStorage = JSON.parse(stored);

      // Check version for migrations
      if (data.version !== STORAGE_VERSION) {
        console.log('[UnifiedNotificationStore] Storage version mismatch, resetting...');
        this.notifications = [];
        return;
      }

      this.notifications = data.notifications || [];
      console.log(`[UnifiedNotificationStore] Loaded ${this.notifications.length} notifications from storage`);
    } catch (error) {
      console.error('[UnifiedNotificationStore] Failed to load from storage:', error);
      this.notifications = [];
    }
  }

  /**
   * Save notifications to AsyncStorage
   */
  private async saveToStorage(): Promise<void> {
    try {
      const data: NotificationStorage = {
        notifications: this.notifications,
        lastCleanup: Date.now(),
        version: STORAGE_VERSION,
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[UnifiedNotificationStore] Failed to save to storage:', error);
    }
  }

  /**
   * Remove notifications older than retention period
   */
  private async cleanupOldNotifications(): Promise<void> {
    const cutoffDate = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const initialCount = this.notifications.length;

    this.notifications = this.notifications.filter(
      (n) => n.timestamp >= cutoffDate
    );

    const removedCount = initialCount - this.notifications.length;

    if (removedCount > 0) {
      await this.saveToStorage();
      console.log(`[UnifiedNotificationStore] Cleaned up ${removedCount} old notifications`);
    }
  }

  /**
   * Notify all subscribers of changes
   */
  private notifySubscribers(): void {
    const unreadCount = this.getUnreadCount();

    this.subscribers.forEach((callback) => {
      try {
        callback([...this.notifications], unreadCount);
      } catch (error) {
        console.error('[UnifiedNotificationStore] Error in subscriber callback:', error);
      }
    });
  }

  /**
   * Generate unique notification ID
   */
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get default icon for notification type
   */
  private getDefaultIcon(type: UnifiedNotificationType): string {
    const iconMap: Record<UnifiedNotificationType, string> = {
      challenge_request: 'trophy',
      challenge_accepted: 'checkmark-circle',
      challenge_declined: 'close-circle',
      competition_announcement: 'megaphone',
      competition_reminder: 'time',
      competition_results: 'podium',
      incoming_zap: 'flash',
      team_join_request: 'people',
      workout_comment: 'chatbubble',
      workout_zap: 'flash',
    };

    return iconMap[type] || 'notifications';
  }
}

// Export singleton instance
export const unifiedNotificationStore = UnifiedNotificationStore.getInstance();
