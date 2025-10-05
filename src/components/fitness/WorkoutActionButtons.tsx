/**
 * WorkoutActionButtons - Competition & Sharing Controls for HealthKit Workouts
 * Provides "Compete" and "Post" buttons for HealthKit workouts
 * Integrates with WorkoutPublishingService and social sharing modal
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../styles/theme';
import type { UnifiedWorkout } from '../../services/fitness/workoutMergeService';
import { SocialShareModal } from './SocialShareModal';
import { CustomAlert } from '../ui/CustomAlert';

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

interface ModalState {
  showSocialShare: boolean;
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

  const [modalState, setModalState] = useState<ModalState>({
    showSocialShare: false,
  });

  const [alertState, setAlertState] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({
    visible: false,
    title: '',
    message: '',
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
      setAlertState({
        visible: true,
        title: 'Competition Entry Failed',
        message: 'Could not enter workout into competition. Please check your connection and try again.',
      });
    }
  };

  const handleShowSocialModal = () => {
    if (!workout.canPostToSocial) return;

    // Allow posting to social without requiring competition entry first
    // Users can post HealthKit workouts directly to social feeds (kind 1)
    // without creating competition entries (kind 1301)
    setModalState({ showSocialShare: true });
  };

  const handlePostToNostr = async (platform: 'nostr' | 'twitter' | 'instagram') => {
    if (platform !== 'nostr') {
      // For now, only Nostr is implemented
      return;
    }

    if (!workout.canPostToSocial || state.posting) return;

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
      setAlertState({
        visible: true,
        title: 'Post Failed',
        message: 'Could not post workout to social feeds. Please try again.',
      });
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
              color="#000000"
            />
          ) : (
            <Text style={textStyle}>
              {success ? (variant === 'save' ? 'Competing!' : 'Shared!') : text}
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
          'Compete',
          handleSaveToNostr,
          workout.canSyncToNostr,
          state.saving,
          state.saveSuccess,
          'save'
        )}

      {workout.canPostToSocial &&
        renderButton(
          'Post',
          handleShowSocialModal,
          workout.canPostToSocial,
          state.posting,
          state.postSuccess,
          'post'
        )}

      {/* Status indicators for already completed actions */}
      {workout.syncedToNostr && !workout.canSyncToNostr && (
        <View style={styles.competingButton}>
          <Text style={styles.competingButtonText}>✓ Competing</Text>
        </View>
      )}

      {workout.postedToSocial && (
        <View style={styles.postedButton}>
          <Text style={styles.postedButtonText}>✓ Posted</Text>
        </View>
      )}

      <SocialShareModal
        visible={modalState.showSocialShare}
        onClose={() => setModalState({ showSocialShare: false })}
        onSelectPlatform={handlePostToNostr}
      />

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={[{ text: 'OK', style: 'default' }]}
        onClose={() => setAlertState({ ...alertState, visible: false })}
      />
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
    backgroundColor: '#FFB366', // Light orange background
    borderColor: '#FFB366',
  },
  postButton: {
    backgroundColor: '#FFB366', // Light orange background
    borderColor: '#FFB366',
  },
  disabledButton: {
    backgroundColor: theme.colors.cardBackground,
    borderColor: theme.colors.border,
    opacity: 0.5,
  },
  successButton: {
    backgroundColor: '#FFB366', // Light orange for success
    borderColor: '#FFB366',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#000000', // Black text on light orange
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  compactButtonText: {
    color: '#000000', // Black text on light orange
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  disabledButtonText: {
    color: theme.colors.textMuted,
  },
  successButtonText: {
    color: '#000000', // Black text for success state
  },
  competingButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 100,
    backgroundColor: '#FFB366', // Light orange background
    borderColor: '#FFB366',
    opacity: 0.6, // Inactive state
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  competingButtonText: {
    color: '#000000', // Black text on orange
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  postedButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 100,
    backgroundColor: '#FFB366', // Light orange background
    borderColor: '#FFB366',
    opacity: 0.6, // Inactive state
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postedButtonText: {
    color: '#000000', // Black text on orange
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default WorkoutActionButtons;
