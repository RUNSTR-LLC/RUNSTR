import React from 'react';
import {
  TouchableOpacity,
  Text,
  ViewStyle,
  TextStyle,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../styles/theme';

interface ButtonProps {
  title?: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  variant?: 'primary' | 'add' | 'menu' | 'outline';
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  style,
  textStyle,
  disabled = false,
  variant = 'primary',
  children,
}) => {
  const getButtonStyle = () => {
    switch (variant) {
      case 'add':
        return styles.addButton;
      case 'menu':
        return styles.menuButton;
      case 'outline':
        return styles.primaryButton; // Same as primary for now
      default:
        return styles.primaryButton;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'add':
        return styles.addButtonText;
      case 'menu':
        return styles.menuButtonText;
      case 'outline':
        return styles.primaryButtonText; // Same as primary for now
      default:
        return styles.primaryButtonText;
    }
  };

  const buttonStyle = getButtonStyle();
  const textStyleDefault = getTextStyle();

  return (
    <TouchableOpacity
      style={[buttonStyle, style, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {variant === 'add' && children ? (
        children
      ) : (
        <Text style={[textStyleDefault, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

interface AddButtonContentProps {
  icon: string;
  text: string;
}

export const AddButtonContent: React.FC<AddButtonContentProps> = ({
  icon,
  text,
}) => (
  <View style={styles.addButtonContent}>
    <Text style={styles.addButtonIcon}>{icon}</Text>
    <Text style={styles.addButtonLabel}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: theme.colors.orangeDeep, // Deep orange background
    borderWidth: 1,
    borderColor: theme.colors.orangeBurnt, // Burnt orange border
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonText: {
    color: theme.colors.text,
    fontSize: theme.typography.aboutTitle,
    fontWeight: theme.typography.weights.medium,
  },

  addButton: {
    backgroundColor: theme.colors.orangeBright, // Bright orange for add button
    borderRadius: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addButtonText: {
    color: '#000000', // Black text on bright orange
    fontSize: theme.typography.addBtn,
    fontWeight: theme.typography.weights.semiBold,
  },

  addButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },

  addButtonIcon: {
    color: '#000000', // Black icon on bright orange
    fontSize: theme.typography.addBtn,
    fontWeight: theme.typography.weights.semiBold,
  },

  addButtonLabel: {
    color: '#000000', // Black label on bright orange
    fontSize: theme.typography.addBtn,
    fontWeight: theme.typography.weights.semiBold,
  },

  menuButton: {
    width: theme.layout.menuBtnSize,
    height: theme.layout.menuBtnSize,
    backgroundColor: theme.colors.button,
    borderWidth: 1,
    borderColor: theme.colors.orangeDeep, // Orange border
    borderRadius: theme.borderRadius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: theme.typography.weights.regular,
  },

  disabled: {
    opacity: 0.5,
  },
});
