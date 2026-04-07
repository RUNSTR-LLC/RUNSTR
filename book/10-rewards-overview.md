# Chapter 10: Rewards Overview

## Summary

RUNSTR rewards you for working out. Rewards are funded by sponsors and sent to whatever destination you choose — a charity, an open source project, a service like PPQ.AI for AI credits, or your own wallet. Every qualifying workout earns a reward, automatically, whether you tracked it in the app or it synced from Apple Health or Health Connect in the background.

The reward system is simple: complete a qualifying cardio workout and you're eligible. Rewards are processed externally — your workout gets submitted to Supabase, a database trigger fires the reward claim, and the reward is sent to your chosen destination via LNURL. The app tracks eligibility locally and polls for confirmed payments to display in-app notifications and earnings totals.

A lottery wheel adds an additional reward layer, giving users a spin after qualifying workouts. Your RUNSTR level, which is a direct correlation to your workout history, determines the reward multiplier on the wheel. The more you work out, the higher your level, the better your lottery odds and payouts. This creates a behavioral reinforcement loop: work out consistently, level up, earn more.

Sponsor attribution is visible throughout the app. The Rewards page shows a message like "This month's rewards are brought to you by [Sponsor]" and push notifications include the sponsor's brand — "You received a reward from [Sponsor] for your workout." RUNSTR calls this Zapvertising: businesses sponsor rewards and reach an active fitness audience through branded attribution.

The rewards system follows a silent failure philosophy: if a payment fails for any reason, your workout still saves and your experience remains uninterrupted. Rewards are a bonus that enhances your fitness journey, never a blocker that frustrates it.

---

## How Rewards Work

### The Flow

```
User works out (in-app GPS or external app via health sync)
  |
  +--> Workout submitted to Supabase (workout_submissions table)
  |      +-- Anti-cheat validation (pace limits, distance limits)
  |
  +--> Database trigger fires claim-reward Edge Function
  |      +-- Reads destination tag (charity/project/service/self)
  |      +-- Sends reward via LNURL to destination address
  |      +-- Records in reward_payments table with preimage proof
  |
  +--> Push notification: "You received a reward from [Sponsor]"
  |
  +--> RewardPollingService shows in-app toast notification
```

### Eligibility Rules

1. Activity must be cardio: running, walking, cycling, or hiking
2. Distance > 0
3. Passes anti-cheat validation
4. One reward per day per user (deduplicated)

### Reward Destinations

Users choose ONE destination for all rewards:

| Destination | What Happens |
|-------------|-------------|
| **Charity** (ALS Network, HRF, etc.) | Reward sent as micro donation to charity's address |
| **Project** (Bitcoin Beach, Bitcoin Ekasi, etc.) | Reward sent to project's address |
| **Service** (PPQ.AI) | Reward converted to AI credits |
| **You** (Self) | Reward sent to your wallet |

Change destination anytime via the Rewards tab. See [Chapter 13: Reward Destinations](./13-rewards-teams-charities.md) for full details.

---

## Lottery Wheel & Levels

Every qualifying workout earns the base 50 sats reward. The lottery wheel provides additional rewards:

- **Spin after qualifying workouts** — users get a wheel spin for bonus rewards
- **Level-based multiplier** — your RUNSTR level determines the reward multiplier
- **Level reflects consistency** — more workouts = higher level = better odds and payouts
- **Variable-ratio reinforcement** — the wheel creates excitement and unpredictability

### RUNSTR Levels
Your level is a direct correlation to your workout history. It affects:
- Lottery wheel multiplier (higher level = bigger potential payouts)
- Lottery wheel odds (higher level = better chances)

---

## Sponsor-Funded Rewards (Zapvertising)

Rewards are funded by sponsors, not RUNSTR. Sponsor attribution appears in two places:

1. **Rewards page** — "This month's rewards are brought to you by [Sponsor]" (SponsorBanner component)
2. **Push notifications** — "You received a reward from [Sponsor] for your workout"

This model (Zapvertising) lets businesses reach an active fitness audience through branded reward attribution, keeping the reward system sustainable without selling user data.

---

## Rewards Screen

The Rewards tab shows:

```
┌─────────────────────────────────────┐
│  REWARDS POOL                       │
│  [tap for Transparency Dashboard]   │
├─────────────────────────────────────┤
│  This month's rewards are brought   │
│  to you by [Sponsor]                │
├─────────────────────────────────────┤
│  EARNINGS / IMPACT                  │
│  Total rewards earned or donated    │
├─────────────────────────────────────┤
│  REWARD DESTINATION                 │
│  [Current destination]  [Change]    │
├─────────────────────────────────────┤
│  HOW IT WORKS                       │
│  Explainer for new users            │
└─────────────────────────────────────┘
```

### Key Elements
- **Rewards Pool** — Tappable card showing global reward distribution (TransparencyDashboardModal)
- **SponsorBanner** — Sponsor attribution with link to sponsor website
- **EarningsHeroCard** — Shows total rewards and weekly earnings (if wallet configured)
- **ImpactHeroCard** — Shows total rewards donated to destinations (if no wallet configured)
- **RewardDestinationSection** — Current destination with Change button

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
| RewardsTransparencyService | `src/services/rewards/RewardsTransparencyService.ts` | Global reward pool + destination leaderboards |
| RewardNotificationManager | `src/services/rewards/RewardNotificationManager.ts` | Toast notifications for earned rewards |

### External Reward Processing

**Important:** Actual reward payments are processed by an external service (Supabase Edge Functions), not by the app itself. The app:
1. Tracks reward eligibility locally (DailyRewardService)
2. Submits workouts to Supabase (SupabaseCompetitionService)
3. Database trigger fires claim-reward Edge Function
4. Edge Function reads destination and sends reward via LNURL
5. App polls for confirmed payments (RewardPollingService)
6. Displays earnings totals (SupabaseRewardService)

### Storage Keys

| Key | Purpose |
|-----|---------|
| `@runstr:last_reward_date` | Prevent duplicate daily rewards |
| `@runstr:total_rewards_earned` | Lifetime counter |
| `@runstr:weekly_rewards_earned` | Weekly counter |
| `@runstr:reward_destination` | User's chosen destination |

---

## What Rewards Should Be

### Ideal Architecture
1. **Sponsor-funded** — Rewards come from sponsors, not RUNSTR
2. **Single destination** — User picks one place for all rewards, no splits
3. **Silent failure** — Never block user experience
4. **Background-capable** — Earn rewards without opening the app
5. **Level-based multiplier** — Consistency increases lottery wheel payouts
6. **Visible attribution** — Sponsor brand shown on Rewards page and push notifications

### What to Avoid
- Complex eligibility rules
- Blocking payment errors
- Reward splits or percentages
- Retry loops that delay workouts
- Treating destinations as a separate system from rewards
- Using "sats", "Bitcoin", or "Lightning" in user-facing contexts

---

## Navigation

**Previous:** [Chapter 9: Event Leaderboards](./09-events-leaderboards.md)

**Next:** [Chapter 11: Daily Rewards & Lottery Wheel](./11-rewards-daily-step.md)

**Table of Contents:** [Back to TOC](./00-table-of-contents.md)
