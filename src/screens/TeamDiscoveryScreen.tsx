/**
 * TeamDiscoveryScreen - Exact match to HTML mockup team discovery modal
 * New users pick teams to join based on skill level, prize pools, and activity
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../styles/theme';
import { DiscoveryTeam } from '../types';
import { TeamCard } from '../components/team/TeamCard';
import { analytics } from '../utils/analytics';
import {
  getNostrTeamService,
  type NostrTeam,
} from '../services/nostr/NostrTeamService';
import { CaptainDetectionService } from '../services/team/captainDetectionService';
import { TeamCacheService } from '../services/cache/TeamCacheService';

interface TeamDiscoveryScreenProps {
  onClose: () => void;
  onTeamJoin: (team: DiscoveryTeam) => void;
  onTeamSelect?: (team: DiscoveryTeam) => void;
  teams?: DiscoveryTeam[];
  recommendations?: DiscoveryTeam[];
  isLoading?: boolean;
  onTeamPress?: (team: DiscoveryTeam) => void;
  onRefresh?: () => void;
  connectionStatus?: string;
  onCreateTeam?: () => void;
  showCloseButton?: boolean; // Optional prop to control close button visibility
  showHeader?: boolean; // Optional prop to control header visibility
  // Captain dashboard props
  currentUserPubkey?: string; // Current user's pubkey for captain detection
  onCaptainDashboard?: () => void; // Navigate to captain dashboard
}

export const TeamDiscoveryScreen: React.FC<TeamDiscoveryScreenProps> = ({
  onClose,
  onTeamJoin,
  onTeamSelect,
  teams: propTeams,
  isLoading: propIsLoading = false,
  onCreateTeam,
  showCloseButton = true, // Default to showing close button for backward compatibility
  showHeader = true, // Default to showing header for backward compatibility
  currentUserPubkey,
  onCaptainDashboard,
}) => {
  const [teams, setTeams] = useState<DiscoveryTeam[]>(propTeams || []);
  const [isLoading, setIsLoading] = useState(propIsLoading);
  const [error, setError] = useState<string | null>(null);
  const [captainStatus, setCaptainStatus] = useState<{
    showCaptainDashboard: boolean;
    primaryTeam: NostrTeam | null;
    captainTeamCount: number;
  }>({
    showCaptainDashboard: false,
    primaryTeam: null,
    captainTeamCount: 0,
  });
  const discoverySession = useRef(analytics.startTeamDiscoverySession());

  useEffect(() => {
    // Track when team discovery opens
    analytics.trackTeamDiscoveryOpened('direct');

    // Use cached teams for instant display
    console.log('🚀 TeamDiscoveryScreen: Loading teams from cache first...');
    fetchTeams(false); // Don't force refresh on initial load

    // Capture current session for cleanup
    const currentSession = discoverySession.current;

    // Cleanup on unmount
    return () => {
      currentSession.complete();
    };
  }, []);

  // Captain detection effect
  useEffect(() => {
    if (!currentUserPubkey) {
      return;
    }

    const checkCaptainStatus = async () => {
      try {
        const captainDetection = CaptainDetectionService.getInstance();
        const status = await captainDetection.getCaptainStatusForTeamDiscovery(
          currentUserPubkey
        );
        setCaptainStatus(status);

        if (status.showCaptainDashboard) {
          console.log(
            `👑 User is captain of ${status.captainTeamCount} team(s)`
          );
        }
      } catch (error) {
        console.error('Failed to check captain status:', error);
      }
    };

    checkCaptainStatus();
  }, [currentUserPubkey]);

  // Convert NostrTeam to DiscoveryTeam for UI compatibility
  const convertNostrTeamToDiscoveryTeam = (
    nostrTeam: NostrTeam
  ): DiscoveryTeam => {
    return {
      id: nostrTeam.id,
      name: nostrTeam.name,
      description: nostrTeam.description,
      about: nostrTeam.description,
      captainId: nostrTeam.captainId,
      prizePool: 0, // No prize pools yet for Nostr teams in Phase 1
      memberCount: nostrTeam.memberCount,
      joinReward: 0,
      exitFee: 0, // No exit fees for Phase 1
      avatar: undefined,
      createdAt: new Date(nostrTeam.createdAt * 1000).toISOString(),
      isActive: true,
      difficulty: 'intermediate' as const, // Default difficulty for Phase 1
      stats: {
        memberCount: nostrTeam.memberCount,
        avgPace: 'N/A', // Not available for Nostr teams yet
        activeEvents: 0,
        activeChallenges: 0,
      },
      recentActivities: [],
      isFeatured: false,
    };
  };

  // Mock teams removed - using only real Nostr relay data

  const fetchTeams = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('📦 TeamDiscoveryScreen: Loading teams with cache support...');

      // Use TeamCacheService for cached teams
      const cacheService = TeamCacheService.getInstance();

      // Get teams (from cache if available, otherwise fetch)
      const discoveryTeams = forceRefresh
        ? await cacheService.refreshTeams()
        : await cacheService.getTeams();

      console.log(
        `✅ TeamDiscoveryScreen: Loaded ${discoveryTeams.length} teams`
      );

      // Set teams in state
      setTeams(discoveryTeams);

      if (discoveryTeams.length === 0) {
        console.log('TeamDiscoveryScreen: No teams found');
        setError('No teams found. Try again later.');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load teams';
      console.error('TeamDiscoveryScreen: Exception loading teams:', error);

      // Set error state
      setError(errorMessage);
      setTeams([]); // Clear any existing teams
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeamSelect = (team: DiscoveryTeam) => {
    analytics.trackTeamCardSelected(team);
    discoverySession.current.trackTeamSelected(team.id);
    onTeamSelect?.(team);
  };

  const handleTeamJoin = async (team: DiscoveryTeam) => {
    analytics.trackTeamJoinInitiated(team);

    try {
      console.log(`🏃‍♂️ Joining team: ${team.name}`);

      // Use NostrTeamService for joining
      const nostrTeamService = getNostrTeamService();
      const cachedTeams = Array.from(nostrTeamService.getDiscoveredTeams().values());
      const nostrTeam = cachedTeams.find((t) => t.id === team.id);

      if (nostrTeam) {
        const joinResult = await nostrTeamService.joinTeam(nostrTeam);

        if (joinResult.success) {
          analytics.trackTeamJoinCompleted(team, true);
          discoverySession.current.complete(team);
          onTeamJoin(team);
          console.log(`✅ Successfully joined team: ${team.name}`);
        } else {
          throw new Error(joinResult.error || 'Failed to join team');
        }
      } else {
        throw new Error('Team not found in Nostr cache');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to join team:', errorMessage);
      analytics.trackTeamJoinFailed(team, errorMessage);
    }
  };

  const handleClose = () => {
    discoverySession.current.complete();
    onClose();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Status Bar */}

      {/* Header */}
      {showHeader && (
        <View style={styles.header}>
          <View style={styles.headerActions}>
            {captainStatus.showCaptainDashboard && onCaptainDashboard && (
              <TouchableOpacity
                style={styles.captainDashboardBtn}
                onPress={onCaptainDashboard}
                activeOpacity={0.7}
              >
                <Text style={styles.captainDashboardLabel}>Captain</Text>
              </TouchableOpacity>
            )}
            {onCreateTeam && (
              <TouchableOpacity
                style={styles.createBtn}
                onPress={onCreateTeam}
                activeOpacity={0.7}
              >
                <Text style={styles.createBtnText}>+</Text>
              </TouchableOpacity>
            )}
            {showCloseButton && (
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <Text style={styles.closeBtnText}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Welcome Section */}
      {showHeader && (
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Join the Competition</Text>
          <Text style={styles.welcomeSubtitle}>
            Select a team that matches your skill level and goals. Earn bitcoin
            rewards by competing in challenges and events.
          </Text>
        </View>
      )}

      {/* Team Cards */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.text} />
            <Text style={styles.loadingText}>Loading teams...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load teams</Text>
            <Text style={styles.errorSubtext}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchTeams(true)}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : teams.length === 0 ? (
          <View style={styles.emptyContainer}>
            {/* Empty State Icon */}
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>🔍</Text>
            </View>

            {/* Empty State Content */}
            <Text style={styles.emptyTitle}>No Nostr Fitness Teams Found</Text>
            <Text style={styles.emptyDescription}>
              {onCreateTeam
                ? 'No fitness teams found on Nostr relays at the moment. Create the first team or check back later when other captains publish teams.'
                : 'No fitness teams are currently published on Nostr relays. Check back later as the Nostr fitness community grows.'}
            </Text>

            {/* Action Buttons */}
            <View style={styles.emptyActions}>
              {onCreateTeam && (
                <TouchableOpacity
                  style={styles.createTeamButton}
                  onPress={onCreateTeam}
                >
                  <Text style={styles.createTeamButtonText}>
                    Create Your Team
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.refreshButton}
                onPress={() => fetchTeams(true)}
              >
                <Text style={styles.refreshButtonText}>Check for Teams</Text>
              </TouchableOpacity>
            </View>

            {/* Additional Information */}
            <View style={styles.emptyInfo}>
              <Text style={styles.emptyInfoTitle}>
                {onCreateTeam
                  ? 'As a Captain, you can:'
                  : 'When teams are available:'}
              </Text>
              {onCreateTeam ? (
                <>
                  <Text style={styles.emptyInfoItem}>
                    • Create a team and invite friends
                  </Text>
                  <Text style={styles.emptyInfoItem}>
                    • Set up challenges and competitions
                  </Text>
                  <Text style={styles.emptyInfoItem}>
                    • Manage team wallet and rewards
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.emptyInfoItem}>
                    • Join exciting fitness competitions
                  </Text>
                  <Text style={styles.emptyInfoItem}>
                    • Earn Bitcoin rewards for workouts
                  </Text>
                  <Text style={styles.emptyInfoItem}>
                    • Compete with other runners
                  </Text>
                </>
              )}
            </View>
          </View>
        ) : (
          <>
            {console.log(`🔥 RENDER: About to render ${teams.length} teams in UI:`, teams.map(t => ({ id: t.id, name: t.name })))}
            {teams.map((team) => {
              // Track team card view
              discoverySession.current.trackTeamViewed(team.id);
              analytics.trackTeamCardViewed(team);

              console.log(`🔥 RENDERING TEAM CARD: ${team.name} with key: ${team.id}`);
              
              return (
                <TeamCard
                  key={team.id}
                  team={team}
                  onPress={handleTeamSelect}
                  currentUserNpub={currentUserPubkey}
                />
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // Exact CSS: display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #1a1a1a;
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  headerTitle: {
    // Exact CSS: font-size: 20px; font-weight: 700; letter-spacing: -0.5px;
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: -0.5,
    color: theme.colors.text,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  createBtn: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderColor: theme.colors.text,
    borderRadius: 6,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },

  createBtnText: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 20,
  },

  captainDashboardBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },

  captainDashboardLabel: {
    color: theme.colors.accentText,
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
  },

  closeBtn: {
    // Exact CSS: width: 28px; height: 28px; border: 1px solid #333; border-radius: 6px; background: transparent;
    width: 28,
    height: 28,
    borderWidth: 1,
    borderColor: theme.colors.buttonBorder,
    borderRadius: 6,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeBtnText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: theme.typography.weights.regular,
  },

  // Exact CSS: padding: 20px; text-align: center; border-bottom: 1px solid #1a1a1a;
  welcomeSection: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  welcomeTitle: {
    // Exact CSS: font-size: 24px; font-weight: 700; margin-bottom: 8px;
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 8,
  },

  welcomeSubtitle: {
    // Exact CSS: font-size: 14px; color: #666; line-height: 1.4;
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 19.6, // 14 * 1.4
    textAlign: 'center',
  },

  scrollView: {
    flex: 1,
  },

  content: {
    padding: 20,
    paddingBottom: 40, // Extra padding at bottom for better UX
  },

  // Loading state
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },

  loadingText: {
    fontSize: 16,
    color: theme.colors.textMuted,
    marginTop: 16,
  },

  // Error state
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },

  errorText: {
    fontSize: 18,
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },

  errorSubtext: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },

  retryButton: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  retryButtonText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
  },

  // Enhanced empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    flex: 1,
  },

  emptyIcon: {
    width: 80,
    height: 80,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  emptyIconText: {
    fontSize: 36,
  },

  emptyTitle: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },

  emptyDescription: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },

  emptyActions: {
    alignSelf: 'stretch',
    marginBottom: 32,
    gap: 12,
  },

  createTeamButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },

  createTeamButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },

  refreshButton: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },

  refreshButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  emptyInfo: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 20,
    alignSelf: 'stretch',
  },

  emptyInfoTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 12,
  },

  emptyInfoItem: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginBottom: 4,
  },
});
