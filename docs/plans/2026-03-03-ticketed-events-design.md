# Ticketed Events with Pledge-Based Entry

**Date:** 2026-03-03
**Status:** Approved
**First use case:** 21K Race on March 11 — 2-day pledge entry, 21,000 sat prize to one random finisher

## Overview

Add pledge-based ticketing to the RUNSTR event system. Captains set a workout-day entry fee (1-7 days). Users join by pledging that many days of rewards to the captain. The existing pledge/reward-routing system handles all payment mechanics — no new payment infrastructure needed.

## The Model

**The ticket IS the pledge.** When a captain creates a ticketed event:

1. Captain selects entry fee: 1-7 workout days
2. User taps "Join" → pledges N days of rewards to the captain
3. User's next N daily workout rewards route to the captain instead of themselves
4. Pledge = registered. User is in the event.

**Economics:**
- Free user pledge: 100 sats/workout × N days → captain
- Subscriber pledge: 800 sats/workout × N days → captain
- Captains earn more from subscriber entrants (8x)
- Incentivizes captains to host events + attract subscribers
- Captains use collected rewards to fund prize pools

**Example — 21K Race:**
- Entry: 2-day pledge
- 15 subscribers join → captain collects 2 × 800 × 15 = 24,000 sats
- Captain funds 21,000 sat prize from collected rewards
- One random finisher wins the prize

## Data Model Changes

### Type Extensions (`src/types/runstrEvent.ts`)

```typescript
// Add to RunstrPayoutScheme
type RunstrPayoutScheme = ... | 'random_winner';

// Add to RunstrEventConfig
ticketPledgeDays?: number;                 // 1-7 workout days as entry fee
winnerSelection?: 'ranked' | 'random';     // How winner is picked (default: 'ranked')
qualifyingDistance?: number;                // km — minimum to qualify as finisher (e.g., 21.0)
```

### Form State Fields (`RunstrEventFormState`)

```typescript
ticketPledgeDays: number;          // 1-7 selector
winnerSelection: 'ranked' | 'random';
qualifyingDistance: string;         // Input field for qualifying distance
```

### Extended `competitions.config` JSONB

```json
{
  "ticket_pledge_days": 2,
  "winner_selection": "random",
  "qualifying_distance_km": 21.0
}
```

### Nostr Tags (NIP-52 Extensions)

New tags on kind 31923 events:

```
['ticket_pledge_days', '2']          // Workout days required to enter
['winner_selection', 'random']       // ranked | random
['qualifying_distance', '21.0']      // km minimum to qualify
```

## Join Flow

```
User taps "Join Race" (ticketed event)
  │
  ├─ 1. App detects ticketPledgeDays on event config
  │
  ├─ 2. App shows pledge confirmation:
  │     "Pledge 2 workout days to enter"
  │     "Your next 2 daily rewards will go to the captain"
  │
  ├─ 3. User confirms → PledgeService.createPledge():
  │     → pledgeCost = event.ticketPledgeDays
  │     → pledgeDestination = 'captain'
  │     → Stored in AsyncStorage
  │
  ├─ 4. User registered as participant:
  │     → SupabaseCompetitionService.joinCompetition()
  │     → competition_participants row inserted
  │
  └─ 5. Reward routing active:
        → User completes workout → DailyRewardService checks active pledge
        → Reward routed to captain instead of user
        → Pledge progress incremented (1/2, 2/2)
        → After N workouts, pledge completed, rewards return to normal
```

## Random Winner Selection

After the race window closes:

```
Race ends (e.g., March 11, 23:59 UTC)
  │
  ├─ 1. Edge Function: finalize-ticketed-event
  │     (Triggered by cron or manual)
  │
  ├─ 2. Query finishers:
  │     Participants with total_distance_km >= qualifying_distance
  │
  ├─ 3. Deterministic random selection:
  │     seed = SHA256(event_id + sorted_finisher_npubs)
  │     winner_index = seed_as_int % finisher_count
  │     (Anyone can verify independently)
  │
  ├─ 4. Prize payout (organizer-initiated):
  │     → Organizer opens app, sees winner + "Pay Winner" button
  │     → App fetches winner's Lightning address from Nostr profile
  │     → Organizer's local NWC sends prize_pool_sats to winner
  │     → Record payout in Supabase
  │
  └─ 5. Announce winner in-app
```

## Prize Funding

- Pledge revenue (N days × reward amount × entrants) goes to captain via reward routing
- Prize pool funded by captain from collected pledge revenue
- Captain sends prize from their device using their local NWC
- No escrow, no custodial intermediary, no secrets stored

## What Already Exists (No Changes Needed)

- **PledgeService** — create/track/complete pledges
- **DailyRewardService** — routes rewards to pledge destination
- **Reward routing** — captain/charity destination switching
- **SupabaseCompetitionService** — join/leave/participant tracking
- **RunstrEventPublishService** — publish NIP-52 events with custom tags

## What's New

### Event Creation Changes

**`SimpleEventCreationModal`** — Add new fields:
- Ticket pledge days selector (1-7 slider or picker)
- Winner selection toggle: "Top Ranked" vs "Random Draw"
- Qualifying distance field (km, for participation/random events)

**`RunstrEventPublishService`** — Add new tags:
- `ticket_pledge_days`, `winner_selection`, `qualifying_distance`

### Event Display Changes

**`DynamicEventCard`** — Show pledge entry badge (e.g., "2-day pledge to enter")
**`DynamicEventDetail`** — Show entry requirements, qualifying criteria, "Random Draw" indicator

### Join Flow Changes

**`DynamicEventDetail` join button** — When event has ticketPledgeDays:
- Show pledge confirmation instead of direct join
- Create pledge + join competition in one flow
- Show pledge progress on event detail page

### New: Random Winner + Payout

**`EventFinalizationService`** (`src/services/events/EventFinalizationService.ts`):
- `finalizeEvent(eventId)` — query finishers, select winner
- `getFinishers(eventId, qualifyingDistance)` — query workout submissions
- `selectRandomWinner(eventId, finishers)` — deterministic SHA256-based random
- Prize payout UI on organizer's event detail screen

**Edge Function: `finalize-ticketed-event`:**
- Query finishers meeting qualifying distance
- Compute deterministic winner
- Store result in Supabase

## Architecture Alignment

- **Pledge system for entry** — extends existing PledgeService (no new payment rails)
- **Reward routing for payment** — extends existing DailyRewardService
- **Supabase for state** — competitions, participants, workout submissions
- **Nostr for event publishing** — extends existing NIP-52 tags
- **Organizer-initiated payout** — NWC stays on organizer's device only
- **No secrets server-side** — zero wallet keys in Supabase

## Constraints

- One active pledge per user (existing constraint) — can only enter one pledged event at a time
- Pledge = entry. User is registered immediately on pledge, not after completion.
- Captain must have Lightning address (for reward routing)
- Qualifying distance validated against workout_submissions
- Random winner seed is deterministic and verifiable
- Prize payout requires organizer to open app and confirm
