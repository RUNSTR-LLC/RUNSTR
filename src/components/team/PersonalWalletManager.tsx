/**
 * PersonalWalletManager - Captain's Personal NutZap Wallet Management
 * Replaces team wallet with captain's personal wallet for all rewards
 * Simplified P2P Bitcoin distribution without team wallet complexity
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { theme } from '../../styles/theme';
import { useNutzap } from '../../hooks/useNutzap';
import rewardService from '../../services/nutzap/rewardService';
// TeamMember type definition
interface TeamMember {
  id: string;
  name: string;
  npub?: string;
}

interface PersonalWalletManagerProps {
  teamId: string;
  teamMembers: TeamMember[];
  onRewardSent?: () => void;
}

export const PersonalWalletManager: React.FC<PersonalWalletManagerProps> = ({
  teamId,
  teamMembers,
  onRewardSent,
}) => {
  const { balance, isLoading, error, sendNutzap, refreshBalance } = useNutzap();
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [rewardAmount, setRewardAmount] = useState('');
  const [rewardReason, setRewardReason] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);

  // Quick reward amounts
  const quickAmounts = [100, 500, 1000, 2500, 5000];

  const handleSendReward = useCallback(async () => {
    if (!selectedMember || !rewardAmount) {
      Alert.alert('Error', 'Please select a member and enter an amount');
      return;
    }

    const amount = parseInt(rewardAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (amount > balance) {
      Alert.alert('Insufficient Balance', `You only have ${balance} sats available`);
      return;
    }

    setIsSending(true);
    try {
      const result = await rewardService.sendReward(
        teamId,
        selectedMember.npub || selectedMember.id,
        amount,
        rewardReason || 'Team reward',
        `Reward from team captain: ${rewardReason}`
      );

      if (result.success) {
        Alert.alert(
          'Success!',
          `Sent ${amount} sats to ${selectedMember.name}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setShowRewardModal(false);
                setSelectedMember(null);
                setRewardAmount('');
                setRewardReason('');
                refreshBalance();
                onRewardSent?.();
              },
            },
          ]
        );
      } else {
        Alert.alert('Failed', result.error || 'Failed to send reward');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to send reward. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [selectedMember, rewardAmount, rewardReason, balance, teamId, refreshBalance, onRewardSent]);

  const handleQuickAmount = (amount: number) => {
    setRewardAmount(amount.toString());
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Wallet Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Your Wallet Balance</Text>
        <Text style={styles.balanceAmount}>{balance.toLocaleString()} sats</Text>
        <Text style={styles.balanceSubtext}>Personal NutZap Wallet</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowRewardModal(true)}
        >
          <Text style={styles.actionButtonText}>Send Reward</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={refreshBalance}
        >
          <Text style={styles.secondaryButtonText}>Refresh Balance</Text>
        </TouchableOpacity>
      </View>

      {/* Team Members List */}
      <View style={styles.membersSection}>
        <Text style={styles.sectionTitle}>Team Members</Text>
        <ScrollView style={styles.membersList}>
          {teamMembers.map((member) => (
            <TouchableOpacity
              key={member.id}
              style={styles.memberRow}
              onPress={() => {
                setSelectedMember(member);
                setShowRewardModal(true);
              }}
            >
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberPubkey}>
                  {member.npub?.slice(0, 16)}...
                </Text>
              </View>
              <TouchableOpacity
                style={styles.rewardButton}
                onPress={() => {
                  setSelectedMember(member);
                  setShowRewardModal(true);
                }}
              >
                <Text style={styles.rewardButtonText}>Reward</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Reward Modal */}
      {showRewardModal && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Send Reward</Text>

            {selectedMember && (
              <View style={styles.recipientInfo}>
                <Text style={styles.recipientLabel}>To:</Text>
                <Text style={styles.recipientName}>{selectedMember.name}</Text>
              </View>
            )}

            {/* Quick Amount Buttons */}
            <View style={styles.quickAmounts}>
              {quickAmounts.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={styles.quickAmountButton}
                  onPress={() => handleQuickAmount(amount)}
                >
                  <Text style={styles.quickAmountText}>{amount}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Amount (sats)</Text>
              <input
                style={styles.input}
                type="number"
                value={rewardAmount}
                onChange={(e) => setRewardAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </View>

            {/* Reason Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Reason (optional)</Text>
              <input
                style={styles.input}
                value={rewardReason}
                onChange={(e) => setRewardReason(e.target.value)}
                placeholder="e.g., Challenge winner"
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowRewardModal(false);
                  setSelectedMember(null);
                  setRewardAmount('');
                  setRewardReason('');
                }}
                disabled={isSending}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.sendButton]}
                onPress={handleSendReward}
                disabled={isSending || !rewardAmount}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.sendButtonText}>Send Reward</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: theme.colors.background,
  },
  balanceCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  balanceLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  balanceSubtext: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  membersSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  membersList: {
    flex: 1,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.cardBackground,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  memberPubkey: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  rewardButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  rewardButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  recipientInfo: {
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  recipientLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  quickAmountButton: {
    backgroundColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  quickAmountText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: theme.colors.error + '20',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
  },
});