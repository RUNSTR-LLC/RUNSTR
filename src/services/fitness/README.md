# Fitness Services Directory

Workout data processing, HealthKit integration, and fitness-related services for RUNSTR.

## Files

- **backgroundSyncService.ts** - iOS background sync for automatic HealthKit workout processing
- **fitnessService.ts** - Main fitness data coordination and workout management service
- **healthKitService.ts** - Apple HealthKit integration for workout data retrieval
- **nostrWorkoutService.ts** - Nostr workout event handling and kind 1301 processing
- **nostrWorkoutSyncService.ts** - Synchronization between HealthKit and Nostr workout events
- **optimizedNostrWorkoutService.ts** - Performance-optimized Nostr workout operations
- **optimizedWorkoutMergeService.ts** - Optimized merging of HealthKit and Nostr workout data
- **rewardDistributionService.ts** - Fitness-based reward calculation and Bitcoin distribution
- **teamLeaderboardService.ts** - Team-based fitness leaderboards and ranking
- **workoutDataProcessor.ts** - Raw workout data processing and normalization
- **workoutMergeService.ts** - Unified workout data merging from multiple sources
- **SimpleWorkoutService.ts** - React Native optimized 1301 workout discovery using nostr-tools
- **NdkWorkoutService.ts** - ⚡ NDK-based 1301 workout discovery (FASTEST - 113 events in 479ms)