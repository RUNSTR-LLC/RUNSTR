/**
 * TeamGoalProgressCard - Display team goal progress for team-total scoring mode
 * Shows combined team distance/metrics toward a target goal with progress bar
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { Ionicons } from '@expo/vector-icons';

interface TeamGoalProgressCardProps {
  current: number;
  goal: number;
  percentage: number;
  formattedCurrent: string;
  formattedGoal: string;
  unit: string;
}

export const TeamGoalProgressCard: React.FC<TeamGoalProgressCardProps> = ({
  current,
  goal,
  percentage,
  formattedCurrent,
  formattedGoal,
}) => {
  // Cap percentage at 100% for display
  const displayPercentage = Math.min(percentage, 100);
  const isComplete = percentage >= 100;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons
          name={isComplete ? 'trophy' : 'flag'}
          size={20}
          color={isComplete ? theme.colors.orangeBright : theme.colors.text}
        />
        <Text style={styles.title}>Team Goal</Text>
      </View>

      {/* Progress Numbers */}
      <View style={styles.progressNumbers}>
        <Text style={styles.currentValue}>{formattedCurrent}</Text>
        <Text style={styles.separator}>/</Text>
        <Text style={styles.goalValue}>{formattedGoal}</Text>
      </View>

      {/* Percentage */}
      <Text
        style={[styles.percentage, isComplete && styles.percentageComplete]}
      >
        {displayPercentage.toFixed(1)}% Complete
      </Text>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              isComplete && styles.progressBarFillComplete,
              { width: `${displayPercentage}%` },
            ]}
          />
        </View>
      </View>

      {/* Status Message */}
      {isComplete ? (
        <View style={styles.completeBadge}>
          <Ionicons
            name="checkmark-circle"
            size={16}
            color={theme.colors.success}
          />
          <Text style={styles.completeText}>Goal Achieved</Text>
        </View>
      ) : (
        <Text style={styles.remainingText}>
          {(goal - current).toFixed(1)} remaining
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  progressNumbers: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 8,
  },
  currentValue: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  separator: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginHorizontal: 8,
  },
  goalValue: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  percentage: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 12,
  },
  percentageComplete: {
    color: theme.colors.success,
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: theme.colors.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.text,
    borderRadius: 6,
    minWidth: '2%', // Show at least a small sliver
  },
  progressBarFillComplete: {
    backgroundColor: theme.colors.success,
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.success + '20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  completeText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.success,
  },
  remainingText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
