/**
 * HoldToStartButton - Hold-down button with SVG circular progress indicator
 * User must hold for 2 seconds to trigger start action
 * Uses SVG for consistent rendering on both iOS and Android
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles/theme';

// Create animated Circle component for SVG progress animation
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface HoldToStartButtonProps {
  label: string;
  onHoldComplete: () => void;
  disabled?: boolean;
  holdDuration?: number; // milliseconds (default 2000)
  size?: 'default' | 'large'; // Size variant - large for minimalist UI
}

// Size configurations
const sizeConfigs = {
  default: {
    svgSize: 140,
    containerSize: 160,
    strokeWidth: 3,
    labelFontSize: 16,
    hintFontSize: 12,
  },
  large: {
    svgSize: 200,
    containerSize: 220,
    strokeWidth: 4,
    labelFontSize: 20,
    hintFontSize: 14,
  },
};

export const HoldToStartButton: React.FC<HoldToStartButtonProps> = ({
  label,
  onHoldComplete,
  disabled = false,
  holdDuration = 2000,
  size: sizeVariant = 'default',
}) => {
  const { t } = useTranslation('profile');
  const progressAnim = useRef(new Animated.Value(0)).current;
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get size configuration based on variant
  const config = sizeConfigs[sizeVariant];

  // SVG Circle parameters - dynamic based on size variant
  const svgSize = config.svgSize;
  const strokeWidth = config.strokeWidth;
  const center = svgSize / 2;
  const radius = (svgSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animated strokeDashoffset: full circumference (empty) -> 0 (full)
  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: () => {
        // User started pressing
        startHoldAnimation();
      },
      onPanResponderRelease: () => {
        // User released before completing
        cancelHoldAnimation();
      },
      onPanResponderTerminate: () => {
        // Touch was interrupted
        cancelHoldAnimation();
      },
    })
  ).current;

  const startHoldAnimation = () => {
    // Start circular progress animation
    // useNativeDriver: false is required for SVG strokeDashoffset animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: holdDuration,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        // Hold completed successfully
        handleHoldComplete();
      }
    });
  };

  const cancelHoldAnimation = () => {
    // Stop and reset animation
    progressAnim.stopAnimation();
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();

    // Clear any pending timers
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const handleHoldComplete = () => {
    // Haptic feedback when hold completes
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    // Reset animation
    progressAnim.setValue(0);

    // Trigger callback
    onHoldComplete();
  };

  // Dynamic container style based on size
  const containerStyle = {
    width: config.containerSize,
    height: config.containerSize,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    position: 'relative' as const,
  };

  // Dynamic SVG container positioning (center the SVG in the container)
  const svgOffset = (config.containerSize - config.svgSize) / 2;

  return (
    <View
      style={[containerStyle, disabled && styles.containerDisabled]}
      {...panResponder.panHandlers}
    >
      {/* SVG Progress Ring */}
      <View style={{ position: 'absolute', top: svgOffset, left: svgOffset }}>
        <Svg width={svgSize} height={svgSize}>
          {/* Background circle (gray track with dark fill) */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={theme.colors.border}
            strokeWidth={strokeWidth}
            fill={theme.colors.card}
          />

          {/* Progress circle (accent colored fill, starts from 12 o'clock) */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={theme.colors.accent}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation={-90}
            origin={`${center}, ${center}`}
          />
        </Svg>
      </View>

      {/* Label text */}
      <View style={styles.labelContainer}>
        <Text style={[
          styles.label,
          { fontSize: config.labelFontSize },
          disabled && styles.labelDisabled
        ]}>
          {label}
        </Text>
        <Text style={[
          styles.hint,
          { fontSize: config.hintFontSize },
          disabled && styles.hintDisabled
        ]}>
          {t('holdToStart')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  containerDisabled: {
    opacity: 0.5,
  },
  labelContainer: {
    alignItems: 'center',
    zIndex: 1,
  },
  label: {
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    letterSpacing: 0.5,
  },
  labelDisabled: {
    color: theme.colors.textMuted,
  },
  hint: {
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  hintDisabled: {
    color: theme.colors.border,
  },
});
