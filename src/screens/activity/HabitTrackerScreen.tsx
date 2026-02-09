/**
 * HabitTrackerScreen - Habit tracking interface within the activity grid
 *
 * Renders GoalsHabitsCard which includes habit list, check-ins, streaks, and creation.
 * Accessed via Mindfulness row in the swipe grid.
 */

import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { GoalsHabitsCard } from '../../components/analytics/GoalsHabitsCard';

export const HabitTrackerScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <GoalsHabitsCard />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.xxl,
    paddingTop: theme.spacing.xl,
  },
});

export default HabitTrackerScreen;
