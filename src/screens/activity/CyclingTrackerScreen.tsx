/**
 * CyclingTrackerScreen - Cycling activity tracker with speed metrics
 * Displays distance, time, speed, and elevation
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { AppStateManager } from '../../services/core/AppStateManager';
import { CustomAlert } from '../../components/ui/CustomAlert';
import { simpleRunTracker } from '../../services/activity/SimpleRunTracker';
import { useStartCountdown } from '../../hooks/useStartCountdown';
import { activityMetricsService } from '../../services/activity/ActivityMetricsService';
import type { RunSession } from '../../services/activity/SimpleRunTracker';
import { WorkoutSummaryModal } from '../../components/activity/WorkoutSummaryModal';
import LocalWorkoutStorageService from '../../services/fitness/LocalWorkoutStorageService';
import { RouteSelectionModal } from '../../components/routes/RouteSelectionModal';
import routeStorageService from '../../services/routes/RouteStorageService';
import { theme } from '../../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Weekly distance goal components
import { DistanceGoalPickerModal } from '../../components/activity/DistanceGoalPickerModal';
import { weeklyDistanceGoalService } from '../../services/activity/WeeklyDistanceGoalService';
import type { DistanceGoalProgress } from '../../services/activity/WeeklyDistanceGoalService';
import { EnhancedSocialShareModal } from '../../components/profile/shared/EnhancedSocialShareModal';
import { nostrProfileService } from '../../services/nostr/NostrProfileService';
import type { NostrProfile } from '../../services/nostr/NostrProfileService';
import type { PublishableWorkout } from '../../services/nostr/workoutPublishingService';
// Redesigned components
import { SpeedGauge } from '../../components/activity/SpeedGauge';
import {
  SecondaryMetricRow,
  type SecondaryMetric,
} from '../../components/activity/SecondaryMetricRow';
import { CountdownOverlay } from '../../components/activity/CountdownOverlay';
import { ControlBar } from '../../components/activity/ControlBar';
import { HoldToStartButton } from '../../components/activity/HoldToStartButton';
import { StepDebugOverlay } from '../../components/debug/StepDebugOverlay';
import { formatElapsedTime } from '../../utils/workoutFormatters';

type PostingState = 'idle' | 'posting' | 'posted';

interface CyclingTrackerScreenProps {
  onWorkoutStateChange?: (isActive: boolean) => void;
}

export const CyclingTrackerScreen: React.FC<CyclingTrackerScreenProps> = ({
  onWorkoutStateChange,
}) => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation('profile');
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
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [avgSpeed, setAvgSpeed] = useState(0);
  const [selectedRoute, setSelectedRoute] = useState<{ id: string; name: string } | null>(null);
  const [routeSelectionVisible, setRouteSelectionVisible] = useState(false);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const { countdown, start: startCountdown } = useStartCountdown(() =>
    proceedWithTracking()
  );
  const [workoutData, setWorkoutData] = useState<{
    type: 'running' | 'walking' | 'cycling';
    distance: number;
    duration: number;
    calories: number;
    elevation?: number;
    speed?: number;
    localWorkoutId?: string; // For marking as synced later
    routeId?: string; // Route label ID if tagged
    routeName?: string; // Route label name for display
    rewardSent?: boolean; // True if Bitcoin reward was sent
    rewardAmount?: number; // Amount of sats rewarded
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
  // Weekly distance goal state
  const [weeklyDistance, setWeeklyDistance] = useState<number | null>(null);
  const [distanceGoal, setDistanceGoal] = useState<number>(50);
  const [distanceProgress, setDistanceProgress] =
    useState<DistanceGoalProgress | null>(null);
  const [distanceLoading, setDistanceLoading] = useState(true);
  const [distancePostingState, setDistancePostingState] =
    useState<PostingState>('idle');
  const [goalPickerVisible, setGoalPickerVisible] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [userProfile, setUserProfile] = useState<NostrProfile | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [preparedWorkout, setPreparedWorkout] =
    useState<PublishableWorkout | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const metricsUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<number>(0); // When pause started
  const totalPausedTimeRef = useRef<number>(0); // Cumulative pause duration in ms
  const isPausedRef = useRef<boolean>(false); // Ref to avoid stale closure in timer
  const isTrackingRef = useRef<boolean>(false); // Track isTracking without re-subscribing

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

  // CRITICAL: Prevent navigation away from tracker screen during active tracking
  // This fixes the bug where users were unexpectedly navigated to profile screen mid-workout
  // FIXED: Use refs instead of state to prevent race condition from listener recreation
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      // CRITICAL FIX: Use refs instead of state to avoid stale closure
      // Only prevent navigation if actively tracking (not paused, not stopped)
      if (!isTrackingRef.current || isPausedRef.current) {
        return; // Allow navigation if not tracking or paused
      }

      // Prevent the default action (navigating away)
      e.preventDefault();

      // Show confirmation dialog
      (CustomAlert as any).show({
        title: 'Stop Tracking?',
        message: 'You have an active workout. Do you want to stop and discard it?',
        buttons: [
          {
            text: 'Continue Workout',
            style: 'cancel',
          },
          {
            text: 'Stop & Discard',
            style: 'destructive',
            onPress: async () => {
              // Stop tracking and discard
              await simpleRunTracker.stopTracking();
              setIsTracking(false);
              isTrackingRef.current = false;
              isPausedRef.current = false;
              // Now allow navigation
              navigation.dispatch(e.data.action);
            },
          },
        ],
      });
    });

    return unsubscribe;
  }, [navigation]); // FIXED: Only depend on navigation, not state - refs handle state changes

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (metricsUpdateRef.current) clearInterval(metricsUpdateRef.current);
    };
  }, []);

  // Auto-recovery for interrupted workouts
  useEffect(() => {
    const checkAutoRecovery = async () => {
      // Don't recover if already tracking
      if (isTracking) return;

      console.log('[CyclingTrackerScreen] Checking for auto-recovery...');

      // First try regular session restore
      const restored = await simpleRunTracker.restoreSession();
      if (restored) {
        setIsTracking(true);
        setIsPaused(simpleRunTracker.isCurrentlyPaused());

        // Get current session data for UI
        const session = simpleRunTracker.getCurrentSession();
        if (session) {
          setElapsedTime(session.duration || 0);
          const distance = session.distance || 0;
          const avgSpd = session.duration && session.duration > 0
            ? (distance / session.duration) * 3.6
            : 0;
          setAvgSpeed(avgSpd);
          setMetrics({
            distance: `${(distance / 1000).toFixed(2)} km`,
            duration: formatElapsedTime(session.duration || 0),
            speed: `${avgSpd.toFixed(1)} km/h`,
            elevation: `${Math.round(session.elevationGain || 0)} m`,
          });
        }

        console.log('[CyclingTrackerScreen] Active session restored');
        return;
      }

      // Try auto-recovery
      const autoRecoveryResult = await simpleRunTracker.checkAndAutoRecover();

      if (autoRecoveryResult.recovered && autoRecoveryResult.checkpoint) {
        const { checkpoint } = autoRecoveryResult;

        // Only auto-recover cycling workouts on this screen
        if (checkpoint.activityType !== 'cycling') {
          console.log(
            `[CyclingTrackerScreen] Auto-recovery checkpoint is for ${checkpoint.activityType}, skipping`
          );
          return;
        }

        // Calculate average speed
        const avgSpd = checkpoint.duration > 0
          ? (checkpoint.distance / checkpoint.duration) * 3.6
          : 0;

        // Update UI state
        setIsTracking(true);
        setIsPaused(false);
        setElapsedTime(checkpoint.duration);
        setAvgSpeed(avgSpd);
        setMetrics({
          distance: `${(checkpoint.distance / 1000).toFixed(2)} km`,
          duration: formatElapsedTime(checkpoint.duration),
          speed: `${avgSpd.toFixed(1)} km/h`,
          elevation: '0 m',
        });

        // Start UI update timer (clear first to prevent duplicates)
        startTimeRef.current = Date.now() - (checkpoint.duration * 1000);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        timerRef.current = setInterval(() => {
          if (!isPausedRef.current) {
            const now = Date.now();
            const elapsed = Math.floor((now - startTimeRef.current - totalPausedTimeRef.current) / 1000);
            setElapsedTime(elapsed);
          }
        }, 1000);

        // Show notification
        setAlertConfig({
          title: 'Ride Resumed',
          message: `Recovered ${(checkpoint.distance / 1000).toFixed(2)} km ride that was interrupted.`,
          buttons: [{ text: 'OK', style: 'default' }],
        });
        setAlertVisible(true);

        console.log(
          `[CyclingTrackerScreen] ✅ Auto-recovered workout: ${(checkpoint.distance / 1000).toFixed(2)} km`
        );
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

  // Load user profile for social sharing
  useEffect(() => {
    let isMounted = true;
    const loadProfileAndId = async () => {
      try {
        const pubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
        const npub = await AsyncStorage.getItem('@runstr:npub');
        const activeUserId = npub || pubkey || '';
        if (isMounted) setUserId(activeUserId);

        if (pubkey) {
          const profile = await nostrProfileService.getProfile(pubkey);
          if (isMounted) setUserProfile(profile);
        }
      } catch (error) {
        console.error(
          '[CyclingTrackerScreen] Failed to load user profile:',
          error
        );
      }
    };

    loadProfileAndId();
    return () => { isMounted = false; };
  }, []);

  // Load weekly distance data on mount
  useEffect(() => {
    const loadWeeklyDistance = async () => {
      try {
        setDistanceLoading(true);

        // Get goal
        const goal = await weeklyDistanceGoalService.getGoal('cycling');
        setDistanceGoal(goal);

        // Get weekly distance
        const distance =
          await weeklyDistanceGoalService.getWeeklyDistance('cycling');
        setWeeklyDistance(distance);

        // Calculate progress
        const progress = weeklyDistanceGoalService.calculateProgress(
          distance,
          goal
        );
        setDistanceProgress(progress);

        console.log(
          `[CyclingTrackerScreen] Weekly distance: ${distance.toFixed(
            2
          )}km, goal: ${goal}km`
        );

        setDistanceLoading(false);
      } catch (error) {
        console.error(
          '[CyclingTrackerScreen] Error loading weekly distance:',
          error
        );
        setDistanceLoading(false);
      }
    };

    loadWeeklyDistance();
  }, []);

  // AppState listener for background/foreground transitions - using AppStateManager
  useEffect(() => {
    const appStateManager = AppStateManager;
    const unsubscribe = appStateManager.onStateChange((isActive) => {
      if (!isActive) {
        // App going to background - clear timers to prevent crashes
        console.log(
          '[CyclingTrackerScreen] App backgrounding, clearing timers...'
        );
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (metricsUpdateRef.current) {
          clearInterval(metricsUpdateRef.current);
          metricsUpdateRef.current = null;
        }
      } else if (isActive && isTrackingRef.current) {
        // App returned to foreground while tracking - restart timers and sync
        console.log(
          '[CyclingTrackerScreen] App returned to foreground, restarting timers and syncing...'
        );

        // Restart timer
        if (!timerRef.current) {
          timerRef.current = setInterval(() => {
            if (!isPausedRef.current) {
              const now = Date.now();
              const totalElapsed = Math.floor(
                (now - startTimeRef.current - totalPausedTimeRef.current) / 1000
              );
              setElapsedTime(totalElapsed);
            }
          }, 1000);
        }

        // Restart the recurring metrics interval — it was cleared on background
        // and is only otherwise started in initializeTracking(), so without this
        // distance/speed stayed frozen for the rest of the ride after a
        // background/foreground cycle. startMetricsInterval() self-clears, so
        // calling it again is safe. (The block below also does a one-shot sync.)
        startMetricsInterval();

        // Force immediate sync of metrics
        const session = simpleRunTracker.getCurrentSession();
        if (session) {
          const now = Date.now();
          const currentElapsed = Math.floor(
            (now - startTimeRef.current - totalPausedTimeRef.current) / 1000
          );

          const distance = session.distance || 0;
          const speed = activityMetricsService.calculateSpeed(
            distance,
            currentElapsed
          );

          setMetrics({
            distance: activityMetricsService.formatDistance(distance),
            duration: activityMetricsService.formatDuration(currentElapsed),
            speed: activityMetricsService.formatSpeed(speed),
            elevation: activityMetricsService.formatElevation(
              session.elevationGain || 0
            ),
          });
          setElapsedTime(currentElapsed);
          setCurrentSpeed(speed);

          console.log(
            `[CyclingTrackerScreen] ✅ Synced: ${(
              distance / 1000
            ).toFixed(2)} km, ` +
              `${currentElapsed}s, ${speed.toFixed(
                1
              )} km/h, tracking continued in background`
          );
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []); // Subscribe only once to avoid race conditions

  // NOTE: isTrackingRef sync removed - consolidated at lines 129-132 to prevent duplicate updates

  const handleHoldComplete = async () => {
    console.log('[CyclingTrackerScreen] Hold complete, starting countdown...');
    // Countdown timers are cleared on unmount by useStartCountdown, so an
    // interrupted countdown can't start a phantom tracking session.
    startCountdown();
  };

  const proceedWithTracking = async () => {
    try {
      // Start tracking without re-checking permissions (already checked in handleHoldComplete)
      const started = await simpleRunTracker.startTracking(
        'cycling'
      );
      if (started) {
        initializeTracking();
      }
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
      console.error(
        '[CyclingTrackerScreen] Failed to start tracking:',
        errorMessage
      );
    }
  };

  const initializeTracking = () => {
    setIsTracking(true);
    setIsPaused(false);
    isPausedRef.current = false;
    startTimeRef.current = Date.now();
    pauseStartTimeRef.current = 0;
    totalPausedTimeRef.current = 0;

    // Timer for elapsed time display
    timerRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        const now = Date.now();
        const totalElapsed = Math.floor(
          (now - startTimeRef.current - totalPausedTimeRef.current) / 1000
        );
        setElapsedTime(totalElapsed);
      }
    }, 1000);

    // Start metrics interval (uses refs to avoid stale closures)
    updateMetricsFromSession(); // Immediate first update
    startMetricsInterval();
  };

  // Helper function to safely start metrics interval (prevents duplicates)
  const startMetricsInterval = () => {
    if (metricsUpdateRef.current) {
      clearInterval(metricsUpdateRef.current);
    }
    metricsUpdateRef.current = setInterval(() => {
      updateMetricsFromSession();
    }, 1000); // Update every second
  };

  // FIXED: Get elapsed time directly from refs to avoid stale closure
  const updateMetricsFromSession = () => {
    // CRITICAL: Don't update UI if app is backgrounded
    const appStateManager = AppStateManager;
    if (!appStateManager.isActive()) {
      return;
    }

    const session = simpleRunTracker.getCurrentSession();
    if (session) {
      // Calculate current elapsed time from refs (avoids stale closure)
      const now = Date.now();
      const currentElapsed = Math.floor(
        (now - startTimeRef.current - totalPausedTimeRef.current) / 1000
      );

      const distance = session.distance || 0;
      // Calculate average speed based on total distance and time
      const calculatedAvgSpeed = activityMetricsService.calculateSpeed(
        distance,
        currentElapsed
      );

      // Get current speed from recent position data if available
      // For now we'll use avg speed as current (GPS updates will improve this)
      const instantSpeed = calculatedAvgSpeed;

      setCurrentSpeed(instantSpeed);
      setAvgSpeed(calculatedAvgSpeed);

      // Track max speed
      if (instantSpeed > maxSpeed) {
        setMaxSpeed(instantSpeed);
      }

      setMetrics({
        distance: activityMetricsService.formatDistance(distance),
        duration: activityMetricsService.formatDuration(currentElapsed),
        speed: activityMetricsService.formatSpeed(instantSpeed),
        elevation: activityMetricsService.formatElevation(
          session.elevationGain || 0
        ),
      });
    }
  };

  const pauseTracking = async () => {
    if (!isPaused) {
      await simpleRunTracker.pauseTracking();
      setIsPaused(true);
      isPausedRef.current = true;
      pauseStartTimeRef.current = Date.now(); // Store when pause started
    }
  };

  const resumeTracking = async () => {
    if (isPaused) {
      const pauseDuration = Date.now() - pauseStartTimeRef.current; // Calculate how long we were paused
      totalPausedTimeRef.current += pauseDuration; // Add to cumulative total
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

    if (session && session.distance > 50) {
      // Minimum 50 meters for cycling
      showWorkoutSummary(session);
    } else {
      resetMetrics();
    }
  };

  const showWorkoutSummary = async (session: RunSession) => {
    // Use the tracker's pause-aware duration, not the local elapsedTime state —
    // the two diverge after pause/resume (same fix as WalkingTrackerScreen).
    const finalDuration = session.duration || elapsedTime;
    const avgSpeed = activityMetricsService.calculateSpeed(
      session.distance,
      finalDuration
    );
    const calories = activityMetricsService.estimateCalories(
      'cycling',
      session.distance,
      finalDuration
    );

    // Save workout to local storage BEFORE showing modal
    try {
      const result = await LocalWorkoutStorageService.saveGPSWorkout({
        type: 'cycling',
        distance: session.distance,
        duration: finalDuration,
        calories,
        elevation: session.elevationGain || 0,
        speed: avgSpeed,
        // Pass route info if selected
        routeId: selectedRoute?.id,
        routeLabel: selectedRoute?.name,
      });

      console.log(`✅ Cycling workout saved locally: ${result.workoutId}`);
      if (result.rewardSent) {
        console.log(`[CyclingTracker] ⚡ Reward sent: ${result.rewardAmount} sats!`);
      }

      // If a route was selected, add this workout to the route
      if (selectedRoute) {
        try {
          await routeStorageService.addWorkoutToRoute(
            selectedRoute.id,
            result.workoutId,
            finalDuration,
            undefined // No pace for cycling
          );
          console.log(`[CyclingTracker] Workout added to route "${selectedRoute.name}"`);
        } catch (routeError) {
          console.error('[CyclingTracker] Failed to add workout to route:', routeError);
        }
      }

      setWorkoutData({
        type: 'cycling',
        distance: session.distance,
        duration: finalDuration,
        calories,
        elevation: session.elevationGain || 0,
        speed: avgSpeed,
        localWorkoutId: result.workoutId,
        routeId: selectedRoute?.id,
        routeName: selectedRoute?.name,
        rewardSent: result.rewardSent,
        rewardAmount: result.rewardAmount,
      });
      setSummaryModalVisible(true);
    } catch (error) {
      console.error('❌ Failed to save cycling workout locally:', error);
      // Still show modal even if save failed
      setWorkoutData({
        type: 'cycling',
        distance: session.distance,
        duration: finalDuration,
        calories,
        elevation: session.elevationGain || 0,
        speed: avgSpeed,
        routeId: selectedRoute?.id,
        routeName: selectedRoute?.name,
      });
      setSummaryModalVisible(true);
    }

    resetMetrics();
    setSelectedRoute(null); // Clear selected route after workout
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
    setMaxSpeed(0);
    setAvgSpeed(0);
  };

  // Handle posting weekly distance to Nostr
  const handlePostWeeklyDistance = async () => {
    if (!weeklyDistance || weeklyDistance === 0) {
      console.warn('[CyclingTrackerScreen] Cannot post - no distance available');
      return;
    }

    if (distancePostingState === 'posted') {
      console.warn('[CyclingTrackerScreen] Weekly distance already posted');
      return;
    }

    try {
      setDistancePostingState('posting');
      console.log(
        `[CyclingTrackerScreen] Preparing to post ${weeklyDistance.toFixed(2)}km weekly distance`
      );

      const weekBounds = weeklyDistanceGoalService.getWeekBounds();
      const weekNumber = weeklyDistanceGoalService.getWeekNumber();

      // Create PublishableWorkout for social sharing
      const publishableWorkout: PublishableWorkout = {
        id: `weekly_cycling_${weekNumber}_${Date.now()}`,
        userId: userId || 'unknown',
        type: 'cycling',
        startTime: weekBounds.start.toISOString(),
        endTime: weekBounds.end.toISOString(),
        duration: 0, // Weekly summary - no specific duration
        distance: weeklyDistance * 1000, // Convert km to meters
        calories: Math.round(weeklyDistance * 30), // Rough estimate for cycling
        source: 'manual',
        syncedAt: new Date().toISOString(),
        sourceApp: 'RUNSTR',
        unitSystem: 'metric',
        canSyncToNostr: true,
        metadata: {
          title: `Week ${weekNumber} Cycling`,
          sourceApp: 'RUNSTR',
          notes: `Weekly cycling: ${weeklyDistance.toFixed(2)}km / ${distanceGoal}km goal (${distanceProgress?.percentage || 0}%)`,
          weeklyGoal: distanceGoal,
          weeklyProgress: distanceProgress?.percentage || 0,
        },
      };

      // Open social share modal
      // Note: State stays as 'posting' while modal is open to prevent double-tap
      // State is reset in modal's onClose (cancelled) or onSuccess (posted) callbacks
      setPreparedWorkout(publishableWorkout);
      setShowSocialModal(true);

      console.log(
        `[CyclingTrackerScreen] ✅ Opening social share modal for weekly distance`
      );
    } catch (error) {
      console.error(
        '[CyclingTrackerScreen] ❌ Failed to post weekly distance:',
        error
      );
      setDistancePostingState('idle');

      setAlertConfig({
        title: 'Failed to Post',
        message: 'Could not share weekly distance. Please try again.',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setAlertVisible(true);
    }
  };

  // Handle setting distance goal
  const handleSetGoal = () => {
    console.log('[CyclingTrackerScreen] Opening goal selection modal...');
    setGoalPickerVisible(true);
  };

  // Handle goal selected from picker
  const handleGoalSelected = async (newGoal: number) => {
    try {
      await weeklyDistanceGoalService.setGoal('cycling', newGoal);
      setDistanceGoal(newGoal);

      // Recalculate progress
      if (weeklyDistance !== null) {
        const progress = weeklyDistanceGoalService.calculateProgress(
          weeklyDistance,
          newGoal
        );
        setDistanceProgress(progress);
      }

      console.log(`[CyclingTrackerScreen] ✅ Goal updated to ${newGoal}km`);
    } catch (error) {
      console.error('[CyclingTrackerScreen] ❌ Failed to update goal:', error);
    }
  };

  // NOTE: Direct updateMetrics() on elapsedTime removed - now using interval-based updates
  // via startMetricsInterval() to avoid stale closures and performance issues

  // Secondary metrics for active tracking
  const secondaryMetrics: SecondaryMetric[] = [
    {
      value: metrics.distance,
      label: 'Distance',
      icon: 'navigate-outline',
    },
    {
      value: metrics.duration,
      label: 'Duration',
      icon: 'time-outline',
    },
    {
      value: metrics.elevation,
      label: 'Elevation',
      icon: 'trending-up-outline',
    },
  ];

  // Determine control bar state
  const controlBarState = isTracking ? (isPaused ? 'paused' : 'tracking') : 'idle';

  return (
    <View style={styles.screenContainer}>
      <View style={styles.contentContainer}>
        {/* Countdown Overlay */}
        <CountdownOverlay countdown={countdown} />

        {isTracking ? (
          /* ============ ACTIVE TRACKING STATE ============ */
          <View style={styles.activeContainer}>
            {/* Route Badge (if selected) */}
            {selectedRoute && (
              <View style={styles.routeBadge}>
                <Ionicons name="map" size={14} color={theme.colors.accent} />
                <Text style={styles.routeBadgeText}>{selectedRoute.name}</Text>
              </View>
            )}

            {/* Speed Gauge - Compact for cycling */}
            <View style={styles.gaugeSection}>
              <SpeedGauge
                currentSpeed={currentSpeed}
                maxSpeed={maxSpeed}
                avgSpeed={avgSpeed}
                unit="km/h"
              />
            </View>

            {/* Secondary Metrics Row - Distance, Duration, Elevation */}
            <SecondaryMetricRow metrics={secondaryMetrics} />
          </View>
      ) : (
        /* ============ IDLE STATE ============ */
        <View style={styles.idleCenteredContainer}>
          <HoldToStartButton
            label={t('startRide')}
            onHoldComplete={handleHoldComplete}
            size="large"
          />
        </View>
      )}

      {/* Fixed Control Bar - Only visible when tracking */}
      {isTracking && (
        <View style={styles.fixedControlsWrapper}>
          <ControlBar
            state={controlBarState}
            startLabel="Start Ride"
            onHoldComplete={handleHoldComplete}
            onPause={pauseTracking}
            onResume={resumeTracking}
            onStop={stopTracking}
          />
        </View>
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

      {/* Route Selection Modal */}
      <RouteSelectionModal
        visible={routeSelectionVisible}
        activityType="cycling"
        onSelectRoute={(routeId, routeName) => {
          setSelectedRoute({ id: routeId, name: routeName });
          setRouteSelectionVisible(false);
        }}
        onClose={() => setRouteSelectionVisible(false)}
      />

      {/* Distance Goal Picker Modal */}
      <DistanceGoalPickerModal
        visible={goalPickerVisible}
        activityType="cycling"
        currentGoal={distanceGoal}
        onSelectGoal={handleGoalSelected}
        onClose={() => setGoalPickerVisible(false)}
      />

      {/* Enhanced Social Share Modal */}
      <EnhancedSocialShareModal
        visible={showSocialModal}
        workout={preparedWorkout}
        userId={userId}
        userAvatar={userProfile?.picture}
        userName={userProfile?.name || userProfile?.display_name}
        onClose={() => {
          setShowSocialModal(false);
          setPreparedWorkout(null);
          // Reset to idle if user cancels - allows retry
          setDistancePostingState('idle');
        }}
        onSuccess={() => {
          setShowSocialModal(false);
          setPreparedWorkout(null);
          setDistancePostingState('posted');
          console.log(
            '[CyclingTrackerScreen] ✅ Weekly distance posted successfully'
          );
        }}
      />
      </View>

      {/* Step Debug Overlay - Android-only diagnostic panel */}
      <StepDebugOverlay />
    </View>
  );
};

const styles = StyleSheet.create({
  // Screen container (replaces SafeAreaView since parent handles safe area)
  screenContainer: {
    flex: 1,
    backgroundColor: 'transparent', // parent gradient shows through (no lighter box)
  },
  // Content container with platform-specific top padding
  contentContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 16,
  },
  // Active tracking state container
  activeContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingBottom: 140, // Space for fixed controls
  },
  // Idle state container - centered HoldToStart button
  idleCenteredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingBottom: 120, // Shift button up from true center
  },
  // Fixed controls wrapper - always visible at bottom
  fixedControlsWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  // Activity header in idle state
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  activityTitle: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  // Route badge shown during tracking
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
  // Speed gauge section
  gaugeSection: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  // Compact distance and time row
  distanceTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 24,
  },
  distanceBlock: {
    alignItems: 'center',
  },
  distanceValue: {
    fontSize: 56,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    lineHeight: 60,
  },
  distanceUnit: {
    fontSize: 18,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
    marginTop: -4,
  },
  timeDivider: {
    width: 1,
    height: 50,
    backgroundColor: theme.colors.border,
  },
  timeBlock: {
    alignItems: 'center',
  },
  timeValue: {
    fontSize: 40,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  // Route selector in idle state
  routeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  routeSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routeSelectorText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
  },
});
