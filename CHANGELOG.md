# Changelog

All notable changes to RUNSTR will be documented in this file.

## [1.8.8] - 2026-04-03 - Polish, Bug Fixes & North Star Alignment

### Bug Fixes
- Fixed conditional React hooks crash in NWCLightningButton and CharitySection (hooks called after early return)
- Fixed backup restore crash on truncated relay data ("invalid payload length") — now skips corrupted events and tries alternatives
- Fixed Level/XP showing 0 — profile now reads local workout storage first, falls back to Supabase for other users
- Fixed default XP-per-level mismatch (was 100, should be 500)

### Workout Recovery
- Restored workouts from encrypted backup now queue for Supabase submission automatically
- Imported kind 1301 Nostr workouts now queue for Supabase submission automatically
- Level system works offline, with Private Mode, and when Supabase is unreachable

### Sponsor (Zapvertising)
- Changed active reward sponsor from RUNSTR to ALS Network
- Push notifications, toasts, and sponsor banner now display ALS Network branding
- Added migration 164 for sponsor switchover

### Codebase Cleanup (-12,500 lines)
- Removed Satlantis event integration (17 files, ~5,300 lines)
- Removed 12 dead service files (Google auth, Garmin direct, WeatherService, SimpleNostrService, etc.)
- Removed 70+ dead imports across 42 files
- Removed ~330 lines of dead commented code and debug logging
- Removed 2 dead test files referencing deleted components
- Split SettingsScreen.tsx from 2,252 to 205 lines (14 focused section components)

### Documentation
- Updated North Star: removed subscription tiers, added data ownership principles, updated business model
- Created `/polish` skill for repeatable codebase cleanup passes

## [1.7.7] - 2026-03-31 - Solidification, App Store Compliance & Performance

### App Store Compliance
- Removed all subscription tier UI and gating (Guideline 3.1.1)
- Club creation and event creation now available to all users
- Added Apple Health section in Settings with sync toggle and connection status (Guideline 2.5.1)

### Stability & Reliability
- Added workout validation bounds (200km/24h) across all 4 submission paths
- Failed workout submissions now retry via PendingSubmissionService on all paths
- Added NDK retryConnection mutex to prevent stale connection references
- Fixed 2 critical circular dependency cycles (SupabaseCompetition/DailyReward, LocalWorkoutStorage/Backup)
- Added isMounted cleanup guards to 13 async useEffects across 8 screens

### Performance
- Added .limit() to 12 high-risk unbounded Supabase queries
- Recovered and committed lottery wheel and profile action card components

### UX Polish
- Added loading indicators to 6 screens (Steps, Events, Leaderboards, Stats, Support, Journal)
- Feed zap opens ExternalZapModal correctly
- Pull-to-refresh on Compete screen now refreshes data
- Chat button shows toast feedback instead of being dead
- Settings toggles show toast confirmation
- Simplified onboarding modal

### Cleanup
- Removed 12 dead files (~88KB, 3,121 lines deleted)
- Removed orphaned subscription styles from RewardsScreen
- Renamed components/subscription to components/creation

### Testing
- Added 28 verification and audit scripts covering all core flows

## [1.7.6] - 2026-03-27 - Social Feed, Lottery Wheel, Activity Menu & UI Overhaul

### Social Tab
- Clubs tab renamed to Social with integrated feed
- Social feed with workout shares, images, and Nostr posts
- Like, zap, repost, and comment interactions on feed posts
- Social feed indexer Edge Function with cron schedule for Nostr content
- Clubs row with horizontal scroll at top of Social screen
- Dual-write workout shares to social_feed for instant visibility

### Lottery Wheel
- Lottery wheel on Level Detail screen with animated spin
- Linear multiplier system (+0.1x per level) with next milestone preview
- "Coming Soon" state with rewards pool reset to 0
- Spin button with countdown timer and haptic feedback

### Activity Menu
- Activity category bar integrated into tracker screen header
- Dropdown overlay with animated category selection
- Activity pills for quick exercise type switching
- Wellness and Mindfulness merged into single category
- Renamed "Workout" to "Exercise" across the app

### Simplified Events
- Event creation simplified to template + duration + recurring
- Recurring events with automatic finalization and re-creation
- Finalize-and-recur-events Edge Function with daily cron
- Competition XP bonus support in WorkoutLevelService
- Auto-use club banner for club events

### XP System
- Simplified to flat values and linear levels, capped at 50
- Competition XP bonuses for event participation

### Subscriptions
- Subscription purchase flows removed per Apple review
- Subscription set to "Coming Soon" state
- Removed subscription upsell language throughout

### Profile Redesign
- Simplified to three action cards: Workout, History, Rewards
- Level badge on profile hero with tap-to-level-detail navigation
- LevelDetailScreen wired into navigation

### Bug Fixes
- Fixed like/repost flash bug (keep optimistic values)
- Fixed image aspect ratio (cover with 1:1)
- Fixed category bar dropdown rendering below header
- Fixed Rewards card navigation
- Fixed missing payment_count column in rewards_pool
- Removed NetInfo dependency from LevelDetailScreen
- Fixed location settings navigation fallback for permission prompts
- Fixed historical recurrence period date calculation
- Sanitized non-finite analytics payload values
- Removed redundant error-color fallbacks

### Improvements
- Zero TypeScript errors (198 -> 0)
- Core test suite: 12 suites, 571 assertions
- Spin button uses minimal outlined pill style
- Generic "earn rewards" text replaces charity-specific messaging
- Removed redundant screen titles from Social and Rewards

## [1.7.5] - 2026-03-22 - Pushup Verification, Android Sync Reliability & Backup Fixes

### Pushup Verification (Camera)
- On-device camera verification for pushup workouts using MediaPipe pose estimation
- Optional "Verify with Camera" toggle in pushup setup — always opt-in, never required
- Real-time rep counting via elbow angle tracking (shoulder/elbow/wrist landmarks)
- Privacy-preserving: video frames processed in memory and discarded — only a lightweight verification receipt is stored
- Verified workouts display an orange checkmark in workout history and detail views
- Verification receipt sent to Supabase with workout submission (no video, just metadata)
- Haptic feedback on each detected rep

### Android Sync Reliability
- Re-validate Health Connect permissions before background sync (detect revocation)
- Extended background sync lookback to 7 days to catch missed syncs
- Smart lookback in HealthSyncManager — 7 days if >1hr since last sync, 1 day otherwise
- Handle submission failures properly — flagged workouts skip retries, transient failures retry

### Pledge System & Rewards
- Pledge rewards now route to captain's Lightning address during active pledge period
- Push notifications delivered for rewards even when app is backgrounded (npub passed to auto_reward trigger)
- Fixed Rewards screen navigation from welcome modal destination picker

### Bug Fixes
- Fixed base64 padding handling in backup restore
- Fixed club chat keyboard offset using safe area insets
- Fixed app freeze when opening event creation from club menu
- Patched react-native-mediapipe for VisionCamera v4 header compatibility
- Patched react-native glog crash triggered by MediaPipe initialization
- Fixed undefined startTime crash in workout timeline

### Improvements
- Lazy-loaded camera verification component for faster screen load
- Added react-native-vision-camera and react-native-worklets-core for frame processor support

## [1.7.4] - 2026-03-16 - Unified Profile, Ticketed Events & HealthKit Fix

### Profile Redesign
- Unified profile page replaces separate screens — workouts, stats, and settings in one view
- Restructured bottom tabs to Profile | Clubs | Events
- Tap-to-profile navigation on leaderboard entries and club member circles
- Reward destination badge always visible on profile
- Start Workout button on profile page

### Ticketed Events
- Pledge-based event entry — organizers set pledge days (0-7) and qualifying distance
- Random winner selection with deterministic draw for prize payouts
- Event finalization UI for organizers with winner draw and payout
- Ticket badge and event info displayed on ticketed events
- Finalize-ticketed-event Edge Function and get_competition_finishers RPC

### Bug Fixes
- Fixed HealthKit background import rejecting valid cardio workouts (distance fallback was always 0)
- Fixed app freeze when opening event creation from club menu
- Fixed undefined startTime crash in workout timeline
- Added back button header to Rewards screen
- Profile theme fixes — outlined Start Workout button, always-visible destination badge
- Sponsor name now included in all reward notifications

### Improvements
- Removed dead prefetch methods from NostrPrefetchService
- Added diagnostic logging for HealthKit background sync rejections
- Added /vibes skill for Nostr community sentiment monitoring
- Added /prs skill for PR triage dashboard

## [1.7.3] - 2026-03-02 - Security Hardening, Submission Reliability & Branch Unification

### Security
- Secure RNG for Nostr key generation (crypto.getRandomValues replaces Math.random)
- Secure RNG for CoinOS credential generation
- SecureNsecStorage used consistently in Running Bitcoin post flow
- Centralized sign-out flow via AuthContext prevents partial state cleanup
- GlobalNDK signer cleared on sign-out to prevent stale identity

### Submission Pipeline Reliability
- 5-second timeouts on club/team Supabase queries during reward tag building
- 5-second timeout on SubscriptionService tier check prevents hangs
- Timeout on image upload auth signing with Amber signer serialization
- Restored relay minimum connection check before publishing
- Hoisted async club lookups out of JSON.stringify to prevent silent failures
- Diagnostic logging for silent early returns in auto-submit pipeline
- Hardened early return status reporting in submission pipeline
- PPQ total timeout and buildRewardTags timeout protection

### Bug Fixes
- Cache crash fix: SimpleCache.delete prevents TeamCacheService crash
- Workout invalidation now passes competition team IDs correctly
- Health auto-submit retries on transient failures instead of silently dropping
- Reward summary defaults nullable totals to zero (prevents NaN display)
- Team join resolves current user npub correctly
- Manual entry range validation enforced
- Removed broken ChallengeService import
- Fixed chat double-submit on rapid taps
- Fixed German translation string

### Improvements
- Subscription status card on Rewards page (10x boost, clean framing)
- Subscription economics updated — 10x boost, 15k/21k pricing, 5/week cap
- Terminology cleanup — rewards everywhere, no Bitcoin/sats/Nostr in user-facing text
- SafeAreaView migrated to react-native-safe-area-context (12 screens)
- ~12K lines of dead code removed
- Nostr club/team relay queries replaced with Supabase-only

### Infrastructure
- Merged v1.7.0 (clubs) + v1.7.2 (security fixes) into unified branch
- 4 critical-path verification scripts (216 assertions)
- Pre-release audit fixes (performance, i18n, UX, data integrity)

## [1.7.1] - 2026-02-24 - Club Chat, Challenges, Meditation & Voice Journal

### Club Chat
- Full-screen club chat with navigation
- Pinned messages and banner display
- 1v1 challenges — create, accept, decline from chat
- Challenge wizard modal with activity type and distance selection
- Challenge cards in chat with live status and mini leaderboard
- Chat replies, announcements, reactions, and workout auto-share
- Compact club page redesign — chat fills remaining screen space

### Meditation & Wellness
- Breathing circle component for guided breathwork sessions
- Duration preset selector for meditation setup
- Countdown timer with auto-stop for meditation presets
- Milestone haptic pulses for open meditation sessions

### Voice Journal
- Voice record button with hold-to-record UX
- On-device speech-to-text via VoiceTranscriptionService
- Wired into journal editor (iOS only — Android sends audio to Google)

### Rewards
- Default reward increased to 100 sats per workout
- Strength and journal workouts now earn rewards
- Step reward display stays at 50 sats daily cap

### Features
- Anonymous-first login UX — use the app without creating or importing a Nostr identity
- Private Mode toggle in Settings — prevents workout publishing to Nostr
- Push notification tap handling with deep-link navigation
- Leaderboard position change notifications
- Seamless auto-backup to Nostr after every workout

### Security
- All Supabase writes routed through Edge Functions (no direct client writes)
- Error handling on Private Mode toggle prevents retry loops

### Bug Fixes
- Event leaderboard scoring — show time for fastest_time, hide 0-workout entries, show real names
- Event timezone — treat end_date as end of day to include western timezone workouts
- Clear lightning address for PPQ users in GPS workout path
- Add profile data to pending submissions, show Private Mode toast
- Chat profiles, event images, PPQ rewards, and 5K leaderboard scoring fixes
- Remove NDK signing from workout submission — prevents lost workouts
- ENDED badge on club events, chat minHeight fix
- Lazy-load expo-speech-recognition to prevent crash on Android/pre-rebuild
- Remove hardcoded sat amount from reward destination subtitle
- Timer ref assignment and auto-stop race condition in meditation
- Harden background sync reliability for HealthKit and Health Connect
- Polish club page — tone down orange, fix leaderboard and captain display bugs
- Quote reserved word 'position' in leaderboard SQL function
- Use runtime app version in Settings instead of hardcoded string
- Android APK build — downgrade to Expo SDK 52-compatible deps

### Infrastructure
- Club page refactored to flex layout with compact event rows
- Member avatars moved into ClubInfoSection
- ChallengeCard extracted from ChatMessageBubble
- Runtime version fallbacks replace stale hardcoded values
- CLAUDE.md slimmed from 570 to 154 lines, docs aligned with North Star

## [1.7.0] - 2026-02-19 - Clubs, Events, Stability & Audit Fixes

### Clubs System
- User-created clubs with captain/member roles
- One-club-per-user constraint enforced at database level
- Club chat with Supabase Realtime
- Captain tools: transfer captainship, remove members
- Membership reconciliation detects stale state every 5 minutes
- Club events: captains can create competitions for their club members
- Club event wizard with activity type selection and prize pool

### Club Events
- Connected clubs and events systems — club captains create events from club page
- Club event UX hardening: leaderboard query fixes, auto-join feedback, club badges, gate UX
- Club event creation modal with subscription gating
- Dynamic event cards show club branding

### Reward Destination & PPQ.AI
- PPQ.AI reward destination with bolt11 invoice creation for AI credits
- PPQ.AI account creation resilience with website fallback
- Reward destination picker redesigned with clearer options
- "How It Works" section updated with charity-aware descriptions
- Removed Bitcoin mention in reward UI, says "Lightning wallet" instead

### NWC Wallet
- Re-enabled NWC wallet connection with 4-layer integration
- NWC QR code scanning and manual connection string support

### Activity Tracker Stability (Issue #28)
- Fixed white screen crash during long workouts (~5km / 30+ min)
- Zombie session cleanup now calls Location API directly instead of no-oping on fresh singleton
- Background task heartbeat write wrapped in try-catch (prevents JS bridge crash)
- Auto-recovery window extended from 5 to 15 minutes (aligns with checkpoint window)
- Black background during app initialization instead of white flash
- Fixed stale calorie calculations in Walking and Hiking trackers (closure bug)

### Codebase Audit Fixes
- Logout now clears selected team and charity stats (prevents cross-user contamination)
- Tied ranking in leaderboards — equal scores share the same rank
- Case-insensitive activity type matching in competition queries
- Daily reward race condition lock prevents double-claiming
- UTC-consistent date comparison for reward eligibility
- CharitySelectionService aligned with correct AsyncStorage key

### Cloud Backup (Issue #31)
- PPQ.AI credentials (API key and credit ID) now included in encrypted Nostr backup
- Credentials restored on device switch (only if not already set locally)

### Push Notifications
- Wired claim-reward edge function to notify-user push notifications
- RUNSTR Fitness skill link added to Settings alongside GitHub

### UI & Theme
- Enforced orange-only dark theme across entire app — removed all off-theme colors
- AI Agent setup section added to Settings
- Simplified PPQ.AI descriptions to "AI credits"

### Database Fixes (Migration 137+)
- Added UPDATE + DELETE RLS policies on user_teams
- Added UPDATE RLS policy on club_memberships
- Added atomic adjust_member_count() RPC function (eliminates race conditions)
- Fixed club image migrations

### Infrastructure
- Background-first architecture (4 phases) for faster app startup
- Health Connect double-counting fix + global crash handlers
- ClubMembershipService uses atomic RPC for all member_count changes
- Promote-first captain transfer order prevents 0-captain states
- 249 lines of dead code removed from workoutPublishingService

## [1.6.9] - 2026-02-09 - Subscriptions, Leaderboard Fixes & Auto-Submission

### Subscription-Gated Team & Event Creation
- RUNSTR Pro subscription (7,000 sats/month) unlocks team and event creation
- Subscribe button links to runstr.club/pro with user's npub for seamless checkout
- Non-subscribers see locked state with subscribe prompt

### Leaderboard & Competition Fixes
- Added fastest_time scoring support for February 5K Challenge
- Fixed missing lightning address and charity tags on all Supabase submission paths
- Fixed reward routing: 50-sat reward now correctly routes to charity when charity team selected
- Fixed missing reward tags and timezone bug for Supabase workout submissions
- Synced Season 2 registration script with correct npubs and competition IDs

### Workout Auto-Submission Fixes
- Fixed all Supabase submission paths to include lightning address and charity tags
- Reward tags and timezone data now consistently included in submissions
- Admin script to credit flagged workouts for affected participants

### Cloud Backup
- Moved cloud backup button to header bar (next to stats icon) for cleaner UI
- Fixed green success colors in export modal to match app-wide orange theme

### Teams & Charities
- Replaced CoinOS team with "You" team for intuitive reward routing
- Added Lightning News as a team/charity option

### Activity Tracker
- Added Mindfulness row to activity grid with Journal and Habits
- Simplified journal editor UI with cleaner mood/energy selectors
- Fixed swipe navigation on mindfulness screens (removed interfering scroll views)
- Fixed flash of Run screen before saved tab position loads

### UI Fixes
- Fixed DynamicEventCard logo style to match Season II card
- Fixed DynamicEventDetail navigation crash with RUNSTR logo fallback
- Fixed CoinOS wallet modal ScrollView layout collapse
- Fixed CoinOS receive invoice errors now visible with 401 retry
- Converted CoinOS logo from JPEG-as-PNG to real PNG format

### Cleanup
- Removed AI chat and coaching features, kept PPQ.AI account management
- CI build fixes (tsconfig, ESLint config, workflow)

---

## [1.6.8] - 2026-02-08 - Background Rewards, CoinOS Wallet & Dynamic Events

### HealthKit Background Delivery & Auto-Rewards
- iOS HealthKit observer queries wake RUNSTR when Apple Watch / Nike Run Club / etc. workouts complete
- New `HealthKitBackgroundService` registers for HKWorkoutTypeIdentifier with immediate frequency
- Workouts auto-submitted to Supabase with Lightning address tag for automatic reward payment
- Postgres AFTER INSERT trigger extracts Lightning address and calls claim-reward edge function
- End-to-end pipeline: workout completes on watch -> app wakes -> submits -> trigger pays 50 sats via LNURL

### CoinOS Wallet Integration
- CoinOS added as a team/charity option alongside PPQ.AI
- Custodial Lightning wallet: users create a `username@coinos.io` address during onboarding
- `CoinOSAccountService` handles account creation, authentication, balance, send, receive, and invoice creation
- `CoinOSAccountSetupModal` for wallet creation flow
- `CoinOSWalletModal` with Send, Receive, and Transactions tabs
- Receive tab supports bolt11 invoice creation (amount input -> Create Invoice -> QR + copy)
- `WelcomePermissionModal` updated with 2-step onboarding for team selection
- Real CoinOS logo and team branding

### Dynamic Supabase Events
- Data-driven competition system: insert a row in Supabase -> it appears in the app automatically
- No code changes needed to create new events
- 4 competition templates: `distance_race`, `step_challenge`, `goal_challenge`, `fundraiser`
- `DynamicEventCard` component with banner image, status badge, and activity tags
- `DynamicEventDetailScreen` with full leaderboard, join button, and prize pool display
- `useDynamicCompetitions` hook with 5-minute cache and status derivation

### Auto-Sync Workouts to Leaderboard
- HealthKit and Health Connect workouts now auto-sync to competition leaderboards
- `HealthSyncManager` syncs on app foreground (via AppStateManager) and pull-to-refresh
- 5-minute throttle prevents excessive queries

### Push Notification Token Registration
- `token_key` column (sha256 of npub) added to `broadcast_tokens` for reward payment push notifications
- AuthContext registers token_key after authentication completes

### PPQ.AI Reward Fixes
- Fixed rewards falling back to ALS Network instead of PPQ.AI bolt11 invoice
- Added `shouldSendToUser()` method and `isPPQ` flag to reward destination logic
- Centralized PPQ.AI bolt11 invoice creation in `submitWorkoutSimple()` for all submission paths
- Updated auto-reward Postgres trigger to support PPQ.AI bolt11 extraction

### Infrastructure
- Switched to version branch model (v1.6.8, v1.7.0, etc.)
- 5 new Supabase migrations (127, 128, 130, 131, 132)
- 8 new source files, 35 files changed, +4,266 / -262 lines

---

## [1.6.7] - 2026-02-03 - RUNSTR AI & Auto-Compete

### Automatic Competition Entry
- Workouts and steps automatically enter competitions - no manual "Compete" button needed
- Complete a workout → automatically compete for rewards

### RUNSTR AI (PPQ.ai)
- One-click anonymous AI account creation
- Journal and habit tracker
- AI chat with model selection
- Top up AI credits from workout rewards

### Encrypted Workout Backup
- Backup workout history to Nostr (NIP-44 encrypted)
- Import workouts from backup

### Passive Step Tracking
- Walk screen shows steps from Health Connect
- Steps auto-compete for rewards
- Instant 50 sats when daily steps hit 10,000

### Rewards Transparency
- Rewards Pool breakdown display
- Earnings view (users with Lightning address)
- Charitable contributions view
- Full transparency dashboard

### Android Stability
- Fixed activity tracker freezing on first load
- Fixed step counter and posting issues
- Improved battery optimization handling

### UI Improvements
- Activity tracker header now shows only step count (removed confusing estimated distance)

### Leaderboard Fix
- Fixed distance double-counting: leaderboards now use MAX(steps, GPS) per day instead of summing both sources

---

## [1.6.6-debug] - 2026-01-27 - Major Feature Release

### Automatic Competition Entry
- **Removed Compete Button**: Workouts and steps automatically enter competitions
- **Simplified Workflow**: Complete workout → automatically compete for rewards

### WOT-Gated Features (Web of Trust)
- **Nostr User Features**: Verified Nostr users see posting options and Wavlake toggle in settings
- **Feature Visibility**: Trust-based access to social features

### Passive Walking Tracker
- **Health Connect Integration**: Walk screen shows steps from Health Connect
- **Distance Estimation**: Estimates distance from step count
- **Auto-Competition**: Steps automatically enter competitions

### Rewards Screen Overhaul
- **Rewards Pool Display**: Shows total rewards pool breakdown
- **Earnings View**: Users with Lightning address see their earnings
- **Charitable Contributions**: Users without Lightning address see charity breakdown
- **Transparency Dashboard**: Full breakdown of where rewards went

### RUNSTR AI (formerly Coach RUNSTR)
- **PPQ.ai Integration**: Select ppq.ai as team
- **One-Click Account Creation**: Create anonymous PPQ account instantly
- **Rewards to PPQ**: Option to send rewards to top up PPQ balance
- **Journal/Habit Tracker**: Track fitness habits and journal entries
- **AI Chat Interface**: Select model and ask health/fitness questions

### Encrypted Workout Backup
- **Nostr Backup**: Encrypt and save workout history to Nostr
- **Relay Selection**: Choose which relay(s) to send backup to
- **Private Relays**: Support for Citrine or personal relay
- **Import Functionality**: Import workout history from Nostr to local storage

### Blossom Music Playlists
- **Restored Feature**: Blossom servers as music playlists
- **Native Support**: Better integration with blossom ecosystem

### Instant Rewards
- **10k Steps Reward**: Instant 50 sats when daily steps hit 10,000
- **3km Cardio Reward**: Instant 50 sats when cardio hits 3km+

### UI/UX Improvements
- **Step Tracker at Top**: Added step tracker with distance estimation to activity trackers
- **Swipe Navigation**: Swipe to switch between trackers
- **Stats in History**: Added statistics to workout history
- **RUNSTR AI in History**: Access AI from history screen

### Bug Fixes (Android)
- **Activity Tracker Frozen on First Load**: Wrapped mount-time async operations in `InteractionManager.runAfterInteractions()`; added `permissionsReady` state gate so SwipeGridNavigator and heavy tracker useEffect hooks don't mount until permission check completes; shows ActivityIndicator during wait
- **Fix Buttons Not Working**: Clarified battery exemption status logic in BatteryOptimizationService to prevent incorrect short-circuit; added feedback Alert when background tracking fails to start native sensor
- **Battery Optimization Shown Twice**: Only show both generic + manufacturer-specific battery rows when names differ (e.g., Samsung "Device Care"); single row for Google/Pixel devices
- **Battery Optimization Re-requested After Countdown**: Added `checkBatteryOptimizationStatus()` call before requesting exemption in `initializeGPS()`; skips prompt if already exempted
- **Android Version Shows API Level**: Added API-level-to-version mapping so device info shows "Android 14" instead of "Android 34" in GPS diagnostics and contact support
- **N Button Darkens Screen**: Memoized step workout object keyed on `[dailySteps, userPubkey]` to prevent render thrash on Android; removed dailySteps > 0 gate so users can post with 0 steps; modal uses stable memoized ref instead of inline `createStepWorkout()` call; defensive guard shows "No workout data" message for zero duration/distance
- **WoT Fallback for N Button**: `checkWoTEligibility()` now falls back to `fetchAndCacheScore()` when `getCachedScore()` returns null; useEffect dependency changed from `[dailySteps]` to `[]` (runs on mount)
- **Step Distance Constant**: Replaced hardcoded step-to-distance values with shared `STRIDE_LENGTH_METERS` (0.67) and `KM_PER_STEP` constants in `appConstants.ts`
- **Workout Dedup Window**: Widened dedup time window from 60s to 300s (5 min); added distance-based matching (20% tolerance) for multi-app tracking scenarios
- **Share Workout Back Button Too High**: Changed SafeAreaView import from react-native to react-native-safe-area-context for proper status bar inset handling on Android
- **Import Workouts "Not Logged In" Error**: Improved error message to "Please log in with your nsec before importing data" with "Login Required" title and person icon

### Bug Fixes (Competition & Rewards)
- **Auto-Submit All Workouts to Supabase**: Added `autoSubmitToSupabase()` in LocalWorkoutStorageService called after `saveWorkout()`; HealthKit and Health Connect services now compare against previous cache to identify and submit new cardio workouts automatically
- **Step Re-Submission Interval**: Replaced daily `hasSubmittedToday()` gate with `hasSubmittedRecently()` (30-minute interval); stores timestamp instead of date string so steps update throughout the day

### Bug Fixes (Backup & Amber)
- **Amber NIP-44 Backup Support**: Added kind 30078 to Amber permissions; `encrypt()`/`decrypt()` now accept optional scheme parameter routing to `nip44_encrypt`/`nip44_decrypt` intents for Amber users
- **Backup Service Amber Compatibility**: Replaced `getNsec()` + manual `nip44.v2.encrypt()` with `UnifiedSigningService.getSigner()` + `signer.encrypt()`; removed nostr-tools imports; fixed `_selectedRelays` → `selectedRelays` passthrough
- **Restore Service Amber Compatibility**: Replaced `getNsec()` + manual `nip44.v2.decrypt()` with `signer.decrypt()`; uses `signer.user().pubkey` instead of AsyncStorage lookup
- **Export Modal Error Display**: Added inline error/success messages visible inside the pageSheet modal; success auto-closes modal after 1.5s

### Bug Fixes (Rewards Cleanup)
- **Removed Stale Reward Notifications**: Cleaned up unused reward notification code across 8 files
  - Removed `showPendingRewardToast()` calls from WorkoutSummaryModal, ManualEntryScreen, MeditationTrackerScreen, DietTrackerScreen
  - Removed `showRewardEarned()` calls from DailyRewardService
  - Cleaned dead methods from RewardNotificationManager (`lastReward`, `getLastReward()`, `clearLastReward()`, `showPendingRewardToast()`, `showRewardEarned()`)
  - Simplified empty state messages in EarningsHeroCard and ImpactHeroCard
- **HealthKit/Health Connect Rewards Not Paying Out**: Fixed `REWARD_ELIGIBLE_SOURCES` whitelist using wrong source strings (`imported_healthkit`, `imported_health_connect`, `imported_garmin`) instead of actual values (`healthkit`, `health_connect`); synced workouts now pass eligibility check and earn the 50 sats daily reward
- **Workout Submission Toast Feedback**: `autoSubmitToSupabase()` now shows toast notifications after submitting — "Workout Submitted" success toast (3s) or "Workout Under Review" if flagged (4s); errors remain silent since `PendingSubmissionService` handles retries

### Bug Fixes (Step Counter & Android)
- **NativeStepCounterService Method Names**: Fixed 5 incorrect expo-sensors-step-counter API calls — `requestPermissions()` → `requestActivityPermissions()`, `getStepCountAsync()` → `getStepsCountAsync()` (3 sites), `startAsync()` → `setupBackgroundUpdates()` with proper `NotificationConfig` (title, contentTemplate, iconResourceName), removed non-existent `stopAsync()` call, fixed response handling (`getStepsCountAsync()` returns a number directly, not `{ steps }`)
- **GrapheneOS Package Queries**: Added `app.grapheneos.camera`, `app.grapheneos.pdfviewer`, `app.grapheneos.vanadium` to AndroidManifest `<queries>` block so `Linking.canOpenURL()` detects GrapheneOS apps on Android 11+
- **Dead Import Cleanup**: Removed unused `DailyStepGoalCard` import from WalkingTrackerScreen (component not rendered after UI redesign)
- **Step Counter Log Message**: Corrected 'Skipping - not stock Android' to 'Skipping - not Android'

### Bug Fixes (Step Posting)
- **Display vs Publish Mismatch**: `handlePostToNostr` now uses the memoized `stepWorkout` instead of calling `createStepWorkout()` fresh, ensuring published data matches what the modal displayed even if `dailySteps` changed between opening the modal and tapping Post
- **startTime === endTime**: `createStepWorkout()` now computes `startTime` as `endTime - estimatedDuration`, giving a realistic time range instead of a zero-duration window
- **Modal Data Shifts on Re-Focus**: Added `snapshotWorkout` state that captures the step workout when the modal opens; snapshot is passed to both `EnhancedSocialShareModal` and `handlePostToNostr` so data stays frozen even if `useFocusEffect` updates `dailySteps` while the modal is open
- **Duplicate Step Post Guard**: Added `hasPostedStepsToday` tracking with `lastPostDateRef`; subsequent taps the same day show "You already shared your steps today. Post again with updated count?" confirmation dialog; flag auto-resets on date change

### Step Distance & Competition Improvements
- **Step Distance Tracking**: Steps now include estimated distance (steps × KM_PER_STEP) in workout history and Supabase submissions instead of `distance=0`
- **Daily Step Upsert**: Added `upsertDailyStepsWorkout()` for deterministic daily step entries that update in place instead of creating duplicates
- **Supabase Step Upsert**: Duplicate `steps_` submissions now UPDATE existing rows (distance, step count) instead of returning `duplicate: true`
- **Step Anti-Cheat Bypass**: Step submissions skip pace/speed/duration validation (duration=0); basic validation caps at 200,000 steps/day with negative distance rejection
- **Step Distance in Competitions**: Step submissions with non-zero distance now contribute to distance totals; only `distance_meters === 0` entries are excluded
- **Step Distance on Share Cards**: Vertical card preview and FullScreenVerticalCard show estimated distance (~X.XX km) below step count; WalkingTrackerScreen step posts include distance and steps fields

### Supabase Submission Status Tracking
- **Workout Submission Status**: Added `supabaseSubmitted` and `supabaseError` fields to `LocalWorkout` interface; `autoSubmitToSupabase()` now tracks success/flagged/failure status per workout
- **Retry Compete Button**: Workouts that failed Supabase submission show a "Compete" button (trophy icon, orange outlined) in UnifiedWorkoutsTab and EnhancedWorkoutCard; tapping retries `submitWorkoutSimple()` with toast feedback
- **Step Status Tracking**: `StepCompetitionService` calls `updateSupabaseStatus()` after step submissions so step entries also track competition status
- **Full Kind 1301 Tags on Submit**: `autoSubmitToSupabase()` and `retrySupabaseSubmission()` now build complete kind 1301 tags (exercise, distance in km, duration in HH:MM:SS, splits, steps) via `buildWorkoutTags()`, include team tag from selected charity, and pass cached profile name/picture to `submitWorkoutSimple()`

### Workout Summary Overhaul (Meditation & Diet)
- **Unified Posting Flow**: MeditationTrackerScreen and DietTrackerScreen now use the same posting pattern — auto-compete on summary, WoT-gated "Post to Nostr" button, `EnhancedSocialShareModal`, "Discard" button to delete saved workout
- **Removed Old Patterns**: Removed `WorkoutPublishingService` named import, NDKSigner state at mount, `handleCompete()`/`handlePost()`, separate Share/Compete buttons, Modal-based summary
- **Added**: `workoutPublishingService` default import, `AutoCompetePreferencesService`, `WorkoutStatusTracker`, `WoTService`, `Toast` imports, explicit phase system (`setup` | `ready` | `active` | `summary`)
- **Meditation Setup Restyle**: Replaced icon + title + "Continue" button with dark card + type chips + circle button in fixed bottom bar
- **Diet Setup Restyle**: Replaced icon + title + rectangular buttons with muted label + dark cards (meal type chips, meal size pills, time selector, notes) + circle button in fixed bottom bar

### PPQ Credit Top-Up from Teams Screen
- **Sparkle Badge Tap**: PPQ team card sparkle badge now opens PPQ Credit Top-Up modal (or account setup if no account exists)
- **Top-Up Modal**: `PPQCreditTopupModal` rendered on TeamsScreen with success toast on completion

### Reward Notification Improvements
- **Charity Lookup Helper**: `getCharityByLightningAddress()` for case-insensitive charity lookup by Lightning address
- **Restyled Reward Toasts**: Black/orange theme — `rewardConfirmed` uses #f7931a, `rewardDonated` uses #FF9D42 with gift icon
- **Fallback Charity Detection**: `RewardPollingService` and `SupabaseRewardService` detect charity from Lightning address when `charity_id` is null
- **Batch Donated Toast**: `showBatchRewardsDonated()` method; label changed from "Reward Donated!" to "Reward Sent!"

### Batch Payment Configuration
- **Ashigaru Added to Batch Payments**: Added Ashigaru to `BATCH_PAYMENT_CHARITIES` config with 2,000 sat minimum threshold
- **Config-Driven Pending Payouts**: `getPendingBatchPayouts()` now filters to only charities in `BATCH_PAYMENT_CHARITIES` (HRF excluded), overrides `minimumSats` with config's `minAmount`, and recalculates `progressPercent` based on config threshold

### Bug Fixes (Android UI)
- **Android Spinner Stuck**: Removed `InteractionManager.runAfterInteractions` wrapper from permission check that caused infinite spinner on some devices
- **Hidden N Button**: Replaced conditional N button with header spacer so the button is always accessible
- **Android Modal Header**: Added 16px extra `paddingTop` on Android in EnhancedSocialShareModal to prevent header overlap
- **Steps in Workout History**: EnhancedWorkoutCard now shows Steps + Distance for cardio workouts with `steps > 0`

### Bug Fixes (Step Competition & Submission)
- **Step Submission Race Condition**: `upsertDailyStepsWorkout()` now runs before `updateSupabaseStatus()` in StepCompetitionService; previously the status update silently failed because the workout didn't exist in local storage yet, so `supabaseSubmitted` was never set and the Compete button never showed
- **Default supabaseSubmitted: false**: New step workouts in LocalWorkoutStorageService are created with `supabaseSubmitted: false` instead of `undefined`, ensuring the Compete button is visible immediately if submission failed
- **Distance Coercion Bug**: Changed `data.distance || null` to `data.distance ?? null` in SupabaseCompetitionService; the `||` operator converted `0` to `null` (since 0 is falsy), causing step workouts with zero GPS distance to send `null` instead of `0`
- **Retry Duration for Steps**: When retrying a step workout via the Compete button, sends `duration: 0` instead of the locally-stored duration (time since midnight) to match original submission behavior

### Bug Fixes (RUNSTR AI)
- **Account Creation Callback Missing**: Added `onSuccess()` call at end of `handleCreateAccount()` in PPQAPIKeyModal; creating an account never notified the parent screen, so the dashboard wouldn't refresh after setup
- **AI Screen Blocked Without API Key**: Removed setup gate that blocked the entire AIHealthDashboardScreen when no API key was present; Overview tab (Journal + Habits) now always renders regardless of API key state; Chat tab shows inline "Set Up AI Credits" prompt instead of blocking the whole screen; header balance badge and model picker only appear when `apiKey` exists

### Bug Fixes (UI)
- **Share Modal Safe Area**: Replaced `SafeAreaView` with `useSafeAreaInsets` + manual `paddingTop` in EnhancedSocialShareModal so back button renders below the iOS status bar and is tappable
- **0-Step Posting Guard Removed**: Removed `dailySteps === 0` alert and disabled/opacity gates from ActivityTrackerScreen step posting button

### WoT Bypass (Temporary)
- **WoT Bypass Flag**: Added `WOT_BYPASS_ENABLED` flag in WoTService.ts; when enabled, `getCachedScore()` and `fetchAndCacheScore()` return 0.001 immediately (skips AsyncStorage and relay connections); all 15 consumer files pass `score > 0` checks without changes. Set `WOT_BYPASS_ENABLED = false` to restore real WoT gating.

### Unified Timeline
- **Timeline Types**: New `TimelineItem`, `TimelineFilter`, `MonthlyTimelineGroup` types unifying workouts, journal entries, and habit check-ins
- **Timeline Entry Cards**: Journal cards (brown accent, mood/energy icons, content preview, tags) and habit check-in cards (colored dot, streak badge) in new `TimelineEntryCard` component
- **Unified Workouts Tab**: Fetches journal entries and habits alongside workouts; filter chip row (All | Workouts | Journal | Habits); tapping journal cards opens editor; pull-to-refresh reloads all sources in parallel
- **MonthlyWorkoutGroup**: Accepts optional `TimelineItem[]` and `renderTimelineItem` prop for mixed-type rendering with backward-compatible workout-only fallback

### Performance
- Optimized tracker switching
- Improved step counter reliability
- Permission-gated tracker rendering prevents 7+ concurrent async operations from saturating the React Native bridge on Android first load

### Technical Changes
- New WOT verification service
- PPQ account integration
- Encrypted backup service
- Enhanced rewards transparency service
- Shared step distance constants in `appConstants.ts`

---

## [1.6.5] - 2026-01-21 - Units, i18n & GrapheneOS Fix

### New Features

#### KM/Miles Unit Preference
- **Unit Toggle**: Settings → Fitness Tracking → toggle between Kilometers and Miles
- **Full App Support**: Distance, pace, speed, and elevation display in preferred units
- **TTS Announcements**: Voice coach speaks in your preferred units ("per mile" or "per kilometer")
- **Split Tracking**: Mile splits (1609m) or kilometer splits (1000m) based on preference
- **Workout Cards**: All workout displays respect unit preference

#### Internationalization (i18n)
- **Auto-Detection**: App detects device language on startup
- **Language Switcher**: Settings → Language for manual language selection
- **Persistent Preference**: Selected language saved across sessions
- **Fallback System**: Falls back to English for missing translations

### Bug Fixes

#### GrapheneOS Step Counter Fix
- **Fixed**: Steps displayed as 0 in app while notification bar showed correct count
- **Root Cause**: Privacy ROM detection was incorrectly blocking native step sensor
- **Solution**: Removed privacy ROM check - native step sensor works on all Android devices
- **Files**: `NativeStepCounterService.ts`, `DailyStepCounterService.ts`

#### Relay Connectivity Fix
- **Fixed**: Workout publishing failures due to relay connection timing
- **Solution**: Service now waits for minimum relay connectivity (2 relays, 3s timeout) before publishing
- **Graceful Degradation**: Continues with warning if connectivity not established
- **File**: `workoutPublishingService.ts`

### Technical

#### New Files
- `src/hooks/useUnitPreference.ts` - Centralized unit preference hook
- `src/hooks/useWavlakePlayer.ts` - Wavlake player integration hook
- `src/types/music.ts` - Music type definitions
- `src/store/musicStore.ts` - Zustand store for music state
- `src/constants/music.ts` - Music constants
- `src/services/music/WavlakeService.ts` - Wavlake API service
- `src/services/music/MusicPlayerService.ts` - Audio playback service
- `src/services/music/WavlakeZapService.ts` - Lightning zap service for artists
- `src/components/music/` - Music UI components (6 files)
- `src/i18n/` - Internationalization files
- `src/services/i18n/` - i18n service

#### Modified Files
- `src/utils/distanceFormatter.ts` - Added unit conversion helpers
- `src/services/activity/ActivityMetricsService.ts` - Unit-aware formatting
- `src/services/activity/TTSAnnouncementService.ts` - Unit-aware voice announcements
- `src/services/activity/SplitTrackingService.ts` - Configurable split intervals
- `src/services/activity/SimpleRunTracker.ts` - Passes unit preference to split tracker
- Multiple workout card components updated for unit preference

---

## [1.6.4] - 2026-01-19 - Daily Rewards & Einundzwanzig Teams

### Rewards System Changes
- **Daily Rewards**: Switched from instant rewards to daily rewards system
- **Compete to Earn**: Workouts must be submitted to competitions to earn rewards
- **Step Rewards Removed**: Removed the 5 sats per 1,000 steps reward
- **Impact Score**: Only workout rewards increase your Impact Level XP
- **P2P Donations**: Direct zaps in the app now go directly to the team's Lightning address (untracked donations)

### Einundzwanzig Challenge Teams
- Added **Ashigaru** as a featured team
- Added **WeSatoshi** as a featured team
- Users without featured team tags now display "No Team" in leaderboard
- Demo mode disabled for production

### New Teams
- Added **RUNSTR** as a team option
- Added **BuhoGO** as a team option

### UI Improvements
- **Simplified Advanced Settings**: Streamlined the Advanced Features menu
- **Leaderboard Optimizations**: Performance improvements for faster leaderboard loading
- **Daily Rewards Payout UI**: Updated UI to reflect new daily rewards system
- **Direct Donation Toasts**: Improved toast notifications for direct P2P donations
- **Rewards Section UI**: Updated UI in the Rewards section

### Performance Optimizations
- Fixed back button issue in EinundzwanzigDetailScreen (separate isRefreshing state, setImmediate cleanup)
- Added Top 10 + "See More" pagination to DailyLeaderboardCard
- Fixed React list keys in MiniLeaderboard (using entry.position instead of index)
- Fixed React list keys in WorkoutDetailModal splits (using split number)
- Restored Nostr profile fetching for non-Season2 competitions (fixed "Anonymous" display)

### Bug Fixes
- Fixed Lightning address input in Advanced Settings
- Fixed leaderboard date and time display bug
- Fixed Android status bar hiding in FullScreenCardModal

---

## [1.6.3] - 2026-01-17 - Compete-Based Rewards & Einundzwanzig Challenge

### Rewards System Overhaul
- **Compete-Based Rewards**: Workout rewards (50 sats) now trigger AFTER server-side validation
  - Previously: Rewards fired immediately on local save (before anti-cheat validation)
  - Now: Rewards only fire when workout passes server-side validation and is accepted into competition
  - Moved reward trigger from `workoutPublishingService.ts` to `SupabaseCompetitionService.ts`
- **Einundzwanzig Double Rewards**: Earn 100 sats per workout during Einundzwanzig Challenge (Jan 21 - Feb 21)
  - Requires: Challenge dates active + joined Einundzwanzig + workout tagged with featured team
  - Featured teams: ALS Foundation, Human Rights Foundation, Bitcoin Veterans
  - New `checkEinundzwanzigBonus()` method in SupabaseCompetitionService
  - Orange banner on Einundzwanzig detail screen announces double rewards
- **Step Rewards Unchanged**: Step rewards (5 sats/1k steps) operate independently via StepPollingService
  - Polls every 60 seconds, triggers rewards through StepRewardService
  - No "compete" button needed for steps
- **Auto-Compete Default**: New users now have auto-compete enabled by default
  - Workouts automatically submit to competitions when finished
  - Toggle available in Settings → Advanced Features
- **100% Donation Default**: Donation split now defaults to 100% charity
  - All workout rewards go to your selected team/charity by default
  - Donation splits section moved to Settings → Advanced Features

### UI Improvements
- **Unified Workout History**: Single view merges local + health app workouts
  - New `UnifiedWorkoutsTab` component with source badges
  - Automatic deduplication (1 min time window + same type + 10s duration tolerance)
  - Sync button in header replaces tab toggle
- **Rewards Screen Reorganization**:
  - Impact Level section moved up for prominence
  - "Your Team" and "Your Impact" now collapsible accordions
  - Rewards Pool displays at top when available
- **YOUR ACTIVITY Card**: New stats card in WorkoutHistoryScreen showing weekly workouts, streak, and steps today
- **Settings UI**: Rewards-related features moved to Advanced Features section

### Bug Fixes (Android)
- **Step Counter Fix**: Fixed "0 steps today" display when native service is running
  - Root cause: Privacy ROM detection was incorrectly bypassing native step counter
  - Fix: Now checks if native service is running before applying ROM check
  - Files: `NativeStepCounterService.ts`, `DailyStepCounterService.ts`

### Bug Fixes (Competitions)
- **Leaderboard Deduplication**: Prevents inflated distances from duplicate workout submissions
  - Added deduplication logic to `SupabaseCompetitionService.getLeaderboard()`
  - Matches by (npub, rounded distance, date)
- **Double Zap Prevention**: Running Bitcoin rewards now use server-backed claim tracking
  - Prevents duplicate reward claims across app reinstalls

### Technical
- New files: `src/utils/unifiedWorkoutMerge.ts`, `src/components/profile/tabs/UnifiedWorkoutsTab.tsx`
- Modified: `WorkoutTabNavigator.tsx` simplified from ~157 to ~75 lines
- New config: `EINUNDZWANZIG_REWARD_CONFIG` in constants file

---

## [1.6.1] - 2026-01-16 - Security, Bug Fixes & Performance

### Security
- Migrated to fresh Supabase project infrastructure
- Removed hardcoded secrets from test scripts
- Removed exposed API keys from source code

### Performance
- Added batch pagination to Running Bitcoin leaderboard (21 at a time + "See More")
- Added batch pagination to January Walking leaderboard (21 at a time + "See More")
- Faster initial render for competition screens with 100+ participants

### Fixed
- Season II leaderboard no longer stuck on loading spinner
- Added missing competition entries for activity-specific leaderboards (running/walking/cycling)
- Restored workout sync cron jobs with correct vault secrets
- Fixed error handling to preserve hardcoded participant data on Supabase errors

### New Features
- **Local-First Leaderboards**: Users now appear on leaderboards immediately after hitting "Compete"
  - No more 2-minute wait for Supabase sync
  - Workout data pulled from local storage for instant display
  - Gracefully merges with server data when sync completes
- **Auto-Compete Default**: New users now have auto-compete enabled by default
  - Workouts automatically publish to competitions when finished
  - Toggle available in Settings → Fitness Tracking

### Technical
- 7 edge functions deployed to new Supabase project
- Vault secrets updated for new project URL and service role key
- Participant data migrated (134 Running Bitcoin, 38 January Walking, 61 Einundzwanzig)
- Local-first leaderboard improvements:
  - Reusable loadLocalWorkouts callback with useFocusEffect integration
  - 10-minute local cache window (up from 5 minutes)
  - Distance and timestamp validation for local workouts
  - Activity type detection with explicit mapping

---

## [1.6.0] - 2026-01-15 - UI Improvements & Bug Fixes

### UI/UX Improvements
- Replaced blocking modal alerts with non-blocking toast notifications for:
  - Compete button success messages ("Workout submitted!")
  - Clipboard copy confirmations
  - "Coming Soon" notifications
  - "Mark all read" confirmations
- Standardized loading indicator colors across 15 components to use theme colors
- Removed "kind 1301" technical jargon from user-facing messages

### Bug Fixes
- Fixed workout publishing failure after logout/login cycle (signer caching issue)
- Fixed NIP-55 signer dialog appearing for nsec users on Android
- Increased Amber signing timeout from 15s to 30s for slower devices
- Fixed GrapheneOS Health Connect false "Update Required" errors

### Technical
- Loading indicators now use consistent theme.colors.accent/accentText/error
- Toast notifications use existing toastConfig.tsx theming

---

## [1.5.5-debug] - 2026-01-15 - Fix Kind 1301 Publishing After Re-login

### Critical Bug Fix
- **Fixed workout publishing failure after logout/login cycle**
- Root cause: Signer was cached in memory, becoming stale after re-login
- Fix: Signer is now created fresh from SecureStore every time it's needed
- No more stale signer state = no more publishing failures

### Technical Details
- Removed `cachedSigner` from UnifiedSigningService
- `getSigner()` now always reads nsec from SecureStore and creates fresh signer
- Simplified `clearCache()` since signer is no longer cached
- Previous fixes (fresh signer at publish time, error re-throwing) retained

### Files Modified
- src/services/auth/UnifiedSigningService.ts - Removed signer caching
- src/screens/WorkoutHistoryScreen.tsx - Error propagation fix (from 1.5.4)

---

## [1.5.4-debug] - 2026-01-15 - Debug UI & Bug Fixes

### Debug UI (New)
- **Auth State Banner (Profile Screen)**: Shows auth method, nsec status, amber_pubkey status, platform, and version
- **Debug Info Section (Settings Screen)**: Expandable accordion with auth state, device info, and "Copy to Clipboard" button
- **Health Connect Debug Footer**: Shows provider, SDK status, sessions found, exercise types, and permissions

### NIP-55 Signer Dialog Bug Fix
- Fixed issue where some Android nsec users saw permission dialog from NIP-55 signer app
- Root cause: NostrAuthProvider didn't explicitly set `@runstr:auth_method = 'nostr'` during login
- Added explicit auth_method setting after successful nsec login/signup
- Added amber_pubkey cleanup to prevent cross-contamination
- Added amber_pubkey cleanup to auto-upgrade path for existing users

### Amber Signing Timeout Fix
- Increased SIGN_AMBER timeout from 15s to 30s for slower devices (Moto G52 reported)

### GrapheneOS Health Connect Fix
- Added dual provider detection (built-in `com.android.healthconnect` + Google's `com.google.android.apps.healthdata`)
- GrapheneOS users were seeing false "Update Required" errors
- Changed error message to accurate "Health Connect Unavailable" with settings link

### Files Modified
- src/services/auth/UnifiedSigningService.ts - Added getDebugInfo() and amber_pubkey cleanup
- src/components/profile/DebugAuthBanner.tsx - New component
- src/screens/SettingsScreen.tsx - Added Debug Info section
- src/screens/ProfileScreen.tsx - Added DebugAuthBanner
- src/services/auth/providers/nostrAuthProvider.ts - Explicit auth_method + amber cleanup
- src/utils/nostrTimeout.ts - SIGN_AMBER 15s → 30s
- src/services/fitness/healthConnectService.ts - Dual provider detection
- src/components/profile/tabs/HealthConnectTab.tsx - Better error messaging

---

## [1.5.3] - 2026-01-14 - Bug Fixes & Performance

### Charity Donations
- Fixed 100% charity donation bug where only first user per day could donate to a charity
- Charity payments now bypass per-address rate-limiting (server-side fix deployed)

### Performance
- Run for Bitcoin leaderboard now uses batch pagination (21 entries at a time)
- Added React.memo optimization to leaderboard rows for smoother scrolling
- "See More" button loads additional entries on demand

### UI/UX
- Changed "Share & Claim 1,000 Sats" button to "Claim Reward"
- Fixed theme color violations across 7 components
- Replaced yellow/green/red colors with theme orange throughout app

### Files Updated
- SatlantisLeaderboard.tsx - batch pagination + memoization
- RunningBitcoinDetailScreen.tsx - button text + colors
- CharitySection.tsx, WatchSyncSection.tsx, toastConfig.tsx
- PermissionRequestModal.tsx, WearableConnectionModal.tsx
- ActivityDebugOverlay.tsx - debug status colors

---

## [1.5.2] - 2026-01-14 - Social Sharing & Competitions

### Donations
- Always show split preview when team selected (shows "You: 50 sats" at 0%)
- Server-side donation forwarding with automatic retry (pending_donations + cron)

### Social Sharing
- Simplified to 3 templates: Text, Camera, Profile
- Profile template redesigned: username/quote top, avatar center, stats bottom, team shoutout
- Strength workouts show reps/sets in Profile template
- Status bar hidden in full screen preview

### Competitions
- Opened event leaderboards to all joined users
- Fixed January step leaderboard (shows actual step counts, not distance)
- Enrolled Season II participants in Running Bitcoin
- Simplified Einundzwanzig challenge join flow

### Settings
- Removed wearables sync section from settings

### Infrastructure
- Improved leaderboard syncing reliability
- Added competition diagnostic tools

---

## [1.5.1] - 2026-01-13 - Security & Anti-Cheat

### Security & Anti-Cheat
- Workout verification system (HMAC-based `["v", "code"]` tags)
- Rate limiting on reward claims

### Rewards
- Cardio-only rewards (running/walking/cycling only earn sats)

### Notifications
- Privacy-first broadcast push notifications for leaderboard updates

### Performance
- Native Stack Navigator (faster screen transitions)
- ~3,000 lines dead code removed (14 files)

### UX Changes
- Workout cards save locally (screenshot to share externally)
- Auto-compete toggle in Settings
- Login/welcome modals compacted to fit without scrolling

### Fixes
- NIP-01 Schnorr signatures (was incorrectly using ECDSA)
- Various stability improvements

---

## [1.4.9] - 2026-01-11 - Stability & Bug Fixes

### Activity Tracker
- Fixed GPS death after 20-30 minutes on Android
- Reverted GPS timeout to 15s for faster recovery (was 30s)
- Improved watchdog detection of GPS hiccups

### Daily Rewards
- Fixed reward streak tracking bug
- Step rewards now pay 100% to user (simplified donation flow)
- Fixed foreground step catch-up calculation

### Leaderboards
- Improved leaderboard data fetching and caching
- Fixed profile display issues in Season 2 leaderboards
- Better handling of workout sync errors

### Impact Level System
- Fixed Impact Level XP calculation display
- Improved charity section layout
- Better handling of donation tracking

### Competition Services
- Improved January Walking Contest sync
- Better Running Bitcoin challenge tracking
- Enhanced Supabase competition service reliability

---

## [1.4.8] - 2026-01-11 - Activity Tracker Stability

### Activity Tracker Fixes
- Added GPS health monitoring for signal quality tracking
- Added workout crash recovery with 30-second checkpoints
- Added navigation prevention during active workouts
- Prevents accidental navigation away from tracker screen during workouts
- Users now get confirmation dialog if trying to leave during active tracking

### Files Restored
- GPSHealthMonitor.ts - Monitors GPS signal quality (excellent/good/poor/lost)
- WorkoutRecovery.ts - Saves checkpoint every 30 seconds for crash recovery

---

## [1.4.7] - 2026-01-10 - Performance & Bug Fixes

### Season 2 Performance
- Fixed 60-second freeze when switching tabs in Season II leaderboard
- Added prefetch for all Season 2 activity types on app startup
- Skip unnecessary Nostr profile queries for Season 2 (use hardcoded data)
- Added 5-second timeout to profile fetching to prevent UI freezes

### Bug Fixes
- Fixed Amber Signer integration issues
- Fixed Kind 1 post publishing bug
- Fixed JanuaryWalking `getCompetitionId` error
- Fixed HTTP image URL causing iOS App Transport Security error

### Leaderboard Improvements
- Improved avatar and username display in leaderboards
- Enhanced profile data loading with better fallbacks

### Health Integration
- Improved Apple Health and Health Connect activity syncing
- Better handling of "Other" activity types

### Settings
- Renamed "Experimental Features" to "Advanced Features"
- Advanced features now available to all users

### Codebase
- Continued refactoring and cleanup
- Removed additional dead code
- Updated documentation

---

## [1.4.6] - 2026-01-10 - Simplification & Refactoring

### Leaderboard Improvements
- Enhanced leaderboard performance and visual design
- Improved ranking accuracy and display

### Running Bitcoin Challenge
- Updated Running Bitcoin event configuration

### UI Simplification
- Simplified Activity Tracker interface for cleaner experience
- Streamlined Rewards screen layout

### Codebase Improvements
- Major refactoring effort (~20k lines of code simplified)
- Bug fixes and UI polish throughout the app

---

## [1.4.5] - 2026-01-08 - Performance & Polish

### Performance Improvements
- Increased overall app speed and responsiveness
- Optimized Nostr queries for faster data loading
- Reduced memory usage across all screens

### Leaderboard Improvements
- Enhanced leaderboard performance and accuracy
- Improved ranking calculations
- Better caching for faster leaderboard updates

### UI Updates
- Polished interface elements throughout the app
- Improved visual consistency
- Minor layout refinements

### Bug Fixes
- Various stability improvements
- Minor bug fixes across the app

---

## [1.4.4] - 2026-01-08 - Step Competitions & Performance

### New Features
- **Step Daily Leaderboard**: New daily leaderboard for step counting competitions
- **Compete/Post for Steps**: Added compete and post functionality to step tracking

### Performance
- Increased app speed and performance across all screens

---

## [1.4.2] - 2026-01-05 - UI Simplification & Performance

### UI Simplification
- Streamlined navigation with cleaner interface
- Removed custom event creation (use standard event wizard instead)
- Consolidated all competitions into the Events page for easier discovery

### Access Control
- Gated experimental features to Season II participants only
- PPQ.AI integration, AI model selection, and Advanced Analytics now require Season Pass

### Performance
- Improved leaderboard performance across all screens
- Optimized Nostr queries for faster data loading

---

## [1.4.0] - 2026-01-03 - Rewards Tab Refresh & Leaderboard Performance

### New Features
- **Impact Level System**: New donation-based leveling system with XP, streak bonuses, and level titles
- **Weekly Rewards Card**: Shows sats earned this week with 7-dot workout streak indicator
- **Personal Impact Section**: Breakdown of your donation history by charity
- **Donation Splits Redesign**: Card-style UI with charity avatar, lightning address, and zap button
- **Running Bitcoin Event**: Special charitable event for ALS Network

### UI Improvements
- Moved "Import from Nostr" button to fitness tracking screen
- Moved RUNSTR Premium features to Settings → Experimental section
- Rewards tab completely redesigned with accordion sections
- Zap buttons styled consistently across the app (outline icon)

### Performance Optimizations
- Leaderboard query performance improvements
- Reduced redundant Nostr queries

---

## [1.3.1] - 2025-12-31 - Bug Fixes

### UI Updates
- "FITNESS TRACKER" → "START WORKOUT" on profile
- "FITNESS HISTORY" → "VIEW HISTORY" on profile
- "FITNESS COMPETITIONS" → "BROWSE COMPETITIONS" on profile
- Team zap buttons now match daily leaderboard style (outline icon)

### Bug Fixes
- Fixed donation split bug (rewards now correctly split with selected team)
- Fixed "undefined is not a function" crash on Leaderboards tab (Map serialization)

## [1.3.0] - 2025-12-31 - Season II Launch & Performance

### Season II
- Registration closed UI with lock icon and closed date
- Removed entry fee display (prizes are sponsor-funded)
- Event-tagged workouts system for reliable leaderboards

### Performance Optimizations
- Season 2 leaderboard: 30s to ~2.5s load time
- AsyncStorage pre-fetch before Nostr queries
- Non-blocking cache writes
- Fixed TTL calculation bug (was 164 years, now 60 days)
- Reduced relay count from 9 to 3 defaults
- Reduced query timeouts for faster responses

### Bug Fixes
- Workout history tab switching no longer flashes "no history"
- Background step tracking toggle now persists across restarts
- Daily steps compete button works with both Amber and nsec signing
- Walking tracker uses same GPS thresholds as running tracker

### UI Improvements
- More compact Routes button
- Tab switching uses display:none pattern (instant switching)

## [1.2.6] - 2025-12-30 - Bug Fixes & UI Updates

### New Teams
- Added Bitcoin Basin team

### UI Updates
- Updated cycling tracker UI
- Updated event creation UI

### Leaderboard
- Added more participants to Season II leaderboard

### Improvements
- Minor improvements to cardio tracker

## [1.2.5] - 2025-12-28 - Simplification

### UI Updates
- Profile Screen redesign
- Bottom navigation buttons

### Teams
- Charities are now teams
- Team competitions added as option in event creation

### Coach RUNSTR
- Bringing your own key is now optional
- Improved prompts

### RUNSTR Premium
- Stats renamed to Premium
- Re-introduced the level system

### Activity Tracker
- Added Compete button to daily steps

### Bug Fixes
- NWC wallet disconnect
- Sign out deletes local data
- Apple Health workouts showing up as "other"
- Reward donation split problems

## [1.2.3] - 2025-12-23

### New Features
- **Workout Pledge System**: Join paid events by pledging future workout rewards instead of paying upfront
  - Commit N daily workouts and rewards go to event destination (captain or charity)
  - One active pledge at a time, no cancellation once committed
  - Progress tracking with ActivePledgeCard on Rewards screen
- **SimpleEventWizardV2**: Redesigned single-page event creation - all options on one screen
- **Enhanced Event Join Flow**: Join events with pledge payment option

### Improvements
- Improved reward earned modal with enhanced UI
- Better frozen event caching with additional utility methods
- Enhanced Season 2 and Satlantis event hooks
- Updated event creation and publishing flow

### Bug Fixes
- Share modal stability improvements
- Workout event store refinements

## [1.2.2] - 2025-12-23

### Bug Fixes
- Fixed share screen crash on Android caused by invalid `transformOrigin` CSS property
- Improved walk tracker GPS accuracy with tuned thresholds (stricter 35m accuracy, looser 12m/s speed filter)
- Reduced GPS recovery skip points from 3 to 2 to minimize distance loss during walks

### Performance Improvements
- Added FrozenEventStore for permanent caching of ended event data (zero network calls for completed events)
- Memory cache initialization during app startup for instant frozen event access

### New Features
- GPS Permissions Diagnostics component in Settings > Fitness Tracking (Android only)
- Shows status and fix actions for: Location Services, Background Location, Location Accuracy, Battery Optimization

## [1.2.1] - 2025-12-20

### Bug Fixes
- Fixed version display in Settings screen (was showing outdated 1.0.5)
- Minor stability improvements

### Walk Tracker Simplification
- **Simplified to match Running Tracker**: Shows distance + duration as hero metrics during active tracking
- **No more step confusion**: Removed step count display during active walks (Health Connect batching caused 0-step display)
- **Clean data sources**: Tracked Steps card now only pulls from Health Connect (no local workout mixing)

## [1.2.0] - 2025-12-XX

### Features
- Major UI/UX improvements
- Enhanced user experience across all screens

## [1.1.0] - 2025-XX-XX

### Features
- Step counter integration
- Coach Claude AI assistant
- Various bug fixes

## [1.0.5] - 2025-XX-XX

### Bug Fixes
- Season II optimization
- Web of Trust (WOT) improvements
