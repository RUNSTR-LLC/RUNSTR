/**
 * PublicWorkoutsTab - Display only Nostr kind 1301 workout events
 * Shows workouts that have been published to the Nostr network
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  Text,
  StyleSheet,
} from 'react-native';
import { theme } from '../../../styles/theme';
import { Card } from '../../ui/Card';
import { LoadingOverlay } from '../../ui/LoadingStates';
import { EnhancedWorkoutCard } from '../shared/EnhancedWorkoutCard';
import { MonthlyWorkoutGroup, groupWorkoutsByMonth } from '../shared/MonthlyWorkoutGroup';
import { Nuclear1301Service } from '../../../services/fitness/Nuclear1301Service';
import type { NostrWorkout } from '../../../types/nostrWorkout';
import type { UnifiedWorkout } from '../../../services/fitness/workoutMergeService';
import type { Workout } from '../../../types/workout';

interface PublicWorkoutsTabProps {
  userId: string;
  pubkey?: string;
  onRefresh?: () => void;
}

export const PublicWorkoutsTab: React.FC<PublicWorkoutsTabProps> = ({
  userId,
  pubkey,
  onRefresh,
}) => {
  const [workouts, setWorkouts] = useState<NostrWorkout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const nuclear1301Service = Nuclear1301Service.getInstance();

  useEffect(() => {
    loadNostrWorkouts();
  }, [pubkey]);

  const loadNostrWorkouts = async () => {
    try {
      setIsLoading(true);
      console.log('⚡ Loading public Nostr workouts...');

      if (!pubkey) {
        console.log('No pubkey available, skipping Nostr workout load');
        setWorkouts([]);
        return;
      }

      // Fetch kind 1301 events from Nostr
      const nostrWorkouts = await nuclear1301Service.getUserWorkouts(pubkey);

      // Filter out invalid workouts and sort by date
      const validWorkouts = nostrWorkouts
        .filter((w: NostrWorkout) => w.type && w.type !== 'other')
        .sort((a: NostrWorkout, b: NostrWorkout) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

      setWorkouts(validWorkouts);
      console.log(`✅ Loaded ${validWorkouts.length} public Nostr workouts`);
    } catch (error) {
      console.error('❌ Failed to load Nostr workouts:', error);
      setWorkouts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadNostrWorkouts();
      onRefresh?.();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Convert NostrWorkout to UnifiedWorkout for compatibility
  const unifiedWorkouts: UnifiedWorkout[] = workouts.map(w => ({
    ...w,
    syncedToNostr: true,
    postedToSocial: false,
    canSyncToNostr: false,
    canPostToSocial: false,
  }));

  // Group workouts by month
  const monthlyGroups = groupWorkoutsByMonth(unifiedWorkouts);

  const renderWorkout = useCallback((workout: Workout) => (
    <EnhancedWorkoutCard
      workout={workout}
      hideActions={true} // No actions for already published workouts
    />
  ), []);

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
        <LoadingOverlay message="Loading public workouts..." visible={true} />
      </View>
    );
  }

  if (!pubkey) {
    return (
      <View style={styles.container}>
        <Card style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>Not Connected</Text>
          <Text style={styles.emptyStateText}>
            Please log in with your Nostr key to view your public workouts.
          </Text>
        </Card>
      </View>
    );
  }

  if (workouts.length === 0) {
    return (
      <View style={styles.container}>
        <Card style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No public workouts yet</Text>
          <Text style={styles.emptyStateText}>
            Your workouts will appear here after you post them to Nostr
            or enter them into competitions. Use the "All" tab to see
            your local workouts and share them.
          </Text>
        </Card>
      </View>
    );
  }

  return (
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
            {workouts.length} public workout{workouts.length !== 1 ? 's' : ''} on Nostr
          </Text>
        </View>
      }
    />
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
  header: {
    marginBottom: 16,
  },
  headerText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
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