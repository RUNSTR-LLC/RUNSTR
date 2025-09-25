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
} from 'react-native';
import { theme } from '../../styles/theme';
import { DiscoveryTeam } from '../../types';
import { PrizeDisplay } from '../ui/PrizeDisplay';
import { isTeamCaptain, isTeamMember } from '../../utils/teamUtils';
import { TeamMembershipService } from '../../services/team/teamMembershipService';
import { CaptainCache } from '../../utils/captainCache';
import { publishJoinRequest } from '../../utils/joinRequestPublisher';

// Avatar will use dark gray background for all teams
const getAvatarColor = (): string => {
  return '#333333'; // Dark gray for all avatars
};

// Helper to get team initials for avatar
const getTeamInitials = (teamName: string): string => {
  const words = teamName.split(' ');
  if (words.length >= 2) {
    return words[0][0] + words[1][0];
  }
  return teamName.substring(0, 2).toUpperCase();
};

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
  const membershipService = TeamMembershipService.getInstance();

  const handleCardPress = () => {
    if (onPress) {
      onPress(team);
    }
  };

  const isCaptain = isTeamCaptain(currentUserNpub, team);
  const teamInitials = getTeamInitials(team.name);
  const avatarColor = getAvatarColor();
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
        style={[styles.card, style]}
        onPress={handleCardPress}
        android_ripple={{ color: theme.colors.buttonHover }}
      >
        <View style={styles.cardContent}>
          {/* Team Avatar */}
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{teamInitials}</Text>
          </View>

          {/* Team Info */}
          <View style={styles.teamInfo}>
            <View style={styles.teamHeader}>
              <Text style={styles.teamName} numberOfLines={1}>{team.name}</Text>
              {isCaptain && (
                <View style={styles.captainBadge}>
                  <Text style={styles.captainBadgeText}>CAPTAIN</Text>
                </View>
              )}
            </View>

            <Text style={styles.teamDescription} numberOfLines={1}>
              {team.about || `${teamCategory} team`}
            </Text>

            {/* Prize Pool Display */}
            {team.prizePool && team.prizePool > 0 ? (
              <View style={styles.prizeRow}>
                <Text style={styles.prizeIcon}>⚡</Text>
                <Text style={styles.prizeText}>
                  {team.prizePool.toLocaleString()} sats prize pool
                </Text>
              </View>
            ) : (
              <View style={styles.noPrizeRow}>
                <Text style={styles.noPrizeText}>
                  No active prizes
                </Text>
              </View>
            )}
          </View>

          {/* Join Button */}
          <View style={styles.buttonContainer}>
            {currentUserNpub && buttonState !== 'captain' && (
              <Pressable
                style={[
                  styles.joinButton,
                  buttonState === 'member' && styles.memberButton,
                  buttonState === 'pending' && styles.pendingButton,
                  buttonState === 'loading' && styles.loadingButton,
                ]}
                onPress={handleJoinPress}
                disabled={buttonState === 'loading' || buttonState === 'pending' || buttonState === 'member'}
              >
                <Text style={[
                  styles.joinButtonText,
                  buttonState === 'member' && styles.memberButtonText,
                  buttonState === 'pending' && styles.pendingButtonText,
                ]}>
                  {buttonState === 'loading' ? '...' :
                   buttonState === 'pending' ? 'Pending' :
                   buttonState === 'member' ? 'Member' : 'Join'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
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
    borderColor: theme.colors.border,
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
  },

  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  avatarText: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: '#FFFFFF',
  },

  teamInfo: {
    flex: 1,
    marginRight: 12,
  },

  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  teamName: {
    fontSize: 17,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
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
    color: theme.colors.accent,
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
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  captainBadgeText: {
    fontSize: 9,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accentText,
    letterSpacing: 0.5,
  },

  joinButton: {
    backgroundColor: theme.colors.text, // White background
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
    color: theme.colors.background, // Black text on white button
  },

  memberButtonText: {
    color: theme.colors.text, // White text on dark button
  },

  pendingButtonText: {
    color: theme.colors.text, // White text on gray button
  },
});
