# Chapter 9: Event Leaderboards

## How Leaderboards Work

Leaderboards show ranked participants based on their workout performance during an event. Rankings are calculated from:
- **Participant list** - Who joined the event (from Supabase)
- **Workout data** - Submitted workouts in Supabase (auto-submitted via `submitWorkoutSimple()`)
- **Scoring rules** - Total distance, workout count, etc.

---

## Leaderboard Display

### Activity Tabs

Each leaderboard has tabs for different activities:
- **Running** - Running workouts only
- **Walking** - Walking workouts only
- **Cycling** - Cycling workouts only

Users can switch tabs to see rankings for each activity type.

### Leaderboard Entry

Each entry shows:
- **Rank** - Position (1, 2, 3...)
- **Avatar** - User's profile picture
- **Name** - Display name from Nostr profile
- **Total Distance** - Sum of all qualifying workouts
- **Workout Count** - Number of workouts completed

```
┌───┬─────────────────────┬────────┐
│ 1 │ 🏅 guy      87.1 km │ 10 Runs│
│ 2 │ 🥈 JokerHas 83.1 km │ 7 Runs │
│ 3 │ 🥉 LOPES    45.0 km │ 15 Runs│
│ 4 │    Adrien   42.2 km │ 5 Runs │
│ 5 │    johnny9  38.5 km │ 8 Runs │
└───┴─────────────────────┴────────┘
```

---

## Data Sources

### All Data from Supabase

Both participant lists and workout data come from Supabase:

- **Participants** - Query `event_participants` table for who joined the event
- **Workouts** - Query `workouts` table for submitted workouts during event period
- **Profiles** - User names and avatars from Nostr kind 0 (cached)

### Data Flow

```
useSupabaseLeaderboard hook
        ↓
Query Supabase workouts table:
  - Filter by event date range
  - Filter by activity type (running/walking/cycling)
  - Filter by event participants
        ↓
Aggregate per user:
  - Total distance (sum)
  - Workout count
        ↓
Sort by total distance (descending)
        ↓
Enrich with profile data (name, avatar)
        ↓
Display ranked leaderboard
```

---

## Scoring Metrics

### Primary: Total Distance
Sum of all workout distances during event period.

```typescript
const totalDistance = workouts.reduce(
  (sum, w) => sum + (w.distance || 0),
  0
);
```

### Secondary: Workout Count
Number of qualifying workouts.

```typescript
const workoutCount = workouts.length;
```

### Displayed Format
- Distance: `87.1 km` or `54.1 mi`
- Count: `10 Runs` or `7 Walks`

---

## Baseline System

For long events like Season II, a **baseline system** improves performance:

### Problem
Re-aggregating 2 months of workouts on every load is slow.

### Solution
Pre-compute totals at a snapshot date, then only fetch recent workouts.

```typescript
// Baseline data (pre-computed)
const SEASON2_BASELINE = {
  snapshotDate: '2026-01-15',
  participants: [
    { pubkey: '...', running: 50.5, walking: 20.0, cycling: 30.0 },
    { pubkey: '...', running: 45.2, walking: 15.5, cycling: 25.0 },
    // ...
  ]
};

// Runtime calculation
const currentTotal = baseline.running + freshWorkoutsSinceSnapshot.running;
```

---

## Technical Section

### Supabase Leaderboard Hook

**File:** `src/hooks/useSupabaseLeaderboard.ts`

The primary hook for querying leaderboard data from Supabase:

```typescript
// Usage in competition screens
const { data, isLoading, error } = useSupabaseLeaderboard({
  eventId: 'season-2',
  activityType: 'running',
});

interface LeaderboardEntry {
  rank: number;
  pubkey: string;
  name: string;
  picture?: string;
  totalDistance: number;  // in km
  workoutCount: number;
  charityId?: string;
}
```

### SupabaseCompetitionService

**File:** `src/services/backend/SupabaseCompetitionService.ts`

Handles workout submission and leaderboard queries:

```typescript
// Submit workout to Supabase (called automatically for all cardio workouts)
static async submitWorkoutSimple(data: WorkoutSubmissionData): Promise<{
  success: boolean;
  error?: string;
  flagged?: boolean;
}>
```

### Filtering by Activity

```typescript
// Filter by exercise type
const runningWorkouts = workouts.filter(w =>
  w.activityType === 'running'
);

const walkingWorkouts = workouts.filter(w =>
  w.activityType === 'walking'
);

const cyclingWorkouts = workouts.filter(w =>
  w.activityType === 'cycling'
);
```

### Caching

| Data | Cache TTL | Location |
|------|-----------|----------|
| Leaderboard | 5 minutes | Memory |
| Baseline | Static | Code |
| Participants | 5 minutes | AsyncStorage |

---

## UI Components

### Season2Leaderboard

**File:** `src/components/season2/Season2Leaderboard.tsx`

```typescript
interface Season2LeaderboardProps {
  activityType: 'running' | 'walking' | 'cycling';
  currentUserPubkey?: string;
}
```

Features:
- Activity tab selector
- Scrollable list
- Current user highlighted
- Pull-to-refresh
- Loading states

### LeaderboardLimiter

**File:** `src/components/ui/LeaderboardLimiter.tsx`

Limits displayed entries with "Show More" button:
- Initially shows top 10
- Expand to show all participants
- Collapse back to top 10

---

## What Leaderboards Should Be

### Ideal Architecture
1. **Fast loading** - Baseline + fresh data pattern
2. **Accurate data** - Supabase as single source of truth
3. **Clear ranking** - Obvious who's winning
4. **Activity filtering** - Easy tab switching
5. **Current user visible** - Highlight logged-in user

### What to Avoid
- Complex scoring algorithms
- Multiple competing leaderboard services
- Stale cached data
- Querying Nostr relays for leaderboard data

---

## Navigation

**Previous:** [Chapter 8: Joining Events](./08-events-joining.md)

**Next:** [Chapter 10: Rewards Overview](./10-rewards-overview.md)

**Table of Contents:** [Back to TOC](./00-table-of-contents.md)
