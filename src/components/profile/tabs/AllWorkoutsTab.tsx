/**
 * AllWorkoutsTab - Unified view of all workouts from all sources
 * Merges HealthKit, Garmin, Google Fit, and Nostr workouts
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { theme } from '../../../styles/theme';
import { Card } from '../../ui/Card';
import { LoadingOverlay } from '../../ui/LoadingStates';
import { EnhancedWorkoutCard } from '../shared/EnhancedWorkoutCard';
import { SocialShareModal } from '../shared/SocialShareModal';
import { MonthlyWorkoutGroup, groupWorkoutsByMonth } from '../shared/MonthlyWorkoutGroup';
import { WorkoutMergeService } from '../../../services/fitness/workoutMergeService';
import { WorkoutPublishingService } from '../../../services/nostr/workoutPublishingService';
import { WorkoutStatusTracker } from '../../../services/fitness/WorkoutStatusTracker';
import { getNsecFromStorage } from '../../../utils/nostr';
import type { UnifiedWorkout } from '../../../services/fitness/workoutMergeService';
import type { Workout } from '../../../types/workout';

interface AllWorkoutsTabProps {
  userId: string;
  pubkey?: string;
  onRefresh?: () => void;
}

export const AllWorkoutsTab: React.FC<AllWorkoutsTabProps> = ({
  userId,
  pubkey,
  onRefresh,
}) => {
  const [workouts, setWorkouts] = useState<UnifiedWorkout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [nsecKey, setNsecKey] = useState<string | null>(null);

  const mergeService = WorkoutMergeService.getInstance();
  const publishingService = WorkoutPublishingService.getInstance();
  const statusTracker = WorkoutStatusTracker.getInstance();

  useEffect(() => {
    loadNsecKey();
    loadAllWorkouts();
  }, []);

  const loadNsecKey = async () => {
    try {
      const nsec = await getNsecFromStorage(userId);
      setNsecKey(nsec);
    } catch (error) {
      console.error('Failed to load nsec key:', error);
    }
  };

  const loadAllWorkouts = async () => {
    try {
      setIsLoading(true);
      console.log('📊 Loading all workouts from all sources...');

      // Fetch merged workouts from all sources
      const mergeResult = await mergeService.getMergedWorkouts(
        userId,
        pubkey || ''
      );

      // Sort by date (newest first)
      const sortedWorkouts = mergeResult.allWorkouts.sort((a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );

      setWorkouts(sortedWorkouts);
      console.log(`✅ Loaded ${sortedWorkouts.length} total workouts`);
      console.log(`   - HealthKit: ${mergeResult.healthKitCount}`);
      console.log(`   - Nostr: ${mergeResult.nostrCount}`);
      console.log(`   - Duplicates removed: ${mergeResult.duplicateCount}`);
    } catch (error) {
      console.error('❌ Failed to load workouts:', error);
      setWorkouts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadAllWorkouts();
      onRefresh?.();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCompete = async (workout: Workout) => {
    if (!nsecKey) {
      Alert.alert(
        'Authentication Required',
        'Please log in with your Nostr key to enter competitions.'
      );
      return;
    }

    try {
      console.log('🏃 Creating competition entry (kind 1301)...');
      const result = await publishingService.saveWorkoutToNostr(
        workout,
        nsecKey,
        userId
      );

      if (result.success) {
        await statusTracker.markAsCompeted(workout.id, result.eventId);
        Alert.alert('Success', 'Workout entered into competition!');
        await handleRefresh();
      } else {
        throw new Error(result.error || 'Failed to create competition entry');
      }
    } catch (error) {
      console.error('Failed to compete workout:', error);
      Alert.alert('Error', 'Failed to enter competition. Please try again.');
    }
  };

  const handleSocialShare = (workout: Workout) => {
    setSelectedWorkout(workout);
    setShareModalVisible(true);
  };

  const handleShareSuccess = () => {
    handleRefresh();
  };

  // Group workouts by month
  const monthlyGroups = groupWorkoutsByMonth(workouts);

  const renderWorkout = useCallback((workout: Workout) => (
    <EnhancedWorkoutCard
      workout={workout}
      onCompete={handleCompete}
      onSocialShare={handleSocialShare}
      hideActions={workout.source?.toLowerCase() === 'nostr'}
    />
  ), [nsecKey]);

  const renderMonthlyGroup = ({ item }: { item: any }) => (
    <MonthlyWorkoutGroup
      group={item}
      renderWorkout={renderWorkout}
      defaultExpanded={item === monthlyGroups[0]}
    />
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingOverlay message="Loading all workouts..." visible={true} />
      </View>
    );
  }

  if (workouts.length === 0) {
    return (
      <View style={styles.container}>
        <Card style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No workouts found</Text>
          <Text style={styles.emptyStateText}>
            Connect your fitness apps or record a workout to get started.
            Use the sync button above to import from Apple Health, Garmin, or Google Fit.
          </Text>
        </Card>
      </View>
    );
  }

  return (
    <>
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
      />

      <SocialShareModal
        visible={shareModalVisible}
        workout={selectedWorkout}
        userId={userId}
        onClose={() => {
          setShareModalVisible(false);
          setSelectedWorkout(null);
        }}
        onSuccess={handleShareSuccess}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    marginTop: 32,
  },
  emptyStateTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});