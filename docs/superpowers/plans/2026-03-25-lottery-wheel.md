# Lottery Wheel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a daily lottery wheel to a new Level Detail screen, where the user's level applies a logarithmic multiplier to the prize, with rewards sent through the existing Supabase pipeline.

**Architecture:** New LevelDetailScreen accessible by tapping WorkoutLevelRing. The screen shows level info, an animated SVG spin wheel, and the XP explainer (moved from modal). Spins insert into a `lottery_spins` Supabase table; a server-side trigger picks the segment, applies the multiplier, and sends the reward through the existing LNURL pipeline. Client subscribes to Realtime for the result and lands the wheel on the correct segment.

**Tech Stack:** React Native, TypeScript, react-native-svg, Animated API, Supabase (Realtime, Edge Functions), AsyncStorage

**Spec:** `docs/superpowers/specs/2026-03-25-lottery-wheel-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/screens/LevelDetailScreen.tsx` | Screen with level header, lottery wheel, XP explainer |
| `src/components/lottery/LotteryWheel.tsx` | Animated SVG wheel component with spin logic |
| `src/components/lottery/LotteryResult.tsx` | Result display after spin (segment × multiplier = total) |
| `src/components/lottery/SpinButton.tsx` | Spin/countdown button with state management |
| `src/components/lottery/XPExplainer.tsx` | XP breakdown, streak bonuses, milestones (extracted from modal) |
| `src/services/lottery/LotteryService.ts` | Singleton service: Supabase insert, Realtime subscription, local state |
| `src/types/lottery.ts` | Type definitions for lottery spins, config, segments |

### Modified Files
| File | Change |
|------|--------|
| `src/components/profile/WorkoutLevelRing.tsx` | Replace modal trigger with navigation to LevelDetailScreen |
| `src/navigation/AppNavigator.tsx` | Add LevelDetail to RootStackParamList and Stack.Screen |

---

## Task 1: Lottery Types

**Files:**
- Create: `src/types/lottery.ts`

- [ ] **Step 1: Create lottery type definitions**

```typescript
// src/types/lottery.ts

export interface LotterySegment {
  segment: number;
  baseValue: number;
  probability: number;
}

export interface LotterySpin {
  id: string;
  npub: string;
  level: number;
  multiplier: number;
  segment_value: number | null;
  final_payout: number | null;
  status: 'pending' | 'completed' | 'paid';
  spun_at: string;
}

export interface LotteryConfig {
  segments: LotterySegment[];
}

/**
 * Default wheel segments — used as fallback if lottery_config table
 * is not yet set up. Server-side config takes precedence.
 */
export const DEFAULT_SEGMENTS: LotterySegment[] = [
  { segment: 1, baseValue: 5, probability: 0.30 },
  { segment: 2, baseValue: 10, probability: 0.25 },
  { segment: 3, baseValue: 25, probability: 0.20 },
  { segment: 4, baseValue: 50, probability: 0.13 },
  { segment: 5, baseValue: 100, probability: 0.08 },
  { segment: 6, baseValue: 250, probability: 0.03 },
  { segment: 7, baseValue: 500, probability: 0.008 },
  { segment: 8, baseValue: 1000, probability: 0.002 },
];

/**
 * Calculate lottery multiplier from user level.
 * Logarithmic: front-loads gains for new users.
 */
export function calculateLotteryMultiplier(level: number): number {
  return 1 + 0.5 * Math.log(level + 1);
}

/** AsyncStorage key for last spin date */
export const LAST_SPIN_DATE_KEY = '@runstr:last_spin_date';
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit src/types/lottery.ts 2>&1 | head -20`
Expected: No errors (or only pre-existing project errors)

- [ ] **Step 3: Commit**

```bash
git add src/types/lottery.ts
git commit -m "Feature: Add lottery wheel type definitions"
```

---

## Task 2: LotteryService

**Files:**
- Create: `src/services/lottery/LotteryService.ts`
- Reference: `src/utils/supabase.ts` (Supabase client pattern)
- Reference: `src/services/backend/ClubChatService.ts` (Realtime subscription pattern)
- Reference: `src/services/fitness/WorkoutLevelService.ts` (singleton pattern)

- [ ] **Step 1: Create LotteryService with singleton pattern**

```typescript
// src/services/lottery/LotteryService.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';
import { calculateLotteryMultiplier, LAST_SPIN_DATE_KEY } from '../../types/lottery';
import type { LotterySpin } from '../../types/lottery';
import type { RealtimeChannel } from '@supabase/supabase-js';

export class LotteryService {
  private static instance: LotteryService;
  private activeChannel: RealtimeChannel | null = null;

  static getInstance(): LotteryService {
    if (!LotteryService.instance) {
      LotteryService.instance = new LotteryService();
    }
    return LotteryService.instance;
  }

  /**
   * Check if the user can spin today (local check — server enforces too).
   */
  async canSpinToday(): Promise<boolean> {
    try {
      const lastSpin = await AsyncStorage.getItem(LAST_SPIN_DATE_KEY);
      if (!lastSpin) return true;
      const today = new Date().toISOString().split('T')[0];
      return lastSpin !== today;
    } catch {
      return true;
    }
  }

  /**
   * Get milliseconds until UTC midnight for countdown display.
   */
  getMillisUntilReset(): number {
    const now = new Date();
    const midnight = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0, 0, 0
    ));
    return midnight.getTime() - now.getTime();
  }

  /**
   * Submit a spin to Supabase. Returns the spin record (status: pending).
   * Server-side trigger will pick the segment and calculate payout.
   */
  async submitSpin(npub: string, level: number): Promise<LotterySpin | null> {
    if (!isSupabaseConfigured()) {
      console.error('[LotteryService] Supabase not configured');
      return null;
    }

    const multiplier = calculateLotteryMultiplier(level);

    const { data, error } = await supabase!
      .from('lottery_spins')
      .insert({
        npub,
        level,
        multiplier: parseFloat(multiplier.toFixed(2)),
      })
      .select()
      .single();

    if (error) {
      console.error('[LotteryService] Failed to submit spin:', error);
      return null;
    }

    // Save locally for UX guard
    const today = new Date().toISOString().split('T')[0];
    await AsyncStorage.setItem(LAST_SPIN_DATE_KEY, today);

    return data as LotterySpin;
  }

  /**
   * Subscribe to Realtime updates on a specific spin record.
   * Calls onResult when the spin status changes from 'pending'.
   */
  subscribeToSpinResult(
    spinId: string,
    onResult: (spin: LotterySpin) => void
  ): () => void {
    if (!isSupabaseConfigured()) return () => {};

    // Clean up any existing subscription
    this.unsubscribe();

    const channel = supabase!
      .channel(`lottery_spin:${spinId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lottery_spins',
          filter: `id=eq.${spinId}`,
        },
        (payload) => {
          const spin = payload.new as LotterySpin;
          if (spin.status !== 'pending') {
            onResult(spin);
          }
        }
      )
      .subscribe((status) => {
        console.log(`[LotteryService] Realtime status: ${status}`);
      });

    this.activeChannel = channel;

    // Return cleanup function
    return () => this.unsubscribe();
  }

  /**
   * Polling fallback — fetch spin by ID to check if result is ready.
   */
  async fetchSpinResult(spinId: string): Promise<LotterySpin | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase!
      .from('lottery_spins')
      .select()
      .eq('id', spinId)
      .single();

    if (error) {
      console.error('[LotteryService] Failed to fetch spin:', error);
      return null;
    }

    return data as LotterySpin;
  }

  /**
   * Get today's spin result if it exists (for already-spun state).
   */
  async getTodaySpin(npub: string): Promise<LotterySpin | null> {
    if (!isSupabaseConfigured()) return null;

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const { data, error } = await supabase!
      .from('lottery_spins')
      .select()
      .eq('npub', npub)
      .gte('spun_at', `${today}T00:00:00Z`)
      .lt('spun_at', `${tomorrow}T00:00:00Z`)
      .order('spun_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[LotteryService] Failed to fetch today spin:', error);
      return null;
    }

    return data as LotterySpin | null;
  }

  private unsubscribe(): void {
    if (this.activeChannel) {
      supabase?.removeChannel(this.activeChannel);
      this.activeChannel = null;
    }
  }
}

export default LotteryService.getInstance();
```

- [ ] **Step 2: Verify service compiles**

Run: `npm run typecheck 2>&1 | grep -i lottery | head -20`
Expected: No new errors related to lottery files

- [ ] **Step 3: Commit**

```bash
git add src/services/lottery/LotteryService.ts
git commit -m "Feature: Add LotteryService with Supabase and Realtime support"
```

---

## Task 3: SpinButton Component

**Files:**
- Create: `src/components/lottery/SpinButton.tsx`
- Reference: `src/styles/theme.ts` (theme constants)

- [ ] **Step 1: Create SpinButton component**

```typescript
// src/components/lottery/SpinButton.tsx

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState } from 'react-native';
import { theme } from '../../styles/theme';
import LotteryService from '../../services/lottery/LotteryService';

interface SpinButtonProps {
  canSpin: boolean;
  isSpinning: boolean;
  onSpin: () => void;
  hasNoConnection?: boolean;
  hasNoDestination?: boolean;
}

export const SpinButton: React.FC<SpinButtonProps> = ({
  canSpin,
  isSpinning,
  onSpin,
  hasNoConnection,
  hasNoDestination,
}) => {
  const [countdown, setCountdown] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    if (canSpin || isSpinning) {
      setCountdown('');
      return;
    }

    const updateCountdown = () => {
      const ms = LotteryService.getMillisUntilReset();
      const hours = Math.floor(ms / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((ms % (1000 * 60)) / 1000);
      setCountdown(
        `${hours.toString().padStart(2, '0')}h ${minutes
          .toString()
          .padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
      );
    };

    updateCountdown();
    intervalRef.current = setInterval(updateCountdown, 1000);

    // Pause/resume based on app state
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        updateCountdown();
        if (!intervalRef.current) {
          intervalRef.current = setInterval(updateCountdown, 1000);
        }
      } else if (nextState.match(/inactive|background/)) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
      appStateRef.current = nextState;
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      sub.remove();
    };
  }, [canSpin, isSpinning]);

  const disabled = !canSpin || isSpinning || hasNoConnection || hasNoDestination;

  const getStatusText = () => {
    if (hasNoConnection) return 'No connection';
    if (hasNoDestination) return 'Set reward destination first';
    if (isSpinning) return '';
    if (!canSpin && countdown) return `Resets in ${countdown}`;
    return '';
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={onSpin}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>
          {isSpinning ? 'SPINNING...' : 'SPIN'}
        </Text>
      </TouchableOpacity>
      {getStatusText() ? (
        <Text style={styles.statusText}>{getStatusText()}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  button: {
    backgroundColor: theme.colors.orangeDeep,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    minWidth: 160,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 4,
  },
  buttonTextDisabled: {
    color: theme.colors.textMuted,
    letterSpacing: 4,
  },
  statusText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
  },
});
```

- [ ] **Step 2: Verify component compiles**

Run: `npm run typecheck 2>&1 | grep -i spinbutton | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/lottery/SpinButton.tsx
git commit -m "Feature: Add SpinButton component with countdown timer"
```

---

## Task 4: LotteryResult Component

**Files:**
- Create: `src/components/lottery/LotteryResult.tsx`

- [ ] **Step 1: Create LotteryResult component**

```typescript
// src/components/lottery/LotteryResult.tsx

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { theme } from '../../styles/theme';

interface LotteryResultProps {
  segmentValue: number;
  multiplier: number;
  finalPayout: number;
  visible: boolean;
}

export const LotteryResult: React.FC<LotteryResultProps> = ({
  segmentValue,
  multiplier,
  finalPayout,
  visible,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      opacity.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Text style={styles.breakdown}>
        {segmentValue} x {multiplier.toFixed(1)}x
      </Text>
      <Text style={styles.total}>{finalPayout} rewards</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  breakdown: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
  },
  total: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: theme.typography.weights.bold,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/lottery/LotteryResult.tsx
git commit -m "Feature: Add LotteryResult display component"
```

---

## Task 5: LotteryWheel Component

**Files:**
- Create: `src/components/lottery/LotteryWheel.tsx`
- Reference: `src/components/profile/WorkoutLevelRing.tsx` (SVG pattern)
- Reference: `src/styles/theme.ts`

This is the main animated wheel component. It renders 8 SVG segments, handles spin animation via `Animated.Value` controlling rotation, and lands on the correct segment when the server result arrives.

- [ ] **Step 1: Create LotteryWheel component**

```typescript
// src/components/lottery/LotteryWheel.tsx

import React, { useRef, useCallback, useImperativeHandle, forwardRef, useEffect, useState } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Path, G, Text as SvgText, Polygon } from 'react-native-svg';
import { theme } from '../../styles/theme';
import { DEFAULT_SEGMENTS } from '../../types/lottery';
import type { LotterySegment } from '../../types/lottery';

const WHEEL_SIZE = 280;
const CENTER = WHEEL_SIZE / 2;
const RADIUS = WHEEL_SIZE / 2 - 10;
const SEGMENT_COLORS = ['#1a1a1a', '#111111'];
const SEGMENT_GLOW = theme.colors.orangeDeep; // #FF7B1C for winning segment

export interface LotteryWheelRef {
  spinToSegment: (segmentIndex: number) => void;
  startSpinning: () => void;
  stopWithError: () => void;
}

interface LotteryWheelProps {
  segments?: LotterySegment[];
  dimmed?: boolean;
  winningIndex?: number | null;
  onSpinComplete?: () => void;
}

/**
 * Build an SVG arc path for a wheel segment.
 */
function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const startRad = (Math.PI / 180) * startAngle;
  const endRad = (Math.PI / 180) * endAngle;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

export const LotteryWheel = forwardRef<LotteryWheelRef, LotteryWheelProps>(
  ({ segments = DEFAULT_SEGMENTS, dimmed = false, winningIndex = null, onSpinComplete }, ref) => {
    const rotation = useRef(new Animated.Value(0)).current;
    const currentRotation = useRef(0);
    const isSpinning = useRef(false);
    const spinAnimation = useRef<Animated.CompositeAnimation | null>(null);
    const glowOpacity = useRef(new Animated.Value(0)).current;

    const segmentAngle = 360 / segments.length;

    // Track current rotation value — in useEffect to prevent listener leak
    useEffect(() => {
      const id = rotation.addListener(({ value }) => {
        currentRotation.current = value;
      });
      return () => rotation.removeListener(id);
    }, [rotation]);

    // Winning segment glow pulse (2-3 cycles)
    useEffect(() => {
      if (winningIndex !== null) {
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 1, duration: 300, useNativeDriver: false }),
          Animated.timing(glowOpacity, { toValue: 0.3, duration: 300, useNativeDriver: false }),
          Animated.timing(glowOpacity, { toValue: 1, duration: 300, useNativeDriver: false }),
          Animated.timing(glowOpacity, { toValue: 0.3, duration: 300, useNativeDriver: false }),
          Animated.timing(glowOpacity, { toValue: 0.6, duration: 300, useNativeDriver: false }),
        ]).start();
      } else {
        glowOpacity.setValue(0);
      }
    }, [winningIndex]);

    const startSpinning = useCallback(() => {
      if (isSpinning.current) return;
      isSpinning.current = true;

      // Continuous fast spin loop
      const spin = () => {
        const anim = Animated.timing(rotation, {
          toValue: currentRotation.current + 360,
          duration: 600,
          easing: Easing.linear,
          useNativeDriver: true,
        });
        spinAnimation.current = anim;
        anim.start(({ finished }) => {
          if (finished && isSpinning.current) {
            spin();
          }
        });
      };
      spin();
    }, []);

    const spinToSegment = useCallback((segmentIndex: number) => {
      // Stop continuous spin
      isSpinning.current = false;
      if (spinAnimation.current) {
        spinAnimation.current.stop();
      }

      // Calculate target angle: the pointer is at top (270 degrees in SVG terms).
      // We need the center of the target segment to land at the top.
      const targetSegmentCenter = segmentIndex * segmentAngle + segmentAngle / 2;
      // Rotation needed so that targetSegmentCenter aligns with the pointer at top (0 deg visual)
      const targetAngle = 360 - targetSegmentCenter;
      // Add extra full rotations for a satisfying deceleration
      const extraRotations = 3 * 360;
      const base = currentRotation.current;
      // Ensure we always go forward
      const normalizedBase = base % 360;
      const totalTarget = base + extraRotations + ((targetAngle - normalizedBase + 360) % 360);

      Animated.timing(rotation, {
        toValue: totalTarget,
        duration: 2500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          onSpinComplete?.();
        }
      });
    }, [segmentAngle, onSpinComplete]);

    const stopWithError = useCallback(() => {
      isSpinning.current = false;
      if (spinAnimation.current) {
        spinAnimation.current.stop();
      }
      // Decelerate to a stop without landing on a segment
      Animated.timing(rotation, {
        toValue: currentRotation.current + 90,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, []);

    useImperativeHandle(ref, () => ({
      spinToSegment,
      startSpinning,
      stopWithError,
    }));

    // Use modulo-based rotation to handle values beyond 360
    const rotationDeg = rotation.interpolate({
      inputRange: [-360, 0, 360],
      outputRange: ['-360deg', '0deg', '360deg'],
      extrapolate: 'extend',
    });

    return (
      <View style={[styles.container, dimmed && styles.dimmed]}>
        {/* Pointer triangle at top */}
        <View style={styles.pointerContainer}>
          <Svg width={20} height={16} viewBox="0 0 20 16">
            <Polygon
              points="10,16 0,0 20,0"
              fill={theme.colors.orangeDeep}
            />
          </Svg>
        </View>

        {/* Animated wheel */}
        <Animated.View style={{ transform: [{ rotate: rotationDeg }] }}>
          <Svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}>
            {segments.map((seg, i) => {
              const startAngle = i * segmentAngle - 90;
              const endAngle = startAngle + segmentAngle;
              const midAngle = startAngle + segmentAngle / 2;
              const midRad = (Math.PI / 180) * midAngle;
              const textRadius = RADIUS * 0.65;
              const textX = CENTER + textRadius * Math.cos(midRad);
              const textY = CENTER + textRadius * Math.sin(midRad);
              const isWinner = winningIndex === i;

              return (
                <G key={seg.segment}>
                  <Path
                    d={describeArc(CENTER, CENTER, RADIUS, startAngle, endAngle)}
                    fill={isWinner ? '#2a1a0a' : SEGMENT_COLORS[i % 2]}
                    stroke={isWinner ? SEGMENT_GLOW : theme.colors.border}
                    strokeWidth={isWinner ? 2 : 1}
                    opacity={isWinner ? undefined : 1}
                  />
                  <SvgText
                    x={textX}
                    y={textY}
                    fill={isWinner ? theme.colors.orangeBright : theme.colors.text}
                    fontSize={isWinner ? 16 : 14}
                    fontWeight={isWinner ? '700' : '600'}
                    textAnchor="middle"
                    alignmentBaseline="central"
                  >
                    {seg.baseValue}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </Animated.View>
      </View>
    );
  }
);

LotteryWheel.displayName = 'LotteryWheel';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dimmed: {
    opacity: 0.6,
  },
  pointerContainer: {
    position: 'absolute',
    top: -2,
    zIndex: 10,
    alignItems: 'center',
  },
});
```

- [ ] **Step 2: Verify component compiles**

Run: `npm run typecheck 2>&1 | grep -i lottery | head -20`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add src/components/lottery/LotteryWheel.tsx
git commit -m "Feature: Add animated LotteryWheel SVG component"
```

---

## Task 6: XPExplainer Component

**Files:**
- Create: `src/components/lottery/XPExplainer.tsx`

Extract the XP explainer content from WorkoutLevelRing modal into a standalone component. This keeps the LevelDetailScreen under 500 lines.

- [ ] **Step 1: Create XPExplainer component**

```typescript
// src/components/lottery/XPExplainer.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { XP_CONSTANTS, STREAK_BONUSES, LEVEL_MILESTONES } from '../../types/workoutLevel';

interface XPExplainerProps {
  currentLevel: number;
}

export const XPExplainer: React.FC<XPExplainerProps> = ({ currentLevel }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>How XP Works</Text>

      <View style={styles.item}>
        <Text style={styles.label}>Per Workout</Text>
        <Text style={styles.value}>+{XP_CONSTANTS.BASE_XP_PER_WORKOUT} XP</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.label}>Per 10 min</Text>
        <Text style={styles.value}>+{XP_CONSTANTS.DURATION_XP_PER_10_MIN} XP</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.label}>Per km (cardio)</Text>
        <Text style={styles.value}>+{XP_CONSTANTS.DISTANCE_XP_PER_KM} XP</Text>
      </View>

      <Text style={[styles.title, { marginTop: 16 }]}>Streak Bonuses</Text>
      {STREAK_BONUSES.map((bonus) => (
        <View key={bonus.days} style={styles.item}>
          <Text style={styles.label}>{bonus.days}+ days</Text>
          <Text style={styles.value}>+{bonus.bonus} XP/workout</Text>
        </View>
      ))}

      <Text style={[styles.title, { marginTop: 16 }]}>Milestones</Text>
      {LEVEL_MILESTONES.map((m) => (
        <View key={m.level} style={styles.item}>
          <Text style={[
            styles.label,
            currentLevel >= m.level && { color: theme.colors.text },
          ]}>
            Level {m.level}
          </Text>
          <Text style={[
            styles.value,
            currentLevel >= m.level && { color: theme.colors.text },
          ]}>
            {m.title}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginTop: 32,
  },
  title: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    marginBottom: 10,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
  },
  value: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/lottery/XPExplainer.tsx
git commit -m "Feature: Add XPExplainer component extracted from WorkoutLevelRing modal"
```

---

## Task 7: LevelDetailScreen

**Files:**
- Create: `src/screens/LevelDetailScreen.tsx`
- Reference: `src/screens/RewardsScreen.tsx` (screen pattern)
- Reference: `src/services/rewards/RewardDestinationService.ts` (destination check)
- Reference: `src/types/workoutLevel.ts` (level milestones)

This screen orchestrates the spin flow: submit → animate → show result. Uses workouts from the user store for accurate level calculation, checks reward destination, and stores the Realtime unsubscribe function in a ref for proper cleanup.

- [ ] **Step 1: Create LevelDetailScreen**

```typescript
// src/screens/LevelDetailScreen.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { theme } from '../styles/theme';
import { TexturedBackground } from '../components/ui/TexturedBackground';
import { LotteryWheel } from '../components/lottery/LotteryWheel';
import type { LotteryWheelRef } from '../components/lottery/LotteryWheel';
import { LotteryResult } from '../components/lottery/LotteryResult';
import { SpinButton } from '../components/lottery/SpinButton';
import { XPExplainer } from '../components/lottery/XPExplainer';
import LotteryService from '../services/lottery/LotteryService';
import WorkoutLevelService from '../services/fitness/WorkoutLevelService';
import { RewardDestinationService } from '../services/rewards/RewardDestinationService';
import { calculateLotteryMultiplier, DEFAULT_SEGMENTS } from '../types/lottery';
import type { LotterySpin } from '../types/lottery';
import type { LevelStats } from '../types/workoutLevel';
import { LEVEL_MILESTONES } from '../types/workoutLevel';
import { useUserStore } from '../store/userStore';
import NetInfo from '@react-native-community/netinfo';

export const LevelDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const user = useUserStore((state) => state.user);
  const npub = user?.npub || '';
  // Get workouts from user store for accurate level calculation
  const workouts = useUserStore((state) => state.workouts) || [];

  const wheelRef = useRef<LotteryWheelRef>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const [stats, setStats] = useState<LevelStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [canSpin, setCanSpin] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<LotterySpin | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [winningIndex, setWinningIndex] = useState<number | null>(null);
  const [todaySpin, setTodaySpin] = useState<LotterySpin | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [spinError, setSpinError] = useState<string | null>(null);
  const [hasDestination, setHasDestination] = useState(true);

  const level = stats?.level.level || 1;
  const multiplier = calculateLotteryMultiplier(level);

  // Load level stats and check spin eligibility
  useEffect(() => {
    loadData();
  }, [npub, workouts]);

  // Monitor network
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? true);
    });
    return () => unsub();
  }, []);

  const loadData = async () => {
    setIsLoadingStats(true);
    try {
      // Load level stats with actual workouts from store
      const levelStats = await WorkoutLevelService.getLevelStats(npub, workouts);
      setStats(levelStats);

      // Check reward destination
      const destination = await RewardDestinationService.getDestinationAddress();
      setHasDestination(!!destination?.address);

      // Check if already spun today
      const existing = await LotteryService.getTodaySpin(npub);
      if (existing && existing.status !== 'pending') {
        setTodaySpin(existing);
        setCanSpin(false);
      } else {
        const eligible = await LotteryService.canSpinToday();
        setCanSpin(eligible);
      }
    } catch (error) {
      console.error('[LevelDetail] Failed to load data:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const cleanup = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const handleSpin = async () => {
    if (!npub || isSpinning || !canSpin) return;

    setSpinError(null);
    setIsSpinning(true);
    setShowResult(false);
    setSpinResult(null);
    setWinningIndex(null);

    // Start wheel animation
    wheelRef.current?.startSpinning();

    // Submit spin to Supabase
    const spin = await LotteryService.submitSpin(npub, level);

    if (!spin) {
      wheelRef.current?.stopWithError();
      setIsSpinning(false);
      setSpinError('Spin failed, try again');
      return;
    }

    // Subscribe to Realtime for the result (store unsubscribe in ref)
    unsubscribeRef.current = LotteryService.subscribeToSpinResult(
      spin.id,
      handleSpinResult
    );

    // Polling fallback every 2 seconds
    pollTimerRef.current = setInterval(async () => {
      const result = await LotteryService.fetchSpinResult(spin.id);
      if (result && result.status !== 'pending') {
        handleSpinResult(result);
      }
    }, 2000);

    // Timeout after 10 seconds
    timeoutRef.current = setTimeout(() => {
      cleanup();
      wheelRef.current?.stopWithError();
      setIsSpinning(false);
      setSpinError('Taking longer than expected. Pull down to refresh.');
    }, 10000);
  };

  const handleSpinResult = (result: LotterySpin) => {
    cleanup();
    setSpinResult(result);

    // Find segment index from result
    const segmentIndex = DEFAULT_SEGMENTS.findIndex(
      (s) => s.baseValue === result.segment_value
    );

    if (segmentIndex >= 0) {
      setWinningIndex(segmentIndex);
      wheelRef.current?.spinToSegment(segmentIndex);
    }
  };

  const handleSpinComplete = () => {
    setIsSpinning(false);
    setCanSpin(false);
    setShowResult(true);
    if (spinResult) {
      setTodaySpin(spinResult);
    }
  };

  if (isLoadingStats) {
    return (
      <SafeAreaView style={styles.container}>
        <TexturedBackground />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const currentStreak = stats?.currentStreak || 0;
  const milestone = LEVEL_MILESTONES.slice()
    .reverse()
    .find((m) => level >= m.level);

  return (
    <SafeAreaView style={styles.container}>
      <TexturedBackground />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Level</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Level Info Header */}
        <View style={styles.levelHeader}>
          <Text style={styles.levelNumber}>{level}</Text>
          <Text style={styles.levelTitle}>{milestone?.title || 'Beginner'}</Text>
          <View style={styles.xpBar}>
            <View
              style={[
                styles.xpBarFill,
                { width: `${(stats?.level.progress || 0) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.xpText}>
            {stats?.level.currentXP || 0} / {stats?.level.xpForNextLevel || 100} XP
          </Text>
          {currentStreak > 0 && (
            <Text style={styles.streakText}>{currentStreak} day streak</Text>
          )}
        </View>

        {/* Multiplier Badge */}
        <View style={styles.multiplierBadge}>
          <Text style={styles.multiplierLabel}>Level {level} Bonus</Text>
          <Text style={styles.multiplierValue}>{multiplier.toFixed(1)}x</Text>
        </View>

        {/* Lottery Wheel */}
        <View style={styles.wheelSection}>
          <LotteryWheel
            ref={wheelRef}
            dimmed={!canSpin && !isSpinning}
            winningIndex={showResult ? winningIndex : null}
            onSpinComplete={handleSpinComplete}
          />
        </View>

        {/* Result Display */}
        {showResult && spinResult && (
          <LotteryResult
            segmentValue={spinResult.segment_value || 0}
            multiplier={spinResult.multiplier}
            finalPayout={spinResult.final_payout || 0}
            visible={showResult}
          />
        )}

        {/* Today's spin (already-spun state) */}
        {!showResult && todaySpin && todaySpin.segment_value && (
          <View style={styles.todayResult}>
            <Text style={styles.todayLabel}>Today</Text>
            <Text style={styles.todayValue}>
              {todaySpin.segment_value} x {todaySpin.multiplier.toFixed(1)}x ={' '}
              {todaySpin.final_payout} rewards
            </Text>
          </View>
        )}

        {/* Error message */}
        {spinError && (
          <Text style={styles.errorText}>{spinError}</Text>
        )}

        {/* Spin Button */}
        <SpinButton
          canSpin={canSpin}
          isSpinning={isSpinning}
          onSpin={handleSpin}
          hasNoConnection={!isConnected}
          hasNoDestination={!hasDestination}
        />

        {/* XP Explainer (extracted component) */}
        <XPExplainer currentLevel={level} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  levelHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  levelNumber: {
    color: theme.colors.text,
    fontSize: 48,
    fontWeight: theme.typography.weights.extraBold,
  },
  levelTitle: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    marginBottom: 12,
  },
  xpBar: {
    width: '80%',
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: theme.colors.orangeDeep,
    borderRadius: 3,
  },
  xpText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    marginTop: 6,
  },
  streakText: {
    color: theme.colors.orangeBright,
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    marginTop: 4,
  },
  multiplierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 20,
  },
  multiplierLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
  },
  multiplierValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
  },
  wheelSection: {
    marginVertical: 16,
  },
  todayResult: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 2,
  },
  todayLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
  },
  todayValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
  },
  errorText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginBottom: 8,
  },
});
```

Note: The XP explainer is in the extracted `XPExplainer` component (Task 6). The exact content may need adjustment based on what's in the current WorkoutLevelRing modal — check `WorkoutLevelRing.tsx` lines 178-263 during implementation. The `workouts` state selector from `useUserStore` may need to be adapted depending on how the store exposes workout data — check the store during implementation.

- [ ] **Step 2: Verify screen compiles**

Run: `npm run typecheck 2>&1 | grep -i leveldetail | head -20`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add src/screens/LevelDetailScreen.tsx
git commit -m "Feature: Add LevelDetailScreen with lottery wheel and XP explainer"
```

---

## Task 8: Navigation Integration

**Files:**
- Modify: `src/navigation/AppNavigator.tsx` (add screen to param list + Stack.Screen)
- Modify: `src/components/profile/WorkoutLevelRing.tsx` (replace modal with navigation)

- [ ] **Step 1: Add LevelDetail to RootStackParamList**

In `src/navigation/AppNavigator.tsx`, add to the imports (near line 36):
```typescript
import { LevelDetailScreen } from '../screens/LevelDetailScreen';
```

Add to `RootStackParamList` (near line 91):
```typescript
LevelDetail: undefined;
```

- [ ] **Step 2: Add Stack.Screen for LevelDetail**

In `src/navigation/AppNavigator.tsx`, add after the JournalHistory screen registration (near line 490):
```typescript
{/* Level Detail Screen - Level info + lottery wheel */}
<Stack.Screen
  name="LevelDetail"
  component={LevelDetailScreen}
  options={{
    ...defaultScreenOptions,
    headerShown: false,
  }}
/>
```

- [ ] **Step 3: Update WorkoutLevelRing to navigate instead of showing modal**

In `src/components/profile/WorkoutLevelRing.tsx`:

Add navigation import at top:
```typescript
import { useNavigation } from '@react-navigation/native';
```

Inside the component function (near line 42), add:
```typescript
const navigation = useNavigation<any>();
```

Replace the `onPress` handler on the TouchableOpacity (line 97):
```typescript
// OLD: onPress={() => setShowExplainer(true)}
// NEW:
onPress={() => navigation.navigate('LevelDetail')}
```

Remove the `showExplainer` state variable (line 44) and the entire Modal JSX block (lines 178-263), since the explainer content is now on LevelDetailScreen. Keep the `Modal` import removal too if nothing else uses it.

- [ ] **Step 4: Verify everything compiles**

Run: `npm run typecheck 2>&1 | grep -E "(AppNavigator|WorkoutLevelRing|LevelDetail)" | head -20`
Expected: No new errors

- [ ] **Step 5: Commit**

```bash
git add src/navigation/AppNavigator.tsx src/components/profile/WorkoutLevelRing.tsx
git commit -m "Feature: Wire LevelDetailScreen into navigation, replace level ring modal"
```

---

## Task 9: Manual Verification

**Files:** None (testing only)

- [ ] **Step 1: Write verification script**

Create `scripts/verify/verify-lottery-wheel.ts`:
```typescript
/**
 * Verify lottery wheel implementation compiles and types are correct
 */
import { calculateLotteryMultiplier, DEFAULT_SEGMENTS } from '../../src/types/lottery';

// Verify multiplier formula
const testCases = [
  { level: 1, expected: 1.35 },
  { level: 10, expected: 2.20 },
  { level: 100, expected: 3.31 },
];

let passed = 0;
for (const { level, expected } of testCases) {
  const result = parseFloat(calculateLotteryMultiplier(level).toFixed(2));
  const match = Math.abs(result - expected) < 0.02;
  console.log(`Level ${level}: ${result}x (expected ~${expected}x) ${match ? 'PASS' : 'FAIL'}`);
  if (match) passed++;
}

// Verify segments sum to ~1.0
const probSum = DEFAULT_SEGMENTS.reduce((sum, s) => sum + s.probability, 0);
const probMatch = Math.abs(probSum - 1.0) < 0.001;
console.log(`\nProbability sum: ${probSum} (expected 1.0) ${probMatch ? 'PASS' : 'FAIL'}`);
if (probMatch) passed++;

// Verify expected value
const ev = DEFAULT_SEGMENTS.reduce((sum, s) => sum + s.baseValue * s.probability, 0);
const evMatch = Math.abs(ev - 37.0) < 0.1;
console.log(`Expected value: ${ev} (expected 37.0) ${evMatch ? 'PASS' : 'FAIL'}`);
if (evMatch) passed++;

console.log(`\n${passed}/${testCases.length + 2} checks passed`);
process.exit(passed === testCases.length + 2 ? 0 : 1);
```

- [ ] **Step 2: Run verification**

Run: `npx tsx scripts/verify/verify-lottery-wheel.ts`
Expected: All checks pass

- [ ] **Step 3: Run full typecheck**

Run: `npm run typecheck`
Expected: No new errors introduced (pre-existing ~199 errors are fine)

- [ ] **Step 4: Commit verification script**

```bash
git add scripts/verify/verify-lottery-wheel.ts
git commit -m "Chore: Add lottery wheel verification script"
```

---

## Summary

| Task | Description | New Files | Modified Files |
|------|-------------|-----------|----------------|
| 1 | Lottery types & constants | `src/types/lottery.ts` | — |
| 2 | LotteryService (Supabase + Realtime) | `src/services/lottery/LotteryService.ts` | — |
| 3 | SpinButton component | `src/components/lottery/SpinButton.tsx` | — |
| 4 | LotteryResult component | `src/components/lottery/LotteryResult.tsx` | — |
| 5 | LotteryWheel SVG component | `src/components/lottery/LotteryWheel.tsx` | — |
| 6 | XPExplainer component | `src/components/lottery/XPExplainer.tsx` | — |
| 7 | LevelDetailScreen | `src/screens/LevelDetailScreen.tsx` | — |
| 8 | Navigation integration | — | `AppNavigator.tsx`, `WorkoutLevelRing.tsx` |
| 9 | Verification | `scripts/verify/verify-lottery-wheel.ts` | — |

**Not in scope (requires Supabase admin):** Creating the `lottery_spins` and `lottery_config` tables, RLS policies, and the DB trigger/Edge Function that picks segments and sends rewards. The client-side code is built to work once those are in place. The schema is documented in the spec.
