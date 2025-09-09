# RUNSTR Onboarding User Flow

## Overview
New users go through a 6-step onboarding process that sets up their profile, wallet, sync preferences, and prepares them for team participation. After onboarding, they're routed to either team creation (Captains) or team discovery (Members).

## Step-by-Step Flow

### Step 1: Welcome & Login Selection
**Screen**: Welcome screen with 3 login options
**Options**: 
- Continue with Apple 🍎
- Continue with Google G  
- Continue with Nostr ⚡

**Logic**: User selects their preferred authentication method

---

### Step 2: Profile Setup
**For Apple/Google Users**:
- Manual profile creation
- Upload profile picture (optional)
- Enter username (required, 3-30 chars)
- Enter bio (optional, max 150 chars)
- Validation: Username required to proceed

**For Nostr Users**:
- Auto-import profile from Nostr identity
- Show imported avatar, username, bio
- No user input required
- Auto-proceed capability

---

### Step 3: Role Selection
**Screen**: Choose Member or Captain
**Required**: Explicit choice between:

**Member Role** 🏃‍♂️:
- Join existing teams created by captains
- Compete in team events and challenges  
- Earn Bitcoin rewards for workouts
- Switch teams (with potential exit fees)

**Captain Role** 👑:
- Create and manage your own team
- Set up events and challenges
- Distribute Bitcoin rewards to members
- Build your fitness community

**Note**: Members can upgrade to Captain later via account settings

---

### Step 4: Wallet Setup

**For Nostr Users**:
- Check for lightning address in Nostr profile
- **If found**: ⚡ "Lightning Address Found! Rewards will be sent directly there"
- **If not found**: ⚠️ "No wallet detected. Enable lightning address in your Nostr profile for rewards"

**For Apple/Google Users**:
- Always create CoinOS wallet
- Show CoinOS provider info (₿ logo, description)
- Button: "Create Bitcoin Wallet"
- Loading state: "Creating wallet..."
- Success: ✓ "Wallet Created! Ready to receive bitcoin rewards"

---

### Step 5: Sync Setup
**Screen**: Workout data sync options
**Auto-Sync Sources** (multi-select):
- HealthKit ♥ (iPhone fitness data)
- Garmin ⌚ (Garmin devices & app)  
- Strava S (Strava activities)
- Fitbit ●● (Fitbit workouts)

**Manual Sync Info**:
- Explanation that manual workout logging is available
- Users can tap "+" button to record workouts manually
- Manual workouts count toward competitions

**Requirement**: At least one sync method (auto or manual)

---

### Step 6: Notifications
**Screen**: Push notification permission request
**Notification Types Shown**:
- 🏆 Competition Results (challenge endings, rewards)
- ⚡ Bitcoin Rewards (earnings notifications)
- 👥 Team Updates (events, challenges, announcements)  
- 📊 League Updates (ranking changes)

**Button**: "Enable Notifications"
**Fallback**: "Skip for now" - can enable later in settings

---

### Step 7: Team Education (Members Only)
**Screen**: Educational content about choosing teams
**Content Sections**:
- 💰 Prize Pools & Payouts (what to look for)
- 📊 Team Performance (matching fitness levels)
- 🏃 Activity & Engagement (active vs inactive teams)

**Mock Team Preview**: Example team card showing ideal team metrics
**Button**: "Find Your Team"

**Note**: Captains skip this step entirely

---

## Post-Onboarding Routing

### Captain Path:
```
Onboarding Complete → Team Creation Wizard
```
- Immediately directed to create their first team
- Must complete team creation to access main app
- Team Creation Wizard handles: team basics, league settings, first event, wallet setup

### Member Path:
```
Onboarding Complete → Team Discovery Screen
```

**Current State (No Teams Available)**:
- Show empty state: "No Teams Yet" 👥
- Description: "No teams are currently available to join. Check back later when team captains create new teams to compete in."
- Action: "Check for Teams" button (refresh)
- Info section: "When teams are available: Join competitions, Earn Bitcoin rewards, Compete with runners"

**Future State (Teams Available)**:
- Show list of discoverable teams
- Filter/search capabilities
- Team joining flow

---

## Technical Requirements

### Database State
- **ZERO mock data** - completely clean database
- No sample teams, users, or activities
- First real user will create first real team

### Authentication States
- Store user login method (apple/google/nostr)
- Track onboarding completion status
- Persist role selection (member/captain)
- Save wallet setup status and type

### Wallet Integration
- **Nostr**: Query profile for lightning address
- **Apple/Google**: Create CoinOS wallet via API
- **Error handling**: Graceful fallback for failed wallet creation

### Sync Permissions
- Request actual device permissions when users select sync sources
- Handle permission denials gracefully
- Default to manual sync if all auto-sync fails

### Navigation Flow
- Single linear flow - no back buttons until after Step 2
- Clear progress indication (Step X of 6)
- Dynamic routing based on user choices

### UI Requirements  
- **Dynamic status bar time** - remove hardcoded values
- Match HTML mockup styling exactly
- Responsive to different screen sizes
- Loading states for async operations
- Error states with retry options

## Edge Cases

### Failed Wallet Creation
- Show error message
- Allow user to continue without wallet
- Prompt wallet creation later in profile

### Permission Denials
- HealthKit/notification permissions denied
- Fall back to manual sync/settings toggle
- Don't block onboarding completion

### Network Issues
- Offline onboarding support where possible
- Retry mechanisms for API calls
- Clear error messaging

## Success Metrics
- Onboarding completion rate
- Time to complete onboarding
- Wallet setup success rate  
- Sync source adoption rates
- Captain vs Member selection ratios