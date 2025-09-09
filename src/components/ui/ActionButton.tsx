/**
 * ActionButton Component - Join/Watch button with states
 * Matches HTML mockup: join-btn, participate-btn with different states
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export interface ActionButtonProps {
  type?: 'join' | 'participate';
  state?: 'default' | 'joined' | 'watching';
  onPress: () => void;
  title?: string;
  variant?: string;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  type,
  state,
  onPress,
  title,
  variant,
  loading,
  disabled,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const getButtonText = () => {
    // Prefer explicit title prop if provided
    if (title) {
      return loading ? 'Loading...' : title;
    }

    // Fall back to type/state based text
    if (type === 'join') {
      return state === 'joined' ? 'Joined ✓' : 'Join';
    } else {
      return state === 'watching' ? 'Watching Challenge' : 'Participate';
    }
  };

  const getButtonStyle = () => {
    if (disabled) return styles.disabledButton;
    if (variant === 'secondary') return styles.activeButton;
    return state === 'default' ? styles.defaultButton : styles.activeButton;
  };

  const getTextStyle = () => {
    if (disabled) return styles.disabledText;
    if (variant === 'secondary') return styles.activeText;
    return state === 'default' ? styles.defaultText : styles.activeText;
  };

  return (
    <TouchableOpacity
      style={[styles.button, getButtonStyle()]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled || loading}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      <Text style={getTextStyle()}>{getButtonText()}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Base button - exact CSS: width: 100%; padding: 16px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;
  button: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.large,
    alignItems: 'center',
  },
  // Default button - exact CSS: background: #fff; color: #000;
  defaultButton: {
    backgroundColor: theme.colors.text,
  },
  // Active/joined/watching button - exact CSS: background: #1a1a1a; color: #fff; border: 1px solid #333;
  activeButton: {
    backgroundColor: theme.colors.border,
    borderWidth: 1,
    borderColor: theme.colors.buttonBorder,
  },
  // Default text style
  defaultText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accentText,
  },
  // Active text style
  activeText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  // Disabled button style
  disabledButton: {
    backgroundColor: theme.colors.syncBackground, // #333 - muted background
    borderWidth: 1,
    borderColor: theme.colors.buttonBorder,
  },
  // Disabled text style
  disabledText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary, // #ccc - muted text
  },
});
