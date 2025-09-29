/**
 * Season1Header - Header component for RUNSTR Season 1
 * Displays title, countdown timer, and prize pool
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { SEASON_1_CONFIG } from '../../types/season';

export const Season1Header: React.FC = () => {
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const [timeString, setTimeString] = useState<string>('');

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const endDate = new Date(SEASON_1_CONFIG.endDate);
      const now = new Date();
      const diffTime = endDate.getTime() - now.getTime();

      if (diffTime <= 0) {
        setDaysRemaining(0);
        setTimeString('Competition ended');
        return;
      }

      const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      setDaysRemaining(days);

      if (days > 0) {
        setTimeString(`${days} day${days !== 1 ? 's' : ''} remaining`);
      } else if (hours > 0) {
        setTimeString(`${hours} hour${hours !== 1 ? 's' : ''} remaining`);
      } else {
        setTimeString('Ending soon');
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RUNSTR SEASON 1</Text>
      <Text style={[styles.countdown, daysRemaining === 0 && styles.ended]}>
        {timeString}
      </Text>
      <View style={styles.prizePoolContainer}>
        <Text style={styles.prizePoolLabel}>Prize Pool</Text>
        <Text style={styles.prizePoolAmount}>
          {SEASON_1_CONFIG.prizePool.toLocaleString()} sats
        </Text>
        <Text style={styles.prizePoolDistribution}>
          Top 3 in each category
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    alignItems: 'center',
  },

  title: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 8,
  },

  countdown: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },

  ended: {
    color: theme.colors.textMuted,
  },

  prizePoolContainer: {
    alignItems: 'center',
  },

  prizePoolLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },

  prizePoolAmount: {
    fontSize: 20,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 4,
  },

  prizePoolDistribution: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});