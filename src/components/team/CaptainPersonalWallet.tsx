/**
 * CaptainPersonalWallet - Captain's Personal NutZap Wallet Component
 * Replaces team wallet system with personal wallet for captain rewards
 * Uses NIP-60/61 NutZap implementation for P2P payments
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
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../styles/theme';
import { useNutzap } from '../../hooks/useNutzap';
import { WalletBalanceCard } from '../wallet/WalletBalanceCard';
import {
  WalletActivityList,
  WalletActivity,
} from '../wallet/WalletActivityList';
import { NutzapTransaction } from '../../types/nutzap';

interface CaptainPersonalWalletProps {
  teamId: string;
  captainPubkey: string;
  teamMembers: Array<{ pubkey: string; name: string }>;
  onRewardMember: (memberPubkey: string, amount: number, memo: string) => void;
}

type ModalType = 'reward' | 'deposit' | 'withdraw' | 'history' | null;

export const CaptainPersonalWallet: React.FC<CaptainPersonalWalletProps> = ({
  teamId,
  captainPubkey,
  teamMembers,
  onRewardMember,
}) => {
  const {
    isInitialized,
    isLoading,
    balance,
    userPubkey,
    error,
    sendNutzap,
    claimNutzaps,
    refreshBalance,
  } = useNutzap(true); // Auto-initialize

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedMember, setSelectedMember] = useState<{ pubkey: string; name: string } | null>(null);
  const [rewardAmount, setRewardAmount] = useState('');
  const [rewardMemo, setRewardMemo] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [transactions, setTransactions] = useState<NutzapTransaction[]>([]);

  // Auto-claim nutzaps and refresh balance
  useEffect(() => {
    if (isInitialized) {
      const interval = setInterval(async () => {
        await claimNutzaps();
        await refreshBalance();
      }, 30000); // Every 30 seconds

      return () => clearInterval(interval);
    }
  }, [isInitialized, claimNutzaps, refreshBalance]);

  // Convert balance to display format
  const getDisplayBalance = () => {
    // Simple USD conversion (in production, use real exchange rate)
    const btcToUsdRate = 40000;
    const satsPerBtc = 100000000;
    const usdValue = (balance / satsPerBtc) * btcToUsdRate;

    return {
      sats: balance,
      usd: usdValue,
      connected: isInitialized && !error,
      connectionError: error || undefined,
    };
  };

  // Convert transactions to wallet activity format
  const getWalletActivities = (): WalletActivity[] => {
    return transactions.slice(0, 5).map((tx: NutzapTransaction) => ({
      id: tx.id,
      type: tx.type === 'sent' ? 'send' : 'receive',
      title: tx.type === 'sent' ? `Reward to team member` : 'Received NutZap',
      description: tx.memo || 'Team reward',
      amount: tx.amount,
      timestamp: formatTransactionTime(tx.timestamp),
    }));
  };

  const formatTransactionTime = (timestamp: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return timestamp.toLocaleDateString();
  };

  // Handle reward member modal
  const openRewardModal = (member: { pubkey: string; name: string }) => {
    setSelectedMember(member);
    setRewardAmount('');
    setRewardMemo('');
    setActiveModal('reward');
  };

  // Send reward to team member
  const handleSendReward = async () => {
    if (!selectedMember || !rewardAmount) return;

    const amount = parseInt(rewardAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount in sats.');
      return;
    }

    if (amount > balance) {
      Alert.alert('Insufficient Balance', `You only have ${balance} sats available.`);
      return;
    }

    setIsSending(true);
    try {
      const memo = rewardMemo || `Team reward from ${teamId}`;
      const success = await sendNutzap(selectedMember.pubkey, amount, memo);

      if (success) {
        Alert.alert(
          'Reward Sent!',
          `Successfully sent ${amount} sats to ${selectedMember.name}`,
          [{ text: 'OK' }]
        );

        // Track the transaction locally
        const newTx: NutzapTransaction = {
          id: Date.now().toString(),
          type: 'sent',
          amount,
          pubkey: selectedMember.pubkey,
          memo,
          timestamp: new Date(),
          status: 'completed',
        };
        setTransactions(prev => [newTx, ...prev]);

        // Notify parent component
        onRewardMember(selectedMember.pubkey, amount, memo);

        setActiveModal(null);
        await refreshBalance();
      } else {
        Alert.alert('Send Failed', 'Failed to send reward. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while sending the reward.');
    } finally {
      setIsSending(false);
    }
  };

  // Handle Lightning deposit (future implementation)
  const handleDeposit = () => {
    Alert.alert(
      'Lightning Deposit',
      'Lightning deposits will be available in the next update. For now, receive NutZaps from other users.',
      [{ text: 'OK' }]
    );
  };

  // Handle Lightning withdraw (future implementation)
  const handleWithdraw = () => {
    Alert.alert(
      'Lightning Withdrawal',
      'Lightning withdrawals will be available in the next update. For now, send NutZaps to other users.',
      [{ text: 'OK' }]
    );
  };

  // Show loading state while initializing
  if (!isInitialized || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={styles.loadingText}>Initializing wallet...</Text>
      </View>
    );
  }

  const displayBalance = getDisplayBalance();
  const walletActivities = getWalletActivities();

  return (
    <View style={styles.container}>
      {/* Personal Wallet Balance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Captain's Personal Wallet</Text>
        <WalletBalanceCard
          balance={displayBalance}
          onSend={() => setActiveModal('reward')}
          onReceive={() => handleDeposit()}
          onWithdraw={() => handleWithdraw()}
        />
      </View>

      {/* Quick Reward Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reward Team Members</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.membersList}>
            {teamMembers.map((member) => (
              <TouchableOpacity
                key={member.pubkey}
                style={styles.memberCard}
                onPress={() => openRewardModal(member)}
              >
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.rewardButtonText}>Send Reward</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Recent Activity */}
      {walletActivities.length > 0 && (
        <View style={styles.section}>
          <WalletActivityList
            activities={walletActivities}
            onViewAll={() => setActiveModal('history')}
          />
        </View>
      )}

      {/* Reward Member Modal */}
      <Modal
        visible={activeModal === 'reward' && selectedMember !== null}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalScroll}>
            <Text style={styles.modalTitle}>Send Reward</Text>
            <Text style={styles.modalSubtitle}>
              To: {selectedMember?.name}
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Amount (sats)</Text>
              <TextInput
                style={styles.input}
                value={rewardAmount}
                onChangeText={setRewardAmount}
                keyboardType="numeric"
                placeholder="Enter amount in sats"
                placeholderTextColor={theme.colors.textMuted}
              />
              <Text style={styles.balanceHint}>
                Available: {balance.toLocaleString()} sats
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Memo (optional)</Text>
              <TextInput
                style={[styles.input, styles.memoInput]}
                value={rewardMemo}
                onChangeText={setRewardMemo}
                placeholder="Great job on the 5K!"
                placeholderTextColor={theme.colors.textMuted}
                multiline
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.primaryButton]}
                onPress={handleSendReward}
                disabled={isSending || !rewardAmount}
              >
                {isSending ? (
                  <ActivityIndicator color={theme.colors.accentText} />
                ) : (
                  <Text style={styles.primaryButtonText}>Send Reward</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setActiveModal(null)}
                disabled={isSending}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

// Import TextInput
import { TextInput } from 'react-native';

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },

  section: {
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 12,
  },

  // Loading state
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textMuted,
  },

  // Members list
  membersList: {
    flexDirection: 'row',
    gap: 12,
  },

  memberCard: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    padding: 16,
    minWidth: 120,
    alignItems: 'center',
  },

  memberName: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 8,
  },

  rewardButtonText: {
    fontSize: 12,
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.semiBold,
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

  inputContainer: {
    marginBottom: 24,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 8,
  },

  input: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
  },

  memoInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  balanceHint: {
    marginTop: 8,
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  modalActions: {
    gap: 12,
    marginTop: 24,
  },

  modalButton: {
    padding: 16,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
  },

  primaryButton: {
    backgroundColor: theme.colors.accent,
  },

  primaryButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accentText,
  },

  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  cancelButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
});