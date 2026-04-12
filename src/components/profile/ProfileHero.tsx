/**
 * ProfileHero Component - Banner + Avatar + Name + Bio + lud16
 * Used on the unified profile page for both self and other-user views.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles/theme';
import { User } from '../../types';
import { Avatar } from '../ui/Avatar';

interface ProfileHeroProps {
  user: User | null;
  isOwner: boolean;
  isLoading?: boolean;
  level?: number;
  streak?: number;
  earnings?: number;
  onEditPress?: () => void;
  onBackPress?: () => void;
  onSettingsPress?: () => void;
  onLevelPress?: () => void;
  onEarningsPress?: () => void;
}

const BANNER_HEIGHT = 100;
const AVATAR_SIZE = 72;
const AVATAR_OVERLAP = AVATAR_SIZE / 2;

const LEVEL_BADGE_SIZE = 36;

const formatEarnings = (amount: number): string => {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 10_000) return `${Math.round(amount / 1000)}K`;
  if (amount >= 1_000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toLocaleString();
};

export const ProfileHero: React.FC<ProfileHeroProps> = ({
  user,
  isOwner,
  isLoading = false,
  level,
  streak,
  earnings,
  onEditPress,
  onBackPress,
  onSettingsPress,
  onLevelPress,
  onEarningsPress,
}) => {
  const { t } = useTranslation('profile');
  const isLoadingProfile = isLoading || !user;

  // --- Loading skeleton ---
  if (isLoadingProfile) {
    return (
      <View style={styles.container}>
        <View style={styles.bannerPlaceholder} />
        <View style={styles.avatarRow}>
          <View style={[styles.skeletonAvatar, { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }]} />
        </View>
        <View style={styles.textArea}>
          <View style={styles.skeletonName} />
          <View style={styles.skeletonBio} />
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
  const lud16 = user.lud16 || undefined;

  return (
    <View style={styles.container}>
      {/* Banner */}
      <View style={styles.bannerWrapper}>
        {bannerUri ? (
          <Image
            source={{ uri: bannerUri }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.bannerPlaceholder} />
        )}
        <View style={styles.bannerOverlay} />

        {/* Top-bar actions sit on the banner */}
        {isOwner && onSettingsPress && (
          <TouchableOpacity
            style={styles.topRightButton}
            onPress={onSettingsPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="menu-outline"
              size={22}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        )}

        {!isOwner && onBackPress && (
          <TouchableOpacity
            style={styles.topLeftButton}
            onPress={onBackPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={theme.colors.text}
            />
          </TouchableOpacity>
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
          {isOwner && onEditPress && (
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

      {/* Name / Bio / lud16 + Level Badge */}
      <View style={styles.textArea}>
        <View style={styles.textRow}>
          <View style={styles.textContent}>
            <Text style={styles.name}>{displayName}</Text>
            {bio ? (
              <Text style={styles.bio} numberOfLines={2}>
                {bio}
              </Text>
            ) : null}
            {lud16 ? (
              <Text style={styles.lud16} numberOfLines={1}>
                {lud16}
              </Text>
            ) : null}
          </View>
          <View style={styles.badgeRow}>
            {earnings != null && isOwner && (
              <TouchableOpacity
                style={styles.statBadge}
                onPress={onEarningsPress}
                activeOpacity={0.7}
              >
                <Text style={styles.statBadgeLabel}>EARNINGS</Text>
                <Text style={styles.statBadgeValue}>{formatEarnings(earnings)}</Text>
              </TouchableOpacity>
            )}
            {streak != null && (
              <TouchableOpacity
                style={styles.statBadge}
                onPress={onLevelPress}
                activeOpacity={0.7}
              >
                <Text style={styles.statBadgeLabel}>LEVEL</Text>
                <Text style={styles.statBadgeValue}>{streak}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
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

  // --- Top bar buttons ---
  topRightButton: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topLeftButton: {
    position: 'absolute',
    top: 10,
    left: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
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
  textRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  textContent: {
    flex: 1,
    marginRight: 12,
  },
  badgeRow: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 6,
  },
  statBadge: {
    minWidth: 86,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  statBadgeLabel: {
    fontSize: 9,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    letterSpacing: 1,
  },
  statBadgeValue: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
  },
  // Deprecated — kept for any external consumers that still reference these
  levelBadge: {
    width: 40,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    gap: 1,
  },
  levelBadgeLabel: {
    fontSize: 9,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.textMuted,
    letterSpacing: 1,
  },
  levelBadgeText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
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
  lud16: {
    fontSize: 11,
    color: theme.colors.accent,
    fontFamily: 'monospace',
  },

  // --- Skeletons ---
  skeletonAvatar: {
    backgroundColor: theme.colors.border,
  },
  skeletonName: {
    height: 18,
    width: '45%',
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonBio: {
    height: 14,
    width: '70%',
    backgroundColor: theme.colors.border,
    borderRadius: 4,
  },
});
