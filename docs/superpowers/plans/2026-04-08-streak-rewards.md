# Streak Rewards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the lottery wheel with a streak display and add streak-based bonus to workout rewards.

**Architecture:** Client-side StreakSection component reads existing ProfileDataService data + one lightweight Supabase query for week dots. Server-side streak bonus added to the existing `trigger_auto_reward()` Postgres function via a new migration.

**Tech Stack:** React Native, Supabase (Postgres function), TypeScript

**Spec:** `docs/superpowers/specs/2026-04-08-streak-rewards-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| CREATE | `src/components/streak/StreakSection.tsx` | Streak display card (week dots, count, bonus label) |
| CREATE | `supabase/migrations/173_streak_reward_bonus.sql` | Add streak bonus logic to trigger_auto_reward() |
| EDIT | `src/screens/RewardsScreen.tsx` | Swap LotteryWheelSection for StreakSection |
| DELETE | `src/components/lottery/LotteryWheel.tsx` | Lottery wheel SVG component |
| DELETE | `src/components/lottery/LotteryWheelSection.tsx` | Lottery section container |
| DELETE | `src/components/lottery/SpinButton.tsx` | Spin button |
| DELETE | `src/components/lottery/LotteryResult.tsx` | Result display |
| DELETE | `src/components/lottery/XPExplainer.tsx` | XP explainer |
| DELETE | `src/services/lottery/LotteryService.ts` | Lottery Supabase service |
| DELETE | `src/types/lottery.ts` | Lottery types |
| DELETE | `scripts/verify/verify-lottery-wheel.ts` | Lottery verification script |

---

### Task 1: Create StreakSection component

**Files:**
- Create: `src/components/streak/StreakSection.tsx`

- [ ] **Step 1: Create the StreakSection component**

```tsx
// src/components/streak/StreakSection.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import { ProfileDataService } from '../../services/backend/ProfileDataService';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';

/** Get Monday-Sunday date range for the current week */
function getCurrentWeekDates(): { start: string; end: string; dates: string[] } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }

  return {
    start: dates[0],
    end: dates[6],
    dates,
  };
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function getStreakBonus(streak: number): number {
  if (streak >= 5) return 40;
  if (streak >= 4) return 30;
  if (streak >= 3) return 20;
  if (streak >= 2) return 10;
  return 0;
}

export const StreakSection: React.FC = () => {
  const [npub, setNpub] = useState('');
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [workoutDays, setWorkoutDays] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const stored = await AsyncStorage.getItem('@runstr:npub');
      if (stored) setNpub(stored);
    };
    init();
  }, []);

  useEffect(() => {
    if (npub) loadData();
  }, [npub]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Fetch streak stats from existing service
      const stats = await ProfileDataService.getUserStats(npub);
      setCurrentStreak(stats.currentStreakDays);
      setLongestStreak(stats.longestStreakDays);

      // Fetch this week's workout days for the dots
      if (isSupabaseConfigured()) {
        const week = getCurrentWeekDates();
        const { data } = await supabase!
          .from('workout_submissions')
          .select('leaderboard_date')
          .eq('npub', npub)
          .gte('leaderboard_date', week.start)
          .lte('leaderboard_date', week.end);

        if (data) {
          const days = new Set(
            data.map((r: { leaderboard_date: string }) => r.leaderboard_date)
          );
          setWorkoutDays(days);
        }
      }
    } catch (err) {
      console.error('[StreakSection] Failed to load:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!npub || isLoading) return null;

  const week = getCurrentWeekDates();
  const today = new Date().toISOString().split('T')[0];
  const bonus = getStreakBonus(currentStreak);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>STREAK</Text>

      {/* Streak count */}
      <View style={styles.streakRow}>
        <Text style={styles.streakNumber}>{currentStreak}</Text>
        <Text style={styles.streakLabel}>day streak</Text>
      </View>

      {/* Bonus badge */}
      {bonus > 0 && (
        <Text style={styles.bonusText}>+{bonus}% streak bonus</Text>
      )}

      {/* Week dots */}
      <View style={styles.weekRow}>
        {week.dates.map((date, i) => {
          const filled = workoutDays.has(date);
          const isToday = date === today;
          return (
            <View key={date} style={styles.dayColumn}>
              <View
                style={[
                  styles.dot,
                  filled && styles.dotFilled,
                  isToday && styles.dotToday,
                ]}
              />
              <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                {DAY_LABELS[i]}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Longest streak */}
      {longestStreak > 0 && (
        <Text style={styles.bestText}>Best: {longestStreak} days</Text>
      )}
    </View>
  );
};

const DOT_SIZE = 12;

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 4,
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
  },
  streakLabel: {
    fontSize: 15,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
  },
  bonusText: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.orangeBright,
    marginBottom: 12,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  dayColumn: {
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: theme.colors.border,
  },
  dotFilled: {
    backgroundColor: theme.colors.accent,
  },
  dotToday: {
    borderWidth: 1.5,
    borderColor: theme.colors.orangeBright,
  },
  dayLabel: {
    fontSize: 11,
    color: theme.colors.textDark,
    fontWeight: theme.typography.weights.medium,
  },
  dayLabelToday: {
    color: theme.colors.textMuted,
  },
  bestText: {
    fontSize: 12,
    color: theme.colors.textDark,
    fontWeight: theme.typography.weights.medium,
  },
});
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No new errors related to StreakSection.

- [ ] **Step 3: Commit**

```bash
git add src/components/streak/StreakSection.tsx
git commit -m "Feature: Add StreakSection component for workout streaks display"
```

---

### Task 2: Swap lottery for streak on RewardsScreen

**Files:**
- Modify: `src/screens/RewardsScreen.tsx:47,354`

- [ ] **Step 1: Replace the lottery import with streak import**

In `src/screens/RewardsScreen.tsx`, replace:
```tsx
import { LotteryWheelSection } from '../components/lottery/LotteryWheelSection';
```
with:
```tsx
import { StreakSection } from '../components/streak/StreakSection';
```

- [ ] **Step 2: Replace the lottery component usage**

In `src/screens/RewardsScreen.tsx`, replace:
```tsx
        {/* Daily Spin */}
        <LotteryWheelSection />
```
with:
```tsx
        {/* Streak */}
        <StreakSection />
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: No errors related to lottery or streak imports.

- [ ] **Step 4: Commit**

```bash
git add src/screens/RewardsScreen.tsx
git commit -m "Feature: Replace lottery wheel with streak display on Rewards screen"
```

---

### Task 3: Delete lottery files

**Files:**
- Delete: `src/components/lottery/LotteryWheel.tsx`
- Delete: `src/components/lottery/LotteryWheelSection.tsx`
- Delete: `src/components/lottery/SpinButton.tsx`
- Delete: `src/components/lottery/LotteryResult.tsx`
- Delete: `src/components/lottery/XPExplainer.tsx`
- Delete: `src/services/lottery/LotteryService.ts`
- Delete: `src/types/lottery.ts`
- Delete: `scripts/verify/verify-lottery-wheel.ts`

- [ ] **Step 1: Check for any remaining lottery imports**

Run: `grep -r "lottery\|LotteryWheel\|LotteryService\|LotterySpin\|LotteryResult\|SpinButton\|XPExplainer\|LAST_SPIN_DATE" src/ --include="*.ts" --include="*.tsx" -l`

Expected: No files should reference lottery components (RewardsScreen was already updated in Task 2). If any files still reference lottery, update them first.

- [ ] **Step 2: Delete lottery files**

```bash
rm src/components/lottery/LotteryWheel.tsx
rm src/components/lottery/LotteryWheelSection.tsx
rm src/components/lottery/SpinButton.tsx
rm src/components/lottery/LotteryResult.tsx
rm src/components/lottery/XPExplainer.tsx
rm src/services/lottery/LotteryService.ts
rm src/types/lottery.ts
rm scripts/verify/verify-lottery-wheel.ts
rmdir src/components/lottery
rmdir src/services/lottery
```

- [ ] **Step 3: Remove the lottery comment in AppNavigator**

In `src/navigation/AppNavigator.tsx:534`, replace:
```tsx
      {/* Level Detail Screen - Level info + lottery wheel */}
```
with:
```tsx
      {/* Level Detail Screen */}
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: No errors referencing deleted lottery files.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Chore: Remove lottery wheel components, service, and types"
```

---

### Task 4: Add streak bonus to trigger_auto_reward()

**Files:**
- Create: `supabase/migrations/173_streak_reward_bonus.sql`

- [ ] **Step 1: Create the migration**

This migration replaces `trigger_auto_reward()` with a version that calculates streak bonus before building the reward body. The full function is rewritten (same pattern as migration 147).

```sql
-- Migration 173: Add streak bonus to auto-reward
--
-- Adds a streak-based bonus to workout rewards. Before calculating the payout,
-- the trigger queries consecutive workout days for the user and applies:
--   2 days: +10%, 3 days: +20%, 4 days: +30%, 5+ days: +40%
--
-- Base reward is 50 sats. With a 5-day streak: 70 sats.
--
-- Date: 2026-04-08

CREATE OR REPLACE FUNCTION trigger_auto_reward()
RETURNS TRIGGER AS $$
DECLARE
  v_lightning_address TEXT;
  v_ppq_bolt11 TEXT;
  v_team_id TEXT;
  v_team_name TEXT;
  v_reward_amount INT := 50;
  v_streak_days INT := 0;
  v_project_url TEXT;
  v_service_key TEXT;
  v_reward_body JSONB;
  tag_arr JSONB;
BEGIN
  -- Only fire on INSERT
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Only trigger for cardio workouts with distance
  IF NEW.activity_type NOT IN ('running', 'walking', 'cycling', 'hiking') THEN
    RETURN NEW;
  END IF;

  IF NEW.distance_meters IS NULL OR NEW.distance_meters <= 0 THEN
    RETURN NEW;
  END IF;

  -- Only trigger for verified workouts
  IF NEW.verified IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- ========================================
  -- Step 1: Determine payment destination
  -- ========================================

  v_ppq_bolt11 := NEW.ppq_bolt11;

  IF v_ppq_bolt11 IS NULL OR v_ppq_bolt11 = '' THEN
    IF NEW.raw_event IS NOT NULL AND NEW.raw_event->'tags' IS NOT NULL THEN
      FOR tag_arr IN SELECT * FROM jsonb_array_elements(NEW.raw_event->'tags')
      LOOP
        IF tag_arr->>0 = 'lightning' AND tag_arr->>1 IS NOT NULL THEN
          v_lightning_address := tag_arr->>1;
        END IF;
        IF tag_arr->>0 = 'team' AND tag_arr->>1 IS NOT NULL THEN
          v_team_id := tag_arr->>1;
        END IF;
      END LOOP;
    END IF;
  ELSE
    IF NEW.raw_event IS NOT NULL AND NEW.raw_event->'tags' IS NOT NULL THEN
      FOR tag_arr IN SELECT * FROM jsonb_array_elements(NEW.raw_event->'tags')
      LOOP
        IF tag_arr->>0 = 'team' AND tag_arr->>1 IS NOT NULL THEN
          v_team_id := tag_arr->>1;
          EXIT;
        END IF;
      END LOOP;
    END IF;
  END IF;

  IF v_team_id IS NOT NULL AND v_team_id <> '' THEN
    SELECT name INTO v_team_name
    FROM user_teams
    WHERE id::text = v_team_id OR name = v_team_id
    LIMIT 1;
  END IF;

  IF (v_ppq_bolt11 IS NULL OR v_ppq_bolt11 = '')
     AND (v_lightning_address IS NULL OR v_lightning_address = '') THEN
    RAISE LOG '[auto_reward] No ppq_bolt11 or lightning address for workout %', NEW.event_id;
    RETURN NEW;
  END IF;

  -- ========================================
  -- Step 2: Calculate streak bonus
  -- Count consecutive days with workouts going backwards from today.
  -- 2 days: +10%, 3: +20%, 4: +30%, 5+: +40%
  -- ========================================

  WITH daily_workouts AS (
    SELECT DISTINCT leaderboard_date::date AS workout_date
    FROM workout_submissions
    WHERE npub = NEW.npub
      AND leaderboard_date IS NOT NULL
      AND leaderboard_date::date <= CURRENT_DATE
    ORDER BY workout_date DESC
    LIMIT 30
  ),
  numbered AS (
    SELECT workout_date,
           ROW_NUMBER() OVER (ORDER BY workout_date DESC) AS rn
    FROM daily_workouts
  )
  SELECT COUNT(*) INTO v_streak_days
  FROM numbered
  WHERE workout_date = CURRENT_DATE - (rn - 1)::int;

  IF v_streak_days >= 5 THEN
    v_reward_amount := v_reward_amount + (v_reward_amount * 40 / 100);
  ELSIF v_streak_days >= 4 THEN
    v_reward_amount := v_reward_amount + (v_reward_amount * 30 / 100);
  ELSIF v_streak_days >= 3 THEN
    v_reward_amount := v_reward_amount + (v_reward_amount * 20 / 100);
  ELSIF v_streak_days >= 2 THEN
    v_reward_amount := v_reward_amount + (v_reward_amount * 10 / 100);
  END IF;

  RAISE LOG '[auto_reward] Streak for %: % days, reward: % sats', NEW.npub, v_streak_days, v_reward_amount;

  -- ========================================
  -- Step 3: Call claim-reward edge function via pg_net
  -- ========================================

  SELECT decrypted_secret INTO v_project_url
  FROM vault.decrypted_secrets
  WHERE name = 'project_url';

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

  IF v_project_url IS NULL OR v_service_key IS NULL THEN
    RAISE WARNING '[auto_reward] Missing vault secrets, cannot trigger reward';
    RETURN NEW;
  END IF;

  IF v_ppq_bolt11 IS NOT NULL AND v_ppq_bolt11 <> '' THEN
    v_reward_body := jsonb_build_object(
      'operation', 'claim_reward',
      'ppq_bolt11', v_ppq_bolt11,
      'reward_type', 'workout',
      'amount_sats', v_reward_amount,
      'npub', NEW.npub,
      'team_name', v_team_name
    );
    RAISE LOG '[auto_reward] PPQ.AI reward (% sats, streak=%) for workout % (invoice: %..., team: %)',
      v_reward_amount, v_streak_days, NEW.event_id, left(v_ppq_bolt11, 20), COALESCE(v_team_name, 'none');
  ELSE
    v_reward_body := jsonb_build_object(
      'operation', 'claim_reward',
      'lightning_address', v_lightning_address,
      'reward_type', 'workout',
      'amount_sats', v_reward_amount,
      'npub', NEW.npub,
      'team_name', v_team_name
    );
    RAISE LOG '[auto_reward] Lightning reward (% sats, streak=%) for workout % (address: %..., team: %)',
      v_reward_amount, v_streak_days, NEW.event_id, left(v_lightning_address, 8), COALESCE(v_team_name, 'none');
  END IF;

  PERFORM net.http_post(
    url := v_project_url || '/functions/v1/claim-reward',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := v_reward_body,
    timeout_milliseconds := 30000
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION trigger_auto_reward() IS
  'Auto-triggers reward via claim-reward edge function when a verified cardio workout is inserted. '
  'Calculates streak bonus: 2 days +10%, 3 days +20%, 4 days +30%, 5+ days +40%. '
  'Base reward: 50 sats. Max with streak: 70 sats. '
  'PPQ.AI users: reads ppq_bolt11 from row and pays invoice directly. '
  'Regular users: extracts Lightning address from raw_event tags. '
  'Extracts team tag from raw_event and looks up team name from user_teams table. '
  'Includes npub and team_name in request body so claim-reward can send enriched push notifications. '
  'Rate limiting handled by claim-reward edge function.';
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/173_streak_reward_bonus.sql
git commit -m "Feature: Add streak bonus to workout auto-reward (10-40% for 2-5 day streaks)"
```

---

### Task 5: Update rewards config and verify

**Files:**
- Modify: `src/config/rewards.ts`

- [ ] **Step 1: Update rewards config to document streak bonus**

In `src/config/rewards.ts`, replace:
```ts
  /**
   * Daily Workout Reward Amount
   * Amount in satoshis sent for first workout of the day
   */
  DAILY_WORKOUT_REWARD: 100,
```
with:
```ts
  /**
   * Daily Workout Reward Amount
   * Base amount in satoshis sent for first workout of the day.
   * Streak bonus applied server-side: 2d +10%, 3d +20%, 4d +30%, 5d+ +40%.
   */
  DAILY_WORKOUT_REWARD: 50,
```

- [ ] **Step 2: Remove boosted reward constants if present**

In `src/config/rewards.ts`, delete these lines (subscriptions removed):
```ts
  /**
   * Boosted Rewards (Supporter/Pro subscribers)
   * Subscribers earn 1000 sats per qualifying workout instead of 100
   * Up to 5 boosted workouts per week, then base rate applies
   * Qualifications: running, walking, cycling, pushups, journal, 5k+ steps
   */
  BOOSTED_WORKOUT_REWARD: 1000,           // sats per boosted workout
  BOOSTED_MAX_PER_WEEK: 5,               // max boosted workouts per week
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: No errors. If any file references `BOOSTED_WORKOUT_REWARD` or `BOOSTED_MAX_PER_WEEK`, remove those references.

- [ ] **Step 4: Write verification script**

Create `scripts/verify/verify-streak-section.ts`:

```ts
/**
 * Verify streak section wiring:
 * 1. StreakSection component exists and exports correctly
 * 2. RewardsScreen imports StreakSection (not LotteryWheelSection)
 * 3. No remaining lottery imports in src/
 * 4. Migration file exists
 */
import * as fs from 'fs';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}`);
    failed++;
  }
}

// 1. StreakSection exists
check('StreakSection component exists',
  fs.existsSync('src/components/streak/StreakSection.tsx'));

// 2. RewardsScreen imports StreakSection
const rewards = fs.readFileSync('src/screens/RewardsScreen.tsx', 'utf-8');
check('RewardsScreen imports StreakSection',
  rewards.includes("from '../components/streak/StreakSection'"));
check('RewardsScreen does NOT import LotteryWheelSection',
  !rewards.includes('LotteryWheelSection'));

// 3. No lottery files remain
check('lottery/ directory removed',
  !fs.existsSync('src/components/lottery'));
check('LotteryService removed',
  !fs.existsSync('src/services/lottery/LotteryService.ts'));
check('lottery types removed',
  !fs.existsSync('src/types/lottery.ts'));

// 4. Migration exists
check('Streak bonus migration exists',
  fs.existsSync('supabase/migrations/173_streak_reward_bonus.sql'));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
```

- [ ] **Step 5: Run verification**

Run: `npx tsx scripts/verify/verify-streak-section.ts`
Expected: All checks pass.

- [ ] **Step 6: Commit**

```bash
git add src/config/rewards.ts scripts/verify/verify-streak-section.ts
git commit -m "Chore: Update reward config for streak bonus, add verification script"
```
