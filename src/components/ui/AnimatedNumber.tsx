/**
 * AnimatedNumber — smooth count-up transitions for numeric values
 *
 * Use wherever a displayed number changes between renders (earnings, distance,
 * pace, rank, leaderboard stats). Animates from the previous value to the new
 * one over `duration` ms with tabular-nums for stable column width.
 *
 * For values updating >5×/second (live GPS distance), animation adds overhead —
 * prefer a plain <Text> there.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleProp, Text, TextStyle } from 'react-native';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  style?: StyleProp<TextStyle>;
  format?: (value: number) => string;
  decimals?: number;
}

const defaultFormat = (n: number, decimals: number): string => {
  if (decimals > 0) return n.toFixed(decimals);
  return Math.round(n).toLocaleString();
};

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 200,
  style,
  format,
  decimals = 0,
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const animatedValue = useRef(new Animated.Value(value)).current;
  const previousValue = useRef(value);

  useEffect(() => {
    if (previousValue.current === value) return;

    animatedValue.setValue(previousValue.current);
    const listener = animatedValue.addListener(({ value: v }) => {
      setDisplayValue(v);
    });

    Animated.timing(animatedValue, {
      toValue: value,
      duration,
      useNativeDriver: false,
    }).start(() => {
      animatedValue.removeListener(listener);
      previousValue.current = value;
      setDisplayValue(value);
    });

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [value, duration, animatedValue]);

  const formatted = format
    ? format(displayValue)
    : defaultFormat(displayValue, decimals);

  return (
    <Text style={[{ fontVariant: ['tabular-nums'] }, style]}>{formatted}</Text>
  );
};
