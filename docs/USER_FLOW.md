# RUNSTR User Flow — Complete Interaction Map

> **Purpose**: Documents every user interaction from the user's perspective — what they see, what they tap, what happens next. Complements CLAUDE.md (developer context) and ARCHITECTURE.md (system design).
> **For product identity and direction, see [North Star.md](./North%20Star.md)** (in docs/)

---

## 1. Authentication Flow (Anonymous-First)

### First Launch
1. **LoginScreen** appears (dark theme, RUNSTR logo)
2. User taps **"Start"** — enters the app immediately, no login required
3. Experience is the same whether logged in or not

### Optional Login (Advanced)
1. Tap **"Advanced"** toggle on LoginScreen
2. Three login options:
   - **Enter nsec**: Paste existing key (presented as "Password") → derives npub → imports kind 0 profile from relays
   - **Create New Identity**: Generates new keypair via `NDKPrivateKeySigner.generate()`
   - **Amber (Android only)**: External signer app handles key management
3. On success: nsec stored in SecureStore, npub + hex pubkey in AsyncStorage

### First-Time Setup
1. **WelcomePermissionModal** appears after first entry
2. Requests location permission (required for GPS workout tracking)
3. On grant → navigates to Profile tab (home screen)

### Session Persistence
- On subsequent launches, app checks AsyncStorage for `@runstr:npub`
- If found → skip login, go straight to Profile tab
- If not found → show LoginScreen with "Start" button

---

## 2. Three-Tab Navigation

The app uses a bottom tab bar with three tabs. Profile is the default/home tab.

### Profile Tab (Default)
- **Profile card** at top: avatar, display name, npub, bio (tap → ProfileEditScreen)
- **Three action buttons**:
  - **Start Workout** → ActivityTrackerScreen (GPS tracking)
  - **View History** → WorkoutHistoryScreen (past workouts)
  - **Join Events** → LeaderboardsScreen (competitions)
- **Settings gear icon** (top right) → SettingsScreen
- **Music controls**: ProfileMusicBar for Wavlake/Blossom playback (if enabled in Settings)

### Social Tab
- **Social feed**: Fitness-first feed pulling workout posts from Nostr. Like, repost, comment.
- **Clubs row**: Horizontal list of Fitness Clubs. Tap to browse, join, or view club pages.
- **Tap a club** → ClubPageScreen (member leaderboard, chat, events)

### Leaderboard Tab
- **Daily Leaderboards**: 5K, 10K, Half Marathon, Marathon, Steps — always active
- **Club Events**: Captain-created events; all club members auto-entered

---

## 3. Workout Flow (GPS Tracking)

### Starting a Workout
1. Tap **Start Workout** on Profile tab → ActivityTrackerScreen
2. **SwipeGridNavigator** presents the four cardio activities (swipe to navigate):

| Col 0 | Col 1 | Col 2 | Col 3 |
|---|---|---|---|
| Run | Walk | Cycle | Hiking |

3. Swipe left/right to change activity
4. Default position determined by user's preferred activity (from Settings)

### During a Workout (Cardio)
- GPS tracking via `SimpleRunTracker` (expo-location background mode)
- Real-time metrics displayed: distance, pace, elevation, split times
- `SplitTrackingService` records per-km/mi splits
- `TTSAnnouncementService` provides voice updates (if enabled in Settings)
- **HoldToStartButton**: Long-press to start, tap to pause/resume

### Stopping a Workout
1. Stop button → **WorkoutSummaryModal** appears
2. Summary shows: distance, duration, pace, elevation, splits, calories
3. User can:
   - **Save** → stores locally via `LocalWorkoutStorageService.saveWorkout()`
   - **Discard** → returns to tracker without saving

### What Happens on Save
All of the following happen automatically after save:

1. **Local storage**: Workout saved to AsyncStorage as `LocalWorkout`
2. **Reward check** (fire-and-forget): `DailyRewardService.checkStreakAndReward()` — tracks reward eligibility locally
3. **Supabase auto-submit** (fire-and-forget): ALL cardio workouts with distance > 0 are submitted to `workout_submissions` table via `SupabaseCompetitionService.submitWorkoutSimple()`
4. **Auto-backup** (fire-and-forget): Encrypted backup to Nostr (kind 30078)
5. **Optional social share**: If user taps Share, opens `EnhancedSocialShareModal` → publishes kind 1 social post with workout achievement card

### Important: Kind 1301 Events Are NOT Published to Nostr
Kind 1301 events are created locally for event structure and signing but are **never published to Nostr relays**. All workout data goes through Supabase.

---

## 4. Background Sync Flow (Passive Earning)

### How Users Earn Without Opening the App

**iOS:**
1. User works out with any HealthKit-connected app (Strava, Nike Run Club, Apple Watch, etc.)
2. Workout syncs to Apple Health
3. HealthKit background delivery wakes RUNSTR
4. `HealthKitBackgroundService` fetches recent workouts
5. Filters for cardio (running, walking, cycling, hiking)
6. Auto-submits to Supabase
7. Database trigger fires reward claim
8. User auto-joined to matching competitions

**Android:**
1. User works out with any Health Connect-connected app
2. `AndroidBackgroundSyncTask` runs every 15 minutes via WorkManager
3. Fetches recent workouts from Health Connect
4. Same submit → reward → competition flow as iOS

### Step Count Sync
- Steps are synced automatically during background sync
- Submitted as walking workouts with step tags
- Count toward daily step leaderboard
- One step submission per day (deduplicated by date)

### Private Mode Override
If user enables Private Mode in Settings:
- NO data submitted to Supabase
- NO rewards claimed
- Workouts stay local only

---

## 5. Reward Flow

### Overview
Users earn rewards for qualifying workouts. Rewards are funded by sponsors and sent to the user's chosen destination.

### Trigger
Two paths:
1. **In-app**: `LocalWorkoutStorageService.saveWorkout()` → auto-submit to Supabase → DB trigger
2. **Background sync**: HealthKit/Health Connect → auto-submit to Supabase → DB trigger

### Eligibility Rules
1. Activity must be cardio: running, walking, cycling, or hiking
2. Distance > 0
3. Passes anti-cheat validation (pace limits, distance limits)
4. One reward per day per user (deduplicated)

### Reward Routing (Lightning Address)
Rewards are sent via LNURL to the user's lightning address. If the user's Nostr profile has a lud16, RUNSTR uses that automatically. Otherwise the user pastes one into Settings. There's no destination picker, no charity routing, no splits.

### Actual Payment (External, Async)
1. Workout submitted to Supabase `workout_submissions` table
2. External runstr-zapper service picks up the submission
3. Reads the user's lightning address from their profile
4. Sends reward via LNURL to that address
5. Records payment in `reward_payments` table with preimage proof

### User Notification
- Push notification when a reward lands
- `RewardPollingService` also polls `reward_payments` for in-app toast notifications

---

## 6. Event Flow

### Daily Leaderboard (Built-In, Permanent)
- Always active — no joining required
- Five boards: 5K, 10K, Half Marathon, Marathon (fastest time), Daily Steps (highest count)
- Top 25 shown with user's personal position below
- Queried from Supabase `workout_submissions` for today's date

### Club Events
- Captains create events from templates (5K, 10K, Half Marathon, Step Challenge)
- All club members auto-entered
- Duration: 1 day (24 hours)
- Max 3 active events per captain

### How Workouts Count
- ALL cardio workouts auto-submit to Supabase
- Qualifying workouts count toward whatever leaderboards or events the user is in
- Background synced workouts count too — no need to open the app

### Anti-Cheat
- Pace limits (reject impossibly fast workouts)
- Distance limits per session
- Split consistency checks
- Flagged workouts stored but excluded from leaderboards

---

## 7. Fitness Club Flow

### Joining a Club
1. Navigate to Social tab → tap a club from the clubs row
2. Browse or search available clubs
3. Tap a club → ClubPageScreen
4. Tap Join → `ClubMembershipService.joinClub()`
5. 7-day cooldown before leaving/switching

### Club Page Features
- **Members tab**: Leaderboard ranked by distance or steps
- **Chat tab**: Real-time messages via Supabase Realtime (5 messages/60s rate limit)
- **Events tab**: Active, upcoming, and past club competitions

### Creating a Club
1. Tap Create button on Clubs screen
2. SimpleTeamCreationModal form (name, description, Lightning address)
4. Submitted to `manage-club` Edge Function
5. Creator becomes captain, auto-joined

### Captain Dashboard
- Member analytics (weekly/all-time activity)
- Earnings tracking (rewards earned by club members)
- Event management (create, edit, cancel)

---

## 8. Lightning Address Setup

### Default
If the user logged in with Nostr and their profile has a lud16, RUNSTR uses that address automatically. The user never has to interact with this section.

### Manual Setup
- Profile tab → Settings → Lightning Address
- Paste a lightning address (e.g. `you@getalby.com`) → saved to AsyncStorage
- Or connect an NWC wallet (scan QR or paste connection string)

All future rewards route to that address.

---

## 9. Encrypted Backup

### Auto-Backup
After every workout save, `BackupService` auto-exports to Nostr.

### Manual Export/Import
Settings → Export Data / Import Data

### Export Flow
1. `BackupService` collects: workouts, habits, journal entries, preferences
2. Compress data (gzip)
3. Encrypt with NIP-44 self-encryption (user's own keys)
4. Publish as kind 30078 replaceable event to Nostr relays

### Import Flow
1. `RestoreService` fetches kind 30078 event from Nostr relays
2. Decrypt with user's keys (NIP-44)
3. Decompress (gzip)
4. Restore all data to local AsyncStorage

---

## 10. Settings

Accessible via gear icon on Profile tab → SettingsScreen.

| Setting | Options |
|---|---|
| Language | EN, DE |
| Voice Announcements | Enable/disable, split details, live splits |
| Distance Units | km / mi |
| Default Activity | Running, Walking, Cycling, Hiking |
| Lightning Address | Reward payout address (defaults to Nostr lud16) |
| Private Mode | Toggle — disables all Supabase submission |
| Export Data | Encrypted backup to Nostr |
| Import Data | Restore from encrypted backup |
| Backup Password | Copy nsec with security warnings |
| Sign Out | Clears local auth data |
| Delete Account | Removes all local data |

---

## Appendix: Data Flow Summary

```
User works out (in-app GPS or external app via health sync)
  |
  +--> LocalWorkoutStorageService.saveWorkout() [if in-app]
  |    OR
  +--> HealthKitBackgroundService / AndroidBackgroundSyncTask [if external]
  |
  +--> SupabaseCompetitionService.submitWorkoutSimple()
  |      +-- INSERT into workout_submissions table
  |      +-- Anti-cheat validation
  |
  +--> External runstr-zapper service:
  |      +-- Read user's lightning address from profile
  |      +-- Send reward via LNURL to that address
  |      +-- Record in reward_payments table
  |
  +--> Push notification when reward lands
  |
  +--> Auto-backup to Nostr (kind 30078, encrypted)
```
