/**
 * LiveIndicator - Animated indicator for real-time notifications
 * Shows pulsing dot for live updates
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { theme } from '../../styles/theme';

interface LiveIndicatorProps {
  text?: string;
  style?: any;
}

export const LiveIndicator: React.FC<LiveIndicatorProps> = ({
  text = 'Live',
  style,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [pulseAnim]);

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
      <Text style={styles.liveText}>{text.toUpperCase()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },

  liveDot: {
    width: 6,
    height: 6,
    backgroundColor: theme.colors.text, // #fff
    borderRadius: 3,
  },

  liveText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: theme.colors.textSecondary, // #ccc
  },
});
