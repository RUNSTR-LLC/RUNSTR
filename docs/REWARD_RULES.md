# RUNSTR Reward Rules

Single source of truth for reward logic across the app, website, and backend.

## Daily Reward

- **Amount:** Distance-tiered rewards per qualifying workout — 500 for 5K, 1000 for 10K, 2100 for half marathon, 4200 for marathon (values from `src/config/rewards.ts` `REWARD_DISTANCE_TIERS`)
- **Applies to:** All users (no tiers, no subscriptions)
- **Daily limit:** 1 reward per user per day

## Event Rewards

Placing in an event (daily leaderboard or captain-created club event) earns additional rewards on top of the daily reward. Event prize structures are defined per event.

## Captain Rewards

Captains earn a slice when their club members complete qualifying workouts. This is the primary incentive for running an engaged club.

## Qualifying Activities

Cardio only — running, walking, cycling, hiking.

Daily steps (5,000+) also qualify as a walking workout via the daily step submission path.

Minimum distance: 5 km. Minimum duration: 1 minute. Workouts below the 5K threshold earn no reward.

## Payout Destination

Rewards are sent via LNURL to the user's lightning address. There is no destination picker — no charities, no projects, no AI credits, no splits.

Address resolution priority:
1. Stored address (from Settings) if set
2. Nostr profile lud16 otherwise

If neither is available, the user cannot receive rewards until they paste one into Settings.

## Implementation Notes

- App config: `src/config/rewards.ts` (REWARD_CONFIG constants)
- Eligibility tracking: `src/services/rewards/DailyRewardService.ts`
- Address resolution: `src/services/rewards/RewardLightningAddressService.ts`
- Backend: external `runstr-zapper` service polls `workout_submissions` and pays out
- Payment records: `reward_payments` table in Supabase

## Funding

Rewards are funded by RUNSTR with a small monthly budget. Sporadic outages when the budget is exhausted are acceptable — rewards are a bonus, not a blocker. There are no sponsorships, no Zapvertising, and no subscription tiers.
