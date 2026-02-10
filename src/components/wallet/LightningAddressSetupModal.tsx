/**
 * LightningAddressSetupModal - Set up Lightning address for "You" team
 *
 * Shown when user selects "You" as their team. Allows:
 * - Entering a Lightning address (pre-filled from Nostr profile lud16)
 * - Creating a CoinOS wallet as a secondary option
 *
 * After setup, saves the Lightning address via RewardLightningAddressService
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import { CoinOSAccountService } from '../../services/wallet/CoinOSAccountService';
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
  const [showCoinOSCreation, setShowCoinOSCreation] = useState(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [existingAddress, setExistingAddress] = useState<string | null>(null);

  // CoinOS manual entry state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [coinosUsername, setCoinosUsername] = useState('');
  const [coinosPassword, setCoinosPassword] = useState('');

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
    setShowCoinOSCreation(false);
    setShowManualEntry(false);
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

  const handleCreateCoinOSWallet = async () => {
    setIsCreatingWallet(true);
    setError(null);

    try {
      const hexPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (!hexPubkey) {
        setError('No user key found. Please log in first.');
        setIsCreatingWallet(false);
        return;
      }

      const result = await CoinOSAccountService.createAccount(hexPubkey);

      if (result.success && result.lightningAddress) {
        await RewardLightningAddressService.setRewardLightningAddress(result.lightningAddress);
        onSuccess(result.lightningAddress);
      } else {
        setError(result.error || 'Failed to create wallet');
      }
    } catch (err) {
      console.error('[LightningSetup] CoinOS create error:', err);
      setError('Failed to create wallet. Please try again.');
    } finally {
      setIsCreatingWallet(false);
    }
  };

  const handleSaveManualCoinOS = async () => {
    if (!coinosUsername.trim() || !coinosPassword.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const success = await CoinOSAccountService.setAccount(
        coinosUsername.trim(),
        coinosPassword.trim()
      );

      if (success) {
        const addr = `${coinosUsername.trim()}@coinos.io`;
        await RewardLightningAddressService.setRewardLightningAddress(addr);
        setCoinosUsername('');
        setCoinosPassword('');
        onSuccess(addr);
      } else {
        setError('Login failed. Check your credentials.');
      }
    } catch (err) {
      console.error('[LightningSetup] CoinOS manual error:', err);
      setError('Failed to save credentials. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setShowCoinOSCreation(false);
    setShowManualEntry(false);
    setCoinosUsername('');
    setCoinosPassword('');
    onClose();
  };

  const isProcessing = isSaving || isCreatingWallet;

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
              <Ionicons name="flash" size={24} color="#FF9D42" />
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
                  editable={!isProcessing}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, (!isValidAddress || isProcessing) && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={!isValidAddress || isProcessing}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </>
          ) : !showCoinOSCreation ? (
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
                  editable={!isProcessing}
                  autoFocus={!prefillAddress}
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.primaryButton, (!isValidAddress || isProcessing) && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={!isValidAddress || isProcessing}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save</Text>
                )}
              </TouchableOpacity>

              {/* Create wallet link */}
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setShowCoinOSCreation(true)}
                disabled={isProcessing}
              >
                <Ionicons name="wallet-outline" size={18} color={theme.colors.text} />
                <Text style={styles.secondaryButtonText}>Don't have one? Create a free wallet</Text>
              </TouchableOpacity>
            </>
          ) : !showManualEntry ? (
            <>
              <Text style={styles.description}>
                Create a free Bitcoin Lightning wallet to receive your workout rewards.
              </Text>

              {/* Create Wallet Button */}
              <TouchableOpacity
                style={[styles.primaryButton, isProcessing && styles.buttonDisabled]}
                onPress={handleCreateCoinOSWallet}
                disabled={isProcessing}
              >
                {isCreatingWallet ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={20} color="#000" style={styles.buttonIcon} />
                    <Text style={styles.primaryButtonText}>Create Wallet</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Manual Entry Toggle */}
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setShowManualEntry(true)}
                disabled={isProcessing}
              >
                <Ionicons name="log-in-outline" size={18} color={theme.colors.text} />
                <Text style={styles.secondaryButtonText}>I have a CoinOS account</Text>
              </TouchableOpacity>

              {/* Back link */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowCoinOSCreation(false)}
                disabled={isProcessing}
              >
                <Text style={styles.backButtonText}>Back to Lightning address</Text>
              </TouchableOpacity>

              {/* Custody Warning */}
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={18} color={theme.colors.textMuted} />
                <Text style={styles.infoText}>
                  CoinOS holds your Bitcoin. For larger amounts, withdraw to a self-custody wallet.
                </Text>
              </View>
            </>
          ) : (
            <>
              {/* CoinOS Manual Entry */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your CoinOS username"
                  placeholderTextColor={theme.colors.textMuted}
                  value={coinosUsername}
                  onChangeText={setCoinosUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isProcessing}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your CoinOS password"
                  placeholderTextColor={theme.colors.textMuted}
                  value={coinosPassword}
                  onChangeText={setCoinosPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  editable={!isProcessing}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (!coinosUsername.trim() || !coinosPassword.trim() || isProcessing) && styles.buttonDisabled,
                ]}
                onPress={handleSaveManualCoinOS}
                disabled={!coinosUsername.trim() || !coinosPassword.trim() || isProcessing}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.primaryButtonText}>Log In</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowManualEntry(false)}
                disabled={isProcessing}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#ff6b6b" />
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
    color: '#FFB366',
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
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
    backgroundColor: '#FF9D42',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 12,
    minHeight: 48,
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  buttonDisabled: {
    backgroundColor: '#3a3a3a',
    opacity: 0.6,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  secondaryButtonText: {
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 8,
    fontWeight: '500',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  backButtonText: {
    fontSize: 14,
    color: theme.colors.textMuted,
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
    color: '#ff6b6b',
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
