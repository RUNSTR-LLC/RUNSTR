/**
 * TeamDiscoveryScreen - Exact match to HTML mockup team discovery modal
 * New users pick teams to join based on skill level, prize pools, and activity
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  FlatList,
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

// Helper function to categorize teams
const categorizeTeam = (team: DiscoveryTeam): string => {
  const content = `${team.name} ${team.about}`.toLowerCase();

  if (content.includes('running') || content.includes('run') || content.includes('marathon') || content.includes('5k') || content.includes('10k')) {
    return 'Running';
  }
  if (content.includes('cycling') || content.includes('bike') || content.includes('bicycle') || content.includes('ride')) {
    return 'Cycling';
  }
  if (content.includes('gym') || content.includes('workout') || content.includes('fitness') || content.includes('strength')) {
    return 'Gym & Fitness';
  }
  if (content.includes('swimming') || content.includes('swim') || content.includes('pool')) {
    return 'Swimming';
  }
  if (content.includes('walking') || content.includes('walk') || content.includes('hike') || content.includes('hiking')) {
    return 'Walking & Hiking';
  }
  if (content.includes('yoga') || content.includes('pilates') || content.includes('meditation')) {
    return 'Yoga & Wellness';
  }

  return 'Other';
};

export const TeamDiscoveryScreen: React.FC<TeamDiscoveryScreenProps> = ({
  onClose,
  onTeamJoin,
  onTeamSelect,
  teams: propTeams,
  isLoading: propIsLoading = false,
  onCreateTeam,
  showCloseButton = true,
  showHeader = true,
  currentUserPubkey,
  onCaptainDashboard,
}) => {
  const [teams, setTeams] = useState<DiscoveryTeam[]>(propTeams || []);
  const [isLoading, setIsLoading] = useState(propIsLoading);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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

  // Note: Team conversion is now handled by TeamCacheService.convertToDiscoveryTeams()
  // This ensures consistent conversion across the app

  // Mock teams removed - using only real Nostr relay data

  const fetchTeams = async (forceRefresh = false) => {
    try {
      setError(null);

      console.log('📦 TeamDiscoveryScreen: Loading teams with cache support...');

      // Use TeamCacheService for cached teams
      const cacheService = TeamCacheService.getInstance();

      // Check if we have cached teams first (instant check)
      const hasCachedTeams = await cacheService.hasCachedTeams();

      // Only show loading if we don't have cached teams
      if (!hasCachedTeams || forceRefresh) {
        setIsLoading(true);
      }

      // Get teams (from cache if available, otherwise fetch)
      const discoveryTeams = forceRefresh
        ? await cacheService.refreshTeams()
        : await cacheService.getTeams();

      console.log(
        `✅ TeamDiscoveryScreen: Loaded ${discoveryTeams.length} teams ${hasCachedTeams && !forceRefresh ? '(from cache)' : '(fresh)'}`
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

  // Organize teams by category and filter by search
  const { categorizedTeams, categories } = useMemo(() => {
    const filtered = teams.filter(team => {
      if (searchQuery) {
        return team.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });

    const categorized: Record<string, DiscoveryTeam[]> = {};
    const categorySet = new Set<string>();

    filtered.forEach(team => {
      const category = categorizeTeam(team);
      categorySet.add(category);
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push(team);
    });

    // Sort categories by priority
    const sortedCategories = Array.from(categorySet).sort((a, b) => {
      const priority = ['Running', 'Cycling', 'Gym & Fitness', 'Swimming', 'Walking & Hiking', 'Yoga & Wellness', 'Other'];
      return priority.indexOf(a) - priority.indexOf(b);
    });

    return { categorizedTeams: categorized, categories: sortedCategories };
  }, [teams, searchQuery]);

  // Get teams for display (filtered by category if selected)
  const displayTeams = useMemo(() => {
    if (searchQuery) {
      // When searching, show all matching teams regardless of category
      return teams.filter(team =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedCategory) {
      return categorizedTeams[selectedCategory] || [];
    }
    return teams;
  }, [teams, searchQuery, selectedCategory, categorizedTeams]);

  const renderCategorySection = ({ item: category }: { item: string }) => {
    const categoryTeams = categorizedTeams[category] || [];
    if (categoryTeams.length === 0) return null;

    return (
      <View style={styles.categorySection} key={category}>
        <Text style={styles.categoryTitle}>{category}</Text>
        <FlatList
          horizontal
          data={categoryTeams}
          renderItem={({ item }) => (
            <View style={styles.horizontalCard}>
              <TeamCard
                key={item.id}
                team={item}
                onPress={handleTeamSelect}
                currentUserNpub={currentUserPubkey}
              />
            </View>
          )}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        />
      </View>
    );
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

      {/* Search Bar */}
      {showHeader && (
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search teams by name..."
              placeholderTextColor={theme.colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Text style={styles.clearButtonText}>×</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filter Pills */}
          {!searchQuery && categories.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterContainer}
              contentContainerStyle={styles.filterContent}
            >
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  !selectedCategory && styles.filterPillActive,
                ]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    !selectedCategory && styles.filterPillTextActive,
                  ]}
                >
                  All Teams
                </Text>
              </TouchableOpacity>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.filterPill,
                    selectedCategory === category && styles.filterPillActive,
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      selectedCategory === category && styles.filterPillTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Team Display */}
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
          {/* Display based on current view mode */}
          {searchQuery || selectedCategory ? (
            // List view for search results or single category
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {searchQuery && (
                <Text style={styles.searchResultsText}>
                  {displayTeams.length} team{displayTeams.length !== 1 ? 's' : ''} found
                </Text>
              )}
              {displayTeams.map((team) => {
                discoverySession.current.trackTeamViewed(team.id);
                analytics.trackTeamCardViewed(team);

                return (
                  <TeamCard
                    key={team.id}
                    team={team}
                    onPress={handleTeamSelect}
                    currentUserNpub={currentUserPubkey}
                  />
                );
              })}
              {displayTeams.length === 0 && (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsText}>
                    No teams found matching "{searchQuery}"
                  </Text>
                  <TouchableOpacity
                    style={styles.clearSearchButton}
                    onPress={() => setSearchQuery('')}
                  >
                    <Text style={styles.clearSearchButtonText}>Clear Search</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          ) : (
            // Category sections view
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
            >
              {categories.map((category) => renderCategorySection({ item: category }))}
            </ScrollView>
          )}
        </>
      )}
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

  // Search and Filter Styles
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },

  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    paddingVertical: 8,
  },

  clearButton: {
    padding: 4,
  },

  clearButtonText: {
    fontSize: 20,
    color: theme.colors.textMuted,
  },

  filterContainer: {
    marginTop: 12,
  },

  filterContent: {
    paddingRight: 20,
  },

  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 8,
  },

  filterPillActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },

  filterPillText: {
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  filterPillTextActive: {
    color: theme.colors.accentText,
  },

  // Category Section Styles
  categorySection: {
    marginBottom: 24,
  },

  categoryTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 12,
    paddingHorizontal: 20,
  },

  horizontalList: {
    paddingHorizontal: 20,
  },

  horizontalCard: {
    width: 280,
    marginRight: 12,
  },

  // Search Results
  searchResultsText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 12,
  },

  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  noResultsText: {
    fontSize: 16,
    color: theme.colors.textMuted,
    marginBottom: 16,
  },

  clearSearchButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  clearSearchButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },
});
