/**
 * CharityPayoutLeaderboard - Ranked list of charities by sats received
 *
 * Displays:
 * - Top 10 charities by total sats received
 * - Rank badges (gold, silver, bronze for top 3)
 * - Charity name and total sats
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import type { CharityPayout } from '../../types/transparencyDashboard';

interface CharityPayoutLeaderboardProps {
  rankings: CharityPayout[];
}

// Rank badge colors for top 3 (orange theme)
const RANK_COLORS: Record<number, string> = {
  1: '#FF9D42', // Bright orange (1st place)
  2: '#CC7A33', // Muted orange (2nd place)
  3: '#996633', // Dark orange (3rd place)
};

const getRankIcon = (rank: number): string => {
  if (rank <= 3) return 'trophy';
  return 'medal-outline';
};

export const CharityPayoutLeaderboard: React.FC<CharityPayoutLeaderboardProps> = ({
  rankings,
}) => {
  const hasData = rankings.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="podium-outline" size={18} color={theme.colors.orangeBright} />
        <Text style={styles.title}>Charity Leaderboard</Text>
      </View>

      {hasData ? (
        <View style={styles.list}>
          {rankings.map((charity, index) => {
            const rank = index + 1;
            const isTop3 = rank <= 3;
            const rankColor = RANK_COLORS[rank] || '#666';

            return (
              <View
                key={charity.charityId}
                style={[styles.row, index === rankings.length - 1 && styles.rowLast]}
              >
                {/* Rank badge */}
                <View style={[styles.rankBadge, isTop3 && { backgroundColor: rankColor + '20' }]}>
                  <Ionicons
                    name={getRankIcon(rank) as any}
                    size={isTop3 ? 16 : 14}
                    color={rankColor}
                  />
                </View>

                {/* Charity info */}
                <View style={styles.charityInfo}>
                  <Text
                    style={[styles.charityName, isTop3 && { color: rankColor }]}
                    numberOfLines={1}
                  >
                    {charity.charityName}
                  </Text>
                  <Text style={styles.paymentCount}>
                    {charity.paymentCount} payment{charity.paymentCount !== 1 ? 's' : ''}
                  </Text>
                </View>

                {/* Total sats */}
                <Text style={[styles.satsValue, isTop3 && { color: rankColor }]}>
                  {charity.totalSats.toLocaleString()}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={32} color="#444" />
          <Text style={styles.emptyText}>No charity payments recorded yet</Text>
          <Text style={styles.emptySubtext}>
            When athletes donate to charities, they'll appear here
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  // List
  list: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    gap: 12,
  },
  rowLast: {
    borderBottomWidth: 0,
  },

  // Rank badge
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Charity info
  charityInfo: {
    flex: 1,
  },
  charityName: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 2,
  },
  paymentCount: {
    fontSize: 11,
    color: '#666',
  },

  // Sats value
  satsValue: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.orangeBright,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    maxWidth: 220,
  },
});

export default CharityPayoutLeaderboard;
