// src/components/streak/StreakSection.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import LocalWorkoutStorageService from '../../services/fitness/LocalWorkoutStorageService';

const GRACE_PERIOD_DAYS = 3; // gap of 3 calendar days = 2 missed days

function getLastWorkoutLabel(daysSince: number): string {
  if (daysSince === 0) return 'Last workout: today';
  if (daysSince === 1) return 'Last workout: yesterday';
  return `Last workout: ${daysSince} days ago`;
}

function computeStreaksWithGrace(sortedDatesDesc: string[]): {
  current: number;
  longest: number;
} {
  if (sortedDatesDesc.length === 0) return { current: 0, longest: 0 };

  const dates = [...sortedDatesDesc].reverse(); // ascending

  // Longest streak (with grace period)
  let longest = 1;
  let temp = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const gap = Math.round(
      (curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (gap <= GRACE_PERIOD_DAYS) {
      temp++;
    } else {
      temp = 1;
    }
    if (temp > longest) longest = temp;
  }

  // Current streak: count backwards from most recent
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mostRecent = new Date(dates[dates.length - 1]);
  mostRecent.setHours(0, 0, 0, 0);
  const daysSinceLast = Math.round(
    (today.getTime() - mostRecent.getTime()) / (24 * 60 * 60 * 1000)
  );

  if (daysSinceLast >= GRACE_PERIOD_DAYS) {
    return { current: 0, longest };
  }

  let current = 1;
  for (let i = dates.length - 2; i >= 0; i--) {
    const curr = new Date(dates[i + 1]);
    const prev = new Date(dates[i]);
    const gap = Math.round(
      (curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (gap <= GRACE_PERIOD_DAYS) {
      current++;
    } else {
      break;
    }
  }

  return { current, longest };
}

export const StreakSection: React.FC = () => {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [daysSinceLastWorkout, setDaysSinceLastWorkout] = useState(-1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const allWorkouts = await LocalWorkoutStorageService.getAllWorkouts();

      // Filter: exclude passive step counting (daily_steps source with 0 duration)
      const qualifying = allWorkouts.filter((w) => {
        if (w.source === 'daily_steps') return false;
        return true;
      });

      // Get unique dates (YYYY-MM-DD), descending
      const uniqueDates = [
        ...new Set(
          qualifying.map((w) => w.startTime?.slice(0, 10)).filter(Boolean)
        ),
      ].sort((a, b) => (b > a ? 1 : -1));

      const { current, longest } = computeStreaksWithGrace(uniqueDates);
      setCurrentStreak(current);
      setLongestStreak(longest);

      // Days since last qualifying workout
      if (uniqueDates.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastDate = new Date(uniqueDates[0]);
        lastDate.setHours(0, 0, 0, 0);
        const diff = Math.round(
          (today.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000)
        );
        setDaysSinceLastWorkout(diff);
      }
    } catch (err) {
      console.error('[StreakSection] Failed to load:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || daysSinceLastWorkout < 0) return null;

  const workedOutToday = daysSinceLastWorkout === 0;

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.streakNumber,
          !workedOutToday && currentStreak > 0 && styles.dimmed,
        ]}
      >
        {currentStreak}
      </Text>
      <Text
        style={[
          styles.streakLabel,
          !workedOutToday && currentStreak > 0 && styles.dimmed,
        ]}
      >
        day streak
      </Text>

      <Text style={styles.lastWorkout}>
        {getLastWorkoutLabel(daysSinceLastWorkout)}
      </Text>

      {longestStreak > currentStreak && (
        <Text style={styles.bestText}>Best: {longestStreak} days</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 40,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
    lineHeight: 44,
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  dimmed: {
    opacity: 0.45,
  },
  lastWorkout: {
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textDark,
    marginTop: 10,
  },
  bestText: {
    fontSize: 12,
    color: theme.colors.textDark,
    fontWeight: theme.typography.weights.medium,
    marginTop: 4,
  },
});
