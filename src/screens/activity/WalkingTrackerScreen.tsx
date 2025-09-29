/**
 * WalkingTrackerScreen - Walking activity tracker with step estimation
 * Displays distance, time, steps, and elevation
 */

import React, { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { BaseTrackerComponent } from '../../components/activity/BaseTrackerComponent';
import { locationTrackingService } from '../../services/activity/LocationTrackingService';
import { activityMetricsService } from '../../services/activity/ActivityMetricsService';
import type { TrackingSession } from '../../services/activity/LocationTrackingService';

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
    const started = await locationTrackingService.startTracking('walking');
    if (!started) {
      Alert.alert(
        'Permission Required',
        'Location permission is required to track your walk. Please enable it in settings.',
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

    metricsUpdateRef.current = setInterval(updateMetrics, 3000); // Update every 3 seconds for walking
  };

  const updateMetrics = () => {
    const session = locationTrackingService.getCurrentSession();
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

  const pauseTracking = () => {
    if (!isPaused) {
      locationTrackingService.pauseTracking();
      setIsPaused(true);
      pausedDurationRef.current = Date.now();
    }
  };

  const resumeTracking = () => {
    if (isPaused) {
      const pauseDuration = Date.now() - pausedDurationRef.current;
      pausedDurationRef.current += pauseDuration;
      locationTrackingService.resumeTracking();
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

    const session = await locationTrackingService.stopTracking();
    setIsTracking(false);
    setIsPaused(false);

    if (session && session.totalDistance > 10) {
      showWorkoutSummary(session);
    } else {
      resetMetrics();
    }
  };

  const showWorkoutSummary = (session: TrackingSession) => {
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

  const saveWorkout = async (session: TrackingSession) => {
    // TODO: Integrate with WorkoutPublishingService
    console.log('Saving walk:', session);
    Alert.alert('Success', 'Your walk has been saved!');
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