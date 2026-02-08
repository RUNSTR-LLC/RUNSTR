# Fitness Services

Workout data processing, health platform integrations (HealthKit, Health Connect, Garmin), and fitness-related services.

## Files

- **LocalWorkoutStorageService.ts** - Persistent AsyncStorage for GPS-tracked and manually-entered workouts. Triggers daily rewards and competition submission on save.
- **WorkoutEventStore.ts** - Centralized store for kind 1301 workout events. Single source of truth that all screens read from, with pull-to-refresh support and offline cache.
- **Nuclear1301Service.ts** - Fast kind 1301 workout event discovery using GlobalNDKService with a 3-second timeout and zero-validation approach for maximum reliability.
- **Nostr1301ImportService.ts** - One-time bulk import of a user's Nostr workout history (kind 1301) into LocalStorage for offline analytics.
- **healthKitService.ts** - Apple HealthKit integration for iOS workout data retrieval with progressive loading, timeout protection, and competition auto-submission.
- **healthConnectService.ts** - Android Health Connect integration mirroring the HealthKit API for consistent cross-platform workout sync (Android 14+).
- **garminAuthService.ts** - Garmin Connect OAuth 2.0 PKCE authentication flow with token management, refresh, and persistent storage.
- **garminActivityService.ts** - Fetches and syncs workouts from Garmin Connect with progressive loading, activity type mapping, and deduplication.
- **SimpleWorkoutService.ts** - React Native optimized kind 1301 discovery using nostr-tools SimplePool with multi-time-range querying (113x improvement over naive WebSocket).
- **nostrWorkoutService.ts** - Core workout data fetching that delegates to SimpleWorkoutService while preserving existing interfaces.
- **nostrWorkoutSyncService.ts** - Background synchronization orchestrator for automatic workout syncing and real-time Nostr subscriptions.
- **optimizedNostrWorkoutService.ts** - Performance-optimized Nostr workout operations with cache-first loading, timeout racing, and early termination.
- **workoutMergeService.ts** - Merges workouts from HealthKit, Nostr, and local storage with deduplication, posting status tracking, and NDK subscription management.
- **WorkoutStatusTracker.ts** - Tracks posting status of workouts (posted to Nostr, competed) to prevent duplicate submissions and maintain UI state.
- **MonthlyStatsCalculator.ts** - Calculates detailed monthly workout insights including totals, averages, and activity breakdown comparisons.
- **WorkoutLevelService.ts** - Universal XP system for all workout types with duration, distance, and streak bonuses driving level progression.
- **CalorieEstimationService.ts** - Privacy-preserving on-device calorie estimation for all activity types using default assumptions when no user profile is available.
- **FitnessTestService.ts** - RUNSTR Fitness Test management (pushups, situps, 5K run) with scoring, history, and grade calculation.
- **HealthSyncManager.ts** - Lightweight foreground sync for HealthKit/Health Connect workouts. Syncs on app foreground and pull-to-refresh with a 5-minute throttle. Replaces the deprecated BackgroundSyncService.
- **backgroundSyncService.ts** - *(Deprecated)* Background workout sync orchestrator. Disabled due to conflicts with active GPS tracking. Replaced by HealthSyncManager.
