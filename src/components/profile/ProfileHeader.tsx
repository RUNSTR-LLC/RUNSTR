/**
 * ProfileHeader Component - Profile avatar, name, and edit button
 * Matches .profile-header from HTML mockup exactly
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles/theme';
import { User } from '../../types';
import { Avatar } from '../ui/Avatar';
import { Skeleton } from '../ui/LoadingStates';

interface ProfileHeaderProps {
  user: User | null;
  isLoading?: boolean;
  // onEdit removed - pure Nostr users use external clients
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  isLoading = false,
}) => {
  const { t } = useTranslation('profile');

  // ✅ LOADING STATE: Show loading UI if explicitly loading or if user is null
  const isLoadingProfile = isLoading || !user;

  // Debug logging to verify profile data
  console.log('🖼️ ProfileHeader data:', {
    hasUser: !!user,
    isLoading,
    isLoadingProfile,
    hasPicture: !!user?.picture,
    hasAvatar: !!user?.avatar,
    hasBanner: !!user?.banner,
    hasBio: !!user?.bio,
    displayName: user?.displayName || user?.name,
    pictureUrl: user?.picture?.substring(0, 50),
    bannerUrl: user?.banner?.substring(0, 50),
    npub: user?.npub?.substring(0, 20),
  });

  // ✅ LOADING STATE: Show skeleton/loading state instead of fallback names
  if (isLoadingProfile) {
    return (
      <View style={styles.boxContainer}>
        <View style={styles.profileContent}>
          <Skeleton width={60} height={60} borderRadius={30} style={styles.avatar} />
          <View style={styles.info}>
            <Skeleton width="60%" height={18} borderRadius={4} style={{ marginBottom: 8 }} />
            <Skeleton width="80%" height={14} borderRadius={4} />
          </View>
        </View>
      </View>
    );
  }

  // ✅ PROFILE DATA: Extract profile fields only if user exists
  // Translate default values at display time (Nostr stores English defaults)
  const rawDisplayName = user.displayName || user.name || '';
  const displayName = rawDisplayName === '' || rawDisplayName === 'Anonymous Athlete'
    ? t('anonymousAthlete')
    : rawDisplayName;

  const avatarUrl = user.picture || user.avatar || undefined;

  // Translate default bio at display time
  const rawBio = user.bio || '';
  const bio = rawBio === '' || rawBio === 'Welcome to RUNSTR! Tap to edit your profile.'
    ? t('defaultBio')
    : rawBio;
  const lud16 = user.lud16 || undefined;
  const banner = user.banner || undefined;

  return (
    <View style={styles.boxContainer}>
      {/* Nostr Banner */}
      {banner && (
        <View style={styles.bannerContainer}>
          <Image
            source={{ uri: banner }}
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
          banner && styles.profileContentWithBanner,
        ]}
      >
        <Avatar
          name={displayName}
          imageUrl={avatarUrl} // Use Nostr profile picture with fallback
          size={60}
          style={styles.avatar}
          showIcon={true}
        />
        <View style={styles.info}>
          <Text style={styles.name}>{displayName}</Text>
          {bio && (
            <Text style={styles.bio} numberOfLines={2}>
              {bio}
            </Text>
          )}
          {lud16 && (
            <Text style={styles.lightningAddress} numberOfLines={1}>
              {lud16}
            </Text>
          )}
        </View>
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
    height: 150, // Reduced height for better screen fit
  },

  // Banner styles
  bannerContainer: {
    height: 50, // Further reduced height
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
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },

  profileContentWithBanner: {
    paddingTop: 8, // Reduced top padding when banner present
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
