/**
 * ZappableUserRow Component
 * Reusable component for displaying users with profile resolution
 * Used across league rankings, team member lists, and competition displays
 *
 * v3 UPDATE: In-app zaps are DISABLED.
 * NWC credentials have moved to external reward service (security reasons).
 * Users can still zap via external wallets using lightning addresses in profiles.
 *
 * PERFORMANCE: Wrapped with React.memo to prevent unnecessary re-renders
 * in FlatLists (e.g., Season 2 leaderboard tab switching)
 */

// v3: In-app zaps disabled - NWC moved to external service
// Set to true to re-enable when NWC is configured in-app again
const IN_APP_ZAPS_ENABLED = false;

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles/theme';
import { Avatar } from './Avatar';
import { NWCLightningButton } from '../lightning/NWCLightningButton';
import { useNostrProfile } from '../../hooks/useCachedData';

interface ZappableUserRowProps {
  npub: string;
  fallbackName?: string;
  fallbackPicture?: string; // Pre-fetched picture URL (prevents avatar loading issues)
  bundledPicture?: number; // Bundled image from require() - takes priority (instant, no network)
  additionalContent?: React.ReactNode;
  showQuickZap?: boolean;
  zapAmount?: number;
  onZapSuccess?: () => void;
  style?: any;
  disabled?: boolean;
  hideActionsForCurrentUser?: boolean; // Hide zap for current user
  recipientLightningAddress?: string; // User's lightning address from workout event or profile
  skipProfileFetch?: boolean; // Skip Nostr profile fetch, use fallbackName/fallbackPicture directly
  onPress?: () => void; // Optional tap handler (e.g., navigate to user profile)
}

const ZappableUserRowComponent: React.FC<ZappableUserRowProps> = ({
  npub,
  fallbackName,
  fallbackPicture,
  bundledPicture,
  additionalContent,
  showQuickZap = true,
  zapAmount = 21,
  onZapSuccess,
  style,
  disabled = false,
  hideActionsForCurrentUser = false,
  recipientLightningAddress,
  skipProfileFetch = false,
  onPress,
}) => {
  const { t } = useTranslation('profile');

  // Always call hook (React rules), but ignore result if skipProfileFetch is true
  const { profile: fetchedProfile } = useNostrProfile(skipProfileFetch ? null : npub);
  const profile = skipProfileFetch ? null : fetchedProfile;

  // Resolve display name with fallback chain (treat empty strings as falsy)
  // Priority: profile name → profile display_name → fallbackName → translated "Anonymous Athlete"
  // When skipProfileFetch=true, profile is null so fallbackName is used directly
  const displayName =
    profile?.name ||
    profile?.display_name ||
    (fallbackName && fallbackName.trim() !== '' ? fallbackName : null) ||
    t('anonymousAthlete');

  // Use profile picture with fallback to pre-fetched picture (prevents avatar loading issues)
  // Always include URL as fallback for bundled images that fail (progressive JPEG, large files)
  // Avatar component prioritizes imageSource over imageUrl, so bundled still takes priority when it works
  const avatarUrl = profile?.picture || fallbackPicture;

  // Get user's lightning address: prop (from workout event) → profile lud16 → undefined
  const userLightningAddress = recipientLightningAddress || profile?.lud16;

  const Container = onPress ? TouchableOpacity : View;
  const containerProps = onPress
    ? { onPress, activeOpacity: 0.7, style: [styles.container, style] }
    : { style: [styles.container, style] };

  return (
    <Container {...containerProps}>
      <View style={styles.userSection}>
        {/* Avatar with profile picture or fallback */}
        <Avatar
          name={displayName}
          size={36}
          imageSource={bundledPicture}
          imageUrl={avatarUrl}
          style={styles.avatar}
        />

        {/* User name with action buttons */}
        <View style={styles.contentSection}>
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {displayName}
            </Text>

            {/* Lightning button zaps user directly
                v3: Disabled - NWC moved to external reward service
                Users can still zap via external wallets using lightning addresses */}
            {IN_APP_ZAPS_ENABLED && !hideActionsForCurrentUser && showQuickZap && userLightningAddress && (
              <View style={styles.actionButtons}>
                <NWCLightningButton
                  recipientNpub={npub}
                  recipientName={displayName}
                  recipientLightningAddress={userLightningAddress}
                  size="small"
                  disabled={disabled}
                  onZapSuccess={onZapSuccess}
                  style={styles.zapButton}
                />
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Additional content (stats, etc) on the right */}
      {additionalContent && (
        <View style={styles.additionalContent}>{additionalContent}</View>
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 52,
  },

  userSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    marginRight: 8,
  },

  contentSection: {
    flex: 1,
    justifyContent: 'center',
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  userName: {
    fontSize: 15,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  additionalContent: {
    marginTop: 2,
    flex: 0,
    minWidth: 90,
    paddingRight: 12,
  },

  zapButton: {
    // Gap handled by actionButtons
  },
});

// Memoized export to prevent unnecessary re-renders in FlatLists
export const ZappableUserRow = memo(ZappableUserRowComponent);
