# Chapter 6: Events Overview

## Summary

RUNSTR hosts fitness competitions where participants compete on leaderboards for reward prize pools. The app runs seasonal competitions, featured events, club captain-created events, and a daily leaderboard that is always active. Each event focuses on specific activities and rewards top performers.

Joining an event takes a single tap. Navigate to the Events page, select an event card to view details and the current leaderboard, then tap Join. There are no entry fees — participation is completely free. Once joined, your workouts automatically count toward that event's leaderboard. Your ranking updates as you and other participants log more distance.

The leaderboard system organizes competitors by activity type. Separate leaderboards track Running, Walking, and Cycling distances, ensuring fair competition within each category. You compete against others doing the same activity, not against cyclists when you're a runner. Leaderboards display participant names, total distances, workout counts, and rankings updated every 2 minutes.

Prize distribution happens at event conclusion, with rewards sent via Lightning to top performers. Club captains can create events from templates with optional prize pools and charity payouts, enabling anyone to host a 5K for charity with real rewards on the line. The transparent prize structure displayed on each event card lets you know exactly what you're competing for before joining. Whether you're chasing the grand prize in a season competition or competing for daily leaderboard recognition, RUNSTR events add stakes and community to your fitness routine, transforming solitary workouts into shared competition with tangible rewards.

---

## What are RUNSTR Events?

Events are fitness competitions with reward prizes. Users join events, complete workouts, and compete on leaderboards for rewards.

### Event Types

| Type | Description | Examples |
|------|-------------|---------|
| Season Competitions | Multi-month events with large prize pools | RUNSTR Season III |
| Featured Events | Scheduled events with specific goals | Distance challenges, streak competitions |
| Club Events | Captain-created from templates | 5K charity run, 10K challenge, step competition |
| Daily Leaderboard | Always active, resets daily | Fastest 5K/10K/Half/Marathon, Steps |

---

## Key Characteristics

### Captain-Created Events
Club captains can create events from templates:
- 5K, 10K, Half Marathon, Step Challenge templates
- Optional prize pools funded by the captain
- Optional charity payouts — run a 5K for charity with real rewards
- All club members automatically entered

### Free Participation
- No payment required to join events
- Simply tap "Join" and start working out
- All workouts during event period count toward leaderboard

### Reward Prizes
- Prize pools defined per event
- Top performers earn rewards
- Distributed via Lightning at event end
- Charity events route payouts to the chosen charity

---

## Event Formats

### Season Competitions
Long-running events spanning multiple months:
- Multiple activity types (Running, Walking, Cycling)
- Large prize pools
- Charity support integration

### Featured Events
Scheduled events with specific goals:
- Distance challenges, streak competitions, team races
- Run on defined schedules with start and end dates

### Club Events
Captain-created from templates:
- Captains choose template, set dates, configure prize pool and charity
- Members automatically entered
- Moving toward fully user-created competitions

---

## Events Page UI

The Events page shows:

```
┌─────────────────────────────────────┐
│  ← Back     [Host Virtual Event]    │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │ [RUNSTR Logo]        LIVE   │   │
│  │ RUNSTR Season II Competition│   │
│  │ Jan 1, 2026 - Mar 1, 2026   │   │
│  │ ⚡ 1.0M sats Prize Pool     │   │
│  │ [Running] [Walking] [Cycling]│   │
│  │ [BTC Prizes] [Charity]      │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ [Image]              LIVE   │   │
│  │ January Walking Contest     │   │
│  │ Jan 1 - Jan 31 (24d left)   │   │
│  │ Top 3 win 1,000 sats each   │   │
│  │ [Walking] [⚡ 3,000 sats]   │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Event Card Elements
- Event image/logo
- LIVE badge (if active)
- Event name
- Date range
- Prize information
- Activity type tags
- Special badges (BTC Prizes, Charity)

---

## Technical Section

### Event Screens

| Screen | File | Purpose |
|--------|------|---------|
| EventsScreen | `src/screens/EventsScreen.tsx` | Main events list |
| Season2Screen | `src/screens/season2/Season2Screen.tsx` | Season II details & leaderboard |

### Event Card Components

Events are rendered using hardcoded card components:

| Component | File |
|-----------|------|
| Season2EventCard | `src/components/events/Season2EventCard.tsx` |
| JanuaryWalkingEventCard | `src/components/events/JanuaryWalkingEventCard.tsx` |
| RunningBitcoinEventCard | `src/components/events/RunningBitcoinEventCard.tsx` |
| EinundzwanzigEventCard | `src/components/events/EinundzwanzigEventCard.tsx` |

### Event Creation

Club captains can create events from templates with:
- Activity type selection
- Date range configuration
- Optional prize pool (funded via captain's NWC wallet)
- Optional charity destination and payout
- Auto-finalization with multi-recipient prize splits

---

## Event Data Flow

```
EventsScreen loads
        ↓
Renders hardcoded event cards
        ↓
User taps event card
        ↓
Navigates to Season2Screen (or similar)
        ↓
Loads participant list from Supabase
        ↓
Leaderboard data fetched (calculated externally, updated every 2 minutes)
        ↓
Displays leaderboard rankings
```

**Note:** Leaderboard data comes from Supabase, which aggregates submitted workouts. The app queries Supabase via the `useSupabaseLeaderboard` hook and displays ranked results.

---

## What Events Should Be

### Ideal Architecture
1. **Simple event list** — Clear display of active events
2. **Easy joining** — One-tap to participate
3. **Clear prizes** — Transparent prize structure
4. **Live status** — Clear indication of active vs upcoming vs ended
5. **Captain-created** — Captains host events for their clubs with real prize pools

### Future Direction
- Fully user-created competitions (not just captains)
- More event formats and templates
- Entry fees (optional)
- NWC wallets for non-custodial prize pool management

---

## Navigation

**Previous:** [Chapter 5: Workout Storage & Publishing](./05-workouts-storage.md)

**Next:** [Chapter 7: In-Person Events & Business Model](./07-in-person-events.md)

**Table of Contents:** [Back to TOC](./00-table-of-contents.md)
