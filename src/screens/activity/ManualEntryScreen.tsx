/**
 * ManualEntryScreen - Universal manual workout entry
 * Adapts UI based on category (cardio, strength, diet, wellness)
 * Saves custom exercise names for reuse in dropdown menus
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../styles/theme';
import LocalWorkoutStorageService from '../../services/fitness/LocalWorkoutStorageService';
import { CustomAlert } from '../../components/ui/CustomAlert';
import workoutPublishingService from '../../services/nostr/workoutPublishingService';
import { UnifiedSigningService } from '../../services/auth/UnifiedSigningService';
import { EnhancedSocialShareModal } from '../../components/profile/shared/EnhancedSocialShareModal';
import { nostrProfileService } from '../../services/nostr/NostrProfileService';
import { AutoCompetePreferencesService } from '../../services/activity/AutoCompetePreferencesService';
import WorkoutStatusTracker from '../../services/fitness/WorkoutStatusTracker';
import { WoTService } from '../../services/wot/WoTService';
import Toast from 'react-native-toast-message';
import type { PublishableWorkout } from '../../services/nostr/workoutPublishingService';
import type { Workout, WorkoutType } from '../../types/workout';

export type ManualEntryCategory = 'cardio' | 'strength' | 'diet' | 'wellness';

interface ManualEntryScreenProps {
  category: ManualEntryCategory;
  prefillName?: string;
}

const CATEGORY_CONFIG: Record<
  ManualEntryCategory,
  {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    workoutType: WorkoutType;
  }
> = {
  cardio: {
    icon: 'fitness',
    title: 'Custom Cardio',
    subtitle: 'Log indoor cardio, treadmill, rowing, etc.',
    workoutType: 'other',
  },
  strength: {
    icon: 'barbell',
    title: 'Custom Strength',
    subtitle: 'Log any strength exercise',
    workoutType: 'strength_training',
  },
  diet: {
    icon: 'restaurant',
    title: 'Custom Diet',
    subtitle: 'Log special diets, supplements, etc.',
    workoutType: 'diet',
  },
  wellness: {
    icon: 'heart',
    title: 'Custom Wellness',
    subtitle: 'Log yoga, stretching, recovery, etc.',
    workoutType: 'meditation',
  },
};

export const ManualEntryScreen: React.FC<ManualEntryScreenProps> = ({
  category,
  prefillName = '',
}) => {
  const MAX_DURATION_MINUTES = 24 * 60;
  const MAX_DISTANCE_KM = 500;
  const MAX_CALORIES = 10000;
  const MAX_HEART_RATE = 260;
  const MIN_HEART_RATE = 30;
  const MAX_SETS = 100;
  const MAX_REPS = 1000;
  const MAX_WEIGHT_LBS = 2000;

  const navigation = useNavigation();
  const config = CATEGORY_CONFIG[category];

  // Form state
  const [exerciseName, setExerciseName] = useState(prefillName);
  const [saveExercise, setSaveExercise] = useState(!prefillName);
  const [notes, setNotes] = useState('');

  // Category-specific fields
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [calories, setCalories] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');

  // Summary/posting state
  const [showSummary, setShowSummary] = useState(false);
  const [savedWorkout, setSavedWorkout] = useState<Workout | null>(null);
  const [savedWorkoutId, setSavedWorkoutId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string | undefined>(undefined);
  const [userName, setUserName] = useState<string | undefined>(undefined);

  // WoT + posting state
  const [wotScore, setWotScore] = useState<number | null>(null);
  const [autoCompeteTriggered, setAutoCompeteTriggered] = useState(false);
  const [postedToNostr, setPostedToNostr] = useState(false);

  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
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

  // Load user data on mount
  useEffect(() => {
    const initializeData = async () => {
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
            console.warn('[ManualEntry] WoT cache read failed:', e);
          }
        }

        if (pubkey) {
          const nostrProfile = await nostrProfileService.getProfile(pubkey);
          if (nostrProfile) {
            setUserAvatar(nostrProfile.picture);
            setUserName(nostrProfile.display_name || nostrProfile.name);
          }
        }
      } catch (error) {
        console.warn('[ManualEntry] Failed to initialize:', error);
      }
    };
    initializeData();
  }, []);

  // Auto-compete when summary opens
  useEffect(() => {
    const attemptAutoCompete = async () => {
      if (!showSummary || !savedWorkoutId || autoCompeteTriggered) return;

      const isEnabled = await AutoCompetePreferencesService.isAutoCompeteEnabled();
      if (!isEnabled) return;

      const status = await WorkoutStatusTracker.getStatus(savedWorkoutId);
      if (status.competedInNostr) return;

      setAutoCompeteTriggered(true);

      try {
        const signer = await UnifiedSigningService.getInstance().getSigner();
        const npub = await AsyncStorage.getItem('@runstr:npub');
        if (!signer || !savedWorkout) return;

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
          console.log('[ManualEntry] Auto-competed kind 1301');
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
        console.error('[ManualEntry] Auto-compete error:', error);
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
  }, [showSummary, savedWorkoutId, autoCompeteTriggered]);

  const validateForm = (): boolean => {
    if (!exerciseName.trim()) {
      setAlertConfig({
        title: 'Missing Name',
        message: 'Please enter an exercise name.',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setAlertVisible(true);
      return false;
    }

    if (category === 'cardio' || category === 'wellness') {
      if (!duration.trim()) {
        setAlertConfig({
          title: 'Missing Duration',
          message: 'Please enter the duration in minutes.',
          buttons: [{ text: 'OK', style: 'default' }],
        });
        setAlertVisible(true);
        return false;
      }
    }

    if (category === 'strength') {
      if (!sets.trim() || !reps.trim()) {
        setAlertConfig({
          title: 'Missing Data',
          message: 'Please enter sets and reps.',
          buttons: [{ text: 'OK', style: 'default' }],
        });
        setAlertVisible(true);
        return false;
      }
    }

    if (category === 'diet' && !notes.trim()) {
      setAlertConfig({
        title: 'Missing Description',
        message: 'Please describe what you ate or the diet type.',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setAlertVisible(true);
      return false;
    }

    return true;
  };

  const parseNumericInput = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  };

  const showValidationAlert = (title: string, message: string): void => {
    setAlertConfig({
      title,
      message,
      buttons: [{ text: 'OK', style: 'default' }],
    });
    setAlertVisible(true);
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const parsedDuration = parseNumericInput(duration);
      const parsedDistance = parseNumericInput(distance);
      const parsedCalories = parseNumericInput(calories);
      const parsedHeartRate = parseNumericInput(heartRate);
      const parsedSets = parseNumericInput(sets);
      const parsedReps = parseNumericInput(reps);
      const parsedWeight = parseNumericInput(weight);

      if (
        parsedDuration !== null &&
        (!Number.isInteger(parsedDuration) ||
          parsedDuration <= 0 ||
          parsedDuration > MAX_DURATION_MINUTES)
      ) {
        showValidationAlert(
          'Invalid Duration',
          `Duration must be a whole number between 1 and ${MAX_DURATION_MINUTES} minutes.`
        );
        return;
      }

      if (
        parsedDistance !== null &&
        (!Number.isFinite(parsedDistance) ||
          parsedDistance < 0 ||
          parsedDistance > MAX_DISTANCE_KM)
      ) {
        showValidationAlert(
          'Invalid Distance',
          `Distance must be between 0 and ${MAX_DISTANCE_KM} km.`
        );
        return;
      }

      if (
        parsedCalories !== null &&
        (!Number.isInteger(parsedCalories) ||
          parsedCalories < 0 ||
          parsedCalories > MAX_CALORIES)
      ) {
        showValidationAlert(
          'Invalid Calories',
          `Calories must be a whole number between 0 and ${MAX_CALORIES}.`
        );
        return;
      }

      if (
        parsedHeartRate !== null &&
        (!Number.isInteger(parsedHeartRate) ||
          parsedHeartRate < MIN_HEART_RATE ||
          parsedHeartRate > MAX_HEART_RATE)
      ) {
        showValidationAlert(
          'Invalid Heart Rate',
          `Heart rate must be a whole number between ${MIN_HEART_RATE} and ${MAX_HEART_RATE} bpm.`
        );
        return;
      }

      if (category === 'strength') {
        if (
          parsedSets === null ||
          !Number.isInteger(parsedSets) ||
          parsedSets <= 0 ||
          parsedSets > MAX_SETS
        ) {
          showValidationAlert(
            'Invalid Sets',
            `Sets must be a whole number between 1 and ${MAX_SETS}.`
          );
          return;
        }

        if (
          parsedReps === null ||
          !Number.isInteger(parsedReps) ||
          parsedReps <= 0 ||
          parsedReps > MAX_REPS
        ) {
          showValidationAlert(
            'Invalid Reps',
            `Reps must be a whole number between 1 and ${MAX_REPS}.`
          );
          return;
        }

        if (
          parsedWeight !== null &&
          (!Number.isFinite(parsedWeight) ||
            parsedWeight < 0 ||
            parsedWeight > MAX_WEIGHT_LBS)
        ) {
          showValidationAlert(
            'Invalid Weight',
            `Weight must be between 0 and ${MAX_WEIGHT_LBS} lbs.`
          );
          return;
        }
      }

      const durationMinutes = parsedDuration ?? 0;
      const durationSeconds = Math.round(durationMinutes * 60);
      const distanceKm = parsedDistance ?? undefined;
      const caloriesNum = parsedCalories ?? undefined;

      const workoutData: any = {
        type: config.workoutType,
        duration: durationSeconds,
        distance: distanceKm,
        calories: caloriesNum,
        notes: notes || exerciseName,
        exerciseType: exerciseName.toLowerCase().replace(/\s+/g, '_'),
      };

      if (category === 'strength') {
        workoutData.sets = parsedSets ?? undefined;
        workoutData.reps = parsedReps ?? undefined;
        workoutData.weight = parsedWeight ?? undefined;
      }

      if (category === 'cardio' && parsedHeartRate !== null) {
        workoutData.notes = `${exerciseName} | Avg HR: ${parsedHeartRate} bpm${notes ? ` | ${notes}` : ''}`;
      }

      const workoutId = await LocalWorkoutStorageService.saveManualWorkout(workoutData);

      if (saveExercise && !prefillName) {
        await LocalWorkoutStorageService.saveCustomExerciseName(
          category,
          exerciseName.trim()
        );
      }

      setSavedWorkoutId(workoutId);

      // Build workout object directly
      const workout: Workout = {
        id: workoutId,
        userId: userId || 'unknown',
        type: config.workoutType,
        source: 'manual_entry' as const,
        startTime: new Date(Date.now() - durationSeconds * 1000).toISOString(),
        endTime: new Date().toISOString(),
        duration: durationSeconds,
        distance: distanceKm,
        calories: caloriesNum,
        notes: workoutData.notes,
        exerciseType: workoutData.exerciseType,
        sets: workoutData.sets,
        reps: workoutData.reps,
        weight: workoutData.weight,
        syncedAt: new Date().toISOString(),
      } as any;

      (workout as any).isManualEntry = true;
      setSavedWorkout(workout);
      setShowSummary(true);
    } catch (error) {
      console.error('[ManualEntry] Failed to save:', error);
      setAlertConfig({
        title: 'Error',
        message: 'Failed to save workout. Please try again.',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setAlertVisible(true);
    }
  };

  const isWoTEligible = wotScore !== null && wotScore > 0;

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
      console.error('[ManualEntry] Post to Nostr error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Post failed' };
    }
  };

  const handleShowSocialModal = () => {
    if (!savedWorkout) return;
    Keyboard.dismiss();
    setShowShareModal(true);
  };

  const handleDone = () => {
    setShowSummary(false);
    setShowShareModal(false);
    setSavedWorkout(null);
    setSavedWorkoutId(null);
    setAutoCompeteTriggered(false);
    setPostedToNostr(false);
    navigation.goBack();
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Summary screen
  if (showSummary) {
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

        <Text style={styles.summaryTitle}>Workout Logged</Text>

        <View style={styles.summaryStatsCard}>
          <Text style={styles.summaryExercise}>{exerciseName}</Text>

          <View style={styles.summaryMainStats}>
            {duration && (
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatValue}>
                  {formatDuration(parseInt(duration, 10))}
                </Text>
                <Text style={styles.summaryStatLabel}>Duration</Text>
              </View>
            )}
            {category === 'strength' && sets && reps && (
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatValue}>
                  {sets}x{reps}
                  {weight ? ` @${weight}` : ''}
                </Text>
                <Text style={styles.summaryStatLabel}>Sets x Reps</Text>
              </View>
            )}
          </View>
        </View>

        {/* Share Workout - Only visible if WoT > 0 */}
        {isWoTEligible && !postedToNostr && (
          <TouchableOpacity style={styles.postButton} onPress={handleShowSocialModal}>
            <Ionicons
              name="paper-plane-outline"
              size={20}
              color={theme.colors.background}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.postButtonText}>Share Workout</Text>
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
        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
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
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
      {/* Header */}
      <View style={styles.iconContainer}>
        <Ionicons name={config.icon} size={64} color={theme.colors.text} />
      </View>

      <Text style={styles.title}>{config.title}</Text>
      <Text style={styles.subtitle}>{config.subtitle}</Text>

      {/* Exercise Name */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Exercise Name *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g., Treadmill, Cable Flyes, Keto Meal..."
          placeholderTextColor={theme.colors.textMuted}
          value={exerciseName}
          onChangeText={setExerciseName}
        />
      </View>

      {/* Save for Later Toggle */}
      {!prefillName && (
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Save this exercise for later</Text>
          <Switch
            value={saveExercise}
            onValueChange={setSaveExercise}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.orangeBright,
            }}
            thumbColor={theme.colors.text}
          />
        </View>
      )}

      {/* Category-specific fields */}
      {(category === 'cardio' || category === 'wellness') && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Duration (minutes) *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="30"
              placeholderTextColor={theme.colors.textMuted}
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
            />
          </View>

          {category === 'cardio' && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Distance (km)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="5.0"
                  placeholderTextColor={theme.colors.textMuted}
                  value={distance}
                  onChangeText={setDistance}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Avg Heart Rate (bpm)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="145"
                  placeholderTextColor={theme.colors.textMuted}
                  value={heartRate}
                  onChangeText={setHeartRate}
                  keyboardType="numeric"
                />
              </View>
            </>
          )}
        </>
      )}

      {category === 'strength' && (
        <>
          <View style={styles.rowSection}>
            <View style={[styles.section, styles.halfSection]}>
              <Text style={styles.sectionLabel}>Sets *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="3"
                placeholderTextColor={theme.colors.textMuted}
                value={sets}
                onChangeText={setSets}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.section, styles.halfSection]}>
              <Text style={styles.sectionLabel}>Reps *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="12"
                placeholderTextColor={theme.colors.textMuted}
                value={reps}
                onChangeText={setReps}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.rowSection}>
            <View style={[styles.section, styles.halfSection]}>
              <Text style={styles.sectionLabel}>Weight (lbs)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="135"
                placeholderTextColor={theme.colors.textMuted}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.section, styles.halfSection]}>
              <Text style={styles.sectionLabel}>Duration (min)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="45"
                placeholderTextColor={theme.colors.textMuted}
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
              />
            </View>
          </View>
        </>
      )}

      {/* Calories (optional for all) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Calories</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter estimated calories"
          placeholderTextColor={theme.colors.textMuted}
          value={calories}
          onChangeText={setCalories}
          keyboardType="numeric"
        />
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          {category === 'diet' ? 'Description *' : 'Notes'}
        </Text>
        <TextInput
          style={[styles.textInput, styles.notesInput]}
          placeholder={
            category === 'diet'
              ? 'Describe what you ate...'
              : 'Add any additional notes...'
          }
          placeholderTextColor={theme.colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Ionicons
          name="checkmark-circle"
          size={20}
          color={theme.colors.background}
        />
        <Text style={styles.saveButtonText}>Complete</Text>
      </TouchableOpacity>

      {/* Hint */}
      <View style={styles.hintBox}>
        <Ionicons
          name="information-circle-outline"
          size={20}
          color={theme.colors.textMuted}
        />
        <Text style={styles.hintText}>
          Custom workouts are tagged as manual entries and won't appear in
          GPS-tracked competition leaderboards.
        </Text>
      </View>

      {/* Custom Alert */}
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertVisible(false)}
      />
    </ScrollView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 20,
  },
  iconContainer: {
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 32,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    color: theme.colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  rowSection: {
    flexDirection: 'row',
    gap: 12,
  },
  halfSection: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  toggleLabel: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.text,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    marginBottom: 20,
  },
  saveButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
  },
  hintBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  hintText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  // Summary styles
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
