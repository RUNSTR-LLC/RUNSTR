/**
 * DailyStepGoalCard - Displays daily step count with progress ring
 * Shows current steps, goal, and visual progress indicator
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import type { StepGoalProgress } from '../../services/activity/DailyStepGoalService';

export type PostingState = 'idle' | 'posting' | 'posted';

interface DailyStepGoalCardProps {
  steps: number | null;
  progress: StepGoalProgress | null;
  loading?: boolean;
  error?: string | null;
  onPostSteps?: () => void;
  onSetGoal?: () => void;
  postingState?: PostingState;
  onCompeteSteps?: () => void;
  competeState?: PostingState;
  onRequestPermission?: () => void;
  onOpenSettings?: () => void;
  showBackgroundBanner?: boolean;
  onEnableBackground?: () => void;
  isBackgroundActive?: boolean;
  estimatedDistance?: number; // meters - shows estimated distance from steps
  showCompeteButton?: boolean; // default true - set to false to hide Compete button
  hasGPSWorkouts?: boolean; // true when GPS workout data is included in distance (removes "~" prefix)
  onTroubleshootSteps?: () => void; // Navigate to step diagnostics in Settings
}

export const DailyStepGoalCard: React.FC<DailyStepGoalCardProps> = ({
  steps,
  progress,
  loading = false,
  error = null,
  onPostSteps,
  onSetGoal,
  postingState = 'idle',
  onCompeteSteps,
  competeState = 'idle',
  onRequestPermission,
  onOpenSettings,
  showBackgroundBanner = false,
  onEnableBackground,
  isBackgroundActive = false,
  estimatedDistance,
  showCompeteButton = true,
  hasGPSWorkouts = false,
  onTroubleshootSteps,
}) => {
  // Format step count with commas
  const formatSteps = (count: number): string => {
    return count.toLocaleString();
  };

  // Format distance in km
  const formatDistance = (meters: number): string => {
    const km = meters / 1000;
    return `${km.toFixed(2)} km`;
  };

  // Title: "Today's Steps" on iOS (auto-counted), "Tracked Steps" on Android (workout-based)
  const stepTitle = Platform.OS === 'android' ? 'Tracked Steps' : "Today's Steps";

  // Loading state - show minimal loading indicator
  if (loading && steps === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{stepTitle}</Text>
        <ActivityIndicator
          size="large"
          color={theme.colors.textMuted}
          style={{ marginVertical: 20 }}
        />
        <Text style={styles.loadingText}>Loading step count...</Text>
      </View>
    );
  }

  // Default to 0 steps if no data (don't block UI)
  const displaySteps = steps ?? 0;
  const displayProgress = progress ?? {
    steps: 0,
    goalSteps: 10000,
    percentage: 0,
    remaining: 10000,
    achieved: false,
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{stepTitle}</Text>

      {/* 3-Column Layout: Progress Badge + Text + Buttons */}
      <View style={styles.horizontalContent}>
        {/* Left: Progress Badge */}
        <View style={styles.progressBadge}>
          <Text style={styles.percentage}>{displayProgress.percentage}%</Text>
        </View>

        {/* Middle: Text Content */}
        <View style={styles.textContent}>
          <View style={styles.stepCountRow}>
            {displayProgress.achieved && (
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={theme.colors.accent}
                style={styles.checkmarkInline}
              />
            )}
            <Text style={styles.stepCount}>{formatSteps(displaySteps)}</Text>
            <Text style={styles.stepLabel}> steps</Text>
          </View>
          {estimatedDistance !== undefined && estimatedDistance > 0 && (
            <Text style={styles.distanceText}>
              {hasGPSWorkouts ? '' : '~'}{formatDistance(estimatedDistance)}
            </Text>
          )}
          <Text style={styles.goalText}>
            Goal: {formatSteps(displayProgress.goalSteps)}
          </Text>
          {!displayProgress.achieved && (
            <Text style={styles.remainingText}>
              {formatSteps(displayProgress.remaining)} left
            </Text>
          )}
          {displayProgress.achieved && (
            <View style={styles.achievedBadge}>
              <Ionicons name="trophy" size={12} color={theme.colors.accent} />
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
                color={theme.colors.accent}
              />
              <Text style={styles.goalButtonText}>Set Goal</Text>
            </TouchableOpacity>
          )}
          {showCompeteButton && onCompeteSteps && (
            <TouchableOpacity
              style={[
                styles.competeButton,
                competeState === 'posted' && styles.postButtonDisabled,
              ]}
              onPress={onCompeteSteps}
              disabled={competeState === 'posting' || competeState === 'posted'}
              activeOpacity={0.7}
            >
              {competeState === 'posting' ? (
                <ActivityIndicator size="small" color={theme.colors.background} />
              ) : (
                <>
                  <Ionicons
                    name={
                      competeState === 'posted'
                        ? 'checkmark-circle'
                        : 'flash'
                    }
                    size={14}
                    color={
                      competeState === 'posted'
                        ? theme.colors.textMuted
                        : theme.colors.background
                    }
                  />
                  <Text
                    style={[
                      styles.competeButtonText,
                      competeState === 'posted' &&
                        styles.postButtonTextDisabled,
                    ]}
                  >
                    {competeState === 'posted' ? 'Entered!' : 'Compete'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {onPostSteps && (
            <TouchableOpacity
              style={[
                styles.compactPostButton,
                postingState === 'posted' && styles.postButtonDisabled,
              ]}
              onPress={onPostSteps}
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
                      postingState === 'posted' &&
                        styles.postButtonTextDisabled,
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

      {/* Background Tracking Banner */}
      {showBackgroundBanner && !isBackgroundActive && onEnableBackground && (
        <View style={styles.backgroundBanner}>
          <View style={styles.bannerContent}>
            <Ionicons name="walk" size={20} color={theme.colors.textMuted} />
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>Enable Background Tracking</Text>
              <Text style={styles.bannerSubtext}>
                Automatically count steps throughout the day
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.enableButton}
            onPress={onEnableBackground}
            activeOpacity={0.7}
          >
            <Text style={styles.enableButtonText}>Enable</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Error hint (non-blocking) */}
      {error && !isBackgroundActive && (
        <Text style={styles.errorHint}>{error}</Text>
      )}

      {/* Step troubleshooting hint - shows when 0 steps on Android */}
      {displaySteps === 0 && Platform.OS === 'android' && onTroubleshootSteps && !loading && (
        <TouchableOpacity onPress={onTroubleshootSteps} activeOpacity={0.7}>
          <Text style={styles.troubleshootHint}>
            Steps not showing? Tap to troubleshoot
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 0,
    marginVertical: 0,
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
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  errorHint: {
    marginTop: 8,
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  backgroundBanner: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 2,
  },
  bannerSubtext: {
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
  enableButton: {
    backgroundColor: theme.colors.text,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  enableButtonText: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },
  noDataText: {
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
  textContent: {
    flex: 1,
    justifyContent: 'center',
  },
  stepCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  checkmarkInline: {
    marginRight: 4,
  },
  stepCount: {
    fontSize: 22,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  stepLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  percentage: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.accent,
    marginTop: 2,
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
  competeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.text,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
    gap: 4,
  },
  competeButtonText: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },
  compactPostButton: {
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
    color: theme.colors.accent,
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.text,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginTop: 4,
    gap: 6,
  },
  postButtonDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.6,
  },
  postButtonText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  postButtonTextDisabled: {
    color: theme.colors.textMuted,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.text,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  settingsButtonText: {
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
  },
  troubleshootHint: {
    marginTop: 8,
    fontSize: 12,
    color: theme.colors.accent,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
