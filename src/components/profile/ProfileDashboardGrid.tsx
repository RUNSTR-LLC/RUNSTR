/**
 * ProfileDashboardGrid — 2x2 grid of compact summary cards
 * Level | Rewards Destination | Club | Workouts
 * All four cards are tappable and navigate to detail views.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { theme } from '../../styles/theme';
import { Avatar } from '../ui/Avatar';
import type { ProfileLevelData, RecentWorkout, ClubAffiliation } from '../../services/backend/ProfileDataService';

interface ProfileDashboardGridProps {
  levelData: ProfileLevelData | null;
  clubs: ClubAffiliation[];
  recentWorkouts: RecentWorkout[];
  rewardDestination: string | null;
  rewardDestinationImage?: number; // Bundled image from require()
  isLoading: boolean;
  onLevelPress: () => void;
  onClubPress: (clubId: string, clubName: string) => void;
  onEmptyClubPress?: () => void;
  onRewardsPress: () => void;
  onWorkoutsPress: () => void;
}

// ---------------------------------------------------------------------------
// Skeleton placeholder
// ---------------------------------------------------------------------------

const Skeleton: React.FC<{ width: number; height: number }> = ({ width, height }) => (
  <View style={{ width, height, borderRadius: height / 2, backgroundColor: theme.colors.border }} />
);

// ---------------------------------------------------------------------------
// Level Card (top-left)
// ---------------------------------------------------------------------------

const RING_SIZE = 64;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const ProgressRing: React.FC<{ progress: number }> = ({ progress }) => {
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - Math.min(progress, 1));
  return (
    <Svg width={RING_SIZE} height={RING_SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
        stroke={theme.colors.border} strokeWidth={RING_STROKE} fill="none" />
      <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
        stroke={theme.colors.accent} strokeWidth={RING_STROKE} fill="none"
        strokeDasharray={`${RING_CIRCUMFERENCE}`} strokeDashoffset={strokeDashoffset}
        strokeLinecap="round" />
    </Svg>
  );
};

const LevelMiniCard: React.FC<{ data: ProfileLevelData | null; isLoading: boolean; onPress: () => void }> = ({ data, isLoading, onPress }) => {
  if (isLoading) {
    return (
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
        <Skeleton width={64} height={64} />
        <Skeleton width={60} height={12} />
      </TouchableOpacity>
    );
  }

  const d = data ?? { level: 0, title: 'Beginner', currentXP: 0, xpForNextLevel: 100, progress: 0, totalXP: 0, currentStreak: 0, bestStreak: 0 };

  const formatXP = (xp: number): string => {
    if (xp >= 10000) return `${(xp / 1000).toFixed(1)}K`;
    if (xp >= 1000) return xp.toLocaleString();
    return `${xp}`;
  };

  return (
    <TouchableOpacity style={[styles.card, styles.levelCard]} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.cardLabel}>Level</Text>
      <View style={styles.ringContainer}>
        <ProgressRing progress={d.progress} />
        <Text style={styles.ringLevelNumber}>{d.level}</Text>
      </View>
      <Text style={styles.levelTitle}>{d.title}</Text>
      <Text style={styles.xpText}>{formatXP(d.currentXP)} / {formatXP(d.xpForNextLevel)} XP</Text>
      {d.currentStreak > 0 && (
        <Text style={styles.streakText}>{d.currentStreak}d streak</Text>
      )}
    </TouchableOpacity>
  );
};

// ---------------------------------------------------------------------------
// Rewards Destination Card (top-right)
// ---------------------------------------------------------------------------

const RewardsMiniCard: React.FC<{ destination: string | null; destinationImage?: number; isLoading: boolean; onPress: () => void }> = ({ destination, destinationImage, isLoading, onPress }) => {
  if (isLoading) {
    return (
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
        <Skeleton width={60} height={12} />
        <Skeleton width={50} height={14} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.cardLabel}>Rewards Destination</Text>
      <View style={styles.avatarRow}>
        <Avatar name={destination || '?'} size={28} imageSource={destinationImage} />
        <Text style={styles.rewardDestination} numberOfLines={2}>
          {destination || 'Set Destination'}
        </Text>
      </View>
      <Text style={styles.tapHint}>Tap to change</Text>
    </TouchableOpacity>
  );
};

// ---------------------------------------------------------------------------
// Club Card (bottom-left)
// ---------------------------------------------------------------------------

const ClubMiniCard: React.FC<{ clubs: ClubAffiliation[]; isLoading: boolean; onPress: (clubId: string, clubName: string) => void; onEmptyPress?: () => void }> = ({ clubs, isLoading, onPress, onEmptyPress }) => {
  if (isLoading) {
    return (
      <View style={styles.card}>
        <Skeleton width={50} height={12} />
        <Skeleton width={70} height={14} />
      </View>
    );
  }

  const firstClub = clubs.length > 0 ? clubs[0] : null;

  if (!firstClub) {
    return (
      <TouchableOpacity style={styles.card} onPress={onEmptyPress} activeOpacity={0.7}>
        <Text style={styles.cardLabel}>Club</Text>
        <Text style={styles.emptyHint}>No club yet</Text>
        <Text style={styles.tapHint}>Join from Clubs tab</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(firstClub.id, firstClub.name)} activeOpacity={0.7}>
      <Text style={styles.cardLabel}>Club</Text>
      <View style={styles.avatarRow}>
        <Avatar name={firstClub.name} size={28} imageUrl={firstClub.imageUrl} />
        <Text style={styles.clubName} numberOfLines={2}>{firstClub.name}</Text>
      </View>
      {firstClub.role === 'captain' && (
        <Text style={styles.clubRole}>Captain</Text>
      )}
      <Text style={styles.tapHint}>{firstClub.memberCount} members</Text>
    </TouchableOpacity>
  );
};

// ---------------------------------------------------------------------------
// Workouts Card (bottom-right)
// ---------------------------------------------------------------------------

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function relativeDay(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yest';
  if (diff <= 7) return `${diff}d`;
  return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

const WorkoutsMiniCard: React.FC<{ workouts: RecentWorkout[]; isLoading: boolean; onPress: () => void }> = ({ workouts, isLoading, onPress }) => {
  if (isLoading) {
    return (
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
        <Skeleton width={60} height={12} />
        <Skeleton width={80} height={10} />
      </TouchableOpacity>
    );
  }

  const recent = workouts.slice(0, 2);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.cardLabel}>Workouts</Text>
      {recent.length > 0 ? (
        recent.map((w) => (
          <Text key={w.id} style={styles.workoutLine} numberOfLines={1}>
            {capitalize(w.activityType)} · {relativeDay(w.createdAt)}
          </Text>
        ))
      ) : (
        <Text style={styles.emptyHint}>None yet</Text>
      )}
      <Text style={styles.tapHint}>View history</Text>
    </TouchableOpacity>
  );
};

// ---------------------------------------------------------------------------
// Main Grid
// ---------------------------------------------------------------------------

export const ProfileDashboardGrid: React.FC<ProfileDashboardGridProps> = ({
  levelData, clubs, recentWorkouts, rewardDestination, rewardDestinationImage,
  isLoading, onLevelPress, onClubPress, onEmptyClubPress, onRewardsPress, onWorkoutsPress,
}) => (
  <View style={styles.grid}>
    <View style={styles.gridRow}>
      <LevelMiniCard data={levelData} isLoading={isLoading} onPress={onLevelPress} />
      <WorkoutsMiniCard workouts={recentWorkouts} isLoading={isLoading} onPress={onWorkoutsPress} />
    </View>
    <View style={styles.gridRow}>
      <ClubMiniCard clubs={clubs} isLoading={isLoading} onPress={onClubPress} onEmptyPress={onEmptyClubPress} />
      <RewardsMiniCard destination={rewardDestination} destinationImage={rewardDestinationImage} isLoading={isLoading} onPress={onRewardsPress} />
    </View>
  </View>
);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  grid: {
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    minHeight: 120,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 10,
    gap: 3,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  // Level card
  levelCard: {
    alignItems: 'center',
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  ringLevelNumber: {
    position: 'absolute',
    fontSize: 22,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
  },
  levelTitle: {
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },
  xpText: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  streakText: {
    fontSize: 10,
    color: theme.colors.accent,
  },

  // Shared avatar row
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Rewards card
  rewardDestination: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    lineHeight: 17,
    flex: 1,
  },
  tapHint: {
    fontSize: 10,
    color: theme.colors.textDark,
    marginTop: 'auto' as any,
  },

  // Club card
  clubName: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    lineHeight: 17,
    flex: 1,
  },
  clubRole: {
    fontSize: 10,
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.medium,
  },

  // Workouts card
  workoutLine: {
    fontSize: 12,
    color: theme.colors.text,
    lineHeight: 16,
  },
  emptyHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
});
