/**
 * TeamManagementSection - Profile component showing user's current team
 * Displays a clickable team card that navigates to the team page
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../styles/theme';
import { Team } from '../../types';
import leagueRankingService from '../../services/competition/leagueRankingService';
import { TeamMemberCache } from '../../services/team/TeamMemberCache';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TeamManagementSectionProps {
  currentTeam?: Team;
  onChangeTeam: () => void;
  onJoinTeam: () => void;
  onViewTeam?: () => void;
  onRefresh?: () => void;
}

export const TeamManagementSection: React.FC<TeamManagementSectionProps> = ({
  currentTeam,
  onChangeTeam,
  onJoinTeam,
  onViewTeam,
  onRefresh,
}) => {
  const [userRank, setUserRank] = useState<number | null>(null);
  const [competitionName, setCompetitionName] = useState<string | null>(null);
  const [loadingRank, setLoadingRank] = useState(false);

  // Trigger refresh on mount to load team data
  useEffect(() => {
    if (onRefresh && !currentTeam) {
      console.log('[TeamManagementSection] No team detected, triggering refresh...');
      onRefresh();
    }
  }, []);

  useEffect(() => {
    const fetchUserRank = async () => {
      if (!currentTeam?.id) return;

      try {
        setLoadingRank(true);
        // Get current user's npub
        const userNpub = await AsyncStorage.getItem('@runstr:npub');
        if (!userNpub) return;

        // Get team captain info
        const teamService = (await import('../../services/nostr/NostrTeamService')).getNostrTeamService();
        const fullTeam = teamService.getTeamById(currentTeam.id);
        if (!fullTeam?.captainId) return;

        // Query current rankings
        const competitionId = `${currentTeam.id}-default-streak`;
        const parameters = {
          activityType: 'Any' as any,
          competitionType: 'Most Consistent' as any,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          scoringFrequency: 'daily' as const,
        };

        // Get team members
        const memberCache = TeamMemberCache.getInstance();
        const members = await memberCache.getTeamMembers(currentTeam.id, fullTeam.captainId);
        const participants = members.map(pubkey => ({
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
          const userEntry = result.rankings.find(r => r.npub === userNpub);
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
  }, [currentTeam?.id]);
  if (!currentTeam) {
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

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onViewTeam}
    >
      <View style={styles.card}>
        <View style={styles.teamContainer}>
          {/* Your Team Badge */}
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>YOUR TEAM</Text>
          </View>

          {/* Team Info */}
          <View style={styles.teamHeader}>
            <Text style={styles.teamName}>{currentTeam.name}</Text>
            <Text style={styles.teamDescription} numberOfLines={2}>
              {currentTeam.description}
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
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    height: 100, // Fixed height for consistent layout
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
});
