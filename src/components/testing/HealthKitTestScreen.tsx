/**
 * HealthKit Test Screen - Development testing interface
 * Use this screen to test HealthKit integration during development
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  SafeAreaView,
  Platform,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import healthKitService from '../../services/fitness/healthKitService';
import { theme } from '../../styles/theme';
import { Card } from '../ui/Card';

export const HealthKitTestScreen: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({
    available: false,
    authorized: false,
    syncInProgress: false,
    lastSyncAt: undefined as string | undefined,
  });

  useEffect(() => {
    checkInitialStatus();
  }, []);

  const addLog = (
    message: string,
    type: 'info' | 'success' | 'error' = 'info'
  ) => {
    const timestamp = new Date().toLocaleTimeString();
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    const logMessage = `${timestamp} ${emoji} ${message}`;
    setLogs((prev) => [logMessage, ...prev.slice(0, 19)]); // Keep last 20 logs
  };

  const checkInitialStatus = () => {
    const healthKitStatus = healthKitService.getStatus();
    setStatus({
      ...healthKitStatus,
      lastSyncAt: healthKitStatus.lastSyncAt || undefined
    });

    if (!healthKitStatus.available) {
      addLog('HealthKit not available on this device', 'error');
    } else if (healthKitStatus.authorized) {
      addLog('HealthKit already authorized', 'success');
    } else {
      addLog('HealthKit available but not authorized', 'info');
    }
  };

  const testPermissions = async () => {
    setIsLoading(true);
    addLog('Testing HealthKit permissions...');

    try {
      const result = await healthKitService.initialize();

      if (result.success) {
        addLog('HealthKit permissions granted successfully!', 'success');
        setStatus({
          ...healthKitService.getStatus(),
          lastSyncAt: healthKitService.getStatus().lastSyncAt || undefined
        });
      } else {
        addLog(`Permission failed: ${result.error}`, 'error');

        Alert.alert(
          'Permission Required',
          'To test HealthKit, please enable permissions in iPhone Settings > Privacy & Security > Health > RUNSTR',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      addLog(`Permission error: ${errorMessage}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const testWorkoutSync = async () => {
    setIsLoading(true);
    addLog('Testing workout sync...');

    try {
      const result = await healthKitService.syncWorkouts(
        'test_user_123',
        'test_team_456'
      );

      if (result.success) {
        addLog(
          `Sync successful! ${result.workoutsCount} total, ${result.newWorkouts} new, ${result.skippedWorkouts} skipped`,
          'success'
        );

        if ((result.newWorkouts || 0) > 0) {
          Alert.alert(
            'Workouts Found! 🎉',
            `Successfully synced ${result.newWorkouts} new workouts from Apple Health`,
            [{ text: 'Great!' }]
          );
        } else {
          Alert.alert(
            'Sync Complete ✅',
            'Your Apple Health workouts are up to date',
            [{ text: 'OK' }]
          );
        }

        setStatus({
          ...healthKitService.getStatus(),
          lastSyncAt: healthKitService.getStatus().lastSyncAt || undefined
        });
      } else {
        addLog(`Sync failed: ${result.error}`, 'error');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      addLog(`Sync error: ${errorMessage}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const testReauthorize = async () => {
    setIsLoading(true);
    addLog('Testing re-authorization...');

    try {
      const result = await healthKitService.reauthorize();

      if (result.success) {
        addLog('Re-authorization successful!', 'success');
        setStatus({
          ...healthKitService.getStatus(),
          lastSyncAt: healthKitService.getStatus().lastSyncAt || undefined
        });
      } else {
        addLog(`Re-authorization failed: ${result.error}`, 'error');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      addLog(`Re-authorization error: ${errorMessage}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('Logs cleared');
  };

  const refreshStatus = () => {
    const healthKitStatus = healthKitService.getStatus();
    setStatus({
      ...healthKitStatus,
      lastSyncAt: healthKitStatus.lastSyncAt || undefined
    });
    addLog('Status refreshed');
  };

  const StatusIndicator: React.FC<{
    label: string;
    value: boolean | string | undefined;
    type?: 'boolean' | 'string';
  }> = ({ label, value, type = 'boolean' }) => (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>{label}:</Text>
      <View
        style={[
          styles.statusValue,
          type === 'boolean'
            ? value
              ? styles.statusSuccess
              : styles.statusError
            : styles.statusInfo,
        ]}
      >
        <Text style={styles.statusText}>
          {type === 'boolean' ? (value ? 'Yes' : 'No') : value || 'N/A'}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>HealthKit Integration Test</Text>

        {/* Status Card */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Current Status</Text>
          <StatusIndicator label="Available" value={status.available} />
          <StatusIndicator label="Authorized" value={status.authorized} />
          <StatusIndicator
            label="Sync In Progress"
            value={status.syncInProgress}
          />
          <StatusIndicator
            label="Last Sync"
            value={
              status.lastSyncAt
                ? new Date(status.lastSyncAt).toLocaleString()
                : undefined
            }
            type="string"
          />
        </Card>

        {/* Test Buttons */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Test Actions</Text>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={testPermissions}
            disabled={isLoading}
          >
            <AntDesign name="lock" size={16} color={theme.colors.text} />
            <Text style={styles.buttonText}>Test Permissions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={testWorkoutSync}
            disabled={isLoading || !status.authorized}
          >
            <AntDesign name="sync" size={16} color={theme.colors.text} />
            <Text style={styles.buttonText}>Test Workout Sync</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={testReauthorize}
            disabled={isLoading}
          >
            <AntDesign name="reload1" size={16} color={theme.colors.text} />
            <Text style={styles.buttonText}>Re-authorize</Text>
          </TouchableOpacity>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.utilityButton]}
              onPress={refreshStatus}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Refresh Status</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.utilityButton]}
              onPress={clearLogs}
            >
              <Text style={styles.buttonText}>Clear Logs</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Logs */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Test Logs ({logs.length})</Text>
          {logs.length === 0 ? (
            <Text style={styles.noLogsText}>No logs yet. Run some tests!</Text>
          ) : (
            <View style={styles.logsContainer}>
              {logs.map((log, index) => (
                <Text key={index} style={styles.logText}>
                  {log}
                </Text>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  statusValue: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 60,
    alignItems: 'center',
  },
  statusSuccess: {
    backgroundColor: '#0a84ff20',
  },
  statusError: {
    backgroundColor: '#ff444420',
  },
  statusInfo: {
    backgroundColor: theme.colors.textSecondary + '20',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: theme.colors.buttonHover,
  },
  utilityButton: {
    backgroundColor: theme.colors.border,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  buttonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  logsContainer: {
    maxHeight: 200,
  },
  logText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  noLogsText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    padding: 20,
  },
});
