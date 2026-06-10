/**
 * QRScannerModal - Camera-based QR code scanner for NWC wallet connections
 * Uses modern DataScannerViewController on iOS 16+ for better QR detection
 * Falls back to continuous camera scanning on Android and older iOS devices
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Device from 'expo-device';
import { theme } from '../../styles/theme';
import type { QRData } from '../../services/qr/QRCodeService';
import QRCodeService from '../../services/qr/QRCodeService';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (data: QRData) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  visible,
  onClose,
  onScanned,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [useNativeScanner, setUseNativeScanner] = useState(false);

  useEffect(() => {
    if (visible) {
      console.log('[QRScanner] Modal visible, resetting scanned state');
      setScanned(false);
      // Check if device supports native scanner (iOS 16+ or Android)
      checkNativeScannerSupport();
    }
  }, [visible]);

  const checkNativeScannerSupport = async () => {
    // Native scanner APIs (launchScanner, onModernBarcodeScanned, dismissScanner)
    // are iOS 16+ only - they work great on iOS but don't exist on Android
    if (Platform.OS === 'ios') {
      const osVersion = Platform.Version;
      const majorVersion =
        typeof osVersion === 'string'
          ? parseInt(osVersion.split('.')[0], 10)
          : osVersion;
      const useNative = majorVersion >= 16;
      console.log('[QRScanner] iOS version:', majorVersion, '- using', useNative ? 'native' : 'fallback', 'scanner');
      setUseNativeScanner(useNative);
    } else {
      // Android and other platforms use fallback CameraView scanner
      console.log('[QRScanner] Non-iOS platform, using fallback scanner');
      setUseNativeScanner(false);
    }
  };

  /**
   * Launch native scanner modal (iOS 16+ DataScannerViewController)
   * Much more reliable for high-density QR codes like NWC connection strings
   */
  const handleLaunchNativeScanner = async () => {
    try {
      // Set up listener for scan results
      const subscription = CameraView.onModernBarcodeScanned((result) => {
        console.log(
          '[QRScanner] Native scanner detected barcode:',
          result.type
        );

        // Process the scanned data
        handleScanResult(result.data);

        // Dismiss the scanner
        CameraView.dismissScanner().catch((err) => {
          console.warn('[QRScanner] Failed to dismiss scanner:', err);
        });

        // Clean up subscription
        subscription.remove();
      });

      // Launch the native scanner modal
      await CameraView.launchScanner({
        barcodeTypes: ['qr'],
        isGuidanceEnabled: true,
        isHighlightingEnabled: true,
        isPinchToZoomEnabled: true,
      });
    } catch (error) {
      console.error('[QRScanner] Native scanner error:', error);
      Alert.alert(
        'Scanner Error',
        'Unable to launch native scanner. Please try the manual scanner.',
        [
          {
            text: 'Try Manual Scanner',
            onPress: () => setUseNativeScanner(false),
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: onClose,
          },
        ]
      );
    }
  };

  /**
   * Process scanned QR data (shared by both native scanner and fallback camera scanner)
   */
  const handleScanResult = (data: string) => {
    try {
      const service = QRCodeService.getInstance();
      const qrData = service.parseQR(data);

      if (!qrData) {
        Alert.alert(
          'Invalid QR Code',
          'This QR code is not a valid NWC wallet connection string.',
          [
            {
              text: 'Try Again',
              onPress: () => setScanned(false),
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: onClose,
            },
          ]
        );
        return;
      }

      onScanned(qrData);
      onClose();
    } catch (error) {
      console.error('[QRScanner] Scan error:', error);
      Alert.alert(
        'Scan Failed',
        'Unable to process QR code. Please try again.',
        [
          {
            text: 'Try Again',
            onPress: () => setScanned(false),
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: onClose,
          },
        ]
      );
    }
  };

  /**
   * Fallback handler for continuous camera scanning (Android and older iOS)
   */
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    console.log('[QRScanner] Barcode scanned callback fired, data:', data?.substring(0, 50) + '...');
    if (scanned) {
      console.log('[QRScanner] Already scanned, ignoring');
      return;
    }
    setScanned(true);
    handleScanResult(data);
  };

  const handlePermissionRequest = async () => {
    const result = await requestPermission();

    if (!result.granted) {
      Alert.alert(
        'Camera Permission Required',
        'Please enable camera access in Settings to scan QR codes.',
        [
          {
            text: 'Open Settings',
            onPress: () => Linking.openSettings(),
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: onClose,
          },
        ]
      );
    }
  };

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionTitle}>Camera Access</Text>
            <Text style={styles.permissionText}>
              RUNSTR needs camera access to scan QR codes
            </Text>

            <TouchableOpacity
              style={styles.permissionButton}
              onPress={handlePermissionRequest}
            >
              <Text style={styles.permissionButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Modern native scanner (iOS 16+ / Android)
  if (useNativeScanner) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.nativeScannerContainer}>
            <Text style={styles.nativeScannerTitle}>Connect Wallet</Text>
            <Text style={styles.nativeScannerText}>
              Scan your NWC wallet QR code to connect your wallet
            </Text>

            <TouchableOpacity
              style={styles.launchScannerButton}
              onPress={handleLaunchNativeScanner}
            >
              <Text style={styles.launchScannerButtonText}>
                Open Camera Scanner
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.useFallbackButton}
              onPress={() => setUseNativeScanner(false)}
            >
              <Text style={styles.useFallbackButtonText}>
                Use Manual Scanner Instead
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Fallback continuous camera scanner (Android and older iOS)
  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        >
          <View style={styles.overlay}>
            <View style={styles.topOverlay} />

            <View style={styles.middleContainer}>
              <View style={styles.sideOverlay} />
              <View style={styles.scanArea}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              <View style={styles.sideOverlay} />
            </View>

            <View style={styles.bottomOverlay}>
              <Text style={styles.instructionText}>
                Scan your NWC wallet QR code to connect your wallet
              </Text>

              <TouchableOpacity
                style={styles.closeButtonCamera}
                onPress={onClose}
              >
                <Text style={styles.closeButtonTextCamera}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  middleContainer: {
    flexDirection: 'row',
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanArea: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: theme.colors.orangeDeep,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  instructionText: {
    fontSize: 16,
    color: theme.colors.textBright,
    textAlign: 'center',
    marginBottom: 24,
  },
  closeButtonCamera: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
  },
  closeButtonTextCamera: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  permissionContainer: {
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 24,
    width: '80%',
    maxWidth: 350,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  nativeScannerContainer: {
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 24,
    width: '80%',
    maxWidth: 350,
  },
  nativeScannerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  nativeScannerText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  launchScannerButton: {
    backgroundColor: theme.colors.orangeDeep,
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  launchScannerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.background,
    textAlign: 'center',
  },
  useFallbackButton: {
    paddingVertical: 12,
    marginBottom: 8,
  },
  useFallbackButtonText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
