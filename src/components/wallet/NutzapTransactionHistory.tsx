/**
 * NutzapTransactionHistory - Transaction history display for NutZap wallet
 * Shows sent and received NutZaps with details
 * Simple, clean interface for personal wallet tracking
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { NutzapTransaction } from '../../types/nutzap';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NutzapTransactionHistoryProps {
  userPubkey: string;
  onTransactionPress?: (transaction: NutzapTransaction) => void;
  maxItems?: number;
}

export const NutzapTransactionHistory: React.FC<NutzapTransactionHistoryProps> = ({
  userPubkey,
  onTransactionPress,
  maxItems,
}) => {
  const [transactions, setTransactions] = useState<NutzapTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, [userPubkey]);

  const loadTransactions = async () => {
    try {
      // Load transactions from local storage
      const storedTxs = await AsyncStorage.getItem(`@nutzap:transactions:${userPubkey}`);
      if (storedTxs) {
        const txs = JSON.parse(storedTxs) as NutzapTransaction[];
        // Sort by timestamp, newest first
        txs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setTransactions(maxItems ? txs.slice(0, maxItems) : txs);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadTransactions();
    setIsRefreshing(false);
  };

  const formatTime = (timestamp: Date): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getTransactionIcon = (type: 'sent' | 'received'): string => {
    return type === 'sent' ? 'arrow-up-circle' : 'arrow-down-circle';
  };

  const getTransactionColor = (type: 'sent' | 'received'): string => {
    return type === 'sent' ? theme.colors.textMuted : theme.colors.statusConnected;
  };

  const renderTransaction = ({ item }: { item: NutzapTransaction }) => (
    <TouchableOpacity
      style={styles.transactionItem}
      onPress={() => onTransactionPress?.(item)}
      activeOpacity={0.7}
    >
      <View style={styles.transactionIcon}>
        <Ionicons
          name={getTransactionIcon(item.type)}
          size={32}
          color={getTransactionColor(item.type)}
        />
      </View>

      <View style={styles.transactionDetails}>
        <Text style={styles.transactionTitle}>
          {item.type === 'sent' ? 'Sent' : 'Received'}
        </Text>
        <Text style={styles.transactionMemo} numberOfLines={1}>
          {item.memo || 'No memo'}
        </Text>
        <Text style={styles.transactionTime}>
          {formatTime(item.timestamp)}
        </Text>
      </View>

      <View style={styles.transactionAmount}>
        <Text
          style={[
            styles.amountText,
            { color: getTransactionColor(item.type) }
          ]}
        >
          {item.type === 'sent' ? '-' : '+'}{item.amount}
        </Text>
        <Text style={styles.amountUnit}>sats</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="wallet-outline"
        size={48}
        color={theme.colors.textMuted}
      />
      <Text style={styles.emptyTitle}>No Transactions Yet</Text>
      <Text style={styles.emptyText}>
        Send or receive NutZaps to see them here
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
        }
        contentContainerStyle={
          transactions.length === 0 ? styles.emptyList : undefined
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },

  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  transactionIcon: {
    marginRight: 12,
  },

  transactionDetails: {
    flex: 1,
  },

  transactionTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 2,
  },

  transactionMemo: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },

  transactionTime: {
    fontSize: 11,
    color: theme.colors.textDark,
  },

  transactionAmount: {
    alignItems: 'flex-end',
  },

  amountText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
  },

  amountUnit: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },

  emptyList: {
    flexGrow: 1,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});