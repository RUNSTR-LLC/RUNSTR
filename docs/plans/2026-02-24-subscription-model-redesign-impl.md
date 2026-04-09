# Subscription Model Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update subscription economics (10x boost, 15k/21k pricing, 5/week cap) and reframe the subscription modal with a clean, non-adversarial value proposition.

**Architecture:** Config-driven changes — update `REWARD_CONFIG` constants, then update the two UI files that reference them. The modal gets a structural overhaul (remove bet section, remove boost requirements, update features/pricing). The rewards screen gets a text update.

**Tech Stack:** React Native, TypeScript, REWARD_CONFIG constants

---

### Task 1: Update reward config constants

**Files:**
- Modify: `src/config/rewards.ts`

**Step 1: Update the constants**

Open `src/config/rewards.ts` and make these changes:

Replace the boosted rewards section (lines 53-60):

```typescript
  /**
   * Boosted Rewards (Supporter/Pro subscribers)
   * Subscribers earn 1000 sats per qualifying workout instead of 100
   * Up to 5 boosted workouts per week, then base rate applies
   * Qualifications: running, walking, cycling, pushups, journal, 5k+ steps
   */
  BOOSTED_WORKOUT_REWARD: 1000,           // sats per boosted workout
  BOOSTED_MAX_PER_WEEK: 5,               // max boosted workouts per week
```

Note: DELETE the old `BOOSTED_MIN_DISTANCE_METERS` and `BOOSTED_MIN_DURATION` lines entirely. They are no longer needed.

Replace the subscription pricing section (lines 62-66):

```typescript
  /**
   * Subscription Pricing (display only - payment via runstr.club/pro/)
   */
  SUPPORTER_PRICE_SATS: 15000,           // 15k sats/month
  PRO_PRICE_SATS: 21000,                 // 21k sats/month
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: May show errors in files that reference the removed constants (`BOOSTED_MIN_DISTANCE_METERS`, `BOOSTED_MIN_DURATION`). Note these files for Task 2.

**Step 3: Commit**

```bash
git add src/config/rewards.ts
git commit -m "Feature: Update subscription economics — 10x boost, 15k/21k pricing, 5/week cap"
```

---

### Task 2: Fix any references to removed constants

**Files:**
- Potentially: any file that references `BOOSTED_MIN_DISTANCE_METERS` or `BOOSTED_MIN_DURATION`

**Step 1: Search for references**

Run: `grep -r "BOOSTED_MIN_DISTANCE\|BOOSTED_MIN_DURATION" src/`

If any files reference these removed constants, remove or update those references. These were boost qualification checks that are no longer needed since all qualifying activities (running, walking, cycling, pushups, journal, 5k+ steps) earn the boost without distance/duration requirements.

Do NOT remove the qualification logic from backend/edge functions — this task is display-only. Just remove references in config imports and UI code.

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No new errors related to removed constants.

**Step 3: Commit (if changes needed)**

```bash
git add -A
git commit -m "Fix: Remove references to deleted boost qualification constants"
```

---

### Task 3: Overhaul SubscriptionInfoModal

**Files:**
- Modify: `src/components/subscription/SubscriptionInfoModal.tsx`

This is the big change. Read the entire file first.

**Step 1: Update the feature lists (lines 36-47)**

Replace `SUPPORTER_FEATURES`:

```typescript
const SUPPORTER_FEATURES: TierFeature[] = [
  { icon: 'flash-outline', label: `${REWARD_CONFIG.BOOSTED_WORKOUT_REWARD.toLocaleString()} rewards per workout (10x boost)` },
  { icon: 'calendar-outline', label: `Up to ${REWARD_CONFIG.BOOSTED_MAX_PER_WEEK} boosted workouts per week` },
  { icon: 'trophy-outline', label: 'Season access' },
];
```

Replace `PRO_FEATURES`:

```typescript
const PRO_FEATURES: TierFeature[] = [
  { icon: 'flash-outline', label: `${REWARD_CONFIG.BOOSTED_WORKOUT_REWARD.toLocaleString()} rewards per workout (10x boost)` },
  { icon: 'calendar-outline', label: `Up to ${REWARD_CONFIG.BOOSTED_MAX_PER_WEEK} boosted workouts per week` },
  { icon: 'trophy-outline', label: 'Season access' },
  { icon: 'people-outline', label: 'Create clubs' },
  { icon: 'calendar-outline', label: 'Create events' },
];
```

Note: The second `calendar-outline` in Pro is intentional (events icon).

**Step 2: Update the intro text function (lines 49-67)**

Replace the entire `getIntroText` function:

```typescript
function getIntroText(feature: string, currentTier?: SubscriptionTier): string {
  if (currentTier === 'supporter') {
    if (feature === 'event' || feature === 'team') {
      return 'Upgrade to Pro to unlock club and event creation. You already get 10x boosted rewards and season access!';
    }
    return 'You\'re a Supporter! Upgrade to Pro for club and event creation.';
  }

  switch (feature) {
    case 'event':
      return 'Creating events requires a Pro subscription. Choose a plan to get started with boosted rewards and more.';
    case 'team':
      return 'Creating clubs requires a Pro subscription. Choose a plan to unlock boosted rewards and more.';
    case 'season':
      return `Season access requires a Supporter subscription or above. Earn ${REWARD_CONFIG.BOOSTED_WORKOUT_REWARD.toLocaleString()} rewards per qualifying workout!`;
    default:
      return `Subscribe and earn 10x more rewards per workout. Perfect for anyone who works out 3-4 times a week.`;
  }
}
```

**Step 3: Remove the "bet section" from the JSX**

Find and DELETE this entire block (lines 117-123 in the JSX, inside the ScrollView after the intro):

```tsx
              {/* The Bet */}
              <View style={styles.betSection}>
                <Ionicons name="fitness-outline" size={20} color={theme.colors.accent} />
                <Text style={styles.betText}>
                  The fitness bet: work out 3x/week to break even, 5x/week to profit. RUNSTR bets you won't.
                </Text>
              </View>
```

**Step 4: Remove the "Boost Requirements" section from the JSX**

Find and DELETE this entire block (after the Pro tier card, before `</ScrollView>`):

```tsx
              {/* Boost Requirements */}
              <View style={styles.requirementsSection}>
                <Text style={styles.requirementsTitle}>Boost Requirements</Text>
                <Text style={styles.requirementsText}>
                  Qualifying workouts must be cardio (run/walk/cycle), 2km+ distance, 15+ minutes, and tracked via GPS or health app (no manual entry).
                </Text>
              </View>
```

**Step 5: Remove the unused styles**

Delete these style definitions from `StyleSheet.create`:

- `betSection`
- `betText`
- `requirementsSection`
- `requirementsTitle`
- `requirementsText`

**Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: PASS, no new errors.

**Step 7: Commit**

```bash
git add src/components/subscription/SubscriptionInfoModal.tsx
git commit -m "Feature: Redesign subscription modal — 10x boost, clean framing, no bet section"
```

---

### Task 4: Update RewardsScreen subscription card text

**Files:**
- Modify: `src/screens/RewardsScreen.tsx`

**Step 1: Update the "8x" references to "10x"**

Read the file. Find the subscription status card section. There are references to "8x" in the upsell and confirmation text. Update them:

Find text like:
```
Supporters earn {REWARD_CONFIG.BOOSTED_WORKOUT_REWARD} rewards per workout — 8x more for every session.
```
Change `8x` to `10x`.

Find text like:
```
{subscriptionTier === 'pro' ? 'Pro' : 'Supporter'} plan active. You earn 8x more rewards for every workout.
```
Change `8x` to `10x`.

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

**Step 3: Commit**

```bash
git add src/screens/RewardsScreen.tsx
git commit -m "Feature: Update rewards card to reflect 10x boost"
```

---

### Task 5: Final verification

**Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: No new errors.

**Step 2: Verify config values**

Read `src/config/rewards.ts` and confirm:
- `BOOSTED_WORKOUT_REWARD: 1000`
- `BOOSTED_MAX_PER_WEEK: 5`
- `SUPPORTER_PRICE_SATS: 15000`
- `PRO_PRICE_SATS: 21000`
- No `BOOSTED_MIN_DISTANCE_METERS` or `BOOSTED_MIN_DURATION`

**Step 3: Visual verification in simulator**

Check:
- Rewards page subscription card says "1,000 rewards per workout" and "10x"
- "Learn More" opens modal with new framing
- No "bet" section in modal
- No "Boost Requirements" section in modal
- Supporter shows 15,000 sats/month
- Pro shows 21,000 sats/month
- Feature lists show "10x boost" and "Up to 5 boosted workouts per week"
