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
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { useAuth } from '../contexts/AuthContext';
import { validateNsec } from '../utils/nostr';
import { AmberAuthProvider } from '../services/auth/providers/amberAuthProvider';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL_DEVICE = SCREEN_HEIGHT < 700;

interface LoginScreenProps {
  // No callback needed - AuthContext handles everything
}

export const LoginScreen: React.FC<LoginScreenProps> = () => {
  // Use AuthContext for direct authentication state management
  const { signIn, signInWithAmber } = useAuth();
  const insets = useSafeAreaInsets();

  // Local state for UI only
  const [showInput, setShowInput] = useState(false);
  const [nsecInput, setNsecInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amberStage, setAmberStage] = useState<string>('');
  // Always show Amber button on Android - detection not reliable by design

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


  const handleAmberLogin = async () => {
    setIsLoading(true);
    setError(null);
    setAmberStage('Opening Amber...');

    try {
      console.log('LoginScreen: Attempting Amber authentication...');
      const result = await signInWithAmber();

      if (result.success) {
        console.log('✅ LoginScreen: Amber authentication successful');
        setAmberStage('Success! Loading profile...');
      } else {
        console.error('❌ LoginScreen: Amber authentication failed:', result.error);
        setAmberStage('');

        // Provide specific error guidance based on the error type
        if (result.error?.includes('timeout')) {
          setError(
            'Amber request timed out.\n\n' +
            'Please make sure to:\n' +
            '1. Approve the request when Amber opens\n' +
            '2. Grant all requested permissions\n' +
            '3. Try again if you accidentally closed Amber'
          );
        } else if (result.error?.includes('not installed') || result.error?.includes('not found')) {
          setError(
            'Amber not found. Install it from:\n\n' +
            'F-Droid or GitHub (search "Amber Nostr")'
          );
        } else if (result.error?.includes('permission')) {
          setError(
            'Please grant all requested permissions in Amber to use RUNSTR.\n\n' +
            'RUNSTR needs permissions to sign workouts, manage teams, and sync your profile.'
          );
        } else {
          setError(result.error || 'Amber authentication failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('❌ LoginScreen: Amber authentication error:', error);
      setAmberStage('');
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

      if (errorMessage.includes('Could not open Amber')) {
        setError(
          'Could not open Amber. Make sure:\n' +
          '1. Amber is installed\n' +
          '2. You have created or imported a key in Amber\n' +
          '3. Amber is not restricted by device policies'
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
      // Clear stage after a delay
      setTimeout(() => setAmberStage(''), 2000);
    }
  };

  const handleBack = () => {
    setShowInput(false);
    setNsecInput('');
    setError(null);
  };

  // Calculate responsive dimensions
  const logoSize = IS_SMALL_DEVICE ? 800 : 1200;
  const logoHeight = IS_SMALL_DEVICE ? 266 : 400;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={insets.top}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
          {/* Header */}
          <View style={[styles.header, IS_SMALL_DEVICE && styles.headerSmall]}>
            <Image
              source={require('../../assets/images/splash-icon.png')}
              style={[styles.logo, { width: logoSize, height: logoHeight }]}
              resizeMode="contain"
            />
          </View>

          {/* Login Section */}
          <View style={styles.loginSection}>
            {!showInput ? (
              // Login Options
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={handleShowInput}
                  activeOpacity={0.8}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <Text style={styles.loginButtonText}>Sign in with Nostr</Text>
                  )}
                </TouchableOpacity>
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

                {/* Amber Login Option - Only on Android */}
                {Platform.OS === 'android' && (
                  <View style={styles.amberSection}>
                    <View style={styles.divider}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>OR</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity
                      style={[styles.amberButton, isLoading && styles.amberButtonDisabled]}
                      onPress={handleAmberLogin}
                      disabled={isLoading}
                      activeOpacity={0.8}
                    >
                      {isLoading ? (
                        <View style={styles.amberLoadingContainer}>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                          {amberStage && (
                            <Text style={styles.amberStageText}>{amberStage}</Text>
                          )}
                        </View>
                      ) : (
                        <>
                          <Text style={styles.amberButtonText}>Login with Amber</Text>
                          <Text style={styles.amberSubtext}>Secure key management</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {!isLoading && (
                      <Text style={styles.amberHelp}>
                        Amber will open to approve login.\n
                        Grant all permissions when asked.
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>

        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    minHeight: SCREEN_HEIGHT - 100,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 40,
  },
  headerSmall: {
    paddingTop: 60,
    paddingBottom: 20,
  },
  logo: {
    marginBottom: 20,
    alignSelf: 'center',
  },

  // Login Section
  loginSection: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingVertical: 10,
    marginTop: -80,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  loginButton: {
    backgroundColor: '#FFFFFF',
    height: 50,
    borderRadius: 12,
    width: '80%',
    maxWidth: 320,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  loginButtonText: {
    fontSize: 19,
    fontWeight: '600',
    color: '#000000',
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

  // Amber styles
  amberSection: {
    marginTop: 24,
    alignItems: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  amberButton: {
    backgroundColor: '#FFA500', // Amber color
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  amberButtonDisabled: {
    opacity: 0.6,
  },
  amberButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  amberSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  amberLoadingContainer: {
    alignItems: 'center',
  },
  amberStageText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 8,
  },
  amberHelp: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
    lineHeight: 16,
  },
});