# Workout Source Tabs

Individual tab components for different workout data sources. Each tab handles its own data fetching, display, and user interactions.

## Files

- **AllWorkoutsTab.tsx** - Unified view merging workouts from all sources (HealthKit, Garmin, Google Fit, Nostr) with monthly grouping and social share support.
- **AppleHealthTab.tsx** - Displays last 30 days of HealthKit workouts with "Post to Nostr" functionality (iOS only).
- **GarminHealthTab.tsx** - Shows synced Garmin Connect workouts with OAuth authentication, mirroring AppleHealthTab structure.
- **HealthConnectTab.tsx** - Displays last 30 days of Android Health Connect workouts with "Post to Nostr" functionality (Android 14+).
- **PrivateWorkoutsTab.tsx** - Displays all local workouts stored on device (GPS tracked, manual, daily steps, imported Nostr) with instant loading from AsyncStorage.
- **PublicWorkoutsTab.tsx** - Displays only Nostr kind 1301 workout events that have been published to the Nostr network.
- **UnifiedWorkoutsTab.tsx** - Health Timeline view merging local workouts, Apple Health/Health Connect data, journal entries, and habit check-ins into a chronological timeline.
