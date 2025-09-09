/**
 * WalletActivityList - Recent wallet transaction and earning history
 * Shows earnings from competitions, sends, and receives with timestamps
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { theme } from '../../styles/theme';

export interface WalletActivity {
  id: string;
  type: 'earn' | 'send' | 'receive';
  title: string;
  description: string;
  amount: number;
  timestamp: string;
}

interface WalletActivityListProps {
  activities: WalletActivity[];
  onViewAll: () => void;
}

export const WalletActivityList: React.FC<WalletActivityListProps> = ({
  activities,
  onViewAll,
}) => {
  const getActivityIcon = (type: WalletActivity['type']) => {
    switch (type) {
      case 'earn':
        return '+';
      case 'send':
        return '→';
      case 'receive':
        return '←';
    }
  };

  const getActivityIconStyle = (type: WalletActivity['type']) => {
    switch (type) {
      case 'earn':
        return [styles.activityIcon, styles.earnIcon];
      case 'send':
        return [styles.activityIcon, styles.sendIcon];
      case 'receive':
        return [styles.activityIcon, styles.receiveIcon];
    }
  };

  const formatAmount = (amount: number, type: WalletActivity['type']) => {
    const prefix = type === 'earn' || type === 'receive' ? '+' : '-';
    const absAmount = Math.abs(amount);
    return `${prefix}${absAmount.toLocaleString()} sats`;
  };

  const getAmountStyle = (type: WalletActivity['type']) => {
    return [
      styles.amountSats,
      type === 'earn' || type === 'receive'
        ? styles.amountPositive
        : styles.amountNegative,
    ];
  };

  const renderActivity = ({ item }: { item: WalletActivity }) => (
    <View style={styles.activityItem}>
      <View style={getActivityIconStyle(item.type)}>
        <Text style={styles.activityIconText}>
          {getActivityIcon(item.type)}
        </Text>
      </View>

      <View style={styles.activityInfo}>
        <Text style={styles.activityTitle}>{item.title}</Text>
        <Text style={styles.activityDescription}>{item.description}</Text>
      </View>

      <View style={styles.activityAmount}>
        <Text style={getAmountStyle(item.type)}>
          {formatAmount(item.amount, item.type)}
        </Text>
        <Text style={styles.amountTime}>{item.timestamp}</Text>
      </View>
    </View>
  );

  const renderSeparator = () => <View style={styles.separator} />;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.activityHeader}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {/* Activity List */}
      <View style={styles.activityList}>
        <FlatList
          data={activities}
          renderItem={renderActivity}
          ItemSeparatorComponent={renderSeparator}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  viewAllButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewAllText: {
    fontSize: 11,
    color: theme.colors.text,
    fontWeight: '500',
  },
  activityList: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: 16,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  earnIcon: {
    backgroundColor: theme.colors.text,
  },
  sendIcon: {
    backgroundColor: '#1a1a1a',
  },
  receiveIcon: {
    backgroundColor: theme.colors.border,
  },
  activityIconText: {
    fontSize: 16,
    fontWeight: '600',
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 12,
    color: '#666',
  },
  activityAmount: {
    alignItems: 'flex-end',
    gap: 2,
  },
  amountSats: {
    fontSize: 14,
    fontWeight: '600',
  },
  amountPositive: {
    color: theme.colors.text,
  },
  amountNegative: {
    color: '#666',
  },
  amountTime: {
    fontSize: 10,
    color: '#666',
  },
});
