/**
 * i18n Configuration
 *
 * English only. The German and Spanish files under locales/ are not loaded
 * (the in-app language picker was removed); re-add them here to bring back
 * a language.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English translations
import enCommon from './locales/en/common.json';
import enSettings from './locales/en/settings.json';
import enProfile from './locales/en/profile.json';
import enRewards from './locales/en/rewards.json';
import enTeams from './locales/en/teams.json';
import enCharities from './locales/en/charities.json';
import enClubs from './locales/en/clubs.json';
import enEvents from './locales/en/events.json';



export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
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
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
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
