/**
 * WorkoutHistoryScreen - Unified Workout History Display
 * Shows HealthKit and Nostr workouts with posting controls
 * Integrates with WorkoutMergeService and WorkoutPublishingService
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { theme } from '../styles/theme';
import {
  WorkoutMergeService,
  type UnifiedWorkout,
  type WorkoutMergeResult,
} from '../services/fitness/workoutMergeService';
import { WorkoutPublishingService } from '../services/nostr/workoutPublishingService';
import { NostrWorkoutSyncService } from '../services/fitness/nostrWorkoutSyncService';
import { getNsecFromStorage } from '../utils/nostr';
import { WorkoutCacheService } from '../services/cache/WorkoutCacheService';
import { WorkoutGroupingService, type WorkoutGroup } from '../utils/workoutGrouping';
import healthKitService from '../services/fitness/healthKitService';

// UI Components
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingOverlay } from '../components/ui/LoadingStates';
import { SyncDropdown } from '../components/profile/shared/SyncDropdown';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Fitness Components
import { WorkoutSyncStatus } from '../components/fitness/WorkoutSyncStatus';
import { WorkoutActionButtons } from '../components/fitness/WorkoutActionButtons';
import { MonthlyWorkoutFolder } from '../components/fitness/MonthlyWorkoutFolder';
import { WorkoutStatsOverview } from '../components/fitness/WorkoutStatsOverview';
import { WorkoutCalendarHeatmap } from '../components/fitness/WorkoutCalendarHeatmap';

import type { WorkoutType } from '../types/workout';

interface WorkoutHistoryScreenProps {
  route?: {
    params?: {
      userId?: string;
      pubkey?: string;
    };
  };
}

type FilterType = 'all' | WorkoutType;
type SortOrder = 'newest' | 'oldest' | 'distance' | 'duration';
type ViewType = 'public' | 'all';

export const WorkoutHistoryScreen: React.FC<WorkoutHistoryScreenProps> = ({
  route,
}) => {
  const navigation = useNavigation();
  const userId = route?.params?.userId || '';
  const pubkey = route?.params?.pubkey || '';
  const [workouts, setWorkouts] = useState<UnifiedWorkout[]>([]);
  const [filteredWorkouts, setFilteredWorkouts] = useState<UnifiedWorkout[]>(
    []
  );
  const [workoutGroups, setWorkoutGroups] = useState<WorkoutGroup[]>([]);
  const [mergeResult, setMergeResult] = useState<WorkoutMergeResult | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [nsecKey, setNsecKey] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [viewType, setViewType] = useState<ViewType>('all');

  const cacheService = WorkoutCacheService.getInstance();
  const mergeService = WorkoutMergeService.getInstance();
  const publishingService = WorkoutPublishingService.getInstance();
  const syncService = NostrWorkoutSyncService.getInstance();

  useEffect(() => {
    initializeHealthKitAndLoadWorkouts();
    loadNsecKey();
  }, []);

  const initializeHealthKitAndLoadWorkouts = async () => {
    // Initialize HealthKit if available
    if (healthKitService.getStatus().available) {
      console.log('🍎 Initializing HealthKit on WorkoutHistoryScreen mount...');
      try {
        const initResult = await healthKitService.initialize();
        if (initResult.success) {
          console.log('✅ HealthKit initialized successfully');
        } else {
          console.log('⚠️ HealthKit initialization failed:', initResult.error);
        }
      } catch (error) {
        console.error('❌ HealthKit initialization error:', error);
      }
    } else {
      console.log('ℹ️ HealthKit not available on this device');
    }

    // Load workouts after initialization attempt
    await loadWorkouts();
  };

  useEffect(() => {
    applyFiltersAndSort();
  }, [workouts, selectedFilter, sortOrder]);

  useEffect(() => {
    // Group filtered workouts by month for folder UI
    const groups = WorkoutGroupingService.groupWorkoutsByMonth(filteredWorkouts);
    // Apply expanded state
    const groupsWithExpanded = groups.map(group => ({
      ...group,
      isExpanded: expandedGroups.has(group.key)
    }));
    setWorkoutGroups(groupsWithExpanded);
  }, [filteredWorkouts, expandedGroups]);

  const loadWorkouts = async (forceRefresh = false) => {
    try {
      console.log('📱 WorkoutHistoryScreen: Loading workouts...');
      console.log('📱 User ID:', userId?.slice(0, 20) + '...');
      console.log('📱 Pubkey:', pubkey?.slice(0, 20) + '...');
      console.log('📱 HealthKit Status:', healthKitService.getStatus());

      // Use cache service for initial load with proper userId and pubkey
      const result = forceRefresh
        ? await cacheService.refreshWorkouts(userId, pubkey, 500)
        : await cacheService.getMergedWorkouts(userId, pubkey, 500);

      console.log('📱 WorkoutHistoryScreen: Load complete');
      console.log(`  - Total workouts: ${result.allWorkouts.length}`);
      console.log(`  - HealthKit: ${result.healthKitCount}`);
      console.log(`  - Nostr: ${result.nostrCount}`);
      console.log(`  - Duplicates removed: ${result.duplicateCount}`);
      console.log(`  - From cache: ${result.fromCache}`);

      // Show warning if HealthKit available but no workouts found
      if (healthKitService.getStatus().available && result.healthKitCount === 0 && !forceRefresh) {
        console.log('⚠️ HealthKit is available but no workouts found. This could mean:');
        console.log('  1. No workouts in Apple Health for last 30 days');
        console.log('  2. HealthKit permissions not granted');
        console.log('  3. HealthKit query failed (check logs above for errors)');
      }

      setWorkouts(result.allWorkouts);
      setMergeResult(result);
    } catch (error) {
      console.error('❌ WorkoutHistoryScreen: Failed to load workouts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error details:', errorMessage);

      Alert.alert(
        'Workout Load Failed',
        `Could not load workout history: ${errorMessage}\n\nCheck Metro logs for details.`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
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

  const loadNsecKey = async () => {
    try {
      const nsec = await getNsecFromStorage(userId);
      setNsecKey(nsec);
    } catch (error) {
      console.error('Failed to load nsec key:', error);
      // Not critical - user can still view workouts
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await syncService.triggerManualSync(userId, pubkey);
      await loadWorkouts(true); // Force refresh from network
    } catch (error) {
      console.error('Sync failed:', error);
      Alert.alert('Sync Error', 'Failed to sync workouts. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  }, [userId, pubkey]);

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
        userId
      );

      if (result.success) {
        // Update cache with new status
        await cacheService.updateWorkoutStatus(workout.id, {
          syncedToNostr: true,
          nostrEventId: result.eventId,
        });
        // Refresh workouts to show updated status
        await loadWorkouts(true);
        Alert.alert('Success', 'Workout saved to Nostr successfully!');
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Save to Nostr failed:', error);
      throw error; // Re-throw to be handled by WorkoutActionButtons
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
        userId
      );

      if (result.success) {
        // Update cache with new status
        await cacheService.updateWorkoutStatus(workout.id, {
          postedToSocial: true,
          nostrEventId: result.eventId,
        });
        // Refresh workouts to show updated status
        await loadWorkouts(true);
        Alert.alert('Success', 'Workout posted to social feeds successfully!');
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Post to Nostr failed:', error);
      throw error; // Re-throw to be handled by WorkoutActionButtons
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...workouts];

    // Filter out invalid workout types
    filtered = filtered.filter((workout) =>
      workout.type && workout.type !== 'other'
    );

    // Apply view type filter (public vs all)
    if (viewType === 'public') {
      filtered = filtered.filter((workout) => workout.source === 'nostr');
    }

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
    const icons: Record<string, string> = {
      running: '🏃',
      cycling: '🚴',
      walking: '🚶',
      hiking: '🥾',
      gym: '💪',
      strength_training: '🏋️',
      yoga: '🧘',
    };
    return icons[type] || '';
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
      <SafeAreaView style={styles.container}>
        <LoadingOverlay message="Loading workouts..." visible={true} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Your Workouts</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Import Button and View Toggle */}
      <View style={styles.topControls}>
        <SyncDropdown
          userId={userId}
          onSyncComplete={() => loadWorkouts(true)}
        />
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewType === 'public' && styles.toggleButtonActive,
            ]}
            onPress={() => setViewType('public')}
          >
            <Text
              style={[
                styles.toggleButtonText,
                viewType === 'public' && styles.toggleButtonTextActive,
              ]}
            >
              Public
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewType === 'all' && styles.toggleButtonActive,
            ]}
            onPress={() => setViewType('all')}
          >
            <Text
              style={[
                styles.toggleButtonText,
                viewType === 'all' && styles.toggleButtonTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
        </View>
      </View>


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
      </View>

      {/* Grouped Workout List */}
      <ScrollView
        style={styles.workoutsContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.text}
          />
        }
        contentContainerStyle={styles.workoutsList}
      >
        {workoutGroups.length > 0 ? (
          workoutGroups.map(group => (
            <MonthlyWorkoutFolder
              key={group.key}
              group={group}
              isExpanded={expandedGroups.has(group.key)}
              onToggle={toggleGroup}
              renderWorkout={(workout) => renderWorkoutItem({ item: workout })}
            />
          ))
        ) : (
          <Card style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No workouts found</Text>
            <Text style={styles.emptyStateText}>
              {selectedFilter === 'all'
                ? 'Your workout history will appear here once synced'
                : `No ${selectedFilter} workouts found`}
            </Text>
            {selectedFilter === 'all' && (
              <Button title="Sync Now" onPress={handleRefresh} />
            )}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '600',
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.text,
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  toggleButtonTextActive: {
    color: theme.colors.background,
  },
  syncStatus: {
    margin: 16,
  },
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
  workoutsContainer: {
    flex: 1,
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
});

export default WorkoutHistoryScreen;
