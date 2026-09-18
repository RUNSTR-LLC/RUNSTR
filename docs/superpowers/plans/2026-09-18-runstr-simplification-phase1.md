# RUNSTR Phase 1 Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce RUNSTR to a Nostr-native running tracker — track a run, it becomes a kind 1301 note — by hiding every non-running surface and making the existing 1301 relay backfill automatic and duplicate-safe.

**Architecture:** Three-tier hiding (approach C): unregister whole routes in `src/App.tsx`, collapse the bottom tab bar, and gate surviving in-screen elements behind flags in `src/config/features.ts`. Nothing is deleted. Separately, promote `Nostr1301ImportService` from a manual modal action to an automatic background merge, after hardening its dedup and removing an O(n²) scan.

**Tech Stack:** React Native + TypeScript (Expo), React Navigation (stack + bottom tabs), NDK for Nostr, AsyncStorage for local workouts, Jest for unit tests, `tsx` for verification scripts.

**Spec:** `docs/superpowers/specs/2026-09-18-runstr-simplification-design.md`

## Global Constraints

- **500-line file limit.** Split any file that exceeds it.
- **NDK exclusively.** Never use nostr-tools. All Nostr access goes through `GlobalNDKService.getInstance()`. Never construct `new NDK()` or `NostrRelayManager()`.
- **Nothing is deleted in Phase 1.** Routes are unregistered and elements are flag-gated. Files stay on disk. Reversal must be a flag flip or a git revert.
- **Flag semantics are uniform:** every Phase 1 flag means *"is this visible"*. `false` = hidden. No inverted flags.
- **Collection is never changed.** Apple Health / Health Connect keep importing walks, cycles, hikes and steps. Only display is filtered. Step counter services keep running.
- **Backfill only ever adds.** It must never delete or overwrite a local workout. Local AsyncStorage is the source of truth.
- **Run `npm run typecheck` before every commit.** It must pass clean.
- **Commit prefixes:** `Fix:`, `Feature:`, `Refactor:`, `Docs:`, `Chore:`. Stage specific files — never `git add .`. Never `--no-verify`.
- **Terminology:** this phase deliberately inverts the old in-app firewall. "Nostr" is now allowed in user-facing text. See Task 13.

---

## File Structure

**Created:**
| File | Responsibility |
|---|---|
| `src/utils/workoutDedup.ts` | Pure duplicate detection for workouts. No I/O. |
| `src/utils/__tests__/workoutDedup.test.ts` | Unit tests for the above. |
| `src/utils/isRunningWorkout.ts` | Single predicate defining "a run". No I/O. |
| `src/utils/__tests__/isRunningWorkout.test.ts` | Unit tests for the above. |
| `src/config/__tests__/features.test.ts` | Asserts every Phase 1 flag exists with the right value. |
| `scripts/verify/verify-simplification-phase1.ts` | Asserts routes are unregistered and flags are off. |
| `scripts/verify/verify-1301-backfill.ts` | **The gate.** Asserts backfill produces zero duplicates and loses nothing. |

**Modified:**
| File | Change |
|---|---|
| `src/config/features.ts` | Add 13 Phase 1 flags |
| `src/navigation/BottomTabNavigator.tsx` | Drop Social + Leaderboard tabs; hide the bar |
| `src/App.tsx` | Unregister 16 routes from `AuthenticatedStack` |
| `src/screens/ProfileScreen.tsx` | Hide level/earnings/activity selector; pin tracker to running |
| `src/screens/useSettingsState.ts` | Guard `navigate('Rewards')` |
| `src/components/activity/WorkoutSummaryModal.tsx` | Guard `navigate('Rewards')` |
| `src/services/notifications/ExpoNotificationProvider.ts` | Guard deep links to removed routes |
| `src/components/profile/StatsCard.tsx` | Hide the steps hero block |
| `src/screens/WorkoutHistoryScreen.tsx` | Hide the cloud export/import button |
| `src/screens/SettingsScreen.tsx` | Hide `WalletSection` |
| `src/components/settings/FitnessTrackingSection.tsx` | Hide the private-mode toggle |
| `src/components/profile/tabs/UnifiedWorkoutsTab.tsx` | Hide journal/habits; apply running filter |
| `src/services/nostr/GlobalNDKService.ts` | Add `wss://relay.nostr.band` |
| `src/services/fitness/LocalWorkoutStorageService.ts` | Bulk import with widened dedup |
| `src/services/fitness/Nostr1301ImportService.ts` | Use bulk import; add incremental mode |
| `CLAUDE.md`, `docs/North Star.md` | Rewrite to match the new product |

---

## Task 1: Phase 1 feature flags

**Files:**
- Modify: `src/config/features.ts`
- Test: `src/config/__tests__/features.test.ts`

**Interfaces:**
- Consumes: nothing (foundation task)
- Produces: `FEATURES.social`, `FEATURES.leaderboard`, `FEATURES.teams`, `FEATURES.level`, `FEATURES.earnings`, `FEATURES.activitySelector`, `FEATURES.stepTracking`, `FEATURES.cloudBackupButton`, `FEATURES.walletSettings`, `FEATURES.privateMode`, `FEATURES.shareSheet`, `FEATURES.journalHabits`, `FEATURES.nonRunningHistory` — all `boolean`, all `false`.

- [ ] **Step 1: Write the failing test**

Create `src/config/__tests__/features.test.ts`:

```typescript
import { FEATURES } from '../features';

const PHASE_1_FLAGS = [
  'social',
  'leaderboard',
  'teams',
  'level',
  'earnings',
  'activitySelector',
  'stepTracking',
  'cloudBackupButton',
  'walletSettings',
  'privateMode',
  'shareSheet',
  'journalHabits',
  'nonRunningHistory',
] as const;

describe('Phase 1 simplification flags', () => {
  it('defines every Phase 1 flag', () => {
    for (const flag of PHASE_1_FLAGS) {
      expect(FEATURES).toHaveProperty(flag);
    }
  });

  it('hides every Phase 1 surface', () => {
    for (const flag of PHASE_1_FLAGS) {
      expect(FEATURES[flag]).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/config/__tests__/features.test.ts`
Expected: FAIL — `Received path: []` / property `social` not found.

- [ ] **Step 3: Add the flags**

In `src/config/features.ts`, replace the existing simplification block (the one containing `teams: true`, `customEvents: false`, `seasons: false`) with:

```typescript
  // ---------------------------------------------------------------------------
  // Simplification visibility flags.
  // Every flag means "is this visible". `false` = hidden, code stays compiled.
  // NOTE: hiding stops UI access only; a hidden feature's background behavior
  // may still run. That is intentional.
  // ---------------------------------------------------------------------------
  /** Fitness Clubs / Teams: club pages, team chat, captain tools, club affiliations. */
  teams: false,
  /** Captain/user-created events and the Compete hub. */
  customEvents: false,
  /** Season 2 / Season 3 / Einundzwanzig competitions and banners. */
  seasons: false,

  // --- Phase 1 (2026-09-18): Nostr-native running tracker ---
  /** Social tab: the workout feed. */
  social: false,
  /** Leaderboard tab: daily always-on competitions. */
  leaderboard: false,
  /** Level badge, level ring, and the LevelDetail screen. */
  level: false,
  /** Earnings badge and the Rewards screen. */
  earnings: false,
  /** Activity selector bar. When false the tracker is pinned to running. */
  activitySelector: false,
  /** Steps hero on the stats card. Counter services keep running regardless. */
  stepTracking: false,
  /** Cloud export/import button on the workout history screen. */
  cloudBackupButton: false,
  /** Wallet section in Settings. */
  walletSettings: false,
  /** Private-mode toggle. Private is implicit now: nothing posts unless shared. */
  privateMode: false,
  /** Share sheet on a finished workout. When false, the 1301 note is the default. */
  shareSheet: false,
  /** Journal entries and habit check-ins in the history timeline. */
  journalHabits: false,
  /** Non-running workouts in history. Collection is unaffected — display only. */
  nonRunningHistory: false,
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/config/__tests__/features.test.ts`
Expected: PASS — 2 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add src/config/features.ts src/config/__tests__/features.test.ts
git commit -m "Feature: add Phase 1 simplification visibility flags"
```

---

## Task 2: Collapse the bottom navigation

**Files:**
- Modify: `src/navigation/BottomTabNavigator.tsx`

**Interfaces:**
- Consumes: `FEATURES.social`, `FEATURES.leaderboard` (Task 1)
- Produces: a single-tab navigator with a hidden bar. `MainTabs` and the `Home` route name are preserved.

**Why the navigator survives:** `ProfileScreen` calls `navigation.getParent()` to reach stack routes, and other code navigates to `MainTabs` by name. Replacing the tab navigator with a bare screen breaks both.

- [ ] **Step 1: Import the flags**

At the top of `src/navigation/BottomTabNavigator.tsx`, after the `theme` import, add:

```typescript
import { FEATURES } from '../config/features';
```

- [ ] **Step 2: Hide the tab bar**

In the `screenOptions` object, replace `tabBarStyle: styles.tabBar,` with:

```typescript
        tabBarStyle: FEATURES.social || FEATURES.leaderboard
          ? styles.tabBar
          : { display: 'none' as const },
```

- [ ] **Step 3: Gate the Social tab**

Wrap the entire `<Tab.Screen name="Social" ...>` block (including its children) in a conditional:

```typescript
      {FEATURES.social && (
        <Tab.Screen name="Social" options={{ title: t('profile:tabSocial'), lazy: true }}>
          {() => (
            <Suspense fallback={<LoadingFallback />}>
              <SocialScreen />
            </Suspense>
          )}
        </Tab.Screen>
      )}
```

- [ ] **Step 4: Gate the Leaderboard tab**

Wrap the entire `<Tab.Screen name="Leaderboard" ...>` block the same way:

```typescript
      {FEATURES.leaderboard && (
        <Tab.Screen
          name="Leaderboard"
          options={{
            title: t('profile:tabLeaderboard', 'Leaderboard'),
            headerShown: false,
            lazy: true,
          }}
        >
          {() => (
            <Suspense fallback={<LoadingFallback />}>
              <LeaderboardsScreen />
            </Suspense>
          )}
        </Tab.Screen>
      )}
```

- [ ] **Step 5: Guard the ClubPage navigation**

At `src/navigation/BottomTabNavigator.tsx` there is a `navigation.navigate('ClubPage', {...})` call inside the Home tab's `onViewCurrentTeam` handler. Wrap its body:

```typescript
              onViewCurrentTeam={() => {
                if (FEATURES.teams && profileData.currentTeam) {
                  navigation.navigate('ClubPage', {
                    clubId: profileData.currentTeam.id,
                    clubName: profileData.currentTeam.name,
                  });
                }
              }}
```

- [ ] **Step 6: Typecheck and commit**

```bash
npm run typecheck
git add src/navigation/BottomTabNavigator.tsx
git commit -m "Feature: collapse bottom navigation to the tracker tab"
```

---

## Task 3: Prune routes and fix every surviving navigation call

**Files:**
- Modify: `src/App.tsx` (the `AuthenticatedStack` block)
- Modify: `src/screens/ProfileScreen.tsx`
- Modify: `src/screens/useSettingsState.ts`
- Modify: `src/components/activity/WorkoutSummaryModal.tsx`
- Modify: `src/services/notifications/ExpoNotificationProvider.ts`

**Interfaces:**
- Consumes: `FEATURES.*` (Task 1)
- Produces: an `AuthenticatedStack` registering only `MainTabs`, `Settings`, `HelpSupport`, `ContactSupport`, `PrivacyPolicy`, `WorkoutHistory`, `ProfileEdit`, `SavedRoutes`.

**These must land together.** Unregistering a route without fixing its callers leaves navigation calls that silently no-op or throw. A reviewer cannot sensibly approve one half.

- [ ] **Step 1: Unregister the routes**

In `src/App.tsx`, inside `<AuthenticatedStack.Navigator>`, delete the `<AuthenticatedStack.Screen>` blocks for these 16 route names. Leave the imports and the `AuthenticatedStackParamList` type entries in place — the screens stay compiled and the param list documents what is reversible.

```
Rewards, Compete, Leaderboards, DynamicEventDetail,
Season2, Season3, EinundzwanzigDetail,
ClubChat, ClubPage, Comments,
LevelDetail, JournalHistory, HealthProfile, AdvancedAnalytics, StatsDetail, Experimental
```

Keep: `MainTabs`, `Settings`, `HelpSupport`, `ContactSupport`, `PrivacyPolicy`, `WorkoutHistory`, `ProfileEdit`, `SavedRoutes`.

- [ ] **Step 2: Guard the Rewards deep link from Settings**

In `src/screens/useSettingsState.ts`, find `navigation.navigate('Rewards');` and replace with:

```typescript
    if (FEATURES.earnings) {
      navigation.navigate('Rewards');
    }
```

Add `import { FEATURES } from '../config/features';` at the top if not present.

- [ ] **Step 3: Guard the Rewards deep link from the workout summary**

In `src/components/activity/WorkoutSummaryModal.tsx`, find `navigation.navigate('Rewards' as never);` and wrap it:

```typescript
              if (FEATURES.earnings) {
                navigation.navigate('Rewards' as never);
              }
```

Add `import { FEATURES } from '../../config/features';` at the top if not present.

- [ ] **Step 4: Guard the push-notification deep links**

This one matters most — push notifications fire regardless of what the UI shows, so an unguarded deep link to an unregistered route is a live crash path.

In `src/services/notifications/ExpoNotificationProvider.ts`, find `navigate('Rewards');` and `navigate('Compete');` and replace them with guarded versions that fall back to the tracker:

```typescript
          if (FEATURES.earnings) {
            navigate('Rewards');
          } else {
            navigate('MainTabs');
          }
```

```typescript
            if (FEATURES.customEvents) {
              navigate('Compete');
            } else {
              navigate('MainTabs');
            }
```

Add `import { FEATURES } from '../../config/features';` at the top if not present.

- [ ] **Step 5: Remove the dead handlers in ProfileScreen**

In `src/screens/ProfileScreen.tsx` there are two `<ProfileHero>` usages (owner view and visitor view). In **both**, delete the `onLevelPress` and `onEarningsPress` props entirely — Task 4 stops rendering the badges that trigger them, so the handlers have no caller.

Also guard the two club navigations in the same file:

```typescript
  const handleClubPress = (id: string, name: string) => {
    if (!FEATURES.teams) return;
    const parent = navigation.getParent();
    (parent || navigation).navigate('ClubPage' as any, { clubId: id, clubName: name });
  };
```

Apply the same `if (!FEATURES.teams) return;` guard to the handler containing `navigation.navigate('ClubChat', {`.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: PASS. Any error here is signal — it means a navigation call to an unregistered route was missed, or an import is now unused. Fix and re-run until clean.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/screens/ProfileScreen.tsx src/screens/useSettingsState.ts src/components/activity/WorkoutSummaryModal.tsx src/services/notifications/ExpoNotificationProvider.ts
git commit -m "Feature: unregister non-running routes and guard their callers"
```

---

## Task 4: Hide level, earnings, and the activity selector; pin the tracker to running

**Files:**
- Modify: `src/screens/ProfileScreen.tsx`

**Interfaces:**
- Consumes: `FEATURES.level`, `FEATURES.earnings`, `FEATURES.activitySelector` (Task 1)
- Produces: a profile screen showing only the running tracker.

**Note:** `ProfileHero` already guards internally on `earnings != null` and `streak != null`, so passing `undefined` hides the badges with no component edit. The LEVEL badge is driven by the `streak` prop, not `level`.

- [ ] **Step 1: Import the flags**

Confirm `import { FEATURES } from '../config/features';` is present in `src/screens/ProfileScreen.tsx` (it already imports `FEATURES` for the `teams` flag).

- [ ] **Step 2: Hide the level and earnings badges**

In the **owner** `<ProfileHero>` usage, change the three stat props to:

```typescript
                  level={FEATURES.level ? (levelData?.level ?? 0) : undefined}
                  streak={FEATURES.level ? currentStreak : undefined}
                  earnings={FEATURES.earnings ? totalEarnings : undefined}
```

In the **visitor** `<ProfileHero>` usage, change:

```typescript
              level={FEATURES.level ? (levelData?.level ?? 0) : undefined}
```

- [ ] **Step 3: Hide the visitor-view level card**

In the visitor branch, wrap the `<LevelCard>` block:

```typescript
          {FEATURES.level && (
          <View style={styles.sectionGap}>
            <LevelCard levelData={levelData} isLoading={isLoadingSections} />
          </View>
          )}
```

- [ ] **Step 4: Hide the activity selector**

Wrap the `<ActivityCategoryBar>` block in the owner view:

```typescript
            {!isWorkoutActive && FEATURES.activitySelector && (
              <View style={styles.sectionGap}>
                <ActivityCategoryBar
                  gridPosition={gridPosition}
                  onActivitySelect={handleActivitySelect}
                  isWorkoutActive={false}
                />
              </View>
            )}
```

- [ ] **Step 5: Pin the tracker to running**

In `renderTracker()`, insert an early return immediately after the `permissionGate` block and before the `let tracker: React.ReactNode;` declaration:

```typescript
    // Phase 1: the app tracks running only. The activity grid still exists and
    // sync still collects every activity type — this pins the *tracker* to runs.
    if (!FEATURES.activitySelector) {
      return (
        <ScreenErrorBoundary screenName="Workout Tracker">
          <RunningTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />
        </ScreenErrorBoundary>
      );
    }
```

- [ ] **Step 6: Typecheck and commit**

```bash
npm run typecheck
git add src/screens/ProfileScreen.tsx
git commit -m "Feature: hide level, earnings and activity selector; pin tracker to running"
```

---

## Task 5: Hide the steps hero

**Files:**
- Modify: `src/components/profile/StatsCard.tsx`

**Interfaces:**
- Consumes: `FEATURES.stepTracking` (Task 1)
- Produces: a stats card showing personal records only.

**Scope reminder:** display only. `DailyStepCounterService` and `NativeStepCounterService` keep running.

- [ ] **Step 1: Import the flag**

Add to `src/components/profile/StatsCard.tsx`:

```typescript
import { FEATURES } from '../../config/features';
```

- [ ] **Step 2: Skip the step fetch when hidden**

In the effect that calls `DailyStepCounterService`, add an early return at the top of the async body so the card does no needless work:

```typescript
      if (!FEATURES.stepTracking) return;
```

Place it immediately before `const stepService = DailyStepCounterService.getInstance();`.

- [ ] **Step 3: Hide the hero block**

Wrap the steps hero in the returned JSX:

```typescript
      {/* Hero: Today's Steps */}
      {FEATURES.stepTracking && (
        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroLabel}>STEPS TODAY</Text>
          </View>
          <AnimatedNumber value={todaySteps} style={styles.heroValue} />
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${stepProgressPercent}%` }]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {stepProgressPercent}% of {DAILY_STEP_GOAL.toLocaleString()} goal
          </Text>
        </View>
      )}
```

- [ ] **Step 4: Drop the now-leading divider**

The "RUNNING PERSONAL RECORDS" block renders a `<View style={styles.divider} />` before its title, which was separating it from the hero. With the hero hidden that divider sits at the top of the card. Change its condition:

```typescript
      {hasRunning && (
        <>
          {FEATURES.stepTracking && <View style={styles.divider} />}
          <Text style={styles.sectionTitle}>RUNNING PERSONAL RECORDS</Text>
```

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add src/components/profile/StatsCard.tsx
git commit -m "Feature: hide the steps hero from the stats card"
```

---

## Task 6: Hide the cloud backup button, wallet section, private-mode toggle, and share sheet

**Files:**
- Modify: `src/screens/WorkoutHistoryScreen.tsx`
- Modify: `src/screens/SettingsScreen.tsx`
- Modify: `src/components/settings/FitnessTrackingSection.tsx`
- Modify: `src/components/activity/WorkoutSummaryModal.tsx`

**Interfaces:**
- Consumes: `FEATURES.cloudBackupButton`, `FEATURES.walletSettings`, `FEATURES.privateMode`, `FEATURES.shareSheet` (Task 1)
- Produces: nothing consumed by later tasks.

These are grouped because each is a single-element gate with no shared logic; splitting them would give a reviewer three identical one-line diffs.

- [ ] **Step 1: Hide the cloud button**

In `src/screens/WorkoutHistoryScreen.tsx`, add `import { FEATURES } from '../config/features';` and wrap the cloud button container:

```typescript
        {FEATURES.cloudBackupButton && (
          <View style={styles.cloudButtonContainer}>
            {/* ...existing cloud button and backup menu JSX, unchanged... */}
          </View>
        )}
```

Leave `<ExportDataModal>` and `<ImportDataModal>` mounted — they are harmless when never opened, and Task 11 relies on `Nostr1301ImportService` continuing to compile.

- [ ] **Step 2: Hide the wallet section**

In `src/screens/SettingsScreen.tsx`, add `import { FEATURES } from '../config/features';` and wrap the `<WalletSection ... />` element:

```typescript
          {FEATURES.walletSettings && (
            <WalletSection
              onRewardsPress={state.handleRewardsPress}
              onAIKeyPress={() => setShowPPQModal(true)}
              hasNWCWallet={state.hasNWCWallet}
              onDisconnectWallet={state.handleDisconnectWallet}
              onShowWalletConfigModal={() => state.setShowWalletConfigModal(true)}
              onShowQRScannerModal={() => state.setShowQRScannerModal(true)}
            />
          )}
```

- [ ] **Step 3: Hide the private-mode toggle**

In `src/components/settings/FitnessTrackingSection.tsx`, add `import { FEATURES } from '../../config/features';` and wrap the settings row containing `value={privateModeEnabled}` in `{FEATURES.privateMode && ( ... )}`. Wrap the whole row element, not just the switch, so no orphaned label remains.

- [ ] **Step 4: Hide the share sheet**

The 1301 workout note is now the default and only publish path — commit `5e54a16c`
already made auto-publish the default, so the card-sharing flow is the leftover.

In `src/components/activity/WorkoutSummaryModal.tsx` (which already imports
`FEATURES` from Task 3), wrap the button whose label reads
`Create a workout card and share it` in `{FEATURES.shareSheet && ( ... )}`,
wrapping the whole pressable rather than just its text.

Leave `<EnhancedSocialShareModal>` mounted — it is inert when never opened, and
its `onPost` path is what `handlePostToNostr` still uses.

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add src/screens/WorkoutHistoryScreen.tsx src/screens/SettingsScreen.tsx src/components/settings/FitnessTrackingSection.tsx src/components/activity/WorkoutSummaryModal.tsx
git commit -m "Feature: hide cloud backup, wallet settings, private mode and share sheet"
```

---

## Task 7: The `isRunningWorkout` predicate

**Files:**
- Create: `src/utils/isRunningWorkout.ts`
- Test: `src/utils/__tests__/isRunningWorkout.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `isRunningWorkout(workout: { type?: string | null }): boolean`

One predicate, used everywhere, so "what counts as a run" cannot drift between surfaces. It consumes the already-corrected workout type — commit `a41fb9a7` fixed Health Connect walks being mislabeled as runs, and this must not re-derive or undo that.

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/isRunningWorkout.test.ts`:

```typescript
import { isRunningWorkout } from '../isRunningWorkout';

describe('isRunningWorkout', () => {
  it('accepts the canonical running type', () => {
    expect(isRunningWorkout({ type: 'running' })).toBe(true);
  });

  it('accepts the short form and mixed case', () => {
    expect(isRunningWorkout({ type: 'run' })).toBe(true);
    expect(isRunningWorkout({ type: 'Running' })).toBe(true);
    expect(isRunningWorkout({ type: 'RUN' })).toBe(true);
  });

  it('rejects other cardio types', () => {
    expect(isRunningWorkout({ type: 'walking' })).toBe(false);
    expect(isRunningWorkout({ type: 'cycling' })).toBe(false);
    expect(isRunningWorkout({ type: 'hiking' })).toBe(false);
  });

  it('does not treat a treadmill walk as a run via substring match', () => {
    expect(isRunningWorkout({ type: 'walking_treadmill' })).toBe(false);
  });

  it('rejects missing or empty types rather than guessing', () => {
    expect(isRunningWorkout({})).toBe(false);
    expect(isRunningWorkout({ type: null })).toBe(false);
    expect(isRunningWorkout({ type: '' })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/utils/__tests__/isRunningWorkout.test.ts`
Expected: FAIL — `Cannot find module '../isRunningWorkout'`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/isRunningWorkout.ts`:

```typescript
/**
 * The single definition of "a run" for display filtering.
 *
 * Phase 1 shows running workouts only. Collection is unaffected — Apple Health
 * and Health Connect keep importing every activity type; this decides what the
 * history surfaces render.
 *
 * Matches exactly, never by substring: 'walking_treadmill' must not read as a
 * run. Consumes the already-normalized workout type — it does not re-derive it.
 */
const RUNNING_TYPES = new Set(['run', 'running']);

export function isRunningWorkout(workout: { type?: string | null }): boolean {
  const type = workout?.type;
  if (!type) return false;
  return RUNNING_TYPES.has(type.trim().toLowerCase());
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/utils/__tests__/isRunningWorkout.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add src/utils/isRunningWorkout.ts src/utils/__tests__/isRunningWorkout.test.ts
git commit -m "Feature: add the isRunningWorkout display predicate"
```

---

## Task 8: Apply the running filter and hide journal/habits in history

**Files:**
- Modify: `src/components/profile/tabs/UnifiedWorkoutsTab.tsx`

**Interfaces:**
- Consumes: `isRunningWorkout` (Task 7), `FEATURES.nonRunningHistory`, `FEATURES.journalHabits` (Task 1)
- Produces: nothing consumed by later tasks.

`UnifiedWorkoutsTab` is the only live history surface — `WorkoutsTab.tsx` has no consumers, so `AllWorkoutsTab`, `PublicWorkoutsTab`, `PrivateWorkoutsTab`, `AppleHealthTab` and `HealthConnectTab` are dead and need no filter.

- [ ] **Step 1: Add the imports**

```typescript
import { isRunningWorkout } from '../../../utils/isRunningWorkout';
import { FEATURES } from '../../../config/features';
```

- [ ] **Step 2: Filter workouts in the timeline builder**

In the `useMemo` that builds timeline items, find the workouts branch (`if (activeFilter === 'all' || activeFilter === 'workouts') {`) and filter the source array before mapping:

```typescript
    if (activeFilter === 'all' || activeFilter === 'workouts') {
      const visibleWorkouts = FEATURES.nonRunningHistory
        ? mergedWorkouts
        : mergedWorkouts.filter(isRunningWorkout);

      visibleWorkouts.forEach((w) => {
        if (!w.startTime) return; // Skip corrupted entries without a timestamp
        // HealthKit workouts carry startTime as a Date object; local workouts as
        // an ISO string. Normalize so `.split('T')` can never throw (this was
        // crashing the History tab whenever Apple Health Workouts sync was on).
        const startIso =
          typeof w.startTime === 'string'
            ? w.startTime
            : new Date(w.startTime as any).toISOString();
        items.push({
          type: 'workout', id: `w_${w.id}`,
          date: startIso.split('T')[0],
          timestamp: new Date(startIso).getTime(),
          workout: w,
        });
      });
    }
```

The only change from the existing block is the source array — `visibleWorkouts` instead of `mergedWorkouts`. The `startTime` normalization must be preserved exactly; it is a crash fix.

- [ ] **Step 3: Gate the journal branch**

```typescript
    if (FEATURES.journalHabits && (activeFilter === 'all' || activeFilter === 'journal')) {
      journalEntries.forEach((e) => {
```

- [ ] **Step 4: Gate the habits branch**

```typescript
    if (FEATURES.journalHabits && (activeFilter === 'all' || activeFilter === 'habits')) {
      habits.forEach((habit) => {
```

- [ ] **Step 5: Gate the summary counts**

Find the footer line rendering journal and habit counts and wrap both fragments:

```typescript
                {FEATURES.journalHabits && journalEntries.length > 0 && ` • ${journalEntries.length} journal`}
                {FEATURES.journalHabits && habits.length > 0 && ` • ${habits.reduce((sum, h) => sum + h.checkIns.length, 0)} habit check-ins`}
```

- [ ] **Step 6: Typecheck and commit**

```bash
npm run typecheck
git add src/components/profile/tabs/UnifiedWorkoutsTab.tsx
git commit -m "Feature: show running workouts only in history; hide journal and habits"
```

---

## Task 9: Add the archival relay

**Files:**
- Modify: `src/services/nostr/GlobalNDKService.ts`

**Interfaces:**
- Consumes: nothing
- Produces: a four-relay default set used by every Nostr read and write, including the Task 11 backfill.

- [ ] **Step 1: Add the relay**

In `src/services/nostr/GlobalNDKService.ts`, extend `DEFAULT_RELAYS`:

```typescript
  private static readonly DEFAULT_RELAYS = [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.primal.net',
    // Archival index. The three above are general-purpose and make no retention
    // promise, so a 1301 published months ago may no longer be served by them.
    // Backfill depends on coverage, not speed.
    'wss://relay.nostr.band',
  ];
```

- [ ] **Step 2: Typecheck and commit**

```bash
npm run typecheck
git add src/services/nostr/GlobalNDKService.ts
git commit -m "Feature: add an archival relay for 1301 history coverage"
```

---

## Task 10: Widen workout dedup

**Files:**
- Create: `src/utils/workoutDedup.ts`
- Test: `src/utils/__tests__/workoutDedup.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `export interface DedupCandidate { nostrEventId?: string | null; type?: string | null; startTime: string; duration: number; }`
  - `export const START_TIME_TOLERANCE_MS = 60_000;`
  - `export const DURATION_TOLERANCE_S = 5;`
  - `export function isDuplicateWorkout(existing: DedupCandidate[], candidate: DedupCandidate): boolean`

**This is the correctness heart of the phase.** `LocalWorkoutStorageService.saveImportedNostrWorkout` currently dedups on `nostrEventId` alone. That ID is written back only by `markAsSynced`, whose sole caller is `WorkoutSummaryModal.tsx:309` — so GPS runs finished through the summary modal carry it, and workouts published outside that modal do not. Automating the backfill without a second key duplicates those on every launch.

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/workoutDedup.test.ts`:

```typescript
import { isDuplicateWorkout, type DedupCandidate } from '../workoutDedup';

const base: DedupCandidate = {
  nostrEventId: 'abc123',
  type: 'running',
  startTime: '2026-09-18T10:00:00.000Z',
  duration: 1800,
};

describe('isDuplicateWorkout', () => {
  it('matches on nostrEventId', () => {
    const candidate = { ...base, startTime: '2020-01-01T00:00:00.000Z' };
    expect(isDuplicateWorkout([base], candidate)).toBe(true);
  });

  it('matches a workout with no event id by time, type and duration', () => {
    const local = { ...base, nostrEventId: undefined };
    expect(isDuplicateWorkout([local], base)).toBe(true);
  });

  it('tolerates start times within 60 seconds', () => {
    const local = { ...base, nostrEventId: undefined };
    const candidate = { ...base, startTime: '2026-09-18T10:00:45.000Z' };
    expect(isDuplicateWorkout([local], candidate)).toBe(true);
  });

  it('rejects start times beyond 60 seconds', () => {
    const local = { ...base, nostrEventId: undefined };
    const candidate = { ...base, startTime: '2026-09-18T10:02:00.000Z' };
    expect(isDuplicateWorkout([local], candidate)).toBe(false);
  });

  it('tolerates small duration rounding', () => {
    const local = { ...base, nostrEventId: undefined };
    expect(isDuplicateWorkout([local], { ...base, duration: 1803 })).toBe(true);
  });

  it('rejects a different duration', () => {
    const local = { ...base, nostrEventId: undefined };
    expect(isDuplicateWorkout([local], { ...base, duration: 3600 })).toBe(false);
  });

  it('rejects a different activity type at the same time', () => {
    const local = { ...base, nostrEventId: undefined, type: 'cycling' };
    expect(isDuplicateWorkout([local], base)).toBe(false);
  });

  it('returns false against an empty set', () => {
    expect(isDuplicateWorkout([], base)).toBe(false);
  });

  it('ignores unparseable start times rather than matching everything', () => {
    const local = { ...base, nostrEventId: undefined, startTime: 'not-a-date' };
    expect(isDuplicateWorkout([local], base)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/utils/__tests__/workoutDedup.test.ts`
Expected: FAIL — `Cannot find module '../workoutDedup'`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/workoutDedup.ts`:

```typescript
/**
 * Duplicate detection for workouts merged in from Nostr.
 *
 * Two keys, either of which is sufficient:
 *   1. nostrEventId — exact, but only present on workouts that went through
 *      markAsSynced (currently just the GPS summary-modal path).
 *   2. (type, startTime within tolerance, duration within tolerance) — covers
 *      everything else, notably Health-synced workouts published outside that
 *      path, which carry no event id locally.
 *
 * Without key 2 an automatic backfill re-imports those workouts on every run.
 */

export interface DedupCandidate {
  nostrEventId?: string | null;
  type?: string | null;
  startTime: string;
  duration: number;
}

export const START_TIME_TOLERANCE_MS = 60_000;
export const DURATION_TOLERANCE_S = 5;

const normalizeType = (type?: string | null): string =>
  (type ?? '').trim().toLowerCase();

export function isDuplicateWorkout(
  existing: DedupCandidate[],
  candidate: DedupCandidate
): boolean {
  const candidateStart = Date.parse(candidate.startTime);
  const candidateType = normalizeType(candidate.type);

  return existing.some((item) => {
    if (
      candidate.nostrEventId &&
      item.nostrEventId &&
      item.nostrEventId === candidate.nostrEventId
    ) {
      return true;
    }

    if (Number.isNaN(candidateStart)) return false;
    const itemStart = Date.parse(item.startTime);
    if (Number.isNaN(itemStart)) return false;

    if (normalizeType(item.type) !== candidateType) return false;
    if (Math.abs(itemStart - candidateStart) > START_TIME_TOLERANCE_MS) return false;
    if (Math.abs(item.duration - candidate.duration) > DURATION_TOLERANCE_S) return false;

    return true;
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/utils/__tests__/workoutDedup.test.ts`
Expected: PASS — 9 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add src/utils/workoutDedup.ts src/utils/__tests__/workoutDedup.test.ts
git commit -m "Feature: widen workout dedup beyond nostrEventId"
```

---

## Task 11: Bulk import and automatic backfill

**Files:**
- Modify: `src/services/fitness/LocalWorkoutStorageService.ts`
- Modify: `src/services/fitness/Nostr1301ImportService.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `isDuplicateWorkout`, `DedupCandidate` (Task 10)
- Produces:
  - `export interface ImportedNostrWorkout` in `LocalWorkoutStorageService.ts` — the param shape shared by both import methods
  - `LocalWorkoutStorageService.saveImportedNostrWorkoutsBulk(workouts: ImportedNostrWorkout[]): Promise<number>` — returns the count actually written
  - `Nostr1301ImportService.backfillInBackground(pubkey: string): Promise<void>` — never throws

The existing per-workout `saveImportedNostrWorkout` calls `getAllWorkouts()` **inside** the import loop, which is O(n²). Acceptable behind a one-time progress bar; not on every login.

- [ ] **Step 1: Extract the import param type**

`saveImportedNostrWorkout` declares its parameter shape inline, which cannot be reused. In `src/services/fitness/LocalWorkoutStorageService.ts`, lift it to an exported interface above the class:

```typescript
export interface ImportedNostrWorkout {
  id: string; // Nostr event ID
  type: WorkoutType;
  startTime: string;
  endTime: string;
  duration: number; // seconds
  distance?: number; // meters
  calories?: number;
  reps?: number;
  sets?: number;
  notes?: string;
  elevation?: number; // meters (elevation gain)
  pace?: number; // seconds per km
  splits?: Split[];
}
```

Then change the existing signature to use it, leaving the body untouched:

```typescript
  async saveImportedNostrWorkout(workout: ImportedNostrWorkout): Promise<string> {
```

- [ ] **Step 2: Add the bulk import method**

Import the dedup helper:

```typescript
import { isDuplicateWorkout, type DedupCandidate } from '../../utils/workoutDedup';
```

Add a method alongside `saveImportedNostrWorkout` that loads existing workouts **once**, dedups in memory against both the stored set and everything accepted so far in this batch, and writes once:

```typescript
  /**
   * Bulk-import Nostr workouts. Loads the existing set once instead of once per
   * workout, and dedups against both stored workouts and earlier members of this
   * batch. Returns the number actually written.
   *
   * Only ever adds — never deletes or overwrites a local workout.
   */
  async saveImportedNostrWorkoutsBulk(
    workouts: ImportedNostrWorkout[]
  ): Promise<number> {
    const existing = await this.getAllWorkouts();
    const seen: DedupCandidate[] = existing.map((w) => ({
      nostrEventId: w.nostrEventId,
      type: w.type,
      startTime: w.startTime,
      duration: w.duration,
    }));

    let written = 0;
    for (const workout of workouts) {
      const candidate: DedupCandidate = {
        nostrEventId: workout.id,
        type: workout.type,
        startTime: workout.startTime,
        duration: workout.duration,
      };
      if (isDuplicateWorkout(seen, candidate)) continue;

      await this.saveImportedNostrWorkout(workout);
      seen.push(candidate);
      written++;
    }

    this.invalidateCache();
    return written;
  }
```

- [ ] **Step 3: Add a non-throwing background backfill**

In `src/services/fitness/Nostr1301ImportService.ts`, add:

```typescript
  /**
   * Background backfill. Fetches the user's 1301 history and merges anything
   * missing into local storage. Local is the source of truth — this only adds.
   *
   * Never throws: history must render from local storage whether or not relays
   * answer. Failures are logged and swallowed.
   */
  async backfillInBackground(pubkey: string): Promise<void> {
    try {
      const nostrWorkouts = await Nuclear1301Service.getInstance().getUserWorkouts(pubkey);
      if (!nostrWorkouts.length) return;

      const written = await LocalWorkoutStorageService.saveImportedNostrWorkoutsBulk(
        nostrWorkouts.map((w) => ({
          id: w.nostrEventId || w.id,
          type: this.normalizeWorkoutType(w.type),
          startTime: w.startTime,
          endTime: w.endTime,
          duration: w.duration,
          distance: w.distance,
          calories: w.calories,
          reps: w.reps,
          sets: w.sets,
          elevation: w.elevationGain,
          pace: w.pace,
          splits: w.splits,
        }))
      );

      console.log(`[1301Backfill] merged ${written} new workout(s) from relays`);
    } catch (error) {
      console.warn('[1301Backfill] failed (local history is unaffected):', error);
    }
  }
```

- [ ] **Step 4: Trigger it on login**

In `src/App.tsx`, inside the existing effect that runs once `currentUser` is available, fire the backfill without awaiting it so nothing blocks first paint:

```typescript
    // Merge any 1301 history published from other clients or a previous install.
    // Deliberately not awaited: local history renders immediately, relays catch up.
    if (currentUser?.pubkey) {
      Nostr1301ImportService.getInstance()
        .backfillInBackground(currentUser.pubkey)
        .catch(() => {});
    }
```

Add the import:

```typescript
import { Nostr1301ImportService } from './services/fitness/Nostr1301ImportService';
```

- [ ] **Step 5: Throttle the cadence**

The widened dedup makes a full fetch on every launch *correct*, but it is still
wasteful. Relay-level `since` filtering depends on `Nuclear1301Service` support
that may not exist, so throttle at the call site instead — same benefit, no new
dependency.

In `Nostr1301ImportService`, guard `backfillInBackground` with a stored
timestamp:

```typescript
  private static readonly BACKFILL_TS_KEY = '@runstr:last_1301_backfill';
  private static readonly BACKFILL_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

  private async shouldBackfill(): Promise<boolean> {
    try {
      const raw = await AsyncStorage.getItem(Nostr1301ImportService.BACKFILL_TS_KEY);
      if (!raw) return true;
      const last = Number(raw);
      if (!Number.isFinite(last)) return true;
      return Date.now() - last > Nostr1301ImportService.BACKFILL_INTERVAL_MS;
    } catch {
      return true; // Fail open: a backfill we did not need is harmless, a
                   // backfill we skipped forever is missing history.
    }
  }
```

Call it at the top of `backfillInBackground`:

```typescript
    if (!(await this.shouldBackfill())) return;
```

and record the time after a successful merge, immediately before the
`console.log`:

```typescript
      await AsyncStorage.setItem(
        Nostr1301ImportService.BACKFILL_TS_KEY,
        String(Date.now())
      ).catch(() => {});
```

Pull-to-refresh in history should bypass the throttle; the existing manual
import path in `ImportDataModal` is untouched and still does a full import.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/services/fitness/LocalWorkoutStorageService.ts src/services/fitness/Nostr1301ImportService.ts src/App.tsx
git commit -m "Feature: merge 1301 history from relays automatically on login"
```

---

## Task 12: Verification scripts

**Files:**
- Create: `scripts/verify/verify-simplification-phase1.ts`
- Create: `scripts/verify/verify-1301-backfill.ts`

**Interfaces:**
- Consumes: `FEATURES` (Task 1), `isDuplicateWorkout` (Task 10)
- Produces: nothing

Per the Verification Protocol in `CLAUDE.md`. The backfill script is **the gate**: everything else in this phase is reversible with a flag flip, duplicated history is not.

- [ ] **Step 1: Write the hiding verification script**

Create `scripts/verify/verify-simplification-phase1.ts`:

```typescript
/**
 * Verifies the Phase 1 hiding pass: every Phase 1 flag is off, and every
 * unregistered route is absent from the live AuthenticatedStack in src/App.tsx.
 *
 * Run: npx tsx scripts/verify/verify-simplification-phase1.ts
 */
import { readFileSync } from 'fs';
import { FEATURES } from '../../src/config/features';

const PHASE_1_FLAGS = [
  'social', 'leaderboard', 'teams', 'level', 'earnings', 'activitySelector',
  'stepTracking', 'cloudBackupButton', 'walletSettings', 'privateMode',
  'shareSheet', 'journalHabits', 'nonRunningHistory',
] as const;

const REMOVED_ROUTES = [
  'Rewards', 'Compete', 'Leaderboards', 'DynamicEventDetail',
  'Season2', 'Season3', 'EinundzwanzigDetail',
  'ClubChat', 'ClubPage', 'Comments',
  'LevelDetail', 'JournalHistory', 'HealthProfile',
  'AdvancedAnalytics', 'StatsDetail', 'Experimental',
];

const KEPT_ROUTES = [
  'MainTabs', 'Settings', 'HelpSupport', 'ContactSupport',
  'PrivacyPolicy', 'WorkoutHistory', 'ProfileEdit', 'SavedRoutes',
];

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failures++;
};

for (const flag of PHASE_1_FLAGS) {
  check((FEATURES as Record<string, boolean>)[flag] === false, `flag ${flag} is false`);
}

const app = readFileSync('src/App.tsx', 'utf8');
const registered = new Set(
  [...app.matchAll(/<AuthenticatedStack\.Screen[\s\S]*?name="(\w+)"/g)].map((m) => m[1])
);

for (const route of REMOVED_ROUTES) {
  check(!registered.has(route), `route ${route} is unregistered`);
}
for (const route of KEPT_ROUTES) {
  check(registered.has(route), `route ${route} is still registered`);
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 2: Run it**

Run: `npx tsx scripts/verify/verify-simplification-phase1.ts`
Expected: all PASS, exit 0.

- [ ] **Step 3: Write the backfill verification script**

Create `scripts/verify/verify-1301-backfill.ts`:

```typescript
/**
 * THE GATE for Phase 1.
 *
 * Asserts the widened dedup prevents duplicate history under the conditions the
 * automatic backfill actually runs in — notably local workouts that carry no
 * nostrEventId, because markAsSynced has exactly one caller
 * (WorkoutSummaryModal) and Health-synced workouts never pass through it.
 *
 * Run: npx tsx scripts/verify/verify-1301-backfill.ts
 */
import { isDuplicateWorkout, type DedupCandidate } from '../../src/utils/workoutDedup';

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failures++;
};

// A GPS run that went through the summary modal: has an event id.
const syncedLocal: DedupCandidate = {
  nostrEventId: 'event-synced',
  type: 'running',
  startTime: '2026-09-18T07:00:00.000Z',
  duration: 1800,
};

// A Health-synced run published outside the modal: no event id locally.
const unsyncedLocal: DedupCandidate = {
  nostrEventId: undefined,
  type: 'running',
  startTime: '2026-09-17T07:00:00.000Z',
  duration: 2400,
};

const localSet = [syncedLocal, unsyncedLocal];

// What the relays return for the same two runs, both carrying event ids.
const fromRelays: DedupCandidate[] = [
  { ...syncedLocal },
  { ...unsyncedLocal, nostrEventId: 'event-unsynced', startTime: '2026-09-17T07:00:20.000Z' },
];

const merged = fromRelays.filter((w) => !isDuplicateWorkout(localSet, w));
check(merged.length === 0, 'no duplicates merged for workouts already held locally');

// A genuinely new run from another client must still come through.
const genuinelyNew: DedupCandidate = {
  nostrEventId: 'event-new',
  type: 'running',
  startTime: '2026-09-16T07:00:00.000Z',
  duration: 1200,
};
check(
  !isDuplicateWorkout(localSet, genuinelyNew),
  'a genuinely new workout is still imported'
);

// Backfill must never shrink local history.
check(localSet.length === 2, 'local workouts are untouched by dedup');

console.log(failures === 0 ? '\nGate passed.' : `\n${failures} check(s) failed — DO NOT SHIP.`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 4: Run it**

Run: `npx tsx scripts/verify/verify-1301-backfill.ts`
Expected: `Gate passed.`, exit 0.

- [ ] **Step 5: Run the full unit suite**

Run: `npx jest src/utils/__tests__ src/config/__tests__`
Expected: PASS — all tests from Tasks 1, 7 and 10.

- [ ] **Step 6: Commit**

```bash
git add scripts/verify/verify-simplification-phase1.ts scripts/verify/verify-1301-backfill.ts
git commit -m "Chore: add Phase 1 simplification and 1301 backfill verification"
```

---

## Task 13: Rewrite the product documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/North Star.md`

**Interfaces:**
- Consumes: nothing
- Produces: nothing

Both documents currently mandate the **opposite** of this app: three pillars (Workouts/Social/Rewards), cardio-not-running-only, and an in-app terminology firewall forbidding the word "Nostr". Every future session reads them as authoritative. Left unchanged they actively misdirect work, which is why this is a Phase 1 task and not cleanup.

- [ ] **Step 1: Rewrite the CLAUDE.md product sections**

Replace the "What is RUNSTR", "Terminology Rules", "Product Structure" and "App Flow" sections to describe the Phase 1 product:

- RUNSTR is a Nostr-native running tracker. Tagline: **RUNSTR — Run with Nostr.**
- One loop: log in → track a run → it becomes a kind 1301 note on relays.
- **The in-app terminology firewall is removed.** "Nostr" is now allowed — required, even — in user-facing text. Delete the "rewards not sats / password not nsec" table; it describes a product that no longer exists.
- Activities: **running only** in the tracker. Sync still collects everything; history shows runs.
- Integrations: Apple Health, Health Connect. MCP is planned, not built.
- Keep the Critical Rules, Reachability Check and Verification Protocol sections as they are — they are about how to work in the codebase, not what the product is.

- [ ] **Step 2: Add the deferred-work note**

In `CLAUDE.md`, record what is intentionally not built, so a future session does not treat the gaps as bugs:

```markdown
## Deferred (not bugs)

- **NIP-46 bunker login** — no code exists yet. Amber (Android) is the only real signer path today; anonymous `Start` still works on both platforms.
- **Login screen inversion** — Amber/bunker become the headline and `Start` moves under Advanced when bunker lands.
- **MCP tab** — parked. Note `AgentSkillSection.tsx` / `AgentSkillSetupModal.tsx` already exist but are rendered nowhere.
- **WOT reward selection** — moved out of the app entirely; it runs as a Claude Code skill against public 1301 notes.
- **Split voice announcements** — a known bug, tracked separately from this simplification.
```

- [ ] **Step 3: Rewrite North Star.md**

Replace the pitch and Key Principles to match: one pillar (running), Nostr as the visible substrate rather than an invisible identity layer, rewards described as **external** to the app. Preserve the "interoperability, not ownership" framing note — it is still correct and still the right way to talk about Nostr here.

- [ ] **Step 4: Verify no stale contradictions remain**

Run: `grep -rn "three pillars\|Three-Tab\|sats, Bitcoin\|nsec (user-facing)" CLAUDE.md "docs/North Star.md"`
Expected: no output. Any hit is a section that still describes the old product.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md "docs/North Star.md"
git commit -m "Docs: rewrite product identity for the Nostr-native running tracker"
```

---

## Final verification

Run all of these before calling Phase 1 done:

```bash
npm run typecheck
npx jest src/utils/__tests__ src/config/__tests__
npx tsx scripts/verify/verify-simplification-phase1.ts
npx tsx scripts/verify/verify-1301-backfill.ts
```

Then, on a **fully erased** simulator (soft reboots leave a stale QUIC cache that shows a blank skeleton UI):

1. Erase and reinstall.
2. Log in — confirm no bottom tab bar, no activity selector, no level or earnings badge.
3. Confirm the tracker opens directly on running.
4. Open history — confirm runs only, no steps hero, no cloud button, no journal or habit entries.
5. Open Settings — confirm no wallet section and no private-mode toggle; confirm data backup and Health sync are still present.
6. Confirm previously published runs reappear in history after reinstall. **This is the backfill working end to end — check for duplicates explicitly.**
