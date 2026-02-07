/**
 * WorkoutStatsSheet - Bottom sheet displaying workout statistics
 * Shows This Week/Month summaries and Personal Records
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import localWorkoutStorage, {
  type LocalWorkout,
} from '../../services/fitness/LocalWorkoutStorageService';
import {
  PersonalRecordsService,
  type CardioPR,
} from '../../services/analytics/PersonalRecordsService';
import { useUnitPreference } from '../../hooks/useUnitPreference';

interface WorkoutStatsSheetProps {
  visible: boolean;
  onClose: () => void;
}

interface PeriodStats {
  count: number;
  distance: number; // meters
  duration: number; // seconds
}

export const WorkoutStatsSheet: React.FC<WorkoutStatsSheetProps> = ({
  visible,
  onClose,
}) => {
  const { isMetric, distanceLabel } = useUnitPreference();
  const [isLoading, setIsLoading] = useState(true);
  const [weekStats, setWeekStats] = useState<PeriodStats>({
    count: 0,
    distance: 0,
    duration: 0,
  });
  const [monthStats, setMonthStats] = useState<PeriodStats>({
    count: 0,
    distance: 0,
    duration: 0,
  });
  const [cardioPRs, setCardioPRs] = useState<CardioPR | null>(null);

  useEffect(() => {
    if (visible) {
      loadStats();
    }
  }, [visible]);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const workouts = await localWorkoutStorage.getAllWorkouts();

      // Filter to cardio workouts only for stats
      const cardioWorkouts = workouts.filter((w) =>
        ['running', 'walking', 'cycling', 'hiking'].includes(w.type.toLowerCase())
      );

      // Calculate week stats
      const weekStart = getWeekStart(new Date());
      const weekWorkouts = cardioWorkouts.filter(
        (w) => new Date(w.startTime) >= weekStart
      );
      setWeekStats(calculatePeriodStats(weekWorkouts));

      // Calculate month stats
      const monthStart = getMonthStart(new Date());
      const monthWorkouts = cardioWorkouts.filter(
        (w) => new Date(w.startTime) >= monthStart
      );
      setMonthStats(calculatePeriodStats(monthWorkouts));

      // Get personal records
      const prs = PersonalRecordsService.getCardioPRs(workouts);
      setCardioPRs(prs);
    } catch (error) {
      console.error('[WorkoutStatsSheet] Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getMonthStart = (date: Date): Date => {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const calculatePeriodStats = (workouts: LocalWorkout[]): PeriodStats => {
    return {
      count: workouts.length,
      distance: workouts.reduce((sum, w) => sum + (w.distance || 0), 0),
      duration: workouts.reduce((sum, w) => sum + (w.duration || 0), 0),
    };
  };

  const formatDistance = (meters: number): string => {
    if (isMetric) {
      const km = meters / 1000;
      return `${km.toFixed(1)} ${distanceLabel}`;
    } else {
      const miles = meters * 0.000621371;
      return `${miles.toFixed(1)} ${distanceLabel}`;
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPRTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPRDistance = (meters: number): string => {
    if (isMetric) {
      const km = meters / 1000;
      return `${km.toFixed(1)} km`;
    } else {
      const miles = meters * 0.000621371;
      return `${miles.toFixed(1)} mi`;
    }
  };

  const renderStatBox = (value: string, label: string) => (
    <View style={styles.statBox}>
      <Text style={styles.statBoxValue}>{value}</Text>
      <Text style={styles.statBoxLabel}>{label}</Text>
    </View>
  );

  const renderPRRow = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    value: string | null
  ) => (
    <View style={styles.prRow}>
      <View style={styles.prIconContainer}>
        <Ionicons name={icon} size={18} color={theme.colors.accent} />
      </View>
      <Text style={styles.prLabel}>{label}</Text>
      <Text style={styles.prValue}>{value || '--'}</Text>
    </View>
  );

  // Find longest single run distance from all workouts
  const getLongestRun = (workouts: LocalWorkout[]): number | null => {
    const cardioWorkouts = workouts.filter((w) =>
      ['running', 'walking', 'cycling', 'hiking'].includes(w.type.toLowerCase())
    );
    if (cardioWorkouts.length === 0) return null;

    const maxDistance = Math.max(
      ...cardioWorkouts.map((w) => w.distance || 0)
    );
    return maxDistance > 0 ? maxDistance : null;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Workout Stats</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.text} />
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* This Week Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>This Week</Text>
                <View style={styles.statRow}>
                  {renderStatBox(weekStats.count.toString(), 'workouts')}
                  {renderStatBox(formatDistance(weekStats.distance), 'distance')}
                  {renderStatBox(formatDuration(weekStats.duration), 'time')}
                </View>
              </View>

              {/* This Month Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>This Month</Text>
                <View style={styles.statRow}>
                  {renderStatBox(monthStats.count.toString(), 'workouts')}
                  {renderStatBox(formatDistance(monthStats.distance), 'distance')}
                  {renderStatBox(formatDuration(monthStats.duration), 'time')}
                </View>
              </View>

              {/* Personal Records Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Personal Records</Text>
                <View style={styles.prContainer}>
                  {renderPRRow(
                    'stopwatch-outline',
                    'Fastest 5K',
                    cardioPRs?.fastest5K
                      ? formatPRTime(cardioPRs.fastest5K.time)
                      : null
                  )}
                  {renderPRRow(
                    'stopwatch-outline',
                    'Fastest 10K',
                    cardioPRs?.fastest10K
                      ? formatPRTime(cardioPRs.fastest10K.time)
                      : null
                  )}
                  {renderPRRow(
                    'footsteps-outline',
                    'Longest Run',
                    cardioPRs?.fastest5K?.workout
                      ? formatPRDistance(
                          getLongestRun([
                            ...(cardioPRs.fastest5K?.workout
                              ? [cardioPRs.fastest5K.workout]
                              : []),
                            ...(cardioPRs.fastest10K?.workout
                              ? [cardioPRs.fastest10K.workout]
                              : []),
                            ...(cardioPRs.fastestHalfMarathon?.workout
                              ? [cardioPRs.fastestHalfMarathon.workout]
                              : []),
                            ...(cardioPRs.fastestMarathon?.workout
                              ? [cardioPRs.fastestMarathon.workout]
                              : []),
                          ]) || 0
                        )
                      : null
                  )}
                  {renderPRRow(
                    'flame',
                    'Longest Streak',
                    cardioPRs?.longestStreak
                      ? `${cardioPRs.longestStreak} days`
                      : null
                  )}
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%',
    paddingBottom: 40,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold as '700',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold as '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statBoxValue: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold as '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  statBoxLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  prContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  prIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  prLabel: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
  },
  prValue: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold as '600',
    color: theme.colors.text,
  },
});
