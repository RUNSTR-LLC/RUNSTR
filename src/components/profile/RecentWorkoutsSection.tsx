/**
 * RecentWorkoutsSection Component - Last 3-5 workout rows
 * Shows recent workout activity with relative dates.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { theme } from '../../styles/theme';
import type { RecentWorkout } from '../../services/backend/ProfileDataService';
import { formatDuration } from '../../utils/formatters';

interface RecentWorkoutsSectionProps {
  workouts: RecentWorkout[];
  isOwner: boolean;
  onViewAllPress?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Capitalize first letter of activity type */
function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Format relative date: "Today", "Yesterday", "3d ago", or "Mar 1" */
function relativeDate(isoDate: string): string {
  const now = new Date();
  const date = new Date(isoDate);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return `${diffDays}d ago`;

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}


/** Format distance in km */
function formatDistance(km: number): string {
  return `${km.toFixed(1)} km`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const RecentWorkoutsSection: React.FC<RecentWorkoutsSectionProps> = ({
  workouts,
  isOwner,
  onViewAllPress,
}) => {
  const hasWorkouts = workouts && workouts.length > 0;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>RECENT WORKOUTS</Text>
      <View style={styles.card}>
        {hasWorkouts ? (
          workouts.map((workout, index) => {
            const isLast = index === workouts.length - 1;
            const showBorder = !isLast || (isOwner && onViewAllPress);
            const metric = workout.distanceKm
              ? formatDistance(workout.distanceKm)
              : workout.reps
                ? `${workout.reps} reps`
                : null;

            return (
              <View
                key={workout.id}
                style={[styles.row, showBorder && styles.rowBorder]}
              >
                <View style={styles.rowLeft}>
                  <Text style={styles.activityType}>
                    {capitalize(workout.activityType)}
                  </Text>
                  <Text style={styles.date}>
                    {relativeDate(workout.createdAt)}
                  </Text>
                </View>
                <View style={styles.rowRight}>
                  {metric && (
                    <Text style={styles.metric}>{metric}</Text>
                  )}
                  {workout.durationSeconds != null &&
                    workout.durationSeconds > 0 && (
                      <Text style={styles.duration}>
                        {formatDuration(workout.durationSeconds)}
                      </Text>
                    )}
                </View>
              </View>
            );
          })
        ) : (
          <View style={[styles.row, isOwner && onViewAllPress && styles.rowBorder]}>
            <Text style={styles.emptyText}>No workouts yet</Text>
          </View>
        )}

        {/* View History — always visible for owner */}
        {isOwner && onViewAllPress && (
          <TouchableOpacity
            style={styles.viewAllRow}
            onPress={onViewAllPress}
            activeOpacity={0.6}
          >
            <Text style={styles.viewAllText}>View History</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    paddingHorizontal: 4,
  },

  card: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  rowLeft: {
    flex: 1,
  },

  activityType: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 2,
  },

  date: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },

  rowRight: {
    alignItems: 'flex-end',
  },

  metric: {
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },

  duration: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },

  emptyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },

  // View History button
  viewAllRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingVertical: 12,
    alignItems: 'center',
  },

  viewAllText: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accent,
  },
});
