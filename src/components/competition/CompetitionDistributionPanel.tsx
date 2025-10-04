/**
 * CompetitionDistributionPanel - UI for distributing rewards to competition winners
 * Allows captains to distribute Bitcoin rewards from their personal wallet
 * Shows winner positions, calculates prize splits, and handles batch distribution
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { theme } from '../../styles/theme';
import { useNutzap } from '../../hooks/useNutzap';
import rewardService from '../../services/nutzap/rewardService';
import type { CompetitionParticipant } from '../../services/competition/competitionService';
import type { Competition } from '../../services/competition/competitionService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CompetitionDistributionPanelProps {
  competition: Competition;
  winners: CompetitionParticipant[];
  onDistributionComplete?: () => void;
  captainPubkey: string;
  style?: any;
}

interface DistributionPreset {
  id: string;
  name: string;
  description: string;
  calculate: (totalPrize: number, winnersCount: number) => number[];
}

const DISTRIBUTION_PRESETS: DistributionPreset[] = [
  {
    id: 'winner-takes-all',
    name: 'Winner Takes All',
    description: '100% to 1st place',
    calculate: (total) => [total],
  },
  {
    id: 'top-3',
    name: 'Top 3 Split',
    description: '60% / 30% / 10%',
    calculate: (total) => [
      Math.floor(total * 0.6),
      Math.floor(total * 0.3),
      Math.floor(total * 0.1),
    ],
  },
  {
    id: 'equal',
    name: 'Equal Split',
    description: 'Split equally among all',
    calculate: (total, count) => {
      const perPerson = Math.floor(total / count);
      return Array(count).fill(perPerson);
    },
  },
];

export const CompetitionDistributionPanel: React.FC<CompetitionDistributionPanelProps> = ({
  competition,
  winners,
  onDistributionComplete,
  captainPubkey,
  style,
}) => {
  const { balance, isLoading: walletLoading } = useNutzap();
  const [selectedPreset, setSelectedPreset] = useState<string>('top-3');
  const [isDistributing, setIsDistributing] = useState(false);
  const [hasDistributed, setHasDistributed] = useState(false);

  // Check if already distributed
  React.useEffect(() => {
    checkDistributionStatus();
  }, [competition.id]);

  const checkDistributionStatus = async () => {
    try {
      const key = `competition_distributed_${competition.id}`;
      const status = await AsyncStorage.getItem(key);
      setHasDistributed(status === 'true');
    } catch (error) {
      console.error('Error checking distribution status:', error);
    }
  };

  // Calculate total prize pool
  const totalPrize = useMemo(() => {
    // Use entry fees times participant count if available
    if (competition.entryFeesSats && winners.length > 0) {
      return competition.entryFeesSats * winners.length;
    }
    // Otherwise use a default or competition-specific prize
    return 10000; // Default 10k sats
  }, [competition, winners]);

  // Calculate individual rewards based on preset
  const rewardAmounts = useMemo(() => {
    const preset = DISTRIBUTION_PRESETS.find(p => p.id === selectedPreset);
    if (!preset) return [];

    const amounts = preset.calculate(totalPrize, Math.min(winners.length, 3));
    return amounts;
  }, [selectedPreset, totalPrize, winners.length]);

  // Handle distribution
  const handleDistribute = async () => {
    if (hasDistributed) {
      Alert.alert('Already Distributed', 'Rewards have already been distributed for this competition.');
      return;
    }

    if (balance < totalPrize) {
      Alert.alert(
        'Insufficient Balance',
        `You need ${totalPrize} sats but only have ${balance} sats available.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Funds', onPress: () => console.log('TODO: Open Lightning deposit') },
        ]
      );
      return;
    }

    Alert.alert(
      'Confirm Distribution',
      `Distribute ${totalPrize} sats to ${Math.min(winners.length, rewardAmounts.length)} winners?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Distribute',
          style: 'default',
          onPress: async () => {
            setIsDistributing(true);
            try {
              // Send rewards to each winner
              const results = [];
              for (let i = 0; i < Math.min(winners.length, rewardAmounts.length); i++) {
                const winner = winners[i];
                const amount = rewardAmounts[i];

                if (amount > 0) {
                  const result = await rewardService.sendReward(
                    competition.teamId,
                    winner.pubkey,
                    amount,
                    `Competition Prize: ${competition.name}`,
                    `🏆 Position ${i + 1} in ${competition.name}`
                  );

                  results.push({
                    recipient: winner.pubkey,
                    amount,
                    success: result.success,
                    error: result.error,
                  });
                }
              }

              // Check if all succeeded
              const allSuccess = results.every(r => r.success);
              const successCount = results.filter(r => r.success).length;

              if (allSuccess) {
                // Mark as distributed
                await AsyncStorage.setItem(
                  `competition_distributed_${competition.id}`,
                  'true'
                );
                setHasDistributed(true);

                Alert.alert(
                  'Success!',
                  `Successfully distributed ${totalPrize} sats to ${successCount} winners!`,
                  [{ text: 'OK', onPress: onDistributionComplete }]
                );
              } else {
                Alert.alert(
                  'Partial Success',
                  `Distributed to ${successCount} of ${results.length} winners. Some transfers may have failed.`,
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              console.error('Distribution error:', error);
              Alert.alert(
                'Distribution Failed',
                'Failed to distribute rewards. Please try again.',
                [{ text: 'OK' }]
              );
            } finally {
              setIsDistributing(false);
            }
          },
        },
      ]
    );
  };

  if (winners.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>🏆 Distribute Rewards</Text>
        <View style={styles.prizeInfo}>
          <Text style={styles.prizeLabel}>Total Prize Pool:</Text>
          <Text style={styles.prizeAmount}>{totalPrize.toLocaleString()} sats</Text>
        </View>
      </View>

      {/* Distribution Presets */}
      <View style={styles.presetsSection}>
        <Text style={styles.sectionTitle}>Distribution Method</Text>
        <View style={styles.presets}>
          {DISTRIBUTION_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.id}
              style={[
                styles.presetButton,
                selectedPreset === preset.id && styles.presetButtonActive,
              ]}
              onPress={() => setSelectedPreset(preset.id)}
              disabled={hasDistributed || isDistributing}
            >
              <Text
                style={[
                  styles.presetName,
                  selectedPreset === preset.id && styles.presetNameActive,
                ]}
              >
                {preset.name}
              </Text>
              <Text style={styles.presetDescription}>{preset.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Winner Preview */}
      <View style={styles.winnersSection}>
        <Text style={styles.sectionTitle}>Winners & Rewards</Text>
        {winners.slice(0, rewardAmounts.length).map((winner, index) => (
          <View key={winner.pubkey} style={styles.winnerRow}>
            <View style={styles.winnerInfo}>
              <Text style={styles.position}>#{index + 1}</Text>
              <Text style={styles.winnerName} numberOfLines={1}>
                {winner.name || `User ${winner.pubkey.slice(0, 8)}`}
              </Text>
            </View>
            <Text style={styles.rewardAmount}>
              {rewardAmounts[index]?.toLocaleString() || 0} sats
            </Text>
          </View>
        ))}
      </View>

      {/* Wallet Balance */}
      <View style={styles.balanceSection}>
        <Text style={styles.balanceLabel}>Your Wallet Balance:</Text>
        <Text
          style={[
            styles.balanceAmount,
            balance < totalPrize && styles.balanceInsufficient,
          ]}
        >
          {balance.toLocaleString()} sats
        </Text>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[
          styles.distributeButton,
          (hasDistributed || balance < totalPrize) && styles.distributeButtonDisabled,
        ]}
        onPress={handleDistribute}
        disabled={hasDistributed || isDistributing || walletLoading || balance < totalPrize}
      >
        {isDistributing ? (
          <ActivityIndicator size="small" color="#FF9D42" />
        ) : hasDistributed ? (
          <Text style={styles.distributeButtonText}>✓ Rewards Distributed</Text>
        ) : balance < totalPrize ? (
          <Text style={styles.distributeButtonText}>Insufficient Balance</Text>
        ) : (
          <Text style={styles.distributeButtonText}>Distribute Rewards</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },

  header: {
    marginBottom: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 8,
  },

  prizeInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },

  prizeLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },

  prizeAmount: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
  },

  presetsSection: {
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  presets: {
    gap: 8,
  },

  presetButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
  },

  presetButtonActive: {
    borderColor: theme.colors.accent,
    backgroundColor: `${theme.colors.accent}10`,
  },

  presetName: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 2,
  },

  presetNameActive: {
    color: theme.colors.accent,
  },

  presetDescription: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },

  winnersSection: {
    marginBottom: 16,
  },

  winnerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  winnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },

  position: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
    width: 30,
  },

  winnerName: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
  },

  rewardAmount: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  balanceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginBottom: 16,
  },

  balanceLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },

  balanceAmount: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  balanceInsufficient: {
    color: theme.colors.error,
  },

  distributeButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },

  distributeButtonDisabled: {
    backgroundColor: theme.colors.gray,
    opacity: 0.5,
  },

  distributeButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textBright,
  },
});