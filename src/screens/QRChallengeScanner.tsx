/**
 * QR Challenge Scanner
 * Camera-based QR code scanner for accepting challenges
 * Also includes manual code input fallback
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { theme } from '../styles/theme';
import { QRChallengeParser } from '../services/challenge/QRChallengeParser';
import { QRChallengePreviewModal } from '../components/challenge/QRChallengePreviewModal';
import { QREventParser } from '../services/event/QREventParser';
import { QREventPreviewModal } from '../components/event/QREventPreviewModal';
import { eventJoinService } from '../services/event/EventJoinService';
import type { QRChallengeData } from '../services/challenge/QRChallengeService';
import type { QREventData } from '../services/event/QREventService';

interface QRChallengeScannerProps {
  navigation: any;
}

export const QRChallengeScanner: React.FC<QRChallengeScannerProps> = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [challengeData, setChallengeData] = useState<QRChallengeData | null>(null);
  const [eventData, setEventData] = useState<QREventData | null>(null);
  const [challengePreviewVisible, setChallengePreviewVisible] = useState(false);
  const [eventPreviewVisible, setEventPreviewVisible] = useState(false);

  // Request camera permissions on mount
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  /**
   * Handle QR code scan
   */
  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;

    setScanned(true);

    // Try parsing as challenge QR first
    const challengeResult = QRChallengeParser.parseQRData(data);

    if (challengeResult.success && challengeResult.data) {
      // It's a challenge QR
      setChallengeData(challengeResult.data);
      setChallengePreviewVisible(true);
      return;
    }

    // Try parsing as event QR
    const eventResult = QREventParser.parseQRData(data);

    if (eventResult.success && eventResult.data) {
      // It's an event QR
      setEventData(eventResult.data);
      setEventPreviewVisible(true);
      return;
    }

    // Neither challenge nor event - show error
    Alert.alert(
      'Invalid QR Code',
      'This QR code is not a valid challenge or event',
      [{ text: 'Try Again', onPress: () => setScanned(false) }]
    );
  };

  /**
   * Handle manual code input
   */
  const handleManualSubmit = () => {
    if (!manualCode.trim()) {
      Alert.alert('Error', 'Please enter a code');
      return;
    }

    // Try parsing as challenge QR first
    const challengeResult = QRChallengeParser.parseQRData(manualCode.trim());

    if (challengeResult.success && challengeResult.data) {
      // It's a challenge code
      setChallengeData(challengeResult.data);
      setChallengePreviewVisible(true);
      return;
    }

    // Try parsing as event QR
    const eventResult = QREventParser.parseQRData(manualCode.trim());

    if (eventResult.success && eventResult.data) {
      // It's an event code
      setEventData(eventResult.data);
      setEventPreviewVisible(true);
      return;
    }

    // Neither challenge nor event
    Alert.alert(
      'Invalid Code',
      'This code is not a valid challenge or event'
    );
  };

  /**
   * Handle challenge accepted
   */
  const handleChallengeAccepted = () => {
    setChallengePreviewVisible(false);
    setChallengeData(null);

    // Navigate back to main app
    navigation.goBack();
  };

  /**
   * Handle challenge declined or preview closed
   */
  const handleChallengePreviewClose = () => {
    setChallengePreviewVisible(false);
    setChallengeData(null);
    setScanned(false);
  };

  /**
   * Handle event join
   */
  const handleEventJoin = async (eventData: QREventData) => {
    try {
      const result = await eventJoinService.joinEvent(eventData);

      if (result.success) {
        // Close modal and navigate back
        setEventPreviewVisible(false);
        setEventData(null);
        navigation.goBack();
      }
      // Error is already shown by the service via Alert
    } catch (error) {
      console.error('Unexpected error in handleEventJoin:', error);
    }
  };

  /**
   * Handle event preview closed
   */
  const handleEventPreviewClose = () => {
    setEventPreviewVisible(false);
    setEventData(null);
    setScanned(false);
  };

  // Permission loading state
  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Permission denied
  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan QR Code</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Camera permission denied</Text>
          <Text style={styles.errorSubtext}>
            Please enable camera access in Settings to scan QR codes
          </Text>
          <TouchableOpacity
            style={styles.manualInputButton}
            onPress={() => setShowManualInput(true)}
          >
            <Text style={styles.manualInputButtonText}>
              Enter Code Manually
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Challenge</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Camera View */}
      {!showManualInput && (
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          >
            {/* Viewfinder Overlay */}
            <View style={styles.overlay}>
              <View style={styles.viewfinderContainer}>
                <View style={styles.viewfinder} />
              </View>
              <View style={styles.instructionContainer}>
                <Text style={styles.instructionText}>
                  Point camera at QR code
                </Text>
              </View>
            </View>
          </CameraView>

          {/* Manual Input Toggle */}
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={styles.manualInputToggle}
              onPress={() => setShowManualInput(true)}
            >
              <Text style={styles.manualInputToggleText}>
                Or paste code manually ↓
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Manual Code Input */}
      {showManualInput && (
        <View style={styles.manualInputContainer}>
          <Text style={styles.manualInputTitle}>Enter Code</Text>
          <Text style={styles.manualInputSubtitle}>
            Paste the challenge or event code you received
          </Text>

          <TextInput
            style={styles.manualInput}
            value={manualCode}
            onChangeText={setManualCode}
            placeholder="Paste code here"
            placeholderTextColor={theme.colors.textMuted}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.manualInputActions}>
            <TouchableOpacity
              style={styles.manualCancelButton}
              onPress={() => {
                setShowManualInput(false);
                setManualCode('');
              }}
            >
              <Text style={styles.manualCancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.manualSubmitButton}
              onPress={handleManualSubmit}
            >
              <Text style={styles.manualSubmitButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Challenge Preview Modal */}
      {challengeData && (
        <QRChallengePreviewModal
          visible={challengePreviewVisible}
          challengeData={challengeData}
          onAccept={handleChallengeAccepted}
          onClose={handleChallengePreviewClose}
        />
      )}

      {/* Event Preview Modal */}
      {eventData && (
        <QREventPreviewModal
          visible={eventPreviewVisible}
          eventData={eventData}
          onJoinEvent={handleEventJoin}
          onClose={handleEventPreviewClose}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  backButton: {
    padding: 4,
  },

  backButtonText: {
    fontSize: 16,
    color: theme.colors.text,
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },

  headerSpacer: {
    width: 60,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },

  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },

  errorSubtext: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },

  manualInputButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: theme.borderRadius.medium,
  },

  manualInputButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accentText,
  },

  cameraContainer: {
    flex: 1,
  },

  camera: {
    flex: 1,
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },

  viewfinderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  viewfinder: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: theme.borderRadius.large,
  },

  instructionContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },

  instructionText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
  },

  bottomActions: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  manualInputToggle: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },

  manualInputToggleText: {
    fontSize: 15,
    color: '#ffffff',
    textDecorationLine: 'underline',
  },

  manualInputContainer: {
    flex: 1,
    padding: 20,
  },

  manualInputTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 8,
  },

  manualInputSubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: 24,
  },

  manualInput: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    padding: 16,
    fontSize: 14,
    color: theme.colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 24,
  },

  manualInputActions: {
    flexDirection: 'row',
    gap: 12,
  },

  manualCancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.buttonBorder,
    borderRadius: theme.borderRadius.medium,
    paddingVertical: 14,
    alignItems: 'center',
  },

  manualCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },

  manualSubmitButton: {
    flex: 1,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.medium,
    paddingVertical: 14,
    alignItems: 'center',
  },

  manualSubmitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accentText,
  },
});
