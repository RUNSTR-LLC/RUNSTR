# Home Screen Redesign

## Summary

Merge the Profile and Exercise screens into a single "Home" screen. Users see their identity (level, streak, earnings) and can start a workout without navigating away. History moves to a new 4th bottom tab. The Rewards action card is replaced by a tappable earnings display that navigates to the Rewards screen.

## What Changes

### Home Screen Layout (idle state, top to bottom)

1. **ProfileHero** -- reused as-is (banner, avatar, name, bio, level badge, streak)
2. **Earnings card** -- new component, sits between ProfileHero and the activity launcher. Shows total rewards earned. Tapping navigates to the existing Rewards screen.
3. **Activity launcher** -- reuses existing components in place of the 3 action cards:
   - `ActivityCategoryBar` (Cardio / Strength toggle)
   - `ActivityDropdown` (horizontal pill row for activities within selected category)
   - `HoldToStartButton` (2-second hold circle with progress animation)
   - Activity label inside the circle updates based on selection (e.g., "Start Run", "Start Pushups")
4. **NotificationBadge** -- keeps its current position/behavior

### Workout Activation Flow

1. User selects activity via category bar + dropdown pills
2. User holds the start button (2-second hold, same as today)
3. `CountdownOverlay` renders (3-2-1-GO, same as today)
4. **Full-screen takeover** -- Home screen content hides, the appropriate tracker screen renders full-screen:
   - Cardio: RunningTrackerScreen, WalkingTrackerScreen, CyclingTrackerScreen, HikingTrackerScreen
   - Strength: StrengthTrackerScreen
   - Wellness/Meditation: MeditationTrackerScreen (if in grid)
5. When workout ends and summary is dismissed, user returns to Home idle state

### What Gets Removed

- **EXERCISE action card** -- replaced by inline activity launcher
- **HISTORY action card** -- replaced by History bottom tab
- **REWARDS action card** -- replaced by tappable earnings card
- **ActivityTrackerScreen as a navigation destination** -- its idle-state components move into Home; tracker screens are rendered directly on workout start

### What Gets Reused As-Is

- `HoldToStartButton` -- same component, same props, same styling
- `ActivityCategoryBar` -- same component, same styling
- `ActivityDropdown` + `ActivityPill` -- same components, same styling
- `CountdownOverlay` -- same component
- All individual tracker screens (RunningTrackerScreen, StrengthTrackerScreen, etc.) -- untouched
- `WorkoutHistoryScreen` -- reused for the new History tab
- Rewards screen -- reused, just reached via earnings card tap instead of action card
- `ProfileHero` -- reused as-is

### Bottom Navigation Changes

Current 3 tabs:
- Profile | Social | Events

New 4 tabs:
- **Home** (person icon) | **Social** (chatbubbles) | **Events** (trophy) | **History** (time/clock icon)

- "Profile" tab renamed to "Home"
- History tab renders existing `WorkoutHistoryScreen`
- No changes to Social or Events tabs

## Out of Scope

- **Swipe grid navigation** -- deferred. Users switch activities via category bar + dropdown only, not gestures.
- **Changes to individual tracker screens** -- they render exactly as they do today
- **Changes to WorkoutHistoryScreen content** -- same screen, new location
- **Changes to Rewards screen** -- same screen, new entry point
- **Other users' profile view** -- remains a separate route with its own layout (LevelCard, ActivityBreakdown, ClubAffiliations)

## Implementation Concerns

### Permission gating (CRITICAL)

Individual tracker screens (RunningTrackerScreen, WalkingTrackerScreen, etc.) have **zero** permission checks — they rely entirely on ActivityTrackerScreen having already validated permissions. `SimpleRunTracker.startTracking()` also has no guard; if called without location permissions it silently fails (timer counts, distance stays 0).

The Home screen MUST replicate the exact permission flow from ActivityTrackerScreen, but with a timing adjustment to avoid back-to-back modals for first-time users.

**First-time user context:** The welcome modal + reward destination picker flow runs at the App.tsx level before the user reaches the Home screen. If we also check permissions on Home mount, first-time users would see: welcome modal -> destination picker -> immediately hit with permission modal. Three modals in a row is too much friction.

**Solution: defer permission check to hold-start for cardio activities.**

1. **On hold-start (not on mount)**: if a cardio activity is selected and `permissionsReady !== true`, intercept the hold completion and show `PermissionRequestModal` instead of starting the countdown. Same component, same props — this is a non-dismissible modal on Android that handles:
   - System permission dialog
   - "Open Settings" fallback for Android 11+ background location
   - AppState listener that re-checks when user returns from Settings
   - Battery optimization / Doze exemption request on Android
2. **After permissions granted**: set `permissionsReady = true`, dismiss the modal, and the user can hold-start again to begin tracking. The permission check only happens once — subsequent hold-starts skip it.
3. **Strength activities do NOT need location**: no permission check when a strength activity is selected. Hold-start works immediately.
4. **Cache the permission state**: once `permissionsReady` is true (checked via `appPermissionService.checkAllPermissions()` on mount silently, no modal), it stays true for the session. The modal only shows if the silent check finds permissions missing AND the user tries to start a cardio workout.

This preserves the exact same permission guarantees (no cardio tracker renders without location permissions) while avoiding modal pile-up on first launch.

### Activity state persistence
`ActivityGridService.savePosition()` currently saves the selected category/activity to AsyncStorage. Home screen should read this on mount to restore the last-selected activity, and write it when the user changes selection via the category bar or dropdown.

### Workout active state
When a workout is active, the Home screen content should not be accessible (user is in full-screen tracker mode). The `onWorkoutStateChange` callback pattern from ActivityTrackerScreen can be simplified since there are no swipe gestures to lock.

### Route renaming and navigation references (8 locations)

The "Profile" route becomes "Home" and the "Exercise" route is removed (activity launching moves into Home). The following files have hardcoded route references that must be updated:

| File | Reference | Action |
|------|-----------|--------|
| `navigationHandlers.ts:140` | `navigate('Profile')` from wallet management | Change to `navigate('Home')` |
| `navigationHandlers.ts:175` | `navigate('Profile')` from onboarding complete | Change to `navigate('Home')` |
| `NotificationModal.tsx:164` | `navigate('Profile')` from wallet view | Change to `navigate('Home')` |
| `ClubMembersSection.tsx:106` | `navigate('Profile', { pubkey })` view other user | Change to `navigate('Home', { pubkey })` |
| `DailyLeaderboardCard.tsx:115` | `navigate('Profile', { pubkey })` view user | Change to `navigate('Home', { pubkey })` |
| `DailyLeaderboardCard.tsx:175` | `navigate('Profile', { pubkey })` view user | Change to `navigate('Home', { pubkey })` |
| `ProfileScreen.tsx:267` | `navigate('Exercise')` start workout | Remove -- workout starts inline now |
| `BottomTabNavigator.tsx:119` | `route.name === 'Profile'` icon check | Change to `route.name === 'Home'` |

Type definitions to update:
- `AppNavigator.tsx` RootStackParamList: rename `Profile` to `Home` (keep `{ pubkey?: string }` param), remove `Exercise`
- `App.tsx` AuthenticatedStackParamList: remove `Exercise`

### Other user profile view (must still work)

ProfileScreen currently serves dual duty: own profile (action cards) vs other user's profile (LevelCard, ActivityBreakdown, ClubAffiliations), controlled by the `pubkey` route param. After the rename to Home:

- `navigate('Home')` with no params = own Home screen (activity launcher, earnings, etc.)
- `navigate('Home', { pubkey: '...' })` = other user's profile view (unchanged layout)

The conditional logic (`isOwner` check) stays. The activity launcher, earnings card, and hold-to-start only render in the owner view. The other-user view renders exactly as it does today.

### Earnings card
New component needed. Should query the same rewards data that the current Rewards screen uses. Keep it simple -- show a single total number, tappable, navigates to Rewards.
