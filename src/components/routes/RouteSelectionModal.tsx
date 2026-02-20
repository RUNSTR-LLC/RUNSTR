/**
 * RouteSelectionModal - Simple route labeling modal
 * Three views: Browse routes, Create route, View route history
 * Routes are just names for grouping runs - no GPS data
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import routeStorageService, {
  type RouteLabel,
} from '../../services/routes/RouteStorageService';
import localWorkoutStorageService, {
  type LocalWorkout,
} from '../../services/fitness/LocalWorkoutStorageService';
import type { WorkoutType } from '../../types/workout';
import { useUnitPreference } from '../../hooks/useUnitPreference';

type ModalView = 'browse' | 'create' | 'history';

interface RouteSelectionModalProps {
  visible: boolean;
  activityType: WorkoutType;
  onSelectRoute: (routeId: string, routeName: string) => void;
  onClose: () => void;
}

export const RouteSelectionModal: React.FC<RouteSelectionModalProps> = ({
  visible,
  activityType,
  onSelectRoute,
  onClose,
}) => {
  const { isMetric, distanceLabel, paceLabel } = useUnitPreference();
  const [view, setView] = useState<ModalView>('browse');
  const [routes, setRoutes] = useState<RouteLabel[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<LocalWorkout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<LocalWorkout | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteLabel | null>(null);
  const [routeWorkouts, setRouteWorkouts] = useState<LocalWorkout[]>([]);
  const [newRouteName, setNewRouteName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (visible) {
      setView('browse');
      setSelectedWorkout(null);
      setSelectedRoute(null);
      setNewRouteName('');
      loadRoutes();
    }
  }, [visible, activityType]);

  const loadRoutes = async () => {
    try {
      setIsLoading(true);
      const activityRoutes = await routeStorageService.getRoutesByActivity(activityType);
      setRoutes(activityRoutes);
    } catch (error) {
      console.error('[RouteModal] Failed to load routes:', error);
      setRoutes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentWorkouts = async () => {
    try {
      setIsLoading(true);
      const allWorkouts = await localWorkoutStorageService.getAllWorkouts();
      // Filter by activity type and get last 3 without a route
      const filtered = allWorkouts
        .filter((w) => w.type === activityType && !w.routeId)
        .slice(0, 3);
      setRecentWorkouts(filtered);
    } catch (error) {
      console.error('[RouteModal] Failed to load workouts:', error);
      setRecentWorkouts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRouteWorkouts = async (route: RouteLabel) => {
    try {
      setIsLoading(true);
      const workouts = await localWorkoutStorageService.getWorkoutsByRoute(route.id);
      // Sort by date (newest first)
      workouts.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      setRouteWorkouts(workouts);
    } catch (error) {
      console.error('[RouteModal] Failed to load route workouts:', error);
      setRouteWorkouts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePress = () => {
    setView('create');
    loadRecentWorkouts();
  };

  const handleRoutePress = (route: RouteLabel) => {
    setSelectedRoute(route);
    setView('history');
    loadRouteWorkouts(route);
  };

  const handleWorkoutSelect = (workout: LocalWorkout) => {
    setSelectedWorkout(workout);
  };

  const handleCreateRoute = async () => {
    if (!selectedWorkout || !newRouteName.trim()) return;

    try {
      setIsCreating(true);

      // Calculate pace if not present but distance and duration are available
      let workoutPace = selectedWorkout.pace;
      if (!workoutPace && selectedWorkout.distance && selectedWorkout.duration) {
        // Calculate pace as minutes per km (format expected by RouteStorageService.formatPace)
        const distanceKm = selectedWorkout.distance / 1000;
        if (distanceKm > 0) {
          const durationMinutes = selectedWorkout.duration / 60;
          workoutPace = durationMinutes / distanceKm;
        }
      }

      // Create the route with this workout
      const routeId = await routeStorageService.createRoute(
        newRouteName.trim(),
        activityType,
        selectedWorkout.id,
        selectedWorkout.duration,
        workoutPace
      );

      // Update the workout with the route info
      await localWorkoutStorageService.updateWorkoutRoute(
        selectedWorkout.id,
        routeId,
        newRouteName.trim()
      );

      console.log(`[RouteModal] Created route "${newRouteName}" from workout ${selectedWorkout.id}`);

      // Reset and go back to browse
      setSelectedWorkout(null);
      setNewRouteName('');
      setView('browse');
      loadRoutes();
    } catch (error) {
      console.error('[RouteModal] Failed to create route:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectRouteForRun = () => {
    if (selectedRoute) {
      onSelectRoute(selectedRoute.id, selectedRoute.name);
      onClose();
    }
  };

  const handleBack = () => {
    if (view === 'create' || view === 'history') {
      setView('browse');
      setSelectedWorkout(null);
      setSelectedRoute(null);
      setNewRouteName('');
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (seconds: number | undefined): string => {
    if (!seconds) return '--:--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters: number | undefined): string => {
    if (!meters) return `0.00 ${distanceLabel}`;
    if (isMetric) {
      const km = meters / 1000;
      return `${km.toFixed(2)} ${distanceLabel}`;
    } else {
      const miles = meters * 0.000621371;
      return `${miles.toFixed(2)} ${distanceLabel}`;
    }
  };

  const formatPace = (paceMinPerKm: number | undefined): string => {
    if (!paceMinPerKm) return `--:--${paceLabel}`;
    // Convert to minutes per mile if imperial
    const pace = isMetric ? paceMinPerKm : paceMinPerKm * 1.60934;
    const mins = Math.floor(pace);
    const secs = Math.round((pace - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}${paceLabel}`;
  };

  const getActivityIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (activityType) {
      case 'running': return 'fitness';
      case 'walking': return 'walk';
      case 'cycling': return 'bicycle';
      default: return 'location';
    }
  };

  // ===== BROWSE VIEW =====
  const renderBrowseView = () => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Routes</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Create Route Button */}
      <TouchableOpacity style={styles.createButton} onPress={handleCreatePress}>
        <Ionicons name="add-circle-outline" size={24} color={theme.colors.text} />
        <Text style={styles.createButtonText}>Create Route</Text>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
      </TouchableOpacity>

      {/* Routes List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.text} />
        </View>
      ) : routes.length > 0 ? (
        <FlatList
          data={routes}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.routeCard} onPress={() => handleRoutePress(item)}>
              <View style={styles.routeInfo}>
                <Text style={styles.routeName}>{item.name}</Text>
                <Text style={styles.routeMeta}>
                  {item.timesUsed} {item.timesUsed === 1 ? 'run' : 'runs'}
                  {item.bestTime && ` - Best: ${formatTime(item.bestTime)}`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          style={styles.routesList}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="map-outline" size={48} color={theme.colors.textMuted} />
          <Text style={styles.emptyStateTitle}>No Routes Yet</Text>
          <Text style={styles.emptyStateText}>
            Create a route by naming one of your past runs
          </Text>
        </View>
      )}
    </>
  );

  // ===== CREATE VIEW =====
  const renderCreateView = () => (
    <>
      {/* Header with Back */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Route</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Instructions */}
      <Text style={styles.instructions}>Select a run to create a route from:</Text>

      {/* Recent Workouts */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.text} />
        </View>
      ) : recentWorkouts.length > 0 ? (
        <View style={styles.workoutsList}>
          {recentWorkouts.map((workout) => (
            <TouchableOpacity
              key={workout.id}
              style={[
                styles.workoutCard,
                selectedWorkout?.id === workout.id && styles.workoutCardSelected,
              ]}
              onPress={() => handleWorkoutSelect(workout)}
            >
              <View style={styles.workoutInfo}>
                <Text style={styles.workoutDate}>{formatDate(workout.startTime)}</Text>
                <Text style={styles.workoutStats}>
                  {formatDistance(workout.distance)} - {formatTime(workout.duration)}
                </Text>
                {workout.pace && (
                  <Text style={styles.workoutPace}>{formatPace(workout.pace)}</Text>
                )}
              </View>
              {selectedWorkout?.id === workout.id && (
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.accent} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No recent {activityType} workouts to create a route from
          </Text>
        </View>
      )}

      {/* Route Name Input */}
      {selectedWorkout && (
        <View style={styles.nameInputSection}>
          <Text style={styles.nameLabel}>Route Name</Text>
          <TextInput
            style={styles.nameInput}
            value={newRouteName}
            onChangeText={setNewRouteName}
            placeholder="e.g., The Lake, Park Loop"
            placeholderTextColor={theme.colors.textMuted}
            autoFocus
          />
          <TouchableOpacity
            style={[
              styles.createRouteButton,
              (!newRouteName.trim() || isCreating) && styles.createRouteButtonDisabled,
            ]}
            onPress={handleCreateRoute}
            disabled={!newRouteName.trim() || isCreating}
          >
            {isCreating ? (
              <ActivityIndicator size="small" color={theme.colors.background} />
            ) : (
              <Text style={styles.createRouteButtonText}>Create Route</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  // ===== HISTORY VIEW =====
  const renderHistoryView = () => (
    <>
      {/* Header with Back */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {selectedRoute?.name}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Route Stats Summary */}
      {selectedRoute && (
        <View style={styles.routeStatsSummary}>
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>{selectedRoute.timesUsed}</Text>
            <Text style={styles.statBoxLabel}>Runs</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>
              {selectedRoute.bestTime ? formatTime(selectedRoute.bestTime) : '--:--'}
            </Text>
            <Text style={styles.statBoxLabel}>Best Time</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>
              {selectedRoute.bestPace ? formatPace(selectedRoute.bestPace) : '--:--'}
            </Text>
            <Text style={styles.statBoxLabel}>Best Pace</Text>
          </View>
        </View>
      )}

      {/* Select for Run Button */}
      <TouchableOpacity style={styles.selectRouteButton} onPress={handleSelectRouteForRun}>
        <Ionicons name="play-circle-outline" size={20} color={theme.colors.background} />
        <Text style={styles.selectRouteButtonText}>Select for Next Run</Text>
      </TouchableOpacity>

      {/* Workout History */}
      <Text style={styles.sectionTitle}>Run History</Text>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.text} />
        </View>
      ) : routeWorkouts.length > 0 ? (
        <FlatList
          data={routeWorkouts}
          renderItem={({ item, index }) => {
            const isPR = selectedRoute?.bestWorkoutId === item.id;
            return (
              <View style={[styles.historyItem, isPR && styles.historyItemPR]}>
                <View style={styles.historyRank}>
                  <Text style={styles.historyRankText}>{index + 1}</Text>
                </View>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyDate}>{formatDate(item.startTime)}</Text>
                  <Text style={styles.historyStats}>
                    {formatTime(item.duration)} - {formatDistance(item.distance)}
                  </Text>
                </View>
                {isPR && (
                  <View style={styles.prBadge}>
                    <Ionicons name="trophy" size={14} color={theme.colors.accent} />
                    <Text style={styles.prBadgeText}>PR</Text>
                  </View>
                )}
              </View>
            );
          }}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          style={styles.routesList}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No runs recorded on this route yet</Text>
        </View>
      )}
    </>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {view === 'browse' && renderBrowseView()}
          {view === 'create' && renderCreateView()}
          {view === 'history' && renderHistoryView()}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold as '700',
    color: theme.colors.text,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  backButton: {
    padding: 4,
    width: 40,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  createButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: theme.typography.weights.medium as '500',
    color: theme.colors.text,
  },
  routesList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    flex: 1,
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold as '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  routeMeta: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold as '700',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Create View
  instructions: {
    fontSize: 14,
    color: theme.colors.textMuted,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  workoutsList: {
    paddingHorizontal: 20,
  },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  workoutCardSelected: {
    borderColor: theme.colors.text,
    backgroundColor: '#111111',
  },
  workoutInfo: {
    flex: 1,
  },
  workoutDate: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold as '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  workoutStats: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  workoutPace: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  nameInputSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: 16,
  },
  nameLabel: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium as '500',
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  nameInput: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  createRouteButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  createRouteButtonDisabled: {
    opacity: 0.5,
  },
  createRouteButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold as '600',
    color: theme.colors.background,
  },
  // History View
  routeStatsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statBox: {
    alignItems: 'center',
  },
  statBoxValue: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold as '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  statBoxLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  selectRouteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.text,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  selectRouteButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold as '600',
    color: theme.colors.background,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold as '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  historyItemPR: {
    borderColor: theme.colors.text,
  },
  historyRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyRankText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold as '700',
    color: theme.colors.textMuted,
  },
  historyInfo: {
    flex: 1,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium as '500',
    color: theme.colors.text,
    marginBottom: 2,
  },
  historyStats: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#111111',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  prBadgeText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold as '600',
    color: theme.colors.accent,
  },
});
