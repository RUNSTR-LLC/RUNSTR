/**
 * CaptainDashboardButton - Enhanced captain dashboard access with loading states
 * Provides animated reveal and clear visual distinction for captain access
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { theme } from '../../styles/theme';

interface CaptainDashboardButtonProps {
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  style?: any;
  variant?: 'primary' | 'outline' | 'subtle';
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
}

export const CaptainDashboardButton: React.FC<CaptainDashboardButtonProps> = ({
  onPress,
  isLoading = false,
  disabled = false,
  style,
  variant = 'outline',
  size = 'medium',
  showIcon = true,
}) => {
  const getButtonStyles = () => {
    const baseStyle = [styles.button, styles[`${size}Button`]];
    
    switch (variant) {
      case 'primary':
        baseStyle.push(styles.primaryButton);
        break;
      case 'outline':
        baseStyle.push(styles.outlineButton);
        break;
      case 'subtle':
        baseStyle.push(styles.subtleButton);
        break;
    }

    if (disabled || isLoading) {
      baseStyle.push(styles.disabledButton);
    }

    return baseStyle;
  };

  const getTextStyles = () => {
    const baseStyle = [styles.buttonText, styles[`${size}Text`]];
    
    switch (variant) {
      case 'primary':
        baseStyle.push(styles.primaryText);
        break;
      case 'outline':
        baseStyle.push(styles.outlineText);
        break;
      case 'subtle':
        baseStyle.push(styles.subtleText);
        break;
    }

    if (disabled || isLoading) {
      baseStyle.push(styles.disabledText);
    }

    return baseStyle;
  };

  const handlePress = () => {
    if (!disabled && !isLoading) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[...getButtonStyles(), style]}
      onPress={handlePress}
      activeOpacity={disabled || isLoading ? 1 : 0.7}
      disabled={disabled || isLoading}
    >
      <View style={styles.buttonContent}>
        {isLoading && (
          <ActivityIndicator
            size="small"
            color={
              variant === 'primary' ? theme.colors.accentText : theme.colors.accent
            }
            style={styles.loadingIndicator}
          />
        )}
        
        
        <Text style={getTextStyles()}>
          {isLoading ? 'Loading...' : 'Captain Dashboard'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Base button styles
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    fontWeight: theme.typography.weights.semiBold,
    textAlign: 'center',
  },

  // Size variants
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 32,
  },

  mediumButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
  },

  largeButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 48,
  },

  smallText: {
    fontSize: 12,
  },

  mediumText: {
    fontSize: 13,
  },

  largeText: {
    fontSize: 14,
  },

  // Style variants
  primaryButton: {
    backgroundColor: theme.colors.orangeDeep, // Deep orange background
    borderWidth: 1,
    borderColor: theme.colors.orangeBurnt, // Burnt orange border
  },

  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.orangeDeep, // Orange border
  },

  subtleButton: {
    backgroundColor: theme.colors.orangeDeep + '20', // Subtle orange background
    borderWidth: 1,
    borderColor: 'transparent',
  },

  primaryText: {
    color: theme.colors.accentText, // Black text on orange
  },

  outlineText: {
    color: theme.colors.orangeBright, // Bright orange text
  },

  subtleText: {
    color: theme.colors.orangeBright, // Bright orange text
  },

  // Disabled state
  disabledButton: {
    opacity: 0.6,
  },

  disabledText: {
    opacity: 0.7,
  },

  // Icon and loading
  icon: {
    marginRight: 6,
    fontSize: 14,
  },

  loadingIndicator: {
    marginRight: 8,
  },
});

export default CaptainDashboardButton;