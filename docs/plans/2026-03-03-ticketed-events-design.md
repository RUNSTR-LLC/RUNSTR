# Ticketed Events with Lightning Entry Fees

**Date:** 2026-03-03
**Status:** Approved
**First use case:** 21K Race on March 11 — 210 sat ticket, 21,000 sat prize to one random finisher

## Overview

Add Lightning invoice-based ticket payments to the RUNSTR event system. Any Pro user with NWC can create ticketed events with configurable ticket prices, qualifying criteria, and prize pools. Winners can be selected by rank or random draw from qualifying finishers.

## Security Principle

**No NWC strings stored server-side.** NWC strings are wallet keys — storing them in Supabase would let anyone with DB access drain organizer wallets. Instead:

- **Ticket collection:** LNURL-pay via organizer's Lightning address (public, no secrets)
- **Ticket payment:** User pays in-app via their own NWC (preimage returned automatically)
- **Payment verification:** Cryptographic — SHA256(preimage) === payment_hash
- **Prize payout:** Organizer-initiated from their device using their local NWC

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
  amount_sats INTEGER NOT NULL,
  preimage TEXT,                      -- Stored after verification as proof
  status TEXT DEFAULT 'pending',      -- pending | paid | expired
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
  ├─ 2. App requests invoice via LNURL-pay:
  │     → Fetch organizer's Lightning address from event/Nostr profile
  │     → GET https://{domain}/.well-known/lnurlp/{user}
  │     → POST callback URL with amount=210000 (millisats)
  │     → Returns { pr: "lnbc...", routes: [] }
  │     → Extract payment_hash from invoice
  │     → Insert event_tickets row (status: 'pending', payment_hash)
  │
  ├─ 3. App pays invoice via user's NWC:
  │     → NWCWalletService.sendPayment(invoice)
  │     → Returns { success: true, preimage: "abc123..." }
  │
  ├─ 4. App verifies and registers:
  │     → Submit preimage to Edge Function: verify-ticket-payment
  │     → Edge Function: SHA256(preimage) === stored payment_hash?
  │     → YES: event_tickets.status → 'paid', store preimage
  │     → Insert competition_participants row
  │     → Return { registered: true }
  │
  └─ 5. App shows "You're in!" → navigates to event detail
```

**Key points:**
- Invoice created via LNURL-pay (organizer's Lightning address, public, no secrets)
- Payment made via user's local NWC (never leaves their device)
- Verification is cryptographic: SHA256(preimage) === payment_hash
- No NWC strings stored in Supabase — zero secrets server-side
- Users must have NWC configured to join ticketed events

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

- Ticket revenue (210 sats x N entrants) goes directly to organizer via LNURL-pay
- Prize pool (21,000 sats) is funded by the organizer from their wallet
- Organizer sends prize from their device using their local NWC
- No escrow, no custodial intermediary

## New Services

### `TicketService` (`src/services/events/TicketService.ts`)

- `requestInvoice(lightningAddress, amountSats)` — LNURL-pay invoice request
- `purchaseTicket(eventId, npub)` — full flow: get invoice → pay via NWC → verify
- `verifyTicket(eventId, preimage)` — submit preimage to Edge Function
- `hasValidTicket(eventId, npub)` — boolean gate check

### `EventFinalizationService` (`src/services/events/EventFinalizationService.ts`)

- `finalizeEvent(eventId)` — query finishers, select winner, store result
- `getFinishers(eventId, qualifyingDistance)` — query workout submissions
- `selectRandomWinner(eventId, finishers)` — deterministic random using SHA256 seed
- `payWinner(winnerNpub, amountSats)` — organizer-initiated NWC payment

### New Edge Functions

- `verify-ticket-payment` — verify preimage against payment_hash, register participant
- `finalize-ticketed-event` — query finishers, compute winner, store result

## New Components

### `TicketPaymentModal` (`src/components/compete/TicketPaymentModal.tsx`)

- Shows ticket price and event name
- "Pay {X} sats to enter" button
- Payment progress indicator (paying → verifying → registered)
- Error handling with retry
- NWC required gate (prompt to set up if not configured)

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

- **LNURL-pay for invoice creation** — Uses organizer's public Lightning address, no secrets
- **User's NWC for payment** — Pays from user's device, preimage returned automatically
- **Cryptographic verification** — SHA256(preimage) === payment_hash, trustless
- **Supabase for state** — event_tickets tracks payment lifecycle (no secrets stored)
- **Nostr for event publishing** — Extends existing NIP-52 tags
- **Organizer-initiated payout** — Prize sent from organizer's device, no server-side wallet access

## Constraints

- Event creator MUST have a Lightning address (for LNURL-pay ticket collection)
- Ticket purchaser MUST have NWC configured (for in-app payment)
- One ticket per user per event (UNIQUE constraint)
- Invoice expiry: 10 minutes (standard Lightning)
- Qualifying distance validated against workout_submissions in Supabase
- Random winner seed is deterministic and verifiable by anyone
- Prize payout requires organizer to open app and confirm
