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
  cancelAnimation,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { theme } from '../../styles/theme';

// Breathing pattern durations (milliseconds)
const INHALE_MS = 4000;
const HOLD_MS = 4000;
const EXHALE_MS = 6000;

const MIN_SCALE = 0.4;
const MAX_SCALE = 1.0;

interface BreathingCircleProps {
  isPaused: boolean;
}

export const BreathingCircle: React.FC<BreathingCircleProps> = ({ isPaused }) => {
  const scale = useSharedValue(MIN_SCALE);
  const [phaseLabel, setPhaseLabel] = React.useState('Inhale...');

  useEffect(() => {
    if (isPaused) {
      cancelAnimation(scale);
      return;
    }

    // Animate: inhale (expand) → hold (stay) → exhale (contract), repeat
    // Phase labels are driven by runOnJS callbacks within the animation sequence
    // so they stay perfectly in sync with the native animation.
    scale.value = withRepeat(
      withSequence(
        // Inhale: scale from MIN to MAX over 4s
        withTiming(MAX_SCALE, { duration: INHALE_MS, easing: Easing.inOut(Easing.ease) }),
        // Hold: stay at MAX for 4s, update label at transition
        withTiming(MAX_SCALE, { duration: HOLD_MS }, () => runOnJS(setPhaseLabel)('Hold...')),
        // Exhale: scale from MAX to MIN over 6s, update label at start
        withTiming(MIN_SCALE, { duration: EXHALE_MS, easing: Easing.inOut(Easing.ease) }, () => runOnJS(setPhaseLabel)('Exhale...')),
        // Reset label for next cycle
        withTiming(MIN_SCALE, { duration: 0 }, () => runOnJS(setPhaseLabel)('Inhale...')),
      ),
      -1, // infinite repeat
      false, // don't reverse
    );

    return () => {
      cancelAnimation(scale);
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
