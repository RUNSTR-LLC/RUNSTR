/**
 * RewardDistributionModal Component
 * Captain interface for distributing Bitcoin rewards to team members
 * Integrates with existing RewardDistributionService
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../styles/theme';
import { formatSats } from '../../utils/bitcoinUtils';
import rewardDistributionService, {
  DistributionTemplate,
  DISTRIBUTION_TEMPLATES,
} from '../../services/fitness/rewardDistributionService';

interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  isSelected?: boolean;
}

interface RewardDistributionModalProps {
  visible: boolean;
  onClose: () => void;
  teamId: string;
  captainId: string;
  teamMembers: TeamMember[];
  teamBalance: number; // Available sats in team wallet
  onDistributionComplete?: (success: boolean, message: string) => void;
}

export const RewardDistributionModal: React.FC<
  RewardDistributionModalProps
> = ({
  visible,
  onClose,
  teamId,
  captainId,
  teamMembers,
  teamBalance,
  onDistributionComplete,
}) => {
  const [distributionMode, setDistributionMode] = useState<'single' | 'batch'>(
    'single'
  );
  const [selectedTemplate, setSelectedTemplate] =
    useState<DistributionTemplate | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<TeamMember[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset modal state when opened
  useEffect(() => {
    if (visible) {
      setDistributionMode('single');
      setSelectedTemplate(null);
      setCustomAmount('');
      setCustomReason('');
      setCustomDescription('');
      setSelectedMembers([]);
      setIsProcessing(false);
    }
  }, [visible]);

  // Toggle member selection for batch distribution
  const toggleMemberSelection = (member: TeamMember) => {
    setSelectedMembers((prev) => {
      const isSelected = prev.find((m) => m.id === member.id);
      if (isSelected) {
        return prev.filter((m) => m.id !== member.id);
      } else {
        return [...prev, member];
      }
    });
  };

  // Select all members for batch distribution
  const selectAllMembers = () => {
    setSelectedMembers([...teamMembers]);
  };

  // Clear all member selections
  const clearAllSelections = () => {
    setSelectedMembers([]);
  };

  // Calculate total distribution amount
  const getTotalAmount = (): number => {
    const amount = selectedTemplate?.amount || parseInt(customAmount) || 0;
    return distributionMode === 'batch'
      ? amount * selectedMembers.length
      : amount;
  };

  // Validate distribution can be processed
  const canProcessDistribution = (): boolean => {
    const hasValidAmount =
      selectedTemplate?.amount || (customAmount && parseInt(customAmount) > 0);
    const hasValidReason = selectedTemplate?.reason || customReason.trim();
    const hasSelectedMembers =
      distributionMode === 'single'
        ? selectedMembers.length === 1
        : selectedMembers.length > 0;
    const hasEnoughBalance = getTotalAmount() <= teamBalance;

    return !!(
      hasValidAmount &&
      hasValidReason &&
      hasSelectedMembers &&
      hasEnoughBalance
    );
  };

  // Process single distribution
  const processSingleDistribution = async (): Promise<boolean> => {
    const recipient = selectedMembers[0];
    const amount = selectedTemplate?.amount || parseInt(customAmount);
    const reason = selectedTemplate?.reason || customReason;
    const description = selectedTemplate?.description || customDescription;

    const result = await rewardDistributionService.createDistribution(
      captainId,
      teamId,
      recipient.id,
      amount,
      reason,
      description
    );

    if (result.success && result.distributionId) {
      // Process the distribution (send Lightning payment)
      const processResult = await rewardDistributionService.processDistribution(
        result.distributionId
      );
      return processResult.success;
    }

    return false;
  };

  // Process batch distribution
  const processBatchDistribution = async (): Promise<boolean> => {
    const amount = selectedTemplate?.amount || parseInt(customAmount);
    const reason = selectedTemplate?.reason || customReason;
    const description = selectedTemplate?.description || customDescription;

    const distributions = selectedMembers.map((member) => ({
      recipientId: member.id,
      amount,
      reason,
      description,
    }));

    const batchResult = await rewardDistributionService.createBatchDistribution(
      captainId,
      teamId,
      distributions
    );

    if (batchResult.success && batchResult.batchId) {
      // Process the batch distribution
      const processResult =
        await rewardDistributionService.processBatchDistribution(
          batchResult.batchId
        );
      return processResult.success;
    }

    return false;
  };

  // Handle distribution submission
  const handleDistribute = async () => {
    if (!canProcessDistribution()) {
      Alert.alert(
        'Invalid Distribution',
        'Please check your inputs and try again.'
      );
      return;
    }

    setIsProcessing(true);

    try {
      let success = false;

      if (distributionMode === 'single') {
        success = await processSingleDistribution();
      } else {
        success = await processBatchDistribution();
      }

      const message = success
        ? `Successfully distributed ${formatSats(getTotalAmount())} to ${
            selectedMembers.length
          } member(s)!`
        : 'Distribution failed. Please check team wallet balance and try again.';

      onDistributionComplete?.(success, message);

      if (success) {
        onClose();
      } else {
        Alert.alert('Distribution Failed', message);
      }
    } catch (error) {
      console.error('Distribution error:', error);
      Alert.alert('Error', 'An unexpected error occurred during distribution.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Distribute Rewards</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Team Balance Info */}
        <View style={styles.balanceInfo}>
          <Text style={styles.balanceLabel}>Team Wallet Balance</Text>
          <Text style={styles.balanceAmount}>{formatSats(teamBalance)}</Text>
        </View>

        <ScrollView style={styles.content}>
          {/* Distribution Mode Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Distribution Type</Text>
            <View style={styles.modeSelector}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  distributionMode === 'single' && styles.modeButtonActive,
                ]}
                onPress={() => setDistributionMode('single')}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    distributionMode === 'single' &&
                      styles.modeButtonTextActive,
                  ]}
                >
                  Single Member
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  distributionMode === 'batch' && styles.modeButtonActive,
                ]}
                onPress={() => setDistributionMode('batch')}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    distributionMode === 'batch' && styles.modeButtonTextActive,
                  ]}
                >
                  Multiple Members
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Reward Templates */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reward Type</Text>
            {DISTRIBUTION_TEMPLATES.map((template, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.templateButton,
                  selectedTemplate?.name === template.name &&
                    styles.templateButtonActive,
                ]}
                onPress={() => {
                  setSelectedTemplate(template);
                  setCustomAmount('');
                  setCustomReason('');
                  setCustomDescription('');
                }}
              >
                <Text style={styles.templateName}>{template.name}</Text>
                <Text style={styles.templateAmount}>
                  {formatSats(template.amount)}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Custom Amount Option */}
            <TouchableOpacity
              style={[
                styles.templateButton,
                !selectedTemplate && styles.templateButtonActive,
              ]}
              onPress={() => setSelectedTemplate(null)}
            >
              <Text style={styles.templateName}>Custom Amount</Text>
              <TextInput
                style={styles.customAmountInput}
                placeholder="Amount in sats"
                placeholderTextColor={theme.colors.textMuted}
                value={customAmount}
                onChangeText={setCustomAmount}
                keyboardType="numeric"
              />
            </TouchableOpacity>

            {!selectedTemplate && (
              <View style={styles.customFields}>
                <TextInput
                  style={styles.customInput}
                  placeholder="Reason (e.g., 'weekly_winner')"
                  placeholderTextColor={theme.colors.textMuted}
                  value={customReason}
                  onChangeText={setCustomReason}
                />
                <TextInput
                  style={styles.customInput}
                  placeholder="Description (optional)"
                  placeholderTextColor={theme.colors.textMuted}
                  value={customDescription}
                  onChangeText={setCustomDescription}
                  multiline
                />
              </View>
            )}
          </View>

          {/* Member Selection */}
          <View style={styles.section}>
            <View style={styles.memberSectionHeader}>
              <Text style={styles.sectionTitle}>
                Select {distributionMode === 'single' ? 'Member' : 'Members'}
              </Text>
              {distributionMode === 'batch' && (
                <View style={styles.batchControls}>
                  <TouchableOpacity
                    onPress={selectAllMembers}
                    style={styles.batchButton}
                  >
                    <Text style={styles.batchButtonText}>Select All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={clearAllSelections}
                    style={styles.batchButton}
                  >
                    <Text style={styles.batchButtonText}>Clear</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {teamMembers.map((member) => (
              <TouchableOpacity
                key={member.id}
                style={[
                  styles.memberButton,
                  selectedMembers.find((m) => m.id === member.id) &&
                    styles.memberButtonSelected,
                ]}
                onPress={() => {
                  if (distributionMode === 'single') {
                    setSelectedMembers([member]);
                  } else {
                    toggleMemberSelection(member);
                  }
                }}
              >
                <Text style={styles.memberName}>{member.name}</Text>
                {selectedMembers.find((m) => m.id === member.id) && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Distribution Summary */}
          {selectedMembers.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Distribution Summary</Text>
              <View style={styles.summary}>
                <Text style={styles.summaryText}>
                  Recipients: {selectedMembers.length}
                </Text>
                <Text style={styles.summaryText}>
                  Amount per member:{' '}
                  {formatSats(
                    selectedTemplate?.amount || parseInt(customAmount) || 0
                  )}
                </Text>
                <Text style={styles.summaryTotal}>
                  Total: {formatSats(getTotalAmount())}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.distributeButton,
              !canProcessDistribution() && styles.buttonDisabled,
            ]}
            onPress={handleDistribute}
            disabled={!canProcessDistribution() || isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.distributeButtonText}>
                Distribute {formatSats(getTotalAmount())}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    padding: theme.spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.typography.headingSecondary,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: theme.colors.textMuted,
  },
  balanceInfo: {
    backgroundColor: theme.colors.cardBackground,
    margin: theme.spacing.xxl,
    padding: theme.spacing.xxl,
    borderRadius: theme.borderRadius.large,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: theme.typography.aboutTitle,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: theme.typography.headingSecondary,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  content: {
    flex: 1,
    padding: theme.spacing.xxl,
  },
  section: {
    marginBottom: theme.spacing.xxxl,
  },
  sectionTitle: {
    fontSize: theme.typography.headingTertiary,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  modeSelector: {
    flexDirection: 'row',
    borderRadius: theme.borderRadius.medium,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modeButton: {
    flex: 1,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.cardBackground,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  modeButtonText: {
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
  },
  modeButtonTextActive: {
    color: theme.colors.textBright,
    fontWeight: '600',
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.sm,
  },
  templateButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}15`,
  },
  templateName: {
    fontSize: theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  templateAmount: {
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
  },
  customAmountInput: {
    fontSize: theme.typography.body,
    color: theme.colors.textPrimary,
    textAlign: 'right',
    minWidth: 100,
  },
  customFields: {
    marginTop: theme.spacing.lg,
  },
  customInput: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.lg,
    fontSize: theme.typography.body,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  memberSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  batchControls: {
    flexDirection: 'row',
  },
  batchButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
  batchButtonText: {
    fontSize: theme.typography.aboutTitle,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  memberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.xs,
  },
  memberButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}15`,
  },
  memberName: {
    fontSize: theme.typography.body,
    color: theme.colors.textPrimary,
  },
  checkmark: {
    fontSize: 18,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  summary: {
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  summaryText: {
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  summaryTotal: {
    fontSize: theme.typography.headingTertiary,
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
    marginTop: theme.spacing.sm,
  },
  footer: {
    padding: theme.spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  distributeButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.border,
  },
  distributeButtonText: {
    fontSize: theme.typography.headingTertiary,
    color: theme.colors.textBright,
    fontWeight: 'bold',
  },
});
