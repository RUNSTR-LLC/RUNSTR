## New Features

### KM/Miles Unit Preference
- **Unit Toggle**: Settings → Fitness Tracking → toggle between Kilometers and Miles
- **Full App Support**: Distance, pace, speed, and elevation display in preferred units
- **TTS Announcements**: Voice coach speaks in your preferred units ("per mile" or "per kilometer")
- **Split Tracking**: Mile splits (1609m) or kilometer splits (1000m) based on preference
- **Workout Cards**: All workout displays respect unit preference

### Internationalization (i18n)
- **Auto-Detection**: App detects device language on startup
- **Language Switcher**: Settings → Language for manual language selection
- **Persistent Preference**: Selected language saved across sessions
- **Fallback System**: Falls back to English for missing translations

## Bug Fixes

### GrapheneOS Step Counter Fix
- **Fixed**: Steps displayed as 0 in app while notification bar showed correct count
- **Root Cause**: Privacy ROM detection was incorrectly blocking native step sensor
- **Solution**: Removed privacy ROM check - native step sensor works on all Android devices

### Relay Connectivity Fix
- **Fixed**: Workout publishing failures due to relay connection timing
- **Solution**: Service now waits for minimum relay connectivity (2 relays, 3s timeout) before publishing
- **Graceful Degradation**: Continues with warning if connectivity not established

## Technical Changes
- New unit preference hook: `src/hooks/useUnitPreference.ts`
- Updated distance formatter with unit conversion helpers
- Modified TTS announcements for unit-aware voice coaching
- Split tracking now configurable for mile or kilometer intervals
