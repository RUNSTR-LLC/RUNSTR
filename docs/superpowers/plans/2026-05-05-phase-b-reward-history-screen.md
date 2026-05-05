# Phase B — Reward Transaction Screen: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the History bottom-tab destination with a new `RewardHistoryScreen` — a per-payment ledger showing every successful reward the user has earned, with a monthly-earned headline. The existing `WorkoutHistoryScreen` stays alive and is reached from Settings via a new "All Workouts" row.

**Architecture:** Single new screen (`RewardHistoryScreen`) reads `reward_payments` rows for the current user via the existing `SupabaseRewardService.getPaymentHistory(pubkey)`. Renders a monthly-total header, then date-grouped rows (TODAY / YESTERDAY / older). Each row has a leading activity icon, label ("Workout reward" / "Steps reward"), and `+N sats` aligned right. Tap a row to expand inline showing full timestamp, paid-to address, and (if present) payment hash. The bottom-tab nav swaps which screen the History tab renders; `WorkoutHistoryScreen` stays registered as a Stack.Screen and gets a new entry from Settings.

**Tech Stack:** React Native + TypeScript (Expo). AsyncStorage to read `@runstr:hex_pubkey`. Verification via `npm run typecheck` and a short `npx tsx` script.

**Reference spec:** `docs/superpowers/specs/2026-05-05-rewards-first-navigation-design.md` (Phase B section).

---

## File Map

| File | Change | Why |
|---|---|---|
| `src/screens/RewardHistoryScreen.tsx` | Create | New screen — header + date-grouped ledger + inline expand |
| `src/navigation/BottomTabNavigator.tsx` | Modify | History bottom-tab routes to `RewardHistoryScreen` instead of `WorkoutHistoryScreen` |
| `src/screens/SettingsScreen.tsx` | Modify | Add an "All Workouts" entry that navigates to `WorkoutHistoryScreen` |
| `src/components/settings/WorkoutDataSection.tsx` | Create | New small SettingsScreen section component hosting the "All Workouts" row (mirrors the existing AppleHealthSection pattern) |
| `scripts/verify/verify-reward-history.ts` | Create | Sanity script confirming the new screen exists, the History tab points at it, and Settings exposes "All Workouts" |

**Spec deviations to flag explicitly here:**

1. **Payment rows do not link to specific workouts.** The `reward_payments` table schema (verified via `supabase/migrations/126_reward_payments_table.sql`) has no `workout_id` column. Each payment carries a coarse `reward_type` of `'workout'` or `'steps'` but cannot be tied back to a specific local workout. The spec said "tap to expand shows distance / duration / pace / calories"; the actual implementation surfaces payment metadata instead (full timestamp, paid-to address, payment hash). The activity icon and label still convey workout-vs-steps.

2. **Apple Health Sync is already in Settings.** The spec said "Apple Health Sync moves to Settings"; in fact `<AppleHealthSection />` already renders inside `SettingsScreen.tsx`. So no Apple Health entry is added here. Just the "All Workouts" entry is new. Health Connect controls remain reachable through the WorkoutHistoryScreen sub-tab (which is now reached from "All Workouts").

**Data assumptions:**
- The current user's pubkey (hex) lives at AsyncStorage key `@runstr:hex_pubkey` (verified in `RewardsScreen.tsx:176`).
- `SupabaseRewardService.getPaymentHistory(pubkey)` returns `PaymentRecord[]` ordered by `paid_at` DESC, capped at 500 rows. We filter client-side to `status === 'success'`.
- `PaymentRecord` shape (verified in `SupabaseRewardService.ts:24-37`): `id`, `npub`, `lightning_address`, `amount_sats`, `reward_type`, `is_ein_bonus`, `charity_id`, `payment_hash`, `preimage`, `status`, `error_message`, `paid_at`.

---

## Task 1: Create the RewardHistoryScreen

**Files:**
- Create: `src/screens/RewardHistoryScreen.tsx`

- [ ] **Step 1.1: Create the file**

Write the file with the following content:

```typescript
/**
 * RewardHistoryScreen — Reward transaction ledger.
 *
 * Replaces the History bottom-tab content as part of the rewards-first
 * navigation simplification (see
 * docs/superpowers/specs/2026-05-05-rewards-first-navigation-design.md).
 *
 * Shows a per-payment list of successful reward payouts, grouped by
 * date, with a monthly-total headline at the top. Tap a row to expand
 * inline showing payment metadata (timestamp, paid-to, payment hash).
 *
 * Reads from reward_payments via SupabaseRewardService.getPaymentHistory.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../styles/theme';
import { TexturedBackground } from '../components/ui/TexturedBackground';
import { SupabaseRewardService } from '../services/rewards/SupabaseRewardService';
import type { PaymentRecord } from '../services/rewards/SupabaseRewardService';

type RewardType = 'workout' | 'steps' | 'other';

interface RewardSection {
  title: string;
  data: PaymentRecord[];
}

const formatDateHeader = (date: Date, today: Date): string => {
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return 'TODAY';

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(date, yesterday)) return 'YESTERDAY';

  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${days[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}`;
};

const startOfCurrentMonth = (): number => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const groupByDate = (payments: PaymentRecord[]): RewardSection[] => {
  const today = new Date();
  const sections = new Map<string, PaymentRecord[]>();
  for (const p of payments) {
    const d = new Date(p.paid_at);
    const key = formatDateHeader(d, today);
    const arr = sections.get(key) ?? [];
    arr.push(p);
    sections.set(key, arr);
  }
  return Array.from(sections.entries()).map(([title, data]) => ({ title, data }));
};

const classifyReward = (rewardType: string): RewardType => {
  if (rewardType === 'workout') return 'workout';
  if (rewardType === 'steps') return 'steps';
  return 'other';
};

const labelFor = (type: RewardType): string => {
  if (type === 'workout') return 'Workout reward';
  if (type === 'steps') return 'Steps reward';
  return 'Reward';
};

const iconFor = (type: RewardType): React.ComponentProps<typeof Ionicons>['name'] => {
  if (type === 'workout') return 'fitness-outline';
  if (type === 'steps') return 'footsteps-outline';
  return 'star-outline';
};

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};

const truncateMiddle = (s: string, head = 8, tail = 6): string => {
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
};

interface RewardRowProps {
  payment: PaymentRecord;
  expanded: boolean;
  onToggle: () => void;
}

const RewardRow: React.FC<RewardRowProps> = ({ payment, expanded, onToggle }) => {
  const type = classifyReward(payment.reward_type);
  const label = labelFor(type);
  const icon = iconFor(type);
  const time = formatTime(payment.paid_at);

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${payment.amount_sats} sats, tap for details`}
    >
      <View style={styles.rowMain}>
        <Ionicons
          name={icon}
          size={20}
          color={theme.colors.text}
          style={styles.rowIcon}
        />
        <Text style={styles.rowLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.rowAmount}>+{payment.amount_sats} sats</Text>
      </View>
      {expanded && (
        <View style={styles.rowDetails}>
          <Text style={styles.detailText}>Earned at {time}</Text>
          {payment.lightning_address ? (
            <Text style={styles.detailText} numberOfLines={1}>
              Paid to {payment.lightning_address}
            </Text>
          ) : null}
          {payment.payment_hash ? (
            <Text style={styles.detailText} numberOfLines={1}>
              Hash {truncateMiddle(payment.payment_hash)}
            </Text>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
};

export const RewardHistoryScreen: React.FC = () => {
  const [pubkey, setPubkey] = useState<string>('');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load pubkey once on mount
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem('@runstr:hex_pubkey').then((value) => {
      if (!cancelled && value) setPubkey(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadPayments = useCallback(
    async (currentPubkey: string) => {
      if (!currentPubkey) {
        setPayments([]);
        setIsLoading(false);
        return;
      }
      try {
        const all = await SupabaseRewardService.getPaymentHistory(currentPubkey);
        const successOnly = all.filter((p: PaymentRecord) => p.status === 'success');
        setPayments(successOnly);
      } catch (err) {
        console.warn('[RewardHistoryScreen] getPaymentHistory failed:', err);
        setPayments([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (pubkey) {
        setIsLoading((prev) => prev || payments.length === 0);
        loadPayments(pubkey).catch(() => {
          if (!cancelled) setIsLoading(false);
        });
      }
      return () => {
        cancelled = true;
      };
    }, [pubkey, loadPayments, payments.length]),
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadPayments(pubkey);
  }, [pubkey, loadPayments]);

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const monthlyTotal = useMemo(() => {
    const start = startOfCurrentMonth();
    return payments
      .filter((p) => new Date(p.paid_at).getTime() >= start)
      .reduce((sum, p) => sum + p.amount_sats, 0);
  }, [payments]);

  const sections = useMemo(() => groupByDate(payments), [payments]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TexturedBackground edges={[]}>
        <View style={styles.header}>
          <Text style={styles.headerNumber}>{monthlyTotal.toLocaleString()}</Text>
          <Text style={styles.headerSubtitle}>sats this month</Text>
        </View>

        {isLoading && payments.length === 0 ? (
          <View style={styles.centerArea}>
            <ActivityIndicator size="large" color={theme.colors.text} />
          </View>
        ) : payments.length === 0 ? (
          <View style={styles.centerArea}>
            <Text style={styles.emptyText}>
              Complete a cardio workout to earn your first reward.
            </Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <RewardRow
                payment={item}
                expanded={expandedId === item.id}
                onToggle={() => handleToggle(item.id)}
              />
            )}
            renderSectionHeader={({ section }) => (
              <Text style={styles.sectionHeader}>{section.title}</Text>
            )}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.text}
              />
            }
          />
        )}
      </TexturedBackground>
    </SafeAreaView>
  );
};

export default RewardHistoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  headerNumber: {
    color: theme.colors.text,
    fontSize: 32,
    fontWeight: theme.typography.weights.bold,
  },
  headerSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: theme.typography.weights.regular,
    marginTop: 2,
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: 24,
  },
  sectionHeader: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: {
    marginRight: 12,
  },
  rowLabel: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.typography.weights.regular,
  },
  rowAmount: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
  },
  rowDetails: {
    paddingLeft: 32,
    paddingTop: 8,
  },
  detailText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: theme.typography.weights.regular,
    marginTop: 2,
  },
});
```

- [ ] **Step 1.2: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS clean. The service exports as a named singleton (`export const SupabaseRewardService = new SupabaseRewardServiceClass()` at line 413).

- [ ] **Step 1.3: Commit**

```bash
git add src/screens/RewardHistoryScreen.tsx
git commit -m "$(cat <<'EOF'
Feature: RewardHistoryScreen — per-payment ledger

New screen that will become the History bottom-tab destination in the
next commit. Reads reward_payments rows for the current user via
SupabaseRewardService.getPaymentHistory, filters to status='success',
groups by date (TODAY / YESTERDAY / older), and shows a monthly total
at the top.

Each row is one payment: leading activity icon (workout/steps),
label, +N sats trailing. Tap a row to expand inline showing the full
timestamp, paid-to address, and payment hash.

Spec deviation: payments do not carry workout_id, so expand shows
payment metadata rather than workout details. Documented in the plan.
EOF
)"
```

---

## Task 2: Repoint History bottom tab to RewardHistoryScreen

**Files:**
- Modify: `src/navigation/BottomTabNavigator.tsx`

- [ ] **Step 2.1: Locate the existing History tab definition**

```bash
grep -n "WorkoutHistoryScreen\|History" src/navigation/BottomTabNavigator.tsx | head -10
```

Expected hits:
- A lazy import of `WorkoutHistoryScreen`
- A `<Tab.Screen name="History">` block rendering `<WorkoutHistoryScreen />` inside Suspense
- A `case 'History'` icon mapping in the tabBarIcon function (if present)

- [ ] **Step 2.2: Replace the lazy import**

Find the lazy import for `WorkoutHistoryScreen`. It looks like:

```typescript
const WorkoutHistoryScreen = React.lazy(() =>
  import('../screens/WorkoutHistoryScreen').then((m) => ({
    default: m.WorkoutHistoryScreen,
  }))
);
```

Replace with:

```typescript
const RewardHistoryScreen = React.lazy(() =>
  import('../screens/RewardHistoryScreen').then((m) => ({
    default: m.RewardHistoryScreen,
  }))
);
```

(If both `WorkoutHistoryScreen` and `RewardHistoryScreen` are needed elsewhere in this file, leave the existing lazy import in place and add the new one. Verify with grep before deleting.)

- [ ] **Step 2.3: Update the History Tab.Screen render**

Find:

```tsx
<Tab.Screen
  name="History"
  options={{
    title: t('profile:tabHistory'),
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

Replace `<WorkoutHistoryScreen />` with `<RewardHistoryScreen />`. Leave everything else (name, options, lazy flag, Suspense) untouched:

```tsx
<Tab.Screen
  name="History"
  options={{
    title: t('profile:tabHistory'),
    headerShown: false,
    lazy: true,
  }}
>
  {() => (
    <Suspense fallback={<LoadingFallback />}>
      <RewardHistoryScreen />
    </Suspense>
  )}
</Tab.Screen>
```

- [ ] **Step 2.4: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS clean.

- [ ] **Step 2.5: Commit**

```bash
git add src/navigation/BottomTabNavigator.tsx
git commit -m "$(cat <<'EOF'
Feature: History tab points to RewardHistoryScreen

Bottom-tab History destination swaps from WorkoutHistoryScreen to
the new RewardHistoryScreen. The existing WorkoutHistoryScreen stays
registered as a Stack.Screen and will be reached via Settings in the
next commit ("All Workouts" entry).

Reversibility: if the new screen needs to come out, this is a one-line
swap back.
EOF
)"
```

---

## Task 3: Add "All Workouts" row to Settings

**Files:**
- Create: `src/components/settings/WorkoutDataSection.tsx`
- Modify: `src/screens/SettingsScreen.tsx`

- [ ] **Step 3.1: Create the section component**

Write `src/components/settings/WorkoutDataSection.tsx`:

```typescript
/**
 * WorkoutDataSection — Settings row group for the multi-source workout
 * history view. Sits in SettingsScreen alongside AppleHealthSection,
 * DataBackupSection, etc.
 *
 * Currently exposes one row: "All Workouts" → WorkoutHistoryScreen.
 * Future entries (e.g. workout export, source-specific filters) can
 * be added inside the same view.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { settingsStyles as styles } from '../../screens/settingsStyles';
import { SettingItem } from './SettingItem';

interface WorkoutDataSectionProps {
  onAllWorkoutsPress: () => void;
}

export const WorkoutDataSection: React.FC<WorkoutDataSectionProps> = ({
  onAllWorkoutsPress,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Workout Data</Text>
    <SettingItem
      title="All Workouts"
      subtitle="See your full workout history across all sources"
      onPress={onAllWorkoutsPress}
    />
  </View>
);
```

- [ ] **Step 3.2: Confirm `settingsStyles` exposes `section` and `sectionTitle`**

```bash
grep -n "section:\|sectionTitle:" src/screens/settingsStyles.ts | head -5
```

Expected: both names present. If the codebase uses different style names, look at how `AppleHealthSection.tsx` imports `settingsStyles` and reuse the same names. Adapt the WorkoutDataSection to match.

- [ ] **Step 3.3: Hook up navigation in SettingsScreen**

Read the top of `SettingsScreen.tsx` to confirm the import grouping pattern:

```bash
sed -n '30,45p' src/screens/SettingsScreen.tsx
```

Then use `Edit` to add the import alongside the other section imports:

```typescript
import { WorkoutDataSection } from '../components/settings/WorkoutDataSection';
```

- [ ] **Step 3.4: Add `useNavigation` if not already imported**

```bash
grep -n "useNavigation" src/screens/SettingsScreen.tsx | head -3
```

If not present, add:

```typescript
import { useNavigation } from '@react-navigation/native';
```

- [ ] **Step 3.5: Pull a navigation handle inside the component**

Find the top of the `SettingsScreen` component body (right after `const state = useSettingsState(onSignOut);`). Add:

```typescript
const navigation = useNavigation<any>();
```

- [ ] **Step 3.6: Render the new section in the scroll view**

Find the existing `<DataBackupSection ... />` render block. Insert `<WorkoutDataSection />` directly before it (so "Workout Data" sits next to "Data Backup" — both data-management concerns):

```tsx
<WorkoutDataSection
  onAllWorkoutsPress={() => navigation.navigate('WorkoutHistory')}
/>

<DataBackupSection
  ...
/>
```

- [ ] **Step 3.7: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS clean. If `'WorkoutHistory'` isn't a known route, the typecheck may flag it depending on the navigator's typing — `useNavigation<any>()` should bypass that.

- [ ] **Step 3.8: Commit**

```bash
git add src/components/settings/WorkoutDataSection.tsx src/screens/SettingsScreen.tsx
git commit -m "$(cat <<'EOF'
Feature: Settings 'All Workouts' entry

Adds a new WorkoutDataSection in SettingsScreen with one row,
"All Workouts", that navigates to WorkoutHistoryScreen — preserving
access to the multi-source workout list (Local / Apple Health /
Health Connect) now that the History bottom tab points elsewhere.

AppleHealthSection already lives in Settings, so no separate Apple
Health entry is needed. Health Connect controls remain reachable via
the WorkoutHistoryScreen sub-tabs (one tap deeper from "All Workouts").
EOF
)"
```

---

## Task 4: Verification script + final typecheck + push

**Files:**
- Create: `scripts/verify/verify-reward-history.ts`

- [ ] **Step 4.1: Write the script**

Create `scripts/verify/verify-reward-history.ts`:

```typescript
/**
 * Verification: Phase B reward-history wiring.
 *
 * Asserts:
 *  - RewardHistoryScreen.tsx exists and exports RewardHistoryScreen
 *  - BottomTabNavigator routes the History tab to RewardHistoryScreen
 *  - WorkoutHistoryScreen is no longer the History tab destination
 *  - SettingsScreen renders WorkoutDataSection
 *  - WorkoutDataSection navigates to WorkoutHistory
 *
 * Static checks via source regex (avoids importing RN-coupled modules
 * which esbuild/tsx cannot transform — same approach as
 * verify-team-line.ts).
 *
 * Run: npx tsx scripts/verify/verify-reward-history.ts
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const repoRoot = resolve(__dirname, '../..');
const failures: string[] = [];

const expect = (label: string, ok: boolean, detail?: string) => {
  if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
};

// 1. Screen file exists and exports the screen
const screenPath = resolve(repoRoot, 'src/screens/RewardHistoryScreen.tsx');
expect('RewardHistoryScreen.tsx exists', existsSync(screenPath));
if (existsSync(screenPath)) {
  const src = readFileSync(screenPath, 'utf8');
  expect(
    'RewardHistoryScreen.tsx exports RewardHistoryScreen',
    /export\s+const\s+RewardHistoryScreen/.test(src),
  );
  expect(
    'RewardHistoryScreen.tsx imports SupabaseRewardService',
    /SupabaseRewardService/.test(src),
  );
  expect(
    'RewardHistoryScreen.tsx filters to success',
    /status === ['"]success['"]/.test(src),
  );
}

// 2. Bottom tab navigator points History at RewardHistoryScreen
const navPath = resolve(repoRoot, 'src/navigation/BottomTabNavigator.tsx');
const navSrc = readFileSync(navPath, 'utf8');
expect(
  'BottomTabNavigator imports RewardHistoryScreen',
  /RewardHistoryScreen/.test(navSrc),
);
expect(
  'BottomTabNavigator does NOT use WorkoutHistoryScreen for the History tab',
  !/<WorkoutHistoryScreen\s*\/>/.test(navSrc),
  'WorkoutHistoryScreen is still rendered inside the bottom-tab navigator',
);

// 3. Settings hosts WorkoutDataSection
const sectionPath = resolve(repoRoot, 'src/components/settings/WorkoutDataSection.tsx');
expect('WorkoutDataSection.tsx exists', existsSync(sectionPath));
if (existsSync(sectionPath)) {
  const src = readFileSync(sectionPath, 'utf8');
  expect(
    'WorkoutDataSection has an All Workouts entry',
    /All Workouts/.test(src),
  );
}

const settingsPath = resolve(repoRoot, 'src/screens/SettingsScreen.tsx');
const settingsSrc = readFileSync(settingsPath, 'utf8');
expect(
  'SettingsScreen imports WorkoutDataSection',
  /WorkoutDataSection/.test(settingsSrc),
);
expect(
  "SettingsScreen wires onAllWorkoutsPress to navigate('WorkoutHistory')",
  /navigation\.navigate\(['"]WorkoutHistory['"]\)/.test(settingsSrc),
);

if (failures.length > 0) {
  console.error('Reward-history verification FAILED:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('Reward-history verification PASSED.');
console.log('  RewardHistoryScreen.tsx: exists + exports RewardHistoryScreen');
console.log('  BottomTabNavigator: History tab -> RewardHistoryScreen');
console.log('  WorkoutDataSection.tsx: exists with All Workouts entry');
console.log('  SettingsScreen: imports WorkoutDataSection + navigates to WorkoutHistory');
```

- [ ] **Step 4.2: Run the verification script**

```bash
npx tsx scripts/verify/verify-reward-history.ts
```

Expected:

```
Reward-history verification PASSED.
  RewardHistoryScreen.tsx: exists + exports RewardHistoryScreen
  BottomTabNavigator: History tab -> RewardHistoryScreen
  WorkoutDataSection.tsx: exists with All Workouts entry
  SettingsScreen: imports WorkoutDataSection + navigates to WorkoutHistory
```

- [ ] **Step 4.3: Final typecheck**

```bash
npm run typecheck
```

Expected: PASS clean.

- [ ] **Step 4.4: Commit**

```bash
git add scripts/verify/verify-reward-history.ts
git commit -m "$(cat <<'EOF'
Chore: Add verify-reward-history.ts

Static-check verification script for Phase B (RewardHistoryScreen as
the new History tab + Settings 'All Workouts' entry into the existing
WorkoutHistoryScreen).

Source-regex pattern matches the verify-team-line.ts approach: avoids
importing RN-coupled modules under tsx.
EOF
)"
```

- [ ] **Step 4.5: Push to main**

```bash
git pull --ff-only
git push origin main
```

If `git pull --ff-only` fails (someone pushed in the meantime), `git pull --rebase`, re-run `npm run typecheck`, re-run the verification script, then push.

---

## Manual smoke test (after merge)

Per `feedback_always_erase_simulator.md`: erase + reinstall the simulator before testing.

For a user with a few successful payments in `reward_payments`:

- [ ] Open the app on the simulator
- [ ] Tap the History bottom tab
- [ ] Verify the screen shows "X sats this month" at top + a list of grouped payment rows
- [ ] Tap a row → row expands to show timestamp, paid-to address, optional payment hash
- [ ] Tap the same row → row collapses
- [ ] Pull down to refresh → list re-fetches

For a user with zero successful payments:

- [ ] Open the History tab
- [ ] Verify the screen shows "0 sats this month" + the empty-state message ("Complete a cardio workout to earn your first reward.")

For Settings:

- [ ] Open Settings (Profile → menu icon)
- [ ] Find the "Workout Data" section
- [ ] Tap "All Workouts" → confirm it pushes the existing WorkoutHistoryScreen with its Local / Apple Health / Health Connect tabs

If any of those fail, file a follow-up. If all pass, Phase B is shipped and the rewards-first navigation simplification is complete.
