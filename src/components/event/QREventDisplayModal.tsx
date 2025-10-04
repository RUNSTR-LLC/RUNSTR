/**
 * QR Event Display Modal
 * Full-screen modal showing event entry QR code with sharing options
 * Used by captains to display event QR codes for participant scanning
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  Modal,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
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

interface QREventDisplayModalProps {
  visible: boolean;
  eventData: QREventData;
  qrString: string;
  deepLink: string;
  onClose: () => void;
}

export const QREventDisplayModal: React.FC<QREventDisplayModalProps> = ({
  visible,
  eventData,
  qrString,
  deepLink,
  onClose,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const qrCodeRef = React.useRef<View>(null);

  const activityIcon = ACTIVITY_ICONS[eventData.activity_type.toLowerCase()] || '🏃';
  const isPaidEvent = eventData.entry_fee > 0;

  /**
   * Save QR code to device photos
   */
  const handleSaveToPhotos = async () => {
    try {
      setIsSaving(true);

      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to save QR code to photos');
        return;
      }

      // Capture QR code view as image
      if (!qrCodeRef.current) {
        throw new Error('QR code view not ready');
      }

      const uri = await captureRef(qrCodeRef, {
        format: 'png',
        quality: 1,
      });

      // Save to device
      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('RUNSTR', asset, false);

      Alert.alert('Saved!', 'Event QR code saved to Photos');
    } catch (error) {
      console.error('Failed to save QR code:', error);
      Alert.alert('Save Failed', 'Could not save QR code to photos');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Share event via native share sheet
   */
  const handleShareCode = async () => {
    try {
      const eventDate = new Date(eventData.event_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      const message = `Join my event on RUNSTR!\n\n${activityIcon} ${eventData.event_name}\n📅 ${eventDate}${
        isPaidEvent ? `\n⚡ ${eventData.entry_fee.toLocaleString()} sats entry` : ''
      }\n\nScan the QR code or use this link:\n${deepLink}`;

      await Share.share({
        message,
        url: deepLink, // iOS only
        title: 'RUNSTR Event',
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const eventDate = new Date(eventData.event_date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Event Entry QR Code</Text>
          <Text style={styles.subtitle}>
            Share this code for easy event registration
          </Text>
        </View>

        {/* QR Code Container */}
        <View style={styles.qrContainer} ref={qrCodeRef}>
          <View style={styles.qrWrapper}>
            <QRCode
              value={qrString}
              size={240}
              backgroundColor="#ffffff"
              color="#000000"
            />
          </View>
        </View>

        {/* Event Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.eventName}>{eventData.event_name}</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryIcon}>{activityIcon}</Text>
            <Text style={styles.summaryText}>
              {eventData.activity_type.charAt(0).toUpperCase() +
               eventData.activity_type.slice(1)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryIcon}>📅</Text>
            <Text style={styles.summaryText}>{eventDate}</Text>
          </View>

          {eventData.team_name && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryIcon}>👥</Text>
              <Text style={styles.summaryText}>{eventData.team_name}</Text>
            </View>
          )}

          {isPaidEvent && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryIcon}>⚡</Text>
              <Text style={styles.summaryText}>
                {eventData.entry_fee.toLocaleString()} sats entry fee
              </Text>
            </View>
          )}

          {eventData.max_participants && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryIcon}>🎯</Text>
              <Text style={styles.summaryText}>
                Max {eventData.max_participants} participants
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSaveToPhotos}
            disabled={isSaving}
          >
            <Text style={styles.secondaryButtonText}>
              {isSaving ? 'Saving...' : 'Save to Photos'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleShareCode}
          >
            <Text style={styles.primaryButtonText}>Share Code</Text>
          </TouchableOpacity>
        </View>

        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
  },

  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 32,
  },

  title: {
    fontSize: 24,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },

  qrContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },

  qrWrapper: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: theme.borderRadius.large,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },

  summaryCard: {
    backgroundColor: theme.colors.prizeBackground,
    borderRadius: theme.borderRadius.medium,
    padding: 16,
    marginBottom: 24,
  },

  eventName: {
    fontSize: 20,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    marginBottom: 12,
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },

  summaryIcon: {
    fontSize: 20,
    marginRight: 12,
  },

  summaryText: {
    fontSize: 16,
    color: theme.colors.text,
  },

  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },

  primaryButton: {
    flex: 1,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.medium,
    paddingVertical: 14,
    alignItems: 'center',
  },

  primaryButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.accentText,
  },

  secondaryButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.buttonBorder,
    borderRadius: theme.borderRadius.medium,
    paddingVertical: 14,
    alignItems: 'center',
  },

  secondaryButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
  },

  closeButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.buttonBorder,
    borderRadius: theme.borderRadius.medium,
    paddingVertical: 14,
    alignItems: 'center',
  },

  closeButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
  },
});
