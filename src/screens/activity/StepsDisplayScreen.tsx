/**
 * StepsDisplayScreen - Walk screen with circular progress ring
 * Shows daily steps in a hero layout with WoT-gated posting
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Platform,
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { OstrichRefreshScrollView } from '../../components/ui/OstrichRefreshScrollView';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import { StepProgressRing } from '../../components/activity/StepProgressRing';
import { dailyStepCounterService } from '../../services/activity/DailyStepCounterService';
import { activityMetricsService } from '../../services/activity/ActivityMetricsService';
import { StepCompetitionService } from '../../services/competition/StepCompetitionService';
import { WoTService } from '../../services/wot/WoTService';
import { EnhancedSocialShareModal } from '../../components/profile/shared/EnhancedSocialShareModal';
import { nostrProfileService } from '../../services/nostr/NostrProfileService';
import type { NostrProfile } from '../../services/nostr/NostrProfileService';
import LocalWorkoutStorageService from '../../services/fitness/LocalWorkoutStorageService';
import type { PublishableWorkout } from '../../services/nostr/workoutPublishingService';
import { CustomAlert } from '../../components/ui/CustomAlert';

type PostingState = 'idle' | 'posting' | 'posted';

export const StepsDisplayScreen: React.FC = () => {
  // Step data state
  const [dailySteps, setDailySteps] = useState<number | null>(null);
  const [estimatedDistance, setEstimatedDistance] = useState<number>(0);
  const [hasGPSWorkouts, setHasGPSWorkouts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [postingState, setPostingState] = useState<PostingState>('idle');
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }>;
  }>({ title: '', message: '', buttons: [] });

  // WoT eligibility state
  const [isWoTEligible, setIsWoTEligible] = useState(false);

  // User data
  const [userProfile, setUserProfile] = useState<NostrProfile | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [preparedWorkout, setPreparedWorkout] = useState<PublishableWorkout | null>(null);

  // Refs
  const isSubmittingRef = useRef(false);

  // Load user profile and WoT score for social sharing
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

          const wotService = WoTService.getInstance();
          const score = await wotService.getCachedScore(pubkey);
          if (isMounted) setIsWoTEligible(score !== null && score > 0);
        }
      } catch (err) {
        console.error('[StepsDisplay] Failed to load user profile:', err);
      }
    };
    loadProfileAndId();
    return () => { isMounted = false; };
  }, []);

  // Check if daily steps already posted today
  useEffect(() => {
    let isMounted = true;
    const checkIfPosted = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const alreadyPosted = await LocalWorkoutStorageService.hasDailyStepsForDate(today);
        if (isMounted && alreadyPosted) {
          setPostingState('posted');
        }
      } catch (err) {
        console.error('[StepsDisplay] Error checking posted status:', err);
      }
    };
    checkIfPosted();
    return () => { isMounted = false; };
  }, [dailySteps]);

  /**
   * Fetch steps from HealthKit/Health Connect
   */
  const refreshSteps = async () => {
    try {
      // Check if step counting is available
      const available = await dailyStepCounterService.isAvailable();
      if (!available) {
        if (Platform.OS === 'android') {
          setError('Install Health Connect from Play Store');
        } else {
          setError('Step counting not available');
        }
        setLoading(false);
        return;
      }

      // Check permission status
      const permissionStatus = await dailyStepCounterService.checkPermissionStatus();
      if (permissionStatus !== 'granted') {
        // Request permissions
        const granted = await dailyStepCounterService.requestPermissions();
        if (!granted) {
          setError('Grant permissions to see steps');
          setLoading(false);
          return;
        }
      }

      // Get step data
      const stepData = await dailyStepCounterService.getTodaySteps();
      if (stepData) {
        setDailySteps(stepData.steps);

        // Fetch today's GPS workout distance for combined calculation
        const gpsData = await LocalWorkoutStorageService.getTodayGPSDistance();
        setHasGPSWorkouts(gpsData.workoutCount > 0);

        // Calculate combined distance (GPS workouts + step-estimated non-workout distance)
        const distance = activityMetricsService.calculateCombinedDailyDistance(
          stepData.steps,
          gpsData.distanceMeters
        );
        setEstimatedDistance(distance);

        setError(null);
        const gpsInfo = gpsData.workoutCount > 0
          ? ` (incl. ${(gpsData.distanceMeters / 1000).toFixed(2)}km GPS)`
          : '';
        console.log(`[StepsDisplay] Loaded ${stepData.steps} steps → ${(distance / 1000).toFixed(2)} km${gpsInfo}`);
      } else {
        setDailySteps(0);
        setEstimatedDistance(0);
        setHasGPSWorkouts(false);
      }
    } catch (err) {
      console.error('[StepsDisplay] Error fetching steps:', err);
      setError('Failed to load steps');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Auto-submit steps to Supabase (non-blocking)
   */
  const submitStepsNonBlocking = async () => {
    // Prevent concurrent submissions
    if (isSubmittingRef.current) return;

    try {
      const npub = await AsyncStorage.getItem('@runstr:npub');
      if (!npub) return;

      isSubmittingRef.current = true;

      // Fire-and-forget - don't await, don't block UI
      StepCompetitionService.forceSubmitSteps(npub)
        .then(result => {
          if (result.success) {
            console.log('[StepsDisplay] Auto-submitted to Supabase');
          } else if (result.error) {
            console.log('[StepsDisplay] Submission skipped:', result.error);
          }
        })
        .catch(() => {
          // Silent fail - auto-submit is best-effort
        })
        .finally(() => {
          isSubmittingRef.current = false;
        });
    } catch {
      isSubmittingRef.current = false;
    }
  };

  // Auto-refresh and submit on screen focus
  useFocusEffect(
    useCallback(() => {
      refreshSteps();
      submitStepsNonBlocking();
    }, [])
  );

  // Pull-to-refresh: bypass the 5s in-memory cache so the user can force a
  // fresh HealthKit query without leaving the screen.
  const handlePullToRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      dailyStepCounterService.clearCache();
      await refreshSteps();
      submitStepsNonBlocking();
    } finally {
      setRefreshing(false);
    }
  }, []);

  /**
   * Handle post daily steps (triggered by tapping the ring)
   */
  const handlePostDailySteps = async () => {
    if (!dailySteps || dailySteps === 0) return;
    if (postingState === 'posted') return;

    try {
      setPostingState('posting');

      const now = new Date();
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      const duration = Math.floor((now.getTime() - midnight.getTime()) / 1000);
      const calories = Math.round(dailySteps * 0.04);

      // Save to local storage (include estimated distance for workout history)
      const workoutId = await LocalWorkoutStorageService.saveDailyStepsWorkout({
        steps: dailySteps,
        distance: estimatedDistance, // Non-GPS step distance from ActivityMetricsService
        startTime: midnight.toISOString(),
        endTime: now.toISOString(),
        duration,
        calories,
      });

      // Create PublishableWorkout for social sharing
      const publishableWorkout: PublishableWorkout = {
        id: workoutId,
        userId: userId || 'unknown',
        type: 'walking',
        startTime: midnight.toISOString(),
        endTime: now.toISOString(),
        duration,
        distance: estimatedDistance,
        calories,
        source: 'manual',
        syncedAt: new Date().toISOString(),
        sourceApp: 'RUNSTR',
        unitSystem: 'metric',
        canSyncToNostr: true,
        metadata: {
          title: 'Daily Steps',
          sourceApp: 'RUNSTR',
          notes: `${dailySteps.toLocaleString()} steps tracked today`,
          steps: dailySteps,
        },
      };

      setPreparedWorkout(publishableWorkout);
      setShowSocialModal(true);
    } catch (err) {
      console.error('[StepsDisplay] Failed to post daily steps:', err);
      setPostingState('idle');
      setAlertConfig({
        title: 'Failed to Post Steps',
        message: 'Could not save daily steps. Please try again.',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setAlertVisible(true);
    }
  };

  // Display values
  const displaySteps = dailySteps ?? 0;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <OstrichRefreshScrollView
        refreshing={refreshing}
        onRefresh={handlePullToRefresh}
        contentContainerStyle={styles.scrollContent}
        alwaysBounceVertical
      >
        <View style={styles.contentContainer}>
          {/* Centered Ring - matches Run/Cycle idle state layout */}
          <TouchableOpacity
            style={styles.ringSection}
            onPress={isWoTEligible && postingState !== 'posted' ? handlePostDailySteps : undefined}
            activeOpacity={isWoTEligible && postingState !== 'posted' ? 0.7 : 1}
            disabled={postingState === 'posting'}
          >
            {postingState === 'posting' ? (
              <View style={styles.loadingRing}>
                <ActivityIndicator size="large" color={theme.colors.accent} />
              </View>
            ) : (
              <StepProgressRing
                steps={displaySteps}
                estimatedDistance={estimatedDistance}
                size={200}
                showProgress={false}
                hasGPSWorkouts={hasGPSWorkouts}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Show connection status at bottom if not connected */}
        {error && (
          <Text style={styles.statusMessage}>{error}</Text>
        )}
      </OstrichRefreshScrollView>

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
          setPostingState('idle');
        }}
        onSuccess={() => {
          setShowSocialModal(false);
          setPreparedWorkout(null);
          setPostingState('posted');
        }}
      />

      {/* Custom Alert Modal */}
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 16,
  },
  statusMessage: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  ringSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80, // Adjusted position
  },
  loadingRing: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
