/**
 * CoinOSWalletModal - In-app mini Bitcoin wallet
 *
 * Shows balance, receive (Lightning address + QR), and send functionality.
 * Unique to CoinOS — PPQ has a topup modal, CoinOS has a full wallet.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import Toast from 'react-native-toast-message';
import { theme } from '../../styles/theme';
import { CoinOSAccountService } from '../../services/wallet/CoinOSAccountService';
import { getInvoiceFromLightningAddress } from '../../utils/lnurl';

interface CoinOSWalletModalProps {
  visible: boolean;
  onClose: () => void;
}

type TabType = 'receive' | 'send';

export const CoinOSWalletModal: React.FC<CoinOSWalletModalProps> = ({
  visible,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('receive');
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [lightningAddress, setLightningAddress] = useState<string | null>(null);

  // Receive state
  const [receiveAmount, setReceiveAmount] = useState('');
  const [receiveInvoice, setReceiveInvoice] = useState('');
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [receiveError, setReceiveError] = useState<string | null>(null);

  // Send state
  const [sendTarget, setSendTarget] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const loadWalletData = useCallback(async () => {
    setIsLoadingBalance(true);
    try {
      const [addr, balanceResult] = await Promise.all([
        CoinOSAccountService.getLightningAddress(),
        CoinOSAccountService.getBalance(),
      ]);
      setLightningAddress(addr);
      if (balanceResult.success) {
        setBalance(balanceResult.balance ?? 0);
      }
    } catch (error) {
      console.error('[CoinOSWallet] Error loading wallet data:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadWalletData();
      setReceiveAmount('');
      setReceiveInvoice('');
      setReceiveError(null);
      setSendTarget('');
      setSendAmount('');
      setSendError(null);
    }
  }, [visible, loadWalletData]);

  const handleCopyAddress = async () => {
    if (lightningAddress) {
      await Clipboard.setStringAsync(lightningAddress);
      Toast.show({
        type: 'success',
        text1: 'Copied!',
        text2: 'Lightning address copied to clipboard',
        position: 'top',
        visibilityTime: 2000,
      });
    }
  };

  const handleCreateInvoice = async () => {
    const sats = parseInt(receiveAmount, 10);
    if (isNaN(sats) || sats <= 0) {
      setReceiveError('Enter a valid amount');
      return;
    }

    setIsGeneratingInvoice(true);
    setReceiveError(null);
    try {
      console.log('[CoinOSWallet] Creating invoice for', sats, 'sats...');
      const result = await CoinOSAccountService.createInvoice(sats, 'RUNSTR receive');
      console.log('[CoinOSWallet] Invoice result:', JSON.stringify(result));
      if (result.success && result.bolt11) {
        setReceiveInvoice(result.bolt11);
      } else {
        setReceiveError(result.error || 'Could not create invoice');
      }
    } catch (error) {
      console.error('[CoinOSWallet] Create invoice error:', error);
      setReceiveError(error instanceof Error ? error.message : 'Could not create invoice');
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleCopyInvoice = async () => {
    if (receiveInvoice) {
      await Clipboard.setStringAsync(receiveInvoice);
      Toast.show({
        type: 'success',
        text1: 'Copied!',
        text2: 'Lightning invoice copied to clipboard',
        position: 'top',
        visibilityTime: 2000,
      });
    }
  };

  const handleSend = async () => {
    if (!sendTarget.trim()) {
      setSendError('Enter a Lightning address or invoice');
      return;
    }

    setIsSending(true);
    setSendError(null);

    try {
      let payreq = sendTarget.trim();
      const amountSats = parseInt(sendAmount, 10);

      // If it looks like a Lightning address, resolve to invoice
      if (payreq.includes('@') && !payreq.startsWith('ln')) {
        if (!amountSats || amountSats <= 0) {
          setSendError('Enter an amount in sats');
          setIsSending(false);
          return;
        }
        const { invoice } = await getInvoiceFromLightningAddress(payreq, amountSats);
        payreq = invoice;
      }

      const result = await CoinOSAccountService.sendPayment(payreq, amountSats || undefined);

      if (result.success) {
        Toast.show({
          type: 'reward',
          text1: 'Payment Sent!',
          text2: amountSats ? `${amountSats} sats sent` : 'Payment sent successfully',
          position: 'top',
          visibilityTime: 3000,
        });
        setSendTarget('');
        setSendAmount('');
        // Refresh balance
        loadWalletData();
      } else {
        setSendError(result.error || 'Payment failed');
      }
    } catch (error) {
      console.error('[CoinOSWallet] Send error:', error);
      setSendError(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="wallet-outline" size={24} color={theme.colors.text} />
            <Text style={styles.title}>Bitcoin Wallet</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Balance */}
          <View style={styles.balanceSection}>
            {isLoadingBalance ? (
              <ActivityIndicator size="small" color={theme.colors.textMuted} />
            ) : (
              <Text style={styles.balanceText}>
                {balance !== null ? balance.toLocaleString() : '--'} sats
              </Text>
            )}
            <TouchableOpacity onPress={loadWalletData} style={styles.refreshButton}>
              <Ionicons name="refresh-outline" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Tab Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'receive' && styles.activeTab]}
              onPress={() => {
                setActiveTab('receive');
                setReceiveAmount('');
                setReceiveInvoice('');
                setReceiveError(null);
              }}
            >
              <Text style={[styles.tabText, activeTab === 'receive' && styles.activeTabText]}>
                Receive
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'send' && styles.activeTab]}
              onPress={() => {
                setActiveTab('send');
                setReceiveAmount('');
                setReceiveInvoice('');
                setReceiveError(null);
              }}
            >
              <Text style={[styles.tabText, activeTab === 'send' && styles.activeTabText]}>
                Send
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.tabContentInner}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'receive' ? (
              <>
                {/* Lightning Address */}
                <TouchableOpacity
                  style={styles.addressRow}
                  onPress={handleCopyAddress}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addressLabel}>Lightning Address</Text>
                  <View style={styles.addressValueRow}>
                    <Text style={styles.addressValue} numberOfLines={1}>
                      {lightningAddress || '--'}
                    </Text>
                    <Ionicons name="copy-outline" size={16} color={theme.colors.textMuted} />
                  </View>
                </TouchableOpacity>

                {!receiveInvoice ? (
                  <>
                    {/* Amount Input */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Amount to receive (sats)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0"
                        placeholderTextColor={theme.colors.textMuted}
                        value={receiveAmount}
                        onChangeText={setReceiveAmount}
                        keyboardType="numeric"
                        editable={!isGeneratingInvoice}
                      />
                    </View>

                    {/* Create Invoice Button */}
                    <TouchableOpacity
                      style={[
                        styles.sendButton,
                        (!receiveAmount.trim() || isGeneratingInvoice) && styles.buttonDisabled,
                      ]}
                      onPress={handleCreateInvoice}
                      disabled={!receiveAmount.trim() || isGeneratingInvoice}
                    >
                      {isGeneratingInvoice ? (
                        <ActivityIndicator size="small" color="#000" />
                      ) : (
                        <>
                          <Ionicons name="flash" size={18} color="#000" style={styles.sendIcon} />
                          <Text style={styles.sendButtonText}>Create Invoice</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {/* Receive Error */}
                    {receiveError && (
                      <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={16} color="#FF6B00" />
                        <Text style={styles.errorText}>{receiveError}</Text>
                      </View>
                    )}

                    <Text style={[styles.receiveHint, { marginTop: 16 }]}>
                      Create a Lightning invoice for a specific amount, or share your address above.
                    </Text>
                  </>
                ) : (
                  <>
                    {/* Invoice Generated State */}
                    <Text style={styles.invoiceAmountDisplay}>
                      {parseInt(receiveAmount, 10).toLocaleString()} sats
                    </Text>

                    {/* QR Code of bolt11 invoice */}
                    <View style={styles.qrContainer}>
                      <QRCode
                        value={receiveInvoice}
                        size={180}
                        backgroundColor="#0a0a0a"
                        color="#FFB366"
                      />
                    </View>

                    {/* Invoice text + copy */}
                    <TouchableOpacity
                      style={styles.invoiceRow}
                      onPress={handleCopyInvoice}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.invoiceText} numberOfLines={2}>
                        {receiveInvoice}
                      </Text>
                      <Ionicons name="copy-outline" size={16} color={theme.colors.textMuted} />
                    </TouchableOpacity>

                    {/* New Invoice Button */}
                    <TouchableOpacity
                      style={styles.newInvoiceButton}
                      onPress={() => {
                        setReceiveInvoice('');
                        setReceiveAmount('');
                      }}
                    >
                      <Text style={styles.newInvoiceButtonText}>New Invoice</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            ) : (
              <>
                {/* Send Target */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Lightning address or invoice</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="user@wallet.com or lnbc1..."
                    placeholderTextColor={theme.colors.textMuted}
                    value={sendTarget}
                    onChangeText={setSendTarget}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSending}
                  />
                </View>

                {/* Amount */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Amount (sats)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                    value={sendAmount}
                    onChangeText={setSendAmount}
                    keyboardType="numeric"
                    editable={!isSending}
                  />
                </View>

                {/* Send Button */}
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!sendTarget.trim() || isSending) && styles.buttonDisabled,
                  ]}
                  onPress={handleSend}
                  disabled={!sendTarget.trim() || isSending}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <>
                      <Ionicons name="send" size={18} color="#000" style={styles.sendIcon} />
                      <Text style={styles.sendButtonText}>Send</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Send Error */}
                {sendError && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color="#FF6B00" />
                    <Text style={styles.errorText}>{sendError}</Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  balanceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  balanceText: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
  },
  refreshButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginBottom: 20,
    padding: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#2a2a2a',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  activeTabText: {
    color: theme.colors.text,
  },
  tabContent: {
    flexShrink: 1,
  },
  tabContentInner: {
    paddingBottom: 8,
  },
  addressRow: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  addressLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  addressValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: 'monospace',
    flex: 1,
    marginRight: 8,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
  },
  receiveHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  invoiceAmountDisplay: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  invoiceText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: 'monospace',
  },
  newInvoiceButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 10,
  },
  newInvoiceButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  inputContainer: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: theme.colors.text,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.text,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 4,
    minHeight: 48,
  },
  sendIcon: {
    marginRight: 8,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a1a1a',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#FF6B00',
    marginLeft: 8,
    flex: 1,
  },
});

export default CoinOSWalletModal;
