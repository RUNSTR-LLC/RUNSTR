/**
 * LiveLeaderboard Component - Real-time competition leaderboard display
 * Integrates with leaderboardService for live updates and scoring
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { theme } from '../../styles/theme';
import { MemberAvatar } from '../ui/MemberAvatar';
import { TimeRemaining } from '../ui/TimeRemaining';
import { LeaderboardService } from '../../services/competition/leaderboardService';
import { CompetitionDistributionPanel } from './CompetitionDistributionPanel';
import type {
  Competition,
  CompetitionParticipant,
  CompetitionLeaderboard,
} from '../../services/competition/competitionService';
import type { NostrTeam } from '../../services/nostr/NostrTeamService';
import type { LeaderboardEntry } from '../../services/competition/leaderboardService';

interface LiveLeaderboardProps {
  competition: Competition;
  team: NostrTeam;
  onParticipantPress?: (pubkey: string) => void;
  showHeader?: boolean;
  maxEntries?: number;
  style?: any;
  userIsCaptain?: boolean;
  currentUserPubkey?: string;
}

// Helper function to format time remaining
const formatTimeRemaining = (endTime: number): string => {
  const remaining = endTime - Math.floor(Date.now() / 1000);
  if (remaining <= 0) return 'Expired';

  const days = Math.floor(remaining / (24 * 3600));
  const hours = Math.floor((remaining % (24 * 3600)) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
};

export const LiveLeaderboard: React.FC<LiveLeaderboardProps> = ({
  competition,
  team,
  onParticipantPress,
  showHeader = true,
  maxEntries,
  style,
  userIsCaptain = false,
  currentUserPubkey,
}) => {
  const [leaderboard, setLeaderboard] = useState<CompetitionLeaderboard | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  const leaderboardService = LeaderboardService.getInstance();

  // Load initial leaderboard
  const loadLeaderboard = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) setIsLoading(true);

      const result = await leaderboardService.getLeaderboard(
        competition,
        team,
        forceRefresh
      );

      setLeaderboard(result);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadLeaderboard(true);
  };

  // Setup real-time subscription
  useEffect(() => {
    const setupLeaderboard = async () => {
      try {
        // Load initial leaderboard
        await loadLeaderboard();

        // Subscribe to real-time updates
        const subId = await leaderboardService.subscribeToLeaderboardUpdates(
          competition,
          team,
          (updatedLeaderboard: CompetitionLeaderboard) => {
            console.log('🔄 Leaderboard updated via subscription');
            setLeaderboard(updatedLeaderboard);
            setLastUpdate(new Date());
          }
        );
        setSubscriptionId(subId);
      } catch (error) {
        console.error('Failed to setup leaderboard:', error);
      }
    };

    setupLeaderboard();

    // Cleanup subscription
    return () => {
      if (subscriptionId) {
        console.log('Cleaning up leaderboard subscription:', subscriptionId);
        // TODO: Add unsubscribe method to leaderboardService
      }
    };
  }, [competition.id, team.id]);

  const formatScore = (entry: CompetitionParticipant): string => {
    const score = entry.score || 0;
    switch (competition.goalType) {
      case 'distance':
        const km = score / 1000;
        return km >= 1 ? `${km.toFixed(1)}km` : `${Math.round(score)}m`;
      case 'speed':
        // Score is inverted pace value, convert back to pace
        const pace = entry.averagePace || 0;
        if (pace > 0) {
          const minutes = Math.floor(pace / 60);
          const seconds = Math.round(pace % 60);
          return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
        }
        return '0:00/km';
      case 'duration':
        const hours = Math.floor(score / 3600);
        const minutes = Math.floor((score % 3600) / 60);
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      case 'consistency':
        return `${score.toFixed(1)} pts`;
      default:
        return score.toString();
    }
  };

  const formatSecondaryMetric = (entry: CompetitionParticipant): string => {
    switch (competition.goalType) {
      case 'distance':
        return `${entry.workoutCount || 0} workouts`;
      case 'speed':
        const km = (entry.totalDistance || 0) / 1000;
        return km >= 1
          ? `${km.toFixed(1)}km total`
          : `${entry.totalDistance || 0}m total`;
      case 'duration':
        return `${entry.workoutCount || 0} workouts`;
      case 'consistency':
        return `${entry.workoutCount || 0} workouts`;
      default:
        return '';
    }
  };

  const getPositionStyle = (position: number) => {
    switch (position) {
      case 1:
        return styles.firstPlace;
      case 2:
        return styles.secondPlace;
      case 3:
        return styles.thirdPlace;
      default:
        return {};
    }
  };

  const getPositionIcon = (position: number): string => {
    switch (position) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '';
    }
  };

  const displayEntries = maxEntries
    ? leaderboard?.participants.slice(0, maxEntries) || []
    : leaderboard?.participants || [];

  if (isLoading && !leaderboard) {
    return (
      <View style={[styles.container, style]}>
        {showHeader && (
          <View style={styles.header}>
            <Text style={styles.competitionName}>{competition.name}</Text>
            <Text style={styles.loadingText}>Loading leaderboard...</Text>
          </View>
        )}
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading results...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {showHeader && (
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.competitionName}>{competition.name}</Text>
            <TimeRemaining
              timeRemaining={formatTimeRemaining(competition.endTime)}
            />
          </View>
          <View style={styles.headerStats}>
            <Text style={styles.statsText}>
              {displayEntries.length} participants •{' '}
              {leaderboard?.totalWorkouts || 0} workouts
            </Text>
            <Text style={styles.lastUpdateText}>
              Updated {lastUpdate.toLocaleTimeString()}
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.leaderboardList}
        showsVerticalScrollIndicator={true}
        indicatorStyle="white"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.text}
          />
        }
      >
        {displayEntries.map((entry, index) => (
          <TouchableOpacity
            key={entry.pubkey}
            style={[
              styles.leaderboardItem,
              getPositionStyle(entry.position || 0),
              index === displayEntries.length - 1 && styles.lastItem,
            ]}
            onPress={() => onParticipantPress?.(entry.pubkey)}
            activeOpacity={0.7}
          >
            <View style={styles.positionSection}>
              <Text style={styles.positionNumber}>
                {getPositionIcon(entry.position || 0) || entry.position || 0}
              </Text>
            </View>

            <View style={styles.participantInfo}>
              <MemberAvatar name={entry.pubkey.slice(0, 8)} size={36} />
              <View style={styles.participantDetails}>
                <Text style={styles.participantName}>
                  User {entry.pubkey.slice(0, 8)}
                </Text>
                <Text style={styles.participantStats}>
                  {formatSecondaryMetric(entry)}
                </Text>
              </View>
            </View>

            <View style={styles.scoreSection}>
              <Text style={styles.scoreValue}>{formatScore(entry)}</Text>
              {entry.lastActivity && (
                <Text style={styles.lastActivityText}>
                  {new Date(entry.lastActivity * 1000).toLocaleDateString()}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ))}

        {displayEntries.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No activity yet</Text>
            <Text style={styles.emptyStateText}>
              Workouts will appear here as team members log their activities
            </Text>
          </View>
        )}

        {maxEntries &&
          leaderboard &&
          leaderboard.participants.length > maxEntries && (
            <View style={styles.showMoreHint}>
              <Text style={styles.showMoreText}>
                +{leaderboard.participants.length - maxEntries} more
                participants
              </Text>
            </View>
          )}
      </ScrollView>

      {/* Show distribution panel for captains when competition is complete */}
      {userIsCaptain &&
       competition.endTime < Math.floor(Date.now() / 1000) &&
       displayEntries.length > 0 && (
        <CompetitionDistributionPanel
          competition={competition}
          winners={displayEntries}
          captainPubkey={currentUserPubkey || team.captain}
          onDistributionComplete={() => {
            // Refresh the leaderboard after distribution
            handleRefresh();
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  competitionName: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    flex: 1,
  },

  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statsText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  lastUpdateText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },

  // Leaderboard list
  leaderboardList: {
    maxHeight: 400, // Limit height for embedded use
  },

  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  lastItem: {
    borderBottomWidth: 0,
  },

  // Position styling
  firstPlace: {
    backgroundColor: `${theme.colors.accent}08`,
  },

  secondPlace: {
    backgroundColor: '#ffffff08',
  },

  thirdPlace: {
    backgroundColor: '#cd7f3208',
  },

  // Position section
  positionSection: {
    width: 40,
    alignItems: 'center',
  },

  positionNumber: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },

  // Participant info
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },

  participantDetails: {
    marginLeft: 12,
    flex: 1,
  },

  participantName: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 2,
  },

  participantStats: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },

  // Score section
  scoreSection: {
    alignItems: 'flex-end',
  },

  scoreValue: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accent,
    marginBottom: 2,
  },

  lastActivityText: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },

  // Loading state
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },

  loadingText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },

  // Empty state
  emptyState: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },

  emptyStateTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },

  emptyStateText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Show more hint
  showMoreHint: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  showMoreText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
});
