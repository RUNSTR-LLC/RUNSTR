/**
 * NostrWorkoutsTab - Enhanced Nostr workout display with time-based grouping
 * Shows Nostr kind 1301 workout events organized by time periods
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, FlatList, RefreshControl, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../../../styles/theme';
import { Card } from '../../ui/Card';
import { LoadingOverlay } from '../../ui/LoadingStates';
import { WorkoutCard } from '../shared/WorkoutCard';
import { Nuclear1301Service } from '../../../services/fitness/Nuclear1301Service';
import { WorkoutGroupingService, type WorkoutGroup } from '../../../utils/workoutGrouping';
import { WorkoutTimeGroup } from '../../fitness/WorkoutTimeGroup';
import type { NostrWorkout } from '../../../types/nostrWorkout';
import type { UnifiedWorkout } from '../../../services/fitness/workoutMergeService';

interface NostrWorkoutsTabProps {
  userId: string;
  pubkey?: string;
  onRefresh?: () => void;
}

export const NostrWorkoutsTab: React.FC<NostrWorkoutsTabProps> = ({
  userId,
  pubkey,
  onRefresh,
}) => {
  const [workouts, setWorkouts] = useState<NostrWorkout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['thisWeek']));

  const nuclear1301Service = Nuclear1301Service.getInstance();

  // Convert NostrWorkout to UnifiedWorkout for compatibility
  const unifiedWorkouts = useMemo((): UnifiedWorkout[] => {
    return workouts
      .filter(w => w.type && w.type !== 'unknown' && w.type !== 'other')
      .map(w => ({
        ...w,
        syncedToNostr: true,
        postedToSocial: false,
        canSyncToNostr: false,
        canPostToSocial: false,
      }));
  }, [workouts]);

  // Group workouts by time periods
  const workoutGroups = useMemo((): WorkoutGroup[] => {
    const groups = WorkoutGroupingService.groupWorkoutsByTime(unifiedWorkouts);
    // Apply expanded state
    return groups.map(group => ({
      ...group,
      isExpanded: expandedGroups.has(group.key)
    }));
  }, [unifiedWorkouts, expandedGroups]);

  useEffect(() => {
    loadNostrWorkouts();
  }, [pubkey]);

  const loadNostrWorkouts = async () => {
    if (!pubkey) {
      console.log('No pubkey provided for Nostr workouts');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('📱 Nuclear1301Service: Loading Nostr workouts (kind 1301 events)...');
      
      const nostrWorkouts = await nuclear1301Service.getUserWorkouts(pubkey);
      setWorkouts(nostrWorkouts);
      
      console.log(`✅ Nuclear1301Service: Loaded ${nostrWorkouts.length} Nostr workouts`);
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

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const renderWorkout = ({ item }: { item: NostrWorkout }) => (
    <WorkoutCard workout={item} />
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingOverlay message="Loading Nostr workouts..." visible={true} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.text}
        />
      }
      contentContainerStyle={styles.scrollContent}
    >
      {/* Grouped Workout List */}
      <View style={styles.list}>
        {workoutGroups.length > 0 ? (
          workoutGroups.map(group => (
            <WorkoutTimeGroup
              key={group.key}
              group={group}
              onToggle={toggleGroup}
              renderWorkout={(workout) => renderWorkout({ item: workout as NostrWorkout })}
            />
          ))
        ) : (
          <Card style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Nostr workouts found</Text>
            <Text style={styles.emptyStateText}>
              Workouts you publish to Nostr will appear here.
              {!pubkey && ' Please log in to view your workouts.'}
            </Text>
          </Card>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  list: {
    padding: 16,
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
  },
});