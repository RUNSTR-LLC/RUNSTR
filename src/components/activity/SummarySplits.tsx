/**
 * SummarySplits - Per-km (or per-mile) splits list for the post-run summary
 * Marks each split faster/slower than the run's average split pace.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import type { Split } from '../../services/activity/SplitTrackingService';
import { activityMetricsService } from '../../services/activity/ActivityMetricsService';

interface SummarySplitsProps {
  splits: Split[];
  isMetric: boolean;
}

// Seconds per km a split must differ from the average to count as faster/slower
const PACE_THRESHOLD = 5;

const formatSplitTime = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const SummarySplits: React.FC<SummarySplitsProps> = ({ splits, isMetric }) => {
  const avgPace = splits.reduce((sum, s) => sum + s.pace, 0) / splits.length;

  const trendIcon = (pace: number): keyof typeof Ionicons.glyphMap => {
    const diff = pace - avgPace;
    if (diff < -PACE_THRESHOLD) return 'trending-up';
    if (diff > PACE_THRESHOLD) return 'trending-down';
    return 'remove';
  };

  return (
    <View style={styles.section}>
      <Text style={styles.header}>Splits</Text>
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {splits.map((split) => (
          <View key={split.number} style={styles.row}>
            <Text style={styles.number}>
              {split.number}
              {isMetric ? 'K' : 'M'}
            </Text>
            <View style={styles.middle}>
              <Text style={styles.time}>{formatSplitTime(split.splitTime)}</Text>
              <Text style={styles.pace}>{activityMetricsService.formatPace(split.pace)}</Text>
            </View>
            <Ionicons
              name={trendIcon(split.pace)}
              size={16}
              color={trendIcon(split.pace) === 'trending-up' ? theme.colors.text : theme.colors.textMuted}
            />
          </View>
        ))}
      </ScrollView>
      <Text style={styles.footer}>
        Average pace: {activityMetricsService.formatPace(avgPace)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.medium,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  list: {
    maxHeight: 160,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  number: {
    width: 40,
    marginRight: 12,
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  middle: {
    flex: 1,
  },
  time: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 2,
  },
  pace: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  footer: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
});
