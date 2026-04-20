# Home Screen Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the Profile and Exercise screens into a single "Home" screen where users see their identity and can start workouts inline, with History as a new 4th bottom tab.

**Architecture:** Replace the 3 action cards on ProfileScreen with an inline activity category bar + the selected tracker screen (which already contains its own HoldToStartButton and CountdownOverlay). Add a tappable earnings card. Move History to a 4th bottom tab. Update all navigation references from "Profile" to "Home" and remove the "Exercise" route.

**Tech Stack:** React Native, React Navigation (bottom tabs + stack), Zustand, AsyncStorage, Supabase (rewards query)

**Key Discovery:** Each individual tracker screen (RunningTrackerScreen, StrengthTrackerScreen, etc.) already renders its own HoldToStartButton in idle state and CountdownOverlay on start. The Home screen does NOT need to extract these — it renders the selected tracker directly, which shows the hold-to-start circle in its idle state.

---

### Task 1: Update route types and names

**Files:**
- Modify: `src/navigation/BottomTabNavigator.tsx`
- Modify: `src/navigation/AppNavigator.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Update BottomTabParamList in BottomTabNavigator.tsx**

Change the type definition at line 60-64:

```typescript
export type BottomTabParamList = {
  Home: { pubkey?: string } | undefined;
  Social: undefined;
  Events: undefined;
  History: undefined;
};
```

- [ ] **Step 2: Update RootStackParamList in AppNavigator.tsx**

At line 53-78, rename `Profile` to `Home` and remove `Exercise`:

```typescript
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Clubs: undefined;
  Home: { pubkey?: string } | undefined;
  ProfileEdit: undefined;
  Wallet: undefined;
  WorkoutHistory: { userId: string; pubkey: string };
  HealthProfile: undefined;
  FitnessTestResults: { testId: string };
  EinundzwanzigDetail: undefined;
  Rewards: undefined;
  AdvancedAnalytics: undefined;
  Settings: undefined;
  StatsDetail: { npub: string };
  Compete: undefined;
  Season2: undefined;
  Season3: undefined;
  Leaderboards: undefined;
  DynamicEventDetail: { eventId: string };
  JournalHistory: undefined;
  LevelDetail: undefined;
  Comments: { postId: string; postEventId: string; postAuthorPubkey: string; commentCount: number };
};
```

- [ ] **Step 3: Update AuthenticatedStackParamList in App.tsx**

At line 286, remove the `Exercise: undefined;` line.

- [ ] **Step 4: Remove Exercise Stack.Screen from AppNavigator.tsx**

Delete lines 401-409 (the Exercise Stack.Screen definition):

```typescript
// DELETE THIS BLOCK:
{/* Exercise Screen - Activity Tracker (accessed from Profile card) */}
<Stack.Screen
  name="Exercise"
  component={ActivityTrackerScreen}
  options={{
    ...defaultScreenOptions,
    headerShown: false,
  }}
/>
```

Also remove the import at line 34:
```typescript
// DELETE:
import { ActivityTrackerScreen } from '../screens/activity/ActivityTrackerScreen';
```

- [ ] **Step 5: Remove Exercise Screen from App.tsx**

Delete lines 555-562 (the Exercise AuthenticatedStack.Screen):

```typescript
// DELETE THIS BLOCK:
{/* Exercise Screen - Activity Tracker (accessed from Profile card) */}
<AuthenticatedStack.Screen
  name="Exercise"
  options={{
    headerShown: false,
  }}
  component={ActivityTrackerScreen}
/>
```

Also remove the ActivityTrackerScreen import if present in App.tsx.

- [ ] **Step 6: Update AppNavigator Profile Stack.Screen name**

At line 197, change:
```typescript
<Stack.Screen name="Home" options={screenConfigurations.Profile}>
```

And update the `getInitialRoute` function at line 116-117:
```typescript
console.log('🎯 AppNavigator: Going to Home');
return 'Home';
```

- [ ] **Step 7: Update screenConfigurations if needed**

Check `src/navigation/screenConfigurations.ts` — if it has a `Profile` key, rename it to `Home` or add a `Home` alias.

- [ ] **Step 8: Run typecheck**

```bash
npm run typecheck
```

Expected: Type errors in files that still reference `'Profile'` or `'Exercise'` route names. These are fixed in Task 2.

- [ ] **Step 9: Commit**

```bash
git add src/navigation/BottomTabNavigator.tsx src/navigation/AppNavigator.tsx src/App.tsx src/navigation/screenConfigurations.ts
git commit -m "Refactor: Rename Profile route to Home, remove Exercise route"
```

---

### Task 2: Update all navigation references

**Files:**
- Modify: `src/navigation/navigationHandlers.ts`
- Modify: `src/components/profile/NotificationModal.tsx`
- Modify: `src/components/club/ClubMembersSection.tsx`
- Modify: `src/components/team/DailyLeaderboardCard.tsx`
- Modify: `src/screens/ProfileScreen.tsx`
- Modify: `src/navigation/BottomTabNavigator.tsx`

- [ ] **Step 1: Update navigationHandlers.ts**

Line 140 — change `'Profile'` to `'Home'`:
```typescript
handleManageWallet: (navigation: any) => {
  navigation.navigate('Home');
},
```

Line 175 — change `'Profile'` to `'Home'`:
```typescript
handleOnboardingComplete: (
  data: { ... },
  navigation: any
) => {
  navigation.navigate('Home');
},
```

- [ ] **Step 2: Update NotificationModal.tsx**

Line 164 — change `'Profile'` to `'Home'`:
```typescript
navigation.navigate('Home');
```

- [ ] **Step 3: Update ClubMembersSection.tsx**

Line 106 — change `'Profile'` to `'Home'`:
```typescript
onPress={() => navigation.navigate('Home', { pubkey: member.member_npub })}
```

- [ ] **Step 4: Update DailyLeaderboardCard.tsx**

Line 115 — change `'Profile'` to `'Home'`:
```typescript
onPress={() => navigation.navigate('Home', { pubkey: entry.npub })}
```

Line 175 — change `'Profile'` to `'Home'`:
```typescript
onPress={() => navigation.navigate('Home', { pubkey: userEntryOutsideTopN.npub })}
```

- [ ] **Step 5: Update BottomTabNavigator.tsx icon check**

Line 119 — change `'Profile'` to `'Home'`:
```typescript
if (route.name === 'Home') {
  iconName = focused ? 'person' : 'person-outline';
}
```

- [ ] **Step 6: Remove handleStartWorkout from ProfileScreen.tsx**

Delete lines 265-268 (the `handleStartWorkout` callback) — this navigation to 'Exercise' is no longer needed:
```typescript
// DELETE:
const handleStartWorkout = useCallback(() => {
  const parent = navigation.getParent();
  (parent || navigation).navigate('Exercise');
}, [navigation]);
```

- [ ] **Step 7: Run typecheck**

```bash
npm run typecheck
```

Expected: Should be cleaner now. Any remaining `'Profile'` or `'Exercise'` references will show as errors.

- [ ] **Step 8: Commit**

```bash
git add src/navigation/navigationHandlers.ts src/components/profile/NotificationModal.tsx src/components/club/ClubMembersSection.tsx src/components/team/DailyLeaderboardCard.tsx src/screens/ProfileScreen.tsx src/navigation/BottomTabNavigator.tsx
git commit -m "Refactor: Update all navigation references from Profile to Home"
```

---

### Task 3: Create the EarningsCard component

**Files:**
- Create: `src/components/rewards/EarningsCard.tsx`

- [ ] **Step 1: Create EarningsCard component**

This is a simple tappable card that shows total rewards earned, navigating to the Rewards screen on tap. It queries the same data source as `EarningsHeroCard` (via `SupabaseRewardService.getEarningsByDestination`).

```typescript
/**
 * EarningsCard - Compact tappable card showing total rewards earned
 * Navigates to Rewards screen on tap.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import { navigate } from '../../navigation/navigationRef';
import { SupabaseRewardService } from '../../services/rewards/SupabaseRewardService';

export const EarningsCard: React.FC = () => {
  const [totalEarned, setTotalEarned] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadEarnings = useCallback(async () => {
    try {
      const pubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (!pubkey) {
        setIsLoading(false);
        return;
      }
      const data = await SupabaseRewardService.getEarningsByDestination(pubkey);
      setTotalEarned(data.reduce((sum, d) => sum + d.totalSats, 0));
    } catch (error) {
      console.warn('[EarningsCard] Failed to load earnings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadEarnings();
  }, [loadEarnings]));

  const handlePress = () => {
    navigate('Rewards');
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Text style={styles.label}>REWARDS EARNED</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value}>
            {isLoading ? '...' : totalEarned.toLocaleString()}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold as any,
    color: theme.colors.textMuted,
    letterSpacing: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
  },
});
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS (no dependencies on changed routes)

- [ ] **Step 3: Commit**

```bash
git add src/components/rewards/EarningsCard.tsx
git commit -m "Feature: Add EarningsCard component for Home screen"
```

---

### Task 4: Rewrite ProfileScreen as HomeScreen with inline activity tracker

**Files:**
- Modify: `src/screens/ProfileScreen.tsx`

This is the core task. Replace the 3 action cards with:
1. EarningsCard (tappable, navigates to Rewards)
2. ActivityCategoryBar + selected tracker screen rendered inline

The tracker screens already contain their own HoldToStartButton (idle state), CountdownOverlay, and full tracking UI. We render them directly.

- [ ] **Step 1: Add new imports to ProfileScreen.tsx**

Add these imports at the top of the file (after existing imports):

```typescript
import { EarningsCard } from '../components/rewards/EarningsCard';
import { ActivityCategoryBar } from '../components/activity/ActivityCategoryBar';
import { activityGridService, type GridPosition } from '../services/activity/ActivityGridService';
import { appPermissionService } from '../services/initialization/AppPermissionService';
import { PermissionRequestModal } from '../components/permissions/PermissionRequestModal';
import { RunningTrackerScreen } from './activity/RunningTrackerScreen';
import { WalkingTrackerScreen } from './activity/WalkingTrackerScreen';
import { CyclingTrackerScreen } from './activity/CyclingTrackerScreen';
import { HikingTrackerScreen } from './activity/HikingTrackerScreen';
import { StrengthTrackerScreen } from './activity/StrengthTrackerScreen';
```

- [ ] **Step 2: Add activity state to the component**

Inside `ProfileScreenComponent`, after the existing state declarations (around line 115), add:

```typescript
// Activity launcher state
const [gridPosition, setGridPosition] = useState<GridPosition>({ row: 0, column: 0 });
const [positionLoaded, setPositionLoaded] = useState(false);
const [isWorkoutActive, setIsWorkoutActive] = useState(false);

// Permission state (deferred to hold-start for cardio)
const [permissionsReady, setPermissionsReady] = useState(false);
const [showPermissionModal, setShowPermissionModal] = useState(false);
```

- [ ] **Step 3: Add activity position loading effect**

After the existing `useEffect` hooks, add:

```typescript
// Load saved activity grid position on mount
useEffect(() => {
  let isMounted = true;
  const loadPosition = async () => {
    const saved = await activityGridService.loadPosition();
    if (isMounted) {
      setGridPosition(saved);
      setPositionLoaded(true);
    }
  };
  loadPosition();
  return () => { isMounted = false; };
}, []);

// Save position when it changes
useEffect(() => {
  if (!positionLoaded) return;
  activityGridService.savePosition(gridPosition);
}, [gridPosition, positionLoaded]);

// Silent permission check on mount (no modal — deferred to hold-start)
useEffect(() => {
  let isMounted = true;
  const checkPermissions = async () => {
    const status = await appPermissionService.checkAllPermissions();
    if (isMounted && status.location) {
      setPermissionsReady(true);
    }
  };
  checkPermissions();
  return () => { isMounted = false; };
}, []);
```

- [ ] **Step 4: Add activity selection handler**

```typescript
const handleActivitySelect = useCallback((row: number, column: number) => {
  setGridPosition({ row, column });
}, []);
```

- [ ] **Step 5: Add renderTracker function**

This renders the appropriate tracker screen based on current grid position. The tracker screens render their own HoldToStartButton in idle state.

```typescript
type StrengthExercise = 'pushups' | 'pullups' | 'situps' | 'curls' | 'bench';

const renderTracker = () => {
  if (!positionLoaded) return null;

  const { category, activity } = activityGridService.getActivityAt(gridPosition);
  const isCardio = category.key === 'cardio';

  // For cardio, check permissions before rendering tracker
  if (isCardio && !permissionsReady) {
    return (
      <View style={styles.permissionGate}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => setShowPermissionModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.actionCardText}>ENABLE LOCATION TO START</Text>
        </TouchableOpacity>
      </View>
    );
  }

  switch (category.key) {
    case 'cardio':
      switch (activity) {
        case 'run':
          return <RunningTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
        case 'walk':
          return <WalkingTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
        case 'cycle':
          return <CyclingTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
        case 'hiking':
          return <HikingTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
        default:
          return <RunningTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
      }
    case 'strength': {
      const validExercises: StrengthExercise[] = ['pushups', 'pullups', 'situps', 'curls', 'bench'];
      const exercise = validExercises.includes(activity as StrengthExercise)
        ? (activity as StrengthExercise)
        : 'pushups';
      return <StrengthTrackerScreen initialExercise={exercise} />;
    }
    default:
      return <RunningTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
  }
};
```

- [ ] **Step 6: Replace the owner view JSX**

Replace the `{isOwner ? (` block (lines 319-332) that renders the 3 action cards. The new owner view shows EarningsCard + ActivityCategoryBar + inline tracker:

```typescript
{isOwner ? (
  <>
    {/* Earnings card — tappable, navigates to Rewards */}
    {!isWorkoutActive && (
      <View style={styles.sectionGap}>
        <EarningsCard />
      </View>
    )}

    {/* Activity category bar */}
    {!isWorkoutActive && (
      <View style={styles.sectionGap}>
        <ActivityCategoryBar
          gridPosition={gridPosition}
          onActivitySelect={handleActivitySelect}
          isWorkoutActive={isWorkoutActive}
        />
      </View>
    )}

    {/* Inline tracker (renders hold-to-start in idle, full tracker when active) */}
    <View style={isWorkoutActive ? styles.fullScreenTracker : styles.trackerContainer}>
      {renderTracker()}
    </View>
  </>
) : (
```

- [ ] **Step 7: Hide the header and ProfileHero during active workout**

Wrap the existing header and ProfileHero sections in `!isWorkoutActive` checks. The ScrollView wrapper also needs adjusting — when a workout is active, we want the tracker to take over the full screen.

Replace the return statement to conditionally hide dashboard content:

```typescript
return (
  <TexturedBackground>
    {/* Header — hidden during active workout */}
    {isOwner && !isWorkoutActive && (
      <View style={styles.header}>
        {musicPlayerHeaderEnabled ? (
          <HeaderMusicControls onSettingsPress={handleSettingsPress} />
        ) : (
          <>
            <View style={styles.headerSpacer} />
            <TouchableOpacity style={styles.headerButton} onPress={handleSettingsPress}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="menu-outline" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </>
        )}
      </View>
    )}

    {/* Full-screen tracker takeover when workout active */}
    {isOwner && isWorkoutActive ? (
      <View style={styles.fullScreenTracker}>
        {renderTracker()}
      </View>
    ) : (
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}
        refreshControl={isOwner ? <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={theme.colors.text} /> : undefined}>
        <View style={styles.sectionGap}>
          <ProfileHero user={isOwner ? data.user : otherUser} isOwner={isOwner}
            isLoading={isOwner ? isLoadingSections : !otherUser}
            level={levelData?.level ?? 0}
            streak={isOwner ? currentStreak : undefined}
            onEditPress={isOwner ? handleEditPress : undefined}
            onBackPress={!isOwner ? () => navigation.goBack() : undefined}
            onSettingsPress={undefined}
            onLevelPress={() => {
              const parent = navigation.getParent();
              (parent || navigation).navigate('LevelDetail' as any);
            }} />
        </View>

        {isOwner && (
          <View style={styles.sectionGap}>
            <NotificationBadge onPress={() => setShowNotificationModal(true)} />
          </View>
        )}

        {isOwner ? (
          <>
            <View style={styles.sectionGap}>
              <EarningsCard />
            </View>

            <View style={styles.sectionGap}>
              <ActivityCategoryBar
                gridPosition={gridPosition}
                onActivitySelect={handleActivitySelect}
                isWorkoutActive={false}
              />
            </View>

            <View style={styles.trackerContainer}>
              {renderTracker()}
            </View>
          </>
        ) : (
          <>
            <View style={styles.sectionGap}>
              <LevelCard levelData={levelData} isLoading={isLoadingSections} />
            </View>

            <View style={styles.sectionGap}>
              <ActivityBreakdown breakdown={activityBreakdown} isLoading={isLoadingSections} />
            </View>

            <View style={styles.sectionGap}>
              <ClubAffiliationsSection clubs={clubs} onClubPress={(id) => {
                const club = clubs.find(c => c.id === id);
                handleClubPress(id, club?.name || '');
              }} />
            </View>
          </>
        )}
      </ScrollView>
    )}

    {/* Permission modal — shown when user taps "enable location" for cardio */}
    {showPermissionModal && (
      <PermissionRequestModal
        visible={true}
        onComplete={() => {
          setShowPermissionModal(false);
          setPermissionsReady(true);
        }}
      />
    )}

    {isOwner && (
      <NotificationModal visible={showNotificationModal} onClose={() => setShowNotificationModal(false)} />
    )}
  </TexturedBackground>
);
```

- [ ] **Step 8: Add new styles**

Add to the StyleSheet:

```typescript
trackerContainer: {
  flex: 1,
  minHeight: 400,
},
fullScreenTracker: {
  flex: 1,
},
permissionGate: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
},
```

- [ ] **Step 9: Remove unused imports and code**

Remove the `handleStartWorkout` callback and the `handleDestinationPress` callback (replaced by EarningsCard's built-in navigation). Clean up any unused imports.

- [ ] **Step 10: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS or only pre-existing errors.

- [ ] **Step 11: Commit**

```bash
git add src/screens/ProfileScreen.tsx
git commit -m "Feature: Merge activity tracker into Home screen, replace action cards"
```

---

### Task 5: Update BottomTabNavigator with Home rename and History tab

**Files:**
- Modify: `src/navigation/BottomTabNavigator.tsx`

- [ ] **Step 1: Add WorkoutHistoryScreen import**

Add at the top with the other imports:

```typescript
import { WorkoutHistoryScreen } from '../screens/WorkoutHistoryScreen';
```

- [ ] **Step 2: Update Tab.Screen name and initialRouteName**

Change `initialRouteName="Profile"` to `initialRouteName="Home"` at line 137.

Change the Profile Tab.Screen name from `"Profile"` to `"Home"` at line 141.

Update the title option — remove the i18n reference and use a static string:

```typescript
<Tab.Screen
  name="Home"
  options={{
    title: 'Home',
    headerShown: false,
  }}
>
```

- [ ] **Step 3: Add icon for Home and History in screenOptions**

Update the icon logic (lines 116-125) to add History:

```typescript
tabBarIcon: ({ focused, color, size }) => {
  let iconName: keyof typeof Ionicons.glyphMap = 'help-outline';

  if (route.name === 'Home') {
    iconName = focused ? 'person' : 'person-outline';
  } else if (route.name === 'Social') {
    iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
  } else if (route.name === 'Events') {
    iconName = focused ? 'trophy' : 'trophy-outline';
  } else if (route.name === 'History') {
    iconName = focused ? 'time' : 'time-outline';
  }

  return (
    <Ionicons
      name={iconName}
      size={size || 24}
      color={color}
      style={styles.tabIcon}
    />
  );
},
```

- [ ] **Step 4: Add History Tab.Screen**

After the Events Tab.Screen, add:

```typescript
{/* History Tab - Workout History */}
<Tab.Screen
  name="History"
  options={{
    title: 'History',
    headerShown: false,
    lazy: true,
  }}
>
  {() => (
    <Suspense fallback={<LoadingFallback />}>
      <WorkoutHistoryScreen />
    </Suspense>
  )}
</Tab.Screen>
```

- [ ] **Step 5: Update BottomTabParamList type**

Ensure it matches what was set in Task 1:

```typescript
export type BottomTabParamList = {
  Home: { pubkey?: string } | undefined;
  Social: undefined;
  Events: undefined;
  History: undefined;
};
```

- [ ] **Step 6: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/navigation/BottomTabNavigator.tsx
git commit -m "Feature: Rename Profile tab to Home, add History as 4th tab"
```

---

### Task 6: Verify and fix remaining references

**Files:**
- Potentially modify: any file still referencing `'Profile'` or `'Exercise'` routes

- [ ] **Step 1: Search for any remaining Profile route references**

```bash
cd /Users/dakotabrown/runstr.project && grep -rn "navigate('Profile'" src/ --include="*.tsx" --include="*.ts"
```

Expected: No results. If any remain, update them to `'Home'`.

- [ ] **Step 2: Search for any remaining Exercise route references**

```bash
cd /Users/dakotabrown/runstr.project && grep -rn "navigate('Exercise'" src/ --include="*.tsx" --include="*.ts"
```

Expected: No results. If any remain, remove them.

- [ ] **Step 3: Search for route.name === 'Profile'**

```bash
cd /Users/dakotabrown/runstr.project && grep -rn "route.name.*Profile\|name.*'Profile'" src/ --include="*.tsx" --include="*.ts"
```

Expected: No results.

- [ ] **Step 4: Run full typecheck**

```bash
npm run typecheck
```

Expected: PASS (or only pre-existing errors unrelated to this change).

- [ ] **Step 5: Commit if any fixes were needed**

```bash
git add -A
git commit -m "Fix: Clean up remaining Profile/Exercise route references"
```

---

### Task 7: Manual testing checklist

- [ ] **Step 1: Start the dev server**

```bash
npx expo start
```

Build to simulator and test each flow:

- [ ] **Step 2: Test Home screen idle state**

Verify: ProfileHero shows at top, EarningsCard shows below it, ActivityCategoryBar shows with Cardio/Strength toggle, selected tracker shows hold-to-start circle below.

- [ ] **Step 3: Test activity switching**

Tap Cardio, then tap different activity pills (Run, Walk, Cycle, Hike). Verify the hold-to-start label changes. Switch to Strength — verify strength exercises show.

- [ ] **Step 4: Test hold-to-start and full-screen takeover**

Hold the start button for 2 seconds. Verify countdown (3-2-1-GO), then full-screen tracker takes over (header and dashboard hidden). Stop the workout, dismiss summary — verify return to Home idle state.

- [ ] **Step 5: Test permission flow for cardio (first-time)**

If location permissions haven't been granted, selecting a cardio activity should show a permission gate. Tapping it shows the PermissionRequestModal. After granting, the tracker renders normally.

- [ ] **Step 6: Test earnings card**

Tap the earnings card. Verify it navigates to the Rewards screen.

- [ ] **Step 7: Test History tab**

Tap the History tab in the bottom navigator. Verify WorkoutHistoryScreen shows with workout data.

- [ ] **Step 8: Test other user profile**

Navigate to a leaderboard or club members list. Tap on another user. Verify their profile view loads correctly (LevelCard, ActivityBreakdown, ClubAffiliations — NOT the Home screen activity launcher).

- [ ] **Step 9: Test navigation from clubs and leaderboards**

Verify tapping a user in DailyLeaderboardCard or ClubMembersSection navigates to their profile on the Home tab.

- [ ] **Step 10: Final commit**

```bash
git add -A
git commit -m "Feature: Home screen redesign — merged profile + activity, History tab"
```
