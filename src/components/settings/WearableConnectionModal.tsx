/**
 * WearableConnectionModal - Explains how wearables connect via Apple Health / Health Connect
 * Provides a simple UI for users to understand and trigger the connection flow
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import healthKitService from '../../services/fitness/healthKitService';
import healthConnectService from '../../services/fitness/healthConnectService';

interface WearableConnectionModalProps {
  visible: boolean;
  onClose: () => void;
  onConnectionSuccess?: () => void;
}

type ConnectionStatus = 'unknown' | 'connected' | 'not_connected';

// Platform-specific content
const platformContent = {
  ios: {
    serviceName: 'Apple Health',
    icon: 'heart' as const,
    description:
      'RUNSTR connects to your wearable through Apple Health. Your Apple Watch, Garmin, Whoop, Oura Ring, and other fitness devices sync workouts to Apple Health, which RUNSTR can then access.',
    steps: [
      'Ensure your wearable syncs to Apple Health',
      'Grant RUNSTR permission to read your workout data',
      'Your workouts will appear automatically',
    ],
  },
  android: {
    serviceName: 'Health Connect',
    icon: 'fitness' as const,
    description:
      'RUNSTR connects to your wearable through Health Connect. Your Wear OS watch, Samsung Galaxy Watch, Fitbit, and other devices sync workouts to Health Connect, which RUNSTR can then access.',
    steps: [
      'Install Health Connect from Google Play if needed',
      'Ensure your wearable syncs to Health Connect',
      'Grant RUNSTR permission to read your workout data',
    ],
  },
};

export const WearableConnectionModal: React.FC<WearableConnectionModalProps> = ({
  visible,
  onClose,
  onConnectionSuccess,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('unknown');
  const [error, setError] = useState<string | null>(null);

  const content = Platform.OS === 'ios' ? platformContent.ios : platformContent.android;

  // Check connection status when modal opens
  useEffect(() => {
    if (visible) {
      checkConnectionStatus();
    }
  }, [visible]);

  const checkConnectionStatus = async () => {
    try {
      if (Platform.OS === 'ios') {
        const status = healthKitService.getStatus();
        setConnectionStatus(status.authorized ? 'connected' : 'not_connected');
      } else {
        const status = healthConnectService.getStatus();
        setConnectionStatus(status.authorized ? 'connected' : 'not_connected');
      }
    } catch (err) {
      console.error('Error checking connection status:', err);
      setConnectionStatus('not_connected');
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      if (Platform.OS === 'ios') {
        const result = await healthKitService.requestPermissions();
        if (result.success) {
          setConnectionStatus('connected');
          onConnectionSuccess?.();
        } else {
          setError(result.error || 'Failed to connect. Please try again.');
        }
      } else {
        const result = await healthConnectService.requestPermissions();
        if (result.success) {
          setConnectionStatus('connected');
          onConnectionSuccess?.();
        } else {
          setError(result.error || 'Failed to connect. Please try again.');
        }
      }
    } catch (err) {
      console.error('Error connecting:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#999999" />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="watch-outline" size={48} color={theme.colors.accent} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Connect Your Wearable</Text>

          {/* Description */}
          <Text style={styles.description}>{content.description}</Text>

          {/* How it works */}
          <View style={styles.stepsContainer}>
            <Text style={styles.stepsTitle}>How it works:</Text>
            {content.steps.map((step, index) => (
              <Text key={index} style={styles.stepText}>
                {index + 1}. {step}
              </Text>
            ))}
          </View>

          {/* Error message */}
          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Connect Button or Connected Status */}
          {connectionStatus === 'connected' ? (
            <View style={styles.connectedContainer}>
              <Ionicons name="checkmark-circle" size={24} color="#FF9D42" />
              <Text style={styles.connectedText}>
                Connected to {content.serviceName}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.connectButton, isConnecting && styles.connectButtonDisabled]}
              onPress={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator color={theme.colors.background} />
              ) : (
                <Text style={styles.connectButtonText}>
                  Connect {content.serviceName}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 24,
    marginHorizontal: 20,
    maxWidth: 400,
    width: '90%',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    zIndex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  stepsContainer: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  stepsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  stepText: {
    fontSize: 13,
    color: '#999999',
    marginBottom: 8,
    lineHeight: 18,
  },
  connectButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  connectButtonDisabled: {
    opacity: 0.6,
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  connectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 157, 66, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  connectedText: {
    fontSize: 14,
    color: '#FF9D42',
    marginLeft: 8,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 13,
    color: theme.colors.accent,
    textAlign: 'center',
    marginBottom: 12,
  },
});
