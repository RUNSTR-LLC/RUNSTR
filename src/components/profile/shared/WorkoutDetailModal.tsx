/**
 * WorkoutDetailModal - Run detail sheet: distance, time, pace, elevation, splits
 * History only lists runs (isRunningWorkout), so this view is running-only.
 */

import React from 'react';
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
import { useUnitPreference } from '../../../hooks/useUnitPreference';

interface WorkoutDetailModalProps {
  visible: boolean;
  workout: LocalWorkout | Workout | null;
  onClose: () => void;
}

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

const formatStarted = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${day} · ${time}`;
};

export const WorkoutDetailModal: React.FC<WorkoutDetailModalProps> = ({
  visible,
  workout,
  onClose,
}) => {
  const { isMetric, paceLabel } = useUnitPreference();

  if (!workout) return null;

  const run = workout as LocalWorkout;
  const splits = run.splits;

  const formatDistance = (meters?: number): string => {
    if (!meters) return '--';
    return isMetric
      ? `${(meters / 1000).toFixed(2)} km`
      : `${(meters * 0.000621371).toFixed(2)} mi`;
  };

  // Pace is stored as seconds per km
  const formatPace = (secondsPerKm?: number): string => {
    if (!secondsPerKm) return '--';
    const paceSeconds = isMetric ? secondsPerKm : secondsPerKm * 1.60934;
    const mins = Math.floor(paceSeconds / 60);
    const secs = Math.floor(paceSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')} ${paceLabel}`;
  };

  const formatElevation = (meters: number): string =>
    isMetric ? `${Math.round(meters)} m` : `${Math.round(meters * 3.28084)} ft`;

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
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>
                {getTimeOfDay(workout.startTime)} Run
              </Text>
              <Text style={styles.subtitle}>
                {formatStarted(workout.startTime)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Distance</Text>
                <Text style={styles.statValue}>
                  {formatDistance(workout.distance)}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Time</Text>
                <Text style={styles.statValue}>
                  {formatDuration(workout.duration)}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Avg Pace</Text>
                <Text style={styles.statValue}>{formatPace(workout.pace)}</Text>
              </View>
            </View>

            {!!run.elevation && (
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Elevation Gain</Text>
                  <Text style={styles.statValue}>
                    {formatElevation(run.elevation)}
                  </Text>
                </View>
              </View>
            )}

            {splits && splits.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Splits</Text>
                <View style={styles.splitsTable}>
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
                          {formatDuration(split.elapsedTime || 0)}
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

            {!!run.notes && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <Text style={styles.notesText}>{run.notes}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
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
    fontSize: 15,
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
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
    width: '20%',
    textAlign: 'center',
  },
  timeColumn: {
    width: '40%',
    textAlign: 'center',
  },
  paceColumn: {
    width: '40%',
    textAlign: 'center',
  },
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
});
