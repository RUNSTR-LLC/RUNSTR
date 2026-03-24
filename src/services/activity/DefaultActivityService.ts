/**
 * DefaultActivityService - Manages user's default workout activity preference
 *
 * Stores and retrieves the user's preferred default activity for the
 * ActivityTrackerScreen. Default is 'run' if no preference is set.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Active activity types that can be set as default
export type DefaultActivity =
  | 'run'
  | 'walk'
  | 'cycle'
  | 'hiking'
  | 'strength'
  | 'meditation';

const STORAGE_KEY = '@runstr:default_activity';

export class DefaultActivityService {
  private static instance: DefaultActivityService;

  private constructor() {}

  static getInstance(): DefaultActivityService {
    if (!DefaultActivityService.instance) {
      DefaultActivityService.instance = new DefaultActivityService();
    }
    return DefaultActivityService.instance;
  }

  /**
   * Get the user's default activity preference
   * Returns 'run' if no preference is saved
   */
  async getDefault(): Promise<DefaultActivity> {
    const savedDefault = await this.getSavedDefault();
    return savedDefault ?? 'run';
  }

  /**
   * Get the user's saved default preference without fallback.
   * Returns null if missing or invalid.
   */
  async getSavedDefault(): Promise<DefaultActivity | null> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored && this.isValidActivity(stored)) {
        console.log('[DefaultActivityService] Loaded default activity:', stored);
        return stored as DefaultActivity;
      }
      return null;
    } catch (error) {
      console.error('[DefaultActivityService] Error loading default activity:', error);
      return null;
    }
  }

  /**
   * Set the user's default activity preference
   */
  async setDefault(activity: DefaultActivity): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, activity);
      console.log('[DefaultActivityService] Saved default activity:', activity);
    } catch (error) {
      console.error('[DefaultActivityService] Error saving default activity:', error);
      throw error;
    }
  }

  /**
   * Clear the default activity preference (resets to 'run')
   */
  async clearDefault(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log('[DefaultActivityService] Cleared default activity');
    } catch (error) {
      console.error('[DefaultActivityService] Error clearing default activity:', error);
      throw error;
    }
  }

  /**
   * Get display name for an activity type
   */
  getActivityDisplayName(activity: DefaultActivity): string {
    const displayNames: Record<DefaultActivity, string> = {
      run: 'Running',
      walk: 'Walking',
      cycle: 'Cycling',
      hiking: 'Hiking',
      strength: 'Strength',
      meditation: 'Meditation',
    };
    return displayNames[activity] || 'Running';
  }

  /**
   * Get icon name for an activity type
   */
  getActivityIcon(activity: DefaultActivity): string {
    const icons: Record<DefaultActivity, string> = {
      run: 'walk',
      walk: 'footsteps',
      cycle: 'bicycle',
      hiking: 'trail-sign',
      strength: 'barbell',
      meditation: 'leaf',
    };
    return icons[activity] || 'walk';
  }

  /**
   * Validate if a string is a valid activity type
   */
  private isValidActivity(value: string): value is DefaultActivity {
    return ['run', 'walk', 'cycle', 'hiking', 'strength', 'meditation'].includes(value);
  }
}

// Export singleton instance
export const defaultActivityService = DefaultActivityService.getInstance();
