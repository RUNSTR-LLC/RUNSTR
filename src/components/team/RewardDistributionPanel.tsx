/**
 * RewardDistributionPanel Component - Lightning reward distribution for competition winners
 * Integrates with existing coinosService and follows wallet component patterns
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { theme } from '../../styles/theme';
import { MemberAvatar } from '../ui/MemberAvatar';
import type { LeaderboardEntry } from '../../services/competition/leaderboardService';
import type { Competition } from '../../services/competition/competitionService';

export interface RewardDistribution {
  pubkey: string;
  position: number;
  amount: number;
  lightningAddress?: string;
}

interface RewardDistributionPanelProps {
  competition: Competition;
  winners: LeaderboardEntry[];
  teamBalance: number;
  onDistribute: (distributions: RewardDistribution[]) => Promise<void>;
  onClose: () => void;
  style?: any;
}

const PRESET_DISTRIBUTIONS = [
  { name: '1st Place Takes All', amounts: [100] },
  { name: 'Top 3 Split', amounts: [50, 30, 20] },
  { name: 'Top 5 Split', amounts: [40, 25, 15, 10, 10] },
  { name: 'Equal Split', amounts: 'equal' as const },
];

export const RewardDistributionPanel: React.FC<
  RewardDistributionPanelProps
> = ({ competition, winners, teamBalance, onDistribute, onClose, style }) => {
  const [distributions, setDistributions] = useState<RewardDistribution[]>(
    winners.slice(0, 3).map((winner, index) => ({
      pubkey: winner.pubkey,
      position: winner.position,
      amount: 0,
      lightningAddress: `user${winner.pubkey.slice(0, 8)}@coinos.io`, // TODO: Get real address
    }))
  );
  const [totalAmount, setTotalAmount] = useState(0);
  const [isDistributing, setIsDistributing] = useState(false);

  const updateDistributionAmount = (pubkey: string, amount: number) => {
    setDistributions((prev) =>
      prev.map((dist) => (dist.pubkey === pubkey ? { ...dist, amount } : dist))
    );
  };

  const applyPresetDistribution = (
    preset: (typeof PRESET_DISTRIBUTIONS)[0]
  ) => {
    if (preset.amounts === 'equal') {
      const perWinner = Math.floor(totalAmount / distributions.length);
      setDistributions((prev) =>
        prev.map((dist) => ({ ...dist, amount: perWinner }))
      );
    } else {
      const amounts = preset.amounts as number[];
      setDistributions((prev) =>
        prev.map((dist, index) => ({
          ...dist,
          amount:
            index < amounts.length
              ? Math.floor((totalAmount * amounts[index]) / 100)
              : 0,
        }))
      );
    }
  };

  const getTotalDistribution = (): number => {
    return distributions.reduce((sum, dist) => sum + dist.amount, 0);
  };

  const validateDistribution = (): string | null => {
    const total = getTotalDistribution();

    if (totalAmount <= 0) {
      return 'Please set a total reward amount';
    }

    if (totalAmount > teamBalance) {
      return `Insufficient balance. Available: ${teamBalance} sats`;
    }

    if (total !== totalAmount) {
      return `Distribution total (${total}) doesn't match reward total (${totalAmount})`;
    }

    const hasZeroAmount = distributions.some((dist) => dist.amount <= 0);
    if (hasZeroAmount) {
      return 'All selected winners must have a reward amount > 0';
    }

    return null;
  };

  const handleDistribute = async () => {
    const validationError = validateDistribution();
    if (validationError) {
      Alert.alert('Invalid Distribution', validationError);
      return;
    }

    Alert.alert(
      'Confirm Distribution',
      `Distribute ${totalAmount} sats to ${distributions.length} winners?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Distribute',
          onPress: async () => {
            setIsDistributing(true);
            try {
              await onDistribute(distributions);
              Alert.alert('Success', 'Rewards distributed successfully!');
              onClose();
            } catch (error) {
              console.error('Distribution failed:', error);
              Alert.alert(
                'Error',
                'Failed to distribute rewards. Please try again.'
              );
            } finally {
              setIsDistributing(false);
            }
          },
        },
      ]
    );
  };

  const addWinner = (winner: LeaderboardEntry) => {
    const exists = distributions.some((dist) => dist.pubkey === winner.pubkey);
    if (!exists) {
      setDistributions((prev) => [
        ...prev,
        {
          pubkey: winner.pubkey,
          position: winner.position,
          amount: 0,
          lightningAddress: `user${winner.pubkey.slice(0, 8)}@coinos.io`,
        },
      ]);
    }
  };

  const removeWinner = (pubkey: string) => {
    setDistributions((prev) => prev.filter((dist) => dist.pubkey !== pubkey));
  };

  const availableWinners = winners.filter(
    (winner) => !distributions.some((dist) => dist.pubkey === winner.pubkey)
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Distribute Rewards</Text>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          disabled={isDistributing}
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Competition Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Competition: {competition.name}</Text>
          <Text style={styles.infoText}>
            Team Balance: {teamBalance.toLocaleString()} sats
          </Text>
          <Text style={styles.infoText}>
            Total Participants: {winners.length}
          </Text>
        </View>

        {/* Total Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Total Reward Amount</Text>
          <View style={styles.totalAmountInput}>
            <TextInput
              style={styles.amountInput}
              value={totalAmount.toString()}
              onChangeText={(text) => {
                const amount = parseInt(text) || 0;
                setTotalAmount(Math.max(0, amount));
              }}
              placeholder="0"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="numeric"
            />
            <Text style={styles.satLabel}>sats</Text>
          </View>
        </View>

        {/* Preset Distributions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Distribution</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {PRESET_DISTRIBUTIONS.map((preset) => (
              <TouchableOpacity
                key={preset.name}
                style={styles.presetBtn}
                onPress={() => applyPresetDistribution(preset)}
                disabled={totalAmount <= 0}
              >
                <Text style={styles.presetBtnText}>{preset.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Selected Winners */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Selected Winners ({distributions.length})
          </Text>

          {distributions.map((distribution) => {
            const winner = winners.find(
              (w) => w.pubkey === distribution.pubkey
            );
            return (
              <View key={distribution.pubkey} style={styles.winnerItem}>
                <View style={styles.winnerInfo}>
                  <Text style={styles.positionText}>
                    #{distribution.position}
                  </Text>
                  <MemberAvatar
                    name={winner?.pubkey.slice(0, 8) || ''}
                    size={32}
                  />
                  <View style={styles.winnerDetails}>
                    <Text style={styles.winnerName}>
                      User {distribution.pubkey.slice(0, 8)}
                    </Text>
                    <Text style={styles.winnerScore}>
                      Score: {winner?.score || 0}
                    </Text>
                  </View>
                </View>

                <View style={styles.winnerAmount}>
                  <TextInput
                    style={styles.winnerAmountInput}
                    value={distribution.amount.toString()}
                    onChangeText={(text) => {
                      const amount = parseInt(text) || 0;
                      updateDistributionAmount(distribution.pubkey, amount);
                    }}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeWinner(distribution.pubkey)}
                  >
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Add More Winners */}
        {availableWinners.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add More Winners</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {availableWinners.slice(0, 5).map((winner) => (
                <TouchableOpacity
                  key={winner.pubkey}
                  style={styles.availableWinner}
                  onPress={() => addWinner(winner)}
                >
                  <Text style={styles.availableWinnerPosition}>
                    #{winner.position}
                  </Text>
                  <MemberAvatar name={winner.pubkey.slice(0, 8)} size={24} />
                  <Text style={styles.availableWinnerName}>
                    User {winner.pubkey.slice(0, 8)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Distribution Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Distribution Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Rewards:</Text>
            <Text style={styles.summaryValue}>{totalAmount} sats</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Distributed:</Text>
            <Text
              style={[
                styles.summaryValue,
                getTotalDistribution() !== totalAmount &&
                  styles.summaryValueError,
              ]}
            >
              {getTotalDistribution()} sats
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Recipients:</Text>
            <Text style={styles.summaryValue}>{distributions.length}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={onClose}
          disabled={isDistributing}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.distributeBtn,
            (isDistributing || !!validateDistribution()) &&
              styles.distributeBtnDisabled,
          ]}
          onPress={handleDistribute}
          disabled={isDistributing || !!validateDistribution()}
        >
          <Text
            style={[
              styles.distributeBtnText,
              (isDistributing || !!validateDistribution()) &&
                styles.distributeBtnTextDisabled,
            ]}
          >
            {isDistributing ? 'Distributing...' : 'Distribute Rewards'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    maxHeight: 600,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  closeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: theme.colors.gray,
  },

  closeBtnText: {
    fontSize: 14,
    color: theme.colors.text,
  },

  // Content
  content: {
    flex: 1,
    padding: 16,
  },

  section: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 12,
  },

  // Info section
  infoSection: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 6,
  },

  infoText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },

  // Total amount
  totalAmountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
  },

  amountInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
  },

  satLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginLeft: 8,
  },

  // Preset buttons
  presetBtn: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },

  presetBtnText: {
    fontSize: 12,
    color: theme.colors.text,
  },

  // Winner items
  winnerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },

  winnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  positionText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
    width: 24,
  },

  winnerDetails: {
    marginLeft: 8,
    flex: 1,
  },

  winnerName: {
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  winnerScore: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },

  winnerAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  winnerAmountInput: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 14,
    color: theme.colors.text,
    width: 60,
    textAlign: 'right',
  },

  removeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },

  removeBtnText: {
    fontSize: 11,
    color: '#ff4444',
  },

  // Available winners
  availableWinner: {
    backgroundColor: theme.colors.background,
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
    marginRight: 8,
    minWidth: 60,
  },

  availableWinnerPosition: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
    marginBottom: 4,
  },

  availableWinnerName: {
    fontSize: 10,
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: 4,
  },

  // Summary
  summarySection: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
  },

  summaryTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 8,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  summaryLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  summaryValue: {
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  summaryValueError: {
    color: '#ff4444',
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.gray,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },

  cancelBtnText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  distributeBtn: {
    flex: 2,
    backgroundColor: theme.colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },

  distributeBtnDisabled: {
    backgroundColor: theme.colors.gray,
  },

  distributeBtnText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accentText,
  },

  distributeBtnTextDisabled: {
    color: theme.colors.textMuted,
  },
});
