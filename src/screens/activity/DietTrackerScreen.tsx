/**
 * DietTrackerScreen - Meal logger and fasting tracker
 * Logs meals with timestamps and calculates fasting duration from last meal
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import LocalWorkoutStorageService from '../../services/fitness/LocalWorkoutStorageService';
import { EnhancedSocialShareModal } from '../../components/profile/shared/EnhancedSocialShareModal';
import workoutPublishingService from '../../services/nostr/workoutPublishingService';
import { UnifiedSigningService } from '../../services/auth/UnifiedSigningService';
import { CustomAlert } from '../../components/ui/CustomAlert';
import CalorieEstimationService, { type MealSize } from '../../services/fitness/CalorieEstimationService';
import { nostrProfileService } from '../../services/nostr/NostrProfileService';
import { AutoCompetePreferencesService } from '../../services/activity/AutoCompetePreferencesService';
import WorkoutStatusTracker from '../../services/fitness/WorkoutStatusTracker';
import { WoTService } from '../../services/wot/WoTService';
import Toast from 'react-native-toast-message';
import type { PublishableWorkout } from '../../services/nostr/workoutPublishingService';
import type { Workout } from '../../types/workout';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_TYPES: {
  value: MealType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: 'breakfast', label: 'Breakfast', icon: 'sunny' },
  { value: 'lunch', label: 'Lunch', icon: 'partly-sunny' },
  { value: 'dinner', label: 'Dinner', icon: 'moon' },
  { value: 'snack', label: 'Snack', icon: 'nutrition' },
];

const ACTIVE_FAST_START_KEY = '@runstr:active_fast_start';
const IS_FASTING_KEY = '@runstr:is_fasting';

interface DietTrackerScreenProps {
  initialMealType?: MealType;
  startFasting?: boolean;
}

export const DietTrackerScreen: React.FC<DietTrackerScreenProps> = ({
  initialMealType,
  startFasting: shouldStartFasting,
}) => {
  const [selectedMealType, setSelectedMealType] =
    useState<MealType>(initialMealType || 'breakfast');
  const [selectedMealSize, setSelectedMealSize] = useState<MealSize>('medium');
  const [mealNotes, setMealNotes] = useState('');
  const [mealTime, setMealTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Intentional fasting state
  const [isFasting, setIsFasting] = useState<boolean>(false);
  const [fastStartTime, setFastStartTime] = useState<Date | null>(null);
  const [fastingDuration, setFastingDuration] = useState<number>(0);

  // Summary state
  const [showSummary, setShowSummary] = useState(false);
  const [summaryType, setSummaryType] = useState<'meal' | 'fast'>('meal');
  const [savedWorkout, setSavedWorkout] = useState<Workout | null>(null);
  const [savedWorkoutId, setSavedWorkoutId] = useState<string | null>(null);

  // Posting state
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

  // Load fasting state, userId, WoT on mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        await loadFastingState();

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
            console.warn('[DietTracker] WoT cache read failed:', e);
          }
        }

        // Load user's Nostr profile
        if (pubkey) {
          const nostrProfile = await nostrProfileService.getProfile(pubkey);
          if (nostrProfile) {
            setUserAvatar(nostrProfile.picture);
            setUserName(nostrProfile.display_name || nostrProfile.name);
          }
        }
      } catch (error) {
        console.warn('[DietTracker] Failed to initialize:', error);
      }
    };
    initializeData();
  }, []);

  // Handle initial meal type change from parent
  useEffect(() => {
    if (initialMealType) {
      setSelectedMealType(initialMealType);
    }
  }, [initialMealType]);

  // Calculate fasting duration in real-time
  useEffect(() => {
    if (!isFasting || !fastStartTime) return;

    const interval = setInterval(() => {
      const duration = Math.floor(
        (Date.now() - fastStartTime.getTime()) / 1000
      );
      setFastingDuration(Math.max(0, duration));
    }, 1000);

    return () => clearInterval(interval);
  }, [isFasting, fastStartTime]);

  // Auto-compete: publish kind 1301 when summary opens
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
          console.log('[DietTracker] Auto-competed kind 1301');
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
        console.error('[DietTracker] Auto-compete error:', error);
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

  const loadFastingState = async () => {
    try {
      const [fastingFlag, startTimeStr] = await Promise.all([
        AsyncStorage.getItem(IS_FASTING_KEY),
        AsyncStorage.getItem(ACTIVE_FAST_START_KEY),
      ]);

      if (fastingFlag === 'true' && startTimeStr) {
        const startTime = new Date(parseInt(startTimeStr));
        const currentDuration = Math.floor((Date.now() - startTime.getTime()) / 1000);
        setIsFasting(true);
        setFastStartTime(startTime);
        setFastingDuration(Math.max(0, currentDuration));
      }
    } catch (error) {
      console.error('[DietTracker] Failed to load fasting state:', error);
    }
  };

  const startFastingMode = async () => {
    try {
      const startTime = new Date();
      await Promise.all([
        AsyncStorage.setItem(IS_FASTING_KEY, 'true'),
        AsyncStorage.setItem(ACTIVE_FAST_START_KEY, startTime.getTime().toString()),
      ]);
      setIsFasting(true);
      setFastStartTime(startTime);
      setFastingDuration(0);
    } catch (error) {
      console.error('[DietTracker] Failed to start fasting:', error);
      setAlertConfig({
        title: 'Error',
        message: 'Failed to start fasting. Please try again.',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setAlertVisible(true);
    }
  };

  const stopFastingMode = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(IS_FASTING_KEY),
        AsyncStorage.removeItem(ACTIVE_FAST_START_KEY),
      ]);
      setIsFasting(false);
      setFastStartTime(null);
      setFastingDuration(0);
    } catch (error) {
      console.error('[DietTracker] Failed to stop fasting:', error);
    }
  };

  const handleTimeChange = (_event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setMealTime(selectedDate);
    }
  };

  const saveMeal = async () => {
    try {
      const mealTypeLabel =
        MEAL_TYPES.find((m) => m.value === selectedMealType)?.label || 'Meal';
      const timeString = mealTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const estimatedCalories = CalorieEstimationService.estimateMealCalories(
        selectedMealSize,
        selectedMealType
      );

      const workoutId = await LocalWorkoutStorageService.saveManualWorkout({
        type: 'diet',
        duration: 0,
        notes: mealNotes || `${mealTypeLabel} at ${timeString}`,
        mealType: selectedMealType,
        mealTime: mealTime.toISOString(),
        mealSize: selectedMealSize,
        calories: estimatedCalories,
      });

      setSavedWorkoutId(workoutId);

      // Build workout object directly
      const workout: Workout = {
        id: workoutId,
        userId: userId || 'unknown',
        type: 'diet',
        source: 'manual_entry' as const,
        startTime: mealTime.toISOString(),
        endTime: mealTime.toISOString(),
        duration: 0,
        calories: estimatedCalories,
        mealType: selectedMealType,
        mealTime: mealTime.toISOString(),
        mealSize: selectedMealSize,
        notes: mealNotes || `${mealTypeLabel} at ${timeString}`,
        syncedAt: new Date().toISOString(),
      } as any;

      setSavedWorkout(workout);
      setSummaryType('meal');
      setShowSummary(true);

      // Reset form
      setMealNotes('');
      setMealTime(new Date());
    } catch (error) {
      console.error('[DietTracker] Failed to save meal:', error);
      setAlertConfig({
        title: 'Error',
        message: 'Failed to save meal. Please try again.',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setAlertVisible(true);
    }
  };

  const breakFastAndLogMeal = async () => {
    if (!isFasting || !fastStartTime) return;

    try {
      const hours = Math.floor(fastingDuration / 3600);
      const minutes = Math.floor((fastingDuration % 3600) / 60);

      const fastWorkoutId = await LocalWorkoutStorageService.saveManualWorkout({
        type: 'fasting',
        duration: fastingDuration,
        notes: `Completed ${hours}h ${minutes}m fast`,
        fastingDuration,
      });

      // Save the meal that breaks the fast
      const mealTypeLabel =
        MEAL_TYPES.find((m) => m.value === selectedMealType)?.label || 'Meal';
      const timeString = mealTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const estimatedCalories = CalorieEstimationService.estimateMealCalories(
        selectedMealSize,
        selectedMealType
      );

      await LocalWorkoutStorageService.saveManualWorkout({
        type: 'diet',
        duration: 0,
        notes: mealNotes || `${mealTypeLabel} at ${timeString} (broke fast)`,
        mealType: selectedMealType,
        mealTime: mealTime.toISOString(),
        mealSize: selectedMealSize,
        calories: estimatedCalories,
      });

      await stopFastingMode();

      setSavedWorkoutId(fastWorkoutId);

      // Build fast workout object directly
      const fastWorkout: Workout = {
        id: fastWorkoutId,
        userId: userId || 'unknown',
        type: 'fasting' as any,
        source: 'manual_entry' as const,
        startTime: fastStartTime.toISOString(),
        endTime: new Date().toISOString(),
        duration: fastingDuration,
        notes: `Completed ${hours}h ${minutes}m fast`,
        syncedAt: new Date().toISOString(),
      };

      setSavedWorkout(fastWorkout);
      setSummaryType('fast');
      setShowSummary(true);

      setMealNotes('');
      setMealTime(new Date());
    } catch (error) {
      console.error('[DietTracker] Failed to break fast:', error);
      setAlertConfig({
        title: 'Error',
        message: 'Failed to break fast. Please try again.',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setAlertVisible(true);
    }
  };

  const isWoTEligible = wotScore !== null && wotScore > 0;

  /** Handle posting to Nostr (called from EnhancedSocialShareModal) */
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
      console.error('[DietTracker] Post to Nostr error:', error);
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
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getFastingMilestone = (
    seconds: number
  ): {
    hours: number;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  } | null => {
    const hours = seconds / 3600;
    const milestones = [
      { hours: 72, label: '72h Extended Fast', icon: 'trophy' as const },
      { hours: 48, label: '48h Extended Fast', icon: 'medal' as const },
      { hours: 36, label: '36h Monk Fast', icon: 'ribbon' as const },
      { hours: 24, label: '24h OMAD', icon: 'star' as const },
      { hours: 20, label: '20h Warrior', icon: 'flash' as const },
      { hours: 18, label: '18h Extended', icon: 'trending-up' as const },
      { hours: 16, label: '16h Intermittent', icon: 'checkmark-circle' as const },
      { hours: 12, label: '12h Circadian', icon: 'moon' as const },
    ];

    for (const milestone of milestones) {
      if (hours >= milestone.hours) return milestone;
    }
    return null;
  };

  // Summary screen (shown after saving meal/fast)
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

        <Text style={styles.summaryTitle}>
          {summaryType === 'meal' ? 'Meal Logged' : 'Fast Completed'}
        </Text>

        <View style={styles.summaryStatsCard}>
          {summaryType === 'meal' && savedWorkout && (
            <>
              <Text style={styles.summaryExercise}>
                {MEAL_TYPES.find((m) => m.value === (savedWorkout as any).mealType)?.label}
              </Text>
              <View style={styles.summaryMainStats}>
                <View style={styles.summaryStatItem}>
                  <Text style={styles.summaryStatValue}>
                    {new Date((savedWorkout as any).mealTime).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <Text style={styles.summaryStatLabel}>Time</Text>
                </View>
                {savedWorkout.calories && savedWorkout.calories > 0 && (
                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryStatValue}>{savedWorkout.calories}</Text>
                    <Text style={styles.summaryStatLabel}>Calories</Text>
                  </View>
                )}
              </View>
            </>
          )}
          {summaryType === 'fast' && savedWorkout && (
            <>
              <Text style={styles.summaryExercise}>Fasting Period</Text>
              <View style={styles.summaryMainStats}>
                <View style={styles.summaryStatItem}>
                  <Text style={styles.summaryStatValue}>
                    {formatDuration(savedWorkout.duration)}
                  </Text>
                  <Text style={styles.summaryStatLabel}>Duration</Text>
                </View>
              </View>
            </>
          )}

          {savedWorkout?.notes && (
            <View style={styles.notesDisplay}>
              <Text style={styles.notesDisplayLabel}>Notes:</Text>
              <Text style={styles.notesDisplayText}>{savedWorkout.notes}</Text>
            </View>
          )}
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

  // Main form screen - restyled with dark cards
  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.setupContainer}
      >
        {/* Muted uppercase label */}
        <Text style={styles.exerciseNameLabel}>
          {isFasting ? 'FASTING' : shouldStartFasting ? 'FASTING' : 'DIET TRACKER'}
        </Text>

        {/* Active Fasting Display */}
        {isFasting && fastStartTime && (
          <View style={styles.fastingCard}>
            <View style={styles.fastingHeader}>
              <Ionicons name="time" size={24} color={theme.colors.orangeBright} />
              <Text style={styles.fastingTitle}>Fasting in Progress</Text>
            </View>
            <Text style={styles.fastingDuration}>
              {formatDuration(fastingDuration)}
            </Text>

            {(() => {
              const milestone = getFastingMilestone(fastingDuration);
              if (milestone) {
                return (
                  <View style={styles.milestoneBadge}>
                    <Ionicons name={milestone.icon} size={18} color={theme.colors.orangeBright} />
                    <Text style={styles.milestoneText}>{milestone.label}</Text>
                  </View>
                );
              }
              return null;
            })()}

            <Text style={styles.fastingSubtitle}>
              Started:{' '}
              {fastStartTime.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        )}

        {/* Pre-Fasting Display */}
        {shouldStartFasting && !isFasting && (
          <View style={styles.fastingCard}>
            <View style={styles.fastingHeader}>
              <Ionicons name="timer-outline" size={24} color={theme.colors.textMuted} />
              <Text style={styles.fastingTitle}>Ready to Fast</Text>
            </View>
            <Text style={styles.fastingDuration}>00:00:00</Text>
            <Text style={styles.fastingSubtitle}>
              Tap the button below to begin tracking your fast
            </Text>
          </View>
        )}

        {/* Meal Type - dark card with horizontal chips */}
        {!initialMealType && !shouldStartFasting && !isFasting && (
          <View style={styles.setupCard}>
            <Text style={styles.setupCardLabel}>MEAL TYPE</Text>
            <View style={styles.exerciseGrid}>
              {MEAL_TYPES.map((mealType) => (
                <TouchableOpacity
                  key={mealType.value}
                  style={[
                    styles.exerciseChip,
                    selectedMealType === mealType.value && styles.exerciseChipActive,
                  ]}
                  onPress={() => setSelectedMealType(mealType.value)}
                >
                  <Text
                    style={[
                      styles.exerciseChipText,
                      selectedMealType === mealType.value && styles.exerciseChipTextActive,
                    ]}
                  >
                    {mealType.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Meal Size - dark card with horizontal pills */}
        {!isFasting && !shouldStartFasting && (
          <View style={styles.setupCard}>
            <Text style={styles.setupCardLabel}>MEAL SIZE</Text>
            <View style={styles.mealSizeGrid}>
              {(['small', 'medium', 'large', 'xl'] as MealSize[]).map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.mealSizePill,
                    selectedMealSize === size && styles.mealSizePillActive,
                  ]}
                  onPress={() => setSelectedMealSize(size)}
                >
                  <Text
                    style={[
                      styles.mealSizePillText,
                      selectedMealSize === size && styles.mealSizePillTextActive,
                    ]}
                  >
                    {size.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Time - dark card */}
        {!isFasting && !shouldStartFasting && (
          <View style={styles.setupCard}>
            <View style={styles.setupCardRow}>
              <Text style={styles.setupCardLabel}>TIME</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color={theme.colors.text} />
                <Text style={styles.timeButtonText}>
                  {mealTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            {showTimePicker && (
              <DateTimePicker
                value={mealTime}
                mode="time"
                is24Hour={false}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
                accentColor={theme.colors.orangeBright}
                themeVariant="dark"
              />
            )}
          </View>
        )}

        {/* Notes - dark card */}
        {!isFasting && !shouldStartFasting && (
          <View style={styles.setupCard}>
            <Text style={styles.setupCardLabel}>NOTES</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="E.g., Oatmeal with berries"
              placeholderTextColor={theme.colors.textMuted}
              value={mealNotes}
              onChangeText={setMealNotes}
              multiline
              numberOfLines={3}
            />
          </View>
        )}
      </ScrollView>

      {/* Fixed bottom - circle action button */}
      <View style={styles.fixedControlsWrapper}>
        <View style={styles.controlsContainer}>
          {shouldStartFasting && !isFasting ? (
            <>
              <TouchableOpacity
                style={styles.circleButton}
                onPress={startFastingMode}
              >
                <Ionicons name="play" size={30} color={theme.colors.text} />
              </TouchableOpacity>
            </>
          ) : isFasting ? (
            <TouchableOpacity
              style={styles.circleButton}
              onPress={breakFastAndLogMeal}
            >
              <Ionicons name="checkmark" size={30} color={theme.colors.text} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.circleButton}
              onPress={saveMeal}
            >
              <Ionicons name="checkmark" size={30} color={theme.colors.text} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.circleButtonLabel}>
          {shouldStartFasting && !isFasting
            ? 'start fast'
            : isFasting
              ? 'end fast'
              : 'log meal'}
        </Text>
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
  mealSizeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  mealSizePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  mealSizePillActive: {
    borderColor: theme.colors.orangeBright,
    backgroundColor: 'rgba(255, 157, 66, 0.1)',
  },
  mealSizePillText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
  },
  mealSizePillTextActive: {
    color: theme.colors.orangeBright,
    fontWeight: theme.typography.weights.bold,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeButtonText: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  notesInput: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 12,
    color: theme.colors.text,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  // Fasting card
  fastingCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: theme.colors.orangeDeep,
  },
  fastingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  fastingTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  fastingDuration: {
    fontSize: 36,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.orangeBright,
    marginBottom: 12,
  },
  milestoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 157, 66, 0.15)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 157, 66, 0.4)',
    gap: 6,
  },
  milestoneText: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.orangeBright,
  },
  fastingSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
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
  notesDisplay: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  notesDisplayLabel: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  notesDisplayText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
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
