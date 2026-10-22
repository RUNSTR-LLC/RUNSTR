/**
 * WorkoutTabNavigator - Unified workout view
 * Shows all workouts from all sources (local, Apple Health, Health Connect) in one view
 * Previously had separate tabs - now uses UnifiedWorkoutsTab for better UX
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { UnifiedWorkoutsTab } from './tabs/UnifiedWorkoutsTab';

interface WorkoutTabNavigatorProps {
  userId: string;
  pubkey?: string;
  onRefresh?: () => void;
}

export const WorkoutTabNavigator: React.FC<WorkoutTabNavigatorProps> = ({
  userId,
  pubkey,
  onRefresh,
}) => {
  return (
    <View style={styles.container}>
      <UnifiedWorkoutsTab
        userId={userId}
        pubkey={pubkey}
        onRefresh={onRefresh}
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
