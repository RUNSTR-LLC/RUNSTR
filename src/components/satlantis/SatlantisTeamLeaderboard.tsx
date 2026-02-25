/**
 * SatlantisTeamLeaderboard - Team competition leaderboard display
 *
 * Shows teams ranked by aggregated scores from member workouts.
 * Used when event has isTeamCompetition = true.
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { theme } from '../../styles/theme';
import type { TeamLeaderboardEntry } from '../../types/runstrEvent';
import type { SatlantisEventStatus } from '../../types/satlantis';
interface SatlantisTeamLeaderboardProps {
  entries: TeamLeaderboardEntry[];
  isLoading: boolean;
  eventStatus: SatlantisEventStatus;
  scoringType?: string;
}

export const SatlantisTeamLeaderboard: React.FC<SatlantisTeamLeaderboardProps> = ({
  entries,
  isLoading,
  eventStatus,
  scoringType,
}) => {
  // Team images now come from Supabase club data
  const getTeamImage = (_teamId: string): string | undefined => {
    return undefined;
  };

  // Upcoming events - show placeholder
  if (eventStatus === 'upcoming') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Team Leaderboard</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            Team rankings will appear when the event starts
          </Text>
        </View>
      </View>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Team Leaderboard</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading team rankings...</Text>
        </View>
      </View>
    );
  }

  // No entries - show empty state
  if (entries.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Team Leaderboard</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No team workouts yet</Text>
          <Text style={styles.emptySubtext}>
            Team members need to post workouts to appear here
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Team Leaderboard {eventStatus === 'live' ? '(Live)' : '(Final)'}
      </Text>

      {entries.map((entry) => {
        const teamImage = getTeamImage(entry.teamId);

        return (
          <View key={entry.teamId} style={styles.teamRow}>
            {/* Rank */}
            <View style={styles.rankSection}>
              <Text style={[styles.rankText, entry.rank <= 3 && styles.topRank]}>
                {entry.rank}
              </Text>
            </View>

            {/* Team Info */}
            <View style={styles.teamInfoSection}>
              {teamImage ? (
                <Image source={{ uri: teamImage }} style={styles.teamAvatar} />
              ) : (
                <View style={styles.teamAvatarPlaceholder}>
                  <Text style={styles.teamAvatarText}>
                    {entry.teamName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.teamDetails}>
                <Text style={styles.teamName} numberOfLines={1}>
                  {entry.teamName}
                </Text>
                <Text style={styles.memberCount}>
                  {entry.memberCount} contributor{entry.memberCount !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            {/* Score */}
            <View style={styles.scoreSection}>
              <Text style={styles.scoreText}>{entry.formattedScore}</Text>
            </View>
          </View>
        );
      })}

      {eventStatus === 'live' && (
        <Text style={styles.refreshHint}>
          Updates as team members post workouts
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginTop: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginLeft: 8,
    color: theme.colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  emptySubtext: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 12,
  },
  rankSection: {
    width: 32,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
  },
  topRank: {
    color: theme.colors.accent,
  },
  teamInfoSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  teamAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.border,
  },
  teamAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.text,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamAvatarText: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.background,
  },
  teamDetails: {
    marginLeft: 12,
    flex: 1,
  },
  teamName: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  memberCount: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  scoreSection: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
  },
  refreshHint: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});

export default SatlantisTeamLeaderboard;
