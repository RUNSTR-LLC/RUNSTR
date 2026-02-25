# Screens Directory

Main application screens for the RUNSTR mobile app's user interface.

## Main Tab Screens

- **ProfileScreen.tsx** - Profile tab: displays user profile header, workout history, stats, and tab navigation for workout views.
- **TeamsScreen.tsx** - Teams tab: browse and select charities to support with workouts. Features Lightning zap buttons for direct donations.
- **RewardsScreen.tsx** - Rewards tab: wallet and earnings dashboard showing total sats earned, Impact Level, and donation splits.

## Authentication

- **LoginScreen.tsx** - Nostr nsec authentication screen with direct AuthContext integration.

## Workout and Fitness

- **WorkoutHistoryScreen.tsx** - Workout history with tabs for Local, Apple Health (HealthKit), and Health Connect sources.
- **AdvancedAnalyticsScreen.tsx** - Privacy-first local analytics dashboard with on-device calculations from local workout data.
- **HealthProfileScreen.tsx** - Optional on-device health data entry (weight, height, age) for improved analytics.
- **FitnessTestResultsScreen.tsx** - Displays RUNSTR Fitness Test scores, grade badges, and Nostr publishing options.
- **JournalHistoryScreen.tsx** - Full journal entry history view grouped by month, with tap-to-edit support.

## Events and Competitions

- **CompeteScreen.tsx** - Main competitions/events hub with cards for Satlantis, Einundzwanzig, Season II, and Leaderboards.
- **CompetitionsListScreen.tsx** - Global daily leaderboards (5K, 10K, Half Marathon, Marathon, Steps) backed by Supabase.
- **EventsScreen.tsx** - My Events screen showing daily leaderboards from all teams the user has joined.
- **EventDetailScreen.tsx** - *(Legacy/unused)* Event detail view using SimpleCompetitionService and SimpleLeaderboardService. Not actively consumed.
- **LeaderboardsScreen.tsx** - Dedicated daily running leaderboards with pending submission and step competition support.
- **LeagueDetailScreen.tsx** - League detail view with leaderboard display.

## Teams

- **SimpleTeamScreen.tsx** - Lightweight team detail screen replacing EnhancedTeamScreen to fix navigation freeze issues.
- **TeamScreen.tsx** - Team display screen with header, about/prize section, leaderboard, and events cards.
- **TeamDiscoveryScreen.tsx** - Team discovery modal for new users to pick teams by skill level, prize pools, and activity.
- **MyTeamsScreen.tsx** - Shows all teams the user has joined with compact team cards.
- **CaptainDashboardScreen.tsx** - Team captain management dashboard with member management, quick actions, and event/league creation wizards.

## Rewards and Donations

- **DonateScreen.tsx** - Charity donation flow allowing users to donate to supported charities or RUNSTR via Lightning.
- **WalletScreen.tsx** - User's personal Bitcoin wallet interface with balance, earnings, and send/receive functionality.

## Settings and Support

- **SettingsScreen.tsx** - Consolidated settings for account, teams, and notifications. Step rewards currently disabled (NWC moved to external service).
- **ProfileEditScreen.tsx** - Edit Nostr profile metadata (kind 0) including display name, bio, picture, and Lightning address.
- **HelpSupportScreen.tsx** - FAQ and help documentation with expandable sections.
- **ContactSupportScreen.tsx** - In-app support contact form with categorized support requests.
- **PrivacyPolicyScreen.tsx** - Privacy policy and data handling information for the Nostr-native context.

## Subdirectories

### activity/

Activity tracking screens for GPS-tracked and manual workouts.

- **ActivityTrackerScreen.tsx** - Main activity tracking interface with 2D swipe grid navigation across activity categories (Cardio, Strength, Wellness).
- **RunningTrackerScreen.tsx** - Real-time GPS running tracker displaying distance, time, pace, and elevation.
- **WalkingTrackerScreen.tsx** - Walking activity tracker with GPS tracking, step estimation, and daily step goal tracking.
- **CyclingTrackerScreen.tsx** - Cycling activity tracker with speed, distance, time, and elevation metrics.
- **HikingTrackerScreen.tsx** - GPS-based hiking tracker focused on distance, time, elevation, and calories.
- **StepsDisplayScreen.tsx** - Walk screen with circular progress ring showing daily steps and WoT-gated posting.
- **StrengthTrackerScreen.tsx** - Strength training tracker with set/rep counter and configurable rest timer.
- **MeditationTrackerScreen.tsx** - Simple meditation timer with type selection and duration tracking.
- **DietTrackerScreen.tsx** - Meal logger and fasting tracker that logs meals with timestamps and calculates fasting duration.
- **WaterTrackerScreen.tsx** - Daily water intake tracker with quick-add buttons and daily goal progress.
- **ManualEntryScreen.tsx** - Universal manual workout entry that adapts UI based on category (cardio, strength, diet, wellness).
- **ManualWorkoutScreen.tsx** - Manual workout entry with presets for logging non-GPS tracked activities.

### events/

Detail screens for specific hardcoded competition events.

- **EinundzwanzigDetailScreen.tsx** - Einundzwanzig Fitness Challenge detail screen with combined running+walking leaderboard and featured charities via Supabase.

### routes/

Route management screens.

- **SavedRoutesScreen.tsx** - Browse and manage saved route labels with filtering by activity type, renaming, and deletion.

### satlantis/

Satlantis event integration screens.

- **SatlantisDiscoveryScreen.tsx** - Main discovery feed for browsing upcoming and live Satlantis sports/race events.
- **SatlantisEventDetailScreen.tsx** - Event detail with participants, fastest-time leaderboard, and free/paid join options for RUNSTR events.

### season2/

Season II competition screens.

- **Season2Screen.tsx** - RUNSTR Season 2 competition screen with info card, activity tabs (Running, Walking, Cycling), Supabase-powered leaderboards, and charity rankings.
