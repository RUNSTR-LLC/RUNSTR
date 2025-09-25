/**
 * TeamCard Component - Team discovery with join workflow
 * Shows team info, stats, activities, and join button for membership management
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


interface TeamCardProps {
  team: DiscoveryTeam;
  onPress?: (team: DiscoveryTeam) => void;
  onJoinRequest?: (team: DiscoveryTeam) => Promise<void>;
  style?: any;
  currentUserNpub?: string; // For captain detection and membership
}

type MembershipButtonState = 'join' | 'pending' | 'member' | 'captain' | 'loading';

export const TeamCard: React.FC<TeamCardProps> = ({
  team,
  onPress,
  onJoinRequest,
  style,
  currentUserNpub,
}) => {
  const [buttonState, setButtonState] = useState<MembershipButtonState>('loading');
  const membershipService = TeamMembershipService.getInstance();

  const handleCardPress = () => {
    if (onPress) {
      onPress(team);
    }
  };

  const isCaptain = isTeamCaptain(currentUserNpub, team);

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
    <Pressable
      style={[styles.card, style]}
      onPress={handleCardPress}
      android_ripple={{ color: theme.colors.buttonHover }}
    >
      <View style={styles.cardContent}>
        {/* Team Name */}
        <Text style={styles.teamName} numberOfLines={1}>{team.name}</Text>

        {/* Badges and Button Container */}
        <View style={styles.rightSection}>
          {/* Captain Badge */}
          {isCaptain && (
            <View style={styles.captainBadge}>
              <Text style={styles.captainBadgeText}>CAPTAIN</Text>
            </View>
          )}

          {/* Join/Member Status */}
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
                 buttonState === 'pending' ? 'PENDING' :
                 buttonState === 'member' ? 'MEMBER' : 'JOIN'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  teamName: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    flex: 1,
    marginRight: 12,
  },

  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  captainBadge: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },

  captainBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accentText,
    letterSpacing: 0.5,
  },

  joinButton: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },

  memberButton: {
    backgroundColor: theme.colors.success || '#22c55e',
  },

  pendingButton: {
    backgroundColor: theme.colors.textMuted,
  },

  loadingButton: {
    backgroundColor: theme.colors.textMuted,
    opacity: 0.6,
  },

  joinButtonText: {
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accentText,
    letterSpacing: 0.5,
  },

  memberButtonText: {
    color: theme.colors.text,
  },

  pendingButtonText: {
    color: theme.colors.text,
  },
});
