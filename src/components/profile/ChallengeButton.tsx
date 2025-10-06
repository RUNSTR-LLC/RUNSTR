/**
 * ChallengeButton - Reusable button to initiate challenge with a user
 * Appears next to zap buttons throughout the app
 * Opens GlobalChallengeWizard with preselected opponent
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../../styles/theme';
import type { DiscoveredNostrUser } from '../../services/user/UserDiscoveryService';

interface ChallengeButtonProps {
  targetUser: {
    pubkey: string;
    npub?: string;
    name?: string;
    displayName?: string;
    picture?: string;
    about?: string;
  };
  size?: 'small' | 'medium' | 'large';
  variant?: 'icon' | 'text' | 'full';
  disabled?: boolean;
  onPress?: () => void; // Optional override for navigation
}

type RootStackParamList = {
  ChallengeWizard: {
    preselectedOpponent?: DiscoveredNostrUser;
  };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ChallengeButton: React.FC<ChallengeButtonProps> = ({
  targetUser,
  size = 'medium',
  variant = 'icon',
  disabled = false,
  onPress,
}) => {
  const navigation = useNavigation<NavigationProp>();

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    // Convert to DiscoveredNostrUser format
    const opponent: DiscoveredNostrUser = {
      pubkey: targetUser.pubkey,
      npub: targetUser.npub || targetUser.pubkey,
      name: targetUser.name,
      displayName: targetUser.displayName,
      picture: targetUser.picture,
      about: targetUser.about,
      activityStatus: 'new', // Default, will be determined by wizard
    };

    // Navigate to challenge wizard with preselected opponent
    const parentNav = navigation.getParent();
    if (parentNav) {
      parentNav.navigate('ChallengeWizard' as any, {
        preselectedOpponent: opponent,
      });
    } else {
      navigation.navigate('ChallengeWizard', {
        preselectedOpponent: opponent,
      });
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'medium':
        return 20;
      case 'large':
        return 24;
      default:
        return 20;
    }
  };

  const getButtonStyle = () => {
    const baseStyle = [styles.button];

    if (size === 'small') {
      baseStyle.push(styles.buttonSmall);
    } else if (size === 'large') {
      baseStyle.push(styles.buttonLarge);
    }

    if (variant === 'full') {
      baseStyle.push(styles.buttonFull);
    } else if (variant === 'text') {
      baseStyle.push(styles.buttonText);
    }

    if (disabled) {
      baseStyle.push(styles.buttonDisabled);
    }

    return baseStyle;
  };

  if (variant === 'text') {
    return (
      <TouchableOpacity
        style={getButtonStyle()}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Ionicons
          name="trophy-outline"
          size={getIconSize()}
          color={disabled ? theme.colors.textMuted : theme.colors.text}
          style={styles.textIcon}
        />
        <Text
          style={[
            styles.buttonLabel,
            disabled && styles.buttonLabelDisabled,
          ]}
        >
          Challenge
        </Text>
      </TouchableOpacity>
    );
  }

  if (variant === 'full') {
    return (
      <TouchableOpacity
        style={getButtonStyle()}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Ionicons
          name="trophy-outline"
          size={getIconSize()}
          color={theme.colors.accentText}
          style={styles.fullIcon}
        />
        <Text style={styles.fullButtonLabel}>Challenge</Text>
      </TouchableOpacity>
    );
  }

  // Default: icon variant
  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Ionicons
        name="trophy-outline"
        size={getIconSize()}
        color={disabled ? theme.colors.textMuted : theme.colors.text}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  buttonSmall: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  buttonLarge: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonText: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonFull: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.accentBright,
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  textIcon: {
    marginRight: 6,
  },
  fullIcon: {
    marginRight: 8,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  buttonLabelDisabled: {
    color: theme.colors.textMuted,
  },
  fullButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accentText,
  },
});
