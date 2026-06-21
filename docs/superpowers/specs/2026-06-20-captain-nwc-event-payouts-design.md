# Captain "Pay Winners" from their NWC Wallet — Design Spec

**Date:** 2026-06-20
**Status:** Approved for planning
**Scope:** Phase 1 only — captains paying event winners from their own connected NWC wallet.

---

## Goal

A captain who has connected their own node via NWC can finalize an **ended** event and press one button to pay the winners. The pool is a fixed preset, the split is the fixed 50/30/20 top-3 (or equal-split for all-participants), and payments are sent **from the captain's wallet, on the captain's device, to each winner's existing reward destination**.

Explicitly **out of scope** for this phase: custom prize amounts, automatic/server-side payouts, captain-per-member earning ("flywheel"), and the club-wallet (CoinOS) path.

---

## Why this is small

The hard, high-risk machinery already exists and is reused untouched:

- On-device NWC payment — `NWCWalletService.payLightningAddress()`
- Winner address resolution — `get_competition_finishers` RPC (migration `167_finishers_with_lightning.sql`)
- Prize split math — `EventFinalizationService.calculateSplits()` (50/30/20 top3; equal split for all-participants)
- Payout execution + results persistence — `EventFinalizationService.executePayout()` → `competitions.config.payout_results`
- Event creation with pool + distribution — `SimpleEventCreationModal`

What's missing is a one-line edge-function passthrough and a captain-facing finalization UI for the **ranked** case (today's UI is lottery-only).

---

## Verified current state (reachability)

All confirmed live, not dead duplicates:

- **`src/screens/events/DynamicEventDetailScreen.tsx`** — the real event detail screen. Registered in the live navigator (`App.tsx:576`), reached from CompeteScreen, ClubPageScreen, SocialScreen, ClubEventsSection, and push notifications.
- **`src/components/creation/SimpleEventCreationModal.tsx`** — the live event-creation UI. (`RunstrEventCreationModal` is dead — zero consumers.)
- **`RunstrAutoPayoutService`** is orphaned — NOT the live payout path. The live path is `EventFinalizationService`.
- Captain ownership gate: `isEventCreator` state + `status === 'ended'`.

### The two concrete blockers

**Blocker 1 (fatal — address dropped).** The `finalize-ticketed-event` edge function's `handleGetFinishers` maps RPC rows to `{ npub, totalDistanceKm, workoutCount, name }` and **discards `lightning_address`**, which migration 167's RPC already returns. Result: `calculateSplits` sets every `address: ''`, and `executePayout` rejects every recipient with "No rewards address." 100% of payouts fail.

**Blocker 2 (no UI for the ranked case).** The finalization section (`DynamicEventDetailScreen.tsx:869–908`) is built entirely around random-lottery, single-winner:
- Renders only when `config.winner_selection === 'random'`.
- Button reads "Draw Random Winner"; result shows a single "Winner: {name}".
- The payout runs silently inside `handleFinalize` after the draw — no preview, no per-place breakdown, no "pay from your wallet" framing.

For the ranked 1st/2nd/3rd prize-pool case, there is **no user-facing UI at all** today — though the underlying `calculateSplits`/`executePayout` logic already handles it.

---

## How winners and their reward destinations are resolved

- **Roster:** `competition_participants` (npub + cached `name`/`picture`), surfaced as the leaderboard on the event detail screen.
- **Reward destination:** resolved server-side by `get_competition_finishers` (migration 167), which reads the `lightning` tag off **each finisher's most recent app-submitted workout** in `workout_submissions.raw_event`, honoring charity routing (`reward_destination = 'charity'` → charity address).
- **Consequence:** the address is the same one the finisher already chose for daily rewards (lud16 default or pasted address, captured at workout-submission time) — the same address the zapper already pays. No new lookup, no asking members for anything.
- **Unpayable edge cases:** a finisher with no recent app-submitted workout tag resolves to an empty address. These are **flagged in the pre-pay preview and skipped**, never silently dropped.

---

## NWC security guarantee (verified in code)

- **Storage:** the NWC connection string is written only to `expo-secure-store` (OS keychain/keystore), key `nwc_string` (`NWCStorageService.ts:89`). It is never written to Supabase, never to any RUNSTR table, and not to AsyncStorage (only a failure *counter* lives there).
- **Transport (our path):** `EventFinalizationService.executePayout` → `NWCWalletService.payLightningAddress()` reads the string from SecureStore and connects **directly from the phone to the user's own wallet relay** (NWC over Nostr via NDK). The wallet authorizes the payment. RUNSTR's servers are never in the loop and never see the string.
- **Known caveat (we avoid it):** the legacy `claim-reward` / `process-donations` edge functions parse an NWC URL server-side (`parseNWCUrl`) for old charity/donation flows via the deprecated `NWCGatewayService`. Those transmit an NWC string to the server at call time. **This feature deliberately does not use that path** — it uses the client-side `NWCWalletService`, keeping the captain's NWC entirely on-device. Recommendation: do not extend the server path.

---

## Design — the changes

### Change 1: Edge-function passthrough (fixes Blocker 1)

In `supabase/functions/finalize-ticketed-event/index.ts`, `handleGetFinishers`, include the address the RPC already returns:

```ts
const finishers = (submissions || []).map((s) => ({
  npub: s.npub,
  totalDistanceKm: s.total_distance_meters / 1000,
  workoutCount: s.workout_count,
  name: participants.find((p) => p.npub === s.npub)?.name || null,
  lightningAddress: s.lightning_address || null,   // <-- add
}))
```

`EventFinalizationService.Finisher` already has an optional `lightningAddress` field, and `calculateSplits` already reads it — no further wiring needed.

**Dependency:** migration `167_finishers_with_lightning.sql` must be deployed to production. Verify before relying on this; deploy if absent. (See Verification.)

### Change 2: Generalize the finalization UI (fixes Blocker 2)

Rework the finalization section in `DynamicEventDetailScreen.tsx` so it serves **both** ranked and random events:

- **Render condition:** `isEventCreator && status === 'ended' && prizePool > 0` (instead of `winner_selection === 'random'`).
- **Button label:** "Pay Winners" (generic), or keep "Draw Random Winner" only when `winner_selection === 'random'`.
- **Pre-pay preview** (before any money moves): list each recipient with name, amount, and resolved-address status. Recipients with no resolvable address are shown as "Can't pay — no reward destination" and excluded from the total. Show the total that will be sent.
- **Confirm step:** an explicit confirm dialog — "Pay {total} to {N} winners from your wallet?" — before calling `executePayout`.
- **Results:** reuse/extend the existing "Payout Results" list (name + amount, or "Failed").

The handler (`handleFinalize`) already computes splits and persists results; it gains the preview/confirm gate and the idempotency check below.

### Change 3: Safety rails

- **NWC-connected check:** if no NWC is connected, do not attempt payment; prompt the captain to connect (route to RewardsScreen). Use `NWCWalletService` connection state.
- **Balance check (optional but recommended):** call `getBalance()`; if pool > balance, warn before proceeding.
- **Idempotency:** before paying, read existing `config.payout_results`; skip any recipient already `success: true`. Re-running finalize only retries failures — never double-pays.

---

## Data flow (after changes)

`handleFinalize` → `EventFinalizationService.finalizeEvent` (RPC now returns address) → `calculateSplits` (reads `finisher.lightningAddress`) → **preview + confirm** → `executePayout` (NWC pays each, skipping already-successful) → persist `payout_results` to `competitions.config` → results UI.

---

## Verification

1. `npm run typecheck`.
2. `scripts/verify/` script (`npx tsx`): call `EventFinalizationService.calculateSplits` with sample finishers (mixed: some with addresses, some without) and assert (a) 50/30/20 amounts are correct and sum to the pool, (b) addressless finishers are flagged/excluded, not assigned a payment.
3. Confirm migration 167 is live in production — query `get_competition_finishers` and assert the result includes a `lightning_address` column.
4. Manual (simulator, full erase + reinstall): create a ranked top-3 event with a prize pool, end it, confirm the "Pay Winners" section renders for the captain, the preview shows recipients + amounts, and a test payout from a connected NWC wallet succeeds and persists results.

---

## Risks / open items

- **Migration 167 deployment status** — the single biggest unknown. Must be verified before this works end-to-end.
- **Real participants resolving to addresses** — confirm a real event's finishers actually carry a `lightning` tag on recent app-submitted workouts.
- **iOS / NWC relay reliability** — `NWCWalletService` already has extended timeouts for slow relays (e.g. Coinos); payouts are sequential, so a large winner list pays slowly but safely.
- **Locally-pasted-only addresses** — a winner who pasted an address in Settings but has no lud16 and no recent app-submitted workout tag will be unpayable; acceptable for v1, surfaced in the preview.

---

## Files touched (anticipated)

- `supabase/functions/finalize-ticketed-event/index.ts` — add `lightningAddress` passthrough.
- `src/screens/events/DynamicEventDetailScreen.tsx` — generalize finalization UI, preview/confirm, rails.
- `src/services/events/EventFinalizationService.ts` — likely unchanged; possibly a small helper for idempotency filtering.
- `scripts/verify/` — new verification script.
