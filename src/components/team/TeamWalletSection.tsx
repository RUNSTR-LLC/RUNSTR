/**
 * TeamWalletSection Component
 * Captain dashboard team wallet with prize pool and action buttons
 * Exact match to HTML mockup styling
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

interface TeamWalletSectionProps {
  prizePoolSats: number;
  pendingDistributions?: number;
  onSend: () => void;
  onReceive: () => void;
  onDistribute: () => void;
}

export const TeamWalletSection: React.FC<TeamWalletSectionProps> = ({
  prizePoolSats,
  pendingDistributions = 0,
  onSend,
  onReceive,
  onDistribute,
}) => {
  const formatSats = (sats: number): string => {
    return new Intl.NumberFormat().format(sats);
  };

  return (
    <View style={styles.walletSection}>
      {/* Wallet Info - Left Side */}
      <View style={styles.walletInfo}>
        <Text style={styles.walletLabel}>Team Prize Pool</Text>
        <Text style={styles.walletBalance}>
          {formatSats(prizePoolSats)} sats
        </Text>
      </View>

      {/* Wallet Actions - Right Side */}
      <View style={styles.walletActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onSend}
          activeOpacity={0.7}
        >
          <Text style={styles.actionButtonText}>Send</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onReceive}
          activeOpacity={0.7}
        >
          <Text style={styles.actionButtonText}>Receive</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.notificationButton]}
          onPress={onDistribute}
          activeOpacity={0.7}
        >
          <Text style={styles.actionButtonText}>Distribute</Text>
          {pendingDistributions > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {pendingDistributions > 9
                  ? '9+'
                  : pendingDistributions.toString()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Wallet section container - exact CSS: background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center;
  walletSection: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.xxl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Wallet info container - exact CSS: display: flex; flex-direction: column;
  walletInfo: {
    flexDirection: 'column',
  },

  // Wallet label - exact CSS: font-size: 11px; color: #666; margin-bottom: 2px;
  walletLabel: {
    fontSize: theme.typography.aboutTitle,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },

  // Wallet balance - exact CSS: font-size: 18px; font-weight: 700;
  walletBalance: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },

  // Wallet actions container - exact CSS: display: flex; gap: 8px;
  walletActions: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },

  // Action button secondary - exact CSS: background: transparent; color: #fff; border: 1px solid #333; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600;
  actionButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.buttonBorder,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Action button text
  actionButtonText: {
    color: theme.colors.text,
    fontSize: theme.typography.aboutTitle,
    fontWeight: theme.typography.weights.semiBold,
  },

  // Notification button - has relative positioning for badge
  notificationButton: {
    position: 'relative',
  },

  // Notification badge - exact CSS: position: absolute; top: -4px; right: -4px; background: #fff; color: #000; font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 8px; min-width: 16px; text-align: center;
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.text,
    minWidth: 16,
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Notification badge text
  notificationBadgeText: {
    color: theme.colors.accentText,
    fontSize: 9,
    fontWeight: theme.typography.weights.bold,
  },
});
