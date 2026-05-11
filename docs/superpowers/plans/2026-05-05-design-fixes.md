# Design Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the live (non-dead-code) findings from the 2026-05-05 design review, scoped to surfaces reachable from Home, Social, and History tabs.

**Explicit non-goals:**
- Do NOT add titles to the top of any screen (preserve current minimalist back-button-only headers).
- Do NOT touch `LevelDetailScreen`, `AdvancedAnalyticsScreen`, or `FitnessTestResultsScreen` — per user, those features have been removed from the app and any nav paths to them are dead in practice.
- Minimize changes to `DynamicEventDetailScreen` — only the single-line red→error color fix; user flagged this screen as the riskiest to touch.

**What is SafeAreaView?** It's a wrapper component that adds padding so content doesn't overlap the iPhone notch / status bar / home indicator. The version in `react-native` core works inconsistently on Android; the `react-native-safe-area-context` version is more reliable. The migration just swaps imports.

**Architecture:** Pragmatic edits over a refactor. Theme/style sweeps use Edit's exact-match replacement; structural fixes (registering Comments route, swapping inline buttons for `Card`) are per-file. Verification is `npm run typecheck` between commits and a simulator pass at the end.

**Tech Stack:** React Native + TypeScript (Expo), `theme.ts` design tokens, `react-native-safe-area-context`, `expo-haptics`, existing `Card`/`Button`/`Avatar`/`LoadingStates` UI primitives.

---

## Phase 1 — Broken UX

### Task 1: Register `Comments` route in `AuthenticatedNavigator`

**Why:** `InlineCommentList.tsx:151` calls `navigation.navigate('Comments', ...)` from inside the Social feed, but `Comments` is only registered in `AppNavigator` (the unauthenticated stack). Tapping a comment count from the Social tab today produces a nav warning and does nothing.

**Risk note:** This is purely additive — registering a screen in a navigator can only enable a route, never break existing ones. Low risk.

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add `CommentsScreen` import**

In `src/App.tsx`, add alongside the other screen imports near line 217:

```ts
import { CommentsScreen } from './screens/CommentsScreen';
```

- [ ] **Step 2: Add `Comments` to `AuthenticatedStackParamList`**

In `src/App.tsx` around line 254-293, add to the param type:

```ts
Comments: { postId: string; postEventId: string; postAuthorPubkey: string; commentCount: number };
```

- [ ] **Step 3: Register the screen**

After the `ClubPage` screen registration (around line 622-631), add:

```tsx
{/* Comments Screen - Full-screen comment view */}
<AuthenticatedStack.Screen
  name="Comments"
  options={{ headerShown: false }}
  component={CommentsScreen as any}
/>
```

- [ ] **Step 4: Verify typecheck and commit**

```bash
npm run typecheck
git add src/App.tsx
git commit -m "Fix: Register Comments route in AuthenticatedNavigator"
```

Sim check: open Social feed, tap a comment count on any post, confirm CommentsScreen pushes.

---

### Task 2: Wrap `ProfileScreen` in `SafeAreaView`

**Why:** `ProfileScreen.tsx` is the only tab root without `SafeAreaView`; on notched devices the status bar can collide with the header.

**Files:**
- Modify: `src/screens/ProfileScreen.tsx`

- [ ] **Step 1: Confirm current state**

```bash
grep -n "SafeAreaView\|TexturedBackground" src/screens/ProfileScreen.tsx | head -10
```

- [ ] **Step 2: Add the import**

Add at the top of the file:

```ts
import { SafeAreaView } from 'react-native-safe-area-context';
```

- [ ] **Step 3: Wrap the root return**

Find the outermost `<View>` (or `<TexturedBackground>`) returned from `ProfileScreen` and wrap it in:

```tsx
<SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
  ...existing content...
</SafeAreaView>
```

Match the pattern in `src/screens/SocialScreen.tsx` (which uses `edges={['top']}`).

- [ ] **Step 4: Verify and commit**

```bash
npm run typecheck
git add src/screens/ProfileScreen.tsx
git commit -m "Fix: Wrap ProfileScreen in SafeAreaView edges=top"
```

Sim check on a notched device: confirm header is no longer under the status bar.

---

### Task 3: Replace red `#ff4444` with `theme.colors.error` in `DynamicEventDetailScreen`

**Why:** Single-line brand violation (red error → orange-themed error).

**Risk note:** Single-line color swap on a screen the user flagged as risky to touch. This task is intentionally minimal — no other edits to this file.

**Files:**
- Modify: `src/screens/events/DynamicEventDetailScreen.tsx:1392`

- [ ] **Step 1: Confirm location**

```bash
grep -n "#ff4444\|#FF4444" src/screens/events/DynamicEventDetailScreen.tsx
```

- [ ] **Step 2: Replace**

In the file, change:

```ts
color: '#ff4444',
```

to:

```ts
color: theme.colors.error,
```

(Confirm `theme` is already imported in this file before saving; if not, add `import { theme } from '../../styles/theme';` at the top.)

- [ ] **Step 3: Verify and commit**

```bash
npm run typecheck
git add src/screens/events/DynamicEventDetailScreen.tsx
git commit -m "Fix: Use theme.colors.error instead of #ff4444"
```

---

### Task 4: Add `accessibilityLabel`, `activeOpacity`, and haptics to tracker controls

**Why:** Pause/Resume/Stop are the most-pressed buttons in the app; currently they have no a11y label, no `activeOpacity`, and no haptic feedback.

**Files:**
- Modify: `src/screens/activity/RunningTrackerScreen.tsx:961-984`
- Modify: `src/screens/activity/WalkingTrackerScreen.tsx`
- Modify: `src/screens/activity/CyclingTrackerScreen.tsx`
- Modify: `src/screens/activity/HikingTrackerScreen.tsx`

- [ ] **Step 1: Confirm `expo-haptics` is already imported in RunningTrackerScreen**

```bash
grep -n "expo-haptics" src/screens/activity/RunningTrackerScreen.tsx
```

If not present, add `import * as Haptics from 'expo-haptics';` at the top.

- [ ] **Step 2: Patch RunningTrackerScreen.tsx Pause/Resume/Stop**

For each TouchableOpacity at lines 961, 968, 979, add the three props. Example for Pause:

```tsx
<TouchableOpacity
  style={styles.pauseButton}
  onPress={() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handlePause();
  }}
  activeOpacity={0.7}
  accessibilityLabel="Pause workout"
  accessibilityRole="button"
>
```

Apply the same pattern to Resume (`accessibilityLabel="Resume workout"`) and Stop (`accessibilityLabel="Stop workout"` plus `Haptics.ImpactFeedbackStyle.Medium` since stop is more consequential).

Keep the existing `onPress` handler — wrap it, don't replace it.

- [ ] **Step 3: Apply same pattern to Walking/Cycling/Hiking trackers**

Find each tracker's pause/resume/stop button block and apply the same three-prop addition. Each tracker has the same pattern but the surrounding code may differ — match the local style.

- [ ] **Step 4: Verify and commit**

```bash
npm run typecheck
git add src/screens/activity/
git commit -m "Fix: Add a11y label, activeOpacity, and haptics to tracker controls"
```

Sim check: start each tracker (Run/Walk/Cycle/Hike), tap Pause/Resume/Stop, confirm haptic + visual press response.

---

### Task 5: Rename `RewardsScreen` "Change" button to match its actual behavior

**Why:** The button at `RewardsScreen.tsx:321` opens `LightningAddressSetupModal` — it does not open a destination picker (which doesn't exist). The label is a lie.

**Files:**
- Modify: `src/components/rewards/RewardDestinationSection.tsx` (label text — find what `onChangePress` renders)

- [ ] **Step 1: Inspect `RewardDestinationSection`**

```bash
grep -n "Change\|onChangePress\|button" src/components/rewards/RewardDestinationSection.tsx | head -20
```

Identify the rendered button label tied to `onChangePress`.

- [ ] **Step 2: Update the label**

Change the rendered string from `"Change"` to `"Edit Lightning Address"` (or `"Set Up"` when no address is configured — check the conditional in the component). Intent: the button opens the Lightning setup modal, so name it accordingly.

- [ ] **Step 3: Verify and commit**

```bash
npm run typecheck
git add src/components/rewards/RewardDestinationSection.tsx
git commit -m "Fix: Rename 'Change' to 'Edit Lightning Address' to match button behavior"
```

---

### Task 6: Add "View Rewards" link to `WorkoutSummaryModal`

**Why:** Post-workout, the user has no path back to the Rewards screen and no indication that rewards process asynchronously. New users never learn rewards exist.

**Files:**
- Modify: `src/components/activity/WorkoutSummaryModal.tsx`

- [ ] **Step 1: Read modal action area (around lines 776-818)**

```bash
sed -n '770,825p' src/components/activity/WorkoutSummaryModal.tsx
```

- [ ] **Step 2: Add a tertiary text link**

Below the existing action area, add a small TouchableOpacity that navigates to `Rewards`:

```tsx
<TouchableOpacity
  onPress={() => {
    onClose();
    navigation.navigate('Rewards');
  }}
  activeOpacity={0.7}
  accessibilityLabel="View rewards"
  accessibilityRole="button"
  style={{ alignSelf: 'center', paddingVertical: 8 }}
>
  <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
    View Rewards →
  </Text>
</TouchableOpacity>
```

If `navigation` is not already passed in, accept it as a prop from the parent tracker screens (which already use `useNavigation()`); pass it into `<WorkoutSummaryModal navigation={navigation} ... />` from each tracker that mounts the modal.

- [ ] **Step 3: Wire navigation prop in each tracker**

```bash
grep -rn "<WorkoutSummaryModal" src/screens/activity/ src/components/
```

For each call site, add the `navigation` prop (each tracker already has `useNavigation()` in scope).

- [ ] **Step 4: Verify and commit**

```bash
npm run typecheck
git add src/components/activity/WorkoutSummaryModal.tsx src/screens/activity/
git commit -m "Feature: Add View Rewards link to WorkoutSummaryModal"
```

Sim check: complete a tracked workout, tap "View Rewards", confirm navigation to RewardsScreen.

---

### Task 7: Add Rewards entry to `SettingsScreen`

**Why:** Rewards/destination is core to product identity. Currently only reachable via the earnings badge on `ProfileHero`. Settings should also surface it.

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`
- Possibly modify: `src/screens/useSettingsState.ts` (if it owns navigation handlers)

- [ ] **Step 1: Inspect existing section structure**

```bash
sed -n '85,160p' src/screens/SettingsScreen.tsx
```

- [ ] **Step 2: Add a Rewards row**

Above `SupportLegalSection`, add a row that navigates to `Rewards`. Match the visual pattern of the surrounding rows (likely a `TouchableOpacity` with icon + label). Use the existing settings row component if one exists in the file or `src/components/settings/`. Example:

```tsx
<TouchableOpacity
  onPress={() => navigation.navigate('Rewards')}
  activeOpacity={0.7}
  accessibilityLabel="Rewards and Lightning address"
  accessibilityRole="button"
  style={settingsRowStyles.row}
>
  <Ionicons name="flash-outline" size={20} color={theme.colors.text} />
  <Text style={settingsRowStyles.label}>Rewards</Text>
  <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
</TouchableOpacity>
```

(Match the actual style hooks used by the surrounding sections; do not invent new ones.)

- [ ] **Step 3: Verify and commit**

```bash
npm run typecheck
git add src/screens/SettingsScreen.tsx src/screens/useSettingsState.ts
git commit -m "Feature: Add Rewards entry to Settings"
```

---

## Phase 2 — Remove white from share modals (HIGH PRIORITY per user)

These three files are mounted from the workout tabs (Home tab) and from `WorkoutSummaryModal` post-workout. They are the most visible brand violations because users post the rendered cards publicly.

### Task 8: Replace `#fff` and `rgba(255,255,255,...)` in `FullScreenCardModal.tsx`

**Files:**
- Modify: `src/components/profile/shared/FullScreenCardModal.tsx`

- [ ] **Step 1: List all violations**

```bash
grep -n "'#fff'\|\"#fff\"\|#FFFFFF\|'white'\|rgba(255,255,255" src/components/profile/shared/FullScreenCardModal.tsx
```

Expected hits at lines ~658, 673, 678, 680, 681, 682, 683, 687, 689, 773, 817, 841.

- [ ] **Step 2: Replace text colors**

For each `color: '#fff'` in a `Text` style, replace with `color: theme.colors.text` (the orange `#FFB366` that is RUNSTR's primary text).

- [ ] **Step 3: Replace decorative `backgroundColor: '#fff'`**

The `toughUnderline` at line ~682 (`backgroundColor: '#fff'`) — replace with `backgroundColor: theme.colors.text`.

- [ ] **Step 4: Replace the `#FF3333` brand bar**

At line ~678, replace `backgroundColor: '#FF3333'` with `backgroundColor: theme.colors.orangeBurnt`.

- [ ] **Step 5: Replace `rgba(255,255,255,X)` opacity backgrounds**

Replace with `theme.colors.textMuted` for secondary surfaces, or remove the rgba entirely if it's a decorative effect that no longer reads on orange.

- [ ] **Step 6: Verify, sim-check, commit**

```bash
npm run typecheck
```

Sim check: open a workout, generate the card, visually confirm orange text replaces white.

```bash
git add src/components/profile/shared/FullScreenCardModal.tsx
git commit -m "Fix: Replace #fff with theme tokens in FullScreenCardModal"
```

---

### Task 9: Replace `#fff` and `rgba(255,255,255,...)` in `FullScreenVerticalCard.tsx`

**Files:**
- Modify: `src/components/profile/shared/FullScreenVerticalCard.tsx`

- [ ] **Step 1: List violations**

```bash
grep -n "'#fff'\|\"#fff\"\|#FFFFFF\|'white'\|rgba(255,255,255" src/components/profile/shared/FullScreenVerticalCard.tsx
```

Expected: text colors at lines ~297, 314, 348; rgba at ~303, 320, 327, 342, 358, 375.

- [ ] **Step 2: Replace `#fff` text colors with `theme.colors.text`**

- [ ] **Step 3: Replace `rgba(255,255,255,X)` with `theme.colors.textMuted`**

- [ ] **Step 4: Verify and commit**

```bash
npm run typecheck
git add src/components/profile/shared/FullScreenVerticalCard.tsx
git commit -m "Fix: Replace #fff with theme tokens in FullScreenVerticalCard"
```

---

### Task 10: Replace `#fff` and `#FF3333` in `EnhancedSocialShareModal.tsx`

**Files:**
- Modify: `src/components/profile/shared/EnhancedSocialShareModal.tsx`

- [ ] **Step 1: List violations**

```bash
grep -n "'#fff'\|\"#fff\"\|#FFFFFF\|'white'\|rgba(255,255,255\|#FF3333" src/components/profile/shared/EnhancedSocialShareModal.tsx
```

Expected: ~8 `color: '#fff'` (lines 728, 737, 871, 877, 917, 949, 970, 984), ~6 rgba (752, 759, 766, 962…), `#FF3333` at 774.

- [ ] **Step 2: Replace text `#fff` → `theme.colors.text`**

- [ ] **Step 3: Replace `#FF3333` → `theme.colors.orangeBurnt`**

- [ ] **Step 4: Replace `rgba(255,255,255,X)` → `theme.colors.textMuted`**

- [ ] **Step 5: Verify, sim check, commit**

```bash
npm run typecheck
```

Sim check: complete workout → tap Post → confirm card preview is orange-on-black.

```bash
git add src/components/profile/shared/EnhancedSocialShareModal.tsx
git commit -m "Fix: Replace #fff and #FF3333 with theme tokens in EnhancedSocialShareModal"
```

---

## Phase 3 — Terminology: "Share" → "Post" everywhere we publish to Nostr

Per CLAUDE.md and user direction: anywhere we post to Nostr, the button/copy should say "Post", not "Share" or "Share Workout".

### Task 11: Rename "Share" to "Post" in workout share buttons and modals

**Files:**
- Modify: `src/components/profile/tabs/HealthConnectTab.tsx:343, 389`
- Modify: `src/components/profile/tabs/AppleHealthTab.tsx:339, 373`
- Modify: `src/components/profile/shared/SocialShareModal.tsx:70, 102, 106, 140`
- Modify: `src/components/activity/WorkoutSummaryModal.tsx:778` (comment only — UI button is already "Post" per audit, verify)
- Modify: `src/components/profile/shared/FullScreenCardModal.tsx:519` (toast text)
- Modify: `src/components/team/LeaderboardShareModal.tsx:297`

- [ ] **Step 1: Audit existing labels**

```bash
grep -rn "'Share'\|\"Share\"\|>Share<\|Share Workout\|share workout" src/components --include="*.tsx" | grep -v "shareBtnText\|shareButtonText\|shareUrl\|onShare\|Share\.share\|FileSystem\|expo-sharing"
```

Confirm the list before editing.

- [ ] **Step 2: Rename button labels**

Replace each user-facing string:

- `<Text>Share</Text>` (in HealthConnectTab line 389, AppleHealthTab line 373, LeaderboardShareModal line 297) → `<Text>Post</Text>`
- `<Text style={styles.title}>Share Workout</Text>` (SocialShareModal line 140) → `<Text style={styles.title}>Post Workout</Text>`

- [ ] **Step 3: Rename error/alert text**

- `'Failed to share workout'` (HealthConnectTab line 343, AppleHealthTab line 339, SocialShareModal lines 102 and 106) → `'Failed to post workout'`
- `'Please log in with your Nostr key to share workouts.'` (SocialShareModal line 70) → `'Please log in to post workouts.'` (also drops the "Nostr key" exposure per CLAUDE.md terminology)

- [ ] **Step 4: Rename toast text**

- `text2: 'Your workout has been shared'` (FullScreenCardModal line 519) → `text2: 'Your workout has been posted'`

- [ ] **Step 5: Update WorkoutSummaryModal comment**

- Line 778 comment `{/* Share Workout - Only visible if WoT > 0 */}` → `{/* Post Workout - Only visible if WoT > 0 */}`

- [ ] **Step 6: Leave style names alone**

Do NOT rename `shareBtnText`, `shareButtonText`, `shareUrl`, `onShare`, `Share.share()` — those are internal/API references. Only the user-visible English copy changes.

- [ ] **Step 7: Verify, sim check, commit**

```bash
npm run typecheck
```

Sim check: open a workout from Home tab → tap Post button (formerly Share) → confirm modal title says "Post Workout" → confirm error states say "Failed to post workout".

```bash
git add src/components/
git commit -m "Refactor: Rename 'Share' to 'Post' in Nostr publish flows (CLAUDE.md terminology)"
```

---

## Phase 4 — SafeAreaView migration (reachable from Home → Settings)

These four screens use `SafeAreaView` from `react-native` core (unreliable on Android). Migrate to `react-native-safe-area-context` (Android-correct version). Three of them are reached via Settings → support links; HealthProfile is reached via the analytics card.

### Task 12: Migrate `HelpSupportScreen`

**Files:**
- Modify: `src/screens/HelpSupportScreen.tsx`

- [ ] **Step 1: Replace import**

At line ~13, remove `SafeAreaView,` from the `react-native` import block. At the top of the file, add:

```ts
import { SafeAreaView } from 'react-native-safe-area-context';
```

- [ ] **Step 2: Add `edges` prop**

At line ~154, change `<SafeAreaView style={styles.container}>` to:

```tsx
<SafeAreaView edges={['top', 'bottom']} style={styles.container}>
```

- [ ] **Step 3: Verify and commit**

```bash
npm run typecheck
git add src/screens/HelpSupportScreen.tsx
git commit -m "Refactor: Migrate HelpSupportScreen to safe-area-context"
```

---

### Task 13: Migrate `ContactSupportScreen`

**Files:**
- Modify: `src/screens/ContactSupportScreen.tsx`

Same migration pattern: remove `SafeAreaView` from `react-native` import at line ~13, add `import { SafeAreaView } from 'react-native-safe-area-context';`, add `edges={['top', 'bottom']}` to the `<SafeAreaView>` at line ~199.

- [ ] **Step 1: Migrate import + add edges**
- [ ] **Step 2: typecheck + commit**

```bash
npm run typecheck
git add src/screens/ContactSupportScreen.tsx
git commit -m "Refactor: Migrate ContactSupportScreen to safe-area-context"
```

---

### Task 14: Migrate `PrivacyPolicyScreen`

**Files:**
- Modify: `src/screens/PrivacyPolicyScreen.tsx`

Same migration at lines ~13 and ~171.

- [ ] **Step 1: Migrate**
- [ ] **Step 2: Commit**

```bash
npm run typecheck
git add src/screens/PrivacyPolicyScreen.tsx
git commit -m "Refactor: Migrate PrivacyPolicyScreen to safe-area-context"
```

---

### Task 15: Migrate `HealthProfileScreen`

**Files:**
- Modify: `src/screens/HealthProfileScreen.tsx`

Two callsites (lines ~114 and ~123 — loading vs loaded states). Both need `edges={['top', 'bottom']}`.

- [ ] **Step 1: Migrate import**
- [ ] **Step 2: Update both callsites**
- [ ] **Step 3: Commit**

```bash
npm run typecheck
git add src/screens/HealthProfileScreen.tsx
git commit -m "Refactor: Migrate HealthProfileScreen to safe-area-context"
```

---

## Phase 5 — Component reuse: `Card` adoption in `RewardsScreen`

### Task 16: Replace inline cards in `RewardsScreen`

**Why:** 5 inline card surfaces using raw `#0a0a0a`/`#1a1a1a`/`#111111` instead of the shared `Card` component.

**Files:**
- Modify: `src/screens/RewardsScreen.tsx:548, 622, 655, 684, 741`

- [ ] **Step 1: Read `Card` API**

```bash
sed -n '1,80p' src/components/ui/Card.tsx
```

- [ ] **Step 2: Replace each inline card**

For each `<View style={styles.card}>` (or similar) where the style defines `backgroundColor: '#0a0a0a'` and a borderRadius, replace the View with `<Card>` and remove the now-unused style block.

- [ ] **Step 3: Replace raw `#111111` and `#888` in same file**

```bash
grep -n "#111\|#888\|#999" src/screens/RewardsScreen.tsx
```

Replace `#111111` with `theme.colors.cardBackground`. Replace `#888`/`#999` text with `theme.colors.textMuted` or `theme.colors.textTertiary` based on context.

- [ ] **Step 4: Verify and commit**

```bash
npm run typecheck
git add src/screens/RewardsScreen.tsx
git commit -m "Refactor: Use Card component and theme tokens in RewardsScreen"
```

---

## Phase 6 — Dead-code memory note

### Task 17: Save dead-code memory note (no deletes)

**Why:** Per user direction, don't ask for confirmation or delete anything — just record what's known so future sessions don't waste time editing dead files.

**Files:**
- Create: `/Users/dakotabrown/.claude/projects/-Users-dakotabrown-runstr-project/memory/project_dead_screens.md`
- Modify: `/Users/dakotabrown/.claude/projects/-Users-dakotabrown-runstr-project/memory/MEMORY.md`

- [ ] **Step 1: Write the memory file**

```markdown
---
name: Dead screens (post-2026-05-05 reachability check)
description: Screens that exist in src/ but have no user-reachable navigation path; ignore when fixing UI/style issues unless explicitly asked.
type: project
---

The following screens are present in `src/` but have no nav path from the Home / Social / History tabs.

**No imports anywhere:**
- `src/screens/ClubsScreen.tsx` — Clubs are surfaced via `ClubsRow` on the Social tab and via `ClubPage` directly. The standalone ClubsScreen is unreachable.
- `src/screens/activity/StepsDisplayScreen.tsx` — Zero imports.

**Registered only in `AppNavigator` (unauthenticated stack), unreachable post-login:**
- `src/screens/WalletScreen.tsx` — In-app wallet was already known dead; this confirms the screen isn't reached from the authenticated flow.

**Registered but the user reports the feature is removed from the app:**
- `src/screens/LevelDetailScreen.tsx`
- `src/screens/AdvancedAnalyticsScreen.tsx`
- `src/screens/FitnessTestResultsScreen.tsx`

**Bypassed by composition:**
- `src/screens/activity/ActivityTrackerScreen.tsx` — `ProfileScreen` embeds `RunningTracker`/`Walking`/`Cycling`/`Hiking` directly, skipping ActivityTrackerScreen entirely.

**How to apply:** When auditing or fixing UI issues, scope work to files reachable from the three bottom tabs. If a finding lands in one of the files above, skip it unless the user asks to revive the feature.
```

- [ ] **Step 2: Add a one-line pointer to MEMORY.md**

In `MEMORY.md` under the existing "## Dead Code" section (alongside `project_in_app_wallet_dead.md`), add:

```markdown
- [Dead screens post-2026-05-05](./project_dead_screens.md) — ClubsScreen, StepsDisplayScreen, WalletScreen, LevelDetailScreen, AdvancedAnalyticsScreen, FitnessTestResultsScreen, ActivityTrackerScreen — skip unless explicitly asked.
```

- [ ] **Step 3: No commit**

This is memory, not source. Do not commit to the runstr.project repo.

---

## Final Verification

### Task 18: End-to-end manual verification on simulator

**Why:** Type checking confirms code correctness, not feature correctness. CLAUDE.md verification protocol requires manual sim checks, and per memory, simulator must be fully erased before each verification run.

- [ ] **Step 1: Erase simulator**

```bash
xcrun simctl shutdown all
xcrun simctl erase all
```

- [ ] **Step 2: Build and launch**

Use the runstr-simulator skill workflow.

- [ ] **Step 3: Walk the verification flows**

1. **Home tab** — confirm SafeAreaView fix (no status bar collision), Pause/Resume/Stop give haptic + activeOpacity feedback, WorkoutSummaryModal shows "View Rewards" link, generating a workout card shows orange-on-black (no white text), the "Share" button now reads "Post".
2. **Social tab** — tap a comment count on any post, confirm CommentsScreen pushes (no nav warning).
3. **History tab** — confirm RewardHistoryScreen renders without theme regressions.
4. **Settings** → confirm new "Rewards" row navigates to RewardsScreen.
5. **RewardsScreen** — confirm "Edit Lightning Address" / "Set Up" label replaces "Change".
6. **DynamicEventDetailScreen** — visually confirm error states use orange instead of red.

- [ ] **Step 4: Final typecheck**

```bash
npm run typecheck
```

- [ ] **Step 5: Final commit if cleanup remains**

```bash
git status
```

If clean, done. If files were tweaked during sim verification, commit them.

---

## Self-Review

**Spec coverage:**
- White text in share modals → Tasks 8, 9, 10 ✓
- Comments unreachable → Task 1 ✓
- Red error color → Task 3 ✓
- ProfileScreen SafeAreaView → Task 2 ✓
- Tracker controls a11y/haptic/activeOpacity → Task 4 ✓
- WorkoutSummary "View Rewards" link → Task 6 ✓
- "Change destination" mislabel → Task 5 ✓
- Settings has no Rewards entry → Task 7 ✓
- "Share" → "Post" terminology → Task 11 ✓
- `react-native` core SafeAreaView migration (live screens only) → Tasks 12-15 ✓
- Inline cards in RewardsScreen → Task 16 ✓
- Dead code memory note → Task 17 ✓

**Explicitly dropped per user instructions:**
- Screen titles in headers (RewardsScreen, SettingsScreen).
- Any work on `LevelDetailScreen`, `AdvancedAnalyticsScreen`, `FitnessTestResultsScreen` (features removed from app).
- White text edits in `DynamicEventDetailScreen` (kept only the single-line red→error fix; broader edits deferred per user concern about risk).
- `Comments` screen confirm-before-delete gate — replaced with a project memory note instead.

**Deferred from this plan (separate effort):**
- 404-site `activeOpacity` codemod
- Font-size and 4pt-spacing-grid sweeps
- Adoption of `DetailHeader` across back-button screens
- Adding `secondary`/`inverse` variants to `Button`
- Pull-to-refresh additions
- `CenteredSpinner` addition to `LoadingStates.tsx`

**No placeholders.** Every task lists exact files, exact edits, exact verification commands.

**Type consistency:** `theme.colors.text`, `theme.colors.textMuted`, `theme.colors.textTertiary`, `theme.colors.cardBackground`, `theme.colors.border`, `theme.colors.error`, `theme.colors.orangeBurnt` are used consistently throughout. `Card` component is referenced uniformly.
