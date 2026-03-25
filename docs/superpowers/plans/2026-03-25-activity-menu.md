# Activity Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a category bar with dropdown activity pills to ActivityTrackerScreen so users can visually discover and switch activities.

**Architecture:** Three new components (`ActivityCategoryBar`, `ActivityDropdown`, `ActivityPill`) sit above the existing `SwipeGridNavigator` in the view tree. Tapping a category opens a dropdown of activity icons; tapping an activity updates the grid position through the existing `ActivityGridService`. The Wellness and Mindfulness categories merge into one. Swipe navigation continues to work alongside the bar.

**Tech Stack:** React Native, TypeScript, Ionicons, react-native-reanimated, existing ActivityGridService

**Spec:** `docs/superpowers/specs/2026-03-25-activity-menu-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/components/activity/ActivityPill.tsx` | Single activity icon + label, tappable |
| `src/components/activity/ActivityDropdown.tsx` | Animated row of activity pills for one category |
| `src/components/activity/ActivityCategoryBar.tsx` | Category labels, open/close state, renders dropdown + overlay |
| `src/types/activityMenu.ts` | Activity-to-icon mapping constant, types |

### Modified Files
| File | Change |
|------|--------|
| `src/services/activity/ActivityGridService.ts` | Merge Wellness + Mindfulness into one category |
| `src/screens/activity/ActivityTrackerScreen.tsx` | Add category bar, update renderContent for merged wellness |

---

## Task 1: Activity Menu Types & Icon Mapping

**Files:**
- Create: `src/types/activityMenu.ts`

- [ ] **Step 1: Create type definitions and icon mapping**

```typescript
// src/types/activityMenu.ts

import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface ActivityIconConfig {
  key: string;
  label: string;
  icon: IoniconName;
}

export interface CategoryConfig {
  key: string;
  label: string;
  activities: ActivityIconConfig[];
}

export const CATEGORY_MENU: CategoryConfig[] = [
  {
    key: 'cardio',
    label: 'Cardio',
    activities: [
      { key: 'run', label: 'Run', icon: 'fitness-outline' },
      { key: 'walk', label: 'Walk', icon: 'walk-outline' },
      { key: 'cycle', label: 'Cycle', icon: 'bicycle-outline' },
      { key: 'hiking', label: 'Hike', icon: 'compass-outline' },
    ],
  },
  {
    key: 'strength',
    label: 'Strength',
    activities: [
      { key: 'pushups', label: 'Pushups', icon: 'fitness-outline' },
      { key: 'pullups', label: 'Pull-ups', icon: 'barbell-outline' },
      { key: 'situps', label: 'Sit-ups', icon: 'body-outline' },
      { key: 'squats', label: 'Squats', icon: 'walk-outline' },
      { key: 'curls', label: 'Curls', icon: 'fitness-outline' },
      { key: 'bench', label: 'Bench', icon: 'barbell-outline' },
    ],
  },
  {
    key: 'wellness',
    label: 'Wellness',
    activities: [
      { key: 'guided', label: 'Guided', icon: 'headset-outline' },
      { key: 'unguided', label: 'Unguided', icon: 'leaf-outline' },
      { key: 'breathwork', label: 'Breathwork', icon: 'water-outline' },
      { key: 'body_scan', label: 'Body Scan', icon: 'body-outline' },
      { key: 'gratitude', label: 'Gratitude', icon: 'heart-outline' },
      { key: 'journal', label: 'Journal', icon: 'book-outline' },
      { key: 'habits', label: 'Habits', icon: 'checkmark-circle-outline' },
    ],
  },
];
```

- [ ] **Step 2: Verify compiles**

Run: `npm run typecheck 2>&1 | grep -i activityMenu | head -10`

- [ ] **Step 3: Commit**

```bash
git add src/types/activityMenu.ts
git commit -m "Feature: Add activity menu types and icon mapping"
```

---

## Task 2: Merge Wellness + Mindfulness in ActivityGridService

**Files:**
- Modify: `src/services/activity/ActivityGridService.ts`

- [ ] **Step 1: Update CategoryRow type**

Change the `key` type at line 18 from:
```typescript
key: 'cardio' | 'strength' | 'wellness' | 'mindfulness';
```
to:
```typescript
key: 'cardio' | 'strength' | 'wellness';
```

- [ ] **Step 2: Merge ACTIVITY_GRID categories**

Replace the ACTIVITY_GRID constant (lines 29-50) with:
```typescript
export const ACTIVITY_GRID: CategoryRow[] = [
  {
    name: 'Cardio',
    key: 'cardio',
    activities: ['run', 'walk', 'cycle', 'hiking'],
  },
  {
    name: 'Strength',
    key: 'strength',
    activities: ['pushups', 'pullups', 'situps', 'squats', 'curls', 'bench'],
  },
  {
    name: 'Wellness',
    key: 'wellness',
    activities: ['guided', 'unguided', 'breathwork', 'body_scan', 'gratitude', 'journal', 'habits'],
  },
];
```

- [ ] **Step 3: Update ACTIVITY_DISPLAY_NAMES comments**

In the same file, update the `// Mindfulness` comment in `ACTIVITY_DISPLAY_NAMES` to `// Wellness (continued)` since journal and habits are now part of wellness. Also update the file header comment if it mentions "Mindfulness" as a separate category.

- [ ] **Step 4: Verify compiles**

Run: `npm run typecheck 2>&1 | grep -i ActivityGrid | head -10`

- [ ] **Step 5: Commit**

```bash
git add src/services/activity/ActivityGridService.ts
git commit -m "Refactor: Merge Wellness and Mindfulness into one category"
```

---

## Task 3: ActivityPill Component

**Files:**
- Create: `src/components/activity/ActivityPill.tsx`

- [ ] **Step 1: Create ActivityPill component**

```typescript
// src/components/activity/ActivityPill.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import type { ActivityIconConfig } from '../../types/activityMenu';

interface ActivityPillProps {
  activity: ActivityIconConfig;
  isActive: boolean;
  onPress: () => void;
}

export const ActivityPill: React.FC<ActivityPillProps> = ({
  activity,
  isActive,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, isActive && styles.containerActive]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={activity.label}
      accessibilityRole="button"
    >
      <Ionicons
        name={activity.icon}
        size={24}
        color={isActive ? theme.colors.text : theme.colors.textMuted}
      />
      <Text
        style={[styles.label, isActive && styles.labelActive]}
        numberOfLines={1}
      >
        {activity.label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 44,
    minHeight: 44,
  },
  containerActive: {
    backgroundColor: theme.colors.border,
    borderWidth: 1,
    borderColor: theme.colors.orangeDeep,
    borderRadius: 8,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
    marginTop: 4,
  },
  labelActive: {
    color: theme.colors.text,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/activity/ActivityPill.tsx
git commit -m "Feature: Add ActivityPill component"
```

---

## Task 4: ActivityDropdown Component

**Files:**
- Create: `src/components/activity/ActivityDropdown.tsx`

- [ ] **Step 1: Create ActivityDropdown component**

```typescript
// src/components/activity/ActivityDropdown.tsx

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { theme } from '../../styles/theme';
import { ActivityPill } from './ActivityPill';
import type { CategoryConfig } from '../../types/activityMenu';

const DROPDOWN_HEIGHT = 80;

interface ActivityDropdownProps {
  category: CategoryConfig;
  activeActivityKey: string;
  isOpen: boolean;
  onSelectActivity: (activityKey: string) => void;
}

export const ActivityDropdown: React.FC<ActivityDropdownProps> = ({
  category,
  activeActivityKey,
  isOpen,
  onSelectActivity,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isOpen ? 1 : 0, {
        duration: isOpen ? 200 : 150,
        easing: isOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      }),
      transform: [
        {
          translateY: withTiming(isOpen ? 0 : -DROPDOWN_HEIGHT, {
            duration: isOpen ? 200 : 150,
            easing: isOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
          }),
        },
      ],
    };
  });

  return (
    <View style={styles.clipContainer} pointerEvents={isOpen ? 'auto' : 'none'}>
      <Animated.View style={[styles.dropdown, animatedStyle]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
        >
          {category.activities.map((activity) => (
            <ActivityPill
              key={activity.key}
              activity={activity}
              isActive={activity.key === activeActivityKey}
              onPress={() => onSelectActivity(activity.key)}
            />
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  clipContainer: {
    height: DROPDOWN_HEIGHT,
    overflow: 'hidden',
  },
  dropdown: {
    height: DROPDOWN_HEIGHT,
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    justifyContent: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 8,
    flexGrow: 1,
  },
});
```

Note: Uses horizontal `ScrollView` so the 7-item Wellness row works on narrow screens (iPhone SE).

- [ ] **Step 2: Commit**

```bash
git add src/components/activity/ActivityDropdown.tsx
git commit -m "Feature: Add ActivityDropdown animated component"
```

---

## Task 5: ActivityCategoryBar Component

**Files:**
- Create: `src/components/activity/ActivityCategoryBar.tsx`

- [ ] **Step 1: Create ActivityCategoryBar component**

```typescript
// src/components/activity/ActivityCategoryBar.tsx

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { theme } from '../../styles/theme';
import { ActivityDropdown } from './ActivityDropdown';
import { CATEGORY_MENU } from '../../types/activityMenu';
import type { GridPosition } from '../../services/activity/ActivityGridService';

interface ActivityCategoryBarProps {
  gridPosition: GridPosition;
  onActivitySelect: (row: number, column: number) => void;
  isWorkoutActive: boolean;
}

export const ActivityCategoryBar: React.FC<ActivityCategoryBarProps> = ({
  gridPosition,
  onActivitySelect,
  isWorkoutActive,
}) => {
  const [openCategoryIndex, setOpenCategoryIndex] = useState<number | null>(null);

  const isDropdownOpen = openCategoryIndex !== null;
  const activeCategoryIndex = gridPosition.row;
  const activeCategory = CATEGORY_MENU[activeCategoryIndex];
  const activeActivityKey = activeCategory?.activities[gridPosition.column]?.key || '';

  const handleCategoryPress = useCallback((index: number) => {
    if (isWorkoutActive) return;

    // Always open/re-open — tapping an open category keeps it open
    // so users can switch within the same category
    setOpenCategoryIndex(index);
  }, [isWorkoutActive]);

  const handleActivitySelect = useCallback((activityKey: string) => {
    if (openCategoryIndex === null) return;

    const category = CATEGORY_MENU[openCategoryIndex];
    const columnIndex = category.activities.findIndex((a) => a.key === activityKey);

    if (columnIndex >= 0) {
      onActivitySelect(openCategoryIndex, columnIndex);
    }

    setOpenCategoryIndex(null);
  }, [openCategoryIndex, onActivitySelect]);

  const handleOverlayPress = useCallback(() => {
    setOpenCategoryIndex(null);
  }, []);

  return (
    <>
      {/* Category labels */}
      <View style={styles.bar}>
        {CATEGORY_MENU.map((cat, index) => {
          const isActive = index === activeCategoryIndex;
          return (
            <TouchableOpacity
              key={cat.key}
              style={styles.categoryButton}
              onPress={() => handleCategoryPress(index)}
              activeOpacity={0.7}
              disabled={isWorkoutActive}
            >
              <Text
                style={[
                  styles.categoryLabel,
                  isActive && styles.categoryLabelActive,
                  isWorkoutActive && styles.categoryLabelDisabled,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Dropdown */}
      {openCategoryIndex !== null && (
        <ActivityDropdown
          category={CATEGORY_MENU[openCategoryIndex]}
          activeActivityKey={
            openCategoryIndex === activeCategoryIndex ? activeActivityKey : ''
          }
          isOpen={true}
          onSelectActivity={handleActivitySelect}
        />
      )}

    </>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 12,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  categoryLabel: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
  },
  categoryLabelActive: {
    color: theme.colors.text,
  },
  categoryLabelDisabled: {
    color: theme.colors.textMuted,
  },
});
```

- [ ] **Step 2: Verify compiles**

Run: `npm run typecheck 2>&1 | grep -i "ActivityCategory" | head -10`

- [ ] **Step 3: Commit**

```bash
git add src/components/activity/ActivityCategoryBar.tsx
git commit -m "Feature: Add ActivityCategoryBar with dropdown and overlay"
```

---

## Task 6: Integrate into ActivityTrackerScreen

**Files:**
- Modify: `src/screens/activity/ActivityTrackerScreen.tsx`

This is the integration task. It wires the new `ActivityCategoryBar` into the existing screen and updates `renderContent` for the merged wellness category.

- [ ] **Step 1: Add imports**

Add near the top of ActivityTrackerScreen.tsx, with other imports:
```typescript
import { ActivityCategoryBar } from '../../components/activity/ActivityCategoryBar';
```

- [ ] **Step 2: Add grid position update handler**

Inside the component, near the other handler functions, add:
```typescript
const handleActivitySelect = (row: number, column: number) => {
  // Just update state — existing useEffect auto-saves to AsyncStorage
  setGridPosition({ row, column });
};
```

- [ ] **Step 3: Add category bar and overlay wrapper to JSX**

In the return JSX, add `ActivityCategoryBar` between the header and `SwipeGridNavigator`. Wrap the `SwipeGridNavigator` in a `View` with `flex: 1` so the overlay can be absolutely positioned over just the tracker area. Also add a `Pressable` import and state ref:

```typescript
import { Pressable } from 'react-native';
```

Add a ref to close dropdown from the screen level:
```typescript
const [dropdownOpen, setDropdownOpen] = useState(false);
```

The JSX structure should be:
```typescript
{/* Header */}
<View style={styles.header}>
  {/* ...existing header content... */}
</View>

{/* Activity Category Bar */}
<ActivityCategoryBar
  gridPosition={gridPosition}
  onActivitySelect={handleActivitySelect}
  isWorkoutActive={isWorkoutActive}
/>

{/* Tracker Content — overlay scoped to this area only */}
<View style={{ flex: 1 }}>
  <SwipeGridNavigator
    onSwipeLeft={handleSwipeLeft}
    onSwipeRight={handleSwipeRight}
    onSwipeUp={handleSwipeUp}
    onSwipeDown={handleSwipeDown}
    disabled={isWorkoutActive}
  >
    <View style={styles.contentWrapper}>
      {renderContent()}
    </View>
  </SwipeGridNavigator>
</View>
```

Note: The `ActivityCategoryBar` renders its own dropdown and the dim overlay is handled via a `Pressable` that the `ActivityCategoryBar` exposes as a callback (`onClose`). The overlay sits within the `ActivityCategoryBar` fragment but is absolutely positioned — the implementer should verify it only covers the tracker area below. If it covers the header, scope it by wrapping everything below the header in a relative-positioned container.

- [ ] **Step 4: Update renderContent for merged wellness**

Replace the `case 'mindfulness'` block in `renderContent` (lines ~356-367). Move journal and habits into the `case 'wellness'` block:

```typescript
case 'wellness': {
  // Meditation types
  const meditationTypes = ['guided', 'unguided', 'breathwork', 'body_scan', 'gratitude'];
  if (meditationTypes.includes(activity)) {
    const meditationType = activity as MeditationType;
    return <MeditationTrackerScreen initialType={meditationType} />;
  }
  // Mindfulness types (formerly separate category)
  switch (activity) {
    case 'journal':
      return <JournalTrackerScreen />;
    case 'habits':
      return <HabitTrackerScreen />;
    default:
      return <MeditationTrackerScreen initialType="guided" />;
  }
}
```

Remove the entire `case 'mindfulness':` block.

- [ ] **Step 5: Verify compiles**

Run: `npm run typecheck 2>&1 | grep -i "ActivityTracker" | head -10`

- [ ] **Step 6: Commit**

```bash
git add src/screens/activity/ActivityTrackerScreen.tsx
git commit -m "Feature: Integrate ActivityCategoryBar into tracker screen"
```

---

## Task 7: Verification

**Files:** None (testing only)

- [ ] **Step 1: Write verification script**

Create `scripts/verify/verify-activity-menu.ts`:
```typescript
/**
 * Verify activity menu implementation
 */
import { CATEGORY_MENU } from '../../src/types/activityMenu';

// Verify 3 categories
console.log(`Categories: ${CATEGORY_MENU.length} (expected 3) ${CATEGORY_MENU.length === 3 ? 'PASS' : 'FAIL'}`);

// Verify category names
const names = CATEGORY_MENU.map(c => c.label);
const expectedNames = ['Cardio', 'Strength', 'Wellness'];
const namesMatch = JSON.stringify(names) === JSON.stringify(expectedNames);
console.log(`Category names: ${names.join(', ')} ${namesMatch ? 'PASS' : 'FAIL'}`);

// Verify activity counts
const counts = CATEGORY_MENU.map(c => c.activities.length);
console.log(`Cardio activities: ${counts[0]} (expected 4) ${counts[0] === 4 ? 'PASS' : 'FAIL'}`);
console.log(`Strength activities: ${counts[1]} (expected 6) ${counts[1] === 6 ? 'PASS' : 'FAIL'}`);
console.log(`Wellness activities: ${counts[2]} (expected 7) ${counts[2] === 7 ? 'PASS' : 'FAIL'}`);

// Verify total
const total = counts.reduce((a, b) => a + b, 0);
console.log(`Total activities: ${total} (expected 17) ${total === 17 ? 'PASS' : 'FAIL'}`);

// Verify all activities have icons
let allHaveIcons = true;
for (const cat of CATEGORY_MENU) {
  for (const act of cat.activities) {
    if (!act.icon) {
      console.log(`FAIL: ${act.key} missing icon`);
      allHaveIcons = false;
    }
  }
}
console.log(`All activities have icons: ${allHaveIcons ? 'PASS' : 'FAIL'}`);

const passed = [
  CATEGORY_MENU.length === 3,
  namesMatch,
  counts[0] === 4,
  counts[1] === 6,
  counts[2] === 7,
  total === 17,
  allHaveIcons,
].filter(Boolean).length;

console.log(`\n${passed}/7 checks passed`);
process.exit(passed === 7 ? 0 : 1);
```

- [ ] **Step 2: Run verification**

Run: `npx tsx scripts/verify/verify-activity-menu.ts`
Expected: 7/7 checks passed

- [ ] **Step 3: Run full typecheck**

Run: `npm run typecheck`
Expected: No new errors introduced

- [ ] **Step 4: Commit**

```bash
git add scripts/verify/verify-activity-menu.ts
git commit -m "Chore: Add activity menu verification script"
```

---

## Summary

| Task | Description | New Files | Modified Files |
|------|-------------|-----------|----------------|
| 1 | Types & icon mapping | `src/types/activityMenu.ts` | — |
| 2 | Merge wellness + mindfulness | — | `ActivityGridService.ts` |
| 3 | ActivityPill component | `src/components/activity/ActivityPill.tsx` | — |
| 4 | ActivityDropdown component | `src/components/activity/ActivityDropdown.tsx` | — |
| 5 | ActivityCategoryBar component | `src/components/activity/ActivityCategoryBar.tsx` | — |
| 6 | Screen integration | — | `ActivityTrackerScreen.tsx` |
| 7 | Verification | `scripts/verify/verify-activity-menu.ts` | — |
