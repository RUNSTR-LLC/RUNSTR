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

  return (
    <View style={styles.container}>
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
          imageUrl={user.picture} // Use Nostr profile picture if available
          size={theme.layout.profileAvatarSize} // 64px
          style={styles.avatar}
          showIcon={true}
        />
        <View style={styles.info}>
          <Text style={styles.name}>{displayName}</Text>
          {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
          {user.lud16 && (
            <Text style={styles.lightningAddress}>⚡ {user.lud16}</Text>
          )}
          {user.website && (
            <Text style={styles.website}>🌐 {user.website}</Text>
          )}
        </View>
        {/* Edit button removed for pure Nostr users - use external Nostr clients */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // CSS: margin: 16px 20px; background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 16px;
  container: {
    marginVertical: theme.spacing.xxl, // 16px
    marginHorizontal: theme.spacing.xxxl, // 20px
    backgroundColor: theme.colors.cardBackground, // #0a0a0a
    borderWidth: 1,
    borderColor: theme.colors.border, // #1a1a1a
    borderRadius: theme.spacing.xxl, // 16px
    overflow: 'hidden', // To clip banner image
  },

  // Banner styles
  bannerContainer: {
    height: 120,
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
    padding: theme.spacing.xxxl, // 20px
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xxl, // 16px
  },

  profileContentWithBanner: {
    paddingTop: theme.spacing.xl, // Reduced top padding when banner present
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

  // CSS: font-size: 20px; font-weight: 700; margin-bottom: 4px;
  name: {
    fontSize: theme.typography.teamName, // 20px
    fontWeight: theme.typography.weights.bold, // 700
    color: theme.colors.text,
    marginBottom: theme.spacing.sm, // 4px
  },

  // Nostr profile bio
  bio: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs, // 2px
    lineHeight: 18,
  },

  // Lightning address
  lightningAddress: {
    fontSize: 12,
    color: theme.colors.accent,
    marginBottom: theme.spacing.xs, // 2px
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
