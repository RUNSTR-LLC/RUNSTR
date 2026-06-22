/**
 * ThemedSwitch — on-brand replacement for React Native's native Switch.
 *
 * iOS's native Switch ignores `thumbColor`, so toggles rendered with a white
 * thumb regardless of theme. This component gives full control: an orange thumb
 * on a neutral (off) or orange-tinted (on) track, matching the black/orange
 * design system. Drop-in API compatible with the subset of Switch we use:
 * `value`, `onValueChange`, and `disabled`.
 */

import React, { useEffect, useRef } from 'react';
import { Pressable, Animated, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

interface ThemedSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 32;
const THUMB_SIZE = 26;
const PADDING = 3;

export const ThemedSwitch: React.FC<ThemedSwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
}) => {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [value, anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [PADDING, TRACK_WIDTH - THUMB_SIZE - PADDING],
  });

  return (
    <Pressable
      onPress={() => {
        if (!disabled) onValueChange(!value);
      }}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={[
        styles.track,
        // ON: orange-tinted track. OFF: neutral dark track. Either way the
        // solid bright-orange thumb stays clearly visible.
        { backgroundColor: value ? 'rgba(255, 157, 66, 0.30)' : theme.colors.switchTrackOff },
        disabled && styles.disabled,
      ]}
    >
      <Animated.View style={[styles.thumb, { transform: [{ translateX }] }]} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: theme.colors.orangeBright,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default ThemedSwitch;
