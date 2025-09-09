/**
 * TeamPrizeSection - Displays team prize pool and recent payout information
 * Ultra-focused component matching HTML mockup exactly
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { TeamPayout } from '../../types';

interface TeamPrizeSectionProps {
  prizePool: number; // satoshis
  recentPayout?: TeamPayout;
}

export const TeamPrizeSection: React.FC<TeamPrizeSectionProps> = ({
  prizePool,
  recentPayout,
}) => {
  const formatPrizeAmount = (sats: number): string => {
    return sats.toLocaleString();
  };

  const formatRecentPayout = (payout: TeamPayout): string => {
    const amount = payout.amount.toLocaleString();
    const daysAgo = Math.floor(
      (Date.now() - new Date(payout.timestamp).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return `Last payout: ${amount} sats • ${daysAgo} day${
      daysAgo === 1 ? '' : 's'
    } ago`;
  };

  return (
    <View style={styles.prizeSection}>
      <View style={styles.prizeAmount}>
        <Text style={styles.prizeNumber}>{formatPrizeAmount(prizePool)}</Text>
        <Text style={styles.prizeCurrency}>sat prize pool</Text>
      </View>
      {recentPayout && (
        <Text style={styles.recentPayout}>
          {formatRecentPayout(recentPayout)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  prizeSection: {
    marginBottom: 16,
  },

  prizeAmount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 4,
  },

  prizeNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
  },

  prizeCurrency: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  recentPayout: {
    fontSize: 11,
    color: '#666',
  },
});
