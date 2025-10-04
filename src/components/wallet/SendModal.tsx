/**
 * SendModal - Lightning payment send interface
 * Allows sending via Lightning invoice or Lightning address
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
import nutzapService from '../../services/nutzap/nutzapService';
import { nip19 } from 'nostr-tools';

interface SendModalProps {
  visible: boolean;
  onClose: () => void;
  currentBalance: number;
}

type SendMethod = 'lightning';

// Helper function to detect payment type
const detectPaymentType = (input: string): 'invoice' | 'address' | 'unknown' => {
  if (input.toLowerCase().startsWith('lnbc')) return 'invoice';
  if (input.includes('@')) return 'address';
  return 'unknown';
};

export const SendModal: React.FC<SendModalProps> = ({
  visible,
  onClose,
  currentBalance,
}) => {
  const [sendMethod] = useState<SendMethod>('lightning');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [paymentType, setPaymentType] = useState<'invoice' | 'address' | 'unknown'>('unknown');
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Handle recipient input changes
  const handleRecipientChange = (text: string) => {
    setRecipient(text);
    setPaymentType(detectPaymentType(text));
  };

  const handleSend = async () => {
    if (sendMethod === 'lightning') {
      const type = detectPaymentType(recipient);

      if (type === 'unknown') {
        Alert.alert('Invalid Input', 'Please enter a Lightning invoice (lnbc...) or Lightning address (user@domain.com)');
        return;
      }

      // For Lightning address, amount is required
      if (type === 'address') {
        const sats = parseInt(amount);
        if (isNaN(sats) || sats <= 0) {
          Alert.alert('Amount Required', 'Please enter an amount for Lightning address payment.');
          return;
        }

        if (sats > currentBalance) {
          Alert.alert('Insufficient Balance', `You only have ${currentBalance} sats available.`);
          return;
        }
      }

      setIsSending(true);

      try {
        const sats = parseInt(amount) || 0;
        const result = await nutzapService.payLightningInvoice(recipient, sats > 0 ? sats : undefined);

        if (result.success) {
          Alert.alert(
            'Payment Sent!',
            `Payment successful${result.fee ? `\nFee: ${result.fee} sats` : ''}`,
            [{ text: 'OK', onPress: handleClose }]
          );
        } else {
          Alert.alert('Payment Failed', result.error || 'Failed to process payment');
        }

      } catch (error) {
        console.error('Send error:', error);
        Alert.alert('Error', 'Failed to complete transaction. Please try again.');
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleClose = () => {
    setAmount('');
    setRecipient('');
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
          <Text style={styles.title}>Send</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Balance Display */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>
              {currentBalance.toLocaleString()} sats
            </Text>
          </View>

          {/* Amount Input - Show for Lightning address (hide for complete invoices) */}
          {paymentType !== 'invoice' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Amount {sendMethod === 'lightning' && paymentType !== 'invoice' ? '(Required for Lightning address)' : ''}
              </Text>
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
            </View>
          )}

          {/* Recipient/Invoice Input */}
          {sendMethod === 'lightning' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Lightning Invoice or Address
              </Text>
              <TextInput
                style={styles.textInput}
                value={recipient}
                onChangeText={handleRecipientChange}
                placeholder='lnbc... or user@domain.com'
                placeholderTextColor={theme.colors.textMuted}
                multiline={paymentType === 'invoice'}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {recipient && paymentType === 'unknown' && (
                <Text style={[styles.helperText, { color: '#999999' }]}>
                  Invalid format. Enter a Lightning invoice (lnbc...) or address (user@domain.com)
                </Text>
              )}
              {paymentType === 'address' && (
                <Text style={styles.helperText}>
                  Lightning address detected. Enter amount above to continue.
                </Text>
              )}
              {paymentType === 'invoice' && (
                <Text style={[styles.helperText, { color: theme.colors.textBright }]}>
                  Lightning invoice detected. Amount will be taken from invoice.
                </Text>
              )}
            </View>
          )}


          {/* Send Button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (isSending ||
               (!recipient || (paymentType === 'address' && !amount) || (recipient && paymentType === 'unknown'))
              ) && styles.buttonDisabled,
            ]}
            onPress={handleSend}
            disabled={isSending ||
                     (!recipient || (paymentType === 'address' && !amount) || (recipient && paymentType === 'unknown'))}
          >
            {isSending ? (
              <ActivityIndicator color={theme.colors.accentText} />
            ) : (
              <>
                <Ionicons name="send" size={20} color={theme.colors.accentText} />
                <Text style={styles.primaryButtonText}>Send</Text>
              </>
            )}
          </TouchableOpacity>
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

  // Balance
  balanceCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.large,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },

  balanceLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },

  balanceAmount: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },


  // Inputs
  section: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 8,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  unitText: {
    fontSize: 16,
    color: theme.colors.textMuted,
    marginLeft: 8,
  },

  textInput: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.text,
    minHeight: 50,
  },


  // Button
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.medium,
    marginTop: 20,
  },

  primaryButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accentText,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  helperText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
});