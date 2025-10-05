/**
 * WorkoutSummaryModal - Post-workout summary with compete/share options
 * Shows workout stats and provides buttons for competition entry and social sharing
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import workoutPublishingService from '../../services/nostr/workoutPublishingService';
import type { PublishableWorkout } from '../../services/nostr/workoutPublishingService';
import type { Split } from '../../services/activity/SplitTrackingService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SocialShareModal } from '../fitness/SocialShareModal';
import { nsecToPrivateKey } from '../../utils/nostr';
import TTSAnnouncementService from '../../services/activity/TTSAnnouncementService';
import LocalWorkoutStorageService from '../../services/fitness/LocalWorkoutStorageService';
import { activityMetricsService } from '../../services/activity/ActivityMetricsService';

interface WorkoutSummaryProps {
  visible: boolean;
  onClose: () => void;
  workout: {
    type: 'running' | 'walking' | 'cycling';
    distance: number; // in meters
    duration: number; // in seconds
    calories: number;
    elevation?: number; // in meters
    pace?: number; // minutes per km
    speed?: number; // km/h for cycling
    steps?: number; // for walking
    splits?: Split[]; // kilometer splits for running
    localWorkoutId?: string; // For marking as synced after posting
  };
}

export const WorkoutSummaryModal: React.FC<WorkoutSummaryProps> = ({
  visible,
  onClose,
  workout,
}) => {
  const [isPosting, setIsPosting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [posted, setPosted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // TTS Announcement when modal opens
  useEffect(() => {
    if (visible && workout) {
      // Announce summary after a brief delay to let modal animation complete
      const timer = setTimeout(async () => {
        setIsSpeaking(true);
        await TTSAnnouncementService.announceSummary(workout);
        setIsSpeaking(false);
      }, 500);

      return () => {
        clearTimeout(timer);
        // Stop speech when modal closes
        TTSAnnouncementService.stopSpeaking();
        setIsSpeaking(false);
      };
    }
  }, [visible, workout]);

  const formatDistance = (meters: number): string => {
    const km = meters / 1000;
    return `${km.toFixed(2)} km`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSpeed = (speed?: number): string => {
    if (!speed) return '0.0 km/h';
    return `${speed.toFixed(1)} km/h`;
  };

  const formatSplitTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAverageSplitPace = (): number | null => {
    if (!workout.splits || workout.splits.length === 0) return null;
    const totalPace = workout.splits.reduce(
      (sum, split) => sum + split.pace,
      0
    );
    return totalPace / workout.splits.length;
  };

  const getSplitComparison = (
    split: Split
  ): 'faster' | 'slower' | 'average' => {
    const avgPace = getAverageSplitPace();
    if (!avgPace) return 'average';

    const diff = split.pace - avgPace;
    const threshold = 5; // 5 seconds per km difference

    if (diff < -threshold) return 'faster';
    if (diff > threshold) return 'slower';
    return 'average';
  };

  const createPublishableWorkout =
    async (): Promise<PublishableWorkout | null> => {
      const npub = await AsyncStorage.getItem('@runstr:npub');
      const workoutId = `workout_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      return {
        id: workoutId,
        userId: npub || 'unknown',
        type: workout.type,
        startTime: new Date(Date.now() - workout.duration * 1000).toISOString(),
        endTime: new Date().toISOString(),
        duration: workout.duration,
        distance: workout.distance,
        calories: workout.calories,
        source: 'manual',
        syncedAt: new Date().toISOString(),
        sourceApp: 'RUNSTR',
        elevationGain: workout.elevation,
        unitSystem: 'metric',
        canSyncToNostr: true,
        metadata: {
          title: `${
            workout.type.charAt(0).toUpperCase() + workout.type.slice(1)
          } Workout`,
          sourceApp: 'RUNSTR',
          notes: `Tracked ${formatDistance(workout.distance)} ${workout.type}`,
        },
        pace: workout.pace,
      };
    };

  const handleShowSocialModal = () => {
    setShowSocialModal(true);
  };

  const handlePostToFeed = async (
    platform: 'nostr' | 'twitter' | 'instagram'
  ) => {
    if (platform !== 'nostr') {
      // Only Nostr is implemented for now
      return;
    }

    setIsPosting(true);
    try {
      const nsec = await AsyncStorage.getItem('@runstr:user_nsec');
      const npub = await AsyncStorage.getItem('@runstr:npub');

      if (!nsec) {
        Alert.alert('Error', 'No user key found. Please login first.');
        return;
      }

      // Convert nsec to hex private key for signing
      const hexPrivKey = nsecToPrivateKey(nsec);

      const publishableWorkout = await createPublishableWorkout();
      if (!publishableWorkout) return;

      // Post as kind 1 social event
      const result = await workoutPublishingService.postWorkoutToSocial(
        publishableWorkout,
        hexPrivKey,
        npub || 'unknown',
        {
          includeStats: true,
          includeMotivation: true,
          cardTemplate: 'achievement',
        }
      );

      if (result.success) {
        setPosted(true);

        // Mark as synced in local storage if this was a local workout
        if (workout.localWorkoutId && result.eventId) {
          try {
            await LocalWorkoutStorageService.markAsSynced(
              workout.localWorkoutId,
              result.eventId
            );
            console.log(`✅ Marked local workout ${workout.localWorkoutId} as synced`);
          } catch (syncError) {
            console.warn('⚠️ Failed to mark workout as synced:', syncError);
            // Non-critical - workout is still on Nostr
          }
        }

        Alert.alert(
          'Shared! 🎉',
          'Your workout has been shared to your feed!',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', `Failed to post: ${result.error}`);
      }
    } catch (error) {
      console.error('Error posting workout:', error);
      Alert.alert('Error', 'Failed to post workout to feed');
    } finally {
      setIsPosting(false);
    }
  };

  const handleSaveForCompetition = async () => {
    setIsSaving(true);
    try {
      const nsec = await AsyncStorage.getItem('@runstr:user_nsec');
      const npub = await AsyncStorage.getItem('@runstr:npub');

      if (!nsec) {
        Alert.alert('Error', 'No user key found. Please login first.');
        return;
      }

      // Convert nsec to hex private key for signing
      const hexPrivKey = nsecToPrivateKey(nsec);

      const publishableWorkout = await createPublishableWorkout();
      if (!publishableWorkout) return;

      // Save as kind 1301 workout event
      const result = await workoutPublishingService.saveWorkoutToNostr(
        publishableWorkout,
        hexPrivKey,
        npub || 'unknown'
      );

      if (result.success) {
        setSaved(true);

        // Mark as synced in local storage if this was a local workout
        if (workout.localWorkoutId && result.eventId) {
          try {
            await LocalWorkoutStorageService.markAsSynced(
              workout.localWorkoutId,
              result.eventId
            );
            console.log(`✅ Marked local workout ${workout.localWorkoutId} as synced`);
          } catch (syncError) {
            console.warn('⚠️ Failed to mark workout as synced:', syncError);
            // Non-critical - workout is still on Nostr
          }
        }

        Alert.alert(
          'Competing! ✅',
          'Your workout has been entered into competitions!',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', `Failed to save: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert('Error', 'Failed to save workout');
    } finally {
      setIsSaving(false);
    }
  };

  const getActivityIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (workout.type) {
      case 'running':
        return 'fitness';
      case 'walking':
        return 'walk';
      case 'cycling':
        return 'bicycle';
      default:
        return 'fitness';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons
              name={getActivityIcon()}
              size={40}
              color={theme.colors.text}
            />
            <View style={styles.titleContainer}>
              <Text style={styles.title}>
                {workout.type.charAt(0).toUpperCase() + workout.type.slice(1)}{' '}
                Complete!
              </Text>
              {isSpeaking && (
                <View style={styles.speakingIndicator}>
                  <Ionicons
                    name="volume-medium"
                    size={16}
                    color={theme.colors.accent}
                  />
                  <Text style={styles.speakingText}>Speaking...</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {formatDistance(workout.distance)}
              </Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {formatDuration(workout.duration)}
              </Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            {workout.type === 'running' && (
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{activityMetricsService.formatPace(workout.pace)}</Text>
                <Text style={styles.statLabel}>Pace</Text>
              </View>
            )}
            {workout.type === 'cycling' && (
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {formatSpeed(workout.speed)}
                </Text>
                <Text style={styles.statLabel}>Speed</Text>
              </View>
            )}
            {workout.type === 'walking' && workout.steps && (
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {workout.steps.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>Steps</Text>
              </View>
            )}
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{workout.calories}</Text>
              <Text style={styles.statLabel}>Calories</Text>
            </View>
            {workout.elevation !== undefined && workout.elevation > 0 && (
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {workout.elevation.toFixed(0)}m
                </Text>
                <Text style={styles.statLabel}>Elevation</Text>
              </View>
            )}
          </View>

          {/* Splits Section */}
          {workout.type === 'running' &&
            workout.splits &&
            workout.splits.length > 0 && (
              <View style={styles.splitsSection}>
                <Text style={styles.splitsHeader}>Kilometer Splits</Text>
                <ScrollView
                  style={styles.splitsScrollView}
                  showsVerticalScrollIndicator={false}
                >
                  {workout.splits.map((split) => {
                    const comparison = getSplitComparison(split);
                    return (
                      <View key={split.number} style={styles.splitRow}>
                        <View style={styles.splitLeft}>
                          <Text style={styles.splitNumber}>
                            {split.number}K
                          </Text>
                        </View>
                        <View style={styles.splitMiddle}>
                          <Text style={styles.splitTime}>
                            {formatSplitTime(split.splitTime)}
                          </Text>
                          <Text style={styles.splitPaceText}>
                            {activityMetricsService.formatPace(split.pace)}
                          </Text>
                        </View>
                        <View style={styles.splitRight}>
                          {comparison === 'faster' && (
                            <Ionicons
                              name="trending-up"
                              size={16}
                              color={theme.colors.text}
                            />
                          )}
                          {comparison === 'slower' && (
                            <Ionicons
                              name="trending-down"
                              size={16}
                              color={theme.colors.textMuted}
                            />
                          )}
                          {comparison === 'average' && (
                            <Ionicons name="remove" size={16} color={theme.colors.textMuted} />
                          )}
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
                <Text style={styles.splitsFooter}>
                  Average Pace: {activityMetricsService.formatPace(getAverageSplitPace() || 0)}
                </Text>
              </View>
            )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.postButton,
                posted && styles.disabledButton,
              ]}
              onPress={handleShowSocialModal}
              disabled={isPosting || posted}
            >
              {isPosting ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.background}
                />
              ) : (
                <>
                  <Ionicons
                    name={posted ? 'checkmark-circle' : 'megaphone'}
                    size={20}
                    color={theme.colors.background}
                  />
                  <Text style={styles.postButtonText}>
                    {posted ? 'Shared' : 'Post'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.saveButton,
                saved && styles.disabledButton,
              ]}
              onPress={handleSaveForCompetition}
              disabled={isSaving || saved}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={theme.colors.text} />
              ) : (
                <>
                  <Ionicons
                    name={saved ? 'checkmark-circle' : 'save'}
                    size={20}
                    color={theme.colors.text}
                  />
                  <Text style={styles.saveButtonText}>
                    {saved ? 'Competing' : 'Compete'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Info Text */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>Post:</Text> Share with your
              followers on social media
            </Text>
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>Compete:</Text> Enter into active
              competitions and leaderboards
            </Text>
          </View>

          {/* Dismiss Button */}
          <TouchableOpacity style={styles.dismissButton} onPress={onClose}>
            <Text style={styles.dismissButtonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SocialShareModal
        visible={showSocialModal}
        onClose={() => setShowSocialModal(false)}
        onSelectPlatform={handlePostToFeed}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.large,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  closeButton: {
    position: 'absolute',
    right: -8,
    top: -8,
    padding: 8,
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: 12,
  },
  speakingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  speakingText: {
    fontSize: 12,
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.medium,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.medium,
    padding: 12,
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  actionButtons: {
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: theme.borderRadius.medium,
    gap: 8,
  },
  postButton: {
    backgroundColor: theme.colors.text,
  },
  saveButton: {
    backgroundColor: theme.colors.text,
  },
  disabledButton: {
    opacity: 0.5,
  },
  postButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
  },
  saveButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
  },
  infoContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.small,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  infoBold: {
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  dismissButton: {
    alignItems: 'center',
    padding: 12,
  },
  dismissButtonText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
  },
  splitsSection: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.medium,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  splitsHeader: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  splitsScrollView: {
    maxHeight: 160,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  splitLeft: {
    width: 40,
    marginRight: 12,
  },
  splitNumber: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  splitMiddle: {
    flex: 1,
  },
  splitTime: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 2,
  },
  splitPaceText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  splitRight: {
    marginLeft: 8,
    width: 24,
    alignItems: 'center',
  },
  splitsFooter: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
});
