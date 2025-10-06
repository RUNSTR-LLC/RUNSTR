/**
 * LeagueDetailScreen - League detail view with leaderboard
 * Uses SimpleCompetitionService and SimpleLeaderboardService
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { SimpleLeagueDisplay } from '../components/team/SimpleLeagueDisplay';
import type { RootStackParamList } from '../types';

type LeagueDetailRouteProp = RouteProp<RootStackParamList, 'LeagueDetail'>;
type LeagueDetailNavigationProp = StackNavigationProp<RootStackParamList, 'LeagueDetail'>;

interface LeagueDetailScreenProps {
  route: LeagueDetailRouteProp;
  navigation: LeagueDetailNavigationProp;
}

export const LeagueDetailScreen: React.FC<LeagueDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { leagueId, leagueData: passedLeagueData } = route.params;

  const [leagueData, setLeagueData] = useState<any>(passedLeagueData || null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(!passedLeagueData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeagueData();
  }, [leagueId]);

  const loadLeagueData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Loading league:', leagueId);

      // Use passed league data or fetch from Nostr
      let league = passedLeagueData;

      if (!league) {
        const SimpleCompetitionService = (await import('../services/competition/SimpleCompetitionService')).default;
        league = await SimpleCompetitionService.getLeagueById(leagueId);
      }

      if (!league) {
        throw new Error(`League not found: ${leagueId}`);
      }

      console.log('✅ League loaded:', league.name);
      setLeagueData(league);

      // Get team members
      const TeamMemberCache = (await import('../services/team/TeamMemberCache')).TeamMemberCache.getInstance();
      const members = await TeamMemberCache.getTeamMembers(
        league.teamId,
        league.captainPubkey
      );

      console.log(`Found ${members.length} team members`);

      // Calculate leaderboard
      const SimpleLeaderboardService = (await import('../services/competition/SimpleLeaderboardService')).default;
      const rankings = await SimpleLeaderboardService.calculateLeagueLeaderboard(
        league,
        members
      );

      setLeaderboard(rankings);
      console.log(`✅ Leaderboard calculated: ${rankings.length} entries`);

    } catch (err) {
      console.error('❌ Failed to load league:', err);
      setError(err instanceof Error ? err.message : 'Failed to load league');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const getLeagueStatus = () => {
    if (!leagueData?.startDate || !leagueData?.endDate) return 'unknown';

    const now = new Date();
    const startDate = new Date(leagueData.startDate);
    const endDate = new Date(leagueData.endDate);

    // Reset time portions for comparison
    now.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    if (now < startDate) return 'upcoming';
    if (now > endDate) return 'past';
    return 'active';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading league...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !leagueData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'League not found'}</Text>
          <TouchableOpacity onPress={loadLeagueData} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const status = getLeagueStatus();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>League Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* League Info Card */}
        <View style={styles.leagueCard}>
          <Text style={styles.leagueName}>{leagueData.name}</Text>

          {/* Status Badge */}
          <View style={styles.statusBadgeContainer}>
            <View style={[
              styles.statusBadge,
              status === 'active' && styles.statusBadgeActive,
              status === 'past' && styles.statusBadgePast,
              status === 'upcoming' && styles.statusBadgeUpcoming,
            ]}>
              <Text style={styles.statusBadgeText}>
                {status === 'active' && '🔴 Active'}
                {status === 'past' && '✓ Completed'}
                {status === 'upcoming' && '⏰ Upcoming'}
              </Text>
            </View>
          </View>

          <View style={styles.leagueInfoRow}>
            <Text style={styles.leagueLabel}>Start Date</Text>
            <Text style={styles.leagueValue}>{formatDate(leagueData.startDate)}</Text>
          </View>

          <View style={styles.leagueInfoRow}>
            <Text style={styles.leagueLabel}>End Date</Text>
            <Text style={styles.leagueValue}>{formatDate(leagueData.endDate)}</Text>
          </View>

          {leagueData.description && (
            <View style={styles.leagueInfoRow}>
              <Text style={styles.leagueLabel}>Description</Text>
              <Text style={styles.leagueValue}>{leagueData.description}</Text>
            </View>
          )}

          <View style={styles.leagueInfoRow}>
            <Text style={styles.leagueLabel}>Activity</Text>
            <Text style={styles.leagueValue}>
              {leagueData.activityType || 'Any'}
            </Text>
          </View>

          <View style={styles.leagueInfoRow}>
            <Text style={styles.leagueLabel}>Scoring</Text>
            <Text style={styles.leagueValue}>
              {leagueData.metric?.replace('_', ' ') || 'Total distance'}
            </Text>
          </View>
        </View>

        {/* Leaderboard */}
        <View style={styles.leaderboardContainer}>
          <SimpleLeagueDisplay
            leagueName="League Leaderboard"
            leaderboard={leaderboard}
            loading={isLoading}
            onRefresh={loadLeagueData}
          />
        </View>

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
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
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  leagueCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  leagueName: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 16,
  },
  statusBadgeContainer: {
    marginBottom: 16,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusBadgeActive: {
    backgroundColor: theme.colors.error + '20',
    borderColor: theme.colors.error,
  },
  statusBadgePast: {
    backgroundColor: theme.colors.textMuted + '20',
    borderColor: theme.colors.textMuted,
  },
  statusBadgeUpcoming: {
    backgroundColor: theme.colors.accent + '20',
    borderColor: theme.colors.accent,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  leagueInfoRow: {
    marginBottom: 12,
  },
  leagueLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  leagueValue: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  leaderboardContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accentText,
  },
});
