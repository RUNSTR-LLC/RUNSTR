/**
 * Enhanced Workout History Screen - Unified Workout History with Auto-Entry Integration
 * Shows HealthKit and Nostr workouts with posting controls AND event auto-entry suggestions
 * Integrates Phase 4 auto-entry system with existing workout posting flow
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  FlatList,
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

// UI Components
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingOverlay } from '../components/ui/LoadingStates';
import { BottomNavigation } from '../components/ui/BottomNavigation';

// Fitness Components
import { WorkoutSyncStatus } from '../components/fitness/WorkoutSyncStatus';
import { WorkoutActionButtons } from '../components/fitness/WorkoutActionButtons';

// Phase 4: Auto-Entry Integration
import { AutoEntryPrompt } from '../components/competition/AutoEntryPrompt';
import { useAutoEventEntry } from '../hooks/useAutoEventEntry';
import type { EventAutoEntryResult } from '../services/competition/eventEligibilityService';

import type { WorkoutType } from '../types/workout';
import type { NostrWorkout } from '../types/nostrWorkout';

interface EnhancedWorkoutHistoryScreenProps {
  userId: string;
  pubkey: string;
  onNavigateBack: () => void;
  onNavigateToTeam: () => void;
}

type FilterType = 'all' | WorkoutType;
type SortOrder = 'newest' | 'oldest' | 'distance' | 'duration';

const ITEMS_PER_PAGE = 20;

export const EnhancedWorkoutHistoryScreen: React.FC<EnhancedWorkoutHistoryScreenProps> = ({
  userId,
  pubkey,
  onNavigateBack,
  onNavigateToTeam,
}) => {
  // State management
  const [mergeResult, setMergeResult] = useState<WorkoutMergeResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all');
  const [currentSort, setCurrentSort] = useState<SortOrder>('newest');
  const [displayedWorkouts, setDisplayedWorkouts] = useState<UnifiedWorkout[]>([]);
  const [loadedItems, setLoadedItems] = useState(ITEMS_PER_PAGE);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Phase 4: Auto-Entry Integration
  const {
    isCheckingEligibility,
    eligibilityResult,
    suggestedEvents,
    showAutoEntryPrompt,
    checkWorkoutEligibility,
    showEventSuggestions,
    hideEventSuggestions,
    enterWorkoutInEvent,
    skipEventSuggestions,
    hasEligibleEvents,
    totalEligibleEvents,
  } = useAutoEventEntry({
    autoCheck: false, // Manual trigger for better UX
    showPromptDelay: 500,
    enableNotifications: true,
  });

  // Get user teams for auto-entry
  const [userTeams, setUserTeams] = useState<string[]>([]);
  const [userPrivateKey, setUserPrivateKey] = useState<string>('');

  // Load initial data
  useEffect(() => {
    loadWorkoutHistory();
    loadUserCredentials();
  }, [userId, pubkey]);

  const loadUserCredentials = async () => {
    try {
      const nsec = await getNsecFromStorage(userId);
      if (nsec) {
        setUserPrivateKey(nsec);
      }
      
      // Load user teams (you'll need to implement this based on your team service)
      // const teams = await getUserTeams(userId);
      // setUserTeams(teams.map(team => team.id));
      setUserTeams([]); // Placeholder - implement with your team service
    } catch (error) {
      console.error('❌ Failed to load user credentials:', error);
    }
  };

  const loadWorkoutHistory = async (forceRefresh: boolean = false) => {
    setIsLoading(true);
    setSyncStatus('syncing');
    setFetchError(null);

    try {
      console.log('🔄 Loading workout history for pubkey:', pubkey.slice(0, 20) + '...');

      // CACHE-FIRST APPROACH: Load from cache immediately, then refresh from Nostr
      if (!forceRefresh) {
        // Try to load from cache first for instant display
        console.log('📦 Checking cache for instant display...');
        // Cache check happens inside getMergedWorkouts(), so we'll get cached data first
      }

      // CRITICAL FIX: Use correct method with pubkey (not userId)
      // WorkoutMergeService.getMergedWorkouts() is the actual method
      const result = await WorkoutMergeService.getMergedWorkouts(pubkey);

      // Update state with fetched workouts
      setMergeResult(result);
      applyFiltersAndSort(result.allWorkouts, currentFilter, currentSort);
      setSyncStatus('success');
      setLastSyncTime(new Date());

      console.log(`✅ Loaded ${result.allWorkouts.length} workouts (${result.nostrCount} from Nostr, ${result.healthKitCount} from HealthKit, ${result.localCount} local)`);
      console.log(`   📊 Cache hit: ${result.fromCache ? 'Yes' : 'No'}, Duration: ${result.loadDuration}ms`);

    } catch (error) {
      console.error('❌ Failed to load workout history:', error);
      setSyncStatus('error');

      // Set user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setFetchError(errorMessage);

      // Show alert only on initial load failure (not on pull-to-refresh)
      if (!forceRefresh) {
        Alert.alert(
          'Loading Error',
          `Failed to load workouts: ${errorMessage}\n\nPlease check your internet connection and try again.`,
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setFetchError(null); // Clear previous errors

    try {
      // Force refresh from Nostr (bypass cache)
      await loadWorkoutHistory(true);
    } catch (error) {
      console.error('❌ Pull-to-refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const applyFiltersAndSort = (workouts: UnifiedWorkout[], filter: FilterType, sort: SortOrder) => {
    let filtered = [...workouts];

    // Apply filter
    if (filter !== 'all') {
      filtered = filtered.filter(workout => workout.type === filter);
    }

    // Apply sort
    switch (sort) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        break;
      case 'distance':
        filtered.sort((a, b) => (b.distance || 0) - (a.distance || 0));
        break;
      case 'duration':
        filtered.sort((a, b) => (b.duration || 0) - (a.duration || 0));
        break;
    }

    setDisplayedWorkouts(filtered);
    setLoadedItems(ITEMS_PER_PAGE);
  };

  const handleFilterChange = (filter: FilterType) => {
    setCurrentFilter(filter);
    if (mergeResult) {
      applyFiltersAndSort(mergeResult.mergedWorkouts, filter, currentSort);
    }
  };

  const handleSortChange = (sort: SortOrder) => {
    setCurrentSort(sort);
    if (mergeResult) {
      applyFiltersAndSort(mergeResult.mergedWorkouts, currentFilter, sort);
    }
  };

  // Phase 4: Enhanced workout interaction with auto-entry
  const handleWorkoutPress = async (workout: UnifiedWorkout) => {
    console.log(`👆 Workout pressed: ${workout.type} - ${workout.source}`);
    
    // Convert to NostrWorkout format for eligibility check
    const nostrWorkout: NostrWorkout = {
      nostrEventId: workout.id,
      type: workout.type,
      duration: workout.duration || 0,
      distance: workout.distance || 0,
      calories: workout.calories || 0,
      startTime: workout.startTime,
      heartRate: workout.averageHeartRate,
      route: [], // Would need GPS data if available
      source: 'converted',
      rawEvent: null,
    };

    // Check for eligible events
    if (userTeams.length > 0) {
      console.log('🔍 Checking workout eligibility for events...');
      await checkWorkoutEligibility(nostrWorkout);
    } else {
      console.log('⚠️ No teams available for event suggestions');
    }
  };

  // Phase 4: Handle auto-entry results
  const handleAutoEntryComplete = (result: EventAutoEntryResult) => {
    console.log('✅ Auto-entry complete:', result);
    
    // Show success feedback
    if (result.success) {
      Alert.alert(
        '🎉 Event Entry Complete!',
        result.requiresApproval 
          ? 'Your entry is pending captain approval.'
          : 'You\'re now competing in the event!',
        [{ text: 'Great!' }]
      );
    }
    
    // Hide the prompt
    hideEventSuggestions();
    
    // Could refresh workout data or update UI state here
  };

  const loadMoreItems = () => {
    setLoadedItems(prev => Math.min(prev + ITEMS_PER_PAGE, displayedWorkouts.length));
  };

  const getFilterOptions = (): { label: string; value: FilterType }[] => [
    { label: 'All', value: 'all' },
    { label: 'Running', value: 'running' },
    { label: 'Cycling', value: 'cycling' },
    { label: 'Walking', value: 'walking' },
    { label: 'Gym', value: 'gym' },
    { label: 'Other', value: 'other' },
  ];

  const getSortOptions = (): { label: string; value: SortOrder }[] => [
    { label: 'Newest', value: 'newest' },
    { label: 'Oldest', value: 'oldest' },
    { label: 'Distance', value: 'distance' },
    { label: 'Duration', value: 'duration' },
  ];

  const renderWorkoutItem = ({ item, index }: { item: UnifiedWorkout; index: number }) => {
    const isFromNostr = item.source === 'nostr';
    const hasEventSuggestions = hasEligibleEvents && eligibilityResult?.workout?.nostrEventId === item.id;
    
    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.workoutCard,
          hasEventSuggestions && styles.workoutCardWithSuggestions
        ]}
        onPress={() => handleWorkoutPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.workoutCardContent}>
          {/* Workout Header */}
          <View style={styles.workoutHeader}>
            <View style={styles.workoutTitleRow}>
              <Text style={styles.workoutType}>{item.type}</Text>
              <View style={styles.workoutBadges}>
                {isFromNostr && (
                  <View style={styles.nostrBadge}>
                    <Text style={styles.nostrBadgeText}>Nostr</Text>
                  </View>
                )}
                {hasEventSuggestions && (
                  <View style={styles.eventSuggestionsBadge}>
                    <Text style={styles.eventSuggestionsBadgeText}>
                      {totalEligibleEvents} event{totalEligibleEvents !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            
            <Text style={styles.workoutDate}>
              {new Date(item.startTime).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>

          {/* Workout Metrics */}
          <View style={styles.workoutMetrics}>
            {item.duration && (
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{item.duration}</Text>
                <Text style={styles.metricLabel}>min</Text>
              </View>
            )}
            
            {item.distance && (
              <View style={styles.metric}>
                <Text style={styles.metricValue}>
                  {(item.distance / 1000).toFixed(1)}
                </Text>
                <Text style={styles.metricLabel}>km</Text>
              </View>
            )}
            
            {item.calories && (
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{item.calories}</Text>
                <Text style={styles.metricLabel}>cal</Text>
              </View>
            )}
          </View>

          {/* Phase 4: Event suggestions preview */}
          {hasEventSuggestions && (
            <View style={styles.eventSuggestionsPreview}>
              <Text style={styles.eventSuggestionsText}>
                💡 {totalEligibleEvents} eligible event{totalEligibleEvents !== 1 ? 's' : ''} found - Tap to view
              </Text>
            </View>
          )}

          {/* Workout Action Buttons */}
          <WorkoutActionButtons
            workout={item}
            userId={userId}
            style={styles.workoutActions}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterBar = () => (
    <View style={styles.filterBar}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
      >
        {getFilterOptions().map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.filterOption,
              currentFilter === option.value && styles.filterOptionActive,
            ]}
            onPress={() => handleFilterChange(option.value)}
          >
            <Text
              style={[
                styles.filterOptionText,
                currentFilter === option.value && styles.filterOptionTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.sortButton}
        onPress={() => {
          const options = getSortOptions();
          const currentIndex = options.findIndex(opt => opt.value === currentSort);
          const nextIndex = (currentIndex + 1) % options.length;
          handleSortChange(options[nextIndex].value);
        }}
      >
        <Text style={styles.sortButtonText}>
          Sort: {getSortOptions().find(opt => opt.value === currentSort)?.label}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingOverlay message="Loading workout history..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onNavigateBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
        <View style={styles.headerSpacer} />
      </View>

      {/* Sync Status */}
      <WorkoutSyncStatus status={syncStatus} style={styles.syncStatus} />

      {/* Filter Bar */}
      {renderFilterBar()}

      {/* Workouts List */}
      <FlatList
        data={displayedWorkouts.slice(0, loadedItems)}
        renderItem={renderWorkoutItem}
        keyExtractor={(item) => item.id}
        style={styles.workoutsList}
        contentContainerStyle={styles.workoutsListContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
        }
        onEndReached={loadMoreItems}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>
              {fetchError ? '⚠️ Loading Failed' : 'No Workouts Found'}
            </Text>
            <Text style={styles.emptyStateMessage}>
              {fetchError
                ? `Error: ${fetchError}\n\nPull down to retry or check your internet connection.`
                : 'Complete your first workout or sync from HealthKit to get started.\n\nPull down to refresh from Nostr.'
              }
            </Text>
            {lastSyncTime && !fetchError && (
              <Text style={styles.emptySyncInfo}>
                Last synced: {lastSyncTime.toLocaleTimeString()}
              </Text>
            )}
            {mergeResult && !fetchError && (
              <Text style={styles.emptySyncInfo}>
                {mergeResult.fromCache
                  ? `📦 Loaded from cache (${mergeResult.cacheAge ? Math.round(mergeResult.cacheAge / 1000 / 60) + 'm ago' : 'recent'})`
                  : '🌐 Fresh from Nostr'
                }
              </Text>
            )}
          </View>
        }
      />

      {/* Phase 4: Auto-Entry Prompt */}
      {eligibilityResult?.workout && (
        <AutoEntryPrompt
          visible={showAutoEntryPrompt}
          workout={eligibilityResult.workout}
          userTeams={userTeams}
          userPrivateKey={userPrivateKey}
          onClose={hideEventSuggestions}
          onEntryComplete={handleAutoEntryComplete}
          onSkip={skipEventSuggestions}
        />
      )}

      {/* Bottom Navigation */}
      <BottomNavigation
        activeScreen="profile"
        onNavigateToTeam={onNavigateToTeam}
        onNavigateToProfile={() => {}} // Already on profile section
      />
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
    padding: 16,
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  backButton: {
    padding: 8,
  },

  backButtonText: {
    fontSize: 24,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
  },

  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    textAlign: 'center',
    marginRight: 32, // Balance the back button
  },

  headerSpacer: {
    width: 32,
  },

  syncStatus: {
    marginBottom: 8,
  },

  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 16,
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  filterScroll: {
    flex: 1,
    marginRight: 12,
  },

  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
  },

  filterOptionActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },

  filterOptionText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  filterOptionTextActive: {
    color: theme.colors.accentText,
  },

  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
  },

  sortButtonText: {
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
  },

  workoutsList: {
    flex: 1,
  },

  workoutsListContent: {
    padding: 16,
    gap: 12,
  },

  workoutCard: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },

  workoutCardWithSuggestions: {
    borderColor: theme.colors.accent,
    borderWidth: 2,
  },

  workoutCardContent: {
    padding: 16,
    gap: 12,
  },

  workoutHeader: {
    gap: 4,
  },

  workoutTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  workoutType: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    textTransform: 'capitalize',
  },

  workoutBadges: {
    flexDirection: 'row',
    gap: 8,
  },

  nostrBadge: {
    backgroundColor: theme.colors.accent + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  nostrBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accent,
    textTransform: 'uppercase',
  },

  eventSuggestionsBadge: {
    backgroundColor: theme.colors.success + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  eventSuggestionsBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.success,
  },

  workoutDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  workoutMetrics: {
    flexDirection: 'row',
    gap: 16,
  },

  metric: {
    alignItems: 'center',
    gap: 2,
  },

  metricValue: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  metricLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },

  eventSuggestionsPreview: {
    backgroundColor: theme.colors.success + '10',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.success,
  },

  eventSuggestionsText: {
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: theme.typography.weights.medium,
  },

  workoutActions: {
    marginTop: 4,
  },

  emptyState: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },

  emptyStateTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    textAlign: 'center',
  },

  emptyStateMessage: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  emptySyncInfo: {
    fontSize: 12,
    color: theme.colors.textDark,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});