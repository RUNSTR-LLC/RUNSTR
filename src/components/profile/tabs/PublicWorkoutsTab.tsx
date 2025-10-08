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
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../../styles/theme';
import { Card } from '../../ui/Card';
import { LoadingOverlay } from '../../ui/LoadingStates';
import { EnhancedWorkoutCard } from '../shared/EnhancedWorkoutCard';
import { MonthlyWorkoutGroup, groupWorkoutsByMonth } from '../shared/MonthlyWorkoutGroup';
import { WorkoutLevelRing } from '../WorkoutLevelRing';
import { Nuclear1301Service } from '../../../services/fitness/Nuclear1301Service';
import unifiedCache from '../../../services/cache/UnifiedNostrCache';
import { CacheKeys, CacheTTL } from '../../../constants/cacheTTL';
import type { NostrWorkout } from '../../../types/nostrWorkout';
import type { UnifiedWorkout } from '../../../services/fitness/workoutMergeService';
import type { Workout } from '../../../types/workout';
import { Ionicons } from '@expo/vector-icons';

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
  const navigation = useNavigation();
  const [workouts, setWorkouts] = useState<NostrWorkout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  const nuclear1301Service = Nuclear1301Service.getInstance();

  useEffect(() => {
    loadNostrWorkouts();
  }, [pubkey]);

  // ✅ SMART REFRESH: Auto-refresh stale cache when user navigates to this screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!pubkey) return;

      // Check if we have cached workouts
      const cached = unifiedCache.getCached<NostrWorkout[]>(CacheKeys.USER_WORKOUTS(pubkey));
      if (cached && cached.length > 0) {
        console.log('✅ Cache is fresh, using cached workouts');
        // Note: Cache age checking would require cacheMetadata which isn't exposed
        // For now, rely on user's manual pull-to-refresh if they want fresh data
      } else {
        console.log('📡 No cache found, loading workouts on navigation focus...');
        loadNostrWorkouts(false);
      }
    });

    return unsubscribe;
  }, [navigation, pubkey]);

  const loadNostrWorkouts = async (forceRefresh: boolean = false) => {
    try {
      setIsLoading(!forceRefresh); // Don't show loading spinner on refresh
      console.log('⚡ Loading public Nostr workouts for pubkey:', pubkey);

      if (!pubkey) {
        console.log('No pubkey available, skipping Nostr workout load');
        setWorkouts([]);
        setIsLoading(false);
        return;
      }

      let nostrWorkouts: NostrWorkout[] = [];
      let cacheHit = false;

      // Cache-first approach (unless force refresh)
      if (!forceRefresh) {
        const cached = unifiedCache.getCached<NostrWorkout[]>(CacheKeys.USER_WORKOUTS(pubkey));
        if (cached && cached.length > 0) {
          console.log(`📦 Cache hit: ${cached.length} workouts (instant display from prefetch)`);
          nostrWorkouts = cached;
          cacheHit = true;
          setFromCache(true);
        }
      }

      // Fetch from Nostr if no cache or force refresh
      if (!cacheHit || forceRefresh) {
        console.log('📡 Fetching from Nostr relays...');
        nostrWorkouts = await nuclear1301Service.getUserWorkouts(pubkey);
        console.log(`✅ Received ${nostrWorkouts?.length || 0} workouts from Nostr`);

        // Update cache (ttl is 30 minutes via CacheTTL constant)
        await unifiedCache.set(
          CacheKeys.USER_WORKOUTS(pubkey),
          nostrWorkouts,
          CacheTTL.USER_WORKOUTS
        );
        setFromCache(false);
      }

      if (!nostrWorkouts || nostrWorkouts.length === 0) {
        console.log('⚠️ No workouts returned from Nuclear1301Service');
        setWorkouts([]);
        return;
      }

      // Filter out invalid workouts and sort by date
      const validWorkouts = nostrWorkouts
        .filter((w: NostrWorkout) => {
          const isValid = w.type && w.type !== 'other';
          if (!isValid) {
            console.log(`Filtering out workout with type: ${w.type}`);
          }
          return isValid;
        })
        .sort((a: NostrWorkout, b: NostrWorkout) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

      setWorkouts(validWorkouts);
      console.log(`✅ Loaded ${validWorkouts.length} valid public Nostr workouts`);
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
      // Invalidate cache
      if (pubkey) {
        await unifiedCache.invalidate(CacheKeys.USER_WORKOUTS(pubkey));
      }
      await loadNostrWorkouts(true); // Force refresh from Nostr
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
          <>
            {/* Workout Level Ring */}
            {pubkey && workouts.length > 0 && (
              <WorkoutLevelRing workouts={workouts} pubkey={pubkey} />
            )}
          </>
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
  cacheIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: theme.colors.success + '15',
    gap: 6,
  },
  cacheText: {
    fontSize: 11,
    color: theme.colors.success,
    fontWeight: theme.typography.weights.medium,
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