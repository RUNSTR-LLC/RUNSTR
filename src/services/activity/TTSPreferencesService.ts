/**
 * TTSPreferencesService - Text-to-Speech user preferences
 * Handles saving/loading TTS settings with AsyncStorage persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const TTS_PREFERENCES_KEY = '@runstr:tts_preferences';

export interface TTSSettings {
  enabled: boolean; // Master toggle for TTS
  speechRate: number; // Speech speed: 0.5 - 2.0 (1.0 = normal)
  announceOnSummary: boolean; // Speak when workout summary appears
  includeSplits: boolean; // Include split details in announcement
}

// Default settings for new users
const DEFAULT_TTS_SETTINGS: TTSSettings = {
  enabled: true,
  speechRate: 1.0,
  announceOnSummary: true,
  includeSplits: false, // Keep it brief by default
};

export class TTSPreferencesService {
  private static cachedSettings: TTSSettings | null = null;

  /**
   * Get user's TTS preferences from storage
   */
  static async getTTSSettings(): Promise<TTSSettings> {
    // Return cached settings if available
    if (this.cachedSettings) {
      return this.cachedSettings;
    }

    try {
      const stored = await AsyncStorage.getItem(TTS_PREFERENCES_KEY);

      if (!stored) {
        console.log('🔊 No stored TTS preferences found, using defaults');
        this.cachedSettings = DEFAULT_TTS_SETTINGS;
        await this.saveTTSSettings(DEFAULT_TTS_SETTINGS);
        return DEFAULT_TTS_SETTINGS;
      }

      const settings: TTSSettings = JSON.parse(stored);

      // Merge with defaults to handle new preference keys
      const mergedSettings = {
        ...DEFAULT_TTS_SETTINGS,
        ...settings,
      };

      this.cachedSettings = mergedSettings;
      return mergedSettings;
    } catch (error) {
      console.error('Error loading TTS preferences:', error);
      this.cachedSettings = DEFAULT_TTS_SETTINGS;
      return DEFAULT_TTS_SETTINGS;
    }
  }

  /**
   * Save TTS preferences to storage
   */
  static async saveTTSSettings(settings: TTSSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(TTS_PREFERENCES_KEY, JSON.stringify(settings));
      this.cachedSettings = settings;
      console.log('🔊 TTS preferences saved:', settings);
    } catch (error) {
      console.error('Error saving TTS preferences:', error);
      throw error;
    }
  }

  /**
   * Update a specific TTS preference
   */
  static async updateTTSSetting<K extends keyof TTSSettings>(
    key: K,
    value: TTSSettings[K]
  ): Promise<TTSSettings> {
    try {
      const currentSettings = await this.getTTSSettings();
      const updatedSettings = {
        ...currentSettings,
        [key]: value,
      };

      await this.saveTTSSettings(updatedSettings);
      return updatedSettings;
    } catch (error) {
      console.error(`Error updating TTS setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if TTS is enabled
   */
  static async isTTSEnabled(): Promise<boolean> {
    try {
      const settings = await this.getTTSSettings();
      return settings.enabled;
    } catch (error) {
      console.error('Error checking TTS enabled status:', error);
      return false;
    }
  }

  /**
   * Check if summary announcements are enabled
   */
  static async shouldAnnounceSummary(): Promise<boolean> {
    try {
      const settings = await this.getTTSSettings();
      return settings.enabled && settings.announceOnSummary;
    } catch (error) {
      console.error('Error checking summary announcement setting:', error);
      return false;
    }
  }

  /**
   * Get speech rate setting
   */
  static async getSpeechRate(): Promise<number> {
    try {
      const settings = await this.getTTSSettings();
      return settings.speechRate;
    } catch (error) {
      console.error('Error getting speech rate:', error);
      return 1.0;
    }
  }

  /**
   * Check if splits should be included
   */
  static async shouldIncludeSplits(): Promise<boolean> {
    try {
      const settings = await this.getTTSSettings();
      return settings.enabled && settings.includeSplits;
    } catch (error) {
      console.error('Error checking include splits setting:', error);
      return false;
    }
  }

  /**
   * Reset all TTS preferences to defaults
   */
  static async resetToDefaults(): Promise<TTSSettings> {
    try {
      await this.saveTTSSettings(DEFAULT_TTS_SETTINGS);
      return DEFAULT_TTS_SETTINGS;
    } catch (error) {
      console.error('Error resetting TTS preferences:', error);
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
   * Get summary of current TTS settings for debugging
   */
  static async getSettingsSummary(): Promise<string> {
    try {
      const settings = await this.getTTSSettings();
      return `TTS: ${settings.enabled ? 'ON' : 'OFF'}, Rate: ${
        settings.speechRate
      }x, Summary: ${settings.announceOnSummary ? 'ON' : 'OFF'}, Splits: ${
        settings.includeSplits ? 'ON' : 'OFF'
      }`;
    } catch (error) {
      return 'Error loading TTS settings';
    }
  }

  /**
   * Export settings for backup/sync
   */
  static async exportSettings(): Promise<string> {
    const settings = await this.getTTSSettings();
    return JSON.stringify(settings, null, 2);
  }

  /**
   * Import settings from backup
   */
  static async importSettings(settingsJson: string): Promise<TTSSettings> {
    try {
      const settings = JSON.parse(settingsJson) as TTSSettings;

      // Validate settings
      if (
        typeof settings.enabled !== 'boolean' ||
        typeof settings.speechRate !== 'number' ||
        typeof settings.announceOnSummary !== 'boolean' ||
        typeof settings.includeSplits !== 'boolean'
      ) {
        throw new Error('Invalid TTS settings format');
      }

      // Validate speech rate range
      if (settings.speechRate < 0.5 || settings.speechRate > 2.0) {
        settings.speechRate = 1.0;
      }

      await this.saveTTSSettings(settings);
      return settings;
    } catch (error) {
      console.error('Error importing TTS settings:', error);
      throw error;
    }
  }
}
