/**
 * AppleHealthTab - Simple Apple Health workout display
 * Shows last 30 days of HealthKit workouts - no merging or complexity
 */

import React, { useState, useEffect } from 'react';
import { View, FlatList, RefreshControl, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { theme } from '../../../styles/theme';
import { Card } from '../../ui/Card';
import { LoadingOverlay } from '../../ui/LoadingStates';
import { WorkoutCard } from '../shared/WorkoutCard';
import { HealthKitErrorBoundary } from '../../fitness/HealthKitErrorBoundary';
import healthKitService from '../../../services/fitness/healthKitService';
import type { Workout } from '../../../types/workout';

interface AppleHealthTabProps {
  userId: string;
  onPostToNostr?: (workout: Workout) => void;
}

const AppleHealthTabContent: React.FC<AppleHealthTabProps> = ({
  userId,
  onPostToNostr,
}) => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);

  useEffect(() => {
    checkPermissionAndLoadWorkouts();
  }, []);

  const checkPermissionAndLoadWorkouts = async () => {
    try {
      const status = healthKitService.getStatus();
      
      if (!status.available) {
        console.log('HealthKit not available on this device');
        setIsLoading(false);
        return;
      }

      if (status.authorized) {
        setHasPermission(true);
        await loadAppleHealthWorkouts();
      } else {
        setHasPermission(false);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking HealthKit permission:', error);
      setIsLoading(false);
    }
  };

  const requestPermission = async () => {
    try {
      setPermissionRequested(true);
      console.log('🍎 Requesting HealthKit permission...');
      
      // Use timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Permission request timed out')), 15000)
      );
      
      const permissionResult = await Promise.race([
        healthKitService.requestPermissions(),
        timeoutPromise
      ]);
      
      if (permissionResult.success) {
        const status = healthKitService.getStatus();
        
        if (status.authorized) {
          setHasPermission(true);
          await loadAppleHealthWorkouts();
        } else {
          setHasPermission(false);
          Alert.alert(
            'Permission Required',
            'HealthKit permissions are needed to sync your Apple Health workouts. Please enable them in iPhone Settings → Privacy & Security → Health → RUNSTR.'
          );
        }
      } else {
        setHasPermission(false);
        const errorMessage = permissionResult.error || 'Permission request failed';
        
        if (errorMessage.includes('not available')) {
          Alert.alert(
            'HealthKit Unavailable',
            'Apple Health is not available on this device or in the simulator.'
          );
        } else if (errorMessage.includes('timeout') || errorMessage.includes('taking too long')) {
          Alert.alert(
            'Request Timed Out',
            'The permission request is taking too long. Please try again or check that HealthKit is properly configured.'
          );
        } else {
          Alert.alert(
            'Permission Error',
            `Could not request HealthKit permissions: ${errorMessage}`
          );
        }
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      setHasPermission(false);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('timed out') || errorMessage.includes('timeout')) {
        Alert.alert(
          'Request Timed Out',
          'The permission request is taking too long. Please try again.'
        );
      } else if (errorMessage.includes('native module')) {
        Alert.alert(
          'HealthKit Unavailable',
          'Apple Health integration is not available in this build. Please ensure you\'re running on a physical iOS device.'
        );
      } else {
        Alert.alert(
          'Error',
          'Failed to request HealthKit permission. Please try again later.'
        );
      }
    } finally {
      setPermissionRequested(false);
    }
  };

  const loadAppleHealthWorkouts = async () => {
    try {
      setIsLoading(true);
      console.log('🍎 Loading Apple Health workouts (last 30 days)...');
      
      // Add timeout protection to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Workout loading timed out')), 30000) // 30 seconds
      );
      
      const healthKitWorkouts = await Promise.race([
        healthKitService.getRecentWorkouts(userId, 30),
        timeoutPromise
      ]);
      
      setWorkouts(healthKitWorkouts || []);
      console.log(`✅ Loaded ${healthKitWorkouts?.length || 0} Apple Health workouts`);
    } catch (error) {
      console.error('❌ Failed to load Apple Health workouts:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Don't show error dialogs for common issues, just log them
      if (errorMessage.includes('not available') || errorMessage.includes('not authorized')) {
        console.log('HealthKit not available or not authorized - showing empty state');
      } else if (errorMessage.includes('timed out') || errorMessage.includes('timeout')) {
        console.log('HealthKit workout loading timed out - showing empty state');
        // Optionally show a toast or brief message instead of a blocking alert
        // Toast.show({ text: 'Loading is taking longer than expected', duration: 'short' });
      } else {
        console.log('HealthKit workout loading failed:', errorMessage);
      }
      
      // Always set empty array to prevent UI crashes
      setWorkouts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!hasPermission) return;
    
    setIsRefreshing(true);
    try {
      await loadAppleHealthWorkouts();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePostToNostr = async (workout: Workout) => {
    if (!onPostToNostr) {
      Alert.alert('Error', 'Post to Nostr functionality not available');
      return;
    }

    try {
      await onPostToNostr(workout);
    } catch (error) {
      console.error('Post to Nostr failed:', error);
      Alert.alert('Error', 'Failed to post workout to Nostr');
    }
  };

  const renderWorkout = ({ item }: { item: Workout }) => (
    <WorkoutCard workout={item}>
      <TouchableOpacity
        style={styles.postButton}
        onPress={() => handlePostToNostr(item)}
      >
        <Text style={styles.postButtonText}>📤 Post to Nostr</Text>
      </TouchableOpacity>
    </WorkoutCard>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingOverlay message="Loading Apple Health workouts..." visible={true} />
      </View>
    );
  }

  if (!healthKitService.getStatus().available) {
    return (
      <View style={styles.container}>
        <Card style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>Apple Health Unavailable</Text>
          <Text style={styles.emptyStateText}>
            Apple Health is not available on this device.
          </Text>
        </Card>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Card style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>Connect Apple Health</Text>
          <Text style={styles.permissionText}>
            View your workouts from the Apple Health app.
            We'll show your last 30 days of workout data.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
            disabled={permissionRequested}
          >
            <Text style={styles.permissionButtonText}>
              {permissionRequested ? 'Requesting Permission...' : 'Connect Apple Health'}
            </Text>
          </TouchableOpacity>
        </Card>
      </View>
    );
  }

  return (
    <FlatList
      data={workouts}
      renderItem={renderWorkout}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.text}
        />
      }
      ListEmptyComponent={
        <Card style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No workouts found</Text>
          <Text style={styles.emptyStateText}>
            No workouts found in your Apple Health app for the last 30 days.
            Record a workout in your fitness apps and pull to refresh.
          </Text>
        </Card>
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  postButton: {
    marginTop: 12,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  postButtonText: {
    color: theme.colors.accentText,
    fontSize: 14,
    fontWeight: '600',
  },
  permissionCard: {
    padding: 24,
    alignItems: 'center',
    marginTop: 32,
  },
  permissionTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  permissionText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: theme.colors.accentText,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    marginTop: 32,
  },
  emptyStateTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

// Exported component wrapped with HealthKitErrorBoundary for additional protection
export const AppleHealthTab: React.FC<AppleHealthTabProps> = (props) => {
  return (
    <HealthKitErrorBoundary
      fallbackMessage="Apple Health is temporarily unavailable. Please try refreshing or check your device settings."
      onRetry={() => {
        // Force a re-render by updating a state value
        console.log('HealthKit Error Boundary: Retrying AppleHealthTab...');
      }}
    >
      <AppleHealthTabContent {...props} />
    </HealthKitErrorBoundary>
  );
};