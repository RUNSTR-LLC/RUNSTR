/**
 * DifficultyIndicator - Visual indicator for team skill level
 * Displays 1-4 filled dots based on difficulty level with label
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { DifficultyLevel } from '../../types';

interface DifficultyIndicatorProps {
  difficulty: DifficultyLevel;
  style?: any;
}

export const DifficultyIndicator: React.FC<DifficultyIndicatorProps> = ({
  difficulty,
  style,
}) => {
  // Get number of filled dots based on difficulty level
  const getFilledDots = (level: DifficultyLevel): number => {
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

  // Get display label for difficulty level
  const getDifficultyLabel = (level: DifficultyLevel): string => {
    switch (level) {
      case 'beginner':
        return 'Beginner';
      case 'intermediate':
        return 'Intermediate';
      case 'advanced':
        return 'Advanced';
      case 'elite':
        return 'Elite';
      default:
        return 'Beginner';
    }
  };

  const filledCount = getFilledDots(difficulty);
  const label = getDifficultyLabel(difficulty);

  // Render 4 dots with appropriate fill state
  const renderDots = () => {
    const dots = [];
    for (let i = 0; i < 4; i++) {
      const isFilled = i < filledCount;
      dots.push(
        <View key={i} style={[styles.dot, isFilled && styles.dotFilled]} />
      );
    }
    return dots;
  };

  return (
    <View style={[styles.container, style]}>
      {renderDots()}
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.buttonBorder, // #333
  },

  dotFilled: {
    backgroundColor: theme.colors.text, // #fff
  },

  label: {
    fontSize: 10,
    color: theme.colors.textMuted, // #666
    marginLeft: 4,
  },
});
