/**
 * ActivityDebugOverlay - Diagnostic overlay for GPS death diagnosis
 *
 * Shows real-time debug info during workouts to help diagnose why GPS
 * stops working on certain Android devices (Samsung, GrapheneOS).
 *
 * Key diagnostic data:
 * - GPS subscription status
 * - Watchdog health
 * - TaskManager heartbeat
 * - Recovery attempts
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Device from 'expo-device';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { simpleRunTracker } from '../../services/activity/SimpleRunTracker';

// Status indicator colors - using orange theme variants
const STATUS_COLORS = {
  good: theme.colors.success, // Orange (#FF9D42)
  warning: theme.colors.accent, // Deep orange (#FF7B1C)
  bad: '#FF5500', // Dark orange for errors
  neutral: '#6b7280', // Gray
};

// Thresholds for status indicators
const THRESHOLDS = {
  watchdogStale: 10000, // 10 seconds
  watchdogDead: 30000, // 30 seconds
  heartbeatStale: 15000, // 15 seconds
  heartbeatDead: 30000, // 30 seconds
};

type DebugState = Awaited<ReturnType<typeof simpleRunTracker.getDebugState>>;

export const ActivityDebugOverlay: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [debugState, setDebugState] = useState<DebugState | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Poll debug state every second
  useEffect(() => {
    let mounted = true;

    const fetchDebugState = async () => {
      try {
        const state = await simpleRunTracker.getDebugState();
        if (mounted) {
          setDebugState(state);
        }
      } catch (e) {
        console.error('[DebugOverlay] Failed to get debug state:', e);
      }
    };

    // Initial fetch
    fetchDebugState();

    // Poll every second
    const interval = setInterval(fetchDebugState, 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const copyDebugLog = useCallback(async () => {
    if (!debugState) return;

    const logText = `
RUNSTR Debug Log - ${new Date().toISOString()}

=== DEVICE ===
Manufacturer: ${Device.manufacturer || 'Unknown'}
Model: ${Device.modelName || 'Unknown'}
Android: ${Platform.Version}
OS: ${Platform.OS}

=== GPS SUBSCRIPTION ===
Reports Active: ${debugState.subscriptionReportsActive ? 'YES' : 'NO'}
TaskManager Heartbeat: ${debugState.msSinceTaskHeartbeat}ms ago

=== WATCHDOG ===
Running: ${debugState.watchdogActive ? 'YES' : 'NO'}
Last Check: ${debugState.msSinceWatchdogCheck}ms ago

=== RECOVERY ===
Restart Attempts: ${debugState.gpsRestartAttempts}
Successes: ${debugState.recoverySuccesses}
Failures: ${debugState.recoveryFailures}
Last Error: ${debugState.lastRecoveryError || 'none'}

=== TRACKING ===
Distance: ${(debugState.runningDistance / 1000).toFixed(3)} km
Points Received: ${debugState.totalPointsReceived}
Last Accuracy: ${debugState.lastPointAccuracy.toFixed(1)}m
Cached Points: ${debugState.cachedPointsCount}

=== STATUS ===
Is Tracking: ${debugState.isTracking ? 'YES' : 'NO'}
Is Paused: ${debugState.isPaused ? 'YES' : 'NO'}

=== ERRORS ===
Last GPS Error: ${debugState.lastGPSError || 'none'}
    `.trim();

    try {
      await Clipboard.setStringAsync(logText);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (e) {
      console.error('[DebugOverlay] Failed to copy:', e);
    }
  }, [debugState]);

  // Helper to determine status color
  const getWatchdogColor = (): string => {
    if (!debugState) return STATUS_COLORS.neutral;
    if (!debugState.watchdogActive) return STATUS_COLORS.bad;
    if (debugState.msSinceWatchdogCheck > THRESHOLDS.watchdogDead)
      return STATUS_COLORS.bad;
    if (debugState.msSinceWatchdogCheck > THRESHOLDS.watchdogStale)
      return STATUS_COLORS.warning;
    return STATUS_COLORS.good;
  };

  const getHeartbeatColor = (): string => {
    if (!debugState) return STATUS_COLORS.neutral;
    if (debugState.msSinceTaskHeartbeat > THRESHOLDS.heartbeatDead)
      return STATUS_COLORS.bad;
    if (debugState.msSinceTaskHeartbeat > THRESHOLDS.heartbeatStale)
      return STATUS_COLORS.warning;
    return STATUS_COLORS.good;
  };

  const getSubscriptionColor = (): string => {
    if (!debugState) return STATUS_COLORS.neutral;
    return debugState.subscriptionReportsActive
      ? STATUS_COLORS.good
      : STATUS_COLORS.bad;
  };

  const formatMs = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // Show GPS dead banner if heartbeat is stale
  const showGPSDeadBanner =
    debugState &&
    debugState.isTracking &&
    debugState.msSinceTaskHeartbeat > THRESHOLDS.heartbeatDead;

  // Show watchdog stopped warning
  const showWatchdogWarning = debugState && !debugState.watchdogActive;

  return (
    <View style={styles.container}>
      {/* GPS Dead Banner */}
      {showGPSDeadBanner && (
        <View style={styles.deadBanner}>
          <Ionicons name="warning" size={20} color="#fff" />
          <Text style={styles.deadBannerText}>
            GPS DEAD - NO DATA FOR {formatMs(debugState.msSinceTaskHeartbeat)}
          </Text>
        </View>
      )}

      {/* Watchdog Warning */}
      {showWatchdogWarning && !showGPSDeadBanner && (
        <View style={styles.warningBanner}>
          <Ionicons name="alert-circle" size={20} color="#000" />
          <Text style={styles.warningBannerText}>WATCHDOG STOPPED</Text>
        </View>
      )}

      {/* Header - tap to expand/collapse */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.8}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="bug" size={16} color="#ff6b35" />
          <Text style={styles.headerText}>DEBUG</Text>
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-down' : 'chevron-up'}
          size={20}
          color="#888"
        />
      </TouchableOpacity>

      {/* Expanded content */}
      {isExpanded && debugState && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Device Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DEVICE</Text>
            <Text style={styles.value}>
              {Device.manufacturer} {Device.modelName}
            </Text>
            <Text style={styles.value}>Android {Platform.Version}</Text>
          </View>

          {/* GPS Subscription */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>GPS SUBSCRIPTION</Text>
            <View style={styles.row}>
              <View
                style={[
                  styles.indicator,
                  { backgroundColor: getSubscriptionColor() },
                ]}
              />
              <Text style={styles.label}>Active: </Text>
              <Text style={styles.value}>
                {debugState.subscriptionReportsActive ? 'YES' : 'NO'}
              </Text>
            </View>
          </View>

          {/* Watchdog */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>WATCHDOG</Text>
            <View style={styles.row}>
              <View
                style={[
                  styles.indicator,
                  { backgroundColor: getWatchdogColor() },
                ]}
              />
              <Text style={styles.label}>Running: </Text>
              <Text style={styles.value}>
                {debugState.watchdogActive ? 'YES' : 'NO'}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Last Check: </Text>
              <Text style={styles.value}>
                {formatMs(debugState.msSinceWatchdogCheck)} ago
              </Text>
            </View>
          </View>

          {/* TaskManager Heartbeat */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TASKMANAGER HEARTBEAT</Text>
            <View style={styles.row}>
              <View
                style={[
                  styles.indicator,
                  { backgroundColor: getHeartbeatColor() },
                ]}
              />
              <Text style={styles.label}>Last GPS: </Text>
              <Text style={styles.value}>
                {formatMs(debugState.msSinceTaskHeartbeat)} ago
              </Text>
            </View>
          </View>

          {/* Recovery Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RECOVERY</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Attempts: </Text>
              <Text style={styles.value}>{debugState.gpsRestartAttempts}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Success/Fail: </Text>
              <Text style={styles.value}>
                {debugState.recoverySuccesses}/{debugState.recoveryFailures}
              </Text>
            </View>
            {debugState.lastRecoveryError && (
              <Text style={styles.errorText} numberOfLines={2}>
                Error: {debugState.lastRecoveryError}
              </Text>
            )}
          </View>

          {/* Distance Tracking */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TRACKING</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Distance: </Text>
              <Text style={styles.value}>
                {(debugState.runningDistance / 1000).toFixed(3)} km
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Points: </Text>
              <Text style={styles.value}>{debugState.totalPointsReceived}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Accuracy: </Text>
              <Text style={styles.value}>
                {debugState.lastPointAccuracy.toFixed(1)}m
              </Text>
            </View>
          </View>

          {/* Errors */}
          {debugState.lastGPSError && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ERRORS</Text>
              <Text style={styles.errorText} numberOfLines={3}>
                {debugState.lastGPSError}
              </Text>
            </View>
          )}

          {/* Copy Button */}
          <TouchableOpacity
            style={[styles.copyButton, copyFeedback && styles.copyButtonSuccess]}
            onPress={copyDebugLog}
            activeOpacity={0.8}
          >
            <Ionicons
              name={copyFeedback ? 'checkmark' : 'copy'}
              size={18}
              color="#fff"
            />
            <Text style={styles.copyButtonText}>
              {copyFeedback ? 'COPIED!' : 'COPY DEBUG LOG'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
  },
  deadBanner: {
    backgroundColor: '#FF6B00',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deadBannerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  warningBanner: {
    backgroundColor: '#eab308',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  warningBannerText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    color: '#ff6b35',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#ff6b35',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  label: {
    color: '#888',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  value: {
    color: '#fff',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  errorText: {
    color: '#FF6B00',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 4,
  },
  copyButton: {
    backgroundColor: '#ff6b35',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  copyButtonSuccess: {
    backgroundColor: '#FF9D42',
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default ActivityDebugOverlay;
