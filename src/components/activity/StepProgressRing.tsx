/**
 * StepProgressRing - Circular progress ring for step count display
 * Shows steps, percentage, and estimated distance in a hero layout
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Text as SvgText, G } from 'react-native-svg';
import { theme } from '../../styles/theme';

interface StepProgressRingProps {
  steps: number;
  goal?: number; // Optional when showProgress is false
  estimatedDistance: number; // meters
  size?: number;
  showProgress?: boolean; // When false, hides progress arc and percentage
  hasGPSWorkouts?: boolean; // When true, distance includes GPS data (more accurate)
}

export const StepProgressRing: React.FC<StepProgressRingProps> = ({
  steps,
  goal = 10000,
  estimatedDistance,
  size = 240,
  showProgress = true,
  hasGPSWorkouts = false,
}) => {
  const percentage = showProgress ? Math.min(100, (steps / goal) * 100) : 0;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const center = size / 2;

  // Format distance in km
  const formattedDistance = (estimatedDistance / 1000).toFixed(2);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={theme.colors.border}
          strokeWidth={strokeWidth}
          fill={theme.colors.card}
        />
        {/* Progress arc - rotated to start from top (only when showProgress is true) */}
        {showProgress && (
          <G rotation="-90" origin={`${center}, ${center}`}>
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={theme.colors.accent}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </G>
        )}
        {/* Center text: steps count */}
        <SvgText
          x={center}
          y={center - 24}
          fontSize={42}
          fontWeight="bold"
          fill={theme.colors.text}
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {steps.toLocaleString()}
        </SvgText>
        {/* "steps" label */}
        <SvgText
          x={center}
          y={center + 8}
          fontSize={16}
          fill={theme.colors.textMuted}
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          steps
        </SvgText>
        {/* Distance - shows "~" prefix when purely estimated, none when GPS included */}
        <SvgText
          x={center - 6}
          y={center + 40}
          fontSize={18}
          fontWeight="600"
          fill={theme.colors.accent}
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {hasGPSWorkouts ? '' : '~'}{formattedDistance} km
        </SvgText>
        {/* Percentage (only when showProgress is true) */}
        {showProgress && (
          <SvgText
            x={center}
            y={center + 68}
            fontSize={14}
            fill={theme.colors.textMuted}
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {percentage.toFixed(0)}%
          </SvgText>
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
