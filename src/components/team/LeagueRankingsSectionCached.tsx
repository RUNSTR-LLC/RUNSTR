/**
 * LeagueRankingsSectionCached - Refactored with intelligent caching
 * Uses cache-aware hooks for optimal performance and user experience
 * Demonstrates the power of our unified caching strategy
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { theme } from '../../styles/theme';
import { MemberAvatar } from '../ui/MemberAvatar';
import { useLeagueRankings, useTeamMembers, useNostrProfile } from '../../hooks/useCachedData';
import type { LeagueParameters } from '../../services/competition/leagueRankingService';

export interface LeagueRankingsSectionProps {
  competitionId: string;
  parameters: LeagueParameters;
  teamId: string;
  captainPubkey: string;
  onMemberPress?: (npub: string) => void;
  onViewFullLeaderboard?: () => void;
  style?: any;
  showFullList?: boolean;
  maxDisplayed?: number;
  isDefaultLeague?: boolean;
}

/**
 * CACHED VERSION - Clean component that uses hooks
 * Compare this to the original - no direct service calls!
 */
export const LeagueRankingsSectionCached: React.FC<LeagueRankingsSectionProps> = ({
  competitionId,
  parameters,
  teamId,
  captainPubkey,
  onMemberPress,
  onViewFullLeaderboard,
  style,
  showFullList = false,
  maxDisplayed = 5,
  isDefaultLeague = false,
}) => {
  const [refreshing, setRefreshing] = useState(false);

  // HOOK 1: Get cached team members with auto-refresh
  const {
    members,
    loading: membersLoading,
    error: membersError,
    refetch: refetchMembers,
  } = useTeamMembers(teamId, captainPubkey);

  // HOOK 2: Get cached rankings with auto-refresh
  const {
    rankings,
    loading: rankingsLoading,
    error: rankingsError,
    refetch: refetchRankings,
  } = useLeagueRankings(competitionId, parameters, members);

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Force refresh both members and rankings
      await Promise.all([
        refetchMembers(),
        refetchRankings(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // Determine display list
  const displayRankings = useMemo(() => {
    if (!rankings) return [];
    return showFullList ? rankings : rankings.slice(0, maxDisplayed);
  }, [rankings, showFullList, maxDisplayed]);

  const hasMore = rankings && rankings.length > maxDisplayed;

  // Loading state (only on initial load, not refresh)
  if ((membersLoading || rankingsLoading) && !refreshing && !rankings?.length) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading rankings...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (membersError || rankingsError) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.errorText}>
          Failed to load rankings. Pull to refresh.
        </Text>
      </View>
    );
  }

  // Empty state
  if (!rankings || rankings.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>
            {isDefaultLeague ? 'No Activity Yet' : 'No Rankings Yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {isDefaultLeague
              ? 'Team members will appear here once they start logging workouts'
              : 'Rankings will appear once the competition starts'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, style]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {isDefaultLeague ? 'Team Activity' : 'Rankings'}
          </Text>
          {rankings.length > 0 && (
            <Text style={styles.subtitle}>
              {rankings.length} {rankings.length === 1 ? 'member' : 'members'}
            </Text>
          )}
        </View>

        {/* Rankings List */}
        <View style={styles.rankingsList}>
          {displayRankings.map((entry, index) => (
            <RankingRow
              key={`${entry.npub}-${index}`}
              entry={entry}
              rank={index + 1}
              onPress={() => onMemberPress?.(entry.npub)}
            />
          ))}
        </View>

        {/* View More Button */}
        {hasMore && !showFullList && (
          <TouchableOpacity
            style={styles.viewMoreButton}
            onPress={onViewFullLeaderboard}
          >
            <Text style={styles.viewMoreText}>
              View Full Leaderboard ({rankings.length - maxDisplayed} more)
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

/**
 * Individual ranking row component with cached profile data
 */
const RankingRow: React.FC<{
  entry: any;
  rank: number;
  onPress?: () => void;
}> = ({ entry, rank, onPress }) => {
  // HOOK 3: Each row fetches its own cached profile
  const { profile } = useNostrProfile(entry.npub);

  const displayName = profile?.name || profile?.display_name || entry.name;

  return (
    <TouchableOpacity
      style={styles.rankingRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Rank Badge */}
      <View style={[styles.rankBadge, getRankStyle(rank)]}>
        <Text style={styles.rankText}>{rank}</Text>
      </View>

      {/* Avatar */}
      {/* Avatar - simplified for now */}
      <View style={[styles.avatar, { backgroundColor: theme.colors.syncBackground }]} />

      {/* Name and Stats */}
      <View style={styles.memberInfo}>
        <Text style={styles.memberName} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={styles.memberStats}>
          {formatStats(entry)}
        </Text>
      </View>

      {/* Score */}
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreValue}>{entry.score || 0}</Text>
        <Text style={styles.scoreLabel}>points</Text>
      </View>
    </TouchableOpacity>
  );
};

// Helper functions
const getRankStyle = (rank: number) => {
  switch (rank) {
    case 1:
      return styles.goldRank;
    case 2:
      return styles.silverRank;
    case 3:
      return styles.bronzeRank;
    default:
      return {};
  }
};

const formatStats = (entry: any) => {
  if (entry.totalDistance) {
    return `${(entry.totalDistance / 1000).toFixed(1)}km`;
  }
  if (entry.workoutCount) {
    return `${entry.workoutCount} workouts`;
  }
  return 'No activity';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
    padding: 24,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  rankingsList: {
    gap: 12,
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goldRank: {
    backgroundColor: '#FFD700',
  },
  silverRank: {
    backgroundColor: '#C0C0C0',
  },
  bronzeRank: {
    backgroundColor: '#CD7F32',
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  avatar: {
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  memberStats: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  scoreLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  viewMoreButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});

export default LeagueRankingsSectionCached;