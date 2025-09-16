/**
 * ZapModal - P2P Cashu payment modal for competition winners
 * Uses NIP-60 wallets to send Cashu tokens directly between users
 * Simple amount selection and one-tap sending
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { useNutzap } from '../../hooks/useNutzap';

interface ZapModalProps {
  visible: boolean;
  recipientNpub: string;
  recipientName: string;
  suggestedAmount?: number;
  competitionName?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ZapModal: React.FC<ZapModalProps> = ({
  visible,
  recipientNpub,
  recipientName,
  suggestedAmount = 1000,
  competitionName,
  onClose,
  onSuccess,
}) => {
  const { balance, sendNutzap, isLoading } = useNutzap();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(suggestedAmount);
  const [customAmount, setCustomAmount] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Preset amounts for quick selection
  const presetAmounts = [100, 500, 1000, 2500, 5000];

  const handleSend = async () => {
    const amount = customAmount ? parseInt(customAmount) : selectedAmount;

    if (!amount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please select or enter a valid amount');
      return;
    }

    if (amount > balance) {
      Alert.alert('Insufficient Balance', `You only have ${balance} sats available`);
      return;
    }

    setIsSending(true);

    try {
      const memo = competitionName
        ? `Zap for winning ${competitionName}! ⚡️`
        : 'Zap from RUNSTR! ⚡️';

      const success = await sendNutzap(recipientNpub, amount, memo);

      if (success) {
        Alert.alert(
          '⚡️ Zap Sent!',
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
    setCustomAmount(text);
    setSelectedAmount(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Send Zap ⚡️</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Recipient Info */}
          <View style={styles.recipientSection}>
            <Text style={styles.recipientLabel}>To:</Text>
            <Text style={styles.recipientName}>{recipientName}</Text>
            {competitionName && (
              <Text style={styles.competitionText}>For: {competitionName}</Text>
            )}
          </View>

          {/* Balance Display */}
          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>Your Balance:</Text>
            <Text style={styles.balanceAmount}>{balance.toLocaleString()} sats</Text>
          </View>

          {/* Amount Selection */}
          <View style={styles.amountSection}>
            <Text style={styles.sectionLabel}>Select Amount</Text>

            {/* Preset Amounts */}
            <View style={styles.presetGrid}>
              {presetAmounts.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.presetButton,
                    selectedAmount === amount && styles.presetButtonActive,
                  ]}
                  onPress={() => handleAmountSelect(amount)}
                >
                  <Text
                    style={[
                      styles.presetButtonText,
                      selectedAmount === amount && styles.presetButtonTextActive,
                    ]}
                  >
                    {amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Amount */}
            <View style={styles.customAmountContainer}>
              <TextInput
                style={styles.customAmountInput}
                value={customAmount}
                onChangeText={handleCustomAmountChange}
                placeholder="Custom amount"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
              />
              <Text style={styles.satsSuffix}>sats</Text>
            </View>
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={isSending || isLoading}
          >
            {isSending ? (
              <ActivityIndicator color={theme.colors.background} />
            ) : (
              <>
                <Ionicons name="flash" size={20} color={theme.colors.background} />
                <Text style={styles.sendButtonText}>Send Zap</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
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
  competitionText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  balanceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    padding: 12,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.cardBackground,
  },
  presetButtonActive: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
  },
  presetButtonText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
  },
  presetButtonTextActive: {
    color: theme.colors.background,
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
    height: 40,
    fontSize: 16,
    color: theme.colors.text,
  },
  satsSuffix: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginLeft: 8,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.text,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.medium,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.background,
  },
});