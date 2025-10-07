/**
 * MonthlyStatsPanel Component
 * Expandable stats panel showing detailed monthly workout insights
 * Matches RUNSTR orange/gold theme with dark background
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import type { MonthlyStats } from '../../services/fitness/MonthlyStatsCalculator';

interface MonthlyStatsPanelProps {
  stats: MonthlyStats;
}

export const MonthlyStatsPanel: React.FC<MonthlyStatsPanelProps> = ({ stats }) => {
  /**
   * Format distance (meters to km)
   */
  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${meters.toFixed(0)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

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
   * Format activity type for display
   */
  const formatActivityType = (type: string): string => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  /**
   * Render comparison indicator (↑/↓ with percentage)
   */
  const renderComparison = (change: number) => {
    if (change === 0) {
      return (
        <Text style={styles.comparisonNeutral}>
          — 0%
        </Text>
      );
    }

    const isPositive = change > 0;
    const icon = isPositive ? '↑' : '↓';
    const color = isPositive ? '#FF9D42' : '#CC7A33';

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
    const maxWorkouts = Math.max(...stats.weeklyStats.map((w) => w.workouts), 1);

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
          <Ionicons name="calendar-outline" size={20} color="#FF9D42" />
          <Text style={styles.statValue}>{stats.activeDays}</Text>
          <Text style={styles.statLabel}>Active Days</Text>
        </View>

        {/* Average Distance */}
        <View style={styles.statCard}>
          <Ionicons name="analytics-outline" size={20} color="#FF9D42" />
          <Text style={styles.statValue}>{formatDistance(stats.avgDistance)}</Text>
          <Text style={styles.statLabel}>Avg Distance</Text>
        </View>

        {/* Most Common Activity */}
        <View style={styles.statCard}>
          <Ionicons name="fitness-outline" size={20} color="#FF9D42" />
          <Text style={styles.statValue}>
            {formatActivityType(stats.mostCommonActivity)}
          </Text>
          <Text style={styles.statLabel}>
            {stats.activityBreakdown[0]?.percentage.toFixed(0)}% of workouts
          </Text>
        </View>

        {/* Best Workout */}
        <View style={styles.statCard}>
          <Ionicons name="trophy-outline" size={20} color="#FF9D42" />
          <Text style={styles.statValue}>
            {stats.bestWorkout.type === 'distance'
              ? formatDistance(stats.bestWorkout.value)
              : stats.bestWorkout.type === 'duration'
              ? formatDuration(stats.bestWorkout.value)
              : `${stats.bestWorkout.value.toFixed(0)} cal`}
          </Text>
          <Text style={styles.statLabel}>
            Best {formatActivityType(stats.bestWorkout.type)}
          </Text>
        </View>
      </View>

      {/* Month Comparison (if available) */}
      {stats.comparison && (
        <View style={styles.comparisonContainer}>
          <Text style={styles.comparisonTitle}>vs Last Month</Text>
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Workouts</Text>
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
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
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
    backgroundColor: '#000000',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },

  statValue: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: '#FFB366', // Light orange
    marginTop: 4,
  },

  statLabel: {
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
    color: '#CC7A33', // Muted orange
    textAlign: 'center',
  },

  // Month Comparison
  comparisonContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },

  comparisonTitle: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    color: '#FF9D42', // Bright orange
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
    color: '#CC7A33', // Muted orange
  },

  comparisonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
  },

  comparisonNeutral: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: '#999999',
  },

  // Weekly Breakdown
  weeklyContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },

  weeklyTitle: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    color: '#FF9D42', // Bright orange
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
    backgroundColor: '#FF7B1C', // Deep orange
    borderRadius: 4,
    minHeight: 4,
  },

  weeklyBarLabel: {
    fontSize: 10,
    fontWeight: theme.typography.weights.medium,
    color: '#CC7A33', // Muted orange
    marginTop: 4,
  },
});
