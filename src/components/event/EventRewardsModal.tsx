/**
 * EventRewardsModal - Displays prize pool distribution and entry fee information
 * Shows breakdown of prize money, distribution percentages, and total pot
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { theme } from '../../styles/theme';

interface EventRewardsModalProps {
  visible: boolean;
  onClose: () => void;
  prizePoolSats: number;
  entryFeesSats: number;
  participantCount?: number; // Optional - may not be known when browsing events
  paymentDestination?: 'captain' | 'charity';
  paymentRecipientName?: string;
}

export const EventRewardsModal: React.FC<EventRewardsModalProps> = ({
  visible,
  onClose,
  prizePoolSats,
  entryFeesSats,
  participantCount = 0,
  paymentDestination = 'captain',
  paymentRecipientName = 'Captain',
}) => {
  // Calculate prize distribution (standard: 50%, 30%, 20%)
  const firstPlace = Math.floor(prizePoolSats * 0.5);
  const secondPlace = Math.floor(prizePoolSats * 0.3);
  const thirdPlace = Math.floor(prizePoolSats * 0.2);

  // Calculate total pot (prize pool + entry fees)
  const totalEntryFees = entryFeesSats * participantCount;
  const totalPot = prizePoolSats + totalEntryFees;
  const hasParticipants = participantCount > 0;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Prize Distribution</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Prize Pool Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Prize Pool</Text>
              <View style={styles.prizePoolCard}>
                <Text style={styles.prizePoolAmount}>
                  {prizePoolSats.toLocaleString()} rewards
                </Text>
                <Text style={styles.prizePoolLabel}>Total Prize Pool</Text>
              </View>
            </View>

            {/* Distribution Breakdown */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Distribution</Text>
              <View style={styles.distributionList}>
                <View style={styles.distributionItem}>
                  <View style={styles.distributionRank}>
                    <Text style={styles.rankNumber}>1st</Text>
                  </View>
                  <View style={styles.distributionDetails}>
                    <Text style={styles.distributionAmount}>
                      {firstPlace.toLocaleString()} rewards
                    </Text>
                    <Text style={styles.distributionPercent}>50%</Text>
                  </View>
                </View>

                <View style={styles.distributionItem}>
                  <View style={styles.distributionRank}>
                    <Text style={styles.rankNumber}>2nd</Text>
                  </View>
                  <View style={styles.distributionDetails}>
                    <Text style={styles.distributionAmount}>
                      {secondPlace.toLocaleString()} rewards
                    </Text>
                    <Text style={styles.distributionPercent}>30%</Text>
                  </View>
                </View>

                <View style={styles.distributionItem}>
                  <View style={styles.distributionRank}>
                    <Text style={styles.rankNumber}>3rd</Text>
                  </View>
                  <View style={styles.distributionDetails}>
                    <Text style={styles.distributionAmount}>
                      {thirdPlace.toLocaleString()} rewards
                    </Text>
                    <Text style={styles.distributionPercent}>20%</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Entry Fees Section */}
            {entryFeesSats > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Entry Fees</Text>
                <View style={styles.entryFeeCard}>
                  <View style={styles.entryFeeRow}>
                    <Text style={styles.entryFeeLabel}>
                      Fee per participant:
                    </Text>
                    <Text style={styles.entryFeeValue}>
                      {entryFeesSats.toLocaleString()} rewards
                    </Text>
                  </View>

                  {hasParticipants ? (
                    <>
                      <View style={styles.entryFeeRow}>
                        <Text style={styles.entryFeeLabel}>Participants:</Text>
                        <Text style={styles.entryFeeValue}>
                          {participantCount}
                        </Text>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.entryFeeRow}>
                        <Text style={styles.entryFeeTotalLabel}>
                          Total collected:
                        </Text>
                        <Text style={styles.entryFeeTotalValue}>
                          {totalEntryFees.toLocaleString()} rewards
                        </Text>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.entryFeeNote}>
                      Total pot will grow as participants join
                    </Text>
                  )}

                  <View style={styles.destinationRow}>
                    <Text style={styles.destinationLabel}>Destination:</Text>
                    <Text style={styles.destinationValue}>
                      {paymentDestination === 'charity'
                        ? `${paymentRecipientName} (Charity)`
                        : `${paymentRecipientName}'s Wallet`}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Total Pot */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Total Pot</Text>
              <View style={styles.totalPotCard}>
                <Text style={styles.totalPotAmount}>
                  {hasParticipants
                    ? totalPot.toLocaleString()
                    : prizePoolSats.toLocaleString()}{' '}
                  rewards
                </Text>
                <Text style={styles.totalPotBreakdown}>
                  {hasParticipants
                    ? `Prize Pool (${prizePoolSats.toLocaleString()}) + Entry Fees (${totalEntryFees.toLocaleString()})`
                    : 'Prize pool only (entry fees will be added as participants join)'}
                </Text>
              </View>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButtonBottom}
              onPress={onClose}
            >
              <Text style={styles.closeButtonBottomText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
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

  modalContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxHeight: '80%',
    width: '100%',
    maxWidth: 400,
  },

  content: {
    padding: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },

  title: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeButtonText: {
    fontSize: 18,
    color: theme.colors.textMuted,
  },

  // Sections
  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Prize Pool Card
  prizePoolCard: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.text,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },

  prizePoolAmount: {
    fontSize: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
    marginBottom: 4,
  },

  prizePoolLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  // Distribution List
  distributionList: {
    gap: 12,
  },

  distributionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
  },

  distributionRank: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.text,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },

  rankNumber: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },

  distributionDetails: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  distributionAmount: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  distributionPercent: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
  },

  // Entry Fee Card
  entryFeeCard: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
  },

  entryFeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  entryFeeLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },

  entryFeeValue: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  entryFeeNote: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 8,
  },

  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 12,
  },

  entryFeeTotalLabel: {
    fontSize: 14,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  entryFeeTotalValue: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
  },

  destinationRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  destinationLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  destinationValue: {
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  // Total Pot Card
  totalPotCard: {
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.text,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },

  totalPotAmount: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },

  totalPotBreakdown: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },

  // Bottom Close Button
  closeButtonBottom: {
    backgroundColor: theme.colors.text,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },

  closeButtonBottomText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background,
  },
});
