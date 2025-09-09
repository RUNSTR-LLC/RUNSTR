/**
 * DifficultyIndicator Component - Exact match to HTML mockup difficulty dots
 * Shows skill level with filled/unfilled dots: Beginner (1), Intermediate (2), Advanced (3), Elite (4)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { DifficultyLevel } from '../../types';

interface DifficultyIndicatorProps {
  level: DifficultyLevel;
  style?: any;
}

const getDotCount = (level: DifficultyLevel): number => {
  switch (level) {
    case 'beginner':
      return 1;
    case 'intermediate':
      return 2;
    case 'advanced':
      return 3;
    case 'elite':
      return 4;
    default:
      return 1;
  }
};

const formatLabel = (level: DifficultyLevel): string => {
  return level.charAt(0).toUpperCase() + level.slice(1);
};

export const DifficultyIndicator: React.FC<DifficultyIndicatorProps> = ({
  level,
  style,
}) => {
  const filledDots = getDotCount(level);
  const totalDots = 4;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.dotsContainer}>
        {Array.from({ length: totalDots }, (_, index) => (
          <View
            key={index}
            style={[styles.dot, index < filledDots && styles.dotActive]}
          />
        ))}
      </View>
      <Text style={styles.label}>{formatLabel(level)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },

  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },

  dot: {
    // Exact CSS: width: 6px; height: 6px; border-radius: 3px; background: #333;
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.buttonBorder, // #333
  },

  dotActive: {
    // Exact CSS: background: #fff;
    backgroundColor: theme.colors.text, // #fff
  },

  label: {
    // Exact CSS: font-size: 10px; color: #666; margin-left: 4px;
    fontSize: 10,
    color: theme.colors.textMuted, // #666
    marginLeft: theme.spacing.sm,
  },
});
