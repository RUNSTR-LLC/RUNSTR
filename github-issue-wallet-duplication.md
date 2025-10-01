# Bug Report: Multiple NIP-60 Wallets Created for Same User

## 🐛 Bug Description

Users are seeing different NIP-60 wallets with different balances when entering the app (e.g., 50 sats in one wallet, 120 sats in another, 115 sats in another). This indicates multiple wallet instances are being created for the same user instead of maintaining a single, consistent wallet.

## 🔍 Current Behavior

- User logs in and sees wallet with X sats
- User logs in again later and sees different wallet with Y sats
- Multiple wallet balances exist for the same user (50, 120, 115 sats)
- Funds appear "lost" when switching between wallet instances

## ✅ Expected Behavior

- User should always see the same NIP-60 wallet across all sessions
- Single wallet balance that persists regardless of network conditions
- All transactions should accumulate in one consistent wallet
- Zero fund loss or wallet duplication

## 🎯 Root Cause Analysis

Based on code investigation, the issue stems from multiple problems in `src/services/nutzap/nutzapService.ts`:

### 1. Race Conditions During Wallet Detection
- Network failures during Nostr queries trigger new wallet creation
- Insufficient retry logic when checking for existing wallets
- System creates new wallet instead of retrying on connection issues

### 2. Multiple Wallet Events on Nostr
- Multiple `kind 37375` (wallet info) events being published for same user
- Inconsistent "most recent wallet" selection logic
- No deduplication when multiple wallets detected

### 3. User Identity Tracking Issues
- `@runstr:current_user_pubkey` tracking not bulletproof
- Wallet ownership verification gaps
- Incomplete wallet data clearing on user switch

## 🔧 Technical Details

**Problem Code Locations:**
- `fetchWalletFromNostr()` (lines 456-529) - insufficient retry logic
- `createWallet()` (lines 605-639) - creates duplicate events
- `loadOfflineWallet()` (lines 329-364) - weak user verification
- `initialize()` (lines 115-250) - race condition handling

**Storage Keys Involved:**
- `@runstr:wallet_proofs` - wallet token storage
- `@runstr:wallet_pubkey` - wallet ownership tracking
- `@runstr:current_user_pubkey` - user identity verification

## 🧪 Steps to Reproduce

1. Login with user nsec/npub
2. Note wallet balance
3. Logout and clear app cache
4. Login again with same user
5. Observe different wallet balance
6. Repeat process - multiple different balances appear

## 🌐 Environment

- **Platform:** React Native (iOS/Android)
- **Library:** @cashu/cashu-ts for NIP-60/61 implementation
- **Mint:** mint.coinos.io
- **Nostr Library:** @nostr-dev-kit/ndk

## 💡 Proposed Solution

### Phase 1: Deterministic Wallet System
- Implement wallet deduplication logic
- Use user's pubkey hash as deterministic wallet ID
- Always select earliest wallet when multiples exist
- Add wallet consolidation for balance recovery

### Phase 2: Enhanced Network Resilience
- Add exponential backoff retries for Nostr queries
- Implement 30-second extended final check before creating new wallets
- Strengthen relay connection verification
- Improve offline mode with cached wallet fallbacks

### Phase 3: Wallet Event Consistency
- Ensure single `kind 37375` event per user using replaceable events
- Add duplicate wallet cleanup routine
- Implement balance consolidation across instances
- Strengthen user identity verification

## 🚨 Priority

**High Priority** - This is a fund safety issue that can result in user confusion and perceived fund loss.

## 📋 Acceptance Criteria

- [ ] User always sees same wallet balance across sessions
- [ ] Only one wallet event exists per user on Nostr
- [ ] Network issues don't trigger duplicate wallet creation
- [ ] Clean user switching without wallet contamination
- [ ] Existing multiple wallets are consolidated with recovered balances
- [ ] Zero fund loss during the fix implementation

## 🧪 Testing Plan

1. **User Switching Test**: Verify clean wallet separation between users
2. **Network Failure Test**: Simulate connection issues during wallet detection
3. **Cache Clear Test**: Verify wallet recovery after app data clearing
4. **Balance Consolidation Test**: Verify multiple wallets merge correctly
5. **Persistence Test**: Verify wallet consistency across app restarts

## 📚 Related Files

- `src/services/nutzap/nutzapService.ts` - Main NIP-60 implementation
- `src/services/auth/authService.ts` - User authentication and wallet cleanup
- `src/utils/nostr.ts` - Nostr key management utilities
- `test-wallet-duplicate-prevention.js` - Existing test scenarios
- `test-wallet-retrieval.js` - Wallet retrieval test cases