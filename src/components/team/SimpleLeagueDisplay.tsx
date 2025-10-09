/**
 * Simple League Display - MVP Implementation
 * Just displays a leaderboard, no complex logic
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../../styles/theme';
import { ZappableUserRow } from '../ui/ZappableUserRow';

interface LeaderboardEntry {
  rank: number;
  npub: string;
  name: string;
  score: number;
  formattedScore: string;
  workoutCount: number;
}

interface SimpleLeagueDisplayProps {
  leagueName?: string;
  leaderboard: LeaderboardEntry[];
  loading: boolean;
  onRefresh?: () => void;
}

export const SimpleLeagueDisplay: React.FC<SimpleLeagueDisplayProps> = ({
  leagueName,
  leaderboard,
  loading,
  onRefresh,
}) => {
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{leagueName || 'League'}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading rankings...</Text>
        </View>
      </View>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{leagueName || 'League'}</Text>
          {onRefresh && (
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No activity yet</Text>
          <Text style={styles.emptySubtext}>
            Complete workouts to see rankings
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{leagueName || 'League'}</Text>
        {onRefresh && (
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Text style={styles.refreshButtonText}>↻ Refresh</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.leaderboardList}
        showsVerticalScrollIndicator={true}
        indicatorStyle="white"
      >
        {leaderboard.map((entry) => (
          <View key={entry.npub} style={styles.leaderboardItem}>
            {/* Row 1: Rank + User + Action Buttons */}
            <View style={styles.topRow}>
              <View style={styles.rankContainer}>
                <Text style={[
                  styles.rankText,
                  entry.rank <= 3 && styles.topThreeRank
                ]}>
                  {entry.rank}
                </Text>
              </View>

              <ZappableUserRow
                npub={entry.npub}
                fallbackName={entry.name}
                showQuickZap={true}
                style={styles.userRowInLeaderboard}
              />
            </View>

            {/* Row 2: Stats below */}
            <View style={styles.statsRow}>
              <Text style={styles.workoutCount}>
                {entry.workoutCount} runs
              </Text>
              <Text style={[
                styles.scoreText,
                entry.rank <= 3 && styles.topThreeScore
              ]}>
                {entry.formattedScore}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 20,
    minHeight: 450,
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },

  refreshButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },

  refreshButtonText: {
    color: theme.colors.accentText,
    fontSize: 12,
    fontWeight: '600',
  },

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },

  loadingText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },

  emptySubtext: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },

  leaderboardList: {
    flex: 1,
    maxHeight: 350,
  },

  leaderboardItem: {
    flexDirection: 'column',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  userRowInLeaderboard: {
    flex: 1,
    paddingVertical: 0,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 4,
    paddingRight: 12,
    gap: 12,
  },

  rankContainer: {
    width: 28,
    alignItems: 'center',
    marginRight: 4,
  },

  rankText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },

  topThreeRank: {
    fontSize: 18,
    color: theme.colors.accent,
    fontWeight: '700',
  },

  workoutCount: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },

  scoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },

  topThreeScore: {
    fontSize: 15,
    color: theme.colors.accent,
  },
});
