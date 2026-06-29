/**
 * PPQAPIKeyModal - Manage the user's PPQ.AI account.
 *
 * PPQ.AI is a third-party service where the user holds credits. RUNSTR's only
 * role is sending workout rewards to the user's PPQ.AI account. Shows the
 * credit balance and lets the user view or import their PPQ.AI key.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { theme } from '../../styles/theme';
import { PPQAccountService } from '../../services/ai/PPQAccountService';

interface PPQAPIKeyModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PPQAPIKeyModal: React.FC<PPQAPIKeyModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Account state
  const [hasAccount, setHasAccount] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [storedApiKey, setStoredApiKey] = useState<string | null>(null);
  const [storedCreditId, setStoredCreditId] = useState<string | null>(null);

  // Manual entry fields
  const [apiKey, setApiKey] = useState('');
  const [creditId, setCreditId] = useState('');


  // Load account data when modal opens
  const loadAccountData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const accountExists = await PPQAccountService.hasAccount();
      setHasAccount(accountExists);

      if (accountExists) {
        // Load balance
        const balanceResult = await PPQAccountService.getBalance();
        if (balanceResult.success) {
          setBalance(balanceResult.balance ?? 0);
        } else {
          console.warn('[PPQModal] Failed to fetch balance:', balanceResult.error);
          // Don't show error for balance fetch, account still exists
        }

        // Load stored credentials for copy functionality
        const account = await PPQAccountService.getAccount();
        if (account) {
          setStoredApiKey(account.apiKey);
          setStoredCreditId(account.creditId);
        }
      }
    } catch (err) {
      console.error('[PPQModal] Error loading account:', err);
      setError('Failed to load account data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadAccountData();
    }
  }, [visible, loadAccountData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAccountData();
    setIsRefreshing(false);
  };

  const [isServerError, setIsServerError] = useState(false);

  const handleCreateAccount = async () => {
    setIsCreating(true);
    setError(null);
    setIsServerError(false);

    try {
      const result = await PPQAccountService.createAccount();

      if (result.success && result.apiKey) {
        setHasAccount(true);
        setBalance(0);
        console.log('[PPQModal] Account created successfully');
        onSuccess();
      } else {
        setError(result.error || 'Failed to create account');
        setIsServerError(result.isServerError ?? false);
        if (result.isServerError) {
          setShowManualEntry(true);
        }
      }
    } catch (err) {
      console.error('[PPQModal] Create account error:', err);
      setError('Failed to create account. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenPPQWebsite = () => {
    Linking.openURL('https://ppq.ai');
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
        setHasAccount(true);

        // Refresh balance
        const balanceResult = await PPQAccountService.getBalance();
        if (balanceResult.success) {
          setBalance(balanceResult.balance ?? 0);
        }

        onSuccess();
      } else {
        setError('Failed to save credentials');
      }
    } catch (err) {
      console.error('[PPQModal] Save manual key error:', err);
      setError('Failed to save credentials. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAccount = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await PPQAccountService.clearAccount();
      setHasAccount(false);
      setBalance(null);
      console.log('[PPQModal] Account cleared');
    } catch (err) {
      console.error('[PPQModal] Clear account error:', err);
      setError('Failed to clear account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setShowManualEntry(false);
    setApiKey('');
    setCreditId('');
    onClose();
  };

  const handleCopyApiKey = async () => {
    if (storedApiKey) {
      await Clipboard.setStringAsync(storedApiKey);
      Toast.show({
        type: 'success',
        text1: 'Copied!',
        text2: 'API key copied to clipboard',
        position: 'top',
        visibilityTime: 2000,
      });
    }
  };

  const handleCopyCreditId = async () => {
    if (storedCreditId) {
      await Clipboard.setStringAsync(storedCreditId);
      Toast.show({
        type: 'success',
        text1: 'Copied!',
        text2: 'Credit ID copied to clipboard',
        position: 'top',
        visibilityTime: 2000,
      });
    }
  };

  // Helper to mask API key for display
  const getMaskedApiKey = (key: string | null): string => {
    if (!key) return '••••••••';
    if (key.length <= 8) return '••••••••';
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  };

  const isProcessing = isLoading || isCreating || isSaving;

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
            <Text style={styles.title}>PPQ.AI</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF9D42" />
              <Text style={styles.loadingText}>Loading account...</Text>
            </View>
          ) : hasAccount ? (
            // Account exists - show balance and management
            <>
              {/* Balance Card */}
              <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>PPQ.AI Credits</Text>
                <Text style={styles.balanceValue}>
                  ${balance !== null ? balance.toFixed(2) : '--'}
                </Text>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={handleRefresh}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <ActivityIndicator size="small" color="#FF9D42" />
                  ) : (
                    <Ionicons name="refresh" size={18} color="#FF9D42" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Info about earning credits */}
              <View style={styles.infoBox}>
                <Ionicons name="flash-outline" size={18} color="#FF9D42" />
                <Text style={styles.infoText}>
                  Choose PPQ.AI as your reward destination and your workout rewards are sent here as credits.
                </Text>
              </View>

              {/* Your Credentials Section */}
              {(storedApiKey || storedCreditId) && (
                <View style={styles.credentialsSection}>
                  <Text style={styles.credentialsSectionTitle}>Your Credentials</Text>

                  {/* API Key Row */}
                  <View style={styles.credentialRow}>
                    <View style={styles.credentialInfo}>
                      <Text style={styles.credentialLabel}>API Key</Text>
                      <Text style={styles.credentialValue}>{getMaskedApiKey(storedApiKey)}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={handleCopyApiKey}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="copy-outline" size={18} color="#FF9D42" />
                    </TouchableOpacity>
                  </View>

                  {/* Credit ID Row */}
                  <View style={styles.credentialRow}>
                    <View style={styles.credentialInfo}>
                      <Text style={styles.credentialLabel}>Credit ID</Text>
                      <Text style={styles.credentialValue} numberOfLines={1} ellipsizeMode="middle">
                        {storedCreditId || '••••••••'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={handleCopyCreditId}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="copy-outline" size={18} color="#FF9D42" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Manual entry toggle (for power users) */}
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setShowManualEntry(!showManualEntry)}
                disabled={isProcessing}
              >
                <Text style={styles.secondaryButtonText}>
                  {showManualEntry ? 'Hide manual entry' : 'Enter different credentials'}
                </Text>
                <Ionicons
                  name={showManualEntry ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={theme.colors.textMuted}
                />
              </TouchableOpacity>

              {showManualEntry && (
                <>
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
                </>
              )}

              {/* Clear account button */}
              <TouchableOpacity
                style={styles.dangerButton}
                onPress={handleClearAccount}
                disabled={isProcessing}
              >
                <Ionicons name="trash-outline" size={16} color="#FF6B00" />
                <Text style={styles.dangerButtonText}>Clear Account</Text>
              </TouchableOpacity>
            </>
          ) : (
            // No account - show setup options
            <>
              <Text style={styles.description}>
                Set up a PPQ.AI account so your workout rewards can be sent there as credits.
              </Text>

              {/* Create Account Button */}
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
                    <Text style={styles.primaryButtonText}>
                      {error ? 'Retry Account Creation' : 'Create PPQ.AI Account'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Website fallback when server is down */}
              {isServerError && (
                <TouchableOpacity style={styles.websiteFallback} onPress={handleOpenPPQWebsite}>
                  <Ionicons name="globe-outline" size={18} color="#FF9D42" />
                  <Text style={styles.websiteFallbackText}>Create account at ppq.ai</Text>
                  <Ionicons name="open-outline" size={14} color="#FF9D42" />
                </TouchableOpacity>
              )}

              {/* Manual entry toggle */}
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setShowManualEntry(!showManualEntry)}
                disabled={isProcessing}
              >
                <Ionicons name="key-outline" size={18} color={theme.colors.text} />
                <Text style={styles.secondaryButtonTextAlt}>I have PPQ.AI credentials</Text>
              </TouchableOpacity>

              {showManualEntry && (
                <>
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
                </>
              )}

              {/* Privacy note */}
              <View style={styles.privacyNote}>
                <Ionicons name="shield-checkmark-outline" size={16} color={theme.colors.textMuted} />
                <Text style={styles.privacyText}>
                  Your PPQ.AI key is saved on this device and synced to RUNSTR so your rewards can top up your PPQ.AI credits
                </Text>
              </View>
            </>
          )}

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#FF6B00" />
              <View style={styles.errorContent}>
                <Text style={styles.errorText}>{error}</Text>
                {isServerError && (
                  <Text style={styles.errorHint}>
                    You can create an account at ppq.ai and enter your credentials manually.
                  </Text>
                )}
              </View>
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
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  balanceCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    position: 'relative',
  },
  balanceLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FF9D42',
  },
  refreshButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1a1510',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    color: '#CC7A33',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  credentialsSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  credentialsSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  credentialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  credentialInfo: {
    flex: 1,
    marginRight: 12,
  },
  credentialLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  credentialValue: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: theme.colors.text,
  },
  copyButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 157, 66, 0.1)',
    borderRadius: 6,
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
    color: theme.colors.textMuted,
    marginRight: 6,
  },
  secondaryButtonTextAlt: {
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 8,
    fontWeight: '500',
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
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 8,
  },
  dangerButtonText: {
    fontSize: 13,
    color: '#FF6B00',
    marginLeft: 6,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  privacyText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginLeft: 6,
  },
  websiteFallback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 157, 66, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 157, 66, 0.3)',
    gap: 8,
  },
  websiteFallbackText: {
    fontSize: 14,
    color: '#FF9D42',
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#2a1a1a',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  errorContent: {
    marginLeft: 8,
    flex: 1,
  },
  errorText: {
    fontSize: 13,
    color: '#FF6B00',
  },
  errorHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
});

export default PPQAPIKeyModal;
