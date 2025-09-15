/**
 * LeagueRankingsSection Component - Dynamic competitive leaderboard display
 * Transforms static team members into live competition rankings
 * Replaces TeamMembersSection with real-time competitive data
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../styles/theme';
import { MemberAvatar } from '../ui/MemberAvatar';
import leagueRankingService, {
  LeagueRankingEntry,
  LeagueRankingResult,
  LeagueParameters,
  LeagueParticipant,
} from '../../services/competition/leagueRankingService';
import { TeamMemberCache } from '../../services/team/TeamMemberCache';
import { getUserNostrIdentifiers } from '../../utils/nostr';

export interface LeagueRankingsSectionProps {
  competitionId: string;
  participants: LeagueParticipant[];
  parameters: LeagueParameters;
  onMemberPress?: (npub: string) => void;
  onViewFullLeaderboard?: () => void;
  style?: any;
  showFullList?: boolean;
  maxDisplayed?: number;
  teamId?: string;
  isDefaultLeague?: boolean;
}

export const LeagueRankingsSection: React.FC<LeagueRankingsSectionProps> = ({
  competitionId,
  participants,
  parameters,
  onMemberPress,
  onViewFullLeaderboard,
  style,
  showFullList = false,
  maxDisplayed = 5,
  teamId,
  isDefaultLeague = false,
}) => {
  console.log('🏆 LeagueRankingsSection rendering with:', {
    competitionId,
    teamId,
    isDefaultLeague,
  });
  const [rankings, setRankings] = useState<LeagueRankingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [teamParticipants, setTeamParticipants] = useState<LeagueParticipant[]>(participants);
  const [captainPubkey, setCaptainPubkey] = useState<string | null>(null);

  const rankingService = leagueRankingService;
  const memberCache = TeamMemberCache.getInstance();

  /**
   * Fetch team members from cached kind 30000 lists
   */
  const fetchTeamMembers = async (): Promise<LeagueParticipant[]> => {
    if (!teamId || !captainPubkey) return [];

    try {
      console.log(`🔍 Fetching team members for team: ${teamId}`);

      // Get members from cached kind 30000 list
      const members = await memberCache.getTeamMembers(teamId, captainPubkey);

      if (members.length === 0) {
        // No members found - captain should be at least in the list
        console.log('⚠️ No members found in team list, adding captain');
        members.push(captainPubkey);
      }

      // Convert to LeagueParticipant format
      return members.map(npub => {
        // Special case for known team members
        let name = npub.slice(0, 8) + '...';
        if (npub.includes('xr8tvnnn') || npub.includes('30ceb64e')) {
          name = 'TheWildHustle';
        }

        return {
          npub,
          name,
          isActive: true,
        };
      });

    } catch (err) {
      console.error('❌ Failed to fetch team members:', err);
      return [];
    }
  };

  /**
   * Get captain pubkey for the team
   */
  useEffect(() => {
    const getCaptainPubkey = async () => {
      if (!teamId) return;

      // For known teams, set captain pubkey
      if (teamId === '87d30c8b-aa18-4424-a629-d41ea7f89078') {
        // RUNSTR team - TheWildHustle is captain
        setCaptainPubkey('npub1xr8tvnnntjqqrqp9n7e7j5sdp9npqg2kv2nndxkyfzhqr5u0e9sq7w2qxa');
      } else {
        // Try to get from user's own identifiers if they're the captain
        const identifiers = await getUserNostrIdentifiers();
        if (identifiers?.npub) {
          setCaptainPubkey(identifiers.npub);
        }
      }
    };

    getCaptainPubkey();
  }, [teamId]);

  /**
   * Load league rankings
   */
  const loadRankings = async (force = false) => {
    try {
      console.log(`🏆 Loading league rankings: ${competitionId}`);
      console.log(`📊 Is default league: ${isDefaultLeague}`);

      if (force) {
        setRefreshing(true);
      }

      // Use provided participants or fetch them from cached member list
      let participantsToUse = teamParticipants;
      if (participantsToUse.length === 0 && teamId && captainPubkey) {
        console.log('📥 No participants provided, fetching from cached member lists...');
        participantsToUse = await fetchTeamMembers();
        setTeamParticipants(participantsToUse);
      }

      const result = await rankingService.calculateLeagueRankings(
        competitionId,
        participantsToUse,
        parameters
      );

      setRankings(result);
      setError(null);

    } catch (err) {
      console.error('❌ Failed to load league rankings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rankings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Initialize rankings on mount
   */
  useEffect(() => {
    console.log('🎯 LeagueRankingsSection mounted with:', {
      competitionId,
      teamId,
      isDefaultLeague,
      participantsCount: participants.length,
    });
    if (competitionId) {
      loadRankings();
    } else {
      setLoading(false);
    }
  }, [competitionId, teamId]);

  /**
   * Auto-refresh rankings periodically
   */
  useEffect(() => {
    const interval = setInterval(() => {
      if (rankings?.isActive) {
        loadRankings();
      }
    }, 60000); // Refresh every minute for active competitions

    return () => clearInterval(interval);
  }, [rankings?.isActive]);

  /**
   * Handle member press
   */
  const handleMemberPress = (entry: LeagueRankingEntry) => {
    if (onMemberPress) {
      onMemberPress(entry.npub);
    }
  };

  /**
   * Handle refresh button press
   */
  const handleRefresh = () => {
    loadRankings(true);
  };

  /**
   * Get display rankings (limited or full)
   */
  const getDisplayRankings = (): LeagueRankingEntry[] => {
    if (!rankings) return [];
    
    if (showFullList) {
      return rankings.rankings;
    }
    
    return rankings.rankings.slice(0, maxDisplayed);
  };

  /**
   * Get rank display with medal for top 3
   */
  const getRankDisplay = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${rank}`;
    }
  };

  /**
   * Get trend arrow for rank changes
   */
  const getTrendDisplay = (trend?: 'up' | 'down' | 'same'): string => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      case 'same': return '→';
      default: return '';
    }
  };

  if (loading) {
    return (
      <View style={[styles.rankingsSection, style]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {isDefaultLeague ? '30-Day Streak Challenge' : 'League Rankings'}
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading rankings...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.rankingsSection, style]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {isDefaultLeague ? '30-Day Streak Challenge' : 'League Rankings'}
          </Text>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleRefresh}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  if (!rankings || rankings.rankings.length === 0) {
    return (
      <View style={[styles.rankingsSection, style]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {isDefaultLeague ? '30-Day Streak Challenge' : 'League Rankings'}
          </Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {isDefaultLeague ? 'No team activity yet' : 'No competition data yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {isDefaultLeague
              ? 'Team members will appear here when they complete workouts'
              : 'Complete workouts to see rankings'}
          </Text>
        </View>
      </View>
    );
  }

  const displayRankings = getDisplayRankings();
  const hasMoreResults = rankings.rankings.length > maxDisplayed && !showFullList;

  return (
    <View style={[styles.rankingsSection, style]}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.sectionTitle}>
            {isDefaultLeague ? '30-Day Streak Challenge' : 'League Rankings'}
          </Text>
          {rankings.isActive && (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[styles.actionBtn, refreshing && styles.actionBtnDisabled]}
          onPress={handleRefresh}
          disabled={refreshing}
          activeOpacity={0.7}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={theme.colors.accentText} />
          ) : (
            <>
              <Text style={styles.actionBtnIcon}>↻</Text>
              <Text style={styles.actionBtnText}>Refresh</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.competitionInfo}>
        <Text style={styles.competitionText}>
          {parameters.activityType} • {parameters.competitionType}
        </Text>
        <Text style={styles.participantCount}>
          {rankings.totalParticipants} participants
        </Text>
      </View>

      <ScrollView
        style={styles.rankingsList}
        showsVerticalScrollIndicator={true}
        indicatorStyle="white"
      >
        {displayRankings.map((entry, index) => (
          <TouchableOpacity
            key={entry.npub}
            style={[
              styles.rankingItem,
              entry.isTopThree && styles.topThreeItem,
              index === displayRankings.length - 1 && styles.lastRankingItem,
            ]}
            onPress={() => handleMemberPress(entry)}
            activeOpacity={0.7}
          >
            <View style={styles.rankContainer}>
              <Text style={[
                styles.rankText,
                entry.isTopThree && styles.topThreeRank
              ]}>
                {getRankDisplay(entry.rank)}
              </Text>
              {entry.trend && (
                <Text style={styles.trendIndicator}>
                  {getTrendDisplay(entry.trend)}
                </Text>
              )}
            </View>

            <View style={styles.memberInfo}>
              <MemberAvatar 
                name={entry.name} 
                imageUrl={entry.avatar} 
                size={entry.isTopThree ? 36 : 32}
              />
              <View style={styles.memberDetails}>
                <Text style={[
                  styles.memberName,
                  entry.isTopThree && styles.topThreeName
                ]}>
                  {entry.name}
                </Text>
                <Text style={styles.memberStats}>
                  {entry.workoutCount} workouts
                  {entry.lastActivity && ` • ${entry.lastActivity}`}
                </Text>
              </View>
            </View>

            <View style={styles.scoreContainer}>
              <Text style={[
                styles.scoreText,
                entry.isTopThree && styles.topThreeScore
              ]}>
                {entry.formattedScore}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {hasMoreResults && (
        <TouchableOpacity
          style={styles.viewMoreButton}
          onPress={onViewFullLeaderboard}
          activeOpacity={0.7}
        >
          <Text style={styles.viewMoreText}>
            View All {rankings.rankings.length} Participants
          </Text>
          <Text style={styles.viewMoreIcon}>→</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rankingsSection: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    minHeight: 200,
    marginVertical: 8,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },

  liveText: {
    fontSize: 9,
    fontWeight: theme.typography.weights.semiBold,
    color: '#22c55e',
  },

  actionBtn: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 60,
    justifyContent: 'center',
  },

  actionBtnDisabled: {
    backgroundColor: theme.colors.border,
  },

  actionBtnIcon: {
    color: theme.colors.accentText,
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
  },

  actionBtnText: {
    color: theme.colors.accentText,
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
  },

  competitionInfo: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  competitionText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 2,
  },

  participantCount: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },

  rankingsList: {
    maxHeight: 200, // Scrollable list
  },

  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  topThreeItem: {
    backgroundColor: theme.colors.accent + '10', // Very subtle highlight
  },

  lastRankingItem: {
    borderBottomWidth: 0,
  },

  rankContainer: {
    width: 40,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },

  rankText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
  },

  topThreeRank: {
    fontSize: 16,
    color: theme.colors.text,
  },

  trendIndicator: {
    fontSize: 10,
    marginLeft: 2,
  },

  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },

  memberDetails: {
    flex: 1,
  },

  memberName: {
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 2,
  },

  topThreeName: {
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accent,
  },

  memberStats: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },

  scoreContainer: {
    alignItems: 'flex-end',
    minWidth: 80,
  },

  scoreText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  topThreeScore: {
    fontSize: 13,
    color: theme.colors.accent,
  },

  viewMoreButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingTop: 12,
    gap: 4,
  },

  viewMoreText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.accent,
  },

  viewMoreIcon: {
    fontSize: 12,
    color: theme.colors.accent,
  },

  // Loading state
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },

  loadingText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  // Error state
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },

  errorText: {
    fontSize: 12,
    color: theme.colors.error || '#ef4444',
    textAlign: 'center',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },

  emptyText: {
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 4,
  },

  emptySubtext: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});

// Export types for parent components
export type { LeagueRankingEntry, LeagueRankingResult, LeagueParameters, LeagueParticipant } from '../../services/competition/leagueRankingService';