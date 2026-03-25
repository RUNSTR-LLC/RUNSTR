# Activity Menu — Design Spec

## Overview

A category bar pinned below the header on the ActivityTrackerScreen, with dropdown rows of Ionicon activity pills. Solves the discoverability problem: users currently can't find swipe navigation and don't know what activities are available. The bar provides a visible, tappable interface that coexists with the existing swipe system.

## Goals

1. **Discoverability** — users immediately see what activities are available
2. **Zero extra navigation** — switch activities without leaving the tracker
3. **Coexist with swipes** — bar reflects swipe state, swipes still work

## Categories & Activities

Three categories (merged Wellness + Mindfulness into one):

### Cardio
| Activity | Ionicon | Grid Key |
|----------|---------|----------|
| Walk | `walk-outline` | `walk` |
| Run | `fitness-outline` | `run` |
| Cycle | `bicycle-outline` | `cycle` |
| Hike | `compass-outline` | `hiking` |

### Strength
| Activity | Ionicon | Grid Key |
|----------|---------|----------|
| Pushups | `fitness-outline` | `pushups` |
| Pull-ups | `barbell-outline` | `pullups` |
| Sit-ups | `body-outline` | `situps` |
| Squats | `walk-outline` | `squats` |
| Curls | `fitness-outline` | `curls` |
| Bench | `barbell-outline` | `bench` |

### Wellness
| Activity | Ionicon | Grid Key |
|----------|---------|----------|
| Guided | `headset-outline` | `guided` |
| Unguided | `leaf-outline` | `unguided` |
| Breathwork | `water-outline` | `breathwork` |
| Body Scan | `body-outline` | `body_scan` |
| Gratitude | `heart-outline` | `gratitude` |
| Journal | `book-outline` | `journal` |
| Habits | `checkmark-circle-outline` | `habits` |

Icons are Ionicons only. Some icons repeat across categories (e.g. `fitness-outline` for Run and Pushups) — acceptable since they never appear in the same dropdown.

## Layout

```
┌──────────────────────────────────────────────┐
│  <  (back)                        (steps)    │  header (existing)
├──────────────────────────────────────────────┤
│      Cardio       Strength       Wellness    │  category bar (NEW)
├──────────────────────────────────────────────┤
│                                              │
│              [tracker content]               │  existing tracker
│                                              │
└──────────────────────────────────────────────┘
```

### Dropdown open (e.g. Cardio tapped):

```
┌──────────────────────────────────────────────┐
│  <  (back)                        (steps)    │
├──────────────────────────────────────────────┤
│      Cardio       Strength       Wellness    │
├──────────────────────────────────────────────┤
│   (walk)    (run)    (bicycle)   (compass)   │  dropdown row
│    Walk      Run      Cycle       Hike       │  labels
├──────────────────────────────────────────────┤
│              [tracker content]               │
│              (dimmed slightly)               │
└──────────────────────────────────────────────┘
```

## Interaction

### Category bar behavior
- Three text labels evenly spaced: Cardio, Strength, Wellness
- Active category: `#FFB366` (light orange)
- Inactive categories: `#CC7A33` (muted orange)
- Tap a category → opens its dropdown
- Tap the active category again → re-opens dropdown (for switching within category)
- Tap a different category while dropdown is open → swaps dropdown contents

### Dropdown behavior
- Shows a horizontal row of activity pills for the selected category
- Each pill: Ionicon (24px) + label text (11px) stacked vertically
- Active activity: `#1a1a1a` background pill with `#FF7B1C` border, icon and label in `#FFB366`
- Inactive activities: no background, icon and label in `#CC7A33`
- Tap an activity → dropdown closes, tracker switches to that activity
- Tracker content dims slightly (~0.5 opacity overlay) while dropdown is open
- Tapping the dimmed area closes the dropdown

### Swipe integration
- Swiping left/right still navigates within a category
- Swiping up/down still navigates between categories
- When a swipe changes the activity, the category bar updates to reflect the new position
- Both bar taps and swipes go through `ActivityGridService` to update position

## Styling

All colors use `theme.colors.*` tokens. Hex values shown for reference only.

### Category bar
- Background: `theme.colors.cardBackground` (#0a0a0a)
- Bottom border: 1px `theme.colors.border` (#1a1a1a)
- Padding: 12px vertical
- Category labels: 14px, `fontWeight: '600'`
- Active label: `theme.colors.text` (#FFB366)
- Inactive labels: `theme.colors.textMuted` (#CC7A33)

### Dropdown row
- Background: `theme.colors.cardBackground` (#0a0a0a)
- Bottom border: 1px `theme.colors.border` (#1a1a1a)
- Padding: 16px vertical
- Activity pills laid out with `flexDirection: 'row'`, `justifyContent: 'space-evenly'`
- Icon size: 24px
- Label size: 11px, `fontWeight: '500'`
- Active pill: `borderRadius: 8`, `borderWidth: 1`, `borderColor: theme.colors.orangeDeep` (#FF7B1C), `backgroundColor: theme.colors.border` (#1a1a1a), `padding: 8`
- Active icon/label: `theme.colors.text` (#FFB366)
- Inactive icon/label: `theme.colors.textMuted` (#CC7A33)

### Dim overlay
- `backgroundColor: theme.colors.background` (#000000), `opacity: 0.3`
- Covers tracker content area only (not header or category bar)

## Animation

Use `react-native-reanimated` to match the existing `SwipeGridNavigator` pattern.

- Dropdown open: slide down via `transform: [{ translateY }]` + fade in (`opacity`), 200ms, `Easing.out`. Use `useNativeDriver: true` (transform + opacity are native-driver compatible).
- Dropdown close: reverse (slide up + fade out), 150ms, `Easing.in`
- Category swap (already open): simultaneous fade out old row + fade in new row, 150ms
- Height is not animated — use a fixed-height container that clips content, animate the translateY and opacity of the row inside it. This avoids the native driver limitation with layout properties.

## Edge Cases

### Workout in progress (timer running)
- Category bar visible but disabled — labels dimmed to `#CC7A33`, taps do nothing
- Prevents switching activities mid-workout

### Dropdown open + user swipes tracker
- Dropdown closes immediately
- Swipe gesture registers normally

### First launch
- Defaults to Cardio/Run (existing default from ActivityGridService)

### Returning to tracker
- Restores last used activity via AsyncStorage (existing behavior)

## Integration with Existing Code

### ActivityGridService changes
- Merge Wellness and Mindfulness into one "Wellness" category
- `ACTIVITY_GRID` goes from 4 rows to 3 rows
- All wellness + mindfulness activities in one row: `[guided, unguided, breathwork, body_scan, gratitude, journal, habits]`
- Update `CategoryRow.key` type union: remove `'mindfulness'`, keep `'cardio' | 'strength' | 'wellness'`
- Navigation methods unchanged — still row/column grid
- Saved grid positions in AsyncStorage: if a user had row 3 (old mindfulness), `loadPosition` validator resets to 0,0 on next load. This is acceptable — one-time reset after update.

### ActivityTrackerScreen changes
- Add `ActivityCategoryBar` component between header and `SwipeGridNavigator`
- Pass current grid position and setter to the bar
- Bar reads from and writes to `ActivityGridService`
- Update `renderContent()`: the existing `case 'mindfulness'` branch (journal, habits) moves into the `case 'wellness'` branch. Route by activity key within wellness: `guided/unguided/breathwork/body_scan/gratitude` → MeditationTrackerScreen, `journal` → JournalTrackerScreen, `habits` → HabitTrackerScreen.

### Component hierarchy
```
ActivityTrackerScreen
  ├── Header (existing)
  ├── ActivityCategoryBar (NEW — sits ABOVE SwipeGridNavigator in view tree)
  │     ├── Category labels row
  │     ├── ActivityDropdown (animated, absolutely positioned)
  │     │     └── ActivityPill × N
  │     └── Dim overlay (absolutely positioned, covers tracker area below)
  └── SwipeGridNavigator (existing)
        └── Tracker content (Running, Strength, etc.)
```

The category bar and its dropdown/overlay sit above `SwipeGridNavigator` in the view tree. The dim overlay is a `Pressable` absolutely positioned to cover the tracker area — tapping it closes the dropdown. Since it's above the gesture detector, it intercepts taps but does not interfere with swipes when the dropdown is closed (overlay is not rendered when closed).

### Workout state propagation
- `onWorkoutStateChange` callback currently only exists on cardio tracker screens
- Must be added to `StrengthTrackerScreen`, `MeditationTrackerScreen`, `JournalTrackerScreen`, and `HabitTrackerScreen` so the category bar knows when to disable
- Known gap for v1: if a tracker doesn't propagate state, the bar remains enabled. This is acceptable as a progressive enhancement — cardio (the most common) works immediately.

### No changes needed
- Individual tracker screens (Running, Strength, Meditation, etc.) — except adding `onWorkoutStateChange` where missing
- Header (back button, step counter)
- Start/stop/pause controls
- GPS, rep counting, timer logic
- Navigation routes

## New Components

| Component | Responsibility |
|-----------|---------------|
| `ActivityCategoryBar` | Category labels, manages open/close state, renders dropdown |
| `ActivityDropdown` | Animated row of activity pills for one category |
| `ActivityPill` | Single activity icon + label, tappable |

## Implementation Notes

- Components live in `src/components/activity/`
- Follow existing patterns: `theme` import, `StyleSheet.create`, Ionicons
- `ActivityCategoryBar` receives `gridPosition`, `onActivitySelect`, and `isWorkoutActive` as props
- Activity-to-icon mapping defined as a constant (not hardcoded in JSX)
- Dropdown uses `react-native-reanimated` with translateY + opacity (not height animation)
- Phone-only layout — no tablet/landscape considerations for v1
