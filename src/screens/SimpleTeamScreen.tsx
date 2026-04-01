/**
 * SimpleTeamScreen - Lightweight team screen without heavy dependencies
 * Replaces EnhancedTeamScreen to fix navigation freeze issues
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import SimpleCompetitionService from '../services/competition/SimpleCompetitionService';
import SimpleLeaderboardService from '../services/competition/SimpleLeaderboardService';
import { LocalTeamMembershipService } from '../services/team/LocalTeamMembershipService';
import unifiedCache from '../services/cache/UnifiedNostrCache';
import { CacheKeys } from '../constants/cacheTTL';
import { CharitySection } from '../components/team/CharitySection';
import { DailyLeaderboardCard } from '../components/team/DailyLeaderboardCard';
import { LeaderboardShareModal } from '../components/team/LeaderboardShareModal';
import { TeamMembershipService } from '../services/team/teamMembershipService';
import type { LeaderboardEntry } from '../services/competition/SimpleLeaderboardService';
import { publishJoinRequest } from '../utils/joinRequestPublisher';
import { useNavigationData } from '../contexts/NavigationDataContext';
import { CustomAlertManager } from '../components/ui/CustomAlert';

interface SimpleTeamScreenProps {
  data: {
    team: any;
    leaderboard?: any[];
    events?: any[];
    challenges?: any[];
  };
  onBack: () => void;
  onAddChallenge?: () => void;
  onAddEvent?: () => void;
  onEventPress?: (eventId: string, eventData?: any) => void;
  onLeaguePress?: (leagueId: string, leagueData?: any) => void;
  onChallengePress?: (challengeId: string) => void;
  showJoinButton?: boolean;
  userIsMemberProp?: boolean;
  currentUserNpub?: string;
  userIsCaptain?: boolean;
}

export const SimpleTeamScreen: React.FC<SimpleTeamScreenProps> = ({
  data,
  onBack,
  onEventPress,
  showJoinButton = false,
  userIsMemberProp = false,
  currentUserNpub,
  userIsCaptain = false,
}) => {
  console.log('[SimpleTeamScreen] 🚀 Rendering with minimal dependencies');

  const { team } = data || {};
  const [leaderboards, setLeaderboards] = useState<any>(null);
  const [loadingLeaderboards, setLoadingLeaderboards] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isMember, setIsMember] = useState(userIsMemberProp);
  const [isCompetitionTeam, setIsCompetitionTeam] = useState(false);

  // Leaderboard share modal state
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareModalData, setShareModalData] = useState<{
    title: string;
    distance: string;
    entries: LeaderboardEntry[];
  } | null>(null);

  // Navigation data context for optimistic updates
  const navigationData = useNavigationData();

  // Team membership service
  const membershipService = TeamMembershipService.getInstance();

  // ✅ PERFORMANCE: Debounce timer to prevent rapid navigation fetches
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  // ✅ FIX: AbortController to properly cancel ongoing fetches
  const abortControllerRef = useRef<AbortController | null>(null);

  // ✅ PERFORMANCE: Instant cache-first display with debouncing
  useFocusEffect(
    useCallback(() => {
      // ✅ DEBOUNCE: Clear any pending fetch from rapid navigation
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // ✅ FIX: Abort any ongoing fetch from previous navigation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      const fetchLeaderboards = async () => {
        console.log(
          '[SimpleTeamScreen] 🔍 useFocusEffect triggered - Team data check:',
          {
            hasData: !!data,
            hasTeam: !!team,
            teamId: team?.id,
            teamName: team?.name,
            teamKeys: team ? Object.keys(team) : [],
          }
        );

        if (!team?.id) {
          console.warn(
            '[SimpleTeamScreen] ⚠️ No team.id found, cannot fetch leaderboards'
          );
          setLoadingLeaderboards(false);
          return;
        }

        // Check if this is user's competition team
        const competitionTeam =
          await LocalTeamMembershipService.getCompetitionTeam();
        setIsCompetitionTeam(competitionTeam === team.id);

        // Fetch daily leaderboards
        console.log(
          '[SimpleTeamScreen] 🔄 Fetching daily leaderboards for team:',
          team.id
        );

        try {
          const dailyLeaderboards =
            await SimpleLeaderboardService.getTeamDailyLeaderboards(team.id);

          console.log('[SimpleTeamScreen] ✅ Leaderboards loaded:', {
            '5k': dailyLeaderboards.leaderboard5k.length,
            '10k': dailyLeaderboards.leaderboard10k.length,
            half: dailyLeaderboards.leaderboardHalf.length,
            marathon: dailyLeaderboards.leaderboardMarathon.length,
          });

          setLeaderboards(dailyLeaderboards);
          setLoadingLeaderboards(false);
        } catch (error: any) {
          console.error(
            '[SimpleTeamScreen] ❌ Leaderboard fetch error:',
            error
          );
          setLoadingLeaderboards(false);
        }
      };

      // ✅ DEBOUNCE: Only fetch if user stays on page for 150ms (prevents rapid back-forward)
      debounceTimerRef.current = setTimeout(() => {
        fetchLeaderboards();
      }, 150);

      // Cleanup: cancel pending fetch if user navigates away quickly
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        // ✅ FIX: Abort any ongoing fetch when navigating away
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
      };
    }, [team?.id, data, team])
  );

  // Open leaderboard share modal
  const openShareModal = useCallback(
    (title: string, distance: string, entries: LeaderboardEntry[]) => {
      setShareModalData({ title, distance, entries });
      setShareModalVisible(true);
    },
    []
  );

  // Close leaderboard share modal
  const closeShareModal = useCallback(() => {
    setShareModalVisible(false);
    setShareModalData(null);
  }, []);

  // ✅ Join Team Handler - Set as competition team for leaderboard participation
  const handleJoinTeam = useCallback(async () => {
    if (!currentUserNpub || !team?.id || isJoining) return;

    try {
      setIsJoining(true);

      // 1. Set as competition team (appears on leaderboards)
      await LocalTeamMembershipService.setCompetitionTeam(team.id);

      console.log(`✅ Team set as competition team: ${team.name}`);

      // 2. Also join locally for backwards compatibility
      await membershipService.joinTeamLocally(
        team.id,
        team.name,
        team.captainId,
        currentUserNpub
      );

      // 3. Update button state to show member status
      setIsMember(true);
      setIsCompetitionTeam(true);

      // 3. ✅ Optimistic ProfileData Update - Instantly add to My Teams
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

      // 4. ✅ Success Alert - Inform user
      CustomAlertManager.alert(
        'Success!',
        `${team.name} is now your competition team. Your workouts will appear on their leaderboards!`
      );

      // 5. ✅ Background: Publish join request to Nostr (fire-and-forget)
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

      // 6. ✅ Background: Refresh teams cache (fire-and-forget)
      const refreshCache = async () => {
        try {
          const nostrPrefetchService = (
            await import('../services/nostr/NostrPrefetchService')
          ).default;
          await nostrPrefetchService.refreshUserTeamsCache();
          console.log('✅ Teams cache refreshed after join (background)');
        } catch (cacheError) {
          console.warn('⚠️ Background cache refresh failed:', cacheError);
          // Silently fail - optimistic update already happened
        }
      };
      refreshCache(); // Don't await - let it run in background
    } catch (error) {
      console.error('Failed to join team:', error);
      CustomAlertManager.alert(
        'Error',
        'Failed to join team. Please try again.'
      );
      setIsMember(false);
    } finally {
      setIsJoining(false);
    }
  }, [currentUserNpub, team, isJoining, membershipService, navigationData]);

  // Pull-to-refresh handler - forces cache invalidation
  const onRefresh = useCallback(async () => {
    if (!team?.id) return;

    setRefreshing(true);
    try {
      console.log(
        '[SimpleTeamScreen] 🔄 Pull-to-refresh: Force refreshing leaderboards for team:',
        team.id
      );
      // Pass forceRefresh=true to bypass cache and fetch fresh data from relays
      const dailyLeaderboards =
        await SimpleLeaderboardService.getTeamDailyLeaderboards(
          team.id,
          undefined,  // userHexPubkey
          true        // forceRefresh = true
        );
      console.log('[SimpleTeamScreen] ✅ Pull-to-refresh: Leaderboards loaded');
      setLeaderboards(dailyLeaderboards);
    } catch (error) {
      console.error('[SimpleTeamScreen] ❌ Pull-to-refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [team?.id]);

  // Safety check
  if (!team) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Team data not available</Text>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team</Text>
        <View style={styles.headerButton} />
      </View>

      {/* Banner Image */}
      {team.bannerImage && (
        <View style={styles.bannerContainer}>
          <Image
            source={{ uri: team.bannerImage }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <View style={styles.bannerOverlay} />
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.text}
          />
        }
      >
        {/* Team Info */}
        <View style={styles.teamInfoSection}>
          <Text style={styles.teamName}>{team.name || 'Unknown Team'}</Text>

          {/* Only show About section if description exists, is not empty, and is not the team name */}
          {team.description &&
            team.description.trim() !== '' &&
            team.description !== team.name && (
              <View style={styles.descriptionCard}>
                <Text style={styles.sectionLabel}>About</Text>
                <Text style={styles.description}>{team.description}</Text>
              </View>
            )}

          {/* Charity Section - Display team's supported charity */}
          {team.charityId && <CharitySection charityId={team.charityId} />}

          {/* REMOVED: Team Stats - teams are bookmarks, no membership count or status needed */}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {/* Competition Team Button */}
            {showJoinButton && !isCompetitionTeam && (
              <TouchableOpacity
                style={[
                  styles.joinButton,
                  isJoining && styles.joinButtonDisabled,
                ]}
                activeOpacity={0.8}
                onPress={handleJoinTeam}
                disabled={isJoining}
              >
                {isJoining ? (
                  <ActivityIndicator
                    color={theme.colors.background}
                    size="small"
                  />
                ) : (
                  <Text style={styles.joinButtonText}>
                    Compete on This Team
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {/* Competition Team Badge */}
            {isCompetitionTeam && !userIsCaptain && (
              <View style={styles.memberBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={theme.colors.success}
                />
                <Text style={styles.memberBadgeText}>
                  Your Competition Team
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Daily Leaderboards Section */}
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>Events</Text>

          {loadingLeaderboards ? (
            // ✅ SKELETON UI: Show lightweight placeholders instead of spinner
            <View style={styles.contentList}>
              {[1, 2].map((i) => (
                <View key={`skeleton-${i}`} style={styles.skeletonCard}>
                  <View style={styles.skeletonHeader}>
                    <View style={styles.skeletonIcon} />
                    <View style={styles.skeletonTextContainer}>
                      <View style={styles.skeletonTitle} />
                      <View style={styles.skeletonSubtitle} />
                    </View>
                  </View>
                  <View style={styles.skeletonFooter}>
                    <View style={styles.skeletonBadge} />
                  </View>
                </View>
              ))}
            </View>
          ) : !leaderboards ||
            (leaderboards.leaderboard5k.length === 0 &&
              leaderboards.leaderboard10k.length === 0 &&
              leaderboards.leaderboardHalf.length === 0 &&
              leaderboards.leaderboardMarathon.length === 0) ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="trophy-outline"
                size={48}
                color={theme.colors.textMuted}
              />
              <Text style={styles.emptyText}>No activity today</Text>
              {isCompetitionTeam ? (
                <Text style={styles.emptySubtext}>
                  Be the first to run and create today's events!
                </Text>
              ) : (
                <Text style={styles.emptySubtext}>
                  Set this as your competition team to participate
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.contentList}>
              {leaderboards.leaderboard5k.length > 0 && (
                <DailyLeaderboardCard
                  title={`${team.name} 5K`}
                  distance="5km"
                  participants={leaderboards.leaderboard5k.length}
                  entries={leaderboards.leaderboard5k}
                  onPress={() => {
                    // TODO: Navigate to full leaderboard screen
                    // TODO: Navigate to 5K leaderboard
                  }}
                  onShare={() =>
                    openShareModal(
                      `${team.name} 5K`,
                      '5K',
                      leaderboards.leaderboard5k
                    )
                  }
                />
              )}

              {leaderboards.leaderboard10k.length > 0 && (
                <DailyLeaderboardCard
                  title={`${team.name} 10K`}
                  distance="10km"
                  participants={leaderboards.leaderboard10k.length}
                  entries={leaderboards.leaderboard10k}
                  onPress={() => {
                    // TODO: Navigate to 10K leaderboard
                  }}
                  onShare={() =>
                    openShareModal(
                      `${team.name} 10K`,
                      '10K',
                      leaderboards.leaderboard10k
                    )
                  }
                />
              )}

              {leaderboards.leaderboardHalf.length > 0 && (
                <DailyLeaderboardCard
                  title={`${team.name} Half Marathon`}
                  distance="21.1km"
                  participants={leaderboards.leaderboardHalf.length}
                  entries={leaderboards.leaderboardHalf}
                  onPress={() => {
                    // TODO: Navigate to Half Marathon leaderboard
                  }}
                  onShare={() =>
                    openShareModal(
                      `${team.name} Half Marathon`,
                      '21K',
                      leaderboards.leaderboardHalf
                    )
                  }
                />
              )}

              {leaderboards.leaderboardMarathon.length > 0 && (
                <DailyLeaderboardCard
                  title={`${team.name} Marathon`}
                  distance="42.2km"
                  participants={leaderboards.leaderboardMarathon.length}
                  entries={leaderboards.leaderboardMarathon}
                  onPress={() => {
                    // TODO: Navigate to Marathon leaderboard
                  }}
                  onShare={() =>
                    openShareModal(
                      `${team.name} Marathon`,
                      '42K',
                      leaderboards.leaderboardMarathon
                    )
                  }
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Leaderboard Share Modal */}
      {shareModalData && (
        <LeaderboardShareModal
          visible={shareModalVisible}
          title={shareModalData.title}
          distance={shareModalData.distance}
          entries={shareModalData.entries}
          userId={currentUserNpub || ''}
          onClose={closeShareModal}
          onSuccess={() => {
            console.log('✅ Leaderboard shared successfully');
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: theme.colors.text,
    fontSize: 16,
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
  },
  backButtonText: {
    color: theme.colors.text,
    fontSize: 14,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },

  // Banner
  bannerContainer: {
    height: 140,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.6)', // Simplified from linear-gradient (not supported in RN)
  },

  // Content
  scrollView: {
    flex: 1,
  },
  teamInfoSection: {
    padding: 16,
  },
  teamName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },

  // Description
  descriptionCard: {
    backgroundColor: theme.colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  // Action Buttons
  actionButtons: {
    gap: 12,
  },
  joinButton: {
    backgroundColor: theme.colors.text,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  joinButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cardBackground,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  memberBadgeText: {
    color: theme.colors.success,
    fontSize: 14,
    fontWeight: '500',
  },

  // Events Section
  eventsSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  emptySubtext: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  contentList: {
    gap: 12,
  },
  eventCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  cardDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },

  // ✅ SKELETON UI STYLES: Lightweight placeholders for loading states
  skeletonCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  skeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.border,
    marginRight: 12,
  },
  skeletonTextContainer: {
    flex: 1,
    gap: 8,
  },
  skeletonTitle: {
    height: 16,
    width: '60%',
    backgroundColor: theme.colors.border,
    borderRadius: 4,
  },
  skeletonSubtitle: {
    height: 14,
    width: '40%',
    backgroundColor: theme.colors.border,
    borderRadius: 4,
  },
  skeletonFooter: {
    flexDirection: 'row',
    gap: 16,
  },
  skeletonBadge: {
    height: 14,
    width: 80,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
  },
});

export default SimpleTeamScreen;
