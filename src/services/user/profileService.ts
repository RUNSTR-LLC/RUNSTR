/**
 * User Profile Service
 * Handles user profiles from Nostr kind 0 events
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type UserPreferences,
  type UserFitnessProfile,
} from '../../utils/teamMatching';
import type { User, ApiResponse, NotificationSettings } from '../../types';
import { nostrProfileService } from '../nostr/NostrProfileService';

export interface UserProfile extends User {
  preferences?: UserPreferences;
  fitnessProfile?: UserFitnessProfile;
  teamJoinedAt?: string;
  teamSwitchCooldownUntil?: string;
  notificationSettings?: NotificationSettings;
}

export class ProfileService {
  /**
   * Get user profile from Nostr
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    console.log('🔍 ProfileService.getUserProfile called for userId:', userId);
    try {
      // Get profile from Nostr kind 0 event
      const nostrProfile = await nostrProfileService.getProfile(userId);

      if (!nostrProfile) {
        console.warn('⚠️  No profile found for ID:', userId);
        return null;
      }

      // Get local preferences from AsyncStorage
      const preferencesKey = `@runstr:preferences_${userId}`;
      const storedPreferences = await AsyncStorage.getItem(preferencesKey);
      const preferences = storedPreferences ? JSON.parse(storedPreferences) : undefined;

      // Get local notification settings
      const notificationKey = `@runstr:notifications_${userId}`;
      const storedNotifications = await AsyncStorage.getItem(notificationKey);
      const notificationSettings = storedNotifications ? JSON.parse(storedNotifications) : undefined;

      console.log('✅ Found user profile from Nostr:', {
        name: nostrProfile.name,
        npub: nostrProfile.npub?.slice(0, 20) + '...'
      });

      // Create user profile from Nostr data
      const userProfile: UserProfile = {
        id: nostrProfile.npub,
        npub: nostrProfile.npub,
        name: nostrProfile.name || nostrProfile.display_name || 'Anonymous',
        role: 'member', // Default role
        createdAt: nostrProfile.lastUpdated.toISOString(),
        lastSyncAt: null,
        preferences,
        notificationSettings,

        // Populate Nostr profile fields
        bio: nostrProfile.about,
        website: nostrProfile.website,
        picture: nostrProfile.picture,
        banner: nostrProfile.banner,
        lud16: nostrProfile.lud16,
        displayName: nostrProfile.display_name || nostrProfile.name,
      };

      return userProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * Update user preferences (stored locally)
   */
  static async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<ApiResponse> {
    try {
      const preferencesKey = `@runstr:preferences_${userId}`;
      const storedPreferences = await AsyncStorage.getItem(preferencesKey);
      const currentPreferences = storedPreferences ? JSON.parse(storedPreferences) : {};

      const updatedPreferences = { ...currentPreferences, ...preferences };
      await AsyncStorage.setItem(preferencesKey, JSON.stringify(updatedPreferences));

      return { success: true, message: 'Preferences updated locally' };
    } catch (error) {
      console.error('Error updating user preferences:', error);
      return { success: false, error: 'Failed to update preferences' };
    }
  }

  /**
   * Update notification settings (stored locally)
   */
  static async updateNotificationSettings(
    userId: string,
    settings: Partial<NotificationSettings>
  ): Promise<ApiResponse> {
    try {
      const notificationKey = `@runstr:notifications_${userId}`;
      const storedSettings = await AsyncStorage.getItem(notificationKey);
      const currentSettings = storedSettings ? JSON.parse(storedSettings) : {};

      const updatedSettings = { ...currentSettings, ...settings };
      await AsyncStorage.setItem(notificationKey, JSON.stringify(updatedSettings));

      return { success: true, message: 'Notification settings updated locally' };
    } catch (error) {
      console.error('Error updating notification settings:', error);
      return { success: false, error: 'Failed to update settings' };
    }
  }

  /**
   * Calculate user fitness profile from workout history
   */
  static async calculateFitnessProfile(
    userId: string
  ): Promise<UserFitnessProfile | undefined> {
    try {
      // This would need to be calculated from locally stored workout data
      // or fetched from Nostr kind 1301 events
      console.log('Fitness profile calculation not implemented yet');
      return undefined;
    } catch (error) {
      console.error('Error calculating fitness profile:', error);
      return undefined;
    }
  }

  /**
   * Check if user exists (has a Nostr profile)
   */
  static async userExists(userId: string): Promise<boolean> {
    try {
      const profile = await nostrProfileService.getProfile(userId);
      return !!profile;
    } catch (error) {
      console.error('Error checking if user exists:', error);
      return false;
    }
  }
}