/**
 * NotificationScheduler - Handles timing and triggers for notifications
 * Integrates with app events to schedule contextual notifications
 */

import { NotificationService } from './NotificationService';
import { LeaderboardEntry, Challenge, Event } from '../../types';
import { analytics } from '../../utils/analytics';

export class NotificationScheduler {
  private static instance: NotificationScheduler;
  private notificationService: NotificationService;
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();
  private userCompetitions: Set<string> = new Set();

  private constructor() {
    this.notificationService = NotificationService.getInstance();
  }

  static getInstance(): NotificationScheduler {
    if (!NotificationScheduler.instance) {
      NotificationScheduler.instance = new NotificationScheduler();
    }
    return NotificationScheduler.instance;
  }

  // Initialize scheduler with user's active competitions
  initialize(userCompetitions: string[]): void {
    this.userCompetitions = new Set(userCompetitions);
    this.scheduleRecurringNotifications();
  }

  // Schedule notifications based on leaderboard changes
  handleLeaderboardUpdate(
    eventId: string,
    leaderboard: LeaderboardEntry[],
    previousLeaderboard?: LeaderboardEntry[]
  ): void {
    if (!this.userCompetitions.has(eventId)) return;

    const userEntry = leaderboard.find(
      (entry) => entry.userId === 'current_user'
    );
    const previousUserEntry = previousLeaderboard?.find(
      (entry) => entry.userId === 'current_user'
    );

    if (!userEntry) return;

    // Position gained notification
    if (previousUserEntry && userEntry.rank < previousUserEntry.rank) {
      this.schedulePositionGained(
        eventId,
        userEntry.rank,
        previousUserEntry.rank,
        leaderboard
      );
    }

    // Position threat notification (someone close behind)
    this.checkForPositionThreats(eventId, userEntry, leaderboard);
  }

  // Handle new challenge invitations
  handleChallengeInvitation(challenge: Challenge): void {
    this.notificationService.sendChallengeInvitation({
      challengerName: 'Challenger Name', // TODO: Get from user service
      challengeType: `${challenge.type} ${challenge.metric}`,
      prizeAmount: challenge.prizePool,
      deadline: this.formatDeadline(challenge.deadline),
      challengeId: challenge.id,
    });

    analytics.trackNotificationTriggered('challenge_invitation', true);
  }

  // Handle competition completion and earnings
  handleCompetitionCompleted(
    eventId: string,
    userPosition: number,
    earnings: number,
    eventName: string
  ): void {
    if (earnings > 0) {
      this.notificationService.sendEarningsNotification({
        amount: earnings,
        source: eventName,
        position: userPosition,
        eventId: eventId,
      });
    }

    analytics.trackNotificationTriggered('bitcoin_earned', true);
  }

  // Schedule workout reminders
  scheduleWorkoutReminder(time: 'morning' | 'evening'): void {
    const activeCount = this.userCompetitions.size;

    // Schedule for 7AM (morning) or 6PM (evening)
    const hour = time === 'morning' ? 7 : 18;
    const now = new Date();
    const scheduledTime = new Date(now);
    scheduledTime.setHours(hour, 0, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const delay = scheduledTime.getTime() - now.getTime();
    const timerId = `workout_reminder_${time}`;

    // Clear existing timer
    if (this.activeTimers.has(timerId)) {
      clearTimeout(this.activeTimers.get(timerId)!);
    }

    // Schedule new timer
    const timer = setTimeout(() => {
      this.notificationService.sendWorkoutReminder({
        activeCompetitions: activeCount,
        timeOfDay: time,
      });

      // Reschedule for next day
      this.scheduleWorkoutReminder(time);
    }, delay);

    this.activeTimers.set(timerId, timer as any);
  }

  // Schedule streak maintenance reminders
  scheduleStreakReminder(streakDays: number): void {
    // Schedule reminder for 6 PM if no workout detected today
    const reminderTime = new Date();
    reminderTime.setHours(18, 0, 0, 0);

    if (reminderTime <= new Date()) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    const delay = reminderTime.getTime() - new Date().getTime();

    setTimeout(() => {
      this.notificationService.sendStreakReminder({
        streakDays,
        timeRemaining: '6 hours',
      });
    }, delay);
  }

  // Schedule competition ending reminders
  scheduleCompetitionEndingReminder(event: Event): void {
    const endTime = new Date(event.endDate);
    const now = new Date();

    // Schedule 4 hours before end
    const reminderTime = new Date(endTime.getTime() - 4 * 60 * 60 * 1000);

    if (reminderTime > now) {
      const delay = reminderTime.getTime() - now.getTime();

      setTimeout(() => {
        this.notificationService.scheduleNotification({
          id: `ending_reminder_${event.id}`,
          type: 'competition_ending_soon',
          title: `4 hours left in ${event.name}`,
          body: `You're in competition. ${event.prizePool.toLocaleString()} sats prize pool closes tonight`,
          timestamp: new Date().toISOString(),
          isRead: false,
          eventId: event.id,
        });
      }, delay);
    }
  }

  // Weekly earnings summary (every Monday 9AM)
  scheduleWeeklyEarningsSummary(): void {
    const nextMonday = this.getNextMonday();
    nextMonday.setHours(9, 0, 0, 0);

    const delay = nextMonday.getTime() - new Date().getTime();

    setTimeout(() => {
      // This would calculate actual weekly earnings
      const weeklyEarnings = this.calculateWeeklyEarnings();

      this.notificationService.scheduleNotification({
        id: `weekly_earnings_${Date.now()}`,
        type: 'weekly_earnings_summary',
        title: `Weekly earnings: ${weeklyEarnings.total.toLocaleString()} sats`,
        body: `+${weeklyEarnings.change.toLocaleString()} vs last week. You're on fire! Keep it up`,
        timestamp: new Date().toISOString(),
        isRead: false,
        prizeAmount: weeklyEarnings.total,
      });

      // Reschedule for next week
      this.scheduleWeeklyEarningsSummary();
    }, delay);
  }

  // Private methods
  private scheduleRecurringNotifications(): void {
    this.scheduleWorkoutReminder('morning');
    this.scheduleWorkoutReminder('evening');
    this.scheduleWeeklyEarningsSummary();
  }

  private schedulePositionGained(
    eventId: string,
    newPosition: number,
    previousPosition: number,
    leaderboard: LeaderboardEntry[]
  ): void {
    const passedUser = leaderboard.find(
      (entry) => entry.rank === previousPosition
    );

    this.notificationService.sendPositionGained({
      newPosition,
      previousPosition,
      competitionName: 'Competition Name', // TODO: Get from event service
      competitorPassed: passedUser?.userName || 'competitor',
      eventId,
    });

    analytics.trackNotificationTriggered('live_position_gained', true);
  }

  private checkForPositionThreats(
    eventId: string,
    userEntry: LeaderboardEntry,
    leaderboard: LeaderboardEntry[]
  ): void {
    // Find user immediately behind (position threat)
    const behindUser = leaderboard.find(
      (entry) => entry.rank === userEntry.rank + 1
    );

    if (behindUser && this.isPositionThreat(userEntry, behindUser)) {
      // Create mini leaderboard for context
      const miniLeaderboard = leaderboard
        .filter((entry) => entry.rank <= userEntry.rank + 2)
        .map((entry) => ({
          position: entry.rank,
          name: entry.userName,
          time: this.formatTime(entry.score), // Assuming score is time-based
          isUser: entry.userId === 'current_user',
          isGaining: entry.userId === behindUser.userId,
        }));

      this.notificationService.sendLivePositionUpdate({
        competitorName: behindUser.userName,
        competitionName: 'Competition Name', // TODO: Get from event service
        distanceBehind: 0.2, // TODO: Calculate actual distance difference
        leaderboard: miniLeaderboard,
        eventId,
      });

      analytics.trackNotificationTriggered('live_position_threat', true);
    }
  }

  private isPositionThreat(
    userEntry: LeaderboardEntry,
    behindUser: LeaderboardEntry
  ): boolean {
    // This would implement logic to determine if someone is gaining quickly
    // For now, simplified check
    const scoreDifference = Math.abs(userEntry.score - behindUser.score);
    return scoreDifference < 100; // Threshold for "close"
  }

  private formatDeadline(deadline: string): string {
    const date = new Date(deadline);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private formatTime(score: number): string {
    // Convert score to time format (assuming seconds)
    const minutes = Math.floor(score / 60);
    const seconds = score % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private getNextMonday(): Date {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysUntilMonday = (7 - dayOfWeek + 1) % 7 || 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    return nextMonday;
  }

  private calculateWeeklyEarnings(): { total: number; change: number } {
    // This would integrate with wallet service to calculate actual earnings
    // Placeholder implementation
    return {
      total: 8750,
      change: 2100,
    };
  }

  // Cleanup method
  cleanup(): void {
    // Clear all timers
    this.activeTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.activeTimers.clear();
  }
}
