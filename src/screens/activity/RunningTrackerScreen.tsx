/**
 * RunningTrackerScreen - Real-time running tracker
 * Displays distance, time, pace, and elevation with GPS tracking
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, AppState, AppStateStatus } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { enhancedLocationTrackingService } from '../../services/activity/EnhancedLocationTrackingService';
import { activityMetricsService } from '../../services/activity/ActivityMetricsService';
import { locationPermissionService, type PermissionResult } from '../../services/activity/LocationPermissionService';
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
  const [permissionStatus, setPermissionStatus] = useState<PermissionResult | null>(null);
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const metricsUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    // Check permission status on mount
    checkPermissions();

    // Listen for app state changes to re-check permissions when returning from settings
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      // Cleanup timers on unmount
      if (timerRef.current) clearInterval(timerRef.current);
      if (metricsUpdateRef.current) clearInterval(metricsUpdateRef.current);
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (
      appStateRef.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      // App has come to the foreground, re-check permissions
      console.log('App returned to foreground, checking permissions...');
      checkPermissions();
    }
    appStateRef.current = nextAppState;
  };

  const checkPermissions = async () => {
    setIsCheckingPermission(true);
    const status = await locationPermissionService.checkPermissionStatus();
    setPermissionStatus(status);
    setIsCheckingPermission(false);
  };

  const requestPermissions = async () => {
    setIsCheckingPermission(true);
    const result = await locationPermissionService.requestActivityTrackingPermissions();

    // Re-check status after requesting
    await checkPermissions();

    return result.foreground;
  };

  const startTracking = async () => {
    // First check if we have permissions
    if (!permissionStatus || permissionStatus.foreground !== 'granted') {
      const granted = await requestPermissions();
      if (!granted) {
        return;
      }
    }

    const started = await enhancedLocationTrackingService.startTracking('running');
    if (!started) {
      Alert.alert(
        'Unable to Start Tracking',
        'There was an issue starting the activity tracker. Please try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsTracking(true);
    setIsPaused(false);
    startTimeRef.current = Date.now();
    pausedDurationRef.current = 0;

    // Start timer for duration
    timerRef.current = setInterval(() => {
      if (!isPaused) {
        const now = Date.now();
        const totalElapsed = Math.floor((now - startTimeRef.current - pausedDurationRef.current) / 1000);
        setElapsedTime(totalElapsed);
      }
    }, 1000);

    // Start metrics update timer
    metricsUpdateRef.current = setInterval(updateMetrics, 2000);
  };

  const updateMetrics = () => {
    const session = enhancedLocationTrackingService.getCurrentSession();
    if (session) {
      const currentMetrics = {
        distance: session.totalDistance,
        duration: elapsedTime,
        pace: activityMetricsService.calculatePace(session.totalDistance, elapsedTime),
        elevationGain: session.totalElevationGain,
      };

      const formatted = activityMetricsService.getFormattedMetrics(currentMetrics, 'running');
      setMetrics(formatted);

      // Update GPS status
      setGpsSignal(session.gpsSignalStrength as GPSSignalStrength);
      setGpsAccuracy(session.statistics?.averageAccuracy);
      setIsBackgroundTracking(session.isBackgroundTracking);
    }
  };

  const pauseTracking = async () => {
    if (!isPaused) {
      await enhancedLocationTrackingService.pauseTracking();
      setIsPaused(true);
      pausedDurationRef.current = Date.now();
    }
  };

  const resumeTracking = async () => {
    if (isPaused) {
      const pauseDuration = Date.now() - pausedDurationRef.current;
      pausedDurationRef.current += pauseDuration;
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
        source: 'activity_tracker',
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

  // Show loading while checking permissions
  if (isCheckingPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Checking permissions...</Text>
        </View>
      </View>
    );
  }

  // Show permission request UI if needed
  if (permissionStatus && permissionStatus.foreground !== 'granted') {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="location-outline" size={64} color={theme.colors.textMuted} />
          <Text style={styles.permissionTitle}>Location Access Required</Text>
          <Text style={styles.permissionDescription}>
            RUNSTR needs location access to track your running activities accurately.
          </Text>

          {permissionStatus.shouldShowSettings ? (
            <>
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={() => locationPermissionService.openLocationSettings()}
              >
                <Text style={styles.permissionButtonText}>Open Settings</Text>
              </TouchableOpacity>
              <Text style={styles.permissionHint}>
                Enable location access in Settings, then return to the app
              </Text>
            </>
          ) : (
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestPermissions}
            >
              <Text style={styles.permissionButtonText}>Enable Location Access</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Permission Status Badge */}
      {permissionStatus && permissionStatus.foreground === 'granted' && permissionStatus.background !== 'granted' && (
        <TouchableOpacity
          style={styles.permissionBadge}
          onPress={() => {
            Alert.alert(
              'Background Tracking',
              'For best results, enable "Always Allow" location access in Settings to continue tracking when the app is in the background.',
              [
                { text: 'Not Now', style: 'cancel' },
                {
                  text: 'Open Settings',
                  onPress: () => locationPermissionService.openLocationSettings(),
                },
              ]
            );
          }}
        >
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.warning} />
          <Text style={styles.permissionBadgeText}>Background tracking limited</Text>
        </TouchableOpacity>
      )}

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
          <MetricCard label="Pace" value={metrics.pace || '--:--'} icon="speedometer" />
          <MetricCard label="Elevation" value={metrics.elevation || '0 m'} icon="trending-up" />
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
    backgroundColor: theme.colors.success,
    borderRadius: 35,
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    backgroundColor: theme.colors.error,
    borderRadius: 35,
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: theme.colors.success,
    marginRight: 8,
  },
  statusDotPaused: {
    backgroundColor: theme.colors.warning,
  },
  statusText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionDescription: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: theme.colors.text,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
  },
  permissionHint: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  permissionBadgeText: {
    color: theme.colors.warning,
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    marginLeft: 6,
  },
});