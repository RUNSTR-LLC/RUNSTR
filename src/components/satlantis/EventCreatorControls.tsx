/**
 * EventCreatorControls - Payout UI for RUNSTR events
 *
 * Shows payout options for ANYONE viewing the event:
 * - Winner list with avatar + name + earned amount
 * - Pay Winners button (tap = external wallet, long-press = NWC batch)
 * - Payout status and history
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { CustomAlertManager } from '../ui/CustomAlert';
import {
  RunstrAutoPayoutService,
  PayoutStatus,
  PayoutCalculation,
} from '../../services/events/RunstrAutoPayoutService';
import { NWCWalletService } from '../../services/wallet/NWCWalletService';
import { useNWCZap } from '../../hooks/useNWCZap';
import { ZappableUserRow } from '../ui/ZappableUserRow';
import { ExternalZapModal } from '../nutzap/ExternalZapModal';
import type { SatlantisEvent, SatlantisLeaderboardEntry } from '../../types/satlantis';

interface EventCreatorControlsProps {
  event: SatlantisEvent;
  leaderboard: SatlantisLeaderboardEntry[];
}

export const EventCreatorControls: React.FC<EventCreatorControlsProps> = ({
  event,
  leaderboard,
}) => {
  const [payoutStatus, setPayoutStatus] = useState<PayoutStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasNWC, setHasNWC] = useState(false);
  const [calculatedPayouts, setCalculatedPayouts] = useState<PayoutCalculation[]>([]);

  // External payment modal state
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [currentPayoutIndex, setCurrentPayoutIndex] = useState(0);

  // Long press detection
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  // NWC zap hook for batch payments
  const { sendZap, hasWallet: nwcHasWallet, isLoading: nwcLoading } = useNWCZap();

  // Load initial status
  useEffect(() => {
    loadStatus();
  }, [event.id]);

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const [status, nwcConfigured] = await Promise.all([
        RunstrAutoPayoutService.getPayoutStatus(event.id),
        NWCWalletService.hasNWCConfigured(),
      ]);

      setPayoutStatus(status);
      setHasNWC(nwcConfigured);

      // Calculate what payouts would be
      if (leaderboard.length > 0) {
        const payouts = RunstrAutoPayoutService.calculatePayouts(event, leaderboard);
        setCalculatedPayouts(payouts);
      }
    } catch (error) {
      console.error('[EventCreatorControls] Error loading status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [event.id, leaderboard]);

  // TAP: Open external payment modal
  const handleTap = useCallback(() => {
    if (calculatedPayouts.length === 0) return;
    setCurrentPayoutIndex(0);
    setShowExternalModal(true);
  }, [calculatedPayouts]);

  // LONG-PRESS: NWC batch payment
  const handleLongPress = useCallback(async () => {
    if (!hasNWC) {
      CustomAlertManager.alert(
        'NWC Required',
        'Set up NWC wallet in Settings to batch pay all winners',
        [{ text: 'OK' }]
      );
      return;
    }

    if (calculatedPayouts.length === 0) return;

    setIsProcessing(true);
    let successCount = 0;
    let failCount = 0;

    for (const payout of calculatedPayouts) {
      try {
        console.log(`[Payout] Sending ${payout.amountSats} sats to ${payout.npub.slice(0, 12)}...`);
        const success = await sendZap(
          payout.npub,
          payout.amountSats,
          `${event.title} - Rank #${payout.rank}`
        );
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`[Payout] Failed for ${payout.npub}:`, error);
        failCount++;
      }
    }

    setIsProcessing(false);

    // Show result
    if (failCount === 0) {
      CustomAlertManager.alert('Success!', `Paid ${successCount} winners`);
    } else {
      CustomAlertManager.alert('Partial Success', `Paid ${successCount}, failed ${failCount}`);
    }
  }, [hasNWC, calculatedPayouts, sendZap, event.title]);

  // Button press handlers for tap vs long-press detection
  const handlePressIn = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      handleLongPress();
    }, 400);
  }, [handleLongPress]);

  const handlePressOut = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // If it wasn't a long press, trigger tap
    if (!isLongPress.current && !isProcessing) {
      handleTap();
    }
  }, [handleTap, isProcessing]);

  // Check payout eligibility
  const { canPayout, reason } = RunstrAutoPayoutService.canAutoPayoutEvent(event);
  const now = Math.floor(Date.now() / 1000);
  const eventEnded = now > event.endTime;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
      </View>
    );
  }

  // Event still running
  if (!eventEnded) {
    return (
      <View style={styles.container}>
        <View style={styles.infoBox}>
          <Ionicons name="time-outline" size={20} color={theme.colors.textMuted} />
          <Text style={styles.infoText}>
            Payouts available after event ends
          </Text>
        </View>
      </View>
    );
  }

  // Already paid out
  if (payoutStatus?.status === 'completed') {
    return (
      <View style={styles.container}>
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
          <Text style={styles.successText}>
            Payouts Complete ({payoutStatus.paidAmount.toLocaleString()} sats)
          </Text>
        </View>

        {/* Show payout breakdown */}
        {payoutStatus.results.length > 0 && (
          <View style={styles.payoutList}>
            <Text style={styles.listTitle}>Payout History</Text>
            {payoutStatus.results.map((result, index) => (
              <View key={index} style={styles.payoutItem}>
                <Text style={styles.payoutNpub}>
                  {result.npub.substring(0, 12)}...
                </Text>
                <View style={styles.payoutAmountRow}>
                  <Text style={styles.payoutAmount}>
                    {result.amountSats.toLocaleString()} sats
                  </Text>
                  <Ionicons
                    name={result.success ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={result.success ? theme.colors.success : '#FF6B00'}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  // Partial payout
  if (payoutStatus?.status === 'partial') {
    return (
      <View style={styles.container}>
        <View style={styles.warningBox}>
          <Ionicons name="warning-outline" size={20} color="#FF9D42" />
          <Text style={styles.warningText}>
            Partial payout - some payments failed
          </Text>
        </View>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleLongPress}
          disabled={isProcessing || !hasNWC}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={theme.colors.background} />
          ) : (
            <Text style={styles.retryButtonText}>Retry Failed Payments</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // Ready to payout
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Event Payouts</Text>

      {/* Payout Preview with Avatar + Name */}
      {calculatedPayouts.length > 0 && (
        <View style={styles.previewBox}>
          <Text style={styles.previewTitle}>Payout Preview</Text>
          <Text style={styles.schemeText}>
            {RunstrAutoPayoutService.getPayoutSchemeDescription(
              event.payoutScheme || 'winner_takes_all'
            )}
          </Text>

          {calculatedPayouts.map((payout, index) => (
            <View key={index} style={styles.previewItem}>
              <View style={styles.previewRank}>
                <Text style={styles.previewRankText}>#{payout.rank}</Text>
              </View>
              <ZappableUserRow
                npub={payout.npub}
                showQuickZap={false}
                style={styles.winnerRow}
                additionalContent={
                  <View style={styles.amountContainer}>
                    <Text style={styles.previewAmount}>
                      {payout.amountSats.toLocaleString()} sats
                    </Text>
                    {payout.percentage && (
                      <Text style={styles.previewPercent}>({payout.percentage}%)</Text>
                    )}
                  </View>
                }
              />
            </View>
          ))}
        </View>
      )}

      {/* Payout Button - Tap for external, long-press for NWC */}
      <TouchableOpacity
        style={[
          styles.payoutButton,
          calculatedPayouts.length === 0 && styles.payoutButtonDisabled,
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isProcessing || calculatedPayouts.length === 0}
        activeOpacity={0.8}
      >
        {isProcessing ? (
          <ActivityIndicator size="small" color={theme.colors.background} />
        ) : (
          <>
            <Ionicons name="flash" size={20} color={theme.colors.background} />
            <Text style={styles.payoutButtonText}>Pay Winners</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Hint text */}
      <Text style={styles.hintText}>
        Tap for wallet options • Hold for NWC batch pay
      </Text>

      {/* External Payment Modal */}
      {showExternalModal && calculatedPayouts[currentPayoutIndex] && (
        <ExternalZapModal
          visible={showExternalModal}
          onClose={() => setShowExternalModal(false)}
          recipientNpub={calculatedPayouts[currentPayoutIndex].npub}
          recipientName={`Winner #${calculatedPayouts[currentPayoutIndex].rank}`}
          amount={calculatedPayouts[currentPayoutIndex].amountSats}
          memo={`${event.title} - Rank #${calculatedPayouts[currentPayoutIndex].rank}`}
          onSuccess={() => {
            // Move to next payout or close
            if (currentPayoutIndex < calculatedPayouts.length - 1) {
              setCurrentPayoutIndex(currentPayoutIndex + 1);
            } else {
              setShowExternalModal(false);
            }
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    marginTop: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 12,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
  },
  infoText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(255, 157, 66, 0.1)',
    borderRadius: 8,
    marginBottom: 12,
  },
  successText: {
    color: theme.colors.success,
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    flex: 1,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderRadius: 8,
    marginBottom: 12,
  },
  warningText: {
    color: '#FF9D42',
    fontSize: 14,
    flex: 1,
  },
  previewBox: {
    padding: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  schemeText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 12,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  previewRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  previewRankText: {
    color: theme.colors.background,
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
  },
  winnerRow: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  previewAmount: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accent,
  },
  previewPercent: {
    fontSize: 11,
    fontWeight: theme.typography.weights.regular,
    color: theme.colors.textMuted,
  },
  hintText: {
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  payoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.accent,
    paddingVertical: 14,
    borderRadius: 8,
  },
  payoutButtonDisabled: {
    opacity: 0.5,
  },
  payoutButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
  },
  retryButton: {
    backgroundColor: '#FF9D42',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
  },
  disabledReason: {
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  payoutList: {
    marginTop: 8,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  payoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  payoutNpub: {
    fontSize: 13,
    color: theme.colors.text,
  },
  payoutAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  payoutAmount: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
});

export default EventCreatorControls;
