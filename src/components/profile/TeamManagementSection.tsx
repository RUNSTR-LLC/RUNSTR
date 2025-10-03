/**
 * TeamManagementSection - Profile component showing user's team(s)
 * Displays:
 * - 0 teams: "No Team Joined" state with "Find Teams" button
 * - 1 team: Expanded team card (current design)
 * - 2+ teams: Scrollable list of compact team cards
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { theme } from '../../styles/theme';
import { Team } from '../../types';
import leagueRankingService from '../../services/competition/leagueRankingService';
import { TeamMemberCache } from '../../services/team/TeamMemberCache';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CompactTeamCard } from './CompactTeamCard';

interface TeamManagementSectionProps {
  currentTeam?: Team; // Deprecated - use teams array
  teams?: Team[]; // All teams user is a member of
  primaryTeamId?: string; // User's designated primary team
  isLoading?: boolean;
  onChangeTeam: () => void;
  onJoinTeam: () => void;
  onViewTeam?: (team?: Team) => void;
  onRefresh?: () => void;
}

export const TeamManagementSection: React.FC<TeamManagementSectionProps> = ({
  currentTeam,
  teams,
  primaryTeamId,
  isLoading = false,
  onChangeTeam,
  onJoinTeam,
  onViewTeam,
  onRefresh,
}) => {
  const [userRank, setUserRank] = useState<number | null>(null);
  const [competitionName, setCompetitionName] = useState<string | null>(null);
  const [loadingRank, setLoadingRank] = useState(false);
  const [userNpub, setUserNpub] = useState<string>('');

  // Determine which teams to display (prefer teams array, fallback to currentTeam)
  const displayTeams = teams || (currentTeam ? [currentTeam] : []);
  const teamCount = displayTeams.length;

  // Load user npub on mount
  useEffect(() => {
    const loadUserNpub = async () => {
      try {
        const npub = await AsyncStorage.getItem('@runstr:npub');
        if (npub) {
          setUserNpub(npub);
        }
      } catch (error) {
        console.error('Error loading user npub:', error);
      }
    };

    loadUserNpub();
  }, []);

  useEffect(() => {
    const fetchUserRank = async () => {
      // Only fetch rank for single team view (expanded card)
      if (!currentTeam?.id || teamCount !== 1) return;

      try {
        setLoadingRank(true);
        // Get current user's npub
        const storedNpub = await AsyncStorage.getItem('@runstr:npub');
        if (!storedNpub) return;

        // Get team captain info
        const teamService = (
          await import('../../services/nostr/NostrTeamService')
        ).getNostrTeamService();
        const fullTeam = teamService.getTeamById(currentTeam.id);
        if (!fullTeam?.captainId) return;

        // Query current rankings
        const competitionId = `${currentTeam.id}-default-streak`;
        const parameters = {
          activityType: 'Any' as any,
          competitionType: 'Most Consistent' as any,
          startDate: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          endDate: new Date().toISOString(),
          scoringFrequency: 'daily' as const,
        };

        // Get team members
        const memberCache = TeamMemberCache.getInstance();
        const members = await memberCache.getTeamMembers(
          currentTeam.id,
          fullTeam.captainId
        );
        const participants = members.map((pubkey) => ({
          npub: pubkey,
          name: pubkey.slice(0, 8) + '...',
          isActive: true,
        }));

        const result = await leagueRankingService.calculateLeagueRankings(
          competitionId,
          participants,
          parameters
        );

        if (result.rankings && result.rankings.length > 0) {
          const userEntry = result.rankings.find((r) => r.npub === storedNpub);
          if (userEntry) {
            setUserRank(userEntry.rank);
            setCompetitionName('30-Day Streak');
          }
        }
      } catch (error) {
        console.log('Could not fetch user rank:', error);
      } finally {
        setLoadingRank(false);
      }
    };

    fetchUserRank();
  }, [currentTeam?.id, teamCount]);

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSkeleton} />
          <View style={styles.loadingSkeletonSmall} />
        </View>
      </View>
    );
  }

  // CASE 1: No teams - Show "No Team Joined" state
  if (teamCount === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.noTeamContainer}>
          <Text style={styles.noTeamTitle}>No Team Joined</Text>
          <Text style={styles.noTeamDescription}>
            Join a team to compete in challenges and earn Bitcoin rewards
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onJoinTeam}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Find Teams</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // CASE 2: Single team - Show expanded card (current design)
  if (teamCount === 1) {
    const singleTeam = displayTeams[0];
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onViewTeam?.(singleTeam)}
      >
        <View style={styles.card}>
          <View style={styles.teamContainer}>
            {/* Your Team Badge */}
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>YOUR TEAM</Text>
            </View>

            {/* Team Info */}
            <View style={styles.teamHeader}>
              <Text style={styles.teamName}>{singleTeam.name}</Text>
              <Text style={styles.teamDescription} numberOfLines={2}>
                {singleTeam.description}
              </Text>
              {/* Competition Status Line */}
              {userRank && competitionName && (
                <Text style={styles.competitionStatus}>
                  Rank #{userRank} in {competitionName}
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // CASE 3: Multiple teams - Show scrollable compact cards
  return (
    <View style={styles.card}>
      <View style={styles.multiTeamContainer}>
        <Text style={styles.sectionHeader}>YOUR TEAMS</Text>
        <ScrollView
          style={styles.multiTeamScroll}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {displayTeams.map((team) => (
            <CompactTeamCard
              key={team.id}
              team={team}
              isPrimary={team.id === primaryTeamId}
              currentUserNpub={userNpub}
              onPress={(selectedTeam) => onViewTeam?.(selectedTeam)}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    minHeight: 100, // Minimum height for consistent layout, allows expansion
  },

  // No Team State
  noTeamContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },

  noTeamTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 8,
  },

  noTeamDescription: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
  },

  // Team Present State
  teamContainer: {
    paddingVertical: 0,
  },

  badgeContainer: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },

  badgeText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accentText,
    letterSpacing: 0.5,
  },

  teamHeader: {
    marginBottom: 8,
  },

  teamName: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },

  teamDescription: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },

  // Team Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  statItem: {
    alignItems: 'center',
  },

  statValue: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 2,
  },

  statLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },

  captainBadge: {
    backgroundColor: theme.colors.text,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },

  captainBadgeText: {
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.background,
    letterSpacing: 0.5,
  },

  // Actions
  primaryButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },

  primaryButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.background,
  },

  // Tap Indicator
  tapIndicator: {
    alignItems: 'center',
    paddingTop: 8,
  },

  tapText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },

  competitionStatus: {
    fontSize: 12,
    color: theme.colors.text,
    marginTop: 6,
    fontWeight: theme.typography.weights.medium,
  },

  // Loading state
  loadingContainer: {
    paddingVertical: 12,
  },

  loadingSkeleton: {
    height: 20,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    marginBottom: 8,
    width: '60%',
  },

  loadingSkeletonSmall: {
    height: 14,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    width: '80%',
  },

  // Multi-team styles
  multiTeamContainer: {
    paddingVertical: 8,
  },

  sectionHeader: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted, // #666666
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  multiTeamScroll: {
    maxHeight: 280, // ~3.5 cards visible (hints at scrollability)
  },
});
