/**
 * MusicPlayerPreferencesService - Manages music player header toggle preference
 * Controls whether music controls appear in Profile header
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const MUSIC_PLAYER_HEADER_ENABLED_KEY = '@runstr:music_player_header_enabled';

class MusicPlayerPreferencesServiceClass {
  private cachedEnabled: boolean | null = null;

  /**
   * Check if music player header controls are enabled
   * Default: false (disabled)
   */
  async isMusicPlayerHeaderEnabled(): Promise<boolean> {
    if (this.cachedEnabled !== null) {
      return this.cachedEnabled;
    }

    try {
      const stored = await AsyncStorage.getItem(MUSIC_PLAYER_HEADER_ENABLED_KEY);
      this.cachedEnabled = stored === 'true'; // Default: disabled
      return this.cachedEnabled;
    } catch (error) {
      console.error('[MusicPlayerPreferencesService] Failed to read preference:', error);
      return false;
    }
  }

  /**
   * Set music player header controls enabled/disabled
   */
  async setMusicPlayerHeaderEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(MUSIC_PLAYER_HEADER_ENABLED_KEY, String(enabled));
      this.cachedEnabled = enabled;
      console.log(`[MusicPlayerPreferencesService] Music header ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('[MusicPlayerPreferencesService] Failed to save preference:', error);
      throw error;
    }
  }

  /**
   * Clear cached value (useful for testing or refresh)
   */
  clearCache(): void {
    this.cachedEnabled = null;
  }
}

// Export singleton
export const MusicPlayerPreferencesService = new MusicPlayerPreferencesServiceClass();
export default MusicPlayerPreferencesService;
