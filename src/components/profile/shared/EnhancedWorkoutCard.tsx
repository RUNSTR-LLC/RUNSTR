/**
 * EnhancedWorkoutCard - Workout display with Post/Public actions
 * Shows source badges and status indicators
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../styles/theme';
import { WorkoutStatusTracker } from '../../../services/fitness/WorkoutStatusTracker';
import { WorkoutDetailModal } from './WorkoutDetailModal';
import type { Workout } from '../../../types/workout';
import { formatDistance } from '../../../utils/distanceFormatter';
import { formatDuration } from '../../../types/satlantis';
import { useUnitPreference } from '../../../hooks/useUnitPreference';
import { VerifiedCheckmark } from '../../activity/VerifiedCheckmark';

interface EnhancedWorkoutCardProps {
  workout: Workout;
  onSocialShare?: (workout: Workout) => void;
  onCompete?: (workoutId: string) => void;
  hideActions?: boolean;
  isWoTEligible?: boolean;
  supabaseSubmitted?: boolean;
}

export const EnhancedWorkoutCard: React.FC<EnhancedWorkoutCardProps> = React.memo(({
  workout,
  onSocialShare,
  onCompete,
  hideActions = false,
  isWoTEligible = false,
  supabaseSubmitted,
}) => {
  const { unitSystem, paceLabel } = useUnitPreference();
  const [status, setStatus] = useState({
    posted: false,
  });
  const [loading, setLoading] = useState({
    post: false,
  });
  const [showDetailModal, setShowDetailModal] = useState(false);

  const statusTracker = WorkoutStatusTracker.getInstance();

  useEffect(() => {
    loadStatus();
  }, [workout.id]);

  const loadStatus = async () => {
    try {
      const workoutStatus = await statusTracker.getStatus(workout.id);
      setStatus({
        posted: workoutStatus.postedToNostr,
      });
    } catch (error) {
      console.error('Failed to load workout status:', error);
    }
  };

  const handlePost = async () => {
    if (!onSocialShare || status.posted || loading.post) return;

    try {
      setLoading((prev) => ({ ...prev, post: true }));
      onSocialShare(workout);
    } catch (error) {
      console.error('Failed to open social share:', error);
    } finally {
      setLoading((prev) => ({ ...prev, post: false }));
    }
  };

  // Format pace from seconds per km to MM:SS format
  // Convert to seconds/mi for imperial users (multiply by 1.60934)
  const formatPace = (seconds: number): string => {
    const paceSeconds = unitSystem === 'imperial' ? seconds * 1.60934 : seconds;
    const mins = Math.floor(paceSeconds / 60);
    const secs = Math.floor(paceSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

    return diffDays === 0
      ? 'Today'
      : diffDays === 1
      ? 'Yesterday'
      : diffDays < 7
      ? `${diffDays} days ago`
      : workoutDate.toLocaleDateString();
  };

  // Get enhanced activity type display name
  const getActivityTypeName = (): string => {
    const baseType = workout.type ? (workout.type as string) : 'Workout';

    // Fitness Test: Show as RUNSTR Fitness Test
    if ((workout as any).exerciseType === 'fitness_test') {
      return 'RUNSTR Fitness Test';
    }

    // Meditation: Show meditation subtype if available
    if (baseType === 'meditation' && (workout as any).meditationType) {
      const meditationType = (workout as any).meditationType;
      const typeMap: Record<string, string> = {
        guided: 'Guided Meditation',
        unguided: 'Unguided Meditation',
        breathwork: 'Breathwork',
        body_scan: 'Body Scan',
        gratitude: 'Gratitude Meditation',
      };
      return typeMap[meditationType] || 'Meditation';
    }

    // Diet: Show meal type if available
    if (baseType === 'other' && (workout as any).mealType) {
      const mealType = (workout as any).mealType;
      return mealType.charAt(0).toUpperCase() + mealType.slice(1);
    }

    // Strength: Show exercise type if available
    if (
      (baseType === 'strength_training' || baseType === 'gym') &&
      (workout as any).exerciseType
    ) {
      const exerciseType = (workout as any).exerciseType;
      return exerciseType.charAt(0).toUpperCase() + exerciseType.slice(1);
    }

    // Default: Capitalize first letter
    return baseType.charAt(0).toUpperCase() + baseType.slice(1);
  };

  // Activity icons removed - no longer using emojis

  // Source icons removed - no longer using emojis

  const isFromNostr = workout.source?.toLowerCase() === 'nostr';

  // Get weather emoji from icon code
  const getWeatherEmoji = (icon: string): string => {
    const iconMap: Record<string, string> = {
      '01d': 'Clear',
      '01n': 'Clear',
      '02d': 'Clouds',
      '02n': 'Cloudy',
      '03d': 'Cloudy',
      '03n': 'Cloudy',
      '04d': 'Cloudy',
      '04n': 'Cloudy',
      '09d': 'Rain',
      '09n': 'Rain',
      '10d': 'Rain',
      '10n': 'Rain',
      '11d': 'Storm',
      '11n': 'Storm',
      '13d': 'Snow',
      '13n': 'Snow',
      '50d': 'Fog',
      '50n': 'Fog',
    };
    return iconMap[icon] || 'Fair';
  };

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        activeOpacity={0.7}
        onPress={() => setShowDetailModal(true)}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* Activity icon removed */}
            <View style={styles.headerInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.activityType}>{getActivityTypeName()}</Text>
                {(workout as any).verificationReceipt && <VerifiedCheckmark />}
              </View>
              <Text style={styles.date}>{formatDate(workout.startTime)}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {/* Weather Badge (if available) */}
            {workout.weather && (
              <View style={styles.weatherBadge}>
                <Text style={styles.weatherEmoji}>
                  {getWeatherEmoji(workout.weather.icon)}
                </Text>
                <Text style={styles.weatherTemp}>{workout.weather.temp}°C</Text>
              </View>
            )}
            {workout.source && workout.source !== 'manual_entry' && (
              <View style={styles.sourceBadge}>
                <Text style={styles.sourceText}>
                  {workout.source.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats - Activity Specific */}
        <View style={styles.stats}>
          {/* Cardio workouts: Distance, Pace, Calories */}
          {['running', 'walking', 'cycling', 'hiking'].includes(
            workout.type
          ) && (
            <>
              {/* Walking with steps: show steps + distance instead of duration */}
              {workout.steps && workout.steps > 0 ? (
                <>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {workout.steps.toLocaleString()}
                    </Text>
                    <Text style={styles.statLabel}>Steps</Text>
                  </View>
                  {workout.distance && (
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>
                        {formatDistance(workout.distance, unitSystem)}
                      </Text>
                      <Text style={styles.statLabel}>Distance</Text>
                    </View>
                  )}
                </>
              ) : (
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
                  {workout.pace && (
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>
                        {formatPace(workout.pace)}
                      </Text>
                      <Text style={styles.statLabel}>Pace {paceLabel}</Text>
                    </View>
                  )}
                  {workout.calories !== undefined && (
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>
                        {workout.calories.toFixed(0)}
                      </Text>
                      <Text style={styles.statLabel}>Calories</Text>
                    </View>
                  )}
                </>
              )}
            </>
          )}

          {/* Strength workouts: Sets × Reps, Calories */}
          {['strength_training', 'gym'].includes(workout.type) && (
            <>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {formatDuration(workout.duration)}
                </Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
              {workout.sets && workout.reps && (
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {workout.sets} × {workout.reps}
                  </Text>
                  <Text style={styles.statLabel}>Sets × Reps</Text>
                </View>
              )}
              {workout.calories !== undefined && (
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {workout.calories.toFixed(0)}
                  </Text>
                  <Text style={styles.statLabel}>Calories</Text>
                </View>
              )}
            </>
          )}

          {/* Meditation: Duration, Type, 0 cal */}
          {workout.type === 'meditation' && (
            <>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {formatDuration(workout.duration)}
                </Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
              {(workout as any).meditationType && (
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {((workout as any).meditationType as string)
                      .charAt(0)
                      .toUpperCase() +
                      ((workout as any).meditationType as string).slice(1)}
                  </Text>
                  <Text style={styles.statLabel}>Type</Text>
                </View>
              )}
              <View style={styles.statItem}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Calories</Text>
              </View>
            </>
          )}

          {/* Diet: Meal type, Meal size, Calories */}
          {workout.type === 'diet' && (
            <>
              {(workout as any).mealType && (
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {((workout as any).mealType as string)
                      .charAt(0)
                      .toUpperCase() +
                      ((workout as any).mealType as string).slice(1)}
                  </Text>
                  <Text style={styles.statLabel}>Meal</Text>
                </View>
              )}
              {(workout as any).mealSize && (
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {((workout as any).mealSize as string)
                      .charAt(0)
                      .toUpperCase() +
                      ((workout as any).mealSize as string).slice(1)}
                  </Text>
                  <Text style={styles.statLabel}>Size</Text>
                </View>
              )}
              {workout.calories !== undefined && (
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {workout.calories.toFixed(0)}
                  </Text>
                  <Text style={styles.statLabel}>Calories</Text>
                </View>
              )}
            </>
          )}

          {/* Fasting: Just duration */}
          {workout.type === 'fasting' && (
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatDuration(workout.duration)}
              </Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
          )}

          {/* Fitness Test: Score, Grade, Duration */}
          {(workout as any).exerciseType === 'fitness_test' && (
            <>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {(workout as any).fitnessTestScore || 0}/
                  {(workout as any).fitnessTestMaxScore || 300}
                </Text>
                <Text style={styles.statLabel}>Score</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {(workout as any).fitnessTestGrade || 'N/A'}
                </Text>
                <Text style={styles.statLabel}>Grade</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {formatDuration(workout.duration)}
                </Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
            </>
          )}

          {/* Other workouts: Default display */}
          {![
            'running',
            'walking',
            'cycling',
            'hiking',
            'strength_training',
            'gym',
            'meditation',
            'diet',
            'fasting',
          ].includes(workout.type) &&
            (workout as any).exerciseType !== 'fitness_test' && (
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
                {workout.calories !== undefined && (
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {workout.calories.toFixed(0)}
                    </Text>
                    <Text style={styles.statLabel}>Calories</Text>
                  </View>
                )}
              </>
            )}
        </View>

        {/* Status Indicators */}
        {status.posted && (
          <View style={styles.statusContainer}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>✓ Posted</Text>
            </View>
          </View>
        )}

        {/* Action Buttons - Post only, WOT-gated */}
        {!hideActions && !isFromNostr && isWoTEligible && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.postButton,
                status.posted && styles.disabledButton,
              ]}
              onPress={handlePost}
              disabled={status.posted || loading.post}
            >
              {loading.post ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.background}
                />
              ) : (
                <>
                  <Ionicons
                    name="paper-plane-outline"
                    size={16}
                    color={theme.colors.background}
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.actionButtonText}>
                    {status.posted ? '✓ Posted' : 'Post'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Compete Button - shown when Supabase submission failed */}
        {!hideActions && supabaseSubmitted === false && onCompete && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.competeButton]}
              onPress={() => onCompete(workout.id)}
            >
              <Ionicons
                name="trophy-outline"
                size={16}
                color="#FF9D42"
                style={styles.buttonIcon}
              />
              <Text style={styles.competeButtonText}>Compete</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>

      {/* Workout Detail Modal */}
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
    gap: 8,
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
  weatherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  weatherEmoji: {
    fontSize: 14,
  },
  weatherTemp: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '500',
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
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    gap: 8,
  },
  buttonIcon: {
    marginRight: 0,
  },
  postButton: {
    backgroundColor: theme.colors.text,
  },
  disabledButton: {
    opacity: 0.6,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionButtonText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  competeButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF9D42',
  },
  competeButtonText: {
    color: '#FF9D42',
    fontSize: 14,
    fontWeight: '600',
  },
});
