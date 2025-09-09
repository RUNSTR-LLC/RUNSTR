# Push Notifications Integration Example

This example shows how to integrate and use the push notification system in RUNSTR.

## Basic Usage

### 1. Initialize Notification Services

```typescript
import { NotificationService, NotificationScheduler } from '../src/services/notifications';

// Initialize services
const notificationService = NotificationService.getInstance();
const scheduler = NotificationScheduler.getInstance();

// Initialize with user's active competitions
scheduler.initialize(['event1', 'event2', 'event3']);
```

### 2. Display Notifications in UI

```typescript
import React from 'react';
import { ScrollView, View } from 'react-native';
import { NotificationCard, GroupedNotificationCard } from '../src/components/notifications';

const NotificationsScreen: React.FC = () => {
  const [notifications, setNotifications] = useState<CategorizedNotifications>();

  useEffect(() => {
    // Get categorized notifications
    const categorized = notificationService.getCategorizedNotifications();
    setNotifications(categorized);
  }, []);

  const handleNotificationPress = (notification: RichNotificationData) => {
    // Mark as read
    notificationService.markAsRead(notification.id);
    
    // Navigate based on notification type
    if (notification.eventId) {
      navigation.navigate('EventDetail', { eventId: notification.eventId });
    } else if (notification.challengeId) {
      navigation.navigate('ChallengeDetail', { challengeId: notification.challengeId });
    }
  };

  const handleActionPress = (actionId: string, notification: RichNotificationData) => {
    switch (actionId) {
      case 'start_run':
        // Open workout tracking
        break;
      case 'view_wallet':
        navigation.navigate('Wallet');
        break;
      case 'accept_challenge':
        // Handle challenge acceptance
        break;
      case 'decline_challenge':
        // Handle challenge decline
        break;
    }
  };

  return (
    <ScrollView>
      {/* Live Competition Updates */}
      <View>
        {notifications?.liveCompetition.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onPress={handleNotificationPress}
            onActionPress={handleActionPress}
          />
        ))}
      </View>

      {/* Bitcoin Rewards */}
      <View>
        {notifications?.bitcoinRewards.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onPress={handleNotificationPress}
            onActionPress={handleActionPress}
          />
        ))}
      </View>

      {/* Grouped Notifications */}
      <View>
        {notifications?.grouped.map((grouped) => (
          <GroupedNotificationCard
            key={grouped.id}
            groupedNotification={grouped}
            onNotificationPress={(notificationId) => {
              const notification = grouped.notifications.find(n => n.id === notificationId);
              if (notification) handleNotificationPress(notification);
            }}
          />
        ))}
      </View>
    </ScrollView>
  );
};
```

### 3. Trigger Notifications from App Events

```typescript
// When leaderboard updates
const handleLeaderboardUpdate = (eventId: string, newLeaderboard: LeaderboardEntry[]) => {
  scheduler.handleLeaderboardUpdate(eventId, newLeaderboard, previousLeaderboard);
};

// When user earns Bitcoin
const handleEarningsUpdate = (amount: number, eventName: string, position: number) => {
  notificationService.sendEarningsNotification({
    amount,
    source: eventName,
    position,
  });
};

// When challenge is received
const handleChallengeInvitation = (challenge: Challenge) => {
  scheduler.handleChallengeInvitation(challenge);
};
```

### 4. Schedule Activity Reminders

```typescript
// Set up daily workout reminders
scheduler.scheduleWorkoutReminder('morning'); // 7 AM
scheduler.scheduleWorkoutReminder('evening'); // 6 PM

// Set up streak reminders
scheduler.scheduleStreakReminder(5); // 5-day streak
```

## Example Notification Data

### Live Position Threat
```typescript
const livePositionThreat: RichNotificationData = {
  id: 'live_threat_1',
  type: 'live_position_threat',
  title: 'Sarah is 0.2km behind you',
  body: "She's gaining fast in Weekly 5K - defend your position!",
  timestamp: new Date().toISOString(),
  isRead: false,
  liveIndicator: { isLive: true },
  miniLeaderboard: [
    { position: 1, name: 'Alex', time: '21:45', isUser: false },
    { position: 2, name: 'You', time: '24:18', isUser: true },
    { position: 3, name: 'Sarah', time: '24:30', isUser: false, isGaining: true },
  ],
  actions: [
    { id: 'view_race', text: 'View Race', type: 'secondary', action: 'view_race' },
    { id: 'start_run', text: 'Start Run', type: 'primary', action: 'start_run' },
  ],
  eventId: 'weekly_5k_123',
};
```

### Bitcoin Earnings
```typescript
const bitcoinEarnings: RichNotificationData = {
  id: 'earnings_1',
  type: 'bitcoin_earned',
  title: 'You earned 1,500 sats!',
  body: '3rd place in Bitcoin Runners Weekly 5K',
  timestamp: new Date().toISOString(),
  isRead: false,
  earningsSection: {
    amount: 1500,
    label: 'Added to your wallet',
  },
  actions: [
    { id: 'view_wallet', text: 'View Wallet', type: 'secondary', action: 'view_wallet' },
    { id: 'join_next', text: 'Join Next Event', type: 'primary', action: 'join_event' },
  ],
  prizeAmount: 1500,
  position: { current: 3 },
};
```

## Integration with Real Push Notifications

To integrate with actual React Native push notifications (using expo-notifications):

```typescript
import * as Notifications from 'expo-notifications';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Send local notification
const scheduleLocalNotification = async (notification: RichNotificationData) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
      data: { 
        notificationId: notification.id,
        type: notification.type,
        ...notification 
      },
    },
    trigger: null, // Send immediately
  });
};

// Handle notification responses
Notifications.addNotificationResponseReceivedListener(response => {
  const data = response.notification.request.content.data;
  
  if (data.actions) {
    // Handle action buttons in push notification
    const actionId = response.actionIdentifier;
    handleActionPress(actionId, data as RichNotificationData);
  } else {
    // Handle notification tap
    handleNotificationPress(data as RichNotificationData);
  }
});
```

This notification system provides a complete "invisible-first" experience where push notifications serve as the primary UI for most user interactions.