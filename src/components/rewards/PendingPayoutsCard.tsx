/**
 * PendingPayoutsCard - Shows Geyser pending payments with progress bars
 *
 * Displays:
 * - Charity name and Lightning address
 * - Progress bar toward 1000 sat minimum
 * - Accumulated vs minimum sats
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import type { PendingBatchPayout } from '../../types/transparencyDashboard';

interface PendingPayoutsCardProps {
  payouts: PendingBatchPayout[];
}

export const PendingPayoutsCard: React.FC<PendingPayoutsCardProps> = ({
  payouts,
}) => {
  const hasPending = payouts.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="time-outline" size={18} color={theme.colors.orangeBright} />
        <Text style={styles.title}>Pending Batch Payments</Text>
      </View>

      {hasPending ? (
        <>
          <Text style={styles.subtitle}>
            Some charities require a minimum balance before payment
          </Text>

          <View style={styles.list}>
            {payouts.map((payout, index) => (
              <View
                key={payout.charityId}
                style={[styles.payoutItem, index === payouts.length - 1 && styles.payoutItemLast]}
              >
                {/* Header: charity name */}
                <View style={styles.payoutHeader}>
                  <Text style={styles.charityName} numberOfLines={1}>
                    {payout.charityName}
                  </Text>
                  <Text style={styles.percentText}>
                    {Math.round(payout.progressPercent)}%
                  </Text>
                </View>

                {/* Progress bar */}
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.min(100, payout.progressPercent)}%` },
                      ]}
                    />
                  </View>
                </View>

                {/* Sats info */}
                <Text style={styles.satsInfo}>
                  {payout.accumulatedSats.toLocaleString()} / {payout.minimumSats.toLocaleString()} sats
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={32} color={theme.colors.orangeBright} />
          <Text style={styles.emptyText}>All payments complete!</Text>
          <Text style={styles.emptySubtext}>
            No pending batch payments waiting to be sent
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
  },

  // List
  list: {
    gap: 0,
  },
  payoutItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  payoutItemLast: {
    borderBottomWidth: 0,
  },

  // Payout header
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  charityName: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    flex: 1,
    marginRight: 8,
  },
  percentText: {
    fontSize: 13,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.orangeBright,
  },

  // Progress bar
  progressBarContainer: {
    marginBottom: 6,
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: theme.colors.textMuted, // Orange fill
  },

  // Sats info
  satsInfo: {
    fontSize: 11,
    color: '#666',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.orangeBright,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
  },
});

export default PendingPayoutsCard;
