# UX Integrity Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four UX integrity issues where the UI implies something works but the underlying behavior is incomplete or misleading.

**Architecture:** All changes are UI-layer only. No backend/Supabase changes. No new services. Three components modified, zero created. ExternalZapModal is reused as-is.

**Tech Stack:** React Native, TypeScript, ExternalZapModal (existing component)

**Spec:** `docs/superpowers/specs/2026-03-30-ux-integrity-fixes-design.md`

---

### Task 1: Reward Destination — Lightning Address Only

**Files:**
- Modify: `src/components/rewards/RewardDestinationPicker.tsx`

- [ ] **Step 1: Simplify handleSelect for self — go straight to Lightning address input**

In `RewardDestinationPicker.tsx`, replace the `handleSelect` function's self-selection branch (lines 100-118) to open the Lightning address modal directly instead of the wallet choice modal:

```typescript
const handleSelect = useCallback(
  async (destinationId: string) => {
    try {
      if (isSelfTeam(destinationId)) {
        setPendingSelfSelection(true);
        setShowLightningSetupModal(true);
        return;
      }

      await AsyncStorage.setItem(SELECTED_TEAM_KEY, destinationId);
      onSelectDestination(destinationId);
    } catch (error) {
      console.error('[RewardDestinationPicker] Failed to save selection:', error);
      Alert.alert('Error', 'Failed to save your selection. Please try again.');
    }
  },
  [onSelectDestination]
);
```

- [ ] **Step 2: Update the YOU card subtitle**

Replace the subtitle text block (lines 334-344) with Lightning-address-only messaging:

```typescript
{userLightningAddress ? (
  <Text style={styles.destinationDescription} numberOfLines={1}>
    {userLightningAddress}
  </Text>
) : (
  <Text style={styles.ctaText}>Connect wallet to receive rewards</Text>
)}
```

This removes the `hasNWCWallet` conditional branch that showed "NWC Wallet Connected".

- [ ] **Step 3: Remove NWC-related state, handlers, and modals**

Remove from imports:
```
- NWCStorageService (line 36)
- WalletConfigModal (line 38)
- QRScannerModal (line 39)
- NWCQRConfirmationModal (line 40)
- QRData type (line 41)
```

Remove state variables (lines 73-78):
```
- hasNWCWallet
- showWalletChoiceModal
- showWalletConfigModal
- showQRScannerModal
- showNWCQRConfirmModal
- scannedNWCString
```

Remove from `loadUserData` (lines 87-98): the `NWCStorageService.hasNWC()` call and `setHasNWCWallet`. Simplify to just load the Lightning address:
```typescript
const loadUserData = async () => {
  try {
    const address = await AsyncStorage.getItem(REWARD_LIGHTNING_ADDRESS_KEY);
    setUserLightningAddress(address);
  } catch (error) {
    console.error('[RewardDestinationPicker] Failed to load user data:', error);
  }
};
```

Remove handler functions:
```
- handleWalletChoiceLightning (lines 145-148)
- handleWalletChoiceNWCScan (lines 150-153)
- handleWalletChoiceNWCPaste (lines 155-158)
- handleNWCQRScanned (lines 160-165)
- handleNWCConnectSuccess (lines 167-181)
```

Remove modal JSX blocks:
```
- Wallet Choice Modal (lines 421-462)
- WalletConfigModal (lines 464-471)
- QRScannerModal (lines 472-477)
- NWCQRConfirmationModal (lines 479-485)
```

Remove unused styles:
```
- walletChoiceOverlay
- walletChoiceContainer
- walletChoiceTitle
- walletChoiceSubtitle
- walletChoicePrimaryButton / PrimaryText
- walletChoiceSecondaryButton / SecondaryText
- walletChoiceTertiaryButton / TertiaryText
- walletChoiceCancelButton / CancelText
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: No new errors related to RewardDestinationPicker

- [ ] **Step 5: Commit**

```bash
git add src/components/rewards/RewardDestinationPicker.tsx
git commit -m "Fix: Simplify reward destination to Lightning address only

Remove NWC wallet options from destination picker. Users now go
straight to Lightning address input when selecting themselves.
Subtitle updated to 'Connect wallet to receive rewards'."
```

---

### Task 2: Onboarding Modal — Simplified Copy

**Files:**
- Modify: `src/components/onboarding/WelcomePermissionModal.tsx`

- [ ] **Step 1: Replace modal body with simplified content**

Replace the entire content between `<ScrollView>` tags (lines 42-127) with:

```tsx
<ScrollView
  showsVerticalScrollIndicator={false}
  contentContainerStyle={styles.scrollContent}
>
  <Text style={styles.title}>WELCOME TO RUNSTR</Text>
  <Text style={styles.subtitle}>
    RUNSTR rewards you for working out.{'\n'}Choose where your rewards go.
  </Text>

  <TouchableOpacity
    style={styles.primaryButton}
    onPress={onComplete}
    activeOpacity={0.7}
  >
    <Text style={styles.primaryButtonText}>Choose Reward Destination</Text>
    <Ionicons
      name="arrow-forward"
      size={20}
      color={theme.colors.background}
      style={styles.buttonIcon}
    />
  </TouchableOpacity>
</ScrollView>
```

- [ ] **Step 2: Remove unused imports and clean up styles**

Remove `Platform` from the react-native import (no longer needed).

Remove unused styles:
```
- paragraph
- section
- sectionHeader
- sectionTitle
- sectionText
- instructionsBox
- instructionsTitle
- instructionItem
- instructionBullet
- instructionText
- highlight
```

Update `subtitle` style to give it more breathing room:
```typescript
subtitle: {
  fontSize: 16,
  fontWeight: '500',
  color: theme.colors.textMuted,
  textAlign: 'center',
  marginBottom: 24,
  lineHeight: 24,
},
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: No new errors related to WelcomePermissionModal

- [ ] **Step 4: Commit**

```bash
git add src/components/onboarding/WelcomePermissionModal.tsx
git commit -m "Fix: Simplify onboarding modal to one-liner

Replace wall of text with simple message: 'RUNSTR rewards you for
working out. Choose where your rewards go.' Permissions explained
when actually needed, not upfront."
```

---

### Task 3: Destination Picker Zap Icon — Wire Up ExternalZapModal

**Files:**
- Modify: `src/components/rewards/RewardDestinationPicker.tsx`

- [ ] **Step 1: Add ExternalZapModal import and state**

Add import at top of file:
```typescript
import { ExternalZapModal } from '../nutzap/ExternalZapModal';
```

Add state variables alongside existing state:
```typescript
const [showZapModal, setShowZapModal] = useState(false);
const [zapTargetCharity, setZapTargetCharity] = useState<Charity | null>(null);
```

- [ ] **Step 2: Replace handleZap with modal-opening handler**

Replace the existing `handleZap` function (lines 205-212) with:

```typescript
const handleZap = useCallback((charity: Charity) => {
  if (!charity.lightningAddress) return;
  setZapTargetCharity(charity);
  setShowZapModal(true);
}, []);
```

- [ ] **Step 3: Add ExternalZapModal JSX**

Add after the last modal (PPQCreditTopupModal), before the closing `</Modal>` of the main component:

```tsx
{/* External Zap Modal for charities/projects */}
<ExternalZapModal
  visible={showZapModal}
  recipientNpub={zapTargetCharity?.lightningAddress || ''}
  recipientName={zapTargetCharity?.displayName || zapTargetCharity?.name || ''}
  onClose={() => { setShowZapModal(false); setZapTargetCharity(null); }}
  onSuccess={() => { setShowZapModal(false); setZapTargetCharity(null); }}
  isCharityDonation={true}
  charityId={zapTargetCharity?.id}
  charityLightningAddress={zapTargetCharity?.lightningAddress}
/>
```

Note: `recipientNpub` accepts Lightning addresses directly — the modal detects the `@` and uses it as-is (see ExternalZapModal lines 97-102).

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: No new errors related to RewardDestinationPicker

- [ ] **Step 5: Commit**

```bash
git add src/components/rewards/RewardDestinationPicker.tsx
git commit -m "Fix: Wire zap icon to ExternalZapModal in destination picker

Replace Alert.alert() stub with actual ExternalZapModal. Users can
now tip charities and projects directly from the destination picker
via QR code, Cash App, Strike, or any Lightning wallet."
```

---

### Task 4: Feed Zap — ExternalZapModal for All Users

**Files:**
- Modify: `src/components/social/SocialInteractionRow.tsx`

- [ ] **Step 1: Add ExternalZapModal import and state**

Add imports:
```typescript
import { ExternalZapModal } from '../nutzap/ExternalZapModal';
```

Add state inside the component, after existing state declarations:
```typescript
const [showZapModal, setShowZapModal] = useState(false);
```

- [ ] **Step 2: Replace handleZap to open modal**

Replace the existing `handleZap` function (lines 50-61) with:

```typescript
const handleZap = useCallback(() => {
  setShowZapModal(true);
}, []);
```

This removes the debounce/service call and simply opens the modal.

- [ ] **Step 3: Add ExternalZapModal JSX**

The component currently returns a `<View>` with the interaction row. Wrap the return in a fragment and add the modal. Replace the return statement (lines 85-116):

```tsx
return (
  <>
    <View style={styles.row}>
      <TouchableOpacity style={styles.action} onPress={handleLike} activeOpacity={0.7}>
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={20}
          color={isLiked ? theme.colors.orangeDeep : theme.colors.textMuted}
        />
        {likeCount > 0 && <Text style={[styles.count, isLiked && styles.countActive]}>{formatCount(likeCount)}</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.action} onPress={handleZap} activeOpacity={0.7}>
        <Animated.View style={{ transform: [{ scale: zapFlash }] }}>
          <Ionicons name="flash-outline" size={20} color={theme.colors.textMuted} />
        </Animated.View>
        {zapTotal > 0 && <Text style={styles.count}>{formatCount(zapTotal)}</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.action} onPress={handleRepost} activeOpacity={0.7} disabled={isReposted}>
        <Ionicons
          name={isReposted ? 'repeat' : 'repeat-outline'}
          size={20}
          color={isReposted ? theme.colors.orangeDeep : theme.colors.textMuted}
        />
        {repostCount > 0 && <Text style={[styles.count, isReposted && styles.countActive]}>{formatCount(repostCount)}</Text>}
      </TouchableOpacity>

      <View style={styles.action}>
        <Ionicons name="chatbubble-outline" size={20} color={theme.colors.textMuted} style={{ opacity: 0.4 }} />
      </View>
    </View>

    <ExternalZapModal
      visible={showZapModal}
      recipientNpub={post.npub}
      recipientName={post.author_name || 'Unknown'}
      onClose={() => setShowZapModal(false)}
      onSuccess={() => setShowZapModal(false)}
    />
  </>
);
```

The modal will fetch the author's Lightning address from their Nostr kind 0 profile via `resolveLightningAddress()` (ExternalZapModal line 198-228). No Lightning address needs to be passed — just the npub.

- [ ] **Step 4: Clean up unused imports**

Remove the `SocialInteractionService` import (line 7) since `handleZap` no longer calls it directly.

Wait — `SocialInteractionService` is still used by `handleLike` and `handleRepost`. Keep it.

The `zapFlash` animated value is still used for the icon animation display, so keep it too.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: No new errors related to SocialInteractionRow

- [ ] **Step 6: Commit**

```bash
git add src/components/social/SocialInteractionRow.tsx
git commit -m "Fix: Feed zap opens ExternalZapModal instead of direct service

Users can now zap feed post authors via QR code, Cash App, Strike,
or any Lightning wallet. No connected wallet required. Modal fetches
author's Lightning address from their Nostr profile."
```

---

### Task 5: Final Verification

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: No new errors introduced by these changes

- [ ] **Step 2: Commit any remaining fixes if typecheck reveals issues**
