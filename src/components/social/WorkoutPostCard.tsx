/**
 * WorkoutPostCard — native inline replacement for the full-bleed workout
 * PNG in the Social feed.
 *
 * The workout card PNG generator produces a 9:16 portrait image optimized
 * for Instagram Stories — lovely for external shares, but in-app it fills
 * the feed viewport with a single post. This component renders the core
 * stats using workout data from Supabase, at roughly 1/3 the height. What's
 * shown adapts to the activity (see deriveWorkoutCardDisplay): a steps post
 * shows only the step count; a walk shows distance + steps + time but no pace.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { deriveWorkoutCardDisplay } from './workoutCardDisplay';
import type { WorkoutCardData } from './workoutCardDisplay';

export type { WorkoutCardData } from './workoutCardDisplay';

interface WorkoutPostCardProps {
  workout: WorkoutCardData;
  unit?: 'km' | 'mi';
}

const pad = (n: number) => String(n).padStart(2, '0');

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};

const formatPace = (distanceMeters: number, durationSeconds: number, unit: 'km' | 'mi'): string => {
  if (!distanceMeters || !durationSeconds) return '—';
  const distance = unit === 'mi' ? distanceMeters / 1609.344 : distanceMeters / 1000;
  if (distance === 0) return '—';
  const secondsPerUnit = durationSeconds / distance;
  const m = Math.floor(secondsPerUnit / 60);
  const s = Math.floor(secondsPerUnit % 60);
  return `${m}:${pad(s)}/${unit}`;
};

const capitalize = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);

export const WorkoutPostCard: React.FC<WorkoutPostCardProps> = ({ workout, unit = 'km' }) => {
  const {
    heroValue,
    heroUnit,
    heroDecimals,
    showTime,
    showPace,
    showStepsStat,
    showCalories,
  } = deriveWorkoutCardDisplay(workout, unit);

  return (
    <View style={styles.card}>
      <Text style={styles.activity}>{capitalize(workout.activity_type)}</Text>

      <View style={styles.heroRow}>
        <AnimatedNumber
          value={heroValue}
          decimals={heroDecimals}
          style={styles.heroNumber}
          animateOnMount
        />
        <Text style={styles.heroUnit}>{heroUnit}</Text>
      </View>

      {showTime || showPace || showStepsStat || showCalories ? (
        <View style={styles.statsRow}>
          {showTime ? (
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>TIME</Text>
              <Text style={styles.statValue}>{formatDuration(workout.duration_seconds!)}</Text>
            </View>
          ) : null}
          {showPace ? (
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>PACE</Text>
              <Text style={styles.statValue}>
                {formatPace(workout.distance_meters!, workout.duration_seconds!, unit)}
              </Text>
            </View>
          ) : null}
          {showStepsStat ? (
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>STEPS</Text>
              <Text style={styles.statValue}>{workout.step_count!.toLocaleString()}</Text>
            </View>
          ) : null}
          {showCalories ? (
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>CAL</Text>
              <Text style={styles.statValue}>{workout.calories}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginTop: 10,
    alignItems: 'center',
  },
  activity: {
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 18,
  },
  heroNumber: {
    fontSize: 56,
    fontWeight: theme.typography.weights.extraBold,
    color: theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
  heroUnit: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    letterSpacing: 1.5,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    paddingTop: 14,
  },
  statCell: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
});
