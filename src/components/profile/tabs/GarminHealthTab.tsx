/**
 * GarminHealthTab - Garmin Connect workout display
 * Shows synced Garmin workouts with OAuth authentication
 * Mirrors AppleHealthTab structure for consistency
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
import garminAuthService from '../../../services/fitness/garminAuthService';
import garminActivityService from '../../../services/fitness/garminActivityService';
import type { Workout } from '../../../types/workout';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

interface GarminHealthTabProps {
  userId: string;
  onCompete?: (workout: Workout) => Promise<void>;
  onSocialShare?: (workout: Workout) => Promise<void>;
}

export const GarminHealthTab: React.FC<GarminHealthTabProps> = ({
  userId,
  onCompete,
  onSocialShare,
}) => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  // Button loading state - tracks which workout is being processed
  const [postingWorkoutId, setPostingWorkoutId] = useState<string | null>(null);
  const [postingType, setPostingType] = useState<'post' | 'compete' | null>(null);

  useEffect(() => {
    checkConnectionAndLoadWorkouts();
  }, []);

  const checkConnectionAndLoadWorkouts = async () => {
    try {
      const isAuthenticated = await garminAuthService.checkAuthentication();
      setIsConnected(isAuthenticated);

      if (isAuthenticated) {
        await loadGarminWorkouts();
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking Garmin connection:', error);
      setIsLoading(false);
    }
  };

  const connectGarmin = async () => {
    try {
      console.log('🔗 Starting Garmin connection...');

      const result = await garminAuthService.startOAuthFlow();

      if (result.success) {
        // OAuth flow opened browser, callback will be handled by deep link
        CustomAlertManager.alert(
          'Authorize Garmin',
          'Please authorize RUNSTR in your browser. Once authorized, you will be redirected back to the app.',
          [{ text: 'OK' }]
        );
      } else {
        CustomAlertManager.alert(
          'Connection Failed',
          result.error || 'Failed to connect to Garmin. Please try again.'
        );
      }
    } catch (error) {
      console.error('Garmin connection failed:', error);
      CustomAlertManager.alert(
        'Error',
        'Failed to connect to Garmin. Please try again later.'
      );
    }
  };

  const syncWorkouts = async () => {
    try {
      setIsSyncing(true);
      console.log('🔄 Syncing Garmin workouts...');

      const result = await garminActivityService.syncWorkouts(userId, 30);

      if (result.success) {
        setLastSyncAt(new Date());
        await loadGarminWorkouts();

        CustomAlertManager.alert(
          'Sync Complete',
          `Synced ${result.newWorkouts} new workout${
            result.newWorkouts === 1 ? '' : 's'
          } from Garmin. ${result.skippedWorkouts} already synced.`
        );
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Garmin sync failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('not authenticated')) {
        CustomAlertManager.alert(
          'Authentication Required',
          'Please reconnect your Garmin account to sync workouts.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Connect', onPress: connectGarmin },
          ]
        );
      } else {
        CustomAlertManager.alert(
          'Sync Failed',
          `Failed to sync workouts: ${errorMessage}`
        );
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const loadGarminWorkouts = async () => {
    try {
      setIsLoading(true);
      console.log('🏃 Loading Garmin workouts (last 30 days)...');

      const garminWorkouts = await garminActivityService.getRecentWorkouts(
        userId,
        30
      );

      setWorkouts(garminWorkouts || []);
      console.log(`✅ Loaded ${garminWorkouts?.length || 0} Garmin workouts`);

      // Get last sync time
      const stats = await garminActivityService.getSyncStats(userId);
      if (stats.lastSyncDate) {
        setLastSyncAt(new Date(stats.lastSyncDate));
      }
    } catch (error) {
      console.error('❌ Failed to load Garmin workouts:', error);
      setWorkouts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!isConnected) return;

    setIsRefreshing(true);
    try {
      await loadGarminWorkouts();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const disconnectGarmin = async () => {
    CustomAlertManager.alert(
      'Disconnect Garmin',
      'Are you sure you want to disconnect your Garmin account? Your synced workouts will remain available.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await garminAuthService.disconnect();
              setIsConnected(false);
              setWorkouts([]);
              setLastSyncAt(null);
              CustomAlertManager.alert(
                'Success',
                'Garmin account disconnected'
              );
            } catch (error) {
              console.error('Failed to disconnect Garmin:', error);
              CustomAlertManager.alert(
                'Error',
                'Failed to disconnect Garmin account'
              );
            }
          },
        },
      ]
    );
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
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Workout shared to social feeds!',
      });
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
        <LoadingOverlay message="Loading Garmin workouts..." visible={true} />
      </View>
    );
  }

  if (!isConnected) {
    return (
      <View style={styles.container}>
        <Card style={styles.connectionCard}>
          <Ionicons
            name="fitness"
            size={48}
            color={theme.colors.accent}
            style={styles.icon}
          />
          <Text style={styles.connectionTitle}>Connect Garmin</Text>
          <Text style={styles.connectionText}>
            Sync your workouts from Garmin Connect. We'll import your last 30
            days of activity data.
          </Text>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={connectGarmin}
          >
            <Ionicons
              name="logo-google"
              size={20}
              color={theme.colors.background}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.connectButtonText}>Connect Garmin</Text>
          </TouchableOpacity>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sync Header */}
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          <View style={styles.connectedIndicator} />
          <Text style={styles.statusText}>Connected to Garmin</Text>
        </View>
        <TouchableOpacity
          style={styles.syncButton}
          onPress={syncWorkouts}
          disabled={isSyncing}
        >
          <Ionicons
            name={isSyncing ? 'sync' : 'cloud-download-outline'}
            size={18}
            color={theme.colors.background}
          />
          <Text style={styles.syncButtonText}>
            {isSyncing ? 'Syncing...' : 'Sync'}
          </Text>
        </TouchableOpacity>
      </View>

      {lastSyncAt && (
        <Text style={styles.lastSyncText}>
          Last synced: {lastSyncAt.toLocaleString()}
        </Text>
      )}

      {/* Workout List */}
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
            <Text style={styles.emptyStateTitle}>No workouts synced</Text>
            <Text style={styles.emptyStateText}>
              Tap the "Sync" button above to import your Garmin workouts from
              the last 30 days.
            </Text>
          </Card>
        }
        ListFooterComponent={
          <TouchableOpacity
            style={styles.disconnectButton}
            onPress={disconnectGarmin}
          >
            <Text style={styles.disconnectText}>Disconnect Garmin</Text>
          </TouchableOpacity>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.statusConnected, // Orange dot
  },
  statusText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.text,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncButtonText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  lastSyncText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 8,
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
  connectionCard: {
    padding: 32,
    alignItems: 'center',
    marginTop: 32,
    marginHorizontal: 16,
  },
  icon: {
    marginBottom: 16,
  },
  connectionTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  connectionText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.text,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  connectButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    marginTop: 16,
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
  disconnectButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  disconnectText: {
    color: theme.colors.error,
    fontSize: 14,
    fontWeight: '500',
  },
});
