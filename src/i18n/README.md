# i18n Directory

Internationalization setup using i18next with expo-localization for device language detection.

## Files

- **index.ts** - i18n configuration and initialization. Detects device language via expo-localization, registers all translation namespaces, and exports supported language codes and a language switching helper.

## Supported Languages

- **English** (en) - Default/fallback language.
- **German** (de) - Deutsch translation.

## Locales Structure

### locales/en/

English translation files.

- **common.json** - Shared strings used across the app (buttons, labels, status messages).
- **settings.json** - Settings screen translations.
- **profile.json** - Profile screen translations.
- **rewards.json** - Rewards screen translations.
- **teams.json** - Teams screen translations.
- **charities.json** - Charity names and descriptions.

### locales/de/

German translation files (mirrors the English namespace structure).

- **common.json** - Gemeinsame Zeichenketten (shared strings).
- **settings.json** - Einstellungen (settings translations).
- **profile.json** - Profil (profile translations).
- **rewards.json** - Belohnungen (rewards translations).
- **teams.json** - Teams (teams translations).
- **charities.json** - Wohltaetigkeitsorganisationen (charity translations).
