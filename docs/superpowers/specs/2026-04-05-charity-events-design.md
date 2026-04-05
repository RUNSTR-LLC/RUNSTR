# Charity Events Design Spec

**Date:** 2026-04-05
**Status:** Approved

## Overview

Fitness Club captains can create charity events that rally their members around a cause. When members join, their reward destination switches to the selected charity. Captains can optionally contribute from their NWC wallet. The event detail screen shows the combined total raised.

## Event Creation (Captain Side)

- New "Charity Event" template added to `SimpleEventCreationModal` alongside existing templates (5K Race, 10K Race, Half Marathon, Step Challenge)
- Captain selects a charity from the existing 13 in `charities.ts`
- Captain optionally sets an NWC donation amount (requires NWC wallet connected)
- Captain picks event duration (1d, 3d, 7d, 30d) — same as other templates

### On Submit

1. If NWC amount set: send payment via `NWCWalletService.sendPayment()` to the charity's Lightning address. If payment fails, event creation fails.
2. If no NWC amount: skip payment, create event normally.
3. Event created in Supabase `competitions` table with charity metadata columns.
4. `captain_donation_sats` set to the NWC amount (or 0).

## Joining a Charity Event (Member Side)

1. User taps "Join" on the event detail screen
2. App calls `RewardDestinationService` to set reward destination to the event's charity — identical to manually picking a charity from the destination picker
3. User added as participant in Supabase (existing join logic)
4. One join per user per event

### What Does NOT Happen

- No automatic revert of reward destination after the event or after a reward is sent
- No multi-join (user cannot rejoin the same event)
- No pledge tracking or workout-count requirements

## Event Detail Screen

No new screen. The existing `DynamicEventDetailScreen` is extended:

- If event has charity metadata: show charity name, charity image from registry, total raised, and participant list
- If no charity metadata: existing behavior unchanged (leaderboard, etc.)

### Total Raised Display

- Single combined number: captain donation + member reward contributions
- Queried from `charity_reward_payments` table filtered by `charity_id` + event date range
- Updated as rewards are processed by the external service

## Data Changes

### Migration: Add charity columns to `competitions` table

```sql
ALTER TABLE competitions ADD COLUMN charity_id TEXT;
ALTER TABLE competitions ADD COLUMN charity_name TEXT;
ALTER TABLE competitions ADD COLUMN charity_lightning_address TEXT;
ALTER TABLE competitions ADD COLUMN captain_donation_sats INTEGER DEFAULT 0;
```

### No Other Backend Changes

- No new tables
- No edge function changes
- No zapper changes
- Total raised calculated via query against existing `charity_reward_payments` table

## Key Files to Modify

| File | Change |
|------|--------|
| `src/components/creation/SimpleEventCreationModal.tsx` | Add Charity Event template, charity picker, optional NWC amount input |
| `src/screens/events/DynamicEventDetailScreen.tsx` | Show charity info + total raised when charity metadata present |
| `src/services/rewards/RewardDestinationService.ts` | Called on join to switch destination (existing method) |
| `src/services/wallet/NWCWalletService.ts` | Used for captain donation (existing method) |
| `src/constants/charities.ts` | Referenced for charity picker (existing data) |
| `supabase/migrations/` | New migration for charity columns on competitions table |

## Constraints

- Captain must have NWC wallet connected to set a donation amount (optional)
- Charity list is the existing 13 charities — no custom Lightning addresses
- Total raised uses date-range matching against charity payments (not a direct competition_id link)
- One join per user per event
