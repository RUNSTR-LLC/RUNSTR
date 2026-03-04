/**
 * ProfileStatsGrid Component - 2x2 grid of workout stats
 * Displays total workouts, distance, best streak, and current streak.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import type { ProfileStats } from '../../services/backend/ProfileDataService';

interface ProfileStatsGridProps {
  stats: ProfileStats | null;
  isLoading?: boolean;
}

interface StatCellData {
  label: string;
  value: string;
}

function buildCells(stats: ProfileStats): StatCellData[] {
  return [
    {
      label: 'Workouts',
      value: stats.totalWorkouts.toLocaleString(),
    },
    {
      label: 'Distance',
      value: `${stats.totalDistanceKm.toFixed(1)} km`,
    },
    {
      label: 'Best Streak',
      value: `${stats.longestStreakDays}d`,
    },
    {
      label: 'Current Streak',
      value: `${stats.currentStreakDays}d`,
    },
  ];
}

export const ProfileStatsGrid: React.FC<ProfileStatsGridProps> = ({
  stats,
  isLoading = false,
}) => {
  const showSkeleton = isLoading || !stats;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {showSkeleton
          ? SKELETON_CELLS.map((_, i) => <SkeletonCell key={i} />)
          : buildCells(stats!).map((cell, i) => (
              <StatCell key={i} label={cell.label} value={cell.value} />
            ))}
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Internal cells
// ---------------------------------------------------------------------------

const StatCell: React.FC<StatCellData> = ({ label, value }) => (
  <View style={styles.cell}>
    <Text style={styles.cellValue}>{value}</Text>
    <Text style={styles.cellLabel}>{label}</Text>
  </View>
);

const SkeletonCell: React.FC = () => (
  <View style={styles.cell}>
    <View style={styles.skeletonValue} />
    <View style={styles.skeletonLabel} />
  </View>
);

const SKELETON_CELLS = [0, 1, 2, 3];

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
  },

  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  cell: {
    width: '50%',
    paddingVertical: 10,
    alignItems: 'center',
  },

  cellValue: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 2,
  },

  cellLabel: {
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Skeletons
  skeletonValue: {
    width: 48,
    height: 20,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
    marginBottom: 4,
  },
  skeletonLabel: {
    width: 60,
    height: 12,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
  },
});
