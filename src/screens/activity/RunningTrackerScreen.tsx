/**
 * RunningTrackerScreen - Real-time running tracker
 * Displays distance, time, pace, and elevation with GPS tracking
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as TaskManager from 'expo-task-manager';
import * as Device from 'expo-device';
import { theme } from '../../styles/theme';
import { simpleLocationTrackingService } from '../../services/activity/SimpleLocationTrackingService';
import { activityMetricsService } from '../../services/activity/ActivityMetricsService';
import type { TrackingSession } from '../../services/activity/SimpleLocationTrackingService';
import type { FormattedMetrics } from '../../services/activity/ActivityMetricsService';
import { GPSStatusIndicator, type GPSSignalStrength } from '../../components/activity/GPSStatusIndicator';
import { BatteryWarning } from '../../components/activity/BatteryWarning';
import { WorkoutSummaryModal } from '../../components/activity/WorkoutSummaryModal';
import LocalWorkoutStorageService from '../../services/fitness/LocalWorkoutStorageService';
import { BACKGROUND_LOCATION_TASK } from '../../services/activity/BackgroundLocationTask';

// Constants
const TIMER_INTERVAL_MS = 1000; // Update timer every second
const METRICS_UPDATE_INTERVAL_MS = 1000; // Update metrics every second for running
const MIN_WORKOUT_DISTANCE_METERS = 10; // Minimum distance to show workout summary
const ZOMBIE_SESSION_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 hours

interface MetricCardProps {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon }) => (
  <View style={styles.metricCard}>
    {icon && (
      <Ionicons name={icon} size={20} color={theme.colors.textMuted} style={styles.metricIcon} />
    )}
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

export const RunningTrackerScreen: React.FC = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [metrics, setMetrics] = useState<FormattedMetrics>({
    distance: '0.00 km',
    duration: '0:00',
    pace: '--:--',
    elevation: '0 m',
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [gpsSignal, setGpsSignal] = useState<GPSSignalStrength>('searching'); // Start with 'searching' for proper UI initialization
  const [gpsAccuracy, setGpsAccuracy] = useState<number | undefined>();
  const [isBackgroundTracking, setIsBackgroundTracking] = useState(false);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [workoutData, setWorkoutData] = useState<{
    type: 'running' | 'walking' | 'cycling';
    distance: number;
    duration: number;
    calories: number;
    elevation?: number;
    pace?: number;
    splits?: Split[];
    localWorkoutId?: string; // For marking as synced later
  } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const metricsUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<number>(0);  // When pause started
  const totalPausedTimeRef = useRef<number>(0);  // Cumulative pause duration in ms
  const isPausedRef = useRef<boolean>(false);  // Ref to avoid stale closure in timer

  useEffect(() => {
    return () => {
      // Cleanup timers on unmount
      if (timerRef.current) clearInterval(timerRef.current);
      if (metricsUpdateRef.current) clearInterval(metricsUpdateRef.current);
    };
  }, []);

  const startTracking = async () => {
    console.log('[RunningTrackerScreen] Starting tracking...');

    // Simple permission and start flow
    const started = await simpleLocationTrackingService.startTracking('running');
    if (!started) {
      Alert.alert(
        'Cannot Start Tracking',
        'Unable to start activity tracking. Please check location permissions and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    initializeTracking();
  };

  const initializeTracking = () => {
    setIsTracking(true);
    setIsPaused(false);
    isPausedRef.current = false;
    startTimeRef.current = Date.now();
    pauseStartTimeRef.current = 0;
    totalPausedTimeRef.current = 0;

    // Start timer for duration
    timerRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        const now = Date.now();
        const totalElapsed = Math.floor((now - startTimeRef.current - totalPausedTimeRef.current) / 1000);
        setElapsedTime(totalElapsed);
      }
    }, TIMER_INTERVAL_MS);

    // Start metrics update timer (1 second for responsive UI)
    metricsUpdateRef.current = setInterval(() => {
      const session = simpleLocationTrackingService.getCurrentSession();

      // Calculate current elapsed time from refs INSIDE the interval callback
      const now = Date.now();
      const currentElapsed = Math.floor((now - startTimeRef.current - totalPausedTimeRef.current) / 1000);
      const formattedDuration = formatElapsedTime(currentElapsed);

      if (session) {
        const currentMetrics = {
          distance: session.distance,
          duration: currentElapsed,
          pace: activityMetricsService.calculatePace(session.distance, currentElapsed),
          elevationGain: session.elevationGain,
        };

        const formatted = activityMetricsService.getFormattedMetrics(currentMetrics, 'running');
        formatted.duration = formattedDuration;

        setMetrics(formatted);
        setGpsSignal(simpleLocationTrackingService.getGPSSignalStrength());
        setGpsAccuracy(session.positions[session.positions.length - 1]?.accuracy);
        setIsBackgroundTracking(false); // Simple service doesn't differentiate
      } else if (isTracking) {
        setMetrics(prev => ({
          ...prev,
          duration: formattedDuration,
        }));
      }
    }, METRICS_UPDATE_INTERVAL_MS);
  };

  const formatElapsedTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };


  const pauseTracking = async () => {
    if (!isPaused) {
      await simpleLocationTrackingService.pauseTracking();
      setIsPaused(true);
      isPausedRef.current = true;
      pauseStartTimeRef.current = Date.now();  // Store when pause started
    }
  };

  const resumeTracking = async () => {
    if (isPaused) {
      const pauseDuration = Date.now() - pauseStartTimeRef.current;  // Calculate how long we were paused
      totalPausedTimeRef.current += pauseDuration;  // Add to cumulative total
      await simpleLocationTrackingService.resumeTracking();
      setIsPaused(false);
      isPausedRef.current = false;
    }
  };

  const stopTracking = async () => {
    // Clear timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (metricsUpdateRef.current) {
      clearInterval(metricsUpdateRef.current);
      metricsUpdateRef.current = null;
    }

    const session = await simpleLocationTrackingService.stopTracking();
    setIsTracking(false);
    setIsPaused(false);

    if (session && session.distance > MIN_WORKOUT_DISTANCE_METERS) { // Only show summary if moved at least 10 meters
      showWorkoutSummary(session);
    } else {
      // Reset metrics
      setMetrics({
        distance: '0.00 km',
        duration: '0:00',
        pace: '--:--',
        elevation: '0 m',
      });
      setElapsedTime(0);
    }
  };

  const showWorkoutSummary = async (session: TrackingSession) => {
    const calories = activityMetricsService.estimateCalories('running', session.distance, elapsedTime);
    const pace = activityMetricsService.calculatePace(session.distance, elapsedTime);

    // Save workout to local storage BEFORE showing modal
    // This ensures data persists even if user dismisses modal
    try {
      const workoutId = await LocalWorkoutStorageService.saveGPSWorkout({
        type: 'running',
        distance: session.distance,
        duration: elapsedTime,
        calories,
        elevation: session.elevationGain,
        pace,
        splits: session.splits,
      });

      console.log(`✅ GPS workout saved locally: ${workoutId}`);

      setWorkoutData({
        type: 'running',
        distance: session.distance,
        duration: elapsedTime,
        calories,
        elevation: session.elevationGain,
        pace,
        splits: session.splits,
        localWorkoutId: workoutId, // Pass to modal for sync tracking
      });
      setSummaryModalVisible(true);
    } catch (error) {
      console.error('❌ Failed to save workout locally:', error);
      // Still show modal even if save failed
      setWorkoutData({
        type: 'running',
        distance: session.distance,
        duration: elapsedTime,
        calories,
        elevation: session.elevationGain,
        pace,
        splits: session.splits,
      });
      setSummaryModalVisible(true);
    }

    // Reset metrics after showing summary
    setMetrics({
      distance: '0.00 km',
      duration: '0:00',
      pace: '--:--',
      elevation: '0 m',
    });
    setElapsedTime(0);
  };

  return (
    <View style={styles.container}>
      {/* GPS Status Indicator */}
      {isTracking && (
        <View style={styles.gpsContainer}>
          <GPSStatusIndicator
            signalStrength={gpsSignal}
            accuracy={gpsAccuracy}
            isBackgroundTracking={isBackgroundTracking}
          />
        </View>
      )}

      {/* Battery Warning */}
      {isTracking && <BatteryWarning />}

      {/* Metrics Display */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricsRow}>
          <MetricCard label="Distance" value={metrics.distance} icon="navigate" />
          <MetricCard label="Duration" value={formatElapsedTime(elapsedTime)} icon="time" />
        </View>
        <View style={styles.metricsRow}>
          <MetricCard label="Pace" value={metrics.pace ?? '--:--'} icon="speedometer" />
          <MetricCard label="Elevation" value={metrics.elevation ?? '0 m'} icon="trending-up" />
        </View>
      </View>

      {/* Control Buttons */}
      <View style={styles.controlsContainer}>
        {!isTracking ? (
          <TouchableOpacity style={styles.startButton} onPress={startTracking}>
            <Text style={styles.startButtonText}>Start Run</Text>
          </TouchableOpacity>
        ) : (
          <>
            {!isPaused ? (
              <TouchableOpacity style={styles.pauseButton} onPress={pauseTracking}>
                <Ionicons name="pause" size={30} color={theme.colors.text} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.resumeButton} onPress={resumeTracking}>
                <Ionicons name="play" size={30} color={theme.colors.background} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.stopButton} onPress={stopTracking}>
              <Ionicons name="stop" size={30} color={theme.colors.text} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Workout Summary Modal */}
      {workoutData && (
        <WorkoutSummaryModal
          visible={summaryModalVisible}
          onClose={() => {
            setSummaryModalVisible(false);
            setWorkoutData(null);
          }}
          workout={workoutData}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  gpsContainer: {
    marginBottom: 16,
  },
  metricsContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 20,
    paddingBottom: 20, // Ensure space for controls
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  metricIcon: {
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 40,
    gap: 20,
  },
  startButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 0.5,
  },
  pauseButton: {
    backgroundColor: theme.colors.card,
    borderRadius: 35,
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  resumeButton: {
    backgroundColor: theme.colors.orangeBright, // Orange for resume
    borderRadius: 35,
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    backgroundColor: theme.colors.card, // Dark gray for stop
    borderRadius: 35,
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  splitsContainer: {
    marginTop: 20,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.orangeDeep,
    maxHeight: 220, // Fits ~5 splits, scrollable for longer runs
    flexShrink: 1, // Allow shrinking if space is limited
  },
  splitsTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.orangeBright,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  splitsScrollContent: {
    gap: 4, // Reduced for compact layout
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 6, // Reduced for compact layout
    borderWidth: 1,
    borderColor: theme.colors.orangeDeep,
  },
  splitNumberContainer: {
    width: 40,
    marginRight: 12,
  },
  splitNumber: {
    fontSize: 14, // Reduced for compact layout
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.orangeBright,
  },
  splitTimeContainer: {
    flex: 1,
  },
  splitTime: {
    fontSize: 15, // Reduced for compact layout
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 2,
  },
  splitPace: {
    fontSize: 10, // Reduced for compact layout
    color: theme.colors.textMuted,
  },
  splitIconContainer: {
    marginLeft: 8,
  },
});