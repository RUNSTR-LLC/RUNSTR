/**
 * CoinOSAccountSetupModal - Set up CoinOS Bitcoin wallet
 *
 * Shown when user selects CoinOS as their team. Allows:
 * - Creating a new CoinOS wallet (one-tap)
 * - Entering existing CoinOS credentials manually
 *
 * After setup, auto-sets the reward Lightning address to username@coinos.io
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

interface CoinOSAccountSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CoinOSAccountSetupModal: React.FC<CoinOSAccountSetupModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [hasExistingAccount, setHasExistingAccount] = useState(false);
  const [lightningAddress, setLightningAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const checkAccount = async () => {
      if (visible) {
        const hasAccount = await CoinOSAccountService.hasAccount();
        setHasExistingAccount(hasAccount);
        if (hasAccount) {
          const addr = await CoinOSAccountService.getLightningAddress();
          setLightningAddress(addr);
          const balanceResult = await CoinOSAccountService.getBalance();
          if (balanceResult.success) {
            setBalance(balanceResult.balance ?? 0);
          }
        }
      }
    };
    checkAccount();
  }, [visible]);

  const handleCreateAccount = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const hexPubkey = await AsyncStorage.getItem('@runstr:hex_pubkey');
      if (!hexPubkey) {
        setError('No user pubkey found. Please log in first.');
        setIsCreating(false);
        return;
      }

      const result = await CoinOSAccountService.createAccount(hexPubkey);

      if (result.success && result.lightningAddress) {
        await RewardLightningAddressService.setRewardLightningAddress(result.lightningAddress);
        setLightningAddress(result.lightningAddress);
        onSuccess();
      } else {
        setError(result.error || 'Failed to create wallet');
      }
    } catch (err) {
      console.error('[CoinOSSetup] Create account error:', err);
      setError('Failed to create wallet. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveManualCredentials = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const success = await CoinOSAccountService.setAccount(
        username.trim(),
        password.trim()
      );

      if (success) {
        const addr = `${username.trim()}@coinos.io`;
        await RewardLightningAddressService.setRewardLightningAddress(addr);
        setUsername('');
        setPassword('');
        setShowManualEntry(false);
        onSuccess();
      } else {
        setError('Login failed. Check your credentials.');
      }
    } catch (err) {
      console.error('[CoinOSSetup] Save credentials error:', err);
      setError('Failed to save credentials. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinueWithExisting = () => {
    onSuccess();
  };

  const handleClose = () => {
    setError(null);
    setShowManualEntry(false);
    setUsername('');
    setPassword('');
    onClose();
  };

  const isProcessing = isCreating || isSaving;

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
              <Ionicons name="wallet-outline" size={24} color={theme.colors.text} />
            </View>
            <Text style={styles.title}>Wallet</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Existing Account Found */}
          {hasExistingAccount ? (
            <>
              <View style={styles.existingAccountBox}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                <View style={styles.existingAccountContent}>
                  <Text style={styles.existingAccountTitle}>Wallet Connected</Text>
                  {lightningAddress && (
                    <Text style={styles.addressText}>{lightningAddress}</Text>
                  )}
                  {balance !== null && (
                    <Text style={styles.balanceText}>{balance.toLocaleString()} sats</Text>
                  )}
                </View>
              </View>

              <Text style={styles.description}>
                Your workout rewards will be sent to your Bitcoin wallet.
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleContinueWithExisting}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.description}>
                Create a Bitcoin Lightning wallet to receive your workout rewards directly
                in sats. One tap and you're set.
              </Text>

              {/* Create Wallet Button */}
              {!showManualEntry && (
                <TouchableOpacity
                  style={[styles.primaryButton, isProcessing && styles.buttonDisabled]}
                  onPress={handleCreateAccount}
                  disabled={isProcessing}
                >
                  {isCreating ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <>
                      <Ionicons name="add-circle" size={20} color="#000" style={styles.buttonIcon} />
                      <Text style={styles.primaryButtonText}>Create Wallet</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Manual Entry Toggle */}
              {!showManualEntry ? (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setShowManualEntry(true)}
                  disabled={isProcessing}
                >
                  <Ionicons name="log-in-outline" size={18} color={theme.colors.text} />
                  <Text style={styles.secondaryButtonText}>I have a CoinOS account</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Username</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Your CoinOS username"
                      placeholderTextColor={theme.colors.textMuted}
                      value={username}
                      onChangeText={setUsername}
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
                      value={password}
                      onChangeText={setPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry
                      editable={!isProcessing}
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      (!username.trim() || !password.trim() || isProcessing) && styles.buttonDisabled,
                    ]}
                    onPress={handleSaveManualCredentials}
                    disabled={!username.trim() || !password.trim() || isProcessing}
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
            </>
          )}

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#FF6B00" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Custody Warning */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.textMuted} />
            <Text style={styles.infoText}>
              CoinOS holds your Bitcoin. For larger amounts, withdraw to a self-custody wallet.
            </Text>
          </View>
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
  existingAccountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  existingAccountContent: {
    marginLeft: 12,
    flex: 1,
  },
  existingAccountTitle: {
    fontSize: 14,
    color: theme.colors.success,
    fontWeight: '600',
  },
  addressText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  balanceText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
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
  buttonIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.background,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
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
    marginTop: 16,
  },
  infoText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});

export default CoinOSAccountSetupModal;
