/**
 * PrivateWorkoutsTab - Display all local workouts stored on device
 * Shows ALL workouts in local storage: GPS tracked, manual, daily steps, AND imported Nostr
 * Zero loading time - instant display from local AsyncStorage
 * Provides complete local workout history with post/delete actions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { OstrichRefreshFlatList } from '../../ui/OstrichRefreshScrollView';
import { theme } from '../../../styles/theme';
import { Card } from '../../ui/Card';
import { CustomAlert } from '../../ui/CustomAlert';
import { EnhancedWorkoutCard } from '../shared/EnhancedWorkoutCard';
import {
  MonthlyWorkoutGroup,
  groupWorkoutsByMonth,
} from '../shared/MonthlyWorkoutGroup';
import localWorkoutStorage from '../../../services/fitness/LocalWorkoutStorageService';
import type { LocalWorkout } from '../../../services/fitness/LocalWorkoutStorageService';
import type { UnifiedWorkout } from '../../../services/fitness/workoutMergeService';
import type { Workout } from '../../../types/workout';
import { Ionicons } from '@expo/vector-icons';
import { WoTService } from '../../../services/wot/WoTService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PrivateWorkoutsTabProps {
  userId: string;
  pubkey?: string;
  onRefresh?: () => void;
  onPostToNostr?: (workout: LocalWorkout) => Promise<void>;
  onPostToSocial?: (workout: LocalWorkout) => Promise<void>;
}

export const PrivateWorkoutsTab: React.FC<PrivateWorkoutsTabProps> = ({
  userId,
  onRefresh,
  onPostToSocial,
}) => {
  const [workouts, setWorkouts] = useState<LocalWorkout[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [postingWorkoutId, setPostingWorkoutId] = useState<string | null>(null);
  const [postingType, setPostingType] = useState<'social' | 'nostr' | null>(
    null
  );
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
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

  // WOT eligibility state
  const [isWoTEligible, setIsWoTEligible] = useState(false);

  useEffect(() => {
    loadPrivateWorkouts();
    loadWoTEligibility();
  }, []);

  /**
   * Load WOT eligibility from cached score
   */
  const loadWoTEligibility = async () => {
    try {
      const pubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (!pubkey) return;
      const wotService = WoTService.getInstance();
      const score = await wotService.getCachedScore(pubkey);
      setIsWoTEligible(score !== null && score > 0);
    } catch (error) {
      console.warn('[PrivateWorkouts] WoT eligibility check failed:', error);
    }
  };

  const loadPrivateWorkouts = async () => {
    try {
      console.log('🔍 Loading all local workouts from local storage...');

      // Zero loading time - instant from AsyncStorage
      // Shows ALL locally stored workouts (GPS, manual, daily steps, AND imported Nostr)
      const allLocalWorkouts = await localWorkoutStorage.getAllWorkouts();

      console.log(
        ` Loaded ${allLocalWorkouts.length} local workouts (instant display)`
      );
      setWorkouts(allLocalWorkouts);
    } catch (error) {
      console.error('❌ Failed to load local workouts:', error);
      setWorkouts([]);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadPrivateWorkouts();
      onRefresh?.();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePostToSocial = async (workout: LocalWorkout) => {
    if (!onPostToSocial) {
      setAlertConfig({
        title: 'Not Implemented',
        message: 'Post to social functionality will be available soon',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setAlertVisible(true);
      return;
    }

    try {
      setPostingWorkoutId(workout.id);
      setPostingType('social');

      await onPostToSocial(workout);
      // Success alert handled by EnhancedSocialShareModal
    } catch (error) {
      console.error('Failed to post workout to social:', error);
      setAlertConfig({
        title: 'Error',
        message: 'Failed to post workout to social',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setAlertVisible(true);
    } finally {
      setPostingWorkoutId(null);
      setPostingType(null);
    }
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    setAlertConfig({
      title: 'Delete Workout',
      message:
        'Are you sure you want to delete this workout? This cannot be undone.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await localWorkoutStorage.deleteWorkout(workoutId);
              await loadPrivateWorkouts();
              console.log(`✅ Deleted workout ${workoutId}`);
            } catch (error) {
              console.error('Failed to delete workout:', error);
              setAlertConfig({
                title: 'Error',
                message: 'Failed to delete workout',
                buttons: [{ text: 'OK', style: 'default' }],
              });
              setAlertVisible(true);
            }
          },
        },
      ],
    });
    setAlertVisible(true);
  };

  // Convert LocalWorkout to UnifiedWorkout for compatibility
  const unifiedWorkouts: UnifiedWorkout[] = (workouts as any[]).map((w: any) => ({
    ...w,
    userId: userId,
    syncedToNostr: false,
    postedToSocial: false,
    canSyncToNostr: true, // Can be posted to Nostr
    canPostToSocial: false,
  }));

  // Group workouts by month
  const monthlyGroups = groupWorkoutsByMonth(unifiedWorkouts);

  const renderWorkout = useCallback(
    (workout: Workout) => {
      const localWorkout = workouts.find((w) => w.id === workout.id);
      if (!localWorkout) return null;

      const isPosting = postingWorkoutId === workout.id;

      return (
        <View style={styles.workoutContainer}>
          <EnhancedWorkoutCard
            workout={workout}
            hideActions={true} // We'll use custom actions
          />

          <View style={styles.workoutActions}>
            {/* Post button - WOT gated */}
            {isWoTEligible && (
              <TouchableOpacity
                style={[styles.actionButton, styles.postButton]}
                onPress={() => handlePostToSocial(localWorkout)}
                disabled={isPosting && postingType === 'social'}
              >
                {isPosting && postingType === 'social' ? (
                  <Text style={styles.postButtonText}>Posting...</Text>
                ) : (
                  <>
                    <Ionicons name="paper-plane-outline" size={16} color="#000" />
                    <Text style={styles.postButtonText}>Post</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteWorkout(localWorkout.id)}
            >
              <Ionicons
                name="trash-outline"
                size={16}
                color={theme.colors.accent}
              />
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [workouts, postingWorkoutId, postingType, isWoTEligible]
  );

  const renderMonthlyGroup = ({ item }: { item: any }) => (
    <MonthlyWorkoutGroup
      group={item}
      renderWorkout={renderWorkout as any}
      defaultExpanded={false}
    />
  );

  return (
    <View style={styles.container}>
      <OstrichRefreshFlatList
        data={monthlyGroups}
        renderItem={renderMonthlyGroup}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        ListFooterComponent={
          <>
            {/* Footer with workout count */}
            {workouts.length > 0 && (
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  {workouts.length} local workout
                  {workouts.length !== 1 ? 's' : ''}
                </Text>
                <Text style={styles.footerSubtext}>Stored on your device</Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <Card style={styles.emptyState}>
            <Ionicons
              name="phone-portrait-outline"
              size={64}
              color={theme.colors.textMuted}
            />
            <Text style={styles.emptyStateTitle}>No Local Workouts Yet</Text>
            <Text style={styles.emptyStateText}>
              Use the Activity Tracker to record workouts, or import your Nostr
              workout history from Advanced Analytics.
            </Text>
            <Text style={styles.emptyStateHint}>
              This tab shows all workouts stored on your device, including
              imported Nostr workouts.
            </Text>
          </Card>
        }
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
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  instantIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  instantText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  footer: {
    marginTop: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  footerText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
  },
  footerSubtext: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  workoutContainer: {
    marginBottom: 12,
  },
  workoutActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  postButton: {
    backgroundColor: theme.colors.text,
    flex: 1.5,
  },
  postButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
  },
  deleteButton: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: theme.colors.border,
    flex: 1,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    marginTop: 32,
    margin: 16,
  },
  emptyStateTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyStateHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
