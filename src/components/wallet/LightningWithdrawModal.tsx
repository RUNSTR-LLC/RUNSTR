/**
 * LightningWithdrawModal - Lightning Network Withdrawal Interface
 * Allows users to withdraw sats from NutZap wallet via Lightning
 * Converts ecash tokens back to Lightning payments
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import nutzapService from '../../services/nutzap/nutzapService';

interface LightningWithdrawModalProps {
  visible: boolean;
  onClose: () => void;
  onWithdraw: (amount: number, invoice: string) => Promise<boolean>;
  currentBalance: number;
  minWithdraw?: number;
  maxWithdraw?: number;
  fee?: number;
}

export const LightningWithdrawModal: React.FC<LightningWithdrawModalProps> = ({
  visible,
  onClose,
  onWithdraw,
  currentBalance,
  minWithdraw = 100,
  maxWithdraw = 1000000,
  fee = 2, // sats
}) => {
  const [amount, setAmount] = useState('');
  const [lightningInvoice, setLightningInvoice] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'details' | 'processing'>('details');

  const handlePasteInvoice = async () => {
    const text = await Clipboard.getStringAsync();
    if (text && text.toLowerCase().startsWith('lnbc')) {
      setLightningInvoice(text);
    } else {
      Alert.alert('Invalid Invoice', 'Please copy a valid Lightning invoice first.');
    }
  };

  const validateWithdrawal = (): boolean => {
    const sats = parseInt(amount);

    if (isNaN(sats) || sats <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount in sats.');
      return false;
    }

    if (sats < minWithdraw) {
      Alert.alert('Amount Too Low', `Minimum withdrawal is ${minWithdraw} sats.`);
      return false;
    }

    if (sats > currentBalance) {
      Alert.alert('Insufficient Balance', `You only have ${currentBalance} sats available.`);
      return false;
    }

    if (sats > maxWithdraw) {
      Alert.alert('Amount Too High', `Maximum withdrawal is ${maxWithdraw} sats.`);
      return false;
    }

    if (!lightningInvoice || !lightningInvoice.toLowerCase().startsWith('lnbc')) {
      Alert.alert('Invalid Invoice', 'Please provide a valid Lightning invoice.');
      return false;
    }

    return true;
  };

  const handleWithdraw = async () => {
    if (!validateWithdrawal()) return;

    setIsProcessing(true);
    setStep('processing');

    try {
      const sats = parseInt(amount);

      // Pay Lightning invoice with ecash tokens
      const result = await nutzapService.payLightningInvoice(lightningInvoice);

      if (result.success) {
        await onWithdraw(sats, lightningInvoice);
        Alert.alert(
          'Withdrawal Successful!',
          `${sats} sats have been sent to your Lightning wallet.${result.fee ? `\nNetwork fee: ${result.fee} sats` : ''}`,
          [{ text: 'OK', onPress: handleClose }]
        );
      } else {
        Alert.alert(
          'Withdrawal Failed',
          result.error || 'Unable to process withdrawal. Please try again.',
          [{ text: 'OK', onPress: () => setStep('details') }]
        );
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      Alert.alert(
        'Error',
        'An error occurred during withdrawal. Please try again.',
        [{ text: 'OK', onPress: () => setStep('details') }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setLightningInvoice('');
    setStep('details');
    setIsProcessing(false);
    onClose();
  };

  const getNetAmount = (): number => {
    const sats = parseInt(amount) || 0;
    return Math.max(0, sats - fee);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Withdraw Funds</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {step === 'details' ? (
            <>
              {/* Balance Display */}
              <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceAmount}>
                    {currentBalance.toLocaleString()}
                  </Text>
                  <Text style={styles.balanceUnit}>sats</Text>
                </View>
              </View>

              {/* Amount Input */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Amount to Withdraw</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.amountInput}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                  <Text style={styles.unitText}>sats</Text>
                </View>

                {/* Quick amount buttons */}
                <View style={styles.quickAmounts}>
                  <TouchableOpacity
                    style={styles.quickAmountButton}
                    onPress={() => setAmount(Math.floor(currentBalance * 0.25).toString())}
                  >
                    <Text style={styles.quickAmountText}>25%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickAmountButton}
                    onPress={() => setAmount(Math.floor(currentBalance * 0.5).toString())}
                  >
                    <Text style={styles.quickAmountText}>50%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickAmountButton}
                    onPress={() => setAmount(Math.floor(currentBalance * 0.75).toString())}
                  >
                    <Text style={styles.quickAmountText}>75%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickAmountButton}
                    onPress={() => setAmount(currentBalance.toString())}
                  >
                    <Text style={styles.quickAmountText}>Max</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Lightning Invoice Input */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Lightning Invoice</Text>
                <View style={styles.invoiceInputContainer}>
                  <TextInput
                    style={styles.invoiceInput}
                    value={lightningInvoice}
                    onChangeText={setLightningInvoice}
                    placeholder="lnbc..."
                    placeholderTextColor={theme.colors.textMuted}
                    multiline
                  />
                  <TouchableOpacity
                    style={styles.pasteButton}
                    onPress={handlePasteInvoice}
                  >
                    <Ionicons name="clipboard" size={20} color={theme.colors.accent} />
                    <Text style={styles.pasteButtonText}>Paste</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Fee Information */}
              {amount && parseInt(amount) > 0 && (
                <View style={styles.feeCard}>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>Withdrawal Amount</Text>
                    <Text style={styles.feeValue}>{amount} sats</Text>
                  </View>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>Network Fee</Text>
                    <Text style={styles.feeValue}>-{fee} sats</Text>
                  </View>
                  <View style={[styles.feeRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>You'll Receive</Text>
                    <Text style={styles.totalValue}>{getNetAmount()} sats</Text>
                  </View>
                </View>
              )}

              {/* Withdraw Button */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (!amount || !lightningInvoice || isProcessing) && styles.buttonDisabled,
                ]}
                onPress={handleWithdraw}
                disabled={!amount || !lightningInvoice || isProcessing}
              >
                <Ionicons
                  name="send"
                  size={20}
                  color={theme.colors.accentText}
                />
                <Text style={styles.primaryButtonText}>
                  Withdraw to Lightning
                </Text>
              </TouchableOpacity>

              {/* Info */}
              <View style={styles.infoCard}>
                <Ionicons
                  name="information-circle"
                  size={16}
                  color={theme.colors.textMuted}
                />
                <Text style={styles.infoText}>
                  Withdrawals are processed instantly. Your ecash tokens will be converted to Lightning sats and sent to your wallet.
                </Text>
              </View>
            </>
          ) : (
            <>
              {/* Processing State */}
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={theme.colors.accent} />
                <Text style={styles.processingTitle}>Processing Withdrawal</Text>
                <Text style={styles.processingText}>
                  Converting ecash tokens to Lightning...
                </Text>
                <View style={styles.processingDetails}>
                  <Text style={styles.processingAmount}>{amount} sats</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={24}
                    color={theme.colors.textMuted}
                  />
                  <Ionicons
                    name="flash"
                    size={32}
                    color={theme.colors.accent}
                  />
                </View>
              </View>
            </>
          )}
        </ScrollView>
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  title: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },

  closeButton: {
    padding: 4,
  },

  content: {
    flex: 1,
    padding: 20,
  },

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 12,
  },

  // Balance card
  balanceCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.large,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },

  balanceLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },

  balanceAmount: {
    fontSize: 32,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },

  balanceUnit: {
    fontSize: 16,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },

  // Amount input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.large,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    textAlign: 'center',
  },

  unitText: {
    fontSize: 16,
    color: theme.colors.textMuted,
    marginLeft: 8,
  },

  quickAmounts: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },

  quickAmountButton: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
  },

  quickAmountText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  // Invoice input
  invoiceInputContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    padding: 12,
  },

  invoiceInput: {
    fontSize: 13,
    color: theme.colors.text,
    fontFamily: 'monospace',
    minHeight: 60,
  },

  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },

  pasteButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.accent,
  },

  // Fee card
  feeCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
    padding: 16,
    marginBottom: 24,
  },

  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  feeLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },

  feeValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
  },

  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  totalLabel: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  totalValue: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
  },

  // Processing state
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },

  processingTitle: {
    fontSize: 20,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginTop: 24,
    marginBottom: 8,
  },

  processingText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 32,
  },

  processingDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  processingAmount: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  // Buttons
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.medium,
    marginBottom: 16,
  },

  primaryButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accentText,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  // Info card
  infoCard: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: theme.colors.cardBackground + '60',
    borderRadius: theme.borderRadius.medium,
    padding: 12,
  },

  infoText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
});