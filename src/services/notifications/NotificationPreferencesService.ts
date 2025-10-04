/**
 * NotificationPreferencesService - Simplified notification service
 * All notifications are now enabled by default - no user toggles
 * Service kept for backward compatibility
 */

import { NotificationSettings } from '../../types';

// All notifications enabled - no user preferences
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
  /**
   * Get notification settings - always returns all enabled
   */
  static async getNotificationSettings(): Promise<NotificationSettings> {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }

  /**
   * Save notification preferences - no-op (kept for compatibility)
   */
  static async saveNotificationSettings(settings: NotificationSettings): Promise<void> {
    // No-op - we don't save preferences anymore
    console.log('📱 Notification preferences are always enabled');
  }

  /**
   * Update a specific notification setting - no-op (kept for compatibility)
   */
  static async updateNotificationSetting(
    key: keyof NotificationSettings,
    value: boolean
  ): Promise<NotificationSettings> {
    // Always return all enabled
    return DEFAULT_NOTIFICATION_SETTINGS;
  }

  /**
   * Check if a specific notification type is enabled - always returns true
   */
  static async isNotificationEnabled(key: keyof NotificationSettings): Promise<boolean> {
    return true;
  }

  /**
   * Reset all notification preferences to defaults - no-op
   */
  static async resetToDefaults(): Promise<NotificationSettings> {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }

  /**
   * Clear cached settings - no-op (kept for compatibility)
   */
  static clearCache(): void {
    // No-op
  }

  /**
   * Specific helper methods - all return true
   */
  static async canSendEventNotifications(): Promise<boolean> {
    return true;
  }

  static async canSendLeagueUpdates(): Promise<boolean> {
    return true;
  }

  static async canSendTeamAnnouncements(): Promise<boolean> {
    return true;
  }

  static async canSendBitcoinRewards(): Promise<boolean> {
    return true;
  }

  static async canSendChallengeUpdates(): Promise<boolean> {
    return true;
  }

  static async canSendLiveCompetitionUpdates(): Promise<boolean> {
    return true;
  }

  static async canSendWorkoutReminders(): Promise<boolean> {
    return true;
  }

  /**
   * Get summary of current notification settings
   */
  static async getSettingsSummary(): Promise<string> {
    return 'All notification types enabled';
  }

  /**
   * Export settings - returns all enabled
   */
  static async exportSettings(): Promise<string> {
    return JSON.stringify(DEFAULT_NOTIFICATION_SETTINGS, null, 2);
  }

  /**
   * Import settings - no-op (kept for compatibility)
   */
  static async importSettings(settingsJson: string): Promise<NotificationSettings> {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}