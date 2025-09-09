/**
 * NotificationService - Core push notification management
 * Handles scheduling, formatting, and delivery of rich notifications
 */

import {
  RichNotificationData,
  NotificationType,
  MiniLeaderboardEntry,
  CategorizedNotifications,
  GroupedNotification,
} from '../../types';
import { analytics } from '../../utils/analytics';
import { ExpoNotificationProvider } from './ExpoNotificationProvider';
import {
  TeamNotificationFormatter,
  TeamBrandedNotification,
} from './TeamNotificationFormatter';
import { NostrNotificationEventHandler } from './NostrNotificationEventHandler';

export class NotificationService {
  private static instance: NotificationService;
  private notificationHistory: RichNotificationData[] = [];
  private expoProvider: ExpoNotificationProvider;
  private teamFormatter: TeamNotificationFormatter;
  private nostrEventHandler: NostrNotificationEventHandler;
  private userId: string | null = null;
  private isCompetitionMonitoringActive: boolean = false;

  private constructor() {
    this.expoProvider = ExpoNotificationProvider.getInstance();
    this.teamFormatter = TeamNotificationFormatter.getInstance();
    this.nostrEventHandler = NostrNotificationEventHandler.getInstance();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Format notification data based on type
  formatNotification(type: NotificationType, data: any): RichNotificationData {
    const baseNotification: RichNotificationData = {
      id: this.generateNotificationId(),
      type,
      title: '',
      body: '',
      timestamp: new Date().toISOString(),
      isRead: false,
      isNew: true,
    };

    switch (type) {
      case 'live_position_threat':
        return this.formatLivePositionThreat(baseNotification, data);
      case 'live_position_gained':
        return this.formatLivePositionGained(baseNotification, data);
      case 'bitcoin_earned':
        return this.formatBitcoinEarned(baseNotification, data);
      case 'weekly_earnings_summary':
        return this.formatWeeklyEarnings(baseNotification, data);
      case 'challenge_invitation':
        return this.formatChallengeInvitation(baseNotification, data);
      case 'team_member_joined':
        return this.formatTeamMemberJoined(baseNotification, data);
      case 'team_join_request':
        return this.formatTeamJoinRequest(baseNotification, data);
      case 'workout_reminder':
        return this.formatWorkoutReminder(baseNotification, data);
      case 'streak_reminder':
        return this.formatStreakReminder(baseNotification, data);
      default:
        return this.formatGenericNotification(baseNotification, data);
    }
  }

  // Initialize notification service
  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    await this.expoProvider.initialize(userId);

    // Start competition event monitoring
    await this.startCompetitionEventMonitoring();
  }

  // Schedule a notification
  async scheduleNotification(
    notification: RichNotificationData,
    delay: number = 0
  ): Promise<void> {
    // Track notification scheduled
    analytics.trackNotificationScheduled(notification.type, delay > 0);

    // Add to history
    this.notificationHistory.unshift(notification);

    // Schedule with Expo push notifications
    await this.expoProvider.scheduleNotification(notification, delay);
  }

  // Schedule team-branded notification
  async scheduleTeamBrandedNotification(
    teamId: string,
    notification: RichNotificationData,
    delay: number = 0
  ): Promise<void> {
    const teamBrandedNotification = await this.teamFormatter.addTeamBranding(
      teamId,
      notification
    );
    await this.scheduleNotification(teamBrandedNotification, delay);
  }

  // Schedule notification with user's current team branding
  async scheduleUserTeamNotification(
    notification: RichNotificationData,
    delay: number = 0
  ): Promise<void> {
    if (!this.userId) {
      // Fallback to regular notification if no user ID
      await this.scheduleNotification(notification, delay);
      return;
    }

    const teamBrandedNotification =
      await this.teamFormatter.addUserTeamBranding(this.userId, notification);
    await this.scheduleNotification(teamBrandedNotification, delay);
  }

  // Send team join request notification to captain
  async sendTeamJoinRequestNotification(data: {
    teamId: string;
    teamName: string;
    captainId: string;
    requesterName: string;
    requesterId: string;
    requesterNpub: string;
  }): Promise<void> {
    try {
      const notification = this.formatNotification('team_join_request', {
        teamId: data.teamId,
        teamName: data.teamName,
        requesterName: data.requesterName,
        requesterId: data.requesterId,
        requesterNpub: data.requesterNpub,
      });

      // Send team-branded notification to captain
      await this.scheduleTeamBrandedNotification(data.teamId, notification);

      // Track analytics - using general event tracking
      console.log('Team join request notification sent:', {
        teamId: data.teamId,
        captainId: data.captainId,
        requesterId: data.requesterId,
      });

      console.log(
        `✅ Team join request notification sent to captain ${data.captainId} for team ${data.teamName}`
      );
    } catch (error) {
      console.error('Failed to send team join request notification:', error);
      throw error;
    }
  }

  // Live competition updates with team branding
  async sendLivePositionUpdate(data: {
    competitorName: string;
    competitionName: string;
    distanceBehind: number;
    leaderboard: MiniLeaderboardEntry[];
    eventId: string;
    teamId?: string;
  }): Promise<void> {
    const notification = this.formatNotification('live_position_threat', data);

    if (data.teamId) {
      await this.scheduleTeamBrandedNotification(data.teamId, notification);
    } else {
      await this.scheduleUserTeamNotification(notification);
    }
  }

  async sendPositionGained(data: {
    newPosition: number;
    previousPosition: number;
    competitionName: string;
    competitorPassed: string;
    eventId: string;
    teamId?: string;
  }): Promise<void> {
    const notification = this.formatNotification('live_position_gained', data);

    if (data.teamId) {
      await this.scheduleTeamBrandedNotification(data.teamId, notification);
    } else {
      await this.scheduleUserTeamNotification(notification);
    }
  }

  // Bitcoin earnings with team branding
  async sendEarningsNotification(data: {
    amount: number;
    source: string;
    position?: number;
    eventId?: string;
    teamId?: string;
  }): Promise<void> {
    const notification = this.formatNotification('bitcoin_earned', data);

    if (data.teamId) {
      await this.scheduleTeamBrandedNotification(data.teamId, notification);
    } else {
      await this.scheduleUserTeamNotification(notification);
    }
  }

  // Challenge invitations with team branding
  async sendChallengeInvitation(data: {
    challengerName: string;
    challengeType: string;
    prizeAmount: number;
    deadline: string;
    challengeId: string;
    teamId?: string;
  }): Promise<void> {
    const notification = this.formatNotification('challenge_invitation', data);

    if (data.teamId) {
      await this.scheduleTeamBrandedNotification(data.teamId, notification);
    } else {
      await this.scheduleUserTeamNotification(notification);
    }
  }

  // Activity reminders
  async sendWorkoutReminder(data: {
    activeCompetitions: number;
    timeOfDay: 'morning' | 'evening';
  }): Promise<void> {
    const notification = this.formatNotification('workout_reminder', data);
    await this.scheduleNotification(notification);
  }

  async sendStreakReminder(data: {
    streakDays: number;
    timeRemaining: string;
  }): Promise<void> {
    const notification = this.formatNotification('streak_reminder', data);
    await this.scheduleNotification(notification);
  }

  // Get categorized notifications for display
  getCategorizedNotifications(): CategorizedNotifications {
    const notifications = this.notificationHistory;

    return {
      liveCompetition: notifications.filter((n) =>
        [
          'live_position_threat',
          'live_position_gained',
          'competition_ending_soon',
        ].includes(n.type)
      ),
      bitcoinRewards: notifications.filter((n) =>
        ['bitcoin_earned', 'weekly_earnings_summary'].includes(n.type)
      ),
      teamActivity: notifications.filter((n) =>
        ['team_event', 'team_member_joined', 'challenge_invitation'].includes(
          n.type
        )
      ),
      activityReminders: notifications.filter((n) =>
        ['workout_reminder', 'streak_reminder'].includes(n.type)
      ),
      grouped: this.createGroupedNotifications(notifications),
    };
  }

  // Create grouped notifications
  private createGroupedNotifications(
    notifications: RichNotificationData[]
  ): GroupedNotification[] {
    // Group notifications older than 24 hours
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const oldNotifications = notifications.filter(
      (n) => new Date(n.timestamp) < yesterday
    );

    if (oldNotifications.length >= 3) {
      return [
        {
          id: 'grouped-older',
          appName: 'RUNSTR',
          count: oldNotifications.length,
          notifications: oldNotifications,
          timestamp: oldNotifications[0]?.timestamp || new Date().toISOString(),
        },
      ];
    }

    return [];
  }

  // Private formatting methods
  private formatLivePositionThreat(
    base: RichNotificationData,
    data: any
  ): RichNotificationData {
    return {
      ...base,
      title: `${data.competitorName} is ${data.distanceBehind}km behind you`,
      body: `They're gaining fast in ${data.competitionName} - defend your position!`,
      liveIndicator: {
        text: 'LIVE',
        color: '#ff4444',
        isLive: true,
      },
      miniLeaderboard: data.leaderboard,
      actions: [
        {
          id: 'view_race',
          text: 'View Race',
          type: 'secondary',
          action: 'view_race',
        },
        {
          id: 'start_run',
          text: 'Start Run',
          type: 'primary',
          action: 'start_run',
        },
      ],
      eventId: data.eventId,
    };
  }

  private formatLivePositionGained(
    base: RichNotificationData,
    data: any
  ): RichNotificationData {
    return {
      ...base,
      title: `You moved up to ${data.newPosition}${this.getOrdinalSuffix(
        data.newPosition
      )} place!`,
      body: `Great job! You passed ${data.competitorPassed} in ${data.competitionName}`,
      eventId: data.eventId,
    };
  }

  private formatBitcoinEarned(
    base: RichNotificationData,
    data: any
  ): RichNotificationData {
    const positionText = data.position
      ? ` ${data.position}${this.getOrdinalSuffix(data.position)} place in`
      : '';

    return {
      ...base,
      title: `You earned ${data.amount.toLocaleString()} sats!`,
      body: `${positionText} ${data.source}`,
      earningsSection: {
        amount: data.amount,
        label: 'Added to your wallet',
      },
      actions: [
        {
          id: 'view_wallet',
          text: 'View Wallet',
          type: 'secondary',
          action: 'view_wallet',
        },
        {
          id: 'join_next',
          text: 'Join Next Event',
          type: 'primary',
          action: 'join_event',
        },
      ],
      prizeAmount: data.amount,
      eventId: data.eventId,
    };
  }

  private formatWeeklyEarnings(
    base: RichNotificationData,
    data: any
  ): RichNotificationData {
    return {
      ...base,
      title: `Weekly earnings: ${data.amount.toLocaleString()} sats`,
      body: `+${data.change.toLocaleString()} vs last week. You're on fire! Keep it up`,
      prizeAmount: data.amount,
    };
  }

  private formatChallengeInvitation(
    base: RichNotificationData,
    data: any
  ): RichNotificationData {
    return {
      ...base,
      title: `${data.challengerName} challenged you!`,
      body: `${
        data.challengeType
      } challenge • ${data.prizeAmount.toLocaleString()} sats prize • Ends ${
        data.deadline
      }`,
      actions: [
        {
          id: 'decline',
          text: 'Decline',
          type: 'secondary',
          action: 'decline_challenge',
        },
        {
          id: 'accept',
          text: 'Accept',
          type: 'primary',
          action: 'accept_challenge',
        },
      ],
      eventId: data.challengeId,
      challengerName: data.challengerName,
      prizeAmount: data.prizeAmount,
    };
  }

  private formatTeamMemberJoined(
    base: RichNotificationData,
    data: any
  ): RichNotificationData {
    return {
      ...base,
      title: `${data.memberName} joined your team`,
      body: `${data.teamName} now has ${data.memberCount} members`,
      teamId: data.teamId,
    };
  }

  private formatTeamJoinRequest(
    base: RichNotificationData,
    data: any
  ): RichNotificationData {
    return {
      ...base,
      title: `New join request for ${data.teamName}`,
      body: `${data.requesterName} wants to join your team`,
      teamId: data.teamId,
      requesterId: data.requesterId,
      actions: [
        {
          id: 'approve',
          text: 'Approve',
          type: 'primary',
          action: 'approve_join_request',
        },
        {
          id: 'deny',
          text: 'Deny',
          type: 'secondary',
          action: 'deny_join_request',
        },
        {
          id: 'view_all',
          text: 'View All Requests',
          type: 'secondary',
          action: 'view_join_requests',
        },
      ],
    };
  }

  private formatWorkoutReminder(
    base: RichNotificationData,
    data: any
  ): RichNotificationData {
    const timeText =
      data.timeOfDay === 'morning' ? 'morning run' : 'evening workout';

    return {
      ...base,
      title: `Time for your ${timeText}`,
      body: `You have ${data.activeCompetitions} active competitions. Let's earn some sats!`,
    };
  }

  private formatStreakReminder(
    base: RichNotificationData,
    data: any
  ): RichNotificationData {
    return {
      ...base,
      title: 'Keep your streak alive!',
      body: `${data.streakDays} days in a row. Don't break it now - quick run?`,
    };
  }

  private formatGenericNotification(
    base: RichNotificationData,
    data: any
  ): RichNotificationData {
    return {
      ...base,
      title: data.title || 'RUNSTR Update',
      body: data.body || 'New activity in your team',
    };
  }

  // Utility methods
  private generateNotificationId(): string {
    return `notification_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  private getOrdinalSuffix(num: number): string {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  }

  // Mark notification as read
  markAsRead(notificationId: string): void {
    const notification = this.notificationHistory.find(
      (n) => n.id === notificationId
    );
    if (notification) {
      notification.isRead = true;
      notification.isNew = false;
    }
  }

  // Clear old notifications
  clearOldNotifications(daysOld: number = 7): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    this.notificationHistory = this.notificationHistory.filter(
      (n) => new Date(n.timestamp) > cutoffDate
    );
  }

  // Competition Event Monitoring

  /**
   * Start monitoring for Nostr competition events (kinds 1101, 1102, 1103)
   */
  async startCompetitionEventMonitoring(): Promise<void> {
    if (this.isCompetitionMonitoringActive) {
      console.log('Competition event monitoring already active');
      return;
    }

    try {
      await this.nostrEventHandler.startListening();
      this.isCompetitionMonitoringActive = true;

      analytics.track('notification_scheduled', {
        event: 'competition_monitoring_started',
        userId: this.userId,
      });

      console.log('✅ Competition event monitoring started');
    } catch (error) {
      console.error('Failed to start competition event monitoring:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      analytics.track('notification_scheduled', {
        event: 'competition_monitoring_start_failed',
        userId: this.userId,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Stop monitoring for Nostr competition events
   */
  async stopCompetitionEventMonitoring(): Promise<void> {
    if (!this.isCompetitionMonitoringActive) {
      console.log('Competition event monitoring not active');
      return;
    }

    try {
      await this.nostrEventHandler.stopListening();
      this.isCompetitionMonitoringActive = false;

      analytics.track('notification_scheduled', {
        event: 'competition_monitoring_stopped',
        userId: this.userId,
      });

      console.log('✅ Competition event monitoring stopped');
    } catch (error) {
      console.error('Failed to stop competition event monitoring:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      analytics.track('notification_scheduled', {
        event: 'competition_monitoring_stop_failed',
        userId: this.userId,
        error: errorMessage,
      });
    }
  }

  /**
   * Get competition event monitoring status
   */
  getCompetitionMonitoringStatus(): {
    isActive: boolean;
    userId: string | null;
    handlerStatus: {
      isActive: boolean;
      subscriptionCount: number;
      processedEventCount: number;
    };
  } {
    return {
      isActive: this.isCompetitionMonitoringActive,
      userId: this.userId,
      handlerStatus: this.nostrEventHandler.getStatus(),
    };
  }

  /**
   * Restart competition event monitoring (useful for reconnections)
   */
  async restartCompetitionEventMonitoring(): Promise<void> {
    console.log('🔄 Restarting competition event monitoring...');

    await this.stopCompetitionEventMonitoring();
    await this.startCompetitionEventMonitoring();

    analytics.track('notification_scheduled', {
      event: 'competition_monitoring_restarted',
      userId: this.userId,
    });
  }

  /**
   * Send team-branded notification (public method for external services)
   */
  async sendTeamNotification(
    teamId: string,
    notification: RichNotificationData
  ): Promise<void> {
    await this.scheduleTeamBrandedNotification(teamId, notification);
  }

  /**
   * Send notification to current user's team
   */
  async sendUserTeamNotification(
    notification: RichNotificationData
  ): Promise<void> {
    await this.scheduleUserTeamNotification(notification);
  }

  /**
   * Cleanup method
   */
  cleanup(): void {
    console.log('🧹 Cleaning up NotificationService...');

    if (this.isCompetitionMonitoringActive) {
      this.stopCompetitionEventMonitoring();
    }

    this.teamFormatter.cleanup();
    this.nostrEventHandler.cleanup();
    this.notificationHistory = [];
    this.userId = null;

    console.log('✅ NotificationService cleanup complete');
  }
}
