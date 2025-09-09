/**
 * WorkoutSyncStatus - Nostr Workout Sync Status Component
 * Displays sync status, relay connections, and manual sync controls
 * Integrates with existing theme system and UI patterns
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  Alert,
} from 'react-native';
import { theme } from '../../styles/theme';
import { NostrWorkoutSyncService } from '../../services/fitness/nostrWorkoutSyncService';
import type {
  NostrSyncStatus,
  NostrWorkoutCache,
  NostrWorkoutSyncResult,
} from '../../types/nostrWorkout';

interface WorkoutSyncStatusProps {
  userId: string;
  pubkey: string;
  onManualSync?: () => void;
  style?: ViewStyle;
  showDetails?: boolean;
  compact?: boolean;
}

export const WorkoutSyncStatus: React.FC<WorkoutSyncStatusProps> = ({
  userId,
  pubkey,
  onManualSync,
  style,
  showDetails = true,
  compact = false,
}) => {
  const [syncStatus, setSyncStatus] = useState<NostrSyncStatus>('idle');
  const [cache, setCache] = useState<NostrWorkoutCache | null>(null);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] =
    useState<NostrWorkoutSyncResult | null>(null);

  const syncService = NostrWorkoutSyncService.getInstance();

  useEffect(() => {
    loadCacheData();
    updateSyncStatus();

    // Update status periodically
    const interval = setInterval(() => {
      updateSyncStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [userId]);

  const loadCacheData = async () => {
    try {
      const cacheData = await syncService.getUserCache(userId);
      setCache(cacheData);

      // Get last sync result from cache
      if (cacheData.syncHistory.length > 0) {
        setLastSyncResult(
          cacheData.syncHistory[cacheData.syncHistory.length - 1]
        );
      }
    } catch (error) {
      console.error('Failed to load cache data:', error);
    }
  };

  const updateSyncStatus = () => {
    const currentStatus = syncService.getSyncStatus();
    setSyncStatus(currentStatus);
  };

  const handleManualSync = async () => {
    if (isManualSyncing) return;

    setIsManualSyncing(true);
    try {
      const result = await syncService.triggerManualSync(userId, pubkey);
      setLastSyncResult(result);
      await loadCacheData();

      if (onManualSync) {
        onManualSync();
      }

      // Show result feedback
      if (result.status === 'completed') {
        Alert.alert(
          'Sync Complete',
          `Imported ${result.parsedWorkouts} workouts`
        );
      } else if (result.status === 'partial_error') {
        Alert.alert(
          'Partial Sync',
          `Imported ${result.parsedWorkouts} workouts with ${result.failedEvents} errors`
        );
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
      Alert.alert('Sync Failed', 'Unable to sync workouts. Please try again.');
    } finally {
      setIsManualSyncing(false);
    }
  };

  const getStatusColor = (status: NostrSyncStatus): string => {
    switch (status) {
      case 'completed':
        return theme.colors.statusConnected;
      case 'syncing':
      case 'connecting':
        return '#FF9500'; // Orange for in-progress
      case 'error':
        return '#FF3B30'; // Red for errors
      case 'partial_error':
        return '#FF9500'; // Orange for partial errors
      default:
        return theme.colors.textMuted;
    }
  };

  const getStatusText = (status: NostrSyncStatus): string => {
    switch (status) {
      case 'idle':
        return 'Ready to sync';
      case 'connecting':
        return 'Connecting to relays...';
      case 'syncing':
        return 'Syncing workouts...';
      case 'completed':
        return 'Sync completed';
      case 'error':
        return 'Sync failed';
      case 'partial_error':
        return 'Partial sync completed';
      default:
        return 'Unknown status';
    }
  };

  const getStatusIcon = (status: NostrSyncStatus): string => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'syncing':
      case 'connecting':
        return '🔄';
      case 'error':
        return '❌';
      case 'partial_error':
        return '⚠️';
      default:
        return '⚪';
    }
  };

  const formatLastSyncTime = (): string => {
    if (!cache?.lastSyncAt) return 'Never synced';

    const lastSync = new Date(cache.lastSyncAt);
    const now = new Date();
    const diffMinutes = Math.floor(
      (now.getTime() - lastSync.getTime()) / (1000 * 60)
    );

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getRelayStatus = (): { connected: number; total: number } => {
    if (!cache?.relayStatus) return { connected: 0, total: 0 };

    const relayEntries = Object.values(cache.relayStatus);
    const connected = relayEntries.filter(
      (r) => r.status === 'connected'
    ).length;
    return { connected, total: relayEntries.length };
  };

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <View style={styles.compactStatus}>
          <Text
            style={[styles.statusIcon, { color: getStatusColor(syncStatus) }]}
          >
            {getStatusIcon(syncStatus)}
          </Text>
          <Text style={styles.compactText}>{formatLastSyncTime()}</Text>
        </View>

        <TouchableOpacity
          onPress={handleManualSync}
          disabled={isManualSyncing || syncStatus === 'syncing'}
          style={styles.compactSyncButton}
        >
          {isManualSyncing ? (
            <ActivityIndicator size="small" color={theme.colors.text} />
          ) : (
            <Text style={styles.compactSyncText}>↻</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Main Status */}
      <View style={styles.statusRow}>
        <View style={styles.statusInfo}>
          <View style={styles.statusIndicator}>
            {syncStatus === 'syncing' || isManualSyncing ? (
              <ActivityIndicator
                size="small"
                color={getStatusColor(syncStatus)}
              />
            ) : (
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor(syncStatus) },
                ]}
              />
            )}
            <Text style={styles.statusText}>{getStatusText(syncStatus)}</Text>
          </View>

          {showDetails && (
            <Text style={styles.lastSyncText}>
              Last sync: {formatLastSyncTime()}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={handleManualSync}
          disabled={isManualSyncing || syncStatus === 'syncing'}
          style={[
            styles.syncButton,
            (isManualSyncing || syncStatus === 'syncing') &&
              styles.syncButtonDisabled,
          ]}
        >
          {isManualSyncing ? (
            <ActivityIndicator size="small" color={theme.colors.text} />
          ) : (
            <Text style={styles.syncButtonText}>Sync Now</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Detailed Information */}
      {showDetails && (
        <>
          {/* Relay Status */}
          <View style={styles.relayStatus}>
            <Text style={styles.sectionTitle}>Relay Connections</Text>
            <View style={styles.relayInfo}>
              {(() => {
                const { connected, total } = getRelayStatus();
                return (
                  <Text style={styles.relayText}>
                    {connected}/{total} relays connected
                  </Text>
                );
              })()}
            </View>
          </View>

          {/* Workout Count */}
          {cache && (
            <View style={styles.workoutInfo}>
              <Text style={styles.sectionTitle}>Imported Workouts</Text>
              <Text style={styles.workoutCount}>
                {cache.workoutCount} workouts stored locally
              </Text>
            </View>
          )}

          {/* Last Sync Result */}
          {lastSyncResult && (
            <View style={styles.syncResult}>
              <Text style={styles.sectionTitle}>Last Sync Result</Text>
              <Text style={styles.syncResultText}>
                {lastSyncResult.parsedWorkouts} workouts imported
                {lastSyncResult.failedEvents > 0 &&
                  `, ${lastSyncResult.failedEvents} failed`}
              </Text>
              {lastSyncResult.errors.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    const errorSummary = lastSyncResult.errors
                      .map((e) => `${e.type}: ${e.message}`)
                      .join('\n');
                    Alert.alert('Sync Errors', errorSummary);
                  }}
                  style={styles.errorButton}
                >
                  <Text style={styles.errorButtonText}>
                    View {lastSyncResult.errors.length} errors
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statusInfo: {
    flex: 1,
    marginRight: 12,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  statusIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  lastSyncText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  syncButton: {
    backgroundColor: theme.colors.button,
    borderWidth: 1,
    borderColor: theme.colors.buttonBorder,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  relayStatus: {
    marginBottom: 12,
  },
  relayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  relayText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  workoutInfo: {
    marginBottom: 12,
  },
  workoutCount: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  syncResult: {
    marginBottom: 8,
  },
  syncResultText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  errorButton: {
    alignSelf: 'flex-start',
  },
  errorButtonText: {
    color: '#FF9500',
    fontSize: 12,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  compactStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  compactText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginLeft: 4,
  },
  compactSyncButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: theme.colors.button,
    borderWidth: 1,
    borderColor: theme.colors.buttonBorder,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactSyncText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WorkoutSyncStatus;
