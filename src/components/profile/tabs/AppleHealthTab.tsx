/**
 * AppleHealthTab - Simple Apple Health workout display
 * Shows last 30 days of HealthKit workouts - no merging or complexity
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { CustomAlertManager } from '../../ui/CustomAlert';
import { theme } from '../../../styles/theme';
import { Card } from '../../ui/Card';
import { LoadingOverlay } from '../../ui/LoadingStates';
import { WorkoutCard } from '../shared/WorkoutCard';
import { HealthKitErrorBoundary } from '../../fitness/HealthKitErrorBoundary';
import healthKitService from '../../../services/fitness/healthKitService';
import type { Workout } from '../../../types/workout';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

interface AppleHealthTabProps {
  userId: string;
  onCompete?: (workout: Workout) => Promise<void>;
  onSocialShare?: (workout: Workout) => Promise<void>;
}

const AppleHealthTabContent: React.FC<AppleHealthTabProps> = ({
  userId,
  onCompete,
  onSocialShare,
}) => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);

  // Button loading state - tracks which workout is being processed
  const [postingWorkoutId, setPostingWorkoutId] = useState<string | null>(null);
  const [postingType, setPostingType] = useState<'post' | 'compete' | null>(null);

  useEffect(() => {
    // Only check status on mount, don't auto-request permissions
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    try {
      // First check if HealthKit is available
      const quickStatus = healthKitService.getStatus();
      if (!quickStatus.available) {
        console.log('HealthKit not available on this device');
        setIsLoading(false);
        return;
      }

      // Check cached permission state (doesn't trigger iOS permission dialog)
      // This prevents HealthKit popup from appearing on app startup
      const status = healthKitService.getStatus();

      if (status.authorized) {
        // Already authorized
        setHasPermission(true);

        // Load cached workouts immediately for instant display
        // This prevents workouts from disappearing when navigating away and back
        const cached = await healthKitService.getCachedWorkouts();
        if (cached && cached.length > 0) {
          // Transform cached data to UI format matching Workout interface
          const transformedWorkouts: Workout[] = cached.map((workout) => ({
            id: workout.UUID || workout.id || `hk_${Date.now()}`,
            odId: workout.UUID || workout.id,
            userId: userId,
            type: (workout.activityType || 'running') as Workout['type'],
            source: 'healthkit' as const,
            duration: workout.duration,
            distance: workout.totalDistance || 0,
            calories: workout.totalEnergyBurned || 0,
            startTime: workout.startDate,
            endTime: workout.endDate,
            syncedAt: new Date().toISOString(),
            metadata: {
              sourceApp: workout.sourceName,
              originalWorkoutType: workout.workoutActivityType,
              healthKitId: workout.UUID,
              syncedVia: 'healthkit_service',
            },
          }));
          setWorkouts(transformedWorkouts);
          setIsLoading(false);

          // Fetch fresh data in background (don't show loading spinner)
          loadAppleHealthWorkouts(false);
        } else {
          // No cache, fetch with loading state
          await loadAppleHealthWorkouts(true);
        }
      } else {
        // Not authorized - just update state, don't auto-request
        console.log('🍎 HealthKit not authorized - showing connect button');
        setHasPermission(false);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking HealthKit permission:', error);
      setHasPermission(false);
      setIsLoading(false);
    }
  };

  const handleConnectHealthKit = async () => {
    // Manual permission request triggered by user action
    await requestPermission();
  };

  const requestPermission = async () => {
    try {
      setPermissionRequested(true);
      console.log('🍎 Requesting HealthKit permission...');

      // Use timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Permission request timed out')),
          15000
        )
      );

      const permissionResult = await Promise.race([
        healthKitService.requestPermissions(),
        timeoutPromise,
      ]);

      if ((permissionResult as { success: boolean; error?: string }).success) {
        // Use getStatusWithRealCheck for accurate post-permission status
        // This performs a real iOS check instead of using cached value
        const status = await healthKitService.getStatusWithRealCheck();

        if (status.authorized) {
          setHasPermission(true);
          await loadAppleHealthWorkouts();
        } else {
          setHasPermission(false);
          CustomAlertManager.alert(
            'Permission Required',
            'HealthKit permissions are needed to sync your Apple Health workouts. Please enable them in iPhone Settings → Privacy & Security → Health → RUNSTR.'
          );
        }
      } else {
        setHasPermission(false);
        const errorMessage =
          (permissionResult as { success: boolean; error?: string }).error || 'Permission request failed';

        if (errorMessage.includes('not available')) {
          CustomAlertManager.alert(
            'HealthKit Unavailable',
            'Apple Health is not available on this device or in the simulator.'
          );
        } else if (
          errorMessage.includes('timeout') ||
          errorMessage.includes('taking too long')
        ) {
          CustomAlertManager.alert(
            'Request Timed Out',
            'The permission request is taking too long. Please try again or check that HealthKit is properly configured.'
          );
        } else {
          CustomAlertManager.alert(
            'Permission Error',
            `Could not request HealthKit permissions: ${errorMessage}`
          );
        }
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      setHasPermission(false);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      if (
        errorMessage.includes('timed out') ||
        errorMessage.includes('timeout')
      ) {
        CustomAlertManager.alert(
          'Request Timed Out',
          'The permission request is taking too long. Please try again.'
        );
      } else if (errorMessage.includes('native module')) {
        CustomAlertManager.alert(
          'HealthKit Unavailable',
          "Apple Health integration is not available in this build. Please ensure you're running on a physical iOS device."
        );
      } else {
        CustomAlertManager.alert(
          'Error',
          'Failed to request HealthKit permission. Please try again later.'
        );
      }
    } finally {
      setPermissionRequested(false);
    }
  };

  const loadAppleHealthWorkouts = async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      console.log('🍎 Loading Apple Health workouts (last 30 days)...');

      // Add timeout protection to prevent hanging
      const timeoutPromise = new Promise(
        (_, reject) =>
          setTimeout(
            () => reject(new Error('Workout loading timed out')),
            30000
          ) // 30 seconds
      );

      const healthKitWorkouts = await Promise.race([
        healthKitService.getRecentWorkouts(userId, 30),
        timeoutPromise,
      ]);

      setWorkouts((healthKitWorkouts as any[]) || []);
      console.log(
        `✅ Loaded ${(healthKitWorkouts as any[])?.length || 0} Apple Health workouts`
      );
    } catch (error) {
      console.error('❌ Failed to load Apple Health workouts:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Don't show error dialogs for common issues, just log them
      if (
        errorMessage.includes('not available') ||
        errorMessage.includes('not authorized')
      ) {
        console.log(
          'HealthKit not available or not authorized - showing empty state'
        );
      } else if (
        errorMessage.includes('timed out') ||
        errorMessage.includes('timeout')
      ) {
        console.log(
          'HealthKit workout loading timed out - showing empty state'
        );
        // Optionally show a toast or brief message instead of a blocking alert
        // Toast.show({ text: 'Loading is taking longer than expected', duration: 'short' });
      } else {
        console.log('HealthKit workout loading failed:', errorMessage);
      }

      // Only clear workouts if we're not doing a background refresh
      // (keep cached data visible if background refresh fails)
      if (showLoading) {
        setWorkouts([]);
      }
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
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

  const handleCompete = async (workout: Workout) => {
    if (!onCompete) {
      CustomAlertManager.alert(
        'Error',
        'Competition entry functionality not available'
      );
      return;
    }

    // Prevent double-tap
    if (postingWorkoutId === workout.id) return;

    setPostingWorkoutId(workout.id);
    setPostingType('compete');
    try {
      await onCompete(workout);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Workout submitted!',
      });
    } catch (error) {
      console.error('Competition entry failed:', error);
      CustomAlertManager.alert(
        'Error',
        'Failed to enter workout into competition'
      );
    } finally {
      setPostingWorkoutId(null);
      setPostingType(null);
    }
  };

  const handleSocialShare = async (workout: Workout) => {
    if (!onSocialShare) {
      CustomAlertManager.alert(
        'Error',
        'Social sharing functionality not available'
      );
      return;
    }

    // Prevent double-tap
    if (postingWorkoutId === workout.id) return;

    setPostingWorkoutId(workout.id);
    setPostingType('post');
    try {
      await onSocialShare(workout);
      // Success alert handled by EnhancedSocialShareModal
    } catch (error) {
      console.error('Social share failed:', error);
      CustomAlertManager.alert('Error', 'Failed to share workout');
    } finally {
      setPostingWorkoutId(null);
      setPostingType(null);
    }
  };

  const renderWorkout = ({ item }: { item: Workout }) => {
    const isPostingThis = postingWorkoutId === item.id;
    const isPostingPost = isPostingThis && postingType === 'post';
    const isPostingCompete = isPostingThis && postingType === 'compete';

    return (
      <WorkoutCard workout={item}>
        <View style={styles.buttonContainer}>
          {/* Post button - Kind 1 social sharing */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.postButton,
              isPostingPost && styles.buttonDisabled,
            ]}
            onPress={() => handleSocialShare(item)}
            disabled={isPostingThis}
          >
            {isPostingPost ? (
              <ActivityIndicator size="small" color={theme.colors.background} />
            ) : (
              <>
                <Ionicons
                  name="bookmark-outline"
                  size={16}
                  color={theme.colors.background}
                />
                <Text style={styles.postButtonText}>Share</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Compete button - Kind 1301 competition entry */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.publicButton,
              isPostingCompete && styles.buttonDisabled,
            ]}
            onPress={() => handleCompete(item)}
            disabled={isPostingThis}
          >
            {isPostingCompete ? (
              <ActivityIndicator size="small" color={theme.colors.background} />
            ) : (
              <>
                <Ionicons
                  name="cloud-upload-outline"
                  size={16}
                  color={theme.colors.background}
                />
                <Text style={styles.publicButtonText}>Compete</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </WorkoutCard>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingOverlay
          message="Loading Apple Health workouts..."
          visible={true}
        />
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
            View your workouts from the Apple Health app. We'll show your last
            30 days of workout data.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={handleConnectHealthKit}
            disabled={permissionRequested}
          >
            <Text style={styles.permissionButtonText}>
              {permissionRequested
                ? 'Requesting Permission...'
                : 'Connect Apple Health'}
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
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  postButton: {
    backgroundColor: theme.colors.text,
  },
  publicButton: {
    backgroundColor: theme.colors.text,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  postButtonText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  publicButtonText: {
    color: theme.colors.background,
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
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  permissionButtonText: {
    color: theme.colors.text,
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
