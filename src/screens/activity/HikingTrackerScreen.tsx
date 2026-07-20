/**
 * HikingTrackerScreen - GPS-based hiking tracker
 * Displays distance, time, elevation, and calories
 * Based on WalkingTrackerScreen but focused on GPS tracking without step counting
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Platform,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AppState,
  AppStateStatus,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { CustomAlert } from '../../components/ui/CustomAlert';
import { simpleRunTracker } from '../../services/activity/SimpleRunTracker';
import { useStartCountdown } from '../../hooks/useStartCountdown';
import { activityMetricsService } from '../../services/activity/ActivityMetricsService';
import type { RunSession } from '../../services/activity/SimpleRunTracker';
import { WorkoutSummaryModal } from '../../components/activity/WorkoutSummaryModal';
import LocalWorkoutStorageService from '../../services/fitness/LocalWorkoutStorageService';
import { RouteSelectionModal } from '../../components/routes/RouteSelectionModal';
import routeStorageService from '../../services/routes/RouteStorageService';
import { HoldToStartButton } from '../../components/activity/HoldToStartButton';
import { HeroMetric } from '../../components/activity/HeroMetric';
import {
  SecondaryMetricRow,
  type SecondaryMetric,
} from '../../components/activity/SecondaryMetricRow';
import { CountdownOverlay } from '../../components/activity/CountdownOverlay';
import { ControlBar } from '../../components/activity/ControlBar';
import { theme } from '../../styles/theme';
import { StepDebugOverlay } from '../../components/debug/StepDebugOverlay';

interface HikingTrackerScreenProps {
  onWorkoutStateChange?: (isActive: boolean) => void;
}

export const HikingTrackerScreen: React.FC<HikingTrackerScreenProps> = ({
  onWorkoutStateChange,
}) => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation('profile');
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [metrics, setMetrics] = useState({
    distance: '0.00 km',
    duration: '0:00',
    elevation: '0 m',
    calories: '0',
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [selectedRoute, setSelectedRoute] = useState<{ id: string; name: string } | null>(null);
  const [routeSelectionVisible, setRouteSelectionVisible] = useState(false);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [workoutData, setWorkoutData] = useState<{
    type: 'running' | 'walking' | 'cycling' | 'hiking';
    distance: number;
    duration: number;
    calories: number;
    elevation?: number;
    steps?: number;
    localWorkoutId?: string;
    routeId?: string;
    routeName?: string;
    rewardSent?: boolean;
    rewardAmount?: number;
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
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const metricsUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<number>(0);
  const totalPausedTimeRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);
  const isTrackingRef = useRef<boolean>(false);

  const { countdown, start: startCountdown } = useStartCountdown(() =>
    startTracking()
  );

  // Keep refs in sync with state
  useEffect(() => {
    isTrackingRef.current = isTracking;
    isPausedRef.current = isPaused;
  }, [isTracking, isPaused]);

  // Notify parent when workout state changes (for swipe navigation lock)
  useEffect(() => {
    onWorkoutStateChange?.(isTracking && !isPaused);
  }, [isTracking, isPaused, onWorkoutStateChange]);

  // Prevent navigation away during active tracking
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (!isTrackingRef.current || isPausedRef.current) {
        return;
      }

      e.preventDefault();

      setAlertConfig({
        title: 'Stop Tracking?',
        message: 'You have an active hike. Do you want to stop and discard it?',
        buttons: [
          { text: 'Continue Hike', style: 'cancel' },
          {
            text: 'Stop & Discard',
            style: 'destructive',
            onPress: async () => {
              await simpleRunTracker.stopTracking();
              setIsTracking(false);
              isTrackingRef.current = false;
              isPausedRef.current = false;
              navigation.dispatch(e.data.action);
            },
          },
        ],
      });
      setAlertVisible(true);
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (metricsUpdateRef.current) clearInterval(metricsUpdateRef.current);
    };
  }, []);

  // Auto-recovery for interrupted workouts
  useEffect(() => {
    const checkAutoRecovery = async () => {
      if (isTracking) return;

      const restored = await simpleRunTracker.restoreSession();
      if (restored) {
        setIsTracking(true);
        setIsPaused(simpleRunTracker.isCurrentlyPaused());

        const session = simpleRunTracker.getCurrentSession();
        if (session) {
          setElapsedTime(session.duration || 0);
          const distance = session.distance || 0;
          setMetrics({
            distance: `${(distance / 1000).toFixed(2)} km`,
            duration: formatElapsedTime(session.duration || 0),
            elevation: `${Math.round(session.elevationGain || 0)} m`,
            calories: `${activityMetricsService.estimateCalories('walking', distance, session.duration || 0)}`,
          });
        }
        return;
      }

      const autoRecoveryResult = await simpleRunTracker.checkAndAutoRecover();
      if (autoRecoveryResult.recovered && autoRecoveryResult.checkpoint) {
        const { checkpoint } = autoRecoveryResult;

        // Only recover hiking workouts
        if (checkpoint.activityType !== 'hiking') {
          return;
        }

        setIsTracking(true);
        setIsPaused(false);
        setElapsedTime(checkpoint.duration);
        setMetrics({
          distance: `${(checkpoint.distance / 1000).toFixed(2)} km`,
          duration: formatElapsedTime(checkpoint.duration),
          elevation: '0 m',
          calories: `${activityMetricsService.estimateCalories('walking', checkpoint.distance, checkpoint.duration)}`,
        });

        startTimeRef.current = Date.now() - checkpoint.duration * 1000;
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          if (!isPausedRef.current) {
            const now = Date.now();
            const elapsed = Math.floor(
              (now - startTimeRef.current - totalPausedTimeRef.current) / 1000
            );
            setElapsedTime(elapsed);
          }
        }, 1000);

        setAlertConfig({
          title: 'Hike Resumed',
          message: `Recovered ${(checkpoint.distance / 1000).toFixed(2)} km hike that was interrupted.`,
          buttons: [{ text: 'OK', style: 'default' }],
        });
        setAlertVisible(true);
      }
    };

    checkAutoRecovery();

    return () => {
      // Clean up any interval started by auto-recovery
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const formatElapsedTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // AppState listener for background/foreground transitions
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isTrackingRef.current) {
        const session = simpleRunTracker.getCurrentSession();
        if (session) {
          const now = Date.now();
          const currentElapsed = Math.floor(
            (now - startTimeRef.current - totalPausedTimeRef.current) / 1000
          );

          const distance = session.distance || 0;
          const calories = activityMetricsService.estimateCalories('walking', distance, currentElapsed);

          setMetrics({
            distance: activityMetricsService.formatDistance(distance),
            duration: activityMetricsService.formatDuration(currentElapsed),
            elevation: activityMetricsService.formatElevation(session.elevationGain || 0),
            calories: calories.toString(),
          });
          setElapsedTime(currentElapsed);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const handleHoldComplete = async () => {
    // Countdown timers are cleared on unmount by useStartCountdown, so an
    // interrupted countdown can't start a phantom tracking session.
    startCountdown();
  };

  const startTracking = async () => {
    try {
      const started = await simpleRunTracker.startTracking('hiking');
      if (started) {
        initializeTracking();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

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
                    const { Linking } = require('react-native');
                    Linking.openSettings();
                  },
                },
              ]
            : []),
        ],
      });
      setAlertVisible(true);
    }
  };

  const initializeTracking = async () => {
    setIsTracking(true);
    setIsPaused(false);
    isPausedRef.current = false;
    startTimeRef.current = Date.now();
    pauseStartTimeRef.current = 0;
    totalPausedTimeRef.current = 0;

    timerRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        const now = Date.now();
        const totalElapsed = Math.floor(
          (now - startTimeRef.current - totalPausedTimeRef.current) / 1000
        );
        setElapsedTime(totalElapsed);
      }
    }, 1000);

    metricsUpdateRef.current = setInterval(updateMetrics, 5000);
  };

  const updateMetrics = async () => {
    const session = simpleRunTracker.getCurrentSession();
    if (session) {
      const distance = session.distance || 0;
      const duration = session.duration || 0;
      const calories = activityMetricsService.estimateCalories('walking', distance, duration);

      setMetrics(prev => ({
        ...prev,
        distance: activityMetricsService.formatDistance(distance),
        duration: activityMetricsService.formatDuration(duration),
        elevation: activityMetricsService.formatElevation(session.elevationGain || 0),
        calories: calories.toString(),
      }));
    }
  };

  const pauseTracking = async () => {
    if (!isPaused) {
      await simpleRunTracker.pauseTracking();
      setIsPaused(true);
      isPausedRef.current = true;
      pauseStartTimeRef.current = Date.now();
    }
  };

  const resumeTracking = async () => {
    if (isPaused) {
      const pauseDuration = Date.now() - pauseStartTimeRef.current;
      totalPausedTimeRef.current += pauseDuration;
      await simpleRunTracker.resumeTracking();
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

    const session = await simpleRunTracker.stopTracking();
    setIsTracking(false);
    setIsPaused(false);

    if (session && session.distance > 0) {
      showWorkoutSummary(session);
    } else {
      resetMetrics();
    }
  };

  const showWorkoutSummary = async (session: RunSession) => {
    const steps = activityMetricsService.estimateSteps(session.distance);
    const finalDuration = session.duration || elapsedTime;
    const calories = activityMetricsService.estimateCalories('walking', session.distance, finalDuration);

    try {
      const result = await LocalWorkoutStorageService.saveGPSWorkout({
        type: 'hiking',
        distance: session.distance,
        duration: finalDuration,
        calories,
        elevation: session.elevationGain || 0,
        routeId: selectedRoute?.id,
        routeLabel: selectedRoute?.name,
      });

      if (selectedRoute) {
        try {
          await routeStorageService.addWorkoutToRoute(
            selectedRoute.id,
            result.workoutId,
            finalDuration,
            undefined
          );
        } catch (routeError) {
          console.error('[HikingTracker] Failed to add workout to route:', routeError);
        }
      }

      setWorkoutData({
        type: 'hiking',
        distance: session.distance,
        duration: finalDuration, // match the value persisted to history (was elapsedTime → diverged after pause/resume)
        calories,
        elevation: session.elevationGain || 0,
        steps,
        localWorkoutId: result.workoutId,
        routeId: selectedRoute?.id,
        routeName: selectedRoute?.name,
        rewardSent: result.rewardSent,
        rewardAmount: result.rewardAmount,
      });
      setSummaryModalVisible(true);
    } catch (error) {
      console.error('[HikingTracker] Failed to save workout:', error);
      setWorkoutData({
        type: 'hiking',
        distance: session.distance,
        duration: finalDuration,
        calories,
        elevation: session.elevationGain || 0,
        steps,
        routeId: selectedRoute?.id,
        routeName: selectedRoute?.name,
      });
      setSummaryModalVisible(true);
    }

    resetMetrics();
    setSelectedRoute(null);
  };

  const resetMetrics = () => {
    setMetrics({
      distance: '0.00 km',
      duration: '0:00',
      elevation: '0 m',
      calories: '0',
    });
    setElapsedTime(0);
  };

  const secondaryMetrics: SecondaryMetric[] = [
    {
      value: metrics.elevation,
      label: 'Elevation',
      icon: 'trending-up-outline',
    },
    {
      value: `${metrics.calories} cal`,
      label: 'Calories',
      icon: 'flame-outline',
    },
  ];

  const controlBarState = isTracking ? (isPaused ? 'paused' : 'tracking') : 'idle';

  return (
    <View style={styles.screenContainer}>
      <View style={styles.contentContainer}>
        <CountdownOverlay countdown={countdown} />

        {isTracking ? (
          <View style={styles.activeContainer}>
            {selectedRoute && (
              <View style={styles.routeBadge}>
                <Ionicons name="map" size={14} color={theme.colors.accent} />
                <Text style={styles.routeBadgeText}>{selectedRoute.name}</Text>
              </View>
            )}

            <View style={styles.heroSection}>
              <HeroMetric
                primaryValue={metrics.distance.replace(' km', '')}
                primaryUnit="km"
                secondaryValue={activityMetricsService.formatDuration(elapsedTime)}
              />
            </View>

            <SecondaryMetricRow metrics={secondaryMetrics} />
          </View>
        ) : (
          <View style={styles.idleCenteredContainer}>
            <HoldToStartButton
              label="Start Hike"
              onHoldComplete={handleHoldComplete}
              size="large"
            />
          </View>
        )}

        {isTracking && (
          <View style={styles.fixedControlsWrapper}>
            <ControlBar
              state={controlBarState}
              startLabel="Start Hike"
              onHoldComplete={handleHoldComplete}
              onPause={pauseTracking}
              onResume={resumeTracking}
              onStop={stopTracking}
            />
          </View>
        )}

        {workoutData && (
          <WorkoutSummaryModal
            visible={summaryModalVisible}
            onClose={() => {
              setSummaryModalVisible(false);
              setWorkoutData(null);
            }}
            workout={workoutData as any}
          />
        )}

        <CustomAlert
          visible={alertVisible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertVisible(false)}
        />

        <RouteSelectionModal
          visible={routeSelectionVisible}
          activityType="hiking"
          onSelectRoute={(routeId, routeName) => {
            setSelectedRoute({ id: routeId, name: routeName });
            setRouteSelectionVisible(false);
          }}
          onClose={() => setRouteSelectionVisible(false)}
        />
      </View>

      {/* Step Debug Overlay - Android-only diagnostic panel */}
      <StepDebugOverlay />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: 'transparent', // parent gradient shows through (no lighter box)
  },
  contentContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 16,
  },
  activeContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingBottom: 140,
  },
  idleCenteredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingBottom: 120,
  },
  fixedControlsWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  routeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: theme.colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  routeBadgeText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accent,
  },
  heroSection: {
    flex: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
});
