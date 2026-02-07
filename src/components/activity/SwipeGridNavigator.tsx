/**
 * SwipeGridNavigator - 2D gesture handling for activity grid navigation
 *
 * Smooth slide + fade transitions for polished UX.
 * - Swipe Left/Right: Navigate between activities
 * - Swipe Up/Down: Navigate between categories
 */

import React, { ReactNode } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 500;

// Smooth spring config - less bouncy, more fluid
const SPRING_CONFIG = {
  damping: 25,
  stiffness: 300,
  mass: 0.8,
};

// Timing config for exit animation
const EXIT_TIMING = {
  duration: 200,
  easing: Easing.out(Easing.cubic),
};

export interface SwipeGridNavigatorProps {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
  disabled?: boolean;
  children: ReactNode;
}

export const SwipeGridNavigator: React.FC<SwipeGridNavigatorProps> = ({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  disabled = false,
  children,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .minDistance(10)
    .onUpdate((e) => {
      const isHorizontal = Math.abs(e.translationX) > Math.abs(e.translationY);

      if (isHorizontal) {
        // Direct follow with slight resistance
        translateX.value = e.translationX * 0.5;
        translateY.value = 0;
      } else {
        translateY.value = e.translationY * 0.5;
        translateX.value = 0;
      }
    })
    .onEnd((e) => {
      const isHorizontal = Math.abs(e.translationX) > Math.abs(e.translationY);

      if (isHorizontal) {
        if (e.translationX < -SWIPE_THRESHOLD || e.velocityX < -VELOCITY_THRESHOLD) {
          // Swipe left - slide out quickly, then reset and callback
          translateX.value = withTiming(-SCREEN_WIDTH * 0.3, EXIT_TIMING, (finished) => {
            if (finished) {
              runOnJS(triggerHaptic)();
              runOnJS(onSwipeLeft)();
              // Quick reset
              translateX.value = 0;
            }
          });
        } else if (e.translationX > SWIPE_THRESHOLD || e.velocityX > VELOCITY_THRESHOLD) {
          // Swipe right
          translateX.value = withTiming(SCREEN_WIDTH * 0.3, EXIT_TIMING, (finished) => {
            if (finished) {
              runOnJS(triggerHaptic)();
              runOnJS(onSwipeRight)();
              translateX.value = 0;
            }
          });
        } else {
          // Snap back smoothly
          translateX.value = withSpring(0, SPRING_CONFIG);
        }
        translateY.value = withSpring(0, SPRING_CONFIG);
      } else {
        if (e.translationY < -SWIPE_THRESHOLD || e.velocityY < -VELOCITY_THRESHOLD) {
          // Swipe up
          translateY.value = withTiming(-SCREEN_HEIGHT * 0.15, EXIT_TIMING, (finished) => {
            if (finished) {
              runOnJS(triggerHaptic)();
              runOnJS(onSwipeUp)();
              translateY.value = 0;
            }
          });
        } else if (e.translationY > SWIPE_THRESHOLD || e.velocityY > VELOCITY_THRESHOLD) {
          // Swipe down
          translateY.value = withTiming(SCREEN_HEIGHT * 0.15, EXIT_TIMING, (finished) => {
            if (finished) {
              runOnJS(triggerHaptic)();
              runOnJS(onSwipeDown)();
              translateY.value = 0;
            }
          });
        } else {
          translateY.value = withSpring(0, SPRING_CONFIG);
        }
        translateX.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    // Calculate opacity based on translation (fades as it moves)
    const opacity = interpolate(
      Math.abs(translateX.value) + Math.abs(translateY.value),
      [0, SCREEN_WIDTH * 0.3],
      [1, 0.3],
      Extrapolation.CLAMP
    );

    // Subtle scale effect
    const scale = interpolate(
      Math.abs(translateX.value) + Math.abs(translateY.value),
      [0, SCREEN_WIDTH * 0.3],
      [1, 0.95],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale },
      ],
      opacity,
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
