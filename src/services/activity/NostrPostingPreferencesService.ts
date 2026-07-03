/**
 * NostrPostingPreferencesService - User preferences for publishing workouts to Nostr.
 *
 * Two independent preferences:
 *  - autoPost: when on, a finished workout is automatically published to Nostr
 *    (and the RUNSTR feed) without the user tapping Post. Default ON (v2.0):
 *    interop is the product's pitch, so publishing is the default and opting
 *    out is the setting. Users who explicitly toggled it off stay off. A
 *    one-time notice is shown on the first auto-publish (see
 *    WorkoutSummaryModal) so the default change is announced, not silent.
 *  - format: which Nostr event the Post action (auto or manual) produces —
 *    'kind1' (a card post, visible in every client) or 'kind1301' (structured
 *    workout data, rendered natively by Amethyst/POWR/Chachi). Default 'kind1301'
 *    for cross-app interop. The format toggle is currently hidden in the UI
 *    (see NostrPostingSection) but the machinery is retained.
 *
 * Workouts are ALWAYS saved to Supabase (history + rewards) regardless of these
 * settings — see LocalWorkoutStorageService.saveGPSWorkout(). These preferences
 * only control public Nostr publishing + the in-app feed entry.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type PostFormat = 'kind1' | 'kind1301';

const AUTO_POST_KEY = '@runstr:auto_post_nostr';
const FORMAT_KEY = '@runstr:post_format';
const AUTO_POST_NOTICE_KEY = '@runstr:auto_post_notice_shown';

export class NostrPostingPreferencesService {
  private static cachedAutoPost: boolean | null = null;
  private static cachedFormat: PostFormat | null = null;

  /** Whether finished workouts auto-publish to Nostr. Default true. */
  static async isAutoPostEnabled(): Promise<boolean> {
    if (this.cachedAutoPost !== null) return this.cachedAutoPost;
    try {
      const stored = await AsyncStorage.getItem(AUTO_POST_KEY);
      // Default ON (null -> true); only an explicit opt-out disables it.
      this.cachedAutoPost = stored !== 'false';
      return this.cachedAutoPost;
    } catch (error) {
      // Fail closed: if we can't read the preference we can't rule out an
      // explicit opt-out, so don't publish.
      console.error('[NostrPosting] Error loading autoPost preference:', error);
      return false;
    }
  }

  static async setAutoPostEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(AUTO_POST_KEY, String(enabled));
      this.cachedAutoPost = enabled;
    } catch (error) {
      console.error('[NostrPosting] Error saving autoPost preference:', error);
      throw error;
    }
  }

  /** Which event the Post action produces. Default 'kind1301'. */
  static async getPostFormat(): Promise<PostFormat> {
    if (this.cachedFormat !== null) return this.cachedFormat;
    try {
      const stored = await AsyncStorage.getItem(FORMAT_KEY);
      // Default to 1301; only users who explicitly chose 'kind1' stay on it.
      this.cachedFormat = stored === 'kind1' ? 'kind1' : 'kind1301';
      return this.cachedFormat;
    } catch (error) {
      console.error('[NostrPosting] Error loading format preference:', error);
      return 'kind1301';
    }
  }

  static async setPostFormat(format: PostFormat): Promise<void> {
    try {
      await AsyncStorage.setItem(FORMAT_KEY, format);
      this.cachedFormat = format;
    } catch (error) {
      console.error('[NostrPosting] Error saving format preference:', error);
      throw error;
    }
  }

  /**
   * One-time notice gate for the first auto-publish. Returns true exactly once
   * per install so the auto-post default is announced rather than silent.
   */
  static async shouldShowAutoPostNotice(): Promise<boolean> {
    try {
      const shown = await AsyncStorage.getItem(AUTO_POST_NOTICE_KEY);
      if (shown === 'true') return false;
      await AsyncStorage.setItem(AUTO_POST_NOTICE_KEY, 'true');
      return true;
    } catch {
      return false; // if storage is flaky, skip the notice rather than repeat it
    }
  }

  static clearCache(): void {
    this.cachedAutoPost = null;
    this.cachedFormat = null;
  }
}
