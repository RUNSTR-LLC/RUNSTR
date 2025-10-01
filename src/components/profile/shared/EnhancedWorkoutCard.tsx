/**
 * EnhancedWorkoutCard - Workout display with Post/Compete actions
 * Shows source badges and status indicators
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../../../styles/theme';
import { WorkoutStatusTracker } from '../../../services/fitness/WorkoutStatusTracker';
import type { Workout } from '../../../types/workout';

interface EnhancedWorkoutCardProps {
  workout: Workout;
  onPost?: (workout: Workout) => Promise<void>;
  onCompete?: (workout: Workout) => Promise<void>;
  onSocialShare?: (workout: Workout) => void;
  hideActions?: boolean;
}

export const EnhancedWorkoutCard: React.FC<EnhancedWorkoutCardProps> = ({
  workout,
  onPost,
  onCompete,
  onSocialShare,
  hideActions = false,
}) => {
  const [status, setStatus] = useState({
    posted: false,
    competed: false,
  });
  const [loading, setLoading] = useState({
    post: false,
    compete: false,
  });

  const statusTracker = WorkoutStatusTracker.getInstance();

  useEffect(() => {
    loadStatus();
  }, [workout.id]);

  const loadStatus = async () => {
    try {
      const workoutStatus = await statusTracker.getStatus(workout.id);
      setStatus({
        posted: workoutStatus.postedToNostr,
        competed: workoutStatus.competedInNostr,
      });
    } catch (error) {
      console.error('Failed to load workout status:', error);
    }
  };

  const handlePost = async () => {
    if (!onSocialShare || status.posted || loading.post) return;

    try {
      setLoading(prev => ({ ...prev, post: true }));
      onSocialShare(workout);
    } catch (error) {
      console.error('Failed to open social share:', error);
    } finally {
      setLoading(prev => ({ ...prev, post: false }));
    }
  };

  const handleCompete = async () => {
    if (!onCompete || status.competed || loading.compete) return;

    try {
      setLoading(prev => ({ ...prev, compete: true }));
      await onCompete(workout);
      await statusTracker.markAsCompeted(workout.id);
      setStatus(prev => ({ ...prev, competed: true }));
    } catch (error) {
      console.error('Failed to compete workout:', error);
    } finally {
      setLoading(prev => ({ ...prev, compete: false }));
    }
  };

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

  const getActivityIcon = (type: string | undefined): string => {
    if (!type) return '🏃';
    const icons: Record<string, string> = {
      running: '🏃',
      cycling: '🚴',
      walking: '🚶',
      hiking: '🥾',
      gym: '💪',
      strength_training: '🏋️',
      yoga: '🧘',
      swimming: '🏊',
      rowing: '🚣',
    };
    return icons[type] || '🏃';
  };

  const getSourceIcon = (source: string): string => {
    const icons: Record<string, string> = {
      healthkit: '🍎',
      apple: '🍎',
      garmin: '⌚',
      google: '🤖',
      googlefit: '🤖',
      nostr: '⚡',
      manual: '✏️',
    };
    return icons[source.toLowerCase()] || '📱';
  };

  const isFromNostr = workout.source?.toLowerCase() === 'nostr';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.activityIcon}>{getActivityIcon(workout.type as string)}</Text>
          <View style={styles.headerInfo}>
            <Text style={styles.activityType}>
              {workout.type ? (workout.type as string).charAt(0).toUpperCase() + (workout.type as string).slice(1) : 'Workout'}
            </Text>
            <Text style={styles.date}>{formatDate(workout.startTime)}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceIcon}>{getSourceIcon(workout.source)}</Text>
            <Text style={styles.sourceText}>{workout.source}</Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatDuration(workout.duration)}</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        {workout.distance !== undefined && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDistance(workout.distance)}</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
        )}
        {workout.calories !== undefined && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{workout.calories.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
        )}
        {workout.heartRate?.avg && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{workout.heartRate.avg.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Avg HR</Text>
          </View>
        )}
      </View>

      {/* Status Indicators */}
      {(status.posted || status.competed) && (
        <View style={styles.statusContainer}>
          {status.posted && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>✓ Posted</Text>
            </View>
          )}
          {status.competed && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>🏆 In Competition</Text>
            </View>
          )}
        </View>
      )}

      {/* Action Buttons */}
      {!hideActions && !isFromNostr && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.postButton, status.posted && styles.disabledButton]}
            onPress={handlePost}
            disabled={status.posted || loading.post}
          >
            {loading.post ? (
              <ActivityIndicator size="small" color={theme.colors.accentText} />
            ) : (
              <Text style={styles.actionButtonText}>
                {status.posted ? '✓ Posted' : '📱 Post'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.competeButton, status.competed && styles.disabledButton]}
            onPress={handleCompete}
            disabled={status.competed || loading.compete}
          >
            {loading.compete ? (
              <ActivityIndicator size="small" color={theme.colors.accentText} />
            ) : (
              <Text style={styles.actionButtonText}>
                {status.competed ? '🏆 Competed' : '🏃 Compete'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

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
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerInfo: {
    marginLeft: 12,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  activityIcon: {
    fontSize: 28,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sourceIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  sourceText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
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
  statusContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statusBadge: {
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  postButton: {
    backgroundColor: theme.colors.accent,
  },
  competeButton: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  disabledButton: {
    opacity: 0.6,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionButtonText: {
    color: theme.colors.accentText,
    fontSize: 14,
    fontWeight: '600',
  },
});