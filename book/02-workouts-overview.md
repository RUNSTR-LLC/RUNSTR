# Chapter 2: Workouts Overview

## Summary

RUNSTR transforms your smartphone into a powerful GPS fitness tracker for running, walking, and cycling. When you're ready to work out, simply select your activity type, hold the start button through a deliberate countdown, and begin moving. The app tracks your distance, duration, pace, elevation gain, and kilometer splits in real-time, giving you the metrics you need to understand your performance as it happens.

The tracking experience prioritizes intentionality and reliability. The hold-to-start mechanism prevents accidental workout starts while giving your phone's GPS time to acquire a strong signal. During your workout, you can pause and resume freely without losing any data—perfect for stopping at traffic lights or taking a water break. The interface displays your most important metrics prominently, with secondary stats readily available.

When you finish your workout, it's saved locally first. If you have auto-compete enabled and are enrolled in an active competition, the workout automatically syncs to Supabase for leaderboard tracking. Users with high Web of Trust (WoT) scores also see a "Post" button that opens the Enhanced Share Modal, where you can choose from different visual templates to create a social post (kind 1) celebrating your achievement.

Privacy sits at the core of RUNSTR's workout architecture. While the app uses GPS to calculate your metrics, your actual route coordinates never leave your device. Only aggregated data—total distance, duration, elevation gain—gets submitted to competitions. This means you can participate in competitions and share achievements without revealing where you run, walk, or cycle.

RUNSTR also integrates with Apple Health on iOS and Health Connect on Android, allowing workouts tracked by other apps or wearables to sync into RUNSTR. These imported workouts qualify for rewards and can be submitted to competitions, giving you flexibility in how you track your fitness while still participating in the RUNSTR ecosystem.

---

## What is a Workout in RUNSTR?

A workout in RUNSTR is any fitness activity that a user tracks through the app. Workouts can be:
- **GPS-tracked** - Running, walking, cycling with real-time location
- **Manually entered** - Strength training, diet logging, wellness activities
- **Health-synced** - Imported from HealthKit or Health Connect

Once saved, workouts are stored locally and can be automatically submitted to Supabase for competition tracking. Kind 1301 events are created locally for validation but are **not published to Nostr relays**—Supabase is the single source of truth for leaderboards.

---

## Four Activity Categories

RUNSTR organizes activities into four main categories:

### 1. Cardio
GPS-tracked outdoor activities with distance, pace, and elevation metrics.

| Activity | Tracking Method | Key Metrics |
|----------|-----------------|-------------|
| Running | GPS | Distance, pace, splits, elevation |
| Walking | GPS + Steps | Distance, steps, pace |
| Cycling | GPS | Distance, speed, elevation |

### 2. Strength
Manual entry for gym and bodyweight exercises.

| Activity | Entry Method | Key Metrics |
|----------|--------------|-------------|
| Weights | Manual | Sets, reps, weight |
| Pushups | Manual | Reps |
| Pullups | Manual | Reps |

### 3. Diet
Meal and nutrition tracking.

| Activity | Entry Method | Key Metrics |
|----------|--------------|-------------|
| Meals | Manual | Meal type, size |
| Fasting | Timer | Duration |

### 4. Wellness
Mind-body activities.

| Activity | Entry Method | Key Metrics |
|----------|--------------|-------------|
| Meditation | Timer | Duration, type |
| Yoga | Timer/Manual | Duration |

---

## Auto-Submission to Supabase

Workouts are stored locally first, then automatically synced to Supabase when auto-compete is enabled:

### How It Works
When you complete a workout with auto-compete enabled:
- Workout is saved locally via `LocalWorkoutStorageService`
- Automatically submitted to Supabase via `submit-workout` Edge Function
- Server-side anti-cheat validation flags impossible workouts
- Appears on leaderboards within seconds

### Social Posting (WoT-Gated)
Users with high Web of Trust scores (> 0) see a "Post" button:
- Opens Enhanced Share Modal with style templates
- Creates a kind 1 social post (NOT kind 1301)
- Publishes to Nostr for sharing achievements

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
| Distance (total) | ✅ Yes | - |
| Duration | ✅ Yes | - |
| Activity type | ✅ Yes | - |
| Elevation gain/loss | ✅ Yes | - |
| Split times | ✅ Yes | - |
| GPS coordinates | ❌ Never | ✅ Local only |
| Route map | ❌ Never | ✅ Local only |
| Real-time location | ❌ Never | ✅ Local only |

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

RUNSTR syncs with external fitness platforms:

### iOS: HealthKit
- Automatic import of Apple Watch workouts
- Step count integration
- Heart rate data (when available)
- **Imported workouts qualify for rewards and competitions**

### Android: Health Connect
- Google Health Connect API (Android 14+)
- Step count from phone sensors
- Exercise sessions from other apps
- **Imported workouts qualify for rewards and competitions**

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
| WorkoutPublishingService | `src/services/nostr/workoutPublishingService.ts` | Nostr event creation |

### Data Flow

```
User tracks workout
        ↓
SimpleRunTracker (GPS) or ManualWorkoutScreen (manual)
        ↓
LocalWorkoutStorageService.saveWorkout()
        ↓
Stored in AsyncStorage
        ↓
[If auto-compete enabled] Submit to Supabase
        ↓
Server-side validation (submit-workout Edge Function)
        ↓
Leaderboards updated
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
  activityType: string;
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
1. **Local-first** - All workouts stored locally before syncing
2. **Auto-compete** - Automatic submission when user enables it
3. **Simple categories** - Four clear categories (Cardio, Strength, Diet, Wellness)
4. **Automatic sync** - Health platforms sync in background
5. **Supabase primary** - Supabase is the source of truth for competitions

### What to Avoid
- Multiple competing cache systems
- Complex workout type hierarchies
- Manual "Compete" buttons for each workout
- Publishing kind 1301 to Nostr relays

---

## Navigation

**Previous:** [Chapter 1: Introduction](./01-introduction.md)

**Next:** [Chapter 3: Workout Tracking](./03-workouts-tracking.md)

**Table of Contents:** [Back to TOC](./00-table-of-contents.md)
