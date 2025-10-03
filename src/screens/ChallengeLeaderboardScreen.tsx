/**
 * ChallengeLeaderboardScreen - Real-time 1v1 challenge leaderboard
 * Shows both participants' progress, winner when complete
 * Uses existing ChallengeService for data fetching
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { theme } from '../styles/theme';
import { challengeService } from '../services/competition/ChallengeService';
import type { ChallengeLeaderboard } from '../types/challenge';

type RouteParams = {
  ChallengeLeaderboard: {
    challengeId: string;
  };
};

export const ChallengeLeaderboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'ChallengeLeaderboard'>>();
  const { challengeId } = route.params;

  const [leaderboard, setLeaderboard] = useState<ChallengeLeaderboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();

    // Auto-refresh every 30 seconds while challenge is active
    const interval = setInterval(() => {
      if (leaderboard && leaderboard.status === 'active') {
        loadLeaderboard(true); // Silent refresh
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [challengeId]);

  const loadLeaderboard = async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await challengeService.getChallengeLeaderboard(challengeId);
      setLeaderboard(data);
    } catch (err) {
      console.error('Failed to load challenge leaderboard:', err);
      setError('Failed to load challenge');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadLeaderboard();
  };

  const formatMetric = (metric: string, value: number): string => {
    switch (metric) {
      case 'distance':
        return `${(value / 1000).toFixed(2)} km`;
      case 'duration':
        const hours = Math.floor(value / 3600);
        const minutes = Math.floor((value % 3600) / 60);
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      case 'calories':
        return `${value.toFixed(0)} kcal`;
      case 'count':
        return `${value.toFixed(0)}`;
      case 'pace':
        const paceMin = Math.floor(value / 60);
        const paceSec = Math.floor(value % 60);
        return `${paceMin}:${paceSec.toString().padStart(2, '0')}/km`;
      default:
        return value.toFixed(2);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#00ff00';
      case 'completed':
        return theme.colors.accent;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Waiting to Start';
      case 'active':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'declined':
        return 'Declined';
      case 'expired':
        return 'Expired';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const renderParticipant = (participant: any, isLeader: boolean, index: number) => {
    const progressPercentage = leaderboard?.target
      ? (participant.currentProgress / leaderboard.target) * 100
      : 0;

    return (
      <View key={participant.pubkey} style={styles.participantCard}>
        <View style={styles.participantHeader}>
          <View style={styles.participantInfo}>
            {participant.avatar ? (
              <Image source={{ uri: participant.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {participant.name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.participantName}>{participant.name}</Text>
              <Text style={styles.workoutCount}>{participant.workoutCount} workouts</Text>
            </View>
          </View>
          {isLeader && leaderboard && !leaderboard.tied && (
            <Ionicons name="trophy" size={24} color={theme.colors.accent} />
          )}
        </View>

        {/* Progress Bar */}
        {leaderboard?.target && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(progressPercentage, 100)}%` },
                  isLeader && styles.progressFillLeader,
                ]}
              />
            </View>
            <Text style={styles.progressText}>{progressPercentage.toFixed(0)}%</Text>
          </View>
        )}

        {/* Current Progress */}
        <View style={styles.statsRow}>
          <Text style={styles.statLabel}>Current:</Text>
          <Text style={[styles.statValue, isLeader && styles.statValueLeader]}>
            {formatMetric(leaderboard?.metric || '', participant.currentProgress)}
          </Text>
        </View>

        {participant.lastWorkoutAt && (
          <Text style={styles.lastActivity}>
            Last activity: {new Date(participant.lastWorkoutAt * 1000).toLocaleDateString()}
          </Text>
        )}
      </View>
    );
  };

  if (isLoading && !leaderboard) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Challenge</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading challenge...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !leaderboard) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Challenge</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.colors.textMuted} />
          <Text style={styles.errorText}>{error || 'Challenge not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadLeaderboard()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const leader = leaderboard.participants.find((p) => p.pubkey === leaderboard.leader);
  const isCompleted = leaderboard.status === 'completed';
  const daysRemaining = Math.ceil((leaderboard.expiresAt - Date.now() / 1000) / 86400);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Challenge</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.text}
          />
        }
      >
        {/* Status Badge */}
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(leaderboard.status) }]} />
          <Text style={styles.statusText}>{getStatusText(leaderboard.status)}</Text>
        </View>

        {/* Challenge Info */}
        <View style={styles.challengeInfo}>
          <Text style={styles.challengeTitle}>
            {leaderboard.metric} Challenge
          </Text>
          <Text style={styles.wager}>{leaderboard.wager} sats</Text>
          {!isCompleted && daysRemaining > 0 && (
            <Text style={styles.timeRemaining}>
              {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
            </Text>
          )}
          {leaderboard.target && (
            <Text style={styles.target}>
              Target: {formatMetric(leaderboard.metric, leaderboard.target)}
            </Text>
          )}
        </View>

        {/* Winner Announcement */}
        {isCompleted && leader && !leaderboard.tied && (
          <View style={styles.winnerBanner}>
            <Ionicons name="trophy" size={32} color={theme.colors.accent} />
            <Text style={styles.winnerText}>{leader.name} Won!</Text>
          </View>
        )}

        {isCompleted && leaderboard.tied && (
          <View style={styles.winnerBanner}>
            <Ionicons name="people" size={32} color={theme.colors.textSecondary} />
            <Text style={styles.winnerText}>It's a Tie!</Text>
          </View>
        )}

        {/* Participants */}
        <View style={styles.participantsContainer}>
          {leaderboard.participants
            .sort((a, b) => b.currentProgress - a.currentProgress)
            .map((participant, index) =>
              renderParticipant(participant, participant.pubkey === leaderboard.leader, index)
            )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  challengeInfo: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  challengeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  wager: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.accent,
    marginBottom: 8,
  },
  timeRemaining: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  target: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  winnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  winnerText: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  participantsContainer: {
    padding: 16,
    gap: 16,
  },
  participantCard: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
  },
  participantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.buttonBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  workoutCount: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.textSecondary,
    borderRadius: 4,
  },
  progressFillLeader: {
    backgroundColor: theme.colors.accent,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    width: 40,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  statValueLeader: {
    color: theme.colors.accent,
  },
  lastActivity: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
});
