# NIP-60/61 Implementation Analysis for RUNSTR

## Executive Summary
RUNSTR implements NIP-60 (Cashu Wallet Event) and NIP-61 (Cashu NutZap) to enable peer-to-peer Bitcoin payments through Nostr using e-cash tokens. The implementation provides instant, private Bitcoin transfers without requiring Lightning Network infrastructure on the client side.

## Current Implementation Status

### ✅ Working Components
1. **Wallet Auto-Creation** - Automatic wallet generation on first use
2. **E-cash Token Generation** - Creating Cashu tokens for transfers
3. **Lightning Invoice Generation** - Creating invoices for receiving funds (with improved error handling)
4. **Token Claiming** - Automatic claiming of incoming NutZaps (with retry logic)
5. **Transaction History** - Local storage and display of transactions
6. **Balance Management** - Proof-based balance tracking

### 🔧 Components Fixed in This Update
1. **UI Terminology** - Changed "Cashu" to "E-cash" throughout
2. **Send Options** - Simplified to Lightning and E-cash only
3. **Receive Options** - Removed NutZap tab (not needed for receiving)
4. **Invoice Generation** - Added timeout handling and better error messages
5. **Claim Process** - Improved error handling and duplicate detection
6. **Transaction History** - Removed "coming soon" placeholders

## Technical Architecture

### Core Service: `nutzapService.ts`
Single-instance service managing all wallet operations:

```typescript
class NutzapService {
  // Singleton pattern for global wallet access
  private static instance: NutzapService;

  // Core dependencies
  private ndk: NDK;              // Nostr communication
  private cashuWallet: CashuWallet;  // E-cash operations
  private cashuMint: CashuMint;      // Mint connection
  private userPubkey: string;        // User identification
}
```

### Data Flow

#### 1. Wallet Initialization
```
User Login → Extract nsec → Initialize NDK → Connect to Mint → Load/Create Wallet
```

#### 2. Sending E-cash (NutZap)
```
Select Amount → Generate Proofs → Create Token → Publish Kind 9321 Event → Update Local Balance
```

#### 3. Receiving E-cash
```
Monitor Kind 9321 Events → Extract Token → Claim with Mint → Update Proofs → Save Transaction
```

#### 4. Lightning Integration
```
Invoice: Create Mint Quote → Return Lightning Invoice → Poll for Payment → Mint Tokens
Payment: Get Melt Quote → Burn Tokens → Pay Invoice → Store Change
```

## NIP-60: Wallet Info Events (Kind 37375)

### Purpose
Stores wallet configuration on Nostr for cross-device synchronization.

### Implementation
```typescript
// Wallet info event structure
{
  kind: 37375,
  content: {
    mints: ["https://mint.minibits.cash/Bitcoin"],
    name: "RUNSTR Wallet",
    unit: "sat",
    balance: 0
  },
  tags: [
    ["d", "nutzap-wallet"],    // Unique identifier
    ["mint", "mint_url"],      // Mint endpoint
    ["name", "wallet_name"],   // Display name
    ["unit", "sat"]            // Currency unit
  ]
}
```

### Key Features
- **Auto-Discovery**: Wallet found via user's pubkey + "d" tag
- **Multi-Mint Support**: Array of mint URLs (currently using single mint)
- **Offline-First**: Local storage with background Nostr sync

## NIP-61: NutZap Events (Kind 9321)

### Purpose
Transfers e-cash tokens between Nostr users as zap-like payments.

### Implementation
```typescript
// NutZap event structure
{
  kind: 9321,
  content: "Payment memo/message",
  tags: [
    ["p", "recipient_pubkey"],     // Target user
    ["amount", "1000"],            // Sats amount
    ["unit", "sat"],               // Currency
    ["proof", "cashuAey..."]       // Encoded token
  ]
}
```

### Security Features
- **Token Uniqueness**: Each token can only be claimed once
- **Mint Validation**: Tokens verified with issuing mint
- **Duplicate Detection**: ProcessedTokens set prevents double-claims
- **Timeout Protection**: 3-second timeout on token claims

## Cashu Integration

### Mint Selection
Default mints configured for reliability:
1. `https://mint.minibits.cash/Bitcoin` (Primary)
2. `https://testnut.cashu.space` (Fallback)

### Token Management
```typescript
// Proof structure (stored locally)
interface Proof {
  amount: number;    // Satoshi value
  secret: string;    // Token secret
  C: string;         // Mint signature
  id: string;        // Keyset ID
}
```

### Balance Calculation
- Balance = Sum of all proof amounts
- Proofs stored in AsyncStorage
- Updated after each transaction

## Error Handling Strategy

### Network Resilience
1. **Timeout Protection**: 10s for invoice, 3s for claims, 5s for relay queries
2. **Offline Mode**: Wallet works without network, syncs when available
3. **Retry Logic**: Failed claims retry on next check cycle

### User Feedback
```typescript
// Improved error messages
"Invoice generation timed out. Please try again."
"Network error. Please check your internet connection."
"Unable to connect to mint service. Please try again later."
"Token has already been claimed"
```

## Storage Architecture

### AsyncStorage Keys
```typescript
const STORAGE_KEYS = {
  USER_NSEC: '@runstr:user_nsec',         // User private key
  WALLET_PROOFS: '@runstr:wallet_proofs', // E-cash proofs
  WALLET_MINT: '@runstr:wallet_mint',     // Selected mint URL
  LAST_SYNC: '@runstr:last_sync',         // Sync timestamp
  TX_HISTORY: '@runstr:tx_history'        // Transaction log
}
```

### Transaction Types
```typescript
type TransactionType =
  | 'nutzap_sent'        // Sent via Nostr
  | 'nutzap_received'    // Received via Nostr
  | 'lightning_sent'     // Paid Lightning invoice
  | 'lightning_received' // Received via Lightning
  | 'cashu_sent'        // Direct token transfer
  | 'cashu_received'    // Direct token receive
```

## Competition Winner Payments

### Current Flow
1. Captain views competition results
2. Clicks on winner from leaderboard
3. Triggers NutZap send to winner's pubkey
4. Amount determined by prize pool distribution

### Implementation Needed
```typescript
// In CaptainDashboardScreen or WinnersScreen
const sendPrizeToWinner = async (winnerPubkey: string, amount: number) => {
  const result = await nutzapService.sendNutzap(
    winnerPubkey,
    amount,
    `Competition prize: ${competitionName}`
  );

  if (result.success) {
    // Update competition as paid
    // Show success notification
  }
};
```

## Performance Optimizations

### Caching Strategy
- 5-minute cache for team member lists
- 1-minute cache for competition queries
- Processed tokens tracked to avoid re-processing
- Background sync every 60 seconds

### Batch Operations
- Claim all pending NutZaps in single operation
- Process multiple proofs in one transaction
- Aggregate balance calculations

## Security Considerations

### Private Key Management
- nsec stored encrypted in AsyncStorage
- Never exposed in logs or UI
- Used only for NDK signing operations

### Token Security
- Tokens are bearer instruments (possession = ownership)
- Once sent, cannot be reversed
- Mint validates all token operations

### Network Security
- HTTPS required for mint connections
- Relay connections use WSS
- No sensitive data in Nostr events (tokens are encrypted)

## Future Enhancements

### Phase 2 Features
1. **Multi-Mint Support**: Connect to multiple mints for redundancy
2. **Mint Rotation**: Automatic failover to backup mints
3. **Token Melting**: Consolidate small proofs into larger ones
4. **Privacy Features**: Token mixing and amount obfuscation

### Phase 3 Features
1. **NWC Integration**: Nostr Wallet Connect for external wallets
2. **Scheduled Payments**: Recurring team dues/subscriptions
3. **Escrow System**: Hold funds until competition completion
4. **Audit Trail**: Cryptographic proof of payments

## Testing Recommendations

### Unit Tests
```typescript
describe('NutzapService', () => {
  test('should initialize wallet on first use');
  test('should claim pending nutzaps');
  test('should handle network timeouts gracefully');
  test('should prevent double-spending');
});
```

### Integration Tests
1. Send NutZap between two test accounts
2. Generate and pay Lightning invoice
3. Create and receive e-cash token
4. Handle mint offline scenario

### Load Tests
- 100+ pending NutZaps claim
- Rapid send/receive cycles
- Network interruption recovery

## Deployment Checklist

### Before Production
- [ ] Verify mint availability and uptime
- [ ] Test with real Lightning payments
- [ ] Implement rate limiting for claims
- [ ] Add monitoring for failed transactions
- [ ] Set up mint backup strategy
- [ ] Create user recovery flow

### Monitoring
- Track successful vs failed claims ratio
- Monitor average claim time
- Alert on mint connection failures
- Log token generation failures

## Summary for Senior Developer

### What We're Doing Right
1. **Proper NIP Implementation**: Following NIP-60/61 specifications correctly
2. **Offline-First Design**: Wallet works without constant connectivity
3. **Error Recovery**: Robust timeout and retry mechanisms
4. **User Privacy**: No KYC, no accounts, just Nostr keys

### Areas for Improvement
1. **Mint Redundancy**: Need multiple mint support for reliability
2. **State Management**: Consider Redux/Zustand for wallet state
3. **Background Processing**: Implement proper background task for auto-claiming
4. **Testing Coverage**: Need comprehensive test suite

### Key Technical Decisions
1. **Singleton Service**: Global wallet instance for app-wide access
2. **NDK Library**: Using Nostr Dev Kit for reliable Nostr operations
3. **Cashu-ts Library**: Official Cashu implementation for e-cash
4. **AsyncStorage**: Local persistence for offline functionality

### Risk Mitigation
1. **Mint Dependency**: Single point of failure if mint goes down
2. **Token Loss**: Unclaimed tokens expire after mint's timeout
3. **Privacy Leaks**: NutZap events are public on Nostr
4. **Regulatory**: E-cash may face regulatory scrutiny

This implementation provides a solid foundation for P2P Bitcoin payments in RUNSTR, with clear upgrade paths for enhanced functionality and resilience.