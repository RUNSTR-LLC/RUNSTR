import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { theme } from '../../styles/theme';
import { Avatar } from '../ui/Avatar';

export interface CompetitionWinner {
  id: string;
  winnerNpub: string;
  winnerName: string;
  winnerAvatar?: string;
  competitionName: string;
  competitionType: 'league' | 'event';
  satsWon: number;
  date: string;
  rank?: number;
}

interface CompetitionWinnersCardProps {
  teamId: string;
  winners?: CompetitionWinner[];
  loading?: boolean;
}

export const CompetitionWinnersCard: React.FC<CompetitionWinnersCardProps> = ({
  teamId,
  winners = [],
  loading = false,
}) => {
  const formatSats = (sats: number): string => {
    if (sats >= 1000000) {
      return `${(sats / 1000000).toFixed(1)}M`;
    } else if (sats >= 1000) {
      return `${(sats / 1000).toFixed(1)}k`;
    }
    return sats.toString();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTrophyColor = (rank?: number): string => {
    // Use monochrome theme colors instead of metallic colors
    if (rank === 1) return theme.colors.text; // White for first place
    if (rank === 2) return theme.colors.textSecondary; // Light gray for second
    if (rank === 3) return theme.colors.textMuted; // Darker gray for third
    return theme.colors.textMuted;
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="trophy" size={18} color={theme.colors.textMuted} />
          <Text style={styles.title}>Winners</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.textMuted} />
          <Text style={styles.loadingText}>Loading winners...</Text>
        </View>
      ) : winners.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy-outline" size={32} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>No winners yet</Text>
          <Text style={styles.emptySubtext}>
            Complete competitions to see winners here
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollableList}
          showsVerticalScrollIndicator={true}
          indicatorStyle="white"
        >
          {winners.map((winner) => (
            <View key={winner.id} style={styles.winnerItem}>
              <View style={styles.winnerLeft}>
                <Avatar
                  name={winner.winnerName}
                  imageUrl={winner.winnerAvatar}
                  size={32}
                />
                <View style={styles.winnerInfo}>
                  <View style={styles.winnerNameRow}>
                    <Text style={styles.winnerName} numberOfLines={1}>
                      {winner.winnerName}
                    </Text>
                    {winner.rank && winner.rank <= 3 && (
                      <Ionicons
                        name="trophy"
                        size={12}
                        color={getTrophyColor(winner.rank)}
                        style={styles.rankIcon}
                      />
                    )}
                  </View>
                  <Text style={styles.competitionName} numberOfLines={1}>
                    {winner.competitionName}
                  </Text>
                </View>
              </View>
              <View style={styles.winnerRight}>
                <View style={styles.satsContainer}>
                  <Text style={styles.satsAmount}>
                    {formatSats(winner.satsWon)}
                  </Text>
                  <Text style={styles.satsLabel}>sats</Text>
                </View>
                <Text style={styles.winDate}>{formatDate(winner.date)}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  scrollableList: {
    flex: 1,
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  winnerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  winnerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  winnerInfo: {
    marginLeft: 10,
    flex: 1,
  },
  winnerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  winnerName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  rankIcon: {
    marginLeft: 2,
  },
  competitionName: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  winnerRight: {
    alignItems: 'flex-end',
  },
  satsContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  satsAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  satsLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  winDate: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 8,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
});