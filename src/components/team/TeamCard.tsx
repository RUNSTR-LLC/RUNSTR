/**
 * TeamCard Component - Rich team discovery card with avatar and detailed info
 * Shows team avatar, stats, activity status, prizes, and membership management
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';
import { DiscoveryTeam } from '../../types';
import { PrizeDisplay } from '../ui/PrizeDisplay';
import { isTeamCaptain, isTeamMember } from '../../utils/teamUtils';
import { TeamMembershipService } from '../../services/team/teamMembershipService';
import { CaptainCache } from '../../utils/captainCache';
import { publishJoinRequest } from '../../utils/joinRequestPublisher';
import leagueRankingService from '../../services/competition/leagueRankingService';
import { TeamMemberCache } from '../../services/team/TeamMemberCache';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper to categorize team activity
const categorizeTeam = (team: DiscoveryTeam): string => {
  const content = `${team.name} ${team.about}`.toLowerCase();

  if (content.includes('running') || content.includes('run')) return 'Running';
  if (content.includes('cycling') || content.includes('bike')) return 'Cycling';
  if (content.includes('gym') || content.includes('workout') || content.includes('fitness')) return 'Gym';
  if (content.includes('walking') || content.includes('walk')) return 'Walking';
  if (content.includes('swimming')) return 'Swimming';
  if (content.includes('ruck')) return 'Rucking';
  return 'Fitness';
};



interface TeamCardProps {
  team: DiscoveryTeam;
  onPress?: (team: DiscoveryTeam) => void;
  onJoinRequest?: (team: DiscoveryTeam) => Promise<void>;
  style?: any;
  currentUserNpub?: string;
  showCategory?: boolean; // Show category label above card
}

type MembershipButtonState = 'join' | 'pending' | 'member' | 'captain' | 'loading';

export const TeamCard: React.FC<TeamCardProps> = ({
  team,
  onPress,
  onJoinRequest,
  style,
  currentUserNpub,
  showCategory = false,
}) => {
  const [buttonState, setButtonState] = useState<MembershipButtonState>('loading');
  const [userRank, setUserRank] = useState<number | null>(null);
  const membershipService = TeamMembershipService.getInstance();

  const handleCardPress = () => {
    if (onPress) {
      onPress(team);
    }
  };

  const isCaptain = isTeamCaptain(currentUserNpub, team);
  const teamCategory = categorizeTeam(team);

  // Cache captain status when we detect it correctly
  useEffect(() => {
    if (team.id && currentUserNpub && isCaptain !== undefined) {
      console.log(`🎯 TeamCard: Caching captain status for ${team.name}: ${isCaptain}`);
      CaptainCache.setCaptainStatus(team.id, isCaptain);
    }
  }, [team.id, currentUserNpub, isCaptain]);

  // Check membership status on mount
  useEffect(() => {
    checkMembershipStatus();
  }, [currentUserNpub, team]);

  // Fetch user's rank in this team
  useEffect(() => {
    const fetchUserRank = async () => {
      if (!team?.id || !currentUserNpub || buttonState !== 'member') return;

      try {
        // Only fetch if user is a member
        const competitionId = `${team.id}-default-streak`;
        const parameters = {
          activityType: 'Any' as any,
          competitionType: 'Most Consistent' as any,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          scoringFrequency: 'daily' as const,
        };

        // Get team members
        const memberCache = TeamMemberCache.getInstance();
        const members = await memberCache.getTeamMembers(team.id, team.captainId);
        const participants = members.map(pubkey => ({
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
            const userEntry = result.rankings.find(r => r.npub === currentUserNpub);
            if (userEntry && userEntry.rank <= 10) {
              setUserRank(userEntry.rank);
            }
          }
        }
      } catch (error) {
        console.log('Could not fetch user rank for team:', error);
      }
    };

    fetchUserRank();
  }, [team?.id, currentUserNpub, buttonState]);

  const checkMembershipStatus = async () => {
    if (!currentUserNpub) {
      setButtonState('join');
      return;
    }

    // Captain gets special state
    if (isCaptain) {
      setButtonState('captain');
      return;
    }

    try {
      setButtonState('loading');
      const isMember = await isTeamMember(currentUserNpub, team);
      
      if (isMember) {
        setButtonState('member');
      } else {
        // Check if there's a pending request
        const membershipStatus = await membershipService.getMembershipStatus(
          currentUserNpub,
          team.id, // Use team.id instead of non-existent team.teamId
          team.captainId
        );
        setButtonState(membershipStatus.hasRequestPending ? 'pending' : 'join');
      }
    } catch (error) {
      console.error('Failed to check membership status:', error);
      setButtonState('join');
    }
  };

  const handleJoinPress = async () => {
    if (!currentUserNpub || buttonState !== 'join') return;

    try {
      setButtonState('loading');

      // Join locally first for instant UX
      await membershipService.joinTeamLocally(
        team.id, // Use team.id instead of non-existent team.teamId
        team.name,
        team.captainId,
        currentUserNpub
      );

      // Publish join request to Nostr so captain can see it
      const publishResult = await publishJoinRequest(
        team.id,
        team.name,
        team.captainId,
        currentUserNpub,
        `I would like to join ${team.name}`
      );

      if (publishResult.success) {
        console.log(`✅ Join request sent for team: ${team.name}`);
        setButtonState('pending');
      } else {
        // Still keep local membership but notify user request didn't send
        Alert.alert(
          'Join Request Not Sent',
          'You have joined locally but the request to the captain could not be sent. Please try again later.',
          [{ text: 'OK' }]
        );
        // Keep as pending since they're locally joined
        setButtonState('pending');
      }

      // CRITICAL FIX: Refresh teams cache so My Teams screen updates immediately
      try {
        const nostrPrefetchService = (await import('../../services/nostr/NostrPrefetchService')).default;
        await nostrPrefetchService.refreshUserTeamsCache();
        console.log('✅ Teams cache refreshed after join');
      } catch (cacheError) {
        console.warn('⚠️ Failed to refresh teams cache:', cacheError);
        // Don't block the join flow if cache refresh fails
      }

      // Call external join request handler if provided (for backward compatibility)
      if (onJoinRequest) {
        await onJoinRequest(team);
      }
    } catch (error) {
      console.error('Failed to join team:', error);
      Alert.alert('Error', 'Failed to join team. Please try again.');
      setButtonState('join');
    }
  };

  return (
    <View>
      {showCategory && (
        <Text style={styles.categoryHeader}>{teamCategory}</Text>
      )}
      <Pressable
        style={[styles.card, style, team.bannerImage && styles.cardWithBanner]}
        onPress={handleCardPress}
        android_ripple={{ color: theme.colors.buttonHover }}
      >
        {team.bannerImage ? (
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
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  categoryHeader: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  card: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: '#1a1a1a', // Consistent with other cards
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    overflow: 'hidden',
  },

  cardWithBanner: {
    padding: 0,
  },

  bannerBackground: {
    width: '100%',
    minHeight: 140,
  },

  bannerImage: {
    borderRadius: 12,
  },

  bannerGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-end',
  },

  fallbackContent: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 95,
  },

  fallbackTeamName: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center',
  },

  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  teamInfo: {
    flex: 1,
    marginRight: 12,
  },

  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },

  rankBadge: {
    borderWidth: 1,
    borderColor: theme.colors.text + '60',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  rankText: {
    fontSize: 11,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semiBold,
  },

  teamName: {
    fontSize: 17,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.orangeBright, // Orange gradient text
    marginRight: 8,
  },

  teamDescription: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 8,
  },


  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  prizeIcon: {
    fontSize: 14,
    marginRight: 4,
  },

  prizeText: {
    fontSize: 13,
    color: theme.colors.orangeBright, // Bright orange for prize text
    fontWeight: theme.typography.weights.semiBold,
  },

  noPrizeRow: {
    marginTop: 8,
  },

  noPrizeText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },

  buttonContainer: {
    justifyContent: 'center',
  },

  captainBadge: {
    backgroundColor: theme.colors.text, // Light orange for captain badge
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  captainBadgeText: {
    fontSize: 9,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accentText, // Black text on orange
    letterSpacing: 0.5,
  },

  joinButton: {
    backgroundColor: theme.colors.text, // Light orange background
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },

  memberButton: {
    backgroundColor: '#333333', // Dark gray for member state
  },

  pendingButton: {
    backgroundColor: '#666666', // Medium gray for pending
  },

  loadingButton: {
    backgroundColor: '#666666',
    opacity: 0.6,
  },

  joinButtonText: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accentText, // Black text on orange button
  },

  memberButtonText: {
    color: theme.colors.text, // White text on dark button
  },

  pendingButtonText: {
    color: theme.colors.text, // White text on gray button
  },
});
