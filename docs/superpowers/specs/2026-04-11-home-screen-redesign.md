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

### Permission gating
ActivityTrackerScreen currently shows a `PermissionRequestModal` for location access before rendering trackers. This logic needs to move -- either into the Home screen (check on mount or on hold-start) or into the navigation flow when transitioning to a tracker.

### Activity state persistence
`ActivityGridService.savePosition()` currently saves the selected category/activity to AsyncStorage. Home screen should read this on mount to restore the last-selected activity, and write it when the user changes selection via the category bar or dropdown.

### Workout active state
When a workout is active, the Home screen content should not be accessible (user is in full-screen tracker mode). The `onWorkoutStateChange` callback pattern from ActivityTrackerScreen can be simplified since there are no swipe gestures to lock.

### Screen naming
The ProfileScreen file should be renamed to HomeScreen (or the component name updated) and the navigation route updated from "Profile" to "Home". The tab label changes from "Profile" to "Home".

### Earnings card
New component needed. Should query the same rewards data that the current Rewards screen uses. Keep it simple -- show a single total number, tappable, navigates to Rewards.
