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

// Helper function to extract activity type from team content
const extractActivityType = (team: DiscoveryTeam): string => {
  const content = `${team.name} ${team.about}`.toLowerCase();
  
  if (content.includes('running') || content.includes('run') || content.includes('marathon') || content.includes('5k') || content.includes('10k')) {
    return 'Running';
  }
  if (content.includes('cycling') || content.includes('bike') || content.includes('bicycle') || content.includes('ride')) {
    return 'Cycling';
  }
  if (content.includes('swimming') || content.includes('swim') || content.includes('pool')) {
    return 'Swimming';
  }
  if (content.includes('walking') || content.includes('walk') || content.includes('hike') || content.includes('hiking')) {
    return 'Walking';
  }
  if (content.includes('gym') || content.includes('workout') || content.includes('fitness') || content.includes('strength')) {
    return 'Gym';
  }
  if (content.includes('yoga') || content.includes('pilates') || content.includes('meditation')) {
    return 'Yoga';
  }
  
  return 'Fitness';
};

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
  const activityType = extractActivityType(team);

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

      // Call external join request handler if provided
      if (onJoinRequest) {
        await onJoinRequest(team);
      }

      // Update button state
      setButtonState('pending');
    } catch (error) {
      console.error('Failed to join team:', error);
      Alert.alert('Error', 'Failed to join team. Please try again.');
      setButtonState('join');
    }
  };

  return (
    <Pressable
      style={[styles.card, team.isFeatured && styles.featuredCard, style]}
      onPress={handleCardPress}
      android_ripple={{ color: theme.colors.buttonHover }}
    >
      {/* Team Header */}
      <View style={styles.teamHeader}>
        <View style={styles.teamInfo}>
          <Text style={styles.teamName}>{team.name}</Text>
          <Text style={styles.teamAbout}>{team.about}</Text>
        </View>
        <View style={styles.badgeContainer}>
          {team.isFeatured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>Featured</Text>
            </View>
          )}
          {isCaptain && (
            <View style={styles.captainBadge}>
              <Text style={styles.captainBadgeText}>Captain</Text>
            </View>
          )}
        </View>
      </View>

      {/* Prize Section - Hidden for now */}
      {/* <PrizeDisplay
        prizePool={team.prizePool}
        recentPayout={team.recentPayout}
      /> */}

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Members</Text>
          <Text style={styles.statValue}>{team.stats.memberCount}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Activity</Text>
          <Text style={styles.statValue}>{activityType}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Active Events</Text>
          <Text style={styles.statValue}>{team.stats.activeEvents}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Challenges</Text>
          <Text style={styles.statValue}>{team.stats.activeChallenges}</Text>
        </View>
      </View>

      {/* Membership Button */}
      {currentUserNpub && buttonState !== 'captain' && (
        <Pressable
          style={[
            styles.membershipButton,
            buttonState === 'member' && styles.memberButton,
            buttonState === 'pending' && styles.pendingButton,
            buttonState === 'loading' && styles.loadingButton,
          ]}
          onPress={handleJoinPress}
          disabled={buttonState === 'loading' || buttonState === 'pending' || buttonState === 'member'}
        >
          <Text style={[
            styles.membershipButtonText,
            buttonState === 'member' && styles.memberButtonText,
            buttonState === 'pending' && styles.pendingButtonText,
          ]}>
            {buttonState === 'loading' ? 'Loading...' :
             buttonState === 'pending' ? 'Request Sent' :
             buttonState === 'member' ? 'Member' : 'Join Team'}
          </Text>
        </Pressable>
      )}

    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    // Exact CSS: background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 16px; padding: 20px;
    backgroundColor: theme.colors.cardBackground, // #0a0a0a
    borderWidth: 1,
    borderColor: theme.colors.border, // #1a1a1a
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },

  featuredCard: {
    // Exact CSS: border-color: #fff; background: #0f0f0f;
    borderColor: theme.colors.text, // #fff
    backgroundColor: '#0f0f0f', // Slightly lighter than cardBackground
  },

  teamHeader: {
    // Exact CSS: display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  teamInfo: {
    // Exact CSS: flex: 1;
    flex: 1,
  },

  teamName: {
    // Exact CSS: font-size: 18px; font-weight: 700; margin-bottom: 4px;
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },

  teamAbout: {
    // Exact CSS: font-size: 13px; color: #999; line-height: 1.3;
    fontSize: 13,
    color: theme.colors.textTertiary, // #999
    lineHeight: 16.9, // 13 * 1.3
  },

  featuredBadge: {
    // Exact CSS: background: #fff; color: #000; padding: 2px 8px; border-radius: 8px;
    backgroundColor: theme.colors.text, // #fff
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
  },

  featuredBadgeText: {
    // Exact CSS: font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: theme.colors.accentText, // #000
  },

  statsGrid: {
    // Exact CSS: display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  statItem: {
    // Each stat takes roughly half width with some gap
    width: '48%',
    marginBottom: 8,
  },

  statLabel: {
    // Exact CSS: font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;
    fontSize: 11,
    color: theme.colors.textMuted, // #666
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  statValue: {
    // Exact CSS: font-size: 15px; font-weight: 600; color: #fff;
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  badgeContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },

  captainBadge: {
    backgroundColor: theme.colors.accent, // Gold/yellow for captain
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  captainBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accentText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  membershipButton: {
    backgroundColor: theme.colors.accent, // Gold/yellow
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 12,
  },

  memberButton: {
    backgroundColor: theme.colors.success || '#22c55e', // Green for members
  },

  pendingButton: {
    backgroundColor: theme.colors.textMuted, // Gray for pending
  },

  loadingButton: {
    backgroundColor: theme.colors.textMuted,
    opacity: 0.6,
  },

  membershipButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accentText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  memberButtonText: {
    color: theme.colors.text,
  },

  pendingButtonText: {
    color: theme.colors.text,
  },

});
