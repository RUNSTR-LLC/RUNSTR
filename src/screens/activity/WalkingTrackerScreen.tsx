/**
 * WalkingTrackerScreen - Walking activity tracker with step estimation
 * Displays distance, time, steps, and elevation
 * Now includes daily step counter with goal tracking
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { AppStateManager } from '../../services/core/AppStateManager';
import { CustomAlert } from '../../components/ui/CustomAlert';
import { simpleRunTracker } from '../../services/activity/SimpleRunTracker';
import { activityMetricsService } from '../../services/activity/ActivityMetricsService';
import type { RunSession } from '../../services/activity/SimpleRunTracker';
import { WorkoutSummaryModal } from '../../components/activity/WorkoutSummaryModal';
import LocalWorkoutStorageService from '../../services/fitness/LocalWorkoutStorageService';
import healthConnectService from '../../services/fitness/healthConnectService';
import { RouteSelectionModal } from '../../components/routes/RouteSelectionModal';
import routeStorageService from '../../services/routes/RouteStorageService';
import {
  type PostingState,
} from '../../components/activity/DailyStepGoalCard';
import { dailyStepCounterService } from '../../services/activity/DailyStepCounterService';
import { dailyStepGoalService } from '../../services/activity/DailyStepGoalService';
import type { DailyStepData } from '../../services/activity/DailyStepCounterService';
import type { StepGoalProgress } from '../../services/activity/DailyStepGoalService';
import { HoldToStartButton } from '../../components/activity/HoldToStartButton';
import { StepGoalPickerModal } from '../../components/activity/StepGoalPickerModal';
import { EnhancedSocialShareModal } from '../../components/profile/shared/EnhancedSocialShareModal';
// New redesigned components
import { HeroMetric } from '../../components/activity/HeroMetric';
import {
  SecondaryMetricRow,
  type SecondaryMetric,
} from '../../components/activity/SecondaryMetricRow';
import { CountdownOverlay } from '../../components/activity/CountdownOverlay';
import { ControlBar } from '../../components/activity/ControlBar';
import { LastActivityCard } from '../../components/activity/LastActivityCard';
import { nostrProfileService } from '../../services/nostr/NostrProfileService';
import type { NostrProfile } from '../../services/nostr/NostrProfileService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  WorkoutPublishingService,
  type PublishableWorkout,
} from '../../services/nostr/workoutPublishingService';
import { UnifiedSigningService } from '../../services/auth/UnifiedSigningService';
import { theme } from '../../styles/theme';
import { KM_PER_STEP } from '../../constants/appConstants';
import { StepDebugOverlay } from '../../components/debug/StepDebugOverlay';

const STEP_UPDATE_INTERVAL = 5 * 1000; // Update every 5 seconds for near-real-time

interface WalkingTrackerScreenProps {
  onWorkoutStateChange?: (isActive: boolean) => void;
}

export const WalkingTrackerScreen: React.FC<WalkingTrackerScreenProps> = ({
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
    type: 'running' | 'walking' | 'cycling';
    distance: number;
    duration: number;
    calories: number;
    elevation?: number;
    steps?: number;
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
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const metricsUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<number>(0); // When pause started
  const totalPausedTimeRef = useRef<number>(0); // Cumulative pause duration in ms
  const isPausedRef = useRef<boolean>(false); // Ref to avoid stale closure in timer
  const isTrackingRef = useRef<boolean>(false); // Track isTracking without re-subscribing

  // Daily step counter state
  const [dailySteps, setDailySteps] = useState<number | null>(null);
  const [stepGoal, setStepGoal] = useState<number>(10000);
  const [stepProgress, setStepProgress] = useState<StepGoalProgress | null>(
    null
  );
  const [stepCounterLoading, setStepCounterLoading] = useState(true);
  const [stepCounterError, setStepCounterError] = useState<string | null>(null);
  const [postingState, setPostingState] = useState<PostingState>('idle');
  const [competeState, setCompeteState] = useState<PostingState>('idle');
  const stepUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Live pedometer step tracking (for summary modal after walk)
  const liveStepsRef = useRef<number>(0);
  const unsubscribeLiveStepsRef = useRef<(() => void) | null>(null);

  const [countdown, setCountdown] = useState<3 | 2 | 1 | 'GO' | null>(null);
  const [showBackgroundBanner, setShowBackgroundBanner] = useState(false);
  const [isBackgroundActive, setIsBackgroundActive] = useState(false);
  const [goalPickerVisible, setGoalPickerVisible] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [userProfile, setUserProfile] = useState<NostrProfile | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [preparedWorkout, setPreparedWorkout] =
    useState<PublishableWorkout | null>(null);

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
      if (stepUpdateIntervalRef.current)
        clearInterval(stepUpdateIntervalRef.current);
      if (unsubscribeLiveStepsRef.current)
        unsubscribeLiveStepsRef.current();
    };
  }, []);

  // Auto-recovery for interrupted workouts
  useEffect(() => {
    const checkAutoRecovery = async () => {
      // Don't recover if already tracking
      if (isTracking) return;

      console.log('[WalkingTrackerScreen] Checking for auto-recovery...');

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
          setMetrics({
            distance: `${(distance / 1000).toFixed(2)} km`,
            duration: formatElapsedTime(session.duration || 0),
            elevation: `${Math.round(session.elevationGain || 0)} m`,
            calories: `${activityMetricsService.estimateCalories('walking', distance, session.duration || 0)}`,
          });
        }

        console.log('[WalkingTrackerScreen] Active session restored');
        return;
      }

      // Try auto-recovery
      const autoRecoveryResult = await simpleRunTracker.checkAndAutoRecover();

      if (autoRecoveryResult.recovered && autoRecoveryResult.checkpoint) {
        const { checkpoint } = autoRecoveryResult;

        // Only auto-recover walking workouts on this screen
        if (checkpoint.activityType !== 'walking') {
          console.log(
            `[WalkingTrackerScreen] Auto-recovery checkpoint is for ${checkpoint.activityType}, skipping`
          );
          return;
        }

        // Update UI state
        setIsTracking(true);
        setIsPaused(false);
        setElapsedTime(checkpoint.duration);
        setMetrics({
          distance: `${(checkpoint.distance / 1000).toFixed(2)} km`,
          duration: formatElapsedTime(checkpoint.duration),
          elevation: '0 m',
          calories: `${activityMetricsService.estimateCalories('walking', checkpoint.distance, checkpoint.duration)}`,
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
          title: 'Walk Resumed',
          message: `Recovered ${(checkpoint.distance / 1000).toFixed(2)} km walk that was interrupted.`,
          buttons: [{ text: 'OK', style: 'default' }],
        });
        setAlertVisible(true);

        console.log(
          `[WalkingTrackerScreen] ✅ Auto-recovered workout: ${(checkpoint.distance / 1000).toFixed(2)} km`
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

  // Helper function for time formatting
  const formatElapsedTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

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
          '[WalkingTrackerScreen] Failed to load user profile:',
          error
        );
      }
    };

    loadProfileAndId();
    return () => { isMounted = false; };
  }, []);

  // Daily step counter initialization (runs once on mount)
  useEffect(() => {
    const checkBackgroundTracking = async () => {
      try {
        setStepCounterLoading(true);
        setStepCounterError(null);

        // First check if user has enabled background tracking in Settings
        const userEnabledTracking = await dailyStepCounterService.isBackgroundTrackingEnabled();
        if (!userEnabledTracking) {
          // User has disabled background tracking - don't show step counter
          console.log('[WalkingTrackerScreen] Background tracking disabled by user');
          setStepCounterLoading(false);
          setShowBackgroundBanner(false);
          setIsBackgroundActive(false);
          return;
        }

        // Check if step counting is available (HealthKit on iOS, Health Connect on Android)
        const available = await dailyStepCounterService.isAvailable();
        if (!available) {
          // Device doesn't support step counting - GPS-only mode
          setStepCounterLoading(false);
          setShowBackgroundBanner(false);
          if (Platform.OS === 'android') {
            console.log(
              '[WalkingTrackerScreen] Health Connect not available - using GPS-only mode'
            );
            setStepCounterError('Install Health Connect from Play Store for step counting');
          } else {
            console.log(
              '[WalkingTrackerScreen] Pedometer not available - using GPS-only mode'
            );
          }
          return;
        }

        // Check if permissions already granted (don't request yet)
        const permissionStatus =
          await dailyStepCounterService.checkPermissionStatus();

        if (permissionStatus === 'granted') {
          // Permissions already granted - enable background mode
          try {
            const stepData = await dailyStepCounterService.getTodaySteps();
            if (stepData) {
              setDailySteps(stepData.steps);
            }

            const goal = await dailyStepGoalService.getGoal();
            setStepGoal(goal);

            if (stepData) {
              const progress = dailyStepGoalService.calculateProgress(
                stepData.steps,
                goal
              );
              setStepProgress(progress);
            }

            setIsBackgroundActive(true);
            setShowBackgroundBanner(false);
            console.log(
              `[WalkingTrackerScreen] ✅ Background tracking active: ${
                stepData?.steps || 0
              } steps`
            );
          } catch (error) {
            console.error(
              '[WalkingTrackerScreen] Error fetching steps:',
              error
            );
            setIsBackgroundActive(false);
            setShowBackgroundBanner(true);
          }
        } else {
          // Permissions not granted - show optional banner
          setIsBackgroundActive(false);
          setShowBackgroundBanner(true);
          console.log(
            '[WalkingTrackerScreen] Background tracking available - showing banner'
          );
        }

        setStepCounterLoading(false);
      } catch (error) {
        console.error(
          '[WalkingTrackerScreen] Error checking background tracking:',
          error
        );
        setStepCounterLoading(false);
        setShowBackgroundBanner(false);
      }
    };

    checkBackgroundTracking();
  }, []); // Empty dependency - only run once on mount

  // Separate useEffect for step polling (starts when isBackgroundActive becomes true)
  useEffect(() => {
    if (!isBackgroundActive) return;

    const pollSteps = async () => {
      try {
        const stepData = await dailyStepCounterService.getTodaySteps();
        if (stepData) {
          setDailySteps(stepData.steps);
          const goal = await dailyStepGoalService.getGoal();
          const progress = dailyStepGoalService.calculateProgress(stepData.steps, goal);
          setStepProgress(progress);
        }
      } catch (error) {
        console.error('[WalkingTrackerScreen] Error polling steps:', error);
      }
    };

    // Poll immediately when background becomes active
    pollSteps();
    console.log('[WalkingTrackerScreen] Step polling started');

    // Then poll at regular intervals
    stepUpdateIntervalRef.current = setInterval(pollSteps, STEP_UPDATE_INTERVAL);

    return () => {
      if (stepUpdateIntervalRef.current) {
        clearInterval(stepUpdateIntervalRef.current);
        console.log('[WalkingTrackerScreen] Step polling stopped');
      }
    };
  }, [isBackgroundActive]);

  // Check if daily steps already posted today
  useEffect(() => {
    let isMounted = true;
    const checkIfPosted = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const alreadyPosted =
          await LocalWorkoutStorageService.hasDailyStepsForDate(today);

        if (isMounted) {
          if (alreadyPosted) {
            setPostingState('posted');
          } else {
            setPostingState('idle');
          }
        }
      } catch (error) {
        console.error(
          '[WalkingTrackerScreen] Error checking posted status:',
          error
        );
      }
    };

    checkIfPosted();
    return () => { isMounted = false; };
  }, [dailySteps]); // Re-check when daily steps update

  // AppState listener for background/foreground transitions
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isTrackingRef.current) {
        // App returned to foreground while tracking - sync immediately
        console.log(
          '[WalkingTrackerScreen] App returned to foreground, syncing metrics...'
        );

        // Force immediate sync of metrics
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
            elevation: activityMetricsService.formatElevation(
              session.elevationGain || 0
            ),
            calories: calories.toString(),
          });
          setElapsedTime(currentElapsed);

          console.log(
            `[WalkingTrackerScreen] ✅ Synced: ${(
              distance / 1000
            ).toFixed(2)} km, ` +
              `${currentElapsed}s, tracking continued in background`
          );
        }
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    return () => {
      subscription.remove();
    };
  }, []); // Subscribe only once to avoid race conditions

  // Update the ref whenever isTracking changes
  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);

  const handleHoldComplete = async () => {
    // Start countdown
    console.log(
      '[WalkingTrackerScreen] Permissions granted, starting countdown...'
    );

    // Start countdown: 3 → 2 → 1 → GO!
    setCountdown(3);
    setTimeout(() => {
      setCountdown(2);
      setTimeout(() => {
        setCountdown(1);
        setTimeout(() => {
          setCountdown('GO');
          setTimeout(() => {
            setCountdown(null);
            // Start tracking after countdown completes
            startTracking();
          }, 500); // Show "GO!" for 0.5 seconds
        }, 1000);
      }, 1000);
    }, 1000);
  };

  const startTracking = async () => {
    console.log('[WalkingTrackerScreen] Starting GPS tracking...');

    try {
      // Simple permission and start flow
      const started = await simpleRunTracker.startTracking(
        'walking'
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
        '[WalkingTrackerScreen] Failed to start tracking:',
        errorMessage
      );
    }
  };

  const initializeTracking = async () => {
    setIsTracking(true);
    setIsPaused(false);
    isPausedRef.current = false;
    startTimeRef.current = Date.now();
    pauseStartTimeRef.current = 0;
    totalPausedTimeRef.current = 0;

    // Reset live step counter for summary modal
    liveStepsRef.current = 0;

    // iOS: Subscribe to pedometer for step count in summary modal
    if (Platform.OS === 'ios') {
      unsubscribeLiveStepsRef.current = dailyStepCounterService.subscribeLiveSteps(
        (incrementalSteps: number) => {
          liveStepsRef.current = incrementalSteps;
        }
      );
    }

    // Timer updates every second
    timerRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        const now = Date.now();
        const totalElapsed = Math.floor(
          (now - startTimeRef.current - totalPausedTimeRef.current) / 1000
        );
        setElapsedTime(totalElapsed);
      }
    }, 1000);

    // GPS metrics (distance, elevation, calories) update every 5 seconds
    // NO step polling during active tracking - steps only shown in Tracked Steps card
    metricsUpdateRef.current = setInterval(updateMetrics, 5000);
  };

  // Updates distance, elevation, calories from GPS session
  // NO step tracking during active walk - steps only shown in Tracked Steps card
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

    // Platform-specific step tracking cleanup
    if (Platform.OS === 'android') {
      // Android: Just log completion (Health Connect polling handles itself)
      console.log(`[WalkingTrackerScreen] Android walk stopped - ${liveStepsRef.current} steps tracked`);
    } else if (unsubscribeLiveStepsRef.current) {
      // Unsubscribe from iOS pedometer
      unsubscribeLiveStepsRef.current();
      unsubscribeLiveStepsRef.current = null;
      console.log('[WalkingTrackerScreen] iOS pedometer subscription stopped');
    }

    const session = await simpleRunTracker.stopTracking();
    setIsTracking(false);
    setIsPaused(false);

    // Show summary for any tracked workout (steps > 0 or distance > 0)
    if (session && (liveStepsRef.current > 0 || session.distance > 0)) {
      showWorkoutSummary(session);
    } else {
      resetMetrics();
    }
  };

  const showWorkoutSummary = async (session: RunSession) => {
    // Use real pedometer steps, fall back to GPS estimate if pedometer unavailable
    const steps = liveStepsRef.current > 0
      ? liveStepsRef.current
      : activityMetricsService.estimateSteps(session.distance);
    console.log(`[WalkingTracker] Workout summary steps: ${steps} (live: ${liveStepsRef.current})`);
    const finalDuration = session.duration || elapsedTime;
    const calories = activityMetricsService.estimateCalories(
      'walking',
      session.distance,
      finalDuration
    );

    // Save workout to local storage BEFORE showing modal
    try {
      const result = await LocalWorkoutStorageService.saveGPSWorkout({
        type: 'walking',
        distance: session.distance,
        duration: finalDuration,
        calories,
        elevation: session.elevationGain || 0,
        // Pass route info if selected
        routeId: selectedRoute?.id,
        routeLabel: selectedRoute?.name,
      });

      console.log(`✅ Walking workout saved locally: ${result.workoutId}`);
      if (result.rewardSent) {
        console.log(`[WalkingTracker] ⚡ Reward sent: ${result.rewardAmount} sats!`);
      }

      // If a route was selected, add this workout to the route
      if (selectedRoute) {
        try {
          await routeStorageService.addWorkoutToRoute(
            selectedRoute.id,
            result.workoutId,
            elapsedTime,
            undefined // No pace for walking
          );
          console.log(`[WalkingTracker] Workout added to route "${selectedRoute.name}"`);
        } catch (routeError) {
          console.error('[WalkingTracker] Failed to add workout to route:', routeError);
        }
      }

      // Refresh daily step count to include newly tracked steps
      // Clear both caches on Android to ensure fresh data
      if (Platform.OS === 'android') {
        healthConnectService.clearStepsCache();
      }
      dailyStepCounterService.clearCache();
      const updatedSteps = await dailyStepCounterService.getTodaySteps();
      if (updatedSteps) {
        setDailySteps(updatedSteps.steps);
        const progress = dailyStepGoalService.calculateProgress(updatedSteps.steps, stepGoal);
        setStepProgress(progress);
        console.log(`[WalkingTracker] ✅ Daily steps refreshed: ${updatedSteps.steps}`);
      }

      setWorkoutData({
        type: 'walking',
        distance: session.distance,
        duration: elapsedTime,
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
      console.error('❌ Failed to save walking workout locally:', error);
      // Still show modal even if save failed
      setWorkoutData({
        type: 'walking',
        distance: session.distance,
        duration: elapsedTime,
        calories,
        elevation: session.elevationGain || 0,
        steps,
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
      elevation: '0 m',
      calories: '0',
    });
    setElapsedTime(0);
  };

  const handleRequestPermission = async () => {
    console.log(
      '[WalkingTrackerScreen] User requested background tracking permission'
    );
    setStepCounterLoading(true);
    setStepCounterError(null);

    try {
      const granted = await dailyStepCounterService.requestPermissions();

      if (granted) {
        console.log(
          '[WalkingTrackerScreen] ✅ Permission granted - activating background tracking'
        );

        // Fetch step data
        const stepData = await dailyStepCounterService.getTodaySteps();
        if (stepData) {
          setDailySteps(stepData.steps);
          const goal = await dailyStepGoalService.getGoal();
          setStepGoal(goal);
          const progress = dailyStepGoalService.calculateProgress(
            stepData.steps,
            goal
          );
          setStepProgress(progress);
        }

        // Activate background mode
        setIsBackgroundActive(true);
        setShowBackgroundBanner(false);
        setStepCounterLoading(false);

        console.log(
          `[WalkingTrackerScreen] ✅ Background tracking activated: ${
            stepData?.steps || 0
          } steps`
        );
      } else {
        console.warn(
          '[WalkingTrackerScreen] ⚠️ Permission denied - GPS-only mode continues'
        );
        if (Platform.OS === 'android') {
          setStepCounterError('Grant Health Connect permissions for step counting');
        } else {
          setStepCounterError('Background tracking requires motion permissions');
        }
        setShowBackgroundBanner(true);
        setIsBackgroundActive(false);
        setStepCounterLoading(false);
      }
    } catch (error) {
      console.error(
        '[WalkingTrackerScreen] ❌ Error requesting permission:',
        error
      );
      setStepCounterError('Failed to enable background tracking');
      setShowBackgroundBanner(true);
      setIsBackgroundActive(false);
      setStepCounterLoading(false);
    }
  };

  const handleOpenSettings = () => {
    console.log('[WalkingTrackerScreen] User requested to open settings');
    dailyStepCounterService.openSettings();
  };

  const handlePostDailySteps = async () => {
    if (!dailySteps || dailySteps === 0) {
      console.warn('[WalkingTrackerScreen] Cannot post - no steps available');
      return;
    }

    if (postingState === 'posted') {
      console.warn('[WalkingTrackerScreen] Steps already posted today');
      return;
    }

    try {
      setPostingState('posting');
      console.log(
        `[WalkingTrackerScreen] Preparing to post ${dailySteps} daily steps`
      );

      // Calculate time from midnight to now
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);

      const duration = Math.floor((now.getTime() - midnight.getTime()) / 1000); // seconds

      // Estimate calories for walking steps (rough estimate: 0.04 cal per step)
      const calories = Math.round(dailySteps * 0.04);

      // Save to local storage
      const workoutId = await LocalWorkoutStorageService.saveDailyStepsWorkout({
        steps: dailySteps,
        startTime: midnight.toISOString(),
        endTime: now.toISOString(),
        duration,
        calories,
      });

      console.log(`[WalkingTrackerScreen] ✅ Daily steps saved: ${workoutId}`);

      // Create PublishableWorkout for social sharing with steps in metadata
      const estimatedDistanceMeters = dailySteps * KM_PER_STEP * 1000;
      const publishableWorkout: PublishableWorkout = {
        id: workoutId,
        userId: userId || 'unknown',
        type: 'walking',
        startTime: midnight.toISOString(),
        endTime: now.toISOString(),
        duration,
        distance: estimatedDistanceMeters,
        calories,
        steps: dailySteps,
        source: 'manual', // Device pedometer data entered manually
        syncedAt: new Date().toISOString(),
        sourceApp: 'RUNSTR',
        unitSystem: 'metric',
        canSyncToNostr: true,
        metadata: {
          title: 'Daily Steps',
          sourceApp: 'RUNSTR',
          notes: `${dailySteps.toLocaleString()} steps tracked throughout the day`,
          steps: dailySteps, // Important: Steps must be in metadata for card generator
        },
      };

      // Open social share modal directly (bypass WorkoutSummaryModal)
      // Note: State stays as 'posting' while modal is open to prevent double-tap
      // State is reset in modal's onClose (cancelled) or onSuccess (posted) callbacks
      setPreparedWorkout(publishableWorkout);
      setShowSocialModal(true);

      console.log(
        `[WalkingTrackerScreen] ✅ Opening social share modal for ${dailySteps} steps`
      );
    } catch (error) {
      console.error(
        '[WalkingTrackerScreen] ❌ Failed to post daily steps:',
        error
      );
      setPostingState('idle');

      // Show error alert
      setAlertConfig({
        title: 'Failed to Post Steps',
        message: 'Could not save daily steps. Please try again.',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setAlertVisible(true);
    }
  };

  const handleCompeteDailySteps = async () => {
    if (!dailySteps || dailySteps === 0) {
      console.warn('[WalkingTrackerScreen] Cannot compete - no steps available');
      return;
    }

    if (competeState === 'posted') {
      console.warn('[WalkingTrackerScreen] Steps already entered for competition today');
      return;
    }

    try {
      setCompeteState('posting');
      console.log(
        `[WalkingTrackerScreen] Publishing ${dailySteps} daily steps as kind 1301 for competition`
      );

      // Get signer (works for both nsec and Amber)
      const signingService = UnifiedSigningService.getInstance();
      const signer = await signingService.getSigner();
      if (!signer) {
        throw new Error('Not logged in - please log in again');
      }

      // Calculate time from midnight to now
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);

      const duration = Math.floor((now.getTime() - midnight.getTime()) / 1000); // seconds

      // Estimate calories for walking steps (rough estimate: 0.04 cal per step)
      const calories = Math.round(dailySteps * 0.04);

      // Generate unique workout ID for today's steps
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const workoutId = `daily-steps-${today}-${Date.now()}`;

      // Create PublishableWorkout for kind 1301 publishing
      const publishableWorkout: PublishableWorkout = {
        id: workoutId,
        userId: userId || 'unknown',
        type: 'walking',
        startTime: midnight.toISOString(),
        endTime: now.toISOString(),
        duration,
        distance: 0, // No GPS distance for step counting
        calories,
        source: 'manual', // Device pedometer data
        syncedAt: new Date().toISOString(),
        sourceApp: 'RUNSTR',
        unitSystem: 'metric',
        canSyncToNostr: true,
        metadata: {
          title: 'Daily Steps',
          sourceApp: 'RUNSTR',
          notes: `${dailySteps.toLocaleString()} steps tracked today`,
          steps: dailySteps, // Steps count for the steps tag
        },
      };

      // Publish to Nostr as kind 1301
      const publishService = WorkoutPublishingService.getInstance();
      const result = await publishService.saveWorkoutToNostr(
        publishableWorkout,
        signer,
        userId
      );

      if (result.success) {
        setCompeteState('posted');
        console.log(
          `[WalkingTrackerScreen] ✅ Daily steps published to competition: ${result.eventId}`
        );

        // Show success alert
        setAlertConfig({
          title: 'Steps Entered!',
          message: `${dailySteps.toLocaleString()} steps have been submitted to the competition.${
            result.rewardEarned
              ? ` You earned ${result.rewardAmount} sats!`
              : ''
          }`,
          buttons: [{ text: 'OK', style: 'default' }],
        });
        setAlertVisible(true);
      } else {
        throw new Error(result.error || 'Failed to publish workout');
      }
    } catch (error) {
      console.error(
        '[WalkingTrackerScreen] ❌ Failed to publish daily steps for competition:',
        error
      );
      setCompeteState('idle');

      // Show error alert
      setAlertConfig({
        title: 'Failed to Enter',
        message:
          error instanceof Error
            ? error.message
            : 'Could not submit steps to competition. Please try again.',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setAlertVisible(true);
    }
  };

  const handleSetGoal = () => {
    console.log('[WalkingTrackerScreen] Opening goal selection modal...');
    setGoalPickerVisible(true);
  };

  const handleGoalSelected = async (newGoal: number) => {
    try {
      // Update goal
      await dailyStepGoalService.setGoal(newGoal);
      setStepGoal(newGoal);

      // Recalculate progress
      if (dailySteps !== null) {
        const progress = dailyStepGoalService.calculateProgress(
          dailySteps,
          newGoal
        );
        setStepProgress(progress);
      }

      console.log(`[WalkingTrackerScreen] ✅ Goal updated to ${newGoal} steps`);
    } catch (error) {
      console.error('[WalkingTrackerScreen] ❌ Failed to update goal:', error);
    }
  };

  // Secondary metrics for active tracking (distance + duration in HeroMetric)
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

          {/* Hero Metric - Distance + Duration (like running tracker) */}
          <View style={styles.heroSection}>
            <HeroMetric
              primaryValue={metrics.distance.replace(' km', '')}
              primaryUnit="km"
              secondaryValue={activityMetricsService.formatDuration(elapsedTime)}
            />
          </View>

          {/* Secondary Metrics Row */}
          <SecondaryMetricRow metrics={secondaryMetrics} />
        </View>
      ) : (
        /* ============ IDLE STATE ============ */
        <View style={styles.idleCenteredContainer}>
          <HoldToStartButton
            label={t('startWalk')}
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
            startLabel="Start Walk"
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
        activityType="walking"
        onSelectRoute={(routeId, routeName) => {
          setSelectedRoute({ id: routeId, name: routeName });
          setRouteSelectionVisible(false);
        }}
        onClose={() => setRouteSelectionVisible(false)}
      />

      {/* Step Goal Picker Modal */}
      <StepGoalPickerModal
        visible={goalPickerVisible}
        currentGoal={stepGoal}
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
          setPostingState('idle');
        }}
        onSuccess={() => {
          setShowSocialModal(false);
          setPreparedWorkout(null);
          setPostingState('posted');
          console.log(
            '[WalkingTrackerScreen] ✅ Daily steps posted successfully'
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
    backgroundColor: theme.colors.background,
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
  // Hero metric section
  heroSection: {
    flex: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  // Route selector in idle state (compact to fit above Start button)
  routeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  routeSelectorText: {
    fontSize: 15,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    flex: 1,
    textAlign: 'center',
  },
});
