/**
 * GoalsHabitsCard - Display habit tracking with streaks
 * Matches AdvancedAnalyticsScreen styling with orange (#FF9D42) and black theme
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import {
  getAllHabits,
  createHabit,
  checkInHabit,
  deleteHabit,
  isCheckedInToday,
  type Habit,
} from '../../services/habits/HabitTrackerService';
import { HabitModal } from './HabitModal';

export const GoalsHabitsCard: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadHabits();
  }, [refreshKey]);

  const loadHabits = async () => {
    try {
      const loadedHabits = await getAllHabits();
      setHabits(loadedHabits);
    } catch (error) {
      console.error('[GoalsHabitsCard] Error loading habits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHabit = async (
    name: string,
    type: 'abstinence' | 'positive',
    icon: string,
    color: string
  ) => {
    try {
      await createHabit(name, type, icon, color);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error('[GoalsHabitsCard] Error creating habit:', error);
      Alert.alert('Error', 'Failed to create habit');
    }
  };

  const handleCheckIn = async (habitId: string) => {
    try {
      await checkInHabit(habitId);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error('[GoalsHabitsCard] Error checking in:', error);
      Alert.alert('Error', 'Failed to check in');
    }
  };

  const handleDeleteHabit = (habit: Habit) => {
    Alert.alert(
      'Delete Habit',
      `Are you sure you want to delete "${habit.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHabit(habit.id);
              setRefreshKey((prev) => prev + 1);
            } catch (error) {
              console.error('[GoalsHabitsCard] Error deleting habit:', error);
              Alert.alert('Error', 'Failed to delete habit');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return null; // Or loading spinner
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons
            name="flag-outline"
            size={18}
            color={theme.colors.orangeBright}
          />
          <Text style={styles.headerTitle}>Goals & Habits</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="add-circle-outline"
            size={24}
            color={theme.colors.orangeBright}
          />
        </TouchableOpacity>
      </View>

      {/* Habits List */}
      {habits.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="flower-outline"
            size={36}
            color={theme.colors.textMuted}
          />
          <Text style={styles.emptyText}>No habits yet</Text>
          <Text style={styles.emptySubtext}>
            Track abstinence or build positive habits
          </Text>
          <TouchableOpacity
            style={styles.addFirstButton}
            onPress={() => setShowModal(true)}
          >
            <Ionicons
              name="add-circle-outline"
              size={18}
              color={theme.colors.background}
            />
            <Text style={styles.addFirstButtonText}>Add Your First Habit</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.habitsList}
          showsVerticalScrollIndicator={false}
        >
          {habits.map((habit) => {
            const checkedIn = isCheckedInToday(habit);
            return (
              <View key={habit.id} style={styles.habitCard}>
                {/* Habit Info */}
                <View style={styles.habitInfo}>
                  <View style={styles.habitIconContainer}>
                    <Ionicons
                      name={habit.icon as any}
                      size={24}
                      color={theme.colors.textMuted}
                    />
                  </View>
                  <View style={styles.habitDetails}>
                    <Text style={styles.habitName}>{habit.name}</Text>
                    <View style={styles.streakContainer}>
                      <Ionicons
                        name="flame"
                        size={16}
                        color={theme.colors.orangeBright}
                      />
                      <Text style={styles.streakText}>
                        {habit.currentStreak} day streak
                      </Text>
                      {habit.longestStreak > habit.currentStreak && (
                        <Text style={styles.longestStreakText}>
                          (Best: {habit.longestStreak})
                        </Text>
                      )}
                    </View>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.habitActions}>
                  {checkedIn ? (
                    <View style={styles.checkedInBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={theme.colors.success}
                      />
                      <Text style={styles.checkedInText}>Done</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.checkInButton}
                      onPress={() => handleCheckIn(habit.id)}
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={20}
                        color={theme.colors.orangeBright}
                      />
                      <Text style={styles.checkInButtonText}>Check In</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => handleDeleteHabit(habit)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={theme.colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Add Habit Modal */}
      <HabitModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleCreateHabit}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.large,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xxl,
    marginBottom: theme.spacing.xxl,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },

  headerTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },

  emptyText: {
    fontSize: theme.typography.headingTertiary,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },

  emptySubtext: {
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },

  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.orangeBright,
    borderRadius: theme.borderRadius.medium,
    marginTop: theme.spacing.md,
  },

  addFirstButtonText: {
    fontSize: theme.typography.body,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.background,
  },

  habitsList: {
    maxHeight: 400,
  },

  habitCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  habitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.xl,
  },

  habitIconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  habitDetails: {
    flex: 1,
  },

  habitName: {
    fontSize: theme.typography.body,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },

  streakText: {
    fontSize: theme.typography.body - 2,
    color: theme.colors.orangeBright,
    fontWeight: theme.typography.weights.medium,
  },

  longestStreakText: {
    fontSize: theme.typography.body - 2,
    color: theme.colors.textMuted,
  },

  habitActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xl,
  },

  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.orangeBright,
    borderRadius: theme.borderRadius.small,
  },

  checkInButtonText: {
    fontSize: theme.typography.body - 2,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.orangeBright,
  },

  checkedInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.small,
  },

  checkedInText: {
    fontSize: theme.typography.body - 2,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.success,
  },
});
