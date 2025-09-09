/**
 * EarningsDisplay - Bitcoin earnings display for reward notifications
 * Shows satoshi amounts with formatted display
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

interface EarningsDisplayProps {
  amount: number; // satoshis
  label: string;
  style?: any;
}

export const EarningsDisplay: React.FC<EarningsDisplayProps> = ({
  amount,
  label,
  style,
}) => {
  const formatSats = (sats: number): string => {
    return sats.toLocaleString();
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.earningsAmount}>{formatSats(amount)} sats</Text>
      <Text style={styles.earningsLabel}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.buttonHover, // #1a1a1a
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },

  earningsAmount: {
    fontSize: 20,
    fontWeight: '800', // Extra bold for emphasis
    color: theme.colors.text, // #fff
    marginBottom: 2,
  },

  earningsLabel: {
    fontSize: 11,
    color: theme.colors.textMuted, // #666
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: theme.typography.weights.medium,
  },
});
