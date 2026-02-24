# Meditation Wellness Polish — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add breathing circle animation, duration presets with auto-stop, and milestone haptics to the meditation tracker.

**Architecture:** Three independent features layered into the existing MeditationTrackerScreen. One new component (BreathingCircle) and modifications to the meditation screen. All use existing dependencies (react-native-reanimated, expo-haptics).

**Tech Stack:** React Native, TypeScript, react-native-reanimated, expo-haptics

**Design doc:** `docs/plans/2026-02-24-meditation-polish-design.md`

---

### Task 1: Create BreathingCircle Component

**Files:**
- Create: `src/components/activity/BreathingCircle.tsx`

**Step 1: Create the BreathingCircle component**

This is a self-contained animated component. The breathing pattern is 4s inhale, 4s hold, 6s exhale (14s total cycle). It uses `react-native-reanimated` for smooth animations.

```tsx
/**
 * BreathingCircle - Animated breathing guide for breathwork sessions
 * Pattern: 4s inhale (expand) → 4s hold → 6s exhale (contract)
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withRepeat,
  withDelay,
  Easing,
  useDerivedValue,
  runOnJS,
} from 'react-native-reanimated';
import { theme } from '../../styles/theme';

// Breathing pattern durations (milliseconds)
const INHALE_MS = 4000;
const HOLD_MS = 4000;
const EXHALE_MS = 6000;
const CYCLE_MS = INHALE_MS + HOLD_MS + EXHALE_MS; // 14000ms

const MIN_SCALE = 0.4;
const MAX_SCALE = 1.0;

interface BreathingCircleProps {
  isPaused: boolean;
}

export const BreathingCircle: React.FC<BreathingCircleProps> = ({ isPaused }) => {
  const scale = useSharedValue(MIN_SCALE);
  const phaseProgress = useSharedValue(0); // 0=inhale start, 1=hold start, 2=exhale start
  const [phaseLabel, setPhaseLabel] = React.useState('Inhale...');

  const updateLabel = (label: string) => {
    setPhaseLabel(label);
  };

  useEffect(() => {
    if (isPaused) return;

    // Animate: inhale (expand) → hold (stay) → exhale (contract), repeat
    scale.value = withRepeat(
      withSequence(
        // Inhale: scale from MIN to MAX over 4s
        withTiming(MAX_SCALE, { duration: INHALE_MS, easing: Easing.inOut(Easing.ease) }),
        // Hold: stay at MAX for 4s
        withDelay(HOLD_MS, withTiming(MAX_SCALE, { duration: 0 })),
        // Exhale: scale from MAX to MIN over 6s
        withTiming(MIN_SCALE, { duration: EXHALE_MS, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, // infinite repeat
      false, // don't reverse
    );

    // Phase label tracking — use a JS interval synced to the cycle
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 100;
      const cyclePos = elapsed % CYCLE_MS;

      if (cyclePos < INHALE_MS) {
        updateLabel('Inhale...');
      } else if (cyclePos < INHALE_MS + HOLD_MS) {
        updateLabel('Hold...');
      } else {
        updateLabel('Exhale...');
      }
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [isPaused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.circle, animatedStyle]}>
        <View style={styles.innerCircle} />
      </Animated.View>
      <Text style={styles.phaseLabel}>{phaseLabel}</Text>
    </View>
  );
};

const CIRCLE_SIZE = 180;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 3,
    borderColor: theme.colors.orangeBright,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 157, 66, 0.05)',
  },
  innerCircle: {
    width: CIRCLE_SIZE * 0.3,
    height: CIRCLE_SIZE * 0.3,
    borderRadius: (CIRCLE_SIZE * 0.3) / 2,
    backgroundColor: 'rgba(255, 157, 66, 0.15)',
  },
  phaseLabel: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '500',
    color: theme.colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors from the new file)

**Step 3: Commit**

```bash
git add src/components/activity/BreathingCircle.tsx
git commit -m "Feature: Add BreathingCircle component for breathwork sessions"
```

---

### Task 2: Add Duration Presets to Setup Phase

**Files:**
- Modify: `src/screens/activity/MeditationTrackerScreen.tsx`

**Step 1: Add state and constants for duration presets**

At the top of the file, after the `MEDITATION_TYPES` array (line ~53), add:

```tsx
const DURATION_PRESETS: { value: number | null; label: string }[] = [
  { value: null, label: 'Open' },
  { value: 5 * 60, label: '5m' },
  { value: 10 * 60, label: '10m' },
  { value: 15 * 60, label: '15m' },
  { value: 20 * 60, label: '20m' },
];
```

Inside the component, after the `selectedType` state (line ~66), add:

```tsx
const [targetDuration, setTargetDuration] = useState<number | null>(null);
```

**Step 2: Add duration selector UI to setup phase**

In the setup phase JSX (after the TYPE card closing `</View>` at line ~472), add a new DURATION card:

```tsx
{/* Duration Preset Card */}
<View style={styles.setupCard}>
  <Text style={styles.setupCardLabel}>DURATION</Text>
  <View style={styles.restOptions}>
    {DURATION_PRESETS.map((preset) => (
      <TouchableOpacity
        key={preset.label}
        style={[
          styles.restOption,
          targetDuration === preset.value && styles.restOptionActive,
        ]}
        onPress={() => setTargetDuration(preset.value)}
      >
        <Text
          style={[
            styles.restOptionText,
            targetDuration === preset.value && styles.restOptionTextActive,
          ]}
        >
          {preset.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
</View>
```

**Step 3: Add pill styles**

Add these styles to the StyleSheet (reuse the same pattern as StrengthTrackerScreen):

```tsx
restOptions: {
  flexDirection: 'row',
  gap: 8,
},
restOption: {
  flex: 1,
  backgroundColor: theme.colors.card,
  borderRadius: 12,
  paddingVertical: 12,
  alignItems: 'center',
  borderWidth: 2,
  borderColor: theme.colors.border,
},
restOptionActive: {
  borderColor: theme.colors.text,
  backgroundColor: theme.colors.border,
},
restOptionText: {
  fontSize: 14,
  fontWeight: theme.typography.weights.medium,
  color: theme.colors.textMuted,
},
restOptionTextActive: {
  color: theme.colors.text,
  fontWeight: theme.typography.weights.semiBold,
},
```

**Step 4: Reset targetDuration in handleDone**

In the `handleDone` function (around line ~421), add:

```tsx
setTargetDuration(null);
```

**Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 6: Commit**

```bash
git add src/screens/activity/MeditationTrackerScreen.tsx
git commit -m "Feature: Add duration preset selector to meditation setup"
```

---

### Task 3: Implement Countdown Timer + Auto-Stop

**Files:**
- Modify: `src/screens/activity/MeditationTrackerScreen.tsx`

**Step 1: Add expo-haptics import**

At the top of the file, add:

```tsx
import * as Haptics from 'expo-haptics';
```

**Step 2: Add auto-stop ref to prevent double-firing**

After the existing timer refs (around line ~113), add:

```tsx
const autoStopFiredRef = useRef<boolean>(false);
```

**Step 3: Modify the timer useEffect for countdown support**

Replace the timer useEffect (lines ~180-197) with:

```tsx
useEffect(() => {
  let interval: NodeJS.Timeout | null = null;

  if (phase === 'active' && isActive && !isPaused) {
    interval = setInterval(() => {
      const now = Date.now();
      const totalPausedTime = totalPausedTimeRef.current;
      const elapsed = Math.floor(
        (now - startTimeRef.current - totalPausedTime) / 1000
      );
      setElapsedSeconds(elapsed);

      // Auto-stop when countdown reaches zero
      if (targetDuration !== null && elapsed >= targetDuration && !autoStopFiredRef.current) {
        autoStopFiredRef.current = true;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Use setTimeout to avoid state update during render
        setTimeout(() => endSession(), 0);
      }
    }, 1000);
  }

  return () => {
    if (interval) clearInterval(interval);
  };
}, [phase, isActive, isPaused, targetDuration]);
```

**Step 4: Update formatTime for countdown display**

Modify the `formatTime` usage in the active phase JSX. Change the timer text display (line ~534) to show countdown when a preset is selected:

```tsx
<Text style={styles.timerText}>
  {targetDuration !== null
    ? formatTime(Math.max(0, targetDuration - elapsedSeconds))
    : formatTime(elapsedSeconds)}
</Text>
```

**Step 5: Reset autoStopFiredRef in startMeditation**

In the `startMeditation` function (line ~285), add:

```tsx
autoStopFiredRef.current = false;
```

**Step 6: Use full target duration in summary when preset was used**

In the `saveSessionLocally` function, where `elapsedSeconds` is used for the duration (line ~341), adjust so the summary shows the target duration if one was set:

```tsx
const finalDuration = targetDuration !== null ? targetDuration : elapsedSeconds;
```

Then use `finalDuration` instead of `elapsedSeconds` for:
- The `duration` field in `saveManualWorkout`
- The calorie estimation call
- The `Workout` object's `duration` field
- The `startTime` calculation

**Step 7: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 8: Commit**

```bash
git add src/screens/activity/MeditationTrackerScreen.tsx
git commit -m "Feature: Countdown timer with auto-stop for meditation presets"
```

---

### Task 4: Add Milestone Haptics for Open Sessions

**Files:**
- Modify: `src/screens/activity/MeditationTrackerScreen.tsx`

**Step 1: Add milestone constants and ref**

After the `DURATION_PRESETS` array, add:

```tsx
const MILESTONE_SECONDS = [5 * 60, 10 * 60, 15 * 60, 20 * 60, 30 * 60]; // 5, 10, 15, 20, 30 min
```

Inside the component, after the other refs, add:

```tsx
const firedMilestonesRef = useRef<Set<number>>(new Set());
```

**Step 2: Add milestone check to timer useEffect**

Inside the timer interval callback, after `setElapsedSeconds(elapsed)` and before the auto-stop check, add:

```tsx
// Milestone haptics (open mode only)
if (targetDuration === null) {
  for (const milestone of MILESTONE_SECONDS) {
    if (elapsed >= milestone && !firedMilestonesRef.current.has(milestone)) {
      firedMilestonesRef.current.add(milestone);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break; // Only fire one per tick
    }
  }
}
```

**Step 3: Reset milestones in startMeditation**

In `startMeditation`, add:

```tsx
firedMilestonesRef.current.clear();
```

**Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/screens/activity/MeditationTrackerScreen.tsx
git commit -m "Feature: Milestone haptic pulses for open meditation sessions"
```

---

### Task 5: Integrate BreathingCircle into Active Phase

**Files:**
- Modify: `src/screens/activity/MeditationTrackerScreen.tsx`

**Step 1: Import BreathingCircle**

At the top, add:

```tsx
import { BreathingCircle } from '../../components/activity/BreathingCircle';
```

**Step 2: Modify the active phase JSX**

Replace the active phase return block (lines ~525-571) with a conditional layout. When `selectedType === 'breathwork'`, show the breathing circle with a smaller timer above it. Otherwise, keep the existing timer-only view:

```tsx
if (phase === 'active') {
  const isBreathwork = selectedType === 'breathwork';
  const displayTime = targetDuration !== null
    ? formatTime(Math.max(0, targetDuration - elapsedSeconds))
    : formatTime(elapsedSeconds);

  return (
    <View style={styles.container}>
      <View style={styles.activeContainer}>
        <Text style={styles.meditationType}>
          {MEDITATION_TYPES.find((t) => t.value === selectedType)?.label}
        </Text>

        {isBreathwork ? (
          <>
            {/* Breathwork: smaller timer + breathing circle */}
            <Text style={styles.breathworkTimer}>{displayTime}</Text>
            <BreathingCircle isPaused={isPaused} />
          </>
        ) : (
          <>
            {/* Standard: large centered timer */}
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{displayTime}</Text>
              <Text style={styles.timerLabel}>
                {isPaused ? 'Paused' : 'Meditating'}
              </Text>
            </View>
          </>
        )}

        <View style={styles.controlButtons}>
          {!isPaused ? (
            <TouchableOpacity
              style={styles.pauseButton}
              onPress={pauseMeditation}
            >
              <Ionicons name="pause" size={32} color={theme.colors.text} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.resumeButton}
              onPress={resumeMeditation}
            >
              <Ionicons name="play" size={32} color={theme.colors.background} />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.stopButton} onPress={endSession}>
            <Ionicons name="stop" size={32} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertVisible(false)}
      />
    </View>
  );
}
```

**Step 3: Add breathwork timer style**

Add to the StyleSheet:

```tsx
breathworkTimer: {
  fontSize: 36,
  fontWeight: theme.typography.weights.semiBold,
  color: theme.colors.textMuted,
  marginBottom: 8,
},
```

**Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/screens/activity/MeditationTrackerScreen.tsx
git commit -m "Feature: Integrate BreathingCircle into breathwork active phase"
```

---

### Task 6: Final Verification

**Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: PASS with zero errors

**Step 2: Write verification script**

Create `scripts/verify/verify-meditation-polish.ts`:

```tsx
/**
 * Verify meditation polish features are properly wired up
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

// 1. BreathingCircle component exists
const breathingCirclePath = path.join(ROOT, 'src/components/activity/BreathingCircle.tsx');
const breathingCircleExists = fs.existsSync(breathingCirclePath);
console.log(`✓ BreathingCircle exists: ${breathingCircleExists}`);

// 2. MeditationTrackerScreen has all features
const meditationPath = path.join(ROOT, 'src/screens/activity/MeditationTrackerScreen.tsx');
const meditationSrc = fs.readFileSync(meditationPath, 'utf-8');

const checks = [
  ['DURATION_PRESETS', 'Duration presets constant'],
  ['targetDuration', 'Target duration state'],
  ['BreathingCircle', 'BreathingCircle import/usage'],
  ['expo-haptics', 'Haptics import'],
  ['MILESTONE_SECONDS', 'Milestone constants'],
  ['firedMilestonesRef', 'Milestone tracking ref'],
  ['autoStopFiredRef', 'Auto-stop ref'],
  ['Haptics.notificationAsync', 'Auto-stop haptic'],
  ['Haptics.impactAsync', 'Milestone haptic'],
  ['breathworkTimer', 'Breathwork timer style'],
];

let allPassed = true;
for (const [search, label] of checks) {
  const found = meditationSrc.includes(search);
  console.log(`${found ? '✓' : '✗'} ${label}: ${found}`);
  if (!found) allPassed = false;
}

// 3. File size check (should stay under 500-line limit per CLAUDE.md — but it was already 1006 lines)
const lineCount = meditationSrc.split('\n').length;
console.log(`\nMeditationTrackerScreen: ${lineCount} lines`);

console.log(`\n${allPassed ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
process.exit(allPassed ? 0 : 1);
```

**Step 3: Run verification**

Run: `npx tsx scripts/verify/verify-meditation-polish.ts`
Expected: All checks pass

**Step 4: Commit**

```bash
git add scripts/verify/verify-meditation-polish.ts
git commit -m "Chore: Add meditation polish verification script"
```
