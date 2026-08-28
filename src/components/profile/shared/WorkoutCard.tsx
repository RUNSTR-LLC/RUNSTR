/**
 * WorkoutCard - Reusable workout display component
 * Used across all workout source tabs (Nostr, Apple Health, Garmin, Google)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../../styles/theme';
import type { WorkoutType } from '../../../types/workout';
import { formatDistance } from '../../../utils/distanceFormatter';
import { useUnitPreference } from '../../../hooks/useUnitPreference';
import { formatDuration } from '../../../types/satlantis';

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
  // Activity-specific fields
  sets?: number;
  reps?: number;
  weight?: number;
  weightsPerSet?: number[];
  meditationType?: string;
  mealType?: string;
  mealSize?: string;
  exerciseType?: string;
  notes?: string;
}

interface WorkoutCardProps {
  workout: Workout;
  showPostButton?: boolean;
  onPostToNostr?: (workout: Workout) => void;
  children?: React.ReactNode;
}

export const WorkoutCard: React.FC<WorkoutCardProps> = React.memo(({
  workout,
  showPostButton,
  onPostToNostr,
  children,
}) => {
  const { unitSystem } = useUnitPreference();

  const formatDate = (dateString: string): string => {
    const workoutDate = new Date(dateString);
    const today = new Date();

    // Normalize both dates to midnight (start of day) in local timezone
    const workoutDay = new Date(
      workoutDate.getFullYear(),
      workoutDate.getMonth(),
      workoutDate.getDate()
    );
    const todayDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    // Calculate difference in calendar days
    const diffDays = Math.round(
      (todayDay.getTime() - workoutDay.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Format time as 12-hour with AM/PM
    const hours = workoutDate.getHours();
    const minutes = workoutDate.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    const timeStr = `${displayHours}:${displayMinutes} ${ampm}`;

    const dayStr =
      diffDays === 0
        ? 'Today'
        : diffDays === 1
        ? 'Yesterday'
        : diffDays < 7
        ? `${diffDays} days ago`
        : workoutDate.toLocaleDateString();

    return `${dayStr} at ${timeStr}`;
  };

  return (
    <View style={styles.workoutCard}>
      <View style={styles.workoutHeader}>
        <View style={styles.workoutInfo}>
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
        {/* Strength Training: Show reps, sets, weight (no calories) */}
        {(workout.type === 'strength_training' || workout.type === 'gym') && (
          <>
            {workout.reps && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{workout.reps}</Text>
                <Text style={styles.statLabel}>Reps</Text>
              </View>
            )}
            {workout.sets && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{workout.sets}</Text>
                <Text style={styles.statLabel}>Sets</Text>
              </View>
            )}
            {workout.weight && workout.weight > 0 && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{workout.weight} lbs</Text>
                <Text style={styles.statLabel}>Weight</Text>
              </View>
            )}
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatDuration(workout.duration)}
              </Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
          </>
        )}

        {/* Meditation: Show meditation type, duration (no calories) */}
        {workout.type === 'meditation' && (
          <>
            {workout.meditationType && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {workout.meditationType.charAt(0).toUpperCase() +
                    workout.meditationType.slice(1).replace('_', ' ')}
                </Text>
                <Text style={styles.statLabel}>Type</Text>
              </View>
            )}
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatDuration(workout.duration)}
              </Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
          </>
        )}

        {/* Diet: Show meal type, meal size (no duration, no calories by default) */}
        {workout.type === 'diet' && (
          <>
            {workout.mealType && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {workout.mealType.charAt(0).toUpperCase() +
                    workout.mealType.slice(1)}
                </Text>
                <Text style={styles.statLabel}>Meal</Text>
              </View>
            )}
            {workout.mealSize && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {workout.mealSize.charAt(0).toUpperCase() +
                    workout.mealSize.slice(1)}
                </Text>
                <Text style={styles.statLabel}>Size</Text>
              </View>
            )}
            {workout.calories && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {workout.calories.toFixed(0)}
                </Text>
                <Text style={styles.statLabel}>Calories</Text>
              </View>
            )}
          </>
        )}

        {/* Cardio (Running, Cycling, Walking): Show duration, distance, calories (default behavior) */}
        {!['strength_training', 'gym', 'meditation', 'diet'].includes(
          workout.type
        ) && (
          <>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatDuration(workout.duration)}
              </Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            {workout.distance && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {formatDistance(workout.distance, unitSystem)}
                </Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
            )}
            {workout.calories && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {workout.calories.toFixed(0)}
                </Text>
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
          </>
        )}
      </View>

      {children}
    </View>
  );
});

WorkoutCard.displayName = 'WorkoutCard';

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
