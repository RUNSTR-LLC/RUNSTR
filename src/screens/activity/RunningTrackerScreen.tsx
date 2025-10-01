/**
 * RunningTrackerScreen - Real-time running tracker
 * Displays distance, time, pace, and elevation with GPS tracking
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { enhancedLocationTrackingService } from '../../services/activity/EnhancedLocationTrackingService';
import { activityMetricsService } from '../../services/activity/ActivityMetricsService';
import type { EnhancedTrackingSession } from '../../services/activity/EnhancedLocationTrackingService';
import type { FormattedMetrics } from '../../services/activity/ActivityMetricsService';
import { GPSStatusIndicator, type GPSSignalStrength } from '../../components/activity/GPSStatusIndicator';
import { BatteryWarning } from '../../components/activity/BatteryWarning';
import workoutPublishingService from '../../services/nostr/workoutPublishingService';
import type { PublishableWorkout } from '../../services/nostr/workoutPublishingService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [gpsSignal, setGpsSignal] = useState<GPSSignalStrength>('none');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | undefined>();
  const [isBackgroundTracking, setIsBackgroundTracking] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const metricsUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<number>(0);  // When pause started
  const totalPausedTimeRef = useRef<number>(0);  // Cumulative pause duration in ms

  useEffect(() => {
    return () => {
      // Cleanup timers on unmount
      if (timerRef.current) clearInterval(timerRef.current);
      if (metricsUpdateRef.current) clearInterval(metricsUpdateRef.current);
    };
  }, []);

  const startTracking = async () => {
    const started = await enhancedLocationTrackingService.startTracking('running');
    if (!started) {
      // The service will handle permission requests internally
      // and show the native iOS dialog if needed
      return;
    }

    setIsTracking(true);
    setIsPaused(false);
    startTimeRef.current = Date.now();
    pauseStartTimeRef.current = 0;
    totalPausedTimeRef.current = 0;

    // Start timer for duration
    timerRef.current = setInterval(() => {
      if (!isPaused) {
        const now = Date.now();
        const totalElapsed = Math.floor((now - startTimeRef.current - totalPausedTimeRef.current) / 1000);
        setElapsedTime(totalElapsed);
      }
    }, 1000);

    // Start metrics update timer
    metricsUpdateRef.current = setInterval(updateMetrics, 2000);
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

  const updateMetrics = () => {
    const session = enhancedLocationTrackingService.getCurrentSession();

    // Always update duration using local timer (works even without GPS/session)
    const formattedDuration = formatElapsedTime(elapsedTime);

    if (session) {
      // Use session's actual duration instead of state to avoid stale closure
      const sessionDuration = session.duration;

      const currentMetrics = {
        distance: session.totalDistance,
        duration: sessionDuration,
        pace: activityMetricsService.calculatePace(session.totalDistance, sessionDuration),
        elevationGain: session.totalElevationGain,
      };

      const formatted = activityMetricsService.getFormattedMetrics(currentMetrics, 'running');

      // Override with local elapsedTime for duration display (handles pause correctly)
      formatted.duration = formattedDuration;

      setMetrics(formatted);

      // Update GPS status
      setGpsSignal(session.gpsSignalStrength as GPSSignalStrength);
      setGpsAccuracy(session.statistics?.averageAccuracy);
      setIsBackgroundTracking(session.isBackgroundTracking);
    } else if (isTracking) {
      // No session yet, but tracking started - show timer-based duration
      setMetrics(prev => ({
        ...prev,
        duration: formattedDuration,
      }));
    }
  };

  const pauseTracking = async () => {
    if (!isPaused) {
      await enhancedLocationTrackingService.pauseTracking();
      setIsPaused(true);
      pauseStartTimeRef.current = Date.now();  // Store when pause started
    }
  };

  const resumeTracking = async () => {
    if (isPaused) {
      const pauseDuration = Date.now() - pauseStartTimeRef.current;  // Calculate how long we were paused
      totalPausedTimeRef.current += pauseDuration;  // Add to cumulative total
      await enhancedLocationTrackingService.resumeTracking();
      setIsPaused(false);
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

    const session = await enhancedLocationTrackingService.stopTracking();
    setIsTracking(false);
    setIsPaused(false);

    if (session && session.totalDistance > 10) { // Only show summary if moved at least 10 meters
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

  const showWorkoutSummary = (session: EnhancedTrackingSession) => {
    const finalMetrics = {
      distance: session.totalDistance,
      duration: elapsedTime,
      pace: activityMetricsService.calculatePace(session.totalDistance, elapsedTime),
      elevationGain: session.totalElevationGain,
      calories: activityMetricsService.estimateCalories('running', session.totalDistance, elapsedTime),
    };

    const formatted = activityMetricsService.getFormattedMetrics(finalMetrics, 'running');

    Alert.alert(
      'Run Complete! 🏃',
      `Distance: ${formatted.distance}\n` +
      `Duration: ${formatted.duration}\n` +
      `Pace: ${formatted.pace}\n` +
      `Elevation: ${formatted.elevation}\n` +
      `Calories: ${formatted.calories || '0 cal'}`,
      [
        { text: 'Discard', style: 'cancel' },
        { text: 'Save', onPress: () => saveWorkout(session) },
      ]
    );

    // Reset metrics after showing summary
    setMetrics({
      distance: '0.00 km',
      duration: '0:00',
      pace: '--:--',
      elevation: '0 m',
    });
    setElapsedTime(0);
  };

  const saveWorkout = async (session: EnhancedTrackingSession) => {
    try {
      // Get user's private key from storage
      const nsec = await AsyncStorage.getItem('@runstr:user_nsec');
      const hexPrivKey = await AsyncStorage.getItem('@runstr:user_privkey_hex');
      const npub = await AsyncStorage.getItem('@runstr:npub');

      if (!hexPrivKey) {
        Alert.alert('Error', 'No user key found. Please login first.');
        return;
      }

      // Convert session to PublishableWorkout format
      const workoutId = `workout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const publishableWorkout: PublishableWorkout = {
        id: workoutId, // Generate unique ID
        userId: npub || 'unknown',
        type: 'running',
        startTime: new Date(Date.now() - (elapsedTime * 1000)).toISOString(),
        endTime: new Date().toISOString(),
        duration: elapsedTime, // Already in seconds
        distance: session.totalDistance, // Already in meters
        calories: activityMetricsService.estimateCalories('running', session.totalDistance, elapsedTime),
        source: 'manual',
        syncedAt: new Date().toISOString(),
        sourceApp: 'RUNSTR',
        elevationGain: session.totalElevationGain,
        unitSystem: 'metric',
        canSyncToNostr: true,
        metadata: {
          title: 'Running Workout',
          sourceApp: 'RUNSTR',
          notes: `Tracked ${(session.totalDistance / 1000).toFixed(2)}km run`,
        },
        pace: activityMetricsService.calculatePace(session.totalDistance, elapsedTime),
      };

      console.log('🔄 Publishing workout to Nostr...');

      // Publish as kind 1301 event
      const result = await workoutPublishingService.saveWorkoutToNostr(
        publishableWorkout,
        hexPrivKey,
        npub || 'unknown'
      );

      if (result.success) {
        console.log('✅ Workout saved to Nostr:', result.eventId);
        Alert.alert(
          'Success! 🎉',
          `Your run has been saved to Nostr!\n\nEvent ID: ${result.eventId?.slice(0, 8)}...`,
          [
            { text: 'OK' },
            {
              text: 'Share',
              onPress: async () => {
                // Optionally post to social feed
                const socialResult = await workoutPublishingService.postWorkoutToSocial(
                  publishableWorkout,
                  hexPrivKey,
                  npub || 'unknown',
                  {
                    includeStats: true,
                    includeMotivation: true,
                    cardTemplate: 'achievement',
                  }
                );
                if (socialResult.success) {
                  Alert.alert('Shared!', 'Your workout has been posted to your Nostr feed!');
                }
              },
            },
          ]
        );
      } else {
        console.error('❌ Failed to save workout:', result.error);
        Alert.alert('Error', `Failed to save workout: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error saving workout:', error);
      Alert.alert('Error', 'Failed to save workout to Nostr');
    }
  };

  // Update metrics in real-time
  useEffect(() => {
    if (isTracking && !isPaused) {
      updateMetrics();
    }
  }, [elapsedTime]);

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
          <MetricCard label="Duration" value={metrics.duration} icon="time" />
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
            <Ionicons name="play" size={40} color={theme.colors.background} />
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

      {/* Status Indicator */}
      {isTracking && (
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, isPaused && styles.statusDotPaused]} />
          <Text style={styles.statusText}>
            {isPaused ? 'Paused' : 'Recording'}
          </Text>
        </View>
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
    justifyContent: 'center',
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
    borderRadius: 40,
    width: 160,
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startButtonText: {
    color: theme.colors.background,
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
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
    backgroundColor: theme.colors.text, // White for resume
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
  statusContainer: {
    position: 'absolute',
    top: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.text, // White when recording
    marginRight: 8,
  },
  statusDotPaused: {
    backgroundColor: theme.colors.textMuted, // Gray when paused
  },
  statusText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
  },
});