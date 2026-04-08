# Streak Rewards Design

**Date:** 2026-04-08
**Replaces:** Lottery wheel (daily spin)

## Overview

Replace the lottery wheel on the Rewards screen with a streak display showing consecutive workout days. Add a streak-based bonus to the existing auto-reward system so users earn more for consistency.

## Part 1: Streak Display (Client)

### What it shows

A card on the Rewards screen (same spot as the lottery wheel) with:

1. **Current streak count** -- large number + "day streak" label
2. **Week dots** -- row of 7 circles for the current week (Mon-Sun). Filled orange = workout that day, hollow/dark gray = no workout. Today's dot has a subtle border to indicate "today".
3. **Current bonus** -- e.g., "+20% streak bonus" (or nothing if streak is 1 or 0)
4. **Longest streak** -- subtle text below: "Best: 14 days"

### Data source

- `ProfileDataService.getUserStats(npub)` already returns `currentStreakDays` and `longestStreakDays`
- For the week dots: query `workout_submissions` for distinct `leaderboard_date` values in the current Mon-Sun window for this npub. Lightweight query (max 7 results).

### Component

- **`src/components/streak/StreakSection.tsx`** -- single self-contained component, ~150 lines. Fetches data, renders the card. No sub-components needed.

### What gets removed

- `src/components/lottery/LotteryWheel.tsx`
- `src/components/lottery/LotteryWheelSection.tsx`
- `src/components/lottery/SpinButton.tsx`
- `src/components/lottery/LotteryResult.tsx`
- `src/components/lottery/XPExplainer.tsx`
- `src/services/lottery/LotteryService.ts`
- `src/types/lottery.ts`
- `scripts/verify/verify-lottery-wheel.ts`
- All lottery imports in `RewardsScreen.tsx` and `AppNavigator.tsx`

The `lottery_spins` Supabase table is left as-is (no migration to drop it).

## Part 2: Streak Reward Bonus (Server)

### How it works

The existing `trigger_auto_reward()` Postgres function fires on every workout insert. Before calculating `v_reward_amount`, it queries consecutive workout days for the user and applies a bonus.

### Bonus table

| Consecutive Days | Bonus |
|-----------------|-------|
| 0-1 | +0% |
| 2 | +10% |
| 3 | +20% |
| 4 | +30% |
| 5+ | +40% |

Base reward is 50. So: 50 / 55 / 60 / 65 / 70 depending on streak.

### Implementation

Add to `trigger_auto_reward()`:

1. New variable: `v_streak_days INT := 0;`
2. New query block after determining payment destination and before building the request body:

```sql
-- Calculate streak bonus
-- Count consecutive days with workouts, going backwards from today
WITH daily_workouts AS (
  SELECT DISTINCT leaderboard_date::date AS workout_date
  FROM workout_submissions
  WHERE npub = NEW.npub
    AND leaderboard_date IS NOT NULL
    AND leaderboard_date::date <= CURRENT_DATE
  ORDER BY workout_date DESC
),
streak AS (
  SELECT workout_date,
         CURRENT_DATE - workout_date - ROW_NUMBER() OVER (ORDER BY workout_date DESC)::int AS gap
  FROM daily_workouts
)
SELECT COUNT(*) INTO v_streak_days
FROM streak
WHERE gap = 0 OR gap = -1;
```

3. Apply bonus to `v_reward_amount`:

```sql
IF v_streak_days >= 5 THEN
  v_reward_amount := v_reward_amount + (v_reward_amount * 40 / 100);
ELSIF v_streak_days >= 4 THEN
  v_reward_amount := v_reward_amount + (v_reward_amount * 30 / 100);
ELSIF v_streak_days >= 3 THEN
  v_reward_amount := v_reward_amount + (v_reward_amount * 20 / 100);
ELSIF v_streak_days >= 2 THEN
  v_reward_amount := v_reward_amount + (v_reward_amount * 10 / 100);
END IF;
```

### Migration

One new migration file: `supabase/migrations/173_streak_reward_bonus.sql`

`CREATE OR REPLACE FUNCTION trigger_auto_reward()` with the streak logic added. Same pattern as migration 147.

## What stays unchanged

- `ProfileDataService` and `computeStreaks` -- already works
- `claim-reward` edge function -- untouched, just receives a different amount
- `workout_submissions` table -- no schema changes
- `lottery_spins` table -- left in place, just unused

## File changes summary

| Action | File |
|--------|------|
| CREATE | `src/components/streak/StreakSection.tsx` |
| CREATE | `supabase/migrations/173_streak_reward_bonus.sql` |
| EDIT | `src/screens/RewardsScreen.tsx` (swap LotteryWheelSection for StreakSection) |
| DELETE | `src/components/lottery/*` (5 files) |
| DELETE | `src/services/lottery/LotteryService.ts` |
| DELETE | `src/types/lottery.ts` |
| DELETE | `scripts/verify/verify-lottery-wheel.ts` |
