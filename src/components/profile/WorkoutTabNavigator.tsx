/**
 * WorkoutTabNavigator - Unified workout view
 * Shows all workouts from all sources (local, Apple Health, Health Connect) in one view
 * Previously had separate tabs - now uses UnifiedWorkoutsTab for better UX
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { theme } from '../../styles/theme';
import { UnifiedWorkoutsTab } from './tabs/UnifiedWorkoutsTab';
import type { LocalWorkout } from '../../services/fitness/LocalWorkoutStorageService';
import type { Workout } from '../../types/workout';

interface WorkoutTabNavigatorProps {
  userId: string;
  pubkey?: string;
  onRefresh?: () => void;
  onPostToSocial?: (workout: LocalWorkout) => Promise<void>;
  onSocialShareHealthKit?: (workout: any) => Promise<void>;
  onSocialShareHealthConnect?: (workout: any) => Promise<void>;
}

export const WorkoutTabNavigator: React.FC<WorkoutTabNavigatorProps> = ({
  userId,
  pubkey,
  onRefresh,
  onPostToSocial,
  onSocialShareHealthKit,
  onSocialShareHealthConnect,
}) => {
  // Determine which health app callback to use based on platform
  const handleSocialShareHealthApp = async (workout: Workout) => {
    if (Platform.OS === 'ios' && onSocialShareHealthKit) {
      await onSocialShareHealthKit(workout);
    } else if (Platform.OS === 'android' && onSocialShareHealthConnect) {
      await onSocialShareHealthConnect(workout);
    }
  };

  return (
    <View style={styles.container}>
      <UnifiedWorkoutsTab
        userId={userId}
        pubkey={pubkey}
        onRefresh={onRefresh}
        onPostToSocial={onPostToSocial}
        onSocialShareHealthApp={handleSocialShareHealthApp}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
