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
  RefreshControl,
} from 'react-native';
import { theme } from '../../styles/theme';
import { ZappableUserRow } from '../ui/ZappableUserRow';
import leagueRankingService, {
  LeagueRankingEntry,
  LeagueRankingResult,
  LeagueParameters,
  LeagueParticipant,
} from '../../services/competition/leagueRankingService';
import { TeamMemberCache } from '../../services/team/TeamMemberCache';
import { getUserNostrIdentifiers } from '../../utils/nostr';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  captainPubkey?: string; // Accept captain pubkey as prop
  isDefaultLeague?: boolean;
  prizePoolSats?: number; // Optional prize pool amount
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
  captainPubkey,  // Now properly destructuring the captain pubkey from props
  isDefaultLeague = false,
}) => {
  console.log('🏆 LeagueRankingsSection rendering with:', {
    competitionId,
    teamId,
    captainPubkey: captainPubkey?.slice(0, 12) + '...',
    isDefaultLeague,
  });
  const [rankings, setRankings] = useState<LeagueRankingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [teamParticipants, setTeamParticipants] = useState<LeagueParticipant[]>(participants);
  const [currentUserNpub, setCurrentUserNpub] = useState<string | null>(null);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  // captainPubkey now comes from props, no local state needed

  const rankingService = leagueRankingService;
  const memberCache = TeamMemberCache.getInstance();

  /**
   * Fetch team members from cached kind 30000 lists
   */
  const fetchTeamMembers = async (): Promise<LeagueParticipant[]> => {
    if (!teamId || !captainPubkey) {
      console.log('⚠️ Cannot fetch members: missing teamId or captainPubkey', { teamId, captainPubkey: captainPubkey?.slice(0, 12) });
      return [];
    }

    try {
      console.log(`🔍 Fetching team members for team: ${teamId} with captain: ${captainPubkey.slice(0, 12)}...`);

      // Ensure we're using hex pubkey format for the query
      let captainHex = captainPubkey;
      if (captainPubkey.startsWith('npub')) {
        // Convert npub to hex if needed
        try {
          const { hexPubkey } = await getUserNostrIdentifiers();
          if (hexPubkey) captainHex = hexPubkey;
        } catch (e) {
          console.warn('Could not convert npub to hex, using as-is');
        }
      }

      // Get members from cached kind 30000 list
      const members = await memberCache.getTeamMembers(teamId, captainHex);

      if (members.length === 0) {
        // No members found - captain should be at least in the list
        console.log('⚠️ No members found in team list, adding captain');
        members.push(captainHex);
      }

      // Convert to LeagueParticipant format
      return members.map(pubkey => {
        // Convert hex to npub for display if needed
        let displayKey = pubkey;
        if (pubkey.length === 64 && !pubkey.startsWith('npub')) {
          // This is a hex key, we'll use it as-is (ZappableUserRow handles conversion)
          displayKey = pubkey;
        }
        return {
          npub: displayKey,
          name: displayKey.slice(0, 8) + '...', // Fallback name, ZappableUserRow will resolve actual profile
          isActive: true,
        };
      });

    } catch (err) {
      console.error('❌ Failed to fetch team members:', err);
      return [];
    }
  };

  /**
   * Get current user's npub on mount
   */
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const npub = await AsyncStorage.getItem('@runstr:npub');
        if (npub) {
          setCurrentUserNpub(npub);
        }
      } catch (error) {
        console.log('Could not load current user npub');
      }
    };
    loadCurrentUser();
  }, []);

  /**
   * Log captain pubkey for debugging when it changes
   */
  useEffect(() => {
    if (captainPubkey) {
      console.log(`🔑 LeagueRankingsSection: Captain pubkey received from props: ${captainPubkey.slice(0, 12)}...`);
    } else {
      console.log('⚠️ LeagueRankingsSection: No captain pubkey provided in props');
    }
  }, [captainPubkey]);

  /**
   * Load league rankings
   * Now uses cache-first strategy with stale-while-revalidate pattern (24-hour cache)
   * Returns cached data instantly (even if hours old) while fetching fresh data in background
   * With 24-hour cache, you'll NEVER see the 30-second loading screen after initial load!
   */
  const loadRankings = async (force = false) => {
    try {
      console.log(`🏆 Loading league rankings: ${competitionId}${force ? ' (FORCE REFRESH)' : ''}`);
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

      // Pass forceRefresh flag to bypass cache (for pull-to-refresh)
      const result = await rankingService.calculateLeagueRankings(
        competitionId,
        participantsToUse,
        parameters,
        force // This bypasses cache and forces fresh fetch
      );

      setRankings(result);
      setError(null);

      // Find current user's rank
      if (currentUserNpub && result.rankings) {
        const userEntry = result.rankings.find(r => r.npub === currentUserNpub);
        if (userEntry) {
          setCurrentUserRank(userEntry.rank);
        }
      }

    } catch (err) {
      console.error('❌ Failed to load league rankings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rankings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Initialize rankings on mount and when captain changes
   */
  useEffect(() => {
    console.log('🎯 LeagueRankingsSection mounted/updated with:', {
      competitionId,
      teamId,
      captainPubkey: captainPubkey?.slice(0, 12) + '...',
      isDefaultLeague,
      participantsCount: participants.length,
    });
    if (competitionId) {
      loadRankings();
    } else {
      setLoading(false);
    }
  }, [competitionId, teamId, captainPubkey]); // Added captainPubkey to dependencies

  /**
   * Auto-refresh rankings periodically (reduced frequency for performance)
   * The ranking service now uses a 24-hour cache with stale-while-revalidate
   * Cache behavior:
   * - 0-5 min: Returns cache instantly (fresh)
   * - 5 min - 24 hours: Returns cache instantly + background refresh (stale but usable)
   * - > 24 hours: Fetches fresh (only if not opened in a day)
   *
   * This interval triggers background refreshes every 5 minutes for active competitions
   */
  useEffect(() => {
    // Only auto-refresh for active competitions, and only every 5 minutes
    // The 24-hour cache means cached data is ALWAYS shown first, then background refreshed
    if (!rankings?.isActive) return;

    const interval = setInterval(() => {
      console.log('🔄 Auto-refresh triggered (5 min interval) - cache will serve instantly, then background refresh');
      loadRankings(); // Will use cache if < 24h old, refresh in background if > 5min old
    }, 5 * 60 * 1000); // Refresh every 5 minutes

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
   * Get rank display with ordinal for top 3
   */
  const getRankDisplay = (rank: number): string => {
    switch (rank) {
      case 1: return '1st';
      case 2: return '2nd';
      case 3: return '3rd';
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
        indicatorStyle="#FF9D42"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadRankings(true)} // Force refresh when pulling down
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
            title="Pull to refresh rankings"
            titleColor={theme.colors.textMuted}
          />
        }
      >
        {displayRankings.map((entry, index) => {
          const isCurrentUser = currentUserNpub && entry.npub === currentUserNpub;
          return (
          <View
            key={entry.npub}
            style={[
              styles.rankingItem,
              entry.isTopThree && styles.topThreeItem,
              index === displayRankings.length - 1 && styles.lastRankingItem,
              isCurrentUser && styles.currentUserItem,
            ]}
          >
            <View style={styles.rankContainer}>
              <Text style={[
                styles.rankText,
                entry.isTopThree && styles.topThreeRank,
                isCurrentUser && styles.currentUserRank
              ]}>
                {getRankDisplay(entry.rank)}
              </Text>
              {isCurrentUser && (
                <Text style={styles.youIndicator}>YOU</Text>
              )}
              {entry.trend && (
                <Text style={styles.trendIndicator}>
                  {getTrendDisplay(entry.trend)}
                </Text>
              )}
            </View>

            <ZappableUserRow
              npub={entry.npub}
              fallbackName={entry.name}
              showQuickZap={true}
              additionalContent={
                <View style={styles.rankingStats}>
                  <Text style={styles.memberStats}>
                    {entry.workoutCount} workouts
                  </Text>
                  <Text style={[
                    styles.scoreText,
                    entry.isTopThree && styles.topThreeScore
                  ]}>
                    {entry.formattedScore}
                  </Text>
                </View>
              }
            />
          </View>
        );
        })}
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
    borderRadius: 16,
    padding: 20,
    minHeight: 450,
    marginVertical: 8,
    flex: 1,
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
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
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
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  competitionText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 4,
  },

  participantCount: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  rankingsList: {
    maxHeight: 320, // Much taller scrollable list
    minHeight: 280,
  },

  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  topThreeItem: {
    backgroundColor: theme.colors.accent + '15', // More visible highlight
    borderRadius: 8,
    marginVertical: 2,
    paddingHorizontal: 8,
  },

  currentUserItem: {
    borderWidth: 1,
    borderColor: theme.colors.text + '40', // Subtle white border
    borderRadius: 4,
    marginVertical: 2,
  },

  lastRankingItem: {
    borderBottomWidth: 0,
  },

  rankContainer: {
    width: 30,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginRight: 8,
  },

  rankText: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
  },

  topThreeRank: {
    fontSize: 18,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
  },

  currentUserRank: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
  },

  youIndicator: {
    fontSize: 8,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
    marginLeft: 4,
    letterSpacing: 0.5,
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
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 2,
  },

  topThreeName: {
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accent,
  },

  memberStats: {
    fontSize: 9,
    color: theme.colors.textMuted,
    flexWrap: 'wrap',
    maxWidth: 100,
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

  // Stats layout for ZappableUserRow
  rankingStats: {
    alignItems: 'flex-start',
    gap: 2,
    paddingRight: 16,
    minWidth: 80,
    flexShrink: 1,
  },
});

// Export types for parent components
export type { LeagueRankingEntry, LeagueRankingResult, LeagueParameters, LeagueParticipant } from '../../services/competition/leagueRankingService';