/**
 * UnifiedWorkoutsTab - Run history list
 * Merges local runs with Apple Health (iOS) / Health Connect (Android) imports,
 * shows running only, grouped by month (newest first) under the personal
 * records card. Each run shows whether it is on Nostr, or can be published.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { OstrichRefreshFlatList } from '../../ui/OstrichRefreshScrollView';
import { theme } from '../../../styles/theme';
import { CustomAlert } from '../../ui/CustomAlert';
import { EnhancedWorkoutCard } from '../shared/EnhancedWorkoutCard';
import { MonthlyWorkoutGroup } from '../shared/MonthlyWorkoutGroup';
import type { MonthlyGroup } from '../shared/MonthlyWorkoutGroup';
import localWorkoutStorage from '../../../services/fitness/LocalWorkoutStorageService';
import { useHealthAppWorkouts } from './useHealthAppWorkouts';
import { mergeWorkoutsWithDeduplication } from '../../../utils/unifiedWorkoutMerge';
import type { LocalWorkout } from '../../../services/fitness/LocalWorkoutStorageService';
import type { Workout } from '../../../types/workout';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import WorkoutStatusTracker from '../../../services/fitness/WorkoutStatusTracker';
import { publishRun } from '../../../services/nostr/publishRun';
import type { PublishableWorkout } from '../../../services/nostr/workoutPublishingService';
import { StatsCard } from '../StatsCard';
import { WorkoutActionSheet, type WorkoutAction } from '../shared/WorkoutActionSheet';
import { PressableScale } from '../../ui/PressableScale';
import { isRunningWorkout } from '../../../utils/isRunningWorkout';
import { FEATURES } from '../../../config/features';

interface UnifiedWorkoutsTabProps {
  userId: string;
  pubkey?: string;
  onRefresh?: () => void;
}

export const UnifiedWorkoutsTab: React.FC<UnifiedWorkoutsTabProps> = ({
  userId,
  pubkey,
  onRefresh,
}) => {
  // Workout state
  const [localWorkouts, setLocalWorkouts] = useState<LocalWorkout[]>([]);
  const [mergedWorkouts, setMergedWorkouts] = useState<Workout[]>([]);
  const [localWorkoutIds, setLocalWorkoutIds] = useState<Set<string>>(new Set());
  // Apple Health / Health Connect workouts, merged into the list below
  const {
    healthWorkouts,
    healthAvailable,
    healthPermission,
    isHealthSyncing,
    loadHealthWorkouts,
    handleConnectHealth,
  } = useHealthAppWorkouts(userId);
  const [permissionDismissed, setPermissionDismissed] = useState(false);

  // UI state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const [postingWorkoutId, setPostingWorkoutId] = useState<string | null>(null);
  // Workouts published from this device (the summary or History)
  const [postedIds, setPostedIds] = useState<Set<string>>(
    () => WorkoutStatusTracker.getPostedWorkoutIds()
  );
  const [actionSheetWorkout, setActionSheetWorkout] = useState<Workout | null>(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }>;
  }>({ title: '', message: '', buttons: [] });


  // Load all data on mount
  useEffect(() => {
    loadLocalWorkouts();
  }, []);

  // Merge workouts whenever local or health workouts change
  useEffect(() => {
    const result = mergeWorkoutsWithDeduplication(localWorkouts, healthWorkouts, userId);
    setMergedWorkouts(result.workouts);
    const ids = new Set(localWorkouts.map((w) => w.id));
    setLocalWorkoutIds(ids);
  }, [localWorkouts, healthWorkouts, userId]);

  // ============================================================================
  // Data Loading
  // ============================================================================

  const loadLocalWorkouts = async () => {
    try {
      const allLocalWorkouts = await localWorkoutStorage.getAllWorkouts();
      setLocalWorkouts(allLocalWorkouts);
    } catch (error) {
      console.error('[UnifiedWorkouts] Failed to load local workouts:', error);
      setLocalWorkouts([]);
    }
  };

  // ============================================================================
  // Monthly Grouping
  // ============================================================================

  // Running-only display filter. Storage and sync are unaffected — this is the
  // single place history decides which workouts it shows.
  const visibleWorkouts = useMemo(
    () =>
      FEATURES.nonRunningHistory
        ? mergedWorkouts
        : mergedWorkouts.filter(isRunningWorkout),
    [mergedWorkouts]
  );

  const monthlyGroups = useMemo((): MonthlyGroup[] => {
    const groups = new Map<string, { workout: Workout; timestamp: number }[]>();
    visibleWorkouts.forEach((w) => {
      if (!w.startTime) return; // Skip corrupted entries without a timestamp
      // HealthKit workouts carry startTime as a Date object; local workouts as
      // an ISO string. Normalize so date parsing can never throw (this used to
      // crash History whenever Apple Health Workouts sync was on).
      const startIso =
        typeof w.startTime === 'string' ? w.startTime : new Date(w.startTime as any).toISOString();
      const d = new Date(startIso.split('T')[0]);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groups.has(monthKey)) groups.set(monthKey, []);
      groups.get(monthKey)!.push({ workout: w, timestamp: new Date(startIso).getTime() });
    });

    const monthlyResult: MonthlyGroup[] = [];
    groups.forEach((entries, monthKey) => {
      const [year, month] = monthKey.split('-');
      const title = new Date(parseInt(year), parseInt(month) - 1)
        .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      // Newest first within the month
      const workouts = entries
        .sort((a, b) => b.timestamp - a.timestamp)
        .map((e) => e.workout);
      const stats = workouts.reduce(
        (acc, w) => ({
          totalWorkouts: acc.totalWorkouts + 1,
          totalDuration: acc.totalDuration + (w.duration || 0),
          totalDistance: acc.totalDistance + (w.distance || 0),
          totalCalories: acc.totalCalories + (w.calories || 0),
        }),
        { totalWorkouts: 0, totalDuration: 0, totalDistance: 0, totalCalories: 0 }
      );
      monthlyResult.push({ key: monthKey, title, workouts, stats });
    });

    return monthlyResult.sort((a, b) => b.key.localeCompare(a.key));
  }, [visibleWorkouts]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadLocalWorkouts(),
        healthPermission ? loadHealthWorkouts(false) : Promise.resolve(),
      ]);
      // Force StatsCard to re-fetch today's steps (clears the 5s cache)
      setStatsRefreshKey((k) => k + 1);
      onRefresh?.();
    } catch (error) {
      console.error('[UnifiedWorkouts] Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // On Nostr = published from this device, or imported from a relay 1301 note
  const isOnNostr = (workout: Workout) =>
    postedIds.has(workout.id) ||
    !!(workout.metadata as any)?.nostrEventId ||
    !!(workout.metadata as any)?.syncedToNostr;

  const handlePublish = async (workout: Workout) => {
    if (postingWorkoutId) return;
    setPostingWorkoutId(workout.id);
    const npub = (workout as any).userId || userId;
    // The stored id keeps the 1301 d-tag stable, so republishing replaces the note
    const publishable: PublishableWorkout = {
      ...(workout as any),
      userId: npub || 'unknown',
      sourceApp: (workout as any).sourceApp || 'RUNSTR',
      canSyncToNostr: true,
    };
    const result = await publishRun(publishable);
    setPostingWorkoutId(null);
    if (result.status === 'published') {
      setPostedIds((prev) => new Set(prev).add(workout.id));
    } else {
      Toast.show({
        type: 'error',
        text1: result.status === 'noSigner' ? 'No signing key' : 'Couldn’t publish',
        text2: result.status === 'noSigner'
          ? 'Log in with a Nostr key to publish runs'
          : 'Couldn’t reach relays. Try again later.',
      });
    }
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    setAlertConfig({
      title: 'Delete Workout', message: 'Are you sure? This cannot be undone.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await localWorkoutStorage.deleteWorkout(workoutId);
            await loadLocalWorkouts();
          } catch (error) { console.error('[UnifiedWorkouts] Delete failed:', error); }
        }},
      ],
    });
    setAlertVisible(true);
  };

  // ============================================================================
  // Renderers
  // ============================================================================

  const renderWorkout = useCallback(
    (workout: Workout) => {
      const isLocal = localWorkoutIds.has(workout.id);
      const isHealthSource = workout.source === 'healthkit' || workout.source === 'health_connect';
      const canDelete = isLocal && !isHealthSource;
      const isPosting = postingWorkoutId === workout.id;
      const onNostr = isOnNostr(workout);

      return (
        <Pressable
          style={styles.workoutContainer}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            setActionSheetWorkout(workout);
          }}
          delayLongPress={400}
        >
          <EnhancedWorkoutCard workout={workout} hideActions={true} />
          <View style={styles.workoutActions}>
            {onNostr ? (
              <View style={styles.nostrStatus}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.accent} />
                <Text style={styles.nostrStatusText}>On Nostr</Text>
              </View>
            ) : (
              <PressableScale
                style={[styles.actionButton, styles.postButton]}
                onPress={() => handlePublish(workout)}
                disabled={isPosting}
              >
                {isPosting ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Ionicons name="paper-plane-outline" size={16} color="#000" />
                    <Text style={styles.postButtonText}>Publish to Nostr</Text>
                  </>
                )}
              </PressableScale>
            )}
            {canDelete && (
              <PressableScale
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteWorkout(workout.id)}
              >
                <Ionicons name="trash-outline" size={16} color={theme.colors.accent} />
              </PressableScale>
            )}
          </View>
        </Pressable>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [localWorkoutIds, postingWorkoutId, postedIds, userId]
  );

  const renderMonthlyGroup = ({ item, index }: { item: MonthlyGroup; index: number }) => (
    <MonthlyWorkoutGroup
      group={item}
      renderWorkout={renderWorkout}
      defaultExpanded={index === 0}
    />
  );

  const healthAppName = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';

  return (
    <View style={styles.container}>
      {/* Health permission banner */}
      {healthAvailable && !healthPermission && !permissionDismissed && (
        <TouchableOpacity style={styles.permissionBanner} onPress={handleConnectHealth}>
          <Text style={styles.bannerText}>Sync {healthAppName}</Text>
          <View style={styles.bannerRight}>
            {isHealthSyncing ? (
              <ActivityIndicator size="small" color={theme.colors.textMuted} />
            ) : (
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
            )}
          </View>
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={(e) => { e.stopPropagation(); setPermissionDismissed(true); }}
          >
            <Ionicons name="close" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      <OstrichRefreshFlatList
        data={monthlyGroups}
        renderItem={renderMonthlyGroup}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        initialNumToRender={3}
        windowSize={7}
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={
          // Stats card lives inside the FlatList as a header so pull-to-refresh
          // works when the user pulls on the card itself (the dominant content).
          // Without this, the gesture only fires on the empty list area below.
          pubkey ? <StatsCard userPubkey={pubkey} refreshKey={statsRefreshKey} /> : null
        }
        ListFooterComponent={
          visibleWorkouts.length > 0 ? (
            <View style={styles.footer}>
              <Text style={styles.footerSubtext}>
                {visibleWorkouts.length} run{visibleWorkouts.length !== 1 ? 's' : ''}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No runs yet</Text>
            <Text style={styles.emptyStateText}>Finished runs show up here.</Text>
          </View>
        }
      />

      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertVisible(false)}
      />

      <WorkoutActionSheet
        visible={actionSheetWorkout !== null}
        onClose={() => setActionSheetWorkout(null)}
        title="Workout"
        actions={buildWorkoutActions(actionSheetWorkout)}
      />

    </View>
  );

  function buildWorkoutActions(workout: Workout | null): WorkoutAction[] {
    if (!workout) return [];
    const isLocal = localWorkoutIds.has(workout.id);
    const isHealthSource =
      workout.source === 'healthkit' || workout.source === 'health_connect';
    const canDelete = isLocal && !isHealthSource;
    const actions: WorkoutAction[] = [];

    if (!isOnNostr(workout)) {
      actions.push({
        id: 'publish',
        label: 'Publish to Nostr',
        icon: 'paper-plane-outline',
        onPress: () => handlePublish(workout),
      });
    }

    if (canDelete) {
      actions.push({
        id: 'delete',
        label: 'Delete Workout',
        icon: 'trash-outline',
        destructive: true,
        onPress: () => handleDeleteWorkout(workout.id),
      });
    }

    return actions;
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  permissionBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 10,
  },
  bannerText: { flex: 1, color: theme.colors.text, fontSize: 14 },
  bannerRight: { marginRight: 8 },
  dismissButton: { padding: 4 },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.text, borderColor: theme.colors.text,
  },
  filterChipText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '500' },
  filterChipTextActive: { color: theme.colors.background },
  list: { padding: 16, paddingBottom: 100 },
  footer: { marginTop: 16, marginBottom: 16, alignItems: 'center' },
  footerText: { color: theme.colors.text, fontSize: 14, fontWeight: '500' },
  footerSubtext: { color: theme.colors.textMuted, fontSize: 12, marginTop: 4 },
  workoutContainer: { marginBottom: 12 },
  workoutActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', padding: 12, borderRadius: 8, gap: 8,
  },
  postButton: { backgroundColor: theme.colors.text, flex: 1.5 },
  postButtonText: { color: '#000', fontSize: 14, fontWeight: '600' },
  nostrStatus: {
    flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4,
  },
  nostrStatusText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '500' },
  deleteButton: {
    backgroundColor: '#111111',
    borderWidth: 1, borderColor: theme.colors.border, flex: 1,
  },
  emptyState: { padding: 32, alignItems: 'center', marginTop: 32, margin: 16 },
  emptyStateTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  emptyStateText: { color: theme.colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
