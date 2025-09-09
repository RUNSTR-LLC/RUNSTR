/**
 * Nostr Real-time Competition Sync
 * Handles real-time Nostr workout events and updates competitions live
 * Provides debounced updates and live UI notifications
 */

import nostrCompetitionBridge from './nostrCompetitionBridge';
import competitionContextService from './competitionContextService';
import teamLeaderboardService from '../fitness/teamLeaderboardService';
import type { NostrWorkoutCompetition } from '../../types/nostrWorkout';

export interface RealtimeEvent {
  type: 'workout_added' | 'competition_updated' | 'leaderboard_changed';
  userId: string;
  teamId?: string;
  competitionId?: string;
  data: any;
  timestamp: string;
}

export interface RealtimeNotification {
  id: string;
  type:
    | 'rank_change'
    | 'new_leader'
    | 'competition_progress'
    | 'workout_processed';
  title: string;
  message: string;
  userId: string;
  teamId?: string;
  competitionId?: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: string;
}

type EventCallback = (event: RealtimeEvent) => void;
type NotificationCallback = (notification: RealtimeNotification) => void;

export class NostrRealtimeCompetitionSync {
  private static instance: NostrRealtimeCompetitionSync;
  private eventCallbacks = new Map<string, EventCallback[]>();
  private notificationCallbacks = new Map<string, NotificationCallback[]>();
  private pendingUpdates = new Map<string, any>();
  private isInitialized = false;

  private readonly DEBOUNCE_DELAY = 5000; // 5 seconds
  private readonly BATCH_UPDATE_DELAY = 2000; // 2 seconds

  private constructor() {}

  static getInstance(): NostrRealtimeCompetitionSync {
    if (!NostrRealtimeCompetitionSync.instance) {
      NostrRealtimeCompetitionSync.instance =
        new NostrRealtimeCompetitionSync();
    }
    return NostrRealtimeCompetitionSync.instance;
  }

  /**
   * Initialize the real-time sync service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🚀 Initializing NostrRealtimeCompetitionSync...');
      this.isInitialized = true;
      console.log('✅ NostrRealtimeCompetitionSync initialized');
    } catch (error) {
      console.error(
        '❌ Failed to initialize NostrRealtimeCompetitionSync:',
        error
      );
      throw error;
    }
  }

  /**
   * Handle incoming real-time Nostr workout event
   * Main entry point for real-time workout processing
   */
  async handleRealtimeNostrWorkout(
    nostrWorkout: NostrWorkoutCompetition,
    userId: string,
    teamId?: string
  ): Promise<void> {
    try {
      console.log(
        `📡 Handling real-time Nostr workout: ${nostrWorkout.id} for user ${userId}`
      );

      // Process the workout immediately for competitions
      const result =
        await nostrCompetitionBridge.processNostrWorkoutForCompetitions(
          nostrWorkout,
          userId,
          teamId
        );

      if (result.success) {
        // Emit workout processed event
        this.emitEvent({
          type: 'workout_added',
          userId,
          teamId,
          data: {
            workoutId: nostrWorkout.id,
            competitionsUpdated: result.competitionsUpdated,
            leaderboardUpdates: result.leaderboardUpdates,
          },
          timestamp: new Date().toISOString(),
        });

        // Send notification about workout processing
        if (result.competitionsUpdated > 0) {
          this.emitNotification({
            id: `workout_${nostrWorkout.id}_${Date.now()}`,
            type: 'workout_processed',
            title: '🏃‍♂️ Workout Processed',
            message: `Your workout updated ${result.competitionsUpdated} competition(s)`,
            userId,
            teamId,
            priority: 'medium',
            timestamp: new Date().toISOString(),
          });
        }

        // Trigger debounced competition updates
        this.scheduleCompetitionUpdate(userId, teamId);
      }
    } catch (error) {
      console.error('❌ Error handling real-time Nostr workout:', error);
    }
  }

  /**
   * Subscribe to real-time events for a user
   */
  subscribeToEvents(userId: string, callback: EventCallback): void {
    if (!this.eventCallbacks.has(userId)) {
      this.eventCallbacks.set(userId, []);
    }
    this.eventCallbacks.get(userId)!.push(callback);
    console.log(`📡 Subscribed to events for user ${userId}`);
  }

  /**
   * Subscribe to real-time notifications for a user
   */
  subscribeToNotifications(
    userId: string,
    callback: NotificationCallback
  ): void {
    if (!this.notificationCallbacks.has(userId)) {
      this.notificationCallbacks.set(userId, []);
    }
    this.notificationCallbacks.get(userId)!.push(callback);
    console.log(`🔔 Subscribed to notifications for user ${userId}`);
  }

  /**
   * Unsubscribe from events for a user
   */
  unsubscribeFromEvents(userId: string, callback?: EventCallback): void {
    if (!callback) {
      // Remove all callbacks
      this.eventCallbacks.delete(userId);
    } else {
      // Remove specific callback
      const callbacks = this.eventCallbacks.get(userId) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
    console.log(`📡 Unsubscribed from events for user ${userId}`);
  }

  /**
   * Unsubscribe from notifications for a user
   */
  unsubscribeFromNotifications(
    userId: string,
    callback?: NotificationCallback
  ): void {
    if (!callback) {
      // Remove all callbacks
      this.notificationCallbacks.delete(userId);
    } else {
      // Remove specific callback
      const callbacks = this.notificationCallbacks.get(userId) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
    console.log(`🔔 Unsubscribed from notifications for user ${userId}`);
  }

  /**
   * Schedule debounced competition update
   * Prevents spam updates from multiple workouts
   */
  private scheduleCompetitionUpdate(userId: string, teamId?: string): void {
    const key = `${userId}_${teamId || 'no_team'}`;

    // Clear existing timeout
    if (this.pendingUpdates.has(key)) {
      clearTimeout(this.pendingUpdates.get(key)!);
    }

    // Schedule new update
    const timeout = setTimeout(() => {
      this.processCompetitionUpdate(userId, teamId);
      this.pendingUpdates.delete(key);
    }, this.DEBOUNCE_DELAY);

    this.pendingUpdates.set(key, timeout);
  }

  /**
   * Process debounced competition update
   */
  private async processCompetitionUpdate(
    userId: string,
    teamId?: string
  ): Promise<void> {
    try {
      console.log(
        `🏆 Processing debounced competition update for user ${userId}`
      );

      // Clear competition context cache to get fresh data
      await competitionContextService.clearCache(userId);

      // Get updated competitions
      const activeCompetitions =
        await competitionContextService.getActiveCompetitionsForUser(userId);

      // Update team leaderboards for each competition
      for (const competition of activeCompetitions) {
        if (competition.teamId === teamId) {
          // Get fresh leaderboard data for the team
          await teamLeaderboardService.getTeamLeaderboard(competition.teamId);

          this.emitEvent({
            type: 'competition_updated',
            userId,
            teamId: competition.teamId,
            competitionId: competition.id,
            data: {
              competitionName: competition.name,
              competitionType: competition.type,
            },
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Check for rank changes and send notifications
      await this.checkForRankChanges(userId, teamId);
    } catch (error) {
      console.error('❌ Error processing competition update:', error);
    }
  }

  /**
   * Check for rank changes and send notifications
   */
  private async checkForRankChanges(
    userId: string,
    teamId?: string
  ): Promise<void> {
    if (!teamId) return;

    try {
      // Get current user rank
      const userRank = await teamLeaderboardService.getUserRankInTeam(
        userId,
        teamId
      );

      // In a real implementation, this would compare against previous rank
      // For now, we'll simulate rank change notifications
      if (userRank.rank && userRank.rank <= 3) {
        this.emitNotification({
          id: `rank_${userId}_${teamId}_${Date.now()}`,
          type: 'rank_change',
          title: '🏆 Great Performance!',
          message: `You're now rank #${userRank.rank} on your team leaderboard!`,
          userId,
          teamId,
          priority: 'high',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('❌ Error checking rank changes:', error);
    }
  }

  /**
   * Emit event to subscribers
   */
  private emitEvent(event: RealtimeEvent): void {
    const callbacks = this.eventCallbacks.get(event.userId) || [];
    callbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('❌ Error in event callback:', error);
      }
    });
  }

  /**
   * Emit notification to subscribers
   */
  private emitNotification(notification: RealtimeNotification): void {
    const callbacks = this.notificationCallbacks.get(notification.userId) || [];
    callbacks.forEach((callback) => {
      try {
        callback(notification);
      } catch (error) {
        console.error('❌ Error in notification callback:', error);
      }
    });
  }

  /**
   * Simulate incoming Nostr event (for testing)
   */
  async simulateNostrEvent(
    nostrWorkout: NostrWorkoutCompetition,
    userId: string,
    teamId?: string
  ): Promise<void> {
    console.log('🧪 Simulating Nostr workout event...');

    // Add small delay to simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 500));

    await this.handleRealtimeNostrWorkout(nostrWorkout, userId, teamId);
  }

  /**
   * Get real-time statistics
   */
  getRealTimeStats(): {
    eventSubscribers: number;
    notificationSubscribers: number;
    pendingUpdates: number;
  } {
    let eventSubscribers = 0;
    let notificationSubscribers = 0;

    this.eventCallbacks.forEach((callbacks) => {
      eventSubscribers += callbacks.length;
    });

    this.notificationCallbacks.forEach((callbacks) => {
      notificationSubscribers += callbacks.length;
    });

    return {
      eventSubscribers,
      notificationSubscribers,
      pendingUpdates: this.pendingUpdates.size,
    };
  }

  /**
   * Clear all pending updates
   */
  clearPendingUpdates(): void {
    this.pendingUpdates.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.pendingUpdates.clear();
    console.log('🧹 Cleared all pending competition updates');
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up NostrRealtimeCompetitionSync...');

    this.clearPendingUpdates();
    this.eventCallbacks.clear();
    this.notificationCallbacks.clear();

    this.isInitialized = false;
    console.log('✅ NostrRealtimeCompetitionSync cleanup completed');
  }
}

export default NostrRealtimeCompetitionSync.getInstance();
