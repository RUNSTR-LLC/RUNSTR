/**
 * WorkoutStatsOverview Component
 * Displays aggregated workout statistics with period selection
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView
} from 'react-native';
import { theme } from '../../styles/theme';
import { Card } from '../ui/Card';
import type { UnifiedWorkout } from '../../services/fitness/workoutMergeService';
import { WorkoutGroupingService } from '../../utils/workoutGrouping';

export type StatsPeriod = 'week' | 'month' | 'year' | 'all';

interface WorkoutStatsOverviewProps {
  workouts: UnifiedWorkout[];
  onPeriodChange?: (period: StatsPeriod) => void;
}

interface PeriodStats {
  totalWorkouts: number;
  totalDistance: number;
  totalDuration: number;
  totalCalories: number;
  averagePerWeek: number;
  comparisonPercent?: number; // % change vs previous period
  streak: number;
}

export const WorkoutStatsOverview: React.FC<WorkoutStatsOverviewProps> = ({
  workouts,
  onPeriodChange
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<StatsPeriod>('week');
  const [stats, setStats] = useState<PeriodStats>({
    totalWorkouts: 0,
    totalDistance: 0,
    totalDuration: 0,
    totalCalories: 0,
    averagePerWeek: 0,
    streak: 0
  });

  useEffect(() => {
    calculateStats();
  }, [workouts, selectedPeriod]);

  const calculateStats = () => {
    const now = new Date();
    let filteredWorkouts: UnifiedWorkout[] = [];
    let previousPeriodWorkouts: UnifiedWorkout[] = [];

    switch (selectedPeriod) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        filteredWorkouts = workouts.filter(w => new Date(w.startTime) >= weekAgo);
        previousPeriodWorkouts = workouts.filter(
          w => new Date(w.startTime) >= twoWeeksAgo && new Date(w.startTime) < weekAgo
        );
        break;

      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
        filteredWorkouts = workouts.filter(w => new Date(w.startTime) >= monthAgo);
        previousPeriodWorkouts = workouts.filter(
          w => new Date(w.startTime) >= twoMonthsAgo && new Date(w.startTime) < monthAgo
        );
        break;

      case 'year':
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
        filteredWorkouts = workouts.filter(w => new Date(w.startTime) >= yearAgo);
        previousPeriodWorkouts = workouts.filter(
          w => new Date(w.startTime) >= twoYearsAgo && new Date(w.startTime) < yearAgo
        );
        break;

      case 'all':
        filteredWorkouts = workouts;
        break;
    }

    const currentStats = WorkoutGroupingService.calculateGroupStats(filteredWorkouts);
    const previousStats = previousPeriodWorkouts.length > 0
      ? WorkoutGroupingService.calculateGroupStats(previousPeriodWorkouts)
      : null;

    // Calculate comparison percentage
    let comparisonPercent: number | undefined;
    if (previousStats && previousStats.totalWorkouts > 0) {
      comparisonPercent = ((currentStats.totalWorkouts - previousStats.totalWorkouts) /
        previousStats.totalWorkouts) * 100;
    }

    // Calculate average per week
    const weeksInPeriod = selectedPeriod === 'week' ? 1 :
      selectedPeriod === 'month' ? 4 :
      selectedPeriod === 'year' ? 52 :
      Math.ceil((new Date().getTime() - new Date(workouts[workouts.length - 1]?.startTime || new Date()).getTime()) /
        (7 * 24 * 60 * 60 * 1000));

    // Calculate streak (consecutive days with workouts)
    const streak = calculateStreak(workouts);

    setStats({
      totalWorkouts: currentStats.totalWorkouts,
      totalDistance: currentStats.totalDistance,
      totalDuration: currentStats.totalDuration,
      totalCalories: currentStats.totalCalories,
      averagePerWeek: currentStats.totalWorkouts / Math.max(1, weeksInPeriod),
      comparisonPercent,
      streak
    });
  };

  const calculateStreak = (workouts: UnifiedWorkout[]): number => {
    if (workouts.length === 0) return 0;

    const sortedWorkouts = [...workouts].sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const hasWorkout = sortedWorkouts.some(w => {
        const workoutDate = new Date(w.startTime);
        workoutDate.setHours(0, 0, 0, 0);
        return workoutDate.getTime() === currentDate.getTime();
      });

      if (hasWorkout) {
        streak++;
      } else if (i > 0) {
        break; // Streak broken (skip today if no workout yet)
      }

      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${meters.toFixed(0)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    if (hours > 0) return `${hours.toFixed(1)}h`;
    return `${Math.floor(seconds / 60)}m`;
  };

  const handlePeriodChange = (period: StatsPeriod) => {
    setSelectedPeriod(period);
    onPeriodChange?.(period);
  };

  const getComparisonArrow = (percent?: number) => {
    if (!percent) return '';
    return percent > 0 ? '↑' : percent < 0 ? '↓' : '→';
  };

  const getComparisonColor = (percent?: number) => {
    if (!percent) return theme.colors.textMuted;
    return percent > 0 ? theme.colors.success : theme.colors.error;
  };

  return (
    <View style={styles.container}>
      {/* Period Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.periodSelector}
      >
        {(['week', 'month', 'year', 'all'] as StatsPeriod[]).map(period => (
          <TouchableOpacity
            key={period}
            onPress={() => handlePeriodChange(period)}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonActive
            ]}
          >
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.periodButtonTextActive
            ]}>
              {period === 'all' ? 'All Time' :
               period.charAt(0).toUpperCase() + period.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Main Stats Card */}
      <Card style={styles.statsCard}>
        <View style={styles.mainStats}>
          <View style={styles.mainStatItem}>
            <Text style={styles.mainStatValue}>{stats.totalWorkouts}</Text>
            <Text style={styles.mainStatLabel}>Workouts</Text>
            {stats.comparisonPercent !== undefined && (
              <Text style={[styles.comparison, { color: getComparisonColor(stats.comparisonPercent) }]}>
                {getComparisonArrow(stats.comparisonPercent)} {Math.abs(stats.comparisonPercent).toFixed(0)}%
              </Text>
            )}
          </View>

          {stats.streak > 0 && (
            <View style={styles.streakContainer}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakValue}>{stats.streak}</Text>
              <Text style={styles.streakLabel}>day streak</Text>
            </View>
          )}
        </View>

        <View style={styles.secondaryStats}>
          {stats.totalDistance > 0 && (
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>📍</Text>
              <Text style={styles.statValue}>{formatDistance(stats.totalDistance)}</Text>
            </View>
          )}

          <View style={styles.statItem}>
            <Text style={styles.statIcon}>⏱</Text>
            <Text style={styles.statValue}>{formatDuration(stats.totalDuration)}</Text>
          </View>

          {stats.totalCalories > 0 && (
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>🔥</Text>
              <Text style={styles.statValue}>{stats.totalCalories.toFixed(0)} cal</Text>
            </View>
          )}

          <View style={styles.statItem}>
            <Text style={styles.statIcon}>📊</Text>
            <Text style={styles.statValue}>{stats.averagePerWeek.toFixed(1)}/wk</Text>
          </View>
        </View>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16
  },
  periodSelector: {
    marginBottom: 12,
    paddingHorizontal: 16
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  periodButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary
  },
  periodButtonTextActive: {
    color: theme.colors.accentText,
    fontWeight: '600'
  },
  statsCard: {
    marginHorizontal: 16,
    padding: 20
  },
  mainStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  mainStatItem: {
    alignItems: 'center'
  },
  mainStatValue: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4
  },
  mainStatLabel: {
    fontSize: 14,
    color: theme.colors.textMuted
  },
  comparison: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4
  },
  streakContainer: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  streakEmoji: {
    fontSize: 24,
    marginBottom: 4
  },
  streakValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.warning
  },
  streakLabel: {
    fontSize: 10,
    color: theme.colors.textMuted
  },
  secondaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border
  },
  statItem: {
    alignItems: 'center'
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 4
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text
  }
});