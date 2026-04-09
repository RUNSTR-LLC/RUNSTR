/**
 * EventsScreen - My Events - Shows daily leaderboards from all teams user has joined
 * Displays real-time daily leaderboards (5K, 10K, Half Marathon, Marathon) grouped by team
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

// Components
import { DailyLeaderboardCard } from '../components/team/DailyLeaderboardCard';

// Services and contexts
import SimpleLeaderboardService from '../services/competition/SimpleLeaderboardService';
import { useNavigationData } from '../contexts/NavigationDataContext';
import { npubToHex } from '../utils/ndkConversion';
import { UnifiedCacheService } from '../services/cache/UnifiedCacheService';

interface TeamLeaderboards {
  teamId: string;
  teamName: string;
  leaderboard5k: any[];
  leaderboard10k: any[];
  leaderboardHalf: any[];
  leaderboardMarathon: any[];
}

export const EventsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [teamLeaderboards, setTeamLeaderboards] = useState<TeamLeaderboards[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Get user's teams from navigation data
  const { profileData } = useNavigationData();
  const userTeams = profileData?.teams || [];
  const userNpub = profileData?.user?.npub;
  const userHexPubkey = userNpub ? npubToHex(userNpub) || undefined : undefined;

  // ANDROID FIX: Use ref for isMounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Load leaderboards function - accessible from both useEffect and handleRefresh
  const loadAllLeaderboards = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setIsLoading(true);
      console.log(
        `[EventsScreen] 📊 Loading leaderboards for ${userTeams.length} teams`
      );
      console.log(
        `[EventsScreen] 👤 User hex: ${userHexPubkey?.substring(0, 8)}...`
      );

      const allTeamLeaderboards: TeamLeaderboards[] = [];

      for (const team of userTeams) {
        if (!isMountedRef.current) return; // Check before each team fetch

        try {
          console.log(
            `[EventsScreen] 🔍 Fetching leaderboards for team: ${team.name} (${team.id})`
          );

          const dailyLeaderboards =
            await SimpleLeaderboardService.getTeamDailyLeaderboards(
              team.id,
              userHexPubkey
            );

          allTeamLeaderboards.push({
            teamId: team.id,
            teamName: team.name,
            leaderboard5k: dailyLeaderboards.leaderboard5k,
            leaderboard10k: dailyLeaderboards.leaderboard10k,
            leaderboardHalf: dailyLeaderboards.leaderboardHalf,
            leaderboardMarathon: dailyLeaderboards.leaderboardMarathon,
          });

          console.log(`[EventsScreen] ✅ ${team.name} leaderboards loaded:`, {
            '5k': dailyLeaderboards.leaderboard5k.length,
            '10k': dailyLeaderboards.leaderboard10k.length,
            half: dailyLeaderboards.leaderboardHalf.length,
            marathon: dailyLeaderboards.leaderboardMarathon.length,
          });
        } catch (error) {
          console.error(
            `[EventsScreen] ❌ Error loading leaderboards for ${team.name}:`,
            error
          );
        }
      }

      if (isMountedRef.current) {
        setTeamLeaderboards(allTeamLeaderboards);
      }
    } catch (error) {
      console.error('[EventsScreen] ❌ Error loading leaderboards:', error);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [userTeams, userHexPubkey]);

  // Load leaderboards on mount and when user's teams change
  useEffect(() => {
    isMountedRef.current = true;

    if (userTeams.length > 0) {
      loadAllLeaderboards();
    } else {
      setIsLoading(false);
    }

    // Cleanup: prevent state updates after unmount
    return () => {
      isMountedRef.current = false;
    };
  }, [userTeams.length, loadAllLeaderboards]);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    console.log('[EventsScreen] 🔄 Invalidating daily leaderboard caches...');
    // Clear all daily leaderboard caches to ensure fresh data
    await UnifiedCacheService.invalidate('team:*:daily:*');
    await loadAllLeaderboards();
    setRefreshing(false);
  }, [loadAllLeaderboards]);

  // Calculate if there are any active leaderboards
  const hasAnyLeaderboards = teamLeaderboards.some(
    (team) =>
      team.leaderboard5k.length > 0 ||
      team.leaderboard10k.length > 0 ||
      team.leaderboardHalf.length > 0 ||
      team.leaderboardMarathon.length > 0
  );

  // Loading state
  if (isLoading && teamLeaderboards.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading your events...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state - No teams joined
  if (userTeams.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons
            name="people-outline"
            size={64}
            color={theme.colors.accent}
          />
          <Text style={styles.emptyTitle}>Join a Team</Text>
          <Text style={styles.emptyText}>
            Join a team to participate in competitions and see Events
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state - No workouts today
  if (!hasAnyLeaderboards) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.accent}
            />
          }
        >
          <View style={styles.emptyContainer}>
            <Ionicons
              name="fitness-outline"
              size={64}
              color={theme.colors.accent}
            />
            <Text style={styles.emptyTitle}>No Workouts Today</Text>
            <Text style={styles.emptyText}>
              Be the first to complete a workout and appear on the leaderboard!
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Main content - Show leaderboards grouped by team
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with back button only */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {teamLeaderboards.map((team) => {
          // Check if team has any leaderboards
          const hasLeaderboards =
            team.leaderboard5k.length > 0 ||
            team.leaderboard10k.length > 0 ||
            team.leaderboardHalf.length > 0 ||
            team.leaderboardMarathon.length > 0;

          if (!hasLeaderboards) return null;

          return (
            <View key={team.teamId} style={styles.teamSection}>
              {/* Team name header */}
              <View style={styles.teamHeader}>
                <Ionicons
                  name="people"
                  size={20}
                  color={theme.colors.accent}
                  style={styles.teamIcon}
                />
                <Text style={styles.teamName}>{team.teamName}</Text>
              </View>

              {/* Daily leaderboard cards */}
              <View style={styles.leaderboardsContainer}>
                {team.leaderboard5k.length > 0 && (
                  <DailyLeaderboardCard
                    title={`${team.teamName} 5K`}
                    distance="5km"
                    participants={team.leaderboard5k.length}
                    entries={team.leaderboard5k}
                    onPress={() => {
                      // TODO: Navigate to 5K leaderboard
                    }}
                  />
                )}

                {team.leaderboard10k.length > 0 && (
                  <DailyLeaderboardCard
                    title={`${team.teamName} 10K`}
                    distance="10km"
                    participants={team.leaderboard10k.length}
                    entries={team.leaderboard10k}
                    onPress={() => {
                      // TODO: Navigate to 10K leaderboard
                    }}
                  />
                )}

                {team.leaderboardHalf.length > 0 && (
                  <DailyLeaderboardCard
                    title={`${team.teamName} Half Marathon`}
                    distance="21.1km"
                    participants={team.leaderboardHalf.length}
                    entries={team.leaderboardHalf}
                    onPress={() => {
                      // TODO: Navigate to Half Marathon leaderboard
                    }}
                  />
                )}

                {team.leaderboardMarathon.length > 0 && (
                  <DailyLeaderboardCard
                    title={`${team.teamName} Marathon`}
                    distance="42.2km"
                    participants={team.leaderboardMarathon.length}
                    entries={team.leaderboardMarathon}
                    onPress={() => {
                      // TODO: Navigate to Marathon leaderboard
                    }}
                  />
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },

  backButton: {
    padding: 4,
  },

  headerSpacer: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 20,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    color: theme.colors.text,
    fontSize: 16,
    marginTop: 12,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accent,
    marginTop: 16,
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 15,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },

  teamSection: {
    marginTop: 20,
  },

  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },

  teamIcon: {
    marginRight: 8,
  },

  teamName: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  leaderboardsContainer: {
    paddingHorizontal: 20,
  },
});
