/**
 * LevelCard Component - Shows level, XP progress, and streaks
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import type { ProfileLevelData } from '../../services/backend/ProfileDataService';

interface LevelCardProps {
  levelData: ProfileLevelData | null;
  isLoading?: boolean;
}

const SkeletonBar: React.FC<{ width: number; height: number }> = ({ width, height }) => (
  <View style={{ width, height, borderRadius: height / 2, backgroundColor: theme.colors.border }} />
);

export const LevelCard: React.FC<LevelCardProps> = ({ levelData, isLoading }) => {
  if (isLoading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>LEVEL</Text>
        <View style={styles.card}>
          <View style={styles.topRow}>
            <SkeletonBar width={40} height={20} />
            <SkeletonBar width={80} height={14} />
            <SkeletonBar width={50} height={14} />
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '0%' }]} />
          </View>
          <View style={styles.bottomRow}>
            <SkeletonBar width={70} height={12} />
            <SkeletonBar width={70} height={12} />
          </View>
        </View>
      </View>
    );
  }

  const data = levelData ?? {
    level: 0, title: 'Beginner', currentXP: 0, xpForNextLevel: 100,
    progress: 0, totalXP: 0, currentStreak: 0, bestStreak: 0,
  };

  const formatXP = (xp: number): string => {
    if (xp >= 10000) return `${(xp / 1000).toFixed(1)}K`;
    if (xp >= 1000) return xp.toLocaleString();
    return `${xp}`;
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>LEVEL</Text>
      <View style={styles.card}>
        {/* Top row: Level number + title + XP */}
        <View style={styles.topRow}>
          <Text style={styles.levelNumber}>{data.level}</Text>
          <Text style={styles.levelTitle}>{data.title}</Text>
          <Text style={styles.xpCounter}>
            {formatXP(data.currentXP)} / {formatXP(data.xpForNextLevel)} XP
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(data.progress * 100, 100)}%` },
            ]}
          />
        </View>

        {/* Bottom row: Streaks */}
        <View style={styles.bottomRow}>
          <Text style={styles.streakText}>
            Current Streak: {data.currentStreak}d
          </Text>
          <Text style={styles.streakText}>
            Best Streak: {data.bestStreak}d
          </Text>
        </View>
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
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  levelNumber: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
  },
  levelTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    flex: 1,
  },
  xpCounter: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accent,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  streakText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
});
