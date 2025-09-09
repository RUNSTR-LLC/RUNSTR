/**
 * Test script for Team-Branded Push Notifications
 * Run with: node src/test-notifications.js
 */

const { NotificationService } = require('./services/notifications');

// Mock analytics for testing
global.analytics = {
  track: (event, props) => console.log(`📊 Analytics: ${event}`, props),
  trackNotificationScheduled: (type, scheduled) => 
    console.log(`📊 Notification scheduled: ${type}, scheduled: ${scheduled}`),
  trackNotificationTriggered: (type, successful) =>
    console.log(`📊 Notification triggered: ${type}, successful: ${successful}`)
};

async function testNotifications() {
  console.log('🚀 Testing RUNSTR Team-Branded Push Notifications\n');

  try {
    // Initialize notification service
    const notificationService = NotificationService.getInstance();
    await notificationService.initialize('test-user-123');
    console.log('✅ NotificationService initialized');

    // Test 1: Challenge invitation with team branding
    console.log('\n📱 Test 1: Team-Branded Challenge Invitation');
    await notificationService.sendChallengeInvitation({
      challengerName: 'Alex',
      challengeType: '5K Daily Double',
      prizeAmount: 2500,
      deadline: 'Dec 15',
      challengeId: 'challenge-123',
      teamId: 'team-bitcoin-runners-456'
    });

    // Test 2: Bitcoin earnings notification
    console.log('\n💰 Test 2: Team-Branded Bitcoin Earnings');
    await notificationService.sendEarningsNotification({
      amount: 1500,
      source: 'Morning 5K Challenge',
      position: 2,
      eventId: 'event-789',
      teamId: 'team-lightning-squad-789'
    });

    // Test 3: Live position update
    console.log('\n🏃‍♂️ Test 3: Team-Branded Live Position Update');
    await notificationService.sendLivePositionUpdate({
      competitorName: 'Sarah',
      competitionName: 'Weekly Marathon',
      distanceBehind: 0.3,
      leaderboard: [
        { position: 1, name: 'You', time: '22:45', isUser: true, isGaining: false },
        { position: 2, name: 'Sarah', time: '23:12', isUser: false, isGaining: true }
      ],
      eventId: 'event-456',
      teamId: 'team-crypto-athletes-123'
    });

    // Test 4: Position gained
    console.log('\n📈 Test 4: Team-Branded Position Gained');
    await notificationService.sendPositionGained({
      newPosition: 1,
      previousPosition: 3,
      competitionName: 'Daily Sprint Challenge',
      competitorPassed: 'Mike',
      eventId: 'event-321',
      teamId: 'team-fitness-first-654'
    });

    console.log('\n✅ All notification tests completed!');
    console.log('\n🎯 Expected Results:');
    console.log('  • Team names should prefix all notification titles');
    console.log('  • Format: "TeamName: Original Title"');
    console.log('  • Analytics events should be tracked');
    console.log('  • Notifications should appear in device notification center');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testNotifications();
}

module.exports = { testNotifications };