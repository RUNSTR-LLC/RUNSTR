import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../styles/theme';
import type { EventStats as EventStatsType } from '../../types';

interface EventStatsProps {
  stats?: EventStatsType;
  title?: string;
  style?: ViewStyle;
  participantCount?: number;
  completedCount?: number;
}

export const EventStats: React.FC<EventStatsProps> = ({
  stats,
  title = 'Event Stats',
  style,
  participantCount,
  completedCount,
}) => {
  // Use individual props if provided, otherwise use stats object
  const actualStats = stats || {
    participantCount: participantCount || 0,
    completedCount: completedCount || 0,
    completionRate: participantCount
      ? Math.round(((completedCount || 0) / participantCount) * 100)
      : 0,
  };
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.statsGrid}>
        <StatItem number={actualStats.participantCount} label="Participants" />
        <StatItem number={actualStats.completedCount} label="Completed" />
      </View>
    </View>
  );
};

interface StatItemProps {
  number: number;
  label: string;
  style?: ViewStyle;
}

export const StatItem: React.FC<StatItemProps> = ({ number, label, style }) => {
  return (
    <View style={[styles.statItem, style]}>
      <Text style={styles.statNumber}>{number}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
};

interface StatsGridProps {
  stats: { number: number; label: string }[];
  columns?: number;
  style?: ViewStyle;
}

export const StatsGrid: React.FC<StatsGridProps> = ({
  stats,
  columns = 2,
  style,
}) => {
  return (
    <View style={[styles.statsGrid, style]}>
      {stats.map((stat, index) => (
        <StatItem key={index} number={stat.number} label={stat.label} />
      ))}
    </View>
  );
};

interface CompactEventStatsProps {
  participantCount: number;
  completedCount: number;
  style?: ViewStyle;
}

export const CompactEventStats: React.FC<CompactEventStatsProps> = ({
  participantCount,
  completedCount,
  style,
}) => {
  const completionRate =
    participantCount > 0
      ? Math.round((completedCount / participantCount) * 100)
      : 0;

  return (
    <View style={[styles.compactContainer, style]}>
      <View style={styles.compactStat}>
        <Text style={styles.compactNumber}>{participantCount}</Text>
        <Text style={styles.compactLabel}>joined</Text>
      </View>
      <View style={styles.compactStat}>
        <Text style={styles.compactNumber}>{completedCount}</Text>
        <Text style={styles.compactLabel}>completed</Text>
      </View>
      <View style={styles.compactStat}>
        <Text style={styles.compactNumber}>{completionRate}%</Text>
        <Text style={styles.compactLabel}>done</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Main stats section (matches HTML mockup .stats-section)
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.xxl,
    marginBottom: theme.spacing.xxxl,
  },

  // Stats title (matches HTML mockup .stats-title)
  title: {
    fontSize: theme.typography.cardTitle,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xl,
  },

  // Stats grid layout (matches HTML mockup .stats-grid)
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.xxl,
  },

  // Individual stat item (matches HTML mockup .stat-item)
  statItem: {
    flex: 1,
    alignItems: 'center',
  },

  // Stat number (matches HTML mockup .stat-number)
  statNumber: {
    fontSize: theme.typography.prizeNumber,
    fontWeight: theme.typography.weights.extraBold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },

  // Stat label (matches HTML mockup .stat-label)
  statLabel: {
    fontSize: theme.typography.eventDetails,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Compact stats container (for smaller displays)
  compactContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.xl,
  },

  // Compact stat item
  compactStat: {
    alignItems: 'center',
  },

  // Compact stat number
  compactNumber: {
    fontSize: theme.typography.leaderboardTitle,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  // Compact stat label
  compactLabel: {
    fontSize: theme.typography.eventDetails,
    color: theme.colors.textMuted,
  },
});
