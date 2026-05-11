# Chapter 3: Workout Tracking

## GPS-Based Tracking

For cardio activities (Running, Walking, Cycling), RUNSTR uses GPS to track location, distance, pace, and elevation in real-time.

### The Tracking Experience

1. **Select Activity** - User taps Cardio tab, sees "Start Run" button
2. **Hold to Start** - User holds the button for countdown (3, 2, 1, GO!)
3. **Active Tracking** - Real-time metrics update as user moves
4. **Pause/Resume** - User can pause for breaks
5. **Complete** - User stops workout, sees summary modal

### Real-Time Metrics

| Metric | Description | Update Frequency |
|--------|-------------|------------------|
| Distance | Total distance traveled | Every GPS update |
| Duration | Elapsed time (excluding pauses) | Every second |
| Pace | Minutes per kilometer | Rolling average |
| Speed | Kilometers per hour | Current speed |
| Elevation | Gain/loss in meters | Every GPS update |
| Splits | Time at each kilometer | At km milestones |

### Hold-to-Start Button

The workout starts with a deliberate **hold-to-start** interaction:
- Prevents accidental starts
- Gives time for GPS lock
- Creates intentional beginning moment

---

## Tracker Screens

Each cardio activity has a dedicated tracker screen:

| Screen | File | Activity |
|--------|------|----------|
| RunningTrackerScreen | `src/screens/activity/RunningTrackerScreen.tsx` | Running |
| WalkingTrackerScreen | `src/screens/activity/WalkingTrackerScreen.tsx` | Walking |
| CyclingTrackerScreen | `src/screens/activity/CyclingTrackerScreen.tsx` | Cycling |

Hiking uses the running tracker with a different activity tag.

### Entry Point

Cardio trackers are accessed from `ActivityTrackerScreen.tsx`. The screen presents the four cardio activities (Run, Walk, Cycle, Hike) and renders the appropriate tracker based on the selected activity.

Historical kind 1301 events for non-cardio activities (strength, meditation, etc.) still render in feeds via `workoutCardGenerator.ts` for backward compatibility, but no manual-entry screens remain for these.

---

## Technical Section

### SimpleRunTracker

The core GPS tracking service:

**File:** `src/services/activity/SimpleRunTracker.ts`

```typescript
// Key methods
startTracking(): Promise<void>
stopTracking(): WorkoutData
pauseTracking(): void
resumeTracking(): void

// Real-time data
getCurrentDistance(): number
getCurrentDuration(): number
getCurrentPace(): number
getCurrentElevation(): number
getSplits(): Split[]
```

Features:
- Location subscription via `expo-location`
- Kalman filter for GPS noise smoothing
- Auto-pause detection for stops
- Battery optimization modes

### ActivityMetricsService

Calculates derived metrics from raw GPS data:

**File:** `src/services/activity/ActivityMetricsService.ts`

```typescript
// Calculations
calculatePace(distance, duration): number  // min/km
calculateSpeed(distance, duration): number  // km/h
calculateElevationGain(points): number
calculateCalories(activity, duration, weight): number
```

### SplitTrackingService

Detects kilometer milestones for race-style split times:

**File:** `src/services/activity/SplitTrackingService.ts`

```typescript
// Splits tracking
checkSplit(currentDistance): Split | null
getSplits(): Split[]
getAveragePace(): number

interface Split {
  kilometer: number;
  time: string;  // HH:MM:SS
  pace: number;  // seconds per km
}
```

### UI Components

| Component | File | Purpose |
|-----------|------|---------|
| HeroMetric | `src/components/activity/HeroMetric.tsx` | Large primary metric display |
| SecondaryMetricRow | `src/components/activity/SecondaryMetricRow.tsx` | Secondary metrics grid |
| SplitsBar | `src/components/activity/SplitsBar.tsx` | Visual split breakdown |
| ControlBar | `src/components/activity/ControlBar.tsx` | Start/pause/stop buttons |
| HoldToStartButton | `src/components/activity/HoldToStartButton.tsx` | Hold-to-activate button |
| SpeedGauge | `src/components/activity/SpeedGauge.tsx` | Circular speed indicator |
| GPSStatusIndicator | `src/components/activity/GPSStatusIndicator.tsx` | GPS connection status |
| WorkoutSummaryModal | `src/components/activity/WorkoutSummaryModal.tsx` | Post-workout summary |

---

## Tracking Flow Diagram

```
ActivityTrackerScreen
        ↓
User selects "Cardio" tab
        ↓
RunningTrackerScreen loads
        ↓
HoldToStartButton rendered
        ↓
User holds button
        ↓
CountdownOverlay shows 3-2-1-GO
        ↓
SimpleRunTracker.startTracking()
        ↓
GPS subscription active
        ↓
Location updates → ActivityMetricsService → UI updates
        ↓
User taps "Stop"
        ↓
SimpleRunTracker.stopTracking()
        ↓
WorkoutSummaryModal shows
        ↓
User chooses "Save" or "Post"
        ↓
LocalWorkoutStorageService.saveWorkout()
        ↓
[Optional] WorkoutPublishingService.publishToNostr()
```

---

## What Tracking Should Be

### Ideal Architecture
1. **Simple screens** - One screen per activity type
2. **Real-time updates** - Smooth, responsive metrics display
3. **Battery efficient** - Reduce GPS frequency when stationary
4. **Reliable pause** - Pause/resume without losing data
5. **Clear completion** - Modal shows summary with publish options

### What to Avoid
- Complex inheritance hierarchies for trackers
- Multiple GPS tracking services
- Auto-save without user interaction
- Blocking UI during GPS operations

---

## Navigation

**Previous:** [Chapter 2: Workouts Overview](./02-workouts-overview.md)

**Next:** [Chapter 4: Workout Data Model](./04-workouts-data-model.md)

**Table of Contents:** [Back to TOC](./00-table-of-contents.md)
