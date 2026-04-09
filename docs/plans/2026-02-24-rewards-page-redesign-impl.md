# Rewards Page Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the "How It Works" box with a subscription status card that shows free users their reward rate + upsell, and shows subscribers their boosted status.

**Architecture:** Inline changes to `RewardsScreen.tsx` — remove old JSX/styles, add subscription tier state, render new card with two variants. Fix stale reward amounts in `SubscriptionInfoModal.tsx`.

**Tech Stack:** React Native, TypeScript, SubscriptionService, REWARD_CONFIG constants

---

### Task 1: Fix stale reward amount in SubscriptionInfoModal

**Files:**
- Modify: `src/components/subscription/SubscriptionInfoModal.tsx:65`

**Step 1: Fix the hardcoded "50 to 800" text**

In `src/components/subscription/SubscriptionInfoModal.tsx`, line 65, change:

```typescript
// OLD:
return 'Subscribe to RUNSTR to boost your workout rewards from 50 to 800 sats per workout.';

// NEW:
return `Subscribe to RUNSTR to boost your workout rewards from ${REWARD_CONFIG.DAILY_WORKOUT_REWARD} to ${REWARD_CONFIG.BOOSTED_WORKOUT_REWARD} sats per workout.`;
```

`REWARD_CONFIG` is already imported at line 21.

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS, no errors related to this file.

**Step 3: Commit**

```bash
git add src/components/subscription/SubscriptionInfoModal.tsx
git commit -m "Fix: Use REWARD_CONFIG constants in SubscriptionInfoModal"
```

---

### Task 2: Add subscription tier state to RewardsScreen

**Files:**
- Modify: `src/screens/RewardsScreen.tsx`

**Step 1: Add imports**

At the top of `RewardsScreen.tsx`, add these imports after the existing import block (after line 47):

```typescript
import { SubscriptionService } from '../services/backend/SubscriptionService';
import type { SubscriptionTier } from '../services/backend/SubscriptionService';
import { SubscriptionInfoModal } from '../components/subscription/SubscriptionInfoModal';
import { REWARD_CONFIG } from '../config/rewards';
```

**Step 2: Add state variables**

Inside `RewardsScreenComponent`, after the existing state declarations (after line 101, near the other state vars), add:

```typescript
// Subscription tier state
const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free');
const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
```

**Step 3: Load subscription tier in the existing useFocusEffect**

Find the existing `useFocusEffect` callback that loads settings (around line 149). Inside the `loadSettings` function body, add at the end:

```typescript
// Load subscription tier
const npub = await AsyncStorage.getItem('@runstr:npub');
if (npub) {
  const tier = await SubscriptionService.getSubscriptionTier(npub);
  setSubscriptionTier(tier);
}
```

**Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS. The new state and imports compile. The modal/config aren't used in JSX yet but that's fine — no unused variable errors since they'll be used in Task 3.

**Step 5: Commit**

```bash
git add src/screens/RewardsScreen.tsx
git commit -m "Feature: Add subscription tier detection to RewardsScreen"
```

---

### Task 3: Replace "How It Works" with Subscription Status Card

**Files:**
- Modify: `src/screens/RewardsScreen.tsx`

**Step 1: Remove the "How It Works" JSX block**

Delete lines 362-389 (the entire `{/* How It Works Section */}` block). That is:

```tsx
{/* How It Works Section */}
<View style={styles.howItWorksCard}>
  ...everything inside...
</View>
```

**Step 2: Add the new Subscription Status Card + kept description text**

In the same location (after `RewardDestinationSection`, before the Active Pledge section), add:

```tsx
{/* Subscription Status Card */}
<View style={styles.subscriptionCard}>
  <Text style={styles.subscriptionCardTitle}>YOUR REWARDS</Text>

  <View style={styles.subscriptionRateRow}>
    <Ionicons name="flash" size={18} color="#FF9D42" />
    <Text style={styles.subscriptionRateText}>
      {subscriptionTier !== 'free'
        ? `${REWARD_CONFIG.BOOSTED_WORKOUT_REWARD} rewards per workout`
        : `${REWARD_CONFIG.DAILY_WORKOUT_REWARD} rewards per workout`}
    </Text>
    {subscriptionTier !== 'free' && (
      <View style={styles.boostedBadge}>
        <Text style={styles.boostedBadgeText}>Boosted</Text>
      </View>
    )}
  </View>

  {subscriptionTier === 'free' ? (
    <>
      <View style={styles.subscriptionDivider} />
      <Text style={styles.subscriptionUpsellText}>
        Supporters earn {REWARD_CONFIG.BOOSTED_WORKOUT_REWARD} rewards per workout — 8x more for every session.
      </Text>
      <TouchableOpacity
        style={styles.learnMoreButton}
        onPress={() => setShowSubscriptionModal(true)}
      >
        <Text style={styles.learnMoreText}>Learn More</Text>
      </TouchableOpacity>
    </>
  ) : (
    <Text style={styles.subscriptionConfirmText}>
      {subscriptionTier === 'pro' ? 'Pro' : 'Supporter'} plan active. You earn 8x more rewards for every workout.
    </Text>
  )}
</View>

{/* Reward description */}
<Text style={styles.rewardDescription}>
  {isPPQTeam(selectedTeamId ?? undefined)
    ? t('howItWorksDescriptionPPQ', { defaultValue: 'Cardio, strength, journal, or 5k steps daily to earn AI credits. Rewards go directly to your PPQ.AI account.' })
    : isSelfTeam(selectedTeamId ?? undefined)
      ? t('howItWorksDescriptionSelf', { defaultValue: 'Cardio, strength, journal, or 5k steps daily. Rewards are sent directly to your Lightning wallet.' })
      : t('howItWorksDescriptionCharity', { defaultValue: `Cardio, strength, journal, or 5k steps daily. Micro donations are sent to ${selectedTeam?.name || 'your selected charity'}.` })}
</Text>
```

**Step 3: Add the SubscriptionInfoModal to the modals section**

Find the modals section (after `</ScrollView>`, around line 401+). Add before the closing fragment or after the last modal:

```tsx
{/* Subscription Info Modal */}
<SubscriptionInfoModal
  visible={showSubscriptionModal}
  onClose={() => setShowSubscriptionModal(false)}
  feature="general"
  currentTier={subscriptionTier}
/>
```

**Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS. May have warnings about unused styles (handled in Task 4).

**Step 5: Commit**

```bash
git add src/screens/RewardsScreen.tsx
git commit -m "Feature: Replace How It Works with subscription status card"
```

---

### Task 4: Update styles — remove old, add new

**Files:**
- Modify: `src/screens/RewardsScreen.tsx`

**Step 1: Remove old "How It Works" styles**

Delete these style definitions from the `StyleSheet.create` block (lines 783-825):

- `howItWorksCard`
- `howItWorksTitle`
- `rewardRow`
- `rewardTextSection`
- `rewardLabel`
- `rewardValue`
- `howItWorksDescription`

**Step 2: Add new styles**

Add these styles in the same `StyleSheet.create` block (where the old ones were):

```typescript
// Subscription status card styles
subscriptionCard: {
  backgroundColor: '#0a0a0a',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#1a1a1a',
  padding: 16,
  marginBottom: 8,
},
subscriptionCardTitle: {
  fontSize: 12,
  fontWeight: theme.typography.weights.bold,
  color: '#FF9D42',
  letterSpacing: 1,
  marginBottom: 14,
},
subscriptionRateRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},
subscriptionRateText: {
  fontSize: 16,
  fontWeight: theme.typography.weights.semibold,
  color: '#fff',
  flex: 1,
},
boostedBadge: {
  backgroundColor: 'rgba(255, 157, 66, 0.15)',
  borderRadius: 8,
  paddingHorizontal: 10,
  paddingVertical: 4,
},
boostedBadgeText: {
  fontSize: 12,
  fontWeight: theme.typography.weights.bold,
  color: '#FF9D42',
},
subscriptionDivider: {
  height: 1,
  backgroundColor: '#1a1a1a',
  marginVertical: 14,
},
subscriptionUpsellText: {
  fontSize: 13,
  color: '#888',
  lineHeight: 19,
  marginBottom: 12,
},
learnMoreButton: {
  alignSelf: 'center',
  paddingVertical: 8,
  paddingHorizontal: 20,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#FF9D42',
},
learnMoreText: {
  fontSize: 13,
  fontWeight: theme.typography.weights.semibold,
  color: '#FF9D42',
},
subscriptionConfirmText: {
  fontSize: 13,
  color: '#888',
  marginTop: 8,
  lineHeight: 19,
},
rewardDescription: {
  fontSize: 12,
  color: '#888',
  marginBottom: 12,
  lineHeight: 18,
  paddingHorizontal: 4,
},
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS, no errors.

**Step 4: Commit**

```bash
git add src/screens/RewardsScreen.tsx
git commit -m "Refactor: Replace How It Works styles with subscription card styles"
```

---

### Task 5: Final verification

**Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: PASS, zero errors.

**Step 2: Visual verification**

Run the app in the simulator and navigate to the Rewards tab. Verify:
- "How It Works" box is gone
- Subscription status card shows "YOUR REWARDS" header
- Free users see "100 rewards per workout" + upsell + "Learn More" button
- "Learn More" opens the subscription info modal
- Grey description text appears below the card
- Card styling matches existing dark cards on the page

**Step 3: Commit (if any tweaks needed)**

Only if visual adjustments were required.
