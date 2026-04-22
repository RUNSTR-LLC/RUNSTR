/**
 * EventPaymentModal - Lightning invoice payment for event entry
 * Shows QR code and copyable invoice for user to pay from any Lightning wallet
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { CustomAlert } from '../ui/CustomAlert';
import { NWCWalletService } from '../../services/wallet/NWCWalletService';

interface EventPaymentModalProps {
  visible: boolean;
  eventName: string;
  amountSats: number;
  invoice: string;
  paymentDestination?: 'captain' | 'charity';
  paymentRecipientName?: string;
  participationType?: 'in-person' | 'virtual'; // ✅ NEW: Show participation type in payment summary
  onPaid: () => void;
  onCancel: () => void;
}

const { width } = Dimensions.get('window');

// How often to check for payment (ms)
const POLL_INTERVAL = 3000;
// Show manual "I Paid" fallback after this time (ms)
const MANUAL_FALLBACK_DELAY = 30000;

export const EventPaymentModal: React.FC<EventPaymentModalProps> = ({
  visible,
  eventName,
  amountSats,
  invoice,
  paymentDestination,
  paymentRecipientName,
  participationType,
  onPaid,
  onCancel,
}) => {
  const [copied, setCopied] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }>;
  }>({
    title: '',
    message: '',
    buttons: [],
  });

  // Payment verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [showManualFallback, setShowManualFallback] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start polling for payment verification when modal opens
  useEffect(() => {
    if (!visible || !invoice) {
      // Clean up when modal closes
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
      setIsVerifying(false);
      setShowManualFallback(false);
      return;
    }

    // Check if NWC is available for auto-verification
    const startPolling = async () => {
      const hasNWC = await NWCWalletService.hasNWCConfigured();
      if (!hasNWC) {
        // No NWC - show manual fallback immediately
        console.log('[EventPayment] No NWC configured - showing manual option');
        setShowManualFallback(true);
        return;
      }

      console.log('[EventPayment] Starting payment verification polling...');
      setIsVerifying(true);

      // Poll for payment confirmation
      pollIntervalRef.current = setInterval(async () => {
        try {
          console.log('[EventPayment] Checking payment status...');
          const result = await NWCWalletService.lookupInvoice(invoice);

          if (result.success && result.paid) {
            console.log('[EventPayment] Payment confirmed!');

            // Stop polling
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            if (fallbackTimeoutRef.current) {
              clearTimeout(fallbackTimeoutRef.current);
              fallbackTimeoutRef.current = null;
            }

            setIsVerifying(false);
            onPaid();
          }
        } catch (error) {
          console.log('[EventPayment] Polling error:', error);
        }
      }, POLL_INTERVAL);

      // Show manual fallback after delay
      fallbackTimeoutRef.current = setTimeout(() => {
        console.log('[EventPayment] Showing manual fallback option');
        setShowManualFallback(true);
      }, MANUAL_FALLBACK_DELAY);
    };

    startPolling();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
    };
  }, [visible, invoice, onPaid]);

  const handleCopyInvoice = async () => {
    try {
      await Clipboard.setStringAsync(invoice);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setAlertConfig({
        title: 'Copied!',
        message: 'Lightning invoice copied to clipboard',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setAlertVisible(true);
    } catch (error) {
      setAlertConfig({
        title: 'Error',
        message: 'Failed to copy invoice',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setAlertVisible(true);
    }
  };

  const handlePaid = () => {
    setAlertConfig({
      title: 'Confirm Payment',
      message: 'Have you paid this invoice from your Lightning wallet?',
      buttons: [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Yes, I Paid',
          style: 'default',
          onPress: onPaid,
        },
      ],
    });
    setAlertVisible(true);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pay Entry Donation</Text>
          <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Event Info */}
          <View style={styles.eventInfo}>
            <Text style={styles.eventName}>{eventName}</Text>
            <View style={styles.amountContainer}>
              <Ionicons name="flash" size={20} color={theme.colors.accent} />
              <Text style={styles.amount}>
                {amountSats.toLocaleString()} sats
              </Text>
            </View>
            {paymentDestination && paymentRecipientName && (
              <View style={styles.paymentDestinationContainer}>
                <Ionicons
                  name={
                    paymentDestination === 'charity' ? 'heart' : 'person-circle'
                  }
                  size={16}
                  color={theme.colors.textMuted}
                />
                <Text style={styles.paymentDestinationText}>
                  Payment to:{' '}
                  {paymentDestination === 'charity'
                    ? 'Charity - '
                    : 'Captain - '}
                  {paymentRecipientName}
                </Text>
              </View>
            )}
            {/* ✅ NEW: Show participation type */}
            {participationType && (
              <View style={styles.participationTypeDisplay}>
                <Ionicons
                  name={participationType === 'in-person' ? 'location' : 'home'}
                  size={16}
                  color={theme.colors.textMuted}
                />
                <Text style={styles.participationTypeText}>
                  {participationType === 'in-person' ? 'In-Person' : 'Virtual'}{' '}
                  Participation
                </Text>
              </View>
            )}
          </View>

          {/* QR Code */}
          <View style={styles.qrContainer}>
            <View style={styles.qrCodeWrapper}>
              <QRCode
                value={invoice}
                size={Math.min(width - 100, 280)}
                backgroundColor="#ffffff"
                color="#000000"
              />
            </View>
            <Text style={styles.qrLabel}>Scan with any wallet</Text>
          </View>

          {/* Invoice */}
          <View style={styles.invoiceSection}>
            <Text style={styles.invoiceLabel}>Payment Invoice</Text>
            <TouchableOpacity
              onPress={handleCopyInvoice}
              style={styles.invoiceContainer}
              activeOpacity={0.7}
            >
              <Text
                style={styles.invoice}
                numberOfLines={3}
                ellipsizeMode="middle"
              >
                {invoice}
              </Text>
              <View style={styles.copyIndicator}>
                <Ionicons
                  name={copied ? 'checkmark-circle' : 'copy-outline'}
                  size={18}
                  color={copied ? '#FF9D42' : theme.colors.accent}
                />
                <Text style={[styles.copyText, copied && styles.copiedText]}>
                  {copied ? 'Copied!' : 'Tap to copy'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>How to Pay:</Text>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>
                Scan QR code or tap to copy invoice
              </Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>
                Pay from Cash App, Strike, Alby, or any wallet
              </Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>
                {isVerifying
                  ? 'Payment will be detected automatically'
                  : 'Click "I Paid" below after completing payment'}
              </Text>
            </View>
          </View>

          {/* Verification Status */}
          {isVerifying && (
            <View style={styles.verificationContainer}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={styles.verificationText}>
                Waiting for payment confirmation...
              </Text>
            </View>
          )}

          {/* Manual Fallback Button - shown after 30 seconds or if no NWC */}
          {showManualFallback && (
            <TouchableOpacity
              style={styles.paidButton}
              onPress={handlePaid}
              activeOpacity={0.8}
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={theme.colors.background}
              />
              <Text style={styles.paidButtonText}>I Paid This Invoice</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          {/* Note */}
          <Text style={styles.note}>
            Your join request will be sent to the captain for approval after
            payment.
          </Text>
        </ScrollView>

        {/* Custom Alert Modal */}
        <CustomAlert
          visible={alertVisible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertVisible(false)}
        />
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

  headerTitle: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },

  closeButton: {
    padding: 4,
  },

  content: {
    flex: 1,
  },

  contentContainer: {
    padding: 20,
  },

  // Event Info
  eventInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },

  eventName: {
    fontSize: 18,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },

  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.medium,
  },

  amount: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
  },

  // Payment Destination
  paymentDestinationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.small,
  },

  paymentDestinationText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },

  // ✅ NEW: Participation Type Display
  participationTypeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.small,
  },

  participationTypeText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },

  // QR Code
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },

  qrCodeWrapper: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: theme.borderRadius.large,
    marginBottom: 12,
  },

  qrLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },

  // Invoice
  invoiceSection: {
    marginBottom: 24,
  },

  invoiceLabel: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 8,
  },

  invoiceContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    padding: 14,
  },

  invoice: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: theme.colors.textMuted,
    marginBottom: 10,
    lineHeight: 18,
  },

  copyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  copyText: {
    fontSize: 13,
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.medium,
  },

  copiedText: {
    color: '#FF9D42',
  },

  // Instructions
  instructionsContainer: {
    marginBottom: 24,
    backgroundColor: theme.colors.cardBackground,
    padding: 16,
    borderRadius: theme.borderRadius.medium,
  },

  instructionsTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 12,
  },

  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  stepNumberText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.background,
  },

  stepText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },

  // Buttons
  paidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.text,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.medium,
    marginBottom: 12,
  },

  paidButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },

  cancelButton: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },

  cancelButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  // Note
  note: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Verification Status
  verificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: theme.colors.cardBackground,
    padding: 16,
    borderRadius: theme.borderRadius.medium,
    marginBottom: 12,
  },

  verificationText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
});
