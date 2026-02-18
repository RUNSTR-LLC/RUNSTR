/**
 * NWCQRConfirmationModal - Confirm NWC wallet connection from scanned QR code
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
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { theme } from '../../styles/theme';
import { NWCStorageService } from '../../services/wallet/NWCStorageService';

const NWC_HINT_SHOWN_KEY = '@runstr:nwc_hint_shown';

interface NWCQRConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  connectionString: string;
  onSuccess: () => void;
}

export const NWCQRConfirmationModal: React.FC<NWCQRConfirmationModalProps> = ({
  visible,
  onClose,
  connectionString,
  onSuccess,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const result = await NWCStorageService.saveNWCString(connectionString);

      if (!result.success) {
        throw new Error(result.error || 'Failed to connect wallet');
      }

      // Show one-time hint toast about long-press zapping
      try {
        const hintShown = await AsyncStorage.getItem(NWC_HINT_SHOWN_KEY);
        if (!hintShown) {
          await AsyncStorage.setItem(NWC_HINT_SHOWN_KEY, 'true');
          setTimeout(() => {
            Toast.show({
              type: 'success',
              text1: 'Wallet Connected!',
              text2: 'Long-press any lightning bolt to quick-zap',
              position: 'top',
              visibilityTime: 5000,
            });
          }, 500);
        }
      } catch (e) {
        // Non-critical, ignore
      }

      Alert.alert(
        'Wallet Connected',
        'Your Lightning wallet has been successfully connected via NWC.',
        [
          {
            text: 'OK',
            onPress: () => {
              onSuccess();
              onClose();
            },
          },
        ]
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMessage);
      console.error('Failed to save NWC connection:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  // Mask the connection string for display (show first 30 and last 20 chars)
  const getMaskedConnectionString = () => {
    if (connectionString.length <= 60) {
      return connectionString;
    }
    const start = connectionString.substring(0, 30);
    const end = connectionString.substring(connectionString.length - 20);
    return `${start}...${end}`;
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
          <View style={styles.content}>
            <Text style={styles.title}>Connect Wallet</Text>
            <Text style={styles.subtitle}>Nostr Wallet Connect (NWC)</Text>

            <View style={styles.infoContainer}>
              <Text style={styles.infoLabel}>Connection String</Text>
              <View style={styles.connectionBox}>
                <Text style={styles.connectionText} numberOfLines={3}>
                  {getMaskedConnectionString()}
                </Text>
              </View>
            </View>

            <Text style={styles.note}>
              This will connect your Lightning wallet to RUNSTR for receiving
              payments and managing team funds.
            </Text>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.connectButton,
                isConnecting && styles.buttonDisabled,
              ]}
              onPress={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator size="small" color={theme.colors.accentText} />
              ) : (
                <Text style={styles.connectButtonText}>Connect Wallet</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isConnecting}
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
  },
  content: {
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
  infoContainer: {
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  connectionBox: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
  },
  connectionText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
  },
  note: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 8,
    lineHeight: 18,
  },
  errorContainer: {
    backgroundColor: '#1a0a0a',
    borderWidth: 1,
    borderColor: '#FF6B00',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#FF6B00',
    textAlign: 'center',
  },
  buttonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  connectButton: {
    backgroundColor: theme.colors.orangeDeep,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accentText,
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
