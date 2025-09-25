/**
 * WorkoutStatsOverview Component
 * Displays aggregated workout statistics
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet
} from 'react-native';
import { theme } from '../../styles/theme';
import { Card } from '../ui/Card';
import type { UnifiedWorkout } from '../../services/fitness/workoutMergeService';
import { WorkoutGroupingService } from '../../utils/workoutGrouping';

interface WorkoutStatsOverviewProps {
  workouts: UnifiedWorkout[];
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
  workouts
}) => {
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
  }, [workouts]);

  const calculateStats = () => {
    // Use all workouts for stats
    const filteredWorkouts = workouts;
    const previousPeriodWorkouts: UnifiedWorkout[] = [];

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

    // Calculate average per week based on all data
    const weeksInPeriod = workouts.length > 0
      ? Math.max(1, Math.ceil((new Date().getTime() - new Date(workouts[workouts.length - 1].startTime).getTime()) /
        (7 * 24 * 60 * 60 * 1000)))
      : 1;

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
              <Text style={styles.streakValue}>{stats.streak}</Text>
              <Text style={styles.streakLabel}>day streak</Text>
            </View>
          )}
        </View>

        <View style={styles.secondaryStats}>
          {stats.totalDistance > 0 && (
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatDistance(stats.totalDistance)}</Text>
            </View>
          )}

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDuration(stats.totalDuration)}</Text>
          </View>

          {stats.totalCalories > 0 && (
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalCalories.toFixed(0)} cal</Text>
            </View>
          )}

          <View style={styles.statItem}>
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
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text
  }
});