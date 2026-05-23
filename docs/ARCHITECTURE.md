# RUNSTR Architecture

> **For product identity and direction, see [North Star.md](./North%20Star.md)**

## System Overview

```
+------------------------------------------------------------------+
|                         RUNSTR App                                |
|                                                                   |
|  React Native (Expo) + TypeScript                                |
|                                                                   |
|  +-----------+  +----------+  +---------+                        |
|  | Profile   |  | Social   |  | Events  |   <- 3 Bottom Tabs     |
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
(Tap "Start" for     |
anonymous use, or    +---> GlobalNDKService.initialize()  (4 relay connections)
"Advanced" to log    +---> Load profile from cache/Nostr  (kind 0)
in with nsec/Amber)  +---> Prefetch destinations, competitions
  |                  +---> Start step counter
  v                  +---> Register background health sync
MainTabs                |
                     BottomTabNavigator
                        |
                     3 Tabs ready
```

## Navigation Architecture

The runtime navigator is `AuthenticatedNavigator` defined inline in `App.tsx`.
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
                                +-- Main (authenticated, via AuthenticatedNavigator)
                                |    |
                                |    +-- BottomTabNavigator
                                |         |
                                |         +-- Home Tab    (eager load)
                                |         +-- Social Tab  (React.lazy)
                                |         +-- History Tab (React.lazy; RewardHistoryScreen)
                                |
                                +-- Modal Screens (~21 reachable)
                                     |
                                     +-- Activity Tracking
                                     |    +-- ActivityTrackerScreen (SwipeGridNavigator
                                     |    |     for cardio only: Run/Walk/Cycle/Hike)
                                     |    +-- StepsDisplayScreen
                                     |    +-- ManualEntryScreen
                                     |
                                     +-- Competition Screens
                                     |    +-- Season2Screen
                                     |    +-- Season3Screen
                                     |    +-- CompeteScreen
                                     |    +-- LeaderboardsScreen
                                     |    +-- EinundzwanzigDetailScreen
                                     |    +-- DynamicEventDetailScreen
                                     |
                                     +-- Fitness Club Screens
                                     |    +-- ClubsScreen (browse/join clubs)
                                     |    +-- ClubPageScreen (club detail + chat)
                                     |    +-- CaptainDashboardScreen
                                     |
                                     +-- User/Settings Screens
                                          +-- SettingsScreen
                                          +-- ProfileEditScreen
                                          +-- WorkoutHistoryScreen
                                          +-- AdvancedAnalyticsScreen
                                          +-- LevelDetailScreen
                                          +-- WalletScreen
                                          +-- RewardsScreen
                                          +-- WalletScreen
                                          +-- JournalHistoryScreen
                                          +-- HelpSupportScreen
                                          +-- ContactSupportScreen
                                          +-- PrivacyPolicyScreen
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
|  |   user, destinations, competitions, |  |
|  |   wallet, prefetched data           |  |
|  +------------------------------------+  |
|                                          |
|  Zustand Stores (client state)           |
|  +------------------------------------+  |
|  | walletStore  - NWC balance, txns    |  |
|  | userStore    - preferences, dest    |  |
|  | teamStore    - club membership      |  |
|  | musicStore   - Wavlake playback     |  |
|  +------------------------------------+  |
|                                          |
|  AsyncStorage (persistent)               |
|  +------------------------------------+  |
|  | @runstr:user_nsec                   |  |
|  | @runstr:npub                        |  |
|  | @runstr:hex_pubkey                  |  |
|  | @runstr:selected_team_id            |  |
|  | @runstr:reward_lightning_address    |  |
|  | @runstr:last_reward_date            |  |
|  | @runstr:total_rewards_earned        |  |
|  | @runstr:club_id                     |  |
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

Services are organized by domain under `src/services/`. Each service is a singleton or static class. Key principle: **services never import screens or components** — data flows up via contexts, stores, and callbacks.

### Nostr Services (Identity Layer)

Nostr is the invisible identity layer. Users never see "Nostr" in the UI.

```
GlobalNDKService (SINGLETON - one NDK instance for entire app)
  |
  |  4 WebSocket connections to relays:
  |    wss://relay.damus.io
  |    wss://nos.lol
  |    wss://relay.primal.net
  |    wss://relay.nostr.band
  |
  +---> NostrProfileService        (fetch kind 0 profiles — read)
  +---> NostrProfilePublisher      (update profile metadata — write)
  +---> workoutPublishingService   (submit workouts to Supabase, optional kind 1 social posts)
  +---> NostrSubscriptionManager   (real-time event subscriptions)
```

**Rule:** ALL Nostr access goes through `GlobalNDKService.getInstance()`. Never create new NDK or relay manager instances.

### Backup Services

```
BackupService (kind 30078 encrypted export)
  +-- Collects: workouts, step history, habits, journal, preferences
  +-- Compresses with gzip (NIP-44 has 64KB limit)
  +-- Encrypts with NIP-44 self-encryption (user's own pubkey)
  +-- Publishes kind 30078 to relays (damus, nos.lol, nostr.band)
  +-- Auto-triggers after each workout save

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

Health Integrations (Background Sync):
  healthKitService             Apple HealthKit (iOS)
  HealthKitBackgroundService   Background delivery — wakes app on new workouts
  HealthKitBackgroundTask      Registered at boot, runs before app initializes
  healthConnectService         Google Health Connect (Android)
  AndroidBackgroundSyncTask    15-minute periodic sync via WorkManager
  BackgroundSyncRegistration   Register/unregister on login/logout
  garminAuthService            Garmin OAuth
  garminActivityService        Garmin workout import
```

### Rewards Services

```
Reward Flow:
  DailyRewardService           Reward eligibility tracking (one per day)
  SupabaseRewardService        Query verified payments from DB
  RewardPollingService         Poll for confirmed payments
  RewardNotificationManager    Push/toast notifications

Note: Actual reward PAYMENTS are processed by an external service
("runstr-zapper") that monitors Supabase, not by the app itself.
The app tracks eligibility and displays results. Rewards are sent
to the user's lightning address (defaulting to their Nostr lud16).
```

### Club Services

```
Fitness Clubs (Supabase-backed):
  ClubService                  CRUD operations on user_teams table
  ClubMembershipService        Join/leave clubs, role management (member/captain)
  ClubChatService              Real-time chat via Supabase Realtime
  ClubWalletService            Club-level wallet management
```

### Competition & Leaderboard Services

```
Competition Management (ALL Supabase-based at runtime):
  SupabaseCompetitionService     Submit workouts, query leaderboards
  DailyLeaderboardService        Built-in daily leaderboards (5K/10K/Half/Marathon/Steps)
  StepCompetitionService         Step-based competitions
  PendingSubmissionService       Retry failed Supabase submissions
  LeaderboardBaselineService     Pre-compute baselines for long events
  AutoJoinService                Auto-join matching competitions on workout submit

Hardcoded Events:
  EinundzwanzigService           Einundzwanzig challenge

Direction: Moving toward user-created competitions via Fitness Clubs.
Daily leaderboard stays built-in.
```

### Lightning Address

```
  Reward payout address.
  If user's Nostr profile has a lud16, that's the default.
  Otherwise stored in AsyncStorage (@runstr:reward_lightning_address).
  Read by the external runstr-zapper service when paying out.
```

### Auth & Identity Services

```
  authService                  Login/logout, key management
  SecureNsecStorage            Secure nsec storage in device keychain
  UnifiedSigningService        Unified signing across providers (nsec, Amber)
  directNostrProfileService    Fetch profiles directly from Nostr
  VerificationService          Per-workout anti-cheat verification
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
    Sponsors:     30 minutes
```

## Workout Lifecycle

This is the most important data flow in the app.

```
1. USER STARTS WORKOUT
   ProfileScreen -> "Start Workout" button
     |
     v
   ActivityTrackerScreen (SwipeGridNavigator: cardio only — Run/Walk/Cycle/Hike)
     |
     v
   SimpleRunTracker.startTracking() [for cardio]
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
     |
     v
   SupabaseCompetitionService.submitWorkoutSimple()
     +-- POST to submit-workout Edge Function
     +-- Server validates: distance, duration, anti-cheat flags
     +-- Stored in Supabase workouts table
     +-- Leaderboard rankings update automatically
     +-- Database trigger fires claim-reward Edge Function

   Kind 1301 event is created locally for tag structure and signing,
   but is NOT published to Nostr relays. Supabase is the single
   source of truth for competition data.

4. REWARD AUTO-TRIGGERED
     |
     v
   Database trigger on workout_submissions INSERT:
     +-- Reads reward destination tag (user, charity, project, or service)
     +-- Reads Lightning address from tags
     +-- Calls claim-reward Edge Function
     +-- Sends reward via LNURL to destination's address
     +-- Records payment in reward_payments table

5. BACKGROUND SYNC PATH (No App Interaction Required)
     |
     v
   User works out with ANY HealthKit/Health Connect app
     +-- iOS: HealthKit background delivery wakes RUNSTR
     +-- Android: 15-minute periodic sync via WorkManager
     +-- Fetch recent workouts from health platform
     +-- Auto-submit to Supabase
     +-- Auto-join matching competitions
     +-- Reward auto-triggered via same database trigger

6. OPTIONAL: SHARE AS SOCIAL POST
     |
     v
   workoutPublishingService.publishWorkout()
     +-- Create kind 1 Nostr event (social post)
     +-- Generate achievement card image
     +-- Upload card to Blossom
     +-- Publish to relays via GlobalNDKService

7. KIND 1301 EVENT STRUCTURE (created locally, submitted to Supabase)
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
       ["lightning", "user@getalby.com"],
       ["client", "RUNSTR"]
     ]
   }
```

## Encrypted Backup System

```
EXPORT (BackupService — auto-triggers after each workout)
  |
  v
Collect local data:
  +-- Local workouts (GPS-tracked, manual, imported)
  +-- Step history
  +-- Habits (with streaks)
  +-- Journal entries
  +-- User preferences (unit system, selected destination)
  |
  v
Compress with gzip (NIP-44 has 64KB payload limit)
  |
  v
Encrypt with NIP-44 (self-encryption to user's own pubkey)
  |
  v
Publish kind 30078 to relays (damus, nos.lol, nostr.band)
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
- Kind 30078 is a replaceable parameterized event — newer backups overwrite older ones
- Works with both nsec (direct) and Amber (external signer)
- Auto-backup after every workout save

## Additional Features

### Internationalization

- English + German via i18next
- Device language detection

## Reward Payment Flow

```
+-------------------+     +--------------------+     +------------------+
|   RUNSTR App      |     | Supabase Backend   |     | runstr-zapper    |
|                   |     |                    |     | (external)       |
+-------------------+     +--------------------+     +------------------+
         |                         |                         |
  User completes workout           |                         |
  (or background sync)             |                         |
         |                         |                         |
  Save locally ------------------>  |                         |
         |              submit-workout Edge Function          |
         |                    validates + stores              |
         |                         |                         |
         |                         |  zapper polls workouts  |
         |                         |<------------------------|
         |                         |                         |
         |                         |              Reads user's lud16
         |                         |              Sends reward via LNURL
         |                         |                         |
         |                         |  Records payment        |
         |                         |<------------------------|
         |                         |                         |
  RewardPollingService             |                         |
  polls for new payments           |                         |
         |<------------------------|                         |
         |                                                   |
  Push notification when reward lands                        |
```

## Competition & Leaderboard Flow

```
+-------------------+     +--------------------+
|   RUNSTR App      |     | Supabase Backend   |
+-------------------+     +--------------------+
         |                         |
  Workout submitted                |
  (GPS, health sync, or manual)    |
         |                         |
  Auto-submit to Supabase          |
         |   submitWorkoutSimple() |
         |------------------------>|  workouts table
         |                         |  updated
         |                         |
         |                         |  Anti-cheat validation:
         |                         |  pace limits, impossible
         |                         |  distances, duplicate
         |                         |  detection
         |                         |
  Load leaderboard                 |
         |   useSupabaseLeaderboard|
         |------------------------>|  Query workouts
         |                         |  for event period
         |<------------------------|  Ranked results
         |                         |
  Display daily leaderboard:       |
  5K:    #1 Alice  18:42           |
  10K:   #1 Bob    41:15           |
  Steps: #1 Carol  12,450          |
```

## External Systems

```
+------------------------------------------------------------------+
|                     External Dependencies                         |
+------------------------------------------------------------------+
|                                                                   |
|  NOSTR PROTOCOL (Identity Layer — invisible to users)             |
|  +------------------------------------------------------------+  |
|  | NDK (@nostr-dev-kit/ndk) - ONLY Nostr library allowed      |  |
|  | 4 Relays: damus, nos.lol, primal, nostr.band               |  |
|  | Event Kinds:                                                |  |
|  |   kind 0     - Profile metadata (read + write)             |  |
|  |   kind 1     - Social posts for workout shares (write)     |  |
|  |   kind 1301  - Workout structure (local only, NOT          |  |
|  |                published to relays; submitted to Supabase)  |  |
|  |   kind 30078 - Encrypted backup (write, NIP-44)            |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  SUPABASE (Primary Data Store)                                    |
|  +------------------------------------------------------------+  |
|  | Tables:                                                     |  |
|  |   workout_submissions  - Submitted workouts                 |  |
|  |   competitions         - Events and competitions            |  |
|  |   reward_payments      - Verified payment records           |  |
|  |   reward_sponsors      - Active sponsor configuration       |  |
|  |   user_teams           - Fitness Clubs                      |  |
|  |   club_memberships     - Club member/captain roles          |  |
|  |   club_messages        - Club chat messages                 |  |
|  |   profiles             - User metadata cache                |  |
|  | Edge Functions:                                             |  |
|  |   submit-workout       - Validate + store workouts          |  |
|  |   claim-reward         - Process reward claims              |  |
|  |   manage-club          - Club CRUD operations               |  |
|  |   manage-competition   - Club event creation                |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  HEALTH PLATFORMS (Background Sync)                               |
|  +------------------------------------------------------------+  |
|  | Apple HealthKit     - Background delivery on new workouts   |  |
|  | Google Health Connect - 15-min periodic sync                |  |
|  | Garmin Connect      - OAuth + activity import               |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  REWARD DELIVERY                                                  |
|  +------------------------------------------------------------+  |
|  | LNURL-Pay Protocol  - Sends rewards to user's lud16         |  |
|  | runstr-zapper       - External service, polls Supabase      |  |
|  | Supported wallets: Alby, Strike, Cash App, WoS, Phoenix    |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  OTHER                                                            |
|  +------------------------------------------------------------+  |
|  | Blossom             - Image upload for achievement cards     |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
```

## Key Types

```typescript
// Core workout type (src/types/workout.ts)
interface Workout {
  id: string;
  type: 'running' | 'walking' | 'cycling' | 'hiking';
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
  lud16?: string;          // Lightning address (for reward delivery)
}

// Fitness Club
interface Club {
  id: string;
  name: string;
  description: string | null;
  lightning_address: string | null;
  created_by_npub: string;     // Captain
  member_count: number;
  is_active: boolean;
  leaderboard_metric: 'distance' | 'steps';
}

// Competition structure
interface Competition {
  id: string;
  name: string;
  activityType: string;    // running, walking, cycling, mixed
  startDate: string;
  endDate: string;
  scoringType: 'fastest_time' | 'total_distance' | 'completion' | 'total_steps';
}
```

## Architectural Principles

1. **File size limit: 500 lines** — Split anything larger into focused modules
2. **Global NDK singleton** — One NDK instance, 4 relay connections, used everywhere
3. **Supabase is the data store** — Workouts, competitions, leaderboards, rewards, clubs, chat
4. **Nostr is the identity layer** — Authentication, profiles, optional social sharing, backups
5. **Local-first** — Save to AsyncStorage immediately, sync to backend in background
6. **Cache-first rendering** — Show cached data instantly, refresh in background
7. **Background-first** — Most users earn via HealthKit/Health Connect sync, not in-app tracking
8. **Silent reward failures** — Rewards never block workout saving or user flow
9. **Lightning-address-routed rewards** — Rewards go to the user's lightning address (Nostr lud16 by default)
10. **NDK only** — Never use nostr-tools; NDK handles all Nostr operations
11. **Terminology** — Use "rewards" not "sats/Bitcoin"; see [North Star.md](./North%20Star.md)

## Nostr Event Kinds Reference

| Kind | Direction | Purpose |
|------|-----------|---------|
| 0 | Read + Write | Profile metadata (name, picture, lud16) |
| 1 | Write (optional) | Social posts for workout shares |
| 1301 | Local only | Workout event structure (submitted to Supabase, NOT published to relays) |
| 30078 | Write | Encrypted backup (NIP-44 self-encryption, gzip compressed) |
