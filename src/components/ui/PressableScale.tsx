/**
 * PressableScale — Pressable with a subtle scale-down on press.
 *
 * Drop-in replacement for Pressable. Tap targets shrink to 0.97× for 80ms
 * on press, giving the "alive" feel of native iOS/Android tap feedback
 * instead of the flat opacity fade TouchableOpacity ships with.
 *
 * Leave internal chrome (modal close buttons, chips, icon-only nav) on
 * plain Pressable — diminishing returns at that size.
 */

import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale factor when pressed. Default 0.97. */
  scaleTo?: number;
  /** Press-in animation duration in ms. Default 80. */
  duration?: number;
}

export const PressableScale: React.FC<PressableScaleProps> = ({
  children,
  style,
  scaleTo = 0.97,
  duration = 80,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = (e: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
    if (!disabled) {
      Animated.timing(scale, {
        toValue: scaleTo,
        duration,
        useNativeDriver: true,
      }).start();
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
    Animated.timing(scale, {
      toValue: 1,
      duration,
      useNativeDriver: true,
    }).start();
    onPressOut?.(e);
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        {...rest}
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};
