# Chapter 6: Events Overview

## Summary

RUNSTR hosts fitness competitions where participants compete on leaderboards for Bitcoin prize pools. Current events include RUNSTR Season II (a two-month competition from January through March with a 1 million sat prize pool), the January Walking Contest, the Running Bitcoin Challenge, and Daily Leaderboards. Each event focuses on specific activities and offers real satoshi rewards to top performers.

Joining an event takes a single tap. Navigate to the Events page, select an event card to view details and the current leaderboard, then tap Join. There are no entry fees—participation is completely free. Once joined, any workouts you publish using the Compete button automatically count toward that event's leaderboard. Your ranking updates as you and other participants log more distance.

The leaderboard system organizes competitors by activity type. In Season II, separate leaderboards track Running, Walking, and Cycling distances, ensuring fair competition within each category. You compete against others doing the same activity, not against cyclists when you're a runner. Leaderboards display participant names, total distances, workout counts, and rankings—calculated outside the app and updated every 2 minutes.

Event participation is tracked entirely through Supabase. This approach provides faster queries for participant lists, simpler management for event operations, and reliable tracking for prize distribution. When you complete a workout, it is automatically submitted to Supabase for leaderboard ranking. Kind 1301 events are created locally for structure but are NOT published to Nostr relays—Supabase is the single source of truth for competition data.

Prize distribution happens at event conclusion, with Bitcoin sent via Lightning to top performers. The transparent prize structure—displayed on each event card—lets you know exactly what you're competing for before joining. Whether you're chasing the grand prize in Season II or competing for daily leaderboard recognition, RUNSTR events add stakes and community to your fitness routine, transforming solitary workouts into shared competition with tangible rewards.

---

## What are RUNSTR Events?

Events are fitness competitions with Bitcoin prizes. Users join events, complete workouts, and compete on leaderboards for satoshi rewards.

### Current Events (January 2026)

| Event | Duration | Prize | Activities |
|-------|----------|-------|------------|
| RUNSTR Season II | Jan 1 - Mar 1 | 1M sats pool | Running, Walking, Cycling |
| January Walking Contest | Jan 1 - Jan 31 | 3,000 sats (top 3) | Walking |
| Running Bitcoin Challenge | Ongoing | Varies | Running |
| Daily Leaderboards | Daily reset | Recognition | All activities |

---

## Key Characteristics

### Hardcoded Events
Events are **currently hardcoded** in the app:
- No dynamic event creation
- No "Host Virtual Event" functionality yet
- Events defined in code and updated with app releases

### Free Participation
- No payment required to join events
- Simply tap "Join" and start working out
- All workouts during event period count toward leaderboard

### Bitcoin Prizes
- Prize pools defined per event
- Top performers win satoshis
- Distributed via Lightning at event end

---

## Event Types

### Season Competitions
Long-running events spanning multiple months:
- **RUNSTR Season II** - 2 months (Jan-Mar)
- Multiple activity types (Running, Walking, Cycling)
- Large prize pools
- Charity support integration

### Monthly Contests
Single-month focused events:
- **January Walking Contest** - 1 month
- Single activity type
- Smaller prize pools
- Top 3 winners format

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

### No Dynamic Creation

The "Host Virtual Event" button exists in the UI but:
- Event creation is not fully implemented
- Events are added through code updates
- Future versions may enable user-created events

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
1. **Simple event list** - Clear display of active events
2. **Easy joining** - One-tap to participate
3. **Clear prizes** - Transparent prize structure
4. **Live status** - Clear indication of active vs upcoming vs ended

### Current Limitations
- Events are hardcoded (requires app update to add new events)
- No user/captain-created events
- Limited event types

### Future Possibilities
- Dynamic event creation
- User-hosted events
- Entry fees (optional)
- More event formats

---

## Navigation

**Previous:** [Chapter 5: Workout Storage & Publishing](./05-workouts-storage.md)

**Next:** [Chapter 7: In-Person Events & Business Model](./07-in-person-events.md)

**Table of Contents:** [Back to TOC](./00-table-of-contents.md)
