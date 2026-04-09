# RUNSTR Reward Rules

Single source of truth for reward logic across the app, website, and backend.

## Base Rewards

- **Amount:** 100 sats per qualifying workout
- **Applies to:** All users (free and subscribed)
- **Daily limit:** 1 reward per user per day

## Boosted Rewards (Subscribers)

- **Amount:** 1,000 sats per qualifying workout (10x boost)
- **Applies to:** Supporter or Pro subscribers
- **Weekly cap:** 5 boosted rewards per week (Mon-Sun, resets Monday 00:00 UTC)
- **After cap:** Subscriber earns base rate (100 sats) for remaining workouts that week

## Qualifying Activities

Running, walking, cycling, pushups, journal entries, and 5,000+ daily steps.

No distance minimum. No duration minimum. Manual entries allowed.

## Subscription Tiers

| Tier | Price | Rewards | Extras |
|------|-------|---------|--------|
| Free | — | 100 sats/workout | — |
| Supporter | 15,000 sats/month | 1,000 sats/workout (10x boost), up to 5/week | Season access |
| Pro | 21,000 sats/month | 1,000 sats/workout (10x boost), up to 5/week | Season access, create clubs, create events |

## Economics Reference

| Workouts/week | Free (monthly) | Subscriber (monthly) |
|---------------|----------------|----------------------|
| 3x | ~3,000 | ~13,000 |
| 4x | ~3,500 | ~17,300 |
| 5x | ~4,300 | ~21,700 |
| 7x | ~3,000 | ~22,600 (5 boosted + 2 base) |

## Implementation Notes

- Subscription tier verified via Supabase `subscriptions` table
- App config: `src/config/rewards.ts` (REWARD_CONFIG constants)
- Backend: Edge Functions check tier before sending boosted amount
- Website: `runstr.club/pro/` handles subscription signup with npub + tier params
