/**
 * PPQAccountSetupModal - Set up PPQ.AI account for Coach RUNSTR
 *
 * Shown when user selects PPQ.AI as their team. Allows:
 * - Creating a new PPQ.AI account (one-tap)
 * - Entering an existing API key manually
 *
 * This is different from PPQAPIKeyModal which is for managing existing accounts.
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
import { PPQAccountService } from '../../services/ai/PPQAccountService';

interface PPQAccountSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void; // Called when account is ready (new or existing)
}

export const PPQAccountSetupModal: React.FC<PPQAccountSetupModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [creditId, setCreditId] = useState('');
  const [hasExistingAccount, setHasExistingAccount] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  // Check for existing account on mount
  useEffect(() => {
    const checkAccount = async () => {
      if (visible) {
        const hasAccount = await PPQAccountService.hasAccount();
        setHasExistingAccount(hasAccount);
        if (hasAccount) {
          const balanceResult = await PPQAccountService.getBalance();
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
      const result = await PPQAccountService.createAccount();

      if (result.success) {
        // Account created successfully
        onSuccess();
      } else {
        setError(result.error || 'Failed to create account');
      }
    } catch (err) {
      console.error('[PPQSetup] Create account error:', err);
      setError('Failed to create account. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveManualKey = async () => {
    if (!apiKey.trim() || !creditId.trim()) {
      setError('Please enter both API key and Credit ID');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const success = await PPQAccountService.setAccount(apiKey.trim(), creditId.trim());

      if (success) {
        setApiKey('');
        setCreditId('');
        setShowManualEntry(false);
        onSuccess();
      } else {
        setError('Failed to save credentials');
      }
    } catch (err) {
      console.error('[PPQSetup] Save manual key error:', err);
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
    setApiKey('');
    setCreditId('');
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
              <Ionicons name="sparkles" size={24} color="#FF9D42" />
            </View>
            <Text style={styles.title}>Set Up AI Credits</Text>
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
                  <Text style={styles.existingAccountTitle}>PPQ.AI Account Connected</Text>
                  {balance !== null && (
                    <Text style={styles.balanceText}>
                      Balance: ${balance.toFixed(2)}
                    </Text>
                  )}
                </View>
              </View>

              <Text style={styles.description}>
                Your workout rewards will be converted to AI credits for Coach RUNSTR.
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleContinueWithExisting}
              >
                <Text style={styles.primaryButtonText}>Continue with PPQ.AI Team</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Description */}
              <Text style={styles.description}>
                To earn AI credits instead of sats, we need to create a PPQ.AI account for you.
                Your rewards will automatically top up your AI balance.
              </Text>

              {/* Create Account Button */}
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
                      <Text style={styles.primaryButtonText}>Create Account</Text>
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
                  <Ionicons name="key-outline" size={18} color={theme.colors.text} />
                  <Text style={styles.secondaryButtonText}>I have a PPQ.AI key</Text>
                </TouchableOpacity>
              ) : (
                <>
                  {/* Manual Entry Form */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>API Key</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your PPQ.AI API key"
                      placeholderTextColor={theme.colors.textMuted}
                      value={apiKey}
                      onChangeText={setApiKey}
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry
                      editable={!isProcessing}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Credit ID</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your Credit ID"
                      placeholderTextColor={theme.colors.textMuted}
                      value={creditId}
                      onChangeText={setCreditId}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isProcessing}
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      (!apiKey.trim() || !creditId.trim() || isProcessing) && styles.buttonDisabled,
                    ]}
                    onPress={handleSaveManualKey}
                    disabled={!apiKey.trim() || !creditId.trim() || isProcessing}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Save Credentials</Text>
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
              <Ionicons name="alert-circle" size={16} color="#ff6b6b" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.textMuted} />
            <Text style={styles.infoText}>
              Your credentials are stored locally and never sent to our servers.
              Only payment invoices are shared for reward processing.
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
  existingAccountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a1a0a',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1a3a1a',
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
  balanceText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
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
    fontFamily: 'monospace',
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

export default PPQAccountSetupModal;
