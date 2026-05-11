# Chapter 11: Daily Rewards & Levels

## Daily Workout Rewards

### Eligibility

To earn the daily reward:

| Requirement | Details |
|-------------|---------|
| Qualifying workout | Cardio activity (running, walking, cycling, hiking) |
| Distance > 0 | Must have measurable distance |
| Once per day | Max 1 daily reward per 24 hours |
| Anti-cheat validation | Pace limits, distance limits |

### Qualifying Sources

- In-app GPS tracker
- Background sync from Apple Health / Health Connect

### Non-Qualifying Sources

- Previously imported historical workouts (only new workouts from today qualify)

**Why?** Background-synced workouts qualify because passive earning is a core feature — users earn without opening the app. Historical imports are excluded to prevent gaming.

### Atomic Streak Tracking

Streak tracking uses an **atomic marker** to prevent race conditions:

```typescript
// Set marker BEFORE sending reward
const markerKey = `@runstr:streak_incremented_today:${dateStr}`;
await AsyncStorage.setItem(markerKey, Date.now().toString());

// Only first workout of day gets past this check
```

This ensures:
- Rapid back-to-back saves don't trigger multiple rewards
- Only the first qualifying workout of the day earns the daily reward
- No duplicate payments

---

## Levels Are Streaks

The RUNSTR level is the user's streak surfaced as a single legible number.

### How Levels Work

- **Level = consecutive days with a qualifying workout**
- One workout per day increments the streak
- Missing a day breaks the streak and resets the level
- The level number is shown on the Profile tab and in the workout summary

### Why a Single Number?

Many fitness apps surface XP, badges, points, achievements, and skill trees. RUNSTR surfaces one number. Behavioral reinforcement comes from the act of working out and getting a reward — the level is just the public-facing trace of consistency.

### Level Does Not Affect Reward Amount

The level is a streak indicator, not a multiplier. Every qualifying workout earns the same daily reward regardless of level. Extra rewards come from placing in events, not from level multipliers.

---

## Event Rewards

In addition to the daily reward, users earn extra rewards for placing in events:

| Event | Extra Reward |
|-------|--------------|
| Daily leaderboard | Top finishers in each board (5K, 10K, Half, Marathon, Steps) |
| Club event | Captain-defined prize structure |

Event rewards stack with the daily reward — a user who works out and places on the daily leaderboard gets both.

---

## Technical Section

### DailyRewardService

**File:** `src/services/rewards/DailyRewardService.ts`

```typescript
// Main entry point - called after workout saved
async function checkStreakAndReward(
  userPubkey: string,
  workoutSource: string
): Promise<void> {
  // 1. Check if source qualifies
  if (!['gps_tracker', 'manual_entry'].includes(workoutSource)) {
    return; // Silent exit
  }

  // 2. Check if already rewarded today
  const alreadyRewarded = await hasRewardedToday(userPubkey);
  if (alreadyRewarded) {
    return; // Silent exit
  }

  // 3. Set atomic marker
  await setRewardMarker(userPubkey);

  // 4. Workout is auto-submitted to Supabase
  // (External runstr-zapper service picks it up and pays out)
}
```

### Counter Storage

```typescript
// Increment counters after confirmed payment (via RewardPollingService)
async function updateCounters(userPubkey: string, amount: number) {
  // Total lifetime
  const totalKey = `@runstr:total_rewards_earned:${userPubkey}`;
  const total = (await getNumber(totalKey)) + amount;
  await setNumber(totalKey, total);

  // Weekly (resets Monday)
  const weekKey = getWeekKey();
  const weeklyKey = `@runstr:weekly_rewards_earned:${userPubkey}:${weekKey}`;
  const weekly = (await getNumber(weeklyKey)) + amount;
  await setNumber(weeklyKey, weekly);
}
```

### Streak Calculation

```typescript
// Calculate consecutive days with workouts
async function getStreakDays(userPubkey: string): Promise<number> {
  const workouts = await LocalWorkoutStorageService.getAllWorkouts();
  const userWorkouts = workouts.filter(w => w.pubkey === userPubkey);

  let streak = 0;
  let checkDate = new Date();

  while (true) {
    const dateStr = formatDate(checkDate);
    const hasWorkout = userWorkouts.some(w =>
      formatDate(new Date(w.startTime)) === dateStr
    );

    if (!hasWorkout) break;

    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}
```

---

## Flow Diagrams

### Daily Reward Flow

```
User saves cardio workout
        |
        v
checkStreakAndReward(pubkey, source)
        |
Is source 'gps_tracker' or 'manual_entry'?
        |
    NO --> Exit silently
    YES |
        v
Already rewarded today?
        |
    YES --> Exit silently
    NO |
        v
Set atomic marker (timestamp)
        |
        v
Workout auto-submitted to Supabase
        |
        v
External runstr-zapper detects new workout
        |
        v
Sends reward via LNURL to user's lightning address
        |
        v
RewardPollingService detects payment
        |
        v
Update total/weekly counters, increment streak
        |
        v
Show toast notification
```

---

## What Daily Rewards & Levels Should Be

### Ideal Architecture
1. **Simple eligibility** — Cardio workouts only, GPS or health-synced
2. **Atomic markers** — Prevent duplicate rewards
3. **Silent failure** — Never block user actions
4. **Level = streak** — One number, no multipliers, no badges
5. **Stack with event rewards** — Daily reward + event placement = both

### What to Avoid
- Lottery wheels, multipliers, slot-machine mechanics
- XP systems, badges, achievements, skill trees
- Complex eligibility rules
- Reward gaming through imports
- Race conditions on rapid saves
- Verbose error handling

---

## Navigation

**Previous:** [Chapter 10: Rewards Overview](./10-rewards-overview.md)

**Next:** [Chapter 12: Lightning Address Delivery](./12-rewards-lightning-address.md)

**Table of Contents:** [Back to TOC](./00-table-of-contents.md)
