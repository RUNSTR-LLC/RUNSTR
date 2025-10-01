/**
 * ProfileHeader Component - Profile avatar, name, and edit button
 * Matches .profile-header from HTML mockup exactly
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { theme } from '../../styles/theme';
import { User } from '../../types';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';

interface ProfileHeaderProps {
  user: User;
  // onEdit removed - pure Nostr users use external clients
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
}) => {
  // Use displayName or name, prefer displayName from Nostr profile
  const displayName = user.displayName || user.name;

  // Get avatar URL with fallback chain
  const avatarUrl = user.picture || user.avatar || undefined;

  // Debug logging to verify picture data
  console.log('🖼️ ProfileHeader avatar data:', {
    hasPicture: !!user.picture,
    hasAvatar: !!user.avatar,
    pictureUrl: user.picture?.substring(0, 50),
    avatarUrl: avatarUrl?.substring(0, 50),
    displayName
  });

  return (
    <View style={styles.boxContainer}>
      {/* Nostr Banner */}
      {user.banner && (
        <View style={styles.bannerContainer}>
          <Image
            source={{ uri: user.banner }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <View style={styles.bannerOverlay} />
        </View>
      )}

      {/* Profile Content */}
      <View
        style={[
          styles.profileContent,
          user.banner && styles.profileContentWithBanner,
        ]}
      >
        <Avatar
          name={displayName}
          imageUrl={user.picture} // Use Nostr profile picture directly
          size={60} // Increased for better visibility
          style={styles.avatar}
          showIcon={true}
        />
        <View style={styles.info}>
          <Text style={styles.name}>{displayName}</Text>
          {user.bio && <Text style={styles.bio} numberOfLines={2}>{user.bio}</Text>}
          {user.lud16 && (
            <Text style={styles.lightningAddress} numberOfLines={1}>⚡ {user.lud16}</Text>
          )}
        </View>
        {/* Edit button removed for pure Nostr users - use external Nostr clients */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Compact box container matching other boxes
  boxContainer: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden', // To clip banner image
    height: 180, // Increased height to show avatar and username
  },

  // Banner styles
  bannerContainer: {
    height: 60, // Reduced height
    position: 'relative',
    marginHorizontal: -1, // Offset border width
    marginTop: -1, // Offset border width
  },

  bannerImage: {
    width: '100%',
    height: '100%',
  },

  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Dark overlay for text readability
  },

  // Profile content that sits below banner or replaces container content
  profileContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },

  profileContentWithBanner: {
    paddingTop: 12, // Reduced top padding when banner present
  },

  avatar: {
    // Avatar component handles its own styling, just add flex shrink
    flexShrink: 0,
    // Add border when banner is present for better visibility
    borderWidth: 3,
    borderColor: theme.colors.cardBackground,
  },

  info: {
    flex: 1,
  },

  // Compact text styles
  name: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },

  // Nostr profile bio
  bio: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 2,
    lineHeight: 16,
  },

  // Lightning address
  lightningAddress: {
    fontSize: 11,
    color: theme.colors.accent,
    marginBottom: 2,
    fontFamily: 'monospace',
  },

  // Website
  website: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs, // 2px
  },

  // CSS: padding: 8px 16px; border-radius: 8px; font-size: 12px;
  editButton: {
    paddingVertical: theme.spacing.lg, // 8px
    paddingHorizontal: theme.spacing.xxl, // 16px
    borderRadius: theme.borderRadius.medium, // 8px
    flexShrink: 0,
  },

  editButtonText: {
    fontSize: 12, // Exact from CSS
    fontWeight: theme.typography.weights.medium, // 500
  },
});
