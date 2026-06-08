/**
 * ExpoNotificationProvider - Device token & permissions management
 * Handles Expo notification setup, device registration, and push delivery
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, AppState, AppStateStatus } from 'react-native';
import Constants from 'expo-constants';
import { RichNotificationData } from '../../types';
import { analytics } from '../../utils/analytics';
import { BroadcastTokenService } from './BroadcastTokenService';

export class ExpoNotificationProvider {
  private static instance: ExpoNotificationProvider;
  private deviceToken: string | null = null;
  private isInitialized = false;
  private appStateSubscription: { remove: () => void } | null = null;
  private notifReceivedSub: { remove: () => void } | null = null;
  private notifResponseSub: { remove: () => void } | null = null;

  private constructor() {}

  static getInstance(): ExpoNotificationProvider {
    if (!ExpoNotificationProvider.instance) {
      ExpoNotificationProvider.instance = new ExpoNotificationProvider();
    }
    return ExpoNotificationProvider.instance;
  }

  // Initialize notification system
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Set notification handler configuration
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const { teamBranded, type, isLive } =
          notification.request.content.data || {};

        return {
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: type !== 'background_sync' && !isLive,
          shouldSetBadge: true,
        };
      },
    });

    // Register for push notifications
    await this.registerForPushNotifications();

    // Setup notification received listener
    this.setupNotificationListeners();

    // Clear badge when app comes to foreground
    this.appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        Notifications.setBadgeCountAsync(0).catch(() => {});
      }
    });

    this.isInitialized = true;
  }

  // Register device for push notifications
  private async registerForPushNotifications(): Promise<void> {
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return;
    }

    // Request permissions
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission not granted for push notifications');
      analytics.track('notification_scheduled', { permissionDenied: true });
      return;
    }

    // Get device push token
    try {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ||
        Constants.easConfig?.projectId;

      if (!projectId) {
        console.warn('Project ID not found - using development mode');
      }

      this.deviceToken = (
        await Notifications.getExpoPushTokenAsync({ projectId })
      ).data;

      console.log('[ExpoNotificationProvider] Device token obtained:', this.deviceToken?.slice(0, 30) + '...');
      analytics.track('notification_scheduled', { tokenRegistered: true });

      // Register for push notifications (community + per-user if logged in)
      // Per-user targeting enables reward earned / auto-join notifications
      // IMPORTANT: Await this so the broadcast_tokens row exists before AuthContext
      // tries to update token_key on it (was fire-and-forget, caused race condition)
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const npub = await AsyncStorage.getItem('@runstr:npub');
      try {
        await BroadcastTokenService.registerToken(
          this.deviceToken,
          npub ?? undefined
        );
        console.log('[ExpoNotificationProvider] Broadcast token registered successfully');
      } catch (err) {
        console.warn('[ExpoNotificationProvider] Broadcast registration failed:', err);
      }
    } catch (error) {
      console.error('Failed to get push token:', error);
      analytics.track('notification_scheduled', { tokenFailed: true });
    }

    // Configure Android notification channel
    if (Platform.OS === 'android') {
      await this.setupAndroidChannels();
    }
  }

  // Setup Android notification channels
  private async setupAndroidChannels(): Promise<void> {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'RUNSTR Team Updates',
      description: 'Notifications about your team activities and competitions',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#ffffff',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('live_competition', {
      name: 'Live Competition Updates',
      description: 'Real-time updates during active competitions',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 100, 150, 100],
      lightColor: '#FF6B00',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('bitcoin_rewards', {
      name: 'Bitcoin Rewards',
      description: 'Notifications about your Bitcoin earnings',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 200, 300],
      lightColor: '#ffaa00',
      sound: 'default',
    });
  }

  // Setup notification event listeners
  private setupNotificationListeners(): void {
    // Handle notification received while app is in foreground
    this.notifReceivedSub = Notifications.addNotificationReceivedListener((notification) => {
      console.log(
        'Notification received in foreground:',
        notification.request.content
      );
      analytics.track('notification_triggered', { context: 'foreground' });
    });

    // Handle notification tap/interaction
    this.notifResponseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const { actionIdentifier, userText } = response;
      const notificationData = response.notification.request.content.data;

      console.log('Notification interaction:', {
        action: actionIdentifier,
        data: notificationData,
        userText,
      });

      // Handle notification actions
      this.handleNotificationAction(actionIdentifier, notificationData);
      analytics.track('notification_triggered', { action: actionIdentifier });
    });
  }

  // Handle notification tap — deep-link to the relevant screen
  private handleNotificationAction(actionIdentifier: string, data: any): void {
    // Import the shared navigation ref (lazy require to avoid circular deps)
    const { navigate } = require('../../navigation/navigationRef');

    if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER || actionIdentifier === 'default') {
      // User tapped the notification — route to the right screen
      switch (data?.type) {
        case 'reward_earned':
        case 'step_reward_earned':
          navigate('MainTabs', { screen: 'Rewards' });
          break;
        case 'auto_joined':
        case 'leaderboard_change':
          if (data?.competition_id) {
            navigate('DynamicEventDetail', { eventId: data.competition_id });
          } else {
            navigate('Compete');
          }
          break;
        case 'rank_change':
          if (data?.event_id) {
            navigate('DynamicEventDetail', { eventId: data.event_id });
          } else {
            navigate('Leaderboards');
          }
          break;
        default:
          // Default tap - just open the app (no specific navigation)
          console.log('Notification tapped with unknown type:', data?.type);
      }
    }
    // Named actions (start_run, view_race, etc.) — keep for future use
  }

  // Schedule local notification
  async scheduleNotification(
    notification: RichNotificationData,
    delay: number = 0
  ): Promise<void> {
    if (!this.isInitialized) {
      console.warn(
        'ExpoNotificationProvider not initialized - falling back to console.log'
      );
      console.log('Scheduling notification:', notification.title);
      return;
    }

    try {
      const trigger: Notifications.NotificationTriggerInput | null =
        delay > 0
          ? ({
              seconds: Math.ceil(delay / 1000),
            } as Notifications.TimeIntervalTriggerInput)
          : null;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: {
            ...notification,
            teamBranded: true,
            originalId: notification.id,
          },
          sound: this.getSoundForNotificationType(notification.type),
          priority: this.getPriorityForNotificationType(notification.type),
          categoryIdentifier: this.getCategoryForNotificationType(
            notification.type
          ),
        },
        trigger,
      });

      console.log(
        `Scheduled notification: ${notification.title} (ID: ${notificationId})`
      );
      analytics.trackNotificationScheduled(notification.type, delay > 0);
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      analytics.track('notification_scheduled', {
        type: notification.type,
        failed: true,
        error: errorMessage,
      });
    }
  }

  // Get sound configuration based on notification type
  private getSoundForNotificationType(type: string): string | boolean {
    switch (type) {
      case 'live_position_threat':
      case 'live_position_gained':
        return 'default';
      case 'bitcoin_earned':
        return 'default'; // Could use custom sound
      case 'challenge_invitation':
        return 'default';
      case 'workout_reminder':
      case 'streak_reminder':
        return false; // Silent reminders
      default:
        return 'default';
    }
  }

  // Get priority based on notification type
  private getPriorityForNotificationType(
    type: string
  ): Notifications.AndroidNotificationPriority {
    switch (type) {
      case 'live_position_threat':
      case 'live_position_gained':
        return Notifications.AndroidNotificationPriority.MAX;
      case 'bitcoin_earned':
      case 'challenge_invitation':
        return Notifications.AndroidNotificationPriority.HIGH;
      default:
        return Notifications.AndroidNotificationPriority.DEFAULT;
    }
  }

  // Get category for notification grouping
  private getCategoryForNotificationType(type: string): string {
    switch (type) {
      case 'live_position_threat':
      case 'live_position_gained':
        return 'live_competition';
      case 'bitcoin_earned':
      case 'weekly_earnings_summary':
        return 'bitcoin_rewards';
      default:
        return 'default';
    }
  }

  // Cancel notification by ID
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log(`Cancelled notification: ${notificationId}`);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  // Cancel all notifications
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Cancelled all scheduled notifications');
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  // Get device token (for backend integration)
  getDeviceToken(): string | null {
    return this.deviceToken;
  }

  // Check if notifications are enabled
  async areNotificationsEnabled(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  // Cleanup method
  cleanup(): void {
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    this.notifReceivedSub?.remove();
    this.notifReceivedSub = null;
    this.notifResponseSub?.remove();
    this.notifResponseSub = null;
    this.isInitialized = false;
    this.deviceToken = null;
  }
}
