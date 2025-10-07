# RUNSTR REWARDS - Claude Context

## Project Overview
RUNSTR REWARDS is a React Native mobile application that transforms fitness routines into Bitcoin-powered team competitions through Nostr's decentralized protocol. The app creates a complete fitness economy where every user gets an auto-created Lightning wallet (implemented via NIP-60/61 protocol), enabling instant peer-to-peer Bitcoin transactions. Team members can zap satoshis to each other for motivation, captains can distribute prizes directly, and fitness teams operate as self-contained Bitcoin circular economies.

📖 **For detailed overview, see**: [RUNSTR_REWARDS_OVERVIEW.md](./RUNSTR_REWARDS_OVERVIEW.md)
📖 **For user flow documentation, see**: [APP_USER_FLOW_AND_CAPTAIN_EXPERIENCE.md](./docs/APP_USER_FLOW_AND_CAPTAIN_EXPERIENCE.md)

## Core User & Captain Experience
**User Flow**: Nsec login → Auto-wallet creation → Profile screen → Teams discovery → Team joining → Competition participation → Earn/send zaps
**Captain Flow**: Teams page → Captain dashboard → Competition creation → Member management → Direct Bitcoin rewards via zaps

**Key Features**:
- **Nostr-Only Authentication**: Direct nsec login with automatic profile/workout import from stored keys
- **Auto-Wallet Creation**: Every user gets a Lightning wallet automatically on login (NIP-60/61 implementation)
- **P2P Bitcoin Zaps**: Tap lightning bolt for 21 sats, long-press for custom amounts
- **HealthKit Workout Posting**: Transform Apple Health workouts into Nostr events and social media cards
- Real-time team discovery from multiple Nostr relays
- Captain dashboard with join request management and direct member zapping
- Competition creation (7 activity types, cascading dropdowns)
- Automatic leaderboard scoring based on captain-defined parameters
- **Lightning Integration**: Complete NIP-60/61 implementation for instant, low-fee Bitcoin transfers
- **Beautiful Social Cards**: Instagram-worthy workout achievement graphics with RUNSTR branding
- **Auto-Receive**: Automatic claiming of incoming zaps every 30 seconds
- **Bitcoin Circular Economy**: Teams operate as self-contained economies with entry fees, prizes, and peer support

**Authentication**:
- **Simple Login Screen**: Show login screen unless npub/nsec found in local storage
- **Direct Nostr Authentication**: Manual nsec input only (no platform-specific auth)
- **Pure Nostr Flow**: Nsec login → derive npub → store locally in AsyncStorage

## Key Technologies
- **Frontend**: React Native with TypeScript (Expo framework)
- **Data Layer**: Pure Nostr - NO SUPABASE (all data from Nostr events)
- **Authentication**: Nostr (nsec) - direct authentication only
- **Fitness Data**: Kind 1301 events from Nostr relays + Apple HealthKit
- **Team Data**: Custom Nostr event kinds for teams, leagues, events, challenges (see [nostr-native-fitness-competitions.md](./docs/nostr-native-fitness-competitions.md))
- **Bitcoin**: Lightning payments via NIP-60/61 protocol for P2P transactions with auto-wallet creation
- **Nostr Library**: NDK (@nostr-dev-kit/ndk) EXCLUSIVELY - NEVER use nostr-tools
- **Global NDK Instance**: Single shared NDK instance via `GlobalNDKService` - reduces WebSocket connections by 90%
- **Nostr Relays**: Damus, Primal, nos.lol, Nostr.band (4 relays via global NDK pool)
- **In-App Notifications**: Nostr event-driven notifications (kinds 1101, 1102, 1103) - no push notifications
- **IMPORTANT**: This project uses NO SUPABASE - pure Nostr only

## Nostr Event Kinds Reference

📖 **For comprehensive details, see**: [nostr-native-fitness-competitions.md](./docs/nostr-native-fitness-competitions.md)

**Quick Reference Table:**

### Fitness & Workout Data
- **kind 1301**: Workout events (distance, duration, calories) - **foundation of all competitions**
- **kind 1**: Social workout posts with beautiful cards

### Team Management
- **kind 33404**: Team metadata and discovery
- **kind 30000**: Team member lists (**single source of truth** for membership)
- **kind 30001**: Generic lists (secondary lists)
- **kind 1104**: Team join requests

### Competitions (Leagues & Events)
- **kind 30100**: League definitions (ongoing competitions)
- **kind 30101**: Event definitions (time-bounded competitions)
- **kind 1105**: Event join requests (separate from team joins)

### Challenges (1v1 Competitions)
- **kind 1105**: Challenge requests (initiate 1v1 competition)
- **kind 1106**: Challenge acceptances (creates kind 30000 participant list)
- **kind 1107**: Challenge declines

### Notifications
- **kind 1101**: Competition announcements
- **kind 1102**: Competition results and prize distribution
- **kind 1103**: Competition starting soon reminders

### Bitcoin/Lightning Wallet
- **kind 37375**: Wallet info (NIP-60 Lightning wallet config)
- **kind 9321**: Nutzap events (P2P Bitcoin zap receipts)
- **kind 7375**: Token events (ecash balance tracking)

### User Profile
- **kind 0**: Profile metadata (name, picture, about)
- **kind 3**: Contact lists (social graph)

**Critical Architecture:**
- **kind 1301** = workout data (what users do)
- **kind 30000** = team rosters (who's competing)
- **Leaderboards** = query kind 30000 for members → query kind 1301 from those members → calculate locally
- **No backend database** - pure client-side Nostr queries

## Kind 1301 Workout Event Format (In-App Competition Support)

Our app publishes kind 1301 events supporting all fitness activities for in-app competitions:

**Event Structure**:
- **Kind**: 1301 (fitness tracking event)
- **Content**: Plain text description (e.g., "Completed a running with RUNSTR!")
- **Tags** (REQUIRED for competition support):
  - `['d', 'unique_workout_id']` - Unique identifier for the workout
  - `['title', 'Morning Run']` - Human-readable title
  - `['exercise', 'running']` - Activity type: **running, walking, cycling, hiking, swimming, rowing, strength, yoga, meditation, other**
  - `['distance', '5.2', 'km']` - Distance value and unit (separate array elements)
  - `['duration', '00:30:45']` - Duration in HH:MM:SS format
  - `['source', 'RUNSTR']` - App identification
  - `['client', 'RUNSTR', '0.1.3']` - Client info with version
  - `['t', 'Running']` - Hashtag for activity type
  - `['calories', '312']` - Optional: Calorie count
  - `['elevation_gain', '50', 'm']` - Optional: Elevation gain with unit

**Supported Activities**:
- **Cardio**: running, walking, cycling, hiking, swimming, rowing
- **Strength**: strength (includes pushups, pullups, situps, weights, gym)
- **Wellness**: yoga, meditation
- **Other**: any manually-entered workout type

**Important Notes**:
- Content field must be plain text, NOT JSON
- Exercise type must be lowercase full words (running, not run)
- Distance must include both value and unit as separate array elements
- Duration must be in HH:MM:SS format, not seconds
- Format supports both external RUNSTR leaderboards (cardio only) and in-app competitions (all types)

## Architecture Principles
- **File Size Limit**: Maximum 500 lines per file for maintainability
- **Two-Page Simplicity**: Core app is just Teams and Profile tabs
- **Pure Nostr Data Model**: All team, competition, and social data from Nostr events
- **No Backend Dependencies**: No Supabase, no traditional backend - pure Nostr
- **Platform-Specific UX**: Different auth flows for iOS/Android
- **Real Data Only**: No mock data - all functionality uses actual Nostr events + HealthKit data
- **Folder Documentation**: Update folder READMEs when adding/removing/changing files

## Global NDK Instance Architecture

**CRITICAL: The app uses a single global NDK instance for all Nostr operations**

**Why Global NDK?**
- **Prevents Connection Explosion**: Before global NDK, 9 services × 4 relays = 36 WebSocket connections. After: 1 NDK × 4 relays = 4 connections (90% reduction)
- **Eliminates Timing Issues**: New relay managers need 2-3 seconds to connect, causing "No connected relays available" errors
- **Better Performance**: Reusing one connection pool instead of creating/destroying connections per query
- **Connection Stability**: Single instance maintains persistent relay connections throughout app lifetime

**How to Use:**
```typescript
import { GlobalNDKService } from '../services/nostr/GlobalNDKService';

// In any service that needs to query Nostr:
const ndk = await GlobalNDKService.getInstance();
const events = await ndk.fetchEvents(filter);
```

**IMPORTANT RULES:**
- ✅ **ALWAYS** use `GlobalNDKService.getInstance()` for Nostr queries
- ❌ **NEVER** create new `NostrRelayManager()` instances
- ❌ **NEVER** create new `NDK()` instances (except in GlobalNDKService itself)
- ✅ **USE** `ndk.fetchEvents()` for direct queries (returns promise)
- ✅ **USE** `ndk.subscribe()` for real-time subscriptions (returns subscription object)

**Global NDK Configuration:**
- **Default Relays**: `wss://relay.damus.io`, `wss://relay.primal.net`, `wss://nos.lol`, `wss://relay.nostr.band`
- **Initialized**: On app startup by `GlobalNDKService`
- **Connection Timeout**: 2 seconds
- **Auto-reconnect**: Built into NDK

**Services Using Global NDK:**
- `SimpleCompetitionService` - Fetches leagues/events (kind 30100, 30101)
- `SimpleLeaderboardService` - Queries workout events (kind 1301)
- `NdkTeamService` - Team discovery (kind 33404)
- `JoinRequestService` - Join requests (kind 1104, 1105)
- All other Nostr-dependent services

**Connection Status:**
```typescript
// Check if NDK is connected
const status = GlobalNDKService.getStatus();
console.log(`${status.connectedRelays}/${status.relayCount} relays connected`);

// Force reconnect if needed
await GlobalNDKService.reconnect();
```

## Project Structure
```
src/
├── components/        # Reusable UI components (<500 lines each)
│   ├── ui/           # Basic components (Card, Button, Avatar, StatusBar)  
│   ├── team/         # Team-specific components
│   ├── profile/      # Profile-specific components
│   └── fitness/      # Workout posting and display components
├── screens/          # Main app screens
├── services/         # External API integrations
│   └── notifications/ # In-app notification system (no push)
├── store/           # State management
├── types/           # TypeScript definitions
├── utils/           # Helper functions
└── styles/          # Theme system matching HTML mockups exactly
```

## App Flow Architecture
**1. Authentication & Profile Import**:
- Show login screen unless npub/nsec found in local storage
- Nsec login automatically imports profile from kind 0 events
- Derived npub stored locally in AsyncStorage for session persistence
- Workout data synced from kind 1301 events across Nostr relays
- Apple HealthKit workouts automatically imported and available for posting
- Direct navigation to Profile screen after authentication

**2. Two-Tab Navigation**:
- **Profile Tab**: Personal dashboard with unified workout history (HealthKit + Nostr), posting controls, team membership, account settings
- **Teams Tab**: Real-time team discovery, captain detection, join/create functionality

**3. Role-Based Experience**:
- **Members**: Browse teams → Join → Participate in competitions
- **Captains**: Captain dashboard access → Wizard-driven competition creation → Member management

**4. Competition System**:
- **Wizard Creation**: 7 activity types → Dynamic competition options → Time/settings configuration
- **Nostr Event Based**: Competitions published as kind 30100 (leagues) and 30101 (events)
- **Manual Entry**: Participants post kind 1301 workout events to enter competitions
- **Automatic Scoring**: Real-time leaderboards based on captain's wizard parameters
- **Bitcoin Rewards**: Direct P2P zaps via Lightning - captains and members can instantly send satoshis

**5. Team Management**:
- **Two-Tier Membership**: Local joining (instant UX) + Official Nostr lists (captain approval)
- **Join Requests**: Real-time notifications with approval workflow
- **Member Lists**: Nostr kind 30000/30001 lists for fast competition queries

**6. In-App Notification System**:
- **Nostr Event-Driven**: Real-time processing of kinds 1101 (announcements), 1102 (results), 1103 (starting soon)
- **In-App Only**: Notifications appear while app is active (no push notifications)
- **User Preference Integration**: Respects Profile notification settings with granular control
- **Pure Client-Side**: No external push services, all notifications handled locally

**7. HealthKit Workout Posting System**:
- **Unified Workout Display**: Shows both HealthKit and Nostr workouts in single timeline
- **Two-Button System**: "Save to Nostr" (kind 1301 for competitions) vs "Post to Nostr" (kind 1 social)
- **Beautiful Social Cards**: SVG-based workout achievement graphics with RUNSTR branding
- **Smart Status Tracking**: Prevents duplicate posting, shows completion states
- **Achievement Recognition**: Automatic badges for PRs, distance milestones, calorie burns
- **Motivational Content**: Inspirational quotes tailored to workout types

**8. Pure Nostr Competition System**:
- **Kind 30000 Member Lists**: Team members stored in Nostr kind 30000 lists (single source of truth)
- **Competition Query Engine**: `Competition1301QueryService` queries kind 1301 workout events from team members
- **Dynamic Leaderboards**: Real-time calculation based on wizard-defined parameters (no database needed)
- **Captain Member Management**: Approve/remove members directly modifies kind 30000 Nostr lists
- **Cached Performance**: 5-minute cache for member lists, 1-minute cache for competition queries
- **Scoring Algorithms**: Total distance, consistency streaks, average pace, longest workouts, calorie tracking
- **No Backend Required**: Pure client-side Nostr queries replace all database dependencies

## UI Requirements
Simple two-tab interface with dark theme:
- **Colors**: Black background (#000), dark cards (#0a0a0a), borders (#1a1a1a)
- **Navigation**: Bottom tab bar with Teams and Profile tabs
- **Teams Tab**: Feed layout with "+" button for team creation
- **Profile Tab**: Unified workout history with posting controls, notification preferences, team membership
- **Team Dashboard**: Three sections (League, Events, Challenges) when viewing a team
- **In-App Notifications**: Real-time Nostr event notifications displayed while app is active

## Development Workflow & Testing Protocol

**CRITICAL: React Native/Expo requires TWO components running simultaneously:**

### **Metro Bundler (JavaScript Engine)**
- **Purpose**: Transforms and serves your React Native code to the app
- **Start Command**: `npx expo start --ios` (starts on port 8081)
- **Role**: Watches `src/` files, compiles TypeScript/React Native to JavaScript bundles
- **Logs**: Shows app's `console.log()`, React Native errors, service initializations
- **Hot Reload**: Changes to `src/` files appear instantly via Fast Refresh

### **Xcode (Native iOS Shell)**  
- **Purpose**: Builds and runs the native iOS wrapper
- **Start Command**: `open ios/runstrproject.xcworkspace`
- **Role**: Compiles native iOS code, installs app on device/simulator
- **The App Logic**: Native shell downloads JavaScript from Metro at `http://localhost:8081`
- **Logs**: Shows native iOS system events, less useful for app logic debugging

### **Standard Testing Protocol**
**When user says "let's test" or requests testing, Claude should:**

1. **Check Metro Status**: Verify Metro bundler is running on port 8081
   - If not running: Start with `npx expo start --ios` 
   - If running on wrong port: Kill and restart on 8081
   - If stale: Use `npx expo start --clear --ios` to reset cache

2. **Open Xcode Workspace**: `open ios/runstrproject.xcworkspace`
   - Select iOS Simulator (not physical device unless specified)
   - Click Play ▶️ button or Cmd+R

3. **Monitor Metro Logs**: Use BashOutput tool to check Metro's console output
   - Metro logs show actual app behavior and JavaScript execution
   - Look for authentication flows, service initialization, errors
   - Ignore Xcode native system logs unless investigating native issues

4. **Force Refresh if Needed**: 
   - Press `Cmd+R` in iOS Simulator to reload from Metro
   - Or restart Metro with `--clear` flag if changes aren't appearing

### **Development Commands**
- `npm install` - Install dependencies
- `npx expo start --ios` - **REQUIRED**: Start Metro bundler + open simulator
- `npx expo start --clear --ios` - Clear Metro cache and restart
- `open ios/runstrproject.xcworkspace` - Open Xcode (after Metro is running)
- `npm run typecheck` - TypeScript validation
- `npm run lint` - Code linting

### **Android APK Build System**
**Build Infrastructure:**
- **Android Studio**: Installed at `/Applications/Android Studio.app`
- **Android SDK**: Located at `~/Library/Android/sdk`
- **Java Runtime**: Bundled with Android Studio at `/Applications/Android Studio.app/Contents/jbr/Contents/Home`
- **Gradle Wrapper**: Project includes `android/gradlew` for consistent builds
- **Configuration**: Requires `android/local.properties` file pointing to SDK location

**Building Android APK:**
```bash
# 1. Create local.properties if it doesn't exist
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties

# 2. Set JAVA_HOME to Android Studio's bundled JDK
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"

# 3. Clean previous builds (optional but recommended)
cd android && ./gradlew clean

# 4. Build release APK
./gradlew assembleRelease

# 5. APK output location
# android/app/build/outputs/apk/release/app-release.apk
```

**Build Output:**
- **APK Location**: `android/app/build/outputs/apk/release/app-release.apk`
- **Size**: ~120MB (includes all native libraries and assets)
- **Signing**: Uses debug keystore (for testing/direct distribution, not Play Store)
- **Version Info**: Defined in `android/app/build.gradle` (versionCode and versionName)

**Version Management:**
- **Version Name**: Set in `app.json` (`"version": "0.1.8"`)
- **Version Code**: Set in `android/app/build.gradle` (`versionCode 8`)
- **Package ID**: `com.anonymous.runstr.project`
- **Target SDK**: API 35 (Android 15)
- **Min SDK**: API 24 (Android 7.0)

**Important Notes:**
- ✅ All build tools come from Android Studio installation (no separate downloads needed)
- ✅ Gradle wrapper handles dependency downloads automatically
- ✅ Build works from command line without opening Android Studio IDE
- ⚠️ Debug keystore signing is for testing only - production builds need release keystore
- ⚠️ First build may take 5-10 minutes as Gradle downloads dependencies

### **Change Types & Required Actions**
**JavaScript/TypeScript Changes (src/ files):**
- ✅ **Auto-reload**: Metro handles via Fast Refresh
- ✅ **No Xcode rebuild needed**
- 🔄 **If not appearing**: Press Cmd+R in simulator or restart Metro with `--clear`

**Native Configuration Changes:**  
- ❌ **Requires Xcode rebuild**: Changes to `app.json`, iOS permissions, new dependencies
- ❌ **No auto-reload**: Must rebuild and reinstall via Xcode
- 🔄 **Process**: Stop Metro → Make changes → Rebuild in Xcode → Restart Metro

### **Common Issues & Solutions**
- **"No script URL provided"**: Metro not running or wrong port → Start Metro on 8081
- **"Connection refused [61]"**: App can't reach Metro → Check Metro is on localhost:8081  
- **Changes not appearing**: Fast Refresh failed → Press Cmd+R or restart Metro with `--clear`
- **App crashes on startup**: Check Metro logs for JavaScript errors, not Xcode logs

## Local Data Storage
**Pure Nostr Architecture**: All data comes from Nostr events, with local caching for performance.

**Local Storage (AsyncStorage)**:
- User's nsec/npub for authentication:
  - `@runstr:user_nsec` - User's private key (nsec)
  - `@runstr:npub` - User's public key (npub)
  - `@runstr:hex_pubkey` - User's hex-encoded public key
- Cached team membership status
- Workout posting status (to prevent duplicates)
- User preferences and settings

**Captain Detection**:
- Captain status determined from team's Nostr events
- Team captain field checked against user's npub/hex pubkey
- No backend verification needed - pure client-side from Nostr data

## Quality Assurance Requirements
**MANDATORY: Before completing any development phase:**
1. **Run Quality Checks:**
   ```bash
   npm install           # Ensure all dependencies installed
   npm run typecheck     # Verify TypeScript compilation
   npx prettier --write "src/**/*.{ts,tsx}"  # Fix formatting
   ```
2. **Review LESSONS_LEARNED.md** - Check for known issues and prevention strategies
3. **Update Folder READMEs** - Ensure all folder README.md files reflect current file structure
4. **Verify Phase Deliverables** - Ensure all planned functionality works as expected

**Note:** No phase should be marked "complete" until TypeScript compiles without errors, folder READMEs are current, and lessons learned have been reviewed.

## Pre-Launch Review System
**IMPORTANT: Use this system before any major release or launch.**

The project includes a comprehensive pre-launch review system with both automated and manual review capabilities.

### Automated Audit (5 minutes)
```bash
npm run audit:pre-launch
```

**What it checks:**
- ✅ Error boundaries and try-catch blocks
- ✅ Loading states on data-fetching screens
- ✅ Memory leaks (useEffect cleanup)
- ✅ Hardcoded colors vs theme usage
- ✅ Console.log statements
- ✅ AsyncStorage error handling
- ✅ Unbounded Nostr queries (performance)
- ✅ Empty state handling

**Output:** Generates `AUDIT_REPORT.md` with categorized issues (Critical, High, Medium, Low)

### Manual Claude Review (90 minutes)
For deep analysis requiring human judgment:

1. Open a new Claude conversation
2. Paste the content from `CLAUDE_REVIEW_PROMPT.md`
3. Claude will systematically review:
   - TypeScript compilation and build errors
   - Authentication and wallet security
   - Nostr connection stability
   - Loading/error/empty states
   - Navigation edge cases
   - Performance bottlenecks
   - UI consistency and accessibility
   - Launch readiness checklist

**Output:** Comprehensive report with prioritized, actionable recommendations

### When to Use
- **Automated Audit**: Run daily during pre-launch week, after major changes
- **Manual Review**: Before initial launch, before major releases, quarterly health checks

### Review Priority Levels
- 🔴 **Critical**: Fix before launch (crashes, data loss, security issues)
- 🟠 **High**: Quick wins (loading states, performance, UX gaps)
- 🟡 **Medium**: Post-launch OK (UI polish, consistency)
- 🟢 **Low**: Technical debt (refactoring, documentation)

### Complete Documentation
📖 **See**: `PRE_LAUNCH_REVIEW_GUIDE.md` for detailed workflow and usage instructions
📖 **See**: `PRE_LAUNCH_REVIEW_SCRIPT.md` for Claude's manual review guide
📖 **See**: `CLAUDE_REVIEW_PROMPT.md` for ready-to-paste Claude prompt

**Note:** Always fix Critical issues before launch. High-priority items are recommended if time permits.

## Git Workflow Requirements
**MANDATORY: After every successful fix or feature implementation:**

1. **Commit Successful Changes:**
   ```bash
   git add .
   git status                    # Verify changes are appropriate
   git commit -m "descriptive message about the fix/feature"
   git push origin main         # Save progress to GitHub
   ```

2. **Commit Message Guidelines:**
   - **Fix commits**: "Fix: [brief description of what was fixed]"
   - **Feature commits**: "Feature: [brief description of new functionality]" 
   - **Refactor commits**: "Refactor: [what was improved/reorganized]"
   - **Documentation commits**: "Docs: [what documentation was added/updated]"

3. **When to Commit:**
   - ✅ After successfully fixing a bug or error
   - ✅ After completing a new feature or component
   - ✅ After major refactoring that improves code structure
   - ✅ After updating documentation or configuration
   - ✅ After updating folder README.md files when adding/removing/changing files
   - ❌ Do NOT commit broken or incomplete implementations
   - ❌ Do NOT commit if TypeScript compilation fails
   - ❌ Do NOT commit if folder READMEs are out of sync with actual files

4. **Progress Preservation:**
   - Each commit serves as a checkpoint to prevent work loss
   - Enables easy rollback if new changes introduce issues
   - Creates clear development history for future reference
   - Facilitates team collaboration and code review

**Note:** This rule ensures continuous progress preservation and maintains a clean development history on GitHub.

## Folder Documentation Requirements
**MANDATORY: Maintain folder README files throughout development:**

1. **Update Folder READMEs When Making Changes:**
   - Add new files → Update relevant folder's README.md with file description
   - Remove files → Remove entry from folder's README.md  
   - Significantly modify file purpose → Update description in folder's README.md
   - Create new folders → Add README.md with file listings and descriptions

2. **README Format Guidelines:**
   - Keep descriptions concise (1-2 sentences max per file)
   - Focus on file purpose, not implementation details
   - List subdirectories with brief explanations
   - Example: "**authService.ts** - Main authentication coordination service"

3. **Coverage Requirements:**
   - Every folder in src/ must have a README.md
   - READMEs must list all .ts/.tsx files in that folder
   - Update READMEs as part of any file modification commit

**Note:** Folder READMEs serve as quick reference guides and help maintain codebase understanding.

## Current Development Status - Captain Navigation Fixed (Jan 2025)
✅ Project structure and architecture established
✅ Two-tab navigation (Teams/Profile) with bottom tab navigation
✅ Nostr authentication with profile/workout auto-import
✅ Real-time team discovery from multiple Nostr relays
✅ **FIXED: Captain Detection System** - Single source of truth with caching architecture
✅ **FIXED: Captain Dashboard Navigation** - Button now correctly navigates captains to dashboard
✅ **Competition Wizard System** - Complete Event & League creation wizards
✅ **Captain Dashboard** - Team management with join request approvals and member removal
✅ **Dynamic Scoring System** - Automatic leaderboards based on wizard parameters
✅ **Bitcoin Integration** - NIP-60/61 Lightning P2P payments, direct prize distribution
✅ Two-tier membership system (local + official Nostr lists)
✅ **In-App Notifications** - Nostr event-driven notifications (no push)
✅ **HealthKit Workout Posting** - Transform Apple Health workouts into Nostr events and social cards
✅ **Pure Nostr Competition System** - Kind 30000 member lists, 1301 queries, dynamic leaderboards
✅ All TypeScript compilation successful - Core services production-ready

## Captain Detection Architecture (WORKING)
**The Problem We Solved**:
- Captain status was being detected correctly in TeamCard but lost during navigation
- Multiple conflicting captain detection methods causing inconsistent results
- EnhancedTeamScreen was recalculating instead of trusting navigation params

**The Solution**:
1. **Single Source of Truth**: TeamCard component detects captain from Nostr team events
2. **Caching Layer**: `CaptainCache` utility stores status in AsyncStorage when detected
3. **Navigation Trust**: Navigation handlers read from cache, pass in params
4. **Component Trust**: EnhancedTeamScreen trusts params without recalculation
5. **Clean Architecture**: Removed duplicate `TeamDashboardScreen.tsx` and navigation paths

**Captain Flow**:
- Team Discovery → TeamCard detects & caches → User clicks team
- Navigation reads cache → Passes `userIsCaptain: true` in params
- EnhancedTeamScreen receives params → Shows Captain Dashboard button
- Button click → Navigate to CaptainDashboardScreen with full management features

## Latest Implementation - Pure Nostr Competition System
**Completed Architecture** (December 2024):
- `NostrListService` - Enhanced with member add/remove methods for kind 30000 lists
- `TeamMemberCache` - 5-minute caching layer for team member lists with real-time sync
- `Competition1301QueryService` - Queries kind 1301 workout events using proven NDK pattern
- `LeagueRankingService` - Refactored to use pure Nostr queries (no database dependency)
- Captain dashboard wired to modify Nostr lists when approving/removing members

**System Capabilities**:
- Team members stored in kind 30000 Nostr lists (single source of truth)
- Competitions are dynamic queries against members' 1301 workout events
- Leaderboards calculated real-time based on wizard parameters
- Captain approves join request → member added to kind 30000 list
- Captain removes member → updated list published to Nostr
- All scoring algorithms work: distance, streaks, consistency, pace, calories
- Zero backend dependencies - pure client-side Nostr operations

## Recent Major Implementation - HealthKit Workout Posting & Social Cards
**Completed Services** (All <500 lines):
- `WorkoutMergeService.ts` - Unified workout display combining HealthKit + Nostr workouts (~300 lines)
- `WorkoutPublishingService.ts` - Nostr event creation for kind 1301 (competition) and kind 1 (social) (~400 lines)
- `WorkoutCardGenerator.ts` - SVG-based beautiful social media cards with RUNSTR branding (~500 lines)
- `WorkoutActionButtons.tsx` - UI controls for "Save to Nostr" and "Post to Nostr" (~200 lines)
- Enhanced `WorkoutHistoryScreen.tsx` - Unified workout timeline with posting controls (~500 lines)

**System Features**:
- **Two-Button Posting System**: "Save to Nostr" (kind 1301 for competitions) vs "Post to Nostr" (kind 1 social feeds)
- **Beautiful Social Cards**: 4 SVG templates (Achievement, Progress, Minimal, Stats) with RUNSTR branding
- **Smart Status Tracking**: Prevents duplicate posting, shows completion states, persists across sessions
- **Achievement Recognition**: Automatic badges for PRs, distance milestones, calorie achievements
- **Motivational Content**: Workout-type-specific inspirational quotes and achievement callouts
- **Unified Workout Display**: Seamless merging of HealthKit and Nostr workouts with source identification
- **Instagram-Worthy Cards**: Professional gradients, activity icons, stats displays, motivational messaging

**In-App Notification Implementation**:
- `NostrNotificationEventHandler.ts` - Real-time competition event processing (kinds 1101, 1102, 1103)
- `NotificationService.ts` - In-app notification display (no push)
- Notifications only appear while app is active
- No external push notification services used

## Competition Architecture (Wizard-Driven Leaderboards)

**How Competitions Actually Work:**
- Competitions are **local parameter sets** created through wizards, NOT Nostr events
- Captains use wizards to define competition parameters (activity type, dates, scoring method)
- Team membership defined by **kind 30000 Nostr lists** (single source of truth)
- Members publish **kind 1301 workout events** to Nostr as they complete workouts
- App queries 1301 events from team members and applies wizard parameters locally to calculate leaderboards
- Competition parameters cached locally using AsyncStorage for performance

**Competition Data Flow:**
1. Captain creates competition via wizard → Parameters stored locally in AsyncStorage
2. App identifies team members from kind 30000 Nostr list
3. Members post workouts as kind 1301 events (completely independent of competitions)
4. App queries members' 1301 events within competition date range
5. Local scoring engine applies wizard parameters to calculate rankings
6. Leaderboards displayed in real-time (pure client-side calculation)

**Key Architecture Principles:**
- **No Competition Events**: Competitions are NOT published to Nostr (may change in future)
- **No Team Wallets**: Direct P2P Bitcoin payments via NIP-60/61 (no pooled funds)
- **No Backend Database**: Pure Nostr events + AsyncStorage caching only
- **Ephemeral Competitions**: Competitions exist as app-side views over permanent Nostr workout data
- **Working Backend**: Uses NIP-60/61 protocol with mint.coinos.io infrastructure

**Why This Architecture:**
- **Simplicity**: No complex Nostr event types needed for competitions
- **Flexibility**: Different apps can create different competition views over same workout data
- **Privacy**: Competition parameters stay local unless captain chooses to share
- **Performance**: No network calls needed to create/modify competitions
- **Compatibility**: Works with existing kind 1301 workout events standard

## CRITICAL WALLET ARCHITECTURE RULES
**⚠️ NEVER use nostr-tools in wallet code - Use NDK exclusively**
- **NDK handles ALL Nostr operations** including key generation, nip19 encoding/decoding
- **No library mixing** - NDK has everything needed built-in for Nostr functionality
- **Crypto polyfill**: Must use `react-native-get-random-values` imported FIRST in index.js
- **Why this matters**: Mixing NDK with nostr-tools causes crypto errors and initialization failures
- **Key generation**: Use `NDKPrivateKeySigner.generate()` NOT `generateSecretKey()` from nostr-tools

## Lessons Learned from Phase 1 Troubleshooting

### 1. Navigation Architecture Conflicts
**Issue**: Expo Router and React Navigation cannot coexist - they create conflicting navigation containers causing blank screens.
**Solution**: Remove `expo-router` plugin from app.json and use standard React Navigation with NavigationContainer.
**Prevention**: Choose one navigation solution early and stick with it throughout the project.

### 2. Expo Entry Point Configuration
**Issue**: Incorrect imports in index.js (`expo/build/Expo.fx` doesn't exist) prevent bundle resolution.
**Solution**: Use proper `registerRootComponent` from 'expo' package for app registration.
**Prevention**: Always verify Expo documentation for correct entry point patterns.

### 3. Bundle Resolution Debugging
**Issue**: "No bundle URL present" errors indicate Metro bundler cannot serve the JavaScript bundle.
**Solution**: Check network connectivity with `curl http://localhost:8081/index.bundle?platform=ios` to verify bundle serving.
**Prevention**: Test bundle availability before investigating complex navigation issues.

### 4. TypeScript Interface Consistency
**Issue**: Service interfaces must match actual usage patterns to prevent runtime errors.
**Solution**: Ensure all methods and properties are properly defined in TypeScript interfaces.
**Prevention**: Run `npm run typecheck` frequently during development.

### 5. Expo vs React Native Relationship
**Key Understanding**: Expo is a framework built on top of React Native that provides full App Store deployment capabilities through EAS (Expo Application Services). No need to "eject" to vanilla React Native for store deployment.

## Lightning P2P Bitcoin System
**Complete NIP-60/61 Protocol Implementation**:
- **Auto-Wallet Creation**: Every user automatically gets a Lightning wallet on login
- **Instant Zaps**: Tap lightning bolt for 21 sats, long-press for custom amounts
- **Auto-Receive**: Background service claims incoming zaps every 30 seconds
- **Transaction History**: Full logging of all sent/received payments
- **Technical Infrastructure**: Uses NIP-60/61 protocol with mint.coinos.io backend
- **Instant Transfers**: Lightning enables instant, private Bitcoin transfers

**Zap UI Throughout App**:
- Lightning bolt buttons on user profiles and team member lists
- Custom amount modal with preset options (21, 100, 500, 1000, 5000 sats)
- Visual feedback on successful sends
- Balance display with manual refresh option

## Important Notes
- All files must stay under 500 lines of code for maintainability
- **Core User Journey**: Login → Auto-wallet → Teams → Competitions → Earn/send Bitcoin
- **Two-Page Focus**: Keep UI simple with just Teams and Profile tabs
- **Nostr-Native Data**: All team/workout data comes from Nostr events
- **Bitcoin Economy**: Every team operates as a circular economy with P2P zaps
- **Real Data Only**: No mock data - all functionality uses actual Nostr events