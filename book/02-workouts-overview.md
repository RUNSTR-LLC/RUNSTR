# Chapter 2: Workouts Overview

## Summary

RUNSTR is a cardio workout companion. The app tracks running, walking, cycling, and hiking — and nothing else. When you're ready to work out, select your activity, hold the start button through a deliberate countdown, and begin moving. The app tracks distance, duration, pace, elevation gain, and kilometer splits in real-time.

The tracking experience prioritizes intentionality and reliability. The hold-to-start mechanism prevents accidental workout starts while giving your phone's GPS time to acquire a strong signal. During your workout, you can pause and resume freely without losing any data — perfect for traffic lights or water breaks.

When you finish a workout, it's saved locally first, then automatically submitted to Supabase for the daily leaderboard and any active club events. If you have a high Web of Trust score, you'll see a "Post" button that opens the share modal where you can choose a template to publish the workout as a kind 1 social post.

Privacy sits at the core of RUNSTR's workout architecture. While the app uses GPS to calculate your metrics, your actual route coordinates never leave your device. Only aggregated data — total distance, duration, elevation gain — gets submitted.

RUNSTR also integrates with Apple Health on iOS and Health Connect on Android, allowing workouts tracked by other apps or wearables to sync into RUNSTR. These imported workouts qualify for rewards just like in-app GPS workouts.

---

## What is a Workout in RUNSTR?

A workout is a cardio activity that enters the system one of two ways:
- **GPS-tracked in-app** — Running, walking, cycling, or hiking via the built-in tracker
- **Health-synced** — Imported automatically from HealthKit or Health Connect

Once saved, workouts are stored locally and automatically submitted to Supabase for leaderboards and reward eligibility. Kind 1301 events are created locally for structure but are **not published to Nostr relays** — Supabase is the single source of truth.

---

## The Four Cardio Activities

RUNSTR tracks four cardio activities. There are no other categories — no strength, no diet, no meditation, no journaling. The narrower the scope, the better the app.

| Activity | Tracking Method | Key Metrics |
|----------|-----------------|-------------|
| Running | GPS | Distance, pace, splits, elevation |
| Walking | GPS + Steps | Distance, steps, pace |
| Cycling | GPS | Distance, speed, elevation |
| Hiking | GPS | Distance, elevation gain |

---

## Auto-Submission to Supabase

Cardio workouts are saved locally first, then automatically submitted to Supabase:

### How It Works
- Workout is saved locally via `LocalWorkoutStorageService`
- Automatically submitted to Supabase via `submit-workout` Edge Function
- Server-side anti-cheat validation flags impossible workouts
- Appears on the daily leaderboard within seconds
- Counts toward any active club events the user is in

### Social Posting (WoT-Gated)
Users with high Web of Trust scores (> 0) see a "Post" button after a workout:
- Opens the share modal with style templates
- Creates a kind 1 social post (NOT kind 1301)
- Publishes to Nostr for sharing achievements on the social feed

---

## GPS Data Handling

RUNSTR takes a privacy-conscious approach to GPS data:

### Local Storage Only

- **Last 100 GPS points** are held in memory during tracking for real-time route display
- **Old points are deleted** to make room for new ones as you move
- GPS coordinates are used locally for distance calculation and route visualization
- **GPS coordinates are NEVER published** to Nostr or any external server

### What Gets Published vs. What Stays Local

| Data Type | Published | Stays Local |
|-----------|-----------|-------------|
| Distance (total) | Yes | - |
| Duration | Yes | - |
| Activity type | Yes | - |
| Elevation gain/loss | Yes | - |
| Split times | Yes | - |
| GPS coordinates | Never | Local only |
| Route map | Never | Local only |
| Real-time location | Never | Local only |

### Technical Implementation

```typescript
// SimpleRunTracker.ts - GPS point management
private cachedGpsPoints: GPSPoint[] = []; // Only last 100 points

// Trim to last 100 points when exceeded
if (this.cachedGpsPoints.length > 100) {
  this.cachedGpsPoints = this.cachedGpsPoints.slice(-100);
}
```

The `data_points` tag in kind 1301 events only records **how many** GPS points were collected, not the actual coordinates.

---

## Health Integrations

RUNSTR syncs with external fitness platforms so users earn passively:

### iOS: HealthKit
- Automatic import of Apple Watch and third-party app workouts
- HealthKit background delivery wakes the app when a new workout appears
- Step count integration
- **Imported workouts qualify for rewards and count on leaderboards**

### Android: Health Connect
- Google Health Connect API (Android 14+)
- 15-minute periodic sync via WorkManager
- Step count from phone sensors
- Exercise sessions from any compatible app
- **Imported workouts qualify for rewards and count on leaderboards**

### Other Wearables
- Garmin, Fitbit, etc. sync through Apple Health or Health Connect
- Workouts flow: Wearable → Apple Health/Health Connect → RUNSTR

---

## Technical Section

### Core Services

| Service | File | Purpose |
|---------|------|---------|
| WorkoutEventStore | `src/services/fitness/WorkoutEventStore.ts` | In-memory workout cache |
| LocalWorkoutStorageService | `src/services/fitness/LocalWorkoutStorageService.ts` | AsyncStorage persistence |
| WorkoutPublishingService | `src/services/nostr/workoutPublishingService.ts` | Kind 1 social post creation |

### Data Flow

```
User tracks cardio workout
        ↓
SimpleRunTracker (GPS)
        ↓
LocalWorkoutStorageService.saveWorkout()
        ↓
Stored in AsyncStorage
        ↓
Auto-submit to Supabase (all cardio with distance > 0)
        ↓
Server-side validation (submit-workout Edge Function)
        ↓
Leaderboards updated, reward eligibility checked
```

### WorkoutEventStore

The `WorkoutEventStore` is the **single source of truth** for workout data in memory:

```typescript
// Key methods
getAllWorkouts(): StoredWorkout[]
getWorkoutsByUser(pubkey: string): StoredWorkout[]
getTodaysWorkouts(): StoredWorkout[]
getEventWorkouts(start, end, participants): StoredWorkout[]
```

Features:
- Singleton pattern (one global instance)
- Backed by AsyncStorage for persistence
- 2-day fetch window from relays for performance
- Subscription system for component updates

### Key Interfaces

```typescript
interface StoredWorkout {
  id: string;
  pubkey: string;
  teamId?: string;
  activityType: 'running' | 'walking' | 'cycling' | 'hiking';
  distance?: number;  // meters
  duration?: number;  // seconds
  calories?: number;
  pace?: number;      // seconds per km
  elevation?: number; // meters
  createdAt: number;  // unix timestamp
  splits?: Map<number, number>;
  eventIds?: string[];
}
```

---

## What Workouts Should Be

### Ideal Architecture
1. **Cardio-only** — Four activities, no exceptions
2. **Local-first** — All workouts stored locally before syncing
3. **Auto-submit** — Every cardio workout submits automatically
4. **Simple categories** — One category. Drop the multi-category swipe grid entirely.
5. **Automatic sync** — Health platforms sync in background
6. **Supabase primary** — Supabase is the source of truth for leaderboards

### What to Avoid
- Strength, meditation, journal, habit tracking — out of scope
- Multiple competing cache systems
- Complex workout type hierarchies
- Publishing kind 1301 to Nostr relays

---

## Navigation

**Previous:** [Chapter 1: Introduction](./01-introduction.md)

**Next:** [Chapter 3: Workout Tracking](./03-workouts-tracking.md)

**Table of Contents:** [Back to TOC](./00-table-of-contents.md)
