/**
 * ReceiveModal - Unified receive interface for Lightning and Cashu
 * Allows receiving via Lightning invoice or Cashu token
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
import QRCode from 'react-native-qrcode-svg';
import nutzapService from '../../services/nutzap/nutzapService';
import { useNutzap } from '../../hooks/useNutzap';

interface ReceiveModalProps {
  visible: boolean;
  onClose: () => void;
  currentBalance: number;
  userNpub?: string;
}

type ReceiveMethod = 'lightning' | 'cashu';

export const ReceiveModal: React.FC<ReceiveModalProps> = ({
  visible,
  onClose,
  currentBalance,
  userNpub,
}) => {
  const { refreshBalance, isInitialized, isLoading } = useNutzap(true);
  const [receiveMethod, setReceiveMethod] = useState<ReceiveMethod>('lightning');
  const [amount, setAmount] = useState('');
  const [invoice, setInvoice] = useState('');
  const [quoteHash, setQuoteHash] = useState('');
  const [cashuToken, setCashuToken] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const checkIntervalRef = React.useRef<NodeJS.Timeout>();

  const handleGenerateLightningInvoice = async () => {
    const sats = parseInt(amount);
    if (isNaN(sats) || sats <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount in sats.');
      return;
    }

    if (!isInitialized) {
      Alert.alert('Wallet Not Ready', 'Please wait for wallet to initialize and try again.');
      return;
    }

    setIsGenerating(true);
    try {
      const { pr, hash } = await nutzapService.createLightningInvoice(sats);
      setInvoice(pr);
      setQuoteHash(hash);

      // Start polling for payment
      setIsCheckingPayment(true);
      checkIntervalRef.current = setInterval(async () => {
        const paid = await nutzapService.checkInvoicePaid(hash);
        if (paid) {
          clearInterval(checkIntervalRef.current!);
          setIsCheckingPayment(false);
          await refreshBalance();
          Alert.alert(
            'Payment Received!',
            `${sats} sats have been added to your wallet`,
            [{ text: 'OK', onPress: handleClose }]
          );
        }
      }, 2000);

      // Stop checking after 10 minutes
      setTimeout(() => {
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          setIsCheckingPayment(false);
        }
      }, 600000);
    } catch (error) {
      console.error('Generate invoice error:', error);
      let errorMessage = 'Failed to generate invoice. Please try again.';

      if (error instanceof Error) {
        errorMessage = error.message;

        // Provide helpful instructions for common errors
        if (error.message.includes('initialize')) {
          errorMessage = 'Wallet is initializing. Please wait a moment and try again.';
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        }
      }

      Alert.alert('Invoice Generation Failed', errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReceiveCashuToken = async () => {
    if (!cashuToken) {
      Alert.alert('Invalid Token', 'Please enter or paste an e-cash token.');
      return;
    }

    setIsReceiving(true);
    try {
      const result = await nutzapService.receiveCashuToken(cashuToken);

      if (result.amount > 0) {
        await refreshBalance();
        Alert.alert(
          'Token Received!',
          `${result.amount} sats have been added to your wallet`,
          [{ text: 'OK', onPress: handleClose }]
        );
      } else {
        Alert.alert(
          'Receive Failed',
          result.error || 'Failed to receive token. It may have already been claimed.',
        );
      }
    } catch (error) {
      console.error('Receive token error:', error);
      Alert.alert('Error', 'Failed to receive token. Please try again.');
    } finally {
      setIsReceiving(false);
    }
  };

  const handlePasteToken = async () => {
    const text = await Clipboard.getStringAsync();
    if (text && text.startsWith('cashuA')) {
      setCashuToken(text);
    } else {
      Alert.alert('Invalid Token', 'Please copy a valid e-cash token first.');
    }
  };

  const handleCopyInvoice = async () => {
    await Clipboard.setStringAsync(invoice);
    Alert.alert('Copied!', 'Lightning invoice copied to clipboard');
  };

  const handleCopyNpub = async () => {
    if (userNpub) {
      await Clipboard.setStringAsync(userNpub);
      Alert.alert('Copied!', 'Your npub has been copied to clipboard');
    }
  };

  const handleClose = () => {
    setAmount('');
    setInvoice('');
    setQuoteHash('');
    setCashuToken('');
    setReceiveMethod('lightning');
    setIsCheckingPayment(false);
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }
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
          <Text style={styles.title}>Receive</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Balance Display */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Current Balance</Text>
            <Text style={styles.balanceAmount}>
              {currentBalance.toLocaleString()} sats
            </Text>
          </View>

          {/* Receive Method Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, receiveMethod === 'lightning' && styles.tabActive]}
              onPress={() => setReceiveMethod('lightning')}
            >
              <Text style={[styles.tabText, receiveMethod === 'lightning' && styles.tabTextActive]}>
                Lightning
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, receiveMethod === 'cashu' && styles.tabActive]}
              onPress={() => setReceiveMethod('cashu')}
            >
              <Text style={[styles.tabText, receiveMethod === 'cashu' && styles.tabTextActive]}>
                E-cash
              </Text>
            </TouchableOpacity>
          </View>

          {/* Lightning Invoice */}
          {receiveMethod === 'lightning' && (
            <>
              {!invoice ? (
                <>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Amount to Receive</Text>
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

                  <TouchableOpacity
                    style={[styles.primaryButton, (isGenerating || !amount || !isInitialized || isLoading) && styles.buttonDisabled]}
                    onPress={handleGenerateLightningInvoice}
                    disabled={isGenerating || !amount || !isInitialized || isLoading}
                  >
                    {isGenerating || (isLoading && !isInitialized) ? (
                      <ActivityIndicator color={theme.colors.accentText} />
                    ) : (
                      <>
                        <Ionicons name="flash" size={20} color={theme.colors.accentText} />
                        <Text style={styles.primaryButtonText}>
                          {!isInitialized ? 'Initializing...' : 'Generate Invoice'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Lightning Invoice</Text>
                    <Text style={styles.amountDisplay}>{amount} sats</Text>

                    <View style={styles.qrContainer}>
                      <QRCode
                        value={invoice}
                        size={200}
                        color={theme.colors.text}
                        backgroundColor={theme.colors.cardBackground}
                      />
                    </View>

                    <View style={styles.invoiceContainer}>
                      <Text style={styles.invoiceText} numberOfLines={3}>
                        {invoice}
                      </Text>
                      <TouchableOpacity style={styles.copyButton} onPress={handleCopyInvoice}>
                        <Ionicons name="copy" size={20} color={theme.colors.accent} />
                      </TouchableOpacity>
                    </View>

                    {isCheckingPayment && (
                      <View style={styles.checkingPayment}>
                        <ActivityIndicator size="small" color={theme.colors.accent} />
                        <Text style={styles.checkingText}>Checking for payment...</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => {
                      setInvoice('');
                      setQuoteHash('');
                      setAmount('');
                      if (checkIntervalRef.current) {
                        clearInterval(checkIntervalRef.current);
                      }
                      setIsCheckingPayment(false);
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>Generate New Invoice</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}

          {/* E-cash Token */}
          {receiveMethod === 'cashu' && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Paste Token</Text>
                <View style={styles.tokenInputContainer}>
                  <TextInput
                    style={styles.tokenInput}
                    value={cashuToken}
                    onChangeText={setCashuToken}
                    placeholder="cashuA..."
                    placeholderTextColor={theme.colors.textMuted}
                    multiline
                  />
                  <TouchableOpacity style={styles.pasteButton} onPress={handlePasteToken}>
                    <Ionicons name="clipboard" size={20} color={theme.colors.accent} />
                    <Text style={styles.pasteButtonText}>Paste</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, (isReceiving || !cashuToken) && styles.buttonDisabled]}
                onPress={handleReceiveCashuToken}
                disabled={isReceiving || !cashuToken}
              >
                {isReceiving ? (
                  <ActivityIndicator color={theme.colors.accentText} />
                ) : (
                  <>
                    <Ionicons name="download" size={20} color={theme.colors.accentText} />
                    <Text style={styles.primaryButtonText}>Receive Token</Text>
                  </>
                )}
              </TouchableOpacity>
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

  amountDisplay: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },

  unitText: {
    fontSize: 16,
    color: theme.colors.textMuted,
    marginLeft: 8,
  },

  // QR and Invoice
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
  },

  invoiceText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: 'monospace',
  },

  npubContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    padding: 12,
  },

  npubText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: 'monospace',
  },

  // Token input
  tokenInputContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    padding: 12,
  },

  tokenInput: {
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
  },

  pasteButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.accent,
  },

  copyButton: {
    padding: 8,
  },

  // Payment checking
  checkingPayment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  checkingText: {
    fontSize: 13,
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.medium,
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

  // Info
  infoCard: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: theme.colors.cardBackground + '60',
    borderRadius: theme.borderRadius.medium,
    padding: 12,
    marginTop: 16,
  },

  infoText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
});