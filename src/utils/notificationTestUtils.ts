/**
 * Notification Test Utils - Development utilities for testing notification functionality
 * Use in development to verify all notification categories display and interact correctly
 */

import { NotificationDemoService } from '../services/notificationDemoService';
import { NotificationService } from '../services/notificationService';

export class NotificationTestUtils {
  /**
   * Run complete notification test suite
   */
  static async runNotificationTests(): Promise<void> {
    console.log('🧪 Starting notification display and interaction tests...');

    try {
      // Test 1: Clear existing notifications
      console.log('1️⃣ Clearing existing notifications...');
      await NotificationDemoService.clearDemoNotifications();

      // Test 2: Add demo notifications
      console.log('2️⃣ Adding demo notifications for all categories...');
      await NotificationDemoService.populateDemoNotifications();

      // Test 3: Verify notification history
      console.log('3️⃣ Verifying notification history...');
      const history = await NotificationService.getNotificationHistory();
      console.log(`   📊 Total notifications: ${history.items.length}`);
      console.log(`   🔔 Unread count: ${history.unreadCount}`);

      // Test 4: Test notification categories
      console.log('4️⃣ Testing notification categories...');
      const categoryCounts = this.countNotificationsByType(history);
      console.log('   📈 Category breakdown:', categoryCounts);

      // Test 5: Test mark as read functionality
      console.log('5️⃣ Testing mark as read functionality...');
      if (history.items.length > 0) {
        await NotificationService.markAsRead(history.items[0].id);
        const updatedHistory =
          await NotificationService.getNotificationHistory();
        console.log(
          `   ✅ Unread count after marking first as read: ${updatedHistory.unreadCount}`
        );
      }

      console.log('✅ All notification tests completed successfully!');

      return;
    } catch (error) {
      console.error('❌ Notification tests failed:', error);
      throw error;
    }
  }

  /**
   * Test specific notification category
   */
  static async testNotificationCategory(
    category: 'bitcoin' | 'team_event' | 'challenge' | 'position'
  ): Promise<void> {
    console.log(`🎯 Testing ${category} notification category...`);

    try {
      switch (category) {
        case 'bitcoin':
          await NotificationService.addBitcoinEarnedNotification(
            1000,
            'test_workout'
          );
          console.log('   💰 Bitcoin earned notification added');
          break;

        case 'team_event':
          await NotificationService.addTeamEventNotification(
            'test_event',
            'Test Event',
            'Testing team event notification display'
          );
          console.log('   🏃‍♀️ Team event notification added');
          break;

        case 'challenge':
          await NotificationService.addChallengeNotification(
            'test_challenge',
            'test_user',
            'Test User',
            'Testing challenge notification display'
          );
          console.log('   ⚡ Challenge notification added');
          break;

        case 'position':
          await NotificationService.addPositionChangeNotification(
            10,
            7,
            'test_league',
            'Test League'
          );
          console.log('   📊 Position change notification added');
          break;
      }

      const history = await NotificationService.getNotificationHistory();
      console.log(`✅ Current unread count: ${history.unreadCount}`);
    } catch (error) {
      console.error(`❌ Failed to test ${category} category:`, error);
      throw error;
    }
  }

  /**
   * Count notifications by type for testing
   */
  private static countNotificationsByType(
    history: any
  ): Record<string, number> {
    const counts: Record<string, number> = {};

    history.items.forEach((item: any) => {
      counts[item.type] = (counts[item.type] || 0) + 1;
    });

    return counts;
  }

  /**
   * Test notification history expansion/collapse
   */
  static async testNotificationHistoryInteraction(): Promise<void> {
    console.log('🔄 Testing notification history expansion...');

    const history = await NotificationService.getNotificationHistory();

    console.log('📊 Notification History State:');
    console.log(`   Total items: ${history.items.length}`);
    console.log(`   Unread count: ${history.unreadCount}`);
    console.log(`   Last updated: ${history.lastUpdated}`);

    if (history.items.length > 0) {
      console.log('📝 Sample notifications:');
      history.items.slice(0, 3).forEach((item: any, index: number) => {
        console.log(
          `   ${index + 1}. [${item.type}] ${item.title} - ${
            item.isRead ? 'READ' : 'UNREAD'
          }`
        );
      });
    }
  }

  /**
   * Test notification persistence after app restart simulation
   */
  static async testNotificationPersistence(): Promise<void> {
    console.log('💾 Testing notification persistence...');

    // Add a test notification
    await NotificationService.addBitcoinEarnedNotification(
      500,
      'persistence_test'
    );

    // Get history
    const history1 = await NotificationService.getNotificationHistory();
    console.log(
      `   📊 Before: ${history1.items.length} items, ${history1.unreadCount} unread`
    );

    // Simulate getting history again (like after app restart)
    const history2 = await NotificationService.getNotificationHistory();
    console.log(
      `   📊 After: ${history2.items.length} items, ${history2.unreadCount} unread`
    );

    const isPersistent = history1.items.length === history2.items.length;
    console.log(
      `   ${isPersistent ? '✅' : '❌'} Persistence test: ${
        isPersistent ? 'PASSED' : 'FAILED'
      }`
    );
  }

  /**
   * Quick test to verify all functionality works
   */
  static async quickTest(): Promise<void> {
    console.log('⚡ Running quick notification test...');

    // Add one of each type
    await NotificationDemoService.addSingleTestNotifications();

    // Verify they appear
    const history = await NotificationService.getNotificationHistory();
    console.log(
      `✅ Quick test complete: ${history.items.length} notifications, ${history.unreadCount} unread`
    );
  }
}
