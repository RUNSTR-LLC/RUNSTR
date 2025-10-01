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
import { EventCard } from '../components/discovery/EventCard';
import { analytics } from '../utils/analytics';
import {
  getNostrTeamService,
  type NostrTeam,
} from '../services/nostr/NostrTeamService';
import { CaptainDetectionService } from '../services/team/captainDetectionService';
import { TeamCacheService } from '../services/cache/TeamCacheService';
import NostrCompetitionService from '../services/nostr/NostrCompetitionService';
import type { NostrLeagueDefinition, NostrEventDefinition } from '../types/nostrCompetition';

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
  // Event navigation prop
  navigation?: any; // Navigation object for navigating to EventDetailScreen
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
  navigation,
}) => {
  const [discoveryMode, setDiscoveryMode] = useState<'teams' | 'events'>('teams');
  const [teams, setTeams] = useState<DiscoveryTeam[]>(propTeams || []);
  const [events, setEvents] = useState<(NostrLeagueDefinition | NostrEventDefinition)[]>([]);
  const [isLoading, setIsLoading] = useState(propIsLoading);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Running'])); // Start with Running expanded
  const [eventTab, setEventTab] = useState<'upcoming' | 'active'>('upcoming');
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

    // Load data based on discovery mode
    if (discoveryMode === 'teams') {
      console.log('🚀 TeamDiscoveryScreen: Loading teams from cache first...');
      fetchTeams(false); // Don't force refresh on initial load
    } else {
      console.log('🎯 TeamDiscoveryScreen: Loading events...');
      fetchEvents();
    }

    // Capture current session for cleanup
    const currentSession = discoverySession.current;

    // Cleanup on unmount
    return () => {
      currentSession.complete();
    };
  }, [discoveryMode]);

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

  const fetchEvents = async () => {
    try {
      setError(null);
      setIsLoading(true);

      console.log('🎯 Fetching competition events from Nostr...');

      const competitionService = NostrCompetitionService;
      const result = await competitionService.queryCompetitions({
        kinds: [30100, 30101], // Both leagues and events
        limit: 100,
      });

      // Combine leagues and events
      const allEvents = [...result.leagues, ...result.events];

      console.log(`✅ Loaded ${allEvents.length} competition events`);
      setEvents(allEvents);

      if (allEvents.length === 0) {
        setError('No events found. Check back later for competitions.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load events';
      console.error('Failed to fetch events:', error);
      setError(errorMessage);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeamSelect = (team: DiscoveryTeam) => {
    analytics.trackTeamCardSelected(team);
    discoverySession.current.trackTeamSelected(team.id);
    onTeamSelect?.(team);
  };

  const handleEventSelect = (event: NostrLeagueDefinition | NostrEventDefinition) => {
    console.log(`🎯 Event selected: ${event.name}`);
    if (navigation) {
      // Navigate to EventDetailScreen with event data
      navigation.navigate('EventDetail', {
        eventId: event.id,
        eventData: event
      });
    }
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

  // Enhanced filter categories with team counts
  const filterCategories = useMemo(() => {
    const getCategoryCount = (filter: (team: DiscoveryTeam) => boolean) => {
      return teams.filter(filter).length;
    };

    return [
      { id: 'all', label: `All (${teams.length})`, filter: () => true },
      { id: 'running', label: `Running (${getCategoryCount((team) => categorizeTeam(team) === 'Running')})`, filter: (team: DiscoveryTeam) => categorizeTeam(team) === 'Running' },
      { id: 'cycling', label: `Cycling (${getCategoryCount((team) => categorizeTeam(team) === 'Cycling')})`, filter: (team: DiscoveryTeam) => categorizeTeam(team) === 'Cycling' },
      { id: 'gym', label: `Gym (${getCategoryCount((team) => categorizeTeam(team) === 'Gym & Fitness')})`, filter: (team: DiscoveryTeam) => categorizeTeam(team) === 'Gym & Fitness' },
      { id: 'active', label: `Active (${getCategoryCount((team) => team.stats.memberCount > 10)})`, filter: (team: DiscoveryTeam) => team.stats.memberCount > 10 },
      { id: 'prizes', label: `Prizes (${getCategoryCount((team) => (team.prizePool || 0) > 0)})`, filter: (team: DiscoveryTeam) => (team.prizePool || 0) > 0 },
    ];
  }, [teams]);

  // Organize teams by category and filter by search
  const { categorizedTeams, categories } = useMemo(() => {
    let filtered = teams;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(team =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply selected filter
    if (selectedCategory && selectedCategory !== 'all') {
      const filterDef = filterCategories.find(f => f.id === selectedCategory);
      if (filterDef) {
        filtered = filtered.filter(filterDef.filter);
      }
    }

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
  }, [teams, searchQuery, selectedCategory]);

  // Get teams for display
  const displayTeams = useMemo(() => {
    let result = teams;

    // Apply search filter
    if (searchQuery) {
      result = result.filter(team =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedCategory && selectedCategory !== 'all') {
      const filterDef = filterCategories.find(f => f.id === selectedCategory);
      if (filterDef) {
        result = result.filter(filterDef.filter);
      }
    }

    return result;
  }, [teams, searchQuery, selectedCategory]);

  // Get events for display
  const displayEvents = useMemo(() => {
    let result = events;
    const now = new Date();

    // Apply search filter
    if (searchQuery) {
      result = result.filter(event =>
        event.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply temporal filter
    if (eventTab === 'upcoming') {
      result = result.filter(event => {
        if ('duration' in event) {
          const startDate = new Date(event.startDate);
          return startDate > now;
        } else {
          const eventDate = new Date(event.eventDate);
          return eventDate > now;
        }
      });
    } else if (eventTab === 'active') {
      result = result.filter(event => {
        if ('duration' in event) {
          const startDate = new Date(event.startDate);
          const endDate = new Date(event.endDate);
          return startDate <= now && now <= endDate;
        } else {
          const eventDate = new Date(event.eventDate);
          const eventStart = new Date(eventDate);
          eventStart.setHours(0, 0, 0, 0);
          const eventEnd = new Date(eventDate);
          eventEnd.setHours(23, 59, 59, 999);
          return eventStart <= now && now <= eventEnd;
        }
      });
    }

    return result;
  }, [events, searchQuery, eventTab]);

  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const renderCategorySection = ({ item: category }: { item: string }) => {
    const categoryTeams = categorizedTeams[category] || [];
    if (categoryTeams.length === 0) return null;

    const isExpanded = expandedCategories.has(category);
    const teamCount = categoryTeams.length;

    return (
      <View style={styles.categorySection} key={category}>
        <TouchableOpacity
          style={styles.categoryHeaderContainer}
          onPress={() => toggleCategoryExpansion(category)}
          activeOpacity={0.7}
        >
          <View style={styles.categoryHeaderLeft}>
            <Text style={styles.categoryTitle}>{category}</Text>
            <Text style={styles.categoryCount}>({teamCount})</Text>
          </View>
          <Text style={styles.expandIcon}>{isExpanded ? '−' : '+'}</Text>
        </TouchableOpacity>

        {isExpanded && categoryTeams.map((team) => {
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
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Create Button */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        {onCreateTeam && discoveryMode === 'teams' && (
          <TouchableOpacity
            style={styles.createBtn}
            onPress={onCreateTeam}
            activeOpacity={0.7}
          >
            <Text style={styles.createBtnText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Toggle between Teams and Events */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            discoveryMode === 'teams' && styles.toggleButtonActive,
          ]}
          onPress={() => setDiscoveryMode('teams')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.toggleButtonText,
              discoveryMode === 'teams' && styles.toggleButtonTextActive,
            ]}
          >
            Teams
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            discoveryMode === 'events' && styles.toggleButtonActive,
          ]}
          onPress={() => setDiscoveryMode('events')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.toggleButtonText,
              discoveryMode === 'events' && styles.toggleButtonTextActive,
            ]}
          >
            Events
          </Text>
        </TouchableOpacity>
      </View>

      {/* Temporal tabs for Events */}
      {discoveryMode === 'events' && (
        <View style={styles.eventTabsContainer}>
          <TouchableOpacity
            style={[
              styles.eventTab,
              eventTab === 'upcoming' && styles.eventTabActive,
            ]}
            onPress={() => setEventTab('upcoming')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.eventTabText,
                eventTab === 'upcoming' && styles.eventTabTextActive,
              ]}
            >
              Upcoming
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.eventTab,
              eventTab === 'active' && styles.eventTabActive,
            ]}
            onPress={() => setEventTab('active')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.eventTabText,
                eventTab === 'active' && styles.eventTabTextActive,
              ]}
            >
              Active
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search bar */}
      <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={discoveryMode === 'teams' ? "Search teams by name..." : "Search events by name..."}
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

          {/* Enhanced Category Filter Pills - Only show for teams */}
          {discoveryMode === 'teams' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
            contentContainerStyle={styles.filterContent}
          >
            {filterCategories.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterPill,
                  selectedCategory === filter.id && styles.filterPillActive,
                ]}
                onPress={() => setSelectedCategory(filter.id === selectedCategory ? 'all' : filter.id)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    selectedCategory === filter.id && styles.filterPillTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          )}
        </View>

      {/* Team Display */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.text} />
          <Text style={styles.loadingText}>Loading {discoveryMode}...</Text>
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
            <Text style={styles.loadingText}>Loading {discoveryMode}...</Text>
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
          {/* Display teams or events based on mode */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {discoveryMode === 'teams' ? (
              // Teams display
              <>
                {searchQuery && (
                  <Text style={styles.searchResultsText}>
                    {displayTeams.length} team{displayTeams.length !== 1 ? 's' : ''} found
                  </Text>
                )}

                {/* Show filtered teams or categorized teams */}
                {selectedCategory !== 'all' || searchQuery ? (
                  // Filtered or searched view - show flat list
                  displayTeams.map((team) => {
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
                  })
                ) : (
                  // All teams view - show by category
                  categories.map((category) => renderCategorySection({ item: category }))
                )}

                {displayTeams.length === 0 && searchQuery && (
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
              </>
            ) : (
              // Events display
              <>
                {searchQuery && (
                  <Text style={styles.searchResultsText}>
                    {displayEvents.length} event{displayEvents.length !== 1 ? 's' : ''} found
                  </Text>
                )}

                {displayEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onPress={handleEventSelect}
                  />
                ))}

                {displayEvents.length === 0 && searchQuery && (
                  <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>
                      No events found matching "{searchQuery}"
                    </Text>
                    <TouchableOpacity
                      style={styles.clearSearchButton}
                      onPress={() => setSearchQuery('')}
                    >
                      <Text style={styles.clearSearchButtonText}>Clear Search</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {displayEvents.length === 0 && !searchQuery && (
                  <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>
                      No {eventTab} events available
                    </Text>
                    <Text style={styles.noResultsSubtext}>
                      Check back later for new competitions
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: 'relative',
  },

  headerSpacer: {
    width: 32,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center',
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  createBtn: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -16 }],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },

  createBtnText: {
    color: theme.colors.background,
    fontSize: 24,
    fontWeight: theme.typography.weights.medium,
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
    marginBottom: 16,
  },

  categoryHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 8,
  },

  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  categoryTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  categoryCount: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },

  expandIcon: {
    fontSize: 20,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
  },

  categoryDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    opacity: 0.5,
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

  // Toggle styles
  toggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },

  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },

  toggleButtonActive: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
  },

  toggleButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  toggleButtonTextActive: {
    color: theme.colors.background,
  },

  // Event tabs styles
  eventTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },

  eventTab: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  eventTabActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },

  eventTabText: {
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  eventTabTextActive: {
    color: theme.colors.accentText,
  },

  noResultsSubtext: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
});
