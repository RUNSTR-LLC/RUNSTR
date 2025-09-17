/**
 * SendModal - Unified send interface for Lightning and Cashu
 * Allows sending via NutZap, Lightning invoice, or Cashu token
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
import nutzapService from '../../services/nutzap/nutzapService';
import { nip19 } from 'nostr-tools';

interface SendModalProps {
  visible: boolean;
  onClose: () => void;
  currentBalance: number;
}

type SendMethod = 'lightning' | 'cashu';

export const SendModal: React.FC<SendModalProps> = ({
  visible,
  onClose,
  currentBalance,
}) => {
  const [sendMethod, setSendMethod] = useState<SendMethod>('lightning');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [memo, setMemo] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    const sats = parseInt(amount);
    if (isNaN(sats) || sats <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount in sats.');
      return;
    }

    if (sats > currentBalance) {
      Alert.alert('Insufficient Balance', `You only have ${currentBalance} sats available.`);
      return;
    }

    setIsSending(true);

    try {
      if (sendMethod === 'lightning') {
        // Pay Lightning invoice
        if (!recipient || !recipient.toLowerCase().startsWith('lnbc')) {
          Alert.alert('Invalid Invoice', 'Please enter a valid Lightning invoice.');
          setIsSending(false);
          return;
        }

        const result = await nutzapService.payLightningInvoice(recipient);

        if (result.success) {
          Alert.alert(
            'Payment Sent!',
            `Lightning invoice paid successfully${result.fee ? `\nFee: ${result.fee} sats` : ''}`,
            [{ text: 'OK', onPress: handleClose }]
          );
        } else {
          Alert.alert('Payment Failed', result.error || 'Failed to pay invoice');
        }

      } else if (sendMethod === 'cashu') {
        // Generate E-cash token
        const token = await nutzapService.generateCashuToken(sats, memo);
        setGeneratedToken(token);
        Alert.alert(
          'Token Generated!',
          'E-cash token has been generated. Share it with the recipient.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Send error:', error);
      Alert.alert('Error', 'Failed to complete transaction. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyToken = () => {
    Clipboard.setString(generatedToken);
    Alert.alert('Copied!', 'E-cash token copied to clipboard');
  };

  const handleClose = () => {
    setAmount('');
    setRecipient('');
    setMemo('');
    setGeneratedToken('');
    setSendMethod('lightning');
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

          {/* Send Method Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, sendMethod === 'lightning' && styles.tabActive]}
              onPress={() => setSendMethod('lightning')}
            >
              <Text style={[styles.tabText, sendMethod === 'lightning' && styles.tabTextActive]}>
                Lightning
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, sendMethod === 'cashu' && styles.tabActive]}
              onPress={() => setSendMethod('cashu')}
            >
              <Text style={[styles.tabText, sendMethod === 'cashu' && styles.tabTextActive]}>
                E-cash
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amount</Text>
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

          {/* Recipient/Invoice Input */}
          {sendMethod === 'lightning' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lightning Invoice</Text>
              <TextInput
                style={styles.textInput}
                value={recipient}
                onChangeText={setRecipient}
                placeholder='lnbc...'
                placeholderTextColor={theme.colors.textMuted}
                multiline
              />
            </View>
          )}

          {/* Memo Input (for E-cash) */}
          {sendMethod === 'cashu' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Memo (optional)</Text>
              <TextInput
                style={styles.textInput}
                value={memo}
                onChangeText={setMemo}
                placeholder="Add a message..."
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
          )}

          {/* Generated Token Display */}
          {generatedToken && sendMethod === 'cashu' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Generated E-cash Token</Text>
              <View style={styles.tokenContainer}>
                <Text style={styles.tokenText} numberOfLines={3}>
                  {generatedToken}
                </Text>
                <TouchableOpacity style={styles.copyButton} onPress={handleCopyToken}>
                  <Ionicons name="copy" size={20} color={theme.colors.accent} />
                  <Text style={styles.copyButtonText}>Copy</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Send Button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (isSending || !amount || (sendMethod !== 'cashu' && !recipient)) && styles.buttonDisabled,
            ]}
            onPress={handleSend}
            disabled={isSending || !amount || (sendMethod !== 'cashu' && !recipient)}
          >
            {isSending ? (
              <ActivityIndicator color={theme.colors.accentText} />
            ) : (
              <>
                <Ionicons name="send" size={20} color={theme.colors.accentText} />
                <Text style={styles.primaryButtonText}>
                  {sendMethod === 'cashu' ? 'Generate Token' : 'Send'}
                </Text>
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

  // Tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
    padding: 4,
    marginBottom: 20,
  },

  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.borderRadius.medium - 2,
  },

  tabActive: {
    backgroundColor: theme.colors.accent,
  },

  tabText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
  },

  tabTextActive: {
    color: theme.colors.accentText,
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

  // Token display
  tokenContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    padding: 12,
  },

  tokenText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: 'monospace',
    marginBottom: 12,
  },

  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
  },

  copyButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.accent,
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
});