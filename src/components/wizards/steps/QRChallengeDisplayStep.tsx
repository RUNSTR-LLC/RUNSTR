/**
 * QR Challenge Display Step
 * Shows generated QR code for open challenge with sharing options
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Share } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { captureRef } from 'react-native-view-shot';
import { theme } from '../../../styles/theme';
import type { QRChallengeData } from '../../../services/challenge/QRChallengeService';
import type { ActivityType } from '../../../types/challenge';

// Activity icons mapping
const ACTIVITY_ICONS: Record<ActivityType, string> = {
  running: '🏃',
  walking: '🚶',
  cycling: '🚴',
  hiking: '🥾',
  swimming: '🏊',
  rowing: '🚣',
  workout: '💪',
};

interface QRChallengeDisplayStepProps {
  challengeData: QRChallengeData;
  qrString: string;
  deepLink: string;
  onDone: () => void;
}

export const QRChallengeDisplayStep: React.FC<QRChallengeDisplayStepProps> = ({
  challengeData,
  qrString,
  deepLink,
  onDone,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const qrCodeRef = React.useRef<View>(null);

  const activityIcon = ACTIVITY_ICONS[challengeData.activity] || '🏃';

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

      Alert.alert('Saved!', 'QR code saved to Photos');
    } catch (error) {
      console.error('Failed to save QR code:', error);
      Alert.alert('Save Failed', 'Could not save QR code to photos');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Share challenge via native share sheet
   */
  const handleShareCode = async () => {
    try {
      const message = `Challenge me on RUNSTR!\n\n${activityIcon} ${challengeData.activity} - ${challengeData.metric} - ${challengeData.duration} days${challengeData.wager > 0 ? `\n⚡ ${challengeData.wager.toLocaleString()} sats` : ''}\n\nScan the QR code or use this link:\n${deepLink}`;

      await Share.share({
        message,
        url: deepLink, // iOS only
        title: 'RUNSTR Challenge',
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Challenge is Ready!</Text>
        <Text style={styles.subtitle}>
          Share this QR code with anyone to challenge them
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

      {/* Challenge Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryIcon}>{activityIcon}</Text>
          <Text style={styles.summaryText}>
            {challengeData.activity.charAt(0).toUpperCase() + challengeData.activity.slice(1)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryIcon}>📏</Text>
          <Text style={styles.summaryText}>
            {challengeData.metric.charAt(0).toUpperCase() + challengeData.metric.slice(1)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryIcon}>📅</Text>
          <Text style={styles.summaryText}>{challengeData.duration} days</Text>
        </View>

        {challengeData.wager > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryIcon}>⚡</Text>
            <Text style={styles.summaryText}>
              {challengeData.wager.toLocaleString()} sats
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

      {/* Done Button */}
      <TouchableOpacity style={styles.doneButton} onPress={onDone}>
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
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

  doneButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.buttonBorder,
    borderRadius: theme.borderRadius.medium,
    paddingVertical: 14,
    alignItems: 'center',
  },

  doneButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
  },
});
