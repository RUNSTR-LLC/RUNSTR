# RUNSTR Architecture

## System Overview

```
+------------------------------------------------------------------+
|                         RUNSTR App                                |
|                                                                   |
|  React Native (Expo) + TypeScript                                |
|                                                                   |
|  +-----------+  +----------+  +---------+                        |
|  | Profile   |  | Teams    |  | Rewards |   <- 3 Bottom Tabs     |
|  | Tab       |  | Tab      |  | Tab     |                        |
|  +-----------+  +----------+  +---------+                        |
|        |              |             |                              |
|  +-----v--------------v-------------v-------+                    |
|  |         Native Stack Navigator            |                    |
|  |    (~21 modal screens on top of tabs)     |                    |
|  +-------------------------------------------+                    |
|        |              |             |                              |
|  +-----v--------------v-------------v-------+                    |
|  |            Service Layer                  |                    |
|  +-------------------------------------------+                    |
|        |         |          |          |                          |
|  +-----v---+ +---v----+ +--v-----+ +-v--------+                 |
|  | Nostr   | |Supabase| |Health  | |Lightning |                 |
|  | (NDK)   | |  (DB)  | |  Kit   | | (LNURL)  |                 |
|  +---------+ +--------+ +--------+ +----------+                 |
+------------------------------------------------------------------+
```

## Core Data Flow

```
User opens app
  |
  v
AsyncStorage: nsec/npub present?
  |                     |
  NO                   YES
  |                     |
  v                     v
LoginScreen         AppInitialization
  |                     |
  v                     +---> GlobalNDKService.initialize()  (3 active default relay connections)
Enter nsec              +---> Load profile from cache/Nostr  (kind 0)
  |                     +---> Prefetch charity list, competitions
  v                     +---> Start step counter
Derive npub             |
Store in AsyncStorage   v
  |                  BottomTabNavigator
  v                     |
MainTabs             3 Tabs ready
```

## Navigation Architecture

The runtime navigator is `AuthenticatedNavigator` defined inline in `App.tsx` (lines 672-1169).
`AppNavigator.tsx` is a legacy file used **only** for the Login screen.

```
App.tsx
  |
  +-- AppErrorBoundary (catches runtime crashes)
       |
       +-- SafeAreaProvider
            |
            +-- AuthProvider (AuthContext)
                 |
                 +-- NavigationDataProvider (NavigationDataContext)
                      |
                      +-- NavigationContainer
                           |
                           +-- NativeStackNavigator (RootStack)
                                |
                                +-- Login (unauthenticated, via AppNavigator)
                                |
                                +-- Main (authenticated, via AuthenticatedNavigator in App.tsx)
                                |    |
                                |    +-- BottomTabNavigator
                                |         |
                                |         +-- Profile Tab (eager load)
                                |         +-- Teams Tab   (React.lazy)
                                |         +-- Rewards Tab (React.lazy)
                                |
                                +-- Modal Screens (~21 reachable)
                                     |
                                     +-- Activity Tracking
                                     |    +-- ActivityTrackerScreen (uses SwipeGridNavigator
                                     |    |     to switch between running/walking/cycling/
                                     |    |     hiking/strength inline -- NOT separate routes)
                                     |    +-- StepsDisplayScreen
                                     |    +-- ManualEntryScreen
                                     |
                                     +-- Competition Screens
                                     |    +-- Season2Screen
                                     |    +-- CompeteScreen
                                     |    +-- LeaderboardsScreen
                                     |    +-- EinundzwanzigDetailScreen
                                     |    +-- JanuaryWalkingDetailScreen
                                     |    +-- RunningBitcoinDetailScreen
                                     |
                                     +-- User/Settings Screens
                                     |    +-- SettingsScreen
                                     |    +-- ProfileEditScreen
                                     |    +-- WorkoutHistoryScreen
                                     |    +-- AdvancedAnalyticsScreen
                                     |    +-- AIHealthDashboardScreen
                                     |    +-- WalletScreen
                                     |    +-- JournalHistoryScreen
                                     |    +-- HelpSupportScreen
                                     |    +-- ContactSupportScreen
                                     |    +-- PrivacyPolicyScreen
                                     |
                                     +-- Dead screens (registered but unreachable)
                                          CompetitionsList, MyTeams, SavedRoutes,
                                          HealthProfile, SatlantisDiscovery, Events,
                                          Experimental, Donate
```

## State Management

```
+------------------------------------------+
|              State Layer                  |
+------------------------------------------+
|                                          |
|  React Context (global, reactive)        |
|  +------------------------------------+  |
|  | AuthContext                         |  |
|  |   currentUser, signIn(), signOut()  |  |
|  +------------------------------------+  |
|  +------------------------------------+  |
|  | NavigationDataContext               |  |
|  |   user, teams, competitions,        |  |
|  |   wallet, prefetched data           |  |
|  +------------------------------------+  |
|                                          |
|  Zustand Stores (client state)           |
|  +------------------------------------+  |
|  | walletStore  - NWC balance, txns    |  |
|  | userStore    - preferences, team    |  |
|  | teamStore    - local membership     |  |
|  | musicStore   - Wavlake playback     |  |
|  +------------------------------------+  |
|                                          |
|  AsyncStorage (persistent)               |
|  +------------------------------------+  |
|  | @runstr:user_nsec                   |  |
|  | @runstr:npub                        |  |
|  | @runstr:hex_pubkey                  |  |
|  | @runstr:selected_charity_id         |  |
|  | @runstr:reward_lightning_address    |  |
|  | @runstr:last_reward_date            |  |
|  | @runstr:total_rewards_earned        |  |
|  | local_workouts (array)              |  |
|  | @runstr:event_joins                 |  |
|  | + cache keys with TTLs             |  |
|  +------------------------------------+  |
|                                          |
|  In-Memory Caches (TTL-based)            |
|  +------------------------------------+  |
|  | UnifiedNostrCache  (profiles, etc.) |  |
|  | CompetitionCacheService (5 min)     |  |
|  | WorkoutCacheService                 |  |
|  | CacheInvalidationService            |  |
|  | FrozenEventStore (snapshots)        |  |
|  +------------------------------------+  |
+------------------------------------------+
```

## Service Architecture

Services are organized by domain under `src/services/`. Each service is a singleton or static class. The key principle: **services never import screens or components** -- data flows up via contexts, stores, and callbacks.

### Nostr Services

```
GlobalNDKService (SINGLETON - one NDK instance for entire app)
  |
  |  3 WebSocket connections to default relays:
  |    wss://relay.damus.io
  |    wss://nos.lol
  |    wss://relay.primal.net
  |
  +---> NostrProfileService        (fetch/publish kind 0 profiles)
  +---> NostrProfilePublisher      (update profile metadata)
  +---> workoutPublishingService   (submit workouts to Supabase, publish kind 1 social posts)
  +---> NostrSubscriptionManager   (real-time event subscriptions)
```

**Dead services** (exist in codebase but have 0-1 real consumers):
- `SimpleNostrService` -- 1 import (DeleteAccountService only); effectively unused
- `HttpNostrQueryService` -- Part of dead HybridNostrQueryService chain; 0 real consumers
- `HybridNostrQueryService` -- 0 real consumers

**Legacy Nostr query paths** (services with many imports but whose Nostr queries are not the active runtime path):
- `SimpleCompetitionService` (24 imports) -- Has kind 30100/30101 query code, but events are hardcoded
- `SimpleLeaderboardService` (25 imports) -- Has kind 1301 Nostr query code, but workouts come from Supabase
- `NdkTeamService` (17 imports) -- Has kind 33404 query code, but returns hardcoded teams
- `NostrTeamService` (37 imports) -- Wrapper around NdkTeamService

**Rule:** ALL Nostr access goes through `GlobalNDKService.getInstance()`. Never create new NDK or relay manager instances.

### Backup Services

```
BackupService (kind 30078 encrypted export)
  +-- Collects: workouts, step history, habits, journal, preferences
  +-- Compresses with gzip (NIP-44 has 64KB limit)
  +-- Encrypts with NIP-44 self-encryption (user's own pubkey)
  +-- Publishes kind 30078 to relays (damus, nos.lol, nostr.band)
  +-- Tags include metadata (workout_count, date_range) but content is encrypted

RestoreService (kind 30078 encrypted import)
  +-- Fetches kind 30078 from relays by d-tag "runstr-workout-backup"
  +-- Decrypts with NIP-44 using user's private key
  +-- Decompresses gzip payload
  +-- Restores workouts, habits, journal, preferences to local storage
```

### Fitness & Tracking Services

```
Activity Tracking:
  SimpleRunTracker             GPS background location tracking
  ActivityMetricsService       Pace, speed, elevation calculations
  SplitTrackingService         Per-km/mile split times
  DailyStepCounterService      Step count from HealthKit/Health Connect
  NativeStepCounterService     Native pedometer access
  BatteryOptimizationService   Battery-aware tracking modes
  TTSAnnouncementService       Voice announcements during workout

Workout Storage:
  LocalWorkoutStorageService   AsyncStorage persistence (primary store)
  SimpleWorkoutService         Workout operations and local management

Health Integrations:
  healthKitService             Apple HealthKit (iOS)
  healthConnectService         Google Health Connect (Android)
  garminAuthService            Garmin OAuth
  garminActivityService        Garmin workout import
```

### Rewards Services

```
Reward Flow:
  DailyRewardService           50 sats/day eligibility tracking
  StepRewardService            5 sats/1k steps tracking
  RewardDestinationService     Route to user or charity address
  NWCGatewayService            Nostr Wallet Connect for payments
  SupabaseRewardService        Query verified payments from DB + impact data
  RewardsTransparencyService   Global reward pool + charity leaderboards
  RewardPollingService         Poll for confirmed payments
  RewardNotificationManager    Toast notifications for rewards

Note: Actual reward PAYMENTS are processed by an external service
that monitors Supabase, not by the app itself. The app tracks
eligibility and displays results.
```

### Competition & Leaderboard Services

```
Competition Management (ALL Supabase-based at runtime):
  SupabaseCompetitionService     Submit workouts, query leaderboards
  DailyLeaderboardService        Daily workout leaderboards
  StepCompetitionService         Step-based competitions
  PendingSubmissionService       Retry failed Supabase submissions
  LeaderboardBaselineService     Pre-compute baselines for long events

  Note: SimpleCompetitionService and SimpleLeaderboardService exist with
  Nostr query code (kinds 30100/30101/1301), but these are legacy paths.
  All active competition data flows through Supabase.

Hooks:
  useSupabaseLeaderboard         Primary leaderboard data hook (Supabase queries)

Hardcoded Challenges:
  EinundzwanzigService           Einundzwanzig challenge (Germany)
  JanuaryWalkingService          January Walking contest
  RunningBitcoinService          Running Bitcoin challenge
```

### Team & Charity Services

```
  Charities are hardcoded in constants/charities.ts (17 organizations)
  User selects a charity -> stored in AsyncStorage (@runstr:selected_charity_id)
  Charity tag embedded in workout submissions to Supabase

  Service chain:
    NdkTeamService (primary)    Returns hardcoded teams (kind 33404 query disabled for performance)
    NostrTeamService (wrapper)  Compatibility layer, delegates to NdkTeamService
    charities.ts (constants)    17 charity definitions with Lightning addresses
```

### Auth & Identity Services

```
  authService                  Nostr login/logout, key management
  SecureNsecStorage            Secure nsec storage
  UnifiedSigningService        Unified signing across providers
  directNostrProfileService    Fetch profiles directly from Nostr
  WoTService                   Web of Trust for reputation
  VerificationService          Workout authenticity verification
```

### Cache Layer

```
  UnifiedNostrCache            In-memory + AsyncStorage (TTL-based)
  CompetitionCacheService      5-min cache for leaderboards
  WorkoutCacheService          Workout event caching
  CacheInvalidationService     Invalidate stale data
  FrozenEventStore             Immutable event snapshots

  TTLs:
    Profiles:     24 hours
    Leaderboards:  5 minutes
    Wallet:       30 seconds
```

## Workout Lifecycle

This is the most important data flow in the app.

```
1. USER STARTS WORKOUT
   ProfileScreen -> "Start Workout" button
     |
     v
   ActivityTrackerScreen (SwipeGridNavigator switches activity type inline)
     |
     v
   SimpleRunTracker.startTracking()
     +-- Request location permission
     +-- Start expo-location background updates
     +-- Collect GPS points every 1-3 seconds
     +-- Calculate: distance, pace, elevation, splits

2. USER FINISHES WORKOUT
   User taps "Stop" -> Workout summary modal
     |
     v
   LocalWorkoutStorageService.saveWorkout()
     +-- Store in AsyncStorage as LocalWorkout object
     +-- Fields: id, type, distance, duration, calories, splits, source

3. AUTO-SUBMIT TO SUPABASE
   ALL cardio workouts with distance > 0 are automatically submitted.
   There is no opt-in/opt-out -- every valid workout goes to Supabase.
     |
     v
   SupabaseCompetitionService.submitWorkoutSimple()
     +-- POST to submit-workout Edge Function
     +-- Server validates: distance, duration, anti-cheat flags
     +-- Stored in Supabase workouts table
     +-- Leaderboard rankings update automatically

   Kind 1301 event is created locally for tag structure and signing,
   but is NOT published to Nostr relays. Supabase is the single
   source of truth for competition data.

4. REWARD ELIGIBILITY CHECK
     |
     v
   DailyRewardService.checkRewardEligibility()
     +-- Is this a cardio workout? (running/walking/cycling)
     +-- Was a reward already claimed today?
     +-- Is distance >= 1 km?
     +-- Set @runstr:last_reward_date BEFORE payment (atomic)
     |
     v
   External reward service reads workout from Supabase
     +-- Validates workout authenticity
     +-- Reads reward_destination tag (user or charity)
     +-- Sends 50 sats via LNURL to Lightning address
     +-- Records payment in reward_payments table

5. OPTIONAL: SHARE AS SOCIAL POST
     |
     v
   workoutPublishingService.publishWorkout()
     +-- Create kind 1 Nostr event (social post)
     +-- Generate achievement card image
     +-- Upload card to Blossom
     +-- Publish to relays via GlobalNDKService
     +-- WoT-gated: requires trust score > 0

6. KIND 1301 EVENT STRUCTURE (created locally, submitted to Supabase)
   {
     kind: 1301,
     content: "Running workout - 5.2 km in 30:45",
     tags: [
       ["exercise", "running"],
       ["distance", "5.2", "km"],
       ["duration", "00:30:45"],
       ["calories", "320"],
       ["pace", "5:55", "min/km"],
       ["split", "1", "00:05:42"],
       ["split", "2", "00:05:55"],
       ["team", "als-foundation"],
       ["lightning", "user@getalby.com"],
       ["reward_destination", "user"],
       ["charity", "als-foundation", "ALS Network", "RunningBTC@primal.net"],
       ["client", "RUNSTR"]
     ]
   }
```

## Encrypted Backup System

The app supports encrypted backup and restore of all user data via Nostr kind 30078 events.

```
EXPORT (BackupService)
  |
  v
Collect local data:
  +-- Local workouts (GPS-tracked, manual, imported)
  +-- Step history
  +-- Habits (with streaks)
  +-- Journal entries
  +-- User preferences (unit system, selected charity)
  |
  v
Compress with gzip (NIP-44 has 64KB payload limit)
  |
  v
Encrypt with NIP-44 (self-encryption to user's own pubkey)
  |
  v
Publish kind 30078 to relays (damus, nos.lol, nostr.band)
  Tags: [
    ["d", "runstr-workout-backup"],
    ["client", "RUNSTR", "<version>"],
    ["encrypted", "nip44"],
    ["compression", "gzip"],
    ["backup_version", "1"],
    ["workout_count", "<count>"],
    ["habit_count", "<count>"],
    ["journal_count", "<count>"],
    ["date_range", "<oldest>", "<newest>"]
  ]
  Content: <NIP-44 encrypted + gzipped JSON>

IMPORT (RestoreService)
  |
  v
Fetch kind 30078 from relays (d-tag: "runstr-workout-backup")
  |
  v
Decrypt with NIP-44 using user's private key
  |
  v
Decompress gzip payload
  |
  v
Restore to local storage (workouts, habits, journal, preferences)
```

**Key properties:**
- Only the user can decrypt their backup (NIP-44 self-encryption)
- Tags are public metadata (workout count, date range) but content is fully encrypted
- Kind 30078 is a replaceable parameterized event -- newer backups overwrite older ones
- Works with both nsec (direct) and Amber (external signer)
- Export/Import buttons available in Settings screen

## Additional Features

These features are complete and active in the app but sit outside the four core pillars.

### AI Chat + Journal/Habit Tracker (PPQ.AI)

Claude Haiku 4.5 via PPQ.AI API, pay-per-query via Lightning.

- **AI Chat Coach**: Multi-turn conversational AI with weekly summaries, trend analysis, personalized tips
- **Journal**: Daily entries with mood (5 levels) and energy (1-5 scale), tag support, streak tracking
- **Habits**: Check-in system with streaks (abstinence + positive types), 8 predefined templates + custom

Files: `services/ai/`, `services/journal/`, `services/habits/`, `components/ai/`, `components/coach/`, `components/journal/`, `AIHealthDashboardScreen`

### Music Integration (Wavlake + Blossom)

- **Wavlake**: Stream top tracks, genre browsing, Lightning zaps to artists
- **Blossom**: Personal audio library from Blossom servers
- Full playback controls, queue management, mini player

Files: `services/music/` (10 services), `components/music/` (14 components), `store/musicStore.ts`

### Internationalization

- English + German via i18next
- Device language detection

Files: `i18n/`, `services/i18n/`

### Transparency Dashboard

- Public rewards pool balance and payout breakdown
- Charity payout leaderboard, pending batches
- Period filtering (daily/weekly/monthly/all-time)

Files: `components/rewards/TransparencyDashboardModal.tsx` + 6 sub-components, `services/rewards/RewardsTransparencyService.ts`

### External Wallet Zaps (Nutzap)

- Generate invoices from Lightning addresses
- Deep links to external wallets (Cash App, Strike, etc.)
- Direct charity donations

Files: `components/nutzap/`

### Charity Payment Routing

- Route reward payments to user or charity Lightning address
- Batch accumulation for Geyser.fund addresses (minimum threshold)
- Retry logic for failed payments

Files: `config/charityPayments.ts`, `services/rewards/RewardDestinationService.ts`

## Feature Flags

```
AUTO_COMPETE_FEATURE_ENABLED = false    Auto-publish to Nostr disabled; workouts still auto-submit to Supabase
Kind 33404 team discovery               Disabled in NdkTeamService (returns hardcoded teams for performance)
```

## Reward Payment Flow

```
+-------------------+     +--------------------+     +------------------+
|   RUNSTR App      |     | Supabase Backend   |     | External Reward  |
|                   |     |                    |     | Service          |
+-------------------+     +--------------------+     +------------------+
         |                         |                         |
  User completes workout           |                         |
         |                         |                         |
  Save locally ------------------>  |                         |
         |              submit-workout Edge Function          |
         |                    validates + stores              |
         |                         |                         |
         |                         |    Monitors workouts    |
         |                         |<------------------------|
         |                         |                         |
         |                         |  Reads Lightning addr   |
         |                         |  Reads reward_dest tag  |
         |                         |------------------------>|
         |                         |                         |
         |                         |              Sends sats via LNURL
         |                         |              to user or charity
         |                         |                         |
         |                         |  Records payment        |
         |                         |<------------------------|
         |                         |                         |
  RewardPollingService             |                         |
  polls for new payments           |                         |
         |<------------------------|                         |
         |                                                   |
  Show toast: "You earned 50 sats!"                         |
```

## Competition & Leaderboard Flow

```
+-------------------+     +--------------------+
|   RUNSTR App      |     | Supabase Backend   |
+-------------------+     +--------------------+
         |                         |
  User completes cardio workout    |
         |                         |
  Auto-submit to Supabase          |
         |   submitWorkoutSimple() |
         |------------------------>|  workouts table
         |                         |  updated
         |                         |
         |                         |  Anti-cheat validation:
         |                         |  max speed, impossible
         |                         |  distances, duplicate
         |                         |  detection
         |                         |
  Load leaderboard                 |
         |   useSupabaseLeaderboard|
         |------------------------>|  Query workouts
         |                         |  for event period
         |<------------------------|  Ranked results
         |                         |
  Display:                         |
  #1 Alice  87.1 km  10 runs      |
  #2 Bob    83.1 km   7 runs      |
  #3 Carol  45.0 km  15 runs      |
```

## Team/Charity Selection Flow

```
User opens Teams tab
  |
  v
Load hardcoded charities from constants/charities.ts
  +-- 17 preset organizations with Lightning addresses
  +-- Includes: ALS Network, HRF, Bitcoin Bay, Afribit Kibera, etc.
  +-- Special: PPQ.AI team (rewards go to AI credits, not sats)
  |
  v
User selects charity (e.g., "ALS Network")
  |
  v
Store in AsyncStorage (@runstr:selected_charity_id)
  |
  v
On next workout, charity tag embedded in Supabase submission:
  ["team", "als-foundation"]
  ["charity", "als-foundation", "ALS Network", "RunningBTC@primal.net"]
  |
  v
External reward service reads charity tag
  +-- If reward_destination = "charity" -> pay charity Lightning address
  +-- If reward_destination = "user" -> pay user Lightning address
```

## External Systems

```
+------------------------------------------------------------------+
|                     External Dependencies                         |
+------------------------------------------------------------------+
|                                                                   |
|  NOSTR PROTOCOL                                                   |
|  +------------------------------------------------------------+  |
|  | NDK (@nostr-dev-kit/ndk) - ONLY Nostr library allowed      |  |
|  | 4 Relays: damus, nos.lol, primal, nostr.band               |  |
|  | Event Kinds:                                                |  |
|  |   kind 0     - Profile metadata (read + write)             |  |
|  |   kind 1     - Social posts for workout shares (write)     |  |
|  |   kind 5     - Deletion requests (write)                   |  |
|  |   kind 1301  - Workout structure (local only, NOT          |  |
|  |                published to relays; submitted to Supabase)  |  |
|  |   kind 30078 - Encrypted backup (write, NIP-44)            |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  SUPABASE (PostgreSQL)                                            |
|  +------------------------------------------------------------+  |
|  | Tables:                                                     |  |
|  |   workouts             - Submitted competition workouts     |  |
|  |   event_participants   - Who joined which competition       |  |
|  |   reward_payments      - Verified payment records           |  |
|  |   charity_payments     - Charity donation tracking          |  |
|  |   profiles             - User metadata cache                |  |
|  | Edge Functions:                                             |  |
|  |   submit-workout       - Validate + store workouts          |  |
|  |   claim-reward         - Process reward claims              |  |
|  |   sync-nostr-workouts  - Mirror Nostr data                  |  |
|  |   retry-pending-payments - Retry failed payments            |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  HEALTH PLATFORMS                                                 |
|  +------------------------------------------------------------+  |
|  | Apple HealthKit     - Workouts, steps, heart rate (iOS)     |  |
|  | Google Health Connect - Workouts, steps (Android 14+)       |  |
|  | Garmin Connect      - OAuth + activity import               |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  LIGHTNING NETWORK                                                |
|  +------------------------------------------------------------+  |
|  | LNURL-Pay Protocol  - Reward delivery to Lightning address  |  |
|  | NWC (optional)      - Wallet balance display in-app         |  |
|  | Supported wallets: Alby, Strike, Cash App, WoS, Phoenix    |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  OTHER                                                            |
|  +------------------------------------------------------------+  |
|  | Blossom             - Image upload for achievement cards     |  |
|  | PPQ.ai              - AI models (coach, image generation)   |  |
|  | Wavlake             - Bitcoin-native music streaming         |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
```

## Key Types

```typescript
// Core workout type (src/types/workout.ts)
interface Workout {
  id: string;
  type: 'running' | 'walking' | 'cycling' | 'hiking' |
        'strength' | 'meditation' | 'diet' | 'other';
  source: 'gps_tracker' | 'imported_healthkit' | 'imported_health_connect' |
          'imported_garmin' | 'manual_entry' | 'nostr';
  distance?: number;      // meters
  duration: number;        // seconds
  calories?: number;
  startTime: string;
  endTime: string;
  pace?: number;           // seconds per unit
  splits?: SplitData[];
  elevation?: number;      // meters
}

// User identity (derived from Nostr)
interface User {
  npub: string;            // bech32 public key
  hexPubkey: string;       // hex public key
  name: string;
  picture?: string;
  lud16?: string;          // Lightning address
}

// Competition structure
interface Competition {
  id: string;
  name: string;
  activityType: string;    // running, walking, cycling, mixed
  startDate: string;
  endDate: string;
}

// Leaderboard entry
interface LeaderboardEntry {
  rank: number;
  npub: string;
  name: string;
  score: number;           // distance in km or count
  workoutCount: number;
}
```

## Project File Structure

```
runstr.project/
|
+-- src/
|   +-- App.tsx                    Root component, error boundary, auth check
|   +-- screens/                   Screen components
|   |   +-- ProfileScreen.tsx      Main profile + workout dashboard
|   |   +-- TeamsScreen.tsx        Charity/team browser
|   |   +-- RewardsScreen.tsx      Earnings dashboard
|   |   +-- LoginScreen.tsx        Nostr nsec authentication
|   |   +-- SettingsScreen.tsx     App preferences + backup export/import
|   |   +-- activity/              GPS trackers (running, walking, cycling, etc.)
|   |   +-- events/                Hardcoded event detail screens
|   |   +-- season2/               Season II competition
|   |   +-- routes/                Saved GPS routes
|   |
|   +-- components/                Reusable UI (<500 lines each)
|   |   +-- ui/                    Card, Button, Avatar, BottomNavigation
|   |   +-- activity/              Workout cards, step rings, hold-to-start
|   |   +-- profile/               Profile header, workout tabs, workout cards
|   |   +-- rewards/               Reward cards, earnings display, transparency
|   |   +-- team/                  Team cards, charity section
|   |   +-- compete/               Leaderboard content
|   |   +-- coach/                 AI coaching components
|   |   +-- backup/                Backup export/import UI
|   |   +-- routes/                Route selection modal
|   |
|   +-- services/                  Services across domains
|   |   +-- nostr/                 GlobalNDKService, profiles, publishing
|   |   +-- fitness/               Workout storage, health integrations
|   |   +-- activity/              GPS tracking, step counting, metrics
|   |   +-- rewards/               Daily rewards, paused step-reward pipeline, Lightning
|   |   +-- competition/           Leaderboards, Supabase competition ops
|   |   +-- backend/               Supabase operations
|   |   +-- backup/                Encrypted backup (kind 30078, NIP-44)
|   |   +-- cache/                 Multi-layer caching system
|   |   +-- auth/                  Authentication providers
|   |   +-- verification/          Anti-cheat, workout verification
|   |   +-- challenge/             Hardcoded challenges
|   |   +-- ai/                    PPQ.ai integration
|   |   +-- core/                  App initialization, state management
|   |   +-- i18n/                  Internationalization
|   |
|   +-- navigation/                App navigation configuration
|   |   +-- AppNavigator.tsx       Legacy: Login screen only (runtime nav is in App.tsx)
|   |   +-- BottomTabNavigator.tsx 3-tab navigation
|   |   +-- screenConfigurations.ts Screen options and transitions
|   |   +-- navigationHandlers.ts  Shared navigation callbacks
|   |
|   +-- contexts/                  React Context providers
|   |   +-- AuthContext.tsx         (provided at App.tsx level -- not a file)
|   |   +-- NavigationDataContext.tsx  Data prefetching context
|   |
|   +-- store/                     Zustand state stores
|   |   +-- walletStore.ts         NWC wallet state
|   |   +-- userStore.ts           User preferences
|   |   +-- teamStore.ts           Team membership
|   |   +-- musicStore.ts          Music playback
|   |
|   +-- types/                     TypeScript definitions
|   |   +-- workout.ts             Workout, WorkoutType, WorkoutSource
|   |   +-- season2.ts             Competition types
|   |   +-- transparencyDashboard.ts  Reward transparency types
|   |
|   +-- constants/                 Hardcoded configuration
|   |   +-- appConstants.ts        Feature flags
|   |   +-- charities.ts           17 charity definitions + Lightning addresses
|   |   +-- season2.ts             Season II config
|   |   +-- einundzwanzig.ts       Challenge configs
|   |
|   +-- utils/                     Helper functions
|   |   +-- nostr.ts               npub/hex conversion
|   |   +-- supabase.ts            Supabase client
|   |   +-- distanceFormatter.ts   km/mi formatting
|   |   +-- KalmanFilter.ts        GPS smoothing
|   |   +-- PerformanceLogger.ts   Startup timing
|   |
|   +-- styles/                    Theme system (dark theme)
|   +-- i18n/                      Translation files
|
+-- supabase/
|   +-- functions/                 Edge Functions (server-side)
|   |   +-- submit-workout/        Validate + store workouts
|   |   +-- claim-reward/          Process reward claims
|   |   +-- sync-nostr-workouts/   Mirror Nostr workout data
|   |   +-- retry-pending-payments/ Retry failed Lightning payments
|   +-- migrations/                Database schema (125+ migrations)
|
+-- ios/                           iOS native project (Xcode)
+-- android/                       Android native project (Gradle)
+-- book/                          Product documentation (16 chapters)
+-- docs/                          Technical documentation
+-- scripts/                       Build and diagnostic scripts
+-- assets/                        Images, fonts, charity logos
```

## Architectural Principles

1. **File size limit: 500 lines** -- Split anything larger into focused modules
2. **Global NDK singleton** -- One NDK instance, 3 active default relay connections, used everywhere
3. **Local-first** -- Save to AsyncStorage immediately, sync to backend in background
4. **Cache-first rendering** -- Show cached data instantly, refresh in background
5. **Silent reward failures** -- Rewards never block workout saving or user flow
6. **Cardio focus** -- Running, walking, cycling are core; strength/diet/meditation are experimental
7. **Teams = Charities** -- Not social groups; selecting a team means supporting a charity. Charities are hardcoded in `constants/charities.ts`
8. **Supabase for competitions** -- Nostr for identity/social/backup, Supabase for leaderboards/payments
9. **NDK-first runtime** -- Global NDK is the required relay/query backbone; `nostr-tools` still exists in helper/legacy paths, but avoid adding new non-NDK runtime relay flows
10. **Optimistic updates** -- Update local state before backend confirms, for instant UX

## Supported Charities

17 charities hardcoded in `src/constants/charities.ts` with Lightning addresses for direct zaps and reward routing:

| Charity | Lightning Address |
|---------|-------------------|
| PPQ.AI | *(bolt11 invoices -- AI credits)* |
| ALS Network | RunningBTC@primal.net |
| Ashigaru | ashigarufund@geyser.fund |
| Bitcoin Bay | sats@donate.bitcoinbay.foundation |
| Bitcoin Ekasi | bitcoinekasi@primal.net |
| Bitcoin Isla | BTCIsla@primal.net |
| Bitcoin District | bdi@strike.me |
| Bitcoin Yucatan | bitcoinyucatancommunity@geyser.fund |
| Bitcoin Veterans | opbitcoin@strike.me |
| Bitcoin Makueni | rosechicken19@primal.net |
| Bitcoin House Bali | btchousebali@walletofsatoshi.com |
| Human Rights Foundation | nostr@btcpay.hrf.org |
| RUNSTR | thewildhustle@strike.me |
| Afribit Kibera | afribit@blink.sv |
| Bitcoin Basin | plasticbowl87@walletofsatoshi.com |
| BuhoGO | buho@lnbits.de |
| Central PA Bitcoiners | businesscat@getalby.com |
| WeSatoshi | thefirstbitcointerminalhardware@geyser.fund |

## Nostr Event Kinds Reference

| Kind | Direction | Purpose |
|------|-----------|---------|
| 0 | Read + Write | Profile metadata (name, picture, lud16) |
| 1 | Write (WoT-gated) | Social posts for workout shares |
| 5 | Write | Deletion requests |
| 1301 | Local only | Workout event structure (submitted to Supabase, NOT published to relays) |
| 30078 | Write | Encrypted backup (NIP-44 self-encryption, gzip compressed) |
