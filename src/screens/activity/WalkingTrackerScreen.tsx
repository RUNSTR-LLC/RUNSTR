/**
 * WalkingTrackerScreen - Walking activity tracker with step estimation
 * Displays distance, time, steps, and elevation
 */

import React, { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { BaseTrackerComponent } from '../../components/activity/BaseTrackerComponent';
import { enhancedLocationTrackingService } from '../../services/activity/EnhancedLocationTrackingService';
import { activityMetricsService } from '../../services/activity/ActivityMetricsService';
import type { EnhancedTrackingSession } from '../../services/activity/EnhancedLocationTrackingService';
import workoutPublishingService from '../../services/nostr/workoutPublishingService';
import type { PublishableWorkout } from '../../services/nostr/workoutPublishingService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const WalkingTrackerScreen: React.FC = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [metrics, setMetrics] = useState({
    distance: '0.00 km',
    duration: '0:00',
    steps: '0',
    elevation: '0 m',
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const metricsUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (metricsUpdateRef.current) clearInterval(metricsUpdateRef.current);
    };
  }, []);

  const startTracking = async () => {
    const started = await enhancedLocationTrackingService.startTracking('walking');
    if (!started) {
      // The service will handle permission requests internally
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

    metricsUpdateRef.current = setInterval(updateMetrics, 3000); // Update every 3 seconds for walking
  };

  const updateMetrics = () => {
    const session = enhancedLocationTrackingService.getCurrentSession();
    if (session) {
      const steps = activityMetricsService.estimateSteps(session.totalDistance);

      setMetrics({
        distance: activityMetricsService.formatDistance(session.totalDistance),
        duration: activityMetricsService.formatDuration(elapsedTime),
        steps: activityMetricsService.formatSteps(steps),
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

    if (session && session.totalDistance > 10) {
      showWorkoutSummary(session);
    } else {
      resetMetrics();
    }
  };

  const showWorkoutSummary = (session: EnhancedTrackingSession) => {
    const steps = activityMetricsService.estimateSteps(session.totalDistance);
    const calories = activityMetricsService.estimateCalories('walking', session.totalDistance, elapsedTime);

    Alert.alert(
      'Walk Complete! 🚶',
      `Distance: ${activityMetricsService.formatDistance(session.totalDistance)}\n` +
      `Duration: ${activityMetricsService.formatDuration(elapsedTime)}\n` +
      `Steps: ${activityMetricsService.formatSteps(steps)}\n` +
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
        type: 'walking',
        startTime: new Date(Date.now() - (elapsedTime * 1000)).toISOString(),
        endTime: new Date().toISOString(),
        duration: elapsedTime,
        distance: session.totalDistance,
        calories: activityMetricsService.estimateCalories('walking', session.totalDistance, elapsedTime),
        source: 'manual',
        syncedAt: new Date().toISOString(),
        sourceApp: 'RUNSTR',
        elevationGain: session.totalElevationGain,
        unitSystem: 'metric',
        canSyncToNostr: true,
        metadata: {
          title: 'Walking Workout',
          sourceApp: 'RUNSTR',
          notes: `Tracked ${(session.totalDistance / 1000).toFixed(2)}km walk`,
        },
        pace: activityMetricsService.calculatePace(session.totalDistance, elapsedTime),
      };

      console.log('🔄 Publishing walking workout to Nostr...');

      const result = await workoutPublishingService.saveWorkoutToNostr(
        publishableWorkout,
        hexPrivKey,
        npub || 'unknown'
      );

      if (result.success) {
        console.log('✅ Walk saved to Nostr:', result.eventId);
        Alert.alert(
          'Success! 🎉',
          `Your walk has been saved to Nostr!\n\nEvent ID: ${result.eventId?.slice(0, 8)}...`,
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
                  Alert.alert('Shared!', 'Your walk has been posted to your Nostr feed!');
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', `Failed to save walk: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error saving walk:', error);
      Alert.alert('Error', 'Failed to save walk to Nostr');
    }
  };

  const resetMetrics = () => {
    setMetrics({
      distance: '0.00 km',
      duration: '0:00',
      steps: '0',
      elevation: '0 m',
    });
    setElapsedTime(0);
  };

  useEffect(() => {
    if (isTracking && !isPaused) {
      updateMetrics();
    }
  }, [elapsedTime]);

  return (
    <BaseTrackerComponent
      metrics={{
        primary: { label: 'Distance', value: metrics.distance, icon: 'navigate' },
        secondary: { label: 'Duration', value: metrics.duration, icon: 'time' },
        tertiary: { label: 'Steps', value: metrics.steps, icon: 'walk' },
        quaternary: { label: 'Elevation', value: metrics.elevation, icon: 'trending-up' },
      }}
      isTracking={isTracking}
      isPaused={isPaused}
      onStart={startTracking}
      onPause={pauseTracking}
      onResume={resumeTracking}
      onStop={stopTracking}
      startButtonText="Start Walk"
    />
  );
};