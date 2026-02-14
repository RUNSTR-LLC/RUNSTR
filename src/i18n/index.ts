/**
 * i18n Configuration
 *
 * Internationalization setup using i18next with expo-localization
 * for device language detection.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// expo-localization is optional - native module may not be available until rebuild
let Localization: typeof import('expo-localization') | null = null;
try {
  Localization = require('expo-localization');
} catch (e) {
  console.warn('[i18n] expo-localization native module not available, using default language');
}

// English translations
import enCommon from './locales/en/common.json';
import enSettings from './locales/en/settings.json';
import enProfile from './locales/en/profile.json';
import enRewards from './locales/en/rewards.json';
import enTeams from './locales/en/teams.json';
import enCharities from './locales/en/charities.json';
import enClubs from './locales/en/clubs.json';

// German translations
import deCommon from './locales/de/common.json';
import deSettings from './locales/de/settings.json';
import deProfile from './locales/de/profile.json';
import deRewards from './locales/de/rewards.json';
import deTeams from './locales/de/teams.json';
import deCharities from './locales/de/charities.json';
import deClubs from './locales/de/clubs.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

const resources = {
  en: {
    common: enCommon,
    settings: enSettings,
    profile: enProfile,
    rewards: enRewards,
    teams: enTeams,
    charities: enCharities,
    clubs: enClubs,
  },
  de: {
    common: deCommon,
    settings: deSettings,
    profile: deProfile,
    rewards: deRewards,
    teams: deTeams,
    charities: deCharities,
    clubs: deClubs,
  },
};

// Get device language, defaulting to 'en' if not supported
const getDeviceLanguage = (): LanguageCode => {
  try {
    if (Localization) {
      const deviceLang = Localization.getLocales()[0]?.languageCode ?? 'en';
      const supportedCodes = SUPPORTED_LANGUAGES.map(l => l.code);
      return supportedCodes.includes(deviceLang as LanguageCode)
        ? (deviceLang as LanguageCode)
        : 'en';
    }
  } catch (e) {
    console.warn('[i18n] Could not get device language:', e);
  }
  return 'en'; // Default fallback
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getDeviceLanguage(),
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'settings', 'profile', 'rewards', 'teams', 'charities', 'clubs'],

    interpolation: {
      escapeValue: false, // React already handles escaping
    },

    // Don't load translations on init - we bundle them
    partialBundledLanguages: true,

    react: {
      useSuspense: false, // Disable suspense for React Native
    },
  });

export default i18n;
