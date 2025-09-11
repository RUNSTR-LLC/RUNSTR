/**
 * HealthKit Permission Card - Elegant permission request UI
 * Integrates with Profile tab for seamless workout sync setup
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, InteractionManager } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { Card } from '../ui/Card';
import healthKitService from '../../services/fitness/healthKitService';

interface HealthKitPermissionCardProps {
  userId: string;
  teamId?: string;
  onPermissionGranted?: (stats: {
    newWorkouts: number;
    totalWorkouts: number;
  }) => void;
  onPermissionDenied?: (error: string) => void;
  showStats?: boolean;
}

export const HealthKitPermissionCard: React.FC<
  HealthKitPermissionCardProps
> = ({
  userId,
  teamId,
  onPermissionGranted,
  onPermissionDenied,
  showStats = true,
}) => {
  const [status, setStatus] = useState<
    'unknown' | 'requesting' | 'granted' | 'denied' | 'syncing'
  >('unknown');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<{
    totalHealthKitWorkouts: number;
    lastSyncDate?: string;
  }>({ totalHealthKitWorkouts: 0 });

  // AbortController for cancelling long-running operations
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    checkCurrentStatus();
    
    // Cleanup abort controller on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const checkCurrentStatus = async () => {
    if (!healthKitService.getStatus().available) {
      setStatus('denied');
      return;
    }

    const healthKitStatus = healthKitService.getStatus();

    if (healthKitStatus.authorized) {
      setStatus('granted');
      if (showStats) {
        loadStats();
      }
    } else {
      setStatus('unknown');
    }
  };

  const loadStats = async () => {
    try {
      const syncStats = await healthKitService.getSyncStats(userId);
      setStats(syncStats);
    } catch (error) {
      console.error('Error loading HealthKit stats:', error);
    }
  };

  const cancelSync = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setStatus(status === 'requesting' ? 'unknown' : 'granted');
  };

  const requestPermissionAndSync = async () => {
    // Cancel any existing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new AbortController for this operation
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    setStatus('requesting');

    // Defer heavy operations until after UI interactions complete
    InteractionManager.runAfterInteractions(async () => {
      try {
        // Check if operation was cancelled before starting
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Operation cancelled');
        }

        // First request permissions
        const permissionResult = await healthKitService.initialize();

        // Check if operation was cancelled after permissions
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Operation cancelled');
        }

        if (!permissionResult.success) {
          setStatus('denied');
          onPermissionDenied?.(permissionResult.error || 'Permission denied');

          Alert.alert(
            'Permission Required',
            'To sync your Apple Health workouts with RUNSTR competitions, please enable permissions in iPhone Settings > Privacy & Security > Health > RUNSTR',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  // In a real app, you could use Linking.openSettings()
                  console.log('Open Settings requested');
                },
              },
            ]
          );
          setIsLoading(false);
          return;
        }

        // Permission granted, now sync workouts
        setStatus('syncing');
        
        // Check if operation was cancelled before sync
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Operation cancelled');
        }
        
        const syncResult = await healthKitService.syncWorkouts(userId, teamId);

        // Check if operation was cancelled after sync
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Operation cancelled');
        }

        if (syncResult.success) {
          setStatus('granted');

          const newWorkouts = syncResult.newWorkouts || 0;
          const totalWorkouts = syncResult.workoutsCount || 0;

          onPermissionGranted?.({ newWorkouts, totalWorkouts });

          if (newWorkouts > 0) {
            Alert.alert(
              'Apple Health Connected! 🍎',
              `Successfully synced ${newWorkouts} new workouts from Apple Health. These will automatically count toward your team competitions!`,
              [{ text: 'Awesome!' }]
            );
          } else {
            Alert.alert(
              'Apple Health Connected! 🍎',
              'RUNSTR will now automatically sync your workouts and include them in competitions. Your future workouts will appear here within 30 minutes.',
              [{ text: 'Great!' }]
            );
          }

          // Reload stats
          if (showStats) {
            await loadStats();
          }
        } else {
          setStatus('denied');
          onPermissionDenied?.(syncResult.error || 'Sync failed');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Handle cancellation gracefully
        if (errorMessage === 'Operation cancelled') {
          console.log('HealthKit operation was cancelled by user');
          // Don't change status for cancellation, just stop loading
        } else {
          setStatus('denied');
          onPermissionDenied?.(errorMessage);
          console.error('HealthKit setup error:', error);
        }
      } finally {
        setIsLoading(false);
        // Clear the abort controller when operation completes
        abortControllerRef.current = null;
      }
    });
  };

  const handleManualSync = async () => {
    if (status !== 'granted') return;

    // Cancel any existing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new AbortController for this operation
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    
    // Defer heavy sync operations until after UI interactions complete
    InteractionManager.runAfterInteractions(async () => {
      try {
        // Check if operation was cancelled before starting
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Operation cancelled');
        }

        const syncResult = await healthKitService.syncWorkouts(userId, teamId);

        // Check if operation was cancelled after sync
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Operation cancelled');
        }

        if (syncResult.success) {
          const newWorkouts = syncResult.newWorkouts || 0;

          if (newWorkouts > 0) {
            Alert.alert(
              'Sync Complete! ✅',
              `Found ${newWorkouts} new workouts from Apple Health`,
              [{ text: 'Great!' }]
            );
            onPermissionGranted?.({
              newWorkouts,
              totalWorkouts: syncResult.workoutsCount || 0,
            });
          } else {
            Alert.alert(
              'Sync Complete! ✅',
              'Your Apple Health workouts are up to date',
              [{ text: 'OK' }]
            );
          }

          // Reload stats
          if (showStats) {
            await loadStats();
          }
        }
      } catch (error) {
        console.error('Manual sync error:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Handle cancellation gracefully
        if (errorMessage === 'Operation cancelled') {
          console.log('Manual sync was cancelled by user');
          // Don't show error for cancellation
        } else {
          // Provide user-friendly error messages for timeout scenarios
          const userMessage = errorMessage.includes('timed out')
            ? 'Sync is taking too long. Please try again or check your internet connection.'
            : 'Could not sync workouts at this time. Please try again later.';
          
          Alert.alert('Sync Failed', userMessage);
        }
      } finally {
        setIsLoading(false);
        // Clear the abort controller when operation completes
        abortControllerRef.current = null;
      }
    });
  };

  const getStatusText = (): string => {
    if (isLoading) {
      return 'Tap to cancel sync';
    }
    
    switch (status) {
      case 'granted':
        return showStats && stats.totalHealthKitWorkouts > 0
          ? `${stats.totalHealthKitWorkouts} workouts synced`
          : 'Connected - Auto syncing';
      case 'requesting':
        return 'Requesting permission...';
      case 'syncing':
        return 'Syncing workouts...';
      case 'denied':
        return 'Not available on this device';
      default:
        return 'Tap to sync Apple Health workouts';
    }
  };

  const getStatusColor = (): string => {
    switch (status) {
      case 'granted':
        return theme.colors.statusConnected; // Use existing blue status color
      case 'requesting':
      case 'syncing':
        return theme.colors.primary; // Use existing primary color
      default:
        return theme.colors.textSecondary;
    }
  };

  const getDescription = (): string => {
    if (status === 'granted') {
      return 'Automatically syncs workouts from Apple Fitness+, Strava, Nike Run Club, and other apps that save to Apple Health. Workouts appear in competitions within 30 minutes.';
    }
    return 'Connect Apple Health to automatically include workouts from all your fitness apps in RUNSTR competitions and earn Bitcoin rewards.';
  };

  // Don't show card if HealthKit not available
  if (!healthKitService.getStatus().available) {
    return null;
  }

  return (
    <Card style={styles.container}>
      <TouchableOpacity
        style={styles.content}
        onPress={
          isLoading 
            ? cancelSync 
            : status === 'granted' 
              ? handleManualSync 
              : requestPermissionAndSync
        }
        disabled={false} // Always enabled - changes function based on state
        activeOpacity={0.7}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <AntDesign
              name="apple1"
              size={20}
              color={
                status === 'granted'
                  ? theme.colors.statusConnected
                  : theme.colors.text
              }
            />
          </View>
          <View style={styles.info}>
            <Text style={styles.title}>Apple Health</Text>
            <Text style={[styles.status, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          </View>
          <View style={styles.actions}>
            {status === 'granted' && !isLoading && (
              <AntDesign
                name="checkcircle"
                size={16}
                color={theme.colors.statusConnected}
              />
            )}
            {isLoading && (
              <AntDesign
                name="close"
                size={16}
                color={theme.colors.primary}
              />
            )}
            {(status === 'requesting' || status === 'syncing') && !isLoading && (
              <Text style={styles.loadingText}>⟳</Text>
            )}
          </View>
        </View>

        <Text style={styles.description}>{getDescription()}</Text>

        {status === 'granted' && showStats && stats.lastSyncDate && (
          <Text style={styles.lastSync}>
            Last synced: {new Date(stats.lastSyncDate).toLocaleString()}
          </Text>
        )}
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  status: {
    fontSize: 13,
  },
  actions: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 20,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.primary,
    transform: [{ rotate: '45deg' }],
  },
  description: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  lastSync: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 8,
    opacity: 0.7,
  },
});
