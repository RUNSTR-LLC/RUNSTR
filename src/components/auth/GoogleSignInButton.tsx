/**
 * Google Sign-In Button Component
 * Cross-platform Google OAuth button with RUNSTR theming
 * Follows the same pattern as Apple Sign-In Button for consistency
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { GoogleAuthProvider } from '../../services/auth/providers/googleAuthProvider';

interface GoogleSignInButtonProps {
  onPress: () => void;
  style?: any;
  disabled?: boolean;
  loading?: boolean;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onPress,
  style,
  disabled = false,
  loading = false,
}) => {
  const [isAvailable, setIsAvailable] = React.useState(true);
  const [isValidated, setIsValidated] = React.useState(false);

  React.useEffect(() => {
    checkGoogleOAuthAvailability();
  }, []);

  /**
   * Check if Google OAuth is properly configured and available
   */
  const checkGoogleOAuthAvailability = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const validation = await provider.validateConfiguration();

      setIsValidated(validation.isValid);
      setIsAvailable(GoogleAuthProvider.isAvailable());

      if (!validation.isValid && validation.error) {
        console.warn(
          'GoogleSignInButton: Configuration issue:',
          validation.error
        );
      }
    } catch (error) {
      console.error('GoogleSignInButton: Error checking availability:', error);
      setIsAvailable(false);
    }
  };

  /**
   * Handle button press with validation
   */
  const handlePress = async () => {
    try {
      // Re-validate configuration before proceeding
      if (!isValidated) {
        const provider = new GoogleAuthProvider();
        const validation = await provider.validateConfiguration();

        if (!validation.isValid) {
          Alert.alert(
            'Configuration Error',
            validation.error || 'Google Sign-In is not properly configured'
          );
          return;
        }
      }

      // Proceed with authentication
      onPress();
    } catch (error) {
      console.error('GoogleSignInButton: Error during button press:', error);
      Alert.alert('Error', 'Unable to start Google Sign-In. Please try again.');
    }
  };

  // Don't render if Google OAuth is not available
  if (!isAvailable) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.button, style, disabled && styles.disabled]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={theme.colors.text}
            style={styles.loader}
          />
        ) : (
          <View style={styles.iconContainer}>
            <Ionicons
              name="logo-google"
              size={20}
              color={theme.colors.text}
              style={styles.icon}
            />
          </View>
        )}

        <Text style={[styles.text, disabled && styles.disabledText]}>
          Continue with Google
        </Text>
      </View>

      {!isValidated && (
        <View style={styles.configWarning}>
          <Ionicons
            name="warning-outline"
            size={16}
            color={theme.colors.accent}
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 16,
    paddingHorizontal: 20,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    // Subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disabled: {
    opacity: 0.6,
    backgroundColor: theme.colors.background,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  iconContainer: {
    marginRight: 12,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    // Google logo colors would be ideal, but using theme for consistency
  },
  loader: {
    marginRight: 12,
  },
  text: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  disabledText: {
    color: theme.colors.textSecondary,
  },
  configWarning: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default GoogleSignInButton;
