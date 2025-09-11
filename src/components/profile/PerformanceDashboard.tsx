/**
 * PerformanceDashboard Component - Performance Analytics Display
 * Replaces basic "X workouts" display with meaningful performance metrics
 * Shows PRs, streaks, volume stats, and achievements
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons, AntDesign } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { Card } from '../ui/Card';
import { LoadingOverlay } from '../ui/LoadingStates';
import { WorkoutAnalyticsService } from '../../services/analytics/workoutAnalyticsService';
import type { UnifiedWorkout, WorkoutMergeResult } from '../../services/fitness/workoutMergeService';
import type { PerformanceAnalytics, PersonalRecord, WorkoutStreak, VolumeStats } from '../../services/analytics/workoutAnalyticsService';

interface PerformanceDashboardProps {
  mergeResult: WorkoutMergeResult;
  isLoading?: boolean;
}

type ViewMode = 'overview' | 'records' | 'trends';

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  mergeResult,
  isLoading = false
}) => {
  const [analytics, setAnalytics] = useState<PerformanceAnalytics | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Calculate analytics when workouts change
  useEffect(() => {
    calculateAnalytics();
  }, [mergeResult]);

  const calculateAnalytics = async () => {
    if (!mergeResult || mergeResult.allWorkouts.length === 0) {
      setAnalytics(null);
      setAnalyticsLoading(false);
      return;
    }

    setAnalyticsLoading(true);
    try {
      const result = await WorkoutAnalyticsService.calculateFullAnalytics(mergeResult.allWorkouts);
      setAnalytics(result);
    } catch (error) {
      console.error('PerformanceDashboard: Failed to calculate analytics:', error);
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Format time duration (seconds to readable format)
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Format distance (meters to readable format)
  const formatDistance = (meters: number): string => {
    const km = meters / 1000;
    if (km >= 1) {
      return `${km.toFixed(2)} km`;
    }
    return `${meters.toFixed(0)} m`;
  };

  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get icon for workout type
  const getWorkoutIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      running: 'directions-run',
      cycling: 'directions-bike',
      walking: 'directions-walk',
      swimming: 'pool',
      strength_training: 'fitness-center',
      yoga: 'self-improvement',
      hiking: 'terrain',
      default: 'fitness-center'
    };
    return iconMap[type] || iconMap.default;
  };

  // Render personal records section
  const renderPersonalRecords = () => {
    if (!analytics?.personalRecords?.length) return null;

    return (
      <View style={styles.recordsSection}>
        <Text style={styles.sectionTitle}>🏆 Personal Records</Text>
        {analytics.personalRecords.slice(0, 4).map((record: PersonalRecord, index: number) => (
          <View key={index} style={styles.recordItem}>
            <View style={styles.recordInfo}>
              <Text style={styles.recordDistance}>{record.distance}</Text>
              <Text style={styles.recordTime}>{formatTime(record.time)}</Text>
            </View>
            <Text style={styles.recordDate}>{formatDate(record.achievedAt)}</Text>
          </View>
        ))}
      </View>
    );
  };

  // Render streak information
  const renderStreak = () => {
    if (!analytics?.streak) return null;

    const streak = analytics.streak;
    return (
      <View style={styles.streakSection}>
        <View style={styles.streakItem}>
          <Text style={styles.streakLabel}>🔥 Current Streak</Text>
          <Text style={styles.streakValue}>{streak.current} days</Text>
        </View>
        <View style={styles.streakItem}>
          <Text style={styles.streakLabel}>⭐ Longest Streak</Text>
          <Text style={styles.streakValue}>{streak.longest} days</Text>
        </View>
      </View>
    );
  };

  // Render volume stats
  const renderVolumeStats = () => {
    if (!analytics?.thisYear) return null;

    const stats = analytics.thisYear;
    return (
      <View style={styles.volumeSection}>
        <Text style={styles.sectionTitle}>📊 This Year</Text>
        <View style={styles.volumeGrid}>
          <View style={styles.volumeItem}>
            <Text style={styles.volumeLabel}>Workouts</Text>
            <Text style={styles.volumeValue}>{stats.workoutCount}</Text>
          </View>
          <View style={styles.volumeItem}>
            <Text style={styles.volumeLabel}>Distance</Text>
            <Text style={styles.volumeValue}>{formatDistance(stats.totalDistance)}</Text>
          </View>
          <View style={styles.volumeItem}>
            <Text style={styles.volumeLabel}>Duration</Text>
            <Text style={styles.volumeValue}>{Math.floor(stats.totalDuration / 60)}h</Text>
          </View>
          <View style={styles.volumeItem}>
            <Text style={styles.volumeLabel}>Calories</Text>
            <Text style={styles.volumeValue}>{stats.totalCalories?.toLocaleString() || 0}</Text>
          </View>
        </View>
      </View>
    );
  };

  // Render activity breakdown
  const renderActivityBreakdown = () => {
    if (!analytics?.activityBreakdown?.length) return null;

    return (
      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>🏃‍♂️ Activity Types</Text>
        {analytics.activityBreakdown.slice(0, 3).map((activity, index) => (
          <View key={index} style={styles.activityItem}>
            <MaterialIcons 
              name="fitness-center" 
              size={16} 
              color={theme.colors.textSecondary} 
            />
            <Text style={styles.activityType}>{activity.type.replace('_', ' ')}</Text>
            <View style={styles.activityStats}>
              <Text style={styles.activityCount}>{activity.count}</Text>
              <Text style={styles.activityPercent}>({activity.percentage}%)</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  if (isLoading || analyticsLoading) {
    return (
      <Card style={styles.dashboardCard}>
        <LoadingOverlay message="Calculating performance metrics..." />
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card style={styles.dashboardCard}>
        <View style={styles.emptyState}>
          <MaterialIcons name="trending-up" size={32} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>No Performance Data</Text>
          <Text style={styles.emptySubtext}>Complete workouts to see your analytics</Text>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.dashboardCard}>
      {/* Header with view mode toggle */}
      <View style={styles.header}>
        <Text style={styles.title}>Performance Dashboard</Text>
        <View style={styles.toggleButtons}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'overview' && styles.activeToggle]}
            onPress={() => setViewMode('overview')}
          >
            <Text style={[styles.toggleText, viewMode === 'overview' && styles.activeToggleText]}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'records' && styles.activeToggle]}
            onPress={() => setViewMode('records')}
          >
            <Text style={[styles.toggleText, viewMode === 'records' && styles.activeToggleText]}>
              Records
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content based on view mode */}
      {viewMode === 'overview' && (
        <View style={styles.overviewContent}>
          {renderStreak()}
          {renderVolumeStats()}
          {renderActivityBreakdown()}
        </View>
      )}

      {viewMode === 'records' && (
        <View style={styles.recordsContent}>
          {renderPersonalRecords()}
        </View>
      )}

      {/* Data source breakdown (always visible) */}
      <View style={styles.sourceBreakdown}>
        <Text style={styles.sourceText}>
          HealthKit: {mergeResult.healthKitCount} • Nostr: {mergeResult.nostrCount}
        </Text>
        {mergeResult.duplicateCount > 0 && (
          <Text style={styles.sourceText}>
            ({mergeResult.duplicateCount} duplicates removed)
          </Text>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  dashboardCard: {
    margin: 16,
    padding: 16,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
  },

  toggleButtons: {
    flexDirection: 'row',
    backgroundColor: theme.colors.border,
    borderRadius: 6,
    padding: 2,
  },

  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },

  activeToggle: {
    backgroundColor: theme.colors.primary,
  },

  toggleText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },

  activeToggleText: {
    color: theme.colors.text,
  },

  overviewContent: {
    gap: 16,
  },

  recordsContent: {
    gap: 8,
  },

  sectionTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },

  // Streak styles
  streakSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  streakItem: {
    alignItems: 'center',
    flex: 1,
  },

  streakLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },

  streakValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
  },

  // Volume styles
  volumeSection: {
    gap: 8,
  },

  volumeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  volumeItem: {
    alignItems: 'center',
    width: '48%',
    marginBottom: 8,
  },

  volumeLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginBottom: 2,
  },

  volumeValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },

  // Records styles
  recordsSection: {
    gap: 8,
  },

  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  recordInfo: {
    flex: 1,
  },

  recordDistance: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },

  recordTime: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },

  recordDate: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },

  // Activity styles
  activitySection: {
    gap: 8,
  },

  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },

  activityType: {
    color: theme.colors.text,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    textTransform: 'capitalize',
  },

  activityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  activityCount: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },

  activityPercent: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },

  // Source breakdown styles
  sourceBreakdown: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    alignItems: 'center',
    gap: 4,
  },

  sourceText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },

  // Empty state styles
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },

  emptyTitle: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },

  emptySubtext: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
});