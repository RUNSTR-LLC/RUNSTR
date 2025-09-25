/**
 * CompactWallet - Streamlined wallet display for Profile screen
 * 50% smaller than original, centered balance, no USD display
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { theme } from '../../styles/theme';
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
  const {
    isInitialized,
    isLoading,
    balance,
    error,
    claimNutzaps,
    refreshBalance,
  } = useNutzap(true);

  const [lastClaimTime, setLastClaimTime] = useState<Date | null>(null);

  // Auto-claim on mount and periodically
  useEffect(() => {
    if (isInitialized) {
      handleClaim();
      const interval = setInterval(() => {
        handleClaim();
      }, 60000); // Every minute
      return () => clearInterval(interval);
    }
  }, [isInitialized]);

  const handleClaim = async () => {
    const result = await claimNutzaps();
    if (result.claimed > 0) {
      setLastClaimTime(new Date());
      Alert.alert(
        'Payment Received!',
        `Received ${result.claimed} sats`,
        [{ text: 'OK' }]
      );
    }
  };

  const formatBalance = (sats: number): string => {
    if (sats >= 1000000) {
      return `${(sats / 1000000).toFixed(2)}M`;
    } else if (sats >= 1000) {
      return `${(sats / 1000).toFixed(1)}K`;
    }
    return sats.toString();
  };

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <View style={styles.walletBox}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.walletBox}>
        {/* Menu button in top right */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={onHistoryPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.menuIcon}>
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </View>
        </TouchableOpacity>

        {/* Centered balance */}
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceAmount}>
            {formatBalance(balance)}
          </Text>
          <Text style={styles.balanceUnit}>sats</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  walletBox: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.large,
    padding: 12,
    height: 100, // 50% smaller than original
    position: 'relative',
  },

  // Menu button (3 horizontal lines)
  menuButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },

  menuIcon: {
    width: 20,
    height: 16,
    justifyContent: 'space-between',
  },

  menuLine: {
    height: 2,
    width: 20,
    backgroundColor: theme.colors.textMuted,
    borderRadius: 1,
  },

  // Centered balance
  balanceContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: -8, // Adjust for visual centering
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