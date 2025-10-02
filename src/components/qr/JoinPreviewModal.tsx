/**
 * JoinPreviewModal - Preview challenge/event details before joining
 * Clean black and white minimalistic design
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { theme } from '../../styles/theme';
import type { QRData } from '../../services/qr/QRCodeService';
import QRCodeService from '../../services/qr/QRCodeService';

interface JoinPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  data: QRData | null;
  onJoin: (data: QRData) => Promise<void>;
}

export const JoinPreviewModal: React.FC<JoinPreviewModalProps> = ({
  visible,
  onClose,
  data,
  onJoin,
}) => {
  const [isJoining, setIsJoining] = useState(false);

  if (!data) {
    return null;
  }

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      await onJoin(data);
      onClose();
    } catch (error) {
      console.error('Failed to join:', error);
    } finally {
      setIsJoining(false);
    }
  };

  const renderChallengeDetails = (challengeData: Extract<QRData, { type: 'challenge' }>) => (
    <>
      <Text style={styles.title}>{challengeData.name}</Text>
      <Text style={styles.subtitle}>Challenge Invitation</Text>

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Activity</Text>
          <Text style={styles.detailValue}>
            {QRCodeService.formatActivity(challengeData.activity)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Metric</Text>
          <Text style={styles.detailValue}>
            {QRCodeService.formatMetric(challengeData.metric)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Duration</Text>
          <Text style={styles.detailValue}>
            {QRCodeService.formatDuration(challengeData.duration)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Wager</Text>
          <Text style={styles.detailValue}>
            {QRCodeService.formatWager(challengeData.wager)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Starts</Text>
          <Text style={styles.detailValue}>
            {new Date(challengeData.startsAt * 1000).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Ends</Text>
          <Text style={styles.detailValue}>
            {new Date(challengeData.expiresAt * 1000).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <Text style={styles.note}>
        Wager is a handshake promise between participants
      </Text>
    </>
  );

  const renderEventDetails = (eventData: Extract<QRData, { type: 'event' }>) => (
    <>
      <Text style={styles.title}>{eventData.name}</Text>
      <Text style={styles.subtitle}>Event Invitation</Text>

      {eventData.description && (
        <Text style={styles.description}>{eventData.description}</Text>
      )}

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Starts</Text>
          <Text style={styles.detailValue}>
            {new Date(eventData.starts * 1000).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Ends</Text>
          <Text style={styles.detailValue}>
            {new Date(eventData.ends * 1000).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <Text style={styles.note}>
        Request will be sent to the event captain for approval
      </Text>
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {data.type === 'challenge'
              ? renderChallengeDetails(data)
              : renderEventDetails(data)}
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.joinButton, isJoining && styles.buttonDisabled]}
              onPress={handleJoin}
              disabled={isJoining}
            >
              {isJoining ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.joinButtonText}>
                  {data.type === 'challenge' ? 'Accept Challenge' : 'Request to Join'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isJoining}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
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
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  scrollContent: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  note: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  buttonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  joinButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: theme.colors.textMuted,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
