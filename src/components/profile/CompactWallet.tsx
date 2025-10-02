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
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const [displayBalance, setDisplayBalance] = useState<number>(0);

  // Load cached balance immediately on mount for instant display
  useEffect(() => {
    const loadCachedBalance = async () => {
      try {
        const cachedBalance = await AsyncStorage.getItem('@runstr:cached_wallet_balance');
        if (cachedBalance) {
          const parsedBalance = parseInt(cachedBalance, 10);
          setDisplayBalance(parsedBalance);
          console.log('[CompactWallet] Showing cached balance:', parsedBalance);
        }
      } catch (error) {
        console.error('[CompactWallet] Failed to load cached balance:', error);
      }
    };
    loadCachedBalance();
  }, []);

  // Update display balance when wallet balance changes
  useEffect(() => {
    if (isInitialized && balance >= 0) {
      setDisplayBalance(balance);
      // Cache the balance for next session
      AsyncStorage.setItem('@runstr:cached_wallet_balance', balance.toString()).catch(err =>
        console.error('[CompactWallet] Failed to cache balance:', err)
      );
    }
  }, [balance, isInitialized]);

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

  // Always show wallet UI with current balance (cached or synced)
  // No blocking loading spinner for better Android UX
  return (
    <View style={styles.walletBox}>
        {/* Centered balance with sync indicator */}
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceAmount}>
            {formatBalance(displayBalance)}
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