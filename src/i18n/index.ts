/**
 * i18n Configuration
 *
 * English only, two namespaces. The German and Spanish files were deleted
 * with the language picker (2026-11-17); they live in git history.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enSettings from './locales/en/settings.json';
import enProfile from './locales/en/profile.json';

const resources = {
  en: {
    settings: enSettings,
    profile: enProfile,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'settings',
    ns: ['settings', 'profile'],

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
