# Rewards Services

Services for managing the RUNSTR rewards system, including daily rewards, step tracking, and payment verification.

## Files

### Core Reward Services

- **DailyRewardService.ts** - Manages daily workout rewards (50 sats per workout, server-side via trigger_auto_reward)

### Payment & Destination Services

- **RewardDestinationService.ts** - Manages user's Lightning address for receiving rewards
- **RewardLightningAddressService.ts** - Validates and resolves Lightning addresses
- **NWCGatewayService.ts** - NWC (Nostr Wallet Connect) integration for payments

### Verification & Tracking

- **SupabaseRewardService.ts** - Queries verified payments from reward_payments table
- **RewardsTransparencyService.ts** - Queries global transparency data (pool, summaries, charity payouts)

### Notification Services

- **RewardPollingService.ts** - Polls for new reward payments to notify user
- **RewardNotificationManager.ts** - Manages in-app reward notifications

## RewardsTransparencyService

Provides access to global rewards transparency data:

```typescript
import { RewardsTransparencyService } from './RewardsTransparencyService';

// Get combined dashboard data
const data = await RewardsTransparencyService.getDashboardData('monthly');
// Returns: { pool, summary, charityLeaderboard, pendingPayouts }

// Individual queries
const pool = await RewardsTransparencyService.getPoolStatus();
const summary = await RewardsTransparencyService.getSummary('weekly');
const charities = await RewardsTransparencyService.getCharityLeaderboard('all_time');
const pending = await RewardsTransparencyService.getPendingBatchPayouts();
```

Tables are read-only from the app, populated by external watcher service.
