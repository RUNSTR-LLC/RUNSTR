# NutZap Service

NIP-60/61 ecash wallet implementation for RUNSTR. Provides peer-to-peer Bitcoin payments via Nostr using Cashu ecash tokens.

## Files

- **nutzapService.ts** - Core wallet service with auto-creation, NDK integration, and Cashu operations (398 lines)
- **rewardService.ts** - Team reward distribution using captain's personal wallet (400 lines)
- **testPhase1.ts** - Test script to validate Phase 1 wallet functionality
- **testPhase2.ts** - Test script to validate Phase 2 personal wallet integration

## Architecture

This service implements a simplified NutZap wallet system that:
1. Auto-creates wallets on first login (no user action needed)
2. Uses NDK for all Nostr operations (no manual event handling)
3. Integrates Cashu mints for ecash token management
4. Publishes wallet info to Nostr (kind 37375)
5. Sends/receives nutzaps via Nostr events (kind 9321)
6. Enables captains to reward team members from personal wallets
7. Eliminates team wallet complexity entirely

## Phase 1 Status ✅

- Wallet auto-creation on login
- Wallet persistence via Nostr events
- Send nutzap functionality
- Claim incoming nutzaps
- Balance management
- Multiple user support

## Phase 2 Status ✅

- Authentication with auto-wallet creation
- Personal wallets for all users (no team wallets)
- Captain rewards from personal wallet
- Batch reward distribution
- Reward history tracking
- UI components for wallet management
- TypeScript compilation clean

## Key Benefits

🚀 **Simplified Architecture**: ~300 lines replaces 836-line CoinOS service
💰 **True P2P**: Direct captain-to-member payments
🍎 **Apple Compliant**: Pure peer-to-peer transfers
🔒 **User Sovereignty**: Everyone controls their own wallet
⚡ **Instant Payments**: No routing or channel management
🎯 **No Dependencies**: No external payment services needed

## Usage Examples

### Basic Wallet Operations
```typescript
import nutzapService from './nutzapService';

// Initialize with user's nsec (auto-creates if needed)
const wallet = await nutzapService.initialize(nsec);

// Send sats to another user
await nutzapService.sendNutzap(recipientPubkey, 100, 'Great job!');

// Claim incoming payments (runs automatically every 30s)
const { claimed } = await nutzapService.claimNutzaps();

// Check balance
const balance = await nutzapService.getBalance();
```

### Captain Reward Distribution
```typescript
import rewardService from './rewardService';

// Send single reward from captain's wallet
await rewardService.sendReward(
  teamId,
  memberPubkey,
  1000,
  'challenge_winner',
  'Won the weekly challenge!'
);

// Send batch rewards
await rewardService.sendBatchRewards(teamId, [
  { recipientPubkey: member1, amount: 500, reason: 'participation' },
  { recipientPubkey: member2, amount: 1000, reason: 'winner' }
]);

// Get team reward history
const history = await rewardService.getTeamRewardHistory(teamId);
```

## React Native Integration

Use the provided hook for easy component integration:

```typescript
import { useNutzap } from '../../hooks/useNutzap';

function MyComponent() {
  const { balance, sendNutzap, isLoading, error } = useNutzap();

  // Auto-initializes wallet on mount
  // Auto-claims incoming nutzaps every 30 seconds

  return (
    <View>
      <Text>Balance: {balance} sats</Text>
    </View>
  );
}
```

## Testing

Run the test scripts to validate implementation:

```bash
# Test Phase 1 (core wallet functionality)
npx ts-node src/services/nutzap/testPhase1.ts

# Test Phase 2 (personal wallet integration)
npx ts-node src/services/nutzap/testPhase2.ts
```

## Next Steps

- [ ] Add Lightning deposit/withdraw UI
- [ ] Implement wallet backup/recovery
- [ ] Add transaction history visualization
- [ ] Production testing with real sats
- [ ] Add mint selection UI
- [ ] Implement multi-mint support