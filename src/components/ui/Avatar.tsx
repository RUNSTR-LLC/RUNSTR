/**
 * Avatar Component - Exact match to HTML mockup avatar styling
 * Used for: leaderboard-avatar, profile-avatar, etc.
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

interface AvatarProps {
  name: string;
  size?: number;
  imageUrl?: string;
  style?: any;
  showIcon?: boolean; // New prop to show person icon instead of initials
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = theme.layout.avatarSize, // Default to 36px (leaderboard size)
  imageUrl,
  style,
  showIcon = false,
}) => {
  const getInitial = (name: string): string => {
    if (!name || name.length === 0) {
      return '?';
    }
    return name.charAt(0).toUpperCase();
  };

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const textStyle = {
    fontSize: size * 0.44, // Scale font size with avatar size
  };

  // Simple approach - just render the image if URL is provided
  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.avatar, avatarStyle, style]}
        resizeMode="cover"
      />
    );
  }

  // Fallback to icon or initials
  return (
    <View style={[styles.avatar, avatarStyle, style]}>
      {showIcon ? (
        <Ionicons
          name="person-outline"
          size={size * 0.6}
          color={theme.colors.text}
        />
      ) : (
        <Text style={[styles.initial, textStyle]}>{getInitial(name || '')}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // CSS: background: #333; border-radius: 18px; display: flex; align-items: center; justify-content: center;
  avatar: {
    backgroundColor: theme.colors.syncBackground, // #333
    alignItems: 'center',
    justifyContent: 'center',
  },

  // CSS: font-size: 16px; font-weight: 600; color: #fff;
  initial: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semiBold,
    textAlign: 'center',
  },
});
