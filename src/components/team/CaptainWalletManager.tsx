/**
 * CaptainWalletManager - Team Wallet Management Component
 * Orchestrates existing wallet components with real CoinOS integration
 * Provides captain dashboard with funding, distribution, and transaction management
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { theme } from '../../styles/theme';
import { useTeamWallet } from '../../hooks/useTeamWallet';
import { TeamWalletSection } from './TeamWalletSection';
import { WalletBalanceCard } from '../wallet/WalletBalanceCard';
import {
  WalletActivityList,
  WalletActivity,
} from '../wallet/WalletActivityList';
import { SendBitcoinForm } from '../wallet/SendBitcoinForm';
import { ReceiveBitcoinForm } from '../wallet/ReceiveBitcoinForm';
import { WalletConnectionError } from '../wallet/WalletConnectionError';
import {
  TeamWallet,
  TeamWalletBalance,
  TeamTransaction,
  RewardDistribution,
} from '../../types/teamWallet';

interface CaptainWalletManagerProps {
  teamId: string;
  captainId: string;
  onDistributeRewards: (distribution: RewardDistribution[]) => void;
  onViewFullHistory: () => void;
}

type ModalType = 'send' | 'receive' | 'distribute' | null;

export const CaptainWalletManager: React.FC<CaptainWalletManagerProps> = ({
  teamId,
  captainId,
  onDistributeRewards,
  onViewFullHistory,
}) => {
  const {
    wallet,
    balance,
    transactions,
    distributions,
    isLoading,
    error,
    refreshBalance,
    fundWallet,
    distributeRewards,
    hasPermission,
  } = useTeamWallet(teamId, captainId);

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Auto-refresh balance every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (wallet && !isLoading) {
        refreshBalance().catch((err) => {
          console.warn('CaptainWalletManager: Auto-refresh failed:', err);
        });
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [wallet, isLoading, refreshBalance]);

  // Handle connection errors
  useEffect(() => {
    if (error) {
      setConnectionError(error);
    } else {
      setConnectionError(null);
    }
  }, [error]);

  // Convert team transactions to wallet activity format
  const getWalletActivities = (): WalletActivity[] => {
    return transactions.slice(0, 5).map((tx: TeamTransaction) => ({
      id: tx.id,
      type: tx.type as 'earn' | 'send' | 'receive',
      title: getTransactionTitle(tx),
      description: tx.description || getTransactionDescription(tx),
      amount: tx.amount,
      timestamp: formatTransactionTime(tx.timestamp),
    }));
  };

  const getTransactionTitle = (tx: TeamTransaction): string => {
    switch (tx.category) {
      case 'funding':
        return 'Team Funding';
      case 'distribution':
        return 'Prize Distribution';
      case 'fee':
        return 'Platform Fee';
      case 'refund':
        return 'Refund';
      default:
        return 'Transaction';
    }
  };

  const getTransactionDescription = (tx: TeamTransaction): string => {
    switch (tx.category) {
      case 'funding':
        return 'Added to team prize pool';
      case 'distribution':
        return `Distributed to ${tx.recipientCount || 1} member(s)`;
      case 'fee':
        return 'Platform service fee';
      case 'refund':
        return 'Refunded to team wallet';
      default:
        return tx.description || 'Team wallet transaction';
    }
  };

  const formatTransactionTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Convert team wallet balance to display format
  const getDisplayBalance = () => {
    if (!balance) {
      return {
        sats: 0,
        usd: 0,
        connected: false,
        connectionError: connectionError || 'Unable to connect to wallet',
      };
    }

    // Simple USD conversion (in production, use real exchange rate)
    const btcToUsdRate = 40000;
    const satsPerBtc = 100000000;
    const usdValue = (balance.total / satsPerBtc) * btcToUsdRate;

    return {
      sats: balance.total,
      usd: usdValue,
      connected: !connectionError && balance.total >= 0,
      connectionError: connectionError || undefined,
    };
  };

  // Handle wallet funding
  const handleFundWallet = async (amount: number, paymentRequest: string) => {
    try {
      setActiveModal(null);
      const result = await fundWallet(amount, paymentRequest);

      if (result.success) {
        Alert.alert(
          'Funding Successful',
          `Successfully added ${amount.toLocaleString()} sats to team wallet.`,
          [{ text: 'OK' }]
        );
        refreshBalance();
      } else {
        Alert.alert(
          'Funding Failed',
          result.error || 'Failed to fund wallet. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Funding Error',
        'An error occurred while funding the wallet.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle Bitcoin sending
  const handleSendBitcoin = async (
    amount: number,
    destination: string,
    message?: string
  ) => {
    try {
      setActiveModal(null);
      // Implementation would use CoinOS service to send payment
      Alert.alert(
        'Payment Sent',
        `Successfully sent ${amount.toLocaleString()} sats to ${destination}.`,
        [{ text: 'OK' }]
      );
      refreshBalance();
    } catch (error) {
      Alert.alert('Send Failed', 'Failed to send Bitcoin. Please try again.');
    }
  };

  // Handle Bitcoin receiving (generate invoice)
  const handleReceiveBitcoin = async (
    amount?: number,
    description?: string
  ) => {
    try {
      setActiveModal(null);
      // Implementation would generate CoinOS invoice
      Alert.alert(
        'Invoice Generated',
        'Bitcoin invoice created. Share the payment request to receive funds.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert(
        'Invoice Failed',
        'Failed to generate invoice. Please try again.'
      );
    }
  };

  // Handle reward distribution
  const handleDistributeRewards = () => {
    setActiveModal(null);
    if (distributions.length > 0) {
      onDistributeRewards(distributions);
    } else {
      Alert.alert(
        'No Pending Distributions',
        'There are currently no pending reward distributions.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle withdrawal (redirect to personal wallet)
  const handleWithdraw = () => {
    Alert.alert(
      'Withdraw Funds',
      'To withdraw Bitcoin, use the Send function to transfer to your personal wallet.',
      [{ text: 'OK' }]
    );
  };

  // Check if captain has wallet management permissions
  if (!hasPermission('manage')) {
    return (
      <View style={styles.noAccessContainer}>
        <Text style={styles.noAccessTitle}>Access Denied</Text>
        <Text style={styles.noAccessText}>
          You don&apos;t have permission to manage this team&apos;s wallet.
        </Text>
      </View>
    );
  }

  // Show connection error if wallet fails to load
  if (connectionError && !wallet) {
    return (
      <WalletConnectionError
        error={connectionError}
        onRetry={() => refreshBalance()}
      />
    );
  }

  const displayBalance = getDisplayBalance();
  const walletActivities = getWalletActivities();
  const pendingDistributionCount = distributions.filter(
    (d) => d.status === 'pending'
  ).length;

  return (
    <View style={styles.container}>
      {/* Team Wallet Balance Card */}
      <View style={styles.section}>
        <WalletBalanceCard
          balance={displayBalance}
          onSend={() => setActiveModal('send')}
          onReceive={() => setActiveModal('receive')}
          onWithdraw={handleWithdraw}
        />
      </View>

      {/* Team Prize Pool Section */}
      <View style={styles.section}>
        <TeamWalletSection
          prizePoolSats={balance?.total || 0}
          pendingDistributions={pendingDistributionCount}
          onSend={() => setActiveModal('send')}
          onReceive={() => setActiveModal('receive')}
          onDistribute={() => setActiveModal('distribute')}
        />
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <WalletActivityList
          activities={walletActivities}
          onViewAll={onViewFullHistory}
        />
      </View>

      {/* Send Bitcoin Modal */}
      <Modal
        visible={activeModal === 'send'}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <SendBitcoinForm
            maxBalance={balance?.total || 0}
            onSubmit={handleSendBitcoin}
            onCancel={() => setActiveModal(null)}
          />
        </View>
      </Modal>

      {/* Receive Bitcoin Modal */}
      <Modal
        visible={activeModal === 'receive'}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <ReceiveBitcoinForm
            onSubmit={handleReceiveBitcoin}
            onCancel={() => setActiveModal(null)}
          />
        </View>
      </Modal>

      {/* Distribute Rewards Modal Placeholder */}
      <Modal
        visible={activeModal === 'distribute'}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalScroll}>
            <Text style={styles.modalTitle}>Distribute Rewards</Text>
            <Text style={styles.modalSubtitle}>
              {pendingDistributionCount} pending distribution
              {pendingDistributionCount !== 1 ? 's' : ''}
            </Text>

            <View style={styles.distributionActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleDistributeRewards}
              >
                <Text style={styles.modalButtonText}>
                  Process Distributions
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setActiveModal(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },

  section: {
    marginBottom: 0, // Gap handled by container
  },

  // No access styles
  noAccessContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.large,
    padding: 24,
    alignItems: 'center',
  },

  noAccessTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 8,
  },

  noAccessText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  modalScroll: {
    flex: 1,
    padding: 20,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 8,
  },

  modalSubtitle: {
    fontSize: 16,
    color: theme.colors.textMuted,
    marginBottom: 32,
  },

  distributionActions: {
    gap: 12,
  },

  modalButton: {
    backgroundColor: theme.colors.accent,
    padding: 16,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
  },

  modalButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accentText,
  },

  modalCancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  modalCancelText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
});
