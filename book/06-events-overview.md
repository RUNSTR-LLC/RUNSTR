# Chapter 6: Events Overview

## Summary

RUNSTR hosts virtual events where participants compete on leaderboards for extra rewards. There are two kinds of events: the always-on daily leaderboard, which every cardio workout enters automatically, and captain-created club events, which run on a captain's schedule for their club members.

There are no entry fees. There are no seasonal "battle" formats with sponsor logos. The model is simple: the daily leaderboard is always running, club captains create events when they want to, and the platform is moving toward fully user-created events where any user can host their own.

The leaderboard system organizes competitors by activity type and metric. Separate leaderboards track running distances, walking distances, cycling distances, and steps. You compete against others doing the same thing — runners against runners, cyclists against cyclists.

---

## What are RUNSTR Events?

Events are virtual fitness competitions. Users enter events (or are auto-entered as club members), complete cardio workouts, and the leaderboard ranks participants. Top performers earn extra rewards on top of their normal daily reward.

### Event Types

| Type | Description | Example |
|------|-------------|---------|
| **Daily Leaderboard** | Always active, resets daily | Fastest 5K, 10K, Half, Marathon, daily Steps |
| **Club Events** | Captain-created from templates | 5K, 10K, Half Marathon, Step Challenge |

Note: "Events" and "competitions" refer to the same concept. The codebase uses both terms interchangeably; user-facing copy says "events."

---

## Key Characteristics

### Always-On Daily Leaderboard
- No joining required — every cardio workout enters automatically
- Five boards: 5K, 10K, Half Marathon, Marathon (fastest time), daily Steps
- Resets every day
- Top performers earn extra rewards

### Captain-Created Club Events
- Club captains create events from templates
- All club members are automatically entered
- 24-hour duration by default
- Max 3 active events per captain
- Captains earn rewards for each member workout, on top of any event prizes

### Free Participation
- No payment required to join or enter events
- Workouts auto-submitted during the event period count toward the leaderboard

---

## Events Page UI

The Events tab shows:

```
+-------------------------------------+
|  EVENTS                             |
+-------------------------------------+
|  Daily Leaderboard          ALWAYS  |
|  5K  |  10K  |  Half  |  Marathon  |
|  Steps                              |
+-------------------------------------+
|  Club Events                        |
|  +-------------------------------+ |
|  | Captain @runner               | |
|  | 5K Challenge — Today          | |
|  | 12 participants               | |
|  +-------------------------------+ |
+-------------------------------------+
```

---

## Technical Section

### Event Screens

| Screen | File | Purpose |
|--------|------|---------|
| EventsScreen | `src/screens/EventsScreen.tsx` | Main events tab |
| DailyLeaderboardScreen | `src/screens/competition/DailyLeaderboardScreen.tsx` | Daily leaderboard |
| DynamicEventDetailScreen | `src/screens/events/DynamicEventDetailScreen.tsx` | Club event details |

### Event Creation

Club captains create events from templates with:
- Template selection (5K, 10K, Half Marathon, Step Challenge)
- Date range configuration (default: 24 hours)
- Optional prize pool (funded via captain's NWC wallet)
- Auto-finalization at event end with prize splits

### Event Data Flow

```
EventsScreen loads
        ↓
Fetch daily leaderboard from Supabase (always active)
        ↓
Fetch active club events from Supabase
        ↓
User taps event card
        ↓
DynamicEventDetailScreen loads
        ↓
Loads participant list from Supabase
        ↓
Leaderboard data fetched (5-min cache TTL)
        ↓
Displays leaderboard rankings
```

---

## What Events Should Be

### Ideal Architecture
1. **Two types only** — Daily leaderboard + club events. Nothing else.
2. **Auto-entry** — Daily leaderboard takes every workout; club events take every member workout
3. **One-tap UX** — Members never have to manually join their own club's events
4. **Clear status** — LIVE / UPCOMING / ENDED states
5. **Captain-owned** — Captains control their club's event schedule

### Future Direction
- Fully user-created events (not just captains)
- More event templates
- Daily leaderboard stays built-in and always running

---

## Navigation

**Previous:** [Chapter 5: Workout Storage & Publishing](./05-workouts-storage.md)

**Next:** [Chapter 8: Joining Events](./08-events-joining.md)

**Table of Contents:** [Back to TOC](./00-table-of-contents.md)
