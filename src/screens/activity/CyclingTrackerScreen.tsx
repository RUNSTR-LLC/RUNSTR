/**
 * CyclingTrackerScreen - Cycling activity tracker with speed metrics
 * Displays distance, time, speed, and elevation
 */

import React, { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { BaseTrackerComponent } from '../../components/activity/BaseTrackerComponent';
import { simpleLocationTrackingService } from '../../services/activity/SimpleLocationTrackingService';
import { activityMetricsService } from '../../services/activity/ActivityMetricsService';
import type { TrackingSession } from '../../services/activity/SimpleLocationTrackingService';
import { WorkoutSummaryModal } from '../../components/activity/WorkoutSummaryModal';
import LocalWorkoutStorageService from '../../services/fitness/LocalWorkoutStorageService';

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
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [workoutData, setWorkoutData] = useState<{
    type: 'running' | 'walking' | 'cycling';
    distance: number;
    duration: number;
    calories: number;
    elevation?: number;
    speed?: number;
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
      if (timerRef.current) clearInterval(timerRef.current);
      if (metricsUpdateRef.current) clearInterval(metricsUpdateRef.current);
    };
  }, []);

  const startTracking = async () => {
    console.log('[CyclingTrackerScreen] Starting tracking...');

    // Simple permission and start flow
    const started = await simpleLocationTrackingService.startTracking('cycling');
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

    timerRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        const now = Date.now();
        const totalElapsed = Math.floor((now - startTimeRef.current - totalPausedTimeRef.current) / 1000);
        setElapsedTime(totalElapsed);
      }
    }, 1000);

    metricsUpdateRef.current = setInterval(updateMetrics, 1000); // Update every second for speed
  };

  const updateMetrics = () => {
    const session = simpleLocationTrackingService.getCurrentSession();
    if (session) {
      // Calculate current speed based on distance and time
      let speed = activityMetricsService.calculateSpeed(session.distance, elapsedTime);

      setCurrentSpeed(speed);
      setMetrics({
        distance: activityMetricsService.formatDistance(session.distance),
        duration: activityMetricsService.formatDuration(elapsedTime),
        speed: activityMetricsService.formatSpeed(speed),
        elevation: activityMetricsService.formatElevation(session.elevationGain),
      });
    }
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

    if (session && session.distance > 50) { // Minimum 50 meters for cycling
      showWorkoutSummary(session);
    } else {
      resetMetrics();
    }
  };

  const showWorkoutSummary = async (session: TrackingSession) => {
    const avgSpeed = activityMetricsService.calculateSpeed(session.distance, elapsedTime);
    const calories = activityMetricsService.estimateCalories('cycling', session.distance, elapsedTime);

    // Save workout to local storage BEFORE showing modal
    try {
      const workoutId = await LocalWorkoutStorageService.saveGPSWorkout({
        type: 'cycling',
        distance: session.distance,
        duration: elapsedTime,
        calories,
        elevation: session.elevationGain,
        speed: avgSpeed,
      });

      console.log(`✅ Cycling workout saved locally: ${workoutId}`);

      setWorkoutData({
        type: 'cycling',
        distance: session.distance,
        duration: elapsedTime,
        calories,
        elevation: session.elevationGain,
        speed: avgSpeed,
        localWorkoutId: workoutId,
      });
      setSummaryModalVisible(true);
    } catch (error) {
      console.error('❌ Failed to save cycling workout locally:', error);
      // Still show modal even if save failed
      setWorkoutData({
        type: 'cycling',
        distance: session.distance,
        duration: elapsedTime,
        calories,
        elevation: session.elevationGain,
        speed: avgSpeed,
      });
      setSummaryModalVisible(true);
    }

    resetMetrics();
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

  return (
    <>
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
    </>
  );
};