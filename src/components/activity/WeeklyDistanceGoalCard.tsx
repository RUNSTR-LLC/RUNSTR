/**
 * WeeklyDistanceGoalCard - Displays weekly distance with progress
 * Shows current distance, goal, and progress indicator for running/cycling
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import type { DistanceGoalProgress } from '../../services/activity/WeeklyDistanceGoalService';
import { useUnitPreference } from '../../hooks/useUnitPreference';

export type PostingState = 'idle' | 'posting' | 'posted';

type ActivityType = 'running' | 'cycling';

interface WeeklyDistanceGoalCardProps {
  activityType: ActivityType;
  distance: number | null; // km
  progress: DistanceGoalProgress | null;
  loading?: boolean;
  onPost?: () => void;
  onSetGoal?: () => void;
  postingState?: PostingState;
}

export const WeeklyDistanceGoalCard: React.FC<WeeklyDistanceGoalCardProps> = ({
  activityType,
  distance,
  progress,
  loading = false,
  onPost,
  onSetGoal,
  postingState = 'idle',
}) => {
  const { isMetric, distanceLabel } = useUnitPreference();

  // Format distance with 2 decimal places
  // Note: distance prop is already in km, convert if imperial
  const formatDistance = (km: number): string => {
    if (isMetric) {
      return km.toFixed(2);
    } else {
      // Convert km to miles
      return (km * 0.621371).toFixed(2);
    }
  };

  const title = activityType === 'running' ? "This Week's Runs" : "This Week's Rides";
  const icon: keyof typeof Ionicons.glyphMap = activityType === 'running' ? 'walk' : 'bicycle';
  const noDataText = activityType === 'running' ? 'No runs this week' : 'No rides this week';

  // Loading state
  if (loading && distance === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <ActivityIndicator
          size="large"
          color={theme.colors.orangeBright}
          style={{ marginVertical: 20 }}
        />
        <Text style={styles.loadingText}>Loading distance...</Text>
      </View>
    );
  }

  // Default values
  const displayDistance = distance ?? 0;
  const displayProgress = progress ?? {
    currentDistance: 0,
    goalDistance: activityType === 'running' ? 20 : 50,
    percentage: 0,
    remaining: activityType === 'running' ? 20 : 50,
    achieved: false,
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {/* 3-Column Layout: Progress Badge + Text + Buttons */}
      <View style={styles.horizontalContent}>
        {/* Left: Progress Badge */}
        <View style={styles.progressBadge}>
          <Text style={styles.percentage}>{displayProgress.percentage}%</Text>
        </View>

        {/* Middle: Text Content */}
        <View style={styles.textContent}>
          <View style={styles.distanceRow}>
            {displayProgress.achieved && (
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={theme.colors.orangeBright}
                style={styles.checkmarkInline}
              />
            )}
            <Text style={styles.distanceValue}>
              {formatDistance(displayDistance)}
            </Text>
            <Text style={styles.distanceUnit}> {distanceLabel}</Text>
          </View>
          <Text style={styles.goalText}>
            Goal: {formatDistance(displayProgress.goalDistance)} {distanceLabel}
          </Text>
          {!displayProgress.achieved && displayDistance > 0 && (
            <Text style={styles.remainingText}>
              {formatDistance(displayProgress.remaining)} {distanceLabel} left
            </Text>
          )}
          {displayDistance === 0 && (
            <Text style={styles.remainingText}>{noDataText}</Text>
          )}
          {displayProgress.achieved && (
            <View style={styles.achievedBadge}>
              <Ionicons
                name="trophy"
                size={12}
                color={theme.colors.orangeBright}
              />
              <Text style={styles.achievedText}>Goal achieved!</Text>
            </View>
          )}
        </View>

        {/* Right: Button Column */}
        <View style={styles.buttonColumn}>
          {onSetGoal && (
            <TouchableOpacity
              style={styles.goalButton}
              onPress={onSetGoal}
              activeOpacity={0.7}
            >
              <Ionicons
                name="trophy-outline"
                size={14}
                color={theme.colors.orangeBright}
              />
              <Text style={styles.goalButtonText}>Set Goal</Text>
            </TouchableOpacity>
          )}
          {onPost && displayDistance > 0 && (
            <TouchableOpacity
              style={[
                styles.postButton,
                postingState === 'posted' && styles.postButtonDisabled,
              ]}
              onPress={onPost}
              disabled={postingState === 'posting' || postingState === 'posted'}
              activeOpacity={0.7}
            >
              {postingState === 'posting' ? (
                <ActivityIndicator size="small" color={theme.colors.text} />
              ) : (
                <>
                  <Ionicons
                    name={
                      postingState === 'posted'
                        ? 'checkmark-circle'
                        : 'chatbubble-outline'
                    }
                    size={14}
                    color={
                      postingState === 'posted'
                        ? theme.colors.textMuted
                        : theme.colors.text
                    }
                  />
                  <Text
                    style={[
                      styles.goalButtonText,
                      postingState === 'posted' && styles.postButtonTextDisabled,
                    ]}
                  >
                    {postingState === 'posted' ? 'Posted' : 'Post'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 0,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 6,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  horizontalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBadge: {
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  percentage: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  textContent: {
    flex: 1,
    justifyContent: 'center',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 0,
  },
  checkmarkInline: {
    marginRight: 4,
  },
  distanceValue: {
    fontSize: 22,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  distanceUnit: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  goalText: {
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
  },
  remainingText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  achievedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    marginTop: 4,
  },
  achievedText: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.orangeBright,
  },
  buttonColumn: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 6,
    width: '40%',
  },
  goalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  goalButtonText: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  postButtonDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.6,
  },
  postButtonTextDisabled: {
    color: theme.colors.textMuted,
  },
});
