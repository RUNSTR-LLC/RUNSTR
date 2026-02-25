# Subscription Model Redesign

**Date:** 2026-02-24
**Status:** Approved

## Problem

The subscription modal uses adversarial framing ("RUNSTR bets you won't"), blatant break-even language, and outdated economics (8x boost at 800 sats, 10k/mo Supporter). Boost qualifications (cardio-only, 2km+, 15min+) exclude most activities. Need a cleaner value prop with sustainable economics.

## New Economics

| | Free | Supporter (15k/mo) | Pro (21k/mo) |
|---|---|---|---|
| Per workout | 100 sats | 1,000 sats (10x) | 1,000 sats (10x) |
| Max boosted/week | n/a | 5 | 5 |
| After weekly cap | n/a | 100 sats/workout | 100 sats/workout |
| 3x/week monthly | ~3k | ~13k | ~13k |
| 4x/week monthly | ~3.5k | ~17.3k | ~17.3k |
| 5x/week monthly | ~4.3k | ~21.7k | ~21.7k |
| Extras | | Season access | + Create clubs + events |

**Qualifying activities:** Running, walking, cycling, pushups, journal entries, 5k+ steps. One reward per day max.

**Removed qualifications:** 2km distance min, 15min duration min, cardio-only restriction, manual entry exclusion.

## Framing

**Remove entirely:**
- "The fitness bet: work out 3x/week to break even, 5x/week to profit. RUNSTR bets you won't."
- "Break even at 3x/week" feature bullet
- "Boost Requirements" section (cardio, 2km+, 15min+, GPS-only)

**New intro text (general context):**
"Subscribe and earn 10x more rewards per workout. Perfect for anyone who works out 3-4 times a week."

**Supporter features:**
- 1,000 rewards per workout (10x boost)
- Up to 5 boosted workouts per week
- Season access

**Pro features:**
- 1,000 rewards per workout (10x boost)
- Up to 5 boosted workouts per week
- Season access
- Create clubs
- Create events

## Config Changes

```
BOOSTED_WORKOUT_REWARD: 1000          (was 800)
BOOSTED_MAX_PER_WEEK: 5              (new)
SUPPORTER_PRICE_SATS: 15000          (was 10000)
PRO_PRICE_SATS: 21000               (was 15000)
```

**Remove:**
- `BOOSTED_MIN_DISTANCE_METERS` (was 2000)
- `BOOSTED_MIN_DURATION` (was 900)

## Files to Change

1. `src/config/rewards.ts` — update constants, add BOOSTED_MAX_PER_WEEK, remove distance/duration minimums
2. `src/components/subscription/SubscriptionInfoModal.tsx` — new framing, remove bet section, remove boost requirements, update features, update prices
3. `src/screens/RewardsScreen.tsx` — update "8x" text to "10x" in subscription card
