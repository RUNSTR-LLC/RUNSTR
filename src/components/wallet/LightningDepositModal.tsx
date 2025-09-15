/**
 * LightningDepositModal - Lightning Network Deposit Interface
 * Allows users to add sats to their NutZap wallet via Lightning
 * Converts Lightning payments to ecash tokens
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
import Clipboard from '@react-native-clipboard/clipboard';
import QRCode from 'react-native-qrcode-svg';

interface LightningDepositModalProps {
  visible: boolean;
  onClose: () => void;
  onDeposit: (amount: number, invoice: string) => Promise<void>;
  currentBalance: number;
}

export const LightningDepositModal: React.FC<LightningDepositModalProps> = ({
  visible,
  onClose,
  onDeposit,
  currentBalance,
}) => {
  const [amount, setAmount] = useState('');
  const [invoice, setInvoice] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState<'amount' | 'invoice'>('amount');

  const handleGenerateInvoice = async () => {
    const sats = parseInt(amount);
    if (isNaN(sats) || sats <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount in sats.');
      return;
    }

    setIsGenerating(true);
    try {
      // In production, this would call the mint's API to generate a Lightning invoice
      // For now, show a mock invoice
      const mockInvoice = `lnbc${sats}n1p...${Date.now().toString(36)}`;
      setInvoice(mockInvoice);
      setStep('invoice');
    } catch (error) {
      Alert.alert('Error', 'Failed to generate invoice. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyInvoice = () => {
    Clipboard.setString(invoice);
    Alert.alert('Copied!', 'Lightning invoice copied to clipboard');
  };

  const handleReset = () => {
    setAmount('');
    setInvoice('');
    setStep('amount');
  };

  const handleClose = () => {
    handleReset();
    onClose();
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
          <Text style={styles.title}>Add Funds</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {step === 'amount' ? (
            <>
              {/* Amount Input */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Enter Amount</Text>
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
                  {[1000, 5000, 10000, 50000].map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={styles.quickAmountButton}
                      onPress={() => setAmount(value.toString())}
                    >
                      <Text style={styles.quickAmountText}>
                        {value >= 1000 ? `${value / 1000}k` : value}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Current Balance */}
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceLabel}>Current Balance</Text>
                <Text style={styles.balanceAmount}>
                  {currentBalance.toLocaleString()} sats
                </Text>
              </View>

              {/* Generate Button */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (!amount || isGenerating) && styles.buttonDisabled,
                ]}
                onPress={handleGenerateInvoice}
                disabled={!amount || isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator color={theme.colors.accentText} />
                ) : (
                  <>
                    <Ionicons
                      name="flash"
                      size={20}
                      color={theme.colors.accentText}
                    />
                    <Text style={styles.primaryButtonText}>
                      Generate Lightning Invoice
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Invoice Display */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Lightning Invoice</Text>
                <Text style={styles.amountDisplay}>
                  {amount} sats
                </Text>

                {/* QR Code */}
                <View style={styles.qrContainer}>
                  <QRCode
                    value={invoice}
                    size={200}
                    color={theme.colors.text}
                    backgroundColor={theme.colors.cardBackground}
                  />
                </View>

                {/* Invoice Text */}
                <View style={styles.invoiceContainer}>
                  <Text style={styles.invoiceText} numberOfLines={3}>
                    {invoice}
                  </Text>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={handleCopyInvoice}
                  >
                    <Ionicons
                      name="copy"
                      size={20}
                      color={theme.colors.accent}
                    />
                  </TouchableOpacity>
                </View>

                {/* Instructions */}
                <View style={styles.instructions}>
                  <Text style={styles.instructionTitle}>How to deposit:</Text>
                  <Text style={styles.instructionText}>
                    1. Copy the invoice or scan the QR code
                  </Text>
                  <Text style={styles.instructionText}>
                    2. Pay with any Lightning wallet
                  </Text>
                  <Text style={styles.instructionText}>
                    3. Funds will appear in seconds
                  </Text>
                </View>

                {/* Action Buttons */}
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleReset}
                >
                  <Text style={styles.secondaryButtonText}>
                    Generate New Invoice
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Info */}
          <View style={styles.infoCard}>
            <Ionicons
              name="information-circle"
              size={16}
              color={theme.colors.textMuted}
            />
            <Text style={styles.infoText}>
              Lightning deposits are instantly converted to ecash tokens in your NutZap wallet
            </Text>
          </View>
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
    fontSize: 32,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center',
  },

  unitText: {
    fontSize: 18,
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
    paddingHorizontal: 12,
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

  // Balance info
  balanceInfo: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
    padding: 16,
    marginBottom: 24,
  },

  balanceLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },

  balanceAmount: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  // Invoice display
  amountDisplay: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },

  qrContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.large,
    marginBottom: 20,
  },

  invoiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    padding: 12,
    marginBottom: 20,
  },

  invoiceText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: 'monospace',
  },

  copyButton: {
    padding: 8,
  },

  // Instructions
  instructions: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
    padding: 16,
    marginBottom: 20,
  },

  instructionTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 8,
  },

  instructionText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 4,
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
  },

  primaryButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accentText,
  },

  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
  },

  secondaryButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
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
    marginTop: 20,
  },

  infoText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
});