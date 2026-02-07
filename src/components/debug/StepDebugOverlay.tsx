/**
 * StepDebugOverlay - Diagnostic overlay for step counting on Android
 *
 * Shows real-time step counting diagnostic info to help diagnose why
 * steps might not be tracking on certain Android devices.
 *
 * Displays:
 * - Active step source (native / health_connect / none)
 * - Native sensor status
 * - Background tracking status
 * - Today's step count
 * - Health Connect SDK availability
 * - ROM type detection
 * - Android version
 *
 * Android-only: returns null on iOS (iOS uses HealthKit path).
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
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import {
  stepDiagnosticsService,
  type StepDiagnosticStatus,
} from '../../services/activity/StepDiagnosticsService';
import { nativeStepCounterService } from '../../services/activity/NativeStepCounterService';

const POLL_INTERVAL_MS = 2000;

const STATUS_COLORS = {
  good: theme.colors.success,
  warning: theme.colors.accent,
  bad: '#FF5500',
  neutral: '#6b7280',
};

const MONO_FONT = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

/** Format a Date or null to a short time string */
const formatTime = (date: Date | null): string => {
  if (!date) return 'N/A';
  return date.toLocaleTimeString();
};

/** Map SDK status number to readable string */
const sdkStatusLabel = (status: number): string => {
  switch (status) {
    case 1:
      return 'Unavailable';
    case 2:
      return 'Update Required';
    case 3:
      return 'Available';
    default:
      return `Unknown (${status})`;
  }
};

const sdkStatusColor = (status: number): string => {
  switch (status) {
    case 3:
      return STATUS_COLORS.good;
    case 2:
      return STATUS_COLORS.warning;
    default:
      return STATUS_COLORS.bad;
  }
};

interface DiagSnapshot extends StepDiagnosticStatus {
  todaySteps: number;
  trackingStartTime: Date | null;
  lastPollTime: Date;
}

export const StepDebugOverlay: React.FC = () => {
  // Disabled for production - uncomment below for debug builds
  return null;

  // Android-only component
  if (Platform.OS !== 'android') return null;

  const [isExpanded, setIsExpanded] = useState(false);
  const [snapshot, setSnapshot] = useState<DiagSnapshot | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Poll diagnostics
  useEffect(() => {
    let mounted = true;

    const poll = async () => {
      try {
        const diag = await stepDiagnosticsService.getDiagnostics();
        let todaySteps = 0;
        try {
          todaySteps = await nativeStepCounterService.getTodaySteps();
        } catch {
          // ignore – may not be initialized
        }
        const trackingStartTime = nativeStepCounterService.getTrackingStartTime();

        if (mounted) {
          setSnapshot({
            ...diag,
            todaySteps,
            trackingStartTime,
            lastPollTime: new Date(),
          });
        }
      } catch (e) {
        console.error('[StepDebugOverlay] Poll error:', e);
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const copyToClipboard = useCallback(async () => {
    if (!snapshot) return;

    const text = `
RUNSTR Step Debug - ${new Date().toISOString()}

=== STEP SOURCE ===
Active Source: ${snapshot.activeSource}

=== NATIVE SENSOR ===
Running: ${snapshot.nativeSensorRunning ? 'YES' : 'NO'}
BG Tracking: ${snapshot.backgroundTrackingEnabled ? 'Enabled' : 'Disabled'}
Today's Steps: ${snapshot.todaySteps}
Session Start: ${formatTime(snapshot.trackingStartTime)}

=== HEALTH CONNECT ===
SDK Status: ${sdkStatusLabel(snapshot.healthConnectSdkStatus)}
Steps Permission: ${snapshot.stepsPermissionGranted ? 'Granted' : 'Denied'}

=== DEVICE ===
ROM Type: ${snapshot.romType}${snapshot.isPrivacyROM ? ' (Privacy ROM)' : ''}
Android Version: ${snapshot.androidVersion}
${snapshot.sensorNotes ? `Notes: ${snapshot.sensorNotes}` : ''}

Last Poll: ${snapshot.lastPollTime.toISOString()}
    `.trim();

    try {
      await Clipboard.setStringAsync(text);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (e) {
      console.error('[StepDebugOverlay] Copy failed:', e);
    }
  }, [snapshot]);

  const sourceColor = (source: string): string => {
    switch (source) {
      case 'native':
        return STATUS_COLORS.good;
      case 'health_connect':
        return STATUS_COLORS.warning;
      default:
        return STATUS_COLORS.bad;
    }
  };

  const boolColor = (val: boolean): string =>
    val ? STATUS_COLORS.good : STATUS_COLORS.bad;

  return (
    <View style={styles.container}>
      {/* Floating bug icon */}
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <Ionicons
          name="bug-outline"
          size={20}
          color={isExpanded ? '#ff6b35' : '#888'}
        />
      </TouchableOpacity>

      {/* Expanded panel */}
      {isExpanded && snapshot && (
        <View style={styles.panel}>
          {/* Header */}
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>STEP DEBUG</Text>
            <TouchableOpacity
              style={[styles.copyBtn, copyFeedback && styles.copyBtnSuccess]}
              onPress={copyToClipboard}
              activeOpacity={0.8}
            >
              <Ionicons
                name={copyFeedback ? 'checkmark' : 'copy-outline'}
                size={14}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.panelContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Active Source */}
            <StatusRow
              label="Active Source"
              value={snapshot.activeSource}
              color={sourceColor(snapshot.activeSource)}
            />

            {/* Native Sensor */}
            <StatusRow
              label="Native Sensor"
              value={snapshot.nativeSensorRunning ? 'Running' : 'Stopped'}
              color={boolColor(snapshot.nativeSensorRunning)}
            />

            {/* BG Tracking */}
            <StatusRow
              label="BG Tracking"
              value={snapshot.backgroundTrackingEnabled ? 'Enabled' : 'Disabled'}
              color={boolColor(snapshot.backgroundTrackingEnabled)}
            />

            {/* Today's Steps */}
            <StatusRow
              label="Today's Steps"
              value={snapshot.todaySteps.toLocaleString()}
              color={STATUS_COLORS.neutral}
            />

            {/* Session Start */}
            <StatusRow
              label="Session Start"
              value={formatTime(snapshot.trackingStartTime)}
              color={STATUS_COLORS.neutral}
            />

            {/* HC SDK */}
            <StatusRow
              label="HC SDK"
              value={sdkStatusLabel(snapshot.healthConnectSdkStatus)}
              color={sdkStatusColor(snapshot.healthConnectSdkStatus)}
            />

            {/* HC Permission */}
            <StatusRow
              label="HC Permission"
              value={snapshot.stepsPermissionGranted ? 'Granted' : 'Denied'}
              color={boolColor(snapshot.stepsPermissionGranted)}
            />

            {/* ROM Type */}
            <StatusRow
              label="ROM Type"
              value={`${snapshot.romType}${snapshot.isPrivacyROM ? ' *' : ''}`}
              color={STATUS_COLORS.neutral}
            />

            {/* Android Version */}
            <StatusRow
              label="Android"
              value={`${snapshot.androidVersion}`}
              color={STATUS_COLORS.neutral}
            />

            {/* Last Poll */}
            <StatusRow
              label="Last Poll"
              value={`${Math.round((Date.now() - snapshot.lastPollTime.getTime()) / 1000)}s ago`}
              color={STATUS_COLORS.neutral}
            />

            {/* Sensor Notes */}
            {snapshot.sensorNotes && (
              <Text style={styles.noteText} numberOfLines={2}>
                {snapshot.sensorNotes}
              </Text>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

/** Single diagnostic row */
const StatusRow: React.FC<{
  label: string;
  value: string;
  color: string;
}> = ({ label, value, color }) => (
  <View style={styles.row}>
    <View style={[styles.dot, { backgroundColor: color }]} />
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 48,
    right: 12,
    zIndex: 999,
    alignItems: 'flex-end',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  panel: {
    marginTop: 4,
    width: 240,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: 360,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  panelTitle: {
    color: '#ff6b35',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: MONO_FONT,
    letterSpacing: 1,
  },
  copyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ff6b35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyBtnSuccess: {
    backgroundColor: '#22c55e',
  },
  panelContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  rowLabel: {
    color: '#888',
    fontSize: 10,
    fontFamily: MONO_FONT,
    flex: 1,
  },
  rowValue: {
    color: '#fff',
    fontSize: 10,
    fontFamily: MONO_FONT,
    textAlign: 'right',
  },
  noteText: {
    color: '#888',
    fontSize: 9,
    fontFamily: MONO_FONT,
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default StepDebugOverlay;
