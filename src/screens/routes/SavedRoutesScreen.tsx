/**
 * SavedRoutesScreen - Browse and manage saved route labels
 * Shows list of saved routes with filtering by activity type
 * Allows viewing route details, renaming, and deleting routes
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { OstrichRefreshFlatList } from '../../components/ui/OstrichRefreshScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import routeStorageService, {
  RouteLabel,
} from '../../services/routes/RouteStorageService';
import type { WorkoutType } from '../../types/workout';
import { useUnitPreference } from '../../hooks/useUnitPreference';

type ActivityFilter = 'all' | WorkoutType;

export const SavedRoutesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { isMetric, paceLabel } = useUnitPreference();
  const [routes, setRoutes] = useState<RouteLabel[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<RouteLabel[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>('all');

  useEffect(() => {
    loadRoutes();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [routes, activeFilter]);

  const loadRoutes = async () => {
    try {
      setIsLoading(true);
      const allRoutes = await routeStorageService.getAllRoutes();
      setRoutes(allRoutes);
      console.log(`[SavedRoutes] Loaded ${allRoutes.length} routes`);
    } catch (error) {
      console.error('[SavedRoutes] Failed to load routes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...routes];

    // Filter by activity type
    if (activeFilter !== 'all') {
      filtered = filtered.filter((r) => r.activityType === activeFilter);
    }

    setFilteredRoutes(filtered);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadRoutes();
    setIsRefreshing(false);
  };

  const handleDeleteRoute = (route: RouteLabel) => {
    Alert.alert(
      'Delete Route',
      `Are you sure you want to delete "${route.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await routeStorageService.deleteRoute(route.id);
              await loadRoutes();
              console.log(`[SavedRoutes] Deleted route: ${route.name}`);
            } catch (error) {
              console.error('Failed to delete route:', error);
              Alert.alert('Error', 'Failed to delete route');
            }
          },
        },
      ]
    );
  };

  const handleRenameRoute = (route: RouteLabel) => {
    Alert.prompt(
      'Rename Route',
      `Enter new name for "${route.name}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (newName) => {
            if (!newName || !newName.trim()) return;
            try {
              await routeStorageService.renameRoute(route.id, newName.trim());
              await loadRoutes();
              console.log(`[SavedRoutes] Renamed route to: ${newName}`);
            } catch (error) {
              console.error('Failed to rename route:', error);
              Alert.alert('Error', 'Failed to rename route');
            }
          },
        },
      ],
      'plain-text',
      route.name
    );
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (
    type: WorkoutType
  ): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'running':
        return 'fitness';
      case 'walking':
        return 'walk';
      case 'cycling':
        return 'bicycle';
      case 'hiking':
        return 'trail-sign';
      default:
        return 'location';
    }
  };

  const getActivityColor = (type: WorkoutType): string => {
    switch (type) {
      case 'running':
        return theme.colors.accent;
      case 'walking':
        return theme.colors.orangeBright;
      case 'cycling':
        return theme.colors.orangeDeep;
      case 'hiking':
        return theme.colors.orangeBurnt;
      default:
        return theme.colors.accent;
    }
  };

  const renderRouteCard = useCallback(
    ({ item: route }: { item: RouteLabel }) => {
      const activityColor = getActivityColor(route.activityType);

      return (
        <View style={styles.routeCard}>
          {/* Header */}
          <View style={styles.routeHeader}>
            <View style={styles.routeHeaderLeft}>
              <View
                style={[
                  styles.activityIconContainer,
                  { backgroundColor: activityColor + '20' },
                ]}
              >
                <Ionicons
                  name={getActivityIcon(route.activityType)}
                  size={24}
                  color={activityColor}
                />
              </View>
              <View style={styles.routeInfo}>
                <Text style={styles.routeName}>{route.name}</Text>
                <Text style={styles.routeMeta}>
                  Last used {formatDate(route.lastUsed || route.createdAt)}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => {
                Alert.alert(route.name, 'Choose an action', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Rename', onPress: () => handleRenameRoute(route) },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => handleDeleteRoute(route),
                  },
                ]);
              }}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={20}
                color={theme.colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.routeStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{route.timesUsed}</Text>
              <Text style={styles.statLabel}>Times Used</Text>
            </View>
            {route.bestTime && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {formatTime(route.bestTime)}
                </Text>
                <Text style={styles.statLabel}>Best Time</Text>
              </View>
            )}
            {route.bestPace && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {formatPace(route.bestPace)}
                </Text>
                <Text style={styles.statLabel}>Best Pace</Text>
              </View>
            )}
          </View>

          {/* Best Performance Highlight */}
          {route.bestTime && (
            <View style={styles.bestPerformance}>
              <Ionicons name="trophy" size={14} color={theme.colors.accent} />
              <Text style={styles.bestPerformanceText}>
                Personal Record: {formatTime(route.bestTime)}
              </Text>
            </View>
          )}
        </View>
      );
    },
    []
  );

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatPace = (paceMinPerKm: number): string => {
    // Convert to minutes per mile if imperial
    const pace = isMetric ? paceMinPerKm : paceMinPerKm * 1.60934;
    const mins = Math.floor(pace);
    const secs = Math.round((pace - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}${paceLabel}`;
  };

  const renderFilters = () => {
    const filters: { label: string; value: ActivityFilter }[] = [
      { label: 'All', value: 'all' },
      { label: 'Running', value: 'running' },
      { label: 'Cycling', value: 'cycling' },
      { label: 'Walking', value: 'walking' },
    ];

    return (
      <View style={styles.filtersContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterButton,
              activeFilter === filter.value && styles.filterButtonActive,
            ]}
            onPress={() => setActiveFilter(filter.value)}
          >
            <Text
              style={[
                styles.filterButtonText,
                activeFilter === filter.value && styles.filterButtonTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderHeader = () => (
    <>
      {/* Activity Filters */}
      {renderFilters()}

      {/* Stats Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          {filteredRoutes.length} route{filteredRoutes.length !== 1 ? 's' : ''}
          {activeFilter !== 'all' && ` for ${activeFilter}`}
        </Text>
      </View>
    </>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="map-outline" size={64} color={theme.colors.textMuted} />
      <Text style={styles.emptyStateTitle}>No Routes Yet</Text>
      <Text style={styles.emptyStateText}>
        {activeFilter !== 'all'
          ? `No ${activeFilter} routes saved yet`
          : 'Create a route by naming one of your completed workouts from the Routes modal'}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading routes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Routes</Text>
        <View style={styles.headerSpacer} />
      </View>

      <OstrichRefreshFlatList
        data={filteredRoutes}
        renderItem={renderRouteCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader()}
        ListEmptyComponent={renderEmptyState()}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
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

  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    textAlign: 'center',
  },

  headerSpacer: {
    width: 40,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
  },
  filterButtonText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
  },
  filterButtonTextActive: {
    color: theme.colors.background,
  },
  summaryContainer: {
    marginBottom: 16,
  },
  summaryText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  routeHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  activityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  routeName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    marginBottom: 4,
  },
  routeMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  menuButton: {
    padding: 4,
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    marginBottom: 4,
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  bestPerformance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#111111',
    borderRadius: 8,
  },
  bestPerformanceText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
