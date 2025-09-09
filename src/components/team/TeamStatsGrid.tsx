/**
 * TeamStatsGrid - 2x2 grid displaying team statistics
 * Matches HTML mockup styling exactly with precise spacing and typography
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { TeamStats } from '../../types';

interface TeamStatsGridProps {
  stats: TeamStats;
}

interface StatItemProps {
  label: string;
  value: string | number;
}

const StatItem: React.FC<StatItemProps> = ({ label, value }) => {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
};

export const TeamStatsGrid: React.FC<TeamStatsGridProps> = ({ stats }) => {
  const formatMemberCount = (count: number): string => {
    return count.toString();
  };

  const formatEventCount = (count: number): string => {
    return count.toString();
  };

  const formatChallengeCount = (count: number): string => {
    return count.toString();
  };

  const formatAvgPace = (pace: string): string => {
    return pace; // Already formatted like "6:45/mi"
  };

  return (
    <View style={styles.statsGrid}>
      <StatItem label="MEMBERS" value={formatMemberCount(stats.memberCount)} />
      <StatItem label="AVG PACE" value={formatAvgPace(stats.avgPace)} />
      <StatItem
        label="ACTIVE EVENTS"
        value={formatEventCount(stats.activeEvents)}
      />
      <StatItem
        label="CHALLENGES"
        value={formatChallengeCount(stats.activeChallenges)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 16,
  },

  statItem: {
    flex: 1,
    minWidth: '45%', // Ensures 2 items per row with gap
    flexDirection: 'column',
    gap: 2,
  },

  statLabel: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '400',
  },

  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
