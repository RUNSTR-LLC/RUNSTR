# Chapter 11: Daily Rewards & Lottery Wheel

## Daily Workout Rewards

### Eligibility
To earn the daily 100 sats reward:

| Requirement | Details |
|-------------|---------|
| Qualifying workout | Cardio activity (running, walking, cycling, hiking) |
| Distance > 0 | Must have measurable distance |
| Once per day | Max 1 reward per 24 hours |
| Anti-cheat validation | Pace limits, distance limits |

### Qualifying Sources
- In-app GPS tracker
- Background sync from Apple Health / Health Connect
- Manual entry

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
- Only the first qualifying workout earns the reward
- No duplicate payments

---

## Lottery Wheel

The lottery wheel is a core reward mechanic. After every qualifying workout, users spin a wheel for bonus rewards on top of the base 100 sats.

### Wheel Segments

The wheel has 8 segments with weighted probabilities:

| Segment | Base Value | Probability |
|---------|-----------|-------------|
| 5 | 5 sats | Highest |
| 10 | 10 sats | High |
| 25 | 25 sats | Medium-high |
| 50 | 50 sats | Medium |
| 100 | 100 sats | Medium-low |
| 250 | 250 sats | Low |
| 500 | 500 sats | Very low |
| 1000 | 1000 sats | Lowest |

Lower values appear more frequently. The distribution is weighted so that small wins are common and large wins are rare, creating a variable-ratio reinforcement schedule — the same psychological mechanic that makes slot machines engaging, applied to fitness consistency.

### How the Spin Works

1. User completes a qualifying workout
2. Base 100 sats reward is claimed
3. Lottery wheel appears with animated spin
4. Wheel lands on a segment
5. Segment value is multiplied by the user's level multiplier
6. Bonus reward is sent to the user's chosen destination

The wheel spin is visual and immediate — users see the wheel animate and land on their result. This creates a moment of anticipation after every workout.

---

## RUNSTR Levels

Your RUNSTR level is a direct reflection of your workout history. The more you work out, the higher your level, and the better your lottery wheel payouts.

### How Levels Work

- **Level is based on total workouts** — every qualifying workout contributes
- **Higher level = higher multiplier** — the wheel's base values are multiplied by your level multiplier
- **Consistent effort compounds** — a user at level 10 spinning a 100 segment earns significantly more than a level 1 user landing on the same segment

### Level Multiplier

The level multiplier applies to lottery wheel winnings. A level 1 user landing on 50 earns 50 sats bonus. A higher-level user landing on 50 earns 50 * their multiplier.

This creates a behavioral reinforcement loop:
1. Work out consistently
2. Level up
3. Wheel spins become more valuable
4. Motivation to maintain consistency increases

### Why Levels Matter

Levels reward long-term consistency over single big efforts. A user who works out every day for a month will have a meaningfully higher multiplier than someone who does one workout. The system is designed so that the most consistent users get the best lottery outcomes over time.

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

  // 4. Send reward
  await sendReward(userPubkey);
}
```

### Counter Storage

```typescript
// Increment counters after successful reward
async function updateCounters(userPubkey: string, amount: number) {
  // Total lifetime
  const totalKey = `@runstr:total_rewards_earned:${userPubkey}`;
  const total = (await getNumber(totalKey)) + amount;
  await setNumber(totalKey, total);

  // Weekly (resets Monday)
  const weekKey = getWeekKey(); // e.g., "2026-W02"
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
User saves workout
        |
checkStreakAndReward(pubkey, source)
        |
Is source 'gps_tracker' or 'manual_entry'?
        |
    NO --> Exit silently
    YES |
Already rewarded today?
        |
    YES --> Exit silently
    NO |
Set atomic marker (timestamp)
        |
Submit workout to Supabase
        |
External service monitors Supabase
        |
External service sends 100 sats via LNURL
        |
RewardPollingService detects payment
        |
Update total/weekly counters
        |
Show toast notification
```

### Lottery Wheel Flow

```
Daily reward confirmed
        |
Lottery wheel appears (animated)
        |
Wheel spins and lands on segment (5-1000)
        |
Base value * user's level multiplier = bonus amount
        |
Bonus reward sent to chosen destination
        |
Update total/weekly counters
        |
Show bonus toast notification
```

---

## What Daily Rewards Should Be

### Ideal Architecture
1. **Simple eligibility** - GPS or manual entry only
2. **Atomic markers** - Prevent duplicate rewards
3. **Silent failure** - Never block user actions
4. **Lottery as engagement** - Wheel creates anticipation after every workout
5. **Levels reward consistency** - Long-term users earn more from the wheel

### What to Avoid
- Complex eligibility rules
- Reward gaming through imports
- Race conditions on rapid saves
- Verbose error handling
- Flat reward structures with no progression

---

## Navigation

**Previous:** [Chapter 10: Rewards Overview](./10-rewards-overview.md)

**Next:** [Chapter 12: Lightning Address Delivery](./12-rewards-lightning-address.md)

**Table of Contents:** [Back to TOC](./00-table-of-contents.md)
