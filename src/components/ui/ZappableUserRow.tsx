/**
 * ZappableUserRow Component
 * Reusable component for displaying users with profile resolution and P2P zapping
 * Used across league rankings, team member lists, and competition displays
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { Avatar } from './Avatar';
import { NutzapLightningButton } from '../nutzap/NutzapLightningButton';
import { useNostrProfile } from '../../hooks/useCachedData';

interface ZappableUserRowProps {
  npub: string;
  fallbackName?: string;
  additionalContent?: React.ReactNode;
  showQuickZap?: boolean;
  zapAmount?: number;
  onZapSuccess?: () => void;
  style?: any;
  disabled?: boolean;
}

export const ZappableUserRow: React.FC<ZappableUserRowProps> = ({
  npub,
  fallbackName,
  additionalContent,
  showQuickZap = true,
  zapAmount = 21,
  onZapSuccess,
  style,
  disabled = false,
}) => {
  const { profile } = useNostrProfile(npub);

  // Resolve display name with fallback chain
  const displayName = profile?.name ||
                     profile?.display_name ||
                     fallbackName ||
                     `${npub.slice(0, 8)}...`;

  const avatarUrl = profile?.picture;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.userSection}>
        {/* Avatar with profile picture or fallback */}
        <Avatar
          name={displayName}
          size={36}
          imageUrl={avatarUrl}
          style={styles.avatar}
        />

        {/* User name and zap button */}
        <View style={styles.contentSection}>
          <Text style={styles.userName} numberOfLines={1}>
            {displayName}
          </Text>

          {/* Nutzap Lightning Button - Now below username */}
          {showQuickZap && (
            <NutzapLightningButton
              recipientNpub={npub}
              recipientName={displayName}
              size="rectangular"
              disabled={disabled}
              onZapSuccess={onZapSuccess}
              style={styles.zapButton}
            />
          )}
        </View>
      </View>

      {/* Additional content (stats, etc) on the right */}
      {additionalContent && (
        <View style={styles.additionalContent}>
          {additionalContent}
        </View>
      )}
    </View>
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
    marginRight: 12,
  },

  contentSection: {
    flex: 1,
    justifyContent: 'center',
  },

  userName: {
    fontSize: 15,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 2,
  },

  additionalContent: {
    marginTop: 2,
  },

  zapButton: {
    marginTop: 4,
  },
});