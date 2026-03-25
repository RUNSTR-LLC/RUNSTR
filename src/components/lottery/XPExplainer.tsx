// src/components/lottery/XPExplainer.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { XP_CONSTANTS, STREAK_BONUSES, LEVEL_MILESTONES } from '../../types/workoutLevel';

interface XPExplainerProps {
  currentLevel: number;
}

export const XPExplainer: React.FC<XPExplainerProps> = ({ currentLevel }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>How XP Works</Text>

      <View style={styles.item}>
        <Text style={styles.label}>Per Workout</Text>
        <Text style={styles.value}>+{XP_CONSTANTS.BASE_XP_PER_WORKOUT} XP</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.label}>Per 10 min</Text>
        <Text style={styles.value}>+{XP_CONSTANTS.DURATION_XP_PER_10_MIN} XP</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.label}>Per km (cardio)</Text>
        <Text style={styles.value}>+{XP_CONSTANTS.DISTANCE_XP_PER_KM} XP</Text>
      </View>

      <Text style={[styles.title, { marginTop: 16 }]}>Streak Bonuses</Text>
      {STREAK_BONUSES.map((bonus) => (
        <View key={bonus.days} style={styles.item}>
          <Text style={styles.label}>{bonus.days}+ days</Text>
          <Text style={styles.value}>+{bonus.bonus} XP/workout</Text>
        </View>
      ))}

      <Text style={[styles.title, { marginTop: 16 }]}>Milestones</Text>
      {LEVEL_MILESTONES.map((m) => (
        <View key={m.level} style={styles.item}>
          <Text style={[
            styles.label,
            currentLevel >= m.level && { color: theme.colors.text },
          ]}>
            Level {m.level}
          </Text>
          <Text style={[
            styles.value,
            currentLevel >= m.level && { color: theme.colors.text },
          ]}>
            {m.title}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginTop: 32,
  },
  title: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    marginBottom: 10,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
  },
  value: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
  },
});
