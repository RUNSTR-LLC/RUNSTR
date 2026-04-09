/**
 * WatchSyncSection
 * Settings UI for syncing Nostr identity to Apple Watch
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import {
  isWatchConnectivityAvailable,
  getWatchState,
  syncCredentialsToWatch,
  WatchState,
} from '../../services/watch/watchConnectivityService';

export function WatchSyncSection() {
  const [watchState, setWatchState] = useState<WatchState | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>(
    'idle'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadWatchState = useCallback(async () => {
    const state = await getWatchState();
    setWatchState(state);
  }, []);

  useEffect(() => {
    loadWatchState();
  }, [loadWatchState]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus('idle');
    setErrorMessage(null);

    const result = await syncCredentialsToWatch();

    setIsSyncing(false);
    if (result.success) {
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } else {
      setSyncStatus('error');
      setErrorMessage(result.error || 'Sync failed');
    }
  };

  // Don't render on non-iOS or if WatchConnectivity isn't available
  if (!isWatchConnectivityAvailable() || !watchState?.isSupported) {
    return null;
  }

  const canSync =
    watchState.isPaired && watchState.isWatchAppInstalled && !isSyncing;

  return (
    <View style={styles.container}>
      {/* Connection Status */}
      <View style={styles.statusRow}>
        <Ionicons
          name="watch"
          size={20}
          color={watchState.isPaired ? theme.colors.accent : '#6b7280'}
        />
        <Text style={styles.statusText}>
          {!watchState.isPaired
            ? 'No Apple Watch paired'
            : !watchState.isWatchAppInstalled
              ? 'RUNSTR Watch not installed'
              : watchState.isReachable
                ? 'Watch connected'
                : 'Watch paired (not reachable)'}
        </Text>
      </View>

      {/* Sync Button */}
      <TouchableOpacity
        style={[styles.syncButton, !canSync && styles.syncButtonDisabled]}
        onPress={handleSync}
        disabled={!canSync}
      >
        {isSyncing ? (
          <ActivityIndicator color={theme.colors.background} size="small" />
        ) : (
          <>
            <Ionicons
              name="sync"
              size={18}
              color={canSync ? '#000' : '#6b7280'}
            />
            <Text
              style={[
                styles.syncButtonText,
                !canSync && styles.syncButtonTextDisabled,
              ]}
            >
              Sync Identity to Watch
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Status Messages */}
      {syncStatus === 'success' && (
        <View style={styles.successMessage}>
          <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
          <Text style={styles.successText}>Identity sent to watch</Text>
        </View>
      )}

      {syncStatus === 'error' && errorMessage && (
        <View style={styles.errorMessage}>
          <Ionicons name="alert-circle" size={16} color={theme.colors.accent} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      <Text style={styles.helpText}>
        Transfers your Nostr identity to RUNSTR Watch for posting workouts
        directly from your wrist.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.text,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  syncButtonDisabled: {
    backgroundColor: '#1f1f1f',
  },
  syncButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 15,
  },
  syncButtonTextDisabled: {
    color: '#6b7280',
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  successText: {
    color: theme.colors.success,
    fontSize: 13,
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    color: theme.colors.accent,
    fontSize: 13,
  },
  helpText: {
    color: '#6b7280',
    fontSize: 12,
    lineHeight: 16,
  },
});

export default WatchSyncSection;
