/**
 * ProfileHero Component - Banner + Avatar + Name + Bio
 * The signed-in user's profile card at the top of Home.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles/theme';
import { User } from '../../types';
import { Avatar } from '../ui/Avatar';
import { Skeleton } from '../ui/LoadingStates';

interface ProfileHeroProps {
  user: User | null;
  isLoading?: boolean;
  onEditPress?: () => void;
}

const BANNER_HEIGHT = 100;
const AVATAR_SIZE = 72;
const AVATAR_OVERLAP = AVATAR_SIZE / 2;

export const ProfileHero: React.FC<ProfileHeroProps> = ({
  user,
  isLoading = false,
  onEditPress,
}) => {
  const { t } = useTranslation('profile');
  const isLoadingProfile = isLoading || !user;
  const [bannerErrored, setBannerErrored] = useState(false);

  useEffect(() => {
    setBannerErrored(false);
  }, [user?.banner]);

  // --- Loading skeleton ---
  if (isLoadingProfile) {
    return (
      <View style={styles.container}>
        <View style={styles.bannerPlaceholder} />
        <View style={styles.avatarRow}>
          <Skeleton
            width={AVATAR_SIZE}
            height={AVATAR_SIZE}
            borderRadius={AVATAR_SIZE / 2}
          />
        </View>
        <View style={styles.textArea}>
          <Skeleton width="45%" height={18} borderRadius={4} style={{ marginBottom: 8 }} />
          <Skeleton width="70%" height={14} borderRadius={4} />
        </View>
      </View>
    );
  }

  // --- Resolve display values ---
  const rawDisplayName = user.displayName || user.name || '';
  const displayName =
    rawDisplayName === '' || rawDisplayName === 'Anonymous Athlete'
      ? t('anonymousAthlete')
      : rawDisplayName;

  const rawBio = user.bio || '';
  const bio =
    rawBio === '' || rawBio === 'Welcome to RUNSTR! Tap to edit your profile.'
      ? t('defaultBio')
      : rawBio;

  const avatarUrl = user.picture || user.avatar || undefined;
  const bannerUri = user.banner || undefined;

  return (
    <View style={styles.container}>
      {/* Banner */}
      <View style={styles.bannerWrapper}>
        {bannerUri && !bannerErrored ? (
          <>
            <Image
              source={{ uri: bannerUri }}
              style={styles.bannerImage}
              resizeMode="cover"
              onError={() => setBannerErrored(true)}
            />
            <View style={styles.bannerOverlay} />
          </>
        ) : (
          <LinearGradient
            colors={['rgba(255, 123, 28, 0.35)', 'rgba(255, 123, 28, 0.08)', '#1a1a1a']}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bannerPlaceholder}
          />
        )}
      </View>

      {/* Avatar row — overlaps the banner */}
      <View style={styles.avatarRow}>
        <View style={styles.avatarContainer}>
          <Avatar
            name={displayName}
            imageUrl={avatarUrl}
            size={AVATAR_SIZE}
            style={styles.avatar}
          />
          {onEditPress && (
            <TouchableOpacity
              style={styles.editBadge}
              onPress={onEditPress}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons
                name="create-outline"
                size={14}
                color={theme.colors.text}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Name / Bio */}
      <View style={styles.textArea}>
        <Text style={styles.name}>{displayName}</Text>
        {bio ? (
          <Text style={styles.bio} numberOfLines={2}>
            {bio}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },

  // --- Banner ---
  bannerWrapper: {
    height: BANNER_HEIGHT,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    width: '100%',
    height: BANNER_HEIGHT,
    backgroundColor: theme.colors.border,
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },


  // --- Avatar ---
  avatarRow: {
    marginTop: -AVATAR_OVERLAP,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  avatar: {
    borderWidth: 3,
    borderColor: theme.colors.cardBackground,
    flexShrink: 0,
  },
  editBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
    marginBottom: 2,
  },

  // --- Text ---
  textArea: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  name: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  bio: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: 4,
  },
});
