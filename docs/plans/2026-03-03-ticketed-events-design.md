# Ticketed Events with Lightning Entry Fees

**Date:** 2026-03-03
**Status:** Approved
**First use case:** 21K Race on March 11 — 210 sat ticket, 21,000 sat prize to one random finisher

## Overview

Add Lightning invoice-based ticket payments to the RUNSTR event system. Any Pro user with NWC can create ticketed events with configurable ticket prices, qualifying criteria, and prize pools. Winners can be selected by rank or random draw from qualifying finishers.

## Data Model

### New Type Extensions (`src/types/runstrEvent.ts`)

```typescript
// Add to RunstrPayoutScheme
type RunstrPayoutScheme = ... | 'random_winner';

// Add to RunstrEventConfig
ticketPriceSats?: number;                  // Lightning invoice amount to join (e.g., 210)
winnerSelection?: 'ranked' | 'random';     // How winner is picked (default: 'ranked')
qualifyingDistance?: number;                // km — minimum to qualify as finisher (e.g., 21.0)
```

### New Form State Fields (`RunstrEventFormState`)

```typescript
ticketPrice: string;          // Input field for ticket price
winnerSelection: 'ranked' | 'random';
qualifyingDistance: string;    // Input field for qualifying distance
```

### New Supabase Table: `event_tickets`

```sql
CREATE TABLE event_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID REFERENCES competitions(id),
  npub TEXT NOT NULL,
  payment_hash TEXT NOT NULL,
  invoice TEXT NOT NULL,
  amount_sats INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',    -- pending | paid | expired
  created_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  UNIQUE(competition_id, npub)
);
```

### Extended `competitions.config` JSONB

```json
{
  "ticket_price_sats": 210,
  "winner_selection": "random",
  "qualifying_distance_km": 21.0
}
```

## Ticket Purchase Flow

```
User taps "Join Race" (ticketed event)
  │
  ├─ 1. App detects ticketPriceSats on event config
  │
  ├─ 2. Calls Edge Function: create-event-ticket
  │     → Creates invoice via organizer's NWC wallet
  │     → Inserts event_tickets row (status: 'pending')
  │     → Returns { invoice, paymentHash }
  │
  ├─ 3. App shows TicketPaymentModal:
  │     - QR code of Lightning invoice
  │     - Copy invoice button
  │     - "Pay with wallet" (if user has NWC)
  │     - Expiry countdown
  │
  ├─ 4. User pays via any Lightning wallet
  │
  ├─ 5. App polls verify-ticket-payment every 3s:
  │     → lookupInvoice via organizer's NWC
  │     → When settled:
  │       - event_tickets.status → 'paid'
  │       - Insert competition_participants row
  │       - Return { registered: true }
  │
  └─ 6. App shows confirmation → navigates to event detail
```

**Key:** Invoice goes to organizer's NWC wallet. Organizer receives ticket revenue directly. No escrow.

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
  │
  ├─ 4. Prize payout via organizer's NWC:
  │     → Fetch winner's Lightning address
  │     → Send prize_pool_sats to winner
  │     → Record in event_payouts
  │
  └─ 5. Announce winner in-app
```

## Prize Funding

- Ticket revenue (210 sats x N entrants) goes to organizer's wallet
- Prize pool (21,000 sats) is funded separately by the organizer
- Organizer's NWC wallet sends the prize to the winner
- No escrow mechanism needed

## New Services

### `TicketService` (`src/services/events/TicketService.ts`)

- `createTicket(eventId, npub)` — calls Edge Function, returns invoice
- `checkTicketStatus(eventId, npub)` — polls payment status
- `hasValidTicket(eventId, npub)` — boolean gate check

### `EventFinalizationService` (`src/services/events/EventFinalizationService.ts`)

- `finalizeEvent(eventId)` — orchestrates finisher query + winner selection + payout
- `getFinishers(eventId, qualifyingDistance)` — query workout submissions
- `selectRandomWinner(eventId, finishers)` — deterministic random using SHA256 seed
- `payoutWinner(winnerNpub, amountSats)` — NWC payment to winner

### New Edge Functions

- `create-event-ticket` — create invoice via organizer NWC, insert pending ticket
- `verify-ticket-payment` — check invoice paid, register participant
- `finalize-ticketed-event` — pick winner, send prize

## New Components

### `TicketPaymentModal` (`src/components/compete/TicketPaymentModal.tsx`)

- Lightning invoice QR code display
- Copy invoice button
- "Pay with wallet" button (user's NWC)
- Payment status indicator (waiting / paid / registered)
- Expiry countdown timer

### Updated Components

- **`SimpleEventCreationModal`** — Add ticket price, winner selection, qualifying distance fields
- **`DynamicEventDetail`** — Show ticket price badge, qualifying criteria, "Random Draw" indicator
- **`DynamicEventCard`** — Show ticket price badge on event cards

## Nostr Tags (NIP-52 Extensions)

New tags on kind 31923 events:

```
['ticket_price', '210']              // Ticket price in sats
['winner_selection', 'random']       // ranked | random
['qualifying_distance', '21.0']      // km minimum to qualify
```

## Architecture Alignment

- **NWC for payments** — Uses existing `NWCWalletService` (createInvoice, lookupInvoice, sendPayment)
- **Supabase for state** — event_tickets table tracks payment lifecycle
- **Edge Functions for orchestration** — Server-side invoice creation and verification
- **Nostr for event publishing** — Extends existing NIP-52 tags
- **No escrow** — Organizer funds prize pool from their wallet

## Constraints

- Event creator MUST have NWC configured (checked during creation)
- One ticket per user per event (UNIQUE constraint)
- Invoice expiry: 10 minutes (standard Lightning)
- Qualifying distance validated against workout_submissions in Supabase
- Random winner seed is deterministic and verifiable
