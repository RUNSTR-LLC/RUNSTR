/**
 * WorkoutActionButtons - Post & Save Controls for HealthKit Workouts
 * Provides "Save to Nostr" and "Post to Nostr" buttons for HealthKit workouts
 * Integrates with WorkoutPublishingService and shows appropriate loading states
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { theme } from '../../styles/theme';
import type { UnifiedWorkout } from '../../services/fitness/workoutMergeService';

interface WorkoutActionButtonsProps {
  workout: UnifiedWorkout;
  onSaveToNostr: (workout: UnifiedWorkout) => Promise<void>;
  onPostToNostr: (workout: UnifiedWorkout) => Promise<void>;
  compact?: boolean; // For smaller display in cards
}

interface ButtonState {
  saving: boolean;
  posting: boolean;
  saveSuccess: boolean;
  postSuccess: boolean;
}

export const WorkoutActionButtons: React.FC<WorkoutActionButtonsProps> = ({
  workout,
  onSaveToNostr,
  onPostToNostr,
  compact = false,
}) => {
  const [state, setState] = useState<ButtonState>({
    saving: false,
    posting: false,
    saveSuccess: false,
    postSuccess: false,
  });

  const handleSaveToNostr = async () => {
    if (!workout.canSyncToNostr || state.saving) return;

    setState((prev) => ({ ...prev, saving: true, saveSuccess: false }));

    try {
      await onSaveToNostr(workout);
      setState((prev) => ({ ...prev, saving: false, saveSuccess: true }));

      // Reset success state after 2 seconds
      setTimeout(() => {
        setState((prev) => ({ ...prev, saveSuccess: false }));
      }, 2000);
    } catch (error) {
      setState((prev) => ({ ...prev, saving: false }));
      Alert.alert(
        'Sync Failed',
        'Could not save workout to Nostr. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handlePostToNostr = async () => {
    if (!workout.canPostToSocial || state.posting) return;

    // If workout not synced to Nostr yet, ask user to save first
    if (!workout.syncedToNostr && workout.source === 'healthkit') {
      Alert.alert(
        'Sync Required',
        'You need to save this workout to Nostr before posting to social feeds.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save & Post',
            onPress: async () => {
              await handleSaveToNostr();
              // Wait for save to complete, then post
              setTimeout(() => handlePostToNostr(), 1000);
            },
          },
        ]
      );
      return;
    }

    setState((prev) => ({ ...prev, posting: true, postSuccess: false }));

    try {
      await onPostToNostr(workout);
      setState((prev) => ({ ...prev, posting: false, postSuccess: true }));

      // Reset success state after 2 seconds
      setTimeout(() => {
        setState((prev) => ({ ...prev, postSuccess: false }));
      }, 2000);
    } catch (error) {
      setState((prev) => ({ ...prev, posting: false }));
      Alert.alert(
        'Post Failed',
        'Could not post workout to social feeds. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderButton = (
    text: string,
    onPress: () => void,
    enabled: boolean,
    loading: boolean,
    success: boolean,
    variant: 'save' | 'post'
  ) => {
    const isDisabled = !enabled || loading;
    const buttonStyle = [
      compact ? styles.compactButton : styles.actionButton,
      variant === 'save' ? styles.saveButton : styles.postButton,
      isDisabled && styles.disabledButton,
      success && styles.successButton,
    ];

    const textStyle = [
      compact ? styles.compactButtonText : styles.actionButtonText,
      isDisabled && styles.disabledButtonText,
      success && styles.successButtonText,
    ];

    return (
      <TouchableOpacity
        style={buttonStyle}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.7}
      >
        <View style={styles.buttonContent}>
          {loading ? (
            <ActivityIndicator
              size="small"
              color={
                variant === 'save'
                  ? theme.colors.accent
                  : theme.colors.textMuted
              }
            />
          ) : (
            <Text style={textStyle}>
              {success ? (variant === 'save' ? 'Saved!' : 'Posted!') : text}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Don't show buttons for workouts that can't be posted
  if (!workout.canSyncToNostr && !workout.canPostToSocial) {
    return null;
  }

  return (
    <View style={compact ? styles.compactContainer : styles.container}>
      {workout.canSyncToNostr &&
        renderButton(
          'Save to Nostr',
          handleSaveToNostr,
          workout.canSyncToNostr,
          state.saving,
          state.saveSuccess,
          'save'
        )}

      {workout.canPostToSocial &&
        renderButton(
          'Post to Nostr',
          handlePostToNostr,
          workout.canPostToSocial,
          state.posting,
          state.postSuccess,
          'post'
        )}

      {/* Status indicators for already completed actions */}
      {workout.syncedToNostr && !workout.canSyncToNostr && (
        <View style={[styles.statusIndicator, styles.syncedIndicator]}>
          <Text style={styles.statusText}>✓ Synced</Text>
        </View>
      )}

      {workout.postedToSocial && (
        <View style={[styles.statusIndicator, styles.postedIndicator]}>
          <Text style={styles.statusText}>✓ Posted</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 100,
  },
  compactButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    minWidth: 80,
  },
  saveButton: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  postButton: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.buttonBorder,
  },
  disabledButton: {
    backgroundColor: theme.colors.cardBackground,
    borderColor: theme.colors.border,
    opacity: 0.5,
  },
  successButton: {
    backgroundColor: theme.colors.statusConnected,
    borderColor: theme.colors.statusConnected,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: theme.colors.accentText,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  compactButtonText: {
    color: theme.colors.accentText,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  disabledButtonText: {
    color: theme.colors.textMuted,
  },
  successButtonText: {
    color: theme.colors.text,
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 4,
  },
  syncedIndicator: {
    backgroundColor: theme.colors.statusConnected + '20', // 20% opacity
  },
  postedIndicator: {
    backgroundColor: theme.colors.syncBackground,
  },
  statusText: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '500',
  },
});

export default WorkoutActionButtons;
