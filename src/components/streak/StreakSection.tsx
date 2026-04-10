// src/components/streak/StreakSection.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import { ProfileDataService } from '../../services/backend/ProfileDataService';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';

/** Get Monday-Sunday date range for the current week */
function getCurrentWeekDates(): { start: string; end: string; dates: string[] } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }

  return {
    start: dates[0],
    end: dates[6],
    dates,
  };
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const StreakSection: React.FC = () => {
  const [npub, setNpub] = useState('');
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [workoutDays, setWorkoutDays] = useState<Set<string>>(new Set());
  const [inGracePeriod, setInGracePeriod] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const stored = await AsyncStorage.getItem('@runstr:npub');
      if (stored) setNpub(stored);
    };
    init();
  }, []);

  useEffect(() => {
    if (npub) loadData();
  }, [npub]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const stats = await ProfileDataService.getUserStats(npub);
      setCurrentStreak(stats.currentStreakDays);
      setLongestStreak(stats.longestStreakDays);

      // Fetch this week's workout days for the dots
      // Exclude passive step submissions (walking with 0 duration)
      if (isSupabaseConfigured()) {
        const week = getCurrentWeekDates();
        const { data } = await supabase!
          .from('workout_submissions')
          .select('leaderboard_date, activity_type, duration_seconds')
          .eq('npub', npub)
          .gte('leaderboard_date', week.start)
          .lte('leaderboard_date', week.end);

        if (data) {
          const eligibleDays = new Set(
            data
              .filter((r) => {
                const isPassiveSteps =
                  (r.activity_type === 'walking' || r.activity_type === 'steps') &&
                  (r.duration_seconds === 0 || r.duration_seconds === null);
                return !isPassiveSteps;
              })
              .map((r: { leaderboard_date: string }) => r.leaderboard_date)
          );
          setWorkoutDays(eligibleDays);
        }
      }

      // Determine grace period state: streak > 0 but no workout today
      const today = new Date().toISOString().split('T')[0];
      if (stats.currentStreakDays > 0) {
        // Check if user worked out today
        if (isSupabaseConfigured()) {
          const { data: todayData } = await supabase!
            .from('workout_submissions')
            .select('id, activity_type, duration_seconds')
            .eq('npub', npub)
            .eq('leaderboard_date', today)
            .limit(10);

          const hasQualifyingToday = (todayData || []).some((r) => {
            const isPassiveSteps =
              (r.activity_type === 'walking' || r.activity_type === 'steps') &&
              (r.duration_seconds === 0 || r.duration_seconds === null);
            return !isPassiveSteps;
          });

          setInGracePeriod(!hasQualifyingToday);
        }
      }
    } catch (err) {
      console.error('[StreakSection] Failed to load:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!npub || isLoading) return null;

  const week = getCurrentWeekDates();
  const today = new Date().toISOString().split('T')[0];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>STREAK</Text>

      {/* Streak count */}
      <View style={styles.streakRow}>
        <Text style={[styles.streakNumber, inGracePeriod && styles.streakDimmed]}>
          {currentStreak}
        </Text>
        <Text style={[styles.streakLabel, inGracePeriod && styles.streakLabelDimmed]}>
          day streak
        </Text>
      </View>

      {/* Week dots */}
      <View style={styles.weekRow}>
        {week.dates.map((date, i) => {
          const filled = workoutDays.has(date);
          const isToday = date === today;
          return (
            <View key={date} style={styles.dayColumn}>
              <View
                style={[
                  styles.dot,
                  filled && styles.dotFilled,
                  isToday && styles.dotToday,
                ]}
              />
              <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                {DAY_LABELS[i]}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Longest streak */}
      {longestStreak > 0 && (
        <Text style={styles.bestText}>Best: {longestStreak} days</Text>
      )}
    </View>
  );
};

const DOT_SIZE = 12;

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 4,
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
  },
  streakDimmed: {
    opacity: 0.5,
  },
  streakLabel: {
    fontSize: 15,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
  },
  streakLabelDimmed: {
    opacity: 0.5,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  dayColumn: {
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: theme.colors.border,
  },
  dotFilled: {
    backgroundColor: theme.colors.accent,
  },
  dotToday: {
    borderWidth: 1.5,
    borderColor: theme.colors.orangeBright,
  },
  dayLabel: {
    fontSize: 11,
    color: theme.colors.textDark,
    fontWeight: theme.typography.weights.medium,
  },
  dayLabelToday: {
    color: theme.colors.textMuted,
  },
  bestText: {
    fontSize: 12,
    color: theme.colors.textDark,
    fontWeight: theme.typography.weights.medium,
  },
});
