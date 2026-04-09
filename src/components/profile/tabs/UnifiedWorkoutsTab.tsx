/**
 * UnifiedWorkoutsTab - Health Timeline
 * Unified view of workouts, journal entries, and habit check-ins
 * Merges local workouts with Apple Health (iOS) / Health Connect (Android)
 * plus journal entries and habit check-ins into a chronological timeline
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../../styles/theme';
import { Card } from '../../ui/Card';
import { CustomAlert } from '../../ui/CustomAlert';
import { EnhancedWorkoutCard } from '../shared/EnhancedWorkoutCard';
import { TimelineEntryCard } from '../shared/TimelineEntryCard';
import { JournalEditorModal } from '../../journal/JournalEditorModal';
import { MonthlyWorkoutGroup } from '../shared/MonthlyWorkoutGroup';
import type { MonthlyGroup } from '../shared/MonthlyWorkoutGroup';
import localWorkoutStorage from '../../../services/fitness/LocalWorkoutStorageService';
import healthKitService from '../../../services/fitness/healthKitService';
import healthConnectService from '../../../services/fitness/healthConnectService';
import { JournalService } from '../../../services/journal/JournalService';
import { getAllHabits } from '../../../services/habits/HabitTrackerService';
import { mergeWorkoutsWithDeduplication } from '../../../utils/unifiedWorkoutMerge';
import type { LocalWorkout } from '../../../services/fitness/LocalWorkoutStorageService';
import type { Workout } from '../../../types/workout';
import type { JournalEntry } from '../../../types/journal';
import type { TimelineItem, TimelineFilter } from '../../../types/timeline';
import type { Habit } from '../../../services/habits/HabitTrackerService';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { WoTService } from '../../../services/wot/WoTService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UnifiedWorkoutsTabProps {
  userId: string;
  pubkey?: string;
  onRefresh?: () => void;
  onPostToSocial?: (workout: LocalWorkout) => Promise<void>;
  onSocialShareHealthApp?: (workout: Workout) => Promise<void>;
}

const FILTER_OPTIONS: { key: TimelineFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'workouts', label: 'Workouts' },
  { key: 'journal', label: 'Journal' },
  { key: 'habits', label: 'Habits' },
];

export const UnifiedWorkoutsTab: React.FC<UnifiedWorkoutsTabProps> = ({
  userId,
  onRefresh,
  onPostToSocial,
  onSocialShareHealthApp,
}) => {
  // Workout state
  const [localWorkouts, setLocalWorkouts] = useState<LocalWorkout[]>([]);
  const [mergedWorkouts, setMergedWorkouts] = useState<Workout[]>([]);
  const [localWorkoutIds, setLocalWorkoutIds] = useState<Set<string>>(new Set());
  const [healthWorkouts, setHealthWorkouts] = useState<Workout[]>([]);
  const [healthPermission, setHealthPermission] = useState(false);
  const [healthAvailable, setHealthAvailable] = useState(false);
  const [isHealthSyncing, setIsHealthSyncing] = useState(false);
  const [permissionDismissed, setPermissionDismissed] = useState(false);

  // Timeline data
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [activeFilter, setActiveFilter] = useState<TimelineFilter>('all');

  // Journal editor modal
  const [journalModalVisible, setJournalModalVisible] = useState(false);
  const [editingJournalEntry, setEditingJournalEntry] = useState<JournalEntry | null>(null);

  // UI state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [postingWorkoutId, setPostingWorkoutId] = useState<string | null>(null);
  const [postingType, setPostingType] = useState<'social' | 'nostr' | null>(null);
  const [isWoTEligible, setIsWoTEligible] = useState(false);
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
    checkHealthPermission();
    loadWoTEligibility();
    loadJournalEntries();
    loadHabits();
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


  const loadJournalEntries = async () => {
    try {
      const entries = await JournalService.getAllEntries();
      setJournalEntries(entries);
    } catch (error) {
      console.error('[UnifiedWorkouts] Failed to load journal entries:', error);
    }
  };

  const loadHabits = async () => {
    try {
      const allHabits = await getAllHabits();
      setHabits(allHabits);
    } catch (error) {
      console.error('[UnifiedWorkouts] Failed to load habits:', error);
    }
  };

  const loadWoTEligibility = async () => {
    try {
      const pubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (!pubkey) return;
      const wotService = WoTService.getInstance();
      const score = await wotService.getCachedScore(pubkey);
      setIsWoTEligible(score !== null && score > 0);
    } catch (error) {
      console.warn('[UnifiedWorkouts] WoT eligibility check failed:', error);
    }
  };

  const checkHealthPermission = async () => {
    try {
      if (Platform.OS === 'ios') {
        const status = healthKitService.getStatus();
        setHealthAvailable(status.available);
        if (status.authorized) {
          setHealthPermission(true);
          loadHealthWorkouts(false);
        }
      } else if (Platform.OS === 'android') {
        const status = healthConnectService.getStatus();
        setHealthAvailable(status.available);
        if (status.authorized) {
          setHealthPermission(true);
          loadHealthWorkouts(false);
        }
      }
    } catch (error) {
      console.error('[UnifiedWorkouts] Error checking health permission:', error);
    }
  };

  const loadHealthWorkouts = async (showLoading: boolean = false) => {
    if (showLoading) setIsHealthSyncing(true);
    try {
      let workouts: Workout[] = [];
      if (Platform.OS === 'ios') {
        const cached = await healthKitService.getCachedWorkouts();
        if (cached && cached.length > 0) {
          workouts = transformHealthKitWorkouts(cached);
          setHealthWorkouts(workouts);
        }
        const fresh = await healthKitService.getRecentWorkouts(userId, 30);
        if (fresh) { workouts = fresh; setHealthWorkouts(workouts); }
      } else if (Platform.OS === 'android') {
        const cached = await healthConnectService.getCachedWorkouts();
        if (cached && cached.length > 0) {
          workouts = transformHealthConnectWorkouts(cached);
          setHealthWorkouts(workouts);
        }
        const fresh = await healthConnectService.getRecentWorkouts(userId, 30);
        if (fresh) { workouts = fresh; setHealthWorkouts(workouts); }
      }
    } catch (error) {
      console.error('[UnifiedWorkouts] Failed to load health workouts:', error);
    } finally {
      setIsHealthSyncing(false);
    }
  };

  const transformHealthKitWorkouts = (cached: any[]): Workout[] =>
    cached.map((w) => ({
      id: w.UUID || w.id || `hk_${Date.now()}`,
      userId, type: (w.activityType || 'running') as Workout['type'],
      source: 'healthkit' as const, duration: w.duration,
      distance: w.totalDistance || 0, calories: w.totalEnergyBurned || 0,
      startTime: w.startDate, endTime: w.endDate, syncedAt: new Date().toISOString(),
      metadata: { sourceApp: w.sourceName, healthKitId: w.UUID },
    }));

  const transformHealthConnectWorkouts = (cached: any[]): Workout[] =>
    cached.map((w) => ({
      id: w.id, userId, type: (w.activityType || 'running') as Workout['type'],
      source: 'health_connect' as const, duration: w.duration,
      distance: w.totalDistance || 0, calories: w.totalEnergyBurned || 0,
      startTime: w.startTime, endTime: w.endTime, syncedAt: new Date().toISOString(),
      steps: w.steps, metadata: { sourceApp: w.sourceName, healthConnectId: w.id },
    }));

  // ============================================================================
  // Timeline Building
  // ============================================================================

  const monthlyGroups = useMemo((): MonthlyGroup[] => {
    // Build timeline items from all sources
    const items: TimelineItem[] = [];

    // Add workouts (always, unless filtered to journal/habits only)
    if (activeFilter === 'all' || activeFilter === 'workouts') {
      mergedWorkouts.forEach((w) => {
        if (!w.startTime) return; // Skip corrupted entries without a timestamp
        items.push({
          type: 'workout', id: `w_${w.id}`,
          date: w.startTime.split('T')[0],
          timestamp: new Date(w.startTime).getTime(),
          workout: w,
        });
      });
    }

    // Add journal entries
    if (activeFilter === 'all' || activeFilter === 'journal') {
      journalEntries.forEach((e) => {
        items.push({
          type: 'journal', id: `j_${e.id}`,
          date: e.date,
          timestamp: new Date(e.createdAt).getTime(),
          journalEntry: e,
        });
      });
    }

    // Add habit check-ins (expand each habit's check-in dates)
    if (activeFilter === 'all' || activeFilter === 'habits') {
      habits.forEach((habit) => {
        habit.checkIns.forEach((checkInDate) => {
          items.push({
            type: 'habit_checkin', id: `h_${habit.id}_${checkInDate}`,
            date: checkInDate,
            timestamp: new Date(checkInDate + 'T12:00:00').getTime(),
            habitCheckIn: { habit, date: checkInDate },
          });
        });
      });
    }

    // Group by month
    const groups = new Map<string, TimelineItem[]>();
    items.forEach((item) => {
      const d = new Date(item.date);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groups.has(monthKey)) groups.set(monthKey, []);
      groups.get(monthKey)!.push(item);
    });

    const monthlyResult: MonthlyGroup[] = [];
    groups.forEach((monthItems, monthKey) => {
      const [year, month] = monthKey.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      const title = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      // Sort items within month (newest first)
      monthItems.sort((a, b) => b.timestamp - a.timestamp);

      // Extract workouts for the existing stats/MonthlyStatsPanel
      const workouts = monthItems
        .filter((i) => i.type === 'workout' && i.workout)
        .map((i) => i.workout!);

      const journalCount = monthItems.filter((i) => i.type === 'journal').length;
      const habitCount = monthItems.filter((i) => i.type === 'habit_checkin').length;

      const stats = workouts.reduce(
        (acc, w) => ({
          totalWorkouts: acc.totalWorkouts + 1,
          totalDuration: acc.totalDuration + (w.duration || 0),
          totalDistance: (acc.totalDistance || 0) + (w.distance || 0),
          totalCalories: (acc.totalCalories || 0) + (w.calories || 0),
          journalEntries: journalCount,
          habitCheckIns: habitCount,
        }),
        { totalWorkouts: 0, totalDuration: 0, totalDistance: 0, totalCalories: 0,
          journalEntries: journalCount, habitCheckIns: habitCount }
      );

      monthlyResult.push({ key: monthKey, title, workouts, items: monthItems, stats });
    });

    return monthlyResult.sort((a, b) => b.key.localeCompare(a.key));
  }, [mergedWorkouts, journalEntries, habits, activeFilter]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleConnectHealth = async () => {
    const healthAppName = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';
    try {
      if (Platform.OS === 'ios') {
        const quickStatus = healthKitService.getStatus();
        if (!quickStatus.available) {
          Toast.show({ type: 'error', text1: 'Not Available', text2: 'Apple Health is not available' });
          return;
        }
        const result = await healthKitService.requestPermissions();
        if (!result.success) {
          Toast.show({ type: 'error', text1: 'Permission Denied', text2: result.error || 'Could not access Apple Health' });
          return;
        }
        setHealthPermission(true);
        await loadHealthWorkouts(true);
        Toast.show({ type: 'success', text1: 'Connected', text2: 'Apple Health synced' });
      } else if (Platform.OS === 'android') {
        const quickStatus = healthConnectService.getStatus();
        if (!quickStatus.available) {
          Toast.show({ type: 'error', text1: 'Not Available', text2: 'Health Connect is not available' });
          return;
        }
        const result = await healthConnectService.requestPermissions();
        if (!result.success) {
          Toast.show({ type: 'error', text1: 'Permission Denied', text2: result.error || 'Could not access Health Connect' });
          return;
        }
        setHealthPermission(true);
        await loadHealthWorkouts(true);
        Toast.show({ type: 'success', text1: 'Connected', text2: 'Health Connect synced' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Connection Failed', text2: `Could not connect to ${healthAppName}` });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadLocalWorkouts(),
        loadJournalEntries(),
        loadHabits(),
        healthPermission ? loadHealthWorkouts(false) : Promise.resolve(),
      ]);
      onRefresh?.();
    } catch (error) {
      console.error('[UnifiedWorkouts] Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePostToSocial = async (workout: LocalWorkout) => {
    if (!onPostToSocial) return;
    try {
      setPostingWorkoutId(workout.id); setPostingType('social');
      await onPostToSocial(workout);
    } catch (error) {
      console.error('[UnifiedWorkouts] Post to social failed:', error);
    } finally { setPostingWorkoutId(null); setPostingType(null); }
  };

  const handleSocialShareHealthApp = async (workout: Workout) => {
    if (!onSocialShareHealthApp) return;
    try {
      setPostingWorkoutId(workout.id); setPostingType('social');
      await onSocialShareHealthApp(workout);
    } catch (error) {
      console.error('[UnifiedWorkouts] Health social share failed:', error);
    } finally { setPostingWorkoutId(null); setPostingType(null); }
  };

  const handleRetryCompete = async (workoutId: string) => {
    try {
      setPostingWorkoutId(workoutId);
      setPostingType('nostr');
      const result = await localWorkoutStorage.retrySupabaseSubmission(workoutId);
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Workout Submitted',
          text2: 'Your workout is on the leaderboard',
          position: 'bottom',
          visibilityTime: 3000,
        });
        await loadLocalWorkouts();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Submission Failed',
          text2: result.error || 'Please try again later',
          position: 'bottom',
          visibilityTime: 4000,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Submission Failed',
        text2: 'Please try again later',
        position: 'bottom',
        visibilityTime: 4000,
      });
    } finally {
      setPostingWorkoutId(null);
      setPostingType(null);
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

  const handleJournalPress = useCallback((entry: JournalEntry) => {
    setEditingJournalEntry(entry);
    setJournalModalVisible(true);
  }, []);

  const handleJournalSave = useCallback((_entry: JournalEntry) => {
    loadJournalEntries(); // Refresh journal data
  }, []);

  // ============================================================================
  // Renderers
  // ============================================================================

  const renderWorkout = useCallback(
    (workout: Workout) => {
      const isLocal = localWorkoutIds.has(workout.id);
      const isHealthSource = workout.source === 'healthkit' || workout.source === 'health_connect';
      const canDelete = isLocal && !isHealthSource;
      const isPosting = postingWorkoutId === workout.id;
      const localWorkout = localWorkouts.find((w) => w.id === workout.id);

      return (
        <View style={styles.workoutContainer}>
          <EnhancedWorkoutCard workout={workout} hideActions={true} />
          <View style={styles.workoutActions}>
            {isWoTEligible && (
              <TouchableOpacity
                style={[styles.actionButton, styles.postButton]}
                onPress={() => {
                  if (isLocal && localWorkout) handlePostToSocial(localWorkout);
                  else handleSocialShareHealthApp(workout);
                }}
                disabled={isPosting && postingType === 'social'}
              >
                {isPosting && postingType === 'social' ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Ionicons name="paper-plane-outline" size={16} color="#000" />
                    <Text style={styles.postButtonText}>Post</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {isLocal && localWorkout?.supabaseSubmitted === false && (
              <TouchableOpacity
                style={[styles.actionButton, styles.competeButton]}
                onPress={() => handleRetryCompete(workout.id)}
                disabled={isPosting && postingType === 'nostr'}
              >
                {isPosting && postingType === 'nostr' ? (
                  <ActivityIndicator size="small" color={theme.colors.textMuted} />
                ) : (
                  <>
                    <Ionicons name="trophy-outline" size={16} color={theme.colors.text} />
                    <Text style={styles.competeButtonText}>Compete</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteWorkout(workout.id)}
              >
                <Ionicons name="trash-outline" size={16} color={theme.colors.accent} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    },
    [localWorkoutIds, localWorkouts, postingWorkoutId, postingType, isWoTEligible]
  );

  const renderTimelineItem = useCallback(
    (item: TimelineItem) => {
      if (item.type === 'journal' && item.journalEntry) {
        return (
          <TimelineEntryCard
            type="journal"
            entry={item.journalEntry}
            onPress={handleJournalPress}
          />
        );
      }
      if (item.type === 'habit_checkin' && item.habitCheckIn) {
        return (
          <TimelineEntryCard
            type="habit"
            habit={item.habitCheckIn.habit}
            date={item.habitCheckIn.date}
          />
        );
      }
      return <View />;
    },
    [handleJournalPress]
  );

  const renderMonthlyGroup = ({ item, index }: { item: MonthlyGroup; index: number }) => (
    <MonthlyWorkoutGroup
      group={item}
      renderWorkout={renderWorkout}
      renderTimelineItem={renderTimelineItem}
      defaultExpanded={false}
    />
  );

  const healthAppName = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';
  const totalItems = monthlyGroups.reduce(
    (sum, g) => sum + (g.items?.length || g.workouts.length), 0
  );

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

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.filterChip, activeFilter === opt.key && styles.filterChipActive]}
            onPress={() => setActiveFilter(opt.key)}
          >
            <Text style={[styles.filterChipText, activeFilter === opt.key && styles.filterChipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={monthlyGroups}
        renderItem={renderMonthlyGroup}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        initialNumToRender={monthlyGroups.length}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={theme.colors.text} />
        }
        ListFooterComponent={
          totalItems > 0 ? (
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {totalItems} item{totalItems !== 1 ? 's' : ''}
              </Text>
              <Text style={styles.footerSubtext}>
                {mergedWorkouts.length} workout{mergedWorkouts.length !== 1 ? 's' : ''}
                {journalEntries.length > 0 && ` \u2022 ${journalEntries.length} journal`}
                {habits.length > 0 && ` \u2022 ${habits.reduce((sum, h) => sum + h.checkIns.length, 0)} habit check-ins`}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <Card style={styles.emptyState}>
            <Ionicons name="time-outline" size={64} color={theme.colors.textMuted} />
            <Text style={styles.emptyStateTitle}>
              {activeFilter === 'all' ? 'No Activity Yet' : `No ${FILTER_OPTIONS.find((f) => f.key === activeFilter)?.label} Yet`}
            </Text>
            <Text style={styles.emptyStateText}>
              {activeFilter === 'all' || activeFilter === 'workouts'
                ? 'Use the Activity Tracker to record workouts.'
                : activeFilter === 'journal'
                ? 'Write your first journal entry to start tracking.'
                : 'Create your first habit to start tracking.'}
            </Text>
          </Card>
        }
      />

      {/* Journal Editor Modal */}
      <JournalEditorModal
        visible={journalModalVisible}
        onClose={() => { setJournalModalVisible(false); setEditingJournalEntry(null); }}
        onSave={handleJournalSave}
        entry={editingJournalEntry}
      />

      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertVisible(false)}
      />

    </View>
  );
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
  competeButton: {
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: theme.colors.border, flex: 1,
  },
  competeButtonText: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  deleteButton: {
    backgroundColor: '#111111',
    borderWidth: 1, borderColor: theme.colors.border, flex: 1,
  },
  emptyState: { padding: 32, alignItems: 'center', marginTop: 32, margin: 16 },
  emptyStateTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  emptyStateText: { color: theme.colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
