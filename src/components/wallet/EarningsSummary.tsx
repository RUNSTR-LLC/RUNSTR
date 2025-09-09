/**
 * EarningsSummary - Displays weekly and monthly earnings statistics
 * Shows earnings amounts and growth compared to previous periods
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

interface EarningsPeriod {
  sats: number;
  change: number;
  changeType: 'positive' | 'negative';
}

interface EarningsData {
  thisWeek: EarningsPeriod;
  thisMonth: EarningsPeriod;
}

interface EarningsSummaryProps {
  earnings: EarningsData;
}

export const EarningsSummary: React.FC<EarningsSummaryProps> = ({
  earnings,
}) => {
  const formatSats = (sats: number): string => {
    return `${sats.toLocaleString()} sats`;
  };

  const formatChange = (
    change: number,
    type: 'positive' | 'negative'
  ): string => {
    const prefix = type === 'positive' ? '+' : '';
    if (change >= 1000) {
      return `${prefix}${(change / 1000).toFixed(1)}k vs last ${
        type === 'positive' ? 'week' : 'month'
      }`;
    }
    return `${prefix}${change} vs last ${
      type === 'positive' ? 'week' : 'month'
    }`;
  };

  const formatMonthlyChange = (change: number): string => {
    return `+${change}% vs last month`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Earnings Summary</Text>

      <View style={styles.earningsCards}>
        {/* This Week Card */}
        <View style={styles.earningsCard}>
          <Text style={styles.earningsPeriod}>This Week</Text>
          <Text style={styles.earningsAmount}>
            {formatSats(earnings.thisWeek.sats)}
          </Text>
          <Text
            style={[
              styles.earningsChange,
              earnings.thisWeek.changeType === 'positive' &&
                styles.earningsChangePositive,
            ]}
          >
            {formatChange(
              earnings.thisWeek.change,
              earnings.thisWeek.changeType
            )}
          </Text>
        </View>

        {/* This Month Card */}
        <View style={styles.earningsCard}>
          <Text style={styles.earningsPeriod}>This Month</Text>
          <Text style={styles.earningsAmount}>
            {formatSats(earnings.thisMonth.sats)}
          </Text>
          <Text
            style={[
              styles.earningsChange,
              earnings.thisMonth.changeType === 'positive' &&
                styles.earningsChangePositive,
            ]}
          >
            {formatMonthlyChange(earnings.thisMonth.change)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  earningsCards: {
    flexDirection: 'row',
    gap: 12,
  },
  earningsCard: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  earningsPeriod: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    fontWeight: '600',
  },
  earningsAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
  },
  earningsChange: {
    fontSize: 10,
    color: '#666',
  },
  earningsChangePositive: {
    color: theme.colors.text,
  },
});
