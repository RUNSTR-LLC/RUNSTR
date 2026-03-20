/**
 * RunningTrackerScreen - Real-time running tracker
 * Displays distance, time, pace, and elevation with GPS tracking
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  InteractionManager,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as TaskManager from 'expo-task-manager';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles/theme';
const WEEKLY_DISTANCE_UPDATE_KEY = '@runstr:weekly_distance_last_updated_running';
import { CustomAlert } from '../../components/ui/CustomAlert';
import { simpleRunTracker } from '../../services/activity/SimpleRunTracker';
import type {
  RunSession,
  GPSPoint,
} from '../../services/activity/SimpleRunTracker';
import type { Split } from '../../services/activity/SplitTrackingService';
import { activityMetricsService } from '../../services/activity/ActivityMetricsService';
import type { FormattedMetrics } from '../../services/activity/ActivityMetricsService';
import { BatteryWarning } from '../../components/activity/BatteryWarning';
import { WorkoutSummaryModal } from '../../components/activity/WorkoutSummaryModal';
import LocalWorkoutStorageService from '../../services/fitness/LocalWorkoutStorageService';
import routeStorageService from '../../services/routes/RouteStorageService';
import { RouteSelectionModal } from '../../components/routes/RouteSelectionModal';
import { HoldToStartButton } from '../../components/activity/HoldToStartButton';
import { AppStateManager } from '../../services/core/AppStateManager';
// Weekly distance goal components
import {
  WeeklyDistanceGoalCard,
  type PostingState,
} from '../../components/activity/WeeklyDistanceGoalCard';
import { DistanceGoalPickerModal } from '../../components/activity/DistanceGoalPickerModal';
import { weeklyDistanceGoalService } from '../../services/activity/WeeklyDistanceGoalService';
import type { DistanceGoalProgress } from '../../services/activity/WeeklyDistanceGoalService';
import { EnhancedSocialShareModal } from '../../components/profile/shared/EnhancedSocialShareModal';
import { nostrProfileService } from '../../services/nostr/NostrProfileService';
import type { NostrProfile } from '../../services/nostr/NostrProfileService';
import type { PublishableWorkout } from '../../services/nostr/workoutPublishingService';
// New redesigned components
import { HeroMetric } from '../../components/activity/HeroMetric';
import {
  SecondaryMetricRow,
  type SecondaryMetric,
} from '../../components/activity/SecondaryMetricRow';
import { SplitsBar } from '../../components/activity/SplitsBar';
import { CountdownOverlay } from '../../components/activity/CountdownOverlay';
import { LastActivityCard } from '../../components/activity/LastActivityCard';
// Debug overlays for GPS and step diagnosis
import { ActivityDebugOverlay } from '../../components/debug/ActivityDebugOverlay';
import { StepDebugOverlay } from '../../components/debug/StepDebugOverlay';

// DEBUG MODE - Set to true for debug APK builds, false for production
const DEBUG_MODE = false;

// Constants
const TIMER_INTERVAL_MS = 1000; // Update timer every second
const METRICS_UPDATE_INTERVAL_MS = 1000; // Update metrics every second for running
const MIN_WORKOUT_DISTANCE_METERS = 10; // Minimum distance to show workout summary
const ZOMBIE_SESSION_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 hours
const ANDROID_BACKGROUND_WARNING_KEY =
  '@runstr:android_background_warning_shown';


interface MetricCardProps {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon }) => (
  <View style={styles.metricCard}>
    {icon && (
      <Ionicons
        name={icon}
        size={20}
        color={theme.colors.textMuted}
        style={styles.metricIcon}
      />
    )}
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

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
  const [metrics, setMetrics] = useState<FormattedMetrics>({
    distance: '0.00 km',
    duration: '0:00',
    pace: '--:--',
    elevation: '0 m',
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [countdown, setCountdown] = useState<3 | 2 | 1 | 'GO' | null>(null);
  const [workoutData, setWorkoutData] = useState<{
    type: 'running' | 'walking' | 'cycling';
    distance: number;
    duration: number;
    calories: number;
    elevation?: number;
    pace?: number;
    speed?: number;
    steps?: number;
    splits?: Split[];
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

  // Route state (simple label-based)
  const [showRouteSelectionModal, setShowRouteSelectionModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<{ id: string; name: string } | null>(null);

  // Weekly distance goal state
  const [weeklyDistance, setWeeklyDistance] = useState<number | null>(null);
  const [distanceGoal, setDistanceGoal] = useState<number>(20);
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

  const metricsUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const isTrackingRef = useRef<boolean>(false); // Track isTracking without re-subscribing
  const isPausedRef = useRef<boolean>(false); // CRITICAL FIX: Track isPaused for beforeRemove listener
  // Liveness detection: track when updateMetrics() last actually executed
  // This detects "zombie" intervals that exist but stopped firing (Android throttling)
  const lastMetricsUpdateRef = useRef<number>(Date.now());
  // NOTE: Timer refs removed - SimpleRunTracker handles all timing internally via hybrid timer

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
      CustomAlert.show({
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

  // Extract metrics update logic to reusable function (defined early for useEffect)
  const updateMetrics = () => {
    // LIVENESS: Mark that updateMetrics actually executed (for zombie detection)
    lastMetricsUpdateRef.current = Date.now();

    // FIX: Removed AppStateManager check that was stopping UI updates
    // The interval management in useEffect handles background/foreground properly
    // This check was causing UI to freeze when iOS sent spurious background events

    const session = simpleRunTracker.getCurrentSession(); // NOW SYNCHRONOUS!

    if (
      session &&
      session.distance !== undefined &&
      session.duration !== undefined
    ) {
      const formattedDuration = formatElapsedTime(session.duration);

      const currentMetrics = {
        distance: session.distance,
        duration: session.duration,
        pace: activityMetricsService.calculatePace(
          session.distance,
          session.duration
        ),
        elevationGain: session.elevationGain || 0, // FIXED: Use actual elevation from session
      };

      const formatted = activityMetricsService.getFormattedMetrics(
        currentMetrics,
        'running'
      );
      formatted.duration = formattedDuration;

      setMetrics(formatted);
      setElapsedTime(session.duration);
    }
  };

  // Helper function to safely start metrics interval (prevents duplicates)
  const startMetricsInterval = () => {
    // Always clear existing interval first to prevent duplicates
    if (metricsUpdateRef.current) {
      clearInterval(metricsUpdateRef.current);
    }
    metricsUpdateRef.current = setInterval(() => {
      updateMetrics();
    }, METRICS_UPDATE_INTERVAL_MS);
  };

  // Check for active session on mount (fixes session loss on app switch)
  // Also handles auto-recovery of interrupted workouts
  useEffect(() => {
    // ✅ PERFORMANCE FIX: Defer session restoration until after navigation completes
    // This eliminates 7-second blocking from AsyncStorage reads and GPS point processing
    InteractionManager.runAfterInteractions(() => {
      const restoreActiveSession = async () => {
        console.log(
          '[RunningTrackerScreen] Checking for active session (deferred for performance)...'
        );

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

    return () => {
      // Cleanup timers on unmount
      if (metricsUpdateRef.current) clearInterval(metricsUpdateRef.current);
    };
  }, []);

  // Load user profile for social sharing
  useEffect(() => {
    const loadProfileAndId = async () => {
      try {
        const pubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
        const npub = await AsyncStorage.getItem('@runstr:npub');
        const activeUserId = npub || pubkey || '';
        setUserId(activeUserId);

        if (pubkey) {
          const profile = await nostrProfileService.getProfile(pubkey);
          setUserProfile(profile);
        }
      } catch (error) {
        console.error(
          '[RunningTrackerScreen] Failed to load user profile:',
          error
        );
      }
    };

    loadProfileAndId();
  }, []);

  // Load weekly distance data on mount
  useEffect(() => {
    const loadWeeklyDistance = async () => {
      try {
        setDistanceLoading(true);

        // Get goal
        const goal = await weeklyDistanceGoalService.getGoal('running');
        setDistanceGoal(goal);

        // Get weekly distance
        const distance =
          await weeklyDistanceGoalService.getWeeklyDistance('running');
        setWeeklyDistance(distance);

        // Calculate progress
        const progress = weeklyDistanceGoalService.calculateProgress(
          distance,
          goal
        );
        setDistanceProgress(progress);

        console.log(
          `[RunningTrackerScreen] Weekly distance: ${distance.toFixed(
            2
          )}km, goal: ${goal}km`
        );

        setDistanceLoading(false);
      } catch (error) {
        console.error(
          '[RunningTrackerScreen] Error loading weekly distance:',
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
    const unsubscribe = appStateManager.onStateChange(async (isActive) => {
      if (!isActive) {
        // FIX iOS 30-min issue: Don't clear timers unless TRULY backgrounded
        // iOS sometimes sends spurious background events while app is still visible
        console.log(
          '[RunningTrackerScreen] App state change detected - verifying if truly backgrounded...'
        );

        // Give iOS a moment to stabilize before clearing intervals
        setTimeout(() => {
          // Double-check if app is still inactive before clearing
          if (!appStateManager.isActive()) {
            console.log(
              '[RunningTrackerScreen] Confirmed backgrounded, pausing UI updates...'
            );
            // Don't clear intervals, just mark them as paused
            // This prevents losing them due to spurious events
          }
        }, 500);
      } else if (isActive && isTrackingRef.current) {
        // App returned to foreground - restart timers and sync data
        console.log(
          '[RunningTrackerScreen] App returned to foreground, ensuring timers are running...'
        );

        // Restart timers if not already running
        if (!metricsUpdateRef.current) {
          startMetricsInterval();
        }

        // MEMORY-ONLY ARCHITECTURE: No GPS sync needed, distance is calculated incrementally
        // getCurrentSession() is now synchronous!
        const session = simpleRunTracker.getCurrentSession();
        if (
          session &&
          session.distance !== undefined &&
          session.duration !== undefined
        ) {
          const formattedDuration = formatElapsedTime(session.duration);

          const currentMetrics = {
            distance: session.distance,
            duration: session.duration,
            pace: activityMetricsService.calculatePace(
              session.distance,
              session.duration
            ),
            elevationGain: session.elevationGain || 0, // FIXED: Use actual elevation from session
          };

          const formatted = activityMetricsService.getFormattedMetrics(
            currentMetrics,
            'running'
          );
          formatted.duration = formattedDuration;

          setMetrics(formatted);
          setElapsedTime(session.duration);

          console.log(
            `[RunningTrackerScreen] ✅ Synced: ${(
              session.distance / 1000
            ).toFixed(2)} km, ` + `${session.duration}s`
          );
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []); // Subscribe only once to avoid race conditions

  // NOTE: isTrackingRef sync removed - consolidated at lines 179-182 to prevent duplicate updates

  // FIX iOS 30-min issue + Android throttling: Health check with LIVENESS detection
  // This prevents UI freeze from:
  // 1. iOS spurious background events that clear intervals
  // 2. Android throttling intervals to "zombie" state (exist but don't fire)
  useEffect(() => {
    if (!isTracking) return;

    const healthCheckInterval = setInterval(() => {
      // LIVENESS CHECK: Detect "zombie" intervals that exist but stopped firing
      // This happens when Android throttles background JS execution
      // Using 10s threshold to avoid false positives from GPS delays or React lag
      const timeSinceLastUpdate = Date.now() - lastMetricsUpdateRef.current;
      const isZombieInterval = metricsUpdateRef.current && timeSinceLastUpdate > 10000;

      if (isZombieInterval) {
        console.log(
          `[RunningTrackerScreen] 🧟 ZOMBIE INTERVAL DETECTED - no update for ${(timeSinceLastUpdate / 1000).toFixed(1)}s, restarting...`
        );
        // Kill the zombie and create a fresh interval
        startMetricsInterval();
      }

      // If we're tracking but metrics interval is completely dead (null), restart it
      if (isTracking && !metricsUpdateRef.current) {
        console.log(
          '[RunningTrackerScreen] Metrics interval was null, restarting...'
        );
        startMetricsInterval();
      }
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(healthCheckInterval);
    };
  }, [isTracking]);

  const handleHoldComplete = async () => {
    console.log('[RunningTrackerScreen] Hold complete, starting countdown...');

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
            proceedWithTracking();
          }, 500); // Show "GO!" for 0.5 seconds
        }, 1000);
      }, 1000);
    }, 1000);
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
      console.error(
        '[RunningTrackerScreen] Failed to start tracking:',
        errorMessage
      );
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

  const formatElapsedTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
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
    // Clear timers
    if (metricsUpdateRef.current) {
      clearInterval(metricsUpdateRef.current);
      metricsUpdateRef.current = null;
    }

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
        // Reset metrics
        setMetrics({
          distance: '0.00 km',
          duration: '0:00',
          pace: '--:--',
          elevation: '0 m',
        });
        setElapsedTime(0);
        setSelectedRoute(null); // Clear selected route
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

    // Save workout to local storage BEFORE showing modal
    // This ensures data persists even if user dismisses modal
    try {
      // Get start position for weather lookup (may be undefined in memory-only mode)
      const startPosition = session.gpsPoints?.[0];

      const result = await LocalWorkoutStorageService.saveGPSWorkout({
        type: 'running',
        distance: session.distance,
        duration: session.duration,
        calories,
        elevation: session.elevationGain || 0,
        pace,
        splits: session.splits,
        // Pass GPS coordinates for weather lookup
        startLatitude: startPosition?.latitude,
        startLongitude: startPosition?.longitude,
        // Pass route info if selected
        routeId: selectedRoute?.id,
        routeLabel: selectedRoute?.name,
      });

      console.log(`[RunningTracker] GPS workout saved locally: ${result.workoutId}`);
      if (result.rewardSent) {
        console.log(`[RunningTracker] ⚡ Reward sent: ${result.rewardAmount} sats!`);
      }

      // If a route was selected, add this workout to the route
      if (selectedRoute && pace !== undefined) {
        try {
          await routeStorageService.addWorkoutToRoute(
            selectedRoute.id,
            result.workoutId,
            session.duration,
            pace
          );
          console.log(`[RunningTracker] Workout added to route "${selectedRoute.name}"`);
        } catch (routeError) {
          console.error('[RunningTracker] Failed to add workout to route:', routeError);
        }
      }

      setWorkoutData({
        type: 'running',
        distance: session.distance,
        duration: session.duration,
        calories,
        elevation: session.elevationGain || 0,
        pace,
        splits: session.splits, // ✅ Pass splits from SimpleRunTracker
        localWorkoutId: result.workoutId, // Pass to modal for sync tracking
        routeId: selectedRoute?.id, // Pass route info for achievements
        routeName: selectedRoute?.name,
        rewardSent: result.rewardSent, // Pass reward info to modal
        rewardAmount: result.rewardAmount,
      });
      setSummaryModalVisible(true);
    } catch (error) {
      console.error('❌ Failed to save workout locally:', error);
      // Still show modal even if save failed
      setWorkoutData({
        type: 'running',
        distance: session.distance,
        duration: session.duration,
        calories,
        elevation: session.elevationGain || 0,
        pace,
        splits: session.splits, // ✅ Pass splits even if save failed
        routeId: selectedRoute?.id, // Pass route info for achievements
        routeName: selectedRoute?.name,
      });
      setSummaryModalVisible(true);
    }

    // Reset metrics after showing summary
    setMetrics({
      distance: '0.00 km',
      duration: '0:00',
      pace: '--:--',
      elevation: '0 m',
    });
    setElapsedTime(0);
  };

  // Handle posting weekly distance to Nostr
  const handlePostWeeklyDistance = async () => {
    if (!weeklyDistance || weeklyDistance === 0) {
      console.warn('[RunningTrackerScreen] Cannot post - no distance available');
      return;
    }

    if (distancePostingState === 'posted') {
      console.warn('[RunningTrackerScreen] Weekly distance already posted');
      return;
    }

    try {
      setDistancePostingState('posting');
      console.log(
        `[RunningTrackerScreen] Preparing to post ${weeklyDistance.toFixed(2)}km weekly distance`
      );

      const weekBounds = weeklyDistanceGoalService.getWeekBounds();
      const weekNumber = weeklyDistanceGoalService.getWeekNumber();

      // Create PublishableWorkout for social sharing
      const publishableWorkout: PublishableWorkout = {
        id: `weekly_running_${weekNumber}_${Date.now()}`,
        userId: userId || 'unknown',
        type: 'running',
        startTime: weekBounds.start.toISOString(),
        endTime: weekBounds.end.toISOString(),
        duration: 0, // Weekly summary - no specific duration
        distance: weeklyDistance * 1000, // Convert km to meters
        calories: Math.round(weeklyDistance * 60), // Rough estimate
        source: 'manual',
        syncedAt: new Date().toISOString(),
        sourceApp: 'RUNSTR',
        unitSystem: 'metric',
        canSyncToNostr: true,
        metadata: {
          title: `Week ${weekNumber} Running`,
          sourceApp: 'RUNSTR',
          notes: `Weekly running: ${weeklyDistance.toFixed(2)}km / ${distanceGoal}km goal (${distanceProgress?.percentage || 0}%)`,
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
        `[RunningTrackerScreen] ✅ Opening social share modal for weekly distance`
      );
    } catch (error) {
      console.error(
        '[RunningTrackerScreen] ❌ Failed to post weekly distance:',
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
    console.log('[RunningTrackerScreen] Opening goal selection modal...');
    setGoalPickerVisible(true);
  };

  // Handle goal selected from picker
  const handleGoalSelected = async (newGoal: number) => {
    try {
      await weeklyDistanceGoalService.setGoal('running', newGoal);
      setDistanceGoal(newGoal);

      // Recalculate progress
      if (weeklyDistance !== null) {
        const progress = weeklyDistanceGoalService.calculateProgress(
          weeklyDistance,
          newGoal
        );
        setDistanceProgress(progress);
      }

      console.log(`[RunningTrackerScreen] ✅ Goal updated to ${newGoal}km`);
    } catch (error) {
      console.error('[RunningTrackerScreen] ❌ Failed to update goal:', error);
    }
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

          {/* Selected Route Display */}
          {selectedRoute && (
            <View style={styles.selectedRouteDisplay}>
              <Ionicons name="map" size={16} color={theme.colors.accent} />
              <Text style={styles.selectedRouteText}>{selectedRoute.name}</Text>
            </View>
          )}

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
        <View style={styles.fixedControlsWrapper}>
          <View style={styles.controlsContainer}>
            {!isPaused ? (
              <TouchableOpacity
                style={styles.pauseButton}
                onPress={pauseTracking}
              >
                <Ionicons name="pause" size={30} color={theme.colors.text} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.resumeButton}
                onPress={resumeTracking}
              >
                <Ionicons
                  name="play"
                  size={30}
                  color={theme.colors.background}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.stopButton}
              onPress={stopTracking}
            >
              <Ionicons name="stop" size={30} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
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
          workout={workoutData as any}
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
        visible={showRouteSelectionModal}
        activityType="running"
        onSelectRoute={(routeId, routeName) => {
          setSelectedRoute({ id: routeId, name: routeName });
          setShowRouteSelectionModal(false);
          console.log(`[RunningTracker] Selected route: ${routeName}`);
        }}
        onClose={() => setShowRouteSelectionModal(false)}
      />

      {/* Distance Goal Picker Modal */}
      <DistanceGoalPickerModal
        visible={goalPickerVisible}
        activityType="running"
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
            '[RunningTrackerScreen] ✅ Weekly distance posted successfully'
          );
        }}
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
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 16,
  },
  scrollableContent: {
    flex: 1,
  },
  idleScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 160, // Space for fixed controls
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
  // Activity Header (idle state)
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  activityTitle: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    letterSpacing: 2,
  },
  // Route Picker Button (idle state)
  routePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  routePickerText: {
    fontSize: 18,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    flex: 1,
    textAlign: 'center',
  },
  selectedRouteDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent + '15',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    gap: 8,
  },
  selectedRouteText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.accent,
  },
  fixedControlsWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 24,
    paddingTop: 16,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    // Subtle elevation for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    // Shadow for Android
    elevation: 8,
  },
  gpsContainer: {
    marginBottom: 16,
  },
  metricsContainer: {
    justifyContent: 'flex-start',
    paddingTop: 12,
    paddingBottom: 12, // Ensure space for controls
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 6,
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
    gap: 20,
  },
  routesButton: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  routesButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 0.5,
  },
  startButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 0.5,
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
    backgroundColor: theme.colors.orangeBright, // Orange for resume
    borderRadius: 35,
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    backgroundColor: theme.colors.card, // Dark gray for stop
    borderRadius: 35,
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  splitsContainer: {
    marginTop: 20,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.orangeDeep,
    maxHeight: 220, // Fits ~5 splits, scrollable for longer runs
    flexShrink: 1, // Allow shrinking if space is limited
  },
  splitsTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.orangeBright,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  splitsScrollContent: {
    gap: 4, // Reduced for compact layout
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 6, // Reduced for compact layout
    borderWidth: 1,
    borderColor: theme.colors.orangeDeep,
  },
  splitNumberContainer: {
    width: 40,
    marginRight: 12,
  },
  splitNumber: {
    fontSize: 14, // Reduced for compact layout
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.orangeBright,
  },
  splitTimeContainer: {
    flex: 1,
  },
  splitTime: {
    fontSize: 15, // Reduced for compact layout
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 2,
  },
  splitPace: {
    fontSize: 10, // Reduced for compact layout
    color: theme.colors.textMuted,
  },
  splitIconContainer: {
    marginLeft: 8,
  },
  countdownContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 40,
  },
  countdownText: {
    fontSize: 120,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
    textAlign: 'center',
  },
});
