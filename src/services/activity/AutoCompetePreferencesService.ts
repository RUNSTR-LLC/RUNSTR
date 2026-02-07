/**
 * AutoCompetePreferencesService - Auto-compete user preferences
 * Handles saving/loading auto-compete setting with AsyncStorage persistence
 *
 * When enabled, workouts are automatically published to Nostr (kind 1301)
 * when the workout summary modal opens.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Feature flag: When false, auto-compete is disabled for ALL users regardless of their saved preference
// This allows us to hide the feature from UI while ensuring no one auto-publishes
const AUTO_COMPETE_FEATURE_ENABLED = false;

const STORAGE_KEY = '@runstr:auto_compete_enabled';

export class AutoCompetePreferencesService {
  private static cachedValue: boolean | null = null;

  /**
   * Check if auto-compete is enabled
   */
  static async isAutoCompeteEnabled(): Promise<boolean> {
    // Feature disabled at app level - always return false regardless of user preference
    // This ensures no one auto-publishes even if they had it enabled before
    if (!AUTO_COMPETE_FEATURE_ENABLED) {
      return false;
    }

    // Return cached value if available
    if (this.cachedValue !== null) {
      return this.cachedValue;
    }

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);

      if (stored === null) {
        // Default to true (auto-compete enabled for new users)
        this.cachedValue = true;
        return true;
      }

      this.cachedValue = stored === 'true';
      return this.cachedValue;
    } catch (error) {
      console.error('[AutoCompete] Error loading preference:', error);
      return false;
    }
  }

  /**
   * Set auto-compete enabled/disabled
   */
  static async setAutoCompeteEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, String(enabled));
      this.cachedValue = enabled;
      console.log(`[AutoCompete] Setting updated: ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('[AutoCompete] Error saving preference:', error);
      throw error;
    }
  }

  /**
   * Clear cached value (useful for testing or user logout)
   */
  static clearCache(): void {
    this.cachedValue = null;
  }
}
