/**
 * CompactWallet - Streamlined wallet display for Profile screen
 * 50% smaller than original, centered balance, no USD display
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { theme } from '../../styles/theme';
import { useWalletStore } from '../../store/walletStore';
import { useNutzap } from '../../hooks/useNutzap';
import { Ionicons } from '@expo/vector-icons';

interface CompactWalletProps {
  onSendPress?: () => void;
  onReceivePress?: () => void;
  onHistoryPress?: () => void;
}

export const CompactWallet: React.FC<CompactWalletProps> = ({
  onSendPress,
  onReceivePress,
  onHistoryPress,
}) => {
  // Subscribe directly to wallet store for real-time balance updates
  const { balance, isInitialized, isInitializing } = useWalletStore();

  // Get claim function from hook (doesn't trigger initialization)
  const { claimNutzaps } = useNutzap(false);

  const [lastClaimTime, setLastClaimTime] = useState<Date | null>(null);
  const isLoading = isInitializing;

  // Auto-claim handler with optional silent mode
  const handleClaim = useCallback(async (silent: boolean = true) => {
    const result = await claimNutzaps();
    if (result.claimed > 0) {
      setLastClaimTime(new Date());
      // Only show alert if not silent (prevents interference with modals)
      if (!silent) {
        Alert.alert(
          'Payment Received!',
          `Received ${result.claimed} sats`,
          [{ text: 'OK' }]
        );
      } else {
        console.log('[CompactWallet] Auto-claimed', result.claimed, 'sats (silent mode)');
      }
    }
  }, [claimNutzaps]);

  // Auto-claim on mount and periodically (silent mode to avoid Alert/Modal conflicts)
  useEffect(() => {
    if (isInitialized) {
      handleClaim(true); // Silent auto-claim
      const interval = setInterval(() => {
        handleClaim(true); // Silent periodic claim
      }, 60000); // Every minute
      return () => clearInterval(interval);
    }
  }, [isInitialized, handleClaim]);

  const formatBalance = (sats: number): string => {
    if (sats >= 1000000) {
      return `${(sats / 1000000).toFixed(2)}M`;
    } else if (sats >= 1000) {
      return `${(sats / 1000).toFixed(1)}K`;
    }
    return sats.toString();
  };

  // Always show wallet UI with real-time balance from store
  // Balance updates instantly when transactions complete
  return (
    <View style={styles.walletBox}>
        {/* Centered balance with sync indicator */}
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceAmount}>
            {formatBalance(balance)}
          </Text>
          <Text style={styles.balanceUnit}>sats</Text>
          {isLoading && (
            <ActivityIndicator
              size="small"
              color={theme.colors.textMuted}
              style={styles.syncIndicator}
            />
          )}
        </View>

        {/* Compact action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onSendPress}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-up" size={16} color={theme.colors.text} />
            <Text style={styles.actionText}>Send</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={onReceivePress}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-down" size={16} color={theme.colors.text} />
            <Text style={styles.actionText}>Receive</Text>
          </TouchableOpacity>
        </View>
      </View>
  );
};

const styles = StyleSheet.create({
  walletBox: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    height: 90, // Compact height
    position: 'relative',
  },

  // Centered balance
  balanceContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: -20, // Move balance up to avoid overlap with buttons
  },

  balanceAmount: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },

  balanceUnit: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },

  syncIndicator: {
    marginLeft: 8,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 8,
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },

  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.small,
    paddingVertical: 6,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },

  actionText: {
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },
});