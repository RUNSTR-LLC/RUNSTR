/**
 * TeamCard Component - Rich team discovery card with avatar and detailed info
 * Shows team avatar, stats, activity status, prizes, and membership management
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { theme } from '../../styles/theme';
import { DiscoveryTeam } from '../../types';
import { isTeamCaptain, isTeamMember } from '../../utils/teamUtils';
import { TeamMembershipService } from '../../services/team/teamMembershipService';
import { CaptainCache } from '../../utils/captainCache';
import { publishJoinRequest } from '../../utils/joinRequestPublisher';
import leagueRankingService from '../../services/competition/leagueRankingService';
import { TeamMemberCache } from '../../services/team/TeamMemberCache';
import { useNavigationData } from '../../contexts/NavigationDataContext';
import { CustomAlertManager } from '../ui/CustomAlert';

// Helper to categorize team activity
const categorizeTeam = (team: DiscoveryTeam): string => {
  const content = `${team.name} ${team.about}`.toLowerCase();

  if (content.includes('running') || content.includes('run')) return 'Running';
  if (content.includes('cycling') || content.includes('bike')) return 'Cycling';
  if (
    content.includes('gym') ||
    content.includes('workout') ||
    content.includes('fitness')
  )
    return 'Gym';
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

type MembershipButtonState = 'join' | 'member' | 'captain' | 'loading'; // REMOVED: 'pending' - instant join, no approval needed

export const TeamCard: React.FC<TeamCardProps> = ({
  team,
  onPress,
  onJoinRequest,
  style,
  currentUserNpub,
  showCategory = false,
}) => {
  const [buttonState, setButtonState] =
    useState<MembershipButtonState>('loading');
  const [userRank, setUserRank] = useState<number | null>(null);
  const membershipService = TeamMembershipService.getInstance();
  const navigationData = useNavigationData();

  // ✅ PERFORMANCE: Memoize handler to prevent recreation on every render
  const handleCardPress = useCallback(() => {
    if (onPress) {
      onPress(team);
    }
  }, [onPress, team]);

  // ✅ PERFORMANCE: Memoize expensive captain check
  const isCaptain = useMemo(
    () => isTeamCaptain(currentUserNpub, team),
    [currentUserNpub, team]
  );

  // ✅ PERFORMANCE: Memoize team category calculation
  const teamCategory = useMemo(() => categorizeTeam(team), [team]);

  // Cache captain status when we detect it correctly
  useEffect(() => {
    if (team.id && currentUserNpub && isCaptain !== undefined) {
      console.log(
        `🎯 TeamCard: Caching captain status for ${team.name}: ${isCaptain}`
      );
      CaptainCache.setCaptainStatus(team.id, isCaptain);
    }
  }, [team.id, currentUserNpub, isCaptain]);

  // Check membership status on mount - moved after function definition

  // Fetch user's rank in this team
  // ✅ PERFORMANCE: Memoize expensive rank fetching function
  const fetchUserRank = useCallback(async () => {
    if (!team?.id || !currentUserNpub || buttonState !== 'member') return;

    try {
      // Only fetch if user is a member
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
      const members = await memberCache.getTeamMembers(team.id, team.captainId);
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
      console.log('Could not fetch user rank for team:', error);
    }
  }, [team?.id, currentUserNpub, buttonState]);

  useEffect(() => {
    fetchUserRank();
  }, [fetchUserRank]);

  // ✅ PERFORMANCE: Memoize membership check function
  const checkMembershipStatus = useCallback(async () => {
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
        // REMOVED: Pending request checking - instant join, no approval needed
        setButtonState('join');
      }
    } catch (error) {
      console.error('Failed to check membership status:', error);
      setButtonState('join');
    }
  }, [currentUserNpub, isCaptain, team, membershipService]);

  // Check membership status on mount
  useEffect(() => {
    checkMembershipStatus();
  }, [checkMembershipStatus]);

  // ✅ PERFORMANCE: Memoize join handler
  const handleJoinPress = useCallback(async () => {
    if (!currentUserNpub || buttonState !== 'join') return;

    try {
      setButtonState('loading');

      // Join locally - instant bookmark, no captain approval needed
      await membershipService.joinTeamLocally(
        team.id,
        team.name,
        team.captainId,
        currentUserNpub
      );

      console.log(`✅ Team bookmarked locally: ${team.name}`);

      // Instant member status - no waiting for approval
      setButtonState('member');

      // Publish join request to Nostr (for captain approval to official kind 30000 list)
      // This runs async in background - doesn't block the UI
      const publishRequest = async () => {
        try {
          const result = await publishJoinRequest(
            team.id,
            team.name,
            team.captainId,
            currentUserNpub,
            `I'd like to join ${team.name}!`
          );

          if (result.success) {
            console.log(
              `📤 Join request published for ${team.name} (event: ${result.eventId})`
            );
          } else {
            console.warn(`⚠️ Failed to publish join request: ${result.error}`);
            // Don't show error to user - they're already "joined" locally
          }
        } catch (error) {
          console.warn('Failed to publish join request:', error);
          // Silent fail - user is already joined locally
        }
      };
      publishRequest(); // Fire and forget - don't await

      // ✅ IMPROVEMENT 1: Optimistic ProfileData Update
      // Immediately add team to profileData so My Teams screen shows it instantly
      if (
        navigationData.profileData?.teams &&
        !navigationData.profileData.teams.some((t) => t.id === team.id)
      ) {
        const optimisticTeam = {
          id: team.id,
          name: team.name,
          description: team.description || team.about || '',
          bannerImage: team.bannerImage,
          captainId: team.captainId,
          charityId: team.charityId,
          memberCount: team.memberCount || 0,
          prizePool: 0,
          isActive: true,
          role: 'member' as const,
        };

        // Direct state update for instant UI refresh
        const profileDataRef = navigationData.profileData;
        const currentTeams = profileDataRef.teams || [];
        profileDataRef.teams = [...currentTeams, optimisticTeam];

        console.log(
          `⚡ Optimistically added ${team.name} to profileData (instant My Teams update)`
        );
      }

      // ✅ IMPROVEMENT 2: Success Feedback
      CustomAlertManager.alert(
        'Success!',
        `You've joined ${team.name}. View it in My Teams.`
      );

      // ✅ IMPROVEMENT 3: Non-Blocking Cache Refresh
      // Fire and forget - don't wait for cache refresh to complete
      const refreshCache = async () => {
        try {
          const nostrPrefetchService = (
            await import('../../services/nostr/NostrPrefetchService')
          ).default;
          await nostrPrefetchService.refreshUserTeamsCache();
          console.log('✅ Teams cache refreshed after join (background)');
        } catch (cacheError) {
          console.warn('⚠️ Background cache refresh failed:', cacheError);
          // Silently fail - optimistic update already happened
        }
      };
      refreshCache(); // Don't await - let it run in background

      // Call external join request handler if provided (for backward compatibility)
      if (onJoinRequest) {
        await onJoinRequest(team);
      }
    } catch (error) {
      console.error('Failed to join team:', error);
      CustomAlertManager.alert(
        'Error',
        'Failed to join team. Please try again.'
      );
      setButtonState('join');
    }
  }, [
    currentUserNpub,
    buttonState,
    team,
    membershipService,
    onJoinRequest,
    navigationData,
  ]);

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
        <View style={styles.fallbackContent}>
          <Text style={styles.fallbackTeamName} numberOfLines={1}>
            {team.name}
          </Text>
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
