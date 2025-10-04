/**
 * ChallengeRequestModal - Display incoming challenge request with accept/decline
 * Shows challenge details and allows user to respond
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { theme } from '../../styles/theme';
import type { PendingChallenge } from '../../services/challenge/ChallengeRequestService';
import { challengeRequestService } from '../../services/challenge/ChallengeRequestService';
import { getUserNostrIdentifiers } from '../../utils/nostr';

export interface ChallengeRequestModalProps {
  visible: boolean;
  challenge: PendingChallenge | null;
  onAccept?: () => void;
  onDecline?: () => void;
  onClose: () => void;
}

// Activity icons mapping
const ACTIVITY_ICONS: Record<string, string> = {
  running: '🏃',
  walking: '🚶',
  cycling: '🚴',
  hiking: '🥾',
  swimming: '🏊',
  rowing: '🚣',
  workout: '💪',
};

export const ChallengeRequestModal: React.FC<ChallengeRequestModalProps> = ({
  visible,
  challenge,
  onAccept,
  onDecline,
  onClose,
}) => {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  if (!challenge) {
    return null;
  }

  const handleAccept = async () => {
    try {
      setIsAccepting(true);

      // Get nsec for signing
      const userIdentifiers = await getUserNostrIdentifiers();
      if (!userIdentifiers?.nsec) {
        throw new Error('Cannot access private key for signing');
      }

      // Accept challenge (signs and publishes kind 1106 + kind 30000)
      const result = await challengeRequestService.acceptChallenge(
        challenge.challengeId,
        userIdentifiers.nsec
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to accept challenge');
      }

      // Show success
      Alert.alert('Challenge Accepted!', 'The challenge is now active', [
        {
          text: 'OK',
          onPress: () => {
            if (onAccept) onAccept();
            onClose();
          },
        },
      ]);
    } catch (error) {
      console.error('Failed to accept challenge:', error);
      Alert.alert(
        'Accept Failed',
        error instanceof Error ? error.message : 'An error occurred'
      );
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    try {
      setIsDeclining(true);

      // Get nsec for signing
      const userIdentifiers = await getUserNostrIdentifiers();
      if (!userIdentifiers?.nsec) {
        throw new Error('Cannot access private key for signing');
      }

      // Decline challenge (signs and publishes kind 1107)
      const result = await challengeRequestService.declineChallenge(
        challenge.challengeId,
        userIdentifiers.nsec
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to decline challenge');
      }

      // Close modal
      if (onDecline) onDecline();
      onClose();
    } catch (error) {
      console.error('Failed to decline challenge:', error);
      Alert.alert(
        'Decline Failed',
        error instanceof Error ? error.message : 'An error occurred'
      );
    } finally {
      setIsDeclining(false);
    }
  };

  const activityIcon = ACTIVITY_ICONS[challenge.activityType] || '🏃';
  const challengerName = challenge.challengerName || 'Someone';
  const challengerInitial = challengerName.charAt(0).toUpperCase();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Challenge Request</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              disabled={isAccepting || isDeclining}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Challenger Info */}
          <View style={styles.challengerSection}>
            <View style={styles.challengerAvatar}>
              <Text style={styles.challengerInitial}>{challengerInitial}</Text>
            </View>
            <Text style={styles.challengerName}>{challengerName}</Text>
            <Text style={styles.challengerSubtitle}>challenged you!</Text>
          </View>

          {/* Challenge Details Card */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>{activityIcon}</Text>
              <Text style={styles.detailText}>
                {challenge.activityType.charAt(0).toUpperCase() +
                  challenge.activityType.slice(1)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📏</Text>
              <Text style={styles.detailText}>
                {challenge.metric.charAt(0).toUpperCase() +
                  challenge.metric.slice(1)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📅</Text>
              <Text style={styles.detailText}>{challenge.duration} days</Text>
            </View>

            {challenge.wagerAmount > 0 && (
              <View style={styles.wagerRow}>
                <Text style={styles.detailIcon}>⚡</Text>
                <View>
                  <Text style={styles.wagerAmount}>
                    {challenge.wagerAmount.toLocaleString()} sats
                  </Text>
                  <Text style={styles.wagerLabel}>wager</Text>
                </View>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.declineButton, isDeclining && styles.buttonDisabled]}
              onPress={handleDecline}
              disabled={isAccepting || isDeclining}
            >
              {isDeclining ? (
                <ActivityIndicator size="small" color={theme.colors.textMuted} />
              ) : (
                <Text style={styles.declineButtonText}>Decline</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.acceptButton, isAccepting && styles.buttonDisabled]}
              onPress={handleAccept}
              disabled={isAccepting || isDeclining}
            >
              {isAccepting ? (
                <ActivityIndicator size="small" color={theme.colors.accentText} />
              ) : (
                <Text style={styles.acceptButtonText}>Accept ✓</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.large,
    width: '100%',
    maxWidth: 400,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: theme.colors.textMuted,
  },
  challengerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  challengerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.syncBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  challengerInitial: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text,
  },
  challengerName: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  challengerSubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  detailsCard: {
    backgroundColor: theme.colors.prizeBackground,
    borderRadius: theme.borderRadius.medium,
    padding: 16,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  detailText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  wagerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  wagerAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  wagerLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.buttonBorder,
    borderRadius: theme.borderRadius.medium,
    paddingVertical: 14,
    alignItems: 'center',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.medium,
    paddingVertical: 14,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accentText,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
