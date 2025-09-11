/**
 * NotificationPreferencesService - Persistent storage for user notification preferences
 * Handles saving/loading notification settings with AsyncStorage persistence
 */

import { SafeStorage } from '../../utils/storage';
import { NotificationSettings } from '../../types';

const NOTIFICATION_PREFERENCES_KEY = '@runstr_notification_preferences';

// Default settings for new users - all enabled by default for better engagement
const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  eventNotifications: true,
  leagueUpdates: true,
  teamAnnouncements: true,
  bitcoinRewards: true,
  challengeUpdates: true,
  liveCompetitionUpdates: true,
  workoutReminders: true,
};

export class NotificationPreferencesService {
  private static cachedSettings: NotificationSettings | null = null;

  /**
   * Get user's notification preferences from storage
   */
  static async getNotificationSettings(): Promise<NotificationSettings> {
    // Return cached settings if available
    if (this.cachedSettings) {
      return this.cachedSettings;
    }

    try {
      const stored = await SafeStorage.getItem(NOTIFICATION_PREFERENCES_KEY);
      
      if (!stored) {
        console.log('📱 No stored notification preferences found, using defaults');
        this.cachedSettings = DEFAULT_NOTIFICATION_SETTINGS;
        await this.saveNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
        return DEFAULT_NOTIFICATION_SETTINGS;
      }

      const settings: NotificationSettings = JSON.parse(stored);
      
      // Merge with defaults to handle new preference keys
      const mergedSettings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        ...settings,
      };

      this.cachedSettings = mergedSettings;
      return mergedSettings;
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      this.cachedSettings = DEFAULT_NOTIFICATION_SETTINGS;
      return DEFAULT_NOTIFICATION_SETTINGS;
    }
  }

  /**
   * Save notification preferences to storage
   */
  static async saveNotificationSettings(settings: NotificationSettings): Promise<void> {
    try {
      await SafeStorage.setItem(NOTIFICATION_PREFERENCES_KEY, JSON.stringify(settings));
      this.cachedSettings = settings;
      console.log('📱 Notification preferences saved:', settings);
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      throw error;
    }
  }

  /**
   * Update a specific notification preference
   */
  static async updateNotificationSetting(
    key: keyof NotificationSettings,
    value: boolean
  ): Promise<NotificationSettings> {
    try {
      const currentSettings = await this.getNotificationSettings();
      const updatedSettings = {
        ...currentSettings,
        [key]: value,
      };

      await this.saveNotificationSettings(updatedSettings);
      return updatedSettings;
    } catch (error) {
      console.error(`Error updating notification setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if a specific notification type is enabled
   */
  static async isNotificationEnabled(key: keyof NotificationSettings): Promise<boolean> {
    try {
      const settings = await this.getNotificationSettings();
      return settings[key];
    } catch (error) {
      console.error(`Error checking notification setting ${key}:`, error);
      // Default to enabled on error to avoid blocking notifications
      return true;
    }
  }

  /**
   * Reset all notification preferences to defaults
   */
  static async resetToDefaults(): Promise<NotificationSettings> {
    try {
      await this.saveNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
      return DEFAULT_NOTIFICATION_SETTINGS;
    } catch (error) {
      console.error('Error resetting notification preferences:', error);
      throw error;
    }
  }

  /**
   * Clear cached settings (useful for testing or user logout)
   */
  static clearCache(): void {
    this.cachedSettings = null;
  }

  /**
   * Specific helper methods for common notification types
   */
  static async canSendEventNotifications(): Promise<boolean> {
    return this.isNotificationEnabled('eventNotifications');
  }

  static async canSendLeagueUpdates(): Promise<boolean> {
    return this.isNotificationEnabled('leagueUpdates');
  }

  static async canSendTeamAnnouncements(): Promise<boolean> {
    return this.isNotificationEnabled('teamAnnouncements');
  }

  static async canSendBitcoinRewards(): Promise<boolean> {
    return this.isNotificationEnabled('bitcoinRewards');
  }

  static async canSendChallengeUpdates(): Promise<boolean> {
    return this.isNotificationEnabled('challengeUpdates');
  }

  static async canSendLiveCompetitionUpdates(): Promise<boolean> {
    return this.isNotificationEnabled('liveCompetitionUpdates');
  }

  static async canSendWorkoutReminders(): Promise<boolean> {
    return this.isNotificationEnabled('workoutReminders');
  }

  /**
   * Get summary of current notification settings for debugging
   */
  static async getSettingsSummary(): Promise<string> {
    try {
      const settings = await this.getNotificationSettings();
      const enabledCount = Object.values(settings).filter(Boolean).length;
      const totalCount = Object.keys(settings).length;
      
      return `${enabledCount}/${totalCount} notification types enabled`;
    } catch (error) {
      return 'Error loading settings';
    }
  }

  /**
   * Export settings for backup/sync (future feature)
   */
  static async exportSettings(): Promise<string> {
    const settings = await this.getNotificationSettings();
    return JSON.stringify(settings, null, 2);
  }

  /**
   * Import settings from backup (future feature)
   */
  static async importSettings(settingsJson: string): Promise<NotificationSettings> {
    try {
      const settings = JSON.parse(settingsJson) as NotificationSettings;
      
      // Validate that all required keys exist
      const requiredKeys = Object.keys(DEFAULT_NOTIFICATION_SETTINGS) as (keyof NotificationSettings)[];
      const isValid = requiredKeys.every(key => typeof settings[key] === 'boolean');
      
      if (!isValid) {
        throw new Error('Invalid settings format');
      }

      await this.saveNotificationSettings(settings);
      return settings;
    } catch (error) {
      console.error('Error importing notification settings:', error);
      throw error;
    }
  }
}