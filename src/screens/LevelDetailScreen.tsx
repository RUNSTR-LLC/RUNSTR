// src/screens/LevelDetailScreen.tsx
// Repurposed as Streak Detail Screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { theme } from '../styles/theme';
import { TexturedBackground } from '../components/ui/TexturedBackground';
import LocalWorkoutStorageService from '../services/fitness/LocalWorkoutStorageService';

const GRACE_PERIOD_DAYS = 3;

function getLastWorkoutLabel(daysSince: number): string {
  if (daysSince === 0) return 'Today';
  if (daysSince === 1) return 'Yesterday';
  return `${daysSince} days ago`;
}

function computeStreaks(workouts: { startTime: string; source: string }[]): {
  current: number;
  longest: number;
  totalWorkoutDays: number;
  daysSinceLast: number;
} {
  const qualifying = workouts.filter((w) => w.source !== 'daily_steps');
  const uniqueDates = [
    ...new Set(qualifying.map((w) => w.startTime?.slice(0, 10)).filter(Boolean)),
  ].sort((a, b) => (b > a ? 1 : -1));

  if (uniqueDates.length === 0) {
    return { current: 0, longest: 0, totalWorkoutDays: 0, daysSinceLast: -1 };
  }

  const dates = [...uniqueDates].reverse();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mostRecent = new Date(dates[dates.length - 1]);
  mostRecent.setHours(0, 0, 0, 0);
  const daysSinceLast = Math.round(
    (today.getTime() - mostRecent.getTime()) / (24 * 60 * 60 * 1000)
  );

  // Longest streak
  let longest = 1;
  let temp = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const gap = Math.round((curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
    if (gap <= GRACE_PERIOD_DAYS) {
      temp++;
    } else {
      temp = 1;
    }
    if (temp > longest) longest = temp;
  }

  // Current streak
  let current: number;
  if (daysSinceLast >= GRACE_PERIOD_DAYS) {
    current = 0;
  } else {
    current = 1;
    for (let i = dates.length - 2; i >= 0; i--) {
      const curr = new Date(dates[i + 1]);
      const prev = new Date(dates[i]);
      const gap = Math.round((curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
      if (gap <= GRACE_PERIOD_DAYS) {
        current++;
      } else {
        break;
      }
    }
  }

  return { current, longest, totalWorkoutDays: uniqueDates.length, daysSinceLast };
}

export const LevelDetailScreen: React.FC = () => {
  const navigation = useNavigation();

  const [streakData, setStreakData] = useState<{
    current: number;
    longest: number;
    totalWorkoutDays: number;
    daysSinceLast: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const workouts = await LocalWorkoutStorageService.getAllWorkouts();
      setStreakData(computeStreaks(workouts));
    } catch (error) {
      console.error('[StreakDetail] Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TexturedBackground edges={[]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
          </View>
        </TexturedBackground>
      </SafeAreaView>
    );
  }

  const { current = 0, longest = 0, totalWorkoutDays = 0, daysSinceLast = -1 } =
    streakData || {};
  const workedOutToday = daysSinceLast === 0;
  const inGracePeriod = !workedOutToday && current > 0;
  const graceDaysLeft = inGracePeriod
    ? GRACE_PERIOD_DAYS - 1 - daysSinceLast
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TexturedBackground edges={[]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Level</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Level number */}
          <View style={styles.streakHeader}>
            <Text style={[styles.streakNumber, inGracePeriod && styles.dimmed]}>
              {current}
            </Text>
            <Text style={[styles.streakSubtitle, inGracePeriod && styles.dimmed]}>
              Level {current}
            </Text>
          </View>

          {/* Grace period warning */}
          {inGracePeriod && (
            <View style={styles.graceCard}>
              <Text style={styles.graceText}>
                {graceDaysLeft > 0
                  ? `Work out within ${graceDaysLeft} day${graceDaysLeft !== 1 ? 's' : ''} to keep your level`
                  : 'Last chance — your level resets tomorrow'}
              </Text>
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Last workout</Text>
              <Text style={styles.statValue}>
                {daysSinceLast >= 0 ? getLastWorkoutLabel(daysSinceLast) : 'Never'}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Highest level</Text>
              <Text style={styles.statValue}>{longest}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total workout days</Text>
              <Text style={styles.statValue}>{totalWorkoutDays}</Text>
            </View>
          </View>

          {/* How levels work */}
          <View style={styles.explainerCard}>
            <Text style={styles.explainerTitle}>How Levels Work</Text>
            <Text style={styles.explainerText}>
              Your level is your workout streak. Each day you complete
              a workout, you gain a level. Miss more than 2 days and
              your level resets. Passive step counting doesn't count,
              but any tracked activity does.
            </Text>
          </View>
        </ScrollView>
      </TexturedBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  streakHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  streakNumber: {
    color: theme.colors.accent,
    fontSize: 56,
    fontWeight: theme.typography.weights.extraBold,
    lineHeight: 60,
  },
  streakSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    marginTop: 2,
  },
  dimmed: {
    opacity: 0.45,
  },
  graceCard: {
    width: '100%',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.orangeDeep,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  graceText: {
    color: theme.colors.orangeBright,
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    textAlign: 'center',
  },
  statsCard: {
    width: '100%',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
  },
  explainerCard: {
    width: '100%',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  explainerTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    marginBottom: 8,
  },
  explainerText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    lineHeight: 20,
  },
});
