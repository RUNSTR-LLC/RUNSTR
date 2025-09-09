/**
 * WalletSection Component - Balance display with send/receive buttons
 * Matches .wallet-section from HTML mockup exactly
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { Wallet } from '../../types';
import { Button } from '../ui/Button';

interface WalletSectionProps {
  wallet: Wallet;
  onSend: () => void;
  onReceive: () => void;
}

export const WalletSection: React.FC<WalletSectionProps> = ({
  wallet,
  onSend,
  onReceive,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.balance}>
        <Text style={styles.balanceNumber}>
          {wallet.balance.toLocaleString()}
        </Text>
        <Text style={styles.balanceCurrency}>sats</Text>
      </View>

      <View style={styles.actions}>
        <Button
          title="Send"
          onPress={onSend}
          style={styles.actionButton}
          textStyle={styles.actionButtonText}
        />
        <Button
          title="Receive"
          onPress={onReceive}
          style={styles.actionButton}
          textStyle={styles.actionButtonText}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // CSS: margin: 0 20px 16px; background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center;
  container: {
    marginHorizontal: theme.spacing.xxxl, // 20px
    marginBottom: theme.spacing.xxl, // 16px
    backgroundColor: theme.colors.cardBackground, // #0a0a0a
    borderWidth: 1,
    borderColor: theme.colors.border, // #1a1a1a
    borderRadius: theme.borderRadius.large, // 12px
    padding: theme.spacing.xxl, // 16px
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // CSS: display: flex; align-items: baseline; gap: 6px;
  balance: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.md, // 6px
  },

  // CSS: font-size: 24px; font-weight: 800;
  balanceNumber: {
    fontSize: theme.typography.balanceNumber, // 24px
    fontWeight: theme.typography.weights.extraBold, // 800
    color: theme.colors.text,
  },

  // CSS: font-size: 14px; color: #666; font-weight: 500;
  balanceCurrency: {
    fontSize: 14, // Exact from CSS
    color: theme.colors.textMuted, // #666
    fontWeight: theme.typography.weights.medium, // 500
  },

  // CSS: display: flex; gap: 8px;
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.lg, // 8px
  },

  // CSS: padding: 8px 12px; border-radius: 8px; font-size: 12px;
  actionButton: {
    paddingVertical: theme.spacing.lg, // 8px
    paddingHorizontal: theme.spacing.xl, // 12px
    borderRadius: theme.borderRadius.medium, // 8px
  },

  actionButtonText: {
    fontSize: 12, // Exact from CSS
    fontWeight: theme.typography.weights.medium, // 500
  },
});
