/**
 * RunningTrackerScreen - Real-time running tracker
 * Displays distance, time, pace, and elevation with GPS tracking
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, ScrollView, InteractionManager, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { CustomAlert } from '../../components/ui/CustomAlert';
import { simpleRunTracker } from '../../services/activity/SimpleRunTracker';
import { useStartCountdown } from '../../hooks/useStartCountdown';
import type {
  RunSession,
} from '../../services/activity/SimpleRunTracker';
import type { Split } from '../../services/activity/SplitTrackingService';
import { activityMetricsService } from '../../services/activity/ActivityMetricsService';
import { BatteryWarning } from '../../components/activity/BatteryWarning';
import { WorkoutSummaryModal } from '../../components/activity/WorkoutSummaryModal';
import LocalWorkoutStorageService from '../../services/fitness/LocalWorkoutStorageService';
import { HoldToStartButton } from '../../components/activity/HoldToStartButton';
import { TrackerControls } from '../../components/activity/TrackerControls';
import { useLiveRunMetrics, formatElapsedTime } from './useLiveRunMetrics';
import { useActiveRunGuard } from './useActiveRunGuard';
// New redesigned components
import { HeroMetric } from '../../components/activity/HeroMetric';
import {
  SecondaryMetricRow,
  type SecondaryMetric,
} from '../../components/activity/SecondaryMetricRow';
import { SplitsBar } from '../../components/activity/SplitsBar';
import { CountdownOverlay } from '../../components/activity/CountdownOverlay';
// Debug overlays for GPS and step diagnosis
import { ActivityDebugOverlay } from '../../components/debug/ActivityDebugOverlay';
import { StepDebugOverlay } from '../../components/debug/StepDebugOverlay';


// DEBUG MODE - Set to true for debug APK builds, false for production
const DEBUG_MODE = false;

// Constants
const MIN_WORKOUT_DISTANCE_METERS = 10; // Minimum distance to show workout summary

interface RunningTrackerScreenProps {
  onWorkoutStateChange?: (isActive: boolean) => void;
}

export const RunningTrackerScreen: React.FC<RunningTrackerScreenProps> = ({
  onWorkoutStateChange,
}) => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation('profile');
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const { countdown, start: startCountdown } = useStartCountdown(() =>
    proceedWithTracking()
  );
  const [workoutData, setWorkoutData] = useState<{
    type: 'running';
    distance: number;
    duration: number;
    calories: number;
    elevation?: number;
    pace?: number;
    splits?: Split[];
    localWorkoutId?: string; // Absent when the local save failed
  } | null>(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }>;
  }>({
    title: '',
    message: '',
    buttons: [],
  });

  const isTrackingRef = useRef<boolean>(false); // Track isTracking without re-subscribing
  const isPausedRef = useRef<boolean>(false); // CRITICAL FIX: Track isPaused for beforeRemove listener
  // Live metrics interval + foreground sync + zombie-interval liveness check
  const {
    metrics,
    elapsedTime,
    updateMetrics,
    startMetricsInterval,
    stopMetricsInterval,
    resetMetrics,
  } = useLiveRunMetrics(isTracking, isTrackingRef);

  // CRITICAL FIX: Keep refs in sync with state for beforeRemove listener
  // This prevents stale closure issues after 30+ minutes of state changes
  useEffect(() => {
    isTrackingRef.current = isTracking;
    isPausedRef.current = isPaused;
  }, [isTracking, isPaused]);

  // Notify parent when workout state changes (for swipe navigation lock)
  useEffect(() => {
    onWorkoutStateChange?.(isTracking && !isPaused);
  }, [isTracking, isPaused, onWorkoutStateChange]);

  // Confirm before navigating away from an active (unpaused) run
  useActiveRunGuard(navigation, isTrackingRef, isPausedRef, () => setIsTracking(false));

  // Check for active session on mount (fixes session loss on app switch)
  // Also handles auto-recovery of interrupted workouts
  useEffect(() => {
    // ✅ PERFORMANCE FIX: Defer session restoration until after navigation completes
    // This eliminates 7-second blocking from AsyncStorage reads and GPS point processing
    InteractionManager.runAfterInteractions(() => {
      const restoreActiveSession = async () => {
        console.log('[RunningTrackerScreen] Checking for active session (deferred for performance)...');

        // First try to restore an active session (user switched apps and came back)
        const restored = await simpleRunTracker.restoreSession();

        if (restored) {
          // Session was restored - update UI state
          setIsTracking(true);
          setIsPaused(simpleRunTracker.isCurrentlyPaused());

          // Start metrics update interval
          updateMetrics(); // Call immediately
          startMetricsInterval();

          console.log('[RunningTrackerScreen] Active session restored');
          return;
        }

        // If no active session, try auto-recovery (app was killed/crashed)
        // Only for running activity type
        const autoRecoveryResult = await simpleRunTracker.checkAndAutoRecover();

        if (autoRecoveryResult.recovered && autoRecoveryResult.checkpoint) {
          const { checkpoint } = autoRecoveryResult;

          // Only auto-recover running workouts on this screen
          if (checkpoint.activityType !== 'running') {
            console.log(
              `[RunningTrackerScreen] Auto-recovery checkpoint is for ${checkpoint.activityType}, skipping`
            );
            return;
          }

          // Update UI state to reflect recovered workout
          setIsTracking(true);
          setIsPaused(false);

          // Start metrics update interval
          updateMetrics(); // Call immediately
          startMetricsInterval();

          // Show toast notification
          setAlertConfig({
            title: 'Workout Resumed',
            message: `Recovered ${(checkpoint.distance / 1000).toFixed(2)} km run that was interrupted.`,
            buttons: [{ text: 'OK', style: 'default' }],
          });
          setAlertVisible(true);

          console.log(
            `[RunningTrackerScreen] ✅ Auto-recovered workout: ${(
              checkpoint.distance / 1000
            ).toFixed(2)} km`
          );
        }
      };

      restoreActiveSession();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleHoldComplete = async () => {
    console.log('[RunningTrackerScreen] Hold complete, starting countdown...');
    // Countdown timers are cleared on unmount by useStartCountdown, so an
    // interrupted countdown can't start a phantom tracking session.
    startCountdown();
  };

  const proceedWithTracking = async () => {
    try {
      // Start tracking with SimpleRunTracker
      await simpleRunTracker.startTracking('running');
      initializeTracking();
    } catch (error) {
      // Get detailed error message from service
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Show detailed error with helpful context
      setAlertConfig({
        title: 'Cannot Start Tracking',
        message: errorMessage,
        buttons: [
          { text: 'OK', style: 'default' },
          ...(Platform.OS === 'android'
            ? [
                {
                  text: 'Settings',
                  style: 'default' as const,
                  onPress: () => {
                    // Open Android app settings
                    const { Linking } = require('react-native');
                    Linking.openSettings();
                  },
                },
              ]
            : []),
        ],
      });
      setAlertVisible(true);
      console.error('[RunningTrackerScreen] Failed to start tracking:', errorMessage);
    }
  };

  const initializeTracking = () => {
    setIsTracking(true);
    setIsPaused(false);

    // Start metrics update timer - SimpleRunTracker handles all timing internally
    // Call once immediately (fixes "duration doesn't move on start" bug)
    updateMetrics();
    startMetricsInterval();
  };

  const pauseTracking = async () => {
    if (!isPaused) {
      try {
        await simpleRunTracker.pauseTracking();
        setIsPaused(true);
      } catch (error) {
        console.error('[RunningTrackerScreen] Failed to pause tracking:', error);
        setAlertConfig({
          title: 'Pause Failed',
          message: 'Could not pause tracking. Please try again.',
          buttons: [{ text: 'OK', style: 'default' }],
        });
        setAlertVisible(true);
      }
    }
  };

  const resumeTracking = async () => {
    if (isPaused) {
      try {
        await simpleRunTracker.resumeTracking();
        setIsPaused(false);
      } catch (error) {
        console.error('[RunningTrackerScreen] Failed to resume tracking:', error);
        setAlertConfig({
          title: 'Resume Failed',
          message: 'Could not resume tracking. Please try again.',
          buttons: [{ text: 'OK', style: 'default' }],
        });
        setAlertVisible(true);
      }
    }
  };

  const stopTracking = async () => {
    stopMetricsInterval();

    try {
      const session = await simpleRunTracker.stopTracking();
      setIsTracking(false);
      setIsPaused(false);

      if (
        session &&
        session.distance !== undefined &&
        session.distance > MIN_WORKOUT_DISTANCE_METERS
      ) {
        // Only show summary if moved at least 10 meters
        showWorkoutSummary(session as RunSession);
      } else {
        resetMetrics();
      }
    } catch (error) {
      console.error('[RunningTrackerScreen] Failed to stop tracking:', error);
      setAlertConfig({
        title: 'Stop Failed',
        message: 'Could not stop tracking safely. Your run is still active.',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setAlertVisible(true);
      // Ensure UI remains in active state when stop fails
      setIsTracking(true);
    }
  };

  const showWorkoutSummary = async (session: RunSession) => {
    const calories = activityMetricsService.estimateCalories(
      'running',
      session.distance,
      session.duration
    );
    const pace = activityMetricsService.calculatePace(
      session.distance,
      session.duration
    );

    const summary = {
      type: 'running' as const,
      distance: session.distance,
      duration: session.duration,
      calories,
      elevation: session.elevationGain || 0,
      pace,
      splits: session.splits,
    };

    // Save workout to local storage BEFORE showing the modal, so the run
    // persists even if the user dismisses it
    try {
      // Start position for the weather lookup (may be undefined in memory-only mode)
      const startPosition = session.gpsPoints?.[0];
      const result = await LocalWorkoutStorageService.saveGPSWorkout({
        ...summary,
        startLatitude: startPosition?.latitude,
        startLongitude: startPosition?.longitude,
      });
      console.log(`[RunningTracker] GPS workout saved locally: ${result.workoutId}`);
      setWorkoutData({ ...summary, localWorkoutId: result.workoutId });
    } catch (error) {
      // Still show the summary; without a localWorkoutId it reports the failed save
      console.error('❌ Failed to save workout locally:', error);
      setWorkoutData(summary);
    }
    setSummaryModalVisible(true);
    resetMetrics();
  };

  // Prepare splits for SplitsBar
  const formattedSplits =
    simpleRunTracker.getCurrentSession()?.splits?.map((split: Split) => ({
      km: split.number, // Split number (1, 2, 3, etc.)
      time: activityMetricsService.formatDuration(Math.round(split.splitTime)),
    })) || [];

  // Prepare secondary metrics
  const secondaryMetrics: SecondaryMetric[] = [
    {
      value: metrics.pace ?? '--:--',
      label: 'Pace',
      icon: 'speedometer',
    },
    {
      value: metrics.elevation ?? '0 m',
      label: 'Elevation',
      icon: 'trending-up',
    },
  ];

  // Parse distance value for HeroMetric (remove "km" suffix)
  const distanceValue = metrics.distance.replace(' km', '');

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        {/* IDLE STATE - Minimalist centered start button */}
        {!isTracking && !countdown && (
          <View style={styles.idleCenteredContainer}>
            <HoldToStartButton
              label={t('startRun')}
              onHoldComplete={handleHoldComplete}
              disabled={false}
              holdDuration={2000}
              size="large"
            />
          </View>
        )}

      {/* ACTIVE TRACKING STATE */}
      {isTracking && (
        <ScrollView
          style={styles.scrollableContent}
          contentContainerStyle={styles.trackingScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Battery Warning */}
          <BatteryWarning />

          {/* Hero Metrics - Distance + Duration (stacked, large) */}
          <HeroMetric
            primaryValue={distanceValue}
            primaryUnit="km"
            secondaryValue={formatElapsedTime(elapsedTime)}
          />

          {/* Secondary Metrics - Pace + Elevation */}
          <SecondaryMetricRow metrics={secondaryMetrics} />

          {/* Splits Bar */}
          <SplitsBar splits={formattedSplits} isVisible={formattedSplits.length > 0} />
        </ScrollView>
      )}

      {/* Countdown Overlay */}
      <CountdownOverlay countdown={countdown} />

      {/* Fixed Control Buttons - Only show when tracking */}
      {isTracking && (
        <TrackerControls
          isPaused={isPaused}
          onPause={pauseTracking}
          onResume={resumeTracking}
          onStop={stopTracking}
        />
      )}

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

      {/* Custom Alert Modal */}
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertVisible(false)}
      />

      </View>

      {/* Debug Overlay - GPS death diagnosis (only in DEBUG_MODE and while tracking) */}
      {DEBUG_MODE && isTracking && <ActivityDebugOverlay />}

      {/* Step Debug Overlay - Android-only diagnostic panel */}
      <StepDebugOverlay />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // parent gradient shows through (no lighter box)
  },
  contentContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 16,
  },
  scrollableContent: {
    flex: 1,
  },
  idleCenteredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 120, // Shift button up from true center
  },
  trackingScrollContent: {
    paddingTop: 12,
    paddingBottom: 180,
  },
});
