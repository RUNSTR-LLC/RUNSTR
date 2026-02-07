/**
 * WorkoutDetailModal - Detailed workout view with splits, weather, and activity-specific data
 * Shows comprehensive workout information in a modal dialog
 * Includes saved card preview with fullscreen option
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../styles/theme';
import type { LocalWorkout } from '../../../services/fitness/LocalWorkoutStorageService';
import type { Workout } from '../../../types/workout';
import type { PublishableWorkout } from '../../../services/nostr/workoutPublishingService';
import { FullScreenCardModal } from './FullScreenCardModal';
import { useUnitPreference } from '../../../hooks/useUnitPreference';

interface WorkoutDetailModalProps {
  visible: boolean;
  workout: LocalWorkout | Workout | null;
  onClose: () => void;
}

export const WorkoutDetailModal: React.FC<WorkoutDetailModalProps> = ({
  visible,
  workout,
  onClose,
}) => {
  const [showFullscreenCard, setShowFullscreenCard] = useState(false);
  const { isMetric, paceLabel, speedLabel } = useUnitPreference();

  if (!workout) return null;

  // Check if this workout has a saved card
  const localWorkout = workout as LocalWorkout;
  const hasSavedCard = !!localWorkout.savedCard;

  // Format helpers
  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters?: number): string => {
    if (!meters) return '--';
    if (isMetric) {
      return meters < 1000
        ? `${meters.toFixed(0)}m`
        : `${(meters / 1000).toFixed(2)} km`;
    } else {
      const feet = meters * 3.28084;
      const miles = meters * 0.000621371;
      return feet < 5280
        ? `${feet.toFixed(0)} ft`
        : `${miles.toFixed(2)} mi`;
    }
  };

  const formatPace = (seconds: number): string => {
    // If imperial, convert pace from seconds/km to seconds/mi
    const paceSeconds = isMetric ? seconds : seconds * 1.60934;
    const mins = Math.floor(paceSeconds / 60);
    const secs = Math.floor(paceSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')} ${paceLabel}`;
  };

  const formatSplitTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatElevation = (meters?: number): string => {
    if (!meters) return '--';
    if (isMetric) {
      return `${Math.round(meters)} m`;
    } else {
      const feet = Math.round(meters * 3.28084);
      return `${feet} ft`;
    }
  };

  const formatSpeed = (metersPerSecond?: number): string => {
    if (!metersPerSecond) return '--';
    if (isMetric) {
      const kmh = (metersPerSecond * 3.6).toFixed(1);
      return `${kmh} ${speedLabel}`;
    } else {
      const mph = (metersPerSecond * 2.23694).toFixed(1);
      return `${mph} ${speedLabel}`;
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getDayOfWeek = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const getTimeOfDay = (dateString: string): string => {
    const hour = new Date(dateString).getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  const getWeatherEmoji = (icon: string): string => {
    const iconMap: Record<string, string> = {
      '01d': '☀️',
      '01n': '🌙',
      '02d': '⛅',
      '02n': '☁️',
      '03d': '☁️',
      '03n': '☁️',
      '04d': '☁️',
      '04n': '☁️',
      '09d': '🌧️',
      '09n': '🌧️',
      '10d': '🌦️',
      '10n': '🌧️',
      '11d': '⛈️',
      '11n': '⛈️',
      '13d': '❄️',
      '13n': '❄️',
      '50d': '🌫️',
      '50n': '🌫️',
    };
    return iconMap[icon] || '🌤️';
  };

  const getActivityTypeName = (): string => {
    const baseType = workout.type ? (workout.type as string) : 'Workout';
    const localWorkout = workout as LocalWorkout;

    // Check for fitness test
    if (localWorkout.exerciseType === 'fitness_test') {
      return 'RUNSTR Fitness Test';
    }

    // Check for meditation subtype
    if (baseType === 'meditation' && localWorkout.meditationType) {
      const typeMap: Record<string, string> = {
        guided: 'Guided Meditation',
        unguided: 'Unguided Meditation',
        breathwork: 'Breathwork',
        body_scan: 'Body Scan',
        loving_kindness: 'Loving-Kindness',
      };
      return typeMap[localWorkout.meditationType] || 'Meditation';
    }

    // Check for meal type
    if (baseType === 'diet' && localWorkout.mealType) {
      return (
        localWorkout.mealType.charAt(0).toUpperCase() +
        localWorkout.mealType.slice(1)
      );
    }

    // Check for exercise type
    if (
      (baseType === 'strength_training' || baseType === 'gym') &&
      localWorkout.exerciseType
    ) {
      return (
        localWorkout.exerciseType.charAt(0).toUpperCase() +
        localWorkout.exerciseType.slice(1)
      );
    }

    // Default capitalization
    return baseType.charAt(0).toUpperCase() + baseType.slice(1);
  };

  const isCardioWorkout = (): boolean => {
    const cardioTypes = ['running', 'cycling', 'walking', 'hiking'];
    return cardioTypes.includes(workout.type);
  };

  const isMeditationWorkout = (): boolean => {
    return workout.type === 'meditation';
  };

  const isStrengthWorkout = (): boolean => {
    return workout.type === 'strength_training' || workout.type === 'gym';
  };

  const isDietWorkout = (): boolean => {
    return workout.type === 'diet' || workout.type === 'fasting';
  };

  const isFitnessTestWorkout = (): boolean => {
    const localWorkout = workout as LocalWorkout;
    return localWorkout.exerciseType === 'fitness_test';
  };

  const renderCardioDetails = () => {
    const localWorkout = workout as LocalWorkout;
    const splits = localWorkout.splits;

    return (
      <>
        {/* Time & Context Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Details</Text>
          <View style={styles.contextCard}>
            <View style={styles.contextRow}>
              <Text style={styles.contextLabel}>Started</Text>
              <Text style={styles.contextValue}>
                {formatTime(workout.startTime)} -{' '}
                {getDayOfWeek(workout.startTime)}
              </Text>
            </View>
            <View style={styles.contextRow}>
              <Text style={styles.contextLabel}>Time of Day</Text>
              <Text style={styles.contextValue}>
                {getTimeOfDay(workout.startTime)}
              </Text>
            </View>
          </View>
        </View>

        {/* Summary Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>
              {formatDistance(workout.distance)}
            </Text>
          </View>
          {workout.pace && (
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Avg Pace</Text>
              <Text style={styles.statValue}>{formatPace(workout.pace)}</Text>
            </View>
          )}
          {localWorkout.speed && (
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Avg Speed</Text>
              <Text style={styles.statValue}>
                {formatSpeed(localWorkout.speed)}
              </Text>
            </View>
          )}
        </View>

        {/* Elevation Row */}
        {localWorkout.elevation && (
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Elevation Gain</Text>
              <Text style={styles.statValue}>
                {formatElevation(localWorkout.elevation)}
              </Text>
            </View>
          </View>
        )}

        {/* Splits Table */}
        {splits && splits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Splits</Text>
            <View style={styles.splitsTable}>
              {/* Table Header - Removed duplicate Split column (same as Pace for 1km/mi segments) */}
              <View style={styles.splitsHeader}>
                <Text style={[styles.splitsHeaderText, styles.kmColumn]}>
                  {isMetric ? 'Km' : 'Mi'}
                </Text>
                <Text style={[styles.splitsHeaderText, styles.timeColumn]}>
                  Total
                </Text>
                <Text style={[styles.splitsHeaderText, styles.paceColumn]}>
                  Pace
                </Text>
              </View>

              {/* Table Rows */}
              {splits.map((split, index) => {
                const splitNumber = split.number || index + 1;
                return (
                  <View
                    key={`split-${splitNumber}`}
                    style={[
                      styles.splitsRow,
                      index % 2 === 1 && styles.splitsRowAlt,
                    ]}
                  >
                    <Text style={[styles.splitsRowText, styles.kmColumn]}>
                      {splitNumber}
                    </Text>
                  <Text style={[styles.splitsRowText, styles.timeColumn]}>
                    {formatSplitTime(split.elapsedTime || 0)}
                  </Text>
                  <Text style={[styles.splitsRowText, styles.paceColumn]}>
                    {formatPace(split.pace)}
                  </Text>
                </View>
                );
              })}
            </View>
          </View>
        )}
      </>
    );
  };

  const renderMeditationDetails = () => {
    const localWorkout = workout as LocalWorkout;
    const mindfulnessRating = localWorkout.mindfulnessRating || 0;

    return (
      <View style={styles.section}>
        <View style={styles.meditationInfo}>
          <Ionicons name="body" size={48} color={theme.colors.text} />
          <Text style={styles.meditationDuration}>
            {formatDuration(workout.duration)}
          </Text>
          {localWorkout.meditationType && (
            <Text style={styles.meditationType}>{getActivityTypeName()}</Text>
          )}

          {/* Mindfulness Rating */}
          {mindfulnessRating > 0 && (
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingLabel}>Mindfulness</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= mindfulnessRating ? 'star' : 'star-outline'}
                    size={24}
                    color={
                      star <= mindfulnessRating
                        ? theme.colors.orangeBright
                        : theme.colors.textMuted
                    }
                    style={styles.star}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderStrengthDetails = () => {
    const localWorkout = workout as LocalWorkout;
    const totalReps = workout.reps || 0;
    const totalSets = workout.sets || 0;

    // Calculate volume stats
    const repsBreakdown = localWorkout.repsBreakdown || [];
    const avgRepsPerSet =
      repsBreakdown.length > 0
        ? (
            repsBreakdown.reduce((sum, reps) => sum + reps, 0) /
            repsBreakdown.length
          ).toFixed(1)
        : '0';

    // Calculate rep decline (difference between first and last set)
    const repDecline =
      repsBreakdown.length > 1
        ? repsBreakdown[0] - repsBreakdown[repsBreakdown.length - 1]
        : 0;

    return (
      <View style={styles.section}>
        <View style={styles.strengthSummary}>
          <View style={styles.strengthStat}>
            <Text style={styles.strengthStatValue}>{totalReps}</Text>
            <Text style={styles.strengthStatLabel}>Total Reps</Text>
          </View>
          <View style={styles.strengthStat}>
            <Text style={styles.strengthStatValue}>{totalSets}</Text>
            <Text style={styles.strengthStatLabel}>Sets</Text>
          </View>
          <View style={styles.strengthStat}>
            <Text style={styles.strengthStatValue}>
              {formatDuration(workout.duration)}
            </Text>
            <Text style={styles.strengthStatLabel}>Duration</Text>
          </View>
        </View>

        {/* Volume Analysis */}
        {repsBreakdown.length > 0 && (
          <View style={styles.volumeAnalysis}>
            <View style={styles.volumeRow}>
              <Text style={styles.volumeLabel}>Avg Reps/Set</Text>
              <Text style={styles.volumeValue}>{avgRepsPerSet}</Text>
            </View>
            {repDecline !== 0 && (
              <View style={styles.volumeRow}>
                <Text style={styles.volumeLabel}>Rep Decline</Text>
                <Text
                  style={[
                    styles.volumeValue,
                    repDecline > 0 && styles.declineText,
                  ]}
                >
                  {repDecline > 0
                    ? `-${repDecline}`
                    : `+${Math.abs(repDecline)}`}
                </Text>
              </View>
            )}
            {localWorkout.weight && (
              <View style={styles.volumeRow}>
                <Text style={styles.volumeLabel}>Weight</Text>
                <Text style={styles.volumeValue}>
                  {localWorkout.weight} lbs
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Sets Breakdown */}
        {repsBreakdown.length > 0 && (
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Sets Breakdown</Text>
            {repsBreakdown.map((reps, index) => (
              <View key={index} style={styles.setRow}>
                <Text style={styles.setNumber}>Set {index + 1}</Text>
                <Text style={styles.setReps}>{reps} reps</Text>
              </View>
            ))}
            {localWorkout.restTime && (
              <Text style={styles.restTimeText}>
                Rest: {localWorkout.restTime} seconds between sets
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderDietDetails = () => {
    const localWorkout = workout as LocalWorkout;

    return (
      <View style={styles.section}>
        {workout.type === 'diet' && localWorkout.mealType && (
          <>
            <View style={styles.dietInfo}>
              <Ionicons name="restaurant" size={48} color={theme.colors.text} />
              <Text style={styles.dietType}>{getActivityTypeName()}</Text>
              {localWorkout.mealTime && (
                <Text style={styles.dietTime}>
                  {formatTime(localWorkout.mealTime)}
                </Text>
              )}
            </View>
          </>
        )}

        {workout.type === 'fasting' && (
          <>
            <View style={styles.dietInfo}>
              <Ionicons
                name="timer"
                size={48}
                color={theme.colors.orangeBright}
              />
              <Text style={styles.dietType}>Fasting</Text>
              <Text style={styles.dietDuration}>
                {formatDuration(workout.duration)}
              </Text>
            </View>
            {/* Fasting Times */}
            <View style={styles.fastingTimes}>
              <View style={styles.fastingTimeRow}>
                <Text style={styles.fastingLabel}>Started</Text>
                <Text style={styles.fastingValue}>
                  {formatTime(workout.startTime)}
                </Text>
              </View>
              <View style={styles.fastingTimeRow}>
                <Text style={styles.fastingLabel}>Ended</Text>
                <Text style={styles.fastingValue}>
                  {formatTime(workout.endTime)}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>
    );
  };

  const renderFitnessTestDetails = () => {
    const localWorkout = workout as LocalWorkout;
    const components = localWorkout.fitnessTestComponents;

    if (!components) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Results</Text>

        {/* Overall Score */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Composite Score</Text>
            <Text style={styles.statValue}>
              {localWorkout.fitnessTestScore || 0}/
              {localWorkout.fitnessTestMaxScore || 300}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Grade</Text>
            <Text style={styles.statValue}>
              {localWorkout.fitnessTestGrade || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Component Breakdown Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Component Breakdown</Text>
          <View style={styles.splitsTable}>
            {/* Table Header */}
            <View style={styles.splitsHeader}>
              <Text style={[styles.splitsHeaderText, { flex: 2 }]}>
                Component
              </Text>
              <Text style={[styles.splitsHeaderText, { flex: 1 }]}>Result</Text>
              <Text style={[styles.splitsHeaderText, { flex: 1 }]}>Score</Text>
            </View>

            {/* Pushups Row */}
            {components.pushups && components.pushups.reps > 0 && (
              <View style={[styles.splitsRow]}>
                <Text style={[styles.splitsRowText, { flex: 2 }]}>Pushups</Text>
                <Text style={[styles.splitsRowText, { flex: 1 }]}>
                  {components.pushups.reps} reps
                </Text>
                <Text style={[styles.splitsRowText, { flex: 1 }]}>
                  {components.pushups.score} pts
                </Text>
              </View>
            )}

            {/* Situps Row */}
            {components.situps && components.situps.reps > 0 && (
              <View style={[styles.splitsRow, styles.splitsRowAlt]}>
                <Text style={[styles.splitsRowText, { flex: 2 }]}>Situps</Text>
                <Text style={[styles.splitsRowText, { flex: 1 }]}>
                  {components.situps.reps} reps
                </Text>
                <Text style={[styles.splitsRowText, { flex: 1 }]}>
                  {components.situps.score} pts
                </Text>
              </View>
            )}

            {/* 5K Run Row */}
            {components.run5k && components.run5k.timeSeconds > 0 && (
              <View style={[styles.splitsRow]}>
                <Text style={[styles.splitsRowText, { flex: 2 }]}>5K Run</Text>
                <Text style={[styles.splitsRowText, { flex: 1 }]}>
                  {formatDuration(components.run5k.timeSeconds)}
                </Text>
                <Text style={[styles.splitsRowText, { flex: 1 }]}>
                  {components.run5k.score} pts
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>{getActivityTypeName()}</Text>
              <Text style={styles.subtitle}>
                {formatDuration(workout.duration)}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Saved Card Section */}
            {hasSavedCard && (
              <TouchableOpacity
                style={styles.savedCardSection}
                onPress={() => setShowFullscreenCard(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="image" size={24} color={theme.colors.accent} />
                <View style={styles.savedCardInfo}>
                  <Text style={styles.savedCardTitle}>View Saved Card</Text>
                  <Text style={styles.savedCardDescription}>
                    {localWorkout.savedCard?.templateId === 'custom_photo'
                      ? 'Tap to view your photo'
                      : `Tap to view ${localWorkout.savedCard?.templateId} card`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}

            {/* Weather Section */}
            {workout.weather && (
              <View style={styles.section}>
                <View style={styles.weatherCard}>
                  <Text style={styles.weatherEmoji}>
                    {getWeatherEmoji(workout.weather.icon)}
                  </Text>
                  <View style={styles.weatherInfo}>
                    <Text style={styles.weatherTemp}>
                      {workout.weather.temp}°C
                    </Text>
                    <Text style={styles.weatherDesc}>
                      {workout.weather.description}
                    </Text>
                    {workout.weather.humidity !== undefined && (
                      <Text style={styles.weatherDetail}>
                        Humidity: {workout.weather.humidity}%
                      </Text>
                    )}
                    {workout.weather.windSpeed !== undefined && (
                      <Text style={styles.weatherDetail}>
                        Wind: {workout.weather.windSpeed.toFixed(1)} m/s
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Activity-Specific Details */}
            {isCardioWorkout() && renderCardioDetails()}
            {isMeditationWorkout() && renderMeditationDetails()}
            {isStrengthWorkout() && renderStrengthDetails()}
            {isDietWorkout() && renderDietDetails()}
            {isFitnessTestWorkout() && renderFitnessTestDetails()}

            {/* Notes Section */}
            {(workout as LocalWorkout).notes && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <Text style={styles.notesText}>
                  {(workout as LocalWorkout).notes}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Fullscreen Card Modal */}
      {hasSavedCard && (
        <FullScreenCardModal
          visible={showFullscreenCard}
          onClose={() => setShowFullscreenCard(false)}
          workout={workout as PublishableWorkout}
          templateId={localWorkout.savedCard?.templateId || 'elegant'}
          customPhotoUri={localWorkout.savedCard?.customPhotoUri}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 12,
  },
  // Weather styles
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 16,
  },
  weatherEmoji: {
    fontSize: 48,
  },
  weatherInfo: {
    flex: 1,
  },
  weatherTemp: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  weatherDesc: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  weatherDetail: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  // Stats row styles
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  // Splits table styles
  splitsTable: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  splitsHeader: {
    flexDirection: 'row',
    backgroundColor: theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  splitsHeaderText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  splitsRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  splitsRowAlt: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  splitsRowText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  kmColumn: {
    width: '15%',
    textAlign: 'center',
  },
  timeColumn: {
    width: '28%',
    textAlign: 'center',
  },
  paceColumn: {
    width: '30%',
    textAlign: 'center',
  },
  splitColumn: {
    width: '27%',
    textAlign: 'center',
  },
  // Meditation styles
  meditationInfo: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  meditationDuration: {
    fontSize: 36,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: 16,
  },
  meditationType: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  // Strength styles
  strengthSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  strengthStat: {
    alignItems: 'center',
  },
  strengthStatValue: {
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  strengthStatLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subsection: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 12,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  setNumber: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  setReps: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  restTimeText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 12,
    fontStyle: 'italic',
  },
  // Diet styles
  dietInfo: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  dietType: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: 16,
  },
  dietTime: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  dietDuration: {
    fontSize: 32,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.orangeBright,
    marginTop: 12,
  },
  // Notes styles
  notesText: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 24,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  // Context card styles
  contextCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  contextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  contextLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },
  contextValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semiBold,
  },
  // Volume analysis styles
  volumeAnalysis: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  volumeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  volumeLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },
  volumeValue: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semiBold,
  },
  declineText: {
    color: theme.colors.textSecondary,
  },
  // Rating styles for meditation
  ratingContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  star: {
    marginHorizontal: 2,
  },
  // Fasting times styles
  fastingTimes: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fastingTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  fastingLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },
  fastingValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semiBold,
  },
  // Saved card styles
  savedCardSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  savedCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  savedCardTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 2,
  },
  savedCardDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
