# Chapter 5: Workout Storage & Publishing

## Local-First Storage

RUNSTR follows a **local-first** approach: all workouts are stored locally before being submitted to Supabase. This ensures:
- Workouts are never lost due to network issues
- User controls when/what to publish
- Fast, responsive UI without network dependency

---

## Storage Flow

```
Workout Completed
        ↓
LocalWorkoutStorageService.saveWorkout()
        ↓
Stored in AsyncStorage
        ↓
Auto-compete enabled?
        ↓
    YES → Submit to Supabase (submit-workout Edge Function)
        ↓
    Server-side validation and anti-cheat
        ↓
    Leaderboards updated
```

---

## Workout Sources

Workouts can come from multiple sources:

| Source | Description | Sync Method |
|--------|-------------|-------------|
| `gps_tracker` | In-app GPS tracking | Real-time |
| `manual_entry` | User manual input | On save |
| `healthkit` | Apple HealthKit | Background sync |
| `health_connect` | Android Health Connect | Background sync |

---

## Health Integrations

### iOS: HealthKit

**File:** `src/services/fitness/healthKitService.ts`

Features:
- Auto-import Apple Watch workouts
- Step count integration
- Heart rate data when available
- Background sync capability

```typescript
// Key methods
initializeHealthKit(): Promise<void>
fetchWorkouts(since: Date): Promise<HealthKitWorkout[]>
fetchStepCount(date: Date): Promise<number>
```

Type Mapping:
| HealthKit Code | RUNSTR Type |
|----------------|-------------|
| 37 | running |
| 52 | walking |
| 13 | cycling |
| 24 | hiking |

Non-cardio HealthKit workout types (strength, yoga, etc.) are filtered out at the sync layer.

### Android: Health Connect

**File:** `src/services/fitness/healthConnectService.ts`

Features:
- Google Health Connect API (Android 14+)
- Step count from phone sensors
- Exercise sessions from other apps

```typescript
// Key methods
initializeHealthConnect(): Promise<void>
readExerciseSessions(since: Date): Promise<ExerciseSession[]>
readStepCount(date: Date): Promise<number>
```

---

## Auto-Submission to Supabase

When auto-compete is enabled, workouts are automatically submitted to Supabase for leaderboard tracking.

### How Auto-Submit Works

```typescript
// After workout saved locally
if (autoCompeteEnabled && isEnrolledInCompetition) {
  await SupabaseCompetitionService.submitWorkout(workout);
}
```

The `submit-workout` Supabase Edge Function handles:
- Server-side validation
- Anti-cheat flagging (impossible workouts)
- Deduplication by event ID
- Leaderboard updates

### Social Posting (WoT-Gated)

**File:** `src/services/nostr/workoutPublishingService.ts`

Users with high WoT scores can post workout achievements as kind 1 events:

```typescript
async postToNostr(
  workout: PublishableWorkout,
  options: SocialPostOptions,
  signer: NDKSigner
): Promise<WorkoutPublishResult>
```

### Social Post Flow

```
User taps "Post" (WoT-gated)
        ↓
Opens Enhanced Share Modal
        ↓
User selects template style
        ↓
Build kind 1 event with image
        ↓
Sign event with user's nsec
        ↓
Publish to 3 relays
        ↓
Show success toast
```

### Relay Configuration

Social posts (kind 1) are published to 3 relays:
- `wss://relay.damus.io`
- `wss://relay.primal.net`
- `wss://nos.lol`

**Note:** Kind 1301 events are NOT published to relays. Supabase is the single source of truth for competition data.

---

## Technical Section

### LocalWorkoutStorageService

**File:** `src/services/fitness/LocalWorkoutStorageService.ts`

Main storage service for local workouts:

```typescript
// Key methods
saveGPSWorkout(workout: GPSWorkout): Promise<string>
saveManualWorkout(workout: ManualWorkout): Promise<string>
getAllWorkouts(): Promise<LocalWorkout[]>
getUnsyncedWorkouts(): Promise<LocalWorkout[]>
markAsSynced(workoutId: string, nostrEventId: string): Promise<void>
deleteWorkout(workoutId: string): Promise<void>
```

### LocalWorkout Interface

```typescript
interface LocalWorkout {
  id: string;
  type: WorkoutType;
  startTime: string;
  endTime: string;
  duration: number;
  distance?: number;
  calories?: number;
  elevation?: number;
  pace?: number;
  splits?: Split[];

  // Source tracking
  source: 'gps_tracker' | 'manual_entry' | 'healthkit' | ...;
  syncedToNostr: boolean;
  nostrEventId?: string;

  // Activity-specific fields
  reps?: number;
  sets?: number;
  meditationType?: string;
  mealType?: string;
}
```

### AsyncStorage Keys

| Key | Purpose |
|-----|---------|
| `local_workouts` | Array of LocalWorkout objects |
| `workout_id_counter` | Unique ID generation |
| `nostr_workout_import_completed` | One-time import flag |

### WorkoutEventStore

**File:** `src/services/fitness/WorkoutEventStore.ts`

In-memory cache for published workouts:

```typescript
// Singleton access
const store = WorkoutEventStore.getInstance();

// Query methods
store.getAllWorkouts(): StoredWorkout[]
store.getWorkoutsByUser(pubkey): StoredWorkout[]
store.getTodaysWorkouts(): StoredWorkout[]
store.getEventWorkouts(start, end, participants): StoredWorkout[]

// Updates
store.refresh(): Promise<void>
store.subscribe(callback): () => void
```

### Cache Invalidation

When a workout is published:

```typescript
// In WorkoutPublishingService
CacheInvalidationService.invalidateWorkouts();

// This triggers WorkoutEventStore to:
// 1. Clear in-memory cache
// 2. Re-fetch from relays
// 3. Notify subscribers
```

---

## Reward Triggering

Publishing a workout triggers reward eligibility check:

```typescript
// After successful publish
await DailyRewardService.checkStreakAndReward(
  userPubkey,
  workout.source  // 'gps_tracker' or 'manual_entry'
);
```

Only certain sources qualify for rewards:
- `gps_tracker` - GPS-tracked workouts
- `manual_entry` - User-entered workouts

HealthKit/Health Connect imports do NOT trigger rewards (prevents gaming).

---

## What Storage Should Be

### Ideal Architecture
1. **Single local store** - LocalWorkoutStorageService only
2. **Supabase primary** - Competition data lives in Supabase
3. **Auto-submit** - Automatic submission when user enables it
4. **Clean sync status** - Clear tracking of what's submitted

### What to Avoid
- Publishing kind 1301 to Nostr relays
- Manual "Compete" buttons for each workout
- Duplicate workouts from multiple imports
- Cache inconsistencies between local and Supabase

---

## Navigation

**Previous:** [Chapter 4: Workout Data Model](./04-workouts-data-model.md)

**Next:** [Chapter 6: Events Overview](./06-events-overview.md)

**Table of Contents:** [Back to TOC](./00-table-of-contents.md)
