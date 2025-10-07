/**
 * ChallengeIconButton - Compact challenge icon for user lists
 * Appears next to usernames throughout the app for quick 1v1 challenge creation
 */

import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

export interface ChallengeIconButtonProps {
  userPubkey: string;
  userName: string;
  disabled?: boolean;
  onPress: () => void;
}

export const ChallengeIconButton: React.FC<ChallengeIconButtonProps> = ({
  userPubkey,
  userName,
  disabled = false,
  onPress,
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const handlePressIn = () => {
    if (!disabled) {
      setIsPressed(true);
    }
  };

  const handlePressOut = () => {
    setIsPressed(false);
  };

  const handlePress = () => {
    if (!disabled) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isPressed && styles.containerPressed,
        disabled && styles.containerDisabled,
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityLabel={`Challenge ${userName}`}
      accessibilityHint="Opens challenge wizard"
      accessibilityRole="button"
    >
      <Ionicons
        name="shield"
        size={14}
        color={
          disabled
            ? theme.colors.textMuted
            : isPressed
              ? theme.colors.orangeBright
              : theme.colors.textMuted
        }
        style={{ opacity: disabled ? 0.3 : isPressed ? 1 : 0.6 }}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: theme.borderRadius.small,
    padding: 4,
  },
  containerPressed: {
    backgroundColor: 'transparent',
  },
  containerDisabled: {
    backgroundColor: 'transparent',
  },
});
