# Chapter 8: Joining Events

> **Note (May 2026):** This chapter references Season II as the canonical example because the technical patterns are real and still in the codebase. Under the simplified direction, the two active event types are the daily leaderboard (auto-entry, no joining required) and captain-created club events (auto-entry for members). Season II is a legacy featured-event format being phased out.

## How Users Join Events

Joining an event in RUNSTR is simple:
1. Navigate to the Events tab
2. Tap on an event card
3. Tap "Join" button
4. Start working out!

### No Payment Required
Currently, all events are **free to join**:
- No entry fees
- No Lightning payment needed
- Simply opt-in and participate

---

## Join Flow

```
User on Events page
        ↓
Taps event card (e.g., Season II)
        ↓
Event detail screen loads
        ↓
User taps "Join" button
        ↓
App sends join notification to Supabase
        ↓
User added to event_participants table
        ↓
Confirmation shown
        ↓
User can now see themselves on leaderboard
        ↓
All qualifying workouts count toward event
```

---

## Supabase Participant Tracking

### Why Supabase (Not Nostr)?

Event participation is tracked in Supabase because:
- **Simpler** than managing Nostr event kinds for join requests
- **Faster** queries for participant lists
- **Centralized** control for event management
- **Reliable** for prize distribution

### Data Model

```sql
-- event_participants table
CREATE TABLE event_participants (
  id UUID PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_pubkey TEXT NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, user_pubkey)
);
```

### Join Process

```typescript
// When user taps "Join"
await supabase
  .from('event_participants')
  .insert({
    event_id: 'season2',
    user_pubkey: userHexPubkey,
    joined_at: new Date().toISOString()
  });
```

---

## Local Join State

For instant UX, the app also tracks joins locally:

```typescript
// AsyncStorage key
const LOCAL_JOINS_KEY = '@runstr:event_joins';

// Structure
{
  "season2": {
    "joined": true,
    "joinedAt": "2026-01-05T10:30:00Z"
  }
}
```

This allows:
- Instant UI feedback (no network wait)
- Offline join capability
- Sync with Supabase when online

---

## Technical Section

### UnifiedEventParticipantService

**File:** `src/services/satlantis/UnifiedEventParticipantService.ts`

Main service for event participation:

```typescript
// Key methods
async joinEvent(eventId: string, pubkey: string): Promise<void>
async hasJoined(eventId: string, pubkey: string): Promise<boolean>
async getParticipants(eventId: string): Promise<string[]>
async leaveEvent(eventId: string, pubkey: string): Promise<void>
```

### Season2Service

**File:** `src/services/season/Season2Service.ts`

Handles Season II specifically:

```typescript
// Participant management
getParticipants(): Promise<Participant[]>
joinLocally(pubkey: string): Promise<void>
hasJoined(pubkey: string): Promise<boolean>

// Hardcoded participants
const SEASON_2_PARTICIPANTS = [
  { pubkey: '...', name: 'guy', picture: '...' },
  { pubkey: '...', name: 'JokerHasse', picture: '...' },
  // ... 50+ participants
];
```

### Hardcoded vs Dynamic Participants

Season II uses a **hybrid approach**:
1. **Hardcoded list** - Official participants defined in code
2. **Local joins** - New users can join locally
3. **Supabase sync** - Joins persisted to Supabase

```typescript
// Get all participants
async getParticipants() {
  // Start with hardcoded list
  const participants = [...SEASON_2_PARTICIPANTS];

  // Add local joins
  const localJoins = await this.getLocalJoins();
  for (const pubkey of localJoins) {
    if (!participants.find(p => p.pubkey === pubkey)) {
      participants.push({ pubkey, name: 'Participant', picture: null });
    }
  }

  return participants;
}
```

---

## UI Components

### Join Button States

| State | Display | Action |
|-------|---------|--------|
| Not Joined | "Join Event" button | Triggers join flow |
| Joining | Loading spinner | Wait for confirmation |
| Joined | "Joined ✓" badge | View leaderboard |
| Error | Error message | Retry option |

### Event Detail Screen

```
┌─────────────────────────────────────┐
│  ← Back         Season II           │
├─────────────────────────────────────┤
│  RUNSTR SEASON II                   │
│  Jan 1, 2026 - Mar 1, 2026   LIVE   │
│  [Tap for details ℹ]                │
├─────────────────────────────────────┤
│  [Running] [Walking] [Cycling]      │  ← Activity tabs
├─────────────────────────────────────┤
│  LEADERBOARD            01/08/2026  │
│  ┌───┬──────────────────┬────────┐ │
│  │ 1 │ guy       87.1km │ 10 Runs│ │
│  │ 2 │ JokerHas  83.1km │ 7 Runs │ │
│  │ 3 │ LOPES     45.0km │ 15 Runs│ │
│  │ 4 │ Adrien    42.2km │ 5 Runs │ │
│  └───┴──────────────────┴────────┘ │
└─────────────────────────────────────┘
```

---

## What Joining Should Be

### Ideal Architecture
1. **One-tap join** - Simple, immediate participation
2. **Free participation** - No payment barriers
3. **Instant feedback** - Local state + background sync
4. **Clear status** - User always knows if they're participating

### What to Avoid
- Complex join request approval flows
- Payment requirements for basic participation
- Confusing join status

---

## Navigation

**Previous:** [Chapter 6: Events Overview](./06-events-overview.md)

**Next:** [Chapter 9: Event Leaderboards](./09-events-leaderboards.md)

**Table of Contents:** [Back to TOC](./00-table-of-contents.md)
