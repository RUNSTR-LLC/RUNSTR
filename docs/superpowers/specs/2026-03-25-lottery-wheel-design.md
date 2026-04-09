# Lottery Wheel — Design Spec

## Overview

A daily spin wheel accessible from a new Level Detail screen. Users tap the level ring on their profile to navigate to a dedicated screen showing their level info and a lottery wheel. One free spin per day, rewards sent through the existing Supabase reward pipeline. The user's level applies a logarithmic multiplier to the base prize — giving the level system tangible, daily value and a reason to open the app every day.

## Goals

1. **Daily retention** — reason to open the app even on rest days
2. **Level system payoff** — levels have a concrete, visible benefit
3. **App stickiness** — simple daily ritual that compounds engagement

## User Flow

```
Profile Screen
  └─ Tap WorkoutLevelRing
       └─ LevelDetailScreen (NEW)
            ├─ Level info header
            │    ├─ Level number + milestone title
            │    ├─ XP progress bar
            │    └─ Streak display (current + best)
            ├─ Lottery Wheel
            │    ├─ Animated wheel (8 segments)
            │    ├─ SPIN button (active once/day, countdown when used)
            │    ├─ Level multiplier badge
            │    └─ Result display after spin
            └─ XP Explainer (moved from modal)
```

The existing WorkoutLevelRing tap currently opens an XP explainer modal. This changes to navigate to the new LevelDetailScreen. The explainer content moves to the bottom of that screen. Navigation injected via `useNavigation()` from React Navigation.

## Wheel Segments & Probabilities

| Segment | Base Rewards | Probability |
|---------|-------------|-------------|
| 1       | 5           | 30%         |
| 2       | 10          | 25%         |
| 3       | 25          | 20%         |
| 4       | 50          | 13%         |
| 5       | 100         | 8%          |
| 6       | 250         | 3%          |
| 7       | 500         | 0.8%        |
| 8       | 1000        | 0.2%        |

Expected value per spin: ~37 rewards before multiplier.

Same wheel for all users. Level multiplier is the only differentiator.

## Level Multiplier

Formula: `multiplier = 1 + 0.5 * ln(level + 1)`

| Level | Milestone    | Multiplier | Avg Spin Value  |
|-------|-------------|------------|-----------------|
| 1     | Beginner    | 1.35x      | ~50 rewards     |
| 5     | Rookie      | 1.90x      | ~70 rewards     |
| 10    | Athlete     | 2.20x      | ~81 rewards     |
| 20    | Veteran     | 2.52x      | ~93 rewards     |
| 30    | Champion    | 2.72x      | ~101 rewards    |
| 50    | Legend      | 2.97x      | ~110 rewards    |
| 75    | Master      | 3.16x      | ~117 rewards    |
| 100   | Elite       | 3.31x      | ~122 rewards    |
| 150   | Grandmaster | 3.51x      | ~130 rewards    |
| 200   | Mythic      | 3.65x      | ~135 rewards    |

Logarithmic curve front-loads progression. Biggest gains happen in early levels when retention matters most.

## Data Flow

### Client Side

1. User taps SPIN
2. Client checks local `last_spin_date` (UX guard, not security)
3. Client inserts into Supabase `lottery_spins` table: `{ npub, level, multiplier }`
4. Wheel animation starts immediately (continuous spin while waiting)

### Server Side (Supabase)

5. DB trigger or Edge Function fires on `lottery_spins` insert
6. Validates one spin per npub per calendar day (UTC) via unique index
7. Validates submitted level against user's workout history (recalculate from stored workouts)
8. Picks segment using weighted random from `lottery_config` table
9. Applies verified level multiplier, calculates final payout (rounded to nearest integer)
10. Reads user's `reward_destination`
11. Updates spin record with `segment_value`, `final_payout`, `status = 'completed'`
12. Sends reward through existing pipeline: LNURL to destination
13. Records in `reward_payments` with `reward_type = 'lottery'`

### Client Side (continued)

14. Client subscribes to Supabase Realtime on the `lottery_spins` row filtered by spin ID
15. Fallback: polls every 2 seconds, timeout after 10 seconds
16. If result arrives within animation window (~3s): wheel decelerates and lands on correct segment
17. If result takes longer: wheel continues spinning at reduced speed until result arrives, then lands
18. If timeout (10s): wheel stops, show "Taking longer than expected..." with retry option
19. Result text fades in: "25 x 1.4x = 35 rewards"
20. Saves `last_spin_date` locally

## Supabase Schema

### `lottery_spins` table

| Column        | Type        | Notes                                          |
|---------------|-------------|------------------------------------------------|
| id            | uuid        | PK, default `gen_random_uuid()`                |
| npub          | text        | User identifier                                |
| level         | integer     | User's level at time of spin                   |
| multiplier    | numeric     | Server-verified multiplier                     |
| segment_value | integer     | Base rewards landed on (server-filled)         |
| final_payout  | integer     | round(segment_value * multiplier) (server)     |
| status        | text        | pending → completed → paid                     |
| spun_at       | timestamptz | Server-set, default `now()`                    |

**Constraints:**
- Unique index on `(npub, date_trunc('day', spun_at at time zone 'UTC'))` — enforces one spin per day
- RLS policy: users can only insert/read their own spins (matched by npub)

### `lottery_config` table

| Column      | Type    | Notes                     |
|-------------|---------|---------------------------|
| id          | uuid    | PK                        |
| segment     | integer | Segment number (1-8)      |
| base_value  | integer | Reward value              |
| probability | numeric | Weight (0.0 - 1.0)        |
| active      | boolean | Can disable segments      |

Config table allows tuning probabilities and values without app updates.

### `reward_payments` addition

Existing table, new `reward_type` value: `'lottery'`. No schema changes needed.

## UI Design

### Theme (black/orange minimalism)

- Wheel background: `#0a0a0a` with `#1a1a1a` segment dividers
- Segments alternate: `#1a1a1a` and `#111111` — subtle contrast
- Segment values: `#FFB366` (light orange text)
- Pointer: `#FF7B1C` (deep orange), simple triangle at top
- Winning segment: faint `#FF7B1C` glow pulse
- Spin button: standard primary (deep orange bg, black text)
- Multiplier badge: `#0a0a0a` card, `#1a1a1a` border, `#CC7A33` label, `#FFB366` value
- No emojis, no confetti, no particle effects

### Animation Sequence

1. Tap SPIN — button disables, wheel starts rotating
2. Spins continuously while server responds
3. Result arrives — wheel decelerates, lands on segment
4. If server is slow (>3s) — wheel continues at reduced speed until result arrives
5. Winning segment: subtle orange glow pulse (2-3 cycles)
6. Result text fades in below wheel: "25 x 1.4x = 35 rewards"
7. Brief pause, button transitions to countdown state

### Already-Spun State

- Wheel visible at ~60% opacity
- Button: muted orange border, countdown text in `#CC7A33`
- Last result displayed: "Today: 25 x 1.4x = 35 rewards"
- Countdown resets at UTC midnight

## Edge Cases

### Anti-abuse
- Server enforces one spin per npub per calendar day (UTC) via unique index
- Server validates level against workout history — does not trust client-submitted level
- Spin requires valid npub (must have account)
- No spin without reward destination set — prompt to pick one

### Offline
- Spin button disabled if no network — "No connection" in muted text
- If request fails mid-spin, wheel stops without landing — "Spin failed, try again", re-enable button

### Slow server response
- Wheel continues spinning at reduced speed if result takes >3 seconds
- After 10 seconds with no result, wheel stops and shows retry option
- Spin record exists server-side so the result is not lost — retry fetches it

### Countdown
- Resets at UTC midnight
- Timer updates every second when screen active, pauses when backgrounded

## Subscription Interaction

- Available to all tiers (free, supporter, pro)
- No subscription gating — this is a retention feature for everyone
- Subscriber boost does NOT apply to lottery (only workout rewards)

## Implementation Notes

- Wheel built with React Native SVG + Animated API (no external libraries)
- WorkoutLevelRing tap changes from modal to navigation (via `useNavigation()`)
- XP explainer content moves from modal to LevelDetailScreen
- New files: LevelDetailScreen, LotteryWheel component, LotteryService
- Follows existing patterns: singleton service, AsyncStorage caching, Supabase integration
- `final_payout` rounded to nearest integer via `Math.round()` server-side

## Future Considerations (not in v1)

- Streak-based bonus spins
- Subscriber-exclusive wheel segments
- Seasonal themed wheels
