/**
 * StepCountDiagnostics - Shows step counting status with fix buttons
 * Helps users diagnose and fix step tracking issues on Android
 *
 * Displays:
 * 1. Active Source (Native sensor vs Health Connect vs None)
 * 2. Native Step Tracking (Running vs Not running)
 * 3. Health Connect SDK (Available vs Needs update)
 * 4. Steps Permission (Granted vs Not granted)
 * 5. Privacy ROM Guidance (GrapheneOS, CalyxOS specific instructions)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import {
  stepDiagnosticsService,
  type StepDiagnosticStatus,
} from '../../services/activity/StepDiagnosticsService';
import { nativeStepCounterService } from '../../services/activity/NativeStepCounterService';
import healthConnectService from '../../services/fitness/healthConnectService';

export const StepCountDiagnostics: React.FC = () => {
  const [status, setStatus] = useState<StepDiagnosticStatus>({
    activeSource: 'none',
    nativeSensorRunning: false,
    backgroundTrackingEnabled: false,
    healthConnectSdkAvailable: false,
    healthConnectSdkStatus: 1,
    stepsPermissionGranted: false,
    romType: 'stock',
    isPrivacyROM: false,
    sensorNotes: null,
    androidVersion: 0,
    isLoading: true,
  });

  const checkStatus = useCallback(async () => {
    setStatus((prev) => ({ ...prev, isLoading: true }));

    try {
      const diagnostics = await stepDiagnosticsService.getDiagnostics();
      setStatus({
        ...diagnostics,
        isLoading: false,
      });
    } catch (error) {
      console.error('[StepCountDiagnostics] Error checking status:', error);
      setStatus((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Fix handlers
  const handleEnableBackgroundTracking = async () => {
    try {
      await nativeStepCounterService.setBackgroundTrackingEnabled(true);
      // Check if it actually started
      const isRunning = nativeStepCounterService.isServiceRunning();
      if (!isRunning) {
        Alert.alert(
          'Step Tracking Failed',
          'The step sensor could not be started. This may be due to:\n\n' +
            '1. Device does not have a step counter sensor\n' +
            '2. Sensor permissions are blocked\n' +
            '3. A system restriction is preventing access\n\n' +
            'Try restarting the app or checking your device settings.',
          [{ text: 'OK' }]
        );
      }
      // Refresh status after enabling
      setTimeout(checkStatus, 500);
    } catch (error) {
      console.error('[StepCountDiagnostics] Error enabling tracking:', error);
      Alert.alert('Error', 'Failed to enable background step tracking');
    }
  };

  const handleFixHealthConnectSdk = () => {
    // SDK status 2 = update required, open Play Store
    if (status.healthConnectSdkStatus === 2) {
      Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata');
    } else {
      // SDK unavailable - show guidance
      Alert.alert(
        'Health Connect Not Available',
        'Health Connect requires Android 14 or the Health Connect app from Play Store.\n\n' +
          '1. Update to Android 14+\n' +
          '   OR\n' +
          '2. Install Health Connect from Play Store',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Play Store',
            onPress: () =>
              Linking.openURL(
                'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata'
              ),
          },
        ]
      );
    }
  };

  const handleRequestStepsPermission = async () => {
    try {
      const result = await healthConnectService.requestPermissions();
      if (result.success) {
        setTimeout(checkStatus, 500);
      } else {
        Alert.alert(
          'Permission Required',
          'RUNSTR needs permission to read step data from Health Connect.\n\n' +
            '1. Tap "Open Settings"\n' +
            '2. Find RUNSTR in the app list\n' +
            '3. Enable "Steps" permission',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: async () => {
                try {
                  await healthConnectService.openHealthConnectSettings();
                } catch {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('[StepCountDiagnostics] Error requesting permission:', error);
    }
  };

  const handleFixPrivacyROM = () => {
    const romName =
      status.romType === 'grapheneos'
        ? 'GrapheneOS'
        : status.romType === 'calyxos'
          ? 'CalyxOS'
          : status.romType === 'lineageos'
            ? 'LineageOS'
            : status.romType === 'divestos'
              ? 'DivestOS'
              : 'Privacy ROM';

    let instructions = status.sensorNotes || '';

    if (status.romType === 'grapheneos') {
      instructions =
        'GrapheneOS blocks sensor access by default:\n\n' +
        '1. Open Settings\n' +
        '2. Go to Apps → RUNSTR\n' +
        '3. Tap Permissions\n' +
        '4. Enable "Sensors" permission\n\n' +
        'This allows RUNSTR to count your steps.';
    } else if (status.romType === 'calyxos') {
      instructions =
        'CalyxOS may block sensor access:\n\n' +
        '1. Check Datura Firewall settings\n' +
        '2. Allow RUNSTR sensor access\n' +
        '3. If using MicroG, ensure it\'s configured correctly';
    }

    Alert.alert(`${romName} Detected`, instructions, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: () => Linking.openSettings(),
      },
    ]);
  };

  // Don't render on iOS
  if (Platform.OS !== 'android') {
    return null;
  }

  // Calculate overall status
  const allGood =
    status.activeSource !== 'none' &&
    (status.nativeSensorRunning || (status.healthConnectSdkAvailable && status.stepsPermissionGranted));

  const hasIssues = status.activeSource === 'none';

  // Determine active source display text
  const getActiveSourceText = (): string => {
    switch (status.activeSource) {
      case 'native':
        return 'Native sensor';
      case 'health_connect':
        return 'Health Connect';
      default:
        return 'No step source';
    }
  };

  // Get Health Connect SDK status text
  const getHealthConnectSdkText = (): string => {
    switch (status.healthConnectSdkStatus) {
      case 3:
        return 'Available';
      case 2:
        return 'Update required';
      default:
        return 'Not available';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons
            name="footsteps"
            size={18}
            color={theme.colors.accent}
            style={styles.headerIcon}
          />
          <Text style={styles.title}>Step Count Tracking</Text>
        </View>
        {allGood && (
          <View style={styles.allGoodBadge}>
            <Ionicons name="checkmark-circle" size={14} color={theme.colors.accent} />
            <Text style={styles.allGoodText}>All Set</Text>
          </View>
        )}
      </View>
      <Text style={styles.subtitle}>
        {hasIssues
          ? 'Fix issues below for accurate step counting'
          : 'Your device is configured for step tracking'}
      </Text>

      {status.isLoading ? (
        <ActivityIndicator
          size="small"
          color={theme.colors.accent}
          style={styles.loader}
        />
      ) : (
        <>
          {/* Active Source */}
          <StatusRow
            label="Active Source"
            isGood={status.activeSource !== 'none'}
            goodText={getActiveSourceText()}
            badText="No step source"
            badDescription="Enable background tracking or Health Connect"
            onFix={handleEnableBackgroundTracking}
            isImportant
          />

          {/* Native Tracking */}
          <StatusRow
            label="Background Step Tracking"
            isGood={status.backgroundTrackingEnabled && status.nativeSensorRunning}
            goodText={status.nativeSensorRunning ? 'Running' : 'Enabled'}
            badText={status.backgroundTrackingEnabled ? 'Not running' : 'Disabled'}
            badDescription="Enable in Settings → Fitness Tracking"
            onFix={handleEnableBackgroundTracking}
          />

          {/* Health Connect SDK */}
          <StatusRow
            label="Health Connect SDK"
            isGood={status.healthConnectSdkAvailable}
            goodText={getHealthConnectSdkText()}
            badText={getHealthConnectSdkText()}
            badDescription={
              status.healthConnectSdkStatus === 2
                ? 'Update Health Connect from Play Store'
                : 'Requires Android 14 or Health Connect app'
            }
            onFix={handleFixHealthConnectSdk}
          />

          {/* Steps Permission (only show if SDK is available) */}
          {status.healthConnectSdkAvailable && (
            <StatusRow
              label="Steps Permission"
              isGood={status.stepsPermissionGranted}
              goodText="Granted"
              badText="Not granted"
              badDescription="RUNSTR needs permission to read steps"
              onFix={handleRequestStepsPermission}
            />
          )}

          {/* Privacy ROM Card */}
          {status.isPrivacyROM && (
            <View style={styles.romCard}>
              <View style={styles.romHeader}>
                <Ionicons
                  name="shield-checkmark"
                  size={16}
                  color={theme.colors.accent}
                />
                <Text style={styles.romTitle}>
                  {status.romType === 'grapheneos'
                    ? 'GrapheneOS'
                    : status.romType === 'calyxos'
                      ? 'CalyxOS'
                      : status.romType === 'lineageos'
                        ? 'LineageOS'
                        : status.romType === 'divestos'
                          ? 'DivestOS'
                          : 'Privacy ROM'}{' '}
                  Detected
                </Text>
              </View>
              <Text style={styles.romDescription}>
                {status.romType === 'grapheneos'
                  ? 'Enable Sensors permission in Settings → Apps → RUNSTR → Permissions'
                  : status.romType === 'calyxos'
                    ? 'Check Datura Firewall settings to allow sensor access'
                    : 'Some sensor permissions may be restricted'}
              </Text>
              <TouchableOpacity
                style={styles.romButton}
                onPress={handleFixPrivacyROM}
                activeOpacity={0.7}
              >
                <Text style={styles.romButtonText}>View Instructions</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          )}

          {/* Device Info & Refresh */}
          <View style={styles.footer}>
            <Text style={styles.deviceInfo}>
              Android {status.androidVersion}
              {status.isPrivacyROM ? ` • ${status.romType}` : ''}
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={checkStatus}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={16} color={theme.colors.textMuted} />
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

// Status Row Component
interface StatusRowProps {
  label: string;
  isGood: boolean;
  goodText: string;
  badText: string;
  badDescription: string;
  onFix: () => void;
  isImportant?: boolean;
}

const StatusRow: React.FC<StatusRowProps> = ({
  label,
  isGood,
  goodText,
  badText,
  badDescription,
  onFix,
  isImportant,
}) => {
  const iconColor = isGood ? theme.colors.accent : theme.colors.textMuted;
  const iconName = isGood ? 'checkmark-circle' : 'alert-circle';

  return (
    <View style={styles.statusRow}>
      <View style={styles.statusLeft}>
        <View style={styles.labelRow}>
          <Text style={styles.statusLabel}>{label}</Text>
          {isImportant && !isGood && (
            <View style={styles.importantBadge}>
              <Text style={styles.importantText}>CRITICAL</Text>
            </View>
          )}
        </View>
        <View style={styles.statusValueRow}>
          <Ionicons
            name={iconName as any}
            size={16}
            color={iconColor}
            style={styles.statusIcon}
          />
          <Text style={[styles.statusValue, { color: iconColor }]}>
            {isGood ? goodText : badText}
          </Text>
        </View>
        {!isGood && <Text style={styles.statusDescription}>{badDescription}</Text>}
      </View>
      {!isGood && (
        <TouchableOpacity style={styles.fixButton} onPress={onFix} activeOpacity={0.7}>
          <Text style={styles.fixButtonText}>Fix</Text>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.text} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  allGoodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 123, 28, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  allGoodText: {
    fontSize: 11,
    color: theme.colors.accent,
    fontWeight: '600',
    marginLeft: 4,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 12,
  },
  loader: {
    marginVertical: 20,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statusLeft: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  importantBadge: {
    backgroundColor: theme.colors.text,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  importantText: {
    fontSize: 9,
    color: theme.colors.background,
    fontWeight: '700',
  },
  statusValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 6,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusDescription: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  fixButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.text,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12,
  },
  fixButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    marginRight: 2,
  },
  romCard: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 123, 28, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 123, 28, 0.2)',
  },
  romHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  romTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.accent,
    marginLeft: 6,
  },
  romDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  romButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.text,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  romButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    marginRight: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
  },
  deviceInfo: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginLeft: 4,
  },
});
