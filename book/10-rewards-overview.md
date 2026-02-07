# Chapter 10: Rewards Overview

## Summary

RUNSTR pays you real Bitcoin for staying active—not points, not tokens, but actual satoshis delivered to your Lightning wallet. Complete a workout and earn 50 sats. Hit step milestones throughout your day and earn 5 sats for every 1,000 steps. These micropayments accumulate over time, creating a tangible financial incentive that compounds alongside your fitness gains.

The Rewards pillar encompasses everything related to earning and distributing Bitcoin through RUNSTR: daily workout rewards, step milestone rewards, Lightning address delivery, and teams and charities. Teams and charities are part of the rewards ecosystem—when you select a team, you're choosing a charity to support through your fitness activities, with reward routing directing payments accordingly.

The daily workout reward system is straightforward: save one qualifying workout per day and receive 50 sats. Workouts tracked via GPS in the app or manually entered all qualify. The app uses atomic markers to prevent duplicate rewards—only your first qualifying workout of the day triggers payment, even if you save multiple workouts in rapid succession.

Step rewards work on a milestone system that resets at midnight. Every time your step count crosses a 1,000-step threshold (1k, 2k, 3k, and so on), you earn 5 sats. The app polls your device's step count every 60 seconds while active, automatically detecting and rewarding new milestones. There's no cap on step rewards—the more you move, the more you earn.

To receive rewards, you simply enter your Lightning address in the app settings. RUNSTR supports any Lightning address from wallets like Strike, Alby, Zeus, or Wallet of Satoshi. When you earn a reward, the app's NWC wallet requests an invoice from your Lightning address and sends payment, enabling verification that the sats actually arrived.

The rewards system follows a silent failure philosophy: if a payment fails for any reason, your workout still saves and your experience remains uninterrupted. Rewards are designed as a bonus that enhances your fitness journey, never as a blocker that frustrates it.

---

## Fitness = Bitcoin

RUNSTR's core philosophy: **your daily workout earns real Bitcoin**.

Complete your daily workout and earn 50 sats. Hit step milestones throughout the day for bonus rewards. The app sends satoshis directly to your Lightning address—real Bitcoin, not points or tokens.

This creates a direct incentive loop:
- Work out daily → Earn sats → Stay motivated → Keep moving

---

## Reward Types

### 1. Daily Workout Reward
**50 sats per day** for completing a qualifying workout.

- One reward per 24-hour period
- Requires saving workout to the app
- GPS-tracked, manual entry, or health imports qualify
- Apple Health and Health Connect imports qualify for rewards

### 2. Step Milestone Rewards
**5 sats per 1,000 steps** throughout the day.

- Milestone at 1k, 2k, 3k, 4k... steps
- Resets at midnight
- Step count from device sensors
- Multiple rewards possible per day

### 3. Teams & Charities
Select a team (charity) to support through your fitness activities.

- Teams = Charities — choosing a team means supporting a cause
- Reward routing directs payments to user or charity
- Direct zaps available via the Teams tab
- See [Chapter 13: Teams & Charities](./13-rewards-teams-charities.md) for details

### 4. Encrypted Backup
Back up all your fitness data to Nostr relays using encrypted events.

- Kind 30078 replaceable parameterized events
- NIP-44 self-encryption (only you can decrypt)
- Gzip compression for large payloads
- Backs up workouts, habits, journal, preferences
- Export/Import buttons in Settings
- See [Chapter 14: Encrypted Backup](./14-encrypted-backup.md) for details

---

## Reward Values

| Reward Type | Amount | Frequency | Max/Day |
|-------------|--------|-----------|---------|
| Daily Workout | 50 sats | Once per day | 50 sats |
| Step Milestone | 5 sats | Per 1,000 steps | Unlimited |

### Example Day
| Activity | Reward |
|----------|--------|
| Morning run (5K) | 50 sats |
| 1,000 steps | 5 sats |
| 2,000 steps | 5 sats |
| 3,000 steps | 5 sats |
| 4,000 steps | 5 sats |
| 5,000 steps | 5 sats |
| **Total** | **75 sats** |

---

## Rewards Screen

The Rewards tab shows:

```
┌─────────────────────────────────────┐
│  TOTAL REWARDS         1050 sats   │
│  22 workouts • 0 day streak        │
│  0 steps today  [Compete] [Post]   │
├─────────────────────────────────────┤
│  ❤ YOUR TEAM                   ▼  │
├─────────────────────────────────────┤
│  💳 REWARDS ADDRESS             ▼  │
└─────────────────────────────────────┘
```

### Key Elements
- **Total Rewards** - Lifetime sats earned
- **Workout Count** - Total workouts tracked
- **Day Streak** - Consecutive days with workouts
- **Steps Today** - Current step count
- **Lightning Address** - Set address to receive rewards

---

## Silent Failure Philosophy

Rewards are implemented with **silent failure**:
- If reward payment fails, workout still saves
- User is never blocked by payment errors
- Errors are logged but not shown to user
- Retry logic is minimal to avoid delays

### Why Silent Failure?
- Rewards are a bonus, not the core feature
- Payment failures should never frustrate users
- Better UX than error modals interrupting workouts

---

## Technical Section

### Core Services

| Service | File | Purpose |
|---------|------|---------|
| DailyRewardService | `src/services/rewards/DailyRewardService.ts` | 50 sats/workout |
| StepRewardService | `src/services/rewards/StepRewardService.ts` | 5 sats/1k steps |
| SupabaseRewardService | `src/services/rewards/SupabaseRewardService.ts` | Query verified payments + impact data |
| RewardsTransparencyService | `src/services/rewards/RewardsTransparencyService.ts` | Global reward pool + charity leaderboards |
| RewardNotificationManager | `src/services/rewards/RewardNotificationManager.ts` | Toast notifications |

### External Reward Processing

**Important:** Actual reward payments are processed by an external service that monitors Supabase, not by the app itself. The app:
1. Tracks reward eligibility locally
2. Submits workouts to Supabase
3. Polls for confirmed payments via `RewardPollingService`
4. Displays payment results and totals via `SupabaseRewardService`

### Storage Keys

| Key | Purpose |
|-----|---------|
| `@runstr:last_reward_date` | Prevent duplicate daily rewards |
| `@runstr:total_rewards_earned` | Lifetime counter |
| `@runstr:weekly_rewards_earned` | Weekly counter |
| `@runstr:step_milestones:{date}` | Today's achieved milestones |

---

## What Rewards Should Be

### Ideal Architecture
1. **Simple rules** - 50/day, 5/1k steps, no complexity
2. **Silent failure** - Never block user experience
3. **Lightning address** - Universal wallet support
4. **Clear tracking** - User sees total and streak
5. **Integrated charities** - Teams/charities as part of rewards, not a separate pillar

### What to Avoid
- Complex eligibility rules
- Blocking payment errors
- NWC wallet requirements for users
- Retry loops that delay workouts
- Treating donations as a separate system from rewards

---

## Navigation

**Previous:** [Chapter 9: Event Leaderboards](./09-events-leaderboards.md)

**Next:** [Chapter 11: Daily & Step Rewards](./11-rewards-daily-step.md)

**Table of Contents:** [Back to TOC](./00-table-of-contents.md)
