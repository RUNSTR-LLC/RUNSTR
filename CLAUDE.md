# RUNSTR.APP - Claude Context

## Project Overview
RUNSTR.APP is a React Native mobile application that transforms fitness routines into competitive, Bitcoin-earning experiences through Nostr-native team competitions. The app operates as a two-tab interface where users authenticate with Nostr, discover fitness teams, and participate in captain-created competitions with automatic scoring and Bitcoin rewards.

📖 **For detailed user flow documentation, see**: [APP_USER_FLOW_AND_CAPTAIN_EXPERIENCE.md](./APP_USER_FLOW_AND_CAPTAIN_EXPERIENCE.md)

## Core User & Captain Experience
**User Flow**: Nsec login → Profile screen → Teams discovery → Team joining → Competition participation
**Captain Flow**: Teams page → Captain dashboard → Wizard-driven competition creation → Member management → Bitcoin distribution

**Key Features**:
- Seamless Nostr authentication with automatic profile/workout import
- **HealthKit Workout Posting**: Transform Apple Health workouts into Nostr events and social media cards
- Two-tier membership system (local + official Nostr lists)
- Real-time team discovery from multiple Nostr relays
- Captain dashboard with join request management
- Wizard-driven competition creation (7 activity types, cascading dropdowns)
- Automatic leaderboard scoring based on captain-defined parameters
- Bitcoin integration for entry fees and prize distribution
- Team-branded push notifications with real-time competition event processing
- **Beautiful Social Cards**: Instagram-worthy workout achievement graphics with RUNSTR branding

**Platform-Specific Authentication**:
- **iOS**: Login with Apple + Login with Nostr (manual nsec input)
- **Android**: Login with Google + Login with Nostr (Amber signer integration)

## Key Technologies
- **Frontend**: React Native with TypeScript (Expo framework)
- **Data Layer**: Pure Nostr events (no centralized backend)
- **Authentication**: Nostr (nsec) with platform-specific options (Apple/Google)
- **Fitness Data**: Kind 1301 events from Nostr relays + Apple HealthKit integration
- **Team Data**: Custom Nostr event kinds for teams, leagues, events, challenges
- **Bitcoin**: Lightning Network integration via CoinOS API
- **Nostr Tools**: nostr-tools library for event handling
- **Nostr Relays**: Damus, Primal, nos.lol for all data operations
- **Push Notifications**: Team-branded Expo notifications with Nostr event integration (kinds 1101, 1102, 1103)

## Architecture Principles
- **File Size Limit**: Maximum 500 lines per file for maintainability
- **Two-Page Simplicity**: Core app is just Teams and Profile tabs
- **Nostr-Native**: All data stored and retrieved via Nostr events
- **Platform-Specific UX**: Different auth flows for iOS/Android
- **Real Data Only**: No mock data - all functionality uses actual Nostr events

## Project Structure
```
src/
├── components/        # Reusable UI components (<500 lines each)
│   ├── ui/           # Basic components (Card, Button, Avatar, StatusBar)
│   ├── team/         # Team-specific components
│   ├── profile/      # Profile-specific components
│   ├── fitness/      # Workout posting and display components
│   └── wizards/      # Onboarding and setup flows
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
- Nsec login automatically imports profile from kind 0 events
- Workout data synced from kind 1301 events across Nostr relays
- Apple HealthKit workouts automatically imported and available for posting
- Direct navigation to Profile screen (no onboarding wizard)

**2. Two-Tab Navigation**:
- **Profile Tab**: Personal dashboard with unified workout history (HealthKit + Nostr), posting controls, team membership, account settings
- **Teams Tab**: Real-time team discovery, captain detection, join/create functionality

**3. Role-Based Experience**:
- **Members**: Browse teams → Join → Participate in competitions
- **Captains**: Captain dashboard access → Wizard-driven competition creation → Member management

**4. Competition System**:
- **Wizard Creation**: 7 activity types → Dynamic competition options → Time/settings configuration
- **Automatic Scoring**: Real-time leaderboards based on captain's wizard parameters
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

**7. HealthKit Workout Posting System**:
- **Unified Workout Display**: Shows both HealthKit and Nostr workouts in single timeline
- **Two-Button System**: "Save to Nostr" (kind 1301 for competitions) vs "Post to Nostr" (kind 1 social)
- **Beautiful Social Cards**: SVG-based workout achievement graphics with RUNSTR branding
- **Smart Status Tracking**: Prevents duplicate posting, shows completion states
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

## Development Commands
- `npm install` - Install dependencies
- `expo start --ios` - Run iOS simulator
- `expo start --android` - Run Android emulator
- `npm run typecheck` - TypeScript validation
- `npm run lint` - Code linting

## Quality Assurance Requirements
**MANDATORY: Before completing any development phase:**
1. **Run Quality Checks:**
   ```bash
   npm install           # Ensure all dependencies installed
   npm run typecheck     # Verify TypeScript compilation
   npx prettier --write "src/**/*.{ts,tsx}"  # Fix formatting
   ```
2. **Review LESSONS_LEARNED.md** - Check for known issues and prevention strategies
3. **Verify Phase Deliverables** - Ensure all planned functionality works as expected

**Note:** No phase should be marked "complete" until TypeScript compiles without errors and lessons learned have been reviewed.

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
   - ❌ Do NOT commit broken or incomplete implementations
   - ❌ Do NOT commit if TypeScript compilation fails

4. **Progress Preservation:**
   - Each commit serves as a checkpoint to prevent work loss
   - Enables easy rollback if new changes introduce issues
   - Creates clear development history for future reference
   - Facilitates team collaboration and code review

**Note:** This rule ensures continuous progress preservation and maintains a clean development history on GitHub.

## Current Development Status - HealthKit Workout Posting Complete
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
- Updated `TeamNotificationFormatter.ts` - Migrated from Supabase to Nostr team data
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
- **Platform-Specific Auth**: Different login flows for iOS (Apple/nsec) vs Android (Google/Amber)
- **Real Data Only**: No mock data - all functionality uses actual Nostr events