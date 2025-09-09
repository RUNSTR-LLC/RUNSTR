# Phase 2 Implementation Guide: Nostr Workout Integration

## Overview: Building the Core MVP Workout Sync System

Phase 2 represents the critical bridge between user authentication and competitive team participation in RUNSTR's MVP. With Phase 1 successfully delivering streamlined Nostr-only onboarding (login → profile import → role selection), Phase 2 focuses on automatically importing users' existing fitness data from their Nostr activity history. This phase implements the parsing and synchronization of kind 1301 Nostr events, which are standardized workout/fitness data events published by various fitness applications in the Nostr ecosystem. The goal is to create an invisible-first experience where users' historical workout data seamlessly flows into RUNSTR's team competition system without requiring manual data entry or additional fitness app integrations. By the end of Phase 2, users will see their complete workout history imported automatically, ready to be used for team scoring and competitive rankings.

## Technical Architecture: Nostr Kind 1301 Event Processing

The core technical challenge involves connecting to multiple Nostr relays (Damus, Primal, nos.lol) and querying for kind 1301 events authored by each user's npub (public key). These events contain JSON-formatted workout data including activity type, duration, distance, calories, heart rate, and optional GPS route information. Our implementation follows the iOS reference architecture but adapts it for React Native and TypeScript, creating six new service files that stay under the 500-line architectural constraint. The NostrWorkoutService handles event fetching and parsing, while NostrWorkoutSyncService manages real-time subscriptions and local storage. The parsed workout data integrates with existing Supabase tables and team competition scoring systems, ensuring that Nostr-sourced workouts contribute to leaderboards and challenge outcomes. Background synchronization operates invisibly, with WebSocket connections maintaining real-time updates as users publish new fitness achievements to their Nostr profiles.

## User Experience Flow: Seamless Fitness Data Integration

From the user's perspective, Phase 2 delivers a magical experience where their fitness history appears automatically after completing the Nostr onboarding process. Immediately after profile import in Phase 1, the app begins fetching their workout history from Nostr relays, displaying progress indicators and final counts of imported activities. Users access their complete workout timeline through a new WorkoutHistoryScreen, featuring filtering by activity type (running, cycling, walking), date ranges, and search functionality. The interface includes pull-to-refresh mechanics and manual sync triggers for users who want to ensure they have the latest data. Error handling provides clear feedback when sync issues occur, with retry mechanisms and alternative paths that maintain app functionality even when some relays are unavailable. The invisible-first principle means that once initial sync completes, ongoing workout updates happen automatically in the background, with subtle status indicators showing sync progress without interrupting the primary team competition experience.

## Development Implementation Strategy: Building on Phase 1 Foundation

The implementation strategy leverages Phase 1's successful Nostr authentication and profile import infrastructure, extending existing services rather than creating parallel systems. Development follows a 19-day timeline split into foundation setup (days 1-7), integration work (days 8-13), and polish/testing (days 14-19). Each new file maintains the established pattern of TypeScript interfaces, error boundaries, and integration with the existing theme system and navigation structure. The NostrRelayManager service created in Phase 1 extends to handle workout event subscriptions, while the Supabase integration layer adapts to store parsed workout data in the activities table for team competition use. Code organization follows the existing src/services/fitness/ directory structure, with new components fitting into src/screens/ and src/components/fitness/ patterns. All UI elements respect the exact black and white minimalistic theme established in Phase 1, ensuring visual consistency across the expanding feature set.

## Success Metrics and Team Competition Preparation: Enabling Phase 3

Phase 2's success sets up Phase 3's team creation and competition mechanics by ensuring every user has comprehensive workout data available for scoring algorithms and leaderboard calculations. Success metrics include sub-30-second workout history import, 95%+ parsing success rate for kind 1301 events, and seamless integration with existing team services. The parsed workout data feeds directly into competition scoring, historical performance analysis, and team matching algorithms that captains will use in Phase 3. Real-time sync capabilities ensure that ongoing fitness activities contribute to active competitions immediately upon publication to Nostr relays. By Phase 2 completion, the app transforms from a simple authentication system into a comprehensive fitness data platform that positions RUNSTR as the definitive bridge between decentralized fitness tracking and Bitcoin-incentivized team competition, setting the foundation for the complete MVP experience where workout activity directly translates into cryptocurrency earning opportunities.

## Implementation Checklist for Development

### Core Services (Days 1-7)
- [ ] **src/types/nostrWorkout.ts** - NostrWorkoutEvent interfaces and enhanced workout types
- [ ] **src/utils/nostrWorkoutParser.ts** - JSON parsing, validation, and unit conversion utilities  
- [ ] **src/services/fitness/nostrWorkoutService.ts** - Core workout fetching and statistics
- [ ] **src/services/fitness/nostrWorkoutSyncService.ts** - Background sync and real-time updates

### UI Components (Days 8-13)
- [ ] **src/screens/WorkoutHistoryScreen.tsx** - Workout timeline with filtering and search
- [ ] **src/components/fitness/WorkoutSyncStatus.tsx** - Sync indicators and manual controls
- [ ] Modify **ProfileImportScreen.tsx** to trigger workout sync after profile completion
- [ ] Update **NostrOnboardingWizard.tsx** with workout sync progress step

### Integration & Testing (Days 14-19)
- [ ] Extend **workoutDataProcessor.ts** and **teamLeaderboardService.ts** for Nostr workout scoring
- [ ] Implement comprehensive error handling and offline mode support
- [ ] Performance optimization for large workout histories and multiple relay connections
- [ ] Unit tests for parsing logic and integration tests for sync services
- [ ] E2E testing of complete user journey: login → profile → workout sync → team readiness

**File Size Compliance**: All new files designed to stay under 500 lines per architectural requirements
**Integration Points**: Leverages existing NostrRelayManager, Supabase, and theme systems
**Success Criteria**: Complete workout history import, real-time sync, team competition readiness