/**
 * CompactTeamCard - Compact team card for multi-team profile display
 * 72px height card showing team avatar, name, description, and badges
 * Used when user is a member of 2+ teams
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
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

  // Check if team has banner image
  const hasBanner = team.bannerImage && team.bannerImage.length > 0;

  return (
    <TouchableOpacity
      style={[styles.card, hasBanner && styles.cardWithBanner]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {hasBanner ? (
        // Show only banner image when available
        <ImageBackground
          source={{ uri: team.bannerImage }}
          style={styles.bannerBackground}
          imageStyle={styles.bannerImage}
          resizeMode="cover"
        />
      ) : (
        // Fallback: Show only team name when no banner
        <View style={styles.fallbackContent}>
          <Text style={styles.fallbackTeamName} numberOfLines={1}>
            {team.name}
          </Text>
        </View>
      )}
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
    height: 85,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },

  cardWithBanner: {
    padding: 0,
  },

  bannerBackground: {
    width: '100%',
    height: '100%',
  },

  bannerImage: {
    borderRadius: theme.borderRadius.large,
  },

  fallbackContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  fallbackTeamName: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center',
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
