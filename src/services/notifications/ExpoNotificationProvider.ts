/**
 * ExpoNotificationProvider - Device token & permissions management
 * Handles Expo notification setup, device registration, and push delivery
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { RichNotificationData } from '../../types';
import { analytics } from '../../utils/analytics';
import { supabase } from '../supabase';

export interface DeviceToken {
  token: string;
  npub: string;
  deviceId: string;
  platform: 'ios' | 'android';
  createdAt: string;
  isActive: boolean;
}

export class ExpoNotificationProvider {
  private static instance: ExpoNotificationProvider;
  private deviceToken: string | null = null;
  private npub: string | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): ExpoNotificationProvider {
    if (!ExpoNotificationProvider.instance) {
      ExpoNotificationProvider.instance = new ExpoNotificationProvider();
    }
    return ExpoNotificationProvider.instance;
  }

  // Initialize notification system
  async initialize(npub: string): Promise<void> {
    if (this.isInitialized) return;

    this.npub = npub;

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

      // Store token in Supabase for backend push notifications
      if (this.npub && this.deviceToken) {
        await this.storeDeviceToken();
      }

      analytics.track('notification_scheduled', { tokenRegistered: true });
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
      lightColor: '#ff4444',
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

  // Store device token in Supabase
  private async storeDeviceToken(): Promise<void> {
    if (!this.deviceToken || !this.npub) {
      console.warn('📱 Cannot store device token - missing token or npub');
      return;
    }

    try {
      console.log('📱 Storing device token for backend push notifications:', {
        token: this.deviceToken.substring(0, 20) + '...',
        npub: this.npub.substring(0, 20) + '...',
        platform: Platform.OS,
        deviceId: Constants.installationId,
      });

      // Store device token in Supabase for backend push notification service
      const { data, error } = await supabase.from('device_tokens').upsert(
        {
          token: this.deviceToken,
          npub: this.npub,
          device_id: Constants.installationId,
          platform: Platform.OS as 'ios' | 'android',
          is_active: true,
        },
        {
          onConflict: 'npub,device_id', // Update if same user + device
        }
      );

      if (error) {
        throw error;
      }

      console.log('📱 Device token stored successfully in Supabase');
      analytics.track('notification_scheduled', { 
        event: 'device_token_stored',
        platform: Platform.OS,
        npub: this.npub 
      });
    } catch (error) {
      console.error('❌ Failed to store device token in Supabase:', error);
      
      // Track the error but don't throw - push notifications can still work locally
      analytics.track('notification_scheduled', { 
        event: 'device_token_storage_failed',
        platform: Platform.OS,
        npub: this.npub,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Setup notification event listeners
  private setupNotificationListeners(): void {
    // Handle notification received while app is in foreground
    Notifications.addNotificationReceivedListener((notification) => {
      console.log(
        'Notification received in foreground:',
        notification.request.content
      );
      analytics.track('notification_triggered', { context: 'foreground' });
    });

    // Handle notification tap/interaction
    Notifications.addNotificationResponseReceivedListener((response) => {
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

  // Handle notification action buttons
  private handleNotificationAction(actionIdentifier: string, data: any): void {
    switch (actionIdentifier) {
      case 'start_run':
        // TODO: Navigate to workout screen
        console.log('Starting run from notification');
        break;
      case 'view_race':
        // TODO: Navigate to live race screen
        console.log('Viewing race from notification');
        break;
      case 'view_wallet':
        // TODO: Navigate to wallet screen
        console.log('Viewing wallet from notification');
        break;
      case 'accept_challenge':
        // TODO: Accept challenge
        console.log('Accepting challenge:', data.challengeId);
        break;
      case 'decline_challenge':
        // TODO: Decline challenge
        console.log('Declining challenge:', data.challengeId);
        break;
      default:
        // Default tap - open app
        console.log('Opening app from notification');
    }
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

  // Deactivate device token in Supabase (for sign out or opt-out)
  async deactivateDeviceToken(): Promise<void> {
    if (!this.deviceToken || !this.npub) {
      console.warn('📱 Cannot deactivate device token - missing token or npub');
      return;
    }

    try {
      console.log('📱 Deactivating device token in Supabase');

      const { error } = await supabase
        .from('device_tokens')
        .update({ 
          is_active: false,
        })
        .eq('npub', this.npub)
        .eq('device_id', Constants.installationId);

      if (error) {
        throw error;
      }

      console.log('📱 Device token deactivated successfully');
      analytics.track('notification_scheduled', { 
        event: 'device_token_deactivated',
        platform: Platform.OS,
        npub: this.npub 
      });
    } catch (error) {
      console.error('❌ Failed to deactivate device token:', error);
      analytics.track('notification_scheduled', { 
        event: 'device_token_deactivation_failed',
        platform: Platform.OS,
        npub: this.npub,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Cleanup method
  cleanup(): void {
    // Deactivate device token when cleaning up
    if (this.isInitialized && this.deviceToken && this.npub) {
      this.deactivateDeviceToken().catch(console.error);
    }

    // Remove notification listeners (manually tracked)
    // Note: expo-notifications doesn't have removeAllNotificationListeners in newer versions
    this.isInitialized = false;
    this.deviceToken = null;
    this.npub = null;
  }
}
