/**
 * CyclingTrackerScreen - Cycling activity tracker with speed metrics
 * Displays distance, time, speed, and elevation
 */

import React, { useState, useEffect, useRef } from 'react';
import { Alert, View, Text, StyleSheet, TouchableOpacity, AppState, AppStateStatus } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { BaseTrackerComponent } from '../../components/activity/BaseTrackerComponent';
import { enhancedLocationTrackingService } from '../../services/activity/EnhancedLocationTrackingService';
import { activityMetricsService } from '../../services/activity/ActivityMetricsService';
import { locationPermissionService, type PermissionResult } from '../../services/activity/LocationPermissionService';
import type { EnhancedTrackingSession } from '../../services/activity/EnhancedLocationTrackingService';
import workoutPublishingService from '../../services/nostr/workoutPublishingService';
import type { PublishableWorkout } from '../../services/nostr/workoutPublishingService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const CyclingTrackerScreen: React.FC = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [metrics, setMetrics] = useState({
    distance: '0.00 km',
    duration: '0:00',
    speed: '0.0 km/h',
    elevation: '0 m',
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
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

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
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
    await checkPermissions();
    return result.foreground;
  };

  const startTracking = async () => {
    // Check permissions first
    if (!permissionStatus || permissionStatus.foreground !== 'granted') {
      const granted = await requestPermissions();
      if (!granted) {
        return;
      }
    }

    const started = await enhancedLocationTrackingService.startTracking('cycling');
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

    timerRef.current = setInterval(() => {
      if (!isPaused) {
        const now = Date.now();
        const totalElapsed = Math.floor((now - startTimeRef.current - pausedDurationRef.current) / 1000);
        setElapsedTime(totalElapsed);
      }
    }, 1000);

    metricsUpdateRef.current = setInterval(updateMetrics, 1000); // Update every second for speed
  };

  const updateMetrics = () => {
    const session = enhancedLocationTrackingService.getCurrentSession();
    if (session) {
      // Calculate current speed based on distance and time
      let speed = activityMetricsService.calculateSpeed(session.totalDistance, elapsedTime);

      setCurrentSpeed(speed);
      setMetrics({
        distance: activityMetricsService.formatDistance(session.totalDistance),
        duration: activityMetricsService.formatDuration(elapsedTime),
        speed: activityMetricsService.formatSpeed(speed),
        elevation: activityMetricsService.formatElevation(session.totalElevationGain),
      });
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

    if (session && session.totalDistance > 50) { // Minimum 50 meters for cycling
      showWorkoutSummary(session);
    } else {
      resetMetrics();
    }
  };

  const showWorkoutSummary = (session: EnhancedTrackingSession) => {
    const avgSpeed = activityMetricsService.calculateSpeed(session.totalDistance, elapsedTime);
    const calories = activityMetricsService.estimateCalories('cycling', session.totalDistance, elapsedTime);

    Alert.alert(
      'Ride Complete! 🚴',
      `Distance: ${activityMetricsService.formatDistance(session.totalDistance)}\n` +
      `Duration: ${activityMetricsService.formatDuration(elapsedTime)}\n` +
      `Avg Speed: ${activityMetricsService.formatSpeed(avgSpeed)}\n` +
      `Elevation: ${activityMetricsService.formatElevation(session.totalElevationGain)}\n` +
      `Calories: ${calories} cal`,
      [
        { text: 'Discard', style: 'cancel' },
        { text: 'Save', onPress: () => saveWorkout(session) },
      ]
    );

    resetMetrics();
  };

  const saveWorkout = async (session: EnhancedTrackingSession) => {
    try {
      const hexPrivKey = await AsyncStorage.getItem('@runstr:user_privkey_hex');
      const npub = await AsyncStorage.getItem('@runstr:npub');

      if (!hexPrivKey) {
        Alert.alert('Error', 'No user key found. Please login first.');
        return;
      }

      const workoutId = `workout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const publishableWorkout: PublishableWorkout = {
        id: workoutId,
        userId: npub || 'unknown',
        type: 'cycling',
        startTime: new Date(Date.now() - (elapsedTime * 1000)).toISOString(),
        endTime: new Date().toISOString(),
        duration: elapsedTime,
        distance: session.totalDistance,
        calories: activityMetricsService.estimateCalories('cycling', session.totalDistance, elapsedTime),
        source: 'activity_tracker',
        sourceApp: 'RUNSTR',
        elevationGain: session.totalElevationGain,
        unitSystem: 'metric',
        canSyncToNostr: true,
        metadata: {
          title: 'Cycling Workout',
          sourceApp: 'RUNSTR',
          notes: `Tracked ${(session.totalDistance / 1000).toFixed(2)}km ride`,
        },
        pace: activityMetricsService.calculatePace(session.totalDistance, elapsedTime),
      };

      console.log('🔄 Publishing cycling workout to Nostr...');

      const result = await workoutPublishingService.saveWorkoutToNostr(
        publishableWorkout,
        hexPrivKey,
        npub || 'unknown'
      );

      if (result.success) {
        console.log('✅ Ride saved to Nostr:', result.eventId);
        Alert.alert(
          'Success! 🎉',
          `Your ride has been saved to Nostr!\n\nEvent ID: ${result.eventId?.slice(0, 8)}...`,
          [
            { text: 'OK' },
            {
              text: 'Share',
              onPress: async () => {
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
                  Alert.alert('Shared!', 'Your ride has been posted to your Nostr feed!');
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', `Failed to save ride: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error saving ride:', error);
      Alert.alert('Error', 'Failed to save ride to Nostr');
    }
  };

  const resetMetrics = () => {
    setMetrics({
      distance: '0.00 km',
      duration: '0:00',
      speed: '0.0 km/h',
      elevation: '0 m',
    });
    setElapsedTime(0);
    setCurrentSpeed(0);
  };

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
            RUNSTR needs location access to track your cycling activities accurately.
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
    <BaseTrackerComponent
      metrics={{
        primary: { label: 'Distance', value: metrics.distance, icon: 'navigate' },
        secondary: { label: 'Duration', value: metrics.duration, icon: 'time' },
        tertiary: { label: 'Speed', value: metrics.speed, icon: 'speedometer' },
        quaternary: { label: 'Elevation', value: metrics.elevation, icon: 'trending-up' },
      }}
      isTracking={isTracking}
      isPaused={isPaused}
      onStart={startTracking}
      onPause={pauseTracking}
      onResume={resumeTracking}
      onStop={stopTracking}
      startButtonText="Start Ride"
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
});