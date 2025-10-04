/**
 * LocalNotificationTrigger - Triggers local notifications for competition events
 * Handles new competitions, leaderboard changes, and competition ending alerts
 * Works with ExpoNotificationProvider to display local push notifications
 * All notifications are sent - no user preference checks
 */

import { ExpoNotificationProvider } from './ExpoNotificationProvider';
import { NotificationService } from '../notificationService';
import type { RichNotificationData } from '../../types';

export class LocalNotificationTrigger {
  private static instance: LocalNotificationTrigger;
  private notificationProvider: ExpoNotificationProvider;
  private isInitialized = false;

  private constructor() {
    this.notificationProvider = ExpoNotificationProvider.getInstance();
  }

  static getInstance(): LocalNotificationTrigger {
    if (!LocalNotificationTrigger.instance) {
      LocalNotificationTrigger.instance = new LocalNotificationTrigger();
    }
    return LocalNotificationTrigger.instance;
  }

  /**
   * Initialize the notification trigger service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.notificationProvider.initialize();
      this.isInitialized = true;
      console.log('📱 LocalNotificationTrigger initialized');
    } catch (error) {
      console.error('Failed to initialize LocalNotificationTrigger:', error);
    }
  }

  /**
   * Notify user about a new competition they can join
   */
  async notifyNewCompetition(
    competitionName: string,
    competitionType: 'event' | 'league',
    activityType: string,
    startTime?: Date
  ): Promise<void> {
    const notification: RichNotificationData = {
      id: `new_comp_${Date.now()}`,
      type: 'competition_announcement',
      title: `New ${competitionType === 'event' ? 'Event' : 'League'} Available! 🏃‍♀️`,
      body: `"${competitionName}" - ${activityType} competition${
        startTime ? ` starts ${this.formatTimeUntil(startTime)}` : ' is now open'
      }. Join now to compete for Bitcoin rewards!`,
      timestamp: new Date().toISOString(),
      actions: [
        {
          id: 'view_competition',
          text: 'View Details',
          type: 'primary' as const,
          action: 'view_competition' as any
        },
      ],
    };

    // Schedule local notification
    await this.notificationProvider.scheduleNotification(notification);

    // Store in notification history
    await NotificationService.addNotification(
      'competition_announcement',
      notification.title || '',
      notification.body || '',
      undefined
    );

    console.log(`📱 Triggered new competition notification: ${competitionName}`);
  }

  /**
   * Notify user about leaderboard position change
   */
  async notifyLeaderboardChange(
    competitionName: string,
    previousPosition: number,
    newPosition: number,
    totalParticipants: number
  ): Promise<void> {
    const improved = newPosition < previousPosition;
    const emoji = improved ? '📈' : '📉';
    const action = improved ? 'climbed to' : 'dropped to';

    const notification: RichNotificationData = {
      id: `leaderboard_${Date.now()}`,
      type: 'position_change',
      title: `Position Change ${emoji}`,
      body: `You ${action} #${newPosition} of ${totalParticipants} in "${competitionName}"${
        improved && newPosition <= 3 ? ' - You\'re in the money! 💰' : ''
      }`,
      timestamp: new Date().toISOString(),
      actions: [
        {
          id: 'view_leaderboard',
          text: 'View Leaderboard',
          type: 'primary' as const,
          action: 'view_leaderboard' as any
        },
      ],
    };

    // Schedule local notification
    await this.notificationProvider.scheduleNotification(notification);

    // Store in notification history
    await NotificationService.addNotification(
      'position_change',
      notification.title || '',
      notification.body || '',
      { oldPosition: previousPosition, newPosition, leagueId: '', leagueName: competitionName }
    );

    console.log(
      `📱 Triggered leaderboard change: ${competitionName} #${previousPosition} → #${newPosition}`
    );
  }

  /**
   * Notify user about competition ending soon
   */
  async notifyCompetitionEndingSoon(
    competitionName: string,
    competitionType: 'event' | 'league',
    endTime: Date,
    currentPosition?: number,
    pointsFromNext?: number
  ): Promise<void> {
    const hoursLeft = Math.max(1, Math.ceil((endTime.getTime() - Date.now()) / (1000 * 60 * 60)));

    let bodyText = `"${competitionName}" ends in ${hoursLeft} hour${hoursLeft > 1 ? 's' : ''}!`;

    if (currentPosition && pointsFromNext && currentPosition > 1) {
      bodyText += ` You're #${currentPosition} and only ${pointsFromNext} points from climbing up! 🎯`;
    } else if (currentPosition === 1) {
      bodyText += ` You're in 1st place - defend your lead! 👑`;
    }

    const notification: RichNotificationData = {
      id: `ending_${Date.now()}`,
      type: 'competition_starting_soon',
      title: `⏰ Competition Ending Soon!`,
      body: bodyText,
      timestamp: new Date().toISOString(),
      actions: [
        {
          id: 'view_competition',
          text: 'View Competition',
          type: 'primary' as const,
          action: 'view_competition' as any
        },
      ],
    };

    // Schedule local notification
    await this.notificationProvider.scheduleNotification(notification);

    // Store in notification history
    await NotificationService.addNotification(
      'competition_starting_soon',
      notification.title || '',
      notification.body || '',
      undefined
    );

    console.log(
      `📱 Triggered ending soon notification: ${competitionName} ends in ${hoursLeft}h`
    );
  }

  /**
   * Format time until date in human-readable format
   */
  private formatTimeUntil(date: Date): string {
    const now = Date.now();
    const diff = date.getTime() - now;

    if (diff < 0) return 'now';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `in ${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return 'soon';
    }
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    return this.notificationProvider.areNotificationsEnabled();
  }
}