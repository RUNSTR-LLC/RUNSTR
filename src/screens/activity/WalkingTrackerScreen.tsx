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
import { WorkoutSummaryModal } from '../../components/activity/WorkoutSummaryModal';
import LocalWorkoutStorageService from '../../services/fitness/LocalWorkoutStorageService';

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
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [workoutData, setWorkoutData] = useState<{
    type: 'running' | 'walking' | 'cycling';
    distance: number;
    duration: number;
    calories: number;
    elevation?: number;
    steps?: number;
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
    // Health check: Detect and cleanup zombie sessions before starting
    const currentState = enhancedLocationTrackingService.getTrackingState();
    if (currentState !== 'idle' && currentState !== 'requesting_permissions') {
      console.log('⚠️ Detected non-idle state before start:', currentState);

      // Check if there's an active session
      const existingSession = enhancedLocationTrackingService.getCurrentSession();

      if (existingSession) {
        // Check if session is stale (older than 4 hours = definitely zombie)
        const sessionAge = Date.now() - existingSession.startTime;
        const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

        if (sessionAge > FOUR_HOURS_MS) {
          console.log(`🔧 Auto-cleanup: Removing stale zombie session (age: ${(sessionAge / 1000 / 60).toFixed(0)} min)`);
          Alert.alert(
            'Cleaning Up',
            'Found and removed a stale activity session. You can now start a new activity.',
            [{ text: 'OK' }]
          );
          // Service will auto-cleanup via forceCleanup in startTracking
        } else {
          // Session is recent, might be legitimate
          Alert.alert(
            'Active Session Detected',
            'There appears to be an active session. Would you like to clean it up and start fresh?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Clean Up',
                onPress: async () => {
                  console.log('🔧 User requested cleanup of existing session');
                  // Let the service handle cleanup via forceCleanup
                  const retryStarted = await enhancedLocationTrackingService.startTracking('walking');
                  if (retryStarted) {
                    // Continue with normal initialization below
                    initializeTracking();
                  }
                }
              }
            ]
          );
          return;
        }
      }
    }

    const started = await enhancedLocationTrackingService.startTracking('walking');
    if (!started) {
      // The service will handle permission requests internally
      // Show error if tracking service is in invalid state
      const finalState = enhancedLocationTrackingService.getTrackingState();
      if (finalState !== 'idle' && finalState !== 'requesting_permissions') {
        Alert.alert(
          'Cannot Start Tracking',
          'Unable to start activity tracking. Please try again or restart the app if the issue persists.',
          [{ text: 'OK' }]
        );
      }
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

    metricsUpdateRef.current = setInterval(updateMetrics, 1000); // Update every second for consistent UX across activities
  };

  const updateMetrics = () => {
    const session = enhancedLocationTrackingService.getCurrentSession();
    if (session) {
      // Use interpolated distance for smooth UI updates between GPS points
      const displayDistance = enhancedLocationTrackingService.getInterpolatedDistance();
      const steps = activityMetricsService.estimateSteps(displayDistance);

      setMetrics({
        distance: activityMetricsService.formatDistance(displayDistance),
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
      isPausedRef.current = true;
      pauseStartTimeRef.current = Date.now();  // Store when pause started
    }
  };

  const resumeTracking = async () => {
    if (isPaused) {
      const pauseDuration = Date.now() - pauseStartTimeRef.current;  // Calculate how long we were paused
      totalPausedTimeRef.current += pauseDuration;  // Add to cumulative total
      await enhancedLocationTrackingService.resumeTracking();
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

    const session = await enhancedLocationTrackingService.stopTracking();
    setIsTracking(false);
    setIsPaused(false);

    if (session && session.totalDistance > 10) {
      showWorkoutSummary(session);
    } else {
      resetMetrics();
    }
  };

  const showWorkoutSummary = async (session: EnhancedTrackingSession) => {
    const steps = activityMetricsService.estimateSteps(session.totalDistance);
    const calories = activityMetricsService.estimateCalories('walking', session.totalDistance, elapsedTime);

    // Save workout to local storage BEFORE showing modal
    try {
      const workoutId = await LocalWorkoutStorageService.saveGPSWorkout({
        type: 'walking',
        distance: session.totalDistance,
        duration: elapsedTime,
        calories,
        elevation: session.totalElevationGain,
      });

      console.log(`✅ Walking workout saved locally: ${workoutId}`);

      setWorkoutData({
        type: 'walking',
        distance: session.totalDistance,
        duration: elapsedTime,
        calories,
        elevation: session.totalElevationGain,
        steps,
        localWorkoutId: workoutId,
      });
      setSummaryModalVisible(true);
    } catch (error) {
      console.error('❌ Failed to save walking workout locally:', error);
      // Still show modal even if save failed
      setWorkoutData({
        type: 'walking',
        distance: session.totalDistance,
        duration: elapsedTime,
        calories,
        elevation: session.totalElevationGain,
        steps,
      });
      setSummaryModalVisible(true);
    }

    resetMetrics();
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
    <>
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