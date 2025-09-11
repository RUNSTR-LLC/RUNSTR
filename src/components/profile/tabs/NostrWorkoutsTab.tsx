/**
 * NostrWorkoutsTab - Simple Nostr workout display
 * Shows only Nostr kind 1301 workout events - no merging or complexity
 */

import React, { useState, useEffect } from 'react';
import { View, FlatList, RefreshControl, Text, StyleSheet } from 'react-native';
import { theme } from '../../../styles/theme';
import { Card } from '../../ui/Card';
import { LoadingOverlay } from '../../ui/LoadingStates';
import { WorkoutCard } from '../shared/WorkoutCard';
import { Nuclear1301Service } from '../../../services/fitness/Nuclear1301Service';
import type { NostrWorkout } from '../../../types/nostrWorkout';

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

  const nuclear1301Service = Nuclear1301Service.getInstance();

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

  const renderWorkout = ({ item }: { item: NostrWorkout }) => (
    <WorkoutCard workout={item}>
      {/* Nostr workouts are already published - no action needed */}
      <View style={styles.publishedBadge}>
        <Text style={styles.publishedText}>✓ Published to Nostr</Text>
      </View>
    </WorkoutCard>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingOverlay message="Loading Nostr workouts..." visible={true} />
      </View>
    );
  }

  return (
    <FlatList
      data={workouts}
      renderItem={renderWorkout}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.text}
        />
      }
      ListEmptyComponent={
        <Card style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No Nostr workouts found</Text>
          <Text style={styles.emptyStateText}>
            Workouts you publish to Nostr will appear here.
            {!pubkey && ' Please log in to view your workouts.'}
          </Text>
        </Card>
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  publishedBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.success + '20',
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  publishedText: {
    color: theme.colors.success,
    fontSize: 12,
    fontWeight: '500',
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