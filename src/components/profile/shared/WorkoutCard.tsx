/**
 * WorkoutCard - Reusable workout display component
 * Used across all workout source tabs (Nostr, Apple Health, Garmin, Google)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../../styles/theme';
import type { WorkoutType } from '../../../types/workout';

interface Workout {
  id: string;
  type: WorkoutType | string;
  startTime: string;
  duration: number;
  distance?: number;
  calories?: number;
  heartRate?: { avg: number };
  source: string;
  sourceApp?: string;
}

interface WorkoutCardProps {
  workout: Workout;
  showPostButton?: boolean;
  onPostToNostr?: (workout: Workout) => void;
  children?: React.ReactNode;
}

export const WorkoutCard: React.FC<WorkoutCardProps> = ({ 
  workout, 
  showPostButton, 
  onPostToNostr, 
  children 
}) => {
  const formatDistance = (meters?: number): string =>
    !meters
      ? '--'
      : meters < 1000
      ? `${meters}m`
      : `${(meters / 1000).toFixed(2)}km`;

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    const diffDays = Math.floor(
      (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24)
    );
    return diffDays === 0
      ? 'Today'
      : diffDays === 1
      ? 'Yesterday'
      : diffDays < 7
      ? `${diffDays} days ago`
      : new Date(dateString).toLocaleDateString();
  };

  const getActivityIcon = (type: string): string => {
    const icons: Record<string, string> = {
      running: '🏃',
      cycling: '🚴',
      walking: '🚶',
      hiking: '🥾',
      gym: '💪',
      strength_training: '🏋️',
      yoga: '🧘',
      other: '⚡',
    };
    return icons[type] || '⚡';
  };

  return (
    <View style={styles.workoutCard}>
      <View style={styles.workoutHeader}>
        <View style={styles.workoutInfo}>
          <Text style={styles.activityIcon}>
            {getActivityIcon(workout.type)}
          </Text>
          <View style={styles.workoutInfoText}>
            <Text style={styles.activityType}>
              {workout.type.charAt(0).toUpperCase() + workout.type.slice(1)}
            </Text>
            <Text style={styles.workoutDate}>
              {formatDate(workout.startTime)}
            </Text>
          </View>
        </View>
        <View style={styles.workoutMeta}>
          {workout.sourceApp && (
            <Text style={styles.sourceApp}>{workout.sourceApp}</Text>
          )}
          <Text style={styles.sourceType}>{workout.source}</Text>
        </View>
      </View>

      <View style={styles.workoutStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {formatDuration(workout.duration)}
          </Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        {workout.distance && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatDistance(workout.distance)}
            </Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
        )}
        {workout.calories && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{workout.calories.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
        )}
        {workout.heartRate?.avg && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {workout.heartRate.avg.toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>HR</Text>
          </View>
        )}
      </View>

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  workoutCard: {
    padding: 16,
    marginBottom: 12,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  workoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  workoutInfoText: {
    flex: 1,
  },
  workoutMeta: {
    alignItems: 'flex-end',
  },
  activityIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  activityType: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  workoutDate: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  sourceApp: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  sourceType: {
    color: theme.colors.textDark,
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  workoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
});