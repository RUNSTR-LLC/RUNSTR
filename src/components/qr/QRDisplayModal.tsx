/**
 * QRDisplayModal - Display QR codes for challenges and events
 * Clean black and white minimalistic design
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { theme } from '../../styles/theme';
import type { QRData } from '../../services/qr/QRCodeService';
import QRCodeService from '../../services/qr/QRCodeService';

interface QRDisplayModalProps {
  visible: boolean;
  onClose: () => void;
  data: QRData;
}

export const QRDisplayModal: React.FC<QRDisplayModalProps> = ({
  visible,
  onClose,
  data,
}) => {
  const qrString = JSON.stringify(data);

  const renderDetails = () => {
    if (data.type === 'challenge') {
      return (
        <View style={styles.detailsContainer}>
          <Text style={styles.title}>{data.name}</Text>
          <Text style={styles.subtitle}>Challenge Invitation</Text>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Activity</Text>
            <Text style={styles.value}>
              {QRCodeService.formatActivity(data.activity)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Metric</Text>
            <Text style={styles.value}>
              {QRCodeService.formatMetric(data.metric)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Duration</Text>
            <Text style={styles.value}>
              {QRCodeService.formatDuration(data.duration)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Wager</Text>
            <Text style={styles.value}>
              {QRCodeService.formatWager(data.wager)}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.detailsContainer}>
        <Text style={styles.title}>{data.name}</Text>
        <Text style={styles.subtitle}>Event Invitation</Text>

        {data.description && (
          <Text style={styles.description}>{data.description}</Text>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.label}>Starts</Text>
          <Text style={styles.value}>
            {new Date(data.starts * 1000).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Ends</Text>
          <Text style={styles.value}>
            {new Date(data.ends * 1000).toLocaleDateString()}
          </Text>
        </View>
      </View>
    );
  };

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
            {renderDetails()}

            <View style={styles.qrContainer}>
              <QRCode value={qrString} size={250} backgroundColor="#000" />
            </View>

            <Text style={styles.runstrBranding}>RUNSTR</Text>

            <Text style={styles.instruction}>
              Show this QR code to invite others
            </Text>
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
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
    alignItems: 'center',
  },
  detailsContainer: {
    width: '100%',
    marginBottom: 24,
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
    marginBottom: 20,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  label: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  qrContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  runstrBranding: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 8,
  },
  instruction: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  closeButton: {
    backgroundColor: theme.colors.orangeDeep, // Deep orange close button
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accentText, // Black text on orange
  },
});
