/**
 * WorkoutPostCard — native inline replacement for the full-bleed workout
 * PNG in the Social feed.
 *
 * The workout card PNG generator produces a 9:16 portrait image optimized
 * for Instagram Stories — lovely for external shares, but in-app it fills
 * the feed viewport with a single post. This component renders the same
 * core stats (distance, time, pace, calories) using workout data from
 * Supabase, at roughly 1/3 the height.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { AnimatedNumber } from '../ui/AnimatedNumber';

export interface WorkoutCardData {
  activity_type: string;
  distance_meters: number | null;
  duration_seconds: number | null;
  calories: number | null;
  step_count?: number | null;
}

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
  const hasDistance = !!workout.distance_meters && workout.distance_meters > 0;
  const hasDuration = !!workout.duration_seconds && workout.duration_seconds > 0;

  const heroValue = hasDistance
    ? (unit === 'mi' ? workout.distance_meters! / 1609.344 : workout.distance_meters! / 1000)
    : workout.step_count ?? 0;
  const heroUnit = hasDistance ? unit.toUpperCase() : 'STEPS';
  const heroDecimals = hasDistance ? 2 : 0;

  const showPace = hasDistance && hasDuration;
  const hasCalories = !!workout.calories && workout.calories > 0;

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

      <View style={styles.statsRow}>
        {hasDuration ? (
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
        {hasCalories ? (
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>CAL</Text>
            <Text style={styles.statValue}>{workout.calories}</Text>
          </View>
        ) : null}
      </View>
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
