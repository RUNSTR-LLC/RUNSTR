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
