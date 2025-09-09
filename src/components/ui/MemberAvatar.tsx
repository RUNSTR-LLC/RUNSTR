/**
 * MemberAvatar Component - Avatar specifically for team member lists
 * Matches captain dashboard mockup: 28x28px avatars with initials
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

interface MemberAvatarProps {
  name: string;
  imageUrl?: string;
  size?: number;
  style?: any;
}

export const MemberAvatar: React.FC<MemberAvatarProps> = ({
  name,
  imageUrl,
  size = 28,
  style,
}) => {
  const getInitial = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  // Dynamic styles based on size prop
  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: theme.colors.syncBackground,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  const textStyle = {
    fontSize: Math.max(8, size * 0.43), // Scale font size with avatar size
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    textAlign: 'center' as const,
  };

  // For now, we'll use initials. Image support can be added later
  return (
    <View style={[avatarStyle, style]}>
      <Text style={textStyle}>{getInitial(name)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // CSS: width: 28px; height: 28px; background: #333; border-radius: 14px;
  avatar: {
    width: 28,
    height: 28,
    backgroundColor: theme.colors.syncBackground, // #333
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // CSS: font-size: 12px; font-weight: 600; color: #fff;
  initial: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.text,
    textAlign: 'center',
  },
});
