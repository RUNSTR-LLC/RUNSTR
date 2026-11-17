/**
 * EnhancedWorkoutCard - One run in History: time of day, date, duration, distance, pace
 * Publish status ("On Nostr" / "Publish to Nostr") is rendered by UnifiedWorkoutsTab.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../../styles/theme';
import { WorkoutDetailModal } from './WorkoutDetailModal';
import type { Workout } from '../../../types/workout';
import { formatDistance } from '../../../utils/distanceFormatter';
import { useUnitPreference } from '../../../hooks/useUnitPreference';

interface EnhancedWorkoutCardProps {
  workout: Workout;
}

const SOURCE_LABELS: Record<string, string> = {
  healthkit: 'Apple Health',
  health_connect: 'Health Connect',
};

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m}:${s.toString().padStart(2, '0')}`;
};

const getTimeOfDay = (dateString: string): string => {
  const hour = new Date(dateString).getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
};

const formatDate = (dateString: string): string => {
  const runDate = new Date(dateString);
  const today = new Date();
  const runDay = new Date(runDate.getFullYear(), runDate.getMonth(), runDate.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round(
    (todayDay.getTime() - runDay.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return runDate.toLocaleDateString();
};

export const EnhancedWorkoutCard: React.FC<EnhancedWorkoutCardProps> = React.memo(({
  workout,
}) => {
  const { unitSystem, paceLabel } = useUnitPreference();
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Pace is stored as seconds per km
  const formatPace = (secondsPerKm: number): string => {
    const paceSeconds = unitSystem === 'imperial' ? secondsPerKm * 1.60934 : secondsPerKm;
    const mins = Math.floor(paceSeconds / 60);
    const secs = Math.floor(paceSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sourceLabel = workout.source ? SOURCE_LABELS[workout.source] : undefined;

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        activeOpacity={0.7}
        onPress={() => setShowDetailModal(true)}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.activityType}>
              {getTimeOfDay(workout.startTime)} Run
            </Text>
            <Text style={styles.date}>{formatDate(workout.startTime)}</Text>
          </View>
          {sourceLabel && (
            <View style={styles.sourceBadge}>
              <Text style={styles.sourceText}>{sourceLabel}</Text>
            </View>
          )}
        </View>

        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDuration(workout.duration)}</Text>
            <Text style={styles.statLabel}>Time</Text>
          </View>
          {!!workout.distance && (
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatDistance(workout.distance, unitSystem)}
              </Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
          )}
          {!!workout.pace && (
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatPace(workout.pace)}</Text>
              <Text style={styles.statLabel}>Pace {paceLabel}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <WorkoutDetailModal
        visible={showDetailModal}
        workout={workout}
        onClose={() => setShowDetailModal(false)}
      />
    </>
  );
});

EnhancedWorkoutCard.displayName = 'EnhancedWorkoutCard';

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  activityType: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  date: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  sourceBadge: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sourceText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
