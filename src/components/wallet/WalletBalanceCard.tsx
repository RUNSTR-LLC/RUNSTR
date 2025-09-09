/**
 * WalletBalanceCard - Displays user's Bitcoin balance with action buttons
 * Shows balance in sats/USD, connection status, and quick actions
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

interface WalletBalance {
  sats: number;
  usd: number;
  connected: boolean;
  connectionError?: string;
}

interface WalletBalanceCardProps {
  balance: WalletBalance;
  onSend: () => void;
  onReceive: () => void;
  onWithdraw: () => void;
}

export const WalletBalanceCard: React.FC<WalletBalanceCardProps> = ({
  balance,
  onSend,
  onReceive,
  onWithdraw,
}) => {
  const formatSats = (sats: number): string => {
    if (!balance.connected) return '-- sats';
    return `${sats.toLocaleString()} sats`;
  };

  const formatUSD = (usd: number): string => {
    if (!balance.connected) return 'Unable to load';
    return `≈ $${usd.toFixed(2)}`;
  };

  const getConnectionStatus = () => {
    if (!balance.connected) {
      return {
        text: 'Connection Error',
        color: '#ff6b6b',
        dotColor: '#ff6b6b',
      };
    }
    return {
      text: 'Connected',
      color: '#666',
      dotColor: '#fff',
    };
  };

  const status = getConnectionStatus();
  const actionsDisabled = !balance.connected;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.label}>Your Balance</Text>
        <View style={styles.connectionStatus}>
          <View
            style={[styles.statusDot, { backgroundColor: status.dotColor }]}
          />
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.text}
          </Text>
        </View>
      </View>

      {/* Balance Display */}
      <Text
        style={[
          styles.balanceAmount,
          !balance.connected && styles.balanceDisabled,
        ]}
      >
        {formatSats(balance.sats)}
      </Text>

      <Text
        style={[
          styles.balanceUSD,
          !balance.connected && styles.balanceDisabled,
        ]}
      >
        {formatUSD(balance.usd)}
      </Text>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            actionsDisabled && styles.actionDisabled,
          ]}
          onPress={onSend}
          disabled={actionsDisabled}
        >
          <Text
            style={[
              styles.actionText,
              actionsDisabled && styles.actionTextDisabled,
            ]}
          >
            Send
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            actionsDisabled && styles.actionDisabled,
          ]}
          onPress={onReceive}
          disabled={actionsDisabled}
        >
          <Text
            style={[
              styles.actionText,
              actionsDisabled && styles.actionTextDisabled,
            ]}
          >
            Receive
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.primaryAction,
            actionsDisabled && styles.actionDisabled,
          ]}
          onPress={onWithdraw}
          disabled={actionsDisabled}
        >
          <Text
            style={[
              styles.actionText,
              styles.primaryActionText,
              actionsDisabled && styles.actionTextDisabled,
            ]}
          >
            Withdraw
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    margin: 20,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 4,
  },
  balanceDisabled: {
    color: '#666',
  },
  balanceUSD: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionDisabled: {
    opacity: 0.3,
  },
  actionText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  actionTextDisabled: {
    color: '#666',
  },
  primaryAction: {
    backgroundColor: theme.colors.text,
  },
  primaryActionText: {
    color: theme.colors.background,
  },
});
