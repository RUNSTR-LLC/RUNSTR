/**
 * LastActivityCard - Shows last activity for running/walking/cycling
 * Displays distance, duration, and date of most recent workout
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import LocalWorkoutStorageService, { type LocalWorkout } from '../../services/fitness/LocalWorkoutStorageService';
import { activityMetricsService } from '../../services/activity/ActivityMetricsService';

type ActivityType = 'running' | 'walking' | 'cycling';

interface LastActivityCardProps {
  activityType: ActivityType;
}

interface LastActivity {
  distance: number; // meters
  duration: number; // seconds
  date: Date;
}

interface WeeklyStats {
  totalDistance: number; // meters
  count: number;
}

const activityLabels: Record<ActivityType, { singular: string; plural: string }> = {
  running: { singular: 'run', plural: 'runs' },
  walking: { singular: 'walk', plural: 'walks' },
  cycling: { singular: 'ride', plural: 'rides' },
};

export const LastActivityCard: React.FC<LastActivityCardProps> = ({
  activityType,
}) => {
  const [lastActivity, setLastActivity] = useState<LastActivity | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    totalDistance: 0,
    count: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivityData();
  }, [activityType]);

  const loadActivityData = async () => {
    try {
      setLoading(true);
      const workouts = await LocalWorkoutStorageService.getAllWorkouts();

      // Filter by activity type for last activity
      const typeWorkouts = workouts.filter(
        (w: LocalWorkout) => w.type === activityType
      );

      // Get last activity
      if (typeWorkouts.length > 0) {
        const sorted = [...typeWorkouts].sort(
          (a, b) =>
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
        const last = sorted[0];
        setLastActivity({
          distance: last.distance || 0,
          duration: last.duration || 0,
          date: new Date(last.startTime),
        });
      } else {
        setLastActivity(null);
      }

      // Calculate weekly stats (for cycling only)
      if (activityType === 'cycling') {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Sunday
        weekStart.setHours(0, 0, 0, 0);

        const thisWeekWorkouts = typeWorkouts.filter(
          (w: LocalWorkout) => new Date(w.startTime) >= weekStart
        );

        setWeeklyStats({
          totalDistance: thisWeekWorkouts.reduce(
            (sum: number, w: LocalWorkout) => sum + (w.distance || 0),
            0
          ),
          count: thisWeekWorkouts.length,
        });
      }
    } catch (error) {
      console.error('[LastActivityCard] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatRelativeDate = (date: Date): string => {
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const labels = activityLabels[activityType];

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, styles.cardPlaceholder]}>
          <Text style={styles.placeholderText}>Loading...</Text>
        </View>
      </View>
    );
  }

  // Running: Show Last Run (full width)
  if (activityType === 'running') {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={16} color={theme.colors.textMuted} />
            <Text style={styles.cardTitle}>Last Run</Text>
          </View>
          {lastActivity ? (
            <>
              <Text style={styles.primaryStat}>
                {activityMetricsService.formatDistance(lastActivity.distance)}
              </Text>
              <Text style={styles.secondaryStat}>
                {activityMetricsService.formatDuration(lastActivity.duration)}
              </Text>
              <Text style={styles.dateStat}>
                {formatRelativeDate(lastActivity.date)}
              </Text>
            </>
          ) : (
            <Text style={styles.noDataText}>No runs yet</Text>
          )}
        </View>
      </View>
    );
  }

  // Walking: Show Last Walk (full width)
  if (activityType === 'walking') {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={16} color={theme.colors.textMuted} />
            <Text style={styles.cardTitle}>Last Walk</Text>
          </View>
          {lastActivity ? (
            <>
              <Text style={styles.primaryStat}>
                {activityMetricsService.formatDistance(lastActivity.distance)}
              </Text>
              <Text style={styles.secondaryStat}>
                {activityMetricsService.formatDuration(lastActivity.duration)}
              </Text>
              <Text style={styles.dateStat}>
                {formatRelativeDate(lastActivity.date)}
              </Text>
            </>
          ) : (
            <Text style={styles.noDataText}>No walks yet</Text>
          )}
        </View>
      </View>
    );
  }

  // Cycling: Show Last Ride (full width)
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="time-outline" size={16} color={theme.colors.textMuted} />
          <Text style={styles.cardTitle}>Last Ride</Text>
        </View>
        {lastActivity ? (
          <>
            <Text style={styles.primaryStat}>
              {activityMetricsService.formatDistance(lastActivity.distance)}
            </Text>
            <Text style={styles.secondaryStat}>
              {activityMetricsService.formatDuration(lastActivity.duration)}
            </Text>
            <Text style={styles.dateStat}>
              {formatRelativeDate(lastActivity.date)}
            </Text>
          </>
        ) : (
          <Text style={styles.noDataText}>No rides yet</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    marginTop: 16,
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 80,
  },
  placeholderText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  primaryStat: {
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  secondaryStat: {
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  dateStat: {
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  noDataText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
});
