/**
 * StrengthTrackerScreen - Strength training tracker with set/rep counter and rest timer
 * Tracks exercises with configurable sets, reps, and rest periods
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HeroMetric } from '../../components/activity/HeroMetric';
import {
  SecondaryMetricRow,
  type SecondaryMetric,
} from '../../components/activity/SecondaryMetricRow';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import { CustomAlert } from '../../components/ui/CustomAlert';
import LocalWorkoutStorageService from '../../services/fitness/LocalWorkoutStorageService';
import workoutPublishingService from '../../services/nostr/workoutPublishingService';
import { UnifiedSigningService } from '../../services/auth/UnifiedSigningService';
import CalorieEstimationService from '../../services/fitness/CalorieEstimationService';
import { EnhancedSocialShareModal } from '../../components/profile/shared/EnhancedSocialShareModal';
import { nostrProfileService } from '../../services/nostr/NostrProfileService';
import { HoldToStartButton } from '../../components/activity/HoldToStartButton';
import { CountdownOverlay } from '../../components/activity/CountdownOverlay';
import { AutoCompetePreferencesService } from '../../services/activity/AutoCompetePreferencesService';
import WorkoutStatusTracker from '../../services/fitness/WorkoutStatusTracker';
import { WoTService } from '../../services/wot/WoTService';
import Toast from 'react-native-toast-message';
import type { HealthProfile } from '../HealthProfileScreen';
import type { PublishableWorkout } from '../../services/nostr/workoutPublishingService';
import type { Workout } from '../../types/workout';

type ExerciseType =
  | 'pushups'
  | 'pullups'
  | 'situps'
  | 'squats'
  | 'curls'
  | 'bench';
type WorkoutPhase = 'idle' | 'setup' | 'active' | 'rest' | 'summary';

const EXERCISE_OPTIONS: {
  value: ExerciseType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: 'pushups', label: 'Pushups', icon: 'fitness' },
  { value: 'pullups', label: 'Pullups', icon: 'barbell' },
  { value: 'situps', label: 'Situps', icon: 'body' },
  { value: 'squats', label: 'Squats', icon: 'walk' },
  { value: 'curls', label: 'Curls', icon: 'fitness' },
  { value: 'bench', label: 'Bench Press', icon: 'barbell' },
];

const REST_DURATIONS = [30, 60, 90, 120]; // seconds

// Bodyweight exercises don't require weight input
const BODYWEIGHT_EXERCISES: ExerciseType[] = ['pushups', 'pullups', 'situps'];

interface StrengthTrackerScreenProps {
  initialExercise?: ExerciseType;
}

export const StrengthTrackerScreen: React.FC<StrengthTrackerScreenProps> = ({
  initialExercise,
}) => {
  const [userId, setUserId] = useState<string>('');
  const [userWeight, setUserWeight] = useState<number | undefined>(undefined);
  const [userAvatar, setUserAvatar] = useState<string | undefined>(undefined);
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [wotScore, setWotScore] = useState<number | null>(null);
  const [autoCompeteTriggered, setAutoCompeteTriggered] = useState(false);
  const [postedToNostr, setPostedToNostr] = useState(false);

  // Setup state - use initialExercise if provided
  const [selectedExercise, setSelectedExercise] =
    useState<ExerciseType>(initialExercise || 'pushups');
  const [totalSets, setTotalSets] = useState(3);
  const [targetReps, setTargetReps] = useState(20);
  const [restDuration, setRestDuration] = useState(60);
  const [exerciseWeight, setExerciseWeight] = useState(0); // Weight being lifted (e.g., for bench press)

  // Workout state
  const [phase, setPhase] = useState<WorkoutPhase>('idle');
  const [countdown, setCountdown] = useState<3 | 2 | 1 | 'GO' | null>(null);
  const [currentSet, setCurrentSet] = useState(1);
  const [repsCompleted, setRepsCompleted] = useState<number[]>([]);
  const [weightsCompleted, setWeightsCompleted] = useState<number[]>([]); // Track weight per set
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const [workoutStartTime, setWorkoutStartTime] = useState(0);
  const [workoutDuration, setWorkoutDuration] = useState(0);
  const [savedWorkoutId, setSavedWorkoutId] = useState<string | null>(null);
  const [savedWorkout, setSavedWorkout] = useState<Workout | null>(null);
  const [estimatedCalories, setEstimatedCalories] = useState<number>(0);

  // Modal state
  const [showRepsModal, setShowRepsModal] = useState(false);
  const [currentRepsInput, setCurrentRepsInput] = useState('');
  const [currentWeightInput, setCurrentWeightInput] = useState(''); // Weight input for current set
  const [showShareModal, setShowShareModal] = useState(false);

  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, _setAlertConfig] = useState<{
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

  // Timer refs
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update selected exercise when initialExercise prop changes
  useEffect(() => {
    if (initialExercise) {
      setSelectedExercise(initialExercise);
      // Reset to setup phase when exercise changes
      if (phase === 'setup') {
        // Already in setup, just update the selection
      }
    }
  }, [initialExercise]);

  // Load user data, health profile, and WoT score on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load user ID
        const pubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
        const npub = await AsyncStorage.getItem('@runstr:npub');
        const activeUserId = npub || pubkey || '';
        setUserId(activeUserId);

        // Load WoT score
        if (pubkey) {
          try {
            const wotService = WoTService.getInstance();
            const score = await wotService.getCachedScore(pubkey);
            setWotScore(score);
          } catch (e) {
            console.warn('[StrengthTracker] WoT cache read failed:', e);
          }
        }

        // Load health profile for calorie estimation
        const profileData = await AsyncStorage.getItem(
          '@runstr:health_profile'
        );
        if (profileData) {
          let profile: HealthProfile | null = null;
          try {
            profile = JSON.parse(profileData);
          } catch (e) {
            console.warn('[StrengthTracker] Failed to parse health profile:', e);
            profile = null;
          }
          if (profile && profile.weight) {
            setUserWeight(profile.weight);
            console.log(
              '[StrengthTracker] ✅ User weight loaded:',
              profile.weight
            );
          }
        }

        // Load user's Nostr profile (avatar and name)
        if (pubkey) {
          const nostrProfile = await nostrProfileService.getProfile(pubkey);
          if (nostrProfile) {
            setUserAvatar(nostrProfile.picture);
            setUserName(nostrProfile.display_name || nostrProfile.name);
            console.log(
              '[StrengthTracker] ✅ User profile loaded for social cards'
            );
          }
        }
      } catch (error) {
        console.warn('[StrengthTracker] Failed to load data:', error);
      }
    };
    loadData();

    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, []);

  // Rest timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (phase === 'rest' && restTimeRemaining > 0) {
      interval = setInterval(() => {
        setRestTimeRemaining((prev) => {
          if (prev <= 1) {
            setPhase('active');
            setCurrentSet((s) => s + 1);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [phase, restTimeRemaining]);

  const handleHoldComplete = () => {
    console.log('[StrengthTrackerScreen] Hold complete, going to setup...');
    setPhase('setup');
  };

  const startWorkout = () => {
    console.log('[StrengthTrackerScreen] Starting countdown before workout...');

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
            // Now start the actual workout
            setPhase('active');
            setCurrentSet(1);
            setRepsCompleted([]);
            setWeightsCompleted([]);
            setWorkoutStartTime(Date.now());
          }, 500);
        }, 1000);
      }, 1000);
    }, 1000);
  };

  const handleSetComplete = () => {
    setCurrentRepsInput(targetReps.toString());
    // Pre-fill weight with either exerciseWeight (setup value) or last set's weight
    const defaultWeight =
      weightsCompleted.length > 0
        ? weightsCompleted[weightsCompleted.length - 1].toString()
        : exerciseWeight > 0
        ? exerciseWeight.toString()
        : '0';
    setCurrentWeightInput(defaultWeight);
    setShowRepsModal(true);
  };

  const confirmReps = async () => {
    const reps = parseInt(currentRepsInput) || 0;
    const weight = parseInt(currentWeightInput) || 0;
    const newReps = [...repsCompleted, reps];
    const newWeights = [...weightsCompleted, weight];
    setRepsCompleted(newReps);
    setWeightsCompleted(newWeights);
    setShowRepsModal(false);
    setCurrentRepsInput('');
    setCurrentWeightInput('');

    // Check if workout is complete
    if (currentSet >= totalSets) {
      const duration = Math.floor((Date.now() - workoutStartTime) / 1000);
      setWorkoutDuration(duration);

      // AUTO-SAVE: Save workout to local storage immediately
      await saveWorkoutToLocal(newReps, newWeights, duration);

      setPhase('summary');
    } else {
      // Start rest timer
      setRestTimeRemaining(restDuration);
      setPhase('rest');
    }
  };

  /**
   * Save workout to local storage
   * Returns the workout ID for later posting to Nostr
   */
  const saveWorkoutToLocal = async (
    completedReps: number[],
    completedWeights: number[],
    duration: number
  ): Promise<string | null> => {
    try {
      const totalReps = completedReps.reduce((sum, r) => sum + r, 0);
      const exerciseLabel =
        EXERCISE_OPTIONS.find((e) => e.value === selectedExercise)?.label ||
        'Strength Training';

      // Build per-set breakdown with reps AND weights
      const repsBreakdown = completedReps
        .map((r, i) => {
          const weight = completedWeights[i] || 0;
          return weight > 0
            ? `Set ${i + 1}: ${r} @ ${weight} lbs`
            : `Set ${i + 1}: ${r}`;
        })
        .join(', ');

      // Calculate average weight if weights were tracked
      const averageWeight =
        completedWeights.length > 0
          ? Math.round(
              completedWeights.reduce((a, b) => a + b, 0) /
                completedWeights.length
            )
          : undefined;

      // Estimate calories using CalorieEstimationService
      const calories = CalorieEstimationService.estimateStrengthCalories(
        totalReps,
        totalSets,
        duration,
        userWeight,
        averageWeight // Pass exercise weight for volume-based calculation
      );

      setEstimatedCalories(calories);

      const workoutId = await LocalWorkoutStorageService.saveManualWorkout({
        type: 'strength_training',
        duration: duration, // Duration in seconds (LocalWorkout interface expects seconds)
        reps: totalReps,
        sets: totalSets,
        notes: `${exerciseLabel} - ${repsBreakdown}`,
        calories, // Add calorie estimation
        // Exercise-specific fields for better display and Nostr publishing
        exerciseType: selectedExercise,
        repsBreakdown: completedReps,
        restTime: restDuration,
        weight: averageWeight, // Average weight across all sets
        weightsPerSet: completedWeights, // Individual weights per set
      });

      console.log(
        `✅ Strength workout auto-saved: ${selectedExercise} - ${totalReps} reps in ${totalSets} sets, ${calories} cal (ID: ${workoutId})`
      );

      setSavedWorkoutId(workoutId);

      // Create workout object directly from data we already have (like Running does)
      // This avoids AsyncStorage timing issues when retrieving immediately after save
      const workout: Workout = {
        id: workoutId,
        userId: userId || 'unknown',
        type: 'strength_training',
        source: 'manual_entry' as const,
        startTime: new Date(Date.now() - duration * 1000).toISOString(),
        endTime: new Date().toISOString(),
        duration,
        calories,
        reps: totalReps,
        sets: totalSets,
        weight: averageWeight, // Average weight across all sets
        weightsPerSet: completedWeights, // Individual weights per set
        exerciseType: selectedExercise, // Specific exercise (pushups, bench, etc.) for social cards
        repsBreakdown: completedReps, // Per-set reps for detailed social cards
        syncedAt: new Date().toISOString(),
      };

      setSavedWorkout(workout);

      return workoutId;
    } catch (error) {
      console.error('❌ Failed to save strength workout:', error);
      return null;
    }
  };

  // WoT > 0 means user has any trust score (eligible for Nostr posting)
  const isWoTEligible = wotScore !== null && wotScore > 0;

  /**
   * Auto-compete: publish kind 1301 when summary phase starts
   */
  useEffect(() => {
    const attemptAutoCompete = async () => {
      if (phase !== 'summary' || !savedWorkoutId || autoCompeteTriggered) return;

      const isEnabled = await AutoCompetePreferencesService.isAutoCompeteEnabled();
      if (!isEnabled) return;

      // Check if already competed
      const status = await WorkoutStatusTracker.getStatus(savedWorkoutId);
      if (status.competedInNostr) return;

      setAutoCompeteTriggered(true);

      try {
        const signer = await UnifiedSigningService.getInstance().getSigner();
        const npub = await AsyncStorage.getItem('@runstr:npub');
        if (!signer) {
          Toast.show({
            type: 'error',
            text1: 'Auto-compete failed',
            text2: 'No authentication found.',
            position: 'top',
            visibilityTime: 4000,
          });
          return;
        }

        if (!savedWorkout) return;

        const publishableWorkout = {
          ...savedWorkout,
          source: 'manual' as const,
        } as PublishableWorkout;

        const result = await workoutPublishingService.saveWorkoutToNostr(
          publishableWorkout,
          signer,
          npub || 'unknown'
        );

        if (result.success) {
          await WorkoutStatusTracker.markAsCompeted(savedWorkoutId, result.eventId);
          if (result.eventId) {
            await LocalWorkoutStorageService.markAsSynced(savedWorkoutId, result.eventId);
          }
          console.log('[StrengthTracker] ✅ Auto-competed kind 1301');
        } else {
          Toast.show({
            type: 'error',
            text1: 'Auto-compete failed',
            text2: 'Tap Post to retry manually.',
            position: 'top',
            visibilityTime: 4000,
          });
        }
      } catch (error) {
        console.error('[StrengthTracker] Auto-compete error:', error);
        Toast.show({
          type: 'error',
          text1: 'Auto-compete failed',
          text2: 'Tap Post to retry manually.',
          position: 'top',
          visibilityTime: 4000,
        });
      }
    };
    attemptAutoCompete();
  }, [phase, savedWorkoutId, autoCompeteTriggered]);

  /**
   * Handle posting to Nostr (called from EnhancedSocialShareModal after card capture)
   */
  const handlePostToNostr = async (cardImageUri?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const signer = await UnifiedSigningService.getInstance().getSigner();
      const npub = await AsyncStorage.getItem('@runstr:npub');
      if (!signer) {
        return { success: false, error: 'Not authenticated' };
      }

      if (!savedWorkout) {
        return { success: false, error: 'No workout data' };
      }

      const publishableWorkout = {
        ...savedWorkout,
        source: 'manual' as const,
      } as PublishableWorkout;

      const result = await workoutPublishingService.postWorkoutToSocial(
        publishableWorkout,
        signer,
        npub || 'unknown',
        {
          includeCard: true,
          cardImageUri,
          userAvatar,
          userName,
        }
      );

      if (result.success) {
        setPostedToNostr(true);
      }
      return result;
    } catch (error) {
      console.error('[StrengthTracker] Post to Nostr error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Post failed' };
    }
  };

  /**
   * Open social share modal for card design + posting
   */
  const handleShowSocialModal = () => {
    if (!savedWorkout) return;
    Keyboard.dismiss();
    setShowShareModal(true);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Idle screen - centered HoldToStart button
  if (phase === 'idle') {
    return (
      <View style={styles.container}>
        <View style={styles.idleCenteredContainer}>
          <HoldToStartButton
            label={`Start ${EXERCISE_OPTIONS.find(e => e.value === selectedExercise)?.label || 'Strength'}`}
            onHoldComplete={handleHoldComplete}
            size="large"
          />
        </View>

        {/* Custom Alert */}
        <CustomAlert
          visible={alertVisible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertVisible(false)}
        />
      </View>
    );
  }

  // Setup screen - Option C: stacked dark cards, no icon, circle start
  if (phase === 'setup') {
    return (
      <View style={styles.container}>
        {/* Countdown Overlay - shows 3-2-1-GO before active phase */}
        <CountdownOverlay countdown={countdown} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.setupContainer}
        >
          {/* Muted uppercase exercise label */}
          <Text style={styles.exerciseNameLabel}>
            {(EXERCISE_OPTIONS.find(e => e.value === selectedExercise)?.label || 'STRENGTH').toUpperCase()}
          </Text>

          {/* Exercise Selector - only show if not pre-selected from menu */}
          {!initialExercise && (
            <View style={styles.setupCard}>
              <Text style={styles.setupCardLabel}>EXERCISE</Text>
              <View style={styles.exerciseGrid}>
                {EXERCISE_OPTIONS.map((exercise) => (
                  <TouchableOpacity
                    key={exercise.value}
                    style={[
                      styles.exerciseChip,
                      selectedExercise === exercise.value &&
                        styles.exerciseChipActive,
                    ]}
                    onPress={() => setSelectedExercise(exercise.value)}
                  >
                    <Text
                      style={[
                        styles.exerciseChipText,
                        selectedExercise === exercise.value &&
                          styles.exerciseChipTextActive,
                      ]}
                    >
                      {exercise.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Sets Card */}
          <View style={styles.setupCard}>
            <View style={styles.setupCardRow}>
              <Text style={styles.setupCardLabel}>SETS</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.numberButton}
                  onPress={() => setTotalSets(Math.max(1, totalSets - 1))}
                >
                  <Ionicons name="remove" size={20} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{totalSets}</Text>
                <TouchableOpacity
                  style={styles.numberButton}
                  onPress={() => setTotalSets(Math.min(10, totalSets + 1))}
                >
                  <Ionicons name="add" size={20} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Target Reps Card */}
          <View style={styles.setupCard}>
            <View style={styles.setupCardRow}>
              <Text style={styles.setupCardLabel}>TARGET REPS</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.numberButton}
                  onPress={() => setTargetReps(Math.max(1, targetReps - 5))}
                >
                  <Ionicons name="remove" size={20} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{targetReps}</Text>
                <TouchableOpacity
                  style={styles.numberButton}
                  onPress={() => setTargetReps(targetReps + 5)}
                >
                  <Ionicons name="add" size={20} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Weight Card (only for weighted exercises) */}
          {['bench', 'curls'].includes(selectedExercise) && (
            <View style={styles.setupCard}>
              <View style={styles.setupCardRow}>
                <Text style={styles.setupCardLabel}>WEIGHT (lbs)</Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={styles.numberButton}
                    onPress={() =>
                      setExerciseWeight(Math.max(0, exerciseWeight - 5))
                    }
                  >
                    <Ionicons name="remove" size={20} color={theme.colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{exerciseWeight}</Text>
                  <TouchableOpacity
                    style={styles.numberButton}
                    onPress={() => setExerciseWeight(exerciseWeight + 5)}
                  >
                    <Ionicons name="add" size={20} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Rest Duration Card */}
          <View style={styles.setupCard}>
            <Text style={styles.setupCardLabel}>REST BETWEEN SETS</Text>
            <View style={styles.restOptions}>
              {REST_DURATIONS.map((duration) => (
                <TouchableOpacity
                  key={duration}
                  style={[
                    styles.restOption,
                    restDuration === duration && styles.restOptionActive,
                  ]}
                  onPress={() => setRestDuration(duration)}
                >
                  <Text
                    style={[
                      styles.restOptionText,
                      restDuration === duration && styles.restOptionTextActive,
                    ]}
                  >
                    {duration}s
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Fixed bottom - circle start button */}
        <View style={styles.fixedControlsWrapper}>
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={styles.circleButton}
              onPress={startWorkout}
            >
              <Ionicons name="play" size={30} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.circleButtonLabel}>start</Text>
        </View>

        {/* Custom Alert */}
        <CustomAlert
          visible={alertVisible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertVisible(false)}
        />
      </View>
    );
  }

  // Active set screen - Running-style layout
  if (phase === 'active') {
    const totalRepsCompleted = repsCompleted.reduce((sum, r) => sum + r, 0);
    const activeSecondaryMetrics: SecondaryMetric[] = [
      { value: `${targetReps}`, label: 'Target', icon: 'flag' },
      { value: `${totalRepsCompleted}`, label: 'Total Reps', icon: 'fitness' },
    ];

    return (
      <View style={styles.container}>
        <View style={styles.activeContentWrapper}>
          <ScrollView
            style={styles.activeScrollable}
            contentContainerStyle={styles.activeScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Exercise name label - muted, like running's activity label */}
            <Text style={styles.exerciseNameLabel}>
              {EXERCISE_OPTIONS.find((e) => e.value === selectedExercise)?.label?.toUpperCase()}
            </Text>

            {/* Hero metric - current set number (matches distance display) */}
            <HeroMetric
              primaryValue={`${currentSet}`}
              primaryUnit={`of ${totalSets} sets`}
            />

            {/* Secondary Metrics - Target + Total Reps (like pace/elevation cards) */}
            <SecondaryMetricRow metrics={activeSecondaryMetrics} />

            {/* Previous sets as horizontal bar (like splits) */}
            {repsCompleted.length > 0 && (
              <View style={styles.setsBarContainer}>
                <Text style={styles.setsBarLabel}>SETS</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.setsBarScrollContent}
                >
                  {repsCompleted.map((reps, index) => {
                    const isLatest = index === repsCompleted.length - 1;
                    return (
                      <View
                        key={`set-${index}`}
                        style={[styles.setChip, isLatest && styles.setChipLatest]}
                      >
                        <Text style={[styles.setChipLabel, isLatest && styles.setChipLatestText]}>
                          Set {index + 1}
                        </Text>
                        <Text style={[styles.setChipValue, isLatest && styles.setChipLatestText]}>
                          {reps} reps
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Fixed bottom controls - matches running screen */}
        <View style={styles.fixedControlsWrapper}>
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={styles.circleButton}
              onPress={handleSetComplete}
            >
              <Ionicons name="checkmark" size={30} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.circleButtonLabel}>set done</Text>
        </View>

        {/* Reps & Weight Input Modal */}
        <Modal visible={showRepsModal} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.repsModalContainer}>
              <Text style={styles.repsModalTitle}>
                Set {currentSet} Complete
              </Text>

              <Text style={styles.inputLabel}>Reps</Text>
              <TextInput
                style={styles.repsInput}
                value={currentRepsInput}
                onChangeText={setCurrentRepsInput}
                keyboardType="number-pad"
                autoFocus
                selectTextOnFocus
                placeholder="Enter reps"
                placeholderTextColor={theme.colors.textMuted}
              />

              {/* Only show weight input for weighted exercises */}
              {!BODYWEIGHT_EXERCISES.includes(selectedExercise) && (
                <>
                  <Text style={styles.inputLabel}>Weight (lbs)</Text>
                  <TextInput
                    style={styles.repsInput}
                    value={currentWeightInput}
                    onChangeText={setCurrentWeightInput}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    placeholder="Enter weight"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </>
              )}

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmReps}
              >
                <Text style={styles.confirmButtonText}>Save Set</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Custom Alert */}
        <CustomAlert
          visible={alertVisible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertVisible(false)}
        />
      </View>
    );
  }

  // Rest timer screen - Running-style layout
  if (phase === 'rest') {
    return (
      <View style={styles.container}>
        <View style={styles.activeContentWrapper}>
          <ScrollView
            style={styles.activeScrollable}
            contentContainerStyle={styles.activeScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Muted label */}
            <Text style={styles.exerciseNameLabel}>REST TIME</Text>

            {/* Timer circle */}
            <View style={styles.restTimerCircle}>
              <Text style={styles.restTimerText}>{restTimeRemaining}</Text>
              <Text style={styles.restTimerUnit}>seconds</Text>
            </View>

            <Text style={styles.nextSetLabel}>
              Next: Set {currentSet + 1} of {totalSets}
            </Text>
          </ScrollView>
        </View>

        {/* Fixed bottom controls - skip rest as circle button */}
        <View style={styles.fixedControlsWrapper}>
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={styles.circleButton}
              onPress={() => {
                setPhase('active');
                setCurrentSet((s) => s + 1);
              }}
            >
              <Ionicons name="play-skip-forward" size={30} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.circleButtonLabel}>skip rest</Text>
        </View>

        {/* Custom Alert */}
        <CustomAlert
          visible={alertVisible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertVisible(false)}
        />
      </View>
    );
  }

  // Summary screen
  if (phase === 'summary') {
    const totalReps = repsCompleted.reduce((sum, r) => sum + r, 0);

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.summaryContainer}
      >
        <View style={styles.summaryIconContainer}>
          <Ionicons
            name="checkmark-circle"
            size={64}
            color={theme.colors.orangeBright}
          />
        </View>

        <Text style={styles.summaryTitle}>Workout Complete!</Text>

        <View style={styles.summaryStatsCard}>
          <Text style={styles.summaryExercise}>
            {EXERCISE_OPTIONS.find((e) => e.value === selectedExercise)?.label}
          </Text>

          <View style={styles.summaryMainStats}>
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>{totalReps}</Text>
              <Text style={styles.summaryStatLabel}>Total Reps</Text>
            </View>
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>{totalSets}</Text>
              <Text style={styles.summaryStatLabel}>Sets</Text>
            </View>
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>
                {formatTime(workoutDuration)}
              </Text>
              <Text style={styles.summaryStatLabel}>Duration</Text>
            </View>
          </View>

          {/* Calorie Estimate */}
          {estimatedCalories > 0 && (
            <View style={styles.calorieSection}>
              <Ionicons
                name="flame"
                size={20}
                color={theme.colors.orangeBright}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.calorieText}>
                {estimatedCalories} calories burned
              </Text>
            </View>
          )}

          <View style={styles.breakdownSection}>
            <Text style={styles.breakdownTitle}>Breakdown</Text>
            {repsCompleted.map((reps, index) => {
              const weight = weightsCompleted[index];
              return (
                <View key={index} style={styles.breakdownRow}>
                  <Text style={styles.breakdownSet}>Set {index + 1}</Text>
                  <Text style={styles.breakdownReps}>
                    {reps} reps{weight > 0 ? ` @ ${weight} lbs` : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Post to Nostr - Only visible if WoT > 0 */}
        {isWoTEligible && !postedToNostr && (
          <TouchableOpacity style={styles.postButton} onPress={handleShowSocialModal}>
            <Ionicons
              name="paper-plane-outline"
              size={20}
              color={theme.colors.background}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.postButtonText}>Post to Nostr</Text>
          </TouchableOpacity>
        )}

        {/* Posted confirmation */}
        {postedToNostr && (
          <View style={[styles.postButton, { opacity: 0.5 }]}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={theme.colors.background}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.postButtonText}>Posted</Text>
          </View>
        )}

        {/* Discard Button */}
        <TouchableOpacity
          style={styles.discardButton}
          onPress={async () => {
            // Delete the saved workout from local storage
            if (savedWorkoutId) {
              await LocalWorkoutStorageService.deleteWorkout(savedWorkoutId);
            }
            setPhase('setup');
            setRepsCompleted([]);
            setCurrentSet(1);
            setSavedWorkoutId(null);
            setSavedWorkout(null);
            setAutoCompeteTriggered(false);
            setPostedToNostr(false);
          }}
        >
          <Text style={styles.discardButtonText}>Discard</Text>
        </TouchableOpacity>

        {/* Social Share Modal */}
        {savedWorkout && (
          <EnhancedSocialShareModal
            visible={showShareModal}
            workout={savedWorkout}
            userId={userId}
            userAvatar={userAvatar}
            userName={userName}
            localWorkoutId={savedWorkoutId || undefined}
            onPostToNostr={handlePostToNostr}
            onClose={() => setShowShareModal(false)}
            onSuccess={() => {
              setShowShareModal(false);
            }}
          />
        )}

        {/* Custom Alert */}
        <CustomAlert
          visible={alertVisible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertVisible(false)}
        />
      </ScrollView>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  setupContainer: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 160, // Space for fixed start button
  },
  // Idle state container - centered HoldToStart button
  idleCenteredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingBottom: 120, // Shift button up from true center
  },
  // Setup card styles (Option C)
  setupCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  setupCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  setupCardLabel: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepperValue: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    minWidth: 40,
    textAlign: 'center',
  },
  exerciseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exerciseChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  exerciseChipActive: {
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.border,
  },
  exerciseChipText: {
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
  },
  exerciseChipTextActive: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semiBold,
  },
  numberButton: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  restOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  restOption: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  restOptionActive: {
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.border,
  },
  restOptionText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
  },
  restOptionTextActive: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semiBold,
  },
  // Active phase - running-style layout
  activeContentWrapper: {
    flex: 1,
  },
  activeScrollable: {
    flex: 1,
  },
  activeScrollContent: {
    paddingTop: 12,
    paddingBottom: 180, // Space for fixed controls
  },
  exerciseNameLabel: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    textAlign: 'center',
    letterSpacing: 2,
    marginTop: 16,
  },
  // Previous sets as horizontal bar (like SplitsBar)
  setsBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  setsBarLabel: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  setsBarScrollContent: {
    paddingRight: 16,
  },
  setChip: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 70,
  },
  setChipLatest: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
  },
  setChipLabel: {
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  setChipValue: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  setChipLatestText: {
    color: theme.colors.background,
  },
  // Fixed bottom controls (matches running screen)
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
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  circleButton: {
    backgroundColor: theme.colors.card,
    borderRadius: 35,
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  circleButtonLabel: {
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  repsModalContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  repsModalTitle: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 8,
  },
  repsInput: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 32,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  confirmButton: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  confirmButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
  },
  restTimerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: theme.colors.card,
    borderWidth: 4,
    borderColor: theme.colors.orangeBright,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: 32,
  },
  restTimerText: {
    fontSize: 64,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  restTimerUnit: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  nextSetLabel: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  summaryContainer: {
    flexGrow: 1,
    padding: 20,
  },
  summaryIconContainer: {
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 32,
  },
  summaryStatsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  summaryExercise: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  summaryMainStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  summaryStatItem: {
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  summaryStatLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  calorieSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 157, 66, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 157, 66, 0.3)',
  },
  calorieText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  breakdownSection: {
    marginTop: 8,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  breakdownSet: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  breakdownReps: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  postButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  postButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
  },
  discardButton: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  discardButtonText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
  },
});
