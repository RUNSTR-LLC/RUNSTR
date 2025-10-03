/**
 * SuccessScreen - Final screen of challenge creation wizard
 * Shows animated confirmation that the challenge was created successfully
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Share,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { theme } from '../../../styles/theme';
import { ChallengeCreationData } from '../../../types';
import type { ChallengeQRData } from '../../../services/qr/QRCodeService';

interface SuccessScreenProps {
  challengeData: ChallengeCreationData;
  currentUserName?: string;
  qrData?: ChallengeQRData | null;
  onDone: () => void;
  isInAppChallenge?: boolean; // True if challenge sent via in-app button, false if QR
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({
  challengeData,
  currentUserName = 'Alex',
  qrData,
  onDone,
  isInAppChallenge = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const handleShare = async () => {
    if (!qrData) return;

    try {
      const challengeUrl = `runstr://challenge/${qrData.id}`;
      const message = `I challenge you to a ${qrData.activity} competition! ${qrData.metric} for ${qrData.duration} days. Wager: ${qrData.wager} sats. Accept the challenge: ${challengeUrl}`;

      await Share.share({
        message,
        title: 'RUNSTR Challenge',
        ...(Platform.OS === 'ios' && { url: challengeUrl }),
      });
    } catch (error) {
      console.error('Failed to share challenge:', error);
    }
  };

  useEffect(() => {
    // Animate the success icon with a pop effect
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim]);

  const getChallengeName = () => {
    if (challengeData.opponentInfo && challengeData.challengeType) {
      return `${currentUserName} vs ${challengeData.opponentInfo.name} ${challengeData.challengeType.name}`;
    }
    return 'Challenge Created';
  };

  const getChallengeSummary = () => {
    const wagerText = `${challengeData.wagerAmount.toLocaleString()} sats`;
    const durationText = `${challengeData.duration} days`;
    return `${wagerText} • ${durationText}`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Success Icon */}
      <Animated.View
        style={[
          styles.successIcon,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Text style={styles.successIconText}>✓</Text>
      </Animated.View>

      {/* Success Text */}
      <Text style={styles.successTitle}>
        {isInAppChallenge ? 'Challenge Sent!' : 'Challenge Created!'}
      </Text>
      <Text style={styles.successSubtitle}>
        {isInAppChallenge
          ? 'Waiting for opponent to accept...'
          : 'Share this QR code with your opponent'}
      </Text>

      {/* QR Code (only for QR challenges) */}
      {qrData && !isInAppChallenge && (
        <View style={styles.qrContainer}>
          <QRCode
            value={JSON.stringify(qrData)}
            size={220}
            backgroundColor="#000"
          />
        </View>
      )}

      {/* Status indicator for in-app challenges */}
      {isInAppChallenge && (
        <View style={styles.statusContainer}>
          <Ionicons name="time-outline" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.statusText}>
            Your opponent will receive a notification
          </Text>
          <Text style={styles.statusSubtext}>
            You'll be notified when they accept or decline
          </Text>
        </View>
      )}

      {/* Challenge Details */}
      <View style={styles.successDetails}>
        <Text style={styles.challengeName}>{getChallengeName()}</Text>
        <Text style={styles.challengeSummary}>{getChallengeSummary()}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {qrData && !isInAppChallenge && (
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Ionicons name="share-outline" size={20} color={theme.colors.text} />
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.doneButton, qrData && !isInAppChallenge && styles.doneButtonSecondary]}
          onPress={onDone}
          activeOpacity={0.8}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successIconText: {
    fontSize: 40,
    color: theme.colors.accentText,
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  successDetails: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    width: '100%',
    alignItems: 'center',
  },
  challengeName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  challengeSummary: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  qrContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  statusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  doneButton: {
    flex: 1,
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonSecondary: {
    flex: 1,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accentText,
  },
});
