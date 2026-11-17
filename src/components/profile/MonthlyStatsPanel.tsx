/**
 * MonthlyStatsPanel Component
 * Expandable stats panel for one month of runs
 * Matches RUNSTR orange/gold theme with dark background
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { useUnitPreference } from '../../hooks/useUnitPreference';
import type { MonthlyStats } from '../../services/fitness/MonthlyStatsCalculator';

interface MonthlyStatsPanelProps {
  stats: MonthlyStats;
}

export const MonthlyStatsPanel: React.FC<MonthlyStatsPanelProps> = ({
  stats,
}) => {
  const { isMetric } = useUnitPreference();

  /**
   * Format distance (meters to km)
   */
  const formatDistance = (meters: number): string =>
    isMetric
      ? `${(meters / 1000).toFixed(1)} km`
      : `${(meters * 0.000621371).toFixed(1)} mi`;

  /**
   * Format duration (seconds to readable time)
   */
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  /**
   * Render comparison indicator (↑/↓ with percentage)
   */
  const renderComparison = (change: number) => {
    if (change === 0) {
      return <Text style={styles.comparisonNeutral}>— 0%</Text>;
    }

    const isPositive = change > 0;
    const icon = isPositive ? '↑' : '↓';
    const color = isPositive ? theme.colors.orangeBright : theme.colors.textMuted;

    return (
      <Text style={[styles.comparisonText, { color }]}>
        {icon} {Math.abs(change).toFixed(0)}%
      </Text>
    );
  };

  /**
   * Render horizontal bar chart for weekly stats
   */
  const renderWeeklyBars = () => {
    const maxWorkouts = Math.max(
      ...stats.weeklyStats.map((w) => w.workouts),
      1
    );

    return (
      <View style={styles.weeklyBarsContainer}>
        {stats.weeklyStats.map((week) => {
          const heightPercentage = (week.workouts / maxWorkouts) * 100;
          return (
            <View key={week.weekNumber} style={styles.weeklyBar}>
              <View
                style={[
                  styles.weeklyBarFill,
                  { height: `${heightPercentage}%` },
                ]}
              />
              <Text style={styles.weeklyBarLabel}>W{week.weekNumber}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Stats Grid - 2 columns */}
      <View style={styles.statsGrid}>
        {/* Active Days */}
        <View style={styles.statCard}>
          <Ionicons name="calendar-outline" size={20} color={theme.colors.orangeBright} />
          <Text style={styles.statValue}>{stats.activeDays}</Text>
          <Text style={styles.statLabel}>Active Days</Text>
        </View>

        {/* Average Distance */}
        <View style={styles.statCard}>
          <Ionicons name="analytics-outline" size={20} color={theme.colors.orangeBright} />
          <Text style={styles.statValue}>
            {formatDistance(stats.avgDistance)}
          </Text>
          <Text style={styles.statLabel}>Avg Distance</Text>
        </View>

        {/* Total Time */}
        <View style={styles.statCard}>
          <Ionicons name="time-outline" size={20} color={theme.colors.orangeBright} />
          <Text style={styles.statValue}>
            {formatDuration(stats.totalDuration)}
          </Text>
          <Text style={styles.statLabel}>Total Time</Text>
        </View>

        {/* Best Workout */}
        <View style={styles.statCard}>
          <Ionicons name="trophy-outline" size={20} color={theme.colors.orangeBright} />
          <Text style={styles.statValue}>
            {stats.bestWorkout.type === 'distance'
              ? formatDistance(stats.bestWorkout.value)
              : stats.bestWorkout.type === 'duration'
              ? formatDuration(stats.bestWorkout.value)
              : `${stats.bestWorkout.value.toFixed(0)} cal`}
          </Text>
          <Text style={styles.statLabel}>
            {stats.bestWorkout.type === 'distance' ? 'Longest Run' : 'Best Run'}
          </Text>
        </View>
      </View>

      {/* Month Comparison (if available) */}
      {stats.comparison && (
        <View style={styles.comparisonContainer}>
          <Text style={styles.comparisonTitle}>vs Last Month</Text>
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Runs</Text>
              {renderComparison(stats.comparison.workoutChange)}
            </View>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Distance</Text>
              {renderComparison(stats.comparison.distanceChange)}
            </View>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Duration</Text>
              {renderComparison(stats.comparison.durationChange)}
            </View>
          </View>
        </View>
      )}

      {/* Weekly Breakdown */}
      {stats.weeklyStats.length > 0 && (
        <View style={styles.weeklyContainer}>
          <Text style={styles.weeklyTitle}>Weekly Breakdown</Text>
          {renderWeeklyBars()}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginTop: 8,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },

  statValue: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text, // Light orange
    marginTop: 4,
  },

  statLabel: {
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted, // Muted orange
    textAlign: 'center',
  },

  // Month Comparison
  comparisonContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  comparisonTitle: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.orangeBright, // Bright orange
    marginBottom: 8,
    textAlign: 'center',
  },

  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  comparisonItem: {
    alignItems: 'center',
    gap: 4,
  },

  comparisonLabel: {
    fontSize: 10,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted, // Muted orange
  },

  comparisonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
  },

  comparisonNeutral: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
  },

  // Weekly Breakdown
  weeklyContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  weeklyTitle: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.orangeBright, // Bright orange
    marginBottom: 12,
    textAlign: 'center',
  },

  weeklyBarsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 80,
    paddingHorizontal: 8,
  },

  weeklyBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 4,
  },

  weeklyBarFill: {
    width: '100%',
    backgroundColor: theme.colors.textMuted, // Deep orange
    borderRadius: 4,
    minHeight: 4,
  },

  weeklyBarLabel: {
    fontSize: 10,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted, // Muted orange
    marginTop: 4,
  },
});
