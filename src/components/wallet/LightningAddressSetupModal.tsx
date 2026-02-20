/**
 * LightningAddressSetupModal - Set up Lightning address for "You" team
 *
 * Shown when user selects "You" as their team.
 * Simple flow: enter a Lightning address → save.
 * Pre-fills from Nostr profile lud16 if available.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { RewardLightningAddressService } from '../../services/rewards/RewardLightningAddressService';

interface LightningAddressSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (address: string) => void;
  prefillAddress?: string; // From kind 0 lud16
}

export const LightningAddressSetupModal: React.FC<LightningAddressSetupModalProps> = ({
  visible,
  onClose,
  onSuccess,
  prefillAddress,
}) => {
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingAddress, setExistingAddress] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadExistingAddress();
    }
  }, [visible]);

  const loadExistingAddress = async () => {
    const saved = await RewardLightningAddressService.getRewardLightningAddress();
    if (saved) {
      setExistingAddress(saved);
      setAddress(saved);
    } else if (prefillAddress) {
      setAddress(prefillAddress);
      setExistingAddress(null);
    } else {
      setAddress('');
      setExistingAddress(null);
    }
    setError(null);
  };

  const isValidAddress = RewardLightningAddressService.isValidLightningAddress(address.trim());

  const handleSave = async () => {
    if (!isValidAddress) {
      setError('Please enter a valid Lightning address (e.g., user@walletofsatoshi.com)');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await RewardLightningAddressService.setRewardLightningAddress(address.trim());
      onSuccess(address.trim());
    } catch (err) {
      console.error('[LightningSetup] Save error:', err);
      setError('Failed to save address. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="flash" size={24} color={theme.colors.text} />
            </View>
            <Text style={styles.title}>Lightning Address</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Already configured state */}
          {existingAddress ? (
            <>
              <View style={styles.existingBox}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                <View style={styles.existingContent}>
                  <Text style={styles.existingTitle}>Address Configured</Text>
                  <Text style={styles.existingAddress}>{existingAddress}</Text>
                </View>
              </View>

              <Text style={styles.description}>
                Your workout rewards are sent to this address. Change it below if needed.
              </Text>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="user@walletofsatoshi.com"
                  placeholderTextColor={theme.colors.textMuted}
                  value={address}
                  onChangeText={(text) => {
                    setAddress(text);
                    setError(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!isSaving}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, (!isValidAddress || isSaving) && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={!isValidAddress || isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.description}>
                Enter your Lightning address to receive workout rewards directly in sats.
              </Text>

              {/* Lightning Address Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="user@walletofsatoshi.com"
                  placeholderTextColor={theme.colors.textMuted}
                  value={address}
                  onChangeText={(text) => {
                    setAddress(text);
                    setError(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!isSaving}
                  autoFocus={!prefillAddress}
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.primaryButton, (!isValidAddress || isSaving) && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={!isValidAddress || isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save</Text>
                )}
              </TouchableOpacity>

              {/* Hint */}
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={18} color={theme.colors.textMuted} />
                <Text style={styles.infoText}>
                  Get a free Lightning address from Wallet of Satoshi, Strike, Alby, or any Lightning wallet.
                </Text>
              </View>
            </>
          )}

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#FF6B00" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  existingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a1a0a',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1a3a1a',
  },
  existingContent: {
    marginLeft: 12,
    flex: 1,
  },
  existingTitle: {
    fontSize: 14,
    color: theme.colors.success,
    fontWeight: '600',
  },
  existingAddress: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  inputContainer: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: theme.colors.text,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.text,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 12,
    minHeight: 48,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.background,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a1a1a',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#FF6B00',
    marginLeft: 8,
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});

export default LightningAddressSetupModal;
