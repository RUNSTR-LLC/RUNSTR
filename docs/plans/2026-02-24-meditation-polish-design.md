# Meditation Wellness Polish — Design

**Date:** 2026-02-24
**Status:** Approved
**Scope:** MeditationTrackerScreen improvements only (no cardio, no journal, no strength)

## Summary

Three focused improvements to the meditation/wellness tracker to make sessions feel more intentional and polished:

1. **Breathwork Breathing Circle** — Animated inhale/hold/exhale visualization for the Breathwork type only
2. **Duration Presets with Auto-Stop** — Set a target duration (5/10/15/20 min) with countdown and auto-stop
3. **Milestone Haptics** — Gentle haptic pulses at 5-minute intervals during open-ended sessions

## 1. Breathwork Breathing Circle

### What

When the user selects "Breathwork" as their meditation type and starts a session, the active phase displays an animated breathing circle instead of just a plain timer.

### Breathing Pattern

Box breathing (4-4-6 simplified variant):
- **Inhale:** 4 seconds — circle expands
- **Hold:** 4 seconds — circle holds at max size
- **Exhale:** 6 seconds — circle contracts

Total cycle: 14 seconds. Loops continuously.

### UI Layout (Active Phase, Breathwork Only)

```
┌─────────────────────────┐
│                         │
│        02:34            │  ← Timer (smaller, secondary, 36pt)
│                         │
│     ┌───────────┐       │
│     │           │       │
│     │   ( ○ )   │       │  ← Breathing circle (animated scale)
│     │           │       │
│     └───────────┘       │
│                         │
│      Inhale...          │  ← Phase label (fades between phases)
│                         │
│   ── ── ── ── ── ──    │  ← Phase progress dots or bar
│                         │
│    [⏸]        [⏹]      │  ← Pause / Stop (existing buttons)
│                         │
└─────────────────────────┘
```

### Implementation

- New component: `src/components/activity/BreathingCircle.tsx`
- Uses React Native `Animated` API (scale transform + opacity for phase label)
- Circle: orange border ring that scales between 0.4x and 1.0x
- Phase label: "Inhale..." / "Hold..." / "Exhale..." with fade transition
- Timer moves above the circle, reduced to 36pt (secondary)
- Only renders when `meditationType === 'breathwork'` and phase is `'active'`
- Non-breathwork types keep the existing clean timer-only view unchanged

## 2. Duration Presets with Auto-Stop

### What

Add a duration selector to the meditation setup phase. Users pick a target or leave it open-ended.

### Setup Phase Addition

```
Meditation Type:  [Guided] [Unguided] [Breathwork] [Body Scan] [Gratitude]

Duration:         [Open] [5m] [10m] [15m] [20m]    ← NEW ROW
                          ^^^^
                     (orange = selected)
```

### Behavior

- **"Open" (default):** Current behavior — timer counts up, user stops manually
- **Preset selected:** Timer counts DOWN from the chosen duration
  - Display: countdown format (e.g., "09:42" remaining)
  - At 0:00: haptic success pulse → auto-transition to summary phase
  - Summary shows the full duration completed (e.g., "10:00")

### Implementation

- New state: `targetDuration: number | null` (null = open)
- Duration pills styled identically to rest-time pills in StrengthTrackerScreen
- Timer logic branch: if `targetDuration`, subtract elapsed from target; else count up
- Auto-stop: when remaining <= 0, trigger `Haptics.notificationAsync('success')` and transition to summary

## 3. Milestone Haptics

### What

During open-ended ("Open" duration) meditation sessions, fire a subtle haptic pulse at milestone intervals so the user has a sense of time passing without looking at the screen.

### Milestones

- 5 minutes
- 10 minutes
- 15 minutes
- 20 minutes
- 30 minutes

### Behavior

- Haptic type: `Haptics.impactAsync('light')` — subtle, not jarring
- Only fires in "Open" mode (preset mode already auto-stops, no need)
- No visual change — purely physical feedback
- Each milestone fires only once per session

### Implementation

- Track `firedMilestones` set in a ref
- In the timer interval, check if elapsed seconds crosses a milestone boundary
- If crossed and not already fired, trigger haptic and add to set

## Out of Scope

- No audio/sound playback (would require audio library dependency)
- No breathing guide for non-breathwork meditation types
- No configurable breathing patterns (just the one default pattern)
- No changes to strength tracker
- No changes to cardio trackers
- No changes to journal system

## Files Changed

| File | Change |
|------|--------|
| `src/components/activity/BreathingCircle.tsx` | **NEW** — Animated breathing circle component |
| `src/screens/activity/MeditationTrackerScreen.tsx` | Add duration presets, countdown logic, milestone haptics, integrate BreathingCircle |

## Dependencies

- No new npm packages required
- Uses existing: `react-native-reanimated` or `Animated` API, `expo-haptics`
