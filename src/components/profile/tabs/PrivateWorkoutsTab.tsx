/**
 * PrivateWorkoutsTab - Display local Activity Tracker workouts (unsynced)
 * Shows only workouts that haven't been posted to Nostr yet
 * Zero loading time - instant display from local AsyncStorage
 * When workout is posted to Nostr, it's marked as synced and disappears from this tab
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { theme } from '../../../styles/theme';
import { Card } from '../../ui/Card';
import { EnhancedWorkoutCard } from '../shared/EnhancedWorkoutCard';
import { MonthlyWorkoutGroup, groupWorkoutsByMonth } from '../shared/MonthlyWorkoutGroup';
import localWorkoutStorage from '../../../services/fitness/LocalWorkoutStorageService';
import type { LocalWorkout } from '../../../services/fitness/LocalWorkoutStorageService';
import type { UnifiedWorkout } from '../../../services/fitness/workoutMergeService';
import type { Workout } from '../../../types/workout';
import { Ionicons } from '@expo/vector-icons';

interface PrivateWorkoutsTabProps {
  userId: string;
  pubkey?: string;
  onRefresh?: () => void;
  onPostToNostr?: (workout: LocalWorkout) => Promise<void>;
}

export const PrivateWorkoutsTab: React.FC<PrivateWorkoutsTabProps> = ({
  userId,
  pubkey,
  onRefresh,
  onPostToNostr,
}) => {
  const [workouts, setWorkouts] = useState<LocalWorkout[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [postingWorkoutId, setPostingWorkoutId] = useState<string | null>(null);

  useEffect(() => {
    loadPrivateWorkouts();
  }, []);

  const loadPrivateWorkouts = async () => {
    try {
      console.log('=� Loading private (unsynced) workouts from local storage...');

      // Zero loading time - instant from AsyncStorage
      const unsyncedWorkouts = await localWorkoutStorage.getUnsyncedWorkouts();

      console.log(` Loaded ${unsyncedWorkouts.length} private workouts (instant display)`);
      setWorkouts(unsyncedWorkouts);
    } catch (error) {
      console.error('L Failed to load private workouts:', error);
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

  const handlePostToNostr = async (workout: LocalWorkout) => {
    if (!onPostToNostr) {
      Alert.alert(
        'Not Implemented',
        'Post to Nostr functionality will be available soon'
      );
      return;
    }

    try {
      setPostingWorkoutId(workout.id);

      Alert.alert(
        'Post to Nostr',
        `Post this ${workout.type} workout as a kind 1301 event?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Post',
            onPress: async () => {
              try {
                await onPostToNostr(workout);
                // Refresh to remove from private list (it's now synced)
                await loadPrivateWorkouts();
                Alert.alert(' Success', 'Workout posted to Nostr');
              } catch (error) {
                console.error('Failed to post workout:', error);
                Alert.alert('L Error', 'Failed to post workout to Nostr');
              } finally {
                setPostingWorkoutId(null);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Post to Nostr error:', error);
      setPostingWorkoutId(null);
    }
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await localWorkoutStorage.deleteWorkout(workoutId);
              await loadPrivateWorkouts();
              console.log(` Deleted workout ${workoutId}`);
            } catch (error) {
              console.error('Failed to delete workout:', error);
              Alert.alert('Error', 'Failed to delete workout');
            }
          },
        },
      ]
    );
  };

  // Convert LocalWorkout to UnifiedWorkout for compatibility
  const unifiedWorkouts: UnifiedWorkout[] = workouts.map(w => ({
    ...w,
    userId: userId,
    syncedToNostr: false,
    postedToSocial: false,
    canSyncToNostr: true, // Can be posted to Nostr
    canPostToSocial: false,
  }));

  // Group workouts by month
  const monthlyGroups = groupWorkoutsByMonth(unifiedWorkouts);

  const renderWorkout = useCallback((workout: Workout) => {
    const localWorkout = workouts.find(w => w.id === workout.id);
    if (!localWorkout) return null;

    const isPosting = postingWorkoutId === workout.id;

    return (
      <View style={styles.workoutContainer}>
        <EnhancedWorkoutCard
          workout={workout}
          hideActions={true} // We'll use custom actions
        />

        <View style={styles.workoutActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.postButton]}
            onPress={() => handlePostToNostr(localWorkout)}
            disabled={isPosting}
          >
            {isPosting ? (
              <Text style={styles.postButtonText}>Posting...</Text>
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={16} color={theme.colors.accentText} />
                <Text style={styles.postButtonText}>Post to Nostr</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteWorkout(localWorkout.id)}
          >
            <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [workouts, postingWorkoutId]);

  const renderMonthlyGroup = ({ item }: { item: any }) => (
    <MonthlyWorkoutGroup
      group={item}
      renderWorkout={renderWorkout}
      defaultExpanded={item === monthlyGroups[0]}
    />
  );

  if (workouts.length === 0) {
    return (
      <View style={styles.container}>
        <Card style={styles.emptyState}>
          <Ionicons name="phone-portrait-outline" size={64} color={theme.colors.textMuted} />
          <Text style={styles.emptyStateTitle}>No Private Workouts</Text>
          <Text style={styles.emptyStateText}>
            Record workouts with the Activity Tracker to see them here.
            Once posted to Nostr, they'll move to the Public tab.
          </Text>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={monthlyGroups}
        renderItem={renderMonthlyGroup}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.text}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerText}>
              {workouts.length} private workout{workouts.length !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.headerSubtext}>
              Not posted to Nostr yet
            </Text>
          </View>
        }
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
    backgroundColor: theme.colors.accent + '15',
    gap: 6,
  },
  instantText: {
    fontSize: 11,
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.medium,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 16,
    alignItems: 'center',
  },
  headerText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
  },
  headerSubtext: {
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
    backgroundColor: theme.colors.accent,
    flex: 3,
  },
  postButtonText: {
    color: theme.colors.accentText,
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
  },
  deleteButton: {
    backgroundColor: theme.colors.error + '20',
    borderWidth: 1,
    borderColor: theme.colors.error,
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
});
