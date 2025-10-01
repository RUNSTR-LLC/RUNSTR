/**
 * WalletScreen - User's personal Bitcoin wallet interface
 * Displays balance, earnings, activity, and send/receive functionality
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { theme } from '../styles/theme';
import { WalletBalanceCard } from '../components/wallet/WalletBalanceCard';
import { AutoWithdrawSection } from '../components/wallet/AutoWithdrawSection';
import { EarningsSummary } from '../components/wallet/EarningsSummary';
import { WalletActivityList } from '../components/wallet/WalletActivityList';
import { SendBitcoinForm } from '../components/wallet/SendBitcoinForm';
import { ReceiveBitcoinForm } from '../components/wallet/ReceiveBitcoinForm';
import { WalletConnectionError } from '../components/wallet/WalletConnectionError';

export type WalletScreenMode = 'overview' | 'send' | 'receive';

export interface WalletData {
  balance: {
    sats: number;
    usd: number;
    connected: boolean;
    connectionError?: string;
  };
  autoWithdraw: {
    enabled: boolean;
    threshold: number;
    lightningAddress?: string;
  };
  earnings: {
    thisWeek: {
      sats: number;
      change: number;
      changeType: 'positive' | 'negative';
    };
    thisMonth: {
      sats: number;
      change: number;
      changeType: 'positive' | 'negative';
    };
  };
  recentActivity: {
    id: string;
    type: 'earn' | 'send' | 'receive';
    title: string;
    description: string;
    amount: number;
    timestamp: string;
  }[];
}

interface WalletScreenProps {
  data: WalletData;
  onBack: () => void;
  onSettings: () => void;
  onViewAllActivity: () => void;
  onSendComplete: (amount: number, destination: string) => void;
  onReceiveComplete: (invoice: string) => void;
  onAutoWithdrawChange: (enabled: boolean, threshold?: number) => void;
  onWithdraw: () => void;
  onRetryConnection?: () => void;
}

export const WalletScreen: React.FC<WalletScreenProps> = ({
  data,
  onBack,
  onSettings,
  onViewAllActivity,
  onSendComplete,
  onReceiveComplete,
  onAutoWithdrawChange,
  onWithdraw,
  onRetryConnection,
}) => {
  const [mode, setMode] = useState<WalletScreenMode>('overview');

  const handleSend = () => {
    if (!data.balance.connected) {
      Alert.alert('Connection Error', 'Unable to send while offline');
      return;
    }
    setMode('send');
  };

  const handleReceive = () => {
    if (!data.balance.connected) {
      Alert.alert('Connection Error', 'Unable to receive while offline');
      return;
    }
    setMode('receive');
  };

  const handleSendSubmit = (
    amount: number,
    destination: string,
    message?: string
  ) => {
    // Validate and process send
    onSendComplete(amount, destination);
    setMode('overview');
  };

  const handleReceiveSubmit = (amount?: number, description?: string) => {
    // Generate invoice and return
    const mockInvoice = 'lnbc' + Math.random().toString(36).substring(7);
    onReceiveComplete(mockInvoice);
    setMode('overview');
  };

  const renderContent = () => {
    if (!data.balance.connected && mode === 'overview') {
      return (
        <WalletConnectionError
          error={data.balance.connectionError || 'Connection lost'}
          onRetry={onRetryConnection}
        />
      );
    }

    switch (mode) {
      case 'send':
        return (
          <SendBitcoinForm
            maxBalance={data.balance.sats}
            onSubmit={handleSendSubmit}
            onCancel={() => setMode('overview')}
          />
        );

      case 'receive':
        return (
          <ReceiveBitcoinForm
            onSubmit={handleReceiveSubmit}
            onCancel={() => setMode('overview')}
          />
        );

      default:
        return (
          <ScrollView
            style={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            <WalletBalanceCard
              balance={data.balance}
              onSend={handleSend}
              onReceive={handleReceive}
              onWithdraw={onWithdraw}
            />

            <AutoWithdrawSection
              config={data.autoWithdraw}
              onChange={onAutoWithdrawChange}
            />

            <EarningsSummary earnings={data.earnings} />

            <WalletActivityList
              activities={data.recentActivity}
              onViewAll={onViewAllActivity}
            />
          </ScrollView>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerSpacer} />
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>{renderContent()}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 4,
  },
  backText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  headerSpacer: {
    flex: 1,
  },
  settingsButton: {
    padding: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
  },
  settingsText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  settingsDisabled: {
    opacity: 0,
  },
  content: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
});
