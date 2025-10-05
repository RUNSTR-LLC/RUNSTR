/**
 * CompactTeamCard - Compact team card for multi-team profile display
 * 72px height card showing team avatar, name, description, and badges
 * Used when user is a member of 2+ teams
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../styles/theme';
import { Team } from '../../types';
import { isTeamCaptain } from '../../utils/teamUtils';
import { TeamMemberCache } from '../../services/team/TeamMemberCache';
import leagueRankingService from '../../services/competition/leagueRankingService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CompactTeamCardProps {
  team: Team;
  isPrimary?: boolean;
  currentUserNpub?: string;
  onPress?: (team: Team) => void;
}

export const CompactTeamCard: React.FC<CompactTeamCardProps> = ({
  team,
  isPrimary = false,
  currentUserNpub,
  onPress,
}) => {
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loadingRank, setLoadingRank] = useState(false);

  const isCaptain = currentUserNpub
    ? isTeamCaptain(currentUserNpub, team as any)
    : false;

  // Fetch user's rank in this team (only if top 10)
  useEffect(() => {
    const fetchUserRank = async () => {
      if (!team?.id || !currentUserNpub || !team.captainId) return;

      try {
        setLoadingRank(true);
        const competitionId = `${team.id}-default-streak`;
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
          team.id,
          team.captainId
        );
        const participants = members.map((pubkey) => ({
          npub: pubkey,
          name: pubkey.slice(0, 8) + '...',
          isActive: true,
        }));

        if (participants.length > 0) {
          const result = await leagueRankingService.calculateLeagueRankings(
            competitionId,
            participants,
            parameters
          );

          if (result.rankings && result.rankings.length > 0) {
            const userEntry = result.rankings.find(
              (r) => r.npub === currentUserNpub
            );
            if (userEntry && userEntry.rank <= 10) {
              setUserRank(userEntry.rank);
            }
          }
        }
      } catch (error) {
        console.log('Could not fetch user rank for compact card:', error);
      } finally {
        setLoadingRank(false);
      }
    };

    fetchUserRank();
  }, [team?.id, currentUserNpub, team.captainId]);

  const handlePress = () => {
    if (onPress) {
      onPress(team);
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Team Info */}
      <View style={styles.teamInfo}>
        <Text style={styles.teamName} numberOfLines={1}>
          {team.name}
        </Text>
        <Text style={styles.teamDescription} numberOfLines={1}>
          {team.description}
        </Text>
      </View>

      {/* Right Side: Badges with Priority (Captain > Rank > "YOUR TEAM") */}
      <View style={styles.badgeContainer}>
        {isCaptain ? (
          <View style={styles.captainBadge}>
            <Text style={styles.captainBadgeText}>CAPTAIN</Text>
          </View>
        ) : userRank && userRank <= 10 ? (
          <View style={styles.rankBadge}>
            <Text style={styles.rankBadgeText}>#{userRank}</Text>
          </View>
        ) : (
          <View style={styles.memberBadge}>
            <Text style={styles.memberBadgeText}>YOUR TEAM</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardBackground, // #0a0a0a
    borderWidth: 1,
    borderColor: theme.colors.border, // #1a1a1a
    borderRadius: theme.borderRadius.large, // 12px
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  teamInfo: {
    flex: 1,
    marginRight: 8,
  },

  teamName: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text, // #ffffff
    marginBottom: 2,
  },

  teamDescription: {
    fontSize: 13,
    color: theme.colors.textMuted, // #666666
  },

  badgeContainer: {
    justifyContent: 'center',
  },

  captainBadge: {
    backgroundColor: theme.colors.accent, // #ffffff
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },

  captainBadgeText: {
    fontSize: 9,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accentText, // #000000
    letterSpacing: 0.5,
  },

  rankBadge: {
    borderWidth: 1,
    borderColor: theme.colors.text + '60', // white with 40% opacity
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },

  rankBadgeText: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text, // #ffffff
  },

  memberBadge: {
    backgroundColor: theme.colors.accent, // #ffffff
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },

  memberBadgeText: {
    fontSize: 9,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accentText, // #000000
    letterSpacing: 0.5,
  },
});
