# Rewards Page Redesign

**Date:** 2026-02-24
**Status:** Approved

## Problem

The rewards page "How It Works" section has outdated info (50 sats for steps instead of 100), uses emojis that feel cluttered, and doesn't serve users well. The page needs content that's both informative and drives subscription growth.

## Changes

### 1. Remove "How It Works" box

Delete the entire bordered card: title, emoji/icon rows with reward amounts, everything inside the `howItWorksCard` view.

**Keep** the grey destination-aware description text that was at the bottom of the box. Move it to stand alone below the new Subscription Status Card.

### 2. Add Subscription Status Card

Replaces the "How It Works" position. Two states based on user's subscription tier:

**Free users — Upsell:**
- Section header: "YOUR REWARDS" (orange, matching existing headers)
- Dark card with 1px #333 border (matching existing card style)
- Shows current reward rate: "100 rewards per workout" with lightning icon
- Subtle divider line
- Upsell text in grey: "Supporters earn 800 rewards per workout — 8x more for every session."
- "Learn More" button opens existing `SubscriptionInfoModal` with `feature='general'`

**Subscribers — Status confirmation:**
- Same card style
- Shows boosted rate: "800 rewards per workout" with "Boosted" orange pill badge
- Confirmation text: "Supporter plan active. You earn 8x more rewards for every workout."

### 3. Fix stale reward references

- `SubscriptionInfoModal.tsx` line 65: "from 50 to 800" → "from 100 to 800"
- Use `REWARD_CONFIG` constants for all reward amounts (no hardcoded values)

## Page order (after changes)

1. Rewards Pool (with info icon)
2. Sponsor Banner ("Rewards brought to you by RUNSTR")
3. Your Earnings (EarningsHeroCard or ImpactHeroCard)
4. Reward Destination section
5. **Subscription Status Card** (new)
6. Grey description text (kept, destination-aware)
7. Active Pledge (if applicable)

## Technical details

- **File:** `src/screens/RewardsScreen.tsx` — remove "How It Works", add new card inline
- **Subscription detection:** `SubscriptionService.getSubscriptionTier(npub)` — already available
- **Reward constants:** `REWARD_CONFIG.DAILY_WORKOUT_REWARD` (100), `REWARD_CONFIG.BOOSTED_WORKOUT_REWARD` (800)
- **Modal reuse:** `SubscriptionInfoModal` already exists and handles tier display
- **Styling:** Match existing dark card pattern with orange accents
