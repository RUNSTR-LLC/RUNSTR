# Prize Pool & Advanced Event Options Design Spec

**Date:** 2026-04-05
**Status:** Approved
**Related Issue:** RUNSTR-LLC/RUNSTR#258

## Overview

Captains can attach a prize pool and/or charity to any event type via a collapsible "Advanced" section in the event creation modal. Prize pools are funded by the captain's NWC wallet and paid out automatically when the competition is finalized.

## Event Creation Modal Changes

### Remove Charity Event Template

The standalone "Charity Event" template is removed. The modal returns to 4 templates: 5K Race, 10K Race, Half Marathon, Step Challenge. Charity support moves into the Advanced section, making it available on any event type.

### Collapsible Advanced Section

A new "Advanced" section appears between the Recurring picker and the Submit button. Collapsed by default — tapping expands it. Contains:

1. **Charity Picker** — horizontal scrolling list of charities (existing implementation, relocated)
2. **Prize Pool** — preset pill buttons: 100 / 500 / 1,000 / 5,000 sats. Only visible when captain has NWC connected.
3. **Distribution** — toggle: "Top 3" or "All Participants". Only visible when a prize pool amount is selected.

Any combination is valid: charity only, prize pool only, both, or neither.

### Simple Flow Preserved

A captain creating a basic 5K only needs 4 taps: template, duration, recurring, create. Advanced options are hidden until explicitly expanded.

## Config Storage

Stored in the existing `config` JSONB column on `competitions`. New fields added to `CompetitionConfig`:

```typescript
prize_pool_sats?: number;           // 100, 500, 1000, or 5000
prize_distribution?: 'top3' | 'all_participants';
payout_results?: Array<{            // Written after finalization
  npub: string;
  name?: string;
  amount_sats: number;
  address: string;
  success: boolean;
  error?: string;
}>;
```

Charity fields (`charity_id`, `charity_name`, `charity_lightning_address`, `captain_donation_sats`) remain unchanged from the charity events spec.

No migration needed.

## Lightning Address Resolution

### Update `get_competition_finishers` RPC

The existing RPC (`supabase/migrations/154_competition_finishers_rpc.sql`) is updated to also return each participant's resolved `zap_to_address`. The extraction uses the same logic as the `daily_rewards` view:

- Extract `reward_destination` tag from `raw_event`
- If `reward_destination = 'charity'`, use the charity Lightning address from the `['charity', id, name, address]` tag
- Otherwise, use the user's Lightning address from the `['lightning', address]` tag

For each participant, use their most recent workout submission during the event window to resolve the address.

### Return Type Change

The RPC adds a `lightning_address TEXT` column to its return type.

### All Participants Mode

For "All Participants" distribution, the qualifying distance threshold is set to 0 so all participants with at least one workout submission are included.

## Payout Flow

When a competition with a prize pool ends:

1. **Captain taps "Finalize"** on the ended competition's detail screen
2. **Query participants** with resolved `zap_to_address`:
   - "Top 3": ranked by the competition's scoring method, top 3 finishers
   - "All Participants": everyone with at least one qualifying workout
3. **Calculate splits:**
   - Top 3: 1st = 50%, 2nd = 30%, 3rd = 20%
   - If only 2 participants: 60% / 40%
   - If only 1 participant: 100%
   - All Participants: `prize_pool_sats / count` each, remainder to 1st place
4. **Pay sequentially** via `NWCWalletService.payLightningAddress()` for each recipient
5. **Show summary** — Alert listing each recipient, amount, and success/failure
6. **Store results** — write `payout_results` array to competition config so the detail screen can display them

### Error Handling

- If a payment fails, it's recorded in `payout_results` with `success: false` and the error message
- Remaining payments continue — one failure doesn't block others
- Summary alert shows which payments succeeded and which failed
- No automatic retry — captain can see failures in the results

## Event Detail Screen Changes

For competitions with a prize pool:

- Show "Prize Pool: X sats" in the event info section
- Show distribution method ("Top 3" or "All Participants")
- After finalization: show payout results (who received what)

## Key Files to Modify

| File | Change |
|------|--------|
| `src/utils/supabase.ts` | Add prize pool fields to `CompetitionConfig` |
| `src/components/creation/SimpleEventCreationModal.tsx` | Remove charity template, add collapsible Advanced section with charity picker + prize pool + distribution |
| `src/screens/events/DynamicEventDetailScreen.tsx` | Show prize pool info, trigger finalization with payouts |
| `src/services/events/EventFinalizationService.ts` | Extend for multi-winner payouts via `payLightningAddress` |
| `supabase/migrations/154_competition_finishers_rpc.sql` | New migration updating RPC to return `lightning_address` |

## Constraints

- Captain must have NWC connected to set a prize pool
- No escrow — captain pays at finalization time (must have sufficient balance)
- Payout is captain-initiated, not automatic on event end
- Sequential payments (not parallel) to avoid NWC rate limiting
- Prize pool preset amounts only (no custom input)
