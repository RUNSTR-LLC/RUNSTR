/**
 * EnhancedZapModal Component
 * Modal for custom zap amounts with default setting capability
 * Triggered by long-press on NutzapLightningButton
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { useNutzap } from '../../hooks/useNutzap';

interface EnhancedZapModalProps {
  visible: boolean;
  recipientNpub: string;
  recipientName: string;
  defaultAmount: number;
  balance: number;
  onClose: () => void;
  onSuccess?: () => void;
  onDefaultAmountChange?: (amount: number) => void;
}

export const EnhancedZapModal: React.FC<EnhancedZapModalProps> = ({
  visible,
  recipientNpub,
  recipientName,
  defaultAmount,
  balance,
  onClose,
  onSuccess,
  onDefaultAmountChange,
}) => {
  const { sendNutzap } = useNutzap();
  const [selectedAmount, setSelectedAmount] = useState<number>(defaultAmount);
  const [customAmount, setCustomAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [memo, setMemo] = useState('');

  // Preset amounts with 21 as the first option
  const presetAmounts = [21, 100, 500, 1000, 2100, 5000];

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedAmount(defaultAmount);
      setCustomAmount('');
      setSetAsDefault(false);
      setMemo('');
    }
  }, [visible, defaultAmount]);

  const handleSend = async () => {
    const amount = customAmount ? parseInt(customAmount) : selectedAmount;

    if (!amount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please select or enter a valid amount');
      return;
    }

    if (amount > balance) {
      Alert.alert(
        'Insufficient Balance',
        `You need ${amount} sats but only have ${balance} sats`
      );
      return;
    }

    setIsSending(true);

    try {
      const zapMemo = memo || `⚡ Zap from RUNSTR - ${amount} sats!`;
      const success = await sendNutzap(recipientNpub, amount, zapMemo);

      if (success) {
        // Update default if requested
        if (setAsDefault && onDefaultAmountChange) {
          onDefaultAmountChange(amount);
        }

        Alert.alert(
          '⚡ Zap Sent!',
          `Successfully sent ${amount} sats to ${recipientName}`,
          [
            {
              text: 'OK',
              onPress: () => {
                onSuccess?.();
                onClose();
              },
            },
          ]
        );
      } else {
        Alert.alert('Failed', 'Failed to send zap. Please try again.');
      }
    } catch (error) {
      console.error('Zap error:', error);
      Alert.alert('Error', 'An error occurred while sending the zap');
    } finally {
      setIsSending(false);
    }
  };

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (text: string) => {
    // Only allow numbers
    const cleaned = text.replace(/[^0-9]/g, '');
    setCustomAmount(cleaned);
    if (cleaned) {
      setSelectedAmount(0); // Clear preset selection
    }
  };

  const displayAmount = customAmount ? parseInt(customAmount) : selectedAmount;
  const canSend = displayAmount > 0 && displayAmount <= balance;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <Ionicons name="flash" size={24} color="#FFD700" />
                <Text style={styles.title}>Custom Zap</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Recipient Info */}
            <View style={styles.recipientSection}>
              <Text style={styles.recipientLabel}>Sending to:</Text>
              <Text style={styles.recipientName}>{recipientName}</Text>
              <Text style={styles.recipientPubkey}>
                {recipientNpub.slice(0, 16)}...
              </Text>
            </View>

            {/* Balance Display */}
            <View style={styles.balanceSection}>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Your Balance:</Text>
                <Text style={styles.balanceAmount}>
                  {balance.toLocaleString()} sats
                </Text>
              </View>
              {displayAmount > 0 && (
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>After Zap:</Text>
                  <Text
                    style={[
                      styles.balanceAmount,
                      displayAmount > balance && styles.balanceError,
                    ]}
                  >
                    {(balance - displayAmount).toLocaleString()} sats
                  </Text>
                </View>
              )}
            </View>

            {/* Amount Selection */}
            <View style={styles.amountSection}>
              <Text style={styles.sectionLabel}>Select Amount</Text>

              {/* Preset Amounts Grid */}
              <View style={styles.presetGrid}>
                {presetAmounts.map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={[
                      styles.presetButton,
                      selectedAmount === amount && styles.presetButtonActive,
                      amount === defaultAmount && styles.presetButtonDefault,
                    ]}
                    onPress={() => handleAmountSelect(amount)}
                  >
                    <Text
                      style={[
                        styles.presetButtonText,
                        selectedAmount === amount &&
                          styles.presetButtonTextActive,
                      ]}
                    >
                      {amount}
                    </Text>
                    {amount === defaultAmount && (
                      <Text style={styles.defaultBadge}>default</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom Amount Input */}
              <View style={styles.customAmountContainer}>
                <TextInput
                  style={styles.customAmountInput}
                  value={customAmount}
                  onChangeText={handleCustomAmountChange}
                  placeholder="Enter custom amount..."
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                  maxLength={7}
                />
                <Text style={styles.satsSuffix}>sats</Text>
              </View>

              {/* Set as Default Toggle */}
              {displayAmount > 0 && displayAmount !== defaultAmount && (
                <View style={styles.defaultToggle}>
                  <Text style={styles.defaultToggleLabel}>
                    Set {displayAmount} sats as my default
                  </Text>
                  <Switch
                    value={setAsDefault}
                    onValueChange={setSetAsDefault}
                    trackColor={{
                      false: theme.colors.border,
                      true: theme.colors.primary,
                    }}
                    thumbColor={theme.colors.text}
                  />
                </View>
              )}
            </View>

            {/* Optional Memo */}
            <View style={styles.memoSection}>
              <Text style={styles.sectionLabel}>Add a Message (optional)</Text>
              <TextInput
                style={styles.memoInput}
                value={memo}
                onChangeText={setMemo}
                placeholder="Say something nice..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
                maxLength={100}
              />
            </View>

            {/* Send Button */}
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!canSend || isSending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!canSend || isSending}
            >
              {isSending ? (
                <ActivityIndicator color={theme.colors.background} />
              ) : (
                <>
                  <Ionicons
                    name="flash"
                    size={20}
                    color={theme.colors.background}
                  />
                  <Text style={styles.sendButtonText}>
                    Send {displayAmount > 0 ? `${displayAmount} sats` : 'Zap'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  modal: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.large,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  title: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },

  closeButton: {
    padding: 4,
  },

  recipientSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  recipientLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },

  recipientName: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  recipientPubkey: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },

  balanceSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
  },

  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  balanceLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },

  balanceAmount: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },

  balanceError: {
    color: theme.colors.error,
  },

  amountSection: {
    marginBottom: 20,
  },

  sectionLabel: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 12,
  },

  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },

  presetButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.cardBackground,
    minWidth: 80,
    alignItems: 'center',
  },

  presetButtonActive: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },

  presetButtonDefault: {
    borderColor: theme.colors.primary,
  },

  presetButtonText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
  },

  presetButtonTextActive: {
    color: theme.colors.background,
    fontWeight: theme.typography.weights.bold,
  },

  defaultBadge: {
    fontSize: 9,
    color: theme.colors.primary,
    marginTop: 2,
  },

  customAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: 12,
  },

  customAmountInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: theme.colors.text,
  },

  satsSuffix: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginLeft: 8,
  },

  defaultToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    padding: 12,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
  },

  defaultToggleLabel: {
    fontSize: 13,
    color: theme.colors.text,
  },

  memoSection: {
    marginBottom: 20,
  },

  memoInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.cardBackground,
    padding: 12,
    fontSize: 14,
    color: theme.colors.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },

  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFD700',
    paddingVertical: 14,
    borderRadius: theme.borderRadius.medium,
  },

  sendButtonDisabled: {
    opacity: 0.5,
    backgroundColor: theme.colors.buttonBorder,
  },

  sendButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.background,
  },
});
