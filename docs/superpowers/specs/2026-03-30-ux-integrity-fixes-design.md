# UX Integrity Fixes — Design Spec

Date: 2026-03-30

## Overview

Four targeted fixes for places where the UI implies something works but the underlying behavior is incomplete, misleading, or disconnected. No new features — sharpening what exists.

---

## 1. Reward Destination: Lightning Address Only

**File:** `src/components/rewards/RewardDestinationPicker.tsx`

**Problem:** Tapping "YOU" opens a 3-option modal (Lightning Address / Scan NWC QR / Paste NWC String). NWC path saves connection but never extracts a Lightning address, so rewards silently route to charity. User sees "NWC Wallet Connected" but never receives rewards.

**Fix:**
- Remove the wallet choice modal from this component
- Tapping "YOU" goes straight to the Lightning address input (`LightningAddressSetupModal`)
- YOU card subtitle changes to: "Connect wallet to receive rewards"
- After setup, card displays the saved Lightning address (existing behavior for the Lightning path)
- Remove `handleNWCConnectSuccess`, NWC QR scanner, and NWC paste modal references from this component only

**Not changing:**
- NWC connection flow in Settings (stays for future wallet features)
- `NWCWalletService`, `NWCStorageService` (stay in codebase)
- Reward routing logic in `rewardTags.ts` (already works correctly with Lightning address)

---

## 2. Onboarding Modal: Simplified Copy

**File:** `src/components/onboarding/WelcomePermissionModal.tsx`

**Problem:** Current modal has multiple paragraphs about local-first philosophy, platform-specific permission instructions, and battery optimization. Too much to read before the user has context.

**Fix:**
- Title: "WELCOME TO RUNSTR"
- Body: "RUNSTR rewards you for working out. Choose where your rewards go."
- Button: "Choose Reward Destination"
- Remove all other text (local-first explanation, permission instructions, battery optimization)

**Not changing:**
- The flow itself (modal -> destination picker -> app)
- Navigation timing or AsyncStorage keys
- Location permission request logic (stays in workout start flow where it already works)

---

## 3. Destination Picker Zap Icon: Wire Up ExternalZapModal

**File:** `src/components/rewards/RewardDestinationPicker.tsx`

**Problem:** `handleZap()` shows a plain `Alert.alert()` with the charity's Lightning address as text. No payment action.

**Fix:**
- Add state: `showZapModal`, `selectedCharityForZap`
- `handleZap(charity)` sets selected charity and opens modal
- Render `ExternalZapModal` passing charity's Lightning address, display name, and charity ID
- One tap -> ExternalZapModal opens -> user can pay via QR, Cash App, Strike, etc.

**Not changing:**
- Zap icon placement or styling
- `ExternalZapModal` internals
- Checkmark (destination selection) behavior — zap and select remain separate actions

---

## 4. Feed Zap: ExternalZapModal for All Users

**Files:** `src/components/social/SocialInteractionRow.tsx`, `src/components/social/SocialFeedPost.tsx` (or parent that can host the modal)

**Problem:** Feed zap button calls `SocialInteractionService.zap()` which requires a connected wallet (NWC/Cashu). Users without a wallet get an error. Hardcoded 100 sats, no amount selection, no external wallet option.

**Fix:**
- Zap button tap opens `ExternalZapModal` instead of calling direct zap service
- Pass post author's `npub` and `author_name` to the modal
- Modal fetches author's Lightning address from their Nostr kind 0 profile (lud16/lud06)
- If author has no Lightning address, show brief message in the modal
- Any user can zap — no wallet connection required

**Not changing:**
- `SocialInteractionService.zap()` or `LightningZapService` internals (can be cleaned up later)
- `ZappableUserRow` or `IN_APP_ZAPS_ENABLED` flag (separate concern)
- Zap count display on posts (modal `onSuccess` can trigger count update)

---

## Design Principle

One tap -> ExternalZapModal, everywhere. No direct/silent zap flows. The modal handles QR codes, wallet deep links (Cash App, Strike), and LNURL invoice generation. Consistent interaction pattern across destination picker and social feed.
