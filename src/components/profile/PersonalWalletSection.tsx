/**
 * PersonalWalletSection - NutZap Personal Wallet Display
 * Shows user's personal ecash wallet balance and actions
 * Integrated into Profile screen for all users
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

interface PersonalWalletSectionProps {
  onSendPress?: () => void;
  onReceivePress?: () => void;
  onHistoryPress?: () => void;
}

export const PersonalWalletSection: React.FC<PersonalWalletSectionProps> = ({
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
  } = useNutzap(true); // Auto-initialize

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastClaimTime, setLastClaimTime] = useState<Date | null>(null);

  // Auto-claim on mount and periodically
  useEffect(() => {
    if (isInitialized) {
      // Initial claim
      handleClaim();

      // Set up periodic claiming
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
        'NutZaps Claimed!',
        `Received ${result.claimed} sats`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshBalance();
      await handleClaim();
    } finally {
      setIsRefreshing(false);
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

  const getUsdValue = (sats: number): string => {
    // Simple conversion (use real exchange rate in production)
    const btcToUsdRate = 40000;
    const satsPerBtc = 100000000;
    const usdValue = (sats / satsPerBtc) * btcToUsdRate;
    return usdValue.toFixed(2);
  };

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Setting up wallet...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Wallet Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="wallet" size={20} color={theme.colors.accent} />
          <Text style={styles.title}>E-Cash Wallet</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>NutZap</Text>
          </View>
        </View>
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceContent}>
          <View style={styles.balanceMain}>
            <Text style={styles.balanceLabel}>Balance</Text>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceAmount}>
                {formatBalance(balance)}
              </Text>
              <Text style={styles.balanceUnit}>sats</Text>
            </View>
            <Text style={styles.balanceUsd}>
              ≈ ${getUsdValue(balance)} USD
            </Text>
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={theme.colors.accent} />
            ) : (
              <Ionicons name="refresh" size={24} color={theme.colors.accent} />
            )}
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onSendPress}
          >
            <Ionicons name="arrow-up" size={20} color={theme.colors.text} />
            <Text style={styles.actionText}>Send</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={onReceivePress}
          >
            <Ionicons name="arrow-down" size={20} color={theme.colors.text} />
            <Text style={styles.actionText}>Receive</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={onHistoryPress}
          >
            <Ionicons name="time" size={20} color={theme.colors.text} />
            <Text style={styles.actionText}>History</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="flash" size={16} color={theme.colors.textMuted} />
          <Text style={styles.infoText}>
            Instant P2P Bitcoin payments via Nostr
          </Text>
        </View>
        {lastClaimTime && (
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.statusConnected} />
            <Text style={styles.infoText}>
              Last checked: {lastClaimTime.toLocaleTimeString()}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },

  // Loading state
  loadingCard: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.large,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  loadingText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },

  // Header
  header: {
    marginBottom: 16,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  title: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    flex: 1,
  },

  badge: {
    backgroundColor: theme.colors.accent + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.small,
  },

  badgeText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accent,
  },

  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: theme.colors.error,
  },

  // Balance Card
  balanceCard: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.large,
    padding: 20,
    marginBottom: 12,
  },

  balanceContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },

  balanceMain: {
    flex: 1,
  },

  balanceLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },

  balanceAmount: {
    fontSize: 32,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },

  balanceUnit: {
    fontSize: 16,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },

  balanceUsd: {
    marginTop: 4,
    fontSize: 14,
    color: theme.colors.textMuted,
  },

  refreshButton: {
    padding: 8,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 12,
  },

  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },

  actionText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  // Info Card
  infoCard: {
    backgroundColor: theme.colors.cardBackground + '60',
    borderRadius: theme.borderRadius.medium,
    padding: 12,
    gap: 8,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  infoText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    flex: 1,
  },
});