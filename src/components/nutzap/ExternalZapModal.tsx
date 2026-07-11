/**
 * ExternalZapModal Component
 * Generates and displays Lightning invoice for donations
 * Allows users to pay from external wallets (Cash App, Strike, etc.)
 * For charity donations: Gets invoice directly from charity's Lightning address
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
  ScrollView,
  TextInput,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { getInvoiceFromLightningAddress } from '../../utils/lnurl';
import { npubToHex } from '../../utils/ndkConversion';
import {
  validateInvoiceAmount,
  getInvoiceTimeRemaining,
} from '../../utils/bolt11Parser';
import { openInCashApp } from '../../utils/walletDeepLinks';
import { DonationTrackingService } from '../../services/donation/DonationTrackingService';
import { NWCStorageService } from '../../services/wallet/NWCStorageService';
import { NWCWalletService } from '../../services/wallet/NWCWalletService';
import { DEFAULT_ZAP_AMOUNT_KEY } from '../../constants/zap';

// Amount presets (higher minimums to avoid charity LNURL minimum errors)
const AMOUNT_PRESETS = [1000, 2100, 5000, 10000];

interface ExternalZapModalProps {
  visible: boolean;
  recipientNpub: string; // Can be npub OR Lightning address
  recipientName: string;
  amount?: number; // Optional - if not provided, user selects amount
  memo?: string; // Optional - will default to "RUNSTR Community Rewards"
  onClose: () => void;
  onSuccess?: (amountSats: number) => void;
  // Charity donation mode - pays charity directly, records donation locally
  isCharityDonation?: boolean;
  charityId?: string;
  charityLightningAddress?: string;
}

export const ExternalZapModal: React.FC<ExternalZapModalProps> = ({
  visible,
  recipientNpub,
  recipientName,
  amount: initialAmount,
  memo,
  onClose,
  onSuccess,
  isCharityDonation = false,
  charityId,
  charityLightningAddress,
}) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(
    initialAmount || AMOUNT_PRESETS[0]
  );
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [invoice, setInvoice] = useState<string>('');
  const [lightningAddress, setLightningAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [copiedLnAddress, setCopiedLnAddress] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  // NWC wallet state
  const [hasNWCWallet, setHasNWCWallet] = useState(false);
  const [isNWCPaying, setIsNWCPaying] = useState(false);
  const [nwcError, setNwcError] = useState<string | null>(null);

  // Convert npub to hex for API calls (skip for Lightning addresses)
  const recipientHex = React.useMemo(() => {
    // Guard against undefined/null recipientNpub (e.g., PPQ.AI team has no Lightning address)
    if (!recipientNpub) {
      console.warn('[ExternalZapModal] No recipient provided');
      return '';
    }

    // If it's a Lightning address, don't try to convert it
    if (recipientNpub.includes('@')) {
      console.log(
        '[ExternalZapModal] Lightning address detected, skipping npub conversion'
      );
      return recipientNpub;
    }

    // Try to convert npub to hex
    const normalized = npubToHex(recipientNpub);
    if (!normalized) {
      console.warn(
        '[ExternalZapModal] Invalid recipient pubkey:',
        recipientNpub.slice(0, 20)
      );
      return recipientNpub;
    }
    return normalized;
  }, [recipientNpub]);

  // Load default amount on mount
  useEffect(() => {
    const loadDefaultAmount = async () => {
      try {
        const stored = await AsyncStorage.getItem(DEFAULT_ZAP_AMOUNT_KEY);
        if (stored) {
          const defaultAmount = parseInt(stored, 10);
          if (!isNaN(defaultAmount) && defaultAmount > 0) {
            setSelectedAmount(defaultAmount);
          }
        }
      } catch (err) {
        console.log('[ExternalZapModal] Error loading default amount:', err);
      }
    };
    loadDefaultAmount();
  }, []);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      // Reset to amount selection view
      setShowInvoice(false);
      setInvoice('');
      setError('');
      setIsExpired(false);
      setTimeRemaining(null);
      setCustomAmount('');
      setIsCustom(false);

      // Reset NWC state
      setIsNWCPaying(false);
      setNwcError(null);
      NWCStorageService.hasNWC().then(setHasNWCWallet);

      // If initial amount provided, use it
      if (initialAmount && initialAmount > 0) {
        setSelectedAmount(initialAmount);
      }

      // Resolve lightning address
      resolveLightningAddress();
    }
  }, [visible, initialAmount]);

  // Countdown timer effect - updates every second
  useEffect(() => {
    if (!invoice || !visible) {
      setTimeRemaining(null);
      return;
    }

    // Initial time calculation
    const remaining = getInvoiceTimeRemaining(invoice);
    setTimeRemaining(remaining);

    if (remaining !== null && remaining <= 0) {
      setIsExpired(true);
      return;
    }

    // Update countdown every second
    const interval = setInterval(() => {
      const newRemaining = getInvoiceTimeRemaining(invoice);
      setTimeRemaining(newRemaining);

      if (newRemaining !== null && newRemaining <= 0) {
        setIsExpired(true);
        clearInterval(interval);

        // Auto-regenerate invoice after 2 seconds
        setTimeout(() => {
          console.log('[ExternalZapModal] Invoice expired, regenerating...');
          generateInvoice();
        }, 2000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [invoice, visible]);

  // Resolve lightning address from npub or use directly if already a lightning address
  const resolveLightningAddress = async () => {
    try {
      // Check if recipientNpub is actually a Lightning address (contains '@')
      if (recipientNpub && recipientNpub.includes('@')) {
        console.log(
          '[ExternalZapModal] ✅ Direct Lightning address provided:',
          recipientNpub
        );
        setLightningAddress(recipientNpub);
        return;
      }

      // It's an npub, need to fetch Lightning address from Nostr profile
      console.log(
        '[ExternalZapModal] Fetching Lightning address for npub:',
        recipientHex
      );
      const {
        GlobalNDKService,
      } = require('../../services/nostr/GlobalNDKService');
      const ndk = await GlobalNDKService.getInstance();
      const user = ndk.getUser({ pubkey: recipientHex });
      await user.fetchProfile();
      const lnAddress = user.profile?.lud16 || user.profile?.lud06 || null;

      if (lnAddress) {
        console.log(
          '[ExternalZapModal] ⚡ Lightning address found:',
          lnAddress
        );
        setLightningAddress(lnAddress);
      } else {
        console.warn('[ExternalZapModal] No Lightning address found for user');
      }
    } catch (err) {
      console.error(
        '[ExternalZapModal] Error resolving Lightning address:',
        err
      );
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
    // Only allow numbers
    const cleaned = text.replace(/[^0-9]/g, '');
    setCustomAmount(cleaned);
    setIsCustom(true);
  };

  // Save default amount and proceed to payment
  const handleProceedToPayment = async () => {
    const amount = getEffectiveAmount();
    if (amount <= 0) {
      setError('Please select a valid amount');
      return;
    }

    // Save as default if checked
    if (setAsDefault) {
      try {
        await AsyncStorage.setItem(DEFAULT_ZAP_AMOUNT_KEY, amount.toString());
        console.log('[ExternalZapModal] Saved default amount:', amount);
      } catch (err) {
        console.warn('[ExternalZapModal] Error saving default amount:', err);
      }
    }

    // Generate invoice and show payment options
    setShowInvoice(true);
    generateInvoice();
  };

  const generateInvoice = async () => {
    const amount = getEffectiveAmount();
    console.log('[ExternalZapModal] Starting invoice generation...', {
      recipientNpub,
      recipientName,
      amount,
      memo,
      isCharityDonation,
    });

    setIsLoading(true);
    setError('');
    setIsExpired(false);
    setInvoice('');
    setTimeRemaining(null);

    try {
      // For charity donations, get invoice directly from charity's Lightning address
      if (isCharityDonation && charityLightningAddress) {
        console.log('[ExternalZapModal] 🔄 Getting invoice directly from charity:', charityLightningAddress);

        const invoiceResult = await getInvoiceFromLightningAddress(
          charityLightningAddress,
          amount,
          memo || `RUNSTR Donation to ${recipientName}`
        );

        if (!invoiceResult || !invoiceResult.invoice) {
          throw new Error('Failed to get invoice from charity');
        }

        // Validate invoice amount matches requested amount
        console.log('[ExternalZapModal] Validating invoice amount...');
        const amountValid = validateInvoiceAmount(invoiceResult.invoice, amount);

        if (!amountValid) {
          const errorMsg = `Invoice amount mismatch! Expected ${amount} rewards. Please try again.`;
          console.error('[ExternalZapModal] ❌', errorMsg);
          throw new Error(errorMsg);
        }

        setInvoice(invoiceResult.invoice);
        console.log('[ExternalZapModal] ✅ Direct charity invoice generated!');
        // No polling needed - user pays charity directly
      } else if (!isCharityDonation) {
        // Standard flow - get invoice from recipient's Lightning address
        const lnAddress = lightningAddress || recipientNpub;

        if (!lnAddress || !lnAddress.includes('@')) {
          throw new Error('No Lightning address available for recipient');
        }

        console.log(
          '[ExternalZapModal] 🔄 Requesting invoice for',
          amount,
          'rewards'
        );
        console.log(
          '[ExternalZapModal] Memo:',
          memo || 'RUNSTR Community Rewards'
        );

        const invoiceResult = await getInvoiceFromLightningAddress(
          lnAddress,
          amount,
          memo || 'RUNSTR Community Rewards'
        );

        console.log('[ExternalZapModal] Invoice result:', {
          hasInvoice: !!invoiceResult?.invoice,
          invoiceLength: invoiceResult?.invoice?.length,
          successMessage: invoiceResult?.successMessage,
        });

        if (invoiceResult && invoiceResult.invoice) {
          // Validate invoice amount matches requested amount
          console.log('[ExternalZapModal] Validating invoice amount...');
          const amountValid = validateInvoiceAmount(
            invoiceResult.invoice,
            amount
          );

          if (!amountValid) {
            const errorMsg = `Invoice amount mismatch! Expected ${amount} rewards. Please try again.`;
            console.error('[ExternalZapModal] ❌', errorMsg);
            throw new Error(errorMsg);
          }

          setInvoice(invoiceResult.invoice);
          console.log('[ExternalZapModal] ✅ Invoice generated successfully!');
        } else {
          throw new Error('Failed to generate invoice - no invoice returned');
        }
      }
    } catch (err) {
      console.error('[ExternalZapModal] ❌ Error generating invoice:', err);

      let errorMessage = 'Failed to generate invoice';
      if (err instanceof Error) {
        if (
          err.message.includes('timeout') ||
          err.message.includes('Timeout')
        ) {
          errorMessage = 'Request timed out. Please try again.';
        } else if (err.message.includes('Amount too small')) {
          errorMessage = err.message;
        } else if (err.message.includes('Lightning address')) {
          errorMessage = err.message;
        } else {
          errorMessage = err.message || 'Failed to generate invoice';
        }
      }

      setError(errorMessage);
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

  const handleCopyLightningAddress = async () => {
    const lnAddress = lightningAddress || recipientNpub;
    if (lnAddress && lnAddress.includes('@')) {
      await Clipboard.setStringAsync(lnAddress);
      setCopiedLnAddress(true);
      setTimeout(() => setCopiedLnAddress(false), 2000);
    }
  };

  const handleBackToAmountSelection = () => {
    setShowInvoice(false);
    setInvoice('');
    setError('');
  };

  const handleOpenInCashApp = async () => {
    await openInCashApp(invoice);
  };

  const handleNWCPayment = async () => {
    if (!invoice) return;
    setIsNWCPaying(true);
    setNwcError(null);
    try {
      const result = await NWCWalletService.sendPayment(invoice);
      if (result.success) {
        console.log('[ExternalZapModal] NWC payment successful');
        setIsNWCPaying(false);
        handlePaymentConfirmed();
      } else {
        const errorMsg = result.error || 'Payment failed';
        setNwcError(errorMsg);
        setIsNWCPaying(false);
      }
    } catch (err) {
      console.error('[ExternalZapModal] NWC payment error:', err);
      setNwcError(err instanceof Error ? err.message : 'Payment failed');
      setIsNWCPaying(false);
    }
  };

  const handlePaymentConfirmed = async () => {
    const paidAmount = getEffectiveAmount();

    // For charity donations, record the donation locally (for donation leaderboards only)
    // Note: Direct donations do NOT affect Impact Level XP - only workout rewards do
    if (isCharityDonation && charityId) {
      try {
        // Get donor pubkey from cached storage
        const storedPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
        const donorPubkey = storedPubkey || 'anonymous';

        if (!storedPubkey) {
          console.warn('[ExternalZapModal] No cached pubkey found, donation will be anonymous');
        }

        // Record donation (no forwarding needed - user paid directly)
        await DonationTrackingService.recordDonation({
          donorPubkey,
          amount: paidAmount,
          charityId,
          charityName: recipientName,
        });

        console.log('[ExternalZapModal] ✅ Charity donation recorded:', paidAmount, 'rewards to', recipientName);
      } catch (err) {
        console.error('[ExternalZapModal] Error recording donation:', err);
        // Don't block - donation was still made to charity
      }
    }

    Alert.alert(
      'Zap Sent!',
      `Successfully sent ${paidAmount} rewards to ${recipientName}`,
      [
        {
          text: 'OK',
          onPress: () => {
            onSuccess?.(paidAmount);
            onClose();
          },
        },
      ]
    );
  };

  const effectiveAmount = getEffectiveAmount();

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
              <Ionicons name="flash" size={24} color={theme.colors.accent} />
              <Text style={styles.title}>
                {showInvoice ? 'Pay with Wallet' : 'Send Sats'}
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
            {/* Recipient Info */}
            <View style={styles.recipientSection}>
              <Text style={styles.recipientLabel}>Sending to:</Text>
              <Text style={styles.recipientName}>{recipientName}</Text>
              {showInvoice && (
                <Text style={styles.amount}>{effectiveAmount} rewards</Text>
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
                        selectedAmount === amount &&
                          !isCustom &&
                          styles.presetButtonSelected,
                      ]}
                      onPress={() => handlePresetSelect(amount)}
                    >
                      <Text
                        style={[
                          styles.presetButtonText,
                          selectedAmount === amount &&
                            !isCustom &&
                            styles.presetButtonTextSelected,
                        ]}
                      >
                        {amount.toLocaleString()}
                      </Text>
                      <Text
                        style={[
                          styles.presetButtonSats,
                          selectedAmount === amount &&
                            !isCustom &&
                            styles.presetButtonTextSelected,
                        ]}
                      >
                        rewards
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
                    <Text style={styles.satsLabel}>rewards</Text>
                  </View>
                </View>

                {/* Set as Default Toggle */}
                <TouchableOpacity
                  style={styles.defaultToggle}
                  onPress={() => setSetAsDefault(!setAsDefault)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      setAsDefault && styles.checkboxChecked,
                    ]}
                  >
                    {setAsDefault && (
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color={theme.colors.background}
                      />
                    )}
                  </View>
                  <Text style={styles.defaultToggleText}>
                    Set as default amount
                  </Text>
                </TouchableOpacity>

                {/* Error Display */}
                {error && (
                  <View style={styles.errorBanner}>
                    <Ionicons
                      name="alert-circle"
                      size={18}
                      color={theme.colors.error}
                    />
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
                    Continue with{' '}
                    {effectiveAmount > 0
                      ? effectiveAmount.toLocaleString()
                      : '0'}{' '}
                    rewards
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={theme.colors.background}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              /* Payment Options View */
              <View style={styles.paymentSection}>
                {error ? (
                  <View style={styles.errorContainer}>
                    <Ionicons
                      name="alert-circle"
                      size={48}
                      color={theme.colors.error}
                    />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={generateInvoice}
                    >
                      <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={handleBackToAmountSelection}
                    >
                      <Text style={styles.backButtonText}>Change Amount</Text>
                    </TouchableOpacity>
                  </View>
                ) : isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator
                      size="large"
                      color={theme.colors.accent}
                    />
                    <Text style={styles.loadingText}>
                      Generating invoice...
                    </Text>
                  </View>
                ) : invoice ? (
                  <>
                    {/* Expiration Timer */}
                    {timeRemaining !== null && timeRemaining < 300 && (
                      <View style={styles.timerContainer}>
                        {isExpired ? (
                          <View style={styles.expiredBanner}>
                            <Ionicons
                              name="time-outline"
                              size={16}
                              color={theme.colors.error}
                            />
                            <Text style={styles.expiredText}>
                              Invoice Expired - Regenerating...
                            </Text>
                          </View>
                        ) : (
                          <View
                            style={[
                              styles.timerBanner,
                              timeRemaining < 60 && styles.timerBannerUrgent,
                            ]}
                          >
                            <Ionicons
                              name="time-outline"
                              size={16}
                              color={
                                timeRemaining < 60
                                  ? theme.colors.error
                                  : theme.colors.orangeBright
                              }
                            />
                            <Text
                              style={[
                                styles.timerText,
                                timeRemaining < 60 && styles.timerTextUrgent,
                              ]}
                            >
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
                        <Text style={styles.walletSectionTitle}>
                          Connected Wallet
                        </Text>
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
                      <Text style={styles.walletSectionTitle}>
                        Open in Wallet
                      </Text>

                      <TouchableOpacity
                        style={styles.walletButtonFullWidth}
                        onPress={handleOpenInCashApp}
                      >
                        <View style={styles.walletIconCircleInline}>
                          <Ionicons
                            name="logo-usd"
                            size={24}
                            color={theme.colors.accent}
                          />
                        </View>
                        <Text style={styles.walletButtonText}>Cash App</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Copy Options */}
                    <View style={styles.copySection}>
                      <TouchableOpacity
                        style={styles.copyButton}
                        onPress={handleCopyInvoice}
                      >
                        <Ionicons
                          name={copied ? 'checkmark' : 'copy'}
                          size={20}
                          color={theme.colors.text}
                        />
                        <Text style={styles.copyButtonText}>
                          {copied ? 'Copied!' : 'Copy Invoice'}
                        </Text>
                      </TouchableOpacity>

                      {(lightningAddress || recipientNpub.includes('@')) && (
                        <TouchableOpacity
                          style={styles.copyButton}
                          onPress={handleCopyLightningAddress}
                        >
                          <Ionicons
                            name={copiedLnAddress ? 'checkmark' : 'at'}
                            size={20}
                            color={theme.colors.text}
                          />
                          <Text style={styles.copyButtonText}>
                            {copiedLnAddress
                              ? 'Copied!'
                              : 'Copy Lightning Address'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Back Button */}
                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={handleBackToAmountSelection}
                    >
                      <Ionicons
                        name="arrow-back"
                        size={18}
                        color={theme.colors.textMuted}
                      />
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
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handlePaymentConfirmed}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={theme.colors.background}
                />
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

  recipientSection: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  recipientLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },

  recipientName: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },

  amount: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
    marginTop: 4,
  },

  // Amount Selection Styles
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

  defaultToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxChecked: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
  },

  defaultToggleText: {
    fontSize: 14,
    color: theme.colors.text,
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

  // Payment Section Styles
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
});
