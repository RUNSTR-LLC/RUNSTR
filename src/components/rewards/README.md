# Rewards Components

UI components for the rewards system, including impact tracking, reward notifications, and transparency dashboard.

## Files

### Core Display Components

- **EarningsHeroCard.tsx** - Hero card for users with lightning address showing total earnings and user/charity split
- **ImpactHeroCard.tsx** - Hero card for users without lightning address showing donation impact
- **PersonalImpactSection.tsx** - Expandable section showing personal impact stats
- **RewardBreakdownCard.tsx** - Shows breakdown of user's rewards (user vs charity split)
- **TotalRewardsCard.tsx** - Activity summary card with workout stats and step count

### Notification Components

- **RewardEarnedModal.tsx** - Modal shown when user earns a reward
- **RewardNotificationProvider.tsx** - Context provider for reward notification state

### Transparency Dashboard Components

- **TransparencyDashboardModal.tsx** - Full-screen modal showing global rewards transparency
- **PeriodSelector.tsx** - Toggle buttons for selecting time period (Day/Week/Month/All)
- **GlobalBreakdownCard.tsx** - Visual breakdown of user vs charity payment distribution
- **CharityPayoutLeaderboard.tsx** - Ranked list of charities by total sats received
- **PendingPayoutsCard.tsx** - Progress bars for pending batch payments (e.g., Geyser minimum)

## Transparency Dashboard

The transparency dashboard opens when users tap the rewards pool card on the Rewards screen. It shows:

1. **Pool Balance** - Current rewards pool balance from Supabase
2. **Period Selector** - Filter data by day/week/month/all-time
3. **Payment Distribution** - Visual split between athletes and charities
4. **Charity Leaderboard** - Top charities by total sats received
5. **Pending Payments** - Progress toward batch payment minimums

Data is read-only from the app (populated by external watcher service).
