/**
 * ActivityTrackerScreen - Main activity tracking interface with 2D swipe grid
 *
 * Navigation:
 * - Swipe Left/Right: Navigate between activities within current category
 * - Swipe Up: Move to next category (Cardio → Strength → Wellness)
 * - Swipe Down: Move to previous category
 *
 * No menus - pure gesture-based navigation.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, InteractionManager, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import { PermissionRequestModal } from '../../components/permissions/PermissionRequestModal';
import { appPermissionService } from '../../services/initialization/AppPermissionService';
import { SwipeGridNavigator } from '../../components/activity/SwipeGridNavigator';
import {
  activityGridService,
  type GridPosition,
} from '../../services/activity/ActivityGridService';
import { RunningTrackerScreen } from './RunningTrackerScreen';
import { WalkingTrackerScreen } from './WalkingTrackerScreen';
import { CyclingTrackerScreen } from './CyclingTrackerScreen';
import { HikingTrackerScreen } from './HikingTrackerScreen';
import { MeditationTrackerScreen } from './MeditationTrackerScreen';
import { StrengthTrackerScreen } from './StrengthTrackerScreen';
import { JournalTrackerScreen } from './JournalTrackerScreen';
import { HabitTrackerScreen } from './HabitTrackerScreen';
import { dailyStepCounterService } from '../../services/activity/DailyStepCounterService';
import { WoTService } from '../../services/wot/WoTService';
import { EnhancedSocialShareModal } from '../../components/profile/shared/EnhancedSocialShareModal';
import { UnifiedSigningService } from '../../services/auth/UnifiedSigningService';
import { WorkoutPublishingService } from '../../services/nostr/workoutPublishingService';
import { nostrProfileService } from '../../services/nostr/NostrProfileService';
import type { Workout } from '../../types/workout';
import type { PublishableWorkout } from '../../services/nostr/workoutPublishingService';

import { KM_PER_STEP } from '../../constants/appConstants';

// Strength exercise type mapping
type StrengthExercise = 'pushups' | 'pullups' | 'situps' | 'squats' | 'curls' | 'bench';

// Wellness/meditation type mapping
type MeditationType = 'guided' | 'unguided' | 'breathwork' | 'body_scan' | 'gratitude';

export const ActivityTrackerScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  // Grid navigation state
  const [gridPosition, setGridPosition] = useState<GridPosition>({ row: 0, column: 0 });
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);

  // Permission state
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionsReady, setPermissionsReady] = useState(false);

  // Step header state
  const [dailySteps, setDailySteps] = useState<number>(0);
  const [canPostSteps, setCanPostSteps] = useState<boolean>(false);
  const [showStepPostModal, setShowStepPostModal] = useState<boolean>(false);
  const [userPubkey, setUserPubkey] = useState<string>('');
  const [userProfile, setUserProfile] = useState<{ picture?: string; name?: string; display_name?: string } | null>(null);

  // Bug D: Snapshot workout when modal opens to prevent data shifts on app re-focus
  const [snapshotWorkout, setSnapshotWorkout] = useState<Workout | null>(null);

  // Bug E: Track whether steps have been posted today to show confirmation on re-post
  const [hasPostedStepsToday, setHasPostedStepsToday] = useState(false);
  const lastPostDateRef = useRef<string>('');

  // Guard: prevent rendering content (and saving) before persisted position is loaded
  const [positionLoaded, setPositionLoaded] = useState(false);

  // Load saved grid position on mount
  useEffect(() => {
    const loadPosition = async () => {
      const saved = await activityGridService.loadPosition();
      setGridPosition(saved);
      setPositionLoaded(true);
      console.log('[ActivityTracker] Loaded grid position:', saved);
    };
    loadPosition();
  }, []);

  // Save position when it changes (only after initial load to avoid overwriting with defaults)
  useEffect(() => {
    if (!positionLoaded) return;
    activityGridService.savePosition(gridPosition);
  }, [gridPosition, positionLoaded]);

  // Load step data
  const loadStepData = async () => {
    try {
      const stepData = await dailyStepCounterService.getTodaySteps();
      if (stepData) {
        setDailySteps(stepData.steps);
      }
    } catch (error) {
      console.warn('[ActivityTracker] Failed to load step data:', error);
    }
  };

  // Check WoT eligibility for step posting
  const checkWoTEligibility = async () => {
    try {
      const pubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (!pubkey) {
        setCanPostSteps(false);
        return;
      }
      setUserPubkey(pubkey);

      // Pre-load steps so they're available by the time button appears
      await loadStepData();

      // Load user profile for social card (non-blocking)
      nostrProfileService.getProfile(pubkey).then((profile) => {
        setUserProfile(profile);
      }).catch((err) => {
        console.warn('[ActivityTracker] Failed to load profile:', err);
      });

      const wotService = WoTService.getInstance();
      let score = await wotService.getCachedScore(pubkey);
      // Fallback: if cache is empty or expired, fetch from network
      if (score === null) {
        score = await wotService.fetchAndCacheScore(pubkey);
      }
      setCanPostSteps((score ?? 0) > 0);
    } catch (error) {
      console.warn('[ActivityTracker] Failed to check WoT eligibility:', error);
      setCanPostSteps(false);
    }
  };

  /**
   * Handle posting step count to Nostr as kind 1 social event
   * Called by EnhancedSocialShareModal with rendered card image
   */
  const handlePostToNostr = async (cardImageUri?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('[ActivityTracker] handlePostToNostr called with imageUri:', cardImageUri?.substring(0, 50));

      // Get fresh signer at publish time (prevents stale auth issues)
      const signingService = UnifiedSigningService.getInstance();
      const signer = await signingService.getSigner();
      if (!signer) {
        return { success: false, error: 'Not authenticated. Please log in again.' };
      }

      // Use snapshot workout so published data matches what the modal displayed
      const workout = snapshotWorkout ?? stepWorkout;
      const publishableWorkout = {
        ...workout,
        canPostToSocial: true,
      } as PublishableWorkout;

      // Post to Nostr using workoutPublishingService
      const publishingService = WorkoutPublishingService.getInstance();
      const result = await publishingService.postWorkoutToSocial(
        publishableWorkout,
        signer,
        userPubkey,
        {
          cardImageUri,
          userAvatar: userProfile?.picture,
          userName: userProfile?.name || userProfile?.display_name,
          includeCard: true,
        }
      );

      if (result.success) {
        console.log('[ActivityTracker] ✅ Step post published:', result.eventId);
        return { success: true };
      } else {
        console.error('[ActivityTracker] ❌ Step post failed:', result.error);
        return { success: false, error: result.error || 'Failed to publish post' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ActivityTracker] ❌ handlePostToNostr error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Reload step data when screen comes into focus; reset posted flag on new day
  useFocusEffect(
    useCallback(() => {
      loadStepData();

      // Bug E: Reset posted flag when the date changes
      const today = new Date().toISOString().slice(0, 10);
      if (lastPostDateRef.current && lastPostDateRef.current !== today) {
        setHasPostedStepsToday(false);
      }
    }, [])
  );

  // Check WoT eligibility on mount and retry on each focus if not yet eligible
  useFocusEffect(
    useCallback(() => {
      // Skip re-check if already eligible
      if (canPostSteps) return;

      const interaction = InteractionManager.runAfterInteractions(() => {
        checkWoTEligibility();
      });
      return () => interaction.cancel();
    }, [canPostSteps])
  );

  // Check permissions on mount
  // Gates child component rendering to prevent bridge saturation on Android
  useEffect(() => {
    const checkPermissions = async () => {
      const status = await appPermissionService.checkAllPermissions();
      if (!status.location) {
        console.log('[ActivityTracker] Location permission not granted, showing modal');
        setShowPermissionModal(true);
      } else {
        setPermissionsReady(true);
      }
    };
    checkPermissions();
  }, []);

  // Navigation handlers
  const handleSwipeLeft = () => {
    if (isWorkoutActive) return;
    const newPos = activityGridService.navigateLeft(gridPosition);
    setGridPosition(newPos);
    console.log('[ActivityTracker] Swipe left → column', newPos.column);
  };

  const handleSwipeRight = () => {
    if (isWorkoutActive) return;
    const newPos = activityGridService.navigateRight(gridPosition);
    setGridPosition(newPos);
    console.log('[ActivityTracker] Swipe right → column', newPos.column);
  };

  const handleSwipeUp = () => {
    if (isWorkoutActive) return;
    const newPos = activityGridService.navigateUp(gridPosition);
    if (newPos) {
      setGridPosition(newPos);
      console.log('[ActivityTracker] Swipe up → row', newPos.row);
    }
  };

  const handleSwipeDown = () => {
    if (isWorkoutActive) return;
    const newPos = activityGridService.navigateDown(gridPosition);
    if (newPos) {
      setGridPosition(newPos);
      console.log('[ActivityTracker] Swipe down → row', newPos.row);
    }
  };

  // Handle step post button tap
  const handlePostSteps = () => {
    if (!canPostSteps) return;

    // Bug E: If already posted today, ask for confirmation before re-posting
    if (hasPostedStepsToday) {
      Alert.alert(
        'Already Posted',
        'You already shared your steps today. Post again with updated count?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Post Again',
            onPress: () => {
              setSnapshotWorkout(stepWorkout);
              setShowStepPostModal(true);
            },
          },
        ]
      );
      return;
    }

    // Bug D: Freeze workout data at modal open time
    setSnapshotWorkout(stepWorkout);
    setShowStepPostModal(true);
  };

  // Create a synthetic workout object for step posting (memoized to prevent render thrash)
  const createStepWorkout = (): Workout => {
    // Estimate duration: ~0.5 seconds per step (walking pace)
    const estimatedDuration = Math.max(Math.round(dailySteps * 0.5), 1);
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - estimatedDuration * 1000);
    return {
      id: `steps-${endTime.getTime()}`,
      userId: userPubkey,
      type: 'walking',
      duration: estimatedDuration,
      distance: dailySteps * KM_PER_STEP * 1000,
      calories: Math.round(dailySteps * 0.04),
      steps: dailySteps,
      source: 'healthkit',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      syncedAt: endTime.toISOString(),
    };
  };

  // Memoize step workout to prevent creating a new object on every render
  // Without this, the modal's useEffect fires on every parent re-render,
  // causing render thrash that prevents content from stabilizing on Android
  const stepWorkout = useMemo(() => createStepWorkout(), [dailySteps, userPubkey]);

  // Render the appropriate tracker based on grid position
  const renderContent = () => {
    const { category, activity } = activityGridService.getActivityAt(gridPosition);

    switch (category.key) {
      case 'cardio':
        switch (activity) {
          case 'run':
            return <RunningTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
          case 'walk':
            return <WalkingTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
          case 'cycle':
            return <CyclingTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
          case 'hiking':
            return <HikingTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
          default:
            return <RunningTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
        }

      case 'strength': {
        const validExercises: StrengthExercise[] = ['pushups', 'pullups', 'situps', 'squats', 'curls', 'bench'];
        const exercise = validExercises.includes(activity as StrengthExercise)
          ? (activity as StrengthExercise)
          : 'pushups';
        return <StrengthTrackerScreen initialExercise={exercise} />;
      }

      case 'wellness': {
        const validMeditations: MeditationType[] = ['guided', 'unguided', 'breathwork', 'body_scan', 'gratitude'];
        const meditationType = validMeditations.includes(activity as MeditationType)
          ? (activity as MeditationType)
          : 'guided';
        return <MeditationTrackerScreen initialType={meditationType} />;
      }

      case 'mindfulness': {
        switch (activity) {
          case 'journal':
            return <JournalTrackerScreen />;
          case 'habits':
            return <HabitTrackerScreen />;
          default:
            return <JournalTrackerScreen />;
        }
      }

      default:
        return <RunningTrackerScreen onWorkoutStateChange={setIsWorkoutActive} />;
    }
  };

  // Format step count with commas
  const formatSteps = (steps: number): string => {
    return steps.toLocaleString();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with step counter */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.stepDisplay}
          onPress={handlePostSteps}
          disabled={!canPostSteps}
          activeOpacity={canPostSteps ? 0.7 : 1}
        >
          <Text style={styles.stepCount}>{formatSteps(dailySteps)} steps</Text>
        </TouchableOpacity>

        <View style={styles.headerSpacer} />
      </View>

      {/* Main content - gated on position load (prevents flash) and permissions */}
      {positionLoaded && permissionsReady ? (
        <SwipeGridNavigator
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          onSwipeUp={handleSwipeUp}
          onSwipeDown={handleSwipeDown}
          disabled={isWorkoutActive}
        >
          <View style={styles.contentWrapper}>
            {renderContent()}
          </View>
        </SwipeGridNavigator>
      ) : !showPermissionModal ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.orangeBright} />
        </View>
      ) : null}

      {/* Permission Request Modal */}
      {showPermissionModal && (
        <PermissionRequestModal
          visible={true}
          onComplete={() => {
            setShowPermissionModal(false);
            setPermissionsReady(true);
            console.log('[ActivityTracker] Permissions granted');
          }}
        />
      )}

      {/* Step Post Modal */}
      <EnhancedSocialShareModal
        visible={showStepPostModal}
        workout={snapshotWorkout ?? stepWorkout}
        userId={userPubkey}
        userAvatar={userProfile?.picture}
        userName={userProfile?.name || userProfile?.display_name}
        onPostToNostr={handlePostToNostr}
        onClose={() => {
          setShowStepPostModal(false);
          setSnapshotWorkout(null);
        }}
        onSuccess={() => {
          setShowStepPostModal(false);
          setSnapshotWorkout(null);
          setHasPostedStepsToday(true);
          lastPostDateRef.current = new Date().toISOString().slice(0, 10);
          console.log('[ActivityTracker] Step post successful');
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  stepDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCount: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  postButton: {
    padding: 4,
  },
  nostrIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nostrIconText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
  },
  headerSpacer: {
    width: 32,
  },
  contentWrapper: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
