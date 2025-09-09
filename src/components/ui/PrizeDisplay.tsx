/**
 * PrizeDisplay Component - Exact match to HTML mockup prize section
 * Shows prize pool amount and recent payout information
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { TeamPayout } from '../../types';

interface PrizeDisplayProps {
  prizePool: number; // satoshis
  recentPayout?: TeamPayout;
  style?: any;
}

const formatSats = (sats: number): string => {
  return sats.toLocaleString();
};

const formatPayoutTime = (timestamp: string): string => {
  const payoutDate = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - payoutDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      return 'today';
    }
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays === 1) {
    return '1 day ago';
  } else {
    return `${diffDays} days ago`;
  }
};

export const PrizeDisplay: React.FC<PrizeDisplayProps> = ({
  prizePool,
  recentPayout,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.prizeAmount}>
        <Text style={styles.prizeNumber}>{formatSats(prizePool)}</Text>
        <Text style={styles.prizeCurrency}>sat prize pool</Text>
      </View>

      {recentPayout && (
        <Text style={styles.recentPayout}>
          Last payout: {formatSats(recentPayout.amount)} sats •{' '}
          {formatPayoutTime(recentPayout.timestamp)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.xxl,
  },

  prizeAmount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },

  prizeNumber: {
    // Exact CSS: font-size: 28px; font-weight: 800;
    fontSize: 28,
    fontWeight: theme.typography.weights.extraBold,
    color: theme.colors.text,
  },

  prizeCurrency: {
    // Exact CSS: font-size: 14px; color: #666; font-weight: 500;
    fontSize: 14,
    color: theme.colors.textMuted, // #666
    fontWeight: theme.typography.weights.medium,
  },

  recentPayout: {
    // Exact CSS: font-size: 11px; color: #666;
    fontSize: 11,
    color: theme.colors.textMuted, // #666
  },
});
