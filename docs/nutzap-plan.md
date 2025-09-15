# NIP-60/61 Nutzap Implementation Plan for RUNSTR

## Our Direction: Embracing True P2P Bitcoin Payments

RUNSTR is evolving towards a truly peer-to-peer Bitcoin payment system that eliminates the complexity and dependencies of traditional Lightning infrastructure. By adopting NIP-60/61 nutzaps, we're moving away from centralized payment services and embracing a model where captains directly reward team members from their own wallets. This approach not only simplifies our architecture but also aligns perfectly with Bitcoin's original vision of peer-to-peer electronic cash and Nostr's decentralized social protocol.

The decision to remove team wallets and have captains pay directly from their personal wallets represents a fundamental shift towards true ownership and responsibility. This model mirrors real-world team dynamics where coaches and captains personally invest in their team members' success. It eliminates the complexity of shared wallet management, reduces potential security vulnerabilities, and ensures that reward distributions are immediate and transparent. Captains maintain full control over their funds while still being able to incentivize and reward their team members' achievements.

Our implementation leverages Cashu ecash tokens transmitted over Nostr, creating a payment system that is both technically elegant and user-friendly. Unlike traditional Lightning payments that require complex channel management and routing, nutzaps operate as simple token transfers between Nostr events. This means faster payments, lower cognitive overhead for users, and zero dependency on external payment services. The system works entirely within the Nostr ecosystem that RUNSTR already embraces, creating a cohesive and integrated experience.

From an Apple App Store compliance perspective, this approach is revolutionary. By implementing pure peer-to-peer transfers without any platform intermediation, we avoid the complex regulations around digital payments and in-app purchases. Apple's policies favor direct user-to-user transfers, and nutzaps perfectly fit this model. There are no platform fees, no merchant accounts, and no payment processing concerns – just direct Bitcoin transfers between users, which Apple treats similarly to any other social media sharing.

The technical implementation is remarkably straightforward, replacing over 1,000 lines of complex CoinOS integration with approximately 300 lines of clean, maintainable code. This reduction in complexity translates to fewer bugs, easier maintenance, and faster feature development. By building on proven libraries like NDK and established Cashu mints, we're leveraging battle-tested infrastructure while maintaining our commitment to user sovereignty and decentralization. This direction positions RUNSTR as a leader in the next generation of Bitcoin-native applications.

## Implementation Plan Overview
Replace the current 836-line CoinOS service with a lightweight NIP-60/61 implementation that enables direct captain-to-member Bitcoin payments over Nostr. This simplified architecture eliminates team wallets entirely, with captains rewarding members directly from their personal nutzap wallets.

## Phase 1: Core Infrastructure (Day 1-2)
**Dependencies & Setup**
- Add Cashu libraries: `@cashu/cashu-ts`, `@scure/secp256k1`
- Configure React Native polyfills for crypto operations
- Create React Native-optimized NDK wallet service integration

**Core Services**
- `src/services/nutzap/nutzapWalletService.ts` - Personal wallet management (~300 lines)
- `src/services/nutzap/cashuMintService.ts` - Mint operations (~200 lines) 
- `src/hooks/useNutzapWallet.ts` - React Native wallet hook (~400 lines)

## Phase 2: Personal Wallet Integration (Day 3-4)
**Replace Team Wallet System**
- Remove all team wallet creation and management code
- Replace `coinosService.ts` with personal nutzap wallet service
- Update captain reward flows to send directly from captain's personal wallet
- Simplify competition prize distributions to direct captain-to-winner payments

**Key Integrations**
- Automatic personal wallet creation on Nostr auth (integrates with existing `authService.ts`)
- Background nutzap claiming for all users (every 30 seconds)
- Captain reward UI that sends from their personal balance

## Phase 3: UI & UX Simplification (Day 5)
**Profile Screen Integration**
- Add personal wallet balance display to existing Profile tab
- Integrate nutzap sending with team member lists (captain view only)
- Add deposit/withdraw Lightning options for personal wallet
- Show personal transaction history using existing UI patterns

**Captain Dashboard Updates**
- Remove team wallet setup entirely from captain dashboard
- Update reward distribution UI to show captain's personal balance
- Add "Reward Member" buttons that deduct from captain's wallet
- Maintain existing permission system (only captains can send rewards)

**Member Experience**
- Members receive nutzaps directly to their personal wallets
- No team wallet interaction required
- Simple claim notifications for incoming rewards

## Key Architecture Benefits
✅ **Simplified Model**: No team wallets, direct captain-to-member payments
✅ **Apple Compliant**: Pure P2P transfers, zero policy concerns
✅ **No External Dependencies**: No CoinOS, no Lightning service management  
✅ **True User Custody**: All users control their own personal Nostr wallets
✅ **Seamless Integration**: Works with existing Nostr auth and team systems
✅ **Massive Code Reduction**: ~1200 lines of complex code → ~300 lines of simple code

## Implementation Details
- **Personal Wallets Only**: Each user has one nutzap wallet tied to their Nostr identity
- **Mint Selection**: Use public mints (mint.minibits.cash, coinos.io)
- **React Native Compatibility**: Verified NDK + Cashu work on React Native
- **Storage**: AsyncStorage for wallet persistence (same as current auth)
- **Background Processing**: Auto-claim nutzaps when app becomes active

## Payment Flow Examples
**Captain Rewards Member**: Captain's wallet → `sendNutzap(memberPubkey, 1000, "Great 5K time!")` → Member's wallet
**Member Tips Member**: Member's wallet → `sendNutzap(memberPubkey, 500, "Nice form!")` → Member's wallet  
**Competition Prizes**: Captain sends batch nutzaps to winners from personal wallet

## Migration Strategy
1. **Remove Team Wallet Code**: Delete all team wallet creation, management, and UI components
2. **Replace CoinOS Service**: Swap with personal nutzap wallet service
3. **Update Captain UI**: Change reward buttons to deduct from captain's personal balance
4. **Simplify Permissions**: Remove team wallet permissions, keep captain reward permissions
5. **Update Member UI**: Show personal wallet balance and incoming nutzap notifications

## Timeline: 5 Days Total
This replaces months of complex Lightning infrastructure and team wallet management with a working Bitcoin payment system in under a week. The simplified model reduces implementation complexity by 60% while providing superior user experience and Apple compliance.