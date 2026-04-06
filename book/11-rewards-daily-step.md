# Chapter 11: Daily & Step Rewards

## Daily Workout Rewards

### Eligibility
To earn the daily 50 sats reward:

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

## Step Milestone Rewards

### How It Works

```
Steps:    0 → 999 → 1000 → 1999 → 2000 → ...
Reward:       ❌      ✓       ❌      ✓
```

Every time step count crosses a 1,000 threshold, user earns 5 sats.

### Milestone Detection

```typescript
// Check if new milestone reached
function getNewMilestones(previousSteps: number, currentSteps: number): number[] {
  const previousMilestone = Math.floor(previousSteps / 1000);
  const currentMilestone = Math.floor(currentSteps / 1000);

  const newMilestones = [];
  for (let m = previousMilestone + 1; m <= currentMilestone; m++) {
    newMilestones.push(m * 1000);
  }
  return newMilestones;
}

// Example: previousSteps=1500, currentSteps=3200
// Returns: [2000, 3000]
```

### Daily Reset

Step milestones reset at midnight:
- New date = new milestone tracking
- Previous day's milestones don't carry over
- Storage key includes date: `@runstr:step_milestones:2026-01-09`

---

## Step Submission to Supabase

### Automatic Step Submission

When the app returns to foreground, step workouts are automatically submitted to Supabase:

```typescript
// In App.tsx - on app foreground
StepCompetitionService.checkAndSubmitSteps();
```

The submission uses a deterministic event ID (`steps_YYYY-MM-DD_npub12chars`) ensuring one submission per day per user.

### External Reward Processing

**Important:** Step reward payments are handled by an external service, not the app:

1. Step workout submitted to Supabase
2. External service monitors Supabase for new step workouts
3. External service validates and pays 5 sats per 1,000 steps
4. User receives Lightning payment to their configured address

The in-app `StepRewardService` is deprecated—all step reward processing happens externally.

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

### StepCompetitionService

**File:** `src/services/competition/StepCompetitionService.ts`

```typescript
// Called on app foreground
async function checkAndSubmitSteps(): Promise<void> {
  // 1. Check if already submitted today
  const alreadySubmitted = await hasSubmittedToday();
  if (alreadySubmitted) return;

  // 2. Get current step count
  const steps = await DailyStepCounterService.getStepCount();
  if (steps < 1000) return;

  // 3. Create deterministic event ID
  const eventId = `steps_${dateStr}_${npub.slice(0, 12)}`;

  // 4. Submit to Supabase
  await SupabaseCompetitionService.submitStepWorkout({
    eventId,
    steps,
    pubkey: userPubkey,
  });
}
```

**Note:** The in-app StepRewardService is deprecated. Step rewards are processed externally by monitoring Supabase.

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
        ↓
checkStreakAndReward(pubkey, source)
        ↓
Is source 'gps_tracker' or 'manual_entry'?
        ↓
    NO → Exit silently
    YES ↓
Already rewarded today?
        ↓
    YES → Exit silently
    NO ↓
Set atomic marker (timestamp)
        ↓
Submit workout to Supabase
        ↓
External service monitors Supabase
        ↓
External service sends 50 sats via LNURL
        ↓
RewardPollingService detects payment
        ↓
Update total/weekly counters
        ↓
Show toast notification
```

### Step Reward Flow

```
App returns to foreground
        ↓
StepCompetitionService.checkAndSubmitSteps()
        ↓
Get current step count from device
        ↓
Already submitted today? → Exit
        ↓
Steps >= 1000?
        ↓
    NO → Exit
    YES ↓
Submit to Supabase (deterministic event ID)
        ↓
External service monitors Supabase
        ↓
External service pays 5 sats per 1k steps
        ↓
User receives Lightning payment
```

---

## What Daily/Step Rewards Should Be

### Ideal Architecture
1. **Simple eligibility** - GPS or manual entry only
2. **Atomic markers** - Prevent duplicate rewards
3. **Silent failure** - Never block user actions
4. **Clear milestones** - 1k, 2k, 3k... steps
5. **Daily reset** - Fresh milestones each day

### What to Avoid
- Complex eligibility rules
- Reward gaming through imports
- Race conditions on rapid saves
- Verbose error handling

---

## Navigation

**Previous:** [Chapter 10: Rewards Overview](./10-rewards-overview.md)

**Next:** [Chapter 12: Lightning Address Delivery](./12-rewards-lightning-address.md)

**Table of Contents:** [Back to TOC](./00-table-of-contents.md)
