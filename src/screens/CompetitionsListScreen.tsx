/**
 * CompetitionsListScreen - Global Events - Shows daily leaderboards
 * Accessible from Profile → "MY EVENTS" button
 * Displays global 5K, 10K, Half Marathon, Marathon, and Steps leaderboards
 *
 * ARCHITECTURE: Uses DailyLeaderboardService (Supabase-backed)
 * - ~500ms query vs 3-5s with Nostr
 * - Server-side anti-cheat validation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Text,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

// Components
import { DailyLeaderboardCard } from '../components/team/DailyLeaderboardCard';

// Services
import { DailyLeaderboardService } from '../services/competition/DailyLeaderboardService';

interface GlobalLeaderboards {
  date: string;
  leaderboard5k: any[];
  leaderboard10k: any[];
  leaderboardHalf: any[];
  leaderboardMarathon: any[];
}

export const CompetitionsListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [globalLeaderboards, setGlobalLeaderboards] =
    useState<GlobalLeaderboards | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load global leaderboards from Supabase (server-validated workouts)
  const loadGlobalLeaderboards = async (forceRefresh: boolean = false) => {
    try {
      setIsLoading(true);
      console.log(
        `[CompetitionsListScreen] 🌍 Loading global leaderboards from Supabase (forceRefresh: ${forceRefresh})`
      );

      // Fetch global daily leaderboards from Supabase (~500ms)
      const leaderboards =
        await DailyLeaderboardService.getGlobalDailyLeaderboards(forceRefresh);

      console.log('[CompetitionsListScreen] ✅ Global leaderboards loaded:', {
        date: leaderboards.date,
        '5k': leaderboards.leaderboard5k.length,
        '10k': leaderboards.leaderboard10k.length,
        half: leaderboards.leaderboardHalf.length,
        marathon: leaderboards.leaderboardMarathon.length,
      });

      setGlobalLeaderboards(leaderboards);
    } catch (error) {
      console.error(
        '[CompetitionsListScreen] ❌ Error loading global leaderboards:',
        error
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Load leaderboards on mount
  useEffect(() => {
    loadGlobalLeaderboards();
  }, []);

  // Handle pull-to-refresh - force bypass cache
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadGlobalLeaderboards(true); // forceRefresh = true
    setRefreshing(false);
  };

  // Calculate if there are any active leaderboards
  const hasAnyLeaderboards =
    globalLeaderboards &&
    (globalLeaderboards.leaderboard5k.length > 0 ||
      globalLeaderboards.leaderboard10k.length > 0 ||
      globalLeaderboards.leaderboardHalf.length > 0 ||
      globalLeaderboards.leaderboardMarathon.length > 0);

  // Loading state
  if (isLoading && !globalLeaderboards) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading global events...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state - No workouts today
  if (!hasAnyLeaderboards) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
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

  // Main content - Show global leaderboards
  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
      </TouchableOpacity>

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
        <View style={styles.globalSection}>
          {/* Date */}
          <Text style={styles.dateText}>
            {globalLeaderboards?.date || new Date().toLocaleDateString()}
          </Text>

          {/* Global leaderboard cards */}
          <View style={styles.leaderboardsContainer}>
            {globalLeaderboards?.leaderboard5k &&
              globalLeaderboards.leaderboard5k.length > 0 && (
                <DailyLeaderboardCard
                  title="RUNSTR 5K"
                  distance="5km"
                  participants={globalLeaderboards.leaderboard5k.length}
                  entries={globalLeaderboards.leaderboard5k}
                  onPress={() => {
                    // TODO: Navigate to RUNSTR 5K leaderboard
                  }}
                />
              )}

            {globalLeaderboards?.leaderboard10k &&
              globalLeaderboards.leaderboard10k.length > 0 && (
                <DailyLeaderboardCard
                  title="RUNSTR 10K"
                  distance="10km"
                  participants={globalLeaderboards.leaderboard10k.length}
                  entries={globalLeaderboards.leaderboard10k}
                  onPress={() => {
                    // TODO: Navigate to RUNSTR 10K leaderboard
                  }}
                />
              )}

            {globalLeaderboards?.leaderboardHalf &&
              globalLeaderboards.leaderboardHalf.length > 0 && (
                <DailyLeaderboardCard
                  title="RUNSTR Half Marathon"
                  distance="21.1km"
                  participants={globalLeaderboards.leaderboardHalf.length}
                  entries={globalLeaderboards.leaderboardHalf}
                  onPress={() => {
                    // TODO: Navigate to RUNSTR Half Marathon leaderboard
                  }}
                />
              )}

            {globalLeaderboards?.leaderboardMarathon &&
              globalLeaderboards.leaderboardMarathon.length > 0 && (
                <DailyLeaderboardCard
                  title="RUNSTR Marathon"
                  distance="42.2km"
                  participants={globalLeaderboards.leaderboardMarathon.length}
                  entries={globalLeaderboards.leaderboardMarathon}
                  onPress={() => {
                    // TODO: Navigate to RUNSTR Marathon leaderboard
                  }}
                />
              )}
          </View>
        </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 8,
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginLeft: 16,
    marginTop: 8,
  },

  title: {
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    flex: 1,
    textAlign: 'center',
  },

  headerSpacer: {
    width: 40, // Match back button width for centered title
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

  globalSection: {
    marginTop: 20,
  },

  dateText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    paddingHorizontal: 20,
    marginBottom: 16,
    textAlign: 'center',
  },

  leaderboardsContainer: {
    paddingHorizontal: 20,
  },
});
