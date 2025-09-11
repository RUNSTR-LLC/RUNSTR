# RUNSTR.APP - Claude Context

## Project Overview
RUNSTR.APP is a React Native mobile application that transforms fitness routines into competitive, Bitcoin-earning experiences through Nostr-native team competitions. The app operates as a two-tab interface where users authenticate with Nostr, discover fitness teams, and participate in captain-created competitions with automatic scoring and Bitcoin rewards.

📖 **For detailed user flow documentation, see**: [APP_USER_FLOW_AND_CAPTAIN_EXPERIENCE.md](./APP_USER_FLOW_AND_CAPTAIN_EXPERIENCE.md)

## Core User & Captain Experience
**User Flow**: Nsec login → Profile screen → Teams discovery → Team joining → Competition participation
**Captain Flow**: Teams page → Captain dashboard → Competition creation → Member management → Bitcoin distribution

**Key Features**:
- **Nostr-Only Authentication**: Direct nsec login with automatic profile/workout import from stored keys
- **HealthKit Workout Posting**: Transform Apple Health workouts into Nostr events and social media cards
- Real-time team discovery from multiple Nostr relays
- Captain dashboard with join request management
- Competition creation (7 activity types, cascading dropdowns)
- Automatic leaderboard scoring based on captain-defined parameters
- Bitcoin integration for entry fees and prize distribution
- **Beautiful Social Cards**: Instagram-worthy workout achievement graphics with RUNSTR branding

**Authentication**:
- **Simple Login Screen**: Show login screen unless npub/nsec found in local storage
- **Direct Nostr Authentication**: Manual nsec input only (no platform-specific auth)
- **Seamless Supabase Integration**: Nsec login → derive npub → automatic Supabase user creation/lookup

## Key Technologies
- **Frontend**: React Native with TypeScript (Expo framework)
- **Data Layer**: Hybrid Nostr + Supabase (Nostr for social/teams, Supabase for competition automation)
- **Authentication**: Nostr (nsec) with npub-only Supabase integration
- **Fitness Data**: Kind 1301 events from Nostr relays + Apple HealthKit + Supabase background sync
- **Team Data**: Custom Nostr event kinds for teams, leagues, events, challenges
- **Bitcoin**: Lightning Network integration via CoinOS API
- **Nostr Tools**: nostr-tools library for event handling
- **Nostr Relays**: Damus, Primal, nos.lol for social data operations
- **Supabase**: Npub-only backend for competition automation and HealthKit background sync
- **Push Notifications**: Team-branded Expo notifications with Nostr event integration (kinds 1101, 1102, 1103)

## Architecture Principles
- **File Size Limit**: Maximum 500 lines per file for maintainability
- **Two-Page Simplicity**: Core app is just Teams and Profile tabs
- **Hybrid Data Model**: Nostr for social/teams, Supabase for seamless competition automation
- **Privacy-First Supabase**: Only npub + competition metrics stored, no traditional user accounts
- **Platform-Specific UX**: Different auth flows for iOS/Android
- **Real Data Only**: No mock data - all functionality uses actual Nostr events + HealthKit data
- **Folder Documentation**: Update folder READMEs when adding/removing/changing files

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
│   └── notifications/ # Team-branded push notification system
├── store/           # State management
├── types/           # TypeScript definitions
├── utils/           # Helper functions
└── styles/          # Theme system matching HTML mockups exactly
```

## App Flow Architecture
**1. Authentication & Profile Import**:
- Show login screen unless npub/nsec found in local storage
- Nsec login automatically imports profile from kind 0 events
- Derived npub creates/retrieves Supabase user record (no separate account needed)
- Workout data synced from kind 1301 events across Nostr relays
- Apple HealthKit workouts automatically imported and available for posting
- HealthKit background sync enabled for competition automation
- Direct navigation to Profile screen after authentication

**2. Two-Tab Navigation**:
- **Profile Tab**: Personal dashboard with unified workout history (HealthKit + Nostr), posting controls, team membership, account settings
- **Teams Tab**: Real-time team discovery, captain detection, join/create functionality

**3. Role-Based Experience**:
- **Members**: Browse teams → Join → Participate in competitions
- **Captains**: Captain dashboard access → Wizard-driven competition creation → Member management

**4. Hybrid Competition System**:
- **Wizard Creation**: 7 activity types → Dynamic competition options → Time/settings configuration
- **Smart Auto-Entry**: HealthKit workouts automatically evaluated for competition eligibility
- **Dual Data Sources**: Competitions pull from both Supabase auto-entries AND manual Nostr kind 1301 events
- **Deduplication Logic**: Same workout cannot count twice, manual entries prioritized over auto-entries
- **Automatic Scoring**: Real-time leaderboards based on captain's wizard parameters
- **Privacy Controls**: Opt-in consent for auto-sync, "ghost mode" for competition-only participation
- **Bitcoin Integration**: Entry fees, prize pools, automatic reward distribution

**5. Team Management**:
- **Two-Tier Membership**: Local joining (instant UX) + Official Nostr lists (captain approval)
- **Join Requests**: Real-time notifications with approval workflow
- **Member Lists**: Nostr kind 30000/30001 lists for fast competition queries

**6. Push Notification System**:
- **Team-Branded Notifications**: All notifications include team context and branding
- **Competition Events**: Real-time processing of kinds 1101 (announcements), 1102 (results), 1103 (starting soon)
- **User Preference Integration**: Respects Profile notification settings with granular control
- **Nostr-Native Processing**: Direct integration with existing NostrTeamService and NostrRelayManager

**7. HealthKit Background Sync & Posting System**:
- **iOS Background Delivery**: HealthKit workout updates delivered when app backgrounded
- **Smart Auto-Processing**: New workouts automatically evaluated for active competitions
- **Supabase Processing Pipeline**: Background service maintains competition cache and eligibility rules
- **Unified Workout Display**: Shows both HealthKit and Nostr workouts in single timeline
- **Two-Button System**: "Save to Nostr" (kind 1301 for competitions) vs "Post to Nostr" (kind 1 social)
- **Beautiful Social Cards**: SVG-based workout achievement graphics with RUNSTR branding
- **Smart Status Tracking**: Prevents duplicate posting, shows completion states
- **Privacy-First Storage**: Only competition metrics (type, duration, distance, calories) stored in Supabase
- **Achievement Recognition**: Automatic badges for PRs, distance milestones, calorie burns
- **Motivational Content**: Inspirational quotes tailored to workout types

## UI Requirements
Simple two-tab interface with dark theme:
- **Colors**: Black background (#000), dark cards (#0a0a0a), borders (#1a1a1a)
- **Navigation**: Bottom tab bar with Teams and Profile tabs
- **Teams Tab**: Feed layout with "+" button for team creation
- **Profile Tab**: Unified workout history with posting controls, notification preferences, team membership
- **Team Dashboard**: Three sections (League, Events, Challenges) when viewing a team
- **Push Notifications**: Team-branded notifications with rich content (leaderboards, earnings, actions)

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

## Supabase Data Model
**Privacy-First Architecture**: No traditional user accounts, only npub-based records for competition automation.

**Core Tables**:
```sql
-- Users table: Minimal npub-only records
users (
  npub TEXT PRIMARY KEY,           -- Nostr public key
  device_token TEXT,               -- Push notifications
  healthkit_enabled BOOLEAN,       -- Auto-sync consent
  last_sync TIMESTAMP,             -- Background sync tracking
  ghost_mode BOOLEAN DEFAULT FALSE -- Competition-only participation
)

-- Workouts table: Competition metrics only
workouts (
  id UUID PRIMARY KEY,
  npub TEXT REFERENCES users(npub),
  workout_id TEXT UNIQUE,          -- HealthKit UUID
  type TEXT NOT NULL,              -- Exercise type
  duration INTEGER,                -- Minutes
  distance REAL,                   -- Meters
  calories INTEGER,                -- Total burned
  start_time TIMESTAMP,            -- Workout start
  created_at TIMESTAMP DEFAULT NOW
)

-- Competition entries: Auto-entry tracking
competition_entries (
  id UUID PRIMARY KEY,
  npub TEXT REFERENCES users(npub),
  competition_id TEXT,             -- Nostr event ID
  workout_id UUID REFERENCES workouts(id),
  score REAL,                      -- Calculated points
  auto_entered BOOLEAN,            -- Auto vs manual entry
  created_at TIMESTAMP DEFAULT NOW
)
```

**Background Processing**: Supabase Edge Functions evaluate workout eligibility, maintain active competition cache, and calculate real-time leaderboards.

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

## Current Development Status - Hybrid Architecture Implementation
✅ Project structure and architecture established
✅ Two-tab navigation (Teams/Profile) with bottom tab navigation
✅ Nostr authentication with profile/workout auto-import
✅ Real-time team discovery from multiple Nostr relays
✅ Captain detection system with role-based UI
✅ **Competition Wizard System** - Complete Event & League creation wizards
✅ **Captain Dashboard** - Team management with join request approvals
✅ **Dynamic Scoring System** - Automatic leaderboards based on wizard parameters
✅ **Bitcoin Integration** - Entry fees, prize pools, reward distribution
✅ Two-tier membership system (local + official Nostr lists)
✅ **Team-Branded Push Notifications** - Nostr-native competition event processing
✅ **HealthKit Workout Posting** - Transform Apple Health workouts into Nostr events and social cards
✅ All TypeScript compilation successful - Core services production-ready

🔄 **Next Implementation Phase: Hybrid Nostr + Supabase Architecture**
- Npub-only Supabase user management (no traditional accounts)
- HealthKit background sync with iOS background delivery
- Smart competition auto-entry system with eligibility evaluation
- Supabase Edge Functions for real-time leaderboard processing
- Privacy controls: opt-in consent, ghost mode, minimal data storage
- Hybrid competition data sources (Supabase auto-entries + manual Nostr events)

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

**Previous Implementation - Push Notifications**:
- `TeamContextService.ts` - Single source of truth for team membership and context
- `NostrNotificationEventHandler.ts` - Real-time competition event processing (kinds 1101, 1102, 1103)
- `TeamNotificationFormatter.ts` - Nostr-native team data formatting
- Enhanced `NotificationService.ts` - Competition event monitoring integration

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

## Important Notes
- All files must stay under 500 lines of code for maintainability
- **Core User Journey**: Platform login → Teams feed → Team participation → Bitcoin rewards
- **Two-Page Focus**: Keep UI simple with just Teams and Profile tabs
- **Nostr-Native Data**: All team/workout data comes from Nostr events
- **Nostr-Only Auth**: Simple nsec input for all platforms
- **Real Data Only**: No mock data - all functionality uses actual Nostr events