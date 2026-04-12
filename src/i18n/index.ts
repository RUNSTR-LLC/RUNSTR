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
import enEvents from './locales/en/events.json';

// German translations
import deCommon from './locales/de/common.json';
import deSettings from './locales/de/settings.json';
import deProfile from './locales/de/profile.json';
import deRewards from './locales/de/rewards.json';
import deTeams from './locales/de/teams.json';
import deCharities from './locales/de/charities.json';
import deClubs from './locales/de/clubs.json';
import deEvents from './locales/de/events.json';

// Spanish translations
import esCommon from './locales/es/common.json';
import esSettings from './locales/es/settings.json';
import esProfile from './locales/es/profile.json';
import esRewards from './locales/es/rewards.json';
import esTeams from './locales/es/teams.json';
import esCharities from './locales/es/charities.json';
import esClubs from './locales/es/clubs.json';
import esEvents from './locales/es/events.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'es', name: 'Spanish', nativeName: 'Espanol' },
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
    events: enEvents,
  },
  de: {
    common: deCommon,
    settings: deSettings,
    profile: deProfile,
    rewards: deRewards,
    teams: deTeams,
    charities: deCharities,
    clubs: deClubs,
    events: deEvents,
  },
  es: {
    common: esCommon,
    settings: esSettings,
    profile: esProfile,
    rewards: esRewards,
    teams: esTeams,
    charities: esCharities,
    clubs: esClubs,
    events: esEvents,
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
    ns: ['common', 'settings', 'profile', 'rewards', 'teams', 'charities', 'clubs', 'events'],

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
