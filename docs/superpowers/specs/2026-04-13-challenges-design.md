# Challenges: P2P 1v1 Fitness Wagers — Design

**Date:** 2026-04-13
**Status:** Draft for review

## Overview

Fitness Club members can challenge each other to 7-day 1v1 contests on a single distance metric. Wagers are optional, capped at 1000 sats, and require both users to have NWC connected. RUNSTR never custodies funds: when the challenge ends, the loser's client triggers the NWC payment directly to the winner's lightning address. Challenges appear inline on the Events page alongside featured and club events.

The guiding principle: **RUNSTR triggers the wager but stays out of the way.** No escrow, no retries, no dispute handling. If a payment fails, users resolve it themselves.

## Scope

### In scope (MVP)
- 1v1 challenges between members of the same Fitness Club
- Three challenge types: **Running distance**, **Walking distance**, **Cycling distance**
- Fixed 7-day duration starting at acceptance
- Optional wager, ≤1000 sats, requires NWC on both sides
- Challenge cards on the Events page with both users' avatars
- Push + in-app notifications for invite, accept/decline, and result
- Loser-pays-on-tap UX (no payment state tracking)

### Out of scope (future work)
- Steps, pushups, pullups, and other non-distance challenges
- Open / first-to-accept challenges (no specific opponent)
- Cross-club or stranger-to-stranger challenges
- Midway nudges ("you're behind")
- Rematches, best-of-N, tournaments
- Payment retries, escrow, dispute resolution
- Payment status tracking beyond what NWC reports inline

## User Flow

1. **Create.** From a Fitness Club, Alice taps a member (Bob) → "Challenge." Picks type (Running / Walking / Cycling distance), optional wager (slider 0–1000 sats). Sends invite.
2. **Notify.** Bob receives a push notification and an in-app badge on the Events tab.
3. **Respond.** Bob opens the Events page → sees a pending invite card (Alice's avatar, type, wager). Taps Accept or Decline.
   - If wager > 0 and Bob has no NWC: modal offers **Connect wallet**, **Accept without wager**, or **Decline**.
   - "Accept without wager" downgrades the challenge to a 0-sat contest and notifies Alice.
4. **Active.** Challenge card shows in Events tab with both avatars side-by-side, live tally for each user, and days remaining.
5. **Finalize.** When viewed after `end_at`, the client computes the winner from workouts and writes it to Supabase (idempotent).
6. **Result.** Both users receive push + in-app notification.
   - **Winner:** card shows "You won." If a wager existed, it shows "Waiting for Bob to pay."
   - **Loser:** card shows "You lost — Pay 500 sats" button. Tap fires NWC `pay_invoice` to the winner's lightning address. NWC reports its own success/failure inline; RUNSTR does not retry or persist payment state.
   - **Tie:** no winner, both wagers void, card shows "Tie."

## Architecture

### Supabase (source of truth)

New table `challenges`:

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| club_id | uuid FK → clubs | Membership checked at creation only |
| challenger_pubkey | text | npub hex |
| challenged_pubkey | text | npub hex |
| type | text | enum: `run_distance`, `walk_distance`, `cycle_distance` |
| wager_sats | int | 0–1000, default 0 |
| status | text | enum: `pending`, `active`, `declined`, `cancelled`, `completed` |
| start_at | timestamptz | null until accepted |
| end_at | timestamptz | start_at + 7 days |
| winner_pubkey | text | null until finalized; null also means tie |
| is_tie | boolean | default false; true on completed tie |
| created_at | timestamptz | default now() |

**Constraint:** unique partial index preventing two simultaneous active challenges between the same pair:
```sql
CREATE UNIQUE INDEX challenges_one_active_per_pair
  ON challenges (LEAST(challenger_pubkey, challenged_pubkey),
                 GREATEST(challenger_pubkey, challenged_pubkey))
  WHERE status = 'active';
```

**No scheduled jobs.** Finalization and invite expiry are computed lazily (see below).

### Client services

**`src/services/challenges/ChallengeService.ts`** (new)
- `createChallenge(opponentPubkey, type, wagerSats)` → insert with status=pending
- `acceptChallenge(id)` → update status=active, start_at=now, end_at=now+7d
- `declineChallenge(id)` → update status=declined
- `cancelChallenge(id)` → challenger only, status=cancelled
- `listChallengesForUser(pubkey)` → returns challenges where user is on either side
- `finalizeIfDue(challenge)` → if `status=active && now > end_at && winner_pubkey IS NULL`, compute winner from workouts and write idempotently

**Winner computation:** Query existing `workouts` table for both users, filter by `activity_type` matching the challenge type and `end_at BETWEEN challenge.start_at AND challenge.end_at`, sum the `distance` column. Higher total wins. Equal totals → `is_tie = true`, `winner_pubkey = null`.

**NWC payment:** Reuses existing wallet service. Loser-tap calls `wallet.payToLightningAddress(winnerLnAddr, wagerSats, memo)`. Result is shown inline from the wallet service's response. RUNSTR does not write a payment record.

### Client components

New under `src/components/compete/challenge/`:
- `ChallengeCreateModal.tsx` — opponent pre-selected from club member tap; type picker (3 chips); wager slider (0–1000)
- `ChallengeInviteCard.tsx` — pending invite with Accept / Decline; handles NWC-missing modal
- `ChallengeEventCard.tsx` — dual-avatar card for the Events list; renders pending / active / completed states
- `ChallengeDetailScreen.tsx` — full scoreboard, daily breakdown, payment button when applicable

Integration points:
- **Club member list** (existing): tap a member → "Challenge" action
- **Events page** (existing): challenge cards mix into the unified events list, sorted by recency / activity
- **Notifications** (existing push infrastructure): three new push templates

### Notifications

Push and in-app fired on:
1. Invite received (challenged user)
2. Invite accepted or declined (challenger)
3. Challenge finalized — won / lost / tie (both users)

Push is best-effort. Supabase state is the source of truth; in-app surfaces always reflect it on next open.

## Data Flow

```
Create:   Client → Supabase insert (status=pending) → Push to challenged
Accept:   Client → Supabase update (status=active, start_at=now, end_at=now+7d) → Push to challenger
Decline:  Client → Supabase update (status=declined) → Push to challenger
View:     Client reads challenges; if any are active and past end_at with no winner,
          calls finalizeIfDue() which queries workouts and writes winner_pubkey
          (UPDATE ... WHERE winner_pubkey IS NULL — idempotent across racing clients)
          → Push to both users on first successful finalize
Pay:      Loser taps "Pay X sats" → wallet.payToLightningAddress() → NWC reports inline
```

## Edge Cases

- **Tie:** `is_tie=true`, `winner_pubkey=null`, both wagers void, no payment UI shown.
- **Opponent has no NWC at accept-time:** modal offers Connect / Accept-without-wager / Decline. Accept-without-wager rewrites `wager_sats=0` and proceeds.
- **NWC payment fails (disconnected, no budget, expired auth):** wallet service surfaces the error in-line. RUNSTR does not persist failure or retry. Button remains tappable for re-attempt.
- **Loser never taps "Pay":** button persists indefinitely on the completed challenge card. Winner sees "Waiting for Bob to pay." No reminders, no escalation.
- **Pending invite goes stale:** no auto-expiry. UI shows relative time ("Pending · 3d ago"). Challenger can cancel manually via the invite card.
- **Challenger leaves the club mid-challenge:** challenge continues to completion. Membership is checked at creation only.
- **Challenged user is not in any shared club at accept-time:** still allowed (membership not re-checked).
- **One active per pair:** enforced by DB unique partial index. UI disables the Challenge action against an opponent with whom an active challenge already exists.
- **Concurrent challenges total:** unlimited per user.
- **Workout scope:** any workout whose `end_at` falls inside `[challenge.start_at, challenge.end_at]` and whose activity type matches.
- **Race on finalize:** multiple clients may call `finalizeIfDue` simultaneously. The `WHERE winner_pubkey IS NULL` clause makes the write idempotent; only the first succeeds. Push notification is fired by whichever client wrote.

## Terminology

Per CLAUDE.md, all user-facing copy uses "rewards," "wager," "sats," and "wallet." No "Lightning," "Nostr," "Bitcoin," or "NWC" appears in UI copy. NWC is referenced only in code and developer docs.

Note: "sats" is used in user-facing wager UI because there is no neutral substitute for the unit of value at the moment of payment. If the broader app moves to a different unit, this surface follows.

## Open Questions

None blocking implementation. The following are intentional choices, not gaps:
- Why no payment retry? Matches "RUNSTR doesn't get in the way."
- Why no invite expiry cron? Manual cancellation is sufficient; saves an infrastructure piece.
- Why no steps in MVP? Steps live in a different data path; ship distance first, add steps as a focused follow-up.
