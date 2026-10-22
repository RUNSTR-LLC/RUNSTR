/**
 * WorkoutSummaryModal - Post-run summary
 * Shows the run's stats and splits, and publishes it to Nostr as a kind 1301
 * note when auto-publish is on (Settings → Sharing). The publish status row
 * always says where the run is: published, publishing, failed (retry), or
 * saved on this device only.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { theme } from '../../styles/theme';
import type { PublishableWorkout } from '../../services/nostr/workoutPublishingService';
import type { Split } from '../../services/activity/SplitTrackingService';
import TTSAnnouncementService from '../../services/activity/TTSAnnouncementService';
import { activityMetricsService } from '../../services/activity/ActivityMetricsService';
import { publishRun } from '../../services/nostr/publishRun';
import WorkoutStatusTracker from '../../services/fitness/WorkoutStatusTracker';
import { NostrPostingPreferencesService } from '../../services/activity/NostrPostingPreferencesService';
import { PostingErrorBoundary } from '../ui/PostingErrorBoundary';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { useUnitPreference } from '../../hooks/useUnitPreference';
import { SummarySplits } from './SummarySplits';

interface WorkoutSummaryProps {
  visible: boolean;
  onClose: () => void;
  workout: {
    type: 'running';
    distance: number; // in meters
    duration: number; // in seconds
    calories: number;
    elevation?: number; // in meters
    pace?: number;
    splits?: Split[];
    localWorkoutId?: string; // Absent when the local save failed
  };
}

/**
 * - checking: reading saved status and preferences
 * - publishing / published / failed: the 1301 publish
 * - off: auto-publish is off; the user can publish this run by hand
 * - local: saved on this device only (no distance, or no signing key)
 * - unsaved: the local save failed, so there is nothing to publish
 */
type PublishState = 'checking' | 'publishing' | 'published' | 'failed' | 'off' | 'local' | 'unsaved';

export const WorkoutSummaryModal: React.FC<WorkoutSummaryProps> = ({
  visible,
  onClose,
  workout,
}) => {
  const { isMetric, distanceLabel } = useUnitPreference();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [publishState, setPublishState] = useState<PublishState>('checking');
  // Guards against a second publish while one is in flight (effects can re-run)
  const publishingRef = useRef(false);

  const formatDistance = (meters: number): string => {
    const value = isMetric ? meters / 1000 : meters * 0.000621371;
    return `${value.toFixed(2)} ${distanceLabel}`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const mmss = `${minutes.toString().padStart(hours > 0 ? 2 : 1, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
    return hours > 0 ? `${hours}:${mmss}` : mmss;
  };

  const createPublishableWorkout = async (workoutId: string): Promise<PublishableWorkout> => {
    const npub = await AsyncStorage.getItem('@runstr:npub');
    return {
      // The stable local id keeps the 1301 d-tag deterministic, so a retry
      // replaces the event instead of publishing a duplicate.
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
        title: 'Running Workout',
        sourceApp: 'RUNSTR',
        notes: `Tracked ${formatDistance(workout.distance)} running`,
      },
      pace: workout.pace,
      splits: workout.splits,
    };
  };

  const publish = useCallback(async () => {
    const workoutId = workout.localWorkoutId;
    if (!workoutId || publishingRef.current) return;
    publishingRef.current = true;
    setPublishState('publishing');
    const result = await publishRun(await createPublishableWorkout(workoutId));
    setPublishState(
      result.status === 'published' ? 'published' : result.status === 'noSigner' ? 'local' : 'failed'
    );
    publishingRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout]);

  // Decide the publish state when the modal opens; auto-publish if enabled
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const decide = async () => {
      setPublishState('checking');
      if (!workout.localWorkoutId) {
        setPublishState('unsaved');
        return;
      }
      const status = await WorkoutStatusTracker.getStatus(workout.localWorkoutId);
      if (cancelled) return;
      if (status.postedToNostr) {
        setPublishState('published');
        return;
      }
      // A fresh run (not a reopen of a published one): success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // A step-only session has no run to publish
      if (!(workout.distance > 0)) {
        setPublishState('local');
        return;
      }
      const enabled = await NostrPostingPreferencesService.isAutoPostEnabled();
      if (cancelled) return;
      if (!enabled) {
        setPublishState('off');
        return;
      }
      await publish();
    };
    decide();
    return () => {
      cancelled = true;
    };
  }, [visible, workout.localWorkoutId, workout.distance, publish]);

  // Read the summary aloud once the slide-in animation finishes
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(async () => {
      setIsSpeaking(true);
      await TTSAnnouncementService.announceSummary(workout);
      setIsSpeaking(false);
    }, 500);
    return () => {
      clearTimeout(timer);
      TTSAnnouncementService.stopSpeaking();
      setIsSpeaking(false);
    };
  }, [visible, workout]);

  const renderPublishStatus = () => {
    switch (publishState) {
      case 'checking':
        return null;
      case 'publishing':
        return (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color={theme.colors.textMuted} />
            <Text style={styles.statusText}>Publishing to Nostr…</Text>
          </View>
        );
      case 'published':
        return (
          <View style={styles.statusRow}>
            <Ionicons name="checkmark-circle" size={18} color={theme.colors.accent} />
            <Text style={styles.statusTextStrong}>Published to Nostr</Text>
          </View>
        );
      case 'failed':
      case 'off':
        return (
          <View style={styles.statusBlock}>
            <Text style={styles.statusText}>
              {publishState === 'failed'
                ? 'Couldn’t reach relays. Your run is saved on this device.'
                : 'Saved on this device.'}
            </Text>
            <TouchableOpacity style={styles.publishButton} onPress={publish} activeOpacity={0.8}>
              <Ionicons name="paper-plane-outline" size={18} color={theme.colors.background} />
              <Text style={styles.publishButtonText}>
                {publishState === 'failed' ? 'Retry' : 'Publish to Nostr'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      case 'local':
        return (
          <View style={styles.statusRow}>
            <Ionicons name="phone-portrait-outline" size={16} color={theme.colors.textMuted} />
            <Text style={styles.statusText}>Saved on this device</Text>
          </View>
        );
      case 'unsaved':
        return (
          <View style={styles.statusRow}>
            <Ionicons name="alert-circle-outline" size={16} color={theme.colors.textMuted} />
            <Text style={styles.statusText}>This run couldn’t be saved</Text>
          </View>
        );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <PostingErrorBoundary
        onClose={onClose}
        fallbackTitle="Run Error"
        fallbackMessage="There was an error showing your run. It is still saved on this device."
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <View style={styles.header}>
                <Text style={styles.title}>Run complete</Text>
                {isSpeaking && (
                  <View style={styles.speakingIndicator}>
                    <Ionicons name="volume-medium" size={14} color={theme.colors.textMuted} />
                    <Text style={styles.speakingText}>Speaking</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Ionicons name="close" size={24} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.statsGrid}>
                {workout.distance > 0 && (
                  <View style={styles.statCard}>
                    <AnimatedNumber
                      value={workout.distance}
                      style={styles.statValue}
                      format={formatDistance}
                      animateOnMount
                    />
                    <Text style={styles.statLabel}>Distance</Text>
                  </View>
                )}
                <View style={styles.statCard}>
                  <AnimatedNumber
                    value={workout.duration}
                    style={styles.statValue}
                    format={formatDuration}
                    animateOnMount
                  />
                  <Text style={styles.statLabel}>Time</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{activityMetricsService.formatPace(workout.pace)}</Text>
                  <Text style={styles.statLabel}>Pace</Text>
                </View>
                {workout.elevation !== undefined && workout.elevation > 0 && (
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{workout.elevation.toFixed(0)}m</Text>
                    <Text style={styles.statLabel}>Elevation</Text>
                  </View>
                )}
                {workout.calories > 0 && (
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{workout.calories}</Text>
                    <Text style={styles.statLabel}>Calories</Text>
                  </View>
                )}
              </View>

              {workout.splits && workout.splits.length > 0 && (
                <SummarySplits splits={workout.splits} isMetric={isMetric} />
              )}

              {renderPublishStatus()}

              <TouchableOpacity style={styles.doneButton} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </PostingErrorBoundary>
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
    width: '90%',
    maxWidth: 400,
    maxHeight: Dimensions.get('window').height * 0.85,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  scrollContent: {
    padding: 24,
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
  title: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  speakingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  speakingText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginBottom: 8,
  },
  statusBlock: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  statusTextStrong: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    padding: 14,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.text,
  },
  publishButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
  },
  doneButton: {
    alignItems: 'center',
    padding: 14,
    marginTop: 4,
  },
  doneButtonText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
  },
});
