/**
 * MeditationTrackerScreen - Simple meditation timer
 * Tracks meditation sessions with type selection and duration
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { CustomAlert } from '../../components/ui/CustomAlert';
import LocalWorkoutStorageService from '../../services/fitness/LocalWorkoutStorageService';
import { EnhancedSocialShareModal } from '../../components/profile/shared/EnhancedSocialShareModal';
import workoutPublishingService from '../../services/nostr/workoutPublishingService';
import { UnifiedSigningService } from '../../services/auth/UnifiedSigningService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CalorieEstimationService from '../../services/fitness/CalorieEstimationService';
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

type MeditationType =
  | 'guided'
  | 'unguided'
  | 'breathwork'
  | 'body_scan'
  | 'gratitude';

const MEDITATION_TYPES: {
  value: MeditationType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: 'guided', label: 'Guided', icon: 'headset' },
  { value: 'unguided', label: 'Unguided', icon: 'infinite' },
  { value: 'breathwork', label: 'Breathwork', icon: 'pulse' },
  { value: 'body_scan', label: 'Body Scan', icon: 'body' },
  { value: 'gratitude', label: 'Gratitude', icon: 'heart-outline' },
];

interface MeditationTrackerScreenProps {
  initialType?: MeditationType;
}

export const MeditationTrackerScreen: React.FC<MeditationTrackerScreenProps> = ({
  initialType,
}) => {
  // Session state
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedType, setSelectedType] = useState<MeditationType>(initialType || 'unguided');
  const [userWeight, setUserWeight] = useState<number | undefined>(undefined);
  const [estimatedCalories, setEstimatedCalories] = useState<number>(0);

  // Phase state: setup -> hold-to-start -> active -> summary
  const [phase, setPhase] = useState<'setup' | 'ready' | 'active' | 'summary'>(
    initialType ? 'ready' : 'setup'
  );
  const [countdown, setCountdown] = useState<3 | 2 | 1 | 'GO' | null>(null);

  // Summary state
  const [sessionNotes, setSessionNotes] = useState('');

  // Sharing state
  const [showShareModal, setShowShareModal] = useState(false);
  const [savedWorkout, setSavedWorkout] = useState<Workout | null>(null);
  const [savedWorkoutId, setSavedWorkoutId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string | undefined>(undefined);
  const [userName, setUserName] = useState<string | undefined>(undefined);

  // WoT + posting state
  const [wotScore, setWotScore] = useState<number | null>(null);
  const [autoCompeteTriggered, setAutoCompeteTriggered] = useState(false);
  const [postedToNostr, setPostedToNostr] = useState(false);

  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, _setAlertConfig] = useState<{
    title: string;
    message?: string;
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
  const startTimeRef = useRef<number>(0);
  const totalPausedTimeRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load userId, health profile, and WoT score on mount
  useEffect(() => {
    const loadData = async () => {
      try {
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
            console.warn('[MeditationTracker] WoT cache read failed:', e);
          }
        }

        // Load health profile for calorie estimation
        const profileData = await AsyncStorage.getItem('@runstr:health_profile');
        if (profileData) {
          let profile: HealthProfile | null = null;
          try {
            profile = JSON.parse(profileData);
          } catch (e) {
            console.warn('[MeditationTracker] Failed to parse health profile:', e);
            profile = null;
          }
          if (profile && profile.weight) {
            setUserWeight(profile.weight);
          }
        }

        // Load user's Nostr profile (avatar and name)
        if (pubkey) {
          const nostrProfile = await nostrProfileService.getProfile(pubkey);
          if (nostrProfile) {
            setUserAvatar(nostrProfile.picture);
            setUserName(nostrProfile.display_name || nostrProfile.name);
          }
        }
      } catch (error) {
        console.warn('[MeditationTracker] Failed to load data:', error);
      }
    };
    loadData();
  }, []);

  // Update selected type when initialType prop changes
  useEffect(() => {
    if (initialType) {
      setSelectedType(initialType);
    }
  }, [initialType]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (phase === 'active' && isActive && !isPaused) {
      interval = setInterval(() => {
        const now = Date.now();
        const totalPausedTime = totalPausedTimeRef.current;
        const elapsed = Math.floor(
          (now - startTimeRef.current - totalPausedTime) / 1000
        );
        setElapsedSeconds(elapsed);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [phase, isActive, isPaused]);

  // Auto-compete: publish kind 1301 when summary phase starts
  useEffect(() => {
    const attemptAutoCompete = async () => {
      if (phase !== 'summary' || !savedWorkoutId || autoCompeteTriggered) return;

      const isEnabled = await AutoCompetePreferencesService.isAutoCompeteEnabled();
      if (!isEnabled) return;

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
          console.log('[MeditationTracker] Auto-competed kind 1301');
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
        console.error('[MeditationTracker] Auto-compete error:', error);
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

  const handleHoldComplete = () => {
    setCountdown(3);
    setTimeout(() => {
      setCountdown(2);
      setTimeout(() => {
        setCountdown(1);
        setTimeout(() => {
          setCountdown('GO');
          setTimeout(() => {
            setCountdown(null);
            startMeditation();
          }, 500);
        }, 1000);
      }, 1000);
    }, 1000);
  };

  const startMeditation = () => {
    setPhase('active');
    setIsActive(true);
    setIsPaused(false);
    isPausedRef.current = false;
    startTimeRef.current = Date.now();
    pauseStartTimeRef.current = 0;
    totalPausedTimeRef.current = 0;
    setElapsedSeconds(0);
  };

  const pauseMeditation = () => {
    setIsPaused(true);
    isPausedRef.current = true;
    pauseStartTimeRef.current = Date.now();
  };

  const resumeMeditation = () => {
    const pauseDuration = Date.now() - pauseStartTimeRef.current;
    totalPausedTimeRef.current += pauseDuration;
    setIsPaused(false);
    isPausedRef.current = false;
  };

  const endSession = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);
    setIsPaused(false);

    // Auto-save locally before showing summary
    try {
      await saveSessionLocally();
    } catch (error) {
      console.error('[MeditationTracker] Failed to auto-save:', error);
    }

    setPhase('summary');
  };

  const saveSessionLocally = async () => {
    try {
      const meditationTypeLabel =
        MEDITATION_TYPES.find((t) => t.value === selectedType)?.label ||
        'Meditation';

      const calories = CalorieEstimationService.estimateMeditationCalories(
        elapsedSeconds,
        userWeight
      );
      setEstimatedCalories(calories);

      const workoutId = await LocalWorkoutStorageService.saveManualWorkout({
        type: 'meditation',
        duration: elapsedSeconds,
        notes:
          sessionNotes ||
          `${
            elapsedSeconds >= 60
              ? Math.floor(elapsedSeconds / 60) + ' minute'
              : elapsedSeconds + ' second'
          } ${meditationTypeLabel.toLowerCase()} session`,
        meditationType: selectedType,
        calories,
      });

      setSavedWorkoutId(workoutId);

      const workout: Workout = {
        id: workoutId,
        userId: userId || 'unknown',
        type: 'meditation',
        source: 'manual_entry' as const,
        startTime: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
        endTime: new Date().toISOString(),
        duration: elapsedSeconds,
        calories,
        meditationType: selectedType,
        syncedAt: new Date().toISOString(),
      };

      setSavedWorkout(workout);
      return workout;
    } catch (error) {
      console.error('[MeditationTracker] Failed to save session:', error);
      throw error;
    }
  };

  const isWoTEligible = wotScore !== null && wotScore > 0;

  /** Handle posting to Nostr (called from EnhancedSocialShareModal after card capture) */
  const handlePostToNostr = async (cardImageUri?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const signer = await UnifiedSigningService.getInstance().getSigner();
      const npub = await AsyncStorage.getItem('@runstr:npub');
      if (!signer) return { success: false, error: 'Not authenticated' };
      if (!savedWorkout) return { success: false, error: 'No workout data' };

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
      console.error('[MeditationTracker] Post to Nostr error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Post failed' };
    }
  };

  /** Open social share modal for card design + posting */
  const handleShowSocialModal = () => {
    if (!savedWorkout) return;
    Keyboard.dismiss();
    setShowShareModal(true);
  };

  const handleDone = () => {
    setPhase('setup');
    setSessionNotes('');
    setElapsedSeconds(0);
    setSavedWorkout(null);
    setSavedWorkoutId(null);
    setAutoCompeteTriggered(false);
    setPostedToNostr(false);
    setShowShareModal(false);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Setup screen - dark cards with type chips, circle start button
  if (phase === 'setup') {
    return (
      <View style={styles.container}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.setupContainer}
        >
          {/* Muted uppercase label */}
          <Text style={styles.exerciseNameLabel}>GUIDED MEDITATION</Text>

          {/* Type Selector - dark card with horizontal chips */}
          <View style={styles.setupCard}>
            <Text style={styles.setupCardLabel}>TYPE</Text>
            <View style={styles.exerciseGrid}>
              {MEDITATION_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.exerciseChip,
                    selectedType === type.value && styles.exerciseChipActive,
                  ]}
                  onPress={() => setSelectedType(type.value)}
                >
                  <Text
                    style={[
                      styles.exerciseChipText,
                      selectedType === type.value && styles.exerciseChipTextActive,
                    ]}
                  >
                    {type.label}
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
              onPress={() => setPhase('ready')}
            >
              <Ionicons name="arrow-forward" size={30} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.circleButtonLabel}>continue</Text>
        </View>

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

  // Ready screen - centered HoldToStart button
  if (phase === 'ready') {
    return (
      <View style={styles.container}>
        <CountdownOverlay countdown={countdown} />

        <View style={styles.idleCenteredContainer}>
          <HoldToStartButton
            label={`Begin ${MEDITATION_TYPES.find(t => t.value === selectedType)?.label || 'Meditation'}`}
            onHoldComplete={handleHoldComplete}
            size="large"
          />
        </View>

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

  // Active meditation screen
  if (phase === 'active') {
    return (
      <View style={styles.container}>
        <View style={styles.activeContainer}>
          <Text style={styles.meditationType}>
            {MEDITATION_TYPES.find((t) => t.value === selectedType)?.label}
          </Text>

          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
            <Text style={styles.timerLabel}>
              {isPaused ? 'Paused' : 'Meditating'}
            </Text>
          </View>

          <View style={styles.controlButtons}>
            {!isPaused ? (
              <TouchableOpacity
                style={styles.pauseButton}
                onPress={pauseMeditation}
              >
                <Ionicons name="pause" size={32} color={theme.colors.text} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.resumeButton}
                onPress={resumeMeditation}
              >
                <Ionicons name="play" size={32} color={theme.colors.background} />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.stopButton} onPress={endSession}>
              <Ionicons name="stop" size={32} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>

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

  // Summary screen (full-screen, not modal)
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.summaryScrollContainer}
    >
      <View style={styles.summaryIconContainer}>
        <Ionicons
          name="checkmark-circle"
          size={64}
          color={theme.colors.orangeBright}
        />
      </View>

      <Text style={styles.summaryTitle}>Session Complete</Text>

      <View style={styles.summaryStatsCard}>
        <Text style={styles.summaryExercise}>
          {MEDITATION_TYPES.find((t) => t.value === selectedType)?.label}
        </Text>

        <View style={styles.summaryMainStats}>
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatValue}>
              {formatTime(elapsedSeconds)}
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

        {/* Session Notes */}
        <Text style={styles.notesLabel}>Session Notes (Optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="How was your session?"
          placeholderTextColor={theme.colors.textMuted}
          value={sessionNotes}
          onChangeText={setSessionNotes}
          multiline
          numberOfLines={4}
        />
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
          if (savedWorkoutId) {
            await LocalWorkoutStorageService.deleteWorkout(savedWorkoutId);
          }
          handleDone();
        }}
      >
        <Text style={styles.discardButtonText}>Discard</Text>
      </TouchableOpacity>

      {/* Done Button */}
      <TouchableOpacity
        style={styles.doneButton}
        onPress={handleDone}
      >
        <Text style={styles.doneButtonText}>Done</Text>
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

      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertVisible(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  setupContainer: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 160,
  },
  idleCenteredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingBottom: 120,
  },
  exerciseNameLabel: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    textAlign: 'center',
    letterSpacing: 2,
    marginTop: 16,
    marginBottom: 16,
  },
  // Setup card styles
  setupCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  setupCardLabel: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
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
  // Fixed bottom controls
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
  // Active phase
  activeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  meditationType: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    marginBottom: 40,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  timerText: {
    fontSize: 72,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 8,
  },
  timerLabel: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  controlButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  pauseButton: {
    backgroundColor: theme.colors.card,
    borderRadius: 40,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  resumeButton: {
    backgroundColor: theme.colors.orangeBright,
    borderRadius: 40,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    backgroundColor: theme.colors.card,
    borderRadius: 40,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  // Summary
  summaryScrollContainer: {
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
  notesLabel: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 12,
    color: theme.colors.text,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    marginBottom: 12,
  },
  discardButtonText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
  },
  doneButton: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  doneButtonText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
  },
});
