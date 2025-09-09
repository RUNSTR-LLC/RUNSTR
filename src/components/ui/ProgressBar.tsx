import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../styles/theme';

interface ProgressBarProps {
  progress?: number; // 0-100 percentage
  percentage?: number; // Alternative prop name for progress
  height?: number;
  backgroundColor?: string;
  fillColor?: string;
  style?: ViewStyle;
  animated?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  percentage,
  height = 4,
  backgroundColor = theme.colors.border,
  fillColor = theme.colors.accent,
  style,
  animated = true,
}) => {
  const actualProgress = progress ?? percentage ?? 0;
  const clampedProgress = Math.max(0, Math.min(100, actualProgress));

  return (
    <View style={[styles.container, { height }, style]}>
      <View
        style={[
          styles.background,
          {
            backgroundColor,
            height,
          },
        ]}
      />
      <View
        style={[
          styles.fill,
          {
            width: `${clampedProgress}%`,
            backgroundColor: fillColor,
            height,
          },
        ]}
      />
    </View>
  );
};

interface CompetitorProgressBarProps {
  progress: number; // 0-100 percentage
  label?: string;
  value?: string;
  style?: ViewStyle;
}

export const CompetitorProgressBar: React.FC<CompetitorProgressBarProps> = ({
  progress,
  style,
}) => {
  return (
    <View style={[styles.competitorProgressContainer, style]}>
      <View style={styles.competitorProgressBar}>
        <View
          style={[
            styles.competitorProgressFill,
            {
              width: `${Math.max(0, Math.min(100, progress))}%`,
            },
          ]}
        />
      </View>
    </View>
  );
};

interface EventProgressBarProps {
  progress: number; // 0-100 percentage
  timeRemaining: string;
  style?: ViewStyle;
}

export const EventProgressBar: React.FC<EventProgressBarProps> = ({
  progress,
  style,
}) => {
  return (
    <View style={[styles.eventProgressContainer, style]}>
      <View style={styles.eventProgressBar}>
        <View
          style={[
            styles.eventProgressFill,
            {
              width: `${Math.max(0, Math.min(100, progress))}%`,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: theme.borderRadius.small / 2,
  },

  background: {
    width: '100%',
    borderRadius: theme.borderRadius.small / 2,
  },

  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: theme.borderRadius.small / 2,
    // Transition would be handled by Animated API in production
  },

  // Event-specific progress bar styles (matches HTML mockup)
  eventProgressContainer: {
    width: '100%',
  },

  eventProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },

  eventProgressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
  },

  // Competitor-specific progress bar styles (matches HTML mockup)
  competitorProgressContainer: {
    width: '100%',
  },

  competitorProgressBar: {
    width: '100%',
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },

  competitorProgressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
  },
});
