/**
 * QR Event Preview Modal
 * Shows scanned QR event details with join/payment options
 * Displays event information and handles paid vs free event joining
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { theme } from '../../styles/theme';
import type { QREventData } from '../../services/event/QREventService';

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

export interface QREventPreviewModalProps {
  visible: boolean;
  eventData: QREventData | null;
  onJoinEvent?: (eventData: QREventData) => Promise<void>;
  onClose: () => void;
}

export const QREventPreviewModal: React.FC<QREventPreviewModalProps> = ({
  visible,
  eventData,
  onJoinEvent,
  onClose,
}) => {
  const [isJoining, setIsJoining] = useState(false);

  if (!eventData) {
    return null;
  }

  const handleJoin = async () => {
    if (!onJoinEvent) {
      Alert.alert('Error', 'Join functionality not configured');
      return;
    }

    try {
      setIsJoining(true);
      await onJoinEvent(eventData);

      // Success message will be shown by the service
      onClose();
    } catch (error) {
      console.error('Failed to join event:', error);
      // Error alert will be shown by the service
    } finally {
      setIsJoining(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const activityIcon = ACTIVITY_ICONS[eventData.activity_type.toLowerCase()] || '🏃';
  const isPaidEvent = eventData.entry_fee > 0;

  const eventDate = new Date(eventData.event_date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const eventTime = new Date(eventData.event_date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

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
            <Text style={styles.headerTitle}>Event Invitation</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              disabled={isJoining}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Event Info */}
          <View style={styles.eventSection}>
            <View style={styles.eventIcon}>
              <Text style={styles.eventIconEmoji}>{activityIcon}</Text>
            </View>
            <Text style={styles.eventName}>{eventData.event_name}</Text>
            {eventData.team_name && (
              <Text style={styles.teamName}>{eventData.team_name}</Text>
            )}
          </View>

          {/* Event Details Card */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>{activityIcon}</Text>
              <Text style={styles.detailText}>
                {eventData.activity_type.charAt(0).toUpperCase() +
                  eventData.activity_type.slice(1)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📅</Text>
              <Text style={styles.detailText}>{eventDate}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>🕐</Text>
              <Text style={styles.detailText}>{eventTime}</Text>
            </View>

            {eventData.max_participants && (
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>👥</Text>
                <Text style={styles.detailText}>
                  Max {eventData.max_participants} participants
                </Text>
              </View>
            )}

            {isPaidEvent && (
              <View style={styles.entryFeeRow}>
                <Text style={styles.detailIcon}>⚡</Text>
                <View>
                  <Text style={styles.entryFeeAmount}>
                    {eventData.entry_fee.toLocaleString()} sats
                  </Text>
                  <Text style={styles.entryFeeLabel}>entry fee</Text>
                </View>
              </View>
            )}
          </View>

          {/* Description */}
          {eventData.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionText}>{eventData.description}</Text>
            </View>
          )}

          {/* Info Message */}
          <View style={styles.infoSection}>
            <Text style={styles.infoText}>
              {isPaidEvent
                ? 'Payment will be sent to the captain. You\'ll receive confirmation once approved.'
                : 'Your join request will be sent to the captain for approval.'}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.cancelButton, isJoining && styles.buttonDisabled]}
              onPress={handleCancel}
              disabled={isJoining}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.joinButton, isJoining && styles.buttonDisabled]}
              onPress={handleJoin}
              disabled={isJoining}
            >
              {isJoining ? (
                <ActivityIndicator size="small" color={theme.colors.accentText} />
              ) : (
                <Text style={styles.joinButtonText}>
                  {isPaidEvent
                    ? `Pay ${eventData.entry_fee.toLocaleString()} sats & Request to Join`
                    : 'Request to Join'}
                </Text>
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
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: theme.colors.textMuted,
  },
  eventSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  eventIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.syncBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventIconEmoji: {
    fontSize: 32,
  },
  eventName: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  teamName: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  detailsCard: {
    backgroundColor: theme.colors.prizeBackground,
    borderRadius: theme.borderRadius.medium,
    padding: 16,
    marginBottom: 16,
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
  entryFeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  entryFeeAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  entryFeeLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  descriptionSection: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  infoSection: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  actionButtons: {
    gap: 12,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.buttonBorder,
    borderRadius: theme.borderRadius.medium,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  joinButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.medium,
    paddingVertical: 14,
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accentText,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
