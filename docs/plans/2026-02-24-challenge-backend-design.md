# 1v1 Challenge Backend Design

**Date:** 2026-02-24
**Goal:** Make the challenge UI functional by wiring it to the existing competition infrastructure.

## Architecture

Challenges are 2-person competitions. They reuse the `competitions` table with `template: 'challenge'` and challenge-specific fields in the `config` JSONB. All 5 scoring methods, anti-cheat validation, workout matching, and leaderboard scoring work as-is. No new tables.

## Data Model

**Competition record** (existing `competitions` table):
- `template: 'challenge'`
- `is_open: false` (no random joins)
- `scoring_method`: maps from challenge type (see table below)
- `start_date`: set when accepted (far future while pending)
- `end_date`: start_date + duration_days

**Challenge fields in `config` JSONB:**
```json
{
  "challenger_npub": "npub1...",
  "challenged_npub": "npub1...",
  "challenge_status": "pending",
  "challenge_type": "fastest_5k",
  "winner_npub": null
}
```

**Chat message** stores only `competition_id` in metadata. The card queries the competition record on render for live status. Single source of truth.

## Scoring Map

| Challenge Type | scoring_method | activity_type | config.target_distance_km |
|---|---|---|---|
| Fastest 5K | fastest_time | running | 5 |
| Fastest 10K | fastest_time | running | 10 |
| Daily Streak | workout_count | running | — |
| Most Distance | total_distance | running | — |
| Most Steps | total_steps | walking | — |

## Lifecycle

1. **Send challenge** — Edge function creates competition (template: 'challenge', is_open: false, challenge_status: 'pending', start_date: far future). Auto-joins challenger as participant. Returns competition_id. Chat message sent with competition_id in metadata.

2. **Accept** — Edge function sets challenge_status: 'active', start_date: now, end_date: now + duration_days. Joins challenged user as participant.

3. **Decline** — Edge function sets challenge_status: 'declined'.

4. **Active period** — Both users work out normally. Existing submit-workout pipeline matches workouts to the competition automatically via participant npubs + date range.

5. **Completion (on-demand)** — When anyone views the card after end_date, the client queries the leaderboard for the 2 participants, determines winner, calls edge function to set challenge_status: 'completed' and winner_npub.

## Chat Card Rendering

The challenge chat message stores `competition_id`. On render:
1. Fetch competition record (cached, 30s TTL)
2. Render based on `config.challenge_status`:
   - **pending**: Accept/Decline buttons (challenged user only)
   - **active**: "Challenge Active" + time remaining + mini leaderboard
   - **completed**: Winner display
   - **declined**: "Declined" text

## Decisions

- **Winner determination**: On-demand (no cron). When card renders after end_date, query leaderboard and update.
- **Card sync**: Query competition directly. Chat message metadata is immutable after send.
- **Concurrency**: Unlimited active challenges per user. Workouts count toward all active competitions simultaneously.
- **Colors**: `theme.colors.accent` for challenge borders (not gold #FFD700).

## Edge Function Changes

**`manage-competition`** — Add 3 new actions:
- `create-challenge`: Creates competition with template 'challenge', auto-joins challenger
- `accept-challenge`: Sets status to active, sets dates, joins challenged user
- `decline-challenge`: Sets status to declined

**`manage-club-chat`** — Already supports `message_type: 'challenge'`. No changes needed.

## What We Fix From Current UI

1. Gold border → theme.colors.accent
2. ChallengeMessageMetadata simplified — only needs `competition_id` (status comes from competition query)
3. Accept/Decline buttons wired to edge function calls
4. Challenge card queries competition for live status instead of using stale chat metadata
