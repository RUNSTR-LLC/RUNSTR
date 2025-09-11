/**
 * WorkoutsTab Component - Full Workout History Display
 * Shows unified HealthKit and Nostr workout history with posting controls
 * Integrates WorkoutHistoryScreen functionality directly in the Profile tab
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  FlatList,
  RefreshControl,
} from 'react-native';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { SyncSource, Workout } from '../../types';
import type { WorkoutType } from '../../types/workout';
import { Card } from '../ui/Card';
import { LoadingOverlay } from '../ui/LoadingStates';
import { HealthKitPermissionCard } from '../fitness/HealthKitPermissionCard';
import { HealthKitErrorBoundary } from '../fitness/HealthKitErrorBoundary';
import { WorkoutSyncStatus } from '../fitness/WorkoutSyncStatus';
import { WorkoutActionButtons } from '../fitness/WorkoutActionButtons';
import { PerformanceDashboard } from './PerformanceDashboard';
import {
  WorkoutMergeService,
  type UnifiedWorkout,
  type WorkoutMergeResult,
} from '../../services/fitness/workoutMergeService';
import { WorkoutPublishingService } from '../../services/nostr/workoutPublishingService';
import { NostrWorkoutSyncService } from '../../services/fitness/nostrWorkoutSyncService';
import { getNsecFromStorage } from '../../utils/nostr';
import healthKitService from '../../services/fitness/healthKitService';

interface WorkoutsTabProps {
  syncSources: SyncSource[];
  recentWorkouts: Workout[]; // Legacy prop - now ignored, we fetch real data
  currentUserId: string;
  currentUserPubkey?: string;
  currentUserTeamId?: string;
  onSyncSourcePress: (provider: string) => void;
  onWorkoutsSynced?: () => void;
}

type FilterType = 'all' | WorkoutType;
type SortOrder = 'newest' | 'oldest' | 'distance' | 'duration';

// Legacy SyncItem component removed - no longer needed in workout history view

export const WorkoutsTab: React.FC<WorkoutsTabProps> = ({
  syncSources,
  recentWorkouts, // Ignored - we fetch real data
  currentUserId,
  currentUserPubkey,
  currentUserTeamId,
  onSyncSourcePress,
  onWorkoutsSynced,
}) => {
  // Workout data state
  const [workouts, setWorkouts] = useState<UnifiedWorkout[]>([]);
  const [filteredWorkouts, setFilteredWorkouts] = useState<UnifiedWorkout[]>([]);
  const [mergeResult, setMergeResult] = useState<WorkoutMergeResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [nsecKey, setNsecKey] = useState<string | null>(null);
  
  // Load More functionality - progressive loading like HTML test
  const [hasMoreWorkouts, setHasMoreWorkouts] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [oldestTimestamp, setOldestTimestamp] = useState<number | null>(null);
  
  // OPTIMIZATION: Tab state persistence
  const [tabDataLoaded, setTabDataLoaded] = useState(false);
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);

  // HealthKit state
  const [healthKitStats, setHealthKitStats] = useState<{
    available: boolean;
    authorized: boolean;
    totalWorkouts: number;
  }>({
    available: false,
    authorized: false,
    totalWorkouts: 0,
  });

  // Services
  const mergeService = WorkoutMergeService.getInstance();
  const publishingService = WorkoutPublishingService.getInstance();
  const syncService = NostrWorkoutSyncService.getInstance();

  useEffect(() => {
    checkHealthKitStatus();
    loadWorkoutsOptimized();
    loadNsecKey();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [workouts, selectedFilter, sortOrder]);

  const checkHealthKitStatus = async () => {
    const status = healthKitService.getStatus();
    const stats = status.authorized
      ? await healthKitService.getSyncStats(currentUserId)
      : { totalHealthKitWorkouts: 0 };

    setHealthKitStats({
      available: status.available,
      authorized: status.authorized,
      totalWorkouts: stats.totalHealthKitWorkouts,
    });
  };

  const handleHealthKitPermissionGranted = async (stats: {
    newWorkouts: number;
    totalWorkouts: number;
  }) => {
    console.log('HealthKit permission granted:', stats);

    // Update local stats
    setHealthKitStats((prev) => ({
      ...prev,
      authorized: true,
      totalWorkouts: prev.totalWorkouts + stats.newWorkouts,
    }));

    // Notify parent component to refresh workout data
    onWorkoutsSynced?.();

    // Update sync sources to show HealthKit as connected
    const healthKitSource = syncSources.find((s) => s.provider === 'healthkit');
    if (healthKitSource) {
      healthKitSource.isConnected = true;
    }
  };

  const handleSyncSourcePress = async (provider: string) => {
    if (provider === 'healthkit') {
      if (!healthKitService.getStatus().available) {
        Alert.alert(
          'Not Available',
          'Apple Health is not available on this device.',
          [{ text: 'OK' }]
        );
        return;
      }

      // HealthKit permission is handled by the HealthKitPermissionCard
      return;
    }

    // Handle other sync sources
    onSyncSourcePress(provider);
  };

  // OPTIMIZED: Workout loading with tab state persistence
  const loadWorkoutsOptimized = async () => {
    const CACHE_VALIDITY_MS = 5 * 60 * 1000; // 5 minutes
    const currentTime = Date.now();
    
    // OPTIMIZATION: Don't re-query if data is fresh and we've loaded before
    if (tabDataLoaded && (currentTime - lastLoadTime) < CACHE_VALIDITY_MS) {
      console.log('⚡ Tab data is fresh, skipping query (tab state persistence)');
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔄 Loading workouts with optimizations...');
      const startTime = Date.now();
      
      const result = await mergeService.getMergedWorkouts(currentUserId, currentUserPubkey);
      
      setWorkouts(result.allWorkouts);
      setMergeResult(result);
      setTabDataLoaded(true);
      setLastLoadTime(currentTime);
      
      // Track oldest timestamp for Load More functionality
      if (result.allWorkouts.length > 0) {
        const timestamps = result.allWorkouts.map(w => new Date(w.startTime).getTime() / 1000);
        const oldest = Math.min(...timestamps);
        setOldestTimestamp(oldest);
        
        // IMPROVED: Show Load More if we hit the query limit OR have reasonable data (suggests more available)
        const hitQueryLimit = result.allWorkouts.length >= 100; // If we hit limit, likely more available
        const hasReasonableData = result.allWorkouts.length >= 5; // Lower threshold from 20 to 5
        const dataSpansTime = result.allWorkouts.length >= 2; // Even with few workouts, might have historical
        
        setHasMoreWorkouts(hitQueryLimit || hasReasonableData || dataSpansTime);
        
        console.log(`📊 Load More status: oldest=${new Date(oldest * 1000).toLocaleDateString()}, hasMore=${hitQueryLimit || hasReasonableData || dataSpansTime}`);
        console.log(`   Reasons: hitLimit=${hitQueryLimit}, reasonable=${hasReasonableData}, spans=${dataSpansTime}`);
      } else {
        // Even with no workouts, show Load More with explanatory message
        setHasMoreWorkouts(true);
        console.log('📊 No workouts found - still showing Load More for historical search');
      }
      
      const loadDuration = Date.now() - startTime;
      console.log(`✅ Workouts loaded: ${result.allWorkouts.length} total, ${loadDuration}ms, fromCache: ${result.fromCache}`);
      
    } catch (error) {
      console.error('Failed to load optimized workouts:', error);
      // Don't show alert - this is in a tab, keep it silent
    } finally {
      setIsLoading(false);
    }
  };

  // Load More functionality - fetch older workouts progressively
  const loadMoreWorkouts = async () => {
    if (isLoadingMore || !hasMoreWorkouts || !oldestTimestamp || !currentUserPubkey) {
      console.log('⚠️ Load More skipped:', { isLoadingMore, hasMoreWorkouts, hasTimestamp: !!oldestTimestamp, hasPubkey: !!currentUserPubkey });
      return;
    }

    setIsLoadingMore(true);
    
    try {
      console.log(`🔄 Loading more workouts older than: ${new Date(oldestTimestamp * 1000).toLocaleDateString()}`);
      
      // Get older workouts using the oldest timestamp as the "until" parameter
      const result = await mergeService.getMergedWorkoutsWithPagination(
        currentUserId, 
        currentUserPubkey, 
        oldestTimestamp
      );
      
      if (result.allWorkouts.length > 0) {
        // Append new older workouts to existing list
        const updatedWorkouts = [...workouts, ...result.allWorkouts];
        setWorkouts(updatedWorkouts);
        setMergeResult({
          ...result,
          allWorkouts: updatedWorkouts,
          healthKitCount: (mergeResult?.healthKitCount || 0) + result.healthKitCount,
          nostrCount: (mergeResult?.nostrCount || 0) + result.nostrCount,
          duplicateCount: (mergeResult?.duplicateCount || 0) + result.duplicateCount,
        });
        
        // Update oldest timestamp for next load more
        const timestamps = result.allWorkouts.map(w => new Date(w.startTime).getTime() / 1000);
        const newOldest = Math.min(...timestamps);
        setOldestTimestamp(newOldest);
        
        // Determine if there are still more workouts to load
        // If we got fewer than expected, probably reached the end
        setHasMoreWorkouts(result.allWorkouts.length >= 10);
        
        console.log(`✅ Loaded ${result.allWorkouts.length} more workouts, new oldest: ${new Date(newOldest * 1000).toLocaleDateString()}, hasMore: ${result.allWorkouts.length >= 10}`);
      } else {
        // No more workouts found
        setHasMoreWorkouts(false);
        console.log('📭 No more workouts found - reached the end');
      }
    } catch (error) {
      console.error('❌ Load More failed:', error);
      // Don't show alert - this is background loading
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Legacy function kept for compatibility
  const loadWorkouts = loadWorkoutsOptimized;

  const loadNsecKey = async () => {
    try {
      const nsec = await getNsecFromStorage(currentUserId);
      setNsecKey(nsec);
    } catch (error) {
      console.error('Failed to load nsec key:', error);
      // Not critical - user can still view workouts
    }
  };

  // OPTIMIZED: Refresh with cache clearing for pull-to-refresh
  const handleRefresh = useCallback(async () => {
    if (!currentUserPubkey) {
      console.warn('No pubkey available for optimized refresh');
      return;
    }

    setIsRefreshing(true);
    try {
      console.log('🔄 Force refresh: clearing cache and fetching fresh data...');
      
      // Use the optimized force refresh method
      const result = await mergeService.forceRefreshWorkouts(currentUserId, currentUserPubkey);
      
      setWorkouts(result.allWorkouts);
      setMergeResult(result);
      setTabDataLoaded(true);
      setLastLoadTime(Date.now());
      
      console.log(`✅ Force refresh completed: ${result.allWorkouts.length} workouts, duration: ${result.loadDuration}ms`);
      onWorkoutsSynced?.();
    } catch (error) {
      console.error('❌ Optimized refresh failed:', error);
      // Silent fail in tab context
    } finally {
      setIsRefreshing(false);
    }
  }, [currentUserId, currentUserPubkey]);

  const handleSaveToNostr = async (workout: UnifiedWorkout) => {
    if (!nsecKey) {
      Alert.alert(
        'Authentication Required',
        'Please log in with your Nostr key to save workouts.'
      );
      return;
    }

    try {
      const result = await publishingService.saveWorkoutToNostr(
        workout,
        nsecKey,
        currentUserId
      );

      if (result.success) {
        await loadWorkouts();
        Alert.alert('Success', 'Workout saved to Nostr successfully!');
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Save to Nostr failed:', error);
      Alert.alert('Error', 'Failed to save workout to Nostr');
    }
  };

  const handlePostToNostr = async (workout: UnifiedWorkout) => {
    if (!nsecKey) {
      Alert.alert(
        'Authentication Required',
        'Please log in with your Nostr key to post workouts.'
      );
      return;
    }

    try {
      const result = await publishingService.postWorkoutToSocial(
        workout,
        nsecKey,
        currentUserId
      );

      if (result.success) {
        await loadWorkouts();
        Alert.alert('Success', 'Workout posted to social feeds successfully!');
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Post to Nostr failed:', error);
      Alert.alert('Error', 'Failed to post workout to social feeds');
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...workouts];

    // Apply activity type filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter((workout) => workout.type === selectedFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return (
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          );
        case 'oldest':
          return (
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          );
        case 'distance':
          return (b.distance || 0) - (a.distance || 0);
        case 'duration':
          return b.duration - a.duration;
        default:
          return 0;
      }
    });

    setFilteredWorkouts(filtered);
  };

  // Utility functions
  const formatDistance = (meters?: number): string =>
    !meters
      ? '--'
      : meters < 1000
      ? `${meters}m`
      : `${(meters / 1000).toFixed(2)}km`;

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    const diffDays = Math.floor(
      (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24)
    );
    return diffDays === 0
      ? 'Today'
      : diffDays === 1
      ? 'Yesterday'
      : diffDays < 7
      ? `${diffDays} days ago`
      : new Date(dateString).toLocaleDateString();
  };

  const getActivityIcon = (type: WorkoutType): string => {
    const icons = {
      running: '🏃',
      cycling: '🚴',
      walking: '🚶',
      hiking: '🥾',
      gym: '💪',
      strength_training: '🏋️',
      yoga: '🧘',
      other: '⚡',
    };
    return icons[type] || '⚡';
  };

  const renderWorkoutItem = ({ item: workout }: { item: UnifiedWorkout }) => (
    <Card style={styles.workoutCard}>
      <View style={styles.workoutHeader}>
        <View style={styles.workoutInfo}>
          <Text style={styles.activityIcon}>
            {getActivityIcon(workout.type)}
          </Text>
          <View style={styles.workoutInfoText}>
            <Text style={styles.activityType}>
              {workout.type.charAt(0).toUpperCase() + workout.type.slice(1)}
            </Text>
            <Text style={styles.workoutDate}>
              {formatDate(workout.startTime)}
            </Text>
          </View>
        </View>
        <View style={styles.workoutMeta}>
          {(workout.sourceApp || workout.metadata?.sourceApp) && (
            <Text style={styles.sourceApp}>
              {workout.sourceApp ||
                workout.metadata?.sourceApp ||
                workout.source}
            </Text>
          )}
          <Text style={styles.sourceType}>{workout.source}</Text>
        </View>
      </View>

      <View style={styles.workoutStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {formatDuration(workout.duration)}
          </Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        {workout.distance && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatDistance(workout.distance)}
            </Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
        )}
        {workout.calories && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{workout.calories.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
        )}
        {workout.heartRate?.avg && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {workout.heartRate.avg.toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>HR</Text>
          </View>
        )}
      </View>

      {/* Action buttons for posting */}
      <WorkoutActionButtons
        workout={workout}
        onSaveToNostr={handleSaveToNostr}
        onPostToNostr={handlePostToNostr}
        compact={true}
      />
    </Card>
  );

  const renderFilterButton = (filter: FilterType, label: string) => (
    <TouchableOpacity
      key={filter}
      style={[
        styles.filterButton,
        selectedFilter === filter && styles.filterButtonActive,
      ]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Text
        style={[
          styles.filterButtonText,
          selectedFilter === filter && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingOverlay message="Loading workouts..." visible={true} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fixed header content */}
      <View>
        {/* Sync Status - Hidden for now */}
        {/* {currentUserPubkey && (
          <WorkoutSyncStatus
            userId={currentUserId}
            pubkey={currentUserPubkey}
            onManualSync={handleRefresh}
            style={styles.syncStatus}
          />
        )} */}

        {/* Apple Health Integration */}
        {healthKitService.getStatus().available && (
          <HealthKitErrorBoundary 
            fallbackMessage="Apple Health sync is temporarily unavailable. Your workouts can still be posted manually."
            onRetry={() => {
              // Trigger a re-render by updating HealthKit status
              checkHealthKitStatus();
            }}
          >
            <HealthKitPermissionCard
              userId={currentUserId}
              teamId={currentUserTeamId}
              onPermissionGranted={handleHealthKitPermissionGranted}
              onPermissionDenied={(error) => {
                console.error('HealthKit permission denied:', error);
              }}
              showStats={true}
            />
          </HealthKitErrorBoundary>
        )}

        {/* Performance Dashboard - Replaces basic stats */}
        {mergeResult && (
          <PerformanceDashboard 
            mergeResult={mergeResult} 
            isLoading={isLoading}
          />
        )}

        {/* Filters & Sort */}
        <View style={styles.controlsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
          >
            {[
              ['all', 'All'],
              ['running', 'Running'],
              ['cycling', 'Cycling'],
              ['walking', 'Walking'],
              ['gym', 'Gym'],
              ['yoga', 'Yoga'],
            ].map(([filter, label]) =>
              renderFilterButton(filter as FilterType, label)
            )}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.sortScroll}
          >
            {[
              ['newest', 'Newest'],
              ['oldest', 'Oldest'],
              ['distance', 'Distance'],
              ['duration', 'Duration'],
            ].map(([sort, label]) => (
              <TouchableOpacity
                key={sort}
                style={[
                  styles.sortButton,
                  sortOrder === sort && styles.sortButtonActive,
                ]}
                onPress={() => setSortOrder(sort as SortOrder)}
              >
                <Text style={styles.sortButtonText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Workout List - Now properly isolated */}
      <FlatList
        data={filteredWorkouts}
        renderItem={renderWorkoutItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.workoutsList}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.text}
          />
        }
        ListEmptyComponent={
          <Card style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No workouts found</Text>
            <Text style={styles.emptyStateText}>
              {selectedFilter === 'all'
                ? 'Pull down to sync your Nostr workouts'
                : `No ${selectedFilter} workouts found`}
            </Text>
            {currentUserPubkey && (
              <TouchableOpacity style={styles.syncButton} onPress={handleRefresh}>
                <Text style={styles.syncButtonText}>Sync Now</Text>
              </TouchableOpacity>
            )}
          </Card>
        }
        ListFooterComponent={
          hasMoreWorkouts ? (
            <View style={styles.loadMoreContainer}>
              <TouchableOpacity
                style={[styles.loadMoreButton, isLoadingMore && styles.loadMoreButtonDisabled]}
                onPress={loadMoreWorkouts}
                disabled={isLoadingMore}
              >
                <Text style={styles.loadMoreText}>
                  {isLoadingMore ? 'Searching historical workouts...' : 'Load Historical Workouts'}
                </Text>
                {!isLoadingMore && (
                  <MaterialIcons 
                    name="keyboard-arrow-down" 
                    size={20} 
                    color={theme.colors.accent} 
                    style={styles.loadMoreIcon}
                  />
                )}
              </TouchableOpacity>
              <Text style={styles.loadMoreHint}>
                {oldestTimestamp 
                  ? `Showing 2 years of workouts since ${new Date(oldestTimestamp * 1000).toLocaleDateString()}`
                  : `Search your complete workout history • Tap to load older workouts`}
              </Text>
              {workouts.length === 0 && (
                <Text style={styles.dataRangeHint}>
                  🔍 No workouts found in recent period • Try loading historical data
                </Text>
              )}
            </View>
          ) : null
        }
        style={styles.flatList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  syncStatus: {
    margin: 16,
  },
  
  // Removed old stats styles - now using PerformanceDashboard component
  
  controlsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  
  filtersScroll: {
    marginBottom: 8,
  },
  
  sortScroll: {
    marginBottom: 0,
  },
  
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  
  filterButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  
  filterButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  
  filterButtonTextActive: {
    color: theme.colors.accentText,
    fontWeight: '600',
  },
  
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.buttonBorder,
  },
  
  sortButtonActive: {
    backgroundColor: theme.colors.buttonHover,
  },
  
  sortButtonText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  
  workoutsList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  
  workoutCard: {
    padding: 16,
    marginBottom: 12,
  },
  
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  workoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  workoutInfoText: {
    flex: 1,
  },
  
  workoutMeta: {
    alignItems: 'flex-end',
  },
  
  activityIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  
  activityType: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  
  workoutDate: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  
  sourceApp: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  
  sourceType: {
    color: theme.colors.textDark,
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  
  workoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  
  statValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
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
    marginBottom: 24,
  },
  
  syncButton: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  
  syncButtonText: {
    color: theme.colors.accentText,
    fontSize: 14,
    fontWeight: '600',
  },
  
  flatList: {
    flex: 1,
  },
  
  loadMoreContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    marginBottom: 8,
  },
  
  loadMoreButtonDisabled: {
    backgroundColor: theme.colors.border,
    borderColor: theme.colors.border,
  },
  
  loadMoreText: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  
  loadMoreIcon: {
    marginLeft: 4,
  },
  
  loadMoreHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  
  dataRangeHint: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
