/**
 * PasswordNotice Component
 * Displays generated password securely with copy functionality
 * Ensures users save their password before continuing
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PasswordNoticeProps {
  password: string; // The nsec key
  onContinue: () => void;
}

export const PasswordNotice: React.FC<PasswordNoticeProps> = ({
  password,
  onContinue,
}) => {
  const insets = useSafeAreaInsets();
  const [showPassword, setShowPassword] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  const handleCopyPassword = async () => {
    // Validate that password exists before copying
    if (!password || password.trim() === '') {
      console.error('[PasswordNotice] Cannot copy: password is empty');
      Alert.alert(
        'Error',
        'Password not available. Please try restarting the signup process.'
      );
      return;
    }

    try {
      await Clipboard.setStringAsync(password);
      setHasCopied(true);
      Alert.alert('Copied!', 'Your password has been copied to clipboard');

      // Reset copy status after 3 seconds
      setTimeout(() => setHasCopied(false), 3000);
    } catch (error) {
      console.error('Failed to copy password:', error);
      Alert.alert('Error', 'Failed to copy password. Please try again.');
    }
  };

  const handleToggleVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleAcknowledge = () => {
    setHasAcknowledged(!hasAcknowledged);
  };

  const handleContinue = () => {
    if (!hasAcknowledged) {
      Alert.alert(
        'Save Your Password',
        'Please confirm you have saved your password before continuing.',
        [{ text: 'OK' }]
      );
      return;
    }
    onContinue();
  };

  // Mask password for display
  const displayPassword = showPassword
    ? password
    : password.slice(0, 6) + '•'.repeat(20) + '...';

  // Show error state if password is missing
  const hasPassword = password && password.trim() !== '';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      {/* Icon */}
      <View style={styles.iconContainer}>
        <Ionicons name="key" size={60} color={theme.colors.text} />
      </View>

      {/* Title */}
      <Text style={styles.title}>Your Account Password</Text>

      {/* Error state if password not loaded */}
      {!hasPassword && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            ⚠️ Password not loaded. Please restart the signup process.
          </Text>
        </View>
      )}

      {/* Important Notice */}
      <View style={styles.warningContainer}>
        <Ionicons name="warning" size={24} color={theme.colors.text} />
        <Text style={styles.warningText}>
          This is the ONLY way to access your account
        </Text>
      </View>

      {/* Description */}
      <Text style={styles.description}>
        We've generated a secure password for your account. Please save it somewhere safe - you'll need it to login on other devices.
      </Text>

      {/* Password Display */}
      <View style={styles.passwordContainer}>
        <Text style={styles.passwordLabel}>Your Password:</Text>

        <View style={[styles.passwordBox, !hasPassword && styles.passwordBoxError]}>
          <Text style={styles.passwordText} numberOfLines={2}>
            {hasPassword ? displayPassword : 'Password not available'}
          </Text>

          <View style={styles.passwordActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleToggleVisibility}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={22}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconButton, hasCopied && styles.iconButtonSuccess]}
              onPress={handleCopyPassword}
              activeOpacity={0.7}
            >
              <Ionicons
                name={hasCopied ? 'checkmark' : 'copy'}
                size={22}
                color={hasCopied ? theme.colors.text : theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Settings Note */}
      <Text style={styles.settingsNote}>
        You can always view this in Settings → Account
      </Text>

      {/* Acknowledgement */}
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={handleAcknowledge}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, hasAcknowledged && styles.checkboxChecked]}>
          {hasAcknowledged && (
            <Ionicons name="checkmark" size={16} color={theme.colors.background} />
          )}
        </View>
        <Text style={styles.checkboxText}>
          I have saved my password in a secure location
        </Text>
      </TouchableOpacity>

      {/* Continue Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!hasAcknowledged || !hasPassword) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!hasAcknowledged || !hasPassword}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.continueButtonText,
            !hasAcknowledged && styles.continueButtonTextDisabled,
          ]}>
            Continue to RUNSTR
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 30,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 10,
    flex: 1,
  },
  description: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  passwordContainer: {
    marginBottom: 20,
  },
  passwordLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 10,
  },
  passwordBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passwordBoxError: {
    borderColor: theme.colors.error,
    backgroundColor: `${theme.colors.error}10`,
  },
  errorContainer: {
    backgroundColor: `${theme.colors.error}15`,
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.error,
    textAlign: 'center',
  },
  passwordText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: theme.colors.text,
    flex: 1,
    marginRight: 10,
  },
  passwordActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonSuccess: {
    backgroundColor: theme.colors.border,
  },
  settingsNote: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 30,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
  },
  checkboxText: {
    fontSize: 15,
    color: theme.colors.text,
    flex: 1,
  },
  footer: {
    marginTop: 'auto',
  },
  continueButton: {
    backgroundColor: theme.colors.text,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.background,
  },
  continueButtonTextDisabled: {
    color: theme.colors.textMuted,
  },
});