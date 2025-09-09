/**
 * NotificationDemoService - Development helper for testing notification categories
 * Generates sample notifications for all four required categories
 */

import { NotificationService } from './notificationService';

export class NotificationDemoService {
  /**
   * Populate demo notifications for all categories
   */
  static async populateDemoNotifications(): Promise<void> {
    // Clear existing notifications first
    await NotificationService.clearHistory();

    // Add sample notifications for each category
    await this.addBitcoinEarnedSamples();
    await this.addTeamEventSamples();
    await this.addChallengeSamples();
    await this.addPositionChangeSamples();

    console.log('✅ Demo notifications populated successfully');
  }

  /**
   * Bitcoin earned notification samples
   */
  private static async addBitcoinEarnedSamples(): Promise<void> {
    const samples = [
      { amount: 2500, workoutId: 'workout_001' },
      { amount: 1800, workoutId: 'workout_002' },
      { amount: 3200, workoutId: 'workout_003' },
    ];

    for (const sample of samples) {
      await NotificationService.addBitcoinEarnedNotification(
        sample.amount,
        sample.workoutId
      );

      // Add small delay to create different timestamps
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Team event notification samples
   */
  private static async addTeamEventSamples(): Promise<void> {
    const samples = [
      {
        eventId: 'event_001',
        eventName: 'Bitcoin Marathon Challenge',
        message:
          'New team challenge starting tomorrow! 50,000 sats prize pool.',
      },
      {
        eventId: 'event_002',
        eventName: 'Weekly Sprint Competition',
        message: 'Competition ends in 2 hours. You are currently ranked #3!',
      },
      {
        eventId: 'event_003',
        eventName: 'Team Building Run',
        message: 'Monthly team run scheduled for this Saturday at 8 AM.',
      },
    ];

    for (const sample of samples) {
      await NotificationService.addTeamEventNotification(
        sample.eventId,
        sample.eventName,
        sample.message
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Challenge from user notification samples
   */
  private static async addChallengeSamples(): Promise<void> {
    const samples = [
      {
        challengeId: 'challenge_001',
        challengerId: 'user_alex',
        challengerName: 'Alex Runner',
        message: 'Alex challenged you to a 5K run! Winner takes 10,000 sats.',
      },
      {
        challengeId: 'challenge_002',
        challengerId: 'user_sarah',
        challengerName: 'Sarah Lightning',
        message: 'Sarah wants to race you in this weeks distance challenge!',
      },
      {
        challengeId: 'challenge_003',
        challengerId: 'user_mike',
        challengerName: 'Mike Fitness',
        message: 'Mike challenged your workout streak record. Beat 15 days!',
      },
    ];

    for (const sample of samples) {
      await NotificationService.addChallengeNotification(
        sample.challengeId,
        sample.challengerId,
        sample.challengerName,
        sample.message
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Position change notification samples
   */
  private static async addPositionChangeSamples(): Promise<void> {
    const samples = [
      {
        oldPosition: 15,
        newPosition: 12,
        leagueId: 'league_001',
        leagueName: 'Bitcoin Runners League',
      },
      {
        oldPosition: 8,
        newPosition: 5,
        leagueId: 'league_002',
        leagueName: 'Lightning Network Athletes',
      },
      {
        oldPosition: 3,
        newPosition: 7,
        leagueId: 'league_001',
        leagueName: 'Bitcoin Runners League',
      },
    ];

    for (const sample of samples) {
      await NotificationService.addPositionChangeNotification(
        sample.oldPosition,
        sample.newPosition,
        sample.leagueId,
        sample.leagueName
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Add a single test notification of each type
   */
  static async addSingleTestNotifications(): Promise<void> {
    // Most recent notifications
    await NotificationService.addBitcoinEarnedNotification(
      5000,
      'test_workout'
    );
    await NotificationService.addTeamEventNotification(
      'test_event',
      'Test Event',
      'This is a test team event notification'
    );
    await NotificationService.addChallengeNotification(
      'test_challenge',
      'test_user',
      'Test User',
      'This is a test challenge notification'
    );
    await NotificationService.addPositionChangeNotification(
      10,
      8,
      'test_league',
      'Test League'
    );

    console.log('✅ Single test notifications added');
  }

  /**
   * Clear all demo notifications
   */
  static async clearDemoNotifications(): Promise<void> {
    await NotificationService.clearHistory();
    console.log('✅ Demo notifications cleared');
  }
}
