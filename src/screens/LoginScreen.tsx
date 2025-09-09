/**
 * LoginScreen - Simple Nostr authentication screen
 * iOS-inspired design with direct AuthContext integration
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { theme } from '../styles/theme';
import { useAuth } from '../contexts/AuthContext';
import { validateNsec } from '../utils/nostr';

interface LoginScreenProps {
  // No callback needed - AuthContext handles everything
}

export const LoginScreen: React.FC<LoginScreenProps> = () => {
  // Use AuthContext for direct authentication state management
  const { signIn } = useAuth();
  
  // Local state for UI only
  const [showInput, setShowInput] = useState(false);
  const [nsecInput, setNsecInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShowInput = () => {
    setShowInput(true);
    setError(null);
  };

  const handleNsecChange = (text: string) => {
    setNsecInput(text.trim());
    if (error) {
      setError(null);
    }
  };

  const handleLogin = async () => {
    if (!nsecInput) {
      setError('Please enter your nsec key');
      return;
    }

    // Validate nsec format
    if (!validateNsec(nsecInput)) {
      setError('Invalid nsec format. Please check your key and try again.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('LoginScreen: Attempting authentication with AuthContext...');
      
      // Use AuthContext signIn - this automatically updates app state
      const result = await signIn(nsecInput);

      if (result.success) {
        console.log('✅ LoginScreen: Authentication successful - AuthContext will handle navigation');
        // No need to call onLoginSuccess() - AuthContext updates trigger automatic navigation
      } else {
        console.error('❌ LoginScreen: Authentication failed:', result.error);
        setError(result.error || 'Authentication failed. Please try again.');
      }
    } catch (error) {
      console.error('❌ LoginScreen: Authentication error:', error);
      setError(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setShowInput(false);
    setNsecInput('');
    setError(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to RUNSTR</Text>
            <Text style={styles.subtitle}>
              Bitcoin-powered fitness competitions
            </Text>
          </View>

          {/* Login Section */}
          <View style={styles.loginSection}>
            {!showInput ? (
              // Login Button
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={handleShowInput}
                  activeOpacity={0.8}
                >
                  <Text style={styles.loginButtonText}>Login with Nostr</Text>
                </TouchableOpacity>
                <Text style={styles.helpText}>
                  Use your Nostr nsec key to access your profile and join fitness competitions
                </Text>
              </View>
            ) : (
              // Input Form
              <View style={styles.inputContainer}>
                <View style={styles.inputHeader}>
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBack}
                  >
                    <Text style={styles.backButtonText}>← Back</Text>
                  </TouchableOpacity>
                  <Text style={styles.inputTitle}>Enter your nsec key</Text>
                </View>

                <View style={styles.inputField}>
                  <Text style={styles.inputLabel}>Private Key (nsec)</Text>
                  <TextInput
                    style={[styles.textInput, error && styles.textInputError]}
                    value={nsecInput}
                    onChangeText={handleNsecChange}
                    placeholder="nsec1..."
                    placeholderTextColor={theme.colors.textMuted}
                    secureTextEntry={true}
                    autoCapitalize="none"
                    autoCorrect={false}
                    multiline={false}
                    editable={!isLoading}
                  />
                  <Text style={styles.inputHelper}>
                    Your nsec is stored locally and never shared
                  </Text>
                </View>

                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!nsecInput || isLoading) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleLogin}
                  disabled={!nsecInput || isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={theme.colors.accentText} />
                      <Text style={styles.submitButtonText}>Authenticating...</Text>
                    </View>
                  ) : (
                    <Text style={styles.submitButtonText}>Login</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              New to Nostr? Get your keys at{' '}
              <Text style={styles.footerLink}>getalby.com</Text>
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },

  // Login Section
  loginSection: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  loginButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accentText,
  },
  helpText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
    paddingHorizontal: 20,
  },

  // Input Form
  inputContainer: {
    width: '100%',
  },
  inputHeader: {
    marginBottom: 32,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  inputTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },

  // Input Field
  inputField: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text,
    minHeight: 50,
  },
  textInputError: {
    borderColor: theme.colors.error || '#ff4444',
  },
  inputHelper: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },

  // Error
  errorContainer: {
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.error || '#ff4444',
    textAlign: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 8,
  },

  // Submit Button
  submitButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.buttonBorder,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accentText,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Footer
  footer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  footerLink: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
});