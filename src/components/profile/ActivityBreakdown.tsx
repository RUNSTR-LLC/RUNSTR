/**
 * ActivityBreakdown Component - Horizontal bars for Cardio/Strength/Wellness
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import type { ActivityBreakdownData } from '../../services/backend/ProfileDataService';

interface ActivityBreakdownProps {
  breakdown: ActivityBreakdownData | null;
  isLoading?: boolean;
}

interface BarRowProps {
  label: string;
  count: number;
  percent: number;
  color: string;
}

const BarRow: React.FC<BarRowProps> = ({ label, count, percent, color }) => (
  <View style={styles.barRow}>
    <View style={styles.barLabelRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <Text style={styles.barStats}>
        {count} <Text style={styles.barPercent}>({percent}%)</Text>
      </Text>
    </View>
    <View style={styles.barTrack}>
      <View
        style={[
          styles.barFill,
          { width: `${Math.min(percent, 100)}%`, backgroundColor: color },
        ]}
      />
    </View>
  </View>
);

const SkeletonBar: React.FC = () => (
  <View style={styles.barRow}>
    <View style={styles.barLabelRow}>
      <View style={{ width: 60, height: 12, borderRadius: 6, backgroundColor: theme.colors.border }} />
      <View style={{ width: 40, height: 12, borderRadius: 6, backgroundColor: theme.colors.border }} />
    </View>
    <View style={styles.barTrack} />
  </View>
);

export const ActivityBreakdown: React.FC<ActivityBreakdownProps> = ({ breakdown, isLoading }) => {
  if (isLoading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACTIVITY BREAKDOWN</Text>
        <View style={styles.card}>
          <SkeletonBar />
          <SkeletonBar />
          <SkeletonBar />
        </View>
      </View>
    );
  }

  const data = breakdown ?? {
    cardio: 0, strength: 0, wellness: 0, total: 0,
    cardioPercent: 0, strengthPercent: 0, wellnessPercent: 0,
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ACTIVITY BREAKDOWN</Text>
      <View style={styles.card}>
        <BarRow
          label="Cardio"
          count={data.cardio}
          percent={data.cardioPercent}
          color={theme.colors.accent}
        />
        <BarRow
          label="Strength"
          count={data.strength}
          percent={data.strengthPercent}
          color={theme.colors.accentBright}
        />
        <BarRow
          label="Wellness"
          count={data.wellness}
          percent={data.wellnessPercent}
          color={theme.colors.textMuted}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  barRow: {
    gap: 4,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barLabel: {
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },
  barStats: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  barPercent: {
    color: theme.colors.textMuted,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
});
