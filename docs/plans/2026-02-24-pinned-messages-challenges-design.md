# Pinned Messages & 1v1 Challenges

**Date:** 2026-02-24
**Goal:** Add captain-pinned messages to club chat and a 1v1 challenge system initiated from chat.

## Feature 1: Pinned Messages

**How it works:** Captain long-presses a message -> "Pin" option. The message renders as a persistent card at the top of the chat (both embedded and full-screen). Only one pinned message per club at a time. Pinning a new message replaces the old one.

**Data:** Add `pinned_message_id` (UUID, nullable) to the `clubs` table. When captain pins, update this field via edge function. The chat UI queries the pinned message and renders it above the message list.

**UI:** A compact card with accent left border, the message content (truncated), and an "x" for captain to unpin. Tapping the card scrolls to the original message in the list.

## Feature 2: 1v1 Challenges

**Initiation:** Long-press a message in club chat -> "Challenge" appears in the action sheet. Tapping opens a challenge wizard modal.

**Wizard (3 steps):**
1. **Type** — Fastest Time (5K or 10K), Daily Streak, Most Distance, Most Steps
2. **Duration** — 24 hours, 3 days, 1 week
3. **Confirm** — Summary showing type, opponent name, timeframe. "Send Challenge" button.

**Storage:** Reuses the `competitions` table with `template: 'challenge'`. Challenge-specific fields in the `config` JSONB: `challenger_npub`, `challenged_npub`, `challenge_status` (pending/accepted/declined/active/completed). Only 2 participants max.

**Chat integration:** Sending a challenge creates a `message_type: 'challenge'` message in club chat with the competition ID in metadata. ChatMessageBubble renders it as a special card: challenge type, duration, challenger name, and Accept/Decline buttons (visible only to challenged user). Once accepted, card shows "Challenge Active" status. When complete, card shows the winner.

**Lifecycle:**
1. Challenger sends -> competition created with `is_open: false`, challenge_status: `pending`
2. Challenged taps Accept -> challenge_status: `active`, start_date set to now, both users auto-joined
3. Challenged taps Decline -> challenge_status: `declined`, card updates
4. Duration expires -> winner determined from leaderboard data, challenge_status: `completed`

**Scoring (maps to existing scoring_method):**
- Fastest Time -> `fastest_time` (lowest time for target distance wins)
- Daily Streak -> `workout_count` (most qualifying workouts wins)
- Most Distance -> `total_distance`
- Most Steps -> `total_steps`

**Challenge types and defaults:**

| Type | Scoring | Wizard asks | Duration options |
|------|---------|-------------|-----------------|
| Fastest 5K | fastest_time | — | 24h / 3d / 1w |
| Fastest 10K | fastest_time | — | 24h / 3d / 1w |
| Daily Streak | workout_count | — | 3d / 1w |
| Most Distance | total_distance | — | 24h / 3d / 1w |
| Most Steps | total_steps | — | 24h / 3d / 1w |

**Future (not in v1):** Reward wagering via `active_challenge_id` tag on user record. Edge function checks tag before routing rewards. Pool table holds escrowed rewards. Winner gets pool on completion.
