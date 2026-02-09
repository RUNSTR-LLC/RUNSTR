/**
 * HabitTrackerScreen - Habit tracking interface within the activity grid
 *
 * Non-scrollable wrapper so SwipeGridNavigator can handle vertical swipes.
 * GoalsHabitsCard has its own internal scroll for long habit lists.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { GoalsHabitsCard } from '../../components/analytics/GoalsHabitsCard';

export const HabitTrackerScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <GoalsHabitsCard />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.xxl,
    paddingTop: theme.spacing.xl,
  },
});

export default HabitTrackerScreen;
