/**
 * LanguagePreferenceService
 *
 * Manages user language preferences using AsyncStorage.
 * Works with i18next to persist and restore language selection.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../../i18n';
import { LanguageCode, SUPPORTED_LANGUAGES } from '../../i18n';

const LANGUAGE_KEY = '@runstr:language';

export class LanguagePreferenceService {
  /**
   * Get the saved language preference
   * Returns null if no preference saved (will use device language)
   */
  static async getSavedLanguage(): Promise<LanguageCode | null> {
    try {
      const savedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLang && this.isValidLanguage(savedLang)) {
        return savedLang as LanguageCode;
      }
      return null;
    } catch (error) {
      console.error('[LanguagePreferenceService] Error reading language:', error);
      return null;
    }
  }

  /**
   * Save language preference and update i18next
   */
  static async setLanguage(languageCode: LanguageCode): Promise<void> {
    try {
      if (!this.isValidLanguage(languageCode)) {
        console.warn(`[LanguagePreferenceService] Invalid language code: ${languageCode}`);
        return;
      }

      await AsyncStorage.setItem(LANGUAGE_KEY, languageCode);
      await i18n.changeLanguage(languageCode);
      console.log(`[LanguagePreferenceService] Language changed to: ${languageCode}`);
    } catch (error) {
      console.error('[LanguagePreferenceService] Error saving language:', error);
      throw error;
    }
  }

  /**
   * Get current active language from i18next
   */
  static getCurrentLanguage(): LanguageCode {
    return (i18n.language || 'en') as LanguageCode;
  }

  /**
   * Initialize language from saved preference on app start
   */
  static async initializeLanguage(): Promise<void> {
    try {
      const savedLang = await this.getSavedLanguage();
      if (savedLang && savedLang !== i18n.language) {
        await i18n.changeLanguage(savedLang);
        console.log(`[LanguagePreferenceService] Restored language: ${savedLang}`);
      }
    } catch (error) {
      console.error('[LanguagePreferenceService] Error initializing language:', error);
    }
  }

  /**
   * Check if a language code is supported
   */
  static isValidLanguage(code: string): code is LanguageCode {
    return SUPPORTED_LANGUAGES.some(lang => lang.code === code);
  }

  /**
   * Get list of supported languages for UI display
   */
  static getSupportedLanguages() {
    return SUPPORTED_LANGUAGES;
  }
}
