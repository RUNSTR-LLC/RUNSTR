/**
 * MonthlyWorkoutGroup - Collapsible monthly workout folder
 * Organizes workouts by month with expandable/collapsible UI
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { theme } from '../../../styles/theme';
import type { Workout } from '../../../types/workout';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface MonthlyGroup {
  key: string;
  title: string; // e.g., "January 2025"
  workouts: Workout[];
  stats: {
    totalWorkouts: number;
    totalDuration: number;
    totalDistance?: number;
    totalCalories?: number;
  };
}

interface MonthlyWorkoutGroupProps {
  group: MonthlyGroup;
  renderWorkout: (workout: Workout) => React.ReactElement;
  defaultExpanded?: boolean;
}

export const MonthlyWorkoutGroup: React.FC<MonthlyWorkoutGroupProps> = ({
  group,
  renderWorkout,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatDistance = (meters?: number): string => {
    if (!meters) return '';
    const km = (meters / 1000).toFixed(1);
    return `${km}km`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.chevron}>{isExpanded ? '▼' : '▶'}</Text>
          <View style={styles.titleSection}>
            <Text style={styles.title}>{group.title}</Text>
            <Text style={styles.subtitle}>
              {group.stats.totalWorkouts} workout{group.stats.totalWorkouts !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.statsRow}>
            <Text style={styles.statText}>
              {formatDuration(group.stats.totalDuration)}
            </Text>
            {group.stats.totalDistance && (
              <Text style={styles.statText}>
                • {formatDistance(group.stats.totalDistance)}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Workouts */}
      {isExpanded && (
        <View style={styles.workouts}>
          {group.workouts.map((workout) => (
            <View key={workout.id} style={styles.workoutWrapper}>
              {renderWorkout(workout)}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

/**
 * Helper function to group workouts by month
 */
export const groupWorkoutsByMonth = (workouts: Workout[]): MonthlyGroup[] => {
  const groups = new Map<string, Workout[]>();

  // Group workouts by month
  workouts.forEach((workout) => {
    const date = new Date(workout.startTime);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    if (!groups.has(monthKey)) {
      groups.set(monthKey, []);
    }
    groups.get(monthKey)?.push(workout);
  });

  // Convert to array and calculate stats
  const monthlyGroups: MonthlyGroup[] = [];
  groups.forEach((workouts, monthKey) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    const title = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Calculate stats
    const stats = workouts.reduce(
      (acc, workout) => ({
        totalWorkouts: acc.totalWorkouts + 1,
        totalDuration: acc.totalDuration + (workout.duration || 0),
        totalDistance: (acc.totalDistance || 0) + (workout.distance || 0),
        totalCalories: (acc.totalCalories || 0) + (workout.calories || 0),
      }),
      {
        totalWorkouts: 0,
        totalDuration: 0,
        totalDistance: 0,
        totalCalories: 0,
      }
    );

    monthlyGroups.push({
      key: monthKey,
      title,
      workouts: workouts.sort((a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      ),
      stats,
    });
  });

  // Sort groups by month (newest first)
  return monthlyGroups.sort((a, b) => b.key.localeCompare(a.key));
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chevron: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginRight: 12,
    width: 20,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginLeft: 4,
  },
  workouts: {
    marginTop: 8,
  },
  workoutWrapper: {
    marginBottom: 8,
  },
});