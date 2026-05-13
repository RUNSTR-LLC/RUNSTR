/**
 * PPQCreditTopupModal - Top up PPQ.AI credits with Lightning
 *
 * Modal for manually adding AI credits when PPQ.AI is selected as the user's team.
 * Similar UX to ExternalZapModal but generates PPQ.AI topup invoices instead.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { theme } from '../../styles/theme';
import { PPQAccountService } from '../../services/ai/PPQAccountService';
import { NWCStorageService } from '../../services/wallet/NWCStorageService';
import { NWCWalletService } from '../../services/wallet/NWCWalletService';
import { openInCashApp } from '../../utils/walletDeepLinks';
import { getInvoiceTimeRemaining } from '../../utils/bolt11Parser';

// Amount presets (same as ExternalZapModal)
const AMOUNT_PRESETS = [1000, 2100, 5000, 10000];

interface PPQCreditTopupModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PPQCreditTopupModal: React.FC<PPQCreditTopupModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  // Balance state
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Amount selection state
  const [selectedAmount, setSelectedAmount] = useState<number>(AMOUNT_PRESETS[1]); // 2100 default
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(false);

  // Invoice state
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoice, setInvoice] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  // NWC wallet state
  const [hasNWCWallet, setHasNWCWallet] = useState(false);
  const [isNWCPaying, setIsNWCPaying] = useState(false);
  const [nwcError, setNwcError] = useState<string | null>(null);

  // Account state
  const [hasAccount, setHasAccount] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string>('');

  // Check account and load balance on mount
  useEffect(() => {
    if (visible) {
      checkAccountAndLoadBalance();
      // Reset to amount selection view
      setShowInvoice(false);
      setInvoice('');
      setError('');
      setIsExpired(false);
      setTimeRemaining(null);
      setCustomAmount('');
      setIsCustom(false);
      // Check NWC wallet
      setIsNWCPaying(false);
      setNwcError(null);
      NWCStorageService.hasNWC().then(setHasNWCWallet);
    }
  }, [visible]);

  // Countdown timer for invoice expiry
  useEffect(() => {
    if (!invoice || !visible) {
      setTimeRemaining(null);
      return;
    }

    const remaining = getInvoiceTimeRemaining(invoice);
    setTimeRemaining(remaining);

    if (remaining !== null && remaining <= 0) {
      setIsExpired(true);
      return;
    }

    const interval = setInterval(() => {
      const newRemaining = getInvoiceTimeRemaining(invoice);
      setTimeRemaining(newRemaining);

      if (newRemaining !== null && newRemaining <= 0) {
        setIsExpired(true);
        clearInterval(interval);
        // Auto-regenerate invoice after 2 seconds
        setTimeout(() => {
          generateInvoice();
        }, 2000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [invoice, visible]);

  const checkAccountAndLoadBalance = async () => {
    setIsLoadingBalance(true);
    try {
      const accountExists = await PPQAccountService.hasAccount();
      setHasAccount(accountExists);

      if (accountExists) {
        const result = await PPQAccountService.getBalance();
        if (result.success) {
          setBalance(result.balance ?? 0);
        }
      }
    } catch (err) {
      console.error('[PPQTopup] Error checking account:', err);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Get the effective amount (selected preset or custom)
  const getEffectiveAmount = (): number => {
    if (isCustom && customAmount) {
      const parsed = parseInt(customAmount, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return selectedAmount;
  };

  // Handle preset amount selection
  const handlePresetSelect = (amount: number) => {
    setSelectedAmount(amount);
    setIsCustom(false);
    setCustomAmount('');
  };

  // Handle custom amount change
  const handleCustomAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setCustomAmount(cleaned);
    setIsCustom(true);
  };

  // Proceed to payment - generate invoice
  const handleProceedToPayment = async () => {
    const amount = getEffectiveAmount();
    if (amount <= 0) {
      setError('Please select a valid amount');
      return;
    }

    setShowInvoice(true);
    generateInvoice();
  };

  // Generate PPQ.AI topup invoice
  const generateInvoice = async () => {
    const amount = getEffectiveAmount();
    console.log('[PPQTopup] Generating invoice for', amount, 'sats');

    setIsLoading(true);
    setError('');
    setIsExpired(false);
    setInvoice('');
    setTimeRemaining(null);

    try {
      const result = await PPQAccountService.createTopupInvoice(amount);

      if (result.success && result.bolt11) {
        setInvoice(result.bolt11);
        console.log('[PPQTopup] Invoice generated successfully');
      } else {
        throw new Error(result.error || 'Failed to generate invoice');
      }
    } catch (err) {
      console.error('[PPQTopup] Error generating invoice:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyInvoice = async () => {
    if (invoice) {
      await Clipboard.setStringAsync(invoice);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenInCashApp = async () => {
    await openInCashApp(invoice);
  };

  const handleBackToAmountSelection = () => {
    setShowInvoice(false);
    setInvoice('');
    setError('');
  };

  const handleNWCPayment = async () => {
    if (!invoice) return;
    setIsNWCPaying(true);
    setNwcError(null);
    try {
      const result = await NWCWalletService.sendPayment(invoice);
      if (result.success) {
        console.log('[PPQTopup] NWC payment successful');
        setIsNWCPaying(false);
        handlePaymentConfirmed();
      } else {
        setNwcError(result.error || 'Payment failed');
        setIsNWCPaying(false);
      }
    } catch (err) {
      console.error('[PPQTopup] NWC payment error:', err);
      setNwcError(err instanceof Error ? err.message : 'Payment failed');
      setIsNWCPaying(false);
    }
  };

  const handlePaymentConfirmed = async () => {
    const paidAmount = getEffectiveAmount();

    // Refresh balance to verify payment
    const result = await PPQAccountService.getBalance();
    if (result.success) {
      setBalance(result.balance ?? 0);
    }

    Alert.alert(
      'Credits Added!',
      `${paidAmount} sats have been added to your PPQ.AI balance.`,
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
  };

  const effectiveAmount = getEffectiveAmount();

  // Handle inline account creation
  const [isAccountServerError, setIsAccountServerError] = useState(false);
  const handleCreateAccount = async () => {
    setIsCreatingAccount(true);
    setAccountError('');
    setIsAccountServerError(false);
    try {
      const result = await PPQAccountService.createAccount();
      if (result.success) {
        setHasAccount(true);
        Toast.show({
          type: 'success',
          text1: 'Account Created',
          text2: 'Your PPQ.AI account is ready',
          position: 'top',
          visibilityTime: 2500,
        });
        const balanceResult = await PPQAccountService.getBalance();
        if (balanceResult.success) {
          setBalance(balanceResult.balance ?? 0);
        }
      } else {
        setAccountError(result.error || 'Failed to create account');
        setIsAccountServerError(result.isServerError ?? false);
      }
    } catch (err) {
      console.error('[PPQTopup] Account creation error:', err);
      setAccountError('Failed to create account. Please try again.');
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleOpenPPQWebsite = () => {
    Linking.openURL('https://ppq.ai');
  };

  // If no account, show inline setup
  if (visible && !hasAccount && !isLoadingBalance) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <Ionicons name="sparkles" size={24} color={theme.colors.accent} />
                <Text style={styles.title}>Set Up AI Credits</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.setupPrompt}>
              <Ionicons name="sparkles" size={48} color={theme.colors.accent} />
              <Text style={styles.setupPromptText}>
                Create a PPQ.AI account to earn AI credits for Coach RUNSTR instead of sats.
              </Text>
            </View>

            {accountError ? (
              <View style={styles.accountErrorBanner}>
                <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.accountErrorText}>{accountError}</Text>
                  {isAccountServerError && (
                    <Text style={styles.accountErrorHint}>
                      Create an account at ppq.ai and enter your credentials manually.
                    </Text>
                  )}
                </View>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.createAccountButton, isCreatingAccount && styles.proceedButtonDisabled]}
              onPress={handleCreateAccount}
              disabled={isCreatingAccount}
            >
              {isCreatingAccount ? (
                <ActivityIndicator size="small" color={theme.colors.background} />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color={theme.colors.background} />
                  <Text style={styles.createAccountButtonText}>
                    {accountError ? 'Retry' : 'Create Account'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {isAccountServerError && (
              <TouchableOpacity style={styles.websiteFallback} onPress={handleOpenPPQWebsite}>
                <Ionicons name="globe-outline" size={18} color={theme.colors.accent} />
                <Text style={styles.websiteFallbackText}>Create account at ppq.ai</Text>
                <Ionicons name="open-outline" size={14} color={theme.colors.accent} />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.closeModalButton} onPress={onClose}>
              <Text style={styles.closeModalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

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
            <View style={styles.titleContainer}>
              <Ionicons name="sparkles" size={24} color={theme.colors.accent} />
              <Text style={styles.title}>
                {showInvoice ? 'Pay with Wallet' : 'Top Up AI Credits'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Current Balance */}
            <View style={styles.balanceSection}>
              <Text style={styles.balanceLabel}>Current Balance</Text>
              {isLoadingBalance ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <Text style={styles.balanceValue}>
                  ${balance?.toFixed(2) ?? '0.00'}
                </Text>
              )}
              {showInvoice && (
                <Text style={styles.topupAmount}>{effectiveAmount} credits</Text>
              )}
            </View>

            {!showInvoice ? (
              /* Amount Selection View */
              <View style={styles.amountSection}>
                <Text style={styles.sectionTitle}>Select Amount</Text>

                {/* Preset Amount Buttons */}
                <View style={styles.presetGrid}>
                  {AMOUNT_PRESETS.map((amount) => (
                    <TouchableOpacity
                      key={amount}
                      style={[
                        styles.presetButton,
                        selectedAmount === amount && !isCustom && styles.presetButtonSelected,
                      ]}
                      onPress={() => handlePresetSelect(amount)}
                    >
                      <Text
                        style={[
                          styles.presetButtonText,
                          selectedAmount === amount && !isCustom && styles.presetButtonTextSelected,
                        ]}
                      >
                        {amount.toLocaleString()}
                      </Text>
                      <Text
                        style={[
                          styles.presetButtonSats,
                          selectedAmount === amount && !isCustom && styles.presetButtonTextSelected,
                        ]}
                      >
                        credits
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Custom Amount Input */}
                <View style={styles.customAmountContainer}>
                  <Text style={styles.customAmountLabel}>Custom amount:</Text>
                  <View style={styles.customInputRow}>
                    <TextInput
                      style={[
                        styles.customAmountInput,
                        isCustom && styles.customAmountInputActive,
                      ]}
                      placeholder="Enter amount"
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="number-pad"
                      value={customAmount}
                      onChangeText={handleCustomAmountChange}
                    />
                    <Text style={styles.satsLabel}>credits</Text>
                  </View>
                </View>

                {/* Error Display */}
                {error && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
                    <Text style={styles.errorBannerText}>{error}</Text>
                  </View>
                )}

                {/* Proceed Button */}
                <TouchableOpacity
                  style={[
                    styles.proceedButton,
                    effectiveAmount <= 0 && styles.proceedButtonDisabled,
                  ]}
                  onPress={handleProceedToPayment}
                  disabled={effectiveAmount <= 0}
                >
                  <Text style={styles.proceedButtonText}>
                    Continue with {effectiveAmount > 0 ? effectiveAmount.toLocaleString() : '0'} credits
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color={theme.colors.background} />
                </TouchableOpacity>
              </View>
            ) : (
              /* Payment Options View */
              <View style={styles.paymentSection}>
                {error ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={generateInvoice}>
                      <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.backButton} onPress={handleBackToAmountSelection}>
                      <Text style={styles.backButtonText}>Change Amount</Text>
                    </TouchableOpacity>
                  </View>
                ) : isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.accent} />
                    <Text style={styles.loadingText}>Generating invoice...</Text>
                  </View>
                ) : invoice ? (
                  <>
                    {/* Expiration Timer */}
                    {timeRemaining !== null && timeRemaining < 300 && (
                      <View style={styles.timerContainer}>
                        {isExpired ? (
                          <View style={styles.expiredBanner}>
                            <Ionicons name="time-outline" size={16} color={theme.colors.error} />
                            <Text style={styles.expiredText}>Invoice Expired - Regenerating...</Text>
                          </View>
                        ) : (
                          <View style={[styles.timerBanner, timeRemaining < 60 && styles.timerBannerUrgent]}>
                            <Ionicons
                              name="time-outline"
                              size={16}
                              color={timeRemaining < 60 ? theme.colors.error : theme.colors.orangeBright}
                            />
                            <Text style={[styles.timerText, timeRemaining < 60 && styles.timerTextUrgent]}>
                              Expires in {Math.floor(timeRemaining / 60)}:
                              {String(timeRemaining % 60).padStart(2, '0')}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* NWC Connected Wallet Payment */}
                    {hasNWCWallet && (
                      <View style={styles.walletButtonsSection}>
                        <Text style={styles.walletSectionTitle}>Connected Wallet</Text>
                        <TouchableOpacity
                          style={[styles.walletButtonFullWidth, { borderColor: theme.colors.text }]}
                          onPress={handleNWCPayment}
                          disabled={isNWCPaying}
                        >
                          {isNWCPaying ? (
                            <ActivityIndicator size="small" color={theme.colors.accent} style={{ marginRight: 8 }} />
                          ) : (
                            <View style={styles.walletIconCircleInline}>
                              <Ionicons name="wallet" size={24} color={theme.colors.accent} />
                            </View>
                          )}
                          <Text style={styles.walletButtonText}>
                            {isNWCPaying ? 'Paying...' : 'Pay with Connected Wallet'}
                          </Text>
                        </TouchableOpacity>
                        {nwcError && (
                          <Text style={{ fontSize: 12, color: theme.colors.error, textAlign: 'center', marginTop: 4 }}>
                            {nwcError}
                          </Text>
                        )}
                      </View>
                    )}

                    {/* External Wallets */}
                    <View style={styles.walletButtonsSection}>
                      <Text style={styles.walletSectionTitle}>Open in Wallet</Text>
                      <TouchableOpacity style={styles.walletButtonFullWidth} onPress={handleOpenInCashApp}>
                        <View style={styles.walletIconCircleInline}>
                          <Ionicons name="logo-usd" size={24} color={theme.colors.accent} />
                        </View>
                        <Text style={styles.walletButtonText}>Cash App</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Copy Options */}
                    <View style={styles.copySection}>
                      <TouchableOpacity style={styles.copyButton} onPress={handleCopyInvoice}>
                        <Ionicons name={copied ? 'checkmark' : 'copy'} size={20} color={theme.colors.text} />
                        <Text style={styles.copyButtonText}>{copied ? 'Copied!' : 'Copy Invoice'}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Back Button */}
                    <TouchableOpacity style={styles.backButton} onPress={handleBackToAmountSelection}>
                      <Ionicons name="arrow-back" size={18} color={theme.colors.textMuted} />
                      <Text style={styles.backButtonText}>Change Amount</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            )}
          </ScrollView>

          {/* Footer - Payment Confirmation */}
          {showInvoice && invoice && !isLoading && (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.confirmButton} onPress={handlePaymentConfirmed}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.background} />
                <Text style={styles.confirmButtonText}>I've Paid</Text>
              </TouchableOpacity>
            </View>
          )}
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
    maxHeight: '90%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.large,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
  scrollContent: {
    flexGrow: 1,
    flexShrink: 1,
  },
  balanceSection: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  balanceLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
  },
  topupAmount: {
    fontSize: 16,
    color: theme.colors.text,
    marginTop: 4,
  },
  amountSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  presetButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  presetButtonSelected: {
    borderColor: theme.colors.text,
    backgroundColor: 'rgba(255, 157, 66, 0.15)',
  },
  presetButtonText: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  presetButtonTextSelected: {
    color: theme.colors.accent,
  },
  presetButtonSats: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  customAmountContainer: {
    marginBottom: 16,
  },
  customAmountLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customAmountInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 2,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    fontSize: 16,
  },
  customAmountInputActive: {
    borderColor: theme.colors.text,
  },
  satsLabel: {
    fontSize: 16,
    color: theme.colors.textMuted,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.error,
    marginBottom: 16,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.error,
  },
  proceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.text,
  },
  proceedButtonDisabled: {
    opacity: 0.5,
  },
  proceedButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.background,
  },
  paymentSection: {
    padding: 20,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  errorContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.error,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  timerContainer: {
    marginBottom: 16,
  },
  timerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 157, 66, 0.1)',
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.orangeBright,
  },
  timerBannerUrgent: {
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    borderColor: theme.colors.error,
  },
  timerText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.orangeBright,
  },
  timerTextUrgent: {
    color: theme.colors.error,
  },
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  expiredText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.error,
  },
  walletButtonsSection: {
    marginBottom: 16,
  },
  walletSectionTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  walletButtonFullWidth: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 14,
    marginBottom: 10,
  },
  walletIconCircleInline: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 157, 66, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletButtonText: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  copySection: {
    gap: 10,
    marginBottom: 8,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.success,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.background,
  },
  // Setup prompt styles
  setupPrompt: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  setupPromptText: {
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  setupPromptSubtext: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  createAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.text,
  },
  createAccountButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.background,
  },
  accountErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  accountErrorText: {
    fontSize: 14,
    color: theme.colors.error,
  },
  accountErrorHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
  websiteFallback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: 'rgba(255, 157, 66, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 157, 66, 0.3)',
    gap: 8,
  },
  websiteFallbackText: {
    fontSize: 14,
    color: theme.colors.accent,
    fontWeight: '500',
  },
  closeModalButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  closeModalButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
});

export default PPQCreditTopupModal;
