/**
 * NostrNotificationEventHandler - Handles competition events from Nostr
 * Processes kinds 1101, 1102, 1103 and triggers team-branded notifications
 */

import { NostrRelayManager } from '../nostr/NostrRelayManager';
import { TeamContextService } from './TeamContextService';
import { TeamNotificationFormatter } from './TeamNotificationFormatter';
import { ExpoNotificationProvider } from './ExpoNotificationProvider';
import { NotificationPreferencesService } from './NotificationPreferencesService';
import { useUserStore } from '../../store/userStore';
import { analytics } from '../../utils/analytics';
import type { Event } from 'nostr-tools';
import type {
  RichNotificationData,
  NotificationType,
  NotificationSettings,
} from '../../types';
import { unifiedNotificationStore } from './UnifiedNotificationStore';
import type { CompetitionNotificationMetadata } from '../../types/unifiedNotifications';

// Competition event interfaces based on NIP-101e
interface CompetitionAnnouncement {
  kind: 1101;
  competitionId: string;
  content: string;
  startTime: number;
  prizeAmount?: number;
  eventType: string;
  teamMembers: string[]; // npubs to notify
}

interface CompetitionResults {
  kind: 1102;
  competitionId: string;
  content: string;
  results: Array<{
    npub: string;
    place: number;
    satsWon: number;
  }>;
}

interface CompetitionStartingSoon {
  kind: 1103;
  competitionId: string;
  content: string;
  startTime: number;
  teamMembers: string[];
}

type CompetitionEvent =
  | CompetitionAnnouncement
  | CompetitionResults
  | CompetitionStartingSoon;

export class NostrNotificationEventHandler {
  private static instance: NostrNotificationEventHandler;
  private relayManager: NostrRelayManager;
  private teamContextService: TeamContextService;
  private teamFormatter: TeamNotificationFormatter;
  private notificationProvider: ExpoNotificationProvider;
  private subscriptionIds: Set<string> = new Set();
  private processedEvents: Set<string> = new Set(); // Prevent duplicate processing
  private isActive: boolean = false;

  private constructor() {
    this.relayManager = new NostrRelayManager();
    this.teamContextService = TeamContextService.getInstance();
    this.teamFormatter = TeamNotificationFormatter.getInstance();
    this.notificationProvider = ExpoNotificationProvider.getInstance();
  }

  static getInstance(): NostrNotificationEventHandler {
    if (!NostrNotificationEventHandler.instance) {
      NostrNotificationEventHandler.instance =
        new NostrNotificationEventHandler();
    }
    return NostrNotificationEventHandler.instance;
  }

  /**
   * Start listening for competition events
   */
  async startListening(): Promise<void> {
    if (this.isActive) {
      console.log('📡 NostrNotificationEventHandler already active');
      return;
    }

    console.log('📡 Starting Nostr competition event monitoring...');

    try {
      // Subscribe to competition events (kinds 1101, 1102, 1103)
      const subscriptionId = await this.relayManager.subscribeToEvents(
        [
          {
            kinds: [1101, 1102, 1103], // Competition events
            limit: 100, // Get recent events
          },
        ],
        this.handleCompetitionEvent.bind(this)
      );

      this.subscriptionIds.add(subscriptionId);
      this.isActive = true;

      analytics.track('notification_scheduled', {
        event: 'competition_monitoring_started',
        subscriptionId,
        eventKinds: [1101, 1102, 1103],
      });

      console.log(
        `✅ Competition event monitoring active with subscription: ${subscriptionId}`
      );
    } catch (error) {
      console.error('❌ Failed to start competition event monitoring:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      analytics.track('notification_scheduled', {
        event: 'competition_monitoring_failed',
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Stop listening for competition events
   */
  async stopListening(): Promise<void> {
    console.log('📡 Stopping Nostr competition event monitoring...');

    // Unsubscribe from all active subscriptions
    for (const subscriptionId of this.subscriptionIds) {
      try {
        await this.relayManager.unsubscribe(subscriptionId);
      } catch (error) {
        console.warn(`Failed to unsubscribe from ${subscriptionId}:`, error);
      }
    }

    this.subscriptionIds.clear();
    this.processedEvents.clear();
    this.isActive = false;

    console.log('✅ Competition event monitoring stopped');
  }

  /**
   * Handle incoming competition events
   */
  private async handleCompetitionEvent(
    event: Event,
    relayUrl: string
  ): Promise<void> {
    // Prevent duplicate processing
    if (this.processedEvents.has(event.id)) {
      return;
    }
    this.processedEvents.add(event.id);

    console.log(
      `📥 Competition event received: kind ${event.kind} from ${relayUrl}`
    );

    try {
      switch (event.kind) {
        case 1101:
          await this.handleCompetitionAnnouncement(event);
          break;
        case 1102:
          await this.handleCompetitionResults(event);
          break;
        case 1103:
          await this.handleCompetitionStartingSoon(event);
          break;
        default:
          console.warn(`Unknown competition event kind: ${event.kind}`);
      }

      analytics.track('notification_scheduled', {
        event: 'competition_event_processed',
        kind: event.kind,
        eventId: event.id,
        relayUrl,
      });
    } catch (error) {
      console.error(`Failed to process competition event ${event.id}:`, error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      analytics.track('notification_scheduled', {
        event: 'competition_event_processing_failed',
        kind: event.kind,
        eventId: event.id,
        error: errorMessage,
      });
    }
  }

  /**
   * Handle competition announcement (kind 1101)
   */
  private async handleCompetitionAnnouncement(nostrEvent: Event): Promise<void> {
    const competitionEvent = this.parseCompetitionAnnouncement(nostrEvent);
    if (!competitionEvent) return;

    console.log(
      `📢 Processing competition announcement: ${competitionEvent.competitionId}`
    );

    // Get team members to notify
    const teamMembers = await this.getNotificationTargets(
      competitionEvent.teamMembers
    );

    // Create notification for each team member
    for (const member of teamMembers) {
      const { userId, userSettings } = member;

      // Check if user wants event notifications
      if (!userSettings.eventNotifications && !userSettings.teamAnnouncements) {
        continue;
      }

      // Get user's team for branding
      const membership = await this.teamContextService.getCurrentUserTeam(
        userId
      );
      if (!membership || !membership.hasTeam) continue;

      // Create rich notification
      const notification: RichNotificationData = {
        id: `announcement_${competitionEvent.competitionId}_${userId}`,
        type: 'competition_announcement',
        timestamp: new Date().toISOString(),
        title: `New Competition! 🏃‍♂️`,
        body: competitionEvent.content,
        competitionId: competitionEvent.competitionId,
        startTime: new Date(competitionEvent.startTime * 1000).toISOString(),
        eventType: competitionEvent.eventType,
        prizeAmount: competitionEvent.prizeAmount,
        teamId: membership.teamId,
        actions: [
          {
            id: 'view_competition',
            text: 'View Details',
            type: 'primary',
            action: 'join_event',
          },
        ],
      };

      await this.sendTeamBrandedNotification(
        notification,
        userId,
        membership.teamId!
      );

      // Publish to unified store for current user only
      const userStore = useUserStore.getState();
      const isCurrentUser = userStore.user && (
        userStore.user.id === userId ||
        userStore.user.npub === userId
      );

      if (isCurrentUser) {
        const metadata: CompetitionNotificationMetadata = {
          competitionId: competitionEvent.competitionId,
          competitionName: competitionEvent.content,
          competitionType: 'event',
          activityType: competitionEvent.eventType,
          startDate: competitionEvent.startTime,
          teamId: membership.teamId,
          prizeAmount: competitionEvent.prizeAmount,
        };

        await unifiedNotificationStore.addNotification(
          'competition_announcement',
          'New Competition! 🏃‍♂️',
          competitionEvent.content,
          metadata,
          {
            icon: 'megaphone',
            actions: [
              {
                id: 'view_competition',
                type: 'view_competition',
                label: 'View Details',
                isPrimary: true,
              },
            ],
            nostrEventId: nostrEvent.id,
          }
        );
      }
    }

    analytics.track('notification_scheduled', {
      event: 'competition_announcement_processed',
      competitionId: competitionEvent.competitionId,
      notificationCount: teamMembers.length,
    });
  }

  /**
   * Handle competition results (kind 1102)
   */
  private async handleCompetitionResults(nostrEvent: Event): Promise<void> {
    const competitionEvent = this.parseCompetitionResults(nostrEvent);
    if (!competitionEvent) return;

    console.log(
      `🏆 Processing competition results: ${competitionEvent.competitionId}`
    );

    // Notify each participant with their results
    for (const result of competitionEvent.results) {
      const userSettings = await this.getUserNotificationSettings(result.npub);

      // Check if user wants result notifications
      if (!userSettings?.eventNotifications && !userSettings?.bitcoinRewards) {
        continue;
      }

      // Get user's team for branding
      const membership = await this.teamContextService.getCurrentUserTeam(
        result.npub
      );
      if (!membership || !membership.hasTeam) continue;

      // Create results notification
      const notification: RichNotificationData = {
        id: `results_${competitionEvent.competitionId}_${result.npub}`,
        type: 'competition_results',
        timestamp: new Date().toISOString(),
        title: `🏆 You placed ${this.getOrdinal(result.place)}!`,
        body: competitionEvent.content,
        competitionId: competitionEvent.competitionId,
        place: result.place,
        satsWon: result.satsWon,
        bitcoinAmount: result.satsWon,
        earningsAmount: `+${result.satsWon.toLocaleString()} sats`,
        teamId: membership.teamId,
        earningsSection: {
          amount: result.satsWon,
          label: 'Competition Reward',
        },
        actions: [
          {
            id: 'view_wallet',
            text: 'View Wallet',
            type: 'primary',
            action: 'view_wallet',
          },
        ],
      };

      await this.sendTeamBrandedNotification(
        notification,
        result.npub,
        membership.teamId!
      );

      // Publish to unified store for current user only
      const userStore = useUserStore.getState();
      const isCurrentUser = userStore.user && (
        userStore.user.id === result.npub ||
        userStore.user.npub === result.npub
      );

      if (isCurrentUser) {
        const metadata: CompetitionNotificationMetadata = {
          competitionId: competitionEvent.competitionId,
          competitionName: competitionEvent.content,
          competitionType: 'event',
          teamId: membership.teamId,
          userPosition: result.place,
          prizeAmount: result.satsWon,
        };

        await unifiedNotificationStore.addNotification(
          'competition_results',
          `🏆 You placed ${this.getOrdinal(result.place)}!`,
          competitionEvent.content,
          metadata,
          {
            icon: 'podium',
            actions: [
              {
                id: 'view_wallet',
                type: 'view_wallet',
                label: 'View Wallet',
                isPrimary: true,
              },
            ],
            nostrEventId: nostrEvent.id,
          }
        );
      }
    }

    analytics.track('notification_scheduled', {
      event: 'competition_results_processed',
      competitionId: competitionEvent.competitionId,
      resultCount: competitionEvent.results.length,
    });
  }

  /**
   * Handle competition starting soon (kind 1103)
   */
  private async handleCompetitionStartingSoon(nostrEvent: Event): Promise<void> {
    const competitionEvent = this.parseCompetitionStartingSoon(nostrEvent);
    if (!competitionEvent) return;

    console.log(
      `⏰ Processing competition starting soon: ${competitionEvent.competitionId}`
    );

    // Get team members to notify
    const teamMembers = await this.getNotificationTargets(
      competitionEvent.teamMembers
    );

    for (const member of teamMembers) {
      const { userId, userSettings } = member;

      // Check if user wants reminder notifications
      if (
        !userSettings.eventNotifications &&
        !userSettings.liveCompetitionUpdates
      ) {
        continue;
      }

      // Get user's team for branding
      const membership = await this.teamContextService.getCurrentUserTeam(
        userId
      );
      if (!membership || !membership.hasTeam) continue;

      // Create reminder notification
      const notification: RichNotificationData = {
        id: `starting_soon_${competitionEvent.competitionId}_${userId}`,
        type: 'competition_starting_soon',
        timestamp: new Date().toISOString(),
        title: `⏰ Competition starts soon!`,
        body: competitionEvent.content,
        competitionId: competitionEvent.competitionId,
        startTime: new Date(competitionEvent.startTime * 1000).toISOString(),
        teamId: membership.teamId,
        liveIndicator: {
          text: 'Starting Soon',
          color: '#FF6B35',
          isLive: true,
        },
        actions: [
          {
            id: 'start_run',
            text: 'Start Activity',
            type: 'primary',
            action: 'start_run',
          },
        ],
      };

      await this.sendTeamBrandedNotification(
        notification,
        userId,
        membership.teamId!
      );

      // Publish to unified store for current user only
      const userStore = useUserStore.getState();
      const isCurrentUser = userStore.user && (
        userStore.user.id === userId ||
        userStore.user.npub === userId
      );

      if (isCurrentUser) {
        const metadata: CompetitionNotificationMetadata = {
          competitionId: competitionEvent.competitionId,
          competitionName: competitionEvent.content,
          competitionType: 'event',
          startDate: competitionEvent.startTime,
          teamId: membership.teamId,
        };

        await unifiedNotificationStore.addNotification(
          'competition_reminder',
          '⏰ Competition starts soon!',
          competitionEvent.content,
          metadata,
          {
            icon: 'time',
            actions: [
              {
                id: 'start_run',
                type: 'view_competition',
                label: 'Start Activity',
                isPrimary: true,
              },
            ],
            nostrEventId: nostrEvent.id,
          }
        );
      }
    }

    analytics.track('notification_scheduled', {
      event: 'competition_starting_soon_processed',
      competitionId: competitionEvent.competitionId,
      notificationCount: teamMembers.length,
    });
  }

  /**
   * Send team-branded notification
   */
  private async sendTeamBrandedNotification(
    notification: RichNotificationData,
    userId: string,
    teamId: string
  ): Promise<void> {
    try {
      // Add team branding
      const brandedNotification = await this.teamFormatter.addTeamBranding(
        teamId,
        notification
      );

      // Send notification
      await this.notificationProvider.scheduleNotification(brandedNotification);

      analytics.track('notification_scheduled', {
        type: notification.type,
        teamBranded: true,
        userId,
        teamId,
        competitionId: notification.competitionId,
      });
    } catch (error) {
      console.error('Failed to send team-branded notification:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      analytics.track('notification_scheduled', {
        teamBrandingFailed: true,
        userId,
        teamId,
        error: errorMessage,
      });
    }
  }

  // Helper Methods

  private parseCompetitionAnnouncement(
    event: Event
  ): CompetitionAnnouncement | null {
    try {
      const competitionId = event.tags.find(
        (t) => t[0] === 'competition_id'
      )?.[1];
      const startTime = event.tags.find((t) => t[0] === 'start_time')?.[1];
      const prize = event.tags.find((t) => t[0] === 'prize')?.[1];
      const eventType = event.tags.find((t) => t[0] === 'event_type')?.[1];
      const teamMembers = event.tags
        .filter((t) => t[0] === 'p')
        .map((t) => t[1]);

      if (!competitionId || !startTime || !eventType) {
        console.warn('Invalid competition announcement format');
        return null;
      }

      return {
        kind: 1101,
        competitionId,
        content: event.content,
        startTime: parseInt(startTime),
        prizeAmount: prize ? parseInt(prize) : undefined,
        eventType,
        teamMembers,
      };
    } catch (error) {
      console.error('Failed to parse competition announcement:', error);
      return null;
    }
  }

  private parseCompetitionResults(event: Event): CompetitionResults | null {
    try {
      const competitionId = event.tags.find(
        (t) => t[0] === 'competition_id'
      )?.[1];
      const resultTags = event.tags.filter(
        (t) => t[0] === 'p' && t.length >= 4
      );

      if (!competitionId || resultTags.length === 0) {
        console.warn('Invalid competition results format');
        return null;
      }

      const results = resultTags.map((tag) => ({
        npub: tag[1],
        place: parseInt(tag[2]),
        satsWon: parseInt(tag[3]),
      }));

      return {
        kind: 1102,
        competitionId,
        content: event.content,
        results,
      };
    } catch (error) {
      console.error('Failed to parse competition results:', error);
      return null;
    }
  }

  private parseCompetitionStartingSoon(
    event: Event
  ): CompetitionStartingSoon | null {
    try {
      const competitionId = event.tags.find(
        (t) => t[0] === 'competition_id'
      )?.[1];
      const startTime = event.tags.find((t) => t[0] === 'start_time')?.[1];
      const teamMembers = event.tags
        .filter((t) => t[0] === 'p')
        .map((t) => t[1]);

      if (!competitionId || !startTime) {
        console.warn('Invalid competition starting soon format');
        return null;
      }

      return {
        kind: 1103,
        competitionId,
        content: event.content,
        startTime: parseInt(startTime),
        teamMembers,
      };
    } catch (error) {
      console.error('Failed to parse competition starting soon:', error);
      return null;
    }
  }

  private async getNotificationTargets(npubs: string[]): Promise<
    Array<{
      userId: string;
      userSettings: NotificationSettings;
    }>
  > {
    const targets: Array<{
      userId: string;
      userSettings: NotificationSettings;
    }> = [];

    for (const npub of npubs) {
      const userSettings = await this.getUserNotificationSettings(npub);
      if (userSettings) {
        targets.push({ userId: npub, userSettings });
      }
    }

    return targets;
  }

  private async getUserNotificationSettings(
    userId: string
  ): Promise<NotificationSettings | null> {
    try {
      // Check if this is the current user
      const userStore = useUserStore.getState();
      const isCurrentUser = userStore.user && (
        userStore.user.id === userId || 
        userStore.user.npub === userId
      );

      if (isCurrentUser) {
        // Get actual user preferences from persistent storage
        const settings = await NotificationPreferencesService.getNotificationSettings();
        console.log(`📱 Using real notification preferences for current user: ${userId.slice(0, 20)}...`);
        return settings;
      }

      // For other users (in multi-user scenarios), we can't access their preferences
      // In practice, this handler should mainly process events for the current user
      console.log(`📱 Using default notification settings for other user: ${userId.slice(0, 20)}...`);
      return {
        eventNotifications: true,
        leagueUpdates: true,
        teamAnnouncements: true,
        bitcoinRewards: true,
        challengeUpdates: false,
        liveCompetitionUpdates: false,
        workoutReminders: false,
      };
    } catch (error) {
      console.error('Failed to get user notification settings:', error);
      // Return permissive defaults on error to avoid blocking notifications completely
      return {
        eventNotifications: true,
        leagueUpdates: true,
        teamAnnouncements: true,
        bitcoinRewards: true,
        challengeUpdates: true,
        liveCompetitionUpdates: true,
        workoutReminders: true,
      };
    }
  }

  private getOrdinal(num: number): string {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
  }

  /**
   * Get handler status
   */
  getStatus(): {
    isActive: boolean;
    subscriptionCount: number;
    processedEventCount: number;
  } {
    return {
      isActive: this.isActive,
      subscriptionCount: this.subscriptionIds.size,
      processedEventCount: this.processedEvents.size,
    };
  }

  /**
   * Cleanup method
   */
  cleanup(): void {
    this.stopListening();
    this.processedEvents.clear();
  }
}
