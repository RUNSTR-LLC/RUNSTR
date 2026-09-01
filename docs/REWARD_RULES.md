# RUNSTR Reward Rules

Single source of truth for reward logic across the app, website, and backend.

## Daily Reward

Rewards are distance-tiered — a workout earns the highest milestone it crosses:

| Distance | Reward |
|----------|--------|
| Marathon (42.2K+) | 4,200 sats |
| Half marathon (21.1K+) | 2,100 sats |
| 10K+ | 1,000 sats |
| 5K – 9.99K | 500 sats |
| Under 5K | 0 (does not qualify) |

- **Applies to:** All users (no tiers, no subscriptions)
- **Daily limit:** 1 reward per user per day

## Event Rewards

Placing in an event (daily leaderboard or captain-created club event) earns additional rewards on top of the daily reward. Event prize structures are defined per event.

## Captain Rewards

Captains earn a slice when their club members complete qualifying workouts. This is the primary incentive for running an engaged club.

## Qualifying Activities

Cardio only — running, walking, cycling, hiking.

Daily steps (5,000+) also qualify as a walking workout via the daily step submission path.

Minimum distance: 5K (5,000 m). Minimum duration: 60 seconds. Workouts below either threshold earn nothing.

## Payout Destination

Rewards are sent via LNURL to the destination the user selects on the Rewards screen. The destination picker offers three options:

1. **Your lightning address** — default; either the stored address (from Settings) or the user's Nostr profile lud16
2. **Charity** — routes to the selected charity's lightning address (default: ALS Network)
3. **PPQ.AI** — rewards are paid to a PPQ.AI bolt11 invoice instead of a Lightning address

If no lightning address is available and no alternative is selected, the user cannot receive rewards until they paste one into Settings.

## Implementation Notes

- App config: `src/config/rewards.ts` (REWARD_CONFIG constants)
- Eligibility tracking: `src/services/rewards/DailyRewardService.ts`
- Address resolution: `src/services/rewards/RewardLightningAddressService.ts`
- Backend: external `runstr-zapper` service polls `workout_submissions` and pays out
- Payment records: `reward_payments` table in Supabase

## Funding

Rewards are funded by RUNSTR with a small monthly budget. Sporadic outages when the budget is exhausted are acceptable — rewards are a bonus, not a blocker. There are no sponsorships, no Zapvertising, and no subscription tiers.
