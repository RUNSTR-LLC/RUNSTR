# Chapter 10: Rewards Overview

## Summary

RUNSTR rewards you for working out. Every qualifying cardio workout earns a daily reward, sent via LNURL to a lightning address. Placing in an event — whether the always-on daily leaderboard or a captain-created club event — earns extra on top.

The address you receive rewards at is whatever lightning address is on file. If your Nostr profile already has a lud16 attached, RUNSTR uses that by default — most users never have to fill in a field. If your profile doesn't have one, you paste an address into Settings. That's it. There's no destination picker, no charity routing, no splits, no sponsor attribution.

The reward system follows a silent failure philosophy: if a payment fails for any reason, your workout still saves and your experience remains uninterrupted. Rewards are a bonus that enhances your fitness journey, never a blocker that frustrates it.

---

## How Rewards Work

### The Flow

```
User works out (in-app GPS or external app via health sync)
  |
  +--> Workout submitted to Supabase (workout_submissions table)
  |      +-- Anti-cheat validation (pace limits, distance limits)
  |
  +--> External runstr-zapper service picks up the workout
  |      +-- Reads user's lightning address (from Nostr lud16 or settings)
  |      +-- Sends reward via LNURL to that address
  |      +-- Records in reward_payments table with preimage proof
  |
  +--> Push notification when reward lands
  |
  +--> RewardPollingService shows in-app toast notification
```

### Eligibility Rules

1. Activity must be cardio: running, walking, cycling, or hiking
2. Distance > 0
3. Passes anti-cheat validation
4. One reward per day per user (deduplicated)

### Reward Routing

There is no routing. Rewards go to the user's lightning address. Priority order:

1. **Nostr profile lud16** — If set, this is the default. Most users never touch a field.
2. **Settings-stored address** — If the user pastes one in, this overrides the profile lud16.
3. **No address** — User cannot receive rewards until they set one.

See [Chapter 12: Lightning Address Delivery](./12-rewards-lightning-address.md) for the LNURL protocol details.

---

## Reward Mechanics

| Mechanic | How |
|----------|-----|
| **Daily reward** | Every qualifying cardio workout earns one daily reward |
| **Event reward** | Placing in an event (daily leaderboard or club event) earns extra |
| **Captain reward** | Captains earn a slice when their members work out |

There is no lottery wheel. There are no multipliers. There is no sponsor attribution. The reward is the reward.

---

## Levels Are Streaks

Your RUNSTR level is your streak — a single legible progress number that reflects fitness consistency. The more consistently you work out, the higher your level. Levels don't affect reward amounts; they're just a clean way to surface "you've been showing up."

See [Chapter 11: Daily Rewards & Levels](./11-rewards-daily-step.md) for the streak/level details.

---

## Rewards Screen

The Rewards screen (accessible from Profile tab) shows:

```
+-------------------------------------+
|  EARNINGS                           |
|  Total rewards earned               |
+-------------------------------------+
|  LIGHTNING ADDRESS                  |
|  user@getalby.com         [Edit]    |
|  (defaults to your Nostr lud16)     |
+-------------------------------------+
|  HOW IT WORKS                       |
|  Every cardio workout earns a       |
|  daily reward. Place in an event    |
|  to earn extra.                     |
+-------------------------------------+
```

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
| DailyRewardService | `src/services/rewards/DailyRewardService.ts` | Per-workout reward eligibility tracking |
| SupabaseRewardService | `src/services/rewards/SupabaseRewardService.ts` | Query verified payments + earnings data |
| RewardPollingService | `src/services/rewards/RewardPollingService.ts` | Poll for new payments, show in-app toasts |
| RewardLightningAddressService | `src/services/rewards/RewardLightningAddressService.ts` | Manage stored lightning address |
| RewardNotificationManager | `src/services/rewards/RewardNotificationManager.ts` | Toast notifications for earned rewards |

### External Reward Processing

**Important:** Actual reward payments are processed by an external service (`runstr-zapper`, a separate repo), not by the app itself. The app:

1. Tracks reward eligibility locally (DailyRewardService)
2. Submits workouts to Supabase (SupabaseCompetitionService)
3. The runstr-zapper service polls Supabase for new workouts
4. Reads the user's lightning address (lud16 from Nostr profile, or stored address)
5. Sends reward via LNURL to that address
6. Records the payment in the `reward_payments` table
7. The app polls for confirmed payments (RewardPollingService)
8. Displays earnings totals (SupabaseRewardService)

### Storage Keys

| Key | Purpose |
|-----|---------|
| `@runstr:last_reward_date` | Prevent duplicate daily rewards |
| `@runstr:total_rewards_earned` | Lifetime counter |
| `@runstr:weekly_rewards_earned` | Weekly counter |
| `@runstr:reward_lightning_address` | User's pasted-in lightning address (overrides lud16) |

---

## What Rewards Should Be

### Ideal Architecture
1. **Lightning address routing** — Defaults to Nostr lud16, no destination picker
2. **One reward per qualifying workout** — Simple and predictable
3. **Silent failure** — Never block user experience
4. **Background-capable** — Earn rewards without opening the app
5. **No attribution** — No sponsor banners, no charity routing, no multi-recipient splits

### What to Avoid
- Destination pickers, charity routing, sponsorship attribution
- Reward splits or percentages
- Lottery wheels or multiplier systems
- Blocking payment errors
- Retry loops that delay workouts
- Using "sats", "Bitcoin", or "Lightning" in user-facing contexts

---

## Navigation

**Previous:** [Chapter 9: Event Leaderboards](./09-events-leaderboards.md)

**Next:** [Chapter 11: Daily Rewards & Levels](./11-rewards-daily-step.md)

**Table of Contents:** [Back to TOC](./00-table-of-contents.md)
