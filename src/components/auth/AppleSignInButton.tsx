/**
 * Apple Sign-In Button Component
 * Platform-aware Apple ID sign in button following iOS design guidelines
 */

import React from 'react';
import { Platform, StyleSheet, ViewStyle, Alert, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { theme } from '../../styles/theme';

interface AppleSignInButtonProps {
  onPress: () => void;
  style?: ViewStyle;
  buttonStyle?: AppleAuthentication.AppleAuthenticationButtonStyle;
  buttonType?: AppleAuthentication.AppleAuthenticationButtonType;
  disabled?: boolean;
  testID?: string;
}

/**
 * Apple Sign-In Button with platform detection and error handling
 * Only renders on iOS devices where Apple Sign-In is supported
 */
export const AppleSignInButton: React.FC<AppleSignInButtonProps> = ({
  onPress,
  style,
  buttonStyle = AppleAuthentication.AppleAuthenticationButtonStyle.BLACK,
  buttonType = AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN,
  disabled = false,
  testID = 'apple-signin-button',
}) => {
  // Don't render on non-iOS platforms
  if (Platform.OS !== 'ios') {
    console.log('AppleSignInButton: Not rendering on non-iOS platform');
    return null;
  }

  /**
   * Handle Apple Sign-In button press with availability check
   */
  const handlePress = async () => {
    try {
      // Double-check availability before proceeding
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          'Apple Sign-In Unavailable',
          'Apple Sign-In is not available on this device. Please try another sign-in method.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Call the parent handler
      onPress();
    } catch (error) {
      console.error('AppleSignInButton: Error checking availability:', error);
      Alert.alert('Error', 'Unable to start Apple Sign-In. Please try again.', [
        { text: 'OK' },
      ]);
    }
  };

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={buttonType}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
      cornerRadius={12}
      style={[styles.button, style, disabled && styles.disabled]}
      onPress={disabled ? () => {} : handlePress}
      testID={testID}
    />
  );
};

/**
 * Styles following RUNSTR's dark theme and spacing conventions
 */
const styles = StyleSheet.create({
  button: {
    height: 50,
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default AppleSignInButton;
