# RUNSTR User Flow — Complete Interaction Map

> **Purpose**: Documents every user interaction from the user's perspective — what they see, what they tap, what happens next. Complements CLAUDE.md (developer context) and ARCHITECTURE.md (system design).

---

## 1. Authentication Flow

### First Launch
1. **LoginScreen** appears (dark theme, RUNSTR logo)
2. User has three options:
   - **Enter nsec**: Paste existing Nostr private key → derives npub → imports kind 0 profile from relays
   - **Create New Identity**: Generates new keypair via `NDKPrivateKeySigner.generate()` → user gets fresh npub
   - **Amber (Android only)**: External signer app handles key management
3. On success: nsec stored in SecureStore, npub + hex pubkey in AsyncStorage

### First-Time Setup
1. **WelcomePermissionModal** appears after first login
2. Requests location permission (required for GPS workout tracking)
3. On grant → navigates to Profile tab (home screen)

### Session Persistence
- On subsequent launches, app checks AsyncStorage for `@runstr:npub`
- If found → skip login, go straight to Profile tab
- If not found → show LoginScreen

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
- **Music controls** (WoT-gated): ProfileMusicBar for Wavlake/Blossom playback, visible only if user has WoT score > 0 and music enabled in Settings

### Teams Tab
- **Current team card**: Shows selected charity with zap button
- **17 charities** listed alphabetically (hardcoded in `src/constants/charities.ts`)
- **Tap a charity** → selects it as your team → saves to AsyncStorage
- **Zap button** → ExternalZapModal (generates Lightning invoice + QR code for any Lightning wallet)
- **PPQ.AI special case**: Selecting PPQ.AI as team → PPQAccountSetupModal (creates AI credit account paid via Lightning)

### Rewards Tab
- **Rewards Pool card** (tappable → TransparencyDashboardModal showing global reward distribution data)
- **EarningsHeroCard** (if Lightning address set): Shows total sats earned, weekly earnings
- **ImpactHeroCard** (if no Lightning address): Shows Impact Level XP, charity contribution stats
- **Your Team card**: Current charity with zap button
- **How It Works**: Explainer section for new users

---

## 3. Workout Flow (GPS Tracking)

### Starting a Workout
1. Tap **Start Workout** on Profile tab → ActivityTrackerScreen
2. **SwipeGridNavigator** presents a 2D grid of activities (swipe to navigate):

| | Column 0 | Column 1 | Column 2 | Column 3 |
|---|---|---|---|---|
| **Row 0 (Cardio)** | Running | Walking | Cycling | Hiking |
| **Row 1 (Strength)** | Pushups | Pullups | Situps | Squats |
| **Row 2 (Wellness)** | Meditation | Breathwork | Body Scan | Gratitude |

3. Swipe left/right to change activity within a category
4. Swipe up/down to change category
5. Default position determined by user's preferred activity (from Settings)

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
3. **Supabase auto-submit** (fire-and-forget): ALL cardio workouts (running, walking, cycling, hiking) with distance > 0 are submitted to `workout_submissions` table via `SupabaseCompetitionService.submitWorkoutSimple()`
4. **Optional social share**: If user taps Share, opens `EnhancedSocialShareModal` → publishes kind 1 social post with workout achievement card (WoT-gated: requires trust score > 0)

### Important: Kind 1301 Events Are NOT Published to Nostr
Despite the name "workout publishing service," kind 1301 events are created locally for event structure and signing but are **never published to Nostr relays**. All backend workout tracking goes through Supabase, not Nostr.

---

## 4. Steps Flow

### No Dedicated Steps Screen
Steps are **not** a separate screen. They appear as a persistent header on ALL activity tracker screens.

### What the User Sees
- **Header text** on ActivityTrackerScreen: `"{steps} steps • {km} km"` (visible on every activity tab — Run, Walk, Cycle, etc.)
- Steps sourced from HealthKit (iOS) / Health Connect (Android) via `DailyStepCounterService`
- Estimated distance calculated as: `steps × KM_PER_STEP` (0.00067 km per step, i.e., 0.67m stride)

### Automatic Step Submission
- `StepCompetitionService.checkAndSubmitSteps()` fires every 30 minutes on app foreground
- Submits step count to Supabase for competition leaderboards
- Uses `LocalWorkoutStorageService.upsertDailyStepsWorkout()` (bypasses reward trigger and auto-submit)

### Step Posting (WoT-Gated)
- When user has WoT score > 0, tapping the step header triggers `handlePostSteps()`:
  1. Creates synthetic walking `PublishableWorkout` with step count + estimated distance
  2. Opens `EnhancedSocialShareModal` (templates, camera, share as kind 1 social post)

### Dead Code Note
`StepsDisplayScreen.tsx` still exists in the codebase but is **dead code** — removed from navigation, never reachable.

---

## 5. Reward Flow

### Overview
Users earn 50 sats per daily cardio workout. Bitcoin is sent to their Lightning address (or their selected charity if no Lightning address is set).

### Trigger
`LocalWorkoutStorageService.saveWorkout()` → fire-and-forget call to `DailyRewardService.checkStreakAndReward()`

### Eligibility Rules
1. Workout source must be: `gps_tracker`, `manual_entry`, `healthkit`, or `health_connect`
2. Activity must be: `running`, `walking`, or `cycling`
3. One reward per day per user (atomic flag in AsyncStorage prevents duplicates)

### Local Tracking (Instant, In-App)
On eligible workout save:
- Records reward amount in AsyncStorage
- Updates weekly and total counters
- Tracks charity donation amount for Impact Level XP calculation
- **Does NOT send Bitcoin** — only updates local UI state

### Actual Bitcoin Payment (External, Async)

> **IMPORTANT: Stale comments exist in the codebase.** `DailyRewardService` header (lines 1-18) says "external service monitors Nostr for kind 1301 events." This is **incorrect** — the external service monitors the **Supabase `workout_submissions` table**, not Nostr relays.

The real flow:
1. Workout auto-submits to Supabase `workout_submissions` table (see Section 3)
2. External reward service reads from Supabase, validates workout
3. Reads `reward_destination` tag to determine recipient
4. Sends 50 sats via LNURL to the Lightning address (user or charity)
5. Records payment in Supabase `reward_payments` table with preimage proof

### User Notification (45-Second Polling)
- `RewardPollingService` polls `reward_payments` table every 45 seconds
- On new confirmed payment → `RewardNotificationManager` displays toast:
  - **User reward**: "Reward Received! 50 sats sent to your wallet"
  - **Charity donation**: "Reward Donated! 50 sats sent to [Charity Name]"

### Destination Logic (Binary)
| Condition | Destination |
|---|---|
| User has Lightning address | Send to user's Lightning address |
| No Lightning address | Send to selected charity (always a fallback) |

### Special Cases
- **Einundzwanzig participants**: 100 sats per workout (double reward)
- **Active pledge**: Routes reward to pledge destination
- **PPQ.AI team**: Generates bolt11 invoice for AI credits instead of Lightning address payment

### Step Rewards
Step rewards (5 sats per 1,000 steps) have been **removed** to simplify fraud detection. The `StepRewardService` is dead code.

---

## 6. Competition Flow

### Joining an Event
1. Tap **Join Events** on Profile tab → LeaderboardsScreen
2. Available competitions: Season II, January Walking Contest, Einundzwanzig, Running Bitcoin
3. Tap event → detail screen showing leaderboard + Join button
4. Tap Join → saves to Supabase `competition_participants` table

### How Workouts Count
- **No opt-in required per workout** — ALL cardio workouts auto-submit to Supabase (see Section 3)
- If user has joined a competition, their submitted workouts automatically count toward that competition's leaderboard
- Leaderboards queried from Supabase, ranked by distance, duration, or workout count (depends on competition type)

### Anti-Cheat Measures
- Pace limits (reject impossibly fast workouts)
- Distance limits per session
- Split consistency checks (even pacing expected)
- Car detection (speed anomalies flagged)
- Flagged workouts stored but excluded from leaderboards

---

## 7. AI Coach & Wellness Features

### Access
Settings → AI Coach → AIHealthDashboardScreen

### Requirements
- PPQ.AI account (Lightning-paid AI credits)
- Set up via PPQAccountSetupModal or PPQCreditTopupModal

### Two Modes
1. **Overview**: Shows today's journal entry + habit check-ins + recent workout summary
2. **Chat**: Conversational AI health coach

### Chat System
- `ChatCoachService`: Multi-turn conversation via PPQ.AI API (Claude Haiku 4.5 model)
- `RunstrContextGenerator`: Feeds workouts, journal entries, habits, and health data as context to the AI
- Conversations stored locally in AsyncStorage

### Journal
- Mood tracking: 5 levels (emoji-based)
- Energy rating: 1-5 scale
- Freeform text entry
- Streak tracking for consistency

### Habits
- Check-in system with daily tracking
- Two types: abstinence (avoid something) and positive (do something)
- 8 built-in templates + custom habit creation

---

## 8. Music Integration

### Not a Screen — Embedded in Profile
Music is a global player embedded in ProfileScreen via **ProfileMusicBar**, not a separate tab or screen.

### Sources
- **Wavlake**: Stream Bitcoin-native music, zap artists via Lightning
- **Blossom**: Personal audio library from Blossom servers

### UI
- **ProfileMusicBar**: Compact player on Profile tab (play/pause, track info)
- **ExpandedMusicPlayer**: Full-screen modal with controls, artwork, zap button
- **PlaylistBrowser**: Browse available tracks/playlists

### Access Control
- **WoT-gated**: Requires trust score > 0
- Must be enabled in Settings
- Hidden if either condition is not met

---

## 9. Encrypted Backup

### Access
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

### What Gets Backed Up
- Workout history (local workouts)
- Habit definitions and check-in history
- Journal entries
- User preferences and settings
- Selected team/charity

---

## 10. Settings

Accessible via gear icon on Profile tab → SettingsScreen.

| Setting | Options |
|---|---|
| Language | EN, ES, PT, DE, FR |
| Voice Announcements | Enable/disable, split details, live splits |
| Distance Units | km / mi |
| Default Activity | Running, Walking, Cycling, Hiking |
| Lightning Address | Text input for LNURL reward delivery |
| AI Coach | Enable/configure PPQ.AI account |
| Music | Enable/disable Wavlake/Blossom player |
| Export Data | Encrypted backup to Nostr |
| Import Data | Restore from encrypted backup |
| Backup Password | Copy nsec with security warnings |
| Sign Out | Clears local auth data |
| Delete Account | Removes all local data |

---

## 11. Dead Code & Stale Features

### Dead Screens (Registered in Navigator but Unreachable)
These screens exist in `AppNavigator.tsx` but have no navigation path leading to them:
- CompetitionsList
- MyTeams
- SavedRoutes
- HealthProfile
- SatlantisDiscovery
- Events
- Experimental
- Donate
- StepsDisplayScreen

### Dead Services (Zero or Minimal Consumers)
| Service | Status |
|---|---|
| `SimpleNostrService` | 1 consumer: DeleteAccountService only |
| `HttpNostrQueryService` | 0 consumers |
| `HybridNostrQueryService` | 0 consumers |
| `NWCGatewayService` | Deprecated — external service handles NWC |
| `StepRewardService` | Deprecated — step rewards removed |

### Legacy Services with Stale Nostr Query Code
| Service | Reality |
|---|---|
| `SimpleCompetitionService` | Nostr query code unused — competitions are hardcoded |
| `SimpleLeaderboardService` | Nostr query code unused — leaderboards come from Supabase |
| `NdkTeamService` | Kind 33404 query disabled — returns hardcoded team list |

### Stale Comments
| File | What It Says | What's Actually True |
|---|---|---|
| `DailyRewardService` (lines 1-18) | "External service monitors Nostr for kind 1301 events" | External service monitors **Supabase `workout_submissions`** table |
| `DailyRewardService` (line 12) | "NWC credentials stored ONLY in external reward service (not Supabase!)" | May be accurate for the external service, but the in-app comment about Nostr monitoring is wrong |
| `DailyRewardService` (line 18) | "No Supabase calls for payments" | The external service **does** use Supabase — it reads workouts from and writes payments to Supabase |
| `workoutPublishingService` (lines 1-11) | "Workouts are only submitted to Supabase if user is in an active competition" | ALL cardio workouts with distance > 0 auto-submit to Supabase, regardless of competition membership |

### Hidden/Disabled Feature Flags
| Feature | Flag/Constant | Status |
|---|---|---|
| Background step tracking | `STEP_REWARDS_ENABLED = false` | Disabled |
| Auto-compete toggle | Temporarily disabled | Not accessible |
| Health profile screen | Temporarily disabled | Not in navigation |
| Sats earned display | `SHOW_SATS_EARNED_DISPLAY = false` | Hidden |

---

## Appendix: Data Flow Summary

```
User taps "Save" on workout
  │
  ├─→ LocalWorkoutStorageService.saveWorkout()
  │     ├─→ Save to AsyncStorage (immediate)
  │     ├─→ DailyRewardService.checkStreakAndReward() (fire-and-forget)
  │     │     └─→ Update local reward counters in AsyncStorage
  │     └─→ autoSubmitToSupabase() (fire-and-forget)
  │           └─→ SupabaseCompetitionService.submitWorkoutSimple()
  │                 └─→ INSERT into workout_submissions table
  │
  ├─→ [External reward service] (async, out-of-band)
  │     ├─→ Read workout_submissions from Supabase
  │     ├─→ Validate workout (anti-cheat)
  │     ├─→ Send 50 sats via LNURL to Lightning address
  │     └─→ Record in reward_payments table
  │
  └─→ [RewardPollingService] (45s polling interval)
        ├─→ Query reward_payments for new confirmed payments
        └─→ Show toast notification via RewardNotificationManager
```
